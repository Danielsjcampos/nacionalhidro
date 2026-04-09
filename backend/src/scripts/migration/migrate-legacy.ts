/**
 * ============================================================
 * SCRIPT DE MIGRAÇÃO — Sistema Legado → Sistema Novo
 * Legado:  MySQL (Strapi 4.7) @ nhidro_prod_20260331.sql
 * Destino: PostgreSQL (Prisma) @ Neon
 * ============================================================
 *
 * COMO USAR:
 * 1. Restaure o dump MySQL localmente:
 *    docker run -d --name mysql-legacy -e MYSQL_ROOT_PASSWORD=legacy123 -e MYSQL_DATABASE=nhidro -p 3307:3306 mysql:8.0
 *    sleep 20
 *    gzip -dc documentos/nhidro_prod_20260331.sql.gz | docker exec -i mysql-legacy mysql -u root -plegacy123 nhidro
 *
 * 2. Configure as variáveis de ambiente:
 *    LEGACY_DB_HOST=localhost
 *    LEGACY_DB_PORT=3307
 *    LEGACY_DB_NAME=nhidro
 *    LEGACY_DB_USER=root
 *    LEGACY_DB_PASS=legacy123
 *    DATABASE_URL=postgresql://...  (Neon — já existe)
 *
 * 3. Execute:
 *    npx ts-node src/scripts/migration/migrate-legacy.ts
 *
 * 4. Verifique o relatório ao final.
 */

import mysql from 'mysql2/promise'
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'

// ─── Configuração ───────────────────────────────────────────

const LEGACY = {
  host:     process.env.LEGACY_DB_HOST     || 'localhost',
  port:     parseInt(process.env.LEGACY_DB_PORT || '3307'),
  database: process.env.LEGACY_DB_NAME     || 'nhidro',
  user:     process.env.LEGACY_DB_USER     || 'root',
  password: process.env.LEGACY_DB_PASS     || 'legacy123',
}

const DEFAULT_PASSWORD = 'NacionalHidro@2026'

const prisma = new PrismaClient()

// ─── Mapa de IDs (old int → new uuid) ──────────────────────

const idMap = {
  clientes:        new Map<number, string>(),
  fornecedores:    new Map<number, string>(),
  funcionarios:    new Map<number, string>(),
  equipamentos:    new Map<number, string>(),
  veiculos:        new Map<number, string>(),
  propostas:       new Map<number, string>(),
  ordens:          new Map<number, string>(),
  escalas:         new Map<number, string>(),
  medicoes:        new Map<number, string>(),
  faturamentos:    new Map<number, string>(),
  empresas:        new Map<number, string>(),
  contasBancarias: new Map<number, string>(),
  empresaNames:    new Map<number, string>(),
  responsabilidades: new Map<number, string>(),
  users:           new Map<number, string>(),
  categorias:      new Map<string, string>(), // roleName → categoryId
}

// ─── Utilitários ────────────────────────────────────────────

const stats: Record<string, { ok: number; skip: number; err: number }> = {}

function initStat(name: string) {
  stats[name] = { ok: 0, skip: 0, err: 0 }
}

function log(label: string, msg: string) {
  console.log(`[${label}] ${msg}`)
}

// ─── MIGRAÇÃO: Empresas (EmpresaCNPJ) ───────────────────────

async function migrateEmpresas(db: mysql.Connection) {
  initStat('Empresas')
  log('Empresas', 'Iniciando...')

  const [rows] = await db.query<any[]>(`SELECT * FROM empresas`)

  for (const row of rows) {
    try {
      const newId = randomUUID()
      const cnpj = row.cnpj || `MIGRADO-${row.id}`

      // IGNORAR EMPRESAS GENÉRICAS
      if (!row.cnpj || row.descricao?.toUpperCase().includes('EMPRESA ')) {
        log('Empresas', `PULANDO Empresa Genérica id=${row.id} (${row.descricao})`)
        stats['Empresas'].skip++
        continue
      }

      const exists = await prisma.empresaCNPJ.findFirst({ where: { cnpj } })
      if (exists) {
        idMap.empresas.set(row.id, exists.id)
        idMap.empresaNames.set(row.id, exists.nome)
        stats['Empresas'].skip++
        continue
      }

      await prisma.empresaCNPJ.create({
        data: {
          id:                 newId,
          nome:               row.descricao || `Empresa ${row.id}`,
          cnpj:               cnpj,
          razaoSocial:        row.descricao || null,
          inscricaoEstadual:  row.inscricao_estadual || null,
          inscricaoMunicipal: row.inscricao_municipal || null,
          regimeTributario:   row.regime_tributario || null,
          naturezaOperacao:   row.natureza_operacao || null,
          cnae:               row.cnae || null,
          rntrc:              row.rntrc || null,
          logradouro:         row.logradouro || null,
          numero:             row.numero != null ? String(row.numero) : null,
          bairro:             row.bairro || null,
          municipio:          row.municipio || null,
          uf:                 row.uf || null,
          cep:                row.cep || null,
          codigoMunicipio:    row.codigo_municipio || null,
          endereco:           row.endereco || null,
          telefone:           row.telefone || null,
          focusToken:         row.focus_token || null,
          ativa:              true,
          createdAt:          row.created_at || new Date(),
          updatedAt:          row.updated_at || new Date(),
        },
      })
      idMap.empresas.set(row.id, newId)
      idMap.empresaNames.set(row.id, row.descricao || `Empresa ${row.id}`)
      stats['Empresas'].ok++
    } catch (e: any) {
      log('Empresas', `ERRO id=${row.id}: ${e.message}`)
      stats['Empresas'].err++
    }
  }
  log('Empresas', `✅ ok=${stats['Empresas'].ok} skip=${stats['Empresas'].skip} err=${stats['Empresas'].err}`)
}

// ─── MIGRAÇÃO: Contas Bancárias ─────────────────────────────

