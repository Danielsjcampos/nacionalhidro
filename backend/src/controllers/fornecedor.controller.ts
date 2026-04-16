import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// ─── LIST ───────────────────────────────────────────────────────
export const listFornecedores = async (req: AuthRequest, res: Response) => {
    try {
        const { search } = req.query;
        const where: any = {};
        if (search) {
            where.OR = [
                { nome: { contains: search as string, mode: 'insensitive' } },
                { documento: { contains: search as string, mode: 'insensitive' } },
            ];
        }
        const list = await prisma.fornecedor.findMany({ where, orderBy: { nome: 'asc' } });
        res.json(list);
    } catch (error) {
        console.error('List fornecedores error:', error);
        res.status(500).json({ error: 'Failed to fetch suppliers' });
    }
};

// ─── GET ────────────────────────────────────────────────────────
export const getFornecedor = async (req: AuthRequest, res: Response) => {
    try {
        const f = await prisma.fornecedor.findUnique({
            where: { id: req.params.id as string },
            include: { contasPagar: { orderBy: { dataVencimento: 'desc' }, take: 20 } }
        });
        if (!f) return res.status(404).json({ error: 'Not found' });
        res.json(f);
    } catch (error) {
        console.error('Get fornecedor error:', error);
        res.status(500).json({ error: 'Failed to fetch supplier' });
    }
};

// ─── CREATE ─────────────────────────────────────────────────────
export const createFornecedor = async (req: AuthRequest, res: Response) => {
    try {
        const f = await prisma.fornecedor.create({ data: req.body });
        res.status(201).json(f);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Já existe um fornecedor com este Nome ou Documento.' });
        }
        console.error('Create fornecedor error:', error);
        res.status(500).json({ error: 'Failed to create supplier', details: error.message });
    }
};

// ─── UPDATE ─────────────────────────────────────────────────────
export const updateFornecedor = async (req: AuthRequest, res: Response) => {
    try {
        const f = await prisma.fornecedor.update({ where: { id: req.params.id as string }, data: req.body });
        res.json(f);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Já existe um fornecedor com este Nome ou Documento.' });
        }
        console.error('Update fornecedor error:', error);
        res.status(500).json({ error: 'Failed to update supplier', details: error.message });
    }
};

// ─── DELETE ─────────────────────────────────────────────────────
export const deleteFornecedor = async (req: AuthRequest, res: Response) => {
    try {
        await prisma.fornecedor.delete({ where: { id: req.params.id as string } });
        res.status(204).send();
    } catch (error: any) {
        console.error('Delete fornecedor error:', error);
        res.status(500).json({ error: 'Failed to delete supplier', details: error.message });
    }
};
