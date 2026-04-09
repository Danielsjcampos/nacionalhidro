import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// ─── LIST FÉRIAS ────────────────────────────────────────────────

export const listFerias = async (req: AuthRequest, res: Response) => {
    try {
        const { status, funcionarioId, search } = req.query;
        const where: any = {};
        if (status) where.status = status as string;
        if (funcionarioId) where.funcionarioId = funcionarioId as string;
        if (search) {
            where.funcionario = {
                nome: { contains: search as string, mode: 'insensitive' },
            };
        }

        const ferias = await (prisma as any).controleFerias.findMany({
            where,
            include: {
                funcionario: {
                    select: { id: true, nome: true, cargo: true, departamento: true, dataAdmissao: true },
                },
            },
            orderBy: { dataVencimento: 'asc' },
        });

        res.json(ferias);
    } catch (error) {
        console.error('List férias error:', error);
        res.status(500).json({ error: 'Failed to fetch férias' });
    }
};

// ─── GET FÉRIAS ─────────────────────────────────────────────────

export const getFerias = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const ferias = await (prisma as any).controleFerias.findUnique({
            where: { id },
            include: { funcionario: true },
        });

        if (!ferias) {
            return res.status(404).json({ error: 'Registro de férias não encontrado' });
        }

        res.json(ferias);
    } catch (error) {
        console.error('Get férias error:', error);
        res.status(500).json({ error: 'Failed to fetch férias' });
    }
};

// ─── CREATE FÉRIAS ──────────────────────────────────────────────

export const createFerias = async (req: AuthRequest, res: Response) => {
    try {
        const { dataInicio, dataFim, dataVencimento, dataEnvioContabilidade, ...rest } = req.body;

        if (!rest.funcionarioId) {
            return res.status(400).json({ error: 'Funcionário é obrigatório' });
        }

        const ferias = await (prisma as any).controleFerias.create({
            data: {
                ...rest,
                diasDireito: rest.diasDireito ? parseInt(rest.diasDireito) : 30,
                diasGozados: rest.diasGozados ? parseInt(rest.diasGozados) : 0,
                diasVendidos: rest.diasVendidos ? parseInt(rest.diasVendidos) : 0,
                dataInicio: dataInicio ? new Date(dataInicio) : undefined,
                dataFim: dataFim ? new Date(dataFim) : undefined,
                dataVencimento: dataVencimento ? new Date(dataVencimento) : undefined,
                dataEnvioContabilidade: dataEnvioContabilidade ? new Date(dataEnvioContabilidade) : undefined,
            },
            include: { funcionario: { select: { id: true, nome: true, cargo: true } } },
        });

        res.status(201).json(ferias);
    } catch (error: any) {
        console.error('Create férias error:', error);
        res.status(500).json({ error: 'Failed to create férias', details: error.message });
    }
};

// ─── UPDATE FÉRIAS ──────────────────────────────────────────────

export const updateFerias = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const { dataInicio, dataFim, dataVencimento, dataEnvioContabilidade, ...rest } = req.body;

        const ferias = await (prisma as any).controleFerias.update({
            where: { id },
            data: {
                ...rest,
                diasDireito: rest.diasDireito ? parseInt(rest.diasDireito) : undefined,
                diasGozados: rest.diasGozados ? parseInt(rest.diasGozados) : undefined,
                diasVendidos: rest.diasVendidos ? parseInt(rest.diasVendidos) : undefined,
                dataInicio: dataInicio ? new Date(dataInicio) : undefined,
                dataFim: dataFim ? new Date(dataFim) : undefined,
                dataVencimento: dataVencimento ? new Date(dataVencimento) : undefined,
                dataEnvioContabilidade: dataEnvioContabilidade ? new Date(dataEnvioContabilidade) : undefined,
            },
            include: { funcionario: { select: { id: true, nome: true, cargo: true } } },
        });

        res.json(ferias);
    } catch (error: any) {
        console.error('Update férias error:', error);
        res.status(500).json({ error: 'Failed to update férias', details: error.message });
    }
};

// ─── DELETE FÉRIAS ──────────────────────────────────────────────

export const deleteFerias = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        await (prisma as any).controleFerias.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        console.error('Delete férias error:', error);
        res.status(500).json({ error: 'Failed to delete férias' });
    }
};

// ─── RESUMO / STATS ─────────────────────────────────────────────

export const getResumoFerias = async (req: AuthRequest, res: Response) => {
    try {
        const porStatus = await (prisma as any).controleFerias.groupBy({
            by: ['status'],
            _count: true,
        });

        const counts: Record<string, number> = {};
        porStatus.forEach((g: any) => { counts[g.status] = g._count; });

        // Férias vencendo nos próximos 60 dias
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(now.getDate() + 60);

        const vencendoEmBreve = await (prisma as any).controleFerias.findMany({
            where: {
                status: 'A_VENCER',
                dataVencimento: { gte: now, lte: futureDate },
            },
            include: {
                funcionario: { select: { id: true, nome: true, cargo: true, departamento: true } },
            },
            orderBy: { dataVencimento: 'asc' },
        });

        const emFeriasAtual = await (prisma as any).controleFerias.findMany({
            where: {
                status: 'EM_FERIAS',
                dataInicio: { lte: now },
                dataFim: { gte: now },
            },
            include: {
                funcionario: { select: { id: true, nome: true, cargo: true } },
            },
        });

        res.json({
            counts,
            total: Object.values(counts).reduce((a: number, b: number) => a + b, 0),
            vencendoEmBreve,
            emFeriasAtual,
        });
    } catch (error) {
        console.error('Resumo férias error:', error);
        res.status(500).json({ error: 'Failed to fetch resumo férias' });
    }
};
