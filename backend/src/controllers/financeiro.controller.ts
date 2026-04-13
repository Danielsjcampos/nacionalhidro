import { Response } from 'express';
import prismaClient from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import * as xlsx from 'xlsx';

// Cast to any to support new models/fields added to schema
const prisma = prismaClient as any;
import { Decimal } from '@prisma/client/runtime/library';

// ─── HELPERS ────────────────────────────────────────────────────
const toNum = (v: any): number => Number(v) || 0;

const calcularJurosMulta = (valorOriginal: number, dataVencimento: Date) => {
  const hoje = new Date();
  const vencimento = new Date(dataVencimento);
  if (hoje <= vencimento) return { juros: 0, multa: 0, diasAtraso: 0 };

  const diasAtraso = Math.floor((hoje.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24));
  const multa = valorOriginal * 0.02; // 2% multa fixa
  const juros = valorOriginal * 0.001 * diasAtraso; // 0.1% ao dia (mora)
  return { juros: Math.round(juros * 100) / 100, multa: Math.round(multa * 100) / 100, diasAtraso };
};

// ─── LISTAR CONTAS A PAGAR ──────────────────────────────────────
export const listContasPagar = async (req: AuthRequest, res: Response) => {
  try {
    const { status, fornecedorId, dataInicio, dataFim, categoria, vencimento, planoContasId, contaBancariaId } = req.query;
    const where: any = {};

    if (status) where.status = status;
    if (fornecedorId) where.fornecedorId = fornecedorId;
    if (categoria) where.categoria = categoria;
    if (planoContasId) where.planoContasId = planoContasId;
    if (contaBancariaId) where.contaBancariaId = contaBancariaId;

    // Filtro por período de vencimento
    if (dataInicio || dataFim) {
      where.dataVencimento = {};
      if (dataInicio) where.dataVencimento.gte = new Date(dataInicio as string);
      if (dataFim) where.dataVencimento.lte = new Date(dataFim as string);
    }

    // Filtro rápido de vencimento
    if (vencimento === 'vencidos') {
      where.status = 'ABERTO';
      where.dataVencimento = { lt: new Date() };
    } else if (vencimento === 'hoje') {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const amanha = new Date(hoje);
      amanha.setDate(amanha.getDate() + 1);
      where.dataVencimento = { gte: hoje, lt: amanha };
    } else if (vencimento === 'semana') {
      const hoje = new Date();
      const semana = new Date(hoje);
      semana.setDate(semana.getDate() + 7);
      where.dataVencimento = { gte: hoje, lte: semana };
      where.status = 'ABERTO';
    }

    const list = await prisma.contaPagar.findMany({
      where,
      include: { 
        fornecedor: { select: { id: true, nome: true } },
        clienteRef: { select: { id: true, nome: true } }
      },
      orderBy: { dataVencimento: 'asc' }
    });

    // Calcular juros/multa para títulos em atraso
    const enrichedList = list.map(item => {
      const { juros, multa, diasAtraso } = calcularJurosMulta(
        toNum(item.valorOriginal),
        item.dataVencimento
      );
      return {
        ...item,
        diasAtraso,
        jurosCalculado: juros,
        multaCalculada: multa,
        valorTotalCalculado: toNum(item.valorOriginal) + juros + multa - toNum(item.valorDesconto),
      };
    });

    res.json(enrichedList);
  } catch (error) {
    console.error('List contas pagar error:', error);
    res.status(500).json({ error: 'Falha ao buscar contas a pagar' });
  }
};

