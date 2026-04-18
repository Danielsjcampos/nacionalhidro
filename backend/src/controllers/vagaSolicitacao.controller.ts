import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const listSolicitacoes = async (req: AuthRequest, res: Response) => {
    try {
        const { status, solicitanteId } = req.query;
        const where: any = {};
        if (status) where.status = status as string;
        if (solicitanteId) where.solicitanteId = solicitanteId as string;

        const solicitacoes = await (prisma as any).vagaSolicitacao.findMany({
            where,
            include: { vaga: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(solicitacoes);
    } catch (error) {
        console.error('List solicitacoes error:', error);
        res.status(500).json({ error: 'Failed to fetch solicitacoes' });
    }
};

export const createSolicitacao = async (req: AuthRequest, res: Response) => {
    try {
        const data = req.body;
        const solicitacao = await (prisma as any).vagaSolicitacao.create({
            data: {
                ...data,
                status: 'PENDENTE'
            }
        });
        res.status(201).json(solicitacao);
    } catch (error: any) {
        console.error('Create solicitacao error:', error);
        res.status(500).json({ error: 'Failed to create solicitacao', details: error.message });
    }
};

export const updateSolicitacao = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const data = req.body;

        const solicitacao = await (prisma as any).vagaSolicitacao.update({
            where: { id },
            data
        });

        // ─── Lógica de Aprovação ────────────────
        if (data.status === 'APROVADA') {
            const existingVaga = await (prisma as any).vaga.findUnique({
                where: { solicitacaoId: id }
            });

            if (!existingVaga) {
                // Criar a vaga automaticamente no recrutamento
                await (prisma as any).vaga.create({
                    data: {
                        solicitacaoId: id,
                        cargo: solicitacao.cargo,
                        departamento: solicitacao.departamento,
                        solicitanteNome: solicitacao.solicitanteNome,
                        quantidade: solicitacao.quantidade,
                        prioridade: solicitacao.prioridade,
                        requisitos: solicitacao.requisitos,
                        descricao: solicitacao.motivo,
                        status: 'ABERTA'
                    }
                });
            }
        }

        res.json(solicitacao);
    } catch (error: any) {
        console.error('Update solicitacao error:', error);
        res.status(500).json({ error: 'Failed to update solicitacao', details: error.message });
    }
};

export const deleteSolicitacao = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        await (prisma as any).vagaSolicitacao.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        console.error('Delete solicitacao error:', error);
        res.status(500).json({ error: 'Failed to delete solicitacao' });
    }
};
