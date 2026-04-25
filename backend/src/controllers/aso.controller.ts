import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendGEST02_AtualizacaoASO } from '../services/email.service';

const ASO_TIPOS = ['ADMISSIONAL', 'PERIODICO', 'DEMISSIONAL', 'RETORNO_TRABALHO', 'MUDANCA_FUNCAO'];
const ASO_RESULTADOS = ['APTO', 'INAPTO'];

// ─── LIST ────────────────────────────────────────────────────────
export const listASOs = async (req: AuthRequest, res: Response) => {
    try {
        const { funcionarioId, tipo, vencimento } = req.query;
        const where: any = {};

        if (funcionarioId) where.funcionarioId = funcionarioId as string;
        if (tipo && ASO_TIPOS.includes(tipo as string)) where.tipo = tipo as string;

        // Filter by vencimento status
        const now = new Date();
        if (vencimento === 'VENCIDO') {
            where.dataVencimento = { lt: now };
        } else if (vencimento === 'VENCENDO') {
            const em30dias = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            where.dataVencimento = { gte: now, lte: em30dias };
        } else if (vencimento === 'OK') {
            const em30dias = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            where.dataVencimento = { gt: em30dias };
        }

        const list = await (prisma as any).aSOControle.findMany({
            where,
            include: {
                funcionario: { select: { id: true, nome: true, cpf: true, cargo: true } },
            },
            orderBy: { dataVencimento: 'asc' },
        });

        const enriched = list.map((a: any) => ({
            ...a,
            diasRestantes: a.dataVencimento
                ? Math.ceil((new Date(a.dataVencimento).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                : null,
        }));

        res.json(enriched);
    } catch (error) {
        console.error('List ASOs error:', error);
        res.status(500).json({ error: 'Failed to fetch ASOs' });
    }
};

// ─── CREATE ──────────────────────────────────────────────────────
export const createASO = async (req: AuthRequest, res: Response) => {
    try {
        const { funcionarioId, tipo, clinica, dataExame, dataVencimento, resultado, observacoes } = req.body;

        if (!funcionarioId) {
            return res.status(400).json({ error: 'funcionarioId é obrigatório' });
        }
        if (!tipo || !ASO_TIPOS.includes(tipo)) {
            return res.status(400).json({ error: `tipo inválido. Aceitos: ${ASO_TIPOS.join(', ')}` });
        }
        if (resultado && !ASO_RESULTADOS.includes(resultado)) {
            return res.status(400).json({ error: `resultado inválido. Aceitos: ${ASO_RESULTADOS.join(', ')}` });
        }

        const data: any = {
            funcionarioId,
            tipo,
            clinica: clinica || null,
            dataExame: dataExame ? new Date(dataExame) : null,
            dataVencimento: dataVencimento ? new Date(dataVencimento) : null,
            resultado: resultado || null,
            observacoes: observacoes || null,
        };

        const aso = await (prisma as any).aSOControle.create({ data });
        res.status(201).json(aso);
    } catch (error: any) {
        console.error('Create ASO error:', error);
        res.status(500).json({ error: 'Failed to create ASO', details: error.message });
    }
};

// ─── UPDATE ──────────────────────────────────────────────────────
export const updateASO = async (req: AuthRequest, res: Response) => {
    try {
        const { tipo, clinica, dataExame, dataVencimento, resultado, observacoes } = req.body;

        if (tipo && !ASO_TIPOS.includes(tipo)) {
            return res.status(400).json({ error: `tipo inválido. Aceitos: ${ASO_TIPOS.join(', ')}` });
        }
        if (resultado && !ASO_RESULTADOS.includes(resultado)) {
            return res.status(400).json({ error: `resultado inválido. Aceitos: ${ASO_RESULTADOS.join(', ')}` });
        }

        const data: any = {};
        if (tipo !== undefined) data.tipo = tipo;
        if (clinica !== undefined) data.clinica = clinica || null;
        if (dataExame !== undefined) data.dataExame = dataExame ? new Date(dataExame) : null;
        if (dataVencimento !== undefined) data.dataVencimento = dataVencimento ? new Date(dataVencimento) : null;
        if (resultado !== undefined) data.resultado = resultado || null;
        if (observacoes !== undefined) data.observacoes = observacoes || null;

        const aso = await (prisma as any).aSOControle.update({
            where: { id: req.params.id as string },
            data,
            include: { funcionario: { select: { nome: true, cargo: true } } },
        });

        // GAP 1: Disparar email GEST-02 quando dataVencimento é atualizado
        if (dataVencimento !== undefined && aso.funcionario) {
            sendGEST02_AtualizacaoASO({
                nomeColaborador: aso.funcionario.nome,
                dataVencimentoASO: aso.dataVencimento,
            }).catch(e => console.error('[ASO] Erro ao enviar GEST-02:', e));
        }

        res.json(aso);
    } catch (error: any) {
        console.error('Update ASO error:', error);
        res.status(500).json({ error: 'Failed to update ASO', details: error.message });
    }
};

// ─── DELETE ──────────────────────────────────────────────────────
export const deleteASO = async (req: AuthRequest, res: Response) => {
    try {
        await (prisma as any).aSOControle.delete({ where: { id: req.params.id as string } });
        res.status(204).send();
    } catch (error: any) {
        console.error('Delete ASO error:', error);
        res.status(500).json({ error: 'Failed to delete ASO', details: error.message });
    }
};
