import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Iniciando Sincronização de Contatos (JSON -> Tabela) ---');
  
  const clientes = await prisma.cliente.findMany({
    where: {
      contatos: { not: Prisma.DbNull }
    }
  });

  console.log(`Encontrados ${clientes.length} clientes com dados no campo JSON contatos.`);

  let criados = 0;
  let pulados = 0;

  for (const cliente of clientes) {
    const contatosJson = cliente.contatos as any;
    if (!Array.isArray(contatosJson)) continue;

    for (const c of contatosJson) {
      if (!c.nome) continue;

      const existe = await prisma.clienteContato.findFirst({
        where: {
          clienteId: cliente.id,
          nome: c.nome
        }
      });

      if (!existe) {
        await prisma.clienteContato.create({
          data: {
            clienteId: cliente.id,
            nome: c.nome,
            email: c.email || null,
            telefone: c.telefone || null,
            celular: c.celular || null,
            setor: c.setor || 'Migrado',
            tipo: c.tipo || 'Principal'
          }
        });
        criados++;
      } else {
        pulados++;
      }
    }
  }

  console.log(`--- Sincronização Finalizada ---`);
  console.log(`Novos contatos criados: ${criados}`);
  console.log(`Contatos já existentes (pulados): ${pulados}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
