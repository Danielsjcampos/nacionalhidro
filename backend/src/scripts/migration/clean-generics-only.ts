
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanGenerics() {
  console.log('--- INICIANDO LIMPEZA DE DADOS GENÉRICOS (EMPRESAS/CLIENTES/PROPOSTAS) ---');
  
  try {
    // 1. Apagar Empresas que começam com "Empresa " ou possuem CNPJ MIGRADO
    const empresasDeleted = await prisma.empresaCNPJ.deleteMany({
      where: {
        OR: [
          { nome: { contains: 'Empresa ' } },
          { cnpj: { startsWith: 'MIGRADO-' } }
        ]
      }
    });
    console.log(`✅ Empresas genéricas removidas: ${empresasDeleted.count}`);

    // 2. Limpar cascata de PROPOSTAS e itens relacionados
    const filterGeneric = {
      cliente: {
        OR: [
          { nome: { contains: 'Cliente ' } },
          { documento: { startsWith: 'MIGRADO-' } }
        ]
      }
    };

    // Deletar filhos de Proposta
    await prisma.propostaResponsabilidade.deleteMany({ where: { proposta: filterGeneric } });
    await prisma.propostaEquipe.deleteMany({ where: { proposta: filterGeneric } });
    await prisma.propostaItem.deleteMany({ where: { proposta: filterGeneric } });
    await prisma.propostaAcessorio.deleteMany({ where: { proposta: filterGeneric } });
    
    // Deletar filhos de OrdemServico (que dependem de Proposta ou Cliente)
    const filterOS = {
      OR: [
        { cliente: { OR: [{ nome: { contains: 'Cliente ' } }, { documento: { startsWith: 'MIGRADO-' } }] } },
        { proposta: filterGeneric }
      ]
    };

    await prisma.itemCobranca.deleteMany({ where: { os: filterOS } });
    await prisma.materialOS.deleteMany({ where: { os: filterOS } });
    await prisma.servicoOS.deleteMany({ where: { os: filterOS } });
    await prisma.logistica.deleteMany({ where: { os: filterOS } });
    await prisma.manutencao.deleteMany({ where: { os: filterOS } });
    await prisma.ordemServico.deleteMany({ where: { AND: [filterOS] } });

    // Deletar Medicao e Faturamento
    await prisma.cobrancaEmail.deleteMany({ where: { medicao: { cliente: { OR: [{ nome: { contains: 'Cliente ' } }, { documento: { startsWith: 'MIGRADO-' } }] } } } });
    await prisma.faturamento.deleteMany({ where: { cliente: { OR: [{ nome: { contains: 'Cliente ' } }, { documento: { startsWith: 'MIGRADO-' } }] } } });
    await prisma.medicao.deleteMany({ where: { cliente: { OR: [{ nome: { contains: 'Cliente ' } }, { documento: { startsWith: 'MIGRADO-' } }] } } });

    // Deletar Tabelas Financeiras e Contratos
    await prisma.contaReceber.deleteMany({ where: { cliente: { OR: [{ nome: { contains: 'Cliente ' } }, { documento: { startsWith: 'MIGRADO-' } }] } } });
    await prisma.contrato.deleteMany({ where: { cliente: { OR: [{ nome: { contains: 'Cliente ' } }, { documento: { startsWith: 'MIGRADO-' } }] } } });
    await prisma.integracaoCliente.deleteMany({ where: { cliente: { OR: [{ nome: { contains: 'Cliente ' } }, { documento: { startsWith: 'MIGRADO-' } }] } } });


    // Deletar Agendamentos
    await prisma.agendamento.deleteMany({ where: { OR: [{ cliente: { OR: [{ nome: { contains: 'Cliente ' } }, { documento: { startsWith: 'MIGRADO-' } }] } }, { proposta: filterGeneric }] } });

    // Finalmente Deletar Propostas
    const propostasDeleted = await prisma.proposta.deleteMany({ where: filterGeneric });
    console.log(`✅ Propostas genéricas removidas: ${propostasDeleted.count}`);

    // 3. Apagar Clientes
    const clientesDeleted = await prisma.cliente.deleteMany({
      where: {
        OR: [
          { nome: { contains: 'Cliente ' } },
          { documento: { startsWith: 'MIGRADO-' } }
        ]
      }
    });
    console.log(`✅ Clientes genéricos removidos: ${clientesDeleted.count}`);

    console.log('\n✨ LIMPEZA CONCLUÍDA!');
  } catch (error: any) {
    console.error('\n❌ ERRO DURANTE A LIMPEZA:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

cleanGenerics();
