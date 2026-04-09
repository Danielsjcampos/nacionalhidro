import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// ─── PAINEL DO MOTORISTA ────────────────────────────────────────
export const getPainelMotorista = async (req: AuthRequest, res: Response) => {
    try {
        const { veiculoId, funcionarioId } = req.query;
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const amanha = new Date(hoje);
        amanha.setDate(amanha.getDate() + 1);

        // OS em execução do veículo/motorista
        const whereOS: any = { status: 'EM_EXECUCAO' };
        if (veiculoId) whereOS.veiculoId = veiculoId;

        const osAtivas = await prisma.ordemServico.findMany({
            where: whereOS,
            include: {
                cliente: { select: { nome: true, endereco: true, telefone: true } },
            },
            orderBy: { createdAt: 'asc' }
        });

        // Escalas de hoje
        const escalasHoje = await prisma.escala.findMany({
            where: {
                data: { gte: hoje, lt: amanha },
                ...(funcionarioId ? { funcionarioId: funcionarioId as string } : {})
            },
        });

        // Próximas OS agendadas
        const proximasOS = await prisma.ordemServico.findMany({
            where: {
                status: 'AGENDADA',
                dataInicial: { gte: hoje },
                ...(veiculoId ? { veiculoId: veiculoId as string } : {})
            },
            include: {
                cliente: { select: { nome: true, endereco: true } },
            },
            orderBy: { dataInicial: 'asc' },
            take: 10
        });

        // Veículo info
        let veiculoInfo: any = null;
        if (veiculoId) {
            veiculoInfo = await prisma.veiculo.findUnique({
                where: { id: veiculoId as string },
                select: { id: true, placa: true, modelo: true, status: true, kmAtual: true }
            });
        }

        res.json({
            osAtivas,
            escalasHoje,
            proximasOS,
            veiculoInfo,
            dataConsulta: new Date().toISOString()
        });
    } catch (error) {
        console.error('Painel motorista error:', error);
        res.status(500).json({ error: 'Failed to get driver panel' });
    }
};

// ─── ATUALIZAR KM ──────────────────────────────────────────────
export const atualizarKm = async (req: AuthRequest, res: Response) => {
    try {
        const { veiculoId, km } = req.body;
        const v = await prisma.veiculo.update({
            where: { id: veiculoId },
            data: { kmAtual: Number(km) }
        });
        res.json(v);
    } catch (error: any) {
        console.error('Atualizar KM error:', error);
        res.status(500).json({ error: 'Failed to update km', details: error.message });
    }
};

// ─── FINALIZAR OS ──────────────────────────────────────────────
export const finalizarOS = async (req: AuthRequest, res: Response) => {
    try {
        const { osId, assinatura, horasTrabalhadas, horasExtras, horasNoturnas, atividadesRealizadas } = req.body;

        // Create RDO if hour metrics are provided
        if (horasTrabalhadas || horasExtras || horasNoturnas || atividadesRealizadas) {
            await (prisma as any).rDO.create({
                data: {
                    osId,
                    data: new Date(),
                    horasTrabalhadas: horasTrabalhadas ? Number(horasTrabalhadas) : null,
                    horasExtras: horasExtras ? Number(horasExtras) : null,
                    horasNoturnas: horasNoturnas ? Number(horasNoturnas) : null,
                    atividadesRealizadas: atividadesRealizadas || null,
                    assinadoEm: new Date(),
                    assinadoPor: 'MOTORISTA_LOGISTICA'
                }
            });
        }

        const os = await prisma.ordemServico.update({
            where: { id: osId },
            data: {
                status: 'BAIXADA',
                assinaturaCliente: assinatura,
                dataBaixa: new Date()
            }
        });

        res.json(os);
    } catch (error: any) {
        console.error('Finalizar OS error:', error);
        res.status(500).json({ error: 'Failed to finalize OS', details: error.message });
    }
};

// ─── REPORTAR FALHA OS ─────────────────────────────────────────
export const reportarFalhaOS = async (req: AuthRequest, res: Response) => {
    try {
        const { osId, justificativa } = req.body;

        const os = await prisma.ordemServico.update({
            where: { id: osId },
            data: {
                status: 'CANCELADA',
                justificativaFalha: justificativa,
                dataBaixa: new Date()
            }
        });

        res.json(os);
    } catch (error: any) {
        console.error('Reportar falha OS error:', error);
        res.status(500).json({ error: 'Failed to report OS failure', details: error.message });
    }
};

// ─── REGISTRAR CHECKPOINT ──────────────────────────────────────
// Checkpoints: SAIU_BASE → CHEGOU_CLIENTE → INICIOU_SERVICO → FINALIZOU
export const registrarCheckpoint = async (req: AuthRequest, res: Response) => {
    try {
        const { osId, checkpoint } = req.body;
        const validCheckpoints = ['SAIU_BASE', 'CHEGOU_CLIENTE', 'INICIOU_SERVICO', 'FINALIZOU'];
        if (!validCheckpoints.includes(checkpoint)) {
            return res.status(400).json({ error: 'Invalid checkpoint' });
        }

        const now = new Date().toISOString();
        const os = await prisma.ordemServico.findUnique({ where: { id: osId } });
        if (!os) return res.status(404).json({ error: 'OS not found' });

        // Build checkpoints JSON
        const currentCheckpoints = (os as any).checkpoints ? JSON.parse((os as any).checkpoints) : {};
        currentCheckpoints[checkpoint] = now;

        const updateData: any = {
            checkpoints: JSON.stringify(currentCheckpoints)
        };

        // Auto-transition status
        if (checkpoint === 'SAIU_BASE' || checkpoint === 'CHEGOU_CLIENTE' || checkpoint === 'INICIOU_SERVICO') {
            updateData.status = 'EM_EXECUCAO';
        }

        const updated = await prisma.ordemServico.update({
            where: { id: osId },
            data: updateData,
            include: { cliente: { select: { nome: true, endereco: true } } }
        });

        res.json(updated);
    } catch (error: any) {
        console.error('Registrar checkpoint error:', error);
        res.status(500).json({ error: 'Failed to register checkpoint', details: error.message });
    }
};
