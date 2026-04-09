import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { TiquetaqueService } from '../services/tiquetaque.service';
// ─── PONTO ELETRÔNICO ───────────────────────────────────────────
export const listPontos = async (req: AuthRequest, res: Response) => {
    try {
        const { funcionarioId, data } = req.query;
        const where: any = {};
        if (funcionarioId) where.funcionarioId = funcionarioId;
        if (data) where.data = new Date(data as string);

        const list = await (prisma as any).pontoEletronico.findMany({
            where,
            orderBy: { data: 'desc' }
        });

        // Join funcionario names
        const funcionarios = await prisma.funcionario.findMany({
            select: { id: true, nome: true }
        });
        const fMap = new Map(funcionarios.map(f => [f.id, f.nome]));

        const enriched = list.map((p: any) => ({
            ...p,
            funcionarioNome: fMap.get(p.funcionarioId) || 'Desconhecido'
        }));

        res.json(enriched);
    } catch (error) {
        console.error('List pontos error:', error);
        res.status(500).json({ error: 'Failed to fetch time records' });
    }
};

export const listPontosTiquetaque = async (req: AuthRequest, res: Response) => {
    try {
        const { dataInicio, dataFim } = req.query;
        // Default to today if no dates provided
        const todayStr = new Date().toISOString().split('T')[0];
        const start = (dataInicio as string) || todayStr;
        const end = (dataFim as string) || todayStr;

        const results = await TiquetaqueService.getTimesheets(start, end);

        // Map status just to use exact same colors as frontend is expecting if needed, or frontend can adapt
        const unifiedResults = results.map(r => ({
            ...r,
            source: 'TIQUETAQUE'
        }));

        res.json(unifiedResults);
    } catch (error) {
        console.error('List pontos tiquetaque error:', error);
        res.status(500).json({ error: 'Failed to fetch Tiquetaque live records' });
    }
};

export const sincronizarTiquetaque = async (req: AuthRequest, res: Response) => {
    try {
        const { dataInicio, dataFim } = req.body;
        const todayStr = new Date().toISOString().split('T')[0];
        const start = dataInicio || todayStr;
        const end = dataFim || todayStr;

        // 1. Fetch live from Tiquetaque
        const results = await TiquetaqueService.getTimesheets(start, end);
        if (!results || results.length === 0) {
            return res.json({ message: 'Nenhum registro encontrado no TiqueTaque para este período.', synced: 0, skipped: 0, errors: [] });
        }

        // 2. Fetch all employees to map their names
        const funcionarios = await prisma.funcionario.findMany({
            where: { ativo: true },
            select: { id: true, nome: true }
        });
        const fMap = new Map(funcionarios.map(f => [f.nome.toUpperCase().trim(), f.id]));

        let synced = 0;
        let skipped = 0;
        const errors: string[] = [];

        // 3. Fetch existing records to check for upsert
        const existingRecords = await (prisma as any).pontoEletronico.findMany({
            where: {
                data: {
                    gte: new Date(start + 'T00:00:00Z'),
                    lte: new Date(end + 'T23:59:59Z')
                }
            }
        });
        const extMap = new Map<string, any>(existingRecords.map((r: any) => {
            const dateStr = new Date(r.data).toISOString().split('T')[0];
            return [`${r.funcionarioId}_${dateStr}`, r];
        }));

        for (const reg of results) {
            const funcId = fMap.get(reg.funcionarioNome.toUpperCase().trim());
            if (!funcId) {
                skipped++;
                const errorMsg = `Funcionario não encontrado no DB local: ${reg.funcionarioNome}`;
                if (!errors.includes(errorMsg)) errors.push(errorMsg);
                continue;
            }

            const uniqueKey = `${funcId}_${reg.data}`;
            const existing = extMap.get(uniqueKey);

            try {
                if (existing) {
                    await (prisma as any).pontoEletronico.update({
                        where: { id: existing.id },
                        data: {
                            entrada1: reg.entrada1 || null,
                            saida1: reg.saida1 || null,
                            entrada2: reg.entrada2 || null,
                            saida2: reg.saida2 || null,
                            horasTrabalhadas: Math.round(reg.horasTrabalhadas * 100) / 100,
                            horasExtras: Math.round(reg.horasExtras * 100) / 100,
                            status: reg.status,
                            fonte: 'TIQUETAQUE',
                            observacoes: existing.observacoes && existing.observacoes !== 'Sincronizado do TiqueTaque' ? existing.observacoes : 'Sincronizado do TiqueTaque'
                        }
                    });
                } else {
                    await (prisma as any).pontoEletronico.create({
                        data: {
                            funcionarioId: funcId,
                            data: new Date(reg.data + 'T12:00:00Z'), // Avoid timezone shift
                            entrada1: reg.entrada1 || null,
                            saida1: reg.saida1 || null,
                            entrada2: reg.entrada2 || null,
                            saida2: reg.saida2 || null,
                            horasTrabalhadas: Math.round(reg.horasTrabalhadas * 100) / 100,
                            horasExtras: Math.round(reg.horasExtras * 100) / 100,
                            status: reg.status,
                            fonte: 'TIQUETAQUE',
                            observacoes: 'Sincronizado do TiqueTaque'
                        }
                    });
                }
                synced++;
            } catch (err: any) {
                console.error(`Erro ao sincronizar ponto de ${reg.funcionarioNome}:`, err.message);
                errors.push(`Erro ao sincronizar ${reg.funcionarioNome}`);
            }
        }

        res.json({
            message: 'Sincronização concluída com sucesso',
            synced,
            skipped,
            errors
        });
    } catch (error: any) {
        console.error('Sincronizar Tiquetaque error:', error);
        res.status(500).json({ error: 'Erro ao sincronizar com TiqueTaque', details: error.message });
    }
};

