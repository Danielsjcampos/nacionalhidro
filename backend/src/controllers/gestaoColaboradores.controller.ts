import { Request, Response } from 'express';
import { sendFeedbackExperiencia } from '../services/email.service';
import prisma from '../lib/prisma';

// ──────────────────────────────────────────────────────────
// Helper: compute status based on dates
// ──────────────────────────────────────────────────────────

function computeStatus(func: any): string {
  const now = new Date();

  // Desligado
  if (func.dataDesligamento && new Date(func.dataDesligamento) <= now) return 'DESLIGADO';
  if (func.status === 'DESLIGADO') return 'DESLIGADO';

  // Férias
  if (func.feriasInicio && func.feriasFim) {
    const inicio = new Date(func.feriasInicio);
    const fim = new Date(func.feriasFim);
    if (now >= inicio && now <= fim) return 'FERIAS';
  }

  // Afastado
  if (func.status === 'AFASTADO' || func.motivoAfastamento) return 'AFASTADO';

  // Novo Colaborador
  if (!func.onboardingConcluido) return 'NOVO_COLABORADOR';

  // Experiência
  const dataAdm = new Date(func.dataAdmissao);
  const diff = Math.floor((now.getTime() - dataAdm.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diff <= 45 && func.statusExperiencia45 !== 'APROVADO') return 'EXPERIENCIA_40';
  if (diff <= 90 && func.statusExperiencia90 !== 'APROVADO') return 'EXPERIENCIA_90';
  
  return 'EFETIVADO';
}

function diasRestantes(dataAdmissao: Date, limiteDias: number): number {
  const now = new Date();
  const diff = Math.floor((now.getTime() - new Date(dataAdmissao).getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, limiteDias - diff);
}

// ──────────────────────────────────────────────────────────
// GET /gestao-colaboradores/dashboard — KPIs
// ──────────────────────────────────────────────────────────

export async function getDashboard(req: Request, res: Response) {
  try {
    const funcionarios = await prisma.funcionario.findMany({
      where: { ativo: true },
      select: {
        id: true, nome: true, cargo: true, departamento: true, categoria: true,
        dataAdmissao: true, status: true, feriasInicio: true, feriasFim: true,
        motivoAfastamento: true, dataDesligamento: true, tipoContrato: true,
        statusExperiencia45: true, statusExperiencia90: true,
      }
    });

    const now = new Date();
    let novos = 0, ativos = 0, experiencia40 = 0, experiencia90 = 0, efetivados = 0;
    let afastados = 0, emFerias = 0, emDesligamento = 0;
    const alertas: any[] = [];

    for (const f of funcionarios) {
      const st = computeStatus(f);
      switch (st) {
        case 'NOVO_COLABORADOR':
          novos++;
          ativos++;
          break;
        case 'EXPERIENCIA_40':
          experiencia40++;
          ativos++;
          const dias45 = diasRestantes(f.dataAdmissao, 45); // 45 no BD
          if (dias45 <= 10) alertas.push({ tipo: 'EXPERIENCIA_40', funcionarioId: f.id, nome: f.nome, diasRestantes: dias45 });
          break;
        case 'EXPERIENCIA_90':
          experiencia90++;
          ativos++;
          const dias90 = diasRestantes(f.dataAdmissao, 90);
          if (dias90 <= 10) alertas.push({ tipo: 'EXPERIENCIA_90', funcionarioId: f.id, nome: f.nome, diasRestantes: dias90 });
          break;
        case 'EFETIVADO': efetivados++; ativos++; break;
        case 'FERIAS': emFerias++; break;
        case 'AFASTADO': afastados++; break;
        case 'DESLIGADO': emDesligamento++; break;
      }
    }

    // Admissões em andamento (pipeline)
    const admissoesAndamento = await prisma.admissao.count({
      where: { etapa: { not: 'CONTRATADO' } }
    });

    // Desligamentos em andamento
    const desligamentosAndamento = await prisma.desligamento.count({
      where: { etapa: { not: 'CONCLUIDO' } }
    });
    
    // Fetch external alerts (ASO, Treinamentos, CNH)
    const externalAlerts = await internalFetchAlertasVencimento();
    const allAlertas = [...alertas, ...externalAlerts].sort((a, b) => a.diasRestantes - b.diasRestantes);

    res.json({
      novos,
      ativos,
      experiencia40,
      experiencia90,
      efetivados,
      afastados,
      emFerias,
      emDesligamento,
      admissoesAndamento,
      desligamentosAndamento,
      totalAlertas: allAlertas.length,
      alertas: allAlertas.slice(0, 20)
    });
  } catch (error: any) {
    console.error('[GestaoColaboradores] dashboard error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao carregar dashboard' } });
  }
}

