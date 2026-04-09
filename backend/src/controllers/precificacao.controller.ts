import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

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
                cliente: { select: { id: true, nome: true } },
                servicos: true,
                itensCobranca: true,
                proposta: { select: { id: true, codigo: true, valorTotal: true } }
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
        const { descricao, quantidade, valorUnitario, percentualAdicional } = req.body;

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
                valorTotal
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

// ─── HELPERS: Cálculo automático ────────────────────────────────

function calcularHorasTrabalhadas(entrada: Date, saida: Date, almoco?: Date | null): number {
    let diffMs = saida.getTime() - entrada.getTime();
    // Subtract lunch break (assume 1h if almoco flag exists)
    if (almoco) {
        diffMs -= 60 * 60 * 1000; // 1 hour
    }
    return Math.max(0, diffMs / (1000 * 60 * 60)); // Convert to hours
}

function isNoturno(entrada: Date, saida: Date): { isNoturno: boolean; horasNoturnas: number } {
    // Noturno: 22:00 to 05:00
    const entradaH = entrada.getHours();
    const saidaH = saida.getHours();

    let horasNoturnas = 0;
    const startMs = entrada.getTime();
    const endMs = saida.getTime();

    // Walk hour-by-hour
    for (let t = startMs; t < endMs; t += 3600000) {
        const h = new Date(t).getHours();
        if (h >= 22 || h < 5) {
            horasNoturnas += 1;
        }
    }

    return { isNoturno: horasNoturnas > 0, horasNoturnas: Math.min(horasNoturnas, (endMs - startMs) / 3600000) };
}

function isFDS(data: Date): boolean {
    const dia = data.getDay();
    return dia === 0 || dia === 6; // Sunday or Saturday
}

// ─── AUTO CALCULAR ITENS DE COBRANÇA ────────────────────────────
export const autoCalcularItens = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const { valorDiaria, valorHora, toleranciaHoras } = req.body;

        // Validate inputs
        if (!valorDiaria && !valorHora) {
            return res.status(400).json({ error: 'Informe valor da diária ou valor da hora' });
        }

        const os = await prisma.ordemServico.findUnique({
            where: { id },
            include: { itensCobranca: true }
        });

        if (!os) return res.status(404).json({ error: 'OS não encontrada' });
        if (!os.entrada || !os.saida) {
            return res.status(400).json({ error: 'OS precisa ter horários de entrada e saída para calcular automaticamente' });
        }

        // Clear existing auto-generated items
        await prisma.itemCobranca.deleteMany({ where: { osId: id } });

        const entradaDate = new Date(os.entrada);
        const saidaDate = new Date(os.saida);
        const horasTrabalhadas = calcularHorasTrabalhadas(entradaDate, saidaDate, os.almoco);
        const minimoHoras = os.minimoHoras || 0;
        const tolerancia = toleranciaHoras ? parseFloat(toleranciaHoras) : 0;
        const vDiaria = valorDiaria ? parseFloat(valorDiaria) : 0;
        const vHora = valorHora ? parseFloat(valorHora) : 0;

        const itemsToCreate: any[] = [];

        // ── Item 1: Valor Principal (Diária ou Horas Mínimas) ──
        if (vDiaria > 0) {
            itemsToCreate.push({
                osId: id,
                descricao: 'Diária',
                quantidade: 1,
                valorUnitario: vDiaria,
                percentualAdicional: null,
                valorTotal: vDiaria
            });
        } else if (vHora > 0 && minimoHoras > 0) {
            const horasBase = Math.min(horasTrabalhadas, minimoHoras);
            itemsToCreate.push({
                osId: id,
                descricao: `Horas Normais (mín. ${minimoHoras}h)`,
                quantidade: Math.max(horasBase, minimoHoras),
                valorUnitario: vHora,
                percentualAdicional: null,
                valorTotal: Math.max(horasBase, minimoHoras) * vHora
            });
        } else if (vHora > 0) {
            itemsToCreate.push({
                osId: id,
                descricao: 'Horas Normais',
                quantidade: parseFloat(horasTrabalhadas.toFixed(2)),
                valorUnitario: vHora,
                percentualAdicional: null,
                valorTotal: parseFloat((horasTrabalhadas * vHora).toFixed(2))
            });
        }

        // ── Item 2: Horas Excedentes (hora extra) ──
        const limiteHoras = minimoHoras > 0 ? minimoHoras : (vDiaria > 0 ? 10 : 0);
        const horasExcedentes = horasTrabalhadas - limiteHoras - tolerancia;

        if (horasExcedentes > 0 && vHora > 0) {
            const pctHE = 50; // 50% adicional para hora extra
            itemsToCreate.push({
                osId: id,
                descricao: 'Hora Extra',
                quantidade: parseFloat(horasExcedentes.toFixed(2)),
                valorUnitario: vHora,
                percentualAdicional: pctHE,
                valorTotal: parseFloat((horasExcedentes * vHora * 1.5).toFixed(2))
            });
        }

        // ── Item 3: Adicional Noturno (35%) ──
        const noturnoInfo = isNoturno(entradaDate, saidaDate);
        if (noturnoInfo.isNoturno && noturnoInfo.horasNoturnas > 0 && vHora > 0) {
            const pctNoturno = 35;
            itemsToCreate.push({
                osId: id,
                descricao: 'Adicional Noturno',
                quantidade: parseFloat(noturnoInfo.horasNoturnas.toFixed(2)),
                valorUnitario: vHora,
                percentualAdicional: pctNoturno,
                valorTotal: parseFloat((noturnoInfo.horasNoturnas * vHora * 0.35).toFixed(2))
            });
        }

        // ── Item 4: Adicional FDS ──
        if (isFDS(entradaDate) && vHora > 0) {
            const pctFDS = 100; // 100% adicional
            itemsToCreate.push({
                osId: id,
                descricao: 'Adicional Fim de Semana',
                quantidade: parseFloat(horasTrabalhadas.toFixed(2)),
                valorUnitario: vHora,
                percentualAdicional: pctFDS,
                valorTotal: parseFloat((horasTrabalhadas * vHora * 1.0).toFixed(2))
            });
        }

        // Create all items
        for (const item of itemsToCreate) {
            await prisma.itemCobranca.create({ data: item });
        }

        // Update OS total
        const total = itemsToCreate.reduce((sum: number, i: any) => sum + i.valorTotal, 0);
        await prisma.ordemServico.update({
            where: { id },
            data: {
                valorPrecificado: parseFloat(total.toFixed(2)),
                horasTotais: parseFloat(horasTrabalhadas.toFixed(2)),
                horasAdicionais: horasExcedentes > 0 ? parseFloat(horasExcedentes.toFixed(2)) : 0
            }
        });

        // Return updated OS with items
        const updated = await prisma.ordemServico.findUnique({
            where: { id },
            include: {
                cliente: true,
                itensCobranca: { orderBy: { createdAt: 'asc' } },
                proposta: { select: { id: true, codigo: true, valorTotal: true } }
            }
        });

        res.json({
            os: updated,
            calculo: {
                horasTrabalhadas: parseFloat(horasTrabalhadas.toFixed(2)),
                horasExcedentes: horasExcedentes > 0 ? parseFloat(horasExcedentes.toFixed(2)) : 0,
                horasNoturnas: noturnoInfo.horasNoturnas,
                isFDS: isFDS(entradaDate),
                itensGerados: itemsToCreate.length,
                totalCalculado: parseFloat(total.toFixed(2))
            }
        });
    } catch (error: any) {
        console.error('Auto calcular itens error:', error);
        res.status(500).json({ error: 'Failed to auto-calculate items', details: error.message });
    }
};