async function migrateContasBancarias(db: mysql.Connection) {
  initStat('ContasBancarias')
  log('ContasBancarias', 'Iniciando...')

  const [rows] = await db.query<any[]>(`
    SELECT eb.*, ebl.empresa_id 
    FROM empresas_bancos eb
    LEFT JOIN empresas_bancos_empresa_links ebl ON ebl.empresa_banco_id = eb.id
  `)

  for (const row of rows) {
    try {
      const newId = randomUUID()
      const nomeBanco = row.banco || `Legado ${row.id}`
      const contaNum = row.conta || null

      const exists = await prisma.contaBancaria.findFirst({
        where: { nome: nomeBanco, conta: contaNum }
      })
      if (exists) {
        idMap.contasBancarias.set(row.id, exists.id)
        stats['ContasBancarias'].skip++
        continue
      }

      const empresaNome = row.empresa_id
        ? idMap.empresaNames.get(row.empresa_id)
        : null

      await prisma.contaBancaria.create({
        data: {
          id:      newId,
          nome:    nomeBanco,
          banco:   row.banco || null,
          agencia: row.agencia || null,
          conta:   contaNum,
          tipo:    'CORRENTE',
          ativa:   true,
          empresa: empresaNome || null,
          createdAt: row.created_at || new Date(),
          updatedAt: row.updated_at || new Date(),
        },
      })
      idMap.contasBancarias.set(row.id, newId)
      stats['ContasBancarias'].ok++
    } catch (e: any) {
      log('ContasBancarias', `ERRO id=${row.id}: ${e.message}`)
      stats['ContasBancarias'].err++
    }
  }
  log('ContasBancarias', `✅ ok=${stats['ContasBancarias'].ok} skip=${stats['ContasBancarias'].skip} err=${stats['ContasBancarias'].err}`)
}

// ─── MIGRAÇÃO: Clientes ──────────────────────────────────────

async function migrateClientes(db: mysql.Connection) {
  initStat('Clientes')
  log('Clientes', 'Iniciando...')

  const [rows] = await db.query<any[]>(`SELECT * FROM clientes`)

  for (const row of rows) {
    try {
      const newId = randomUUID()

      const documento = row.cnpj || row.cpf || `MIGRADO-${row.id}`

      // IGNORAR CLIENTES GENÉRICOS
      if ((!row.cnpj && !row.cpf) || row.razao_social?.toUpperCase().includes('CLIENTE ')) {
        log('Clientes', `PULANDO Cliente Genérico id=${row.id} (${row.razao_social})`)
        stats['Clientes'].skip++
        continue
      }

      const exists = await prisma.cliente.findFirst({
        where: { documento },
      })

      if (exists) {
        idMap.clientes.set(row.id, exists.id)
        stats['Clientes'].skip++
        continue
      }

      await prisma.cliente.create({
        data: {
          id:                 newId,
          nome:               row.razao_social || row.nome_fantasia || `Cliente ${row.id}`,
          razaoSocial:        row.razao_social || null,
          nomeFantasia:       row.nome_fantasia || null,
          documento:          documento,
          inscricaoEstadual:  row.ie || null,
          inscricaoMunicipal: row.inscricao_municipal || null,
          tipo:               row.tipo_pessoa === 2 ? 'PF' : 'PJ',
          segmento:           row.segmento || null,
          endereco:           row.endereco || null,
          numero:             row.numero || null,
          complemento:        row.complemento || null,
          bairro:             row.bairro || null,
          cidade:             row.cidade || null,
          estado:             row.estado_sigla || null,
          uf:                 row.estado_sigla || null,
          cep:                row.cep || null,
          pontoReferencia:    row.ponto_referencia || null,
          email:              row.email || null,
          telefone:           row.telefone || null,
          celular:            row.celular || null,
          fax:                row.fax || null,
          aceitaCTe:          row.cte === 1,
          porcentagemRL:      row.porcentagem_rl != null ? Math.min(Number(row.porcentagem_rl), 999.99) : null,
          diasVencimentoRL:   row.dias_vencimento || null,
          bloquearCliente:    row.bloqueado === 1,
          observacoesGerais:  row.observacao || null,
          orientacoesFatura:  row.observacao_cobranca || null,
          linkPortal:         row.link_portal || null,
          usuarioPortal:      row.usuario_portal || null,
          senhaPortal:        row.senha_portal || null,
          createdAt:          row.created_at || new Date(),
          updatedAt:          row.updated_at || new Date(),
        },
      })

      idMap.clientes.set(row.id, newId)
      stats['Clientes'].ok++
    } catch (e: any) {
      log('Clientes', `ERRO id=${row.id}: ${e.message}`)
      stats['Clientes'].err++
    }
  }

  log('Clientes', `✅ ok=${stats['Clientes'].ok} skip=${stats['Clientes'].skip} err=${stats['Clientes'].err}`)
}

// ─── MIGRAÇÃO: Fornecedores ──────────────────────────────────

async function migrateFornecedores(db: mysql.Connection) {
  initStat('Fornecedores')
  log('Fornecedores', 'Iniciando...')

  const [rows] = await db.query<any[]>(`SELECT * FROM fornecedores`)

  for (const row of rows) {
    try {
      const newId = randomUUID()

      const documento = row.cnpj || null

      if (documento) {
        const exists = await prisma.fornecedor.findFirst({ where: { documento } })
        if (exists) {
          idMap.fornecedores.set(row.id, exists.id)
          stats['Fornecedores'].skip++
          continue
        }
      }

      await prisma.fornecedor.create({
        data: {
          id:          newId,
          nome:        row.nome || row.nome_fantasia || `Fornecedor ${row.id}`,
          razaoSocial: row.nome || null,
          documento:   documento,
          tipo:        'PJ',
          endereco:    row.endereco || null,
          email:       row.email || null,
          telefone:    row.telefone || null,
          banco:       row.banco || null,
          agencia:     row.agencia_banco || null,
          conta:       row.conta_banco || null,
          chavePix:    row.chave_pix || null,
          contato:     row.contato_financeiro ? String(row.contato_financeiro).substring(0, 255) : null,
          observacoes: row.contato_venda || null,
          ativo:       row.bloqueado !== 1,
          createdAt:   row.created_at || new Date(),
          updatedAt:   row.updated_at || new Date(),
        },
      })
      idMap.fornecedores.set(row.id, newId)
      stats['Fornecedores'].ok++
    } catch (e: any) {
      log('Fornecedores', `ERRO id=${row.id}: ${e.message}`)
      stats['Fornecedores'].err++
    }
  }

  log('Fornecedores', `✅ ok=${stats['Fornecedores'].ok} skip=${stats['Fornecedores'].skip} err=${stats['Fornecedores'].err}`)
}

