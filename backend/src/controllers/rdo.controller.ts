import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// ─── HELPER: CÁLCULO DE HORAS ───────────────────────────────────
function timeToMinutes(timeStr: string): number {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

function calcularHorasRDO(entrada: string, saida: string, almoco: string, franquiaDia: number, dataRDO: Date) {
    let startMin = timeToMinutes(entrada);
    let endMin = timeToMinutes(saida);
    
    if (endMin < startMin) endMin += 24 * 60; // Passou da meia noite
    
    let workedMinutes = endMin - startMin;

    if (almoco) {
        if (almoco.includes('-')) {
            const parts = almoco.split('-');
            let almocoMin = timeToMinutes(parts[1]) - timeToMinutes(parts[0]);
            if (almocoMin < 0) almocoMin += 24 * 60;
            workedMinutes -= Math.max(0, almocoMin);
        } else {
            const val = Number(almoco);
            workedMinutes -= (val < 10 ? val * 60 : val) || 0;
        }
    }

    // Cálculo de Horas Noturnas (22h as 05h)
    let nightMinutes = 0;
    const nightStart = 22 * 60; // 1320
    const nightEnd = (24 + 5) * 60; // 1740 (5am do dia seguinte)
    
    // Intersecção de [startMin, endMin] com o período noturno do dia 1 -> dia 2
    const intersectStart = Math.max(startMin, nightStart);
    const intersectEnd = Math.min(endMin, nightEnd);
    if (intersectEnd > intersectStart) {
        nightMinutes += (intersectEnd - intersectStart);
    }
    
    // Intersecção com a madrugada do dia 1 (00h às 05h)
    const morningEnd = 5 * 60; // 300
    const morningIntersectEnd = Math.min(endMin, morningEnd);
    if (morningIntersectEnd > startMin) {
        nightMinutes += (morningIntersectEnd - startMin);
    }

    const dayOfWeek = new Date(dataRDO).getUTCDay(); // 0 is Sunday, 6 is Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const horasTrabalhadas = Math.max(0, workedMinutes / 60);
    const horasExtras = Math.max(0, horasTrabalhadas - franquiaDia);
    const horasNoturnas = Math.max(0, nightMinutes / 60);
    
    return {
        horasTrabalhadas: Number(horasTrabalhadas.toFixed(2)),
        horasExtras: Number(horasExtras.toFixed(2)),
        horasNoturnas: Number(horasNoturnas.toFixed(2)),
        isWeekend
    };
}

// ─── LIST RDOs (by OS) ──────────────────────────────────────────
export const listRDOs = async (req: AuthRequest, res: Response) => {
    try {
        const { osId } = req.query;
        const where: any = {};
        if (osId) where.osId = osId as string;

        const rdos = await (prisma as any).rDO.findMany({
            where,
            include: { os: { select: { id: true, codigo: true, cliente: { select: { nome: true } } } } },
            orderBy: { data: 'asc' }
        });
        res.json(rdos);
    } catch (error) {
        console.error('List RDOs error:', error);
        res.status(500).json({ error: 'Failed to fetch RDOs' });
    }
};

// ─── GET RDO ────────────────────────────────────────────────────
export const getRDO = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const rdo = await (prisma as any).rDO.findUnique({
            where: { id },
            include: { os: { include: { cliente: true } } }
        });
        if (!rdo) return res.status(404).json({ error: 'RDO not found' });
        res.json(rdo);
    } catch (error) {
        console.error('Get RDO error:', error);
        res.status(500).json({ error: 'Failed to fetch RDO' });
    }
};

