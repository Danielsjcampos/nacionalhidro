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

    // P2: Audit trail — track changed fields
    const existing = await prisma.oSLogistica.findUnique({ where: { id } });
    if (existing) {
      const changes: Record<string, { antes: any; depois: any }> = {};
      Object.keys(data).forEach(k => {
        const antes = (existing as any)[k];
        const depois = data[k];
        if (JSON.stringify(antes) !== JSON.stringify(depois)) {
          changes[k] = { antes, depois };
        }
      });
      if (Object.keys(changes).length > 0) {
        const historico = Array.isArray(existing.historicoAlteracoes) ? [...(existing.historicoAlteracoes as any[])] : [];
        historico.push({ data: new Date().toISOString(), acao: 'ALTERACAO', campos: changes });
        data.historicoAlteracoes = historico;
        data.ultimaAlteracao = new Date();
      }
    }
    // Cancelamento: gravar data
    if (data.status === 0 && !data.dataCancelamento) {
      data.dataCancelamento = new Date();
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
        dataBaixa: new Date(),
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

// ─── P1: CRIAR EM LOTE (date range) ──────────────────────────────────────────
export async function createLoteOSLogistica(req: Request, res: Response) {
  try {
    const { dataInicio, dataFim, diasSemana, ...osData } = req.body;
    if (!dataInicio || !dataFim) return res.status(400).json({ error: 'dataInicio e dataFim obrigatórios.' });

    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    if (fim < inicio) return res.status(400).json({ error: 'dataFim deve ser >= dataInicio.' });

    const diffDays = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > 62) return res.status(400).json({ error: 'Máximo 62 dias por lote.' });

    // Parse diasSemana filter (0=Dom..6=Sab)
    const diasPermitidos: number[] | null = Array.isArray(diasSemana) && diasSemana.length > 0 ? diasSemana.map(Number) : null;

    const created: any[] = [];
    const errors: string[] = [];

    for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
      // Skip days not in diasSemana filter
      if (diasPermitidos && !diasPermitidos.includes(d.getDay())) continue;

      try {
        const { Servicos, EscalaFuncionarios, EscalaVeiculos, ...rest } = osData;
        const numero = (rest.numero ?? 0) + created.length + 1;

        const os = await prisma.oSLogistica.create({
          data: {
            codigo: rest.codigo,
            numero,
            status: 1,
            propostaId: rest.propostaId,
            clienteId: rest.clienteId,
            contatoId: rest.contatoId,
            equipamentoId: rest.equipamentoId,
            empresaId: rest.empresaId,
            tipoCobranca: rest.tipoCobranca ? Number(rest.tipoCobranca) : undefined,
            dataInicial: new Date(d),
            horaInicial: rest.horaInicial,
            diasSemana: diasSemana,
            quantidadeDia: rest.quantidadeDia ? Number(rest.quantidadeDia) : undefined,
            acompanhante: rest.acompanhante,
            horaPadrao: rest.horaPadrao,
            descontarAlmoco: Boolean(rest.descontarAlmoco),
            observacoes: rest.observacoes,
            criadoPorId: rest.criadoPorId,
            dataCriacao: new Date(),
            servicos: Servicos?.length
              ? { create: Servicos.map((s: any) => ({ discriminacao: s.Discriminacao ?? s.discriminacao ?? '' })) }
              : undefined,
            escala: (EscalaFuncionarios?.length || EscalaVeiculos?.length)
              ? {
                create: {
                  status: 1,
                  clienteId: rest.clienteId,
                  equipamentoId: rest.equipamentoId,
                  empresaId: rest.empresaId,
                  data: new Date(d),
                  hora: rest.horaInicial,
                  funcionarios: EscalaFuncionarios?.length
                    ? { create: EscalaFuncionarios.map((f: any) => ({ funcionarioId: f.funcionarioId, statusOperacao: f.statusOperacao ?? 0, ausente: false })) }
                    : undefined,
                  veiculos: EscalaVeiculos?.length
                    ? { create: EscalaVeiculos.map((v: any) => ({ veiculoId: v.veiculoId, manutencao: v.manutencao ?? false })) }
                    : undefined,
                },
              }
              : undefined,
          },
          include: { servicos: true },
        });
        created.push(os);
      } catch (e: any) {
        errors.push(`${d.toLocaleDateString('pt-BR')}: ${e.message}`);
      }
    }

    ok(res, { criadas: created.length, erros: errors.length, ordensServico: created, detalhesErros: errors }, 201);
  } catch (e) { err(res, e, 'createLoteOSLogistica'); }
}

