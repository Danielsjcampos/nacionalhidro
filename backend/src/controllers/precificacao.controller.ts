import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { PricingService } from '../services/pricing.service';

// ─── KANBAN: LIST OS PARA PRECIFICAÇÃO ──────────────────────────
export const listOSPrecificacao = async (req: AuthRequest, res: Response) => {
    try {
        const { clienteId, search } = req.query;
        const where: any = {
            status: { in: ['BAIXADA', 'EM_PRECIFICACAO', 'PRECIFICADA'] }
        };

        if (clienteId) where.clienteId = clienteId as string;
        if (search) {
            where.OR = [
                { codigo: { contains: search as string, mode: 'insensitive' as any } },
                { cliente: { nome: { contains: search as string, mode: 'insensitive' as any } } },
            ];
        }

        const list = await prisma.ordemServico.findMany({
            where,
            include: {
                cliente: { select: { id: true, nome: true, porcentagemRL: true, codigo: true, telefone: true } },
                servicos: true,
                itensCobranca: true,
                proposta: { select: { id: true, codigo: true, valorTotal: true, tipoFaturamento: true } }
            },
            orderBy: { dataBaixa: 'desc' as any }
        });


        // Group by kanban columns
        const kanban = {
            EM_ABERTO: list.filter((os: any) => os.status === 'BAIXADA' || os.statusPrecificacao === 'PENDENTE'),
            PRECIFICADAS: list.filter((os: any) => os.statusPrecificacao === 'PRECIFICADA' && os.status === 'PRECIFICADA'),
            EM_NEGOCIACAO: list.filter((os: any) => os.statusPrecificacao === 'EM_NEGOCIACAO'),
        };

        res.json({ kanban, total: list.length });
    } catch (error) {
        console.error('List OS precificacao error:', error);
        res.status(500).json({ error: 'Failed to fetch OS for pricing' });
    }
};

// ─── GET OS DETAIL FOR PRECIFICAÇÃO ─────────────────────────────
export const getOSPrecificacao = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const os = await prisma.ordemServico.findUnique({
            where: { id },
            include: {
                cliente: true,
                servicos: true,
                itensCobranca: { orderBy: { createdAt: 'asc' } },
                proposta: { select: { id: true, codigo: true, valorTotal: true } }
            }
        });
        if (!os) return res.status(404).json({ error: 'OS not found' });
        res.json(os);
    } catch (error) {
        console.error('Get OS precificacao error:', error);
        res.status(500).json({ error: 'Failed to fetch OS details' });
    }
};

// ─── ADD ITEM COBRANÇA ──────────────────────────────────────────
export const addItemCobranca = async (req: AuthRequest, res: Response) => {
    try {
        const osId = req.params.id as string;
        const { descricao, quantidade, valorUnitario, percentualAdicional, centroCustoId } = req.body;

        const qty = parseFloat(quantidade);
        const unitPrice = parseFloat(valorUnitario);
        const adicional = percentualAdicional ? parseFloat(percentualAdicional) : 0;
        const valorTotal = qty * unitPrice * (1 + adicional / 100);

        const item = await prisma.itemCobranca.create({
            data: {
                osId,
                descricao,
                quantidade: qty,
                valorUnitario: unitPrice,
                percentualAdicional: adicional || null,
                valorTotal,
                centroCustoId: centroCustoId || null
            }
        });

        // Recalculate OS total
        const allItems = await prisma.itemCobranca.findMany({ where: { osId } });
        const total = allItems.reduce((sum: number, i: any) => sum + parseFloat(i.valorTotal.toString()), 0);

        await prisma.ordemServico.update({
            where: { id: osId },
            data: { valorPrecificado: total }
        });

        res.status(201).json(item);
    } catch (error: any) {
        console.error('Add item cobranca error:', error);
        res.status(500).json({ error: 'Failed to add billing item', details: error.message });
    }
};

