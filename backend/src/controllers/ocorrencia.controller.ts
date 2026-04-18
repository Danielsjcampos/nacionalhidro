import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const listOcorrencias = async (req: AuthRequest, res: Response) => {
  try {
    const { funcionarioId, tipo, status } = req.query;
    const where: any = {};
    if (funcionarioId) where.funcionarioId = funcionarioId as string;
    if (tipo) where.tipo = tipo as string;
    if (status) where.status = status as string;

    const ocorrencias = await prisma.ocorrenciaDisciplinar.findMany({
      where,
      include: {
        funcionario: { select: { id: true, nome: true, cargo: true, departamento: true } }
      },
      orderBy: { data: 'desc' }
    });
    res.json(ocorrencias);
  } catch (error) {
    console.error('Error listing ocorrencias:', error);
    res.status(500).json({ error: 'Erro ao buscar ocorrências' });
  }
};

export const createOcorrencia = async (req: AuthRequest, res: Response) => {
  try {
    const { funcionarioId, tipo, data, descricao, arquivoUrl, valorDesconto, testemunhas, observacoes } = req.body;
    
    const novaOcorrencia = await prisma.ocorrenciaDisciplinar.create({
      data: {
        funcionarioId,
        tipo,
        data: new Date(data),
        descricao,
        arquivoUrl,
        valorDesconto: valorDesconto ? Number(valorDesconto) : null,
        testemunhas,
        observacoes,
        status: 'PENDENTE'
      },
      include: {
        funcionario: { select: { id: true, nome: true } }
      }
    });

    res.status(201).json(novaOcorrencia);
  } catch (error) {
    console.error('Error creating ocorrencia:', error);
    res.status(500).json({ error: 'Erro ao criar ocorrência' });
  }
};

export const updateOcorrencia = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { data, valorDesconto, ...rest } = req.body;

    const ocorrencia = await prisma.ocorrenciaDisciplinar.update({
      where: { id },
      data: {
        ...rest,
        data: data ? new Date(data) : undefined,
        valorDesconto: valorDesconto ? Number(valorDesconto) : undefined,
      },
      include: {
        funcionario: { select: { id: true, nome: true } }
      }
    });

    res.json(ocorrencia);
  } catch (error) {
    console.error('Error updating ocorrencia:', error);
    res.status(500).json({ error: 'Erro ao atualizar ocorrência' });
  }
};

export const deleteOcorrencia = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.ocorrenciaDisciplinar.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting ocorrencia:', error);
    res.status(500).json({ error: 'Erro ao deletar ocorrência' });
  }
};

