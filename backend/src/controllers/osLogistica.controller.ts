import { Request, Response } from 'express';
import prisma from '../lib/prisma';

// ─── Helper ───────────────────────────────────────────────────────────────────
const ok = (res: Response, data: any, status = 200) => res.status(status).json(data);
const err = (res: Response, e: any, msg = 'Erro interno') => {
  console.error(msg, e);
  res.status(500).json({ error: e?.message ?? msg });
};

// ─── LIST ────────────────────────────────────────────────────────────────────
export async function listOSLogistica(req: Request, res: Response) {
  try {
    const { status, clienteId, dataInicio, dataFim, limit = '200', offset = '0' } = req.query as any;

    const where: any = {};
    if (status !== undefined) where.status = Number(status);
    if (clienteId) where.clienteId = clienteId;
    if (dataInicio || dataFim) {
      where.dataInicial = {};
      if (dataInicio) where.dataInicial.gte = new Date(dataInicio);
      if (dataFim) where.dataInicial.lte = new Date(dataFim);
    }

    const ordens = await prisma.oSLogistica.findMany({
      where,
      take: Number(limit),
      skip: Number(offset),
      orderBy: { dataInicial: 'desc' },
      include: {
        servicos: true,
        escala: {
          include: {
            funcionarios: true,
            veiculos: true,
          },
        },
      },
    });

    ok(res, ordens);
  } catch (e) { err(res, e, 'listOSLogistica'); }
}

// ─── GET ONE ─────────────────────────────────────────────────────────────────
export async function getOSLogistica(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const os = await prisma.oSLogistica.findUnique({
      where: { id },
      include: {
        servicos: true,
        escala: { include: { funcionarios: true, veiculos: true } },
      },
    });
    if (!os) return res.status(404).json({ error: 'OS não encontrada' });
    ok(res, os);
  } catch (e) { err(res, e, 'getOSLogistica'); }
}

