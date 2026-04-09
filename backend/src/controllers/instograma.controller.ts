import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// GET /instograma?startDate=...&endDate=...
export const listInstograma = async (req: AuthRequest, res: Response) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'startDate e endDate são obrigatórios (formato ISO8601)',
                },
            });
            return;
        }

        const start = new Date(startDate as string);
        const end = new Date(endDate as string);

        // Buscar todas as escalas no período, incluindo multi-dia
        const escalas = await prisma.escala.findMany({
            where: {
                OR: [
                    // Escalas que iniciam no período
                    {
                        data: {
                            gte: start,
                            lte: end,
                        },
                    },
                    // Escalas multi-dia que terminam no período
                    {
                        dataFim: {
                            gte: start,
                            lte: end,
                        },
                    },
                    // Escalas que englobam todo o período
                    {
                        data: { lte: start },
                        dataFim: { gte: end },
                    },
                ],
            },
            include: {
                cliente: {
                    select: {
                        id: true,
                        nome: true,
                        razaoSocial: true,
                    },
                },
                veiculo: {
                    select: {
                        id: true,
                        placa: true,
                        modelo: true,
                        marca: true,
                        tipo: true,
                        status: true,
                        tipoEquipamento: true,
                        exibirNoHistograma: true,
                    },
                },
            },
            orderBy: { data: 'asc' },
        });

        // Buscar todos os veículos para as linhas do grid
        const veiculos = await prisma.veiculo.findMany({
            orderBy: { placa: 'asc' },
            select: {
                id: true,
                placa: true,
                modelo: true,
                marca: true,
                tipo: true,
                status: true,
                tipoEquipamento: true,
                exibirNoHistograma: true,
            },
        });

        // Buscar manutenções ativas para marcar veículos indisponíveis
        const manutencoesAtivas = await prisma.manutencao.findMany({
            where: {
                status: { in: ['PENDENTE', 'EM_EXECUCAO'] },
                veiculoId: { not: null },
            },
            select: {
                veiculoId: true,
                descricao: true,
                prioridade: true,
            },
        });

        res.json({
            escalas,
            veiculos,
            manutencoesAtivas,
        });
    } catch (error) {
        console.error('Instograma listInstograma error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Erro ao carregar dados do instograma',
            },
        });
    }
};

// PATCH /instograma/:id — reagendar (mover escala)
export const reagendarEscala = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const { data, dataFim, veiculoId } = req.body;

        if (!data) {
            res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Nova data é obrigatória',
                },
            });
            return;
        }

        const escala = await prisma.escala.update({
            where: { id },
            data: {
                data: new Date(data),
                dataFim: dataFim ? new Date(dataFim) : undefined,
                veiculoId: veiculoId || undefined,
            },
            include: {
                cliente: {
                    select: { id: true, nome: true },
                },
                veiculo: {
                    select: { id: true, placa: true, modelo: true },
                },
            },
        });

        res.json(escala);
    } catch (error) {
        console.error('Instograma reagendarEscala error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Erro ao reagendar escala',
            },
        });
    }
};

// GET /instograma/disponibilidade?date=...
export const getDisponibilidade = async (req: AuthRequest, res: Response) => {
    try {
        const { date } = req.query;

        if (!date) {
            res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'date é obrigatório',
                },
            });
            return;
        }

        const targetDate = new Date(date as string);
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);

        // Veículos já escalados nesse dia
        const escalasNoDia = await prisma.escala.findMany({
            where: {
                OR: [
                    {
                        data: {
                            gte: targetDate,
                            lt: nextDay,
                        },
                    },
                    {
                        data: { lte: targetDate },
                        dataFim: { gte: targetDate },
                    },
                ],
                status: { not: 'CANCELADO' },
            },
            select: { veiculoId: true },
        });

        const veiculosOcupados = escalasNoDia
            .map((e) => e.veiculoId)
            .filter(Boolean) as string[];

        // Todos os veículos disponíveis (não em manutenção e não escalados)
        const veiculosDisponiveis = await prisma.veiculo.findMany({
            where: {
                status: { not: 'MANUTENCAO' },
                id: { notIn: veiculosOcupados },
            },
            orderBy: { placa: 'asc' },
        });

        res.json({
            date: targetDate.toISOString(),
            disponiveis: veiculosDisponiveis,
            ocupados: veiculosOcupados.length,
            total: veiculosDisponiveis.length + veiculosOcupados.length,
        });
    } catch (error) {
        console.error('Instograma getDisponibilidade error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Erro ao verificar disponibilidade',
            },
        });
    }
};

// POST /instograma/ia-sugerir
export const sugerirEscalaIA = async (req: AuthRequest, res: Response) => {
    try {
        const { date, clienteId, equipamento } = req.body;

        if (!date) {
            res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'date é obrigatório',
                },
            });
            return;
        }

        const { aiEscalaService } = await import('../services/aiEscala.service');
        const resultado = await aiEscalaService.sugerirEquipe(date, clienteId, equipamento);
        
        if (!resultado || !resultado.success) {
            return res.status(500).json({ error: { message: resultado?.error || 'Erro desconhecido na IA' } });
        }

        res.json(resultado.sugestao);

    } catch (error) {
        console.error('Instograma sugerirEscalaIA error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Erro ao gerar sugestão via IA',
            },
        });
    }
};
