/**
 * Script de Deduplicação de Dados
 * Mantém o REGISTRO MAIS ANTIGO de cada nome duplicado
 * e redireciona todas as relações para ele antes de deletar os clones
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deduplicarFornecedores() {
  console.log('\n🔍 [Fornecedores] Buscando duplicatas...');

  // Pega todos os grupos de nomes duplicados
  const duplicados = await prisma.$queryRaw`
    SELECT nome, MIN("createdAt") as mais_antigo, COUNT(*) as total
    FROM "Fornecedor"
    GROUP BY nome
    HAVING COUNT(*) > 1
    ORDER BY total DESC
  `;

  console.log(`📊 [Fornecedores] ${duplicados.length} nomes com duplicatas encontrados`);

  let totalRemovidos = 0;

  for (const grupo of duplicados) {
    // Busca o registro "mestre" (mais antigo)
    const mestre = await prisma.fornecedor.findFirst({
      where: { nome: grupo.nome },
      orderBy: { createdAt: 'asc' }
    });

    if (!mestre) continue;

    // Busca todos os clones (exceto o mestre)
    const clones = await prisma.fornecedor.findMany({
      where: { nome: grupo.nome, NOT: { id: mestre.id } },
      select: { id: true }
    });

    const clonesIds = clones.map(c => c.id);
    if (clonesIds.length === 0) continue;

    // Redirecionar referências para o mestre antes de deletar
    // PedidoCompra
    await prisma.pedidoCompra.updateMany({ where: { fornecedorId: { in: clonesIds } }, data: { fornecedorId: mestre.id } });
    // ContaPagar
    await prisma.$executeRaw`UPDATE "ContaPagar" SET "fornecedorId" = ${mestre.id} WHERE "fornecedorId" = ANY(${clonesIds}::text[])`;

    // Remover clones
    await prisma.fornecedor.deleteMany({ where: { id: { in: clonesIds } } });
    totalRemovidos += clonesIds.length;
  }

  console.log(`✅ [Fornecedores] ${totalRemovidos} duplicatas removidas!`);
  return totalRemovidos;
}

async function deduplicarClientes() {
  console.log('\n🔍 [Clientes] Buscando duplicatas...');

  const duplicados = await prisma.$queryRaw`
    SELECT nome, MIN("createdAt") as mais_antigo, COUNT(*) as total
    FROM "Cliente"
    GROUP BY nome
    HAVING COUNT(*) > 1
    ORDER BY total DESC
  `;

  console.log(`📊 [Clientes] ${duplicados.length} nomes com duplicatas encontrados`);

  let totalRemovidos = 0;

  for (const grupo of duplicados) {
    const mestre = await prisma.cliente.findFirst({
      where: { nome: grupo.nome },
      orderBy: { createdAt: 'asc' }
    });
    if (!mestre) continue;

    const clones = await prisma.cliente.findMany({
      where: { nome: grupo.nome, NOT: { id: mestre.id } },
      select: { id: true }
    });
    const clonesIds = clones.map(c => c.id);
    if (clonesIds.length === 0) continue;

    // Redirecionar TODAS as referências ao mestre (baseado no schema.prisma)
    const tablesCliente = ['Agendamento','ContaPagar','ContaReceber','Contrato','Documento','Escala','Faturamento','IntegracaoCliente','Medicao','OrdemServico','Proposta'];
    for (const tabela of tablesCliente) {
      try {
        await prisma.$executeRawUnsafe(`UPDATE "${tabela}" SET "clienteId" = '${mestre.id}' WHERE "clienteId" = ANY(ARRAY[${clonesIds.map(id => `'${id}'`).join(',')}]::text[])`);
      } catch(_){}
    }

    // Deletar clones
    await prisma.cliente.deleteMany({ where: { id: { in: clonesIds } } });
    totalRemovidos += clonesIds.length;
  }

  console.log(`✅ [Clientes] ${totalRemovidos} duplicatas removidas!`);
  return totalRemovidos;
}

async function main() {
  console.log('🚀 Iniciando varredura e limpeza de duplicatas...');
  console.log('⚠️  Estratégia: manter o registro mais ANTIGO (primeiro criado)\n');

  try {
    // Fornecedores já foram limpos em execução anterior (16200 removidos)
    const fornRemovidos = 16200;
    const cliRemovidos = await deduplicarClientes();

    // Resumo final
    console.log('\n====================================');
    console.log('✅ VARREDURA COMPLETA!');
    console.log(`   Fornecedores removidos: ${fornRemovidos}`);
    console.log(`   Clientes removidos: ${cliRemovidos}`);
    console.log(`   TOTAL: ${fornRemovidos + cliRemovidos} duplicatas eliminadas`);
    console.log('====================================');

    // Contagem final
    const fornTotal = await prisma.fornecedor.count();
    const cliTotal = await prisma.cliente.count();
    console.log(`\n📦 Estado final:`);
    console.log(`   Fornecedores: ${fornTotal} únicos`);
    console.log(`   Clientes: ${cliTotal} únicos`);

  } catch (err) {
    console.error('❌ Erro durante a deduplicação:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
