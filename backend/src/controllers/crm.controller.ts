import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getLeads = async (req: Request, res: Response) => {
  try {
    const { status, search, origin, period } = req.query;
    
    let where: any = {};
    
    if (status) where.status = status as string;
    if (search) {
      where.OR = [
        { nome: { contains: String(search), mode: 'insensitive' } },
        { email: { contains: String(search), mode: 'insensitive' } },
        { telefone: { contains: String(search), mode: 'insensitive' } },
      ];
    }
    if (origin) where.origem = origin as string;

    if (period) {
        const days = parseInt(String(period));
        if (!isNaN(days)) {
            const date = new Date();
            date.setDate(date.getDate() - days);
            where.createdAt = { gte: date };
        }
    }

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar leads' });
  }
};

export const createLead = async (req: Request, res: Response) => {
  try {
    const lead = await prisma.lead.create({
      data: req.body
    });
    res.status(201).json(lead);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar lead' });
  }
};

export const updateLeadStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const lead = await prisma.lead.update({
      where: { id: String(id) },
      data: { status: String(status) }
    });
    res.json(lead);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar status do lead' });
  }
};

export const updateLead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, observacoes, valorEstimado, nome, empresa, email, telefone } = req.body;
    
    // Convert valorEstimado to Decimal or undefined if not provided/valid
    let parsedValorEstimado: number | undefined = undefined;
    if (valorEstimado !== undefined && valorEstimado !== null && valorEstimado !== '') {
        parsedValorEstimado = parseFloat(valorEstimado);
    }

    const lead = await prisma.lead.update({
      where: { id: String(id) },
      data: { 
          ...(status && { status: String(status) }),
          ...(observacoes !== undefined && { observacoes: observacoes }), // Allow empty string
          ...(parsedValorEstimado !== undefined && { valorEstimado: parsedValorEstimado }),
          ...(nome && { nome }),
          ...(empresa && { empresa }),
          ...(email && { email }),
          ...(telefone && { telefone }),
      }
    });
    res.json(lead);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar lead' });
  }
};

export const deleteLead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.lead.delete({ where: { id: String(id) } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar lead' });
  }
};
