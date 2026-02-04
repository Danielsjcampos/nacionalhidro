import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const listOS = async (req: AuthRequest, res: Response) => {
  try {
    const list = await prisma.ordemServico.findMany({
      include: { 
        cliente: true,
        servicos: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch service orders' });
  }
};

export const getOS = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const os = await prisma.ordemServico.findUnique({
      where: { id },
      include: {
        cliente: true,
        proposta: true,
        servicos: true,
        manutencao: true,
        logistica: true
      }
    });

    if (!os) return res.status(404).json({ error: 'OS not found' });
    res.json(os);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch OS details' });
  }
};

export const createOS = async (req: AuthRequest, res: Response) => {
  try {
    const { 
      servicos, dataInicial, entrada, saida, almoco, ...rest 
    } = req.body;
    
    // Auto-generate code if missing
    const count = await prisma.ordemServico.count();
    const codigo = rest.codigo || `OS-${new Date().getFullYear()}-${(count + 1).toString().padStart(3, '0')}`;

    const os = await prisma.ordemServico.create({
      data: {
        ...rest,
        codigo,
        dataInicial: dataInicial ? new Date(dataInicial) : new Date(),
        entrada: entrada ? new Date(entrada) : undefined,
        saida: saida ? new Date(saida) : undefined,
        almoco: almoco ? new Date(almoco) : undefined,
        servicos: {
          create: servicos?.map((s: any) => ({
            equipamento: s.equipamento,
            descricao: s.descricao
          }))
        }
      },
      include: {
        servicos: true
      }
    });

    res.status(201).json(os);
  } catch (error: any) {
    console.error('Create OS Error:', error);
    res.status(500).json({ error: 'Failed to create service order', details: error.message });
  }
};

export const updateOS = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { 
      servicos, dataInicial, entrada, saida, almoco, ...rest 
    } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // Clear existing services to sync
      if (servicos) {
        await tx.servicoOS.deleteMany({ where: { osId: id } });
      }

      return await tx.ordemServico.update({
        where: { id },
        data: {
          ...rest,
          dataInicial: dataInicial ? new Date(dataInicial) : undefined,
          entrada: (entrada && entrada !== '') ? new Date(entrada) : null,
          saida: (saida && saida !== '') ? new Date(saida) : null,
          almoco: (almoco && almoco !== '') ? new Date(almoco) : null,
          servicos: servicos ? {
            create: servicos?.map((s: any) => ({
              equipamento: s.equipamento,
              descricao: s.descricao
            }))
          } : undefined
        },
        include: {
          servicos: true
        }
      });
    });

    res.json(result);
  } catch (error: any) {
    console.error('Update OS Error:', error);
    res.status(500).json({ error: 'Failed to update OS', details: error.message });
  }
};

export const deleteOS = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.servicoOS.deleteMany({ where: { osId: id } });
    await prisma.ordemServico.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete OS' });
  }
};
