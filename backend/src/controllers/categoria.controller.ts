import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const listCategorias = async (req: AuthRequest, res: Response) => {
  try {
    const categorias = await prisma.categoriaEquipe.findMany({
      include: {
        _count: {
          select: { users: true }
        }
      },
      orderBy: { nome: 'asc' }
    });
    res.json(categorias);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

export const createCategoria = async (req: AuthRequest, res: Response) => {
  try {
    const data = req.body;
    const categoria = await prisma.categoriaEquipe.create({ data });
    res.status(201).json(categoria);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create category' });
  }
};

export const updateCategoria = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const data = req.body;
    const categoria = await prisma.categoriaEquipe.update({
      where: { id },
      data
    });
    res.json(categoria);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update category' });
  }
};

export const deleteCategoria = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.categoriaEquipe.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
};
