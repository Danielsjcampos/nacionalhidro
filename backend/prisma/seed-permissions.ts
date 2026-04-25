import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PERMISSIONS = [
  // ── Financeiro (15) ──────────────────────────────────────
  { chave: 'financeiro.dashboard.ver', modulo: 'financeiro', descricao: 'Ver dashboard financeiro' },
  { chave: 'financeiro.contas_pagar.listar', modulo: 'financeiro', descricao: 'Listar contas a pagar' },
  { chave: 'financeiro.contas_pagar.criar', modulo: 'financeiro', descricao: 'Criar conta a pagar' },
  { chave: 'financeiro.contas_pagar.editar', modulo: 'financeiro', descricao: 'Editar conta a pagar' },
  { chave: 'financeiro.contas_pagar.excluir', modulo: 'financeiro', descricao: 'Excluir conta a pagar' },
  { chave: 'financeiro.contas_receber.listar', modulo: 'financeiro', descricao: 'Listar contas a receber' },
  { chave: 'financeiro.contas_receber.criar', modulo: 'financeiro', descricao: 'Criar conta a receber' },
  { chave: 'financeiro.contas_receber.editar', modulo: 'financeiro', descricao: 'Editar/revogar baixa' },
  { chave: 'financeiro.contas_receber.excluir', modulo: 'financeiro', descricao: 'Excluir conta a receber' },
  { chave: 'financeiro.faturamento.listar', modulo: 'financeiro', descricao: 'Listar faturamentos' },
  { chave: 'financeiro.faturamento.criar', modulo: 'financeiro', descricao: 'Emitir NF' },
  { chave: 'financeiro.cobranca.listar', modulo: 'financeiro', descricao: 'Listar cobranças' },
  { chave: 'financeiro.cobranca.criar', modulo: 'financeiro', descricao: 'Criar cobrança' },
  { chave: 'financeiro.dre.ver', modulo: 'financeiro', descricao: 'Visualizar DRE' },
  { chave: 'financeiro.fluxo_caixa.ver', modulo: 'financeiro', descricao: 'Visualizar fluxo de caixa' },

  // ── Comercial (8) ───────────────────────────────────────
  { chave: 'comercial.propostas.listar', modulo: 'comercial', descricao: 'Listar propostas' },
  { chave: 'comercial.propostas.criar', modulo: 'comercial', descricao: 'Criar proposta' },
  { chave: 'comercial.propostas.editar', modulo: 'comercial', descricao: 'Editar proposta' },
  { chave: 'comercial.propostas.excluir', modulo: 'comercial', descricao: 'Excluir proposta' },
  { chave: 'comercial.clientes.listar', modulo: 'comercial', descricao: 'Listar clientes' },
  { chave: 'comercial.clientes.criar', modulo: 'comercial', descricao: 'Cadastrar cliente' },
  { chave: 'comercial.clientes.editar', modulo: 'comercial', descricao: 'Editar cliente' },
  { chave: 'comercial.crm.ver', modulo: 'comercial', descricao: 'Acessar CRM Kanban' },

  // ── Logística / Operação (12) ───────────────────────────
  { chave: 'logistica.os.listar', modulo: 'logistica', descricao: 'Listar ordens de serviço' },
  { chave: 'logistica.os.criar', modulo: 'logistica', descricao: 'Criar OS' },
  { chave: 'logistica.os.editar', modulo: 'logistica', descricao: 'Editar OS' },
  { chave: 'logistica.os.excluir', modulo: 'logistica', descricao: 'Cancelar OS' },
  { chave: 'logistica.escala.listar', modulo: 'logistica', descricao: 'Ver escalas' },
  { chave: 'logistica.escala.criar', modulo: 'logistica', descricao: 'Criar escala' },
  { chave: 'logistica.escala.editar', modulo: 'logistica', descricao: 'Editar escala' },
  { chave: 'logistica.hospedagem.listar', modulo: 'logistica', descricao: 'Ver hospedagens' },
  { chave: 'logistica.hospedagem.criar', modulo: 'logistica', descricao: 'Criar hospedagem' },
  { chave: 'logistica.rdo.listar', modulo: 'logistica', descricao: 'Ver RDOs' },
  { chave: 'logistica.rdo.criar', modulo: 'logistica', descricao: 'Criar RDO' },
  { chave: 'logistica.dashboard.ver', modulo: 'logistica', descricao: 'Ver dashboard logística' },

  // ── Medições (4) ────────────────────────────────────────
  { chave: 'medicoes.listar', modulo: 'medicoes', descricao: 'Listar medições' },
  { chave: 'medicoes.criar', modulo: 'medicoes', descricao: 'Criar medição' },
  { chave: 'medicoes.editar', modulo: 'medicoes', descricao: 'Editar medição' },
  { chave: 'medicoes.excluir', modulo: 'medicoes', descricao: 'Excluir medição' },

  // ── RH / DP (14) ───────────────────────────────────────
  { chave: 'rh.funcionarios.listar', modulo: 'rh', descricao: 'Listar funcionários' },
  { chave: 'rh.funcionarios.criar', modulo: 'rh', descricao: 'Admitir funcionário' },
  { chave: 'rh.funcionarios.editar', modulo: 'rh', descricao: 'Editar funcionário' },
  { chave: 'rh.recrutamento.ver', modulo: 'rh', descricao: 'Acessar recrutamento' },
  { chave: 'rh.admissao.ver', modulo: 'rh', descricao: 'Acessar admissão' },
  { chave: 'rh.desligamento.ver', modulo: 'rh', descricao: 'Acessar desligamento' },
  { chave: 'rh.ferias.ver', modulo: 'rh', descricao: 'Ver férias' },
  { chave: 'rh.ferias.criar', modulo: 'rh', descricao: 'Agendar férias' },
  { chave: 'rh.aso.ver', modulo: 'rh', descricao: 'Ver controle ASO' },
  { chave: 'rh.aso.criar', modulo: 'rh', descricao: 'Registrar ASO' },
  { chave: 'rh.ponto.ver', modulo: 'rh', descricao: 'Ver ponto eletrônico' },
  { chave: 'rh.relatorios.ver', modulo: 'rh', descricao: 'Ver relatórios RH' },
  { chave: 'rh.ocorrencias.ver', modulo: 'rh', descricao: 'Ver ocorrências' },
  { chave: 'rh.ocorrencias.criar', modulo: 'rh', descricao: 'Criar advertência' },

  // ── Frota / Manutenção / Estoque (10) ───────────────────
  { chave: 'frota.veiculos.listar', modulo: 'frota', descricao: 'Listar veículos' },
  { chave: 'frota.veiculos.editar', modulo: 'frota', descricao: 'Editar veículo' },
  { chave: 'frota.mapa.ver', modulo: 'frota', descricao: 'Ver mapa GPS' },
  { chave: 'frota.checklist.ver', modulo: 'frota', descricao: 'Ver checklists' },
  { chave: 'manutencao.listar', modulo: 'manutencao', descricao: 'Listar manutenções' },
  { chave: 'manutencao.criar', modulo: 'manutencao', descricao: 'Criar manutenção' },
  { chave: 'manutencao.editar', modulo: 'manutencao', descricao: 'Editar manutenção' },
  { chave: 'estoque.listar', modulo: 'estoque', descricao: 'Listar estoque' },
  { chave: 'estoque.movimentar', modulo: 'estoque', descricao: 'Movimentar estoque' },
  { chave: 'estoque.equipamentos.ver', modulo: 'estoque', descricao: 'Ver equipamentos' },

  // ── Sistema / Admin (6) ─────────────────────────────────
  { chave: 'admin.usuarios.ver', modulo: 'admin', descricao: 'Ver lista de usuários' },
  { chave: 'admin.usuarios.criar', modulo: 'admin', descricao: 'Criar usuário' },
  { chave: 'admin.usuarios.editar', modulo: 'admin', descricao: 'Editar usuário' },
  { chave: 'admin.usuarios.excluir', modulo: 'admin', descricao: 'Excluir usuário' },
  { chave: 'admin.permissoes.editar', modulo: 'admin', descricao: 'Editar categorias de permissão' },
  { chave: 'admin.logs.ver', modulo: 'admin', descricao: 'Ver audit log' },
];

