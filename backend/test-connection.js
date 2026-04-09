const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    console.log('Tentando conectar ao banco Neon...');
    const config = await prisma.configuracao.findFirst();
    console.log('Conexão realizada com sucesso!');
    console.log('Configurações encontradas:', config ? 'Sim' : 'Não');
    process.exit(0);
  } catch (err) {
    console.error('ERRO DE CONEXÃO:', err);
    process.exit(1);
  }
}

test();
