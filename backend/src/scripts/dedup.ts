/**
 * ============================================================
 * AUDITORIA E LIMPEZA DE DUPLICATAS — NacionalHidro
 * ============================================================
 *
 * Modos:
 *   npx ts-node src/scripts/dedup.ts --audit              # Apenas gera relatório
 *   npx ts-node src/scripts/dedup.ts --dry-run             # Simula merge
 *   npx ts-node src/scripts/dedup.ts --commit              # Executa de verdade
 *   npx ts-node src/scripts/dedup.ts --audit --table=cliente # Apenas uma tabela
 *
 * ANTES de --commit:
 *   1. Crie um branch no Neon (backup)
 *   2. Rode --audit e revise
 *   3. Rode --dry-run e revise
 *   4. Só então rode --commit
 */

import { PrismaClient, Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// ─── CLI Args ───────────────────────────────────────────────
const args = process.argv.slice(2);
const MODE = args.includes('--commit') ? 'COMMIT' : args.includes('--dry-run') ? 'DRY-RUN' : 'AUDIT';
const TABLE_FILTER = args.find(a => a.startsWith('--table='))?.split('=')[1]?.toLowerCase();

// ─── Stats ──────────────────────────────────────────────────
const report: Record<string, any> = {};
const globalStats = { totalDuplicatas: 0, totalDeletados: 0, totalRefsMigradas: 0, erros: 0 };

function log(label: string, msg: string) {
  console.log(`[${label}] ${msg}`);
}

// ─── Types ──────────────────────────────────────────────────
interface DupGroup {
  criterio: string;
  valor: string;
  registros: { id: string; createdAt: Date; vinculos: Record<string, number>; camposPreenchidos: number }[];
  masterId?: string;
  acao?: string;
}

// ════════════════════════════════════════════════════════════
//  DEFINIÇÕES DE TABELAS PARA AUDITORIA
// ════════════════════════════════════════════════════════════

interface TableDef {
  name: string;
  prismaModel: string;
  dupCriteria: { field: string; label: string; caseInsensitive?: boolean; compositeFields?: string[] }[];
  fkRefs: { model: string; field: string }[];
  mergeableFields?: string[];
}

const TABLES: TableDef[] = [
  {
    name: 'Cliente',
    prismaModel: 'cliente',
    dupCriteria: [
      { field: 'nome', label: 'nome', caseInsensitive: true },
      { field: 'documento', label: 'documento (CNPJ/CPF)' },
      { field: 'razaoSocial', label: 'razaoSocial', caseInsensitive: true },
    ],
    fkRefs: [
      { model: 'proposta', field: 'clienteId' },
      { model: 'ordemServico', field: 'clienteId' },
      { model: 'contaReceber', field: 'clienteId' },
      { model: 'contrato', field: 'clienteId' },
      { model: 'faturamento', field: 'clienteId' },
      { model: 'medicao', field: 'clienteId' },
      { model: 'escala', field: 'clienteId' },
      { model: 'clienteContato', field: 'clienteId' },
      { model: 'clienteDocumento', field: 'clienteId' },
      { model: 'historicoContato', field: 'clienteId' },
      { model: 'documento', field: 'clienteId' },
      { model: 'agendamento', field: 'clienteId' },
      { model: 'integracaoCliente', field: 'clienteId' },
    ],
    mergeableFields: ['email', 'telefone', 'endereco', 'cidade', 'estado', 'cep', 'razaoSocial', 'nomeFantasia'],
  },
  {
    name: 'ClienteContato',
    prismaModel: 'clienteContato',
    dupCriteria: [
      { field: 'nome', label: 'clienteId+nome', caseInsensitive: true, compositeFields: ['clienteId'] },
      { field: 'email', label: 'clienteId+email', compositeFields: ['clienteId'] },
    ],
    fkRefs: [],
    mergeableFields: ['email', 'telefone', 'celular', 'setor', 'tipo'],
  },
  {
    name: 'Fornecedor',
    prismaModel: 'fornecedor',
    dupCriteria: [
      { field: 'nome', label: 'nome', caseInsensitive: true },
      { field: 'documento', label: 'documento (CNPJ/CPF)' },
    ],
    fkRefs: [
      { model: 'contaPagar', field: 'fornecedorId' },
      { model: 'pedidoCompra', field: 'fornecedorId' },
      { model: 'hospedagem', field: 'fornecedorId' },
    ],
    mergeableFields: ['email', 'telefone', 'endereco', 'razaoSocial'],
  },
  {
    name: 'Equipamento',
    prismaModel: 'equipamento',
    dupCriteria: [
      { field: 'nome', label: 'nome', caseInsensitive: true },
    ],
    fkRefs: [
      { model: 'servicoOS', field: 'equipamentoId' },
      { model: 'equipamentoAcessorio', field: 'equipamentoId' },
      { model: 'equipamentoResponsabilidade', field: 'equipamentoId' },
    ],
    mergeableFields: ['descricao', 'imagem'],
  },
  {
    name: 'Acessorio',
    prismaModel: 'acessorio',
    dupCriteria: [
      { field: 'nome', label: 'nome', caseInsensitive: true },
    ],
    fkRefs: [
      { model: 'equipamentoAcessorio', field: 'acessorioId' },
    ],
  },
  {
    name: 'Cargo',
    prismaModel: 'cargo',
    dupCriteria: [
      { field: 'nome', label: 'nome', caseInsensitive: true },
    ],
    fkRefs: [
      { model: 'propostaEquipe', field: 'cargoId' },
    ],
  },
  {
    name: 'CategoriaEquipe',
    prismaModel: 'categoriaEquipe',
    dupCriteria: [
      { field: 'nome', label: 'nome', caseInsensitive: true },
    ],
    fkRefs: [
      { model: 'user', field: 'roleId' },
      { model: 'categoriaPermission', field: 'categoriaId' },
    ],
  },
  {
    name: 'PlanoContas',
    prismaModel: 'planoContas',
    dupCriteria: [
      { field: 'codigo', label: 'codigo' },
    ],
    fkRefs: [
      { model: 'lancamentoCusto', field: 'planoContasId' },
    ],
  },
  {
    name: 'CentroCusto',
    prismaModel: 'centroCusto',
    dupCriteria: [
      { field: 'nome', label: 'nome', caseInsensitive: true },
    ],
    fkRefs: [
      { model: 'contaPagar', field: 'centroCustoId' },
      { model: 'lancamentoCusto', field: 'centroCustoId' },
      { model: 'itemCobranca', field: 'centroCustoId' },
    ],
  },
  {
    name: 'NaturezaContabil',
    prismaModel: 'naturezaContabil',
    dupCriteria: [
      { field: 'nome', label: 'nome', caseInsensitive: true },
    ],
    fkRefs: [],
  },
  {
    name: 'Veiculo',
    prismaModel: 'veiculo',
    dupCriteria: [
      { field: 'placa', label: 'placa' },
    ],
    fkRefs: [],
    mergeableFields: ['modelo', 'marca'],
  },
  {
    name: 'EmpresaCNPJ',
    prismaModel: 'empresaCNPJ',
    dupCriteria: [
      { field: 'cnpj', label: 'cnpj' },
    ],
    fkRefs: [
      { model: 'faturamento', field: 'empresaCnpjId' },
    ],
  },
  {
    name: 'Candidato',
    prismaModel: 'candidato',
    dupCriteria: [
      { field: 'cpf', label: 'cpf' },
      { field: 'email', label: 'email' },
    ],
    fkRefs: [
      { model: 'admissao', field: 'candidatoId' },
    ],
  },
];

// ════════════════════════════════════════════════════════════
//  FUNÇÕES CORE
// ════════════════════════════════════════════════════════════

async function countRefs(tableDef: TableDef, recordId: string): Promise<Record<string, number>> {
  const vinculos: Record<string, number> = {};
  for (const ref of tableDef.fkRefs) {
    try {
      const count = await (prisma as any)[ref.model].count({
        where: { [ref.field]: recordId },
      });
      if (count > 0) vinculos[`${ref.model}.${ref.field}`] = count;
    } catch {
      // Model may not exist or field may differ
    }
  }
  return vinculos;
}

function countNonNullFields(record: any): number {
  return Object.values(record).filter(v => v !== null && v !== undefined && v !== '').length;
}

function totalVinculos(vinculos: Record<string, number>): number {
  return Object.values(vinculos).reduce((s, n) => s + n, 0);
}

async function findDuplicates(tableDef: TableDef): Promise<DupGroup[]> {
  const groups: DupGroup[] = [];

  for (const criteria of tableDef.dupCriteria) {
    try {
      const allRecords = await (prisma as any)[tableDef.prismaModel].findMany({
        orderBy: { createdAt: 'asc' },
      });

      // Group by the criteria field(s)
      const buckets = new Map<string, any[]>();

      for (const record of allRecords) {
        let val = record[criteria.field];
        if (val === null || val === undefined || val === '') continue;

        val = String(val).trim();
        if (criteria.caseInsensitive) val = val.toLowerCase();

        // Composite key (e.g., clienteId + nome)
        let key = val;
        if (criteria.compositeFields) {
          const compositeVals = criteria.compositeFields.map(f => record[f] || '');
          key = [...compositeVals, val].join('|');
        }

        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key)!.push(record);
      }

      // Filter only groups with 2+ records
      for (const [key, records] of buckets) {
        if (records.length < 2) continue;

        const enriched = [];
        for (const r of records) {
          const vinculos = await countRefs(tableDef, r.id);
          enriched.push({
            id: r.id,
            createdAt: r.createdAt,
            vinculos,
            camposPreenchidos: countNonNullFields(r),
            _raw: r,
          });
        }

        // Sort: most vinculos first, then oldest, then most fields filled
        enriched.sort((a, b) => {
          const vDiff = totalVinculos(b.vinculos) - totalVinculos(a.vinculos);
          if (vDiff !== 0) return vDiff;
          const tDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          if (tDiff !== 0) return tDiff;
          return b.camposPreenchidos - a.camposPreenchidos;
        });

        const displayVal = criteria.compositeFields
          ? `${criteria.compositeFields.join('+')}:${key}`
          : records[0][criteria.field];

        groups.push({
          criterio: criteria.label,
          valor: String(displayVal).substring(0, 100),
          registros: enriched.map(e => ({
            id: e.id,
            createdAt: e.createdAt,
            vinculos: e.vinculos,
            camposPreenchidos: e.camposPreenchidos,
          })),
          masterId: enriched[0].id,
        });
      }
    } catch (e: any) {
      log(tableDef.name, `❌ Erro ao buscar duplicatas por ${criteria.label}: ${e.message}`);
      globalStats.erros++;
    }
  }

  return groups;
}

