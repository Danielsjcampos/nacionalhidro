
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const faturamentos = await prisma.faturamento.findMany({
    where: { medicaoId: '08e1bef6-fc32-4f8c-9cc0-2290017b189f' },
    select: { id: true, tipo: true, status: true, focusStatus: true, urlArquivoNota: true }
  });
  console.log(JSON.stringify(faturamentos, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
