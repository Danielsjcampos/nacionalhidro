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
                cliente: { select: { id: true, nome: true, porcentagemRL: true } },
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

// ─── HELPERS: Cálculo automático ────────────────────────────────

function timeToDecimal(timeStr: string): number {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) + (m || 0) / 60;
}

function calcularHorasTrabalhadas(entrada: Date, saida: Date, almocoDecimal: number): number {
    let diffMs = saida.getTime() - entrada.getTime();
    return Math.max(0, (diffMs / (1000 * 60 * 60)) - almocoDecimal);
}

function isNoturno(entrada: Date, saida: Date): { isNoturno: boolean; horasNoturnas: number } {
    const startMs = entrada.getTime();
    const endMs = saida.getTime();
    let horasNoturnas = 0;

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
        const {
            valorDiaria, valorHora, toleranciaHoras, entrada, saida, almoco,
            franquia, valorHoraExtra, aplicarMinimoHE = true
        } = req.body;

        if (!valorDiaria && !valorHora) {
            return res.status(400).json({ error: 'Informe valor da diária ou valor da hora' });
        }

        let os = await prisma.ordemServico.findUnique({
            where: { id },
            include: { itensCobranca: true, proposta: true }
        });

        if (!os) return res.status(404).json({ error: 'OS não encontrada' });

        if (entrada || saida) {
            os = await prisma.ordemServico.update({
                where: { id },
                data: {
                    entrada: entrada ? new Date(entrada) : os.entrada,
                    saida: saida ? new Date(saida) : os.saida,
                },
                include: { itensCobranca: true, proposta: true }
            });
        }

        if (!os.entrada || !os.saida) {
            return res.status(400).json({ error: 'OS precisa ter horários de entrada e saída' });
        }

        await prisma.itemCobranca.deleteMany({ where: { osId: id } });

        const entradaDate = new Date(os.entrada);
        const saidaDate = new Date(os.saida);
        const almocoDec = timeToDecimal(almoco || '01:00');

        // Parâmetros da Proposta ou Defaults
        const prop = os.proposta;
        const franquiaVal = franquia || (prop?.franquiaHoras?.toString()) || '08:00';
        const franquiaDec = timeToDecimal(franquiaVal);

        const horasTrabalhadas = calcularHorasTrabalhadas(entradaDate, saidaDate, almocoDec);
        const tolerancia = toleranciaHoras ? parseFloat(toleranciaHoras) : 0;
        const vDiaria = valorDiaria ? parseFloat(valorDiaria) : 0;
        const vHora = valorHora ? parseFloat(valorHora) : 0;

        // HE: Se não informado, usa proposta ou default 50% (agora 35% no legado?)
        const pctHe = prop?.adicionalHoraExtra ? Number(prop.adicionalHoraExtra) : 50;
        const vHoraExtra = valorHoraExtra ? parseFloat(valorHoraExtra) : (vHora * (1 + pctHe / 100));

        const itemsToCreate: any[] = [];

        if (vDiaria > 0) {
            itemsToCreate.push({
                osId: id,
                descricao: 'Diária',
                quantidade: 1,
                valorUnitario: vDiaria,
                valorTotal: vDiaria
            });
        } else if (vHora > 0) {
            const horasBase = Math.min(horasTrabalhadas, franquiaDec);
            itemsToCreate.push({
                osId: id,
                descricao: `Horas Normais (Franquia ${franquia || '08:00'}h)`,
                quantidade: parseFloat(horasBase.toFixed(2)),
                valorUnitario: vHora,
                valorTotal: parseFloat((horasBase * vHora).toFixed(2))
            });
        }

        const horasExcedentes = Math.max(0, horasTrabalhadas - franquiaDec - tolerancia);

        if (horasExcedentes > 0) {
            let qtyHE = parseFloat(horasExcedentes.toFixed(2));

            // Regra Legado: Mínimo 2 horas de HE se houver excesso
            if (aplicarMinimoHE && qtyHE < 2.0) {
                qtyHE = 2.0;
            }

            itemsToCreate.push({
                osId: id,
                descricao: qtyHE > parseFloat(horasExcedentes.toFixed(2))
                    ? `Hora Extra (Mínimo 2h - Real: ${horasExcedentes.toFixed(2)}h)`
                    : 'Hora Extra',
                quantidade: qtyHE,
                valorUnitario: vHoraExtra,
                valorTotal: parseFloat((qtyHE * vHoraExtra).toFixed(2))
            });
        }

        const noturnoInfo = isNoturno(entradaDate, saidaDate);
        if (noturnoInfo.isNoturno && noturnoInfo.horasNoturnas > 0 && vHora > 0) {
            const pctNoturno = prop?.adicionalNoturno ? Number(prop.adicionalNoturno) : 35;
            itemsToCreate.push({
                osId: id,
                descricao: `Adicional Noturno (${pctNoturno}%)`,
                quantidade: parseFloat(noturnoInfo.horasNoturnas.toFixed(2)),
                valorUnitario: vHora,
                percentualAdicional: pctNoturno,
                valorTotal: parseFloat((noturnoInfo.horasNoturnas * vHora * (pctNoturno / 100)).toFixed(2))
            });
        }

        if (isFDS(entradaDate) && vHora > 0) {
            const pctFds = prop?.adicionalFimSemana ? Number(prop.adicionalFimSemana) : 100;
            itemsToCreate.push({
                osId: id,
                descricao: `Adicional Fim de Semana (${pctFds}%)`,
                quantidade: parseFloat(horasTrabalhadas.toFixed(2)),
                valorUnitario: vHora,
                percentualAdicional: pctFds,
                valorTotal: parseFloat((horasTrabalhadas * vHora * (pctFds / 100)).toFixed(2))
            });
        }

        for (const item of itemsToCreate) {
            await prisma.itemCobranca.create({ data: item });
        }

        const total = itemsToCreate.reduce((sum, i) => sum + i.valorTotal, 0);
        await prisma.ordemServico.update({
            where: { id },
            data: {
                valorPrecificado: parseFloat(total.toFixed(2)),
                horasTotais: parseFloat(horasTrabalhadas.toFixed(2)),
                horasAdicionais: parseFloat(horasExcedentes.toFixed(2))
            }
        });

        const updated = await prisma.ordemServico.findUnique({
            where: { id },
            include: { cliente: true, itensCobranca: { orderBy: { createdAt: 'asc' } } }
        });

        res.json({
            os: updated,
            calculo: {
                horasTrabalhadas: parseFloat(horasTrabalhadas.toFixed(2)),
                horasExcedentes: parseFloat(horasExcedentes.toFixed(2)),
                horasNoturnas: noturnoInfo.horasNoturnas,
                isFDS: isFDS(entradaDate),
                totalCalculado: parseFloat(total.toFixed(2))
            }
        });
    } catch (error: any) {
        console.error('Auto calcular error:', error);
        res.status(500).json({ error: 'Erro no cálculo automático' });
    }
};
