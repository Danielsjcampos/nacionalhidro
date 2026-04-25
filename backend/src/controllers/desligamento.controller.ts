import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import {
    sendDESL01_Juridico,
    sendDESL02_Contabilidade,
    sendDESL03_RescisaoPagamento,
    sendGEST01_ASODemissional,
    sendGEST03_DesligamentoLogistica,
    sendGEST04_EspelhoPonto,
    sendGEST05_ExclusaoSeguro,
    sendGEST08_DescontoRescisao,
} from '../services/email.service';

const ETAPAS_DESLIGAMENTO = [
    // Trilha Principal
    'NOVA_SOLICITACAO', 'APURACAO_RESCISAO', 'ENVIADO_CONTABILIDADE',
    'ENVIADO_SIN', 'ASSINATURA_DOCUMENTOS', 'CONCLUIDO',
    // Trilha Jurídica
    'RECEBIMENTO_NOTIFICACAO', 'PRE_ANALISE_JURIDICA', 'PROVIDENCIANDO_DOCUMENTACAO',
    'AUDIENCIA_AGENDADA', 'PROCESSO_ANDAMENTO', 'PROCESSO_ACORDO',
    'LANCADO_SIN_JURIDICO', 'PROCESSO_ENCERRADO',
] as const;

// ─── LIST ───────────────────────────────────────────────────────

export const listDesligamentos = async (req: AuthRequest, res: Response) => {
    try {
        const { etapa, search } = req.query;
        const where: any = {};
        if (etapa) where.etapa = etapa as string;
        if (search) {
            where.OR = [
                { nome: { contains: search as string, mode: 'insensitive' } },
                { cpf: { contains: search as string, mode: 'insensitive' } },
            ];
        }

        const list = await (prisma as any).desligamento.findMany({
            where,
            include: { funcionario: { select: { id: true, nome: true, cargo: true, departamento: true } } },
            orderBy: { createdAt: 'desc' },
        });
        res.json(list);
    } catch (error) {
        console.error('List desligamentos error:', error);
        res.status(500).json({ error: 'Failed to fetch desligamentos' });
    }
};

// ─── GET ────────────────────────────────────────────────────────

export const getDesligamento = async (req: AuthRequest, res: Response) => {
    try {
        const d = await (prisma as any).desligamento.findUnique({
            where: { id: req.params.id },
            include: { funcionario: true },
        });
        if (!d) return res.status(404).json({ error: 'Desligamento não encontrado' });
        res.json(d);
    } catch (error) {
        console.error('Get desligamento error:', error);
        res.status(500).json({ error: 'Failed to fetch desligamento' });
    }
};

// ─── CREATE ─────────────────────────────────────────────────────

export const createDesligamento = async (req: AuthRequest, res: Response) => {
    try {
        const {
            dataDesligamento, dataAvisoPrevio, dataExameDemissional,
            dataLimitePagamentoRescisao, dataAdmissao,
            dataEnvioContabilidade, dataRetornoContabilidade,
            dataVencimentoRescisao, dataVencimentoFGTS,
            dataAssinatura, dataExpurgo, dataAudiencia, dataPericia,
            dataRecepcaoNotificacao, dataEnvioJuridico,
            dataUltimaParcelaAcordo, dataUltimaParcelaEncargos,
            ...rest
        } = req.body;

        if (!rest.funcionarioId) {
            return res.status(400).json({ error: 'Funcionário é obrigatório' });
        }

        const func = await prisma.funcionario.findUnique({ where: { id: rest.funcionarioId } });
        if (!func) return res.status(404).json({ error: 'Funcionário não encontrado' });

        const parseDate = (d: any) => d ? new Date(d) : undefined;

        const d = await (prisma as any).desligamento.create({
            data: {
                ...rest,
                nome: rest.nome || func.nome,
                cargo: rest.cargo || func.cargo,
                cpf: rest.cpf || func.cpf,
                celular: rest.celular || func.telefone,
                email: rest.email || func.email,
                contaBancaria: rest.contaBancaria || (func.banco ? `${func.banco} / Ag ${func.agencia} / CC ${func.conta}` : undefined),
                pix: rest.pix || func.chavePix,
                dataAdmissao: parseDate(dataAdmissao) || func.dataAdmissao,
                dataDesligamento: parseDate(dataDesligamento),
                dataAvisoPrevio: parseDate(dataAvisoPrevio),
                dataExameDemissional: parseDate(dataExameDemissional),
                dataLimitePagamentoRescisao: parseDate(dataLimitePagamentoRescisao),
                dataEnvioContabilidade: parseDate(dataEnvioContabilidade),
                dataRetornoContabilidade: parseDate(dataRetornoContabilidade),
                dataVencimentoRescisao: parseDate(dataVencimentoRescisao),
                dataVencimentoFGTS: parseDate(dataVencimentoFGTS),
                dataAssinatura: parseDate(dataAssinatura),
                dataExpurgo: parseDate(dataExpurgo),
                dataAudiencia: parseDate(dataAudiencia),
                dataPericia: parseDate(dataPericia),
                dataRecepcaoNotificacao: parseDate(dataRecepcaoNotificacao),
                dataEnvioJuridico: parseDate(dataEnvioJuridico),
                dataUltimaParcelaAcordo: parseDate(dataUltimaParcelaAcordo),
                dataUltimaParcelaEncargos: parseDate(dataUltimaParcelaEncargos),
            },
            include: { funcionario: true },
        });

        res.status(201).json(d);
    } catch (error: any) {
        console.error('Create desligamento error:', error);
        res.status(500).json({ error: 'Failed to create desligamento', details: error.message });
    }
};

