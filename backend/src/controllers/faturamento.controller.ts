import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { gerarPdfReciboLocacao } from '../services/legacyPdf.service';
import { sendEmail } from '../services/email.service';
import { focusNfeService } from '../services/focusNfe.service';
import { NfseCampinasService } from '../services/nfseCampinas.service';
import { extractFromPfx } from '../utils/pfxExtractor';
import axios from 'axios';

// ─── HELPER: Auto-criar Conta a Receber para um Faturamento ─────
async function autoCreateContaReceber(fat: any): Promise<void> {
    const vlLiquido = Number(fat.valorLiquido || fat.valorBruto || 0);
    if (vlLiquido <= 0 || !fat.clienteId) return;

    // Check if a ContaReceber already exists for this faturamento
    const existing = await (prisma as any).contaReceber.findFirst({
        where: { faturamentoId: fat.id },
    });
    if (existing) return;

    // Auto-classify: find planoContasId and contaBancariaId by company
    let planoContasId: string | undefined;
    let contaBancariaId: string | undefined;
    try {
        const cnpjStr = (fat.cnpjFaturamento || '').toLowerCase();
        const isLocacao = cnpjStr.includes('locação') || cnpjStr.includes('locacao');
        const codigoBusca = isLocacao ? '1.1.02' : '1.1.01';
        const planoConta = await (prisma as any).planoContas.findFirst({ where: { codigo: codigoBusca } });
        if (planoConta) planoContasId = planoConta.id;

        const empresaBusca = isLocacao ? 'LOCACAO' : 'HIDRO';
        const contaBancaria = await (prisma as any).contaBancaria.findFirst({
            where: { ativa: true, empresa: { in: [empresaBusca, 'AMBAS'] } },
            orderBy: { createdAt: 'asc' },
        });
        if (contaBancaria) contaBancariaId = contaBancaria.id;
    } catch (pcErr) {
        console.error('Auto planoContas/contaBancaria lookup error:', pcErr);
    }

    // Resolve client name
    let clienteNome = fat.cliente?.nome || 'Cliente';
    if (!fat.cliente?.nome && fat.clienteId) {
        try {
            const cli = await (prisma as any).cliente.findUnique({ where: { id: fat.clienteId }, select: { nome: true } });
            if (cli) clienteNome = cli.nome;
        } catch (_) { /* ignore */ }
    }

    await (prisma as any).contaReceber.create({
        data: {
            descricao: `Faturamento ${fat.tipo || 'NFS-e'} ${fat.numero ? '#' + fat.numero : ''} - ${clienteNome}`.trim(),
            clienteId: fat.clienteId,
            faturamentoId: fat.id,
            planoContasId: planoContasId || undefined,
            contaBancariaId: contaBancariaId || undefined,
            valorOriginal: vlLiquido,
            saldoDevedor: vlLiquido,
            dataVencimento: fat.dataVencimento || new Date(new Date().setDate(new Date().getDate() + 30)),
            status: 'PENDENTE',
            notaFiscal: fat.numero || undefined,
            observacoes: `Gerado automaticamente a partir do faturamento ${fat.id}`,
        },
    });
}

// ─── HELPER: Cancelar Conta a Receber vinculada a um Faturamento ──
async function cancelContaReceberByFaturamento(faturamentoId: string): Promise<void> {
    const cr = await (prisma as any).contaReceber.findFirst({
        where: { faturamentoId, status: { not: 'CANCELADO' } },
    });
    if (cr) {
        await (prisma as any).contaReceber.update({
            where: { id: cr.id },
            data: { status: 'CANCELADO', observacoes: `Cancelado automaticamente - faturamento ${faturamentoId} cancelado` },
        });
    }
}

// ─── HELPER: Deletar Contas a Receber vinculadas a um Faturamento ──
async function deleteContasReceberByFaturamento(faturamentoId: string): Promise<void> {
    // Delete related HistoricoCobranca and NegociacaoDivida first to avoid FK constraint issues
    const crs = await (prisma as any).contaReceber.findMany({ where: { faturamentoId } });
    for (const cr of crs) {
        await (prisma as any).historicoCobranca.deleteMany({ where: { contaReceberId: cr.id } });
        const negs = await (prisma as any).negociacaoDivida.findMany({ where: { contaReceberId: cr.id } });
        for (const neg of negs) {
            await (prisma as any).parcelaNegociacao.deleteMany({ where: { negociacaoId: neg.id } });
        }
        await (prisma as any).negociacaoDivida.deleteMany({ where: { contaReceberId: cr.id } });
    }
    await (prisma as any).contaReceber.deleteMany({ where: { faturamentoId } });
}

