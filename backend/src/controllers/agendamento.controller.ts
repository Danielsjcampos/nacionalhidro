import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { getTarefasPadrao, dispararAgendamento, gerarMensagemAgendamento } from '../services/agendamento.service';

// ─── LIST ─────────────────────────────────────────────────────
export const listAgendamentos = async (req: AuthRequest, res: Response) => {
  try {
    const { clienteId, status } = req.query;
    const where: any = {};
    if (clienteId) where.clienteId = String(clienteId);
    if (status) where.status = String(status);

    const list = await prisma.agendamento.findMany({
      where,
      include: {
        cliente: { select: { id: true, nome: true, cidade: true } },
        proposta: { select: { id: true, codigo: true, status: true } },
        ordemServico: { select: { id: true, codigo: true, status: true } },
        tarefas: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(list);
  } catch (error) {
    console.error('List agendamentos error:', error);
    res.status(500).json({ error: 'Falha ao listar agendamentos' });
  }
};

// ─── GET ONE ──────────────────────────────────────────────────
export const getAgendamento = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const ag = await prisma.agendamento.findUnique({
      where: { id },
      include: {
        cliente: true,
        proposta: { include: { itens: true, equipe: true } },
        ordemServico: true,
        tarefas: { orderBy: { createdAt: 'asc' } },
      }
    });
    if (!ag) return res.status(404).json({ error: 'Agendamento não encontrado' });
    res.json(ag);
  } catch (error) {
    console.error('Get agendamento error:', error);
    res.status(500).json({ error: 'Falha ao buscar agendamento' });
  }
};

// ─── CREATE ───────────────────────────────────────────────────
export const createAgendamento = async (req: AuthRequest, res: Response) => {
  try {
    const { propostaId, ordemServicoId, tarefas: customTarefas, ...data } = req.body;

    let targetPropostaId = propostaId || null;
    let targetClienteId;
    let baseCodigo = '';

    if (ordemServicoId) {
      const os = await prisma.ordemServico.findUnique({
        where: { id: ordemServicoId },
        include: { cliente: true, proposta: true }
      });
      if (!os) return res.status(400).json({ error: 'Ordem de serviço não encontrada' });
      targetPropostaId = os.propostaId || targetPropostaId;
      targetClienteId = os.clienteId;
      baseCodigo = os.codigo;
    } else if (propostaId) {
      const proposta = await prisma.proposta.findUnique({
        where: { id: propostaId },
        include: { cliente: true }
      });
      if (!proposta) return res.status(400).json({ error: 'Proposta não encontrada' });
      if (proposta.status !== 'ACEITA') {
        return res.status(400).json({ error: 'Proposta precisa estar com status ACEITA' });
      }
      targetClienteId = proposta.clienteId;
      baseCodigo = proposta.codigo;
    } else {
      return res.status(400).json({ error: 'Informe propostaId ou ordemServicoId' });
    }

    const tarefasList = customTarefas?.length > 0
      ? customTarefas
      : getTarefasPadrao(baseCodigo);

    const agendamento = await prisma.agendamento.create({
      data: {
        ...data,
        propostaId: targetPropostaId,
        ordemServicoId,
        clienteId: targetClienteId,
        tarefas: {
          create: tarefasList.map((t: any) => ({
            area: t.area,
            responsavel: t.responsavel || null,
            descricao: t.descricao,
          }))
        }
      },
      include: {
        cliente: true,
        proposta: { select: { id: true, codigo: true } },
        ordemServico: { select: { id: true, codigo: true } },
        tarefas: true,
      }
    });

    res.status(201).json(agendamento);
  } catch (error) {
    console.error('Create agendamento error:', error);
    res.status(500).json({ error: 'Falha ao criar agendamento' });
  }
};

// ─── UPDATE ───────────────────────────────────────────────────
export const updateAgendamento = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const { tarefas, ...data } = req.body;

    const agendamento = await prisma.agendamento.update({
      where: { id },
      data,
      include: { cliente: true, proposta: { select: { id: true, codigo: true } }, ordemServico: { select: { id: true, codigo: true } }, tarefas: true }
    });

    res.json(agendamento);
  } catch (error) {
    console.error('Update agendamento error:', error);
    res.status(500).json({ error: 'Falha ao atualizar agendamento' });
  }
};