async function mergeAndDelete(tableDef: TableDef, group: DupGroup) {
  const masterId = group.masterId!;
  const duplicateIds = group.registros.filter(r => r.id !== masterId).map(r => r.id);

  for (const dupId of duplicateIds) {
    // 1. Migrar FKs
    for (const ref of tableDef.fkRefs) {
      try {
        const updated = await (prisma as any)[ref.model].updateMany({
          where: { [ref.field]: dupId },
          data: { [ref.field]: masterId },
        });
        if (updated.count > 0) {
          globalStats.totalRefsMigradas += updated.count;
          log(tableDef.name, `  📎 ${ref.model}.${ref.field}: ${updated.count} ref(s) migrada(s) ${dupId} → ${masterId}`);
        }
      } catch (e: any) {
        // Unique constraint violation on migration — skip silently (already linked to master)
        if (e.code === 'P2002') {
          log(tableDef.name, `  ⏭️ ${ref.model}.${ref.field}: ref já existe no master, deletando duplicada`);
          try {
            await (prisma as any)[ref.model].deleteMany({
              where: { [ref.field]: dupId },
            });
          } catch { /* ignore */ }
        } else {
          log(tableDef.name, `  ❌ Erro migrando ${ref.model}.${ref.field}: ${e.message}`);
          globalStats.erros++;
        }
      }
    }

    // 2. Merge campos vazios no master
    if (tableDef.mergeableFields) {
      try {
        const dupRecord = await (prisma as any)[tableDef.prismaModel].findUnique({ where: { id: dupId } });
        const masterRecord = await (prisma as any)[tableDef.prismaModel].findUnique({ where: { id: masterId } });

        if (dupRecord && masterRecord) {
          const updates: Record<string, any> = {};
          for (const field of tableDef.mergeableFields) {
            if (!masterRecord[field] && dupRecord[field]) {
              updates[field] = dupRecord[field];
            }
          }
          if (Object.keys(updates).length > 0) {
            await (prisma as any)[tableDef.prismaModel].update({
              where: { id: masterId },
              data: updates,
            });
            log(tableDef.name, `  📝 Merged campos: ${Object.keys(updates).join(', ')}`);
          }
        }
      } catch (e: any) {
        log(tableDef.name, `  ⚠️ Erro no merge de campos: ${e.message}`);
      }
    }

    // 3. Registrar em LogAlteracao
    try {
      await prisma.logAlteracao.create({
        data: {
          entidade: tableDef.name,
          entidadeId: dupId,
          acao: 'MERGE_DUPLICATE',
          descricao: `Duplicata removida. Master: ${masterId}. Critério: ${group.criterio}="${group.valor}"`,
          valorAnterior: JSON.stringify(group.registros.find(r => r.id === dupId)?.vinculos),
          valorNovo: masterId,
          usuarioNome: 'SYSTEM-DEDUP',
        },
      });
    } catch {
      // LogAlteracao may have different schema, continue
    }

    // 4. Deletar duplicado
    try {
      await (prisma as any)[tableDef.prismaModel].delete({ where: { id: dupId } });
      globalStats.totalDeletados++;
      log(tableDef.name, `  🗑️ Deletado: ${dupId}`);
    } catch (e: any) {
      log(tableDef.name, `  ❌ Erro ao deletar ${dupId}: ${e.message}`);
      globalStats.erros++;
    }
  }
}

