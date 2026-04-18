import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// ─── HELPER: Auto-criar Conta a Pagar para despesa de viagem ─────
async function autoCreateContaPagarViagem(
    tipo: 'HOSPEDAGEM' | 'PASSAGEM',
    registro: any,
    valor: number
): Promise<void> {
    if (valor <= 0) return;

    // Idempotency check 
    const existing = await (prisma as any).contaPagar.findFirst({
        where: {
            observacoes: { contains: registro.id },
            categoria: tipo
        }
    });

    const descricao = tipo === 'HOSPEDAGEM'
        ? `Hospedagem ${registro.hotel || registro.cidade || ''} - ${registro.funcionario || registro.colaborador || ''}`.trim()
        : `Passagem ${registro.origem || ''}→${registro.destino || ''} - ${registro.funcionario || registro.colaborador || ''}`.trim();

    if (existing) {
        // Se o valor mudou e ainda está aberto, atualiza
        if (Number(existing.valorOriginal) !== valor && existing.status === 'ABERTO') {
            await (prisma as any).contaPagar.update({
                where: { id: existing.id },
                data: {
                    valorOriginal: valor,
                    valorTotal: valor,
                    saldoDevedor: valor,
                    descricao: descricao 
                }
            });
        }
        return;
    }

    // Buscar planoContas para viagens
    let planoContasId: string | undefined;
    try {
        const query = tipo === 'HOSPEDAGEM' ? 'Hospedagem' : 'Viagem';
        const planoConta = await (prisma as any).planoContas.findFirst({
            where: { descricao: { contains: query, mode: 'insensitive' } }
        });
        if (planoConta) planoContasId = planoConta.id;
    } catch (_) { /* ignore */ }

    await (prisma as any).contaPagar.create({
        data: {
            descricao,
            categoria: tipo,
            valorOriginal: valor,
            valorTotal: valor,
            saldoDevedor: valor,
            dataVencimento: tipo === 'HOSPEDAGEM'
                ? (registro.dataCheckin || new Date())
                : (registro.dataIda || new Date()),
            centroCusto: registro.osId ? `OS-${registro.osId.substring(0, 8)}` : 'VIAGEM',
            status: 'ABERTO',
            planoContasId: planoContasId || undefined,
            observacoes: `Gerado automaticamente - ${tipo} ID: ${registro.id}`,
            fornecedorId: tipo === 'HOSPEDAGEM' ? registro.fornecedorId : undefined
        },
    });
}

// ─── HOSPEDAGEM ─────────────────────────────────────────────────
export const listHospedagens = async (req: AuthRequest, res: Response) => {
    try {
        const { status, osId } = req.query;
        const where: any = {};
        if (status) where.status = status;
        if (osId) where.osId = osId as string;
        const list = await (prisma as any).hospedagem.findMany({
            where,
            orderBy: { dataCheckin: 'desc' }
        });
        res.json(list);
    } catch (error) {
        console.error('List hospedagens error:', error);
        res.status(500).json({ error: 'Failed to fetch lodgings' });
    }
};