// ─── CRIAR CONTA A PAGAR ────────────────────────────────────────
export const createContaPagar = async (req: AuthRequest, res: Response) => {
  try {
    const { totalParcelas, ...data } = req.body;
    const valorOriginal = toNum(data.valorOriginal);
    const parcelas = Math.max(1, totalParcelas || 1);

    if (!data.descricao || !valorOriginal) {
      return res.status(400).json({ error: 'Descrição e valor são obrigatórios' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user?.userId } });
    const usuarioNome = user?.name || 'Sistema';

    const parcelaRef = parcelas > 1 ? crypto.randomUUID() : undefined;

    const created: any[] = [];
    for (let i = 1; i <= parcelas; i++) {
      const valorParcela = Math.round((valorOriginal / parcelas) * 100) / 100;
      const vencimento = new Date(data.dataVencimento);
      vencimento.setMonth(vencimento.getMonth() + (i - 1));

      const c = await prisma.contaPagar.create({
        data: {
          descricao: parcelas > 1 ? `${data.descricao} (${i}/${parcelas})` : data.descricao,
          fornecedorId: data.fornecedorId || undefined,
          categoria: data.categoria || 'OUTROS',
          naturezaFinanceira: data.naturezaFinanceira,
          notaFiscal: data.notaFiscal,
          serieNF: data.serieNF,
          prefixo: data.prefixo,
          valorOriginal: valorParcela,
          valorTotal: valorParcela,
          saldoDevedor: valorParcela,
          dataEmissao: data.dataEmissao ? new Date(data.dataEmissao) : new Date(),
          dataVencimento: vencimento,
          centroCusto: data.centroCusto,
          planoContasId: data.planoContasId || undefined,
          contaBancariaId: data.contaBancariaId || undefined,
          centroCustoId: data.centroCustoId || undefined,
          impostoPis: data.impostoPis ? toNum(data.impostoPis) : undefined,
          impostoCofins: data.impostoCofins ? toNum(data.impostoCofins) : undefined,
          impostoIpi: data.impostoIpi ? toNum(data.impostoIpi) : undefined,
          impostoCsll: data.impostoCsll ? toNum(data.impostoCsll) : undefined,
          impostoIr: data.impostoIr ? toNum(data.impostoIr) : undefined,
          ncm: data.ncm || undefined,
          anexoUrl: data.anexoUrl || undefined,
          codigoBarras: data.codigoBarras || undefined,
          formaPagamento: data.formaPagamento || undefined,
          numeroParcela: i,
          totalParcelas: parcelas,
          parcelaRef,
          empresa: data.empresa || 'NACIONAL',
          usuarioCriador: usuarioNome,
          clienteId: data.clienteId || undefined,
          observacoes: data.observacoes,
        }
      });
      created.push(c);
    }

    res.status(201).json(parcelas > 1 ? created : created[0]);
  } catch (error: any) {
    console.error('Create conta pagar error:', error);
    res.status(500).json({ error: 'Falha ao criar conta a pagar', details: error.message });
  }
};

// ─── EDITAR CONTA A PAGAR ───────────────────────────────────────
export const editarContaPagar = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;
    
    const titulo = await prisma.contaPagar.findUnique({ where: { id } });
    if (!titulo) return res.status(404).json({ error: 'Título não encontrado' });

    const valorOriginal = toNum(data.valorOriginal) || titulo.valorOriginal;

    const updated = await prisma.contaPagar.update({
      where: { id },
      data: {
        descricao: data.descricao,
        fornecedorId: data.fornecedorId || undefined,
        categoria: data.categoria || undefined,
        naturezaFinanceira: data.naturezaFinanceira,
        notaFiscal: data.notaFiscal,
        valorOriginal,
        valorTotal: titulo.status === 'ABERTO' ? valorOriginal : undefined,
        saldoDevedor: titulo.status === 'ABERTO' ? valorOriginal : undefined,
        dataVencimento: data.dataVencimento ? new Date(data.dataVencimento) : undefined,
        centroCustoId: data.centroCustoId || undefined,
        impostoPis: data.impostoPis ? toNum(data.impostoPis) : null,
        impostoCofins: data.impostoCofins ? toNum(data.impostoCofins) : null,
        impostoIpi: data.impostoIpi ? toNum(data.impostoIpi) : null,
        impostoCsll: data.impostoCsll ? toNum(data.impostoCsll) : null,
        impostoIr: data.impostoIr ? toNum(data.impostoIr) : null,
        ncm: data.ncm || null,
        empresa: data.empresa || undefined,
        clienteId: data.clienteId || undefined,
        observacoes: data.observacoes,
      }
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Editar conta pagar error:', error);
    res.status(500).json({ error: 'Falha ao editar conta a pagar', details: error.message });
  }
};