async function main() {
  console.log('🔐 Seed de Permissões — Iniciando...\n');

  let created = 0;
  let skipped = 0;

  for (const perm of PERMISSIONS) {
    const existing = await prisma.permission.findUnique({ where: { chave: perm.chave } });
    if (existing) {
      skipped++;
      continue;
    }
    await prisma.permission.create({ data: perm });
    created++;
  }

  console.log(`✅ Permissões: ${created} criadas, ${skipped} já existiam`);
  console.log(`📊 Total: ${PERMISSIONS.length} permissões\n`);

  // ── Auto-vincular TODAS as permissões à categoria "Master" ──
  const masterCat = await prisma.categoriaEquipe.findFirst({ where: { nome: 'Master' } });
  if (masterCat) {
    const allPerms = await prisma.permission.findMany();
    let linked = 0;

    for (const perm of allPerms) {
      const exists = await prisma.categoriaPermission.findUnique({
        where: { categoriaId_permissionId: { categoriaId: masterCat.id, permissionId: perm.id } }
      });
      if (!exists) {
        await prisma.categoriaPermission.create({
          data: { categoriaId: masterCat.id, permissionId: perm.id }
        });
        linked++;
      }
    }
    console.log(`🔗 Master: ${linked} permissões vinculadas\n`);
  } else {
    console.log('⚠️  Categoria "Master" não encontrada — vincule manualmente.\n');
  }

  console.log('═══════════════════════════════════════');
  console.log(`✅ Seed de permissões finalizado!`);
  console.log('═══════════════════════════════════════\n');
}

main()
  .catch(e => { console.error('❌ Erro:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
