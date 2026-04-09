import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Utilitário para parsear valores de INSERT INTO do MySQL da forma mais robusta possível
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

// Mapeamento de Status
const MAP_STATUS_PAGAR: Record<string, string> = {
    '0': 'ABERTO',
    '1': 'PAGO',
    '2': 'CANCELADO'
};

const MAP_STATUS_RECEBER: Record<string, string> = {
    '0': 'PENDENTE',
    '4': 'RECEBIDO',
    '2': 'CANCELADO'
};

async function main() {
    const dumpPath = path.join(__dirname, '../production_dump.sql');
    if (!fs.existsSync(dumpPath)) {
        console.error(`Dump file not found at ${dumpPath}`);
        return;
    }

    console.log('Reading SQL dump...');
    const content = fs.readFileSync(dumpPath, 'utf8');

    console.log('Parsing relevant tables...');
    
    const headersPagar = new Map(parseInsertRows(content, 'contas').map(r => [r[0], r]));
    const headersReceber = new Map(parseInsertRows(content, 'contas_receber').map(r => [r[0], r]));
    
    const parcelasPagar = parseInsertRows(content, 'conta_pagamento_parcelas');
    const parcelasReceber = parseInsertRows(content, 'conta_recebimento_parcelas');

    const linksFornecedor = new Map(parseInsertRows(content, 'contas_fornecedor_links').map(r => [r[0], r[1]]));
    const linksCliente = new Map(parseInsertRows(content, 'contas_receber_cliente_links').map(r => [r[0], r[1]]));
    
    // Inverted maps for relationship chain
    const pPgtoToConta = new Map(parseInsertRows(content, 'contas_conta_pagamento_links').map(r => [r[1], r[0]]));
    const pParcelaToPgto = new Map(parseInsertRows(content, 'conta_pagamentos_conta_pagamento_parcela_links').map(r => [r[1], r[0]]));
    
    const rRecebToConta = new Map(parseInsertRows(content, 'contas_receber_conta_recebimento_links').map(r => [r[1], r[0]]));
    const rParcelaToReceb = new Map(parseInsertRows(content, 'conta_recebimentos_conta_recebimento_parcela_links').map(r => [r[1], r[0]]));

    console.log(`Loaded ${parcelasPagar.length} payable installments and ${parcelasReceber.length} receivable installments.`);

    // --- MAPEAR FORNECEDORES ---
    console.log('Mapping Suppliers (Legacy ID -> current UUID)...');
    const currentSuppliers = await prisma.fornecedor.findMany({ select: { id: true, documento: true } });
    const uuidSupplierMap = new Map(currentSuppliers.map(s => [s.documento, s.id]));
    
    const rawFornecedores = parseInsertRows(content, 'fornecedores');
    const legacySupplierIdToUuid = new Map<string, string>();
    for (const f of rawFornecedores) {
        // f[0]: id, f[2]: cnpj
        const uuid = uuidSupplierMap.get(f[2]);
        if (uuid) legacySupplierIdToUuid.set(f[0], uuid);
    }

    // --- MAPEAR CLIENTES ---
    console.log('Mapping Clients (Legacy ID -> current UUID)...');
    const currentClients = await prisma.cliente.findMany({ select: { id: true, documento: true } });
    const uuidClientMap = new Map(currentClients.map(c => [c.documento, c.id]));

    const rawClientes = parseInsertRows(content, 'clientes');
    const legacyClientIdToUuid = new Map<string, string>();
    for (const c of rawClientes) {
        // c[0]: id, c[18]: cnpj, c[35]: cpf
        const doc = c[18] || c[35];
        if (doc) {
            const uuid = uuidClientMap.get(doc);
            if (uuid) legacyClientIdToUuid.set(c[0], uuid);
        }
    }

    // --- PROCESSAR CONTAS A PAGAR ---
    console.log('Migrating Contas a Pagar...');
    let apCount = 0;
    for (const p of parcelasPagar) {
        const pgtoId = pParcelaToPgto.get(p[0]);
        const contaId = pPgtoToConta.get(pgtoId);
        const header = headersPagar.get(contaId);
        const legacyFornecedorId = linksFornecedor.get(contaId);
        const fornecedorId = legacySupplierIdToUuid.get(legacyFornecedorId) || null;

        if (!header) continue;

        const id = `legacy-ap-${p[0]}`;
        const data = {
            id,
            descricao: header[5] || `Conta NF ${header[3] || 'S/N'}`,
            fornecedorId,
            notaFiscal: header[3],
            valorOriginal: parseFloat(p[2] || '0'),
            valorPago: parseFloat(p[6] || '0'),
            valorTotal: parseFloat(p[2] || '0'),
            dataVencimento: p[3] ? new Date(p[3]) : new Date(),
            dataPagamento: p[7] ? new Date(p[7]) : null,
            status: MAP_STATUS_PAGAR[p[4]] || 'ABERTO',
            numeroParcela: parseInt(p[1] || '1'),
            totalParcelas: 1,
            empresa: 'NACIONAL'
        };

        await prisma.contaPagar.upsert({
            where: { id },
            update: data,
            create: data
        });
        apCount++;
        if (apCount % 100 === 0) console.log(`Migrated ${apCount} Contas a Pagar...`);
    }

    // --- PROCESSAR CONTAS A RECEBER ---
    console.log('Migrating Contas a Receber...');
    let arCount = 0;
    for (const r of parcelasReceber) {
        const recebId = rParcelaToReceb.get(r[0]);
        const contaId = rRecebToConta.get(recebId);
        const header = headersReceber.get(contaId);
        const legacyClientId = linksCliente.get(contaId);
        const clienteId = legacyClientIdToUuid.get(legacyClientId) || null;

        if (!header) continue;

        const id = `legacy-ar-${r[0]}`;
        const data = {
            id,
            descricao: `Recebimento Ref. ${contaId}`,
            clienteId,
            valorOriginal: parseFloat(r[2] || '0'),
            valorRecebido: parseFloat(r[6] || '0'),
            valorTotal: parseFloat(r[2] || '0'),
            dataVencimento: r[3] ? new Date(r[3]) : new Date(),
            dataRecebimento: r[7] ? new Date(r[7]) : null,
            status: MAP_STATUS_RECEBER[r[4]] || 'PENDENTE',
            numeroParcela: parseInt(r[1] || '1'),
            totalParcelas: 1,
            empresa: 'NACIONAL'
        };

        await prisma.contaReceber.upsert({
            where: { id },
            update: data,
            create: data
        });
        arCount++;
        if (arCount % 100 === 0) console.log(`Migrated ${arCount} Contas a Receber...`);
    }

    console.log('Migration completed successfully!');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
