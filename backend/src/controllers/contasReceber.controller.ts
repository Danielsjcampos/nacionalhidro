import { Response } from 'express';
import prismaClient from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = prismaClient as any;
const toNum = (v: any): number => Number(v) || 0;

// ─── INCLUDES ───────────────────────────────────────────
const FULL_INCLUDE = {
  cliente: { select: { id: true, nome: true, razaoSocial: true, cnpj: true } },
  centrosCustoCR: true,
  naturezasCR: true,
  recebimentoCR: {
    include: {
      parcelas: {
        include: { recebimentos: { orderBy: { dataRecebimento: 'desc' } } },
        orderBy: { numeroParcela: 'asc' },
      },
    },
  },
};

// ─── LIST ───────────────────────────────────────────────
export const listContasReceber = async (req: AuthRequest, res: Response) => {
  try {
    const { status, clienteId, empresaId, tipoFatura, dataInicio, dataFim } = req.query;
    const where: any = {};

    if (status !== undefined) where.status = status;
    if (clienteId) where.clienteId = clienteId;
    if (empresaId) where.empresa = empresaId;
    if (tipoFatura) where.tipoFatura = tipoFatura;

    if (dataInicio || dataFim) {
      where.createdAt = {};
      if (dataInicio) where.createdAt.gte = new Date(dataInicio as string);
      if (dataFim) where.createdAt.lte = new Date(dataFim as string);
    }

    const list = await prisma.contaReceber.findMany({
      where,
      include: FULL_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    res.json(list);
  } catch (error: any) {
    console.error('List contas receber error:', error);
    res.status(500).json({ error: 'Falha ao buscar contas a receber' });
  }
};

// ─── GET ONE ────────────────────────────────────────────
export const getContaReceber = async (req: AuthRequest, res: Response) => {
  try {
    const conta = await prisma.contaReceber.findUnique({
      where: { id: req.params.id },
      include: FULL_INCLUDE,
    });
    if (!conta) return res.status(404).json({ error: 'Conta não encontrada' });
    res.json(conta);
  } catch (error: any) {
    console.error('Get conta receber error:', error);
    res.status(500).json({ error: 'Falha ao buscar conta' });
  }
};

// ─── FATURAMENTOS DISPONÍVEIS ───────────────────────────
export const getFaturamentosDisponiveis = async (req: AuthRequest, res: Response) => {
  try {
    const { clienteId, periodoInicio, periodoFim } = req.query;
    const where: any = { status: { not: 'CANCELADA' } };

    if (clienteId) where.clienteId = clienteId;
    if (periodoInicio || periodoFim) {
      where.dataEmissao = {};
      if (periodoInicio) where.dataEmissao.gte = new Date(periodoInicio as string);
      if (periodoFim) where.dataEmissao.lte = new Date(periodoFim as string);
    }

    // Only faturamentos not yet linked to a conta a receber
    const linkedIds = await prisma.contaReceber.findMany({
      where: { faturamentoId: { not: null }, status: { not: 'CANCELADO' } },
      select: { faturamentoId: true },
    });
    const linkedSet = new Set(linkedIds.map((c: any) => c.faturamentoId));

    const faturamentos = await prisma.faturamento.findMany({
      where,
      include: {
        cliente: { select: { id: true, nome: true, cnpj: true } },
        medicao: { select: { id: true, codigo: true } },
      },
      orderBy: { dataEmissao: 'desc' },
    });

    const available = faturamentos.filter((f: any) => !linkedSet.has(f.id));
    res.json(available);
  } catch (error: any) {
    console.error('Faturamentos disponíveis error:', error);
    res.status(500).json({ error: 'Falha ao buscar faturamentos' });
  }
};

// ─── CREATE ─────────────────────────────────────────────
export const createContaReceber = async (req: AuthRequest, res: Response) => {
  try {
    const {
      faturamentoId, empresa, clienteId, notaFiscal, tipoFatura,
      dataEmissao, dataVencimento, valorBruto, valorTotal,
      valorIss, valorInss, valorPis, valorCofins, valorIr, valorCsll, valorIcms,
      tipoParcela, diaPagamento, intervaloPeriodo,
      insercaoManual, observacoes,
      centrosCusto, naturezas, parcelas
    } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.user?.userId } });
    const valBruto = toNum(valorBruto);
    const valTotal = toNum(valorTotal) || valBruto;
    const qtdParcela = parcelas?.length || 1;
    const valorParcela = qtdParcela > 0 ? Math.round((valTotal / qtdParcela) * 100) / 100 : valTotal;

    const conta = await prisma.contaReceber.create({
      data: {
        descricao: `${tipoFatura || 'CR'} - ${notaFiscal || 'S/N'}`,
        faturamentoId: faturamentoId || undefined,
        empresa: empresa || 'NACIONAL',
        clienteId: clienteId || undefined,
        notaFiscal: notaFiscal || undefined,
        tipoFatura: tipoFatura || undefined,
        dataEmissao: dataEmissao ? new Date(dataEmissao) : new Date(),
        dataVencimento: parcelas?.[0]?.dataVencimento ? new Date(parcelas[0].dataVencimento) : (dataVencimento ? new Date(dataVencimento) : new Date()),
        valorOriginal: valBruto,
        valorTotal: valTotal,
        saldoDevedor: valTotal,
        totalParcelas: qtdParcela,
        tipoParcela: tipoParcela || undefined,
        diaPagamento: diaPagamento ? Number(diaPagamento) : undefined,
        intervaloPeriodo: intervaloPeriodo ? Number(intervaloPeriodo) : undefined,
        insercaoManual: insercaoManual || false,
        observacoes: observacoes || undefined,
        status: 'PENDENTE',
        usuarioCriador: user?.name || 'Sistema',
        valorIss: valorIss ? toNum(valorIss) : undefined,
        valorInss: valorInss ? toNum(valorInss) : undefined,
        valorPis: valorPis ? toNum(valorPis) : undefined,
        valorCofins: valorCofins ? toNum(valorCofins) : undefined,
        valorIr: valorIr ? toNum(valorIr) : undefined,
        valorCsll: valorCsll ? toNum(valorCsll) : undefined,
        valorIcms: valorIcms ? toNum(valorIcms) : undefined,
        // Sub-tabelas
        centrosCustoCR: {
          create: (centrosCusto || []).filter((c: any) => c.centroCustoId || c.valor).map((c: any) => ({
            centroCustoId: c.centroCustoId || undefined,
            valor: toNum(c.valor),
          })),
        },
        naturezasCR: {
          create: (naturezas || []).filter((n: any) => n.naturezaContabilId || n.valor).map((n: any) => ({
            naturezaContabilId: n.naturezaContabilId || undefined,
            valor: toNum(n.valor),
          })),
        },
        recebimentoCR: {
          create: {
            quantidadeParcela: qtdParcela,
            valorParcela,
            parcelas: {
              create: (parcelas || []).map((p: any, i: number) => ({
                numeroParcela: p.numeroParcela || i + 1,
                valorParcela: toNum(p.valorParcela) || valorParcela,
                valorAPagar: toNum(p.valorParcela) || valorParcela,
                valorAReceber: toNum(p.valorParcela) || valorParcela,
                dataVencimento: p.dataVencimento ? new Date(p.dataVencimento) : undefined,
                statusRecebimento: 0,
              })),
            },
          },
        },
      },
      include: FULL_INCLUDE,
    });

    res.status(201).json(conta);
  } catch (error: any) {
    console.error('Create conta receber error:', error);
    res.status(500).json({ error: 'Falha ao criar conta a receber', details: error.message });
  }
};

