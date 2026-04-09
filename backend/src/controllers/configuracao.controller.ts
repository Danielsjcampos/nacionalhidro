import { Request, Response } from 'express';
import prisma from '../lib/prisma';

// Singleton: Always fetch the record with id="default"
export const getConfig = async (req: Request, res: Response) => {
  try {
    let config = await prisma.configuracao.findUnique({
      where: { id: 'default' }
    });

    if (!config) {
      config = await prisma.configuracao.create({
        data: { id: 'default' }
      });
    }

    res.json(config);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar configurações', error });
  }
};

export const updateConfig = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    
    // Updates singleton
    const config = await prisma.configuracao.upsert({
      where: { id: 'default' },
      update: { ...data },
      create: { id: 'default', ...data }
    });

    res.json(config);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar configurações', error });
  }
};
