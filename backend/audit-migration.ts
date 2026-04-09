import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function audit() {
  console.log('--- AUDITORIA DE DADOS MIGRADOS ---');

  // 1. Verificar Empresas
  const empresas = await prisma.empresa.findMany();
  console.log('\nEmpresas cadastradas:', empresas.map(e => ({ id: e.id, nome: e.nome })));

  // 2. Verificar Usuário logado
  const usuario = await prisma.usuario.findFirst({
    where: { email: { contains: 'bruno' } },
    include: { empresa: true }
  });
  console.log('\nUsuário Bruno vinculado a:', usuario?.empresa?.nome || 'Nenhuma Empresa', `(ID: ${usuario?.empresaId})`);

  // 3. Contagem de Tabelas Chave e seus EmpresaIDs
  const tables = ['Proposta', 'Cliente', 'Fornecedor', 'ContaReceber', 'ContaBancaria'];
  
  for (const table of tables) {
    const count = await (prisma as any)[table.toLowerCase()].count();
    const firstRecords = await (prisma as any)[table.toLowerCase()].findMany({
      take: 5,
      select: { id: true, empresaId: true }
    });
    
    console.log(`\nLinhas em ${table}:`, count);
    if (count > 0) {
      console.log(`Exemplos de IDs de Empresa em ${table}:`, [...new Set(firstRecords.map((r: any) => r.empresaId))]);
    }
  }

  process.exit(0);
}

audit();