// ─── UPDATE ─────────────────────────────────────────────
export const updateContaReceber = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      empresa, clienteId, notaFiscal, tipoFatura,
      dataEmissao, dataVencimento, valorBruto, valorTotal,
      valorIss, valorInss, valorPis, valorCofins, valorIr, valorCsll, valorIcms,
      tipoParcela, diaPagamento, intervaloPeriodo,
      observacoes, centrosCusto, naturezas, parcelas
    } = req.body;

    const existing = await prisma.contaReceber.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Conta não encontrada' });

    // Recreate sub-tables if provided
    if (centrosCusto) {
      await prisma.contaReceberCentroCusto.deleteMany({ where: { contaId: id } });
    }
    if (naturezas) {
      await prisma.contaReceberNatureza.deleteMany({ where: { contaId: id } });
    }
    if (parcelas) {
      const rec = await prisma.contaReceberRecebimento.findUnique({ where: { contaId: id } });
      if (rec) {
        await prisma.contaReceberHistorico.deleteMany({
          where: { parcela: { recebimentoId: rec.id } },
        });
        await prisma.contaReceberParcela.deleteMany({ where: { recebimentoId: rec.id } });
        await prisma.contaReceberRecebimento.delete({ where: { id: rec.id } });
      }
    }

    const valBruto = valorBruto !== undefined ? toNum(valorBruto) : toNum(existing.valorOriginal);
    const valTotal = valorTotal !== undefined ? toNum(valorTotal) : toNum(existing.valorTotal);
    const qtdParcela = parcelas?.length || existing.totalParcelas || 1;
    const valorParcela = qtdParcela > 0 ? Math.round((valTotal / qtdParcela) * 100) / 100 : valTotal;

    const updated = await prisma.contaReceber.update({
      where: { id },
      data: {
        empresa: empresa || undefined,
        clienteId: clienteId !== undefined ? (clienteId || null) : undefined,
        notaFiscal: notaFiscal !== undefined ? notaFiscal : undefined,
        tipoFatura: tipoFatura || undefined,
        dataEmissao: dataEmissao ? new Date(dataEmissao) : undefined,
        dataVencimento: dataVencimento ? new Date(dataVencimento) : undefined,
        valorOriginal: valBruto,
        valorTotal: valTotal,
        saldoDevedor: valTotal,
        totalParcelas: qtdParcela,
        tipoParcela, diaPagamento: diaPagamento ? Number(diaPagamento) : undefined,
        intervaloPeriodo: intervaloPeriodo ? Number(intervaloPeriodo) : undefined,
        observacoes: observacoes !== undefined ? observacoes : undefined,
        valorIss: valorIss !== undefined ? toNum(valorIss) : undefined,
        valorInss: valorInss !== undefined ? toNum(valorInss) : undefined,
        valorPis: valorPis !== undefined ? toNum(valorPis) : undefined,
        valorCofins: valorCofins !== undefined ? toNum(valorCofins) : undefined,
        valorIr: valorIr !== undefined ? toNum(valorIr) : undefined,
        valorCsll: valorCsll !== undefined ? toNum(valorCsll) : undefined,
        valorIcms: valorIcms !== undefined ? toNum(valorIcms) : undefined,
        ...(centrosCusto ? {
          centrosCustoCR: {
            create: centrosCusto.filter((c: any) => c.centroCustoId || c.valor).map((c: any) => ({
              centroCustoId: c.centroCustoId || undefined,
              valor: toNum(c.valor),
            })),
          },
        } : {}),
        ...(naturezas ? {
          naturezasCR: {
            create: naturezas.filter((n: any) => n.naturezaContabilId || n.valor).map((n: any) => ({
              naturezaContabilId: n.naturezaContabilId || undefined,
              valor: toNum(n.valor),
            })),
          },
        } : {}),
        ...(parcelas ? {
          recebimentoCR: {
            create: {
              quantidadeParcela: qtdParcela,
              valorParcela,
              parcelas: {
                create: parcelas.map((p: any, i: number) => ({
                  numeroParcela: p.numeroParcela || i + 1,
                  valorParcela: toNum(p.valorParcela) || valorParcela,
                  valorAPagar: toNum(p.valorParcela) || valorParcela,
                  valorAReceber: toNum(p.valorParcela) || valorParcela,
                  dataVencimento: p.dataVencimento ? new Date(p.dataVencimento) : undefined,
                  statusRecebimento: 0,
                })),
              },
            },
          },
        } : {}),
      },
      include: FULL_INCLUDE,
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Update conta receber error:', error);
    res.status(500).json({ error: 'Falha ao atualizar conta', details: error.message });
  }
};