export const corrigirBaixaContaPagar = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { valorPago, formaPagamento, dataPagamento, contaBancariaId, observacoes } = req.body;

    const titulo = await prisma.contaPagar.findUnique({ where: { id } });
    if (!titulo) return res.status(404).json({ error: 'Título não encontrado' });

    const updated = await prisma.contaPagar.update({
      where: { id },
      data: {
        valorPago: valorPago !== undefined ? toNum(valorPago) : titulo.valorPago,
        dataPagamento: dataPagamento ? new Date(dataPagamento) : titulo.dataPagamento,
        formaPagamento: formaPagamento || titulo.formaPagamento,
        contaBancariaId: contaBancariaId || titulo.contaBancariaId,
        observacoes: observacoes ? `${titulo.observacoes || ''}\nCORREÇÃO: ${observacoes}` : titulo.observacoes
      }
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Corrigir baixa conta pagar error:', error);
    res.status(500).json({ error: 'Falha ao corrigir baixa', details: error.message });
  }
};

// ─── BAIXA INDIVIDUAL (TOTAL ou PARCIAL) ────────────────────────
export const baixarContaPagar = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { valorPago, formaPagamento, banco, agencia, conta, valorDesconto, observacoes } = req.body;

    const titulo = await prisma.contaPagar.findUnique({ where: { id } });
    if (!titulo) return res.status(404).json({ error: 'Título não encontrado' });
    if (titulo.status === 'PAGO' || titulo.status === 'CANCELADO') {
      return res.status(400).json({ error: 'Título já baixado ou cancelado' });
    }

    const valor = toNum(valorPago);
    const desconto = toNum(valorDesconto);
    const original = toNum(titulo.valorOriginal);
    const { juros, multa } = calcularJurosMulta(original, titulo.dataVencimento);
    const totalComEncargos = original + juros + multa - desconto;
    const saldoAnterior = toNum(titulo.saldoDevedor) || original;
    const novoSaldo = Math.max(0, Math.round((saldoAnterior - valor) * 100) / 100);
    const isParcial = novoSaldo > 0.01;

    const updated = await prisma.contaPagar.update({
      where: { id: id as string },
      data: {
        valorPago: toNum(titulo.valorPago) + valor,
        valorJuros: juros,
        valorMulta: multa,
        valorDesconto: desconto,
        valorTotal: totalComEncargos,
        saldoDevedor: novoSaldo,
        formaPagamento,
        banco, agencia, conta,
        tipoBaixa: isParcial ? 'PARCIAL' : 'TOTAL',
        status: isParcial ? 'PAGO_PARCIAL' : 'PAGO',
        dataPagamento: new Date(),
        dataBaixa: isParcial ? undefined : new Date(),
        observacoes: observacoes || titulo.observacoes,
      }
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Baixar conta pagar error:', error);
    res.status(500).json({ error: 'Falha ao baixar título', details: error.message });
  }
};

// ─── BAIXA POR LOTE ─────────────────────────────────────────────
export const baixarLoteContasPagar = async (req: AuthRequest, res: Response) => {
  try {
    const { titulosBaixa, formaPagamento, banco, agencia, conta } = req.body;

    if (!titulosBaixa || !Array.isArray(titulosBaixa) || titulosBaixa.length === 0) {
      return res.status(400).json({ error: 'Informe os títulos a serem baixados e seus descontos/juros' });
    }

    const resultados: any[] = [];
    for (const item of titulosBaixa) {
      const titulo = await prisma.contaPagar.findUnique({ where: { id: item.id } });
      if (!titulo || titulo.status === 'PAGO' || titulo.status === 'CANCELADO') continue;

      const original = toNum(titulo.valorOriginal);
      const { juros: jurosDefault, multa: multaDefault } = calcularJurosMulta(original, titulo.dataVencimento);
      
      const juros = item.valorJuros !== undefined ? toNum(item.valorJuros) : jurosDefault;
      const desconto = item.valorDesconto !== undefined ? toNum(item.valorDesconto) : 0;
      const multa = multaDefault; // Keep default multa unless told to override

      const valorTotalPagar = original + juros + multa - desconto;

      const updated = await prisma.contaPagar.update({
        where: { id: item.id },
        data: {
          valorPago: valorTotalPagar,
          valorJuros: juros,
          valorMulta: multa,
          valorDesconto: desconto,
          valorTotal: valorTotalPagar,
          saldoDevedor: 0,
          formaPagamento,
          banco, agencia, conta,
          tipoBaixa: 'TOTAL',
          status: 'PAGO',
          dataPagamento: new Date(),
          dataBaixa: new Date(),
        }
      });
      resultados.push(updated);
    }

    res.json({ baixados: resultados.length, titulos: resultados });
  } catch (error: any) {
    console.error('Baixar lote error:', error);
    res.status(500).json({ error: 'Falha ao baixar lote', details: error.message });
  }
};