export const registrarPonto = async (req: AuthRequest, res: Response) => {
    try {
        const { funcionarioId, data, entrada1, saida1, entrada2, saida2, observacoes } = req.body;

        // Calculate hours worked
        let horas = 0;
        if (entrada1 && saida1) {
            const [h1, m1] = entrada1.split(':').map(Number);
            const [h2, m2] = saida1.split(':').map(Number);
            horas += (h2 * 60 + m2 - h1 * 60 - m1) / 60;
        }
        if (entrada2 && saida2) {
            const [h3, m3] = entrada2.split(':').map(Number);
            const [h4, m4] = saida2.split(':').map(Number);
            horas += (h4 * 60 + m4 - h3 * 60 - m3) / 60;
        }
        const horasExtras = Math.max(0, horas - 8);
        const status = horas === 0 ? 'FALTA' : horas < 8 ? 'INCOMPLETO' : horasExtras > 0 ? 'HORA_EXTRA' : 'NORMAL';

        const p = await (prisma as any).pontoEletronico.create({
            data: {
                funcionarioId,
                data: new Date(data || new Date()),
                entrada1: entrada1 || null,
                saida1: saida1 || null,
                entrada2: entrada2 || null,
                saida2: saida2 || null,
                horasTrabalhadas: Math.round(horas * 100) / 100,
                horasExtras: Math.round(horasExtras * 100) / 100,
                status,
                observacoes,
                fonte: 'MANUAL'
            }
        });
        res.status(201).json(p);
    } catch (error: any) {
        console.error('Registrar ponto error:', error);
        res.status(500).json({ error: 'Failed to register time', details: error.message });
    }
};

export const deletePonto = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        await (prisma as any).pontoEletronico.delete({ where: { id } });
        res.status(204).send();
    } catch (error: any) {
        console.error('Delete ponto error:', error);
        res.status(500).json({ error: 'Failed to delete time record', details: error.message });
    }
};

// ─── IMPORTAR TICTAC (CSV BULK) ─────────────────────────────────
export const importarTicTac = async (req: AuthRequest, res: Response) => {
    try {
        const { dados } = req.body;
        // dados = array de { funcionarioNome, data, entrada1, saida1, entrada2, saida2 }
        // OU csv string

        let registros: any[] = [];

        if (typeof dados === 'string') {
            // Parse CSV: nome;data;entrada1;saida1;entrada2;saida2
            const lines = dados.split('\n').filter((l: string) => l.trim());
            for (const line of lines) {
                const [funcionarioNome, data, entrada1, saida1, entrada2, saida2] = line.split(';').map((s: string) => s.trim());
                if (funcionarioNome && data) {
                    registros.push({ funcionarioNome, data, entrada1, saida1, entrada2, saida2 });
                }
            }
        } else if (Array.isArray(dados)) {
            registros = dados;
        }

        if (registros.length === 0) {
            return res.status(400).json({ error: 'Nenhum registro para importar' });
        }

        // Get all active employees to match by name
        const funcionarios = await prisma.funcionario.findMany({
            where: { ativo: true },
            select: { id: true, nome: true }
        });
        const fMap = new Map(funcionarios.map(f => [f.nome.toUpperCase().trim(), f.id]));

        let imported = 0;
        let skipped = 0;
        const errors: string[] = [];

        for (const reg of registros) {
            const funcId = fMap.get(reg.funcionarioNome?.toUpperCase()?.trim());
            if (!funcId) {
                skipped++;
                errors.push(`Funcionário não encontrado: ${reg.funcionarioNome}`);
                continue;
            }

            let horas = 0;
            if (reg.entrada1 && reg.saida1) {
                const [h1, m1] = reg.entrada1.split(':').map(Number);
                const [h2, m2] = reg.saida1.split(':').map(Number);
                horas += (h2 * 60 + m2 - h1 * 60 - m1) / 60;
            }
            if (reg.entrada2 && reg.saida2) {
                const [h3, m3] = reg.entrada2.split(':').map(Number);
                const [h4, m4] = reg.saida2.split(':').map(Number);
                horas += (h4 * 60 + m4 - h3 * 60 - m3) / 60;
            }
            const horasExtras = Math.max(0, horas - 8);
            const status = horas === 0 ? 'FALTA' : horas < 8 ? 'INCOMPLETO' : horasExtras > 0 ? 'HORA_EXTRA' : 'NORMAL';

            try {
                await (prisma as any).pontoEletronico.create({
                    data: {
                        funcionarioId: funcId,
                        data: new Date(reg.data),
                        entrada1: reg.entrada1 || null,
                        saida1: reg.saida1 || null,
                        entrada2: reg.entrada2 || null,
                        saida2: reg.saida2 || null,
                        horasTrabalhadas: Math.round(horas * 100) / 100,
                        horasExtras: Math.round(horasExtras * 100) / 100,
                        status,
                        observacoes: 'Importado TicTac',
                        fonte: 'TICTAC'
                    }
                });
                imported++;
            } catch (e: any) {
                skipped++;
                errors.push(`Erro ao importar ${reg.funcionarioNome}: ${e.message}`);
            }
        }

        res.json({
            total: registros.length,
            imported,
            skipped,
            errors: errors.slice(0, 10),
        });
    } catch (error: any) {
        console.error('Import TicTac error:', error);
        res.status(500).json({ error: 'Failed to import TicTac data', details: error.message });
    }
};