// ─── P1: DADOS PARA IMPRESSÃO EM LOTE ────────────────────────────────────────
export async function imprimirLoteOSLogistica(req: Request, res: Response) {
  try {
    const { ids } = req.query as any;
    if (!ids) return res.status(400).json({ error: 'Parâmetro ids obrigatório (comma-separated).' });

    const idList = String(ids).split(',').map(Number).filter(n => !isNaN(n));
    if (!idList.length) return res.status(400).json({ error: 'Nenhum id válido.' });

    const ordens = await prisma.oSLogistica.findMany({
      where: { id: { in: idList } },
      include: {
        servicos: true,
        escala: { include: { funcionarios: true, veiculos: true } },
      },
      orderBy: { dataInicial: 'asc' },
    });

    ok(res, { osList: ordens, total: ordens.length, printedAt: new Date().toISOString() });
  } catch (e) { err(res, e, 'imprimirLoteOSLogistica'); }
}

// ─── P2: PRECIFICAR OS ───────────────────────────────────────────────────────
export async function precificarOSLogistica(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const {
      precificacaoTotalServico = 0,
      precificacaoTotalHora = 0,
      precificacaoValorExtra = 0,
      precificacaoDesconto = 0,
      precificacaoObservacao,
      servicosHorasAdicionais, // [{servicoId, horas, valor}]
    } = req.body;

    const os = await prisma.oSLogistica.findUnique({ where: { id }, include: { servicos: true } });
    if (!os) return res.status(404).json({ error: 'OS não encontrada.' });
    if (os.status !== 2) return res.status(400).json({ error: 'Apenas OS executadas podem ser precificadas.' });

    // Calculate totals
    const totalServico = Number(precificacaoTotalServico) || 0;
    const totalHora = Number(precificacaoTotalHora) || 0;
    const valorExtra = Number(precificacaoValorExtra) || 0;
    const desconto = Number(precificacaoDesconto) || 0;
    const valorTotal = totalServico + totalHora + valorExtra - desconto;

    // Build audit entry
    const auditEntry = {
      data: new Date().toISOString(),
      acao: 'PRECIFICACAO',
      campos: { totalServico, totalHora, valorExtra, desconto, valorTotal },
    };
    const historico = Array.isArray(os.historicoAlteracoes) ? [...(os.historicoAlteracoes as any[])] : [];
    historico.push(auditEntry);

    const updated = await prisma.oSLogistica.update({
      where: { id },
      data: {
        statusPrecificacao: 'PRECIFICADO',
        dataPrecificacao: new Date(),
        precificacaoTotalServico: totalServico,
        precificacaoTotalHora: totalHora,
        precificacaoValorExtra: valorExtra,
        precificacaoDesconto: desconto,
        precificacaoValorTotal: valorTotal,
        precificacaoObservacao: precificacaoObservacao || null,
        ultimaAlteracao: new Date(),
        historicoAlteracoes: historico,
      },
      include: { servicos: true },
    });

    ok(res, updated);
  } catch (e) { err(res, e, 'precificarOSLogistica'); }
}

