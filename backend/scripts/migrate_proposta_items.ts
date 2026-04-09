import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Utility string parsing for large SQL dumps
function parseInsertRows(content: string, tableName: string): any[][] {
    const regex = new RegExp(`INSERT INTO \`${tableName}\` VALUES (.*?);`, 'gs');
    const matches = Array.from(content.matchAll(regex));
    const allValues: any[][] = [];

    for (const match of matches) {
        const rowsStr = match[1].trim();
        let currentRow: any[] = [];
        let currentVal = '';
        let inString = false;
        let escaped = false;
        let inRow = false;

        for (let i = 0; i < rowsStr.length; i++) {
            const char = rowsStr[i];

            if (char === "'" && !escaped) {
                inString = !inString;
                continue;
            }
            if (char === "\\" && !escaped) {
                escaped = true;
                continue;
            }

            if (!inString) {
                if (char === "(") {
                    inRow = true;
                    currentRow = [];
                    continue;
                }
                if (char === ")") {
                    if (currentVal.trim() === 'NULL') currentRow.push(null);
                    else if (currentVal.trim() !== '') currentRow.push(currentVal.trim());
                    allValues.push(currentRow);
                    currentVal = '';
                    inRow = false;
                    continue;
                }
                if (char === ",") {
                    if (inRow) {
                        if (currentVal.trim() === 'NULL') currentRow.push(null);
                        else if (currentVal.trim() !== '') currentRow.push(currentVal.trim());
                        currentVal = '';
                    }
                    continue;
                }
            }
            currentVal += char;
            escaped = false;
        }
    }
    return allValues;
}

const mapTipoCobranca = (val: string) => {
    if(!val) return 'DIARIA';
    if(val === '1' || val.includes('DIA')) return 'DIARIA';
    if(val === '2' || val.includes('HORA')) return 'HORA';
    if(val === '3' || val.includes('FRETE')) return 'FRETE';
    return 'FECHADA';
};

