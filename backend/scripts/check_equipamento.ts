import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const equip = await prisma.equipamento.findFirst({
    where: { nome: { contains: 'Hidrojato SAP', mode: 'insensitive' } },
    include: {
      responsabilidadesPadrao: true,
      acessoriosVinculados: { include: { acessorio: true } }
    }
  });

  if (!equip) {
    console.log('Equipamento não encontrado');
    return;
  }

  console.log('--- EQUIPAMENTO ---');
  console.log('ID:', equip.id);
  console.log('Nome:', equip.nome);
  console.log('\n--- RESPONSABILIDADES PADRÃO ---');
  equip.responsabilidadesPadrao.forEach(r => {
    console.log(`- [${r.tipo}] ${r.descricao}`);
  });

  console.log('\n--- ACESSÓRIOS VINCULADOS ---');
  equip.acessoriosVinculados.forEach(a => {
    console.log(`- ${a.acessorio.nome}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
