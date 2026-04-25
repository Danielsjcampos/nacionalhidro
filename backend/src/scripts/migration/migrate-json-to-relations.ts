/**
 * ============================================================
 * MIGRAÇÃO INTERNA: JSON → Tabelas de Junção
 * ============================================================
 *
 * Lê os campos JSON (Equipamento.acessorios e .responsabilidades)
 * que já existem no PostgreSQL e popula as tabelas relacionais:
 *   - EquipamentoAcessorio (junção)
 *   - EquipamentoResponsabilidade
 *
 * NÃO REQUER MySQL. Usa apenas o banco novo (Neon).
 *
 * USO:
 *   npx ts-node src/scripts/migration/migrate-json-to-relations.ts          # DRY-RUN
 *   npx ts-node src/scripts/migration/migrate-json-to-relations.ts --commit # COMMIT
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const COMMIT = process.argv.includes('--commit');

const stats = {
  equipamentosProcessados: 0,
  acessoriosVinculados: 0,
  acessoriosCriados: 0,
  acessoriosSkipped: 0,
  responsabilidadesCriadas: 0,
  responsabilidadesSkipped: 0,
  erros: 0,
};

function log(label: string, msg: string) {
  console.log(`[${label}] ${msg}`);
}

async function main() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  MIGRAÇÃO INTERNA: JSON → Tabelas de Junção            ║');
  console.log(`║  Modo: ${COMMIT ? '🔴 COMMIT' : '🟡 DRY-RUN'}                                       ║`);
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');

  // Buscar TODOS os equipamentos com seus dados JSON
  const equipamentos = await prisma.equipamento.findMany({
    select: {
      id: true,
      nome: true,
      acessorios: true,
      responsabilidades: true,
      _count: {
        select: {
          acessoriosVinculados: true,
          responsabilidadesPadrao: true,
        }
      }
    }
  });

  log('Info', `${equipamentos.length} equipamentos encontrados no banco`);

  // Buscar todos os acessórios existentes para matching
  const acessoriosExistentes = await prisma.acessorio.findMany({
    select: { id: true, nome: true },
  });
  const acessorioMap = new Map<string, string>();
  for (const a of acessoriosExistentes) {
    acessorioMap.set(a.nome.trim().toLowerCase(), a.id);
  }
  log('Info', `${acessoriosExistentes.length} acessórios cadastrados`);

  for (const eq of equipamentos) {
    stats.equipamentosProcessados++;

    // ── ACESSÓRIOS ──────────────────────────────────────
    const jsonAcessorios = eq.acessorios as any;
    if (Array.isArray(jsonAcessorios) && jsonAcessorios.length > 0) {
      // Pular se já tem vínculos na tabela de junção
      if (eq._count.acessoriosVinculados > 0) {
        log('Acessórios', `⏭️ ${eq.nome}: já tem ${eq._count.acessoriosVinculados} vínculos, pulando`);
      } else {
        log('Acessórios', `📋 ${eq.nome}: ${jsonAcessorios.length} acessórios no JSON`);

        for (const item of jsonAcessorios) {
          const nomeAcessorio = typeof item === 'string' ? item.trim() : (item?.nome || '').trim();
          if (!nomeAcessorio) continue;

          // Encontrar ou criar acessório
          let acessorioId = acessorioMap.get(nomeAcessorio.toLowerCase());

          if (!acessorioId) {
            if (COMMIT) {
              const created = await prisma.acessorio.create({ data: { nome: nomeAcessorio } });
              acessorioId = created.id;
              acessorioMap.set(nomeAcessorio.toLowerCase(), acessorioId);
              stats.acessoriosCriados++;
              log('Acessórios', `  ➕ Criado: "${nomeAcessorio}"`);
            } else {
              log('Acessórios', `  [DRY] Criaria: "${nomeAcessorio}"`);
              stats.acessoriosCriados++;
              continue;
            }
          }

          // Criar vínculo
          if (COMMIT) {
            try {
              await prisma.equipamentoAcessorio.create({
                data: { equipamentoId: eq.id, acessorioId },
              });
              stats.acessoriosVinculados++;
              log('Acessórios', `  ✅ ${eq.nome} → ${nomeAcessorio}`);
            } catch (e: any) {
              if (e.code === 'P2002') {
                stats.acessoriosSkipped++;
              } else throw e;
            }
          } else {
            log('Acessórios', `  [DRY] ${eq.nome} → ${nomeAcessorio}`);
            stats.acessoriosVinculados++;
          }
        }
      }
    }

    // ── RESPONSABILIDADES ───────────────────────────────
    const jsonResps = eq.responsabilidades as any;
    if (Array.isArray(jsonResps) && jsonResps.length > 0) {
      if (eq._count.responsabilidadesPadrao > 0) {
        log('Responsabilidades', `⏭️ ${eq.nome}: já tem ${eq._count.responsabilidadesPadrao} registros, pulando`);
      } else {
        log('Responsabilidades', `📋 ${eq.nome}: ${jsonResps.length} responsabilidades no JSON`);

        for (let ordem = 0; ordem < jsonResps.length; ordem++) {
          const r = jsonResps[ordem];
          const descricao = (r.responsabilidade || r.descricao || '').trim();
          if (!descricao) continue;

          const tipo = r.responsavel === 'CONTRATANTE' ? 'CONTRATANTE'
                     : r.responsavel === 'CONTRATADA' ? 'CONTRATADA'
                     : r.responsavel === 1 ? 'CONTRATANTE'
                     : 'CONTRATADA';
          const importante = !!r.importante;

          if (COMMIT) {
            // Verificar duplicata
            const exists = await prisma.equipamentoResponsabilidade.findFirst({
              where: { equipamentoId: eq.id, descricao, tipo },
            });
            if (exists) {
              stats.responsabilidadesSkipped++;
              continue;
            }

            await prisma.equipamentoResponsabilidade.create({
              data: {
                equipamentoId: eq.id,
                descricao,
                tipo,
                importante,
                ordem,
              },
            });
            stats.responsabilidadesCriadas++;
            log('Responsabilidades', `  ✅ ${eq.nome} → "${descricao}" (${tipo}${importante ? ' ⚠️' : ''})`);
          } else {
            log('Responsabilidades', `  [DRY] ${eq.nome} → "${descricao}" (${tipo}${importante ? ' ⚠️' : ''})`);
            stats.responsabilidadesCriadas++;
          }
        }
      }
    }
  }

  // ── RELATÓRIO ─────────────────────────────────────────
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  RELATÓRIO ${COMMIT ? '(COMMIT)' : '(DRY-RUN)'}`);
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Equipamentos processados:     ${stats.equipamentosProcessados}`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  Acessórios vinculados:         ${stats.acessoriosVinculados}`);
  console.log(`  Acessórios novos criados:      ${stats.acessoriosCriados}`);
  console.log(`  Acessórios já existiam:        ${stats.acessoriosSkipped}`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  Responsabilidades criadas:     ${stats.responsabilidadesCriadas}`);
  console.log(`  Responsabilidades já existiam: ${stats.responsabilidadesSkipped}`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  Erros:                         ${stats.erros}`);
  console.log('═══════════════════════════════════════════════════════');

  if (!COMMIT) {
    console.log('');
    console.log('  💡 DRY-RUN concluído. Para aplicar:');
    console.log('     npx ts-node src/scripts/migration/migrate-json-to-relations.ts --commit');
    console.log('');
  }

  await prisma.$disconnect();
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('❌ ERRO FATAL:', e);
    process.exit(1);
  });