// ─── CREATE RDO ─────────────────────────────────────────────────
export const createRDO = async (req: AuthRequest, res: Response) => {
    try {
        const { data, assinadoEm, horasTrabalhadas, horasExtras, horasNoturnas, ...rest } = req.body;

        let calcTrabalhadas = horasTrabalhadas ? Number(horasTrabalhadas) : undefined;
        let calcExtras = horasExtras ? Number(horasExtras) : undefined;

        // Auto-cálculo se enviou horários mas não as horas calculadas
        if (rest.entrada && rest.saida && (!calcTrabalhadas || !calcExtras)) {
             const os = await (prisma as any).ordemServico.findUnique({
                 where: { id: rest.osId },
                 include: { proposta: true }
             });
             const franquiaDia = Number(os?.proposta?.franquiaHoras || 8);
             
             const calc = calcularHorasRDO(rest.entrada, rest.saida, rest.almoco, franquiaDia, new Date(data));
             if (!calcTrabalhadas) calcTrabalhadas = calc.horasTrabalhadas;
             if (!calcExtras) calcExtras = calc.horasExtras;
             if (!horasNoturnas) (rest as any).horasNoturnas = calc.horasNoturnas;
        }

        const rdo = await (prisma as any).rDO.create({
            data: {
                ...rest,
                data: new Date(data),
                assinadoEm: assinadoEm ? new Date(assinadoEm) : undefined,
                horasTrabalhadas: calcTrabalhadas,
                horasExtras: calcExtras,
                horasNoturnas: horasNoturnas ? Number(horasNoturnas) : undefined,
            },
            include: { os: { select: { id: true, codigo: true } } }
        });
        res.status(201).json(rdo);
    } catch (error: any) {
        console.error('Create RDO error:', error);
        res.status(500).json({ error: 'Failed to create RDO', details: error.message });
    }
};

// ─── UPDATE RDO ─────────────────────────────────────────────────
export const updateRDO = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const { data, assinadoEm, horasTrabalhadas, horasExtras, horasNoturnas, ...rest } = req.body;

        let calcTrabalhadas = horasTrabalhadas !== undefined ? Number(horasTrabalhadas) : undefined;
        let calcExtras = horasExtras !== undefined ? Number(horasExtras) : undefined;

        // Auto-cálculo se alterou horários
        if (rest.entrada && rest.saida) {
             const rdoAntigo = await (prisma as any).rDO.findUnique({ where: { id }, select: { osId: true, data: true } });
             if (rdoAntigo) {
                 const os = await (prisma as any).ordemServico.findUnique({
                     where: { id: rdoAntigo.osId },
                     include: { proposta: true }
                 });
                 const franquiaDia = Number(os?.proposta?.franquiaHoras || 8);
                 
                 const calc = calcularHorasRDO(rest.entrada, rest.saida, rest.almoco, franquiaDia, data ? new Date(data) : rdoAntigo.data);
                 
                 if (horasTrabalhadas === undefined) calcTrabalhadas = calc.horasTrabalhadas;
                 if (horasExtras === undefined) calcExtras = calc.horasExtras;
                 if (horasNoturnas === undefined) (rest as any).horasNoturnas = calc.horasNoturnas;
             }
        }

        const rdo = await (prisma as any).rDO.update({
            where: { id },
            data: {
                ...rest,
                data: data ? new Date(data) : undefined,
                assinadoEm: assinadoEm ? new Date(assinadoEm) : undefined,
                horasTrabalhadas: calcTrabalhadas,
                horasExtras: calcExtras,
                horasNoturnas: horasNoturnas !== undefined ? Number(horasNoturnas) : undefined,
            },
            include: { os: { select: { id: true, codigo: true } } }
        });
        res.json(rdo);
    } catch (error: any) {
        console.error('Update RDO error:', error);
        res.status(500).json({ error: 'Failed to update RDO', details: error.message });
    }
};

// ─── DELETE RDO ─────────────────────────────────────────────────
export const deleteRDO = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        await (prisma as any).rDO.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        console.error('Delete RDO error:', error);
        res.status(500).json({ error: 'Failed to delete RDO' });
    }
};

// ─── LIST RDOs OF AN OS ─────────────────────────────────────────
export const listRDOsByOS = async (req: AuthRequest, res: Response) => {
    try {
        const osId = req.params.osId as string;
        const rdos = await (prisma as any).rDO.findMany({
            where: { osId },
            orderBy: { data: 'asc' }
        });

        // Summary
        let totalHoras = 0;
        let totalExtras = 0;
        let totalNoturnas = 0;
        rdos.forEach((r: any) => {
            totalHoras += Number(r.horasTrabalhadas || 0);
            totalExtras += Number(r.horasExtras || 0);
            totalNoturnas += Number(r.horasNoturnas || 0);
        });

        res.json({
            rdos,
            resumo: {
                totalDias: rdos.length,
                totalHoras: Math.round(totalHoras * 100) / 100,
                totalExtras: Math.round(totalExtras * 100) / 100,
                totalNoturnas: Math.round(totalNoturnas * 100) / 100
            }
        });
    } catch (error) {
        console.error('List RDOs by OS error:', error);
        res.status(500).json({ error: 'Failed to fetch RDOs for OS' });
    }
};
