/**
 * ============================================================
 * MIGRAÇÃO: Equipamento → Acessórios / Responsabilidades
 * ============================================================
 *
 * Migra os vínculos Equipamento↔Acessório e Equipamento↔Responsabilidade
 * do MySQL legado (Strapi v4) para as novas tabelas de junção no PostgreSQL.
 *
 * TABELAS LEGADO (MySQL / Strapi v4):
 * ───────────────────────────────────
 * equipamentos                  → id, equipamento (nome)
 * acessorios                    → id, nome
 * responsabilidades             → id, responsabilidade (descricao), responsavel (1=Contratante,2=Contratada), importante
 * equipamento_acessorios        → id (entity intermediária)
 * equipamento_responsabilidades → id (entity intermediária)
 *
 * LINK TABLES (Strapi v4 many-relation pattern):
 * ───────────────────────────────────────────────
 * equipamentos_equipamento_acessorios_links       (equipamento_id → equipamento_acessorio_id)
 * equipamento_acessorios_acessorio_links           (equipamento_acessorio_id → acessorio_id)
 * equipamentos_equipamento_responsabilidades_links (equipamento_id → equipamento_responsabilidade_id)
 * equipamento_responsabilidades_responsabilidade_links (equipamento_responsabilidade_id → responsabilidade_id)
 *
 * TABELAS DESTINO (PostgreSQL / Prisma):
 * ──────────────────────────────────────
 * EquipamentoAcessorio          → { equipamentoId, acessorioId } @@unique
 * EquipamentoResponsabilidade   → { equipamentoId, descricao, tipo, importante, ordem }
 *
 * COMO USAR:
 * ──────────
 * 1. Restaure o dump MySQL:
 *    docker run -d --name mysql-legacy -e MYSQL_ROOT_PASSWORD=legacy123 -e MYSQL_DATABASE=nhidro -p 3307:3306 mysql:8.0
 *    sleep 20
 *    gzip -dc documentos/nhidro_prod_20260331.sql.gz | docker exec -i mysql-legacy mysql -u root -plegacy123 nhidro
 *
 * 2. Configure .env:
 *    LEGACY_DB_HOST=localhost
 *    LEGACY_DB_PORT=3307
 *    LEGACY_DB_NAME=nhidro
 *    LEGACY_DB_USER=root
 *    LEGACY_DB_PASS=legacy123
 *    DATABASE_URL=postgresql://...
 *
 * 3. Dry-run (apenas log, sem inserir):
 *    npx ts-node src/scripts/migration/migrate-equipamento-relations.ts
 *
 * 4. Commit (insere no banco):
 *    npx ts-node src/scripts/migration/migrate-equipamento-relations.ts --commit
 */

import * as mysql from 'mysql2/promise';
import { PrismaClient } from '@prisma/client';

// ─── Configuração ───────────────────────────────────────────

const LEGACY = {
  host:     process.env.LEGACY_DB_HOST     || 'localhost',
  port:     parseInt(process.env.LEGACY_DB_PORT || '3307'),
  database: process.env.LEGACY_DB_NAME     || 'nhidro',
  user:     process.env.LEGACY_DB_USER     || 'root',
  password: process.env.LEGACY_DB_PASS     || 'legacy123',
};

const COMMIT = process.argv.includes('--commit');

const prisma = new PrismaClient();

// ─── Stats ──────────────────────────────────────────────────

const stats = {
  equipamentosTotal: 0,
  equipamentosMatchados: 0,
  equipamentosNaoEncontrados: [] as string[],
  acessoriosVinculados: 0,
  acessoriosSkipped: 0,
  acessoriosCriados: 0,
  responsabilidadesCriadas: 0,
  responsabilidadesSkipped: 0,
  erros: 0,
};

function log(label: string, msg: string) {
  console.log(`[${label}] ${msg}`);
}