export const createHospedagem = async (req: AuthRequest, res: Response) => {
    try {
        const { funcionarioId, osId } = req.body;

        if (funcionarioId) {
            // Compliance Check
            const now = new Date();
            const funcionario = await prisma.funcionario.findUnique({
                where: { id: funcionarioId },
                include: {
                    asosControle: { orderBy: { dataVencimento: 'desc' }, take: 1 },
                    integracoes: true
                }
            });

            if (funcionario) {
                const aso = funcionario.asosControle?.[0];
                if (!aso || (aso.dataVencimento && new Date(aso.dataVencimento) < now)) {
                    return res.status(403).json({ error: 'BLOQUEIO DE COMPLIANCE: Funcionário com ASO vencido ou ausente.' });
                }

                if (osId) {
                    const os = await prisma.oS.findUnique({ where: { id: osId }, select: { clienteId: true } });
                    if (os && os.clienteId) {
                        const cliente = await prisma.cliente.findUnique({ where: { id: os.clienteId }, select: { integracoesExigidas: true } });
                        if (cliente?.integracoesExigidas && Array.isArray(cliente.integracoesExigidas)) {
                            for (const ex of (cliente.integracoesExigidas as string[])) {
                                const hasIntg = funcionario.integracoes.find(i => 
                                    (i.tipoIntegracao === ex || i.nome === ex) && 
                                    i.clienteId === os.clienteId &&
                                    i.status === 'VALIDO' &&
                                    (!i.dataVencimento || new Date(i.dataVencimento) >= now)
                                );
                                if (!hasIntg) {
                                    return res.status(403).json({ error: `BLOQUEIO DE COMPLIANCE: Falta integração exigida: ${ex}` });
                                }
                            }
                        }
                    }
                }
            }
        }

        const data = {
            ...req.body,
            valorDiaria: req.body.valorDiaria ? Number(req.body.valorDiaria) : undefined,
            diarias: req.body.diarias ? Number(req.body.diarias) : 1,
            dataCheckin: new Date(req.body.dataCheckin),
            dataCheckout: req.body.dataCheckout ? new Date(req.body.dataCheckout) : undefined,
            tipoAcomodacao: req.body.tipoAcomodacao || "INDIVIDUAL",
            cafeDaManha: req.body.cafeDaManha === true || req.body.cafeDaManha === 'true',
            almoco: req.body.almoco === true || req.body.almoco === 'true',
            lavanderia: req.body.lavanderia === true || req.body.lavanderia === 'true',
            fornecedorId: req.body.fornecedorId || undefined,
        };
        data.valorTotal = (data.valorDiaria || 0) * (data.diarias || 1);
        const h = await (prisma as any).hospedagem.create({ data });

        // ── Auto-criar Conta a Pagar ──
        try {
            await autoCreateContaPagarViagem('HOSPEDAGEM', h, Number(h.valorTotal || 0));
        } catch (cpErr) {
            console.error('Auto-create ContaPagar for hospedagem error:', cpErr);
        }

        res.status(201).json(h);
    } catch (error: any) {
        console.error('Create hospedagem error:', error);
        res.status(500).json({ error: 'Failed to create lodging', details: error.message });
    }
};

export const updateHospedagem = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const update: any = { ...req.body };
        if (update.dataCheckout) update.dataCheckout = new Date(update.dataCheckout);
        const h = await (prisma as any).hospedagem.update({ where: { id }, data: update });
        
        // Sincronizar com Conta a Pagar
        try {
            await autoCreateContaPagarViagem('HOSPEDAGEM', h, Number(h.valorTotal || 0));
        } catch (cpErr) {
            console.error('Auto-sync ContaPagar for hospedagem error:', cpErr);
        }

        res.json(h);
    } catch (error: any) {
        console.error('Update hospedagem error:', error);
        res.status(500).json({ error: 'Failed to update lodging', details: error.message });
    }
};

export const deleteHospedagem = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        await (prisma as any).hospedagem.delete({ where: { id } });
        res.status(204).send();
    } catch (error: any) {
        console.error('Delete hospedagem error:', error);
        res.status(500).json({ error: 'Failed to delete lodging', details: error.message });
    }
};

// ─── PASSAGENS ──────────────────────────────────────────────────
export const listPassagens = async (req: AuthRequest, res: Response) => {
    try {
        const { osId, status } = req.query;
        const where: any = {};
        if (osId) where.osId = osId as string;
        if (status) where.status = status as string;
        const list = await (prisma as any).passagem.findMany({
            where,
            orderBy: { dataIda: 'desc' }
        });
        res.json(list);
    } catch (error) {
        console.error('List passagens error:', error);
        res.status(500).json({ error: 'Failed to fetch tickets' });
    }
};

