import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { TiquetaqueService } from '../services/tiquetaque.service';

// ─── HELPERS ────────────────────────────────────────────────────
function computeStatus(func: any, now: Date): string {
  // Priority: DESLIGADO > AFASTADO (active afastamento) > FERIAS (active férias) > ATIVO
  if (func.status === 'DESLIGADO' || func.dataDesligamento) return 'DESLIGADO';

  // Check active afastamentos
  const activeAfastamento = func.afastamentos?.find((a: any) =>
    new Date(a.dataInicio) <= now && new Date(a.dataFim) >= now
  );
  if (activeAfastamento) {
    return activeAfastamento.tipo === 'FERIAS' ? 'FERIAS' : 'AFASTADO';
  }

  // Check férias fields
  if (func.feriasInicio && func.feriasFim) {
    const inicio = new Date(func.feriasInicio);
    const fim = new Date(func.feriasFim);
    if (inicio <= now && fim >= now) return 'FERIAS';
  }

  return 'ATIVO';
}

function computeIntegracaoStatus(dataVencimento: Date, now: Date): string {
  const diff = dataVencimento.getTime() - now.getTime();
  const dias = diff / (1000 * 60 * 60 * 24);
  if (dias < 0) return 'VENCIDA';
  if (dias <= 30) return 'VENCENDO';
  return 'VALIDA';
}

// ─── LIST FUNCIONARIOS ──────────────────────────────────────────
export const listFuncionarios = async (req: AuthRequest, res: Response) => {
  try {
    const { search, status, departamento } = req.query;
    const where: any = {};

    if (search) {
      where.OR = [
        { nome: { contains: search as string, mode: 'insensitive' as any } },
        { cargo: { contains: search as string, mode: 'insensitive' as any } },
        { cpf: { contains: search as string, mode: 'insensitive' as any } },
      ];
    }

    if (departamento) {
      where.departamento = departamento as string;
    }

    const list = await prisma.funcionario.findMany({
      where,
      include: {
        afastamentos: {
          orderBy: { dataInicio: 'desc' as any },
          take: 5
        },
        integracoes: {
          include: { cliente: { select: { id: true, nome: true } } },
          orderBy: { dataVencimento: 'asc' as any }
        }
      },
      orderBy: { nome: 'asc' }
    });

    const now = new Date();
    const enriched = list.map((f: any) => {
      const statusComputado = computeStatus(f, now);
      const integracoesEnriched = f.integracoes?.map((i: any) => ({
        ...i,
        statusIntegracao: computeIntegracaoStatus(new Date(i.dataVencimento), now)
      }));

      return {
        ...f,
        statusComputado,
        integracoes: integracoesEnriched,
        totalIntegracoes: f.integracoes?.length || 0,
        integracoesVencidas: integracoesEnriched?.filter((i: any) => i.statusIntegracao === 'VENCIDA').length || 0,
        integracoesVencendo: integracoesEnriched?.filter((i: any) => i.statusIntegracao === 'VENCENDO').length || 0,
      };
    });

    // Filter by computed status if requested
    const filtered = status
      ? enriched.filter((f: any) => f.statusComputado === status)
      : enriched;

    res.json(filtered);
  } catch (error) {
    console.error('List employees error:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
};

// ─── GET FUNCIONARIO ────────────────────────────────────────────
export const getFuncionario = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const func = await prisma.funcionario.findUnique({
      where: { id },
      include: {
        afastamentos: { orderBy: { dataInicio: 'desc' as any } },
        integracoes: {
          include: { cliente: { select: { id: true, nome: true } } },
          orderBy: { dataVencimento: 'asc' as any }
        }
      }
    });
    if (!func) return res.status(404).json({ error: 'Funcionario not found' });

    const now = new Date();
    const enriched = {
      ...func,
      statusComputado: computeStatus(func, now),
      integracoes: (func as any).integracoes?.map((i: any) => ({
        ...i,
        statusIntegracao: computeIntegracaoStatus(new Date(i.dataVencimento), now)
      }))
    };

    res.json(enriched);
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
};

// ─── CREATE FUNCIONARIO ─────────────────────────────────────────
export const createFuncionario = async (req: AuthRequest, res: Response) => {
  try {
    const data = req.body;

    if (data.dataAdmissao) data.dataAdmissao = new Date(data.dataAdmissao);
    if (data.dataNascimento) data.dataNascimento = new Date(data.dataNascimento);
    if (data.feriasInicio) data.feriasInicio = new Date(data.feriasInicio);
    if (data.feriasFim) data.feriasFim = new Date(data.feriasFim);
    if (data.dataDesligamento) data.dataDesligamento = new Date(data.dataDesligamento);

    const func = await prisma.funcionario.create({ data });
    res.status(201).json(func);
  } catch (error: any) {
    console.error('Create employee error:', error);
    res.status(500).json({ error: 'Failed to create employee', details: error.message });
  }
};

// ─── UPDATE FUNCIONARIO ─────────────────────────────────────────
export const updateFuncionario = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const data = req.body;

    if (data.dataAdmissao) data.dataAdmissao = new Date(data.dataAdmissao);
    if (data.dataNascimento) data.dataNascimento = new Date(data.dataNascimento);
    if (data.feriasInicio) data.feriasInicio = new Date(data.feriasInicio);
    if (data.feriasFim) data.feriasFim = new Date(data.feriasFim);
    if (data.dataDesligamento) data.dataDesligamento = new Date(data.dataDesligamento);

    const func = await prisma.funcionario.update({ where: { id }, data });
    res.json(func);
  } catch (error: any) {
    console.error('Update employee error:', error);
    res.status(500).json({ error: 'Failed to update employee', details: error.message });
  }
};