const CENTROS_CUSTO = [
    'EQUIPAMENTO_COMBINADO',
    'ALTO_VACUO_SUCCAO',
    'ALTA_PRESSAO_SAP',
    'HIDROJATO',
    'MAO_DE_OBRA_SERVICO',
    'OUTROS'
];

// ─── LIST FATURAMENTOS ──────────────────────────────────────────
export const listFaturamentos = async (req: AuthRequest, res: Response) => {
    try {
        const { clienteId, tipo, status, cnpjFaturamento, mes, ano } = req.query;
        const where: any = {};

        if (clienteId) where.clienteId = clienteId as string;
        if (tipo) where.tipo = tipo as string;
        if (status) where.status = status as string;
        if (cnpjFaturamento) where.cnpjFaturamento = cnpjFaturamento as string;

        if (mes && ano) {
            const m = Number(mes) - 1;
            const y = Number(ano);
            where.dataEmissao = {
                gte: new Date(y, m, 1),
                lt: new Date(y, m + 1, 1)
            };
        }

        const list = await (prisma as any).faturamento.findMany({
            where,
            include: { 
                cliente: { select: { id: true, nome: true, cnpj: true } },
                medicao: { select: { id: true, codigo: true } }
            },
            orderBy: { dataEmissao: 'desc' }
        });
        res.json(list);
    } catch (error) {
        console.error('List faturamentos error:', error);
        res.status(500).json({ error: 'Failed to fetch invoices' });
    }
};

// ─── GET FATURAMENTO ────────────────────────────────────────────
export const getFaturamento = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const fat = await (prisma as any).faturamento.findUnique({
            where: { id },
            include: { cliente: true }
        });
        if (!fat) return res.status(404).json({ error: 'Invoice not found' });
        res.json(fat);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch invoice' });
    }
};

// ─── HELPER: Check Teto Fiscal ──────────────────────────────────
async function checkTetoFiscal(cnpj: string, novoValor: number): Promise<{ excedido: boolean, mensagem?: string }> {
    if (!cnpj) return { excedido: false };
    const empresa = await (prisma as any).empresaCNPJ.findUnique({ where: { cnpj } });
    if (!empresa || !empresa.ativa) return { excedido: false };

    const now = new Date();
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
    const fimMes = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const faturamentoMes = await (prisma as any).faturamento.aggregate({
        _sum: { valorBruto: true },
        where: {
            cnpjFaturamento: cnpj,
            dataEmissao: { gte: inicioMes, lte: fimMes },
            status: { notIn: ['CANCELADA'] },
        },
    });

    const valorMensal = Number(faturamentoMes._sum.valorBruto || 0);
    const limite = Number(empresa.limiteMenusal || 500000);

    if (valorMensal + novoValor > limite) {
        const vlFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorMensal + novoValor);
        const lmFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(limite);
        return { excedido: true, mensagem: `O faturamento mensal do CNPJ ${cnpj} atingiria ${vlFormatado} (limite de ${lmFormatado}).` };
    }
    return { excedido: false };
}

