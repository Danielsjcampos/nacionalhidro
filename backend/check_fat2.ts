import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const fats = await prisma.faturamento.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: { id: true, tipo: true, focusStatus: true, observacoes: true, focusRef: true }
  });
  console.log(fats);
}
main().catch(console.error).finally(() => prisma.$disconnect());
