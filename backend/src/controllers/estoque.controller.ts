import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const listProdutos = async (req: AuthRequest, res: Response) => {
  try {
    const list = await prisma.produto.findMany({
      orderBy: { nome: 'asc' }
    });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

export const updateEstoque = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { quantidade, tipo, motivo } = req.body; // tipo: ENTRADA ou SAIDA
    
    const mov = await prisma.$transaction(async (tx) => {
      const produto = await tx.produto.findUnique({ where: { id } });
      if (!produto) throw new Error('Product not found');

      const novaQtd = tipo === 'ENTRADA' 
        ? produto.estoqueAtual + quantidade 
        : produto.estoqueAtual - quantidade;

      await tx.produto.update({
        where: { id },
        data: { estoqueAtual: novaQtd }
      });

      return tx.movimentacaoEstoque.create({
        data: {
          produtoId: id,
          quantidade,
          tipo,
          motivo
        }
      });
    });

    res.json(mov);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update stock' });
  }
};
