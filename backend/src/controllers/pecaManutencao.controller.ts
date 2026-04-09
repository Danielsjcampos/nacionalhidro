import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// ─── T06: Peças utilizadas em Manutenção (com baixa de estoque) ──────────────

// GET /manutencao/:manutencaoId/pecas
export const listPecasManutencao = async (req: AuthRequest, res: Response) => {
    try {
        const manutencaoId = String(req.params.manutencaoId);
        const pecas = await (prisma as any).pecaManutencao.findMany({
            where: { manutencaoId },
            orderBy: { createdAt: 'asc' },
        });
        res.json(pecas);
    } catch (error) {
        console.error('List pecas manutencao error:', error);
        res.status(500).json({ error: 'Failed to fetch pecas' });
    }
};

// POST /manutencao/:manutencaoId/pecas
export const addPecaManutencao = async (req: AuthRequest, res: Response) => {
    try {
        const manutencaoId = String(req.params.manutencaoId);
        const { produtoId, descricao, quantidade, valorUnitario, unidade } = req.body;

        if (!produtoId || !quantidade || !valorUnitario) {
            return res.status(400).json({ error: 'produtoId, quantidade e valorUnitario são obrigatórios' });
        }

        const manutencao = await prisma.manutencao.findUnique({ where: { id: manutencaoId } });
        if (!manutencao) return res.status(404).json({ error: 'Manutenção não encontrada' });

        const qtd = Number(quantidade);
        const vlrUnit = Number(valorUnitario);
        const vlrTotal = qtd * vlrUnit;

        let nomePeca = descricao || '';
        try {
            const produto = await (prisma as any).produto.findUnique({
                where: { id: String(produtoId) },
                select: { nome: true }
            });
            if (produto && !descricao) nomePeca = produto.nome;
        } catch (_) { /* ignore */ }

        const peca = await (prisma as any).pecaManutencao.create({
            data: {
                manutencaoId,
                produtoId: String(produtoId),
                descricao: nomePeca || 'Peça sem descrição',
                quantidade: qtd,
                valorUnitario: vlrUnit,
                valorTotal: vlrTotal,
                unidade: String(unidade || 'UN'),
            },
        });

        // Baixar estoque da peça
        try {
            await (prisma as any).produto.update({
                where: { id: String(produtoId) },
                data: { estoqueAtual: { decrement: qtd } }
            });
        } catch (estoqueErr) {
            console.error('[T06] Erro ao baixar estoque de peça:', estoqueErr);
        }

        // Atualizar custoPecas total na manutenção
        try {
            const todasPecas = await (prisma as any).pecaManutencao.findMany({
                where: { manutencaoId }
            });
            const totalPecas = todasPecas.reduce((sum: number, p: any) => sum + Number(p.valorTotal), 0);
            await prisma.manutencao.update({
                where: { id: manutencaoId },
                data: {
                    custoPecas: totalPecas,
                    valorTotal: totalPecas + Number(manutencao.custoMaoObra || 0)
                }
            });
        } catch (updateErr) {
            console.error('[T06] Erro ao atualizar custoPecas:', updateErr);
        }

        res.status(201).json(peca);
    } catch (error: any) {
        console.error('Add peca manutencao error:', error);
        res.status(500).json({ error: 'Failed to add peca', details: error.message });
    }
};

// DELETE /manutencao/pecas/:id
export const removePecaManutencao = async (req: AuthRequest, res: Response) => {
    try {
        const id = String(req.params.id);
        const peca = await (prisma as any).pecaManutencao.findUnique({ where: { id } });
        if (!peca) return res.status(404).json({ error: 'Peça não encontrada' });

        try {
            await (prisma as any).produto.update({
                where: { id: String(peca.produtoId) },
                data: { estoqueAtual: { increment: Number(peca.quantidade) } }
            });
        } catch (_) { /* ignore */ }

        await (prisma as any).pecaManutencao.delete({ where: { id } });
        res.status(204).send();
    } catch (error: any) {
        console.error('Remove peca manutencao error:', error);
        res.status(500).json({ error: 'Failed to remove peca', details: error.message });
    }
};