// ─── MOVER ETAPA ────────────────────────────────────────────────

export const moverEtapaDesligamento = async (req: AuthRequest, res: Response) => {
    try {
        const { etapa, observacoes } = req.body;
        if (!ETAPAS_DESLIGAMENTO.includes(etapa)) {
            return res.status(400).json({ error: `Etapa inválida: ${etapa}` });
        }

        // Fetch current data for email context
        const deslAtual = await (prisma as any).desligamento.findUnique({
            where: { id: req.params.id },
            include: { funcionario: true },
        });
        if (!deslAtual) {
            return res.status(404).json({ error: 'Desligamento não encontrado' });
        }

        const data: any = { etapa };
        if (observacoes) data.observacoes = observacoes;

        // When reaching CONCLUIDO or PROCESSO_ENCERRADO, update employee status & cancel férias
        if (etapa === 'CONCLUIDO' || etapa === 'PROCESSO_ENCERRADO') {
            if (deslAtual?.funcionarioId) {
                await prisma.funcionario.update({
                    where: { id: deslAtual.funcionarioId },
                    data: {
                        ativo: false,
                        status: 'DESLIGADO',
                        dataDesligamento: deslAtual.dataDesligamento || new Date(),
                    },
                });

                // Cancel active férias for this employee
                try {
                    await (prisma as any).controleFerias.updateMany({
                        where: {
                            funcionarioId: deslAtual.funcionarioId,
                            status: { notIn: ['GOZADA', 'DESLIGADO', 'CANCELADA'] },
                        },
                        data: { status: 'DESLIGADO' },
                    });
                    console.log(`[Lifecycle] Férias canceladas para funcionário ${deslAtual.funcionarioId}`);
                } catch (e) {
                    console.error('[Lifecycle] Failed to cancel férias:', e);
                }
            }
        }

        const d = await (prisma as any).desligamento.update({
            where: { id: req.params.id },
            data,
            include: { funcionario: true },
        });

        // ═══════════════════════════════════════════════════════════
        // 📧 AUTOMAÇÕES PIPEFY — E-MAILS POR ETAPA (fire-and-forget)
        // ═══════════════════════════════════════════════════════════
        if (etapa !== deslAtual.etapa) {
            try {
                // ─── AVISO_PREVIO: DESL-01 (Notificação Jurídico) ──
                if (etapa === 'AVISO_PREVIO') {
                    console.log(`[Pipefy Email] AVISO_PREVIO → DESL-01 para ${deslAtual.nome}`);
                    await sendDESL01_Juridico(deslAtual);
                }

                // ─── EXAME_DEMISSIONAL: GEST-01 (ASO Demissional e PPP) ──
                if (etapa === 'EXAME_DEMISSIONAL') {
                    console.log(`[Pipefy Email] EXAME_DEMISSIONAL → GEST-01 para ${deslAtual.nome}`);
                    await sendGEST01_ASODemissional(deslAtual);
                }

                // ─── DOCUMENTACAO: GEST-03 + GEST-05 + GEST-08 ──
                if (etapa === 'DOCUMENTACAO') {
                    console.log(`[Pipefy Email] DOCUMENTACAO → GEST-03, GEST-05, GEST-08 para ${deslAtual.nome}`);
                    await sendGEST03_DesligamentoLogistica(deslAtual);
                    await sendGEST05_ExclusaoSeguro(deslAtual);
                    await sendGEST08_DescontoRescisao(deslAtual);
                }

                // ─── RESCISAO: DESL-02 (Contabilidade) + GEST-04 (Espelho Ponto) ──
                if (etapa === 'RESCISAO') {
                    console.log(`[Pipefy Email] RESCISAO → DESL-02, GEST-04 para ${deslAtual.nome}`);
                    await sendDESL02_Contabilidade(deslAtual);
                    await sendGEST04_EspelhoPonto(deslAtual);
                }

                // ─── HOMOLOGACAO: DESL-03 (Rescisão para Pagamento) ──
                if (etapa === 'HOMOLOGACAO') {
                    console.log(`[Pipefy Email] HOMOLOGACAO → DESL-03 para ${deslAtual.nome}`);
                    await sendDESL03_RescisaoPagamento(deslAtual);
                }
            } catch (e) {
                console.error('[Pipefy Email Automation - Desligamento] Failed:', e);
            }
        }

        res.json(d);
    } catch (error: any) {
        console.error('Mover etapa desligamento error:', error);
        res.status(500).json({ error: 'Failed to move desligamento', details: error.message });
    }
};