// ─── MIGRAÇÃO: Responsabilidades ─────────────────────────────

async function migrateResponsabilidades(db: mysql.Connection) {
  initStat('Responsabilidades')
  log('Responsabilidades', 'Iniciando...')

  const [rows] = await db.query<any[]>(`SELECT * FROM responsabilidades WHERE inativo IS NULL OR inativo = 0`)

  for (const row of rows) {
    try {
      const newId = randomUUID()

      const descricao = row.responsabilidade || `Responsabilidade ${row.id}`

      const exists = await prisma.responsabilidadePadrao.findFirst({
        where: { descricao }
      })
      if (exists) {
        idMap.responsabilidades.set(row.id, exists.id)
        stats['Responsabilidades'].skip++
        continue
      }

      // responsavel: 1 = CONTRATANTE, qualquer outro = CONTRATADA
      const tipo = row.responsavel === 1 ? 'CONTRATANTE' : 'CONTRATADA'

      await prisma.responsabilidadePadrao.create({
        data: {
          id:        newId,
          descricao: descricao,
          tipo:      tipo,
          createdAt: row.created_at || new Date(),
          updatedAt: row.updated_at || new Date(),
        },
      })
      idMap.responsabilidades.set(row.id, newId)
      stats['Responsabilidades'].ok++
    } catch (e: any) {
      log('Responsabilidades', `ERRO id=${row.id}: ${e.message}`)
      stats['Responsabilidades'].err++
    }
  }

  log('Responsabilidades', `✅ ok=${stats['Responsabilidades'].ok} skip=${stats['Responsabilidades'].skip} err=${stats['Responsabilidades'].err}`)
}

// ─── MIGRAÇÃO: Funcionários ──────────────────────────────────

async function migrateFuncionarios(db: mysql.Connection) {
  initStat('Funcionarios')
  log('Funcionarios', 'Iniciando...')

  const [rows] = await db.query<any[]>(`SELECT * FROM funcionarios`)

  for (const row of rows) {
    try {
      const newId = randomUUID()

      const cpf = `MIGRADO-FUNC-${row.id}`

      const exists = await prisma.funcionario.findFirst({ where: { cpf } })
      if (exists) {
        idMap.funcionarios.set(row.id, exists.id)
        stats['Funcionarios'].skip++
        continue
      }

      const motivoAfastamentoMap: Record<number, string> = {
        1: 'Atestado médico',
        2: 'Licença médica',
        3: 'Acidente de trabalho',
        4: 'Licença maternidade/paternidade',
        5: 'Suspensão',
      }

      await prisma.funcionario.create({
        data: {
          id:                newId,
          nome:              row.nome || `Funcionário ${row.id}`,
          cargo:             'A definir',
          departamento:      'A definir',
          salario:           0,
          dataAdmissao:      row.created_at || new Date(),
          cpf:               cpf,
          ativo:             row.bloqueado !== 1,
          status:            row.bloqueado === 1 ? 'DESLIGADO' : 'ATIVO',
          feriasInicio:      row.inicio_afastamento || null,
          feriasFim:         row.fim_afastamento || null,
          motivoAfastamento: row.motivo_afastamento
            ? motivoAfastamentoMap[row.motivo_afastamento] || `Código ${row.motivo_afastamento}`
            : null,
          createdAt:         row.created_at || new Date(),
          updatedAt:         row.updated_at || new Date(),
        },
      })
      idMap.funcionarios.set(row.id, newId)
      stats['Funcionarios'].ok++
    } catch (e: any) {
      log('Funcionarios', `ERRO id=${row.id}: ${e.message}`)
      stats['Funcionarios'].err++
    }
  }

  log('Funcionarios', `✅ ok=${stats['Funcionarios'].ok} skip=${stats['Funcionarios'].skip} err=${stats['Funcionarios'].err}`)
}

// ─── MIGRAÇÃO: Equipamentos ──────────────────────────────────

async function migrateEquipamentos(db: mysql.Connection) {
  initStat('Equipamentos')
  log('Equipamentos', 'Iniciando...')

  const [rows] = await db.query<any[]>(`SELECT * FROM equipamentos`)

  for (const row of rows) {
    try {
      const newId = randomUUID()

      const nome = row.equipamento || `Equipamento ${row.id}`
      const exists = await prisma.equipamento.findFirst({ where: { nome } })
      if (exists) {
        idMap.equipamentos.set(row.id, exists.id)
        stats['Equipamentos'].skip++
        continue
      }

      await prisma.equipamento.create({
        data: {
          id:        newId,
          nome:      nome,
          descricao: row.descricao || null,
          ativo:     row.ativo !== 0,
          imagem:    row.url_imagem || null,
          createdAt: row.created_at || new Date(),
          updatedAt: row.updated_at || new Date(),
        },
      })
      idMap.equipamentos.set(row.id, newId)
      stats['Equipamentos'].ok++
    } catch (e: any) {
      log('Equipamentos', `ERRO id=${row.id}: ${e.message}`)
      stats['Equipamentos'].err++
    }
  }

  log('Equipamentos', `✅ ok=${stats['Equipamentos'].ok} skip=${stats['Equipamentos'].skip} err=${stats['Equipamentos'].err}`)
}

// ─── MIGRAÇÃO: Veículos ──────────────────────────────────────

