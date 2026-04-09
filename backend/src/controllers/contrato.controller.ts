import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const listarContratos = async (req: Request, res: Response): Promise<void> => {
    try {
        const { search, status, month } = req.query;

        const where: any = {};

        if (status) {
            where.status = status as string;
        }

        if (search) {
            where.OR = [
                { codigo: { contains: search as string, mode: 'insensitive' } },
                { cliente: { nome: { contains: search as string, mode: 'insensitive' } } }
            ];
        }

        // Se passar um mês específico (1-12), filtrar vencimentos naquele mês (ignorando ano, ou ano atual, vamos fazer ano atual para simplificar o dashboard)
        if (month) {
            const currentYear = new Date().getFullYear();
            const startOfMonth = new Date(currentYear, parseInt(month as string) - 1, 1);
            const endOfMonth = new Date(currentYear, parseInt(month as string), 0, 23, 59, 59);

            where.dataVencimento = {
                gte: startOfMonth,
                lte: endOfMonth
            };
        }

        const contratos = await prisma.contrato.findMany({
            where,
            include: { cliente: { select: { nome: true, documento: true, id: true } } },
            orderBy: { dataVencimento: 'asc' }
        });

        res.status(200).json(contratos);
    } catch (error) {
        console.error('Erro ao listar contratos:', error);
        res.status(500).json({ error: 'Erro ao listar contratos' });
    }
};

export const obterContrato = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;
        const contrato = await prisma.contrato.findUnique({
            where: { id },
            include: { cliente: { select: { nome: true, id: true } } }
        });

        if (!contrato) {
            res.status(404).json({ error: 'Contrato não encontrado' });
            return;
        }

        res.status(200).json(contrato);
    } catch (error) {
        console.error('Erro ao obter contrato:', error);
        res.status(500).json({ error: 'Erro ao obter contrato' });
    }
};

export const criarContrato = async (req: Request, res: Response): Promise<void> => {
    try {
        const { 
            codigo, clienteId, status, objeto, valorMensal, valorTotal, 
            dataInicio, dataVencimento, renovacaoAutomatica, diaVencimentoFatura, observacoes 
        } = req.body;

        const contrato = await prisma.contrato.create({
            data: {
                codigo,
                clienteId,
                status: status || 'ATIVO',
                objeto,
                valorMensal: parseFloat(valorMensal),
                valorTotal: valorTotal ? parseFloat(valorTotal) : null,
                dataInicio: new Date(dataInicio),
                dataVencimento: new Date(dataVencimento),
                renovacaoAutomatica: renovacaoAutomatica || false,
                diaVencimentoFatura: diaVencimentoFatura ? parseInt(diaVencimentoFatura) : 10,
                observacoes
            }
        });

        res.status(201).json(contrato);
    } catch (error: any) {
        console.error('Erro ao criar contrato:', error);
        if (error.code === 'P2002') {
            res.status(400).json({ error: 'Código de contrato já existe.' });
            return;
        }
        res.status(500).json({ error: 'Erro ao criar contrato' });
    }
};

export const atualizarContrato = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;
        const data = req.body;

        if (data.valorMensal) data.valorMensal = parseFloat(data.valorMensal);
        if (data.valorTotal) data.valorTotal = parseFloat(data.valorTotal);
        if (data.dataInicio) data.dataInicio = new Date(data.dataInicio);
        if (data.dataVencimento) data.dataVencimento = new Date(data.dataVencimento);
        if (data.diaVencimentoFatura) data.diaVencimentoFatura = parseInt(data.diaVencimentoFatura);

        const contrato = await prisma.contrato.update({
            where: { id },
            data
        });

        res.status(200).json(contrato);
    } catch (error) {
        console.error('Erro ao atualizar contrato:', error);
        res.status(500).json({ error: 'Erro ao atualizar contrato' });
    }
};

export const deletarContrato = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;
        await prisma.contrato.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        console.error('Erro ao deletar contrato:', error);
        res.status(500).json({ error: 'Erro ao deletar contrato' });
    }
};

export const dashboardContratos = async (req: Request, res: Response): Promise<void> => {
    try {
        const ativos = await prisma.contrato.count({ where: { status: 'ATIVO' } });
        const vencidos = await prisma.contrato.count({ where: { status: 'VENCIDO' } });
        
        // Contratos a vencer nos próximos 30 dias
        const hoje = new Date();
        const em30Dias = new Date();
        em30Dias.setDate(hoje.getDate() + 30);
        
        const aVencer30dias = await prisma.contrato.count({
            where: {
                status: 'ATIVO',
                dataVencimento: {
                    gte: hoje,
                    lte: em30Dias
                }
            }
        });

        const contratosDb = await prisma.contrato.findMany({ where: { status: 'ATIVO' }});
        const receitaMensal = contratosDb.reduce((acc, curr) => acc + Number(curr.valorMensal), 0);

        res.status(200).json({
            ativos,
            vencidos,
            aVencer30dias,
            receitaMensalEstimada: receitaMensal
        });
    } catch (error) {
        console.error('Erro ao obter dashboard de contratos:', error);
        res.status(500).json({ error: 'Erro ao carregar dashboard.' });
    }
};
