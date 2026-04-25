import { Response } from 'express';
import prismaClient from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = prismaClient as any;
const toNum = (v: any): number => Number(v) || 0;

// ─── INCLUDES para queries completas ────────────────────
const FULL_INCLUDE = {
  fornecedor: { select: { id: true, nome: true, cnpj: true } },
  clienteRef: { select: { id: true, nome: true, razaoSocial: true, cnpj: true } },
  produtos: true,
  centrosCustoCP: true,
  naturezasCP: true,
  pagamentoCP: {
    include: { parcelas: { orderBy: { numeroParcela: 'asc' } } }
  },
  historicosCP: { orderBy: { dataPagamento: 'desc' } },
};

// ─── LIST ───────────────────────────────────────────────
export const listContasPagar = async (req: AuthRequest, res: Response) => {
  try {
    const { status, fornecedorId, empresaId, dataInicio, dataFim } = req.query;
    const where: any = {};

    if (status !== undefined) where.status = status;
    if (fornecedorId) where.fornecedorId = fornecedorId;
    if (empresaId) where.empresa = empresaId;

    if (dataInicio || dataFim) {
      where.createdAt = {};
      if (dataInicio) where.createdAt.gte = new Date(dataInicio as string);
      if (dataFim) where.createdAt.lte = new Date(dataFim as string);
    }

    const list = await prisma.contaPagar.findMany({
      where,
      include: FULL_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    res.json(list);
  } catch (error: any) {
    console.error('List contas pagar error:', error);
    res.status(500).json({ error: 'Falha ao buscar contas a pagar' });
  }
};

// ─── GET ONE ────────────────────────────────────────────
export const getContaPagar = async (req: AuthRequest, res: Response) => {
  try {
    const conta = await prisma.contaPagar.findUnique({
      where: { id: req.params.id },
      include: FULL_INCLUDE,
    });
    if (!conta) return res.status(404).json({ error: 'Conta não encontrada' });
    res.json(conta);
  } catch (error: any) {
    console.error('Get conta pagar error:', error);
    res.status(500).json({ error: 'Falha ao buscar conta' });
  }
};

// ─── CREATE ─────────────────────────────────────────────
export const createContaPagar = async (req: AuthRequest, res: Response) => {
  try {
    const {
      fornecedorId, empresa, notaFiscal, dataEmissao, observacoes,
      clienteId, tipoParcela, diaPagamento, intervaloPeriodo,
      produtos, centrosCusto, naturezas, parcelas
    } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.user?.userId } });

    // Calculate valorTotal from produtos
    const valorTotal = (produtos || []).reduce(
      (sum: number, p: any) => sum + (toNum(p.quantidade) * toNum(p.valorUnitario)), 0
    );

    const qtdParcela = parcelas?.length || 1;
    const valorParcela = qtdParcela > 0 ? Math.round((valorTotal / qtdParcela) * 100) / 100 : valorTotal;

    const conta = await prisma.contaPagar.create({
      data: {
        descricao: produtos?.[0]?.descricao || 'Conta a Pagar',
        fornecedorId: fornecedorId || undefined,
        empresa: empresa || 'NACIONAL',
        notaFiscal: notaFiscal || undefined,
        dataEmissao: dataEmissao ? new Date(dataEmissao) : new Date(),
        dataVencimento: parcelas?.[0]?.dataVencimento ? new Date(parcelas[0].dataVencimento) : new Date(),
        valorOriginal: valorTotal,
        valorTotal: valorTotal,
        saldoDevedor: valorTotal,
        observacoes: observacoes || undefined,
        clienteId: clienteId || undefined,
        tipoParcela: tipoParcela || undefined,
        diaPagamento: diaPagamento ? Number(diaPagamento) : undefined,
        intervaloPeriodo: intervaloPeriodo ? Number(intervaloPeriodo) : undefined,
        totalParcelas: qtdParcela,
        status: 'ABERTO',
        usuarioCriador: user?.name || 'Sistema',
        // Sub-tabelas
        produtos: {
          create: (produtos || []).map((p: any) => ({
            descricao: p.descricao || '',
            quantidade: toNum(p.quantidade) || 1,
            valorUnitario: toNum(p.valorUnitario),
          })),
        },
        centrosCustoCP: {
          create: (centrosCusto || []).filter((c: any) => c.centroCustoId || c.valor).map((c: any) => ({
            centroCustoId: c.centroCustoId || undefined,
            valor: toNum(c.valor),
          })),
        },
        naturezasCP: {
          create: (naturezas || []).filter((n: any) => n.naturezaContabilId || n.valor).map((n: any) => ({
            naturezaContabilId: n.naturezaContabilId || undefined,
            valor: toNum(n.valor),
          })),
        },
        pagamentoCP: {
          create: {
            quantidadeParcela: qtdParcela,
            valorParcela,
            parcelas: {
              create: (parcelas || []).map((p: any, i: number) => ({
                numeroParcela: p.numeroParcela || i + 1,
                valorParcela: toNum(p.valorParcela) || valorParcela,
                valorAPagar: toNum(p.valorParcela) || valorParcela,
                dataVencimento: p.dataVencimento ? new Date(p.dataVencimento) : undefined,
                statusPagamento: 0,
              })),
            },
          },
        },
      },
      include: FULL_INCLUDE,
    });

    res.status(201).json(conta);
  } catch (error: any) {
    // B-4.1: Race condition — unique constraint violation
    if (error?.code === 'P2002') {
      return res.status(409).json({ error: 'NF já cadastrada para este fornecedor', data: false });
    }
    console.error('Create conta pagar error:', error);
    res.status(500).json({ error: 'Falha ao criar conta a pagar', details: error.message });
  }
};