// ─── P2: DASHBOARD CONSOLIDADO ───────────────────────────────────────────────
export async function dashboardOSLogistica(req: Request, res: Response) {
  try {
    const { dataInicio, dataFim } = req.query;
    const where: any = {};
    if (dataInicio && dataFim) {
      where.dataInicial = {
        gte: new Date(dataInicio as string),
        lte: new Date(dataFim as string),
      };
    }

    const [total, abertas, executadas, canceladas, precificadas] = await Promise.all([
      prisma.oSLogistica.count({ where }),
      prisma.oSLogistica.count({ where: { ...where, status: 1 } }),
      prisma.oSLogistica.count({ where: { ...where, status: 2 } }),
      prisma.oSLogistica.count({ where: { ...where, status: 0 } }),
      prisma.oSLogistica.count({ where: { ...where, statusPrecificacao: 'PRECIFICADO' } }),
    ]);

    // Totais financeiros
    const financeiro = await prisma.oSLogistica.aggregate({
      where: { ...where, statusPrecificacao: 'PRECIFICADO' },
      _sum: {
        precificacaoValorTotal: true,
        precificacaoDesconto: true,
        precificacaoValorExtra: true,
        precificacaoTotalServico: true,
        precificacaoTotalHora: true,
      },
    });

    // OS em atraso (abertas com dataInicial passada)
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const emAtraso = await prisma.oSLogistica.count({
      where: { ...where, status: 1, dataInicial: { lt: hoje } },
    });

    // Top clientes por volume
    const osPorCliente = await prisma.oSLogistica.groupBy({
      by: ['clienteId'],
      where,
      _count: true,
      orderBy: { _count: { clienteId: 'desc' } },
      take: 10,
    });

    // OS por tipo de cobrança
    const osPorTipo = await prisma.oSLogistica.groupBy({
      by: ['tipoCobranca'],
      where,
      _count: true,
    });

    ok(res, {
      periodo: { dataInicio, dataFim },
      contagem: { total, abertas, executadas, canceladas, precificadas, emAtraso },
      financeiro: {
        valorTotal: financeiro._sum.precificacaoValorTotal ?? 0,
        desconto: financeiro._sum.precificacaoDesconto ?? 0,
        valorExtra: financeiro._sum.precificacaoValorExtra ?? 0,
        totalServico: financeiro._sum.precificacaoTotalServico ?? 0,
        totalHora: financeiro._sum.precificacaoTotalHora ?? 0,
      },
      distribuicao: {
        porCliente: osPorCliente,
        porTipoCobranca: osPorTipo.map((t: any) => ({
          tipo: t.tipoCobranca,
          label: ['Cancelado', 'Hora', 'Diária', 'Frete', 'Fechada'][t.tipoCobranca] ?? 'Outro',
          count: t._count,
        })),
      },
    });
  } catch (e) { err(res, e, 'dashboardOSLogistica'); }
}

// ─── P2: VERIFICAR PENDÊNCIAS (OS em atraso) ─────────────────────────────────
export async function verificarPendenciasOSLogistica(req: Request, res: Response) {
  try {
    const { propostaId, dataMin, dataMax } = req.query;
    const where: any = { status: 1 }; // Abertas

    if (propostaId) where.propostaId = propostaId as string;
    if (dataMin && dataMax) {
      where.dataInicial = {
        gte: new Date(dataMin as string),
        lte: new Date(dataMax as string),
      };
    }

    const pendentes = await prisma.oSLogistica.findMany({
      where,
      select: { id: true, codigo: true, numero: true, dataInicial: true, clienteId: true },
      orderBy: { dataInicial: 'asc' },
    });

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const emAtraso = pendentes.filter(os => os.dataInicial && new Date(os.dataInicial) < hoje);

    ok(res, {
      total: pendentes.length,
      emAtraso: emAtraso.length,
      ordensTexto: emAtraso.map(os => `${os.codigo || ''}/${os.numero || ''}`).join('; '),
      ordens: pendentes,
    });
  } catch (e) { err(res, e, 'verificarPendenciasOSLogistica'); }
}

// ─── P2: HISTÓRICO DE ALTERAÇÕES ─────────────────────────────────────────────
export async function historicoOSLogistica(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const os = await prisma.oSLogistica.findUnique({
      where: { id },
      select: { id: true, codigo: true, numero: true, historicoAlteracoes: true, createdAt: true, updatedAt: true },
    });
    if (!os) return res.status(404).json({ error: 'OS não encontrada.' });

    ok(res, {
      id: os.id,
      codigo: `${os.codigo || ''}/${os.numero || ''}`,
      historico: Array.isArray(os.historicoAlteracoes) ? os.historicoAlteracoes : [],
      createdAt: os.createdAt,
      updatedAt: os.updatedAt,
    });
  } catch (e) { err(res, e, 'historicoOSLogistica'); }
}