// ─── MAIN ───────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  MIGRAÇÃO: Equipamento → Acessórios/Responsabilidades  ║');
  console.log(`║  Modo: ${COMMIT ? '🔴 COMMIT (vai inserir no banco!)' : '🟡 DRY-RUN (apenas log)'}          ║`);
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');

  // 1. Conectar MySQL legado
  log('MySQL', `Conectando em ${LEGACY.host}:${LEGACY.port}/${LEGACY.database}...`);
  const db = await mysql.createConnection(LEGACY);
  log('MySQL', '✅ Conectado');

  // 2. Buscar todos os equipamentos do novo sistema (PostgreSQL)
  const equipamentosNovos = await prisma.equipamento.findMany({
    select: { id: true, nome: true },
  });
  log('Prisma', `${equipamentosNovos.length} equipamentos encontrados no banco novo`);

  // Mapa: nome normalizado → id novo
  const nomeParaId = new Map<string, string>();
  for (const eq of equipamentosNovos) {
    nomeParaId.set(eq.nome.trim().toLowerCase(), eq.id);
  }

  // 3. Buscar todos os acessórios existentes no novo (para matching por nome)
  const acessoriosNovos = await prisma.acessorio.findMany({
    select: { id: true, nome: true },
  });
  const acessorioNomeParaId = new Map<string, string>();
  for (const a of acessoriosNovos) {
    acessorioNomeParaId.set(a.nome.trim().toLowerCase(), a.id);
  }
  log('Prisma', `${acessoriosNovos.length} acessórios existentes no banco novo`);

  // 4. Buscar equipamentos do legado
  const [legacyEquips] = await db.query<any[]>(`SELECT id, equipamento FROM equipamentos`);
  stats.equipamentosTotal = legacyEquips.length;
  log('MySQL', `${legacyEquips.length} equipamentos encontrados no legado`);

  // ─── MIGRAR ACESSÓRIOS ────────────────────────────────────

  console.log('');
  log('Acessórios', '── Iniciando migração de acessórios vinculados ──');

  for (const eq of legacyEquips) {
    const nomeLegacy = (eq.equipamento || '').trim();
    const novoId = nomeParaId.get(nomeLegacy.toLowerCase());

    if (!novoId) {
      if (!stats.equipamentosNaoEncontrados.includes(nomeLegacy)) {
        stats.equipamentosNaoEncontrados.push(nomeLegacy);
      }
      continue;
    }

    try {
      // Query Strapi v4 link tables: equipamento → equipamento_acessorio → acessorio
      const [acessorioLinks] = await db.query<any[]>(`
        SELECT DISTINCT a.id as legacy_id, a.nome
        FROM acessorios a
        JOIN equipamento_acessorios_acessorio_links eal ON eal.acessorio_id = a.id
        JOIN equipamentos_equipamento_acessorios_links eel ON eel.equipamento_acessorio_id = eal.equipamento_acessorio_id
        WHERE eel.equipamento_id = ?
      `, [eq.id]);

      for (const link of acessorioLinks) {
        const nomeAcessorio = (link.nome || '').trim();
        if (!nomeAcessorio) continue;

        // Encontrar ou criar acessório no novo sistema
        let acessorioId = acessorioNomeParaId.get(nomeAcessorio.toLowerCase());

        if (!acessorioId && COMMIT) {
          // Criar acessório no novo
          const created = await prisma.acessorio.create({
            data: { nome: nomeAcessorio },
          });
          acessorioId = created.id;
          acessorioNomeParaId.set(nomeAcessorio.toLowerCase(), acessorioId);
          stats.acessoriosCriados++;
          log('Acessórios', `  ➕ Acessório criado: "${nomeAcessorio}"`);
        } else if (!acessorioId) {
          // Dry-run: apenas logar que seria criado
          log('Acessórios', `  [DRY] Criaria acessório: "${nomeAcessorio}"`);
          stats.acessoriosCriados++;
          continue;
        }

        // Criar vínculo EquipamentoAcessorio (idempotente via @@unique)
        if (COMMIT) {
          try {
            await prisma.equipamentoAcessorio.create({
              data: { equipamentoId: novoId, acessorioId },
            });
            stats.acessoriosVinculados++;
            log('Acessórios', `  ✅ ${nomeLegacy} → ${nomeAcessorio}`);
          } catch (e: any) {
            if (e.code === 'P2002') {
              stats.acessoriosSkipped++;
              log('Acessórios', `  ⏭️ Já existe: ${nomeLegacy} → ${nomeAcessorio}`);
            } else {
              throw e;
            }
          }
        } else {
          log('Acessórios', `  [DRY] ${nomeLegacy} → ${nomeAcessorio}`);
          stats.acessoriosVinculados++;
        }
      }
    } catch (e: any) {
      log('Acessórios', `❌ ERRO equipamento "${nomeLegacy}" (id=${eq.id}): ${e.message}`);
      stats.erros++;
    }
  }

  // ─── MIGRAR RESPONSABILIDADES ─────────────────────────────

  console.log('');
  log('Responsabilidades', '── Iniciando migração de responsabilidades padrão ──');

  for (const eq of legacyEquips) {
    const nomeLegacy = (eq.equipamento || '').trim();
    const novoId = nomeParaId.get(nomeLegacy.toLowerCase());

    if (!novoId) continue; // Já logado na seção anterior

    try {
      // Query Strapi v4 link tables: equipamento → equipamento_responsabilidade → responsabilidade
      const [respLinks] = await db.query<any[]>(`
        SELECT DISTINCT r.id as legacy_id, r.responsabilidade, r.responsavel, r.importante
        FROM responsabilidades r
        JOIN equipamento_responsabilidades_responsabilidade_links erl ON erl.responsabilidade_id = r.id
        JOIN equipamentos_equipamento_responsabilidades_links eerl ON eerl.equipamento_responsabilidade_id = erl.equipamento_responsabilidade_id
        WHERE eerl.equipamento_id = ?
      `, [eq.id]);

      for (let ordem = 0; ordem < respLinks.length; ordem++) {
        const r = respLinks[ordem];
        const descricao = (r.responsabilidade || '').trim();
        if (!descricao) continue;

        // Mapear responsavel: no legado, 1=Contratante, 2=Contratada (ou vice-versa)
        // A migração anterior usou: responsavel === 1 ? 'CONTRATANTE' : 'CONTRATADA'
        const tipo = r.responsavel === 1 ? 'CONTRATANTE' : 'CONTRATADA';
        const importante = !!r.importante;

        if (COMMIT) {
          // Verificar se já existe (idempotente por descricao + tipo + equipamentoId)
          const exists = await prisma.equipamentoResponsabilidade.findFirst({
            where: { equipamentoId: novoId, descricao, tipo },
          });

          if (exists) {
            stats.responsabilidadesSkipped++;
            log('Responsabilidades', `  ⏭️ Já existe: ${nomeLegacy} → "${descricao}" (${tipo})`);
            continue;
          }

          await prisma.equipamentoResponsabilidade.create({
            data: {
              equipamentoId: novoId,
              descricao,
              tipo,
              importante,
              ordem,
            },
          });
          stats.responsabilidadesCriadas++;
          log('Responsabilidades', `  ✅ ${nomeLegacy} → "${descricao}" (${tipo}${importante ? ' ⚠️ IMPORTANTE' : ''})`);
        } else {
          log('Responsabilidades', `  [DRY] ${nomeLegacy} → "${descricao}" (${tipo}${importante ? ' ⚠️' : ''})`);
          stats.responsabilidadesCriadas++;
        }
      }

      if (respLinks.length > 0) stats.equipamentosMatchados++;
    } catch (e: any) {
      log('Responsabilidades', `❌ ERRO equipamento "${nomeLegacy}" (id=${eq.id}): ${e.message}`);
      stats.erros++;
    }
  }

  // ─── RELATÓRIO FINAL ──────────────────────────────────────

  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  RELATÓRIO FINAL ${COMMIT ? '(COMMIT)' : '(DRY-RUN)'}`);
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Equipamentos no legado:     ${stats.equipamentosTotal}`);
  console.log(`  Equipamentos matchados:     ${stats.equipamentosMatchados}`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  Acessórios vinculados:      ${stats.acessoriosVinculados}`);
  console.log(`  Acessórios já existentes:   ${stats.acessoriosSkipped}`);
  console.log(`  Acessórios novos criados:   ${stats.acessoriosCriados}`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  Responsabilidades criadas:  ${stats.responsabilidadesCriadas}`);
  console.log(`  Responsabilidades existentes: ${stats.responsabilidadesSkipped}`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  Erros:                      ${stats.erros}`);

  if (stats.equipamentosNaoEncontrados.length > 0) {
    console.log('');
    console.log('  ⚠️ EQUIPAMENTOS NÃO ENCONTRADOS NO SISTEMA NOVO:');
    stats.equipamentosNaoEncontrados.forEach(n => console.log(`     - "${n}"`));
  }

  console.log('═══════════════════════════════════════════════════════');

  if (!COMMIT) {
    console.log('');
    console.log('  💡 Este foi um DRY-RUN. Para aplicar as mudanças:');
    console.log('     npx ts-node src/scripts/migration/migrate-equipamento-relations.ts --commit');
    console.log('');
    console.log('  ⚠️ ANTES de rodar --commit:');
    console.log('     1. Crie um branch no Neon (backup)');
    console.log('     2. Valide os números acima');
    console.log('');
  }

  // Cleanup
  await db.end();
  await prisma.$disconnect();
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('❌ ERRO FATAL:', e);
    process.exit(1);
  });
