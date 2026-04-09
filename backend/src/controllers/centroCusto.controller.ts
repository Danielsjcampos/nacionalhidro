import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// ─── CENTRO DE CUSTO ────────────────────────────────────────────
export const listCentrosCusto = async (req: AuthRequest, res: Response) => {
    try {
        const list = await (prisma as any).centroCusto.findMany({
            where: { ativo: true },
            orderBy: { nome: 'asc' },
            include: {
                lancamentos: {
                    orderBy: { data: 'desc' },
                    take: 5,
                    select: { id: true, descricao: true, valor: true, data: true, tipo: true, categoria: true }
                }
            }
        });

        // Add totals
        const withTotals = await Promise.all(list.map(async (cc: any) => {
            const allLancamentos = await (prisma as any).lancamentoCusto.findMany({
                where: { centroCustoId: cc.id }
            });
            const totalGasto = allLancamentos
                .filter((l: any) => l.tipo === 'DESPESA')
                .reduce((s: number, l: any) => s + Number(l.valor), 0);
            const totalReceita = allLancamentos
                .filter((l: any) => l.tipo === 'RECEITA')
                .reduce((s: number, l: any) => s + Number(l.valor), 0);
            return {
                ...cc,
                totalGasto: Math.round(totalGasto * 100) / 100,
                totalReceita: Math.round(totalReceita * 100) / 100,
                saldo: Math.round((totalReceita - totalGasto) * 100) / 100,
                percentualOrcamento: cc.orcamentoMensal ? Math.round((totalGasto / Number(cc.orcamentoMensal)) * 100) : null,
            };
        }));

        res.json(withTotals);
    } catch (error) {
        console.error('List centros custo error:', error);
        res.status(500).json({ error: 'Failed to fetch cost centers' });
    }
};

export const createCentroCusto = async (req: AuthRequest, res: Response) => {
    try {
        const cc = await (prisma as any).centroCusto.create({
            data: {
                ...req.body,
                orcamentoMensal: req.body.orcamentoMensal ? Number(req.body.orcamentoMensal) : undefined,
            }
        });
        res.status(201).json(cc);
    } catch (error: any) {
        console.error('Create centro custo error:', error);
        res.status(500).json({ error: 'Failed to create cost center', details: error.message });
    }
};

export const createLancamento = async (req: AuthRequest, res: Response) => {
    try {
        const l = await (prisma as any).lancamentoCusto.create({
            data: {
                ...req.body,
                valor: Number(req.body.valor),
                data: req.body.data ? new Date(req.body.data) : new Date(),
            }
        });
        res.status(201).json(l);
    } catch (error: any) {
        console.error('Create lancamento error:', error);
        res.status(500).json({ error: 'Failed to create entry', details: error.message });
    }
};

export const deleteCentroCusto = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        await (prisma as any).centroCusto.delete({ where: { id } });
        res.status(204).send();
    } catch (error: any) {
        console.error('Delete centro custo error:', error);
        res.status(500).json({ error: 'Failed to delete cost center', details: error.message });
    }
};
