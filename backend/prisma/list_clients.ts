import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const clients = await prisma.cliente.findMany({
    select: { id: true, nome: true, razaoSocial: true, nomeFantasia: true }
  });
  
  console.log('--- Listagem de Clientes (Neon) ---');
  clients.forEach(c => {
    console.log(`- ${c.nome} (Razão: ${c.razaoSocial || 'N/A'}) - Fantasia: ${c.nomeFantasia || 'N/A'}`);
  });
}

run().catch(console.error).finally(() => prisma.$disconnect());