async function migrateVeiculos(db: mysql.Connection) {
  initStat('Veiculos')
  log('Veiculos', 'Iniciando...')

  const [rows] = await db.query<any[]>(`SELECT * FROM veiculos`)

  for (const row of rows) {
    try {
      const newId = randomUUID()

      const placa = row.placa || `SEM-PLACA-${row.id}`
      const exists = await prisma.veiculo.findFirst({ where: { placa } })
      if (exists) {
        idMap.veiculos.set(row.id, exists.id)
        stats['Veiculos'].skip++
        continue
      }

      await prisma.veiculo.create({
        data: {
          id:      newId,
          placa:   placa,
          modelo:  row.modelo || 'A identificar',
          marca:   row.marca || null,
          ano:     row.ano || null,
          kmAtual: row.km || 0,
          status:  row.ativo !== 0 ? 'DISPONIVEL' : 'MANUTENCAO',
          tipo:    'CAMINHAO',
          createdAt: row.created_at || new Date(),
          updatedAt: row.updated_at || new Date(),
        },
      })
      idMap.veiculos.set(row.id, newId)
      stats['Veiculos'].ok++
    } catch (e: any) {
      log('Veiculos', `ERRO id=${row.id}: ${e.message}`)
      stats['Veiculos'].err++
    }
  }

  log('Veiculos', `✅ ok=${stats['Veiculos'].ok} skip=${stats['Veiculos'].skip} err=${stats['Veiculos'].err}`)
}

// ─── MIGRAÇÃO: Propostas ─────────────────────────────────────

async function migratePropostas(db: mysql.Connection) {
  initStat('Propostas')
  log('Propostas', 'Iniciando...')

  const [rows] = await db.query<any[]>(`
    SELECT p.*, cl.cliente_id, el.empresa_id 
    FROM propostas p
    LEFT JOIN propostas_cliente_links cl ON cl.proposta_id = p.id
    LEFT JOIN propostas_empresa_links el ON el.proposta_id = p.id
  `)

  const statusMap: Record<number, string> = {
    1: 'ENVIADA',
    2: 'ACEITA',
    3: 'RECUSADA',
    4: 'RASCUNHO',
    5: 'RASCUNHO',
  }

  for (const row of rows) {
    try {
      const newId = randomUUID()

      const codigo = row.codigo
        ? `PROP-LEGADO-${row.codigo}`
        : `PROP-LEGADO-${row.id}`

      const exists = await prisma.proposta.findFirst({ where: { codigo } })
      if (exists) {
        idMap.propostas.set(row.id, exists.id)
        stats['Propostas'].skip++
        continue
      }

      const clienteId = row.cliente_id
        ? idMap.clientes.get(row.cliente_id)
        : null

      if (!clienteId) {
        log('Propostas', `Pulando id=${row.id} — cliente não encontrado`)
        stats['Propostas'].skip++
        continue
      }

      const empresaNome = row.empresa_id
        ? idMap.empresaNames.get(row.empresa_id)
        : 'NACIONAL HIDROSANEAMENTO EIRELI EPP'

      await prisma.proposta.create({
        data: {
          id:                 newId,
          codigo,
          clienteId,
          empresa:            empresaNome,
          dataProposta:       row.data_proposta ? new Date(row.data_proposta) : new Date(),
          dataValidade:       row.data_validade ? new Date(row.data_validade) : new Date(Date.now() + 30 * 86400000),
          introducao:         row.introducao || null,
          objetivo:           row.objetivo || null,
          descricaoValores:   row.descricao_valores || null,
          descricaoGarantia:  row.descricao_garantia || null,
          condicoesPagamento: row.condicao_pagamento || null,
          pRL:                row.porcentagem_rl != null ? Math.min(Number(row.porcentagem_rl), 999.99) : null,
          cTe:                row.cte === 1 ? 'SIM' : null,
          pagamentoAntecipado: row.pagamento_antecipado === 1 ? 'SIM' : null,
          valorTotal:         row.valor || 0,
          status:             row.status != null ? (statusMap[row.status] || 'RASCUNHO') : 'RASCUNHO',
          observacoes:        null,
          createdAt:          row.created_at || new Date(),
          updatedAt:          row.updated_at || new Date(),
        },
      })
      idMap.propostas.set(row.id, newId)
      stats['Propostas'].ok++
    } catch (e: any) {
      log('Propostas', `ERRO id=${row.id}: ${e.message}`)
      stats['Propostas'].err++
    }
  }

  log('Propostas', `✅ ok=${stats['Propostas'].ok} skip=${stats['Propostas'].skip} err=${stats['Propostas'].err}`)
}

// ─── MIGRAÇÃO: Ordens de Serviço ─────────────────────────────

