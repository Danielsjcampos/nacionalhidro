const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Resumo OrdemServico ---');
  const osStats = await prisma.ordemServico.groupBy({
    by: ['status'],
    _count: true
  });
  console.log(osStats);

  console.log('\n--- Exemplo OS Ativas ---');
  const osExecucao = await prisma.ordemServico.findMany({
    where: { status: 'EM_EXECUCAO' },
    select: { id: true, codigo: true, createdAt: true, dataInicial: true },
    take: 5
  });
  console.log(osExecucao);

  console.log('\n--- Exemplo Contas Pagar Proximo Futuro ---');
  const cpExemplo = await prisma.contaPagar.findMany({
    where: { dataVencimento: new Date('2026-04-01T00:00:00Z') },
    select: { id: true, descricao: true, dataVencimento: true, status: true },
    take: 5
  });
  console.log(cpExemplo);

  console.log('\n--- Resumo Cobrança Vencida (mais de 1 ano) ---');
  const umAnoAtras = new Date();
  umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);
  const crVencidas = await prisma.contaReceber.count({
    where: {
      status: 'PENDENTE',
      dataVencimento: { lt: umAnoAtras }
    }
  });
  console.log(`Total Pendentes +1 ano: ${crVencidas}`);

  const crExemplo = await prisma.contaReceber.findMany({
    where: {
      status: 'PENDENTE',
      dataVencimento: { lt: umAnoAtras }
    },
    select: { id: true, descricao: true, dataVencimento: true, status: true },
    take: 5
  });
  console.log(crExemplo);
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
