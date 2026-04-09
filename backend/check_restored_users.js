const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany({
      select: { email: true, name: true, role: true, isAtivo: true }
    });
    console.log('--- USUÁRIOS NO BANCO RESTAURADO ---');
    console.log(JSON.stringify(users, null, 2));
  } catch (err) {
    console.error('Erro ao listar usuários:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
