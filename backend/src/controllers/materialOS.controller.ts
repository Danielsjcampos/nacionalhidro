import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// ─── T05: Materiais utilizados em OS (com baixa de estoque) ──────────────────

// GET /os/:osId/materiais
export const listMateriaisOS = async (req: AuthRequest, res: Response) => {
    try {
        const osId = String(req.params.osId);
        const materiais = await (prisma as any).materialOS.findMany({
            where: { osId },
            orderBy: { createdAt: 'asc' },
        });
        res.json(materiais);
    } catch (error) {
        console.error('List materiais OS error:', error);
        res.status(500).json({ error: 'Failed to fetch materiais' });
    }
};

// POST /os/:osId/materiais
export const addMaterialOS = async (req: AuthRequest, res: Response) => {
    try {
        const osId = String(req.params.osId);
        const { produtoId, descricao, quantidade, unidade, darBaixaEstoque = true } = req.body;

        if (!produtoId || !quantidade) {
            return res.status(400).json({ error: 'produtoId e quantidade são obrigatórios' });
        }

        const os = await prisma.ordemServico.findUnique({ where: { id: osId } });
        if (!os) return res.status(404).json({ error: 'OS não encontrada' });

        let nomeProduto = descricao || '';
        try {
            const produto = await (prisma as any).produto.findUnique({
                where: { id: String(produtoId) },
                select: { nome: true }
            });
            if (produto && !descricao) nomeProduto = produto.nome;
        } catch (_) { /* ignore */ }

        const material = await (prisma as any).materialOS.create({
            data: {
                osId,
                produtoId: String(produtoId),
                descricao: nomeProduto || 'Material sem descrição',
                quantidade: Number(quantidade),
                unidade: String(unidade || 'UN'),
                darBaixaEstoque: Boolean(darBaixaEstoque),
            },
        });

        if (darBaixaEstoque) {
            try {
                await (prisma as any).produto.update({
                    where: { id: String(produtoId) },
                    data: { estoqueAtual: { decrement: Number(quantidade) } }
                });
            } catch (estoqueErr) {
                console.error('[T05] Erro ao baixar estoque:', estoqueErr);
            }
        }

        res.status(201).json(material);
    } catch (error: any) {
        console.error('Add material OS error:', error);
        res.status(500).json({ error: 'Failed to add material', details: error.message });
    }
};

// DELETE /os/materiais/:id
export const removeMaterialOS = async (req: AuthRequest, res: Response) => {
    try {
        const id = String(req.params.id);
        const material = await (prisma as any).materialOS.findUnique({ where: { id } });
        if (!material) return res.status(404).json({ error: 'Material não encontrado' });

        if (material.darBaixaEstoque) {
            try {
                await (prisma as any).produto.update({
                    where: { id: String(material.produtoId) },
                    data: { estoqueAtual: { increment: Number(material.quantidade) } }
                });
            } catch (_) { /* ignore */ }
        }

        await (prisma as any).materialOS.delete({ where: { id } });
        res.status(204).send();
    } catch (error: any) {
        console.error('Remove material OS error:', error);
        res.status(500).json({ error: 'Failed to remove material', details: error.message });
    }
};