// ─── AGRUPAR NFs EM FATURA ──────────────────────────────────────
export const agruparFatura = async (req: AuthRequest, res: Response) => {
  try {
    const { ids } = req.body;
    if (!ids || ids.length < 2) {
      return res.status(400).json({ error: 'Selecione pelo menos 2 títulos para agrupar' });
    }

    const faturaRef = crypto.randomUUID();

    await prisma.contaPagar.updateMany({
      where: { id: { in: ids } },
      data: { faturaRef }
    });

    const agrupados = await prisma.contaPagar.findMany({
      where: { faturaRef },
      include: { fornecedor: { select: { nome: true } } }
    });

    const valorTotal = agrupados.reduce((s, c) => s + toNum(c.valorOriginal), 0);

    res.json({ faturaRef, quantidade: agrupados.length, valorTotal, titulos: agrupados });
  } catch (error: any) {
    console.error('Agrupar fatura error:', error);
    res.status(500).json({ error: 'Falha ao agrupar fatura', details: error.message });
  }
};

// ─── CANCELAR TÍTULO ────────────────────────────────────────────
export const cancelarContaPagar = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { motivo } = req.body;

    const updated = await prisma.contaPagar.update({
      where: { id },
      data: {
        status: 'CANCELADO',
        observacoes: motivo ? `CANCELADO: ${motivo}` : 'CANCELADO',
      }
    });
    res.json(updated);
  } catch (error: any) {
    console.error('Cancelar conta pagar error:', error);
    res.status(500).json({ error: 'Falha ao cancelar' });
  }
};

// ─── REVOGAR CONTA A PAGAR ──────────────────────────────────────
export const revogarContaPagar = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    
    const titulo = await prisma.contaPagar.findUnique({ where: { id } });
    if (!titulo) return res.status(404).json({ error: 'Título não encontrado' });

    const updated = await prisma.contaPagar.update({
      where: { id },
      data: {
        status: 'ABERTO',
        valorPago: null,
        valorJuros: 0,
        valorMulta: 0,
        valorDesconto: 0,
        saldoDevedor: titulo.valorOriginal,
        formaPagamento: null,
        banco: null,
        agencia: null,
        conta: null,
        tipoBaixa: null,
        dataPagamento: null,
        dataBaixa: null,
        observacoes: `${titulo.observacoes || ''}\nREVOGADO: Pagamento desfeito pelo usuário.`,
      }
    });
    res.json(updated);
  } catch (error: any) {
    console.error('Revogar conta pagar error:', error);
    res.status(500).json({ error: 'Falha ao revogar pagamento' });
  }
};