// ─── CREATE FATURAMENTO ─────────────────────────────────────────
export const createFaturamento = async (req: AuthRequest, res: Response) => {
    try {
        const {
            dataEmissao, dataVencimento, dataPagamento,
            valorBruto, percentualINSS, valorINSS, valorISS, valorIR,
            valorCSLL, valorPIS, valorCOFINS, valorLiquido,
            ...rest
        } = req.body;

        const valBrutoNum = valorBruto ? Number(valorBruto) : 0;

        if (rest.cnpjFaturamento && !req.query.overrideTeto) {
            const check = await checkTetoFiscal(rest.cnpjFaturamento, valBrutoNum);
            if (check.excedido) {
                return res.status(403).json({ error: 'TETO_FISCAL_EXCEDIDO', message: check.mensagem });
            }
        }

        const fat = await (prisma as any).faturamento.create({
            data: {
                ...rest,
                dataEmissao: dataEmissao ? new Date(dataEmissao) : new Date(),
                dataVencimento: dataVencimento ? new Date(dataVencimento) : undefined,
                dataPagamento: dataPagamento ? new Date(dataPagamento) : undefined,
                valorBruto: valorBruto ? Number(valorBruto) : 0,
                percentualINSS: percentualINSS !== undefined ? Number(percentualINSS) : 3.5,
                valorINSS: valorINSS ? Number(valorINSS) : 0,
                valorISS: valorISS ? Number(valorISS) : 0,
                valorIR: valorIR ? Number(valorIR) : 0,
                valorCSLL: valorCSLL ? Number(valorCSLL) : 0,
                valorPIS: valorPIS ? Number(valorPIS) : 0,
                valorCOFINS: valorCOFINS ? Number(valorCOFINS) : 0,
                valorLiquido: valorLiquido ? Number(valorLiquido) : Number(valorBruto || 0),
            },
            include: { cliente: { select: { id: true, nome: true } } }
        });

        // ── Auto-criar Conta a Receber vinculada ao faturamento ──
        try {
            await autoCreateContaReceber(fat);
        } catch (crErr) {
            console.error('Auto-create ContaReceber for faturamento error:', crErr);
            // Non-blocking: faturamento was created successfully
        }

        res.status(201).json(fat);
    } catch (error: any) {
        console.error('Create faturamento error:', error);
        res.status(500).json({ error: 'Failed to create invoice', details: error.message });
    }
};

// ─── UPDATE FATURAMENTO ─────────────────────────────────────────
export const updateFaturamento = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const {
            dataEmissao, dataVencimento, dataPagamento, emailEnviadoEm,
            valorBruto, percentualINSS, valorINSS, valorISS, valorIR,
            valorCSLL, valorPIS, valorCOFINS, valorLiquido,
            ...rest
        } = req.body;

        const update: any = { ...rest };
        if (dataEmissao) update.dataEmissao = new Date(dataEmissao);
        if (dataVencimento) update.dataVencimento = new Date(dataVencimento);
        if (dataPagamento) update.dataPagamento = new Date(dataPagamento);
        if (emailEnviadoEm) update.emailEnviadoEm = new Date(emailEnviadoEm);
        if (valorBruto !== undefined) update.valorBruto = Number(valorBruto);
        if (percentualINSS !== undefined) update.percentualINSS = Number(percentualINSS);
        if (valorINSS !== undefined) update.valorINSS = Number(valorINSS);
        if (valorISS !== undefined) update.valorISS = Number(valorISS);
        if (valorIR !== undefined) update.valorIR = Number(valorIR);
        if (valorCSLL !== undefined) update.valorCSLL = Number(valorCSLL);
        if (valorPIS !== undefined) update.valorPIS = Number(valorPIS);
        if (valorCOFINS !== undefined) update.valorCOFINS = Number(valorCOFINS);
        if (valorLiquido !== undefined) update.valorLiquido = Number(valorLiquido);

        const fat = await (prisma as any).faturamento.update({
            where: { id },
            data: update,
            include: { cliente: { select: { id: true, nome: true } } }
        });

        // ── Sync Conta a Receber when faturamento values or status change ──
        try {
            if (rest.status === 'CANCELADA') {
                await cancelContaReceberByFaturamento(id);
            } else if (rest.status === 'PAGA') {
                const cr = await (prisma as any).contaReceber.findFirst({ where: { faturamentoId: id } });
                if (cr) {
                    await (prisma as any).contaReceber.update({
                        where: { id: cr.id },
                        data: {
                            status: 'RECEBIDO',
                            valorRecebido: Number(fat.valorLiquido || fat.valorBruto || 0),
                            dataRecebimento: fat.dataPagamento || new Date(),
                            saldoDevedor: 0,
                        },
                    });
                }
            } else if (valorLiquido !== undefined || dataVencimento) {
                // Sync value/date changes to linked ContaReceber
                const cr = await (prisma as any).contaReceber.findFirst({ where: { faturamentoId: id, status: { in: ['PENDENTE', 'VENCIDO'] } } });
                if (cr) {
                    const syncData: any = {};
                    if (valorLiquido !== undefined) {
                        syncData.valorOriginal = Number(valorLiquido);
                        syncData.saldoDevedor = Number(valorLiquido);
                    }
                    if (dataVencimento) syncData.dataVencimento = new Date(dataVencimento);
                    await (prisma as any).contaReceber.update({ where: { id: cr.id }, data: syncData });
                }
            }
        } catch (syncErr) {
            console.error('Sync ContaReceber on faturamento update error:', syncErr);
        }

        res.json(fat);
    } catch (error: any) {
        console.error('Update faturamento error:', error);
        res.status(500).json({ error: 'Failed to update invoice', details: error.message });
    }
};

