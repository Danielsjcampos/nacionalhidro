import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// ESCALAS
export const listEscalas = async (req: AuthRequest, res: Response) => {
  try {
    const list = await prisma.escala.findMany({
      include: {
        cliente: true,
        veiculo: true
      },
      orderBy: { data: 'desc' }
    });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch scales' });
  }
};

export const createEscala = async (req: AuthRequest, res: Response) => {
  try {
    const { data, ...rest } = req.body;
    const escala = await prisma.escala.create({
      data: {
        ...rest,
        data: new Date(data)
      }
    });
    res.status(201).json(escala);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create scale' });
  }
};

export const updateEscala = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { data, ...rest } = req.body;
    const escala = await prisma.escala.update({
      where: { id },
      data: {
        ...rest,
        data: data ? new Date(data) : undefined
      }
    });
    res.json(escala);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update scale' });
  }
};

export const deleteEscala = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.escala.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete scale' });
  }
};

// VEICULOS (FROTA)
export const listVeiculos = async (req: AuthRequest, res: Response) => {
  try {
    const list = await prisma.veiculo.findMany({
      orderBy: { placa: 'asc' }
    });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
};

export const createVeiculo = async (req: AuthRequest, res: Response) => {
  try {
    const veiculo = await prisma.veiculo.create({ data: req.body });
    res.status(201).json(veiculo);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create vehicle' });
  }
};

export const updateVeiculo = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { nivelCombustivel, ...rest } = req.body;
    const veiculo = await prisma.veiculo.update({
      where: { id },
      data: {
        ...rest,
        nivelCombustivel: nivelCombustivel !== undefined ? Number(nivelCombustivel) : undefined
      }
    });
    res.json(veiculo);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update vehicle' });
  }
};

export const sendToMaintenance = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { descricao, prioridade } = req.body;

    // 1. Atualiza status do veículo
    await prisma.veiculo.update({
      where: { id },
      data: { status: 'MANUTENCAO' }
    });

    // 2. Cria registro de manutenção
    const manutencao = await prisma.manutencao.create({
      data: {
        veiculoId: id,
        descricao: descricao || 'Enviado da Logística',
        prioridade: prioridade || 'MEDIA',
        status: 'PENDENTE'
      }
    });

    res.status(201).json(manutencao);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send vehicle to maintenance' });
  }
};

export const deleteVeiculo = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.veiculo.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete vehicle' });
  }
};
