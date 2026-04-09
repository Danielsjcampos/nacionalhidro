import { Response } from 'express';
import prismaClient from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// Cast to any to support new models/fields added to schema
const prisma = prismaClient as any;

const toNum = (v: any): number => Number(v) || 0;

// Cálculo de juros/multa/correção para recebíveis em atraso
const calcularEncargos = (valorOriginal: number, dataVencimento: Date) => {
    const hoje = new Date();
    const vencimento = new Date(dataVencimento);
    if (hoje <= vencimento) return { juros: 0, multa: 0, correcao: 0, diasAtraso: 0 };

    const diasAtraso = Math.floor((hoje.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24));
    const multa = valorOriginal * 0.02; // 2% multa fixa
    const juros = valorOriginal * 0.00033 * diasAtraso; // ~1% ao mês (0.033%/dia)
    const correcao = valorOriginal * 0.0003 * diasAtraso; // Correção monetária simples
    return {
        juros: Math.round(juros * 100) / 100,
        multa: Math.round(multa * 100) / 100,
        correcao: Math.round(correcao * 100) / 100,
        diasAtraso
    };
};

// ─── LISTAR CONTAS A RECEBER ────────────────────────────────────
export const listContasReceber = async (req: AuthRequest, res: Response) => {
    try {
        const { status, clienteId, vencimento } = req.query;
        const where: any = {};

        if (status) where.status = status;
        if (clienteId) where.clienteId = clienteId;

        if (vencimento === 'vencidos') {
            where.status = { in: ['PENDENTE', 'VENCIDO'] };
            where.dataVencimento = { lt: new Date() };
        } else if (vencimento === 'hoje') {
            const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
            const amanha = new Date(hoje); amanha.setDate(amanha.getDate() + 1);
            where.dataVencimento = { gte: hoje, lt: amanha };
        } else if (vencimento === 'semana') {
            const hoje = new Date();
            const semana = new Date(hoje); semana.setDate(semana.getDate() + 7);
            where.status = { in: ['PENDENTE', 'PARCIAL'] };
            where.dataVencimento = { gte: hoje, lte: semana };
        }

        const list = await prisma.contaReceber.findMany({
            where,
            include: {
                cliente: { select: { id: true, nome: true, telefone: true, email: true } },
                historicoCobranca: { take: 3, orderBy: { enviadoEm: 'desc' } },
                negociacoes: { where: { status: 'EM_ANDAMENTO' }, take: 1 },
            },
            orderBy: { dataVencimento: 'asc' }
        });

        // Enriquecer com cálculos de encargos
        const enriched = list.map(item => {
            const { juros, multa, correcao, diasAtraso } = calcularEncargos(
                toNum(item.valorOriginal),
                item.dataVencimento
            );
            return {
                ...item,
                diasAtraso,
                jurosCalculado: juros,
                multaCalculada: multa,
                correcaoCalculada: correcao,
                valorTotalCalculado: toNum(item.valorOriginal) + juros + multa + correcao - toNum(item.valorDesconto),
                temNegociacao: item.negociacoes.length > 0,
            };
        });

        res.json(enriched);
    } catch (error) {
        console.error('List contas receber error:', error);
        res.status(500).json({ error: 'Falha ao buscar contas a receber' });
    }
};

// ─── CRIAR CONTA A RECEBER ──────────────────────────────────────
export const createContaReceber = async (req: AuthRequest, res: Response) => {
    try {
        const { totalParcelas, ...data } = req.body;
        const valorOriginal = toNum(data.valorOriginal);
        const parcelas = Math.max(1, totalParcelas || 1);

        if (!data.descricao || !valorOriginal) {
            return res.status(400).json({ error: 'Descrição e valor são obrigatórios' });
        }

        const created: any[] = [];
        for (let i = 1; i <= parcelas; i++) {
            const valorParcela = Math.round((valorOriginal / parcelas) * 100) / 100;
            const vencimento = new Date(data.dataVencimento);
            vencimento.setMonth(vencimento.getMonth() + (i - 1));

            const c = await prisma.contaReceber.create({
                data: {
                    descricao: parcelas > 1 ? `${data.descricao} (${i}/${parcelas})` : data.descricao,
                    clienteId: data.clienteId || undefined,
                    faturamentoId: data.faturamentoId,
                    valorOriginal: valorParcela,
                    valorTotal: valorParcela,
                    saldoDevedor: valorParcela,
                    dataVencimento: vencimento,
                    notaFiscal: data.notaFiscal,
                    numeroParcela: i,
                    totalParcelas: parcelas,
                    linkPagamento: data.linkPagamento,
                    chavePix: data.chavePix,
                    observacoes: data.observacoes,
                }
            });
            created.push(c);
        }

        res.status(201).json(parcelas > 1 ? created : created[0]);
    } catch (error: any) {
        console.error('Create conta receber error:', error);
        res.status(500).json({ error: 'Falha ao criar conta a receber', details: error.message });
    }
};

