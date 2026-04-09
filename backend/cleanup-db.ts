import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import process from 'process';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function main() {
  console.log('🧹 Iniciando limpeza do banco de dados...');

  // Ordem de deleção (respeitando foreign keys)
  // Tabelas de Relacionamento e Logs primeiro
  await prisma.logAlteracao.deleteMany();
  await prisma.webhookLog.deleteMany();
  await prisma.pontoEletronico.deleteMany();
  await prisma.notificacaoLog.deleteMany();
  await prisma.lancamentoCusto.deleteMany();
  await prisma.parcelaNegociacao.deleteMany();
  await prisma.negociacaoDivida.deleteMany();
  await prisma.historicoCobranca.deleteMany();
  await prisma.cobrancaEmail.deleteMany();
  await prisma.itemCobranca.deleteMany();
  await prisma.servicoOS.deleteMany();
  await prisma.materialOS.deleteMany();
  await prisma.pecaManutencao.deleteMany();
  
  // Operacional
  await prisma.rDO.deleteMany();
  await prisma.escala.deleteMany();
  await prisma.agendamento.deleteMany();
  await prisma.ordemServico.deleteMany();
  await prisma.medicao.deleteMany();
  await prisma.faturamento.deleteMany();
  await prisma.propostaItem.deleteMany();
  await prisma.propostaAcessorio.deleteMany();
  await prisma.propostaResponsabilidade.deleteMany();
  await prisma.propostaEquipe.deleteMany();
  await prisma.proposta.deleteMany();
  await prisma.contrato.deleteMany();
  
  // Financeiro
  await prisma.contaReceber.deleteMany();
  await prisma.contaPagar.deleteMany();
  await prisma.transacaoFinanceira.deleteMany();
  
  // Cadastros Base
  await prisma.integracaoCliente.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.fornecedor.deleteMany();
  // RH/DP (Atenção à hierarquia de dependências)
  await prisma.ePIEntregue.deleteMany();
  await prisma.treinamentoRealizado.deleteMany();
  await prisma.afastamento.deleteMany();
  await prisma.integracaoCliente.deleteMany();
  await prisma.pontoEletronico.deleteMany();
  await prisma.controleFerias.deleteMany();
  await prisma.aSOControle.deleteMany();
  await prisma.admissao.deleteMany();
  await prisma.desligamento.deleteMany();
  await prisma.hospedagem.deleteMany();
  await prisma.passagem.deleteMany();
  await prisma.funcionario.deleteMany();

  await prisma.produto.deleteMany();
  await prisma.treinamento.deleteMany();
  await prisma.ePI.deleteMany();
  
  // Mantemos: CategoriaEquipe e User (Para não perder o acesso)
  // Mas removemos usuários que não são da diretoria/admin
  const admins = ['admin@nacionalhidro.com.br', 'bruno@nacionalhidro.com.br', 'fernanda@nacionalhidro.com.br'];
  await prisma.user.deleteMany({
    where: {
      email: { notIn: admins }
    }
  });

  console.log('✅ Banco de dados limpo com sucesso! (Usuários Admin preservados)');
}

main()
  .catch((e) => {
    console.error('❌ Erro na limpeza:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
