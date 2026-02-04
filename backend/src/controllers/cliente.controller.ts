import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const listClientes = async (req: AuthRequest, res: Response) => {
  try {
    const { search } = req.query;
    const where = search ? {
      OR: [
        { nome: { contains: search as string, mode: 'insensitive' as any } },
        { documento: { contains: search as string, mode: 'insensitive' as any } },
        { razaoSocial: { contains: search as string, mode: 'insensitive' as any } },
        { nomeFantasia: { contains: search as string, mode: 'insensitive' as any } },
      ]
    } : {};

    const clientes = await prisma.cliente.findMany({
      where,
      orderBy: { nome: 'asc' }
    });
    res.json(clientes);
  } catch (error) {
    console.error('List Clientes Error:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
};

export const getCliente = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const cliente = await prisma.cliente.findUnique({
      where: { id },
      include: {
        propostas: { orderBy: { createdAt: 'desc' } },
        ordensServico: { orderBy: { createdAt: 'desc' } }
      }
    });

    if (!cliente) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json(cliente);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch client' });
  }
};

export const createCliente = async (req: AuthRequest, res: Response) => {
  try {
    const data = req.body;
    
    // Ensure numeric/date types are converted if necessary
    if (data.aniversarioReajuste) data.aniversarioReajuste = new Date(data.aniversarioReajuste);
    if (data.porcentagemRL) data.porcentagemRL = parseFloat(data.porcentagemRL);
    if (data.diasVencimentoRL) data.diasVencimentoRL = parseInt(data.diasVencimentoRL);

    const cliente = await prisma.cliente.create({
      data: {
        ...data,
        // Documento is unique, should handle errors
      }
    });

    res.status(201).json(cliente);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Document or Code already exists' });
    }
    console.error('Create Cliente Error:', error);
    res.status(500).json({ error: 'Failed to create client' });
  }
};

export const updateCliente = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const data = req.body;

    if (data.aniversarioReajuste) data.aniversarioReajuste = new Date(data.aniversarioReajuste);
    if (data.porcentagemRL) data.porcentagemRL = parseFloat(data.porcentagemRL);
    if (data.diasVencimentoRL) data.diasVencimentoRL = parseInt(data.diasVencimentoRL);

    const cliente = await prisma.cliente.update({
      where: { id },
      data
    });

    res.json(cliente);
  } catch (error) {
    console.error('Update Cliente Error:', error);
    res.status(500).json({ error: 'Failed to update client' });
  }
};

export const deleteCliente = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.cliente.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete client' });
  }
};
