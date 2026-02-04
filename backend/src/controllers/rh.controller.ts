import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const listFuncionarios = async (req: AuthRequest, res: Response) => {
  try {
    const list = await prisma.funcionario.findMany({
      orderBy: { nome: 'asc' }
    });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
};

export const getFuncionario = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (typeof id !== 'string') return res.status(400).json({ error: 'Invalid ID' });
    
    const func = await prisma.funcionario.findUnique({
      where: { id }
    });
    if (!func) return res.status(404).json({ error: 'Funcionario not found' });
    res.json(func);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
};

export const createFuncionario = async (req: AuthRequest, res: Response) => {
  try {
    const data = req.body;
    
    // Basic formatting
    if (data.dataAdmissao) data.dataAdmissao = new Date(data.dataAdmissao);
    if (data.dataNascimento) data.dataNascimento = new Date(data.dataNascimento);
    
    const func = await prisma.funcionario.create({
      data
    });

    res.status(201).json(func);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create employee' });
  }
};

export const updateFuncionario = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (typeof id !== 'string') return res.status(400).json({ error: 'Invalid ID' });
    
    const data = req.body;

    if (data.dataAdmissao) data.dataAdmissao = new Date(data.dataAdmissao);
    if (data.dataNascimento) data.dataNascimento = new Date(data.dataNascimento);

    const func = await prisma.funcionario.update({
      where: { id },
      data
    });

    res.json(func);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update employee' });
  }
};