// ──────────────────────────────────────────────────────────
// GET /gestao-colaboradores — lista com filtros
// ──────────────────────────────────────────────────────────

export async function listColaboradores(req: Request, res: Response) {
  try {
    const { status, departamento, categoria, search, page = '1', limit = '50' } = req.query;

    const where: any = { ativo: true };
    if (departamento) where.departamento = departamento as string;
    if (categoria) where.categoria = categoria as string;
    if (search) {
      where.OR = [
        { nome: { contains: search as string, mode: 'insensitive' } },
        { cpf: { contains: search as string } },
        { cargo: { contains: search as string, mode: 'insensitive' } },
        { matricula: { contains: search as string } },
      ];
    }

    // Include desligados if explicitly filtered
    if (status === 'DESLIGADO') {
      where.ativo = undefined;
      where.OR = undefined;
      where.dataDesligamento = { not: null };
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [funcionarios, total] = await Promise.all([
      prisma.funcionario.findMany({
        where,
        select: {
          id: true, nome: true, cargo: true, departamento: true, categoria: true,
          dataAdmissao: true, status: true, feriasInicio: true, feriasFim: true,
          motivoAfastamento: true, dataDesligamento: true, email: true, telefone: true,
          cpf: true, matricula: true, tipoContrato: true, cnh: true, categoriaCNH: true,
          dataVencimentoCNH: true, mopp: true, dataVencimentoMOPP: true,
          // Adicionais de Gestão DP
          onboardingConcluido: true,
          dadosOnboarding: true,
          statusExperiencia45: true,
          statusExperiencia90: true,
          anotacoesReferentesExperiencia: true,
          efetivacaoConcluida: true,
          dadosEfetivacao: true,
          desligamentos: {
            select: { id: true, concluido: true, etapa: true, tipoDesligamento: true },
            where: { concluido: false },
            take: 1
          },
          // Extra Sprint 17 fields
          linkPastaDocumentos: true,
          codESocial: true,
          armarioVestiario: true,
          equipamentosAdministrativos: true,
          previsaoRetornoINSS: true,
          statusAsoDemissional: true,
          // Relations summary
          _count: {
            select: {
              integracoes: true,
              asosControle: true,
              treinamentos: true,
              episEntregues: true,
            }
          }
        },
        orderBy: { nome: 'asc' },
        skip,
        take,
      }),
      prisma.funcionario.count({ where })
    ]);

    // Enrich with computed status
    const enriched = funcionarios.map(f => ({
      ...f,
      statusComputado: computeStatus(f),
      diasNaEmpresa: Math.floor((new Date().getTime() - new Date(f.dataAdmissao).getTime()) / (1000 * 60 * 60 * 24)),
    }));

    // Filter by computed status if requested
    let result = enriched;
    if (status && status !== 'DESLIGADO' && status !== 'TODOS') {
      result = enriched.filter(f => f.statusComputado === status);
    }

    res.json({
      data: result,
      pagination: { total, page: parseInt(page as string), limit: take, pages: Math.ceil(total / take) }
    });
  } catch (error: any) {
    console.error('[GestaoColaboradores] list error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao listar colaboradores' } });
  }
}

// ──────────────────────────────────────────────────────────
// GET /gestao-colaboradores/admissoes-andamento
// ──────────────────────────────────────────────────────────

