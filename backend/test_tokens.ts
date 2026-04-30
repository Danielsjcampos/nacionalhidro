import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const empresas = await prisma.empresaCNPJ.findMany({
    select: { nome: true, cnpj: true, focusToken: true }
  });
  console.log(empresas);
}
main().catch(console.error).finally(() => prisma.$disconnect());
