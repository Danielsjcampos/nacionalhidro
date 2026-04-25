import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

const DOC_TIPOS = ['PGR', 'PCMSO', 'PPRA', 'LTCAT', 'NR10', 'NR35', 'OUTROS'];

// ─── LIST ────────────────────────────────────────────────────────
export const listDocumentos = async (req: AuthRequest, res: Response) => {
    try {
        const { tipo, status, vencimento } = req.query;
        const where: any = {};

        if (tipo && DOC_TIPOS.includes(tipo as string)) where.tipo = tipo as string;
        if (status) where.status = status as string;

        const now = new Date();
        if (vencimento === 'VENCIDO') {
            where.dataVencimento = { lt: now };
        } else if (vencimento === 'VENCENDO') {
            const em30dias = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            where.dataVencimento = { gte: now, lte: em30dias };
        }

        const list = await (prisma as any).documento.findMany({
            where,
            include: {
                funcionario: { select: { id: true, nome: true } },
                cliente: { select: { id: true, nome: true } },
            },
            orderBy: { dataVencimento: 'asc' },
        });

        const enriched = list.map((d: any) => {
            let statusCalc = d.status;
            if (d.dataVencimento) {
                const diff = Math.ceil((new Date(d.dataVencimento).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                if (diff < 0) statusCalc = 'VENCIDO';
                else if (diff <= 30) statusCalc = 'VENCENDO';
                else statusCalc = 'VALIDO';
            }
            return {
                ...d,
                statusCalculado: statusCalc,
                diasRestantes: d.dataVencimento
                    ? Math.ceil((new Date(d.dataVencimento).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                    : null,
            };
        });

        res.json(enriched);
    } catch (error) {
        console.error('List Documentos error:', error);
        res.status(500).json({ error: 'Failed to fetch Documentos' });
    }
};

// ─── CREATE ──────────────────────────────────────────────────────
export const createDocumento = async (req: AuthRequest, res: Response) => {
    try {
        const { nome, tipo, dataEmissao, dataVencimento, arquivoUrl, observacoes, funcionarioId, clienteId } = req.body;

        if (!nome) return res.status(400).json({ error: 'nome é obrigatório' });
        if (!tipo || !DOC_TIPOS.includes(tipo)) {
            return res.status(400).json({ error: `tipo inválido. Aceitos: ${DOC_TIPOS.join(', ')}` });
        }

        const data: any = {
            nome,
            tipo,
            dataEmissao: dataEmissao ? new Date(dataEmissao) : null,
            dataVencimento: dataVencimento ? new Date(dataVencimento) : null,
            status: 'VALIDO',
            arquivoUrl: arquivoUrl || null,
            observacoes: observacoes || null,
            funcionarioId: funcionarioId || null,
            clienteId: clienteId || null,
        };

        const doc = await (prisma as any).documento.create({ data });
        res.status(201).json(doc);
    } catch (error: any) {
        console.error('Create Documento error:', error);
        res.status(500).json({ error: 'Failed to create Documento', details: error.message });
    }
};

// ─── UPDATE ──────────────────────────────────────────────────────
export const updateDocumento = async (req: AuthRequest, res: Response) => {
    try {
        const { nome, tipo, dataEmissao, dataVencimento, status, arquivoUrl, observacoes } = req.body;

        if (tipo && !DOC_TIPOS.includes(tipo)) {
            return res.status(400).json({ error: `tipo inválido. Aceitos: ${DOC_TIPOS.join(', ')}` });
        }

        const data: any = {};
        if (nome !== undefined) data.nome = nome;
        if (tipo !== undefined) data.tipo = tipo;
        if (dataEmissao !== undefined) data.dataEmissao = dataEmissao ? new Date(dataEmissao) : null;
        if (dataVencimento !== undefined) data.dataVencimento = dataVencimento ? new Date(dataVencimento) : null;
        if (status !== undefined) data.status = status;
        if (arquivoUrl !== undefined) data.arquivoUrl = arquivoUrl || null;
        if (observacoes !== undefined) data.observacoes = observacoes || null;

        const doc = await (prisma as any).documento.update({
            where: { id: req.params.id as string },
            data,
        });
        res.json(doc);
    } catch (error: any) {
        console.error('Update Documento error:', error);
        res.status(500).json({ error: 'Failed to update Documento', details: error.message });
    }
};

// ─── DELETE ──────────────────────────────────────────────────────
export const deleteDocumento = async (req: AuthRequest, res: Response) => {
    try {
        await (prisma as any).documento.delete({ where: { id: req.params.id as string } });
        res.status(204).send();
    } catch (error: any) {
        console.error('Delete Documento error:', error);
        res.status(500).json({ error: 'Failed to delete Documento', details: error.message });
    }
};
