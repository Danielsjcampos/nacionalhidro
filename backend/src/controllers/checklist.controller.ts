import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// ─── TEMPLATES ──────────────────────────────────────────────────────

export const listTemplates = async (req: AuthRequest, res: Response) => {
  try {
    const templates = await prisma.checklistTemplate.findMany({
      include: {
        grupos: {
          orderBy: { ordem: 'asc' },
          include: {
            itens: { orderBy: { ordem: 'asc' } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(templates);
  } catch (error) {
    console.error('List checklist templates error:', error);
    res.status(500).json({ error: 'Failed to fetch checklist templates' });
  }
};

export const createTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const { nome, tipo, grupos } = req.body;
    // grupos: [{ nome, ordem, itens: [{ nome, ordem }] }]

    const template = await prisma.checklistTemplate.create({
      data: {
        nome,
        tipo: tipo || 'VEICULO',
        grupos: {
          create: (grupos || []).map((g: any, gi: number) => ({
            nome: g.nome,
            ordem: g.ordem ?? gi,
            itens: {
              create: (g.itens || []).map((item: any, ii: number) => ({
                nome: item.nome,
                ordem: item.ordem ?? ii
              }))
            }
          }))
        }
      },
      include: {
        grupos: {
          include: { itens: true },
          orderBy: { ordem: 'asc' }
        }
      }
    });

    res.status(201).json(template);
  } catch (error: any) {
    console.error('Create checklist template error:', error);
    res.status(500).json({ error: 'Failed to create template', details: error.message });
  }
};

export const updateTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { nome, tipo, ativo, grupos } = req.body;

    // Update template basic info
    const updated = await prisma.checklistTemplate.update({
      where: { id },
      data: {
        ...(nome !== undefined && { nome }),
        ...(tipo !== undefined && { tipo }),
        ...(ativo !== undefined && { ativo }),
      }
    });

    // If grupos provided, rebuild them (delete old + create new)
    if (Array.isArray(grupos)) {
      await prisma.checklistGrupo.deleteMany({ where: { templateId: id } });

      for (let gi = 0; gi < grupos.length; gi++) {
        const g = grupos[gi];
        await prisma.checklistGrupo.create({
          data: {
            templateId: id,
            nome: g.nome,
            ordem: g.ordem ?? gi,
            itens: {
              create: (g.itens || []).map((item: any, ii: number) => ({
                nome: item.nome,
                ordem: item.ordem ?? ii
              }))
            }
          }
        });
      }
    }

    // Re-fetch with relations
    const result = await prisma.checklistTemplate.findUnique({
      where: { id },
      include: {
        grupos: {
          orderBy: { ordem: 'asc' },
          include: { itens: { orderBy: { ordem: 'asc' } } }
        }
      }
    });

    res.json(result);
  } catch (error: any) {
    console.error('Update checklist template error:', error);
    res.status(500).json({ error: 'Failed to update template', details: error.message });
  }
};

export const deleteTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.checklistTemplate.delete({ where: { id } });
    res.status(204).send();
  } catch (error: any) {
    console.error('Delete checklist template error:', error);
    res.status(500).json({ error: 'Failed to delete template', details: error.message });
  }
};

// ─── EXECUÇÃO ───────────────────────────────────────────────────────

export const executeChecklist = async (req: AuthRequest, res: Response) => {
  try {
    const { templateId, veiculoId, motoristaNome, motoristaCpf, tipo } = req.body;

    if (!templateId) {
      return res.status(400).json({ error: 'templateId é obrigatório' });
    }

    // Load template to snapshot item names
    const template = await prisma.checklistTemplate.findUnique({
      where: { id: templateId },
      include: {
        grupos: {
          orderBy: { ordem: 'asc' },
          include: { itens: { orderBy: { ordem: 'asc' } } }
        }
      }
    });
    if (!template) return res.status(404).json({ error: 'Template não encontrado' });

    const execucao = await prisma.checklistExecucao.create({
      data: {
        templateId,
        veiculoId: veiculoId || undefined,
        motoristaNome,
        motoristaCpf,
        tipo: tipo || 'SAIDA',
        status: 'EM_ANDAMENTO'
      }
    });

    // Return template structure so frontend can render the form
    res.status(201).json({
      execucao,
      template: {
        nome: template.nome,
        grupos: template.grupos
      }
    });
  } catch (error: any) {
    console.error('Execute checklist error:', error);
    res.status(500).json({ error: 'Failed to start checklist', details: error.message });
  }
};

