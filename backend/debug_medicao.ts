
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const medicao = await prisma.medicao.findUnique({
    where: { id: '08e1bef6-fc32-4f8c-9cc0-2290017b189f' },
    include: { cliente: true }
  });
  console.log(JSON.stringify(medicao, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
