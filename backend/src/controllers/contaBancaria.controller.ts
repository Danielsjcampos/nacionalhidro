import { Response } from 'express';
import prismaClient from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = prismaClient as any;

// ─── LISTAR CONTAS BANCÁRIAS ─────────────────────────────────────
export const listContasBancarias = async (req: AuthRequest, res: Response) => {
    try {
        const { empresa, ativa } = req.query;
        const where: any = {};
        if (empresa) where.empresa = { in: [empresa, 'AMBAS'] };
        if (ativa !== undefined) where.ativa = ativa === 'true';

        const contas = await prisma.contaBancaria.findMany({
            where,
            orderBy: { nome: 'asc' },
        });

        res.json(contas);
    } catch (error) {
        console.error('List contas bancárias error:', error);
        res.status(500).json({ error: 'Falha ao buscar contas bancárias' });
    }
};

// ─── SALDOS DAS CONTAS BANCÁRIAS ─────────────────────────────────
export const getSaldosContas = async (req: AuthRequest, res: Response) => {
    try {
        const contas = await prisma.contaBancaria.findMany({
            where: { ativa: true },
            orderBy: { nome: 'asc' },
        });

        const pagar = await prisma.contaPagar.findMany({
            where: { status: 'PAGO' },
        });
        const receber = await prisma.contaReceber.findMany({
            where: { status: 'RECEBIDO' },
        });

        const saldos = contas.map((conta: any) => {
            const totalPago = pagar
                .filter((c: any) => c.contaBancariaId === conta.id)
                .reduce((s: number, c: any) => s + Number(c.valorPago || c.valorOriginal), 0);

            const totalRecebido = receber
                .filter((c: any) => c.contaBancariaId === conta.id)
                .reduce((s: number, c: any) => s + Number(c.valorRecebido || c.valorOriginal), 0);

            const saldoInicial = Number(conta.saldoInicial || 0);
            const saldoAtual = saldoInicial + totalRecebido - totalPago;

            return {
                ...conta,
                totalPago: Math.round(totalPago * 100) / 100,
                totalRecebido: Math.round(totalRecebido * 100) / 100,
                saldoAtual: Math.round(saldoAtual * 100) / 100,
            };
        });

        res.json(saldos);
    } catch (error) {
        console.error('Saldos contas bancárias error:', error);
        res.status(500).json({ error: 'Falha ao calcular saldos' });
    }
};

// ─── CRIAR CONTA BANCÁRIA ────────────────────────────────────────
export const createContaBancaria = async (req: AuthRequest, res: Response) => {
    try {
        const { nome, banco, agencia, conta, tipo, saldoInicial, empresa } = req.body;
        if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });

        const created = await prisma.contaBancaria.create({
            data: {
                nome,
                banco,
                agencia,
                conta,
                tipo: tipo || 'CORRENTE',
                saldoInicial: saldoInicial ? Number(saldoInicial) : 0,
                empresa: empresa || 'AMBAS',
            },
        });
        res.status(201).json(created);
    } catch (error: any) {
        console.error('Create conta bancária error:', error);
        res.status(500).json({ error: 'Falha ao criar conta bancária', details: error.message });
    }
};

// ─── ATUALIZAR CONTA BANCÁRIA ───────────────────────────────────
export const updateContaBancaria = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const updated = await prisma.contaBancaria.update({
            where: { id },
            data: req.body,
        });
        res.json(updated);
    } catch (error: any) {
        console.error('Update conta bancária error:', error);
        res.status(500).json({ error: 'Falha ao atualizar', details: error.message });
    }
};

// ─── DELETAR CONTA BANCÁRIA ─────────────────────────────────────
export const deleteContaBancaria = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        await prisma.contaBancaria.update({
            where: { id },
            data: { ativa: false },
        });
        res.status(204).send();
    } catch (error: any) {
        console.error('Delete conta bancária error:', error);
        res.status(500).json({ error: 'Falha ao desativar conta' });
    }
};