// ─── RELATÓRIOS ─────────────────────────────────────────────────
export const relatorioContasPagar = async (req: AuthRequest, res: Response) => {
  try {
    const { tipo, dataInicio, dataFim, fornecedorId } = req.query;
    const where: any = {};

    if (fornecedorId) where.fornecedorId = fornecedorId;
    if (dataInicio || dataFim) {
      where.dataVencimento = {};
      if (dataInicio) where.dataVencimento.gte = new Date(dataInicio as string);
      if (dataFim) where.dataVencimento.lte = new Date(dataFim as string);
    }

    if (tipo === 'pagos') {
      where.status = 'PAGO';
    } else if (tipo === 'vencidos') {
      where.status = 'ABERTO';
      where.dataVencimento = { ...(where.dataVencimento || {}), lt: new Date() };
    } else if (tipo === 'a_vencer') {
      where.status = 'ABERTO';
      where.dataVencimento = { ...(where.dataVencimento || {}), gte: new Date() };
    }

    const titulos = await prisma.contaPagar.findMany({
      where,
      include: { fornecedor: { select: { nome: true } } },
      orderBy: { dataVencimento: 'asc' }
    });

    const totalValor = titulos.reduce((s, t) => s + toNum(t.valorOriginal), 0);
    const totalPago = titulos.reduce((s, t) => s + toNum(t.valorPago), 0);

    // Resumo por fornecedor
    const porFornecedor: Record<string, { nome: string; total: number; qtd: number }> = {};
    titulos.forEach(t => {
      const nome = t.fornecedor?.nome || 'Sem fornecedor';
      if (!porFornecedor[nome]) porFornecedor[nome] = { nome, total: 0, qtd: 0 };
      porFornecedor[nome].total += toNum(t.valorOriginal);
      porFornecedor[nome].qtd++;
    });

    // Resumo por categoria
    const porCategoria: Record<string, number> = {};
    titulos.forEach(t => {
      porCategoria[t.categoria] = (porCategoria[t.categoria] || 0) + toNum(t.valorOriginal);
    });

    res.json({
      tipo: tipo || 'todos',
      total: titulos.length,
      totalValor,
      totalPago,
      porFornecedor: Object.values(porFornecedor),
      porCategoria,
      titulos,
    });
  } catch (error) {
    console.error('Relatório contas pagar error:', error);
    res.status(500).json({ error: 'Falha ao gerar relatório' });
  }
};

// ─── STATS FINANCEIRO ───────────────────────────────────────────
export const getFinanceiroStats = async (req: AuthRequest, res: Response) => {
  try {
    const pagar = await prisma.contaPagar.findMany();
    const receber = await prisma.contaReceber.findMany();

    const hoje = new Date();
    const emAberto = pagar.filter(c => c.status === 'ABERTO' || c.status === 'PAGO_PARCIAL');
    const pagos = pagar.filter(c => c.status === 'PAGO');
    const vencidos = emAberto.filter(c => new Date(c.dataVencimento) < hoje);

    // Contas a pagar
    const totalPagar = emAberto.reduce((s, c) => s + toNum(c.saldoDevedor || c.valorOriginal), 0);
    const totalPago = pagos.reduce((s, c) => s + toNum(c.valorPago || c.valorOriginal), 0);
    const totalVencido = vencidos.reduce((s, c) => s + toNum(c.saldoDevedor || c.valorOriginal), 0);

    // Contas a receber
    const totalReceber = receber.filter(c => c.status === 'PENDENTE').reduce((s, c) => s + toNum(c.valorOriginal), 0);
    const totalRecebido = receber.filter(c => c.status === 'RECEBIDO').reduce((s, c) => s + toNum(c.valorRecebido || c.valorOriginal), 0);
    const vencidasReceber = receber.filter(c => c.status === 'PENDENTE' && new Date(c.dataVencimento) < hoje).length;

    // Vencendo esta semana
    const semana = new Date(hoje);
    semana.setDate(semana.getDate() + 7);
    const vencendoSemana = emAberto.filter(c => {
      const v = new Date(c.dataVencimento);
      return v >= hoje && v <= semana;
    }).length;

    res.json({
      totalPagar,
      totalPago,
      totalVencido,
      vencidasPagar: vencidos.length,
      vencendoSemana,
      totalReceber,
      totalRecebido,
      vencidasReceber,
      saldo: totalRecebido - totalPago,
    });
  } catch (error) {
    console.error('Financeiro stats error:', error);
    res.status(500).json({ error: 'Falha ao buscar estatísticas' });
  }
};

// ─── CONTAS A RECEBER (mantém compatibilidade) ──────────────────
export const listContasReceber = async (req: AuthRequest, res: Response) => {
  try {
    const { status, clienteId } = req.query;
    const where: any = {};
    if (status) where.status = status;
    if (clienteId) where.clienteId = clienteId;
    const list = await prisma.contaReceber.findMany({
      where,
      include: { 
        cliente: { select: { nome: true } },
        centroCustoRef: { select: { nome: true } }
      },
      orderBy: { dataVencimento: 'asc' }
    });
    res.json(list);
  } catch (error) {
    console.error('List contas receber error:', error);
    res.status(500).json({ error: 'Falha ao buscar contas a receber' });
  }
};

