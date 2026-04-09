import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// ─── LIST LOGS (com filtros) ────────────────────────────────────
export const listLogs = async (req: AuthRequest, res: Response) => {
    try {
        const { entidade, entidadeId, acao, search, limit = '50', offset = '0' } = req.query;
        const where: any = {};

        if (entidade) where.entidade = entidade as string;
        if (entidadeId) where.entidadeId = entidadeId as string;
        if (acao) where.acao = acao as string;
        if (search) {
            where.OR = [
                { descricao: { contains: search as string, mode: 'insensitive' as any } },
                { usuarioNome: { contains: search as string, mode: 'insensitive' as any } },
                { entidadeId: { contains: search as string, mode: 'insensitive' as any } },
            ];
        }

        const [logs, total] = await Promise.all([
            (prisma as any).logAlteracao.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: parseInt(limit as string),
                skip: parseInt(offset as string),
            }),
            (prisma as any).logAlteracao.count({ where }),
        ]);

        res.json({ logs, total });
    } catch (error) {
        console.error('List logs error:', error);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
};

// ─── GET LOGS FOR ENTITY ────────────────────────────────────────
export const getEntityLogs = async (req: AuthRequest, res: Response) => {
    try {
        const { entidade, id } = req.params;

        const logs = await (prisma as any).logAlteracao.findMany({
            where: {
                entidade: (entidade as string).toUpperCase(),
                entidadeId: id,
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });

        res.json(logs);
    } catch (error) {
        console.error('Get entity logs error:', error);
        res.status(500).json({ error: 'Failed to fetch entity logs' });
    }
};

// ─── GET STATS ──────────────────────────────────────────────────
export const getLogStats = async (req: AuthRequest, res: Response) => {
    try {
        const total = await (prisma as any).logAlteracao.count();
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const hoje_count = await (prisma as any).logAlteracao.count({
            where: { createdAt: { gte: hoje } }
        });

        // Count by entity
        const byEntidade = await (prisma as any).logAlteracao.groupBy({
            by: ['entidade'],
            _count: true,
        });

        // Count by action
        const byAcao = await (prisma as any).logAlteracao.groupBy({
            by: ['acao'],
            _count: true,
        });

        res.json({
            total,
            hoje: hoje_count,
            porEntidade: byEntidade.reduce((acc: any, g: any) => {
                acc[g.entidade] = g._count;
                return acc;
            }, {}),
            porAcao: byAcao.reduce((acc: any, g: any) => {
                acc[g.acao] = g._count;
                return acc;
            }, {}),
        });
    } catch (error) {
        console.error('Get log stats error:', error);
        res.status(500).json({ error: 'Failed to fetch log stats' });
    }
};
