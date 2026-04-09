const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function sweep() {
  console.log('--- INICIANDO VARREDURA DE DADOS AGRESSIVA (SWEEP) ---');

  // 1. Limpeza de Ordens de Serviço Legadas (Caso tenham sobrado)
  const osResult = await prisma.ordemServico.updateMany({
    where: {
      OR: [
        { codigo: { contains: '/LEGADO' } },
        { codigo: { startsWith: 'LEGADO' } }
      ],
      status: 'EM_EXECUCAO'
    },
    data: {
      status: 'BAIXADA',
      observacoes: 'Varredura: Movido para BAIXADA para limpar dashboard de execução.'
    }
  });
  console.log(`> OS Legadas atualizadas: ${osResult.count}`);

  // 2. Limpeza de Cobranças Antigas (> 6 meses atrás de hoje, Abril 2026)
  // Se hoje é Abril 2026, 6 meses atrás é Outubro 2025.
  const cutOffCR = new Date('2025-10-01');
  const crResult = await prisma.contaReceber.updateMany({
    where: {
      status: { in: ['PENDENTE', 'VENCIDO', 'PARCIAL'] },
      dataVencimento: { lt: cutOffCR }
    },
    data: {
      status: 'CANCELADO',
      observacoes: `Varredura: Cancelado por antiguidade (Vencimento anterior a ${cutOffCR.toISOString().split('T')[0]}).`
    }
  });
  console.log(`> Cobranças legadas/antigas canceladas: ${crResult.count}`);

  // 3. Correção de Contas a Pagar (Limpeza de resíduos de 2025 e anteriores)
  const cutOffCP = new Date('2026-01-01');
  const cpResult = await prisma.contaPagar.updateMany({
    where: {
      status: 'ABERTO',
      dataVencimento: { lt: cutOffCP }
    },
    data: {
      status: 'CANCELADO',
      observacoes: 'Varredura: Título em aberto de ano anterior cancelado.'
    }
  });
  console.log(`> Contas a Pagar obsoletas canceladas: ${cpResult.count}`);

  // 4. Placeholder 2026 Específico (Caso date string match falhe, buscamos por range)
  const cpPlaceholder = await prisma.contaPagar.updateMany({
    where: {
      dataVencimento: {
        gte: new Date('2026-04-01T00:00:00Z'),
        lte: new Date('2026-04-01T23:59:59Z')
      }
    },
    data: {
      status: 'CANCELADO',
      observacoes: 'Varredura: Removendo placeholder 01/04/2026 detectado em massa.'
    }
  });
  console.log(`> Contas a Pagar (01/04/2026) removidas: ${cpPlaceholder.count}`);

  console.log('\n--- VARREDURA CONCLUÍDA ---');
}

sweep()
  .catch(err => console.error('ERRO NA VARREDURA:', err))
  .finally(() => prisma.$disconnect());
