import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const listManutencoes = async (req: AuthRequest, res: Response) => {
  try {
    const list = await prisma.manutencao.findMany({
      include: {
        veiculo: true,
        os: { include: { cliente: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch maintenance records' });
  }
};

export const createManutencao = async (req: AuthRequest, res: Response) => {
  try {
    const { ultimaRevisao, proximaRevisao, ...rest } = req.body;
    
    // Se estiver vinculando a um veículo, atualiza o status do veículo para MANUTENCAO
    if (rest.veiculoId) {
      await prisma.veiculo.update({
        where: { id: rest.veiculoId },
        data: { status: 'MANUTENCAO' }
      });
    }

    const manutencao = await prisma.manutencao.create({
      data: {
        ...rest,
        ultimaRevisao: ultimaRevisao ? new Date(ultimaRevisao) : undefined,
        proximaRevisao: proximaRevisao ? new Date(proximaRevisao) : undefined
      }
    });

    res.status(201).json(manutencao);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create maintenance record' });
  }
};

export const updateManutencao = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { ultimaRevisao, proximaRevisao, status, custoPecas, custoMaoObra, ...rest } = req.body;
    
    const valorTotal = (Number(custoPecas) || 0) + (Number(custoMaoObra) || 0);

    const manutencao = await prisma.manutencao.update({
      where: { id },
      data: {
        ...rest,
        status,
        custoPecas: custoPecas !== undefined ? Number(custoPecas) : undefined,
        custoMaoObra: custoMaoObra !== undefined ? Number(custoMaoObra) : undefined,
        valorTotal,
        ultimaRevisao: ultimaRevisao ? new Date(ultimaRevisao) : undefined,
        proximaRevisao: proximaRevisao ? new Date(proximaRevisao) : undefined
      }
    });

    // Se a manutenção for concluída e tiver valor, gera transação financeira
    if (status === 'CONCLUIDA' && valorTotal > 0) {
      await prisma.transacaoFinanceira.create({
        data: {
          tipo: 'DESPESA',
          categoria: 'MANUTENCAO',
          valor: valorTotal,
          descricao: `Manutencao veiculo ID: ${manutencao.veiculoId || 'Equip'}`,
          data: new Date(),
          status: 'PENDENTE'
        }
      });

      // Libera o veículo automaticamente se for conclusão
      if (manutencao.veiculoId) {
        await prisma.veiculo.update({
          where: { id: manutencao.veiculoId },
          data: { status: 'DISPONIVEL' }
        });
      }
    }

    res.json(manutencao);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update maintenance record' });
  }
};

export const liberarVeiculo = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const manutencao = await prisma.manutencao.findUnique({ where: { id } });

    if (manutencao?.veiculoId) {
      await prisma.veiculo.update({
        where: { id: manutencao.veiculoId },
        data: { status: 'DISPONIVEL' }
      });
      
      await prisma.manutencao.update({
        where: { id },
        data: { status: 'CONCLUIDA' }
      });
    }

    res.json({ message: 'Vehicle released to fleet' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to release vehicle' });
  }
};

export const deleteManutencao = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.manutencao.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete maintenance record' });
  }
};