// ─── CANCELAR ───────────────────────────────────────────
export const cancelarContaReceber = async (req: AuthRequest, res: Response) => {
  try {
    const { motivoCancelamento } = req.body;
    const updated = await prisma.contaReceber.update({
      where: { id: req.params.id },
      data: {
        status: 'CANCELADO',
        motivoCancelamento: motivoCancelamento || 'Cancelado pelo usuário',
        dataCancelamento: new Date(),
      },
    });
    res.json(updated);
  } catch (error: any) {
    console.error('Cancelar conta receber error:', error);
    res.status(500).json({ error: 'Falha ao cancelar' });
  }
};

// ─── VALIDAR NOTA (duplicidade) ─────────────────────────
export const validarNota = async (req: AuthRequest, res: Response) => {
  try {
    const { nota, empresaId, tipoFatura } = req.query;
    if (!nota) return res.json({ data: true });

    const where: any = {
      notaFiscal: nota as string,
      status: { not: 'CANCELADO' },
    };
    if (empresaId) where.empresa = empresaId;
    if (tipoFatura) where.tipoFatura = tipoFatura;

    const exists = await prisma.contaReceber.findFirst({ where });
    res.json({ data: !exists });
  } catch (error: any) {
    console.error('Validar nota error:', error);
    res.status(500).json({ error: 'Falha ao validar nota' });
  }
};