// ─── CREATE ───────────────────────────────────────────────────────────────────
export async function createOSLogistica(req: Request, res: Response) {
  try {
    const {
      codigo, numero, status = 1, propostaId, clienteId, contatoId, equipamentoId, empresaId,
      tipoCobranca, dataInicial, horaInicial, diasSemana, quantidadeDia, acompanhante,
      horaPadrao, horaEntrada, horaSaida, horaAlmoco, horaTolerancia, horaTotal, horaAdicional,
      descontarAlmoco, observacoes, criadoPorId,
      Servicos, EscalaFuncionarios, EscalaVeiculos,
    } = req.body;

    const os = await prisma.oSLogistica.create({
      data: {
        codigo,
        numero: numero ? Number(numero) : undefined,
        status: Number(status),
        propostaId,
        clienteId,
        contatoId,
        equipamentoId,
        empresaId,
        tipoCobranca: tipoCobranca ? Number(tipoCobranca) : undefined,
        dataInicial: dataInicial ? new Date(dataInicial) : undefined,
        horaInicial,
        diasSemana,
        quantidadeDia: quantidadeDia ? Number(quantidadeDia) : undefined,
        acompanhante,
        horaPadrao,
        horaEntrada,
        horaSaida,
        horaAlmoco,
        horaTolerancia,
        horaTotal,
        horaAdicional,
        descontarAlmoco: Boolean(descontarAlmoco),
        observacoes,
        criadoPorId,
        dataCriacao: new Date(),
        servicos: Servicos?.length
          ? { create: Servicos.map((s: any) => ({ discriminacao: s.Discriminacao ?? s.discriminacao ?? '' })) }
          : undefined,
        escala: (EscalaFuncionarios?.length || EscalaVeiculos?.length)
          ? {
            create: {
              status: Number(status),
              clienteId,
              equipamentoId,
              empresaId,
              data: dataInicial ? new Date(dataInicial) : undefined,
              hora: horaInicial,
              funcionarios: EscalaFuncionarios?.length
                ? { create: EscalaFuncionarios.map((f: any) => ({ funcionarioId: f.funcionarioId, statusOperacao: f.statusOperacao ?? 0, ausente: f.ausente ?? false })) }
                : undefined,
              veiculos: EscalaVeiculos?.length
                ? { create: EscalaVeiculos.map((v: any) => ({ veiculoId: v.veiculoId, manutencao: v.manutencao ?? false })) }
                : undefined,
            },
          }
          : undefined,
      },
      include: { servicos: true, escala: { include: { funcionarios: true, veiculos: true } } },
    });

    ok(res, os, 201);
  } catch (e) { err(res, e, 'createOSLogistica'); }
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────
export async function updateOSLogistica(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const {
      status, tipoCobranca, dataInicial, horaInicial, diasSemana, quantidadeDia,
      horaPadrao, horaEntrada, horaSaida, horaAlmoco, horaTolerancia, horaTotal, horaAdicional,
      descontarAlmoco, observacoes, motivoCancelamento, dataCancelamento,
      clienteId, contatoId, equipamentoId, empresaId, acompanhante,
      Servicos, EscalaFuncionarios, EscalaVeiculos,
    } = req.body;

    const data: any = {};
    if (status !== undefined)        data.status = Number(status);
    if (tipoCobranca !== undefined)  data.tipoCobranca = Number(tipoCobranca);
    if (dataInicial !== undefined)   data.dataInicial = new Date(dataInicial);
    if (horaInicial !== undefined)   data.horaInicial = horaInicial;
    if (diasSemana !== undefined)    data.diasSemana = diasSemana;
    if (quantidadeDia !== undefined) data.quantidadeDia = Number(quantidadeDia);
    if (horaPadrao !== undefined)    data.horaPadrao = horaPadrao;
    if (horaEntrada !== undefined)   data.horaEntrada = horaEntrada;
    if (horaSaida !== undefined)     data.horaSaida = horaSaida;
    if (horaAlmoco !== undefined)    data.horaAlmoco = horaAlmoco;
    if (horaTolerancia !== undefined) data.horaTolerancia = horaTolerancia;
    if (horaTotal !== undefined)     data.horaTotal = horaTotal;
    if (horaAdicional !== undefined) data.horaAdicional = horaAdicional;
    if (descontarAlmoco !== undefined) data.descontarAlmoco = Boolean(descontarAlmoco);
    if (observacoes !== undefined)   data.observacoes = observacoes;
    if (motivoCancelamento !== undefined) data.motivoCancelamento = motivoCancelamento;
    if (dataCancelamento !== undefined) data.dataCancelamento = new Date(dataCancelamento);
    if (clienteId !== undefined)     data.clienteId = clienteId;
    if (contatoId !== undefined)     data.contatoId = contatoId;
    if (equipamentoId !== undefined) data.equipamentoId = equipamentoId;
    if (empresaId !== undefined)     data.empresaId = empresaId;
    if (acompanhante !== undefined)  data.acompanhante = acompanhante;

    // Upsert servicos
    if (Servicos !== undefined) {
      await prisma.oSLogisticaServico.deleteMany({ where: { ordemId: id } });
      if (Servicos.length) {
        await prisma.oSLogisticaServico.createMany({
          data: Servicos.map((s: any) => ({ ordemId: id, discriminacao: s.Discriminacao ?? s.discriminacao ?? '' })),
        });
      }
    }

    const os = await prisma.oSLogistica.update({ where: { id }, data, include: { servicos: true } });

    // Upsert escala
    if (EscalaFuncionarios !== undefined || EscalaVeiculos !== undefined) {
      const escalaExistente = await prisma.escalaLogistica.findUnique({ where: { ordemId: id } });
      if (escalaExistente) {
        if (EscalaFuncionarios !== undefined) {
          await prisma.escalaLogisticaFuncionario.deleteMany({ where: { escalaId: escalaExistente.id } });
          if (EscalaFuncionarios.length) {
            await prisma.escalaLogisticaFuncionario.createMany({
              data: EscalaFuncionarios.map((f: any) => ({
                escalaId: escalaExistente.id,
                funcionarioId: f.funcionarioId,
                statusOperacao: f.statusOperacao ?? 0,
                ausente: f.ausente ?? false,
              })),
            });
          }
        }
        if (EscalaVeiculos !== undefined) {
          await prisma.escalaLogisticaVeiculo.deleteMany({ where: { escalaId: escalaExistente.id } });
          if (EscalaVeiculos.length) {
            await prisma.escalaLogisticaVeiculo.createMany({
              data: EscalaVeiculos.map((v: any) => ({
                escalaId: escalaExistente.id,
                veiculoId: v.veiculoId,
                manutencao: v.manutencao ?? false,
              })),
            });
          }
        }
      }
    }

    ok(res, os);
  } catch (e) { err(res, e, 'updateOSLogistica'); }
}

// ─── BAIXAR LOTE ─────────────────────────────────────────────────────────────
export async function baixarLoteOSLogistica(req: Request, res: Response) {
  try {
    const { ids, horaEntrada, horaSaida, horaAlmoco, horaTotal, horaAdicional, horaPadrao } = req.body;
    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ error: 'ids obrigatório' });
    }
    await prisma.oSLogistica.updateMany({
      where: { id: { in: ids.map(Number) } },
      data: {
        status: 2,
        horaEntrada: horaEntrada ?? undefined,
        horaSaida: horaSaida ?? undefined,
        horaAlmoco: horaAlmoco ?? undefined,
        horaTotal: horaTotal ?? undefined,
        horaAdicional: horaAdicional ?? undefined,
        horaPadrao: horaPadrao ?? undefined,
      },
    });
    ok(res, { success: true, count: ids.length });
  } catch (e) { err(res, e, 'baixarLoteOSLogistica'); }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────
export async function deleteOSLogistica(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    await prisma.oSLogistica.delete({ where: { id } });
    ok(res, { success: true });
  } catch (e) { err(res, e, 'deleteOSLogistica'); }
}
