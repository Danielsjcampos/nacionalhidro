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
        ? `Hospedagem ${registro.hotel || registro.cidade || ''} - ${registro.funcionario?.nome || registro.colaborador || ''}`.trim()
        : `Passagem ${registro.origem || ''}→${registro.destino || ''} - ${registro.funcionario?.nome || registro.colaborador || ''}`.trim();

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

// ─── HELPER: Cleanup ContaPagar antes de deletar ─────────────────
async function cleanupContaPagar(registroId: string, tipo: string): Promise<void> {
    try {
        const cp = await (prisma as any).contaPagar.findFirst({
            where: {
                observacoes: { contains: registroId },
                categoria: tipo
            }
        });
        if (!cp) return;

        if (cp.status === 'ABERTO') {
            await (prisma as any).contaPagar.delete({ where: { id: cp.id } });
            console.log(`[Viagem Cleanup] Deleted open ContaPagar ${cp.id} for ${tipo} ${registroId}`);
        } else {
            console.log(`[Viagem Cleanup] Kept paid ContaPagar ${cp.id} (status: ${cp.status}) for ${tipo} ${registroId}`);
        }
    } catch (err) {
        console.error(`[Viagem Cleanup] Error cleaning ContaPagar for ${tipo} ${registroId}:`, err);
    }
}

// ─── CSV HELPER ──────────────────────────────────────────────────
function toCSV(headers: string[], rows: string[][]): string {
    const bom = '\uFEFF';
    const headerLine = headers.join(';');
    const dataLines = rows.map(r => r.join(';'));
    return bom + [headerLine, ...dataLines].join('\n');
}

// ─── HOSPEDAGEM ─────────────────────────────────────────────────
export const listHospedagens = async (req: AuthRequest, res: Response) => {
    try {
        const { status, osId, formato } = req.query;
        const where: any = {};
        if (status) where.status = status;
        if (osId) where.osId = osId as string;
        const list = await (prisma as any).hospedagem.findMany({
            where,
            include: {
                funcionario: { select: { id: true, nome: true, cargo: true } },
                os: { select: { id: true, codigo: true } },
                fornecedor: { select: { id: true, nome: true, nomeFantasia: true } },
            },
            orderBy: { dataCheckin: 'desc' }
        });

        // CSV export
        if (formato === 'csv') {
            const headers = ['Hotel', 'Cidade', 'Funcionário', 'OS', 'Check-in', 'Check-out', 'Diárias', 'Valor Diária', 'Total', 'Status', 'Tipo Acomodação'];
            const rows = list.map((h: any) => [
                h.hotel || '',
                h.cidade || '',
                h.funcionario?.nome || '',
                h.os?.codigo || '',
                h.dataCheckin ? new Date(h.dataCheckin).toLocaleDateString('pt-BR') : '',
                h.dataCheckout ? new Date(h.dataCheckout).toLocaleDateString('pt-BR') : '',
                String(h.diarias || 1),
                String(h.valorDiaria || 0),
                String(h.valorTotal || 0),
                h.status || '',
                h.tipoAcomodacao || '',
            ]);
            const csv = toCSV(headers, rows);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename=hospedagens.csv');
            return res.send(csv);
        }

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
            const funcionario = await (prisma as any).funcionario.findUnique({
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
                    const os = await (prisma as any).ordemServico.findUnique({ where: { id: osId }, select: { clienteId: true } });
                    if (os && os.clienteId) {
                        const cliente = await (prisma as any).cliente.findUnique({ where: { id: os.clienteId }, select: { integracoesExigidas: true } });
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
        if (update.dataCheckin) update.dataCheckin = new Date(update.dataCheckin);
        if (update.dataCheckout) update.dataCheckout = new Date(update.dataCheckout);
        if (update.valorDiaria !== undefined) update.valorDiaria = Number(update.valorDiaria);
        if (update.diarias !== undefined) update.diarias = Number(update.diarias);
        if (update.valorDiaria !== undefined || update.diarias !== undefined) {
            const current = await (prisma as any).hospedagem.findUnique({ where: { id } });
            const diarias = update.diarias ?? current?.diarias ?? 1;
            const valorDiaria = update.valorDiaria ?? Number(current?.valorDiaria ?? 0);
            update.valorTotal = valorDiaria * diarias;
        }
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
        // GAP 2: Cleanup ContaPagar antes de deletar
        await cleanupContaPagar(id, 'HOSPEDAGEM');
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
        const { osId, status, formato } = req.query;
        const where: any = {};
        if (osId) where.osId = osId as string;
        if (status) where.status = status as string;
        const list = await (prisma as any).passagem.findMany({
            where,
            include: {
                funcionario: { select: { id: true, nome: true, cargo: true } },
                os: { select: { id: true, codigo: true } },
            },
            orderBy: { dataIda: 'desc' }
        });

        // CSV export
        if (formato === 'csv') {
            const headers = ['Tipo', 'Origem', 'Destino', 'Funcionário', 'OS', 'Ida', 'Volta', 'Companhia', 'Localizador', 'Valor', 'Status'];
            const rows = list.map((p: any) => [
                p.tipo || '',
                p.origem || '',
                p.destino || '',
                p.funcionario?.nome || '',
                p.os?.codigo || '',
                p.dataIda ? new Date(p.dataIda).toLocaleDateString('pt-BR') : '',
                p.dataVolta ? new Date(p.dataVolta).toLocaleDateString('pt-BR') : '',
                p.companhia || '',
                p.localizador || '',
                String(p.valor || 0),
                p.status || '',
            ]);
            const csv = toCSV(headers, rows);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename=passagens.csv');
            return res.send(csv);
        }

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
            const funcionario = await (prisma as any).funcionario.findUnique({
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
                    const os = await (prisma as any).ordemServico.findUnique({ where: { id: osId }, select: { clienteId: true } });
                    if (os && os.clienteId) {
                        const cliente = await (prisma as any).cliente.findUnique({ where: { id: os.clienteId }, select: { integracoesExigidas: true } });
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
        const update: any = { ...req.body };
        if (update.dataIda) update.dataIda = new Date(update.dataIda);
        if (update.dataVolta) update.dataVolta = new Date(update.dataVolta);
        if (update.valor !== undefined) update.valor = Number(update.valor);
        const p = await (prisma as any).passagem.update({ where: { id }, data: update });

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
        // GAP 2: Cleanup ContaPagar antes de deletar
        await cleanupContaPagar(id, 'PASSAGEM');
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