export const createContaReceber = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user?.userId } });
    const usuarioNome = user?.name || 'Sistema';

    const c = await prisma.contaReceber.create({
      data: {
        ...req.body,
        valorOriginal: Number(req.body.valorOriginal),
        dataVencimento: new Date(req.body.dataVencimento),
        empresa: req.body.empresa || 'NACIONAL',
        usuarioCriador: usuarioNome,
        naturezaFinanceira: req.body.naturezaFinanceira,
        centroCustoId: req.body.centroCustoId || undefined,
      }
    });
    res.status(201).json(c);
  } catch (error: any) {
    console.error('Create conta receber error:', error);
    res.status(500).json({ error: 'Falha ao criar conta a receber', details: error.message });
  }
};

export const receberConta = async (req: AuthRequest, res: Response) => {
  try {
    const { valorRecebido, formaPagamento, valorDesconto, conta, observacoes } = req.body;
    const c = await prisma.contaReceber.update({
      where: { id: req.params.id as string },
      data: {
        status: 'RECEBIDO',
        valorRecebido: Number(valorRecebido),
        valorDesconto: valorDesconto ? Number(valorDesconto) : 0,
        dataRecebimento: new Date(),
        formaPagamento,
        contaBancariaId: conta || undefined,
        observacoes: observacoes ? `${req.body.observacoes || ''}\nBAIXA: ${observacoes}` : req.body.observacoes
      }
    });
    res.json(c);
  } catch (error: any) {
    console.error('Receber conta error:', error);
    res.status(500).json({ error: 'Falha ao receber', details: error.message });
  }
};

export const corrigirBaixaContaReceber = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { valorRecebido, formaPagamento, valorDesconto, conta, observacoes } = req.body;

    const titulo = await prisma.contaReceber.findUnique({ where: { id } });
    if (!titulo) return res.status(404).json({ error: 'Título não encontrado' });

    const c = await prisma.contaReceber.update({
      where: { id },
      data: {
        valorRecebido: valorRecebido !== undefined ? Number(valorRecebido) : titulo.valorRecebido,
        valorDesconto: valorDesconto !== undefined ? Number(valorDesconto) : titulo.valorDesconto,
        formaPagamento: formaPagamento || titulo.formaPagamento,
        contaBancariaId: conta || titulo.contaBancariaId,
        observacoes: observacoes ? `${titulo.observacoes || ''}\nCORREÇÃO: ${observacoes}` : titulo.observacoes
      }
    });
    res.json(c);
  } catch (error: any) {
    console.error('Corrigir baixa error:', error);
    res.status(500).json({ error: 'Falha ao corrigir baixa', details: error.message });
  }
};

// ─── REVOGAR CONTA A RECEBER ────────────────────────────────────
export const revogarContaReceber = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    
    const titulo = await prisma.contaReceber.findUnique({ where: { id } });
    if (!titulo) return res.status(404).json({ error: 'Título não encontrado' });

    const updated = await prisma.contaReceber.update({
      where: { id },
      data: {
        status: 'PENDENTE',
        valorRecebido: null,
        valorDesconto: 0,
        dataRecebimento: null,
        formaPagamento: null,
        contaBancariaId: null,
        observacoes: `${titulo.observacoes || ''}\nREVOGADO: Recebimento desfeito pelo usuário.`,
      }
    });
    res.json(updated);
  } catch (error: any) {
    console.error('Revogar conta receber error:', error);
    res.status(500).json({ error: 'Falha ao revogar recebimento' });
  }
};

// ─── CANCELAR CONTA A RECEBER ───────────────────────────────────
export const cancelarContaReceber = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { motivo } = req.body;

    const updated = await prisma.contaReceber.update({
      where: { id },
      data: {
        status: 'CANCELADO',
        observacoes: motivo ? `CANCELADO: ${motivo}` : 'CANCELADO',
      }
    });
    res.json(updated);
  } catch (error: any) {
    console.error('Cancelar conta receber error:', error);
    res.status(500).json({ error: 'Falha ao cancelar' });
  }
};

