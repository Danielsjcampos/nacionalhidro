#!/usr/bin/env node
/**
 * ============================================================
 * Inspeção Rápida do Banco Legado — Antes de Migrar
 * ============================================================
 *
 * COMO USAR:
 *   LEGACY_DB_PASS=sua_senha npx ts-node scripts/migration/inspect-legacy.ts
 *
 * Exibe a contagem de registros de cada tabela principal.
 */

import mysql from 'mysql2/promise'

const LEGACY = {
  host:     process.env.LEGACY_DB_HOST     || 'localhost',
  port:     parseInt(process.env.LEGACY_DB_PORT || '3306'),
  database: process.env.LEGACY_DB_NAME     || 'nhidro',
  user:     process.env.LEGACY_DB_USER     || 'root',
  password: process.env.LEGACY_DB_PASS     || '',
}

const TABLES = [
  'clientes',
  'fornecedores',
  'funcionarios',
  'equipamentos',
  'veiculos',
  'propostas',
  'ordem_servicos',
  'medicoes',
  'faturamentos',
  'contas',
  'conta_pagamentos',
  'conta_pagamento_parcelas',
  'contas_receber',
  'conta_recebimentos',
  'conta_recebimento_parcelas',
  'acessorios',
  'equipamento_acessorios',
  'escalas',
  'up_users',  // usuários do Strapi
]

async function main() {
  console.log('\n🔍 Inspecionando banco legado:', LEGACY.database)
  console.log('-'.repeat(50))

  const db = await mysql.createConnection(LEGACY)

  for (const table of TABLES) {
    try {
      const [rows] = await db.query<any[]>(`SELECT COUNT(*) as total FROM \`${table}\``)
      const total = rows[0]?.total ?? 0
      console.log(`  ${table.padEnd(30)} ${String(total).padStart(8)} registros`)
    } catch (e: any) {
      console.log(`  ${table.padEnd(30)}   ⚠️  erro: ${e.message}`)
    }
  }

  // Listar todas as tabelas do banco
  console.log('\n📋 Todas as tabelas no banco:')
  const [allTables] = await db.query<any[]>(
    `SELECT TABLE_NAME, TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?`,
    [LEGACY.database]
  )
  for (const t of allTables) {
    console.log(`  ${t.TABLE_NAME.padEnd(50)} ~${t.TABLE_ROWS} rows`)
  }

  await db.end()
  console.log('\n✅ Pronto!\n')
}

main().catch((e) => {
  console.error('Erro:', e.message)
  process.exit(1)
})