// ─── AFASTAMENTOS CRUD ──────────────────────────────────────────
export const createAfastamento = async (req: AuthRequest, res: Response) => {
  try {
    const funcionarioId = req.params.id as string;
    const { tipo, dataInicio, dataFim, motivo } = req.body;

    const afastamento = await prisma.afastamento.create({
      data: {
        funcionarioId,
        tipo,
        dataInicio: new Date(dataInicio),
        dataFim: new Date(dataFim),
        motivo
      }
    });

    // Update employee status accordingly
    const now = new Date();
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    if (inicio <= now && fim >= now) {
      await prisma.funcionario.update({
        where: { id: funcionarioId },
        data: {
          status: tipo === 'FERIAS' ? 'FERIAS' : 'AFASTADO',
          ...(tipo === 'FERIAS' ? { feriasInicio: inicio, feriasFim: fim } : {}),
          ...(tipo !== 'FERIAS' ? { motivoAfastamento: motivo || tipo } : {})
        }
      });
    }

    res.status(201).json(afastamento);
  } catch (error: any) {
    console.error('Create afastamento error:', error);
    res.status(500).json({ error: 'Failed to create absence record', details: error.message });
  }
};

export const listAfastamentos = async (req: AuthRequest, res: Response) => {
  try {
    const funcionarioId = req.params.id as string;
    const list = await prisma.afastamento.findMany({
      where: { funcionarioId },
      orderBy: { dataInicio: 'desc' }
    });
    res.json(list);
  } catch (error) {
    console.error('List afastamentos error:', error);
    res.status(500).json({ error: 'Failed to fetch absence records' });
  }
};

export const deleteAfastamento = async (req: AuthRequest, res: Response) => {
  try {
    const { afastamentoId } = req.params;
    await prisma.afastamento.delete({ where: { id: afastamentoId as string } });
    res.status(204).send();
  } catch (error) {
    console.error('Delete afastamento error:', error);
    res.status(500).json({ error: 'Failed to delete absence record' });
  }
};

// ─── INTEGRAÇÕES CRUD ───────────────────────────────────────────
export const createIntegracao = async (req: AuthRequest, res: Response) => {
  try {
    const funcionarioId = req.params.id as string;
    const { clienteId, nome, dataEmissao, dataVencimento, observacoes } = req.body;

    const integracao = await prisma.integracaoCliente.create({
      data: {
        funcionarioId,
        clienteId,
        nome,
        dataEmissao: new Date(dataEmissao),
        dataVencimento: new Date(dataVencimento),
        observacoes
      },
      include: { cliente: { select: { id: true, nome: true } } }
    });

    const now = new Date();
    res.status(201).json({
      ...integracao,
      statusIntegracao: computeIntegracaoStatus(new Date(dataVencimento), now)
    });
  } catch (error: any) {
    console.error('Create integracao error:', error);
    res.status(500).json({ error: 'Failed to create integration record', details: error.message });
  }
};