export const completeChecklist = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { respostas, observacaoGeral, criarManutencao } = req.body;
    // respostas: [{ itemNome, grupoNome, status, observacao?, fotoUrl? }]

    // Save all responses
    if (Array.isArray(respostas) && respostas.length > 0) {
      await prisma.checklistResposta.createMany({
        data: respostas.map((r: any) => ({
          execucaoId: id,
          itemNome: r.itemNome,
          grupoNome: r.grupoNome,
          status: r.status,
          observacao: r.observacao || null,
          fotoUrl: r.fotoUrl || null
        }))
      });
    }

    // Mark as completed
    const execucao = await prisma.checklistExecucao.update({
      where: { id },
      data: {
        status: 'CONCLUIDO',
        observacaoGeral: observacaoGeral || null,
        completadoEm: new Date()
      },
      include: { respostas: true, veiculo: true }
    });

    // Check if any DEFEITO items exist
    const defeitos = (respostas || []).filter((r: any) => r.status === 'DEFEITO');

    // Auto-create maintenance order if defeito found and flag is set
    let manutencaoCriada = null;
    if (criarManutencao && defeitos.length > 0 && execucao.veiculoId) {
      const descricaoDefeitos = defeitos
        .map((d: any) => `[${d.grupoNome}] ${d.itemNome}${d.observacao ? ': ' + d.observacao : ''}`)
        .join('; ');

      manutencaoCriada = await prisma.manutencao.create({
        data: {
          veiculoId: execucao.veiculoId,
          descricao: `Checklist identificou defeitos: ${descricaoDefeitos}`,
          prioridade: defeitos.length >= 3 ? 'ALTA' : 'MEDIA',
          status: 'PENDENTE',
          statusFinanceiro: 'PENDENTE'
        }
      });

      // Mark vehicle as MANUTENCAO
      await prisma.veiculo.update({
        where: { id: execucao.veiculoId },
        data: { status: 'MANUTENCAO' }
      });
    }

    res.json({
      execucao,
      totalDefeitos: defeitos.length,
      manutencaoCriada
    });
  } catch (error: any) {
    console.error('Complete checklist error:', error);
    res.status(500).json({ error: 'Failed to complete checklist', details: error.message });
  }
};

// ─── HISTÓRICO DO VEÍCULO ───────────────────────────────────────────

export const getHistoricoVeiculo = async (req: AuthRequest, res: Response) => {
  try {
    const veiculoId = req.params.id as string;

    const [veiculo, checklists, manutencoes] = await Promise.all([
      prisma.veiculo.findUnique({ where: { id: veiculoId } }),
      prisma.checklistExecucao.findMany({
        where: { veiculoId, status: 'CONCLUIDO' },
        include: { respostas: true, template: { select: { nome: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50
      }),
      prisma.manutencao.findMany({
        where: { veiculoId },
        include: { pecasUtilizadas: true },
        orderBy: { createdAt: 'desc' },
        take: 50
      })
    ]) as any[];

    if (!veiculo) return res.status(404).json({ error: 'Veículo não encontrado' });

    // Build unified timeline
    const timeline: any[] = [];

    for (const ck of checklists) {
      const defeitos = ck.respostas.filter(r => r.status === 'DEFEITO').length;
      const atencao = ck.respostas.filter(r => r.status === 'ATENCAO').length;
      timeline.push({
        tipo: 'CHECKLIST',
        data: ck.completadoEm || ck.createdAt,
        descricao: `${ck.template?.nome || 'Checklist'} (${ck.tipo})`,
        detalhes: {
          totalItens: ck.respostas.length,
          defeitos,
          atencao,
          motorista: ck.motoristaNome
        },
        id: ck.id
      });
    }

    for (const m of manutencoes) {
      const custoTotal = Number(m.valorTotal || 0);
      timeline.push({
        tipo: 'MANUTENCAO',
        data: m.createdAt,
        descricao: m.descricao || 'Manutenção',
        detalhes: {
          status: m.status,
          prioridade: m.prioridade,
          custoTotal,
          pecas: m.pecasUtilizadas.map((p: any) => ({
            nome: p.descricao,
            quantidade: Number(p.quantidade),
            valor: Number(p.valorTotal)
          }))
        },
        id: m.id
      });
    }

    // Sort by date descending
    timeline.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    // Calculate vehicle stats
    const custoTotalManutencao = manutencoes.reduce(
      (sum, m) => sum + Number(m.valorTotal || 0), 0
    );
    const totalChecklists = checklists.length;
    const totalManutencoes = manutencoes.length;

    res.json({
      veiculo,
      stats: {
        custoTotalManutencao,
        totalChecklists,
        totalManutencoes,
        ultimaManutencao: manutencoes[0]?.createdAt || null,
        ultimoChecklist: checklists[0]?.completadoEm || null
      },
      timeline
    });
  } catch (error: any) {
    console.error('Historico veiculo error:', error);
    res.status(500).json({ error: 'Failed to fetch vehicle history', details: error.message });
  }
};

// ─── LISTAR EXECUÇÕES ───────────────────────────────────────────────

export const listExecucoes = async (req: AuthRequest, res: Response) => {
  try {
    const veiculoId = req.query.veiculoId as string | undefined;
    const status = req.query.status as string | undefined;
    const where: any = {};
    if (veiculoId) where.veiculoId = veiculoId;
    if (status) where.status = status;

    const execucoes = await prisma.checklistExecucao.findMany({
      where,
      include: {
        template: { select: { nome: true, tipo: true } },
        veiculo: { select: { placa: true, modelo: true } },
        respostas: true
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    res.json(execucoes);
  } catch (error) {
    console.error('List execucoes error:', error);
    res.status(500).json({ error: 'Failed to fetch checklist executions' });
  }
};