export const createPassagem = async (req: AuthRequest, res: Response) => {
    try {
        const { funcionarioId, osId } = req.body;

        if (funcionarioId) {
            // Compliance Check
            const now = new Date();
            const funcionario = await prisma.funcionario.findUnique({
                where: { id: funcionarioId },
                include: {
                    asosControle: { orderBy: { dataVencimento: 'desc' }, take: 1 },
                    integracoes: true
                }
            });

            if (funcionario) {
                const aso = funcionario.asosControle?.[0];
                if (!aso || (aso.dataVencimento && new Date(aso.dataVencimento) < now)) {
                    return res.status(403).json({ error: 'BLOQUEIO DE COMPLIANCE: Funcionário com ASO vencido ou ausente.' });
                }

                if (osId) {
                    const os = await prisma.oS.findUnique({ where: { id: osId }, select: { clienteId: true } });
                    if (os && os.clienteId) {
                        const cliente = await prisma.cliente.findUnique({ where: { id: os.clienteId }, select: { integracoesExigidas: true } });
                        if (cliente?.integracoesExigidas && Array.isArray(cliente.integracoesExigidas)) {
                            for (const ex of (cliente.integracoesExigidas as string[])) {
                                const hasIntg = funcionario.integracoes.find(i => 
                                    (i.tipoIntegracao === ex || i.nome === ex) && 
                                    i.clienteId === os.clienteId &&
                                    i.status === 'VALIDO' &&
                                    (!i.dataVencimento || new Date(i.dataVencimento) >= now)
                                );
                                if (!hasIntg) {
                                    return res.status(403).json({ error: `BLOQUEIO DE COMPLIANCE: Falta integração exigida: ${ex}` });
                                }
                            }
                        }
                    }
                }
            }
        }

        const data = {
            ...req.body,
            valor: req.body.valor ? Number(req.body.valor) : undefined,
            dataIda: new Date(req.body.dataIda),
            dataVolta: req.body.dataVolta ? new Date(req.body.dataVolta) : undefined,
        };
        const p = await (prisma as any).passagem.create({ data });

        // ── Auto-criar Conta a Pagar ──
        try {
            await autoCreateContaPagarViagem('PASSAGEM', p, Number(p.valor || 0));
        } catch (cpErr) {
            console.error('Auto-create ContaPagar for passagem error:', cpErr);
        }

        res.status(201).json(p);
    } catch (error: any) {
        console.error('Create passagem error:', error);
        res.status(500).json({ error: 'Failed to create ticket', details: error.message });
    }
};

export const updatePassagem = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const p = await (prisma as any).passagem.update({ where: { id }, data: req.body });

        // Sincronizar com Conta a Pagar
        try {
            await autoCreateContaPagarViagem('PASSAGEM', p, Number(p.valor || 0));
        } catch (cpErr) {
            console.error('Auto-sync ContaPagar for passagem error:', cpErr);
        }

        res.json(p);
    } catch (error: any) {
        console.error('Update passagem error:', error);
        res.status(500).json({ error: 'Failed to update ticket', details: error.message });
    }
};

export const deletePassagem = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        await (prisma as any).passagem.delete({ where: { id } });
        res.status(204).send();
    } catch (error: any) {
        console.error('Delete passagem error:', error);
        res.status(500).json({ error: 'Failed to delete ticket', details: error.message });
    }
};

// ─── RESUMO POR OS ──────────────────────────────────────────────
export const getResumoViagem = async (req: AuthRequest, res: Response) => {
    try {
        const osId = req.params.osId as string;
        const hospedagens = await (prisma as any).hospedagem.findMany({ where: { osId } });
        const passagens = await (prisma as any).passagem.findMany({ where: { osId } });

        const totalHospedagem = hospedagens.reduce((s: number, h: any) => s + Number(h.valorTotal || 0), 0);
        const totalPassagens = passagens.reduce((s: number, p: any) => s + Number(p.valor || 0), 0);

        res.json({
            hospedagens,
            passagens,
            resumo: {
                totalHospedagem: Math.round(totalHospedagem * 100) / 100,
                totalPassagens: Math.round(totalPassagens * 100) / 100,
                totalGeral: Math.round((totalHospedagem + totalPassagens) * 100) / 100,
                qtdHospedagens: hospedagens.length,
                qtdPassagens: passagens.length,
            }
        });
    } catch (error) {
        console.error('Resumo viagem error:', error);
        res.status(500).json({ error: 'Failed to get travel summary' });
    }
};
