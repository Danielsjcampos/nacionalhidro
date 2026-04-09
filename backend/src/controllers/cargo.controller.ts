import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const createCargo = async (req: Request, res: Response) => {
  try {
    const { nome, unicoEquipamento } = req.body;
    const cargo = await prisma.cargo.create({
      data: { 
        nome, 
        unicoEquipamento: unicoEquipamento || false 
      }
    });
    res.json(cargo);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar cargo' });
  }
};

export const updateCargo = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { nome, unicoEquipamento } = req.body;
    const cargo = await prisma.cargo.update({
      where: { id },
      data: {
        nome: nome !== undefined ? nome : undefined,
        unicoEquipamento: unicoEquipamento !== undefined ? unicoEquipamento : undefined
      }
    });
    res.json(cargo);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar cargo' });
  }
};

export const listCargos = async (req: Request, res: Response) => {
  try {
    const cargos = await prisma.cargo.findMany({
      orderBy: { nome: 'asc' }
    });
    res.json(cargos);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar cargos' });
  }
};

export const deleteCargo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    await prisma.cargo.delete({
      where: { id }
    });
    res.json({ message: 'Cargo removido com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir cargo' });
  }
};