async function migrateOrdens(db: mysql.Connection) {
  initStat('OrdensServico')
  log('OrdensServico', 'Iniciando...')

  const [rows] = await db.query<any[]>(`
    SELECT o.*, c.cliente_id, p.proposta_id, e.empresa_id
    FROM ordem_servicos o
    LEFT JOIN ordem_servicos_cliente_links c ON c.ordem_servico_id = o.id
    LEFT JOIN ordem_servicos_proposta_links p ON p.ordem_servico_id = o.id
    LEFT JOIN ordem_servicos_empresa_links e ON e.ordem_servico_id = o.id
  `)

  const statusMap: Record<number, string> = {
    1: 'ABERTA',
    2: 'EM_EXECUCAO',
    3: 'BAIXADA',
    4: 'CANCELADA',
    5: 'FATURADA',
  }

  for (const row of rows) {
    try {
      const newId = randomUUID()

      const codigo = row.numero
        ? `${row.numero}/LEGADO`
        : `OS-LEGADO-${row.id}`

      const exists = await prisma.ordemServico.findFirst({ where: { codigo } })
      if (exists) {
        idMap.ordens.set(row.id, exists.id)
        stats['OrdensServico'].skip++
        continue
      }

      const clienteId = row.cliente_id
        ? idMap.clientes.get(row.cliente_id)
        : null

      if (!clienteId) {
        stats['OrdensServico'].skip++
        continue
      }

      const propostaId = row.proposta_id
        ? idMap.propostas.get(row.proposta_id)
        : null

      const empresaNome = row.empresa_id
        ? idMap.empresaNames.get(row.empresa_id)
        : 'NACIONAL HIDROSANEAMENTO EIRELI EPP'

      await prisma.ordemServico.create({
        data: {
          id:          newId,
          codigo,
          clienteId,
          propostaId:  propostaId || null,
          empresa:     empresaNome,
          dataInicial: row.data_inicial ? new Date(row.data_inicial) : new Date(),
          horaInicial: row.hora_inicial || null,
          tipoCobranca: row.tipo_cobranca != null ? String(row.tipo_cobranca) : null,
          contato:     row.acompanhante || null,
          acompanhante: row.acompanhante || null,
          observacoes: row.observacoes || null,
          status:      row.status != null ? (statusMap[row.status] || 'ABERTA') : 'ABERTA',
          dataBaixa:   row.data_baixa ? new Date(row.data_baixa) : null,
          justificativaCancelamento: row.motivo_cancelamento || null,
          createdAt:   row.created_at || new Date(),
          updatedAt:   row.updated_at || new Date(),
        },
      })
      idMap.ordens.set(row.id, newId)
      stats['OrdensServico'].ok++
    } catch (e: any) {
      log('OrdensServico', `ERRO id=${row.id}: ${e.message}`)
      stats['OrdensServico'].err++
    }
  }

  log('OrdensServico', `✅ ok=${stats['OrdensServico'].ok} skip=${stats['OrdensServico'].skip} err=${stats['OrdensServico'].err}`)
}

// ─── MIGRAÇÃO: Medições ──────────────────────────────────────

async function migrateMedicoes(db: mysql.Connection) {
  initStat('Medicoes')
  log('Medicoes', 'Iniciando...')

  const [rows] = await db.query<any[]>(`
    SELECT m.*, c.cliente_id, e.empresa_id
    FROM medicoes m
    LEFT JOIN medicoes_cliente_links c ON c.medicao_id = m.id
    LEFT JOIN medicoes_empresa_links e ON e.medicao_id = m.id
  `)

  const statusMap: Record<number, string> = {
    1: 'EM_ABERTO',
    2: 'APROVADA',
    3: 'FATURADA',
    4: 'CANCELADA',
  }

  for (const row of rows) {
    try {
      const newId = randomUUID()

      const codigo = row.codigo
        ? `MED-LEGADO-${row.codigo}`
        : `MED-LEGADO-${row.id}`

      const exists = await prisma.medicao.findFirst({ where: { codigo } })
      if (exists) {
        idMap.medicoes.set(row.id, exists.id)
        stats['Medicoes'].skip++
        continue
      }

      const clienteId = row.cliente_id
        ? idMap.clientes.get(row.cliente_id)
        : null

      if (!clienteId) {
        stats['Medicoes'].skip++
        continue
      }

      await prisma.medicao.create({
        data: {
          id:            newId,
          codigo,
          clienteId,
          valorTotal:    row.valor_total || 0,
          valorRL:       row.valor_rl || null,
          valorNFSe:     row.valor_servico || null,
          status:        row.status != null ? (statusMap[row.status] || 'EM_ABERTO') : 'EM_ABERTO',
          observacoes:   row.observacoes || null,
          aprovadaEm:    row.data_aprovacao ? new Date(row.data_aprovacao) : null,
          aprovadaPor:   row.solicitante || null,
          justificativaCancelamento: row.motivo_cancelamento || null,
          createdAt:     row.data_criacao ? new Date(row.data_criacao) : new Date(),
          updatedAt:     row.updated_at || new Date(),
        },
      })
      idMap.medicoes.set(row.id, newId)
      stats['Medicoes'].ok++
    } catch (e: any) {
      log('Medicoes', `ERRO id=${row.id}: ${e.message}`)
      stats['Medicoes'].err++
    }
  }

  log('Medicoes', `✅ ok=${stats['Medicoes'].ok} skip=${stats['Medicoes'].skip} err=${stats['Medicoes'].err}`)
}

// ─── MIGRAÇÃO: Faturamentos ──────────────────────────────────

async function migrateFaturamentos(db: mysql.Connection) {
  initStat('Faturamentos')
  log('Faturamentos', 'Iniciando...')

  const [rows] = await db.query<any[]>(`
    SELECT f.*, c.cliente_id, m.medicao_id, e.empresa_id
    FROM faturamentos f
    LEFT JOIN faturamentos_cliente_links c ON c.faturamento_id = f.id
    LEFT JOIN faturamentos_medicao_links m ON m.faturamento_id = f.id
    LEFT JOIN faturamentos_empresa_links e ON e.faturamento_id = f.id
  `)

  const statusMap: Record<number, string> = {
    1: 'EMITIDA',
    2: 'ENVIADA',
    3: 'PAGA',
    4: 'CANCELADA',
    5: 'VENCIDA',
  }

  for (const row of rows) {
    try {
      const newId = randomUUID()

      const clienteId = row.cliente_id
        ? idMap.clientes.get(row.cliente_id)
        : null

      if (!clienteId) {
        stats['Faturamentos'].skip++
        continue
      }

      const medicaoId = row.medicao_id
        ? idMap.medicoes.get(row.medicao_id)
        : null

      await prisma.faturamento.create({
        data: {
          id:              newId,
          clienteId,
          medicaoId:       medicaoId || null,
          tipo:            row.tipo_fatura || 'RL',
          numero:          row.nota || null,
          dataEmissao:     row.data_emissao ? new Date(row.data_emissao) : new Date(),
          dataVencimento:  row.data_vencimento ? new Date(row.data_vencimento) : null,
          valorBruto:      row.valor_total || 0,
          valorINSS:       row.valor_inss || 0,
          valorISS:        row.valor_iss || 0,
          valorIR:         row.valor_ir || 0,
          valorCSLL:       row.valor_csll || 0,
          valorPIS:        row.valor_pis || 0,
          valorCOFINS:     row.valor_cofins || 0,
          valorLiquido:    row.valor_liquido || row.valor_total || 0,
          status:          row.status != null ? (statusMap[row.status] || 'EMITIDA') : 'EMITIDA',
          observacoes:     row.observacoes || null,
          focusRef:        row.focus_referencia || null,
          createdAt:       row.data_criacao ? new Date(row.data_criacao) : new Date(),
          updatedAt:       row.updated_at || new Date(),
        },
      })
      idMap.faturamentos.set(row.id, newId)
      stats['Faturamentos'].ok++
    } catch (e: any) {
      log('Faturamentos', `ERRO id=${row.id}: ${e.message}`)
      stats['Faturamentos'].err++
    }
  }

  log('Faturamentos', `✅ ok=${stats['Faturamentos'].ok} skip=${stats['Faturamentos'].skip} err=${stats['Faturamentos'].err}`)
}

