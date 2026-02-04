import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const listPropostas = async (req: AuthRequest, res: Response) => {
  try {
    const { search } = req.query;
    const propostas = await prisma.proposta.findMany({
      where: search ? {
        OR: [
          { codigo: { contains: search as string, mode: 'insensitive' as any } },
          { cliente: { nome: { contains: search as string, mode: 'insensitive' as any } } }
        ]
      } : {},
      include: {
        cliente: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(propostas);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch proposals' });
  }
};

export const getProposta = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const proposta = await prisma.proposta.findUnique({
      where: { id },
      include: {
        cliente: true,
        itens: true,
        acessorios: true,
        responsabilidades: true,
        equipe: true
      }
    });

    if (!proposta) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    res.json(proposta);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch proposal details' });
  }
};

export const createProposta = async (req: AuthRequest, res: Response) => {
  try {
    const { 
      clienteId, itens, acessorios, responsabilidades, equipe, 
      dataProposta, dataValidade, ...rest 
    } = req.body;

    const proposta = await prisma.proposta.create({
      data: {
        ...rest,
        dataProposta: dataProposta ? new Date(dataProposta) : new Date(),
        dataValidade: dataValidade ? new Date(dataValidade) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cliente: { connect: { id: clienteId } },
        itens: {
          create: itens?.map((i: any) => ({
            equipamento: i.equipamento,
            quantidade: i.quantidade,
            area: i.area,
            tipoCobranca: i.tipoCobranca,
            valorAcobrar: i.valorAcobrar,
            horasPorDia: i.horasPorDia,
            usoPrevisto: i.usoPrevisto,
            mobilizacao: i.mobilizacao,
            valorTotal: i.valorTotal
          }))
        },
        acessorios: {
          create: acessorios?.map((a: any) => ({
            acessorio: a.acessorio,
            quantidade: a.quantidade,
            valor: a.valor
          }))
        },
        responsabilidades: {
          create: responsabilidades?.map((r: any) => ({
            tipo: r.tipo,
            descricao: r.descricao
          }))
        },
        equipe: {
          create: equipe?.map((e: any) => ({
            nome: e.nome,
            cargo: e.cargo
          }))
        }
      },
      include: {
        cliente: true,
        itens: true
      }
    });

    res.status(201).json(proposta);
  } catch (error: any) {
    console.error('Create Proposal Error:', error);
    res.status(500).json({ error: 'Failed to create proposal', details: error.message });
  }
};

export const updatePropostaStatus = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    const proposta = await prisma.proposta.update({
      where: { id },
      data: { status }
    });

    res.json(proposta);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update proposal status' });
  }
};

export const updateProposta = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { 
      clienteId, itens, acessorios, responsabilidades, equipe, 
      dataProposta, dataValidade, ...rest 
    } = req.body;

    // We use a transaction to ensure data integrity during sync
    const result = await prisma.$transaction(async (tx) => {
      // 1. Delete associated records to "sync" (re-create them)
      await tx.propostaItem.deleteMany({ where: { propostaId: id } });
      await tx.propostaAcessorio.deleteMany({ where: { propostaId: id } });
      await tx.propostaResponsabilidade.deleteMany({ where: { propostaId: id } });
      await tx.propostaEquipe.deleteMany({ where: { propostaId: id } });

      // 2. Update Main Proposal
      return await tx.proposta.update({
        where: { id },
        data: {
          ...rest,
          dataProposta: dataProposta ? new Date(dataProposta) : undefined,
          dataValidade: dataValidade ? new Date(dataValidade) : undefined,
          cliente: clienteId ? { connect: { id: clienteId } } : undefined,
          itens: {
            create: itens?.map((i: any) => ({
              equipamento: i.equipamento,
              quantidade: i.quantidade,
              area: i.area,
              tipoCobranca: i.tipoCobranca,
              valorAcobrar: i.valorAcobrar,
              horasPorDia: i.horasPorDia,
              usoPrevisto: i.usoPrevisto,
              mobilizacao: i.mobilizacao,
              valorTotal: i.valorTotal
            }))
          },
          acessorios: {
            create: acessorios?.map((a: any) => ({
              acessorio: a.acessorio,
              quantidade: a.quantidade,
              valor: a.valor
            }))
          },
          responsabilidades: {
            create: responsabilidades?.map((r: any) => ({
              tipo: r.tipo,
              descricao: r.descricao
            }))
          },
          equipe: {
            create: equipe?.map((e: any) => ({
              nome: e.nome,
              cargo: e.cargo
            }))
          }
        },
        include: {
          cliente: true,
          itens: true,
          acessorios: true,
          responsabilidades: true,
          equipe: true
        }
      });
    });

    res.json(result);
  } catch (error: any) {
    console.error('Update Proposal Error:', error);
    res.status(500).json({ error: 'Failed to update proposal', details: error.message });
  }
};

export const deleteProposta = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    
    // Cascading deletes for relational items
    await prisma.propostaItem.deleteMany({ where: { propostaId: id } });
    await prisma.propostaAcessorio.deleteMany({ where: { propostaId: id } });
    await prisma.propostaResponsabilidade.deleteMany({ where: { propostaId: id } });
    await prisma.propostaEquipe.deleteMany({ where: { propostaId: id } });
    
    await prisma.proposta.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete proposal' });
  }
};
