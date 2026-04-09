import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Database Audit ---');
  const counts = {
    propostas: await prisma.proposta.count(),
    clientes: await prisma.cliente.count(),
    faturamentos: await prisma.faturamento.count(),
    empresas: await prisma.empresaCNPJ.count(),
    contasBancarias: await prisma.contaBancaria.count(),
  };
  
  console.log('Counts:', counts);
  
  const lastProposals = await prisma.proposta.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: { codigo: true, status: true, vigente: true, propostaGlobalId: true }
  });
  
  console.log('Last 5 Proposals:', lastProposals);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
