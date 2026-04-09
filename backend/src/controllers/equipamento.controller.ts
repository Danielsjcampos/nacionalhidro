import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';

export const getEquipamentos = async (req: AuthRequest, res: Response) => {
  try {
    const equipamentos = await prisma.equipamento.findMany({
      take: 200, // Limite de segurança para evitar sobrecarga
      orderBy: { createdAt: 'desc' }
    });
    res.json(equipamentos);
  } catch (error) {
    console.error('List Equipamentos Error:', error);
    if (error instanceof Error) {
      console.dir(error, { depth: null });
    }
    res.status(500).json({ error: 'Failed to fetch equipamentos' });
  }
};

export const createEquipamento = async (req: AuthRequest, res: Response) => {
  try {
    const data = req.body;
    const equipamento = await prisma.equipamento.create({
      data
    });
    res.status(201).json(equipamento);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create equipamento' });
  }
};

export const updateEquipamento = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const equipamento = await prisma.equipamento.update({
      where: { id: id as string },
      data
    });
    res.json(equipamento);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update equipamento' });
  }
};

export const deleteEquipamento = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.equipamento.delete({
      where: { id: id as string }
    });
    res.json({ message: 'Equipamento deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete equipamento' });
  }
};