export const listIntegracoes = async (req: AuthRequest, res: Response) => {
  try {
    const funcionarioId = req.params.id as string;
    const list = await prisma.integracaoCliente.findMany({
      where: { funcionarioId },
      include: { cliente: { select: { id: true, nome: true } } },
      orderBy: { dataVencimento: 'asc' }
    });

    const now = new Date();
    const enriched = list.map((i: any) => ({
      ...i,
      statusIntegracao: computeIntegracaoStatus(new Date(i.dataVencimento), now)
    }));

    res.json(enriched);
  } catch (error) {
    console.error('List integracoes error:', error);
    res.status(500).json({ error: 'Failed to fetch integration records' });
  }
};

export const deleteIntegracao = async (req: AuthRequest, res: Response) => {
  try {
    const { integracaoId } = req.params;
    await prisma.integracaoCliente.delete({ where: { id: integracaoId as string } });
    res.status(204).send();
  } catch (error) {
    console.error('Delete integracao error:', error);
    res.status(500).json({ error: 'Failed to delete integration record' });
  }
};

// ─── DISPONIBILIDADE ────────────────────────────────────────────
export const getDisponibilidade = async (req: AuthRequest, res: Response) => {
  try {
    const { data, dataFim, clienteId } = req.query;
    const targetDate = data ? new Date(data as string) : new Date();
    // Use dataFim if provided, otherwise assume single day (targetDate)
    const endDate = dataFim ? new Date(dataFim as string) : targetDate;

    // Normalize to start and end of day for precise comparison
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    let clienteExigencias: string[] = [];
    if (clienteId) {
       const clienteData = await prisma.cliente.findUnique({
          where: { id: clienteId as string },
          select: { integracoesExigidas: true }
       });
       if (clienteData?.integracoesExigidas && Array.isArray(clienteData.integracoesExigidas)) {
          clienteExigencias = clienteData.integracoesExigidas as string[];
       }
    }

    const funcionarios = await prisma.funcionario.findMany({
      where: { ativo: true },
      include: {
        afastamentos: true,
        asosControle: true,
        integracoes: clienteId ? {
          where: { clienteId: clienteId as string },
          include: { cliente: { select: { id: true, nome: true } } }
        } : {
          include: { cliente: { select: { id: true, nome: true } } }
        }
      },
      orderBy: { nome: 'asc' }
    });

    // Get all scheduled scales overlapping the target period
    const escalasConflitantes = await prisma.escala.findMany({
      where: {
        status: { in: ['AGENDADO', 'EM_ANDAMENTO'] },
        OR: [
          // Single day scale that happens exactly in the requested range
          { dataFim: null, data: { gte: startOfDay, lte: endOfDay } },
          // Multi day scale that overlaps with the requested range
          { AND: [{ dataFim: { not: null } }, { data: { lte: endOfDay } }, { dataFim: { gte: startOfDay } }] }
        ]
      }
    });

    const escaladoIds = new Set<string>();
    escalasConflitantes.forEach(escala => {
      if (escala.funcionarios) {
        try {
          const funcs = JSON.parse(JSON.stringify(escala.funcionarios));
          if (Array.isArray(funcs)) {
            funcs.forEach((f: any) => {
              if (f.id) escaladoIds.add(f.id);
            });
          }
        } catch (e) {
          console.error("Failed to parse funcionarios in escala:", escala.id);
        }
      }
    });

    const now = new Date();
    const result = funcionarios.map((f: any) => {
      // Check if on leave overlapping with the target range
      const afastamentoAtivo = f.afastamentos?.find((a: any) =>
        new Date(a.dataInicio) <= endOfDay && new Date(a.dataFim) >= startOfDay
      );

      // Check férias overlapping with target range
      let emFerias = false;
      if (f.feriasInicio && f.feriasFim) {
        emFerias = new Date(f.feriasInicio) <= endOfDay && new Date(f.feriasFim) >= startOfDay;
      }

      // Check integrações for specific client
      const integracoesStatus = f.integracoes?.map((i: any) => ({
        ...i,
        statusIntegracao: computeIntegracaoStatus(new Date(i.dataVencimento), now)
      }));

      // Lógica de verificação de Exigências do Cliente CIAS
      let integracoesStatusText = 'APTO';
      let integracoesPendentes: string[] = [];
      let integracoesVencidas: string[] = [];

      if (clienteId && clienteExigencias.length > 0) {
        // Para cada exigência, buscar se o funcionario tem integração válida
        clienteExigencias.forEach((exigencia) => {
           const hasIntg = integracoesStatus?.find((i: any) => i.tipoIntegracao === exigencia || i.nome === exigencia);
           if (!hasIntg) {
              integracoesPendentes.push(exigencia);
           } else if (hasIntg.statusIntegracao === 'VENCIDA') {
              integracoesVencidas.push(exigencia);
           }
        });

        if (integracoesPendentes.length > 0 || integracoesVencidas.length > 0) {
           integracoesStatusText = 'BLOQUEADO';
        }
      }
      // Fim nova logica


      const hasVencida = integracoesStatus?.some((i: any) => i.statusIntegracao === 'VENCIDA');
      const hasVencendo = integracoesStatus?.some((i: any) => i.statusIntegracao === 'VENCENDO');

      const asoVencido = f.asosControle?.some((aso: any) => aso.dataVencimento && new Date(aso.dataVencimento) < now);

      let disponibilidade = 'DISPONIVEL';
      let motivo = '';
      let cor = '';

      if (f.status === 'DESLIGADO' || f.dataDesligamento) {
        disponibilidade = 'INDISPONIVEL';
        motivo = 'Desligado';
        cor = 'bg-slate-100 text-slate-500';
      } else if (afastamentoAtivo) {
        disponibilidade = 'INDISPONIVEL';
        motivo = afastamentoAtivo.tipo === 'FERIAS' ? 'Férias' : `Afastado: ${afastamentoAtivo.motivo || afastamentoAtivo.tipo}`;
        cor = 'bg-red-100 text-red-700';
      } else if (emFerias) {
        disponibilidade = 'INDISPONIVEL';
        motivo = 'Férias';
        cor = 'bg-red-100 text-red-700';
      } else if (asoVencido) {
        disponibilidade = 'INDISPONIVEL';
        motivo = 'ASO Vencido';
        cor = 'bg-red-100 text-red-700';
      } else if (escaladoIds.has(f.id)) {
        disponibilidade = 'ALERTA';
        motivo = 'Já escalado(a) neste período';
        cor = 'bg-orange-100 text-orange-700';
      } else if (integracoesStatusText === 'BLOQUEADO') {
        disponibilidade = 'INDISPONIVEL';
        motivo = `Falta integração: ${[...integracoesPendentes, ...integracoesVencidas].join(', ')}`;
        cor = 'bg-red-100 text-red-700';
      } else if (hasVencida) {
        disponibilidade = 'ALERTA';
        motivo = 'Integração Cliente Cia vencida';
        cor = 'bg-red-100 text-red-700';
      } else if (hasVencendo) {
        disponibilidade = 'ALERTA';
        motivo = 'Integração vencendo em breve';
        cor = 'bg-amber-100 text-amber-700';
      }

      return {
        id: f.id,
        nome: f.nome,
        cargo: f.cargo,
        departamento: f.departamento,
        disponibilidade,
        motivo,
        cor,
        integracoesStatus: integracoesStatusText,
        integracoesPendentes,
        integracoesVencidas,
        integracoes: integracoesStatus,
        afastamentoAtivo: afastamentoAtivo || null,
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Get disponibilidade error:', error);
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
};

// ─── DASHBOARD COMPLETO DO RH ───────────────────────────────────
export const getResumoRH = async (req: AuthRequest, res: Response) => {
  try {
    const funcionarios = await prisma.funcionario.findMany({
      include: { afastamentos: true, integracoes: true }
    });

    const now = new Date();
    const em30dias = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const ha30dias = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Categorize employees
    const ativos: any[] = [];
    const emFerias: any[] = [];
    const afastados: any[] = [];
    const desligadosRecentes: any[] = [];
    const asoVencendo: any[] = [];
    const experienciaVencendo: any[] = [];
    const cnhVencendo: any[] = [];

    funcionarios.forEach((f: any) => {
      const status = computeStatus(f, now);
      const summary = {
        id: f.id, nome: f.nome, cargo: f.cargo, departamento: f.departamento,
        dataAdmissao: f.dataAdmissao, status, email: f.email
      };

      if (status === 'DESLIGADO') {
        if (f.dataDesligamento && new Date(f.dataDesligamento) >= ha30dias) {
          desligadosRecentes.push({ ...summary, dataDesligamento: f.dataDesligamento });
        }
        return;
      }

      if (status === 'FERIAS') {
        emFerias.push({ ...summary, feriasInicio: f.feriasInicio, feriasFim: f.feriasFim });
      } else if (status === 'AFASTADO') {
        afastados.push({ ...summary, motivoAfastamento: f.motivoAfastamento });
      } else {
        ativos.push(summary);
      }

      // ASO vencendo from integracoes
      f.integracoes?.forEach((i: any) => {
        if (i.dataVencimento) {
          const venc = new Date(i.dataVencimento);
          if (venc <= em30dias && venc >= now) {
            asoVencendo.push({
              ...summary,
              clienteNome: i.clienteId,
              dataVencimento: i.dataVencimento,
              diasRestantes: Math.ceil((venc.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            });
          }
        }
      });

      // Experiência vencendo (45 e 90 dias após admissão)
      if (f.dataAdmissao) {
        const admissao = new Date(f.dataAdmissao);
        const dias45 = new Date(admissao.getTime() + 45 * 24 * 60 * 60 * 1000);
        const dias90 = new Date(admissao.getTime() + 90 * 24 * 60 * 60 * 1000);
        const diasTrabalho = Math.floor((now.getTime() - admissao.getTime()) / (1000 * 60 * 60 * 24));

        if (diasTrabalho <= 90) {
          let tipoExperiencia = '';
          let dataVencimentoExp: Date | null = null;
          let diasRestantes = 0;

          if (diasTrabalho < 45) {
            tipoExperiencia = '1ª Experiência (45 dias)';
            dataVencimentoExp = dias45;
            diasRestantes = Math.ceil((dias45.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          } else if (diasTrabalho < 90) {
            tipoExperiencia = '2ª Experiência (90 dias)';
            dataVencimentoExp = dias90;
            diasRestantes = Math.ceil((dias90.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          }

          if (tipoExperiencia && diasRestantes <= 15 && diasRestantes > 0) {
            experienciaVencendo.push({
              ...summary, tipoExperiencia,
              dataVencimento: dataVencimentoExp, diasRestantes, diasTrabalho
            });
          }
        }
      }

      // CNH vencendo (próximos 60 dias)
      if (f.dataVencimentoCNH) {
        const vencCNH = new Date(f.dataVencimentoCNH);
        const em60dias = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
        if (vencCNH <= em60dias && vencCNH >= now) {
          cnhVencendo.push({
            ...summary,
            dataVencimentoCNH: f.dataVencimentoCNH,
            diasRestantes: Math.ceil((vencCNH.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          });
        }
      }
    });

    // Count integrações
    let integracoesVencidas = 0;
    let integracoesVencendo = 0;
    funcionarios.forEach((f: any) => {
      f.integracoes?.forEach((i: any) => {
        const st = computeIntegracaoStatus(new Date(i.dataVencimento), now);
        if (st === 'VENCIDA') integracoesVencidas++;
        if (st === 'VENCENDO') integracoesVencendo++;
      });
    });

    // ═══════ NEW: Data from new RH models ═══════

    // Admissões em andamento
    const admissoesEmAndamento = await (prisma as any).admissao.count({
      where: { etapa: { not: 'CONTRATADO' } }
    });
    const admissoesRecentes = await (prisma as any).admissao.findMany({
      where: { etapa: { notIn: ['CONTRATADO', 'CANCELADO'] } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, nome: true, cargo: true, etapa: true, dataAdmissaoPrevista: true }
    });

    // Férias do ControleFerias model
    const feriasAtivas = await (prisma as any).controleFerias.count({ where: { status: 'EM_FERIAS' } });
    const feriasVencendo = await (prisma as any).controleFerias.findMany({
      where: {
        status: 'A_VENCER',
        dataVencimento: { lte: em30dias }
      },
      include: { funcionario: { select: { id: true, nome: true, cargo: true } } },
      orderBy: { dataVencimento: 'asc' },
      take: 10,
    });

    // ASOs from ASOControle model
    const asosVencendoNew = await (prisma as any).aSOControle.findMany({
      where: {
        dataVencimento: { lte: em30dias, gte: now }
      },
      include: { funcionario: { select: { id: true, nome: true, cargo: true } } },
      orderBy: { dataVencimento: 'asc' },
      take: 15,
    });

    // Desligamentos em andamento
    const desligamentosEmAndamento = await (prisma as any).desligamento.count({
      where: { etapa: { not: 'CONCLUIDO' } }
    });

    res.json({
      total: funcionarios.length,
      contagem: {
        ativos: ativos.length,
        ferias: emFerias.length,
        afastados: afastados.length,
        desligados: funcionarios.filter((f: any) => computeStatus(f, now) === 'DESLIGADO').length,
        integracoesVencidas,
        integracoesVencendo,
        admissoesEmAndamento,
        feriasAtivas,
        desligamentosEmAndamento,
      },
      alertas: {
        asoVencendo: [...asoVencendo, ...asosVencendoNew.map((a: any) => ({
          id: a.funcionario?.id, nome: a.funcionario?.nome, cargo: a.funcionario?.cargo,
          tipo: a.tipo, dataVencimento: a.dataVencimento,
          diasRestantes: Math.ceil((new Date(a.dataVencimento).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        }))],
        experienciaVencendo,
        desligadosRecentes,
        cnhVencendo,
        admissoesEmAndamento: admissoesRecentes,
        feriasVencendo: feriasVencendo.map((f: any) => ({
          id: f.funcionario?.id, nome: f.funcionario?.nome, cargo: f.funcionario?.cargo,
          dataVencimento: f.dataVencimento,
          diasRestantes: Math.ceil((new Date(f.dataVencimento).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        })),
      },
      listas: {
        ativos,
        emFerias,
        afastados,
        admissoesRecentes,
      }
    });
  } catch (error) {
    console.error('Get RH dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch RH dashboard' });
  }
};

// ─── PONTO ELETRÔNICO (TIQUETAQUE) ──────────────────────────────
export const getAttendanceToday = async (req: AuthRequest, res: Response) => {
  try {
    const attendance = await TiquetaqueService.getAttendanceToday();
    res.json(attendance);
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance data' });
  }
};
// ─── COMPLIANCE CHECK ───────────────────────────────────────────
export const checkCompliance = async (req: AuthRequest, res: Response) => {
  try {
    const { funcionarioId } = req.params;
    const { clienteId, osId } = req.query;

    const now = new Date();
    
    // 1. Get Employee with ASO and Integrations
    const funcionario = await prisma.funcionario.findUnique({
      where: { id: funcionarioId },
      include: {
        asosControle: {
          orderBy: { dataVencimento: 'desc' as any },
          take: 1
        },
        integracoes: true
      }
    });

    if (!funcionario) return res.status(404).json({ error: 'Funcionario not found' });

    const errors: string[] = [];
    const warnings: string[] = [];

    // 2. Check ASO
    const latestAso = funcionario.asosControle?.[0];
    if (!latestAso) {
      errors.push('ASO não encontrado para este funcionário.');
    } else if (latestAso.dataVencimento && new Date(latestAso.dataVencimento) < now) {
      errors.push(`ASO Vencido em ${new Date(latestAso.dataVencimento).toLocaleDateString('pt-BR')}`);
    } else if (latestAso.dataVencimento) {
      const dias = (new Date(latestAso.dataVencimento).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      if (dias <= 15) warnings.push(`ASO vence em ${Math.ceil(dias)} dias.`);
    }

    // 3. Check Integrations for specific client/OS
    let targetClienteId = clienteId as string;
    if (osId) {
      const os = await prisma.oS.findUnique({ 
        where: { id: osId as string },
        select: { clienteId: true }
      });
      if (os) targetClienteId = os.clienteId;
    }

    if (targetClienteId) {
      const cliente = await prisma.cliente.findUnique({
        where: { id: targetClienteId },
        select: { nome: true, integracoesExigidas: true }
      });

      if (cliente && cliente.integracoesExigidas && Array.isArray(cliente.integracoesExigidas)) {
        const exigencias = cliente.integracoesExigidas as string[];
        exigencias.forEach(ex => {
          const hasIntg = funcionario.integracoes.find(i => 
            (i.tipoIntegracao === ex || i.nome === ex) && 
            i.clienteId === targetClienteId &&
            i.status === 'VALIDO'
          );

          if (!hasIntg) {
            errors.push(`Falta Integração Exigida: ${ex} p/ ${cliente.nome}`);
          } else if (hasIntg.dataVencimento && new Date(hasIntg.dataVencimento) < now) {
            errors.push(`Integração ${ex} Vencida p/ ${cliente.nome}`);
          }
        });
      }
    }

    res.json({
      compliant: errors.length === 0,
      errors,
      warnings,
      funcionario: {
        nome: funcionario.nome,
        cargo: funcionario.cargo
      }
    });

  } catch (error) {
    console.error('Compliance check error:', error);
    res.status(500).json({ error: 'Failed to perform compliance check' });
  }
};