// ─── RECEBER (BAIXA TOTAL OU PARCIAL) ───────────────────────────
export const receberConta = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const { valorRecebido, formaPagamento, valorDesconto } = req.body;

        const titulo = await prisma.contaReceber.findUnique({ where: { id } });
        if (!titulo) return res.status(404).json({ error: 'Título não encontrado' });

        const valor = toNum(valorRecebido);
        const desconto = toNum(valorDesconto);
        const saldoAnterior = toNum(titulo.saldoDevedor) || toNum(titulo.valorOriginal);
        const novoSaldo = Math.max(0, Math.round((saldoAnterior - valor - desconto) * 100) / 100);
        const isParcial = novoSaldo > 0.01;

        const updated = await prisma.contaReceber.update({
            where: { id: id as string },
            data: {
                valorRecebido: toNum(titulo.valorRecebido) + valor,
                valorDesconto: desconto,
                saldoDevedor: novoSaldo,
                formaPagamento,
                status: isParcial ? 'PARCIAL' : 'RECEBIDO',
                dataRecebimento: isParcial ? undefined : new Date(),
            }
        });

        res.json(updated);
    } catch (error: any) {
        console.error('Receber conta error:', error);
        res.status(500).json({ error: 'Falha ao receber', details: error.message });
    }
};

// ─── KPIs DE COBRANÇA ───────────────────────────────────────────
export const getCobrancaKPIs = async (req: AuthRequest, res: Response) => {
    try {
        const receber = await prisma.contaReceber.findMany();
        const hoje = new Date();

        const pendentes = receber.filter(c => 
            ['PENDENTE', 'PARCIAL', 'VENCIDO', 'EM_NEGOCIACAO'].includes(c.status) &&
            !(c.codigo && (c.codigo.includes('/LEGADO') || c.codigo.startsWith('LEGADO')))
        );
        const recebidos = receber.filter(c => c.status === 'RECEBIDO');
        const vencidos = pendentes.filter(c => new Date(c.dataVencimento) < hoje);
        const emNegociacao = receber.filter(c => c.status === 'EM_NEGOCIACAO');

        const totalPendente = pendentes.reduce((s, c) => s + toNum(c.saldoDevedor || c.valorOriginal), 0);
        const totalVencido = vencidos.reduce((s, c) => s + toNum(c.saldoDevedor || c.valorOriginal), 0);
        const totalRecebido = recebidos.reduce((s, c) => s + toNum(c.valorRecebido || c.valorOriginal), 0);
        const totalEmNegociacao = emNegociacao.reduce((s, c) => s + toNum(c.saldoDevedor || c.valorOriginal), 0);

        // Índice de inadimplência
        const totalCarteira = totalPendente + totalRecebido;
        const indiceInadimplencia = totalCarteira > 0 ? Math.round((totalVencido / totalCarteira) * 10000) / 100 : 0;

        // Tempo médio de recebimento (dias)
        const recebidosComDatas = recebidos.filter(c => c.dataRecebimento);
        const tempoMedioRecebimento = recebidosComDatas.length > 0
            ? Math.round(recebidosComDatas.reduce((s, c) => {
                const emissao = new Date(c.dataEmissao);
                const receb = new Date(c.dataRecebimento!);
                return s + (receb.getTime() - emissao.getTime()) / (1000 * 60 * 60 * 24);
            }, 0) / recebidosComDatas.length)
            : 0;

        // Taxa de recuperação
        const negociacoes = await prisma.negociacaoDivida.findMany();
        const negQuitas = negociacoes.filter(n => n.status === 'QUITADO');
        const taxaRecuperacao = negociacoes.length > 0
            ? Math.round((negQuitas.length / negociacoes.length) * 10000) / 100
            : 0;

        // Vencendo esta semana
        const semana = new Date(hoje); semana.setDate(semana.getDate() + 7);
        const vencendoSemana = pendentes.filter(c => {
            const v = new Date(c.dataVencimento);
            return v >= hoje && v <= semana;
        }).length;

        // Aging por faixa
        const aging = { ate30: 0, de31a60: 0, de61a90: 0, mais90: 0 };
        vencidos.forEach(c => {
            const dias = Math.floor((hoje.getTime() - new Date(c.dataVencimento).getTime()) / (1000 * 60 * 60 * 24));
            const valor = toNum(c.saldoDevedor || c.valorOriginal);
            if (dias <= 30) aging.ate30 += valor;
            else if (dias <= 60) aging.de31a60 += valor;
            else if (dias <= 90) aging.de61a90 += valor;
            else aging.mais90 += valor;
        });

        res.json({
            totalPendente,
            totalVencido,
            totalRecebido,
            totalEmNegociacao,
            indiceInadimplencia,
            tempoMedioRecebimento,
            taxaRecuperacao,
            vencendoSemana,
            qtdPendentes: pendentes.length,
            qtdVencidos: vencidos.length,
            qtdEmNegociacao: emNegociacao.length,
            aging,
        });
    } catch (error) {
        console.error('Cobrança KPIs error:', error);
        res.status(500).json({ error: 'Falha ao buscar KPIs' });
    }
};

