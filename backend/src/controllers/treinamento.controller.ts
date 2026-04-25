import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// ─── TREINAMENTO ───────────────────────────────────────────────────────
export const listTreinamentos = async (req: AuthRequest, res: Response) => {
    try {
        const list = await prisma.treinamento.findMany({ orderBy: { nome: 'asc' } });
        res.json(list);
    } catch (error) {
        console.error('List Treinamentos error:', error);
        res.status(500).json({ error: 'Failed to fetch Treinamentos' });
    }
};

export const createTreinamento = async (req: AuthRequest, res: Response) => {
    try {
        // req.body tem nome, descricao, validadeMeses, obrigatorio
        const tr = await prisma.treinamento.create({ data: req.body });
        res.status(201).json(tr);
    } catch (error: any) {
        console.error('Create Treinamento error:', error);
        res.status(500).json({ error: 'Failed to create Treinamento', details: error.message });
    }
};

export const updateTreinamento = async (req: AuthRequest, res: Response) => {
    try {
        const tr = await prisma.treinamento.update({ where: { id: req.params.id as string }, data: req.body });
        res.json(tr);

    } catch (error: any) {
        console.error('Update Treinamento error:', error);
        res.status(500).json({ error: 'Failed to update Treinamento', details: error.message });
    }
};

export const deleteTreinamento = async (req: AuthRequest, res: Response) => {
    try {
        await prisma.treinamento.delete({ where: { id: req.params.id as string } });
        res.status(204).send();

    } catch (error: any) {
        console.error('Delete Treinamento error:', error);
        res.status(500).json({ error: 'Failed to delete Treinamento', details: error.message });
    }
};

// ─── TREINAMENTO REALIZADO ───────────────────────────────────────────────
export const listTreinamentosRealizados = async (req: AuthRequest, res: Response) => {
    try {
        const { funcionarioId } = req.query;
        const where = funcionarioId ? { funcionarioId: funcionarioId as string } : {};
        const list = await prisma.treinamentoRealizado.findMany({
            where,
            include: { treinamento: true, funcionario: { select: { nome: true } } },
            orderBy: { dataVencimento: 'asc' } // os que vencem antes aparecem primeiro
        });
        res.json(list);
    } catch (error) {
        console.error('List Treinamentos realizados error:', error);
        res.status(500).json({ error: 'Failed to fetch realized Treinamentos' });
    }
};

export const createTreinamentoRealizado = async (req: AuthRequest, res: Response) => {
    try {
        const dataRealizacao = new Date(req.body.dataRealizacao);
        let dataVencimento = req.body.dataVencimento ? new Date(req.body.dataVencimento) : null;
        
        // Se Vencimento não foi setado manualmente, calculamos pelos meses de validade
        if (!dataVencimento) {
            const tr = await prisma.treinamento.findUnique({ where: { id: req.body.treinamentoId } });
            if (tr?.validadeMeses) {
                dataVencimento = new Date(dataRealizacao);
                dataVencimento.setMonth(dataVencimento.getMonth() + tr.validadeMeses);
            }
        }

        const data = {
            funcionarioId: req.body.funcionarioId,
            treinamentoId: req.body.treinamentoId,
            dataRealizacao,
            dataVencimento,
            certificadoUrl: req.body.certificadoUrl || null,
            observacoes: req.body.observacoes || null
        };
        const rel = await prisma.treinamentoRealizado.create({ data });
        res.status(201).json(rel);
    } catch (error: any) {
        console.error('Create Treinamento realizado error:', error);
        res.status(500).json({ error: 'Failed to realize Treinamento', details: error.message });
    }
};

export const updateTreinamentoRealizado = async (req: AuthRequest, res: Response) => {
    try {
        const { dataRealizacao, dataVencimento, certificadoUrl, observacoes } = req.body;

        const data: any = {};
        if (dataRealizacao !== undefined) data.dataRealizacao = new Date(dataRealizacao);
        if (dataVencimento !== undefined) data.dataVencimento = dataVencimento ? new Date(dataVencimento) : null;
        if (certificadoUrl !== undefined) data.certificadoUrl = certificadoUrl || null;
        if (observacoes !== undefined) data.observacoes = observacoes || null;

        const rel = await prisma.treinamentoRealizado.update({
            where: { id: req.params.id as string },
            data,
            include: { treinamento: true, funcionario: { select: { nome: true } } },
        });
        res.json(rel);
    } catch (error: any) {
        console.error('Update Treinamento realizado error:', error);
        res.status(500).json({ error: 'Failed to update realized Treinamento', details: error.message });
    }
};

export const deleteTreinamentoRealizado = async (req: AuthRequest, res: Response) => {
    try {
        await prisma.treinamentoRealizado.delete({ where: { id: req.params.id as string } });
        res.status(204).send();

    } catch (error: any) {
        console.error('Delete Treinamento realizado error:', error);
        res.status(500).json({ error: 'Failed to delete realized Treinamento', details: error.message });
    }
};