// ─── UPDATE ─────────────────────────────────────────────────────

export const updateDesligamento = async (req: AuthRequest, res: Response) => {
    try {
        const {
            dataDesligamento, dataAvisoPrevio, dataExameDemissional,
            dataLimitePagamentoRescisao, dataAdmissao,
            dataEnvioContabilidade, dataRetornoContabilidade,
            dataVencimentoRescisao, dataVencimentoFGTS,
            dataAssinatura, dataExpurgo, dataAudiencia, dataPericia,
            dataRecepcaoNotificacao, dataEnvioJuridico,
            dataUltimaParcelaAcordo, dataUltimaParcelaEncargos,
            // Módulo 8 gaps
            prazoEnvioDocumentacao, dataEnvioDocumentos,
            dataPericia2, dataUltimaParcelaAcordo2,
            dataUltimaParcelasEncargos, dataUltimaParcelaPagamento,
            valorEncargos2, valorRescisao, valorAcordo, valorCustasJudiciais,
            valorDesconto, valorEncargos,
            funcionario: _func,
            id: _id, createdAt: _c, updatedAt: _u,
            ...rest
        } = req.body;

        const parseDate = (d: any) => d ? new Date(d) : undefined;
        const parseDecimal = (v: any) => v !== undefined && v !== null ? parseFloat(v) : undefined;

        const d = await (prisma as any).desligamento.update({
            where: { id: req.params.id },
            data: {
                ...rest,
                dataDesligamento: parseDate(dataDesligamento),
                dataAvisoPrevio: parseDate(dataAvisoPrevio),
                dataExameDemissional: parseDate(dataExameDemissional),
                dataLimitePagamentoRescisao: parseDate(dataLimitePagamentoRescisao),
                dataAdmissao: parseDate(dataAdmissao),
                dataEnvioContabilidade: parseDate(dataEnvioContabilidade),
                dataRetornoContabilidade: parseDate(dataRetornoContabilidade),
                dataVencimentoRescisao: parseDate(dataVencimentoRescisao),
                dataVencimentoFGTS: parseDate(dataVencimentoFGTS),
                dataAssinatura: parseDate(dataAssinatura),
                dataExpurgo: parseDate(dataExpurgo),
                dataAudiencia: parseDate(dataAudiencia),
                dataPericia: parseDate(dataPericia),
                dataRecepcaoNotificacao: parseDate(dataRecepcaoNotificacao),
                dataEnvioJuridico: parseDate(dataEnvioJuridico),
                dataUltimaParcelaAcordo: parseDate(dataUltimaParcelaAcordo),
                dataUltimaParcelaEncargos: parseDate(dataUltimaParcelaEncargos),
                // Módulo 8 gaps
                prazoEnvioDocumentacao: parseDate(prazoEnvioDocumentacao),
                dataEnvioDocumentos: parseDate(dataEnvioDocumentos),
                dataPericia2: parseDate(dataPericia2),
                dataUltimaParcelaAcordo2: parseDate(dataUltimaParcelaAcordo2),
                dataUltimaParcelasEncargos: parseDate(dataUltimaParcelasEncargos),
                dataUltimaParcelaPagamento: parseDate(dataUltimaParcelaPagamento),
                valorRescisao: parseDecimal(valorRescisao),
                valorAcordo: parseDecimal(valorAcordo),
                valorCustasJudiciais: parseDecimal(valorCustasJudiciais),
                valorDesconto: parseDecimal(valorDesconto),
                valorEncargos: parseDecimal(valorEncargos),
                valorEncargos2: parseDecimal(valorEncargos2),
            },
            include: { funcionario: true },
        });
        res.json(d);
    } catch (error: any) {
        console.error('Update desligamento error:', error);
        res.status(500).json({ error: 'Failed to update desligamento', details: error.message });
    }
};

// ─── DELETE ─────────────────────────────────────────────────────

export const deleteDesligamento = async (req: AuthRequest, res: Response) => {
    try {
        await (prisma as any).desligamento.delete({ where: { id: req.params.id } });
        res.status(204).send();
    } catch (error) {
        console.error('Delete desligamento error:', error);
        res.status(500).json({ error: 'Failed to delete desligamento' });
    }
};

// ─── STATS ──────────────────────────────────────────────────────

export const getDesligamentoStats = async (req: AuthRequest, res: Response) => {
    try {
        const total = await (prisma as any).desligamento.count();
        const porEtapa = await (prisma as any).desligamento.groupBy({ by: ['etapa'], _count: true });
        const counts: Record<string, number> = {};
        porEtapa.forEach((g: any) => { counts[g.etapa] = g._count; });
        const emAndamento = total - (counts['CONCLUIDO'] || 0);
        res.json({ total, emAndamento, counts });
    } catch (error) {
        console.error('Desligamento stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
};
