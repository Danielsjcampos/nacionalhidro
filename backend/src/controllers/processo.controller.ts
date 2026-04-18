import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const listProcessos = async (req: AuthRequest, res: Response) => {
  try {
    const { funcionarioId, status } = req.query;
    const where: any = {};
    if (funcionarioId) where.funcionarioId = funcionarioId as string;
    if (status) where.status = status as string;

    const processos = await prisma.processoTrabalhista.findMany({
      where,
      include: {
        funcionario: { select: { id: true, nome: true, cargo: true } }
      },
      orderBy: { dataAbertura: 'desc' }
    });
    res.json(processos);
  } catch (error) {
    console.error('Error listing processos:', error);
    res.status(500).json({ error: 'Erro ao buscar processos trabalhistas' });
  }
};

export const createProcesso = async (req: AuthRequest, res: Response) => {
  try {
    const { funcionarioId, numeroProcesso, status, valorEnvolvido, advogado, descricao, dataAbertura } = req.body;
    
    const novoProcesso = await prisma.processoTrabalhista.create({
      data: {
        funcionarioId,
        numeroProcesso,
        status: status || 'ATIVO',
        valorEnvolvido,
        advogado,
        descricao,
        dataAbertura: dataAbertura ? new Date(dataAbertura) : new Date()
      },
      include: {
        funcionario: { select: { id: true, nome: true } }
      }
    });

    res.status(201).json(novoProcesso);
  } catch (error) {
    console.error('Error creating processo:', error);
    res.status(500).json({ error: 'Erro ao criar processo trabalhista' });
  }
};

export const updateProcesso = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status, valorEnvolvido, advogado, descricao } = req.body;

    const processoAtualizado = await prisma.processoTrabalhista.update({
      where: { id },
      data: {
        status,
        valorEnvolvido,
        advogado,
        descricao
      }
    });

    res.json(processoAtualizado);
  } catch (error) {
    console.error('Error updating processo:', error);
    res.status(500).json({ error: 'Erro ao atualizar processo trabalhista' });
  }
};