async function main() {
    const dumpPath = path.join(__dirname, '../production_dump.sql');
    if (!fs.existsSync(dumpPath)) {
        console.error(`Dump file not found at ${dumpPath}`);
        return;
    }

    console.log('Reading SQL dump (this takes a few seconds)...');
    const content = fs.readFileSync(dumpPath, 'utf8');

    console.log('Fetching existing Proposals in modern DB...');
    const dbPropostas = await prisma.proposta.findMany({ select: { id: true, codigo: true } });
    
    // Create a map linking legacy ID numeric with the new UUID 
    // Usually legacy proposal ID was embedded in the `codigo` like PROP-LEGADO-123
    const legacyMap = new Map<string, string>();
    for (const p of dbPropostas) {
        if (p.codigo && p.codigo.startsWith('PROP-LEGADO-')) {
            const legId = p.codigo.replace('PROP-LEGADO-', '');
            legacyMap.set(legId, p.id);
        }
    }
    console.log(`Matched ${legacyMap.size} legacy proposals currently inside the new DB.`);

    // 1. Parse Links to find which ID belongs to which Proposta
    console.log('Parsing links...');
    
    // Equipamentos
    // CREATE TABLE `propostas_proposta_equipamentos_links` (`id` int, `proposta_id` int, `proposta_equipamento_id` int)
    const linksPropEquip = parseInsertRows(content, 'propostas_proposta_equipamentos_links');
    const propToEquipMap = new Map<string, string>(); // equipamentoId -> propostaUUID
    for (const link of linksPropEquip) {
        const legPropId = link[1]; // proposta_id
        const legEqId = link[2];   // proposta_equipamento_id
        const newDbId = legacyMap.get(legPropId);
        if (newDbId) propToEquipMap.set(legEqId, newDbId);
    }

    // Equipamentos themselves have an equipment dictionary link
    // CREATE TABLE `proposta_equipamentos_equipamento_links` (`id` int, `proposta_equipamento_id` int, `equipamento_id` int)
    const linksEquipDict = parseInsertRows(content, 'proposta_equipamentos_equipamento_links');
    const eqToRealEqMap = new Map<string, string>(); // proposta_equipamento_id -> equipamento_id
    for (const link of linksEquipDict) {
        eqToRealEqMap.set(link[1], link[2]);
    }
    // Pull the dictionary of real equipment names
    const rawEquips = parseInsertRows(content, 'equipamentos');
    const equipNames = new Map<string, string>();
    for (const r of rawEquips) equipNames.set(r[0], r[1] || 'Equipamento S/N');

    // Equipes
    const linksPropEquipe = parseInsertRows(content, 'propostas_proposta_equipes_links');
    const propToEquipeMap = new Map<string, string>(); // equipeId -> propostaUUID
    for (const link of linksPropEquipe) {
        const newDbId = legacyMap.get(link[1]);
        if (newDbId) propToEquipeMap.set(link[2], newDbId);
    }
    
    // Responsabilidades
    const linksPropResp = parseInsertRows(content, 'propostas_proposta_responsabilidades_links');
    const propToRespMap = new Map<string, string>(); // respId -> propostaUUID
    for (const link of linksPropResp) {
        const newDbId = legacyMap.get(link[1]);
        if (newDbId) propToRespMap.set(link[2], newDbId);
    }

    // Acessorios
    const linksPropAces = parseInsertRows(content, 'propostas_acessorios_links');
    const propToAcesMap = new Map<string, string>(); // acesId -> propostaUUID
    for (const link of linksPropAces) {
        const newDbId = legacyMap.get(link[1]);
        if (newDbId) propToAcesMap.set(link[2], newDbId);
    }
    const rawAcesDict = parseInsertRows(content, 'acessorios');
    const acesNames = new Map<string, string>();
    for (const a of rawAcesDict) acesNames.set(a[0], a[1] || 'Acessório S/N');


    // 2. Parse Actual Data Rows
    console.log('Parsing target tables and injecting records...');
    
    // EQUIPAMENTOS
    const rowsEquipamentos = parseInsertRows(content, 'proposta_equipamentos');
    let eqC = 0;
    for (const row of rowsEquipamentos) {
        const propId = propToEquipMap.get(row[0]);
        if (!propId) continue;

        const realEqId = eqToRealEqMap.get(row[0]);
        const nomeEq = realEqId ? (equipNames.get(realEqId) || 'Equipamento Genérico') : 'Equipamento Genérico';

        await prisma.propostaItem.create({
            data: {
                propostaId: propId,
                equipamento: nomeEq,
                tipoCobranca: mapTipoCobranca(row[1]),
                valorAcobrar: parseFloat(row[2] || '0'),
                horasPorDia: parseInt(row[3] || '0') || null,
                horaAdicional: parseFloat(row[4] || '0') || null,
                usoPrevisto: row[5] ? `${row[5]}` : null,
                valorTotal: parseFloat(row[6] || '0'),
                mobilizacao: parseFloat(row[7] || '0') || null,
                area: row[8] || null,
                quantidade: parseInt(row[9] || '1') || 1
            }
        });
        eqC++;
    }
    console.log(`Migrated ${eqC} Proposta Equipamentos!`);

    // EQUIPES
    const rowsEquipes = parseInsertRows(content, 'proposta_equipes');
    let equipC = 0;
    for (const row of rowsEquipes) {
        const propId = propToEquipeMap.get(row[0]);
        if (!propId) continue;
        await prisma.propostaEquipe.create({
            data: {
                propostaId: propId,
                quantidade: parseInt(row[1] || '1') || 1,
                funcao: row[2] || 'Técnico'
            }
        });
        equipC++;
    }
    console.log(`Migrated ${equipC} Proposta Equipes!`);

    // RESPONSABILIDADES
    const rowsResp = parseInsertRows(content, 'proposta_responsabilidades');
    let resC = 0;
    for (const row of rowsResp) {
        const propId = propToRespMap.get(row[0]);
        if (!propId) continue;
        
        let tipo = 'CONTRATADA';
        const txtRaw = (row[2] || '').toUpperCase();
        if(txtRaw.includes('CONTRATANTE')) tipo = 'CONTRATANTE';
        
        await prisma.propostaResponsabilidade.create({
            data: {
                propostaId: propId,
                descricao: row[1] || '---',
                tipo: tipo
            }
        });
        resC++;
    }
    console.log(`Migrated ${resC} Proposta Responsabilidades!`);

    console.log('Successfully completed nested structures migration!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
