import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// ─── EPI ───────────────────────────────────────────────────────
export const listEPIs = async (req: AuthRequest, res: Response) => {
    try {
        const list = await prisma.ePI.findMany({ orderBy: { nome: 'asc' } });
        res.json(list);
    } catch (error) {
        console.error('List EPIs error:', error);
        res.status(500).json({ error: 'Failed to fetch EPIs' });
    }
};

export const createEPI = async (req: AuthRequest, res: Response) => {
    try {
        const epi = await prisma.ePI.create({ data: req.body });
        res.status(201).json(epi);
    } catch (error: any) {
        console.error('Create EPI error:', error);
        res.status(500).json({ error: 'Failed to create EPI', details: error.message });
    }
};

export const updateEPI = async (req: AuthRequest, res: Response) => {
    try {
        const epi = await prisma.ePI.update({ where: { id: req.params.id as string }, data: req.body });
        res.json(epi);

    } catch (error: any) {
        console.error('Update EPI error:', error);
        res.status(500).json({ error: 'Failed to update EPI', details: error.message });
    }
};

export const deleteEPI = async (req: AuthRequest, res: Response) => {
    try {
        await prisma.ePI.delete({ where: { id: req.params.id as string } });
        res.status(204).send();

    } catch (error: any) {
        console.error('Delete EPI error:', error);
        res.status(500).json({ error: 'Failed to delete EPI', details: error.message });
    }
};

// ─── EPI ENTREGUE ───────────────────────────────────────────────
export const listEPIsEntregues = async (req: AuthRequest, res: Response) => {
    try {
        const { funcionarioId } = req.query;
        const where = funcionarioId ? { funcionarioId: funcionarioId as string } : {};
        const list = await prisma.ePIEntregue.findMany({
            where,
            include: { epi: true, funcionario: { select: { nome: true } } },
            orderBy: { dataEntrega: 'desc' }
        });
        res.json(list);
    } catch (error) {
        console.error('List EPIs entregues error:', error);
        res.status(500).json({ error: 'Failed to fetch delivered EPIs' });
    }
};

export const createEPIEntregue = async (req: AuthRequest, res: Response) => {
    try {
        const { funcionarioId } = req.body;

        // Compliance Lock: check ASO
        const latestAso = await prisma.aSOControle.findFirst({
            where: { funcionarioId },
            orderBy: { dataVencimento: 'desc' }
        });

        const now = new Date();
        if (!latestAso) {
            return res.status(403).json({ error: 'BLOQUEIO DE COMPLIANCE: Funcionário sem registro de ASO.' });
        }
        if (latestAso.dataVencimento && new Date(latestAso.dataVencimento) < now) {
            return res.status(403).json({ error: `BLOQUEIO DE COMPLIANCE: ASO Vencido em ${new Date(latestAso.dataVencimento).toLocaleDateString('pt-BR')}` });
        }

        const data = { ...req.body, dataEntrega: new Date(req.body.dataEntrega) };
        const epi = await prisma.ePIEntregue.create({ data });
        res.status(201).json(epi);
    } catch (error: any) {
        console.error('Create EPI entregue error:', error);
        res.status(500).json({ error: 'Failed to deliver EPI', details: error.message });
    }
};

export const devolverEPI = async (req: AuthRequest, res: Response) => {
    try {
        const dataDevolucao = req.body.dataDevolucao ? new Date(req.body.dataDevolucao) : new Date();
        const epi = await prisma.ePIEntregue.update({
            where: { id: req.params.id as string },
            data: { devolvido: true, dataDevolucao }
        });

        res.json(epi);
    } catch (error: any) {
        console.error('Return EPI error:', error);
        res.status(500).json({ error: 'Failed to return EPI', details: error.message });
    }
};

export const deleteEPIEntregue = async (req: AuthRequest, res: Response) => {
    try {
        await prisma.ePIEntregue.delete({ where: { id: req.params.id as string } });
        res.status(204).send();

    } catch (error: any) {
        console.error('Delete EPI entregue error:', error);
        res.status(500).json({ error: 'Failed to delete delivered EPI', details: error.message });
    }
};
