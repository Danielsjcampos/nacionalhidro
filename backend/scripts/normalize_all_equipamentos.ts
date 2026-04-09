/**
 * normalize_all_equipamentos.ts
 * 
 * Normaliza o JSON de responsabilidades de TODOS os equipamentos no banco:
 * - Formato antigo: { responsavel: "CONTRATANTE", responsabilidade: "...texto..." }
 * - Formato novo:   { descricao: "...texto...", responsavel: "CONTRATADA (HIDRO)" }
 * 
 * Também padroniza o tipo:
 * - "CONTRATANTE" → "CONTRATANTE (CLIENTE)"
 * - "CONTRATADA"  → "CONTRATADA (HIDRO)"
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function normalizeResponsavel(raw: string): string {
    if (!raw) return raw;
    const upper = raw.toUpperCase().trim();
    if (upper === 'CONTRATANTE' || upper.startsWith('CONTRATANTE (')) return 'CONTRATANTE (CLIENTE)';
    if (upper === 'CONTRATADA' || upper.startsWith('CONTRATADA (')) return 'CONTRATADA (HIDRO)';
    return raw; // já correto ou desconhecido
}

function normalizeResponsabilidadesArray(arr: any[]): { descricao: string; responsavel: string }[] {
    return arr.map((r: any) => {
        // Formato antigo: { responsavel, responsabilidade }
        const texto = r.descricao || r.responsabilidade || '';
        const tipo = normalizeResponsavel(r.responsavel || '');
        return { descricao: texto, responsavel: tipo };
    }).filter(r => r.descricao); // Remove entradas vazias
}

async function main() {
    console.log('🔧 Iniciando normalização de responsabilidades de todos os equipamentos...');

    const equipamentos = await prisma.equipamento.findMany();
    console.log(`📦 Total de equipamentos encontrados: ${equipamentos.length}`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const eq of equipamentos) {
        const rawResps = eq.responsabilidades;
        if (!Array.isArray(rawResps) || rawResps.length === 0) {
            console.log(`  ⏭️  Sem responsabilidades: "${eq.nome}"`);
            skippedCount++;
            continue;
        }

        // Detectar se precisa normalizar (formato antigo tem campo "responsabilidade")
        const sample = rawResps[0] as any;
        const isOldFormat = 'responsabilidade' in sample && !('descricao' in sample);
        const hasShortTipo = sample.responsavel && !sample.responsavel.includes('(');

        if (!isOldFormat && !hasShortTipo) {
            console.log(`  ✅ Já normalizado: "${eq.nome}" (${rawResps.length} resps)`);
            skippedCount++;
            continue;
        }

        const normalized = normalizeResponsabilidadesArray(rawResps);

        await prisma.equipamento.update({
            where: { id: eq.id },
            data: { responsabilidades: normalized }
        });

        console.log(`  🔄 Normalizado: "${eq.nome}" — ${rawResps.length} → ${normalized.length} responsabilidades`);
        updatedCount++;
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Concluído! Atualizados: ${updatedCount} | Já corretos: ${skippedCount}`);
}

main()
    .catch((e) => {
        console.error('❌ Erro:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