// ─── DELETE FATURAMENTO ─────────────────────────────────────────
export const deleteFaturamento = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;

        // ── Delete linked Contas a Receber before deleting faturamento ──
        try {
            await deleteContasReceberByFaturamento(id);
        } catch (delCrErr) {
            console.error('Delete linked ContaReceber error:', delCrErr);
        }

        await (prisma as any).faturamento.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        console.error('Delete faturamento error:', error);
        res.status(500).json({ error: 'Failed to delete invoice' });
    }
};

// ─── GERAR FATURAMENTO (RL 90% + NFS-e 10%) ────────────────────
export const gerarFaturamentoRL = async (req: AuthRequest, res: Response) => {
    try {
        const { clienteId, medicaoId, osId, valorTotal, centroCusto, cnpjFaturamento, pedidoCompras, dataVencimento, percentualRL: pctRLRaw } = req.body;

        let finalValorTotal = Number(valorTotal) || 0;
        let finalClienteId = clienteId;
        let finalObservacoes = '';

        // 1. If medicaoId is provided, enrich billing with details
        if (medicaoId) {
            const medicao = await (prisma as any).medicao.findUnique({
                where: { id: medicaoId },
                include: { ordensServico: true }
            });
            if (medicao) {
                finalValorTotal = Number(medicao.valorTotal);
                finalClienteId = medicao.clienteId;
                
                // Construct detailed observation from subitens
                if (medicao.subitens && Array.isArray(medicao.subitens)) {
                    const details = (medicao.subitens as any[])
                        .map(s => `${s.descricao}: R$ ${Number(s.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
                        .join(' | ');
                    finalObservacoes = `Detalhamento Medição ${medicao.codigo}: ${details}`;
                } else {
                    finalObservacoes = `Ref. Medição ${medicao.codigo}`;
                }

                // Mark medicao as FINALIZADA
                await (prisma as any).medicao.update({
                    where: { id: medicaoId },
                    data: { status: 'FINALIZADA' }
                });

                // Update all linked OS to FATURADA
                const osIds = medicao.ordensServico.map((os: any) => os.id);
                if (osIds.length > 0) {
                    await (prisma as any).ordemServico.updateMany({
                        where: { id: { in: osIds } },
                        data: { status: 'FATURADA' }
                    });
                }
            }
        }

        const pctRL = Math.min(100, Math.max(50, Number(pctRLRaw) || 90));
        const pctNFSe = 100 - pctRL;
        const valorRL = finalValorTotal * pctRL / 100;
        const valorNFSe = finalValorTotal * pctNFSe / 100;
        const baseData = {
            clienteId: finalClienteId,
            medicaoId: medicaoId || undefined,
            osId: osId || undefined,
            centroCusto: centroCusto || undefined,
            cnpjFaturamento: cnpjFaturamento || undefined,
            pedidoCompras: pedidoCompras || undefined,
            dataVencimento: dataVencimento ? new Date(dataVencimento) : undefined,
            observacoes: finalObservacoes,
        };

        if (cnpjFaturamento && !req.query.overrideTeto) {
            const check = await checkTetoFiscal(cnpjFaturamento, finalValorTotal);
            if (check.excedido) {
                return res.status(403).json({ error: 'TETO_FISCAL_EXCEDIDO', message: check.mensagem });
            }
        }

        const rl = await (prisma as any).faturamento.create({
            data: {
                ...baseData,
                tipo: 'RL',
                valorBruto: valorRL,
                valorLiquido: valorRL,
                percentualINSS: 0,
            }
        });

        const nfse = await (prisma as any).faturamento.create({
            data: {
                ...baseData,
                tipo: 'NFSE',
                valorBruto: valorNFSe,
                percentualINSS: 3.5,
                valorINSS: valorNFSe * 0.035,
                valorLiquido: valorNFSe * (1 - 0.035),
            }
        });

        // Tenta emitir a NFS-e logo após a criação da fatura (via Focus NFe)
        (async () => {
            try {
                if (nfse && nfse.id) {
                    await focusNfeService.emitirNFSe(nfse.id);
                }
            } catch (srvErr) {
                console.error('Erro ao disparar emissão NFSe Focus automática:', srvErr);
            }
        })();

        // ── Auto-criar Contas a Receber para ambos RL e NFSe ──
        try {
            await autoCreateContaReceber(rl);
            await autoCreateContaReceber(nfse);
        } catch (crErr) {
            console.error('Auto-create ContaReceber for RL/NFSe error:', crErr);
        }

        res.status(201).json({ rl, nfse, totalBruto: finalValorTotal, split: `${pctRL}/${pctNFSe}` });
    } catch (error: any) {
        console.error('Gerar faturamento RL error:', error);
        res.status(500).json({ error: 'Failed to generate invoices', details: error.message });
    }
};

// ─── STATS / DASHBOARD ──────────────────────────────────────────
export const getFaturamentoStats = async (req: AuthRequest, res: Response) => {
    try {
        const all = await (prisma as any).faturamento.findMany({
            include: { cliente: { select: { nome: true } } }
        });

        const totalEmitidas = all.filter((f: any) => f.status === 'EMITIDA').length;
        const totalEnviadas = all.filter((f: any) => f.status === 'ENVIADA').length;
        const totalPagas = all.filter((f: any) => f.status === 'PAGA').length;
        const totalVencidas = all.filter((f: any) => f.status === 'VENCIDA').length;

        const valorTotalBruto = all.reduce((s: number, f: any) => s + Number(f.valorBruto || 0), 0);
        const valorTotalLiquido = all.reduce((s: number, f: any) => s + Number(f.valorLiquido || 0), 0);
        const valorPago = all.filter((f: any) => f.status === 'PAGA').reduce((s: number, f: any) => s + Number(f.valorLiquido || 0), 0);
        const valorAReceber = all.filter((f: any) => ['EMITIDA', 'ENVIADA'].includes(f.status)).reduce((s: number, f: any) => s + Number(f.valorLiquido || 0), 0);

        // Por centro de custo
        const porCentroCusto: Record<string, number> = {};
        all.forEach((f: any) => {
            const cc = f.centroCusto || 'OUTROS';
            porCentroCusto[cc] = (porCentroCusto[cc] || 0) + Number(f.valorBruto || 0);
        });

        // Por tipo
        const porTipo: Record<string, number> = {};
        all.forEach((f: any) => {
            porTipo[f.tipo] = (porTipo[f.tipo] || 0) + Number(f.valorBruto || 0);
        });

        res.json({
            totalEmitidas, totalEnviadas, totalPagas, totalVencidas,
            valorTotalBruto: Math.round(valorTotalBruto * 100) / 100,
            valorTotalLiquido: Math.round(valorTotalLiquido * 100) / 100,
            valorPago: Math.round(valorPago * 100) / 100,
            valorAReceber: Math.round(valorAReceber * 100) / 100,
            porCentroCusto,
            porTipo
        });
    } catch (error) {
        console.error('Faturamento stats error:', error);
        res.status(500).json({ error: 'Failed to get billing stats' });
    }
};

// ─── NFSE: EMITIR E CONSULTAR STATUS ────────────────────────────

export const emitirManual = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const fat = await (prisma as any).faturamento.findUnique({ where: { id } });
        if (!fat) return res.status(404).json({ error: 'Faturamento não encontrado' });

        let result;
        if (fat.tipo === 'NFSE') {
            const empresa = await (prisma as any).empresaCNPJ.findUnique({ where: { cnpj: fat.cnpjFaturamento } });
            if (!empresa) throw new Error('Empresa emissora não encontrada.');
            
            let privatePem = empresa.nfsePrivateKey;
            let certPem = empresa.nfseCertificate;

            if (!privatePem) {
                if (!empresa.nfseCertificate) throw new Error('Certificado NFSe não configurado para a empresa.');
                const certs = extractFromPfx(empresa.nfseCertificate, empresa.nfsePassphrase || '');
                privatePem = certs.privateKeyPem;
                certPem = certs.certificatePem;
            }

            const campinasSvc = new NfseCampinasService(
                (empresa.nfseAmbient as any) === 'PRODUCAO' ? 'PRODUCAO' : 'HOMOLOGACAO',
                privatePem,
                certPem
            );

            const resSoap = await campinasSvc.emitirRps(fat, empresa, fat.cliente);
            if (resSoap.erro && !resSoap.protocolo) {
                await (prisma as any).faturamento.update({
                    where: { id },
                    data: { focusStatus: 'FALHA', observacoes: `Erro Campinas: ${resSoap.erro.substring(0, 500)}` }
                });
                throw new Error(`Falha na emissão Campinas: ${resSoap.erro}`);
            }

            await (prisma as any).faturamento.update({
                where: { id },
                data: {
                    focusRef: resSoap.lote || resSoap.protocolo,
                    focusStatus: 'PROCESSANDO',
                    dadosWebHook: resSoap
                }
            });
            result = { success: true, ...resSoap };
        } else if (fat.tipo === 'CTE') {
            result = await focusNfeService.emitirCTE(id);
        } else if (fat.tipo === 'NFE') {
            result = await focusNfeService.emitirNFe(id);
        } else {
            return res.status(400).json({ error: 'Tipo de faturamento não suporta emissão fiscal automatizada.' });
        }

        res.json({ message: 'Envio efetuado', result });
    } catch (error: any) {
        console.error('Erro ao emitir fiscal manualmente:', error);
        res.status(500).json({ error: 'Falha ao emitir nota', details: error.message });
    }
};

export const consultarStatusManual = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const fat = await (prisma as any).faturamento.findUnique({ where: { id }, include: { cliente: true } });
        if (!fat) return res.status(404).json({ error: 'Faturamento não encontrado' });

        let result;
        if (fat.tipo === 'NFSE') {
            const empresa = await (prisma as any).empresaCNPJ.findUnique({ where: { cnpj: fat.cnpjFaturamento } });
            if (!empresa) throw new Error('Empresa não configurada.');

            let privatePem = empresa.nfsePrivateKey;
            let certPem = empresa.nfseCertificate;

            if (!privatePem) {
                if (!empresa.nfseCertificate) throw new Error('Certificado NFSe não configurado.');
                const certs = extractFromPfx(empresa.nfseCertificate, empresa.nfsePassphrase || '');
                privatePem = certs.privateKeyPem;
                certPem = certs.certificatePem;
            }

            const campinasSvc = new NfseCampinasService(
                (empresa.nfseAmbient as any) === 'PRODUCAO' ? 'PRODUCAO' : 'HOMOLOGACAO',
                privatePem, certPem
            );
            
            // Consultar Lote caso tenhamos o numero do lote no focusRef, ou rps
            result = await campinasSvc.consultarLoteRps(empresa, fat.focusRef || '');
            
            if (result.nfse || result.codVerificacao) {
                await (prisma as any).faturamento.update({
                    where: { id },
                    data: {
                        numero: result.nfse,
                        nfseCodVerificacao: result.codVerificacao,
                        status: 'EMITIDA',
                        focusStatus: 'AUTORIZADO',
                        dadosWebHook: result
                    }
                });
            } else if (result.erro) {
                await (prisma as any).faturamento.update({
                    where: { id },
                    data: { focusStatus: 'FALHA', observacoes: `Erro Campinas: ${result.erro.substring(0, 500)}` }
                });
            }
        } else {
            result = await focusNfeService.consultarStatus(id);
        }
        
        if (!result) return res.status(400).json({ error: 'Faturamento sem referência para consulta.' });

        res.json(result);
    } catch (error: any) {
        console.error('Erro ao consultar status:', error);
        res.status(500).json({ error: 'Falha ao consultar status', details: error.message });
    }
};

export const cancelarManual = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const { justificativa } = req.body;
        
        const fat = await (prisma as any).faturamento.findUnique({ where: { id } });
        if (!fat) return res.status(404).json({ error: 'Faturamento não encontrado' });

        let result;
        if (fat.tipo === 'NFSE') {
            const empresa = await (prisma as any).empresaCNPJ.findUnique({ where: { cnpj: fat.cnpjFaturamento } });
            if (!empresa) throw new Error('Empresa não configurada.');
            if (!fat.numero) throw new Error('Faturamento não possui número de nota emitido para cancelar.');

            let privatePem = empresa.nfsePrivateKey;
            let certPem = empresa.nfseCertificate;

            if (!privatePem) {
                if (!empresa.nfseCertificate) throw new Error('Certificado NFSe não configurado.');
                const certs = extractFromPfx(empresa.nfseCertificate, empresa.nfsePassphrase || '');
                privatePem = certs.privateKeyPem;
                certPem = certs.certificatePem;
            }

            const campinasSvc = new NfseCampinasService(
                (empresa.nfseAmbient as any) === 'PRODUCAO' ? 'PRODUCAO' : 'HOMOLOGACAO',
                privatePem, certPem
            );
            
            result = await campinasSvc.cancelarNfse(empresa, fat.numero, '2'); // 2 = erro emissao (geral)
            if (!result.erro) {
                 await (prisma as any).faturamento.update({
                    where: { id },
                    data: { status: 'CANCELADA', focusStatus: 'CANCELADO' }
                });
            } else {
                throw new Error(result.erro);
            }
        } else {
            result = await focusNfeService.cancelar(id, justificativa || 'Cancelamento solicitado pelo cliente');
        }
        
        res.json({ message: 'Solicitação de cancelamento enviada', result });
    } catch (error: any) {
        console.error('Erro ao cancelar nota:', error);
        res.status(500).json({ error: 'Falha ao cancelar nota', details: error.message });
    }
};

export const emitirCartaCorrecao = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const { correcao } = req.body;
        
        if (!correcao) return res.status(400).json({ error: 'Texto da correção é obrigatório' });

        const result = await focusNfeService.corrigir(id, correcao);
        res.json({ message: 'Carta de Correção enviada', result });
    } catch (error: any) {
        console.error('Erro ao emitir CC-e:', error);
        res.status(500).json({ error: 'Falha ao emitir CC-e', details: error.message });
    }
};

// ─── ENVIAR FATURAMENTO AO CLIENTE (Email / PDF) ────────────────
export const enviarFaturamentoAoCliente = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const fat = await (prisma as any).faturamento.findUnique({
            where: { id },
            include: { cliente: true, medicao: { include: { ordensServico: { include: { servicos: true, itensCobranca: true } } } } }
        });
        if (!fat) return res.status(404).json({ error: 'Faturamento não encontrado' });
        if (!fat.cliente?.email) return res.status(400).json({ error: 'Cliente sem email registrado' });

        const empresa = await (prisma as any).empresaCNPJ.findUnique({ where: { cnpj: fat.cnpjFaturamento } }) || await (prisma as any).configuracao.findFirst() || {};
        const config = await (prisma as any).configuracao.findFirst() || {};

        let nfseLink = '';
        const attachments: any[] = [];
        
        if (fat.tipo === 'RL') {
             const pdfBuffer = await gerarPdfReciboLocacao(fat, fat.cliente, config);
             const filename = `Recibo_Locacao_${fat.numero || fat.id.substring(0,6)}.pdf`;
             attachments.push({ filename, content: pdfBuffer, contentType: 'application/pdf' });
        } else if (fat.tipo === 'NFSE' && fat.numero && fat.nfseCodVerificacao) {
             // Link oficial prefeitura Campinas
             const inscricao = empresa.inscricaoMunicipal?.replace(/\D/g, '') || '';
             nfseLink = `https://nfse.campinas.sp.gov.br/nfse/visualizarNota.do?nota=${fat.numero}&inscricao=${inscricao}&codVerificacao=${fat.nfseCodVerificacao}`;
        }

        // Anexar PDF da nota se disponível via URL (Focus NFe)
        if (fat.urlArquivoNota) {
            try {
                const response = await axios.get(fat.urlArquivoNota, { responseType: 'arraybuffer' });
                const ext = fat.urlArquivoNota.split('.').pop() || 'pdf';
                attachments.push({ 
                    filename: `${fat.tipo}_${fat.numero || fat.id.substring(0,6)}.${ext}`, 
                    content: Buffer.from(response.data), 
                    contentType: ext === 'html' ? 'text/html' : 'application/pdf' 
                });
            } catch (err) {
                console.warn(`[Email] Falha ao baixar PDF da nota: ${fat.urlArquivoNota}`);
            }
        }

        // Anexar XML se disponível
        if (fat.urlArquivoXml) {
            try {
                const response = await axios.get(fat.urlArquivoXml, { responseType: 'arraybuffer' });
                attachments.push({ 
                    filename: `${fat.tipo}_${fat.numero || fat.id.substring(0,6)}.xml`, 
                    content: Buffer.from(response.data), 
                    contentType: 'application/xml' 
                });
            } catch (err) {
                console.warn(`[Email] Falha ao baixar XML da nota: ${fat.urlArquivoXml}`);
            }
        }

        if (attachments.length === 0 && !nfseLink) {
             return res.status(400).json({ error: 'Documento fiscal ainda não emitido ou arquivo indisponível.' });
        }

        const htmlText = `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">Faturamento Nacional Hidro</h2>
            <p>Prezado(a) <strong>${fat.cliente.razaoSocial || fat.cliente.nome}</strong>,</p>
            <p>Anexamos a esta mensagem os documentos referentes ao seu faturamento.</p>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Nº Documento:</strong> ${fat.numero || fat.id.substring(0,8)}</p>
                <p style="margin: 5px 0;"><strong>Valor:</strong> R$ ${Number(fat.valorLiquido).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                ${fat.dataVencimento ? `<p style="margin: 5px 0;"><strong>Vencimento:</strong> ${new Date(fat.dataVencimento).toLocaleDateString('pt-BR')}</p>` : ''}
            </div>

            ${nfseLink ? `
            <p style="text-align: center; margin: 30px 0;">
                <a href="${nfseLink}" style="background-color: #3498db; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Visualizar Nota Fiscal (Prefeitura)</a>
            </p>` : ''}

            <p style="font-size: 0.9em; color: #7f8c8d; font-style: italic; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">
                Este é um e-mail automático. Em caso de dúvidas, permanemos à disposição no e-mail <strong>financeiro@nacionalhidro.com.br</strong>.
            </p>
            <p>Atenciosamente,<br><strong>Equipe Financeira - Nacional Hidro</strong></p>
        </div>`;

        const resp = await sendEmail({
            to: fat.cliente.email,
            cc: ['financeiro@nacionalhidro.com.br'],
            subject: `Faturamento Nacional Hidro - ${fat.tipo} ${fat.numero || fat.id.substring(0,8)}`,
            html: htmlText,
            attachments
        });

        if (resp.success) {
             await (prisma as any).faturamento.update({ where: { id }, data: { status: 'ENVIADA', emailEnviadoEm: new Date() } });
             if (fat.medicaoId) {
                 await (prisma as any).cobrancaEmail.create({
                     data: {
                         medicaoId: fat.medicaoId,
                         destinatario: fat.cliente.email || '',
                         assunto: `Faturamento ${fat.tipo} ${fat.numero || ''} Enviado`,
                         corpo: `PDF enviado por email em ${new Date().toISOString()}`,
                         statusEnvio: 'ENVIADO'
                     }
                 });
             }

             // --- LOG UNIFICADO: Histórico de Cobrança ---
             try {
                 const contaReceber = await (prisma as any).contaReceber.findFirst({
                     where: { faturamentoId: id }
                 });
                 
                 if (contaReceber) {
                     await (prisma as any).historicoCobranca.create({
                         data: {
                             contaReceberId: contaReceber.id,
                             tipo: 'EMAIL',
                             canal: 'EMAIL',
                             mensagem: `Faturamento ${fat.tipo} #${fat.numero || fat.id.substring(0,8)} enviado automaticamente ao cliente.`,
                             destinatario: fat.cliente.email,
                             enviadoPor: 'Sistema (Faturamento)',
                             sucesso: true
                         }
                     });
                 }
             } catch (logErr) {
                 console.error('[Email] Falha ao registrar HistoricoCobranca:', logErr);
             }

             return res.json({ message: 'E-mail enviado com sucesso' });
        } else {
             throw new Error('Falha no disparo de e-mail');
        }
    } catch (e: any) {
        console.error('Falha enviar faturamento:', e);
        res.status(500).json({ error: 'Falha enviar', details: e.message });
    }
};