// ─── REMOVE ITEM COBRANÇA ───────────────────────────────────────
export const removeItemCobranca = async (req: AuthRequest, res: Response) => {
    try {
        const { itemId } = req.params;
        const item = await prisma.itemCobranca.findUnique({ where: { id: itemId as string } });
        if (!item) return res.status(404).json({ error: 'Item not found' });

        await prisma.itemCobranca.delete({ where: { id: itemId as string } });

        // Recalculate OS total
        const allItems = await prisma.itemCobranca.findMany({ where: { osId: item.osId } });
        const total = allItems.reduce((sum: number, i: any) => sum + parseFloat(i.valorTotal.toString()), 0);

        await prisma.ordemServico.update({
            where: { id: item.osId },
            data: { valorPrecificado: total }
        });

        res.status(204).send();
    } catch (error) {
        console.error('Remove item cobranca error:', error);
        res.status(500).json({ error: 'Failed to remove billing item' });
    }
};

// ─── PRECIFICAR OS (FINALIZAR PRECIFICAÇÃO) ─────────────────────
export const precificarOS = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;

        // Check if has items
        const items = await prisma.itemCobranca.findMany({ where: { osId: id } });
        if (items.length === 0) {
            return res.status(400).json({ error: 'A OS precisa ter pelo menos um item de cobrança' });
        }

        const total = items.reduce((sum: number, i: any) => sum + parseFloat(i.valorTotal.toString()), 0);

        const os = await prisma.ordemServico.update({
            where: { id },
            data: {
                status: 'PRECIFICADA',
                statusPrecificacao: 'PRECIFICADA',
                valorPrecificado: total
            },
            include: { cliente: true, itensCobranca: true }
        });

        res.json(os);
    } catch (error: any) {
        console.error('Precificar OS error:', error);
        res.status(500).json({ error: 'Failed to price OS', details: error.message });
    }
};

// ─── BAIXAR OS (LOGÍSTICA) ──────────────────────────────────────
export const baixarOS = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const { entrada, saida, almoco, tecnicos, horasTotais, horasAdicionais } = req.body;

        const os = await prisma.ordemServico.update({
            where: { id },
            data: {
                status: 'BAIXADA',
                statusPrecificacao: 'PENDENTE',
                dataBaixa: new Date(),
                entrada: entrada ? new Date(entrada) : undefined,
                saida: saida ? new Date(saida) : undefined,
                almoco: almoco ? new Date(almoco) : undefined,
                tecnicos,
                horasTotais: horasTotais ? parseFloat(horasTotais) : undefined,
                horasAdicionais: horasAdicionais ? parseFloat(horasAdicionais) : undefined,
            },
            include: { cliente: true, servicos: true }
        });

        res.json(os);
    } catch (error: any) {
        console.error('Baixar OS error:', error);
        res.status(500).json({ error: 'Failed to register OS completion', details: error.message });
    }
};

// ─── AUTO CALCULAR ITENS DE COBRANÇA ────────────────────────────
export const autoCalcularItens = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const result = await PricingService.autoCalcularItens(id, req.body);

        const updated = await prisma.ordemServico.findUnique({
            where: { id },
            include: { cliente: true, itensCobranca: { orderBy: { createdAt: 'asc' } } }
        });

        res.json({
            os: updated,
            calculo: result.detalhes
        });
    } catch (error: any) {
        console.error('Auto calcular error:', error);
        res.status(500).json({ error: error.message || 'Erro no cálculo automático' });
    }
};
// ─── CORRIGIR OS (RETORNAR PARA LOGÍSTICA) ─────────────────────
export const corrigirOS = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const { observacoes } = req.body;

        const currentOs = await prisma.ordemServico.findUnique({ where: { id } });
        if (!currentOs) return res.status(404).json({ error: 'OS not found' });

        const os = await prisma.ordemServico.update({
            where: { id },
            data: {
                status: 'ABERTA',
                statusPrecificacao: 'REPROVADA',
                observacoes: observacoes ? `${currentOs.observacoes || ''}\n[CORREÇÃO]: ${observacoes}` : currentOs.observacoes
            }
        });


        res.json(os);
    } catch (error: any) {
        console.error('Corrigir OS error:', error);
        res.status(500).json({ error: 'Failed to return OS to logistics', details: error.message });
    }
};
