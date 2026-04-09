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

    // 4. Financeiro (Real usando ContaReceber e ContaPagar)
    const receitas = await prisma.contaReceber.aggregate({
      _sum: { valorRecebido: true, valorOriginal: true },
      where: { status: 'RECEBIDO' }
    });
    const despesas = await prisma.contaPagar.aggregate({
      _sum: { valorPago: true, valorOriginal: true },
      where: { status: 'PAGO' }
    });
    
    const ttlReceita = Number(receitas._sum.valorRecebido || receitas._sum.valorOriginal || 0);
    const ttlDespesa = Number(despesas._sum.valorPago || despesas._sum.valorOriginal || 0);

    // 5. Estoque (Produtos)
    const estoqueBaixo = await prisma.produto.count({
      where: {
        estoqueAtual: { lte: 5 } // Exemplo: estoque mínimo genérico
      }
    });
    const totalProdutos = await prisma.produto.count();

    // 6. Logística / Frota (Se houver tabela Veiculo/Frota, caso contrário mockamos ou contamos manutenções)
    const veiculosManutencao = await prisma.manutencao.count({ where: { status: 'EM_ANDAMENTO' } });

    // 7. Recursos Humanos (Status Operacional)
    // - Em Contratação: Admissoes que não estão CONCLUIDAS nem CANCELADAS
    // No schema.prisma a Model chama 'Admissao' e usa 'etapa' ao invés de status e não possui 'CONCLUIDO'.
    const rhEmContratacao = await prisma.admissao.count({
      where: {
        etapa: { notIn: ['CONTRATADO', 'CANCELADO'] }
      }
    });

    // - Afastados: ExamesASO com status INAPTO ou Atestados (vamos usar ASO INAPTO por ora ou dados de Ponto/Férias/Afastamento se houver)
    // O Model é 'ASOControle' (onde o campo é resultado: INAPTO)
    const rhAfastados = await prisma.aSOControle.count({
      where: { resultado: 'INAPTO' }
    });

    // - Atestados: Usurários com exameASO 'APTO_COM_RESTRICOES' funcionará provisoriamente como "atestados/restritos"
    const rhAtestados = await prisma.aSOControle.count({
      where: { resultado: 'APTO_COM_RESTRICOES' }
    });

    // - Aptos: Usuários Ativos totais subtraindo afastados e restritos.
    const usersAtivosTotal = await prisma.user.count({ where: { isAtivo: true } });
    const rhAptos = Math.max(0, usersAtivosTotal - rhAfastados - rhAtestados);

    // 8. Dados para Gráficos (Mockados para demonstração de mensal, idealmente via groupBy)
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
        faturamento: ttlReceita,
        lucroLiquido: ttlReceita - ttlDespesa,
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
      rh: {
        total: usersAtivosTotal,
        aptos: rhAptos,
        emContratacao: rhEmContratacao,
        atestados: rhAtestados,
        afastados: rhAfastados
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

// GET /dashboard/teto-fiscal
export const getTetoFiscal = async (req: AuthRequest, res: Response) => {
  try {
    // 1. Buscar todas as empresas CNPJ ativas
    const empresas = await prisma.empresaCNPJ.findMany({
      where: { ativa: true },
      orderBy: { nome: 'asc' },
    });

    // 2. Para cada empresa, somar faturamento do mês corrente
    const now = new Date();
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
    const fimMes = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const resultado = await Promise.all(
      empresas.map(async (empresa) => {
        const faturamentoMes = await prisma.faturamento.aggregate({
          _sum: { valorBruto: true },
          where: {
            cnpjFaturamento: empresa.cnpj,
            dataEmissao: { gte: inicioMes, lte: fimMes },
            status: { notIn: ['CANCELADA'] },
          },
        });

        // Faturamento acumulado no ano
        const inicioAno = new Date(now.getFullYear(), 0, 1);
        const faturamentoAno = await prisma.faturamento.aggregate({
          _sum: { valorBruto: true },
          where: {
            cnpjFaturamento: empresa.cnpj,
            dataEmissao: { gte: inicioAno, lte: fimMes },
            status: { notIn: ['CANCELADA'] },
          },
        });

        const valorMensal = Number(faturamentoMes._sum.valorBruto || 0);
        const valorAnual = Number(faturamentoAno._sum.valorBruto || 0);
        const limite = Number(empresa.limiteMenusal || 500000);
        const alertaPercent = Number(empresa.alertaPercentual || 80);
        const percentualMensal = limite > 0 ? (valorMensal / limite) * 100 : 0;

        let status: 'OK' | 'ALERTA' | 'CRITICO' = 'OK';
        if (percentualMensal >= 100) status = 'CRITICO';
        else if (percentualMensal >= alertaPercent) status = 'ALERTA';

        return {
          id: empresa.id,
          nome: empresa.nome,
          cnpj: empresa.cnpj,
          limiteMensal: limite,
          alertaPercentual: alertaPercent,
          faturamentoMensal: valorMensal,
          faturamentoAnual: valorAnual,
          percentualMensal: Math.round(percentualMensal * 10) / 10,
          status,
        };
      })
    );

    res.json(resultado);
  } catch (error) {
    console.error('Dashboard getTetoFiscal Error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erro ao calcular teto fiscal',
      },
    });
  }
};
