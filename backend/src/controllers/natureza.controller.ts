import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const listNaturezas = async (_req: Request, res: Response) => {
  try {
    const items = await prisma.naturezaContabil.findMany({ orderBy: { descricao: 'asc' } });
    res.json(items);
  } catch (e) { res.status(500).json({ error: 'Erro ao listar naturezas' }); }
};

export const createNatureza = async (req: Request, res: Response) => {
  try {
    const { descricao, inativo } = req.body;
    const item = await prisma.naturezaContabil.create({ data: { descricao: (descricao || '').toUpperCase(), inativo: !!inativo } });
    res.status(201).json(item);
  } catch (e) { res.status(500).json({ error: 'Erro ao criar natureza' }); }
};

export const updateNatureza = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { descricao, inativo } = req.body;
    const item = await prisma.naturezaContabil.update({
      where: { id: req.params.id as string },
      data: { ...(descricao !== undefined && { descricao: descricao.toUpperCase() }), ...(inativo !== undefined && { inativo }) },
    });
    res.json(item);
  } catch (e) { res.status(500).json({ error: 'Erro ao atualizar natureza' }); }
};

export const deleteNatureza = async (req: Request, res: Response) => {
  try {
    await prisma.naturezaContabil.delete({ where: { id: req.params.id as string } });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Erro ao excluir natureza' }); }
};