// ─── MIGRAÇÃO: Acessórios (Relacional -> Json no Equipamento) ────────

async function migrateAcessorios(db: mysql.Connection) {
  initStat('Acessorios')
  log('Acessorios', 'Iniciando...')

  const [equipamentos] = await db.query<any[]>(`SELECT id FROM equipamentos`)

  for (const eq of equipamentos) {
    try {
      const [links] = await db.query<any[]>(`
        SELECT a.nome 
        FROM acessorios a
        JOIN equipamento_acessorios_acessorio_links eal ON eal.acessorio_id = a.id
        JOIN equipamentos_equipamento_acessorios_links eel ON eel.equipamento_acessorio_id = eal.equipamento_acessorio_id
        WHERE eel.equipamento_id = ?
      `, [eq.id])

      const acessorioNames = links.map((l: any) => l.nome)
      const novoId = idMap.equipamentos.get(eq.id)

      if (novoId && acessorioNames.length > 0) {
        await prisma.equipamento.update({
          where: { id: novoId },
          data: { acessorios: acessorioNames }
        })
        stats['Acessorios'].ok++
      }
    } catch (e: any) {
      log('Acessorios', `ERRO equipamento_id=${eq.id}: ${e.message}`)
      stats['Acessorios'].err++
    }
  }
  log('Acessorios', `✅ ok=${stats['Acessorios'].ok} err=${stats['Acessorios'].err}`)
}

// ─── MIGRAÇÃO: Equipamento ↔ Responsabilidades (JSON) ────────

async function migrateEquipamentoResponsabilidades(db: mysql.Connection) {
  initStat('EquipResponsabilidades')
  log('EquipResponsabilidades', 'Iniciando...')

  const [equipamentos] = await db.query<any[]>(`SELECT id FROM equipamentos`)

  for (const eq of equipamentos) {
    try {
      // Buscar as responsabilidades associadas a esse equipamento
      const [links] = await db.query<any[]>(`
        SELECT r.responsabilidade, r.responsavel
        FROM responsabilidades r
        JOIN equipamento_responsabilidades er 
          ON er.id IN (
            SELECT equipamento_responsabilidade_id 
            FROM equipamento_responsabilidades_responsabilidade_links 
            WHERE responsabilidade_id = r.id
          )
        JOIN equipamentos_equipamento_responsabilidades_links eerl 
          ON eerl.equipamento_responsabilidade_id = er.id
        WHERE eerl.equipamento_id = ?
      `, [eq.id])

      const novoId = idMap.equipamentos.get(eq.id)

      if (novoId && links.length > 0) {
        const responsabilidadesJson = links.map((l: any) => ({
          responsabilidade: l.responsabilidade || 'Sem descrição',
          responsavel: l.responsavel === 1 ? 'CONTRATANTE' : 'CONTRATADA',
        }))

        await prisma.equipamento.update({
          where: { id: novoId },
          data: { responsabilidades: responsabilidadesJson }
        })
        stats['EquipResponsabilidades'].ok++
      }
    } catch (e: any) {
      log('EquipResponsabilidades', `ERRO equipamento_id=${eq.id}: ${e.message}`)
      stats['EquipResponsabilidades'].err++
    }
  }
  log('EquipResponsabilidades', `✅ ok=${stats['EquipResponsabilidades'].ok} err=${stats['EquipResponsabilidades'].err}`)
}

// ─── MIGRAÇÃO: Contas a Pagar ───────────────────────────────────────

async function migrateContasPagar(db: mysql.Connection) {
  initStat('ContasPagar')
  log('ContasPagar', 'Iniciando...')

  const [rows] = await db.query<any[]>(`
    SELECT c.*, l.fornecedor_id 
    FROM contas c
    LEFT JOIN contas_fornecedor_links l ON l.conta_id = c.id
  `)

  const statusMap: Record<number, string> = {
    1: 'ABERTO',
    2: 'PAGO',
    3: 'CANCELADO',
    4: 'VENCIDO'
  }

  for (const row of rows) {
    try {
      const descricao = row.nome || `Conta ${row.id}`

      const exists = await prisma.contaPagar.findFirst({
        where: { descricao }
      })

      if (exists) {
        stats['ContasPagar'].skip++
        continue
      }

      const fornecedorId = row.fornecedor_id ? idMap.fornecedores.get(row.fornecedor_id) : null

      await prisma.contaPagar.create({
        data: {
          descricao: row.nome || `Conta ${row.id}`,
          valorOriginal: row.valor_total || 0,
          valorTotal: row.valor_total || 0,
          dataVencimento: row.data_vencimento ? new Date(row.data_vencimento) : new Date(),
          dataEmissao: row.created_at || new Date(),
          status: row.status != null ? (statusMap[row.status] || 'ABERTO') : 'ABERTO',
          fornecedorId: fornecedorId,
          observacoes: row.observacoes || null,
          createdAt: row.created_at || new Date(),
          updatedAt: row.updated_at || new Date(),
        }
      })
      stats['ContasPagar'].ok++
    } catch (e: any) {
      log('ContasPagar', `ERRO id=${row.id}: ${e.message}`)
      stats['ContasPagar'].err++
    }
  }
  log('ContasPagar', `✅ ok=${stats['ContasPagar'].ok} skip=${stats['ContasPagar'].skip} err=${stats['ContasPagar'].err}`)
}