// ─── REGISTRAR COBRANÇA (LOG) ───────────────────────────────────
export const registrarCobranca = async (req: AuthRequest, res: Response) => {
    try {
        const { contaReceberId, tipo, mensagem, destinatario, promessaPagamento, dataPromessa, valorPromessa } = req.body;

        if (!contaReceberId || !tipo || !mensagem) {
            return res.status(400).json({ error: 'contaReceberId, tipo e mensagem são obrigatórios' });
        }

        const historico = await prisma.historicoCobranca.create({
            data: {
                contaReceberId,
                tipo,
                mensagem,
                destinatario,
                enviadoPor: (req as any).user?.nome || 'Sistema',
                promessaPagamento: promessaPagamento || false,
                dataPromessa: dataPromessa ? new Date(dataPromessa) : undefined,
                valorPromessa: valorPromessa ? toNum(valorPromessa) : undefined,
            }
        });

        // Atualizar contadores na conta
        await prisma.contaReceber.update({
            where: { id: contaReceberId },
            data: {
                ultimaCobranca: new Date(),
                totalCobrancas: { increment: 1 },
            }
        });

        res.status(201).json(historico);
    } catch (error: any) {
        console.error('Registrar cobrança error:', error);
        res.status(500).json({ error: 'Falha ao registrar cobrança', details: error.message });
    }
};

// ─── HISTÓRICO DE COBRANÇA POR CONTA ────────────────────────────
export const getHistoricoCobranca = async (req: AuthRequest, res: Response) => {
    try {
        const contaReceberId = req.params.contaReceberId as string;
        const historico = await prisma.historicoCobranca.findMany({
            where: { contaReceberId },
            orderBy: { enviadoEm: 'desc' }
        });
        res.json(historico);
    } catch (error) {
        console.error('Histórico cobrança error:', error);
        res.status(500).json({ error: 'Falha ao buscar histórico' });
    }
};

// ─── CRIAR NEGOCIAÇÃO DE DÍVIDA ─────────────────────────────────
export const criarNegociacao = async (req: AuthRequest, res: Response) => {
    try {
        const { contaReceberId, valorNegociado, qtdParcelas, jurosMensalNegociado, descontoAplicado, observacoes, assinaturaDigital } = req.body;

        const conta = await prisma.contaReceber.findUnique({ where: { id: contaReceberId } });
        if (!conta) return res.status(404).json({ error: 'Conta não encontrada' });

        const valorNeg = toNum(valorNegociado);
        const parcelas = Math.max(1, qtdParcelas || 1);
        const jurosMensal = toNum(jurosMensalNegociado);

        // Gerar parcelas
        const parcelasData: any[] = [];
        for (let i = 1; i <= parcelas; i++) {
            let valorParcela = Math.round((valorNeg / parcelas) * 100) / 100;
            // Aplicar juros no parcelamento se houver
            if (jurosMensal > 0) {
                valorParcela = Math.round(valorParcela * (1 + (jurosMensal / 100) * i) * 100) / 100;
            }
            const vencimento = new Date();
            vencimento.setMonth(vencimento.getMonth() + i);

            parcelasData.push({
                numero: i,
                valor: valorParcela,
                dataVencimento: vencimento,
                status: 'PENDENTE',
            });
        }

        const negociacao = await prisma.negociacaoDivida.create({
            data: {
                contaReceberId,
                valorOriginalDivida: toNum(conta.saldoDevedor || conta.valorOriginal),
                valorNegociado: valorNeg,
                descontoAplicado: toNum(descontoAplicado),
                qtdParcelas: parcelas,
                jurosMensalNegociado: jurosMensal,
                observacoes,
                assinaturaDigital,
                criadoPor: (req as any).user?.nome,
                parcelas: { create: parcelasData },
            },
            include: { parcelas: true },
        });

        // Atualizar status da conta
        await prisma.contaReceber.update({
            where: { id: contaReceberId },
            data: { status: 'EM_NEGOCIACAO' }
        });

        // Log da negociação
        await prisma.historicoCobranca.create({
            data: {
                contaReceberId,
                tipo: 'SISTEMA',
                mensagem: `Negociação criada: ${parcelas}x de R$ ${(valorNeg / parcelas).toFixed(2)} (Total: R$ ${valorNeg.toFixed(2)})`,
                enviadoPor: (req as any).user?.nome || 'Sistema',
            }
        });

        res.status(201).json(negociacao);
    } catch (error: any) {
        console.error('Criar negociação error:', error);
        res.status(500).json({ error: 'Falha ao criar negociação', details: error.message });
    }
};

