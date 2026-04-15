import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando limpeza de funcionários genéricos...');

  // 1. Contagem inicial
  const beforeCount = await prisma.funcionario.count();
  const genericCount = await prisma.funcionario.count({
    where: {
      nome: {
        startsWith: 'Funcionário',
      },
    },
  });

  console.log(`📊 Total de funcionários: ${beforeCount}`);
  console.log(`🧹 Funcionários genéricos identificados: ${genericCount}`);

  if (genericCount === 0) {
    console.log('✅ Nenhum funcionário genérico encontrado.');
    return;
  }

  // 2. Execução da deleção
  // Deletamos apenas os que começam com "Funcionário"
  const deleted = await prisma.funcionario.deleteMany({
    where: {
      nome: {
        startsWith: 'Funcionário',
      },
    },
  });

  // 3. Contagem final
  const afterCount = await prisma.funcionario.count();

  console.log(`✨ Limpeza concluída!`);
  console.log(`🗑️ Registros apagados: ${deleted.count}`);
  console.log(`📉 Total de funcionários restante: ${afterCount}`);
}

main()
  .catch((e) => {
    console.error('❌ Erro na limpeza:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