// ─── MIGRAÇÃO: Contas a Receber ─────────────────────────────────────

async function migrateContasReceber(db: mysql.Connection) {
  initStat('ContasReceber')
  log('ContasReceber', 'Iniciando...')

  const [rows] = await db.query<any[]>(`
    SELECT c.*, l.cliente_id 
    FROM contas_receber c
    LEFT JOIN contas_receber_cliente_links l ON l.conta_receber_id = c.id
  `)

  const statusMap: Record<number, string> = {
    1: 'PENDENTE',
    2: 'RECEBIDO',
    3: 'CANCELADO',
    4: 'VENCIDO'
  }

  for (const row of rows) {
    try {
      const descricao = row.nota || `Receber ${row.id}`

      const exists = await prisma.contaReceber.findFirst({
        where: { descricao }
      })

      if (exists) {
        stats['ContasReceber'].skip++
        continue
      }

      const clienteId = row.cliente_id ? idMap.clientes.get(row.cliente_id) : null

      await prisma.contaReceber.create({
        data: {
          descricao: row.nota || `Receber ${row.id}`,
          valorOriginal: row.valor_total || 0,
          valorTotal: row.valor_total || 0,
          dataVencimento: row.data_vencimento ? new Date(row.data_vencimento) : new Date(),
          dataEmissao: row.created_at || new Date(),
          status: row.status != null ? (statusMap[row.status] || 'PENDENTE') : 'PENDENTE',
          clienteId: clienteId,
          observacoes: row.observacoes || null,
          createdAt: row.created_at || new Date(),
          updatedAt: row.updated_at || new Date(),
        }
      })
      stats['ContasReceber'].ok++
    } catch (e: any) {
      log('ContasReceber', `ERRO id=${row.id}: ${e.message}`)
      stats['ContasReceber'].err++
    }
  }
  log('ContasReceber', `✅ ok=${stats['ContasReceber'].ok} skip=${stats['ContasReceber'].skip} err=${stats['ContasReceber'].err}`)
}

// ─── MIGRAÇÃO: Usuários + CategoriaEquipe ────────────────────

async function migrateUsuarios(db: mysql.Connection) {
  initStat('CategoriaEquipe')
  initStat('Usuarios')
  log('Usuarios', 'Iniciando...')

  // ── Passo 1: Migrar roles do legado → CategoriaEquipe ──

  const [roles] = await db.query<any[]>(`SELECT * FROM up_roles WHERE type != 'public'`)

  // Mapeamento: role name → permissões no novo sistema
  const rolePermissions: Record<string, Partial<Record<string, boolean>>> = {
    'Gerencial':           { canAccessFinanceiro: true, canAccessContasPagar: true, canAccessContasReceber: true, canAccessCobranca: true, canAccessFaturamento: true, canAccessLogistica: true, canAccessOperacao: true, canAccessMedicoes: true, canAccessManutencao: true, canAccessFrota: true, canAccessEstoque: true, canAccessComercial: true, canAccessRH: true, canAccessDP: true },
    'Comercial':           { canAccessComercial: true },
    'Comercial 2':         { canAccessComercial: true },
    'Comercial 3':         { canAccessComercial: true },
    'Logistica':           { canAccessLogistica: true, canAccessOperacao: true, canAccessFrota: true },
    'Contas Pagar':        { canAccessFinanceiro: true, canAccessContasPagar: true },
    'Faturamento':         { canAccessFaturamento: true, canAccessMedicoes: true },
    'Manutencao':          { canAccessManutencao: true, canAccessFrota: true, canAccessContasPagar: true },
    'Seguranca Trabalho':  { canAccessContasPagar: true, canAccessRH: true },
    'Recursos Humanos':    { canAccessRH: true, canAccessDP: true },
    'Recursos Humanos 2':  { canAccessRH: true, canAccessDP: true, canAccessContasPagar: true },
    'Controle Adm':        { canAccessLogistica: true, canAccessContasPagar: true, canAccessRH: true },
    'Compras':             { canAccessContasPagar: true, canAccessEstoque: true },
    'Integracao':          { canAccessRH: true, canAccessComercial: true },
  }

  for (const role of roles) {
    try {
      const nome = role.name || `Role ${role.id}`

      const exists = await prisma.categoriaEquipe.findFirst({ where: { nome } })
      if (exists) {
        idMap.categorias.set(nome, exists.id)
        stats['CategoriaEquipe'].skip++
        continue
      }

      const perms = rolePermissions[nome] || { canAccessComercial: true }
      const newId = randomUUID()

      await prisma.categoriaEquipe.create({
        data: {
          id:   newId,
          nome: nome,
          canAccessFinanceiro:    perms.canAccessFinanceiro || false,
          canAccessContasPagar:   perms.canAccessContasPagar || false,
          canAccessContasReceber: perms.canAccessContasReceber || false,
          canAccessCobranca:      perms.canAccessCobranca || false,
          canAccessFaturamento:   perms.canAccessFaturamento || false,
          canAccessLogistica:     perms.canAccessLogistica || false,
          canAccessOperacao:      perms.canAccessOperacao || false,
          canAccessMedicoes:      perms.canAccessMedicoes || false,
          canAccessManutencao:    perms.canAccessManutencao || false,
          canAccessFrota:         perms.canAccessFrota || false,
          canAccessEstoque:       perms.canAccessEstoque || false,
          canAccessComercial:     perms.canAccessComercial ?? true,
          canAccessRH:            perms.canAccessRH || false,
          canAccessDP:            perms.canAccessDP || false,
        },
      })
      idMap.categorias.set(nome, newId)
      stats['CategoriaEquipe'].ok++
    } catch (e: any) {
      log('CategoriaEquipe', `ERRO role id=${role.id}: ${e.message}`)
      stats['CategoriaEquipe'].err++
    }
  }

  log('CategoriaEquipe', `✅ ok=${stats['CategoriaEquipe'].ok} skip=${stats['CategoriaEquipe'].skip} err=${stats['CategoriaEquipe'].err}`)

  // ── Passo 2: Migrar users com role links ──

  const [users] = await db.query<any[]>(`
    SELECT u.*, r.name as role_name
    FROM up_users u
    LEFT JOIN up_users_role_links url ON url.user_id = u.id
    LEFT JOIN up_roles r ON r.id = url.role_id
  `)

  const hashedDefaultPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10)

  for (const user of users) {
    try {
      const email = (user.email || '').toLowerCase().trim()
      if (!email) {
        stats['Usuarios'].skip++
        continue
      }

      const exists = await prisma.user.findFirst({ where: { email } })
      if (exists) {
        idMap.users.set(user.id, exists.id)
        
        // Enriquecimento: Se o usuário já existe mas não tem assinatura, atualizamos
        if (user.url_signature && !exists.signatureUrl) {
          await prisma.user.update({
            where: { id: exists.id },
            data: { signatureUrl: user.url_signature }
          })
          log('Usuarios', `Enriquecendo assinatura para: ${email}`)
          stats['Usuarios'].ok++ // Contamos como sucesso de atualização
        } else {
          stats['Usuarios'].skip++
        }
        continue
      }

      const newId = randomUUID()
      const roleName = user.role_name || 'Gerencial'
      const categoryId = idMap.categorias.get(roleName) || null

      // Determinar papel base
      let role = 'user'
      if (roleName === 'Gerencial') role = 'admin'

      await prisma.user.create({
        data: {
          id:          newId,
          email:       email,
          name:        user.username || email.split('@')[0],
          password:    hashedDefaultPassword,
          role:        role,
          roleId:      categoryId,
          signatureUrl: user.url_signature || null,
          isAtivo:     user.blocked !== 1,
          createdAt:   user.created_at || new Date(),
          updatedAt:   user.updated_at || new Date(),
        },
      })
      idMap.users.set(user.id, newId)
      stats['Usuarios'].ok++
    } catch (e: any) {
      log('Usuarios', `ERRO user id=${user.id}: ${e.message}`)
      stats['Usuarios'].err++
    }
  }

  log('Usuarios', `✅ ok=${stats['Usuarios'].ok} skip=${stats['Usuarios'].skip} err=${stats['Usuarios'].err}`)
}

