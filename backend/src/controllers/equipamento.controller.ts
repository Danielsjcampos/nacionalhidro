import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';

export const getEquipamentos = async (req: AuthRequest, res: Response) => {
  try {
    const equipamentos = await prisma.equipamento.findMany({
      take: 200,
      orderBy: { createdAt: 'desc' },
      include: {
        acessoriosVinculados: { include: { acessorio: true } },
        responsabilidadesPadrao: { orderBy: { ordem: 'asc' } },
      },
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

// ─── GESTÃO DE ACESSÓRIOS VINCULADOS ────────────────────────────

export const addAcessorioVinculado = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { acessorioId } = req.body;
    const vinculo = await prisma.equipamentoAcessorio.create({
      data: { equipamentoId: id as string, acessorioId: acessorioId as string },
      include: { acessorio: true },
    });
    res.status(201).json(vinculo);
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(409).json({ error: 'Acessório já vinculado' });
    res.status(500).json({ error: 'Falha ao vincular acessório' });
  }
};

export const removeAcessorioVinculado = async (req: AuthRequest, res: Response) => {
  try {
    const { id, vinculoId } = req.params;
    await prisma.equipamentoAcessorio.delete({ where: { id: vinculoId as string } });
    res.json({ message: 'Acessório desvinculado' });
  } catch (error) {
    res.status(500).json({ error: 'Falha ao remover vínculo' });
  }
};

// ─── GESTÃO DE RESPONSABILIDADES PADRÃO ─────────────────────────

export const listResponsabilidadesPadrao = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const resps = await prisma.equipamentoResponsabilidade.findMany({
      where: { equipamentoId: id as string },
      orderBy: { ordem: 'asc' },
    });
    res.json(resps);
  } catch (error) {
    res.status(500).json({ error: 'Falha ao listar responsabilidades' });
  }
};

export const createResponsabilidadePadrao = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { descricao, tipo, importante, ordem } = req.body;
    const resp = await prisma.equipamentoResponsabilidade.create({
      data: {
        equipamentoId: id as string,
        descricao,
        tipo: tipo || 'CONTRATADA',
        importante: importante || false,
        ordem: ordem ?? 0,
      },
    });
    res.status(201).json(resp);
  } catch (error) {
    res.status(500).json({ error: 'Falha ao criar responsabilidade' });
  }
};

export const updateResponsabilidadePadrao = async (req: AuthRequest, res: Response) => {
  try {
    const { respId } = req.params;
    const { descricao, tipo, importante, ordem } = req.body;
    const resp = await prisma.equipamentoResponsabilidade.update({
      where: { id: respId as string },
      data: { descricao, tipo, importante, ordem },
    });
    res.json(resp);
  } catch (error) {
    res.status(500).json({ error: 'Falha ao atualizar responsabilidade' });
  }
};

export const deleteResponsabilidadePadrao = async (req: AuthRequest, res: Response) => {
  try {
    const { respId } = req.params;
    await prisma.equipamentoResponsabilidade.delete({ where: { id: respId as string } });
    res.json({ message: 'Responsabilidade removida' });
  } catch (error) {
    res.status(500).json({ error: 'Falha ao remover responsabilidade' });
  }
};
