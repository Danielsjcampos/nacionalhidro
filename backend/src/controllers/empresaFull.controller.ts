import { Request, Response } from 'express';
import prisma from '../lib/prisma';

// ── Empresa (EmpresaCNPJ) com bancos array ─────────────────────────

export const listEmpresasFull = async (_req: Request, res: Response) => {
  try {
    const list = await prisma.empresaCNPJ.findMany({
      where: { ativa: true },
      include: { bancos: true },
      orderBy: { nome: 'asc' },
    });
    res.json(list);
  } catch (e) { res.status(500).json({ error: 'Erro ao listar empresas' }); }
};

export const getEmpresaFull = async (req: Request, res: Response) => {
  try {
    const item = await prisma.empresaCNPJ.findUnique({
      where: { id: req.params.id as string },
      include: { bancos: true },
    });
    if (!item) return res.status(404).json({ error: 'Empresa não encontrada' });
    res.json(item);
  } catch (e) { res.status(500).json({ error: 'Erro ao buscar empresa' }); }
};

export const createEmpresaFull = async (req: Request, res: Response) => {
  try {
    const { bancos, ...rest } = req.body;
    const item = await prisma.empresaCNPJ.create({
      data: {
        ...rest,
        bancos: bancos?.length ? { create: bancos.map(({ id, empresaId, createdAt, ...b }: any) => b) } : undefined,
      },
      include: { bancos: true },
    });
    res.status(201).json(item);
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao criar empresa', details: e.message });
  }
};

export const updateEmpresaFull = async (req: Request, res: Response) => {
  try {
    const { bancos, ...rest } = req.body;
    const id = req.params.id as string;

    // Replace bancos array: delete all then recreate
    if (bancos !== undefined) {
      await prisma.empresaBanco.deleteMany({ where: { empresaId: id } });
    }

    const item = await prisma.empresaCNPJ.update({
      where: { id },
      data: {
        ...rest,
        ...(bancos !== undefined && bancos.length > 0
          ? { bancos: { create: bancos.map(({ id: _id, empresaId, createdAt, ...b }: any) => b) } }
          : {}),
      },
      include: { bancos: true },
    });
    res.json(item);
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao atualizar empresa', details: e.message });
  }
};

// ── Histórico de Contatos ─────────────────────────────────────────

export const listHistoricos = async (req: Request, res: Response) => {
  try {
    const { clienteId } = req.query;
    const where: any = {};
    if (clienteId) where.clienteId = clienteId as string;
    const list = await prisma.historicoContato.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json(list);
  } catch (e) { res.status(500).json({ error: 'Erro ao listar históricos' }); }
};

export const createHistorico = async (req: Request, res: Response) => {
  try {
    const item = await prisma.historicoContato.create({ data: req.body });
    res.status(201).json(item);
  } catch (e) { res.status(500).json({ error: 'Erro ao criar histórico' }); }
};

export const updateHistorico = async (req: Request, res: Response) => {
  try {
    const item = await prisma.historicoContato.update({
      where: { id: req.params.id as string },
      data: req.body,
    });
    res.json(item);
  } catch (e) { res.status(500).json({ error: 'Erro ao atualizar histórico' }); }
};

export const deleteHistorico = async (req: Request, res: Response) => {
  try {
    await prisma.historicoContato.delete({ where: { id: req.params.id as string } });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Erro ao excluir histórico' }); }
};

// ── ClienteDocumento ──────────────────────────────────────────────

export const listClienteDocumentos = async (req: Request, res: Response) => {
  try {
    const { clienteId } = req.query;
    const where: any = { deletedAt: null };
    if (clienteId) where.clienteId = clienteId as string;
    const list = await prisma.clienteDocumento.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json(list);
  } catch (e) { res.status(500).json({ error: 'Erro ao listar documentos' }); }
};

export const createClienteDocumento = async (req: Request, res: Response) => {
  try {
    const item = await prisma.clienteDocumento.create({ data: req.body });
    res.status(201).json(item);
  } catch (e) { res.status(500).json({ error: 'Erro ao criar documento' }); }
};

export const softDeleteClienteDocumento = async (req: Request, res: Response) => {
  try {
    const { motivoExclusao } = req.body;
    if (!motivoExclusao?.trim()) return res.status(400).json({ error: 'Motivo de exclusão obrigatório' });
    const item = await prisma.clienteDocumento.update({
      where: { id: req.params.id as string },
      data: { deletedAt: new Date(), motivoExclusao },
    });
    res.json(item);
  } catch (e) { res.status(500).json({ error: 'Erro ao excluir documento' }); }
};

// ── ClienteContato ────────────────────────────────────────────────

export const listClienteContatos = async (req: Request, res: Response) => {
  try {
    const { clienteId } = req.query;
    const where: any = {};
    if (clienteId) where.clienteId = clienteId as string;
    const list = await prisma.clienteContato.findMany({ where, orderBy: { nome: 'asc' } });
    res.json(list);
  } catch (e) { res.status(500).json({ error: 'Erro ao listar contatos' }); }
};

export const upsertClienteContatos = async (req: Request, res: Response) => {
  try {
    const clienteId = req.params.clienteId as string;
    const { contatos } = req.body as { contatos: any[] };

    // Delete all then recreate (simplest approach for array sync)
    await prisma.clienteContato.deleteMany({ where: { clienteId } });
    if (contatos?.length) {
      await prisma.clienteContato.createMany({
        data: contatos.map(({ id: _id, clienteId: _cid, createdAt, ...c }: any) => ({ ...c, clienteId })),
      });
    }
    const list = await prisma.clienteContato.findMany({ where: { clienteId } });
    res.json(list);
  } catch (e) { res.status(500).json({ error: 'Erro ao sincronizar contatos' }); }
};