// ─── PRINCIPAL ────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(60))
  console.log('  MIGRAÇÃO NACIONAL HIDRO — Legado → Neon')
  console.log('='.repeat(60))
  console.log(`  Fonte:  MySQL @ ${LEGACY.host}:${LEGACY.port}/${LEGACY.database}`)
  console.log(`  Destino: PostgreSQL (Neon) via Prisma`)
  console.log(`  Senha padrão: ${DEFAULT_PASSWORD}`)
  console.log('='.repeat(60))

  const db = await mysql.createConnection({
    host:     LEGACY.host,
    port:     LEGACY.port,
    database: LEGACY.database,
    user:     LEGACY.user,
    password: LEGACY.password,
  })

  console.log('\n✅ Conexão MySQL estabelecida\n')

  if (process.env.MIGRATE_ONLY_USERS) {
    console.log('🚀 Modo restrito: Migrando apenas Usuários e Permissões\n')
    await migrateUsuarios(db)
    await db.end()
    await prisma.$disconnect()
    console.log('\n🎉 Sincronização de usuários finalizada!\n')
    return
  }

  // Ordem de dependência — deve seguir a hierarquia de FKs
  // 1. Entidades raiz (sem FK)
  await migrateClientes(db)
  await migrateFornecedores(db)
  await migrateFuncionarios(db)
  await migrateEquipamentos(db)
  await migrateVeiculos(db)
  await migrateEmpresas(db)
  await migrateContasBancarias(db)
  await migrateResponsabilidades(db)

  // 2. Entidades com FK para raiz
  await migratePropostas(db)
  await migrateOrdens(db)
  await migrateMedicoes(db)
  await migrateFaturamentos(db)

  // 3. Dados de enriquecimento (JSON)
  await migrateAcessorios(db)
  await migrateEquipamentoResponsabilidades(db)

  // 4. Financeiro
  await migrateContasPagar(db)
  await migrateContasReceber(db)

  // 5. Usuários e Permissões
  await migrateUsuarios(db)

  await db.end()
  await prisma.$disconnect()

  // ─── Relatório Final ─────────────────────────────────────

  console.log('\n' + '='.repeat(60))
  console.log('  RELATÓRIO FINAL DE MIGRAÇÃO')
  console.log('='.repeat(60))

  let totalOk = 0, totalSkip = 0, totalErr = 0

  for (const [name, s] of Object.entries(stats)) {
    console.log(
      `  ${name.padEnd(25)} ✅ ${String(s.ok).padStart(5)}  ⏭ ${String(s.skip).padStart(5)}  ❌ ${String(s.err).padStart(5)}`
    )
    totalOk   += s.ok
    totalSkip += s.skip
    totalErr  += s.err
  }

  console.log('-'.repeat(60))
  console.log(
    `  ${'TOTAL'.padEnd(25)} ✅ ${String(totalOk).padStart(5)}  ⏭ ${String(totalSkip).padStart(5)}  ❌ ${String(totalErr).padStart(5)}`
  )
  console.log('='.repeat(60))

  if (totalErr > 0) {
    console.log('\n⚠️  Existem erros. Revise os logs acima antes de usar o sistema.\n')
    process.exit(1)
  } else {
    console.log('\n🎉 Migração concluída com sucesso!')
    console.log(`\n📋 Todos os usuários migrados receberam a senha: ${DEFAULT_PASSWORD}`)
    console.log('   Solicite que todos alterem no primeiro acesso.\n')
  }
}

main().catch((e) => {
  console.error('FALHA FATAL:', e)
  process.exit(1)
})