// ─── RECEBER LOTE CONTAS A RECEBER ──────────────────────────────
export const receberLoteContasReceber = async (req: AuthRequest, res: Response) => {
  try {
    const { titulosBaixa, formaPagamento, contaBancariaId } = req.body;

    if (!titulosBaixa || !Array.isArray(titulosBaixa) || titulosBaixa.length === 0) {
      return res.status(400).json({ error: 'Informe os títulos a serem recebidos' });
    }

    const resultados: any[] = [];
    for (const item of titulosBaixa) {
      const titulo = await prisma.contaReceber.findUnique({ where: { id: item.id } });
      if (!titulo || titulo.status === 'RECEBIDO' || titulo.status === 'CANCELADO') continue;

      const original = toNum(titulo.valorOriginal);
      const desconto = item.valorDesconto !== undefined ? toNum(item.valorDesconto) : 0;
      const juros = item.valorJuros !== undefined ? toNum(item.valorJuros) : 0;
      const valorFinal = original + juros - desconto;

      const updated = await prisma.contaReceber.update({
        where: { id: item.id },
        data: {
          status: 'RECEBIDO',
          valorRecebido: valorFinal,
          valorDesconto: desconto,
          valorJuros: juros,
          dataRecebimento: new Date(),
          formaPagamento,
          contaBancariaId: contaBancariaId || undefined,
        }
      });
      resultados.push(updated);
    }

    res.json({ recebidos: resultados.length, titulos: resultados });
  } catch (error: any) {
    console.error('Receber lote error:', error);
    res.status(500).json({ error: 'Falha ao receber lote', details: error.message });
  }
};

// ─── EXPORTAR LOTE EXCEL ─────────────────────────────────────────
export const exportarLoteExcel = async (req: AuthRequest, res: Response) => {
  try {
    const { ids } = req.query;
    if (!ids || typeof ids !== 'string') {
      return res.status(400).json({ error: 'Informe os IDs na query. Ex: ?ids=uuid1,uuid2' });
    }
    const idsArray = ids.split(',');

    const titulos = await prisma.contaPagar.findMany({
      where: { id: { in: idsArray } },
      include: { fornecedor: { select: { nome: true } } }
    });

    const dataExcel = titulos.map((t: any) => ({
      Descrição: t.descricao,
      Fornecedor: t.fornecedor?.nome || '',
      Valor_Original: toNum(t.valorOriginal),
      Vencimento: t.dataVencimento.toISOString().split('T')[0],
      Nota_Fiscal: t.notaFiscal || '',
      Status: t.status
    }));

    const worksheet = xlsx.utils.json_to_sheet(dataExcel);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Lote');

    const buffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="lote_pagamento.xlsx"');
    res.send(buffer);
  } catch (error) {
    console.error('Export Excel error', error);
    res.status(500).json({ error: 'Falha ao gerar Excel' });
  }
};

// ─── EXPORTAR CNAB (MOCK GENÉRICO) ──────────────────────────────
export const exportarLoteCnab = async (req: AuthRequest, res: Response) => {
  try {
    const { ids, banco } = req.query; 
    if (!ids || typeof ids !== 'string') {
      return res.status(400).json({ error: 'Informe os IDs na query. Ex: ?ids=uuid1,uuid2' });
    }
    const idsArray = ids.split(',');

    const titulos = await prisma.contaPagar.findMany({
      where: { id: { in: idsArray } },
      include: { fornecedor: { select: { nome: true, cnpj: true } } }
    });

    let cnabText = '';
    // Header Mock
    cnabText += `01REMESSA01COBRANCA       NACIONAL HIDROSANEAMENTO        ${banco === 'ITAU' ? '341ITAUBANCO ITAU SA' : '033SANTANDER        '}... HEADER\n`;
    
    // Detalhes
    for (const t of titulos) {
      const vOriginal = (toNum(t.valorOriginal) * 100).toFixed(0).padStart(13, '0');
      const doc = t.fornecedor?.cnpj ? t.fornecedor.cnpj.padStart(14, '0') : '00000000000000';
      cnabText += `1${doc}                                ${vOriginal}  ... DETALHE\n`;
    }

    // Trailer
    cnabText += `9... TRAILER  ${String(titulos.length).padStart(6, '0')}\n`;

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename="remessa.rem"');
    res.send(cnabText);
  } catch (error) {
    console.error('Export CNAB error', error);
    res.status(500).json({ error: 'Falha ao gerar CNAB' });
  }
};