export async function admissoesAndamento(req: Request, res: Response) {
  try {
    const admissoes = await prisma.admissao.findMany({
      where: { etapa: { not: 'CONTRATADO' } },
      select: {
        id: true, nome: true, cargo: true, etapa: true,
        dataAdmissaoPrevista: true, updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    res.json(admissoes);
  } catch (error: any) {
    console.error('[GestaoColaboradores] admissoes error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao listar admissões' } });
  }
}

// ──────────────────────────────────────────────────────────
// PATCH /gestao-colaboradores/:id
// ──────────────────────────────────────────────────────────

export async function updateColaborador(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const data = req.body;

    // Check if the collaborator exists
    const colaborador = await prisma.funcionario.findUnique({
      where: { id }
    });

    if (!colaborador) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Colaborador não encontrado' } });
    }

    // Update collaborator
    const updated = await prisma.funcionario.update({
      where: { id },
      data: {
        alocacaoAtividade: data.alocacaoAtividade !== undefined ? data.alocacaoAtividade : undefined,
        valorRefeicao: data.valorRefeicao !== undefined ? data.valorRefeicao : undefined,
        valorJantar: data.valorJantar !== undefined ? data.valorJantar : undefined,
        regimeRefeicao: data.regimeRefeicao !== undefined ? data.regimeRefeicao : undefined,
        valeAlimentacao: data.valeAlimentacao !== undefined ? data.valeAlimentacao : undefined,
        premioAssiduidade: data.premioAssiduidade !== undefined ? data.premioAssiduidade : undefined,
        statusExperiencia45: data.statusExperiencia45 !== undefined ? data.statusExperiencia45 : undefined,
        dataFeedback45: data.dataFeedback45 !== undefined ? new Date(data.dataFeedback45) : undefined,
        statusExperiencia90: data.statusExperiencia90 !== undefined ? data.statusExperiencia90 : undefined,
        dataFeedback90: data.dataFeedback90 !== undefined ? new Date(data.dataFeedback90) : undefined,
        seguroVidaAtivo: data.seguroVidaAtivo !== undefined ? data.seguroVidaAtivo : undefined,
        convenioMedico: data.convenioMedico !== undefined ? data.convenioMedico : undefined,
        status: data.status !== undefined ? data.status : undefined, // For Efetivar, Afastar, etc
        
        // DP Onboarding fields
        onboardingConcluido: data.onboardingConcluido !== undefined ? data.onboardingConcluido : undefined,
        dadosOnboarding: data.dadosOnboarding !== undefined ? data.dadosOnboarding : undefined,
        
        // Log Feedback
        anotacoesReferentesExperiencia: data.anotacoesReferentesExperiencia !== undefined ? data.anotacoesReferentesExperiencia : undefined,

        // Efetivado fields
        efetivacaoConcluida: data.efetivacaoConcluida !== undefined ? data.efetivacaoConcluida : undefined,
        dadosEfetivacao: data.dadosEfetivacao !== undefined ? data.dadosEfetivacao : undefined,
        
        // Sprint 17 Campos Extras
        linkPastaDocumentos: data.linkPastaDocumentos !== undefined ? data.linkPastaDocumentos : undefined,
        codESocial: data.codESocial !== undefined ? data.codESocial : undefined,
        armarioVestiario: data.armarioVestiario !== undefined ? data.armarioVestiario : undefined,
        equipamentosAdministrativos: data.equipamentosAdministrativos !== undefined ? data.equipamentosAdministrativos : undefined,
        previsaoRetornoINSS: data.previsaoRetornoINSS ? new Date(data.previsaoRetornoINSS) : undefined,
        statusAsoDemissional: data.statusAsoDemissional !== undefined ? data.statusAsoDemissional : undefined,
      }
    });

    // Handle Afastamento creation
    if (data.afastamento) {
      const { tipo, dataInicio, dataFim, motivo } = data.afastamento;
      await prisma.afastamento.create({
        data: {
          funcionarioId: id,
          tipo,
          dataInicio: new Date(dataInicio),
          dataFim: new Date(dataFim),
          motivo
        }
      });

      // Automatically update status to AFASTADO
      await prisma.funcionario.update({
        where: { id },
        data: { status: 'AFASTADO', previsaoRetornoINSS: data.previsaoRetornoINSS ? new Date(data.previsaoRetornoINSS) : undefined }
      });
    }

    // Handle Desligamento creation
    if (data.desligamento) {
      const { tipoDesligamento, dataDesligamento, motivoDesligamento } = data.desligamento;
      await prisma.desligamento.create({
        data: {
          funcionarioId: id,
          nome: updated.nome,
          cargo: updated.cargo,
          cpf: updated.cpf,
          tipoDesligamento,
          dataDesligamento: new Date(dataDesligamento),
          motivoDesligamento,
          etapa: 'NOVA_SOLICITACAO'
        }
      });

      // Update status to DESLIGADO and set termination date
      await prisma.funcionario.update({
        where: { id },
        data: { 
          status: 'DESLIGADO',
          dataDesligamento: new Date(dataDesligamento)
        }
      });
    }

    // Handle Desligamento checklist update
    if (data.updateChecklistDesligamento) {
      const { desligamentoId, concluido } = data.updateChecklistDesligamento;
      await prisma.desligamento.update({
        where: { id: desligamentoId },
        data: { 
          concluido: concluido !== undefined ? concluido : undefined,
          etapa: concluido ? 'CONCLUIDO' : undefined
        }
      });
    }

    // Send email logic for feedback request (if action is requested by frontend)
    if (data.requestFeedback === '45' || data.requestFeedback === '90') {
      const diasRestantesValue = diasRestantes(updated.dataAdmissao, data.requestFeedback === '45' ? 45 : 90);
      
      // In a real scenario we'd query the manager's email.
      // We will assume the frontend sends the manager's email or we notify a generic address.
      const gestorEmail = data.gestorEmail || 'gestor@nacionalhidro.com.br';
      
      await sendFeedbackExperiencia(
        { nome: updated.nome, cargo: updated.cargo, cpf: updated.cpf },
        gestorEmail,
        data.requestFeedback,
        diasRestantesValue
      );
    }

    res.json(updated);
  } catch (error: any) {
    console.error('[GestaoColaboradores] update error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao atualizar colaborador' } });
  }
}

