
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function reset() {
  console.log('--- INICIANDO RESET TOTAL DO BANCO DE DADOS (NEON) ---');
  
  const tables = [
    'ItemCobranca', 'ServicoOS', 'MaterialOS', 'PecaManutencao', 'CobrancaEmail', 
    'EPIEntregue', 'TreinamentoRealizado', 'Afastamento', 'IntegracaoCliente', 
    'ASOControle', 'Admissao', 'Desligamento', 'ControleFerias', 'Candidato', 
    'AgendamentoTarefa', 'RDO', 'Logistica', 'Manutencao', 'PropostaItem', 
    'PropostaAcessorio', 'PropostaResponsabilidade', 'PropostaEquipe', 
    'ItemPedidoCompra', 'HistoricoCobranca', 'ParcelaNegociacao', 'OrdemServico', 
    'Contrato', 'MovimentacaoEstoque', 'Medicao', 'PedidoCompra', 
    'NegociacaoDivida', 'LancamentoCusto', 'Proposta', 'Agendamento', 'Escala', 
    'PontoEletronico', 'Automacao', 'Cliente', 'Produto', 'Funcionario', 'EPI', 
    'Treinamento', 'Veiculo', 'Equipamento', 'User', 'CategoriaEquipe', 
    'Configuracao', 'Lead', 'WebhookLog', 'LogAlteracao', 'Vaga', 'ContaBancaria', 
    'Fornecedor', 'EmpresaCNPJ', 'PlanoContas', 'CentroCusto', 'Cargo', 
    'Acessorio', 'ResponsabilidadePadrao', 'ContaPagar', 'ContaReceber'
  ];

  try {
    // Usar TRUNCATE CASCADE para limpar tudo respeitando as FKs de forma rápida
    // O Prisma/Postgres exige aspas duplas para nomes de tabelas Case-Sensitive
    for (const table of tables) {
      console.log(`Limpando tabela: ${table}...`);
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`);
    }
    
    console.log('\n✅ BANCO DE DADOS RESETADO COM SUCESSO!');
  } catch (error: any) {
    console.error('\n❌ ERRO DURANTE O RESET:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

reset();