// ─── RESUMO MENSAL DE PONTO ─────────────────────────────────────
export const resumoPonto = async (req: AuthRequest, res: Response) => {
    try {
        const { mes, ano } = req.query;
        const month = parseInt(mes as string) || new Date().getMonth() + 1;
        const year = parseInt(ano as string) || new Date().getFullYear();

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const pontos = await (prisma as any).pontoEletronico.findMany({
            where: {
                data: { gte: startDate, lte: endDate }
            },
            orderBy: { data: 'asc' }
        });

        // Group by funcionario
        const grouped: Record<string, any> = {};
        for (const p of pontos) {
            if (!grouped[p.funcionarioId]) {
                grouped[p.funcionarioId] = {
                    funcionarioId: p.funcionarioId,
                    totalHoras: 0,
                    totalExtras: 0,
                    diasTrabalhados: 0,
                    faltas: 0,
                    registros: []
                };
            }
            grouped[p.funcionarioId].totalHoras += p.horasTrabalhadas || 0;
            grouped[p.funcionarioId].totalExtras += p.horasExtras || 0;
            grouped[p.funcionarioId].diasTrabalhados++;
            if (p.status === 'FALTA') grouped[p.funcionarioId].faltas++;
            grouped[p.funcionarioId].registros.push(p);
        }

        // Enrich with employee names
        const funcionarios = await prisma.funcionario.findMany({
            select: { id: true, nome: true, cargo: true }
        });
        const fMap = new Map(funcionarios.map(f => [f.id, f]));

        const resumo = Object.values(grouped).map((g: any) => ({
            ...g,
            funcionarioNome: fMap.get(g.funcionarioId)?.nome || 'Desconhecido',
            funcionarioCargo: fMap.get(g.funcionarioId)?.cargo || '',
            totalHoras: Math.round(g.totalHoras * 100) / 100,
            totalExtras: Math.round(g.totalExtras * 100) / 100,
        }));

        res.json({
            mes: month,
            ano: year,
            totalFuncionarios: resumo.length,
            resumo: resumo.sort((a: any, b: any) => a.funcionarioNome.localeCompare(b.funcionarioNome))
        });
    } catch (error) {
        console.error('Resumo ponto error:', error);
        res.status(500).json({ error: 'Failed to generate summary' });
    }
};

// ─── T13: Exportação Ponto Eletrônico (CSV) ─────────────────────
export const exportarPontoCSV = async (req: AuthRequest, res: Response) => {
    try {
        const { mes, ano } = req.query;
        const month = parseInt(mes as string) || new Date().getMonth() + 1;
        const year = parseInt(ano as string) || new Date().getFullYear();

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const pontos = await (prisma as any).pontoEletronico.findMany({
            where: {
                data: { gte: startDate, lte: endDate }
            },
            orderBy: [{ funcionarioId: 'asc' }, { data: 'asc' }]
        });

        // Enrich with employee names
        const funcionarios = await prisma.funcionario.findMany({
            select: { id: true, nome: true, cargo: true }
        });
        const fMap = new Map(funcionarios.map(f => [f.id, f]));

        // Build CSV
        const header = 'Funcionário;Cargo;Data;Entrada 1;Saída 1;Entrada 2;Saída 2;Horas Trabalhadas;Horas Extras;Status;Observações';
        const rows = pontos.map((p: any) => {
            const func = fMap.get(p.funcionarioId);
            const dataStr = new Date(p.data).toLocaleDateString('pt-BR');
            return [
                func?.nome || 'Desconhecido',
                func?.cargo || '',
                dataStr,
                p.entrada1 || '',
                p.saida1 || '',
                p.entrada2 || '',
                p.saida2 || '',
                (p.horasTrabalhadas || 0).toFixed(2),
                (p.horasExtras || 0).toFixed(2),
                p.status || '',
                (p.observacoes || '').replace(/;/g, ',')
            ].join(';');
        });

        const csv = [header, ...rows].join('\n');
        const filename = `ponto_${year}_${String(month).padStart(2, '0')}.csv`;

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send('\uFEFF' + csv); // BOM for Excel compatibility
    } catch (error) {
        console.error('Export ponto CSV error:', error);
        res.status(500).json({ error: 'Failed to export time records' });
    }
};