// ──────────────────────────────────────────────────────────
// GET /gestao-colaboradores/alertas-vencimento
// ──────────────────────────────────────────────────────────

async function internalFetchAlertasVencimento() {
  const today = new Date();
  const in30Days = new Date(); in30Days.setDate(today.getDate() + 30);
  const in60Days = new Date(); in60Days.setDate(today.getDate() + 60);

  const alertas: any[] = [];

  // 1. ASO Vencido ou Próximo de Vencer
  const asos = await prisma.aSOControle.findMany({
    where: { dataVencimento: { lte: in30Days }, funcionario: { ativo: true } },
    include: { funcionario: { select: { id: true, nome: true, cargo: true } } }
  });

  asos.forEach(aso => {
    if (!aso.dataVencimento) return;
    const diff = Math.floor((new Date(aso.dataVencimento).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    alertas.push({
      id: aso.id, funcionarioId: aso.funcionarioId, nome: aso.funcionario.nome,
      tipo: 'ASO', detalhe: aso.tipo, dataVencimento: aso.dataVencimento, diasRestantes: diff
    });
  });

  // 2. Treinamentos Vencidos ou Próximos de Vencer
  const treinamentos = await prisma.treinamentoRealizado.findMany({
    where: { dataVencimento: { lte: in60Days }, funcionario: { ativo: true } },
    include: { funcionario: { select: { id: true, nome: true } }, treinamento: { select: { nome: true } } }
  });

  treinamentos.forEach(t => {
    if (!t.dataVencimento) return;
    const diff = Math.floor((new Date(t.dataVencimento).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    alertas.push({
      id: t.id, funcionarioId: t.funcionarioId, nome: t.funcionario.nome,
      tipo: 'TREINAMENTO', detalhe: t.treinamento.nome, dataVencimento: t.dataVencimento, diasRestantes: diff
    });
  });

  // 3. CNH / MOPP Próximos de Vencer
  const funcionariosCNH = await prisma.funcionario.findMany({
    where: { ativo: true, OR: [{ dataVencimentoCNH: { lte: in30Days } }, { dataVencimentoMOPP: { lte: in30Days } }] },
    select: { id: true, nome: true, dataVencimentoCNH: true, dataVencimentoMOPP: true }
  });

  funcionariosCNH.forEach(f => {
    if (f.dataVencimentoCNH) {
      const diff = Math.floor((new Date(f.dataVencimentoCNH).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diff <= 30) alertas.push({
        id: f.id, funcionarioId: f.id, nome: f.nome, tipo: 'CNH', detalhe: 'Renovação CNH',
        dataVencimento: f.dataVencimentoCNH, diasRestantes: diff
      });
    }
    if (f.dataVencimentoMOPP) {
      const diff = Math.floor((new Date(f.dataVencimentoMOPP).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diff <= 30) alertas.push({
        id: f.id, funcionarioId: f.id, nome: f.nome, tipo: 'MOPP', detalhe: 'Renovação MOPP',
        dataVencimento: f.dataVencimentoMOPP, diasRestantes: diff
      });
    }
  });

  return alertas;
}

export async function getAlertasVencimento(req: Request, res: Response) {
  try {
    const alertas = await internalFetchAlertasVencimento();
    alertas.sort((a, b) => a.diasRestantes - b.diasRestantes);
    res.json(alertas);
  } catch (error: any) {
    console.error('[GestaoColaboradores] alertas error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar alertas de vencimento' } });
  }
}

// ──────────────────────────────────────────────────────────
// GET /gestao-colaboradores/tiquetaque/dashboard-hoje
// ──────────────────────────────────────────────────────────

import { TiquetaqueService } from '../services/tiquetaque.service';

export async function getTiquetaqueDashboard(req: Request, res: Response) {
  try {
    const data = await TiquetaqueService.getAttendanceToday();
    res.json(data);
  } catch (error: any) {
    console.error('[GestaoColaboradores] Tiquetaque dashboard error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar dados do TiqueTaque' } });
  }
}