// ════════════════════════════════════════════════════════════
//  MAIN
// ════════════════════════════════════════════════════════════

async function main() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  AUDITORIA E LIMPEZA DE DUPLICATAS                     ║');
  console.log(`║  Modo: ${MODE === 'COMMIT' ? '🔴 COMMIT' : MODE === 'DRY-RUN' ? '🟡 DRY-RUN' : '🔵 AUDIT'}                                        ║`);
  if (TABLE_FILTER) {
    console.log(`║  Tabela: ${TABLE_FILTER.padEnd(46)}║`);
  }
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');

  const tablesToProcess = TABLE_FILTER
    ? TABLES.filter(t => t.name.toLowerCase() === TABLE_FILTER || t.prismaModel.toLowerCase() === TABLE_FILTER)
    : TABLES;

  if (tablesToProcess.length === 0) {
    console.log(`❌ Tabela "${TABLE_FILTER}" não encontrada. Tabelas disponíveis:`);
    TABLES.forEach(t => console.log(`   - ${t.name}`));
    process.exit(1);
  }

  for (const tableDef of tablesToProcess) {
    console.log('');
    log(tableDef.name, `═══ Analisando ${tableDef.name} ═══`);

    try {
      const total = await (prisma as any)[tableDef.prismaModel].count();
      log(tableDef.name, `Total de registros: ${total}`);

      const groups = await findDuplicates(tableDef);

      const dupCount = groups.reduce((s, g) => s + g.registros.length - 1, 0);
      globalStats.totalDuplicatas += dupCount;

      report[tableDef.name] = {
        total,
        duplicatas: dupCount,
        grupos: groups.length,
        detalhes: groups.map(g => ({
          criterio: g.criterio,
          valor: g.valor,
          masterId: g.masterId,
          duplicados: g.registros.filter(r => r.id !== g.masterId).map(r => r.id),
          registros: g.registros,
        })),
      };

      if (groups.length === 0) {
        log(tableDef.name, `✅ Nenhuma duplicata encontrada`);
        continue;
      }

      log(tableDef.name, `⚠️ ${dupCount} duplicata(s) em ${groups.length} grupo(s)`);

      for (const group of groups) {
        const master = group.registros[0];
        const dups = group.registros.slice(1);
        log(tableDef.name, `  📋 ${group.criterio}: "${group.valor}" — ${group.registros.length} registros`);
        log(tableDef.name, `     Master: ${master.id} (${totalVinculos(master.vinculos)} vínc, ${master.camposPreenchidos} campos)`);
        for (const d of dups) {
          log(tableDef.name, `     Dup:    ${d.id} (${totalVinculos(d.vinculos)} vínc, ${d.camposPreenchidos} campos)`);
        }

        if (MODE === 'COMMIT') {
          await mergeAndDelete(tableDef, group);
        } else if (MODE === 'DRY-RUN') {
          for (const d of dups) {
            log(tableDef.name, `     [DRY] Deletaria ${d.id}, migrando refs para ${master.id}`);
          }
        }
      }
    } catch (e: any) {
      log(tableDef.name, `❌ Erro processando tabela: ${e.message}`);
      globalStats.erros++;
    }
  }

  // ─── RELATÓRIO FINAL ──────────────────────────────────────
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  RELATÓRIO FINAL (${MODE})`);
  console.log('═══════════════════════════════════════════════════════');

  for (const [table, data] of Object.entries(report)) {
    const emoji = data.duplicatas > 0 ? '⚠️' : '✅';
    console.log(`  ${emoji} ${table}: ${data.total} total, ${data.duplicatas} dup, ${data.grupos} grupos`);
  }

  console.log(`  ─────────────────────────────────────`);
  console.log(`  Total duplicatas encontradas: ${globalStats.totalDuplicatas}`);

  if (MODE === 'COMMIT') {
    console.log(`  Total deletados:             ${globalStats.totalDeletados}`);
    console.log(`  Total refs migradas:         ${globalStats.totalRefsMigradas}`);
  }

  console.log(`  Erros:                       ${globalStats.erros}`);
  console.log('═══════════════════════════════════════════════════════');

  // Salvar relatório JSON
  const reportPath = path.join(
    process.cwd(),
    `dedup-report-${new Date().toISOString().slice(0, 10)}.json`
  );
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log('Report', `Relatório salvo em: ${reportPath}`);

  if (MODE === 'AUDIT') {
    console.log('');
    console.log('  💡 Próximos passos:');
    console.log('     1. Revise o relatório acima');
    console.log('     2. Rode: npx ts-node src/scripts/dedup.ts --dry-run');
    console.log('     3. Se OK: npx ts-node src/scripts/dedup.ts --commit');
  }

  await prisma.$disconnect();
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('❌ ERRO FATAL:', e);
    process.exit(1);
  });
