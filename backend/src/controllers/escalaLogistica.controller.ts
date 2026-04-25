import { Request, Response } from 'express';
import prisma from '../lib/prisma';

const ok = (res: Response, data: any, status = 200) => res.status(status).json(data);
const err = (res: Response, e: any, msg = 'Erro interno') => {
  console.error(msg, e);
  res.status(500).json({ error: e?.message ?? msg });
};

// ─── LIST ────────────────────────────────────────────────────────────────────
export async function listEscalaLogistica(req: Request, res: Response) {
  try {
    const { status, clienteId, dataInicio, dataFim } = req.query as any;

    const where: any = {};
    if (status !== undefined) where.status = Number(status);
    if (clienteId) where.clienteId = clienteId;
    if (dataInicio || dataFim) {
      where.data = {};
      if (dataInicio) where.data.gte = new Date(dataInicio);
      if (dataFim) where.data.lte = new Date(dataFim);
    }

    const escalas = await prisma.escalaLogistica.findMany({
      where,
      orderBy: { data: 'desc' },
      include: {
        funcionarios: true,
        veiculos: true,
        ordem: { include: { servicos: true } },
      },
    });

    ok(res, escalas);
  } catch (e) { err(res, e, 'listEscalaLogistica'); }
}

// ─── GET ONE ─────────────────────────────────────────────────────────────────
export async function getEscalaLogistica(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const escala = await prisma.escalaLogistica.findUnique({
      where: { id },
      include: {
        funcionarios: true,
        veiculos: true,
        ordem: { include: { servicos: true } },
      },
    });
    if (!escala) return res.status(404).json({ error: 'Escala não encontrada' });
    ok(res, escala);
  } catch (e) { err(res, e, 'getEscalaLogistica'); }
}

// ─── CREATE ───────────────────────────────────────────────────────────────────
export async function createEscalaLogistica(req: Request, res: Response) {
  try {
    const {
      status = 1, ordemId, clienteId, equipamentoId, empresaId,
      data, hora, observacoes, funcionariosIndisponiveis,
      EscalaFuncionarios, EscalaVeiculos,
    } = req.body;

    // Se tem ordemId, desvincula escala anterior (1:1)
    if (ordemId) {
      const anterior = await prisma.escalaLogistica.findUnique({ where: { ordemId: Number(ordemId) } });
      if (anterior) {
        await prisma.escalaLogistica.delete({ where: { id: anterior.id } });
      }
    }

    const escala = await prisma.escalaLogistica.create({
      data: {
        status: Number(status),
        ordemId: ordemId ? Number(ordemId) : undefined,
        clienteId,
        equipamentoId,
        empresaId,
        data: data ? new Date(data) : undefined,
        hora,
        observacoes,
        funcionariosIndisponiveis,
        funcionarios: EscalaFuncionarios?.length
          ? {
            create: EscalaFuncionarios.map((f: any) => ({
              funcionarioId: f.funcionarioId,
              statusOperacao: f.statusOperacao ?? 0,
              ausente: f.ausente ?? false,
            })),
          }
          : undefined,
        veiculos: EscalaVeiculos?.length
          ? {
            create: EscalaVeiculos.map((v: any) => ({
              veiculoId: v.veiculoId,
              manutencao: v.manutencao ?? false,
            })),
          }
          : undefined,
      },
      include: { funcionarios: true, veiculos: true },
    });

    ok(res, escala, 201);
  } catch (e) { err(res, e, 'createEscalaLogistica'); }
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────
export async function updateEscalaLogistica(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const {
      status, clienteId, equipamentoId, empresaId, ordemId,
      data, hora, observacoes, funcionariosIndisponiveis, motivoCancelamento,
      EscalaFuncionarios, EscalaVeiculos,
    } = req.body;

    const upd: any = {};
    if (status !== undefined)         upd.status = Number(status);
    if (clienteId !== undefined)      upd.clienteId = clienteId;
    if (equipamentoId !== undefined)  upd.equipamentoId = equipamentoId;
    if (empresaId !== undefined)      upd.empresaId = empresaId;
    if (ordemId !== undefined)        upd.ordemId = ordemId ? Number(ordemId) : null;
    if (data !== undefined)           upd.data = data ? new Date(data) : null;
    if (hora !== undefined)           upd.hora = hora;
    if (observacoes !== undefined)    upd.observacoes = observacoes;
    if (funcionariosIndisponiveis !== undefined) upd.funcionariosIndisponiveis = funcionariosIndisponiveis;

    // Cancelamento: guarda motivo em observacoes se não há campo próprio
    if (motivoCancelamento) {
      upd.status = 0;
      upd.observacoes = motivoCancelamento;
    }

    if (EscalaFuncionarios !== undefined) {
      await prisma.escalaLogisticaFuncionario.deleteMany({ where: { escalaId: id } });
      if (EscalaFuncionarios.length) {
        await prisma.escalaLogisticaFuncionario.createMany({
          data: EscalaFuncionarios.map((f: any) => ({
            escalaId: id,
            funcionarioId: f.funcionarioId,
            statusOperacao: f.statusOperacao ?? 0,
            ausente: f.ausente ?? false,
          })),
        });
      }
    }

    if (EscalaVeiculos !== undefined) {
      await prisma.escalaLogisticaVeiculo.deleteMany({ where: { escalaId: id } });
      if (EscalaVeiculos.length) {
        await prisma.escalaLogisticaVeiculo.createMany({
          data: EscalaVeiculos.map((v: any) => ({
            escalaId: id,
            veiculoId: v.veiculoId,
            manutencao: v.manutencao ?? false,
          })),
        });
      }
    }

    const escala = await prisma.escalaLogistica.update({
      where: { id },
      data: upd,
      include: { funcionarios: true, veiculos: true },
    });

    ok(res, escala);
  } catch (e) { err(res, e, 'updateEscalaLogistica'); }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────
export async function deleteEscalaLogistica(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    await prisma.escalaLogistica.delete({ where: { id } });
    ok(res, { success: true });
  } catch (e) { err(res, e, 'deleteEscalaLogistica'); }
}
