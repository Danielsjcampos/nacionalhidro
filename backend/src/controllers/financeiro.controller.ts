import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const listTransacoes = async (req: AuthRequest, res: Response) => {
  try {
    const list = await prisma.transacaoFinanceira.findMany({
      orderBy: { data: 'desc' }
    });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

export const createTransacao = async (req: AuthRequest, res: Response) => {
  try {
    const { descricao, valor, tipo, categoria, status, data } = req.body;
    
    const transacao = await prisma.transacaoFinanceira.create({
      data: {
        descricao,
        valor,
        tipo,
        categoria,
        status,
        data: data ? new Date(data) : new Date()
      }
    });

    res.status(201).json(transacao);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create transaction' });
  }
};