// ─── UPDATE TAREFA STATUS ─────────────────────────────────────
export const updateTarefa = async (req: AuthRequest, res: Response) => {
  try {
    const agId = String(req.params.id);
    const tarefaId = String(req.params.tarefaId);
    const { statusTarefa, observacao } = req.body;

    const tarefa = await prisma.agendamentoTarefa.update({
      where: { id: tarefaId },
      data: {
        statusTarefa,
        observacao: observacao || undefined,
        concluidaEm: statusTarefa === 'CONCLUIDA' ? new Date() : null,
        concluidaPor: statusTarefa === 'CONCLUIDA' ? req.user?.userId : null,
      }
    });

    const allTarefas = await prisma.agendamentoTarefa.findMany({
      where: { agendamentoId: agId }
    });

    const allDone = allTarefas.every(t => t.statusTarefa === 'CONCLUIDA');
    const hasImpedida = allTarefas.some(t => t.statusTarefa === 'IMPEDIDA');
    const hasAnyDone = allTarefas.some(t => t.statusTarefa === 'CONCLUIDA');

    let newStatus: string | null = null;
    if (allDone) newStatus = 'PRONTO';
    else if (hasImpedida) newStatus = 'BLOQUEADO';
    else if (hasAnyDone) newStatus = 'EM_ANDAMENTO';

    if (newStatus) {
      await prisma.agendamento.update({
        where: { id: agId },
        data: { status: newStatus }
      });
    }

    res.json({ tarefa, agendamentoStatus: newStatus });
  } catch (error) {
    console.error('Update tarefa error:', error);
    res.status(500).json({ error: 'Falha ao atualizar tarefa' });
  }
};

// ─── DISPARAR (WhatsApp + Email) ──────────────────────────────
export const disparar = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const result = await dispararAgendamento(id, req.body.groupId);
    res.json(result);
  } catch (error) {
    console.error('Disparar agendamento error:', error);
    res.status(500).json({ error: 'Falha ao disparar agendamento' });
  }
};

// ─── PREVIEW MESSAGE ──────────────────────────────────────────
export const previewMensagem = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const ag = await prisma.agendamento.findUnique({
      where: { id },
      include: { cliente: true, proposta: true, ordemServico: true, tarefas: true }
    });
    if (!ag) return res.status(404).json({ error: 'Agendamento não encontrado' });

    const mensagem = gerarMensagemAgendamento(ag);
    res.json({ mensagem });
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ error: 'Falha ao gerar preview' });
  }
};

// ─── REMARCAR (EM_REVISAO) ───────────────────────────────────
export const remarcar = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);

    await prisma.agendamentoTarefa.updateMany({
      where: { agendamentoId: id },
      data: { statusTarefa: 'PENDENTE', concluidaEm: null, concluidaPor: null }
    });

    const agendamento = await prisma.agendamento.update({
      where: { id },
      data: { status: 'EM_REVISAO', ...req.body },
      include: { cliente: true, proposta: { select: { id: true, codigo: true } }, ordemServico: { select: { id: true, codigo: true } }, tarefas: true }
    });

    res.json(agendamento);
  } catch (error) {
    console.error('Remarcar error:', error);
    res.status(500).json({ error: 'Falha ao remarcar agendamento' });
  }
};

// ─── HISTÓRICO POR CLIENTE ────────────────────────────────────
export const historicoCliente = async (req: AuthRequest, res: Response) => {
  try {
    const clienteId = String(req.params.clienteId);
    const list = await prisma.agendamento.findMany({
      where: { clienteId },
      include: {
        proposta: { select: { id: true, codigo: true } },
        ordemServico: { select: { id: true, codigo: true } },
        tarefas: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(list);
  } catch (error) {
    console.error('Historico cliente error:', error);
    res.status(500).json({ error: 'Falha ao buscar histórico' });
  }
};