// ─── LISTAR NEGOCIAÇÕES ─────────────────────────────────────────
export const listNegociacoes = async (req: AuthRequest, res: Response) => {
    try {
        const { status } = req.query;
        const where: any = {};
        if (status) where.status = status;

        const negociacoes = await prisma.negociacaoDivida.findMany({
            where,
            include: {
                contaReceber: {
                    include: { cliente: { select: { nome: true, telefone: true } } }
                },
                parcelas: { orderBy: { numero: 'asc' } },
            },
            orderBy: { criadoEm: 'desc' },
        });

        res.json(negociacoes);
    } catch (error) {
        console.error('List negociações error:', error);
        res.status(500).json({ error: 'Falha ao buscar negociações' });
    }
};

// ─── PAGAR PARCELA DE NEGOCIAÇÃO ────────────────────────────────
export const pagarParcelaNegociacao = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const { valorPago, formaPagamento } = req.body;

        const parcela = await prisma.parcelaNegociacao.update({
            where: { id },
            data: {
                status: 'PAGO',
                valorPago: toNum(valorPago) || undefined,
                dataPagamento: new Date(),
                formaPagamento,
            }
        });

        // Verificar se todas parcelas estão pagas
        const negociacao = await prisma.negociacaoDivida.findUnique({
            where: { id: parcela.negociacaoId },
            include: { parcelas: true }
        });

        if (negociacao) {
            const todasPagas = negociacao.parcelas.every(p => p.status === 'PAGO');
            if (todasPagas) {
                await prisma.negociacaoDivida.update({
                    where: { id: negociacao.id },
                    data: { status: 'QUITADO' }
                });
                // Quitar a conta original
                await prisma.contaReceber.update({
                    where: { id: negociacao.contaReceberId },
                    data: {
                        status: 'RECEBIDO',
                        saldoDevedor: 0,
                        dataRecebimento: new Date(),
                    }
                });
            }
        }

        res.json(parcela);
    } catch (error: any) {
        console.error('Pagar parcela error:', error);
        res.status(500).json({ error: 'Falha ao pagar parcela', details: error.message });
    }
};

// ─── VERIFICAR QUEBRA DE ACORDOS ────────────────────────────────
export const verificarQuebrasAcordo = async (req: AuthRequest, res: Response) => {
    try {
        const negociacoes = await prisma.negociacaoDivida.findMany({
            where: { status: 'EM_ANDAMENTO' },
            include: {
                parcelas: { orderBy: { dataVencimento: 'asc' } },
                contaReceber: { include: { cliente: { select: { nome: true } } } }
            }
        });

        const hoje = new Date();
        const quebras: any[] = [];

        for (const neg of negociacoes) {
            const parcelasVencidas = neg.parcelas.filter(p =>
                p.status === 'PENDENTE' && new Date(p.dataVencimento) < hoje
            );

            if (parcelasVencidas.length > 0) {
                // Marcar como QUEBRADO
                await prisma.negociacaoDivida.update({
                    where: { id: neg.id },
                    data: { status: 'QUEBRADO' }
                });

                // Marcar parcelas como vencidas
                for (const p of parcelasVencidas) {
                    await prisma.parcelaNegociacao.update({
                        where: { id: p.id },
                        data: { status: 'VENCIDO' }
                    });
                }

                // Voltar status da conta
                await prisma.contaReceber.update({
                    where: { id: neg.contaReceberId },
                    data: { status: 'VENCIDO' }
                });

                // Log
                await prisma.historicoCobranca.create({
                    data: {
                        contaReceberId: neg.contaReceberId,
                        tipo: 'SISTEMA',
                        mensagem: `⚠️ ACORDO QUEBRADO: ${parcelasVencidas.length} parcela(s) vencida(s) sem pagamento`,
                        enviadoPor: 'Sistema',
                    }
                });

                quebras.push({
                    negociacaoId: neg.id,
                    cliente: neg.contaReceber.cliente?.nome,
                    parcelasVencidas: parcelasVencidas.length,
                });
            }
        }

        res.json({ quebras: quebras.length, detalhes: quebras });
    } catch (error) {
        console.error('Verificar quebras error:', error);
        res.status(500).json({ error: 'Falha ao verificar quebras' });
    }
};
