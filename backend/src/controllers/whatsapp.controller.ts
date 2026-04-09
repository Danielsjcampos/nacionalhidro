import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { enviarMensagemWhatsApp, verificarStatusInstancia, obterQRCode, desconectarInstancia, excluirInstancia, criarInstancia, reiniciarInstancia } from '../services/whatsapp.service';

// ─── WHATSAPP CONFIG ────────────────────────────────────────────
// Integração real com Evolution API

interface AutomationRule {
    trigger: string;
    action: string;
    template: string;
    active: boolean;
}

// ─── LIST AUTOMATIONS / TEMPLATES ───────────────────────────────
export const listAutomacoes = async (req: AuthRequest, res: Response) => {
    try {
        const automacoes = await (prisma as any).automacao.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(automacoes);
    } catch (error) {
        console.error('List automacoes error:', error);
        res.status(500).json({ error: 'Failed to fetch automations' });
    }
};

// ─── CREATE AUTOMATION ──────────────────────────────────────────
export const createAutomacao = async (req: AuthRequest, res: Response) => {
    try {
        const a = await (prisma as any).automacao.create({ data: req.body });
        res.status(201).json(a);
    } catch (error: any) {
        console.error('Create automacao error:', error);
        res.status(500).json({ error: 'Failed to create automation', details: error.message });
    }
};

// ─── UPDATE AUTOMATION ──────────────────────────────────────────
export const updateAutomacao = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const a = await (prisma as any).automacao.update({ where: { id }, data: req.body });
        res.json(a);
    } catch (error: any) {
        console.error('Update automacao error:', error);
        res.status(500).json({ error: 'Failed to update automation', details: error.message });
    }
};

// ─── DELETE AUTOMATION ──────────────────────────────────────────
export const deleteAutomacao = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        await (prisma as any).automacao.delete({ where: { id } });
        res.status(204).send();
    } catch (error: any) {
        console.error('Delete automacao error:', error);
        res.status(500).json({ error: 'Failed to delete automation', details: error.message });
    }
};

// ─── SEND MESSAGE (REAL) ────────────────────────────────────────
export const enviarTesteMensagem = async (req: AuthRequest, res: Response) => {
    try {
        const { telefone, mensagem } = req.body;
        if (!telefone || !mensagem) {
            return res.status(400).json({ error: 'Telefone e mensagem são obrigatórios' });
        }

        const result = await enviarMensagemWhatsApp(telefone, mensagem);

        // Log the notification
        try {
            await (prisma as any).notificacaoLog.create({
                data: {
                    tipo: 'WHATSAPP',
                    destinatario: telefone,
                    assunto: 'Mensagem de teste',
                    conteudo: mensagem,
                    status: result.success ? 'ENVIADO' : 'FALHA',
                    referencia: 'teste-manual',
                }
            });
        } catch { /* ignore log errors */ }

        res.json(result);
    } catch (error: any) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Failed to send message', details: error.message });
    }
};

// ─── INSTANCE STATUS ────────────────────────────────────────────
export const getStatusInstancia = async (req: AuthRequest, res: Response) => {
    try {
        const status = await verificarStatusInstancia();
        res.json(status);
    } catch (error: any) {
        console.error('Status error:', error);
        res.status(500).json({ error: 'Failed to check status' });
    }
};

// ─── QR CODE ────────────────────────────────────────────────────
export const getQRCode = async (req: AuthRequest, res: Response) => {
    try {
        const qr = await obterQRCode();
        res.json(qr);
    } catch (error: any) {
        console.error('QR code error:', error);
        res.status(500).json({ error: 'Failed to get QR code' });
    }
};

// ─── NOTIFICATION LOG ───────────────────────────────────────────
export const listNotificacoes = async (req: AuthRequest, res: Response) => {
    try {
        const logs = await (prisma as any).notificacaoLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        res.json(logs);
    } catch (error) {
        console.error('List notificacoes error:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
};

// ─── DISCONNECT INSTANCE ────────────────────────────────────────
export const desconectar = async (req: AuthRequest, res: Response) => {
    try {
        const result = await desconectarInstancia();
        res.json(result);
    } catch (error: any) {
        console.error('Disconnect error:', error);
        res.status(500).json({ error: 'Failed to disconnect' });
    }
};

// ─── DELETE INSTANCE ────────────────────────────────────────────
export const excluir = async (req: AuthRequest, res: Response) => {
    try {
        const result = await excluirInstancia();
        res.json(result);
    } catch (error: any) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Failed to delete instance' });
    }
};

// ─── CREATE INSTANCE ────────────────────────────────────────────
export const criar = async (req: AuthRequest, res: Response) => {
    try {
        const { nome } = req.body;
        const result = await criarInstancia(nome);
        res.json(result);
    } catch (error: any) {
        console.error('Create error:', error);
        res.status(500).json({ error: 'Failed to create instance' });
    }
};

// ─── RESTART INSTANCE ───────────────────────────────────────────
export const reiniciar = async (req: AuthRequest, res: Response) => {
    try {
        const result = await reiniciarInstancia();
        res.json(result);
    } catch (error: any) {
        console.error('Restart error:', error);
        res.status(500).json({ error: 'Failed to restart instance' });
    }
};
