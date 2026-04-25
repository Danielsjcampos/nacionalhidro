import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest, hasPermission } from '../middleware/auth.middleware';

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId || '';
    const role = req.user?.role || '';

    // ── Verificar permissões do usuário ──
    const [canFinanceiro, canComercial, canLogistica, canRH, canEstoque, canFrota] = await Promise.all([
      hasPermission(userId, role, 'financeiro.dashboard.ver'),
      hasPermission(userId, role, 'comercial.propostas.listar'),
      hasPermission(userId, role, 'logistica.dashboard.ver'),
      hasPermission(userId, role, 'rh.funcionarios.listar'),
      hasPermission(userId, role, 'estoque.listar'),
      hasPermission(userId, role, 'frota.veiculos.listar'),
    ]);

    // 1. Propostas (apenas se tiver permissão comercial)
    let propostasData = { total: 0, aceitas: 0, pendentes: 0, recusadas: 0, valorTotal: 0 };
    if (canComercial) {
      const [total, aceitas, pendentes, recusadas, valor] = await Promise.all([
        prisma.proposta.count(),
        prisma.proposta.count({ where: { status: 'ACEITA' } }),
        prisma.proposta.count({ where: { status: 'ENVIADA' } }),
        prisma.proposta.count({ where: { status: 'RECUSADA' } }),
        prisma.proposta.aggregate({ _sum: { valorTotal: true }, where: { status: 'ACEITA' } }),
      ]);
      propostasData = { total, aceitas, pendentes, recusadas, valorTotal: valor._sum.valorTotal ? Number(valor._sum.valorTotal) : 0 };
    }

    // 2. Operacional (OS) — visível se logística
    let operacionalData = { osTotal: 0, osEmAndamento: 0, osFinalizadas: 0, frotaManutencao: 0, estoqueBaixo: 0, totalProdutos: 0 };
    if (canLogistica || canEstoque || canFrota) {
      const [osTotal, osEmAndamento, osFinalizadas, frotaMaint, estBaixo, ttlProd] = await Promise.all([
        canLogistica ? prisma.ordemServico.count() : Promise.resolve(0),
        canLogistica ? prisma.ordemServico.count({ where: { status: 'EM_EXECUCAO' } }) : Promise.resolve(0),
        canLogistica ? prisma.ordemServico.count({ where: { status: 'FINALIZADA' } }) : Promise.resolve(0),
        canFrota ? prisma.manutencao.count({ where: { status: 'EM_ANDAMENTO' } }) : Promise.resolve(0),
        canEstoque ? prisma.produto.count({ where: { estoqueAtual: { lte: 5 } } }) : Promise.resolve(0),
        canEstoque ? prisma.produto.count() : Promise.resolve(0),
      ]);
      operacionalData = { osTotal, osEmAndamento, osFinalizadas, frotaManutencao: frotaMaint, estoqueBaixo: estBaixo, totalProdutos: ttlProd };
    }

    // 3. Clientes
    let clientesTotal = 0, clientesNovos = 0;
    if (canComercial) {
      [clientesTotal, clientesNovos] = await Promise.all([
        prisma.cliente.count(),
        prisma.cliente.count({ where: { createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } }),
      ]);
    }

    // 4. Financeiro
    let ttlReceita = 0, ttlDespesa = 0;
    let chartData: any[] = [];
    if (canFinanceiro) {
      const [receitas, despesas] = await Promise.all([
        prisma.contaReceber.aggregate({ _sum: { valorRecebido: true, valorOriginal: true }, where: { status: 'RECEBIDO' } }),
        prisma.contaPagar.aggregate({ _sum: { valorPago: true, valorOriginal: true }, where: { status: 'PAGO' } }),
      ]);
      ttlReceita = Number(receitas._sum.valorRecebido || receitas._sum.valorOriginal || 0);
      ttlDespesa = Number(despesas._sum.valorPago || despesas._sum.valorOriginal || 0);
      chartData = [
        { name: 'Jan', receitas: 12000, despesas: 8000 },
        { name: 'Fev', receitas: 19000, despesas: 12000 },
        { name: 'Mar', receitas: 15000, despesas: 10000 },
        { name: 'Abr', receitas: 22000, despesas: 15000 },
        { name: 'Mai', receitas: 28000, despesas: 18000 },
        { name: 'Jun', receitas: 32000, despesas: 20000 },
      ];
    }

    // 5. RH
    let rhData = { total: 0, aptos: 0, emContratacao: 0, atestados: 0, afastados: 0 };
    if (canRH) {
      const [emContratacao, afastados, atestados, usersAtivos] = await Promise.all([
        prisma.admissao.count({ where: { etapa: { notIn: ['CONTRATADO', 'CANCELADO'] } } }),
        prisma.aSOControle.count({ where: { resultado: 'INAPTO' } }),
        prisma.aSOControle.count({ where: { resultado: 'APTO_COM_RESTRICOES' } }),
        prisma.user.count({ where: { isAtivo: true } }),
      ]);
      rhData = { total: usersAtivos, aptos: Math.max(0, usersAtivos - afastados - atestados), emContratacao, atestados, afastados };
    }

    res.json({
      summary: {
        faturamento: ttlReceita,
        lucroLiquido: ttlReceita - ttlDespesa,
        clientesAtivos: clientesTotal,
        novosClientes: clientesNovos,
      },
      propostas: propostasData,
      operacional: operacionalData,
      rh: canRH ? rhData : null,
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
