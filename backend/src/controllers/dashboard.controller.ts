import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    // 1. Propostas
    const propostasTotal = await prisma.proposta.count();
    const propostasAceitas = await prisma.proposta.count({ where: { status: 'ACEITA' } });
    const propostasPendentes = await prisma.proposta.count({ where: { status: 'ENVIADA' } });
    const propostasRecusadas = await prisma.proposta.count({ where: { status: 'RECUSADA' } });
    
    // Valor total de propostas aceitas (Faturamento Potencial)
    const valorPropostas = await prisma.proposta.aggregate({
      _sum: { valorTotal: true },
      where: { status: 'ACEITA' }
    });

    // 2. Serviços (OS)
    const osTotal = await prisma.ordemServico.count();
    const osEmAndamento = await prisma.ordemServico.count({ where: { status: 'EM_EXECUCAO' } });
    const osFinalizadas = await prisma.ordemServico.count({ where: { status: 'FINALIZADA' } });

    // 3. Clientes
    const clientesTotal = await prisma.cliente.count();
    const clientesNovos = await prisma.cliente.count({
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) // First day of current month
        }
      }
    });

    // 4. Financeiro (Simulado ou Real se tiver tabela Transacao)
    // Assumindo existência de transações para DRE simplificado
    const receitas = await prisma.transacaoFinanceira.aggregate({
      _sum: { valor: true },
      where: { tipo: 'RECEITA', status: 'PAGO' }
    });
    const despesas = await prisma.transacaoFinanceira.aggregate({
      _sum: { valor: true },
      where: { tipo: 'DESPESA', status: 'PAGO' }
    });

    // 5. Estoque (Produtos)
    const estoqueBaixo = await prisma.produto.count({
      where: {
        estoqueAtual: { lte: 5 } // Exemplo: estoque mínimo genérico
      }
    });
    const totalProdutos = await prisma.produto.count();

    // 6. Logística / Frota (Se houver tabela Veiculo/Frota, caso contrário mockamos ou contamos manutenções)
    const veiculosManutencao = await prisma.manutencao.count({ where: { status: 'EM_ANDAMENTO' } });

    // 7. Dados para Gráficos (Mockados para demonstração de mensal, idealmente via groupBy)
    const chartData = [
      { name: 'Jan', receitas: 12000, despesas: 8000 },
      { name: 'Fev', receitas: 19000, despesas: 12000 },
      { name: 'Mar', receitas: 15000, despesas: 10000 },
      { name: 'Abr', receitas: 22000, despesas: 15000 },
      { name: 'Mai', receitas: 28000, despesas: 18000 },
      { name: 'Jun', receitas: 32000, despesas: 20000 },
    ];

    res.json({
      summary: {
        faturamento: receitas._sum.valor ? Number(receitas._sum.valor) : 0,
        lucroLiquido: (Number(receitas._sum.valor) || 0) - (Number(despesas._sum.valor) || 0),
        clientesAtivos: clientesTotal,
        novosClientes: clientesNovos,
      },
      propostas: {
        total: propostasTotal,
        aceitas: propostasAceitas,
        pendentes: propostasPendentes,
        recusadas: propostasRecusadas,
        valorTotal: valorPropostas._sum.valorTotal ? Number(valorPropostas._sum.valorTotal) : 0
      },
      operacional: {
        osTotal,
        osEmAndamento,
        osFinalizadas,
        frotaManutencao: veiculosManutencao,
        estoqueBaixo,
        totalProdutos
      },
      apiHealth: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        status: 'ONLINE'
      },
      chartData
    });

  } catch (error) {
    console.error('Dashboard Error:', error);
    res.status(500).json({ error: 'Erro ao carregar dados do dashboard' });
  }
};