// ─── UPDATE ─────────────────────────────────────────────
export const updateContaPagar = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      fornecedorId, empresa, notaFiscal, dataEmissao, observacoes,
      clienteId, tipoParcela, diaPagamento, intervaloPeriodo,
      produtos, centrosCusto, naturezas, parcelas
    } = req.body;

    const existing = await prisma.contaPagar.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Conta não encontrada' });

    // Recalculate valorTotal if produtos changed
    let valorTotal = toNum(existing.valorOriginal);
    if (produtos) {
      valorTotal = produtos.reduce(
        (sum: number, p: any) => sum + (toNum(p.quantidade) * toNum(p.valorUnitario)), 0
      );
    }

    // Delete & recreate sub-tables
    if (produtos) {
      await prisma.contaPagarProduto.deleteMany({ where: { contaId: id } });
    }
    if (centrosCusto) {
      await prisma.contaPagarCentroCusto.deleteMany({ where: { contaId: id } });
    }
    if (naturezas) {
      await prisma.contaPagarNatureza.deleteMany({ where: { contaId: id } });
    }
    if (parcelas) {
      const pag = await prisma.contaPagarPagamento.findUnique({ where: { contaId: id } });
      if (pag) {
        await prisma.contaPagarParcela.deleteMany({ where: { pagamentoId: pag.id } });
        await prisma.contaPagarPagamento.delete({ where: { id: pag.id } });
      }
    }

    const qtdParcela = parcelas?.length || existing.totalParcelas || 1;
    const valorParcela = qtdParcela > 0 ? Math.round((valorTotal / qtdParcela) * 100) / 100 : valorTotal;

    const updated = await prisma.contaPagar.update({
      where: { id },
      data: {
        fornecedorId: fornecedorId !== undefined ? (fornecedorId || null) : undefined,
        empresa: empresa || undefined,
        notaFiscal: notaFiscal !== undefined ? notaFiscal : undefined,
        dataEmissao: dataEmissao ? new Date(dataEmissao) : undefined,
        observacoes: observacoes !== undefined ? observacoes : undefined,
        clienteId: clienteId !== undefined ? (clienteId || null) : undefined,
        tipoParcela, diaPagamento: diaPagamento ? Number(diaPagamento) : undefined,
        intervaloPeriodo: intervaloPeriodo ? Number(intervaloPeriodo) : undefined,
        valorOriginal: valorTotal,
        valorTotal: valorTotal,
        saldoDevedor: valorTotal,
        totalParcelas: qtdParcela,
        ...(produtos ? {
          produtos: {
            create: produtos.map((p: any) => ({
              descricao: p.descricao || '',
              quantidade: toNum(p.quantidade) || 1,
              valorUnitario: toNum(p.valorUnitario),
            })),
          },
        } : {}),
        ...(centrosCusto ? {
          centrosCustoCP: {
            create: centrosCusto.filter((c: any) => c.centroCustoId || c.valor).map((c: any) => ({
              centroCustoId: c.centroCustoId || undefined,
              valor: toNum(c.valor),
            })),
          },
        } : {}),
        ...(naturezas ? {
          naturezasCP: {
            create: naturezas.filter((n: any) => n.naturezaContabilId || n.valor).map((n: any) => ({
              naturezaContabilId: n.naturezaContabilId || undefined,
              valor: toNum(n.valor),
            })),
          },
        } : {}),
        ...(parcelas ? {
          pagamentoCP: {
            create: {
              quantidadeParcela: qtdParcela,
              valorParcela,
              parcelas: {
                create: parcelas.map((p: any, i: number) => ({
                  numeroParcela: p.numeroParcela || i + 1,
                  valorParcela: toNum(p.valorParcela) || valorParcela,
                  valorAPagar: toNum(p.valorParcela) || valorParcela,
                  dataVencimento: p.dataVencimento ? new Date(p.dataVencimento) : undefined,
                  statusPagamento: 0,
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
    console.error('Update conta pagar error:', error);
    res.status(500).json({ error: 'Falha ao atualizar conta', details: error.message });
  }
};

// ─── CANCELAR ───────────────────────────────────────────
export const cancelarContaPagar = async (req: AuthRequest, res: Response) => {
  try {
    const { motivoCancelamento } = req.body;
    const updated = await prisma.contaPagar.update({
      where: { id: req.params.id },
      data: {
        status: 'CANCELADO',
        motivoCancelamento: motivoCancelamento || 'Cancelado pelo usuário',
        dataCancelamento: new Date(),
      },
    });
    res.json(updated);
  } catch (error: any) {
    console.error('Cancelar conta pagar error:', error);
    res.status(500).json({ error: 'Falha ao cancelar' });
  }
};

// ─── VALIDAR NF (duplicidade) ───────────────────────────
export const validarNF = async (req: AuthRequest, res: Response) => {
  try {
    const { nota, fornecedorId } = req.query;
    if (!nota || !fornecedorId) return res.json({ data: true });

    const exists = await prisma.contaPagar.findFirst({
      where: {
        notaFiscal: nota as string,
        fornecedorId: fornecedorId as string,
        status: { not: 'CANCELADO' },
      },
    });

    res.json({ data: !exists });
  } catch (error: any) {
    console.error('Validar NF error:', error);
    res.status(500).json({ error: 'Falha ao validar NF' });
  }
};

// ─── PAGAR PARCELA ──────────────────────────────────────
export const pagarParcela = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      parcelaId, valor, formaPagamento, empresaBancoId,
      numeroCheque, codigoBarras, observacao, dataVencimentoReal
    } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.user?.userId } });

    // Find the parcela
    const parcela = await prisma.contaPagarParcela.findUnique({ where: { id: parcelaId } });
    if (!parcela) return res.status(404).json({ error: 'Parcela não encontrada' });

    const valorPago = toNum(valor);
    const totalPago = toNum(parcela.valorPago) + valorPago;
    const valorAPagar = toNum(parcela.valorAPagar);
    const isPago = totalPago >= valorAPagar - 0.01;

    // Update parcela
    await prisma.contaPagarParcela.update({
      where: { id: parcelaId },
      data: {
        valorPago: totalPago,
        statusPagamento: isPago ? 1 : 2, // 1=Pago, 2=Parcial
        dataVencimentoReal: dataVencimentoReal ? new Date(dataVencimentoReal) : new Date(),
      },
    });

    // Create historico
    await prisma.contaPagarHistorico.create({
      data: {
        contaId: id,
        empresaBancoId: empresaBancoId || undefined,
        valor: valorPago,
        formaPagamento: formaPagamento ? Number(formaPagamento) : undefined,
        numeroCheque: numeroCheque || undefined,
        codigoBarras: codigoBarras || undefined,
        observacao: observacao || undefined,
        dataPagamento: dataVencimentoReal ? new Date(dataVencimentoReal) : new Date(),
        usuarioBaixa: user?.name || 'Sistema',
      },
    });

    // Check all parcelas to determine conta status
    const pagamento = await prisma.contaPagarPagamento.findUnique({
      where: { contaId: id },
      include: { parcelas: true },
    });

    if (pagamento) {
      const allPaid = pagamento.parcelas.every((p: any) => p.statusPagamento === 1);
      const somePaid = pagamento.parcelas.some((p: any) => p.statusPagamento > 0);

      const totalPagoGeral = pagamento.parcelas.reduce(
        (sum: number, p: any) => sum + toNum(p.valorPago), 0
      );

      await prisma.contaPagar.update({
        where: { id },
        data: {
          status: allPaid ? 'PAGO' : (somePaid ? 'PAGO_PARCIAL' : 'ABERTO'),
          valorPago: totalPagoGeral,
          dataPagamento: allPaid ? new Date() : undefined,
        },
      });
    }

    const conta = await prisma.contaPagar.findUnique({
      where: { id },
      include: FULL_INCLUDE,
    });

    res.json(conta);
  } catch (error: any) {
    console.error('Pagar parcela error:', error);
    res.status(500).json({ error: 'Falha ao pagar parcela', details: error.message });
  }
};

// ─── SALVAR PARCELA (update DataVencimentoReal) ─────────
export const salvarParcela = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { dataVencimentoReal, valorAcrescimo, valorDecrescimo } = req.body;

    const data: any = {};
    if (dataVencimentoReal) data.dataVencimentoReal = new Date(dataVencimentoReal);
    if (valorAcrescimo !== undefined) data.valorAcrescimo = toNum(valorAcrescimo);
    if (valorDecrescimo !== undefined) data.valorDecrescimo = toNum(valorDecrescimo);

    // Recalculate valorAPagar
    if (valorAcrescimo !== undefined || valorDecrescimo !== undefined) {
      const parcela = await prisma.contaPagarParcela.findUnique({ where: { id } });
      if (parcela) {
        const ac = valorAcrescimo !== undefined ? toNum(valorAcrescimo) : toNum(parcela.valorAcrescimo);
        const dc = valorDecrescimo !== undefined ? toNum(valorDecrescimo) : toNum(parcela.valorDecrescimo);
        data.valorAPagar = Math.round((toNum(parcela.valorParcela) + ac - dc) * 100) / 100;
      }
    }

    const updated = await prisma.contaPagarParcela.update({
      where: { id },
      data,
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Salvar parcela error:', error);
    res.status(500).json({ error: 'Falha ao salvar parcela', details: error.message });
  }
};

// ─── IMPORTAR (array de contas via XML) ─────────────────
export const importarContas = async (req: AuthRequest, res: Response) => {
  try {
    const { contas } = req.body;
    if (!Array.isArray(contas) || contas.length === 0) {
      return res.status(400).json({ error: 'Nenhuma conta para importar' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user?.userId } });
    const created: any[] = [];

    for (const c of contas) {
      const valorTotal = (c.produtos || []).reduce(
        (sum: number, p: any) => sum + (toNum(p.quantidade) * toNum(p.valorUnitario)), 0
      );

      const conta = await prisma.contaPagar.create({
        data: {
          descricao: c.produtos?.[0]?.descricao || 'Importação XML',
          fornecedorId: c.fornecedorId || undefined,
          empresa: c.empresa || 'NACIONAL',
          notaFiscal: c.numeroNF || undefined,
          dataEmissao: c.dataEmissaoNF ? new Date(c.dataEmissaoNF) : new Date(),
          dataVencimento: c.dataVencimento ? new Date(c.dataVencimento) : new Date(),
          valorOriginal: valorTotal,
          valorTotal: valorTotal,
          saldoDevedor: valorTotal,
          totalParcelas: 1,
          status: 'ABERTO',
          usuarioCriador: user?.name || 'Sistema',
          produtos: {
            create: (c.produtos || []).map((p: any) => ({
              descricao: p.descricao || '',
              quantidade: toNum(p.quantidade) || 1,
              valorUnitario: toNum(p.valorUnitario),
            })),
          },
          pagamentoCP: {
            create: {
              quantidadeParcela: 1,
              valorParcela: valorTotal,
              parcelas: {
                create: [{
                  numeroParcela: 1,
                  valorParcela: valorTotal,
                  valorAPagar: valorTotal,
                  dataVencimento: c.dataVencimento ? new Date(c.dataVencimento) : undefined,
                  statusPagamento: 0,
                }],
              },
            },
          },
        },
      });
      created.push(conta);
    }

    res.status(201).json({ importadas: created.length, contas: created });
  } catch (error: any) {
    // B-4.1: Race condition — unique constraint violation
    if (error?.code === 'P2002') {
      return res.status(409).json({ error: 'NF duplicada detectada durante importação', data: false });
    }
    console.error('Importar contas error:', error);
    res.status(500).json({ error: 'Falha ao importar contas', details: error.message });
  }
};
