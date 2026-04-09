import prisma from './src/lib/prisma';

async function main() {
  const props = await prisma.proposta.findMany({
    where: {
      OR: [
        { codigo: { endsWith: "3245" } },
        { codigo: { endsWith: "3243" } },
        { numero: { in: [3245, 3243] } }
      ]
    }
  });

  console.log('Encontradas:', props.map(p => ({ id: p.id, codigo: p.codigo, status: (p as any).status })));

  for (const p of props) {
    await prisma.proposta.update({
      where: { id: p.id },
      data: { status: 'APROVADA' } as any
    });
    console.log(`Updated ${p.codigo} to APROVADA`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
