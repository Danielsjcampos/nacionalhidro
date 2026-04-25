import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const listClientes = async (req: AuthRequest, res: Response) => {
  try {
    const { search, tipoCliente, matrizId } = req.query;
    const where: any = {};

    if (search) {
      where.OR = [
        { nome: { contains: search as string, mode: 'insensitive' as any } },
        { documento: { contains: search as string, mode: 'insensitive' as any } },
        { razaoSocial: { contains: search as string, mode: 'insensitive' as any } },
        { nomeFantasia: { contains: search as string, mode: 'insensitive' as any } },
      ];
    }

    if (tipoCliente) where.tipoCliente = tipoCliente as string;
    if (matrizId) where.matrizId = matrizId as string;

    const clientes = await prisma.cliente.findMany({
      where,
      take: 100, // Limite de segurança mantido para performance
      include: {
        matriz: { select: { id: true, nome: true } },
        contatosList: { orderBy: { nome: 'asc' } },
        _count: { select: { filiais: true } },
      },
      orderBy: { nome: 'asc' },
    });
    res.json(clientes);
  } catch (error: any) {
    console.error('List Clientes Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch clients', 
      details: error.message,
      code: error.code 
    });
  }
};

export const getCliente = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const cliente = await prisma.cliente.findUnique({
      where: { id },
      include: {
        propostas: { orderBy: { createdAt: 'desc' } },
        ordensServico: { orderBy: { createdAt: 'desc' } },
        matriz: { select: { id: true, nome: true, documento: true } },
        filiais: {
          select: {
            id: true,
            nome: true,
            documento: true,
            tipoCliente: true,
            cidade: true,
            estado: true,
          },
          orderBy: { nome: 'asc' },
        },
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
      return res.status(400).json({ error: 'Já existe um cliente com este Nome, Documento ou Código.' });
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
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Já existe um cliente com este Nome, Documento ou Código.' });
    }
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

// GET /clientes/:id/hierarquia — retorna árvore completa
export const getHierarquia = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    // Find the root (matriz) — walk up
    let currentId: string | null = id;
    let root = await prisma.cliente.findUnique({
      where: { id: currentId },
      select: { id: true, matrizId: true },
    });

    while (root?.matrizId) {
      root = await prisma.cliente.findUnique({
        where: { id: root.matrizId },
        select: { id: true, matrizId: true },
      });
    }

    if (!root) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Now fetch full tree from root
    const tree = await prisma.cliente.findUnique({
      where: { id: root.id },
      select: {
        id: true,
        nome: true,
        documento: true,
        tipoCliente: true,
        cidade: true,
        estado: true,
        centrosCusto: true,
        filiais: {
          select: {
            id: true,
            nome: true,
            documento: true,
            tipoCliente: true,
            cidade: true,
            estado: true,
            centrosCusto: true,
            filiais: {
              select: {
                id: true,
                nome: true,
                documento: true,
                tipoCliente: true,
                centrosCusto: true,
              },
              orderBy: { nome: 'asc' },
            },
          },
          orderBy: { nome: 'asc' },
        },
      },
    });

    res.json(tree);
  } catch (error) {
    console.error('getHierarquia Error:', error);
    res.status(500).json({ error: 'Failed to fetch hierarchy' });
  }
};