// ─── RECEBER PARCELA ────────────────────────────────────
export const receberParcela = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      parcelaId, valor, formaPagamento, empresaBancoId,
      observacao, dataRecebimento, antecipar, taxaJuros, valorOperacao
    } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.user?.userId } });

    const parcela = await prisma.contaReceberParcela.findUnique({ where: { id: parcelaId } });
    if (!parcela) return res.status(404).json({ error: 'Parcela não encontrada' });

    const valorRecebido = toNum(valor);

    // Create historico
    await prisma.contaReceberHistorico.create({
      data: {
        parcelaId,
        empresaBancoId: empresaBancoId || undefined,
        valor: valorRecebido,
        valorOperacao: valorOperacao ? toNum(valorOperacao) : undefined,
        formaPagamento: formaPagamento ? Number(formaPagamento) : undefined,
        antecipar: antecipar || false,
        taxaJuros: taxaJuros ? toNum(taxaJuros) : undefined,
        observacao: observacao || undefined,
        dataRecebimento: dataRecebimento ? new Date(dataRecebimento) : new Date(),
        usuarioBaixa: user?.name || 'Sistema',
      },
    });

    // Update parcela status
    const totalRecebido = toNum(parcela.valorAReceber) || toNum(parcela.valorParcela);
    const isRecebido = valorRecebido >= totalRecebido - 0.01;

    await prisma.contaReceberParcela.update({
      where: { id: parcelaId },
      data: {
        statusRecebimento: isRecebido ? 2 : 1, // 2=Recebido, 1=Parcial
        dataVencimentoReal: dataRecebimento ? new Date(dataRecebimento) : new Date(),
      },
    });

    // Check all parcelas to update conta status
    const recebimento = await prisma.contaReceberRecebimento.findUnique({
      where: { contaId: id },
      include: { parcelas: true },
    });

    if (recebimento) {
      const allReceived = recebimento.parcelas.every((p: any) => p.statusRecebimento === 2);
      const someReceived = recebimento.parcelas.some((p: any) => p.statusRecebimento > 0);

      await prisma.contaReceber.update({
        where: { id },
        data: {
          status: allReceived ? 'RECEBIDO' : (someReceived ? 'PARCIAL' : 'PENDENTE'),
          valorRecebido: allReceived ? toNum(recebimento.parcelas.reduce(
            (sum: number, p: any) => sum + toNum(p.valorParcela), 0
          )) : undefined,
          dataRecebimento: allReceived ? new Date() : undefined,
        },
      });
    }

    const conta = await prisma.contaReceber.findUnique({
      where: { id },
      include: FULL_INCLUDE,
    });

    res.json(conta);
  } catch (error: any) {
    console.error('Receber parcela error:', error);
    res.status(500).json({ error: 'Falha ao receber parcela', details: error.message });
  }
};

// ─── SALVAR PARCELA (DataVencimentoReal) ─────────────────
export const salvarParcelaCR = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { dataVencimentoReal, valorAcrescimo, valorDecrescimo } = req.body;

    const data: any = {};
    if (dataVencimentoReal) data.dataVencimentoReal = new Date(dataVencimentoReal);
    if (valorAcrescimo !== undefined) data.valorAcrescimo = toNum(valorAcrescimo);
    if (valorDecrescimo !== undefined) data.valorDecrescimo = toNum(valorDecrescimo);

    if (valorAcrescimo !== undefined || valorDecrescimo !== undefined) {
      const parcela = await prisma.contaReceberParcela.findUnique({ where: { id } });
      if (parcela) {
        const ac = valorAcrescimo !== undefined ? toNum(valorAcrescimo) : toNum(parcela.valorAcrescimo);
        const dc = valorDecrescimo !== undefined ? toNum(valorDecrescimo) : toNum(parcela.valorDecrescimo);
        data.valorAReceber = Math.round((toNum(parcela.valorParcela) + ac - dc) * 100) / 100;
      }
    }

    const updated = await prisma.contaReceberParcela.update({
      where: { id },
      data,
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Salvar parcela CR error:', error);
    res.status(500).json({ error: 'Falha ao salvar parcela', details: error.message });
  }
};
