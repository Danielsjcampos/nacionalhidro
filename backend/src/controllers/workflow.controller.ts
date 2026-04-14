import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { pipefyBridgeService } from '../services/pipefyBridge.service';
import workflowAutomationService from '../services/workflowAutomation.service';

/**
 * Lista todos os workflows (pipes) configurados no sistema.
 */
export const listWorkflows = async (req: AuthRequest, res: Response) => {
  try {
    const workflows = await (prisma as any).workflow.findMany({
      include: {
        _count: { select: { cards: true } },
        stages: { 
          orderBy: { ordem: 'asc' },
          include: { _count: { select: { cards: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(workflows);
  } catch (error: any) {
    console.error('[WorkflowController] listWorkflows error:', error.message);
    res.status(500).json({ error: 'Erro ao listar workflows' });
  }
};

/**
 * Retorna os detalhes de um workflow, incluindo fases, campos e cards (por coluna).
 */
export const getWorkflow = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const workflow = await (prisma as any).workflow.findUnique({
      where: { id },
      include: {
        stages: {
          orderBy: { ordem: 'asc' },
          include: {
            cards: { orderBy: { updatedAt: 'desc' } },
            automations: true
          }
        },
        fields: { orderBy: { ordem: 'asc' } },
        emailTemplates: true
      }
    });

    if (!workflow) return res.status(404).json({ error: 'Workflow não encontrado' });
    res.json(workflow);
  } catch (error: any) {
    console.error('[WorkflowController] getWorkflow error:', error.message);
    res.status(500).json({ error: 'Erro ao buscar dados do workflow' });
  }
};

/**
 * Cria ou atualiza um Card com dados dinâmicos.
 */
export const upsertCard = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { workflowId, stageId, titulo, dados } = req.body;

    if (id && id !== 'new') {
      const card = await (prisma as any).workflowCard.update({
        where: { id },
        data: { 
          titulo, 
          dados, 
          stageId // Permite salvar e mover se o formulário for fase-específico
        }
      });
      return res.json(card);
    } else {
      if (!workflowId || !stageId) {
        return res.status(400).json({ error: 'workflowId e stageId são obrigatórios para novos cards' });
      }
      const card = await (prisma as any).workflowCard.create({
        data: { 
          workflowId, 
          stageId, 
          titulo: titulo || 'Novo Card', 
          dados: dados || {} 
        }
      });

      // Disparar automações de entrada na fase para novos cards
      workflowAutomationService.processMove(card.id, stageId);

      return res.status(201).json(card);
    }
  } catch (error: any) {
    console.error('[WorkflowController] upsertCard error:', error.message);
    res.status(500).json({ error: 'Erro ao salvar informações do card' });
  }
};

/**
 * Move um card entre fases e dispara automações.
 */
export const moveCard = async (req: AuthRequest, res: Response) => {
  try {
    const { cardId } = req.params;
    const { stageId } = req.body;

    const cardBefore = await (prisma as any).workflowCard.findUnique({
      where: { id: cardId },
      include: { stage: true }
    });

    if (!cardBefore) return res.status(404).json({ error: 'Card não encontrado' });

    const cardAfter = await (prisma as any).workflowCard.update({
      where: { id: cardId },
      data: { stageId },
      include: { stage: { include: { automations: true } } }
    });

    // ─── LÓGICA DE AUTOMAÇÃO (Trigger Engine) ──────────────────────
    workflowAutomationService.processMove(cardId as string, stageId);

    res.json(cardAfter);
  } catch (error: any) {
    console.error('[WorkflowController] moveCard error:', error.message);
    res.status(500).json({ error: 'Erro ao movimentar o card' });
  }
};

/**
 * Importa definições de um Pipe do Pipefy via API.
 */
export const bootstrapFromPipefy = async (req: AuthRequest, res: Response) => {
  try {
    const { pipeId } = req.body;
    const apiToken = req.headers['x-pipefy-token'] as string; // Opcional, se o usuário quiser usar tokens diferentes

    if (!pipeId) return res.status(400).json({ error: 'ID do Pipe do Pipefy é obrigatório' });

    const workflowId = await pipefyBridgeService.bootstrapWorkflowFromPipe(pipeId);

    res.json({ 
      success: true, 
      message: 'Workflow importado com sucesso do Pipefy',
      workflowId 
    });
  } catch (error: any) {
    console.error('[WorkflowController] bootstrapFromPipefy error:', error.message);
    res.status(500).json({ 
      error: 'Falha ao importar definições do Pipefy', 
      details: error.message 
    });
  }
};

/**
 * Permite editar campos dinamicamente (Form Builder)
 */
export const updateFields = async (req: AuthRequest, res: Response) => {
  try {
    const { workflowId } = req.params;
    const { fields } = req.body; // Array de WorkflowField

    if (!Array.isArray(fields)) return res.status(400).json({ error: 'Fields deve ser um array' });

    // Transação para limpar e recriar ou atualizar campos
    await (prisma as any).workflowField.deleteMany({ where: { workflowId } });
    
    const createdFields = await (prisma as any).workflowField.createMany({
      data: fields.map((f: any, index: number) => ({
        ...f,
        workflowId,
        ordem: index
      }))
    });

    res.json({ success: true, count: createdFields.count });
  } catch (error: any) {
    console.error('[WorkflowController] updateFields error:', error.message);
    res.status(500).json({ error: 'Erro ao atualizar configuração de campos' });
  }
};
