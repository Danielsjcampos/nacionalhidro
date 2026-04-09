import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// ─── HELPERS ────────────────────────────────────────────────────

function toCSV(data: any[], columns: { key: string; label: string }[]): string {
    const header = columns.map(c => c.label).join(';');
    const rows = data.map(row =>
        columns.map(c => {
            let val = row[c.key];
            if (val instanceof Date) val = val.toLocaleDateString('pt-BR');
            if (val === null || val === undefined) val = '';
            return String(val).replace(/;/g, ',');
        }).join(';')
    );
    return [header, ...rows].join('\n');
}

function sendCSV(res: Response, filename: string, csv: string) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv); // BOM for Excel UTF-8
}

// ─── RELATÓRIO: COLABORADORES ATIVOS ────────────────────────────

export const relatorioAtivos = async (req: AuthRequest, res: Response) => {
    try {
        const { formato, tipo } = req.query; // formato=csv|json, tipo=CLT|PJ|TST

        const where: any = { ativo: true };
        if (tipo === 'PJ') where.tipo = 'PJ';
        if (tipo === 'TST') where.departamento = { contains: 'Segurança', mode: 'insensitive' };

        const funcionarios = await (prisma as any).funcionario.findMany({
            where,
            orderBy: { nome: 'asc' },
            select: {
                nome: true, cpf: true, cargo: true, departamento: true,
                dataAdmissao: true, email: true, telefone: true, tipo: true, salario: true,
                alocacaoAtividade: true, valorRefeicao: true, valorJantar: true,
                regimeRefeicao: true, valeAlimentacao: true, premioAssiduidade: true,
                seguroVidaAtivo: true, convenioMedico: true,
            }
        });

        const columns = [
            { key: 'nome', label: 'Nome' },
            { key: 'cpf', label: 'CPF' },
            { key: 'cargo', label: 'Cargo' },
            { key: 'departamento', label: 'Departamento' },
            { key: 'dataAdmissao', label: 'Data Admissão' },
            { key: 'tipo', label: 'Tipo' },
            { key: 'email', label: 'E-mail' },
            { key: 'telefone', label: 'Telefone' },
            { key: 'alocacaoAtividade', label: 'Alocação' },
            { key: 'regimeRefeicao', label: 'Regime Refeição' },
            { key: 'valeAlimentacao', label: 'Vale Alimentação' },
            { key: 'premioAssiduidade', label: 'Prêmio Assiduidade' },
            { key: 'seguroVidaAtivo', label: 'Seguro Ativo' },
            { key: 'convenioMedico', label: 'Convênio Médico' },
        ];

        if (formato === 'csv') {
            const tipoLabel = tipo === 'PJ' ? 'PJ' : tipo === 'TST' ? 'TST' : 'CLT';
            return sendCSV(res, `colaboradores_ativos_${tipoLabel}.csv`, toCSV(funcionarios, columns));
        }
        res.json(funcionarios);
    } catch (error) {
        console.error('Relatório ativos error:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
};

// ─── RELATÓRIO: MOTORISTAS CNH VENCENDO ─────────────────────────

export const relatorioCNHVencendo = async (req: AuthRequest, res: Response) => {
    try {
        const { formato } = req.query;
        const now = new Date();
        const em60dias = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

        const funcionarios = await (prisma as any).funcionario.findMany({
            where: {
                ativo: true,
                dataVencimentoCNH: { lte: em60dias },
            },
            orderBy: { dataVencimentoCNH: 'asc' },
            select: {
                nome: true, cpf: true, cargo: true, cnh: true,
                categoriaCNH: true, dataVencimentoCNH: true, telefone: true,
            }
        });

        const enriched = funcionarios.map((f: any) => ({
            ...f,
            diasRestantes: f.dataVencimentoCNH
                ? Math.ceil((new Date(f.dataVencimentoCNH).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                : null,
        }));

        const columns = [
            { key: 'nome', label: 'Nome' },
            { key: 'cpf', label: 'CPF' },
            { key: 'cargo', label: 'Cargo' },
            { key: 'categoriaCNH', label: 'Categoria CNH' },
            { key: 'dataVencimentoCNH', label: 'Vencimento CNH' },
            { key: 'diasRestantes', label: 'Dias Restantes' },
            { key: 'telefone', label: 'Telefone' },
        ];

        if (formato === 'csv') {
            return sendCSV(res, 'motoristas_cnh_vencendo.csv', toCSV(enriched, columns));
        }
        res.json(enriched);
    } catch (error) {
        console.error('Relatório CNH error:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
};

// ─── RELATÓRIO: ADMISSÕES POR PERÍODO ───────────────────────────

export const relatorioAdmissoes = async (req: AuthRequest, res: Response) => {
    try {
        const { formato, dataInicio, dataFim } = req.query;
        const now = new Date();

        let start: Date;
        let end: Date = new Date();

        if (dataInicio && dataFim) {
            start = new Date(dataInicio as string);
            end = new Date(dataFim as string);
        } else {
            start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        const funcionarios = await (prisma as any).funcionario.findMany({
            where: {
                dataAdmissao: { gte: start, lte: end },
            },
            orderBy: { dataAdmissao: 'desc' },
            select: {
                nome: true, cpf: true, cargo: true, departamento: true,
                dataAdmissao: true, tipo: true, email: true,
            }
        });

        const columns = [
            { key: 'nome', label: 'Nome' },
            { key: 'cpf', label: 'CPF' },
            { key: 'cargo', label: 'Cargo' },
            { key: 'departamento', label: 'Departamento' },
            { key: 'dataAdmissao', label: 'Data Admissão' },
            { key: 'tipo', label: 'Tipo' },
        ];

        if (formato === 'csv') {
            return sendCSV(res, 'admissoes_periodo.csv', toCSV(funcionarios, columns));
        }
        res.json(funcionarios);
    } catch (error) {
        console.error('Relatório admissões error:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
};

// ─── RELATÓRIO: DESLIGAMENTOS POR PERÍODO ───────────────────────

export const relatorioDesligamentos = async (req: AuthRequest, res: Response) => {
    try {
        const { formato, dataInicio, dataFim } = req.query;
        const now = new Date();

        let start: Date;
        let end: Date = new Date();

        if (dataInicio && dataFim) {
            start = new Date(dataInicio as string);
            end = new Date(dataFim as string);
        } else {
            start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        const funcionarios = await (prisma as any).funcionario.findMany({
            where: {
                status: 'DESLIGADO',
                dataDesligamento: { gte: start, lte: end },
            },
            orderBy: { dataDesligamento: 'desc' },
            select: {
                nome: true, cpf: true, cargo: true, departamento: true,
                dataAdmissao: true, dataDesligamento: true,
            }
        });

        const columns = [
            { key: 'nome', label: 'Nome' },
            { key: 'cpf', label: 'CPF' },
            { key: 'cargo', label: 'Cargo' },
            { key: 'departamento', label: 'Departamento' },
            { key: 'dataAdmissao', label: 'Admissão' },
            { key: 'dataDesligamento', label: 'Desligamento' },
        ];

        if (formato === 'csv') {
            return sendCSV(res, 'desligamentos_periodo.csv', toCSV(funcionarios, columns));
        }
        res.json(funcionarios);
    } catch (error) {
        console.error('Relatório desligamentos error:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
};

// ─── RELATÓRIO: LÍDERES ─────────────────────────────────────────

export const relatorioLideres = async (req: AuthRequest, res: Response) => {
    try {
        const { formato } = req.query;

        const funcionarios = await (prisma as any).funcionario.findMany({
            where: {
                ativo: true,
                OR: [
                    { cargo: { contains: 'Líder', mode: 'insensitive' } },
                    { cargo: { contains: 'Lider', mode: 'insensitive' } },
                    { cargo: { contains: 'Gerente', mode: 'insensitive' } },
                    { cargo: { contains: 'Supervisor', mode: 'insensitive' } },
                    { cargo: { contains: 'Coordenador', mode: 'insensitive' } },
                    { cargo: { contains: 'Encarregado', mode: 'insensitive' } },
                ],
            },
            orderBy: { nome: 'asc' },
            select: {
                nome: true, cpf: true, cargo: true, departamento: true,
                dataAdmissao: true, email: true, telefone: true,
            }
        });

        const columns = [
            { key: 'nome', label: 'Nome' },
            { key: 'cargo', label: 'Cargo' },
            { key: 'departamento', label: 'Departamento' },
            { key: 'dataAdmissao', label: 'Admissão' },
            { key: 'email', label: 'E-mail' },
            { key: 'telefone', label: 'Telefone' },
        ];

        if (formato === 'csv') {
            return sendCSV(res, 'relatorio_lideres.csv', toCSV(funcionarios, columns));
        }
        res.json(funcionarios);
    } catch (error) {
        console.error('Relatório líderes error:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
};

// ─── RELATÓRIO: ASOs ────────────────────────────────────────────

export const relatorioASOs = async (req: AuthRequest, res: Response) => {
    try {
        const { formato } = req.query;
        const now = new Date();
        const em30dias = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const asos = await (prisma as any).aSOControle.findMany({
            where: {
                dataVencimento: { lte: em30dias },
            },
            include: { funcionario: { select: { nome: true, cpf: true, cargo: true } } },
            orderBy: { dataVencimento: 'asc' },
        });

        const enriched = asos.map((a: any) => ({
            nome: a.funcionario?.nome,
            cpf: a.funcionario?.cpf,
            cargo: a.funcionario?.cargo,
            tipo: a.tipo,
            clinica: a.clinica,
            dataExame: a.dataExame,
            dataVencimento: a.dataVencimento,
            resultado: a.resultado,
            diasRestantes: a.dataVencimento
                ? Math.ceil((new Date(a.dataVencimento).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                : null,
        }));

        const columns = [
            { key: 'nome', label: 'Funcionário' },
            { key: 'cpf', label: 'CPF' },
            { key: 'cargo', label: 'Cargo' },
            { key: 'tipo', label: 'Tipo ASO' },
            { key: 'clinica', label: 'Clínica' },
            { key: 'dataExame', label: 'Data Exame' },
            { key: 'dataVencimento', label: 'Vencimento' },
            { key: 'resultado', label: 'Resultado' },
            { key: 'diasRestantes', label: 'Dias Restantes' },
        ];

        if (formato === 'csv') {
            return sendCSV(res, 'asos_vencendo.csv', toCSV(enriched, columns));
        }
        res.json(enriched);
    } catch (error) {
        console.error('Relatório ASOs error:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
};

// ─── RELATÓRIO: LISTA DE TODOS (CUSTOM) ────────────────────────

export const relatorioGeral = async (req: AuthRequest, res: Response) => {
    try {
        const { formato } = req.query;

        const funcionarios = await (prisma as any).funcionario.findMany({
            orderBy: { nome: 'asc' },
            select: {
                nome: true, cpf: true, cargo: true, departamento: true, tipo: true,
                dataAdmissao: true, dataDesligamento: true, status: true, ativo: true,
                email: true, telefone: true, salario: true,
            }
        });

        const columns = [
            { key: 'nome', label: 'Nome' },
            { key: 'cpf', label: 'CPF' },
            { key: 'cargo', label: 'Cargo' },
            { key: 'departamento', label: 'Departamento' },
            { key: 'tipo', label: 'Tipo (CLT/PJ)' },
            { key: 'status', label: 'Status' },
            { key: 'dataAdmissao', label: 'Admissão' },
            { key: 'dataDesligamento', label: 'Desligamento' },
            { key: 'email', label: 'E-mail' },
            { key: 'telefone', label: 'Telefone' },
        ];

        if (formato === 'csv') {
            return sendCSV(res, 'relatorio_geral.csv', toCSV(funcionarios, columns));
        }
        res.json(funcionarios);
    } catch (error) {
        console.error('Relatório geral error:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
};

// ─── RELATÓRIO: PRÊMIOS (Motoristas/Jatistas/Ajudantes) ────────

export const relatorioPremios = async (req: AuthRequest, res: Response) => {
    try {
        const { formato } = req.query;

        const funcionarios = await (prisma as any).funcionario.findMany({
            where: {
                ativo: true,
                OR: [
                    { cargo: { contains: 'Motorista', mode: 'insensitive' } },
                    { cargo: { contains: 'Jatista', mode: 'insensitive' } },
                    { cargo: { contains: 'Ajudante', mode: 'insensitive' } },
                    { cargo: { contains: 'Operador', mode: 'insensitive' } },
                ],
            },
            orderBy: { nome: 'asc' },
            select: {
                nome: true, cpf: true, cargo: true, departamento: true,
                dataAdmissao: true, email: true, telefone: true,
            }
        });

        const columns = [
            { key: 'nome', label: 'Nome' },
            { key: 'cpf', label: 'CPF' },
            { key: 'cargo', label: 'Cargo' },
            { key: 'departamento', label: 'Departamento' },
            { key: 'dataAdmissao', label: 'Admissão' },
            { key: 'telefone', label: 'Telefone' },
        ];

        if (formato === 'csv') {
            return sendCSV(res, 'premios_elegiveis.csv', toCSV(funcionarios, columns));
        }
        res.json(funcionarios);
    } catch (error) {
        console.error('Relatório prêmios error:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
};

// ─── RELATÓRIO: PPP (Perfil Profissiográfico Previdenciário) ─────

export const relatorioPPP = async (req: AuthRequest, res: Response) => {
    try {
        const { formato } = req.query;

        // PPP é obrigatório para todos os desligados
        const funcionarios = await (prisma as any).funcionario.findMany({
            where: {
                status: 'DESLIGADO',
            },
            orderBy: { dataDesligamento: 'desc' },
            select: {
                nome: true, cpf: true, cargo: true, departamento: true,
                dataAdmissao: true, dataDesligamento: true, telefone: true,
            }
        });

        const enriched = funcionarios.map((f: any) => {
            const diasDesdeDesligamento = f.dataDesligamento
                ? Math.ceil((new Date().getTime() - new Date(f.dataDesligamento).getTime()) / (1000 * 60 * 60 * 24))
                : 0;
            return {
                ...f,
                diasDesdeDesligamento,
                statusPPP: diasDesdeDesligamento > 90 ? 'VENCIDO' : diasDesdeDesligamento > 60 ? 'URGENTE' : 'PENDENTE',
            };
        });

        const columns = [
            { key: 'nome', label: 'Nome' },
            { key: 'cpf', label: 'CPF' },
            { key: 'cargo', label: 'Cargo' },
            { key: 'departamento', label: 'Departamento' },
            { key: 'dataAdmissao', label: 'Admissão' },
            { key: 'dataDesligamento', label: 'Desligamento' },
            { key: 'diasDesdeDesligamento', label: 'Dias Desde Desligamento' },
            { key: 'statusPPP', label: 'Status PPP' },
        ];

        if (formato === 'csv') {
            return sendCSV(res, 'relatorio_ppp.csv', toCSV(enriched, columns));
        }
        res.json(enriched);
    } catch (error) {
        console.error('Relatório PPP error:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
};

// ─── RELATÓRIO: VENCIMENTOS GERAL ────────────────────────────────
export const relatorioVencimentosGeral = async (req: AuthRequest, res: Response) => {
    try {
        const { formato } = req.query;
        const today = new Date();
        const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
        const in60Days = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);

        const alertas: any[] = [];

        const asos = await (prisma as any).aSOControle.findMany({
            where: { dataVencimento: { lte: in30Days }, funcionario: { ativo: true } },
            include: { funcionario: { select: { nome: true, cpf: true, cargo: true } } }
        });
        asos.forEach((aso: any) => {
            if (!aso.dataVencimento) return;
            const diff = Math.ceil((new Date(aso.dataVencimento).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            alertas.push({
                nome: aso.funcionario.nome, cpf: aso.funcionario.cpf, cargo: aso.funcionario.cargo,
                tipo: 'ASO', detalhe: aso.tipo, dataVencimento: aso.dataVencimento, diasRestantes: diff
            });
        });

        const treinamentos = await (prisma as any).treinamentoRealizado.findMany({
            where: { dataVencimento: { lte: in60Days }, funcionario: { ativo: true } },
            include: { funcionario: { select: { nome: true, cpf: true, cargo: true } }, treinamento: { select: { nome: true } } }
        });
        treinamentos.forEach((t: any) => {
            if (!t.dataVencimento) return;
            const diff = Math.ceil((new Date(t.dataVencimento).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            alertas.push({
                nome: t.funcionario.nome, cpf: t.funcionario.cpf, cargo: t.funcionario.cargo,
                tipo: 'TREINAMENTO', detalhe: t.treinamento.nome, dataVencimento: t.dataVencimento, diasRestantes: diff
            });
        });

        const funcionariosCNH = await (prisma as any).funcionario.findMany({
            where: { ativo: true, OR: [{ dataVencimentoCNH: { lte: in30Days } }, { dataVencimentoMOPP: { lte: in30Days } }] },
            select: { nome: true, cpf: true, cargo: true, dataVencimentoCNH: true, dataVencimentoMOPP: true }
        });
        funcionariosCNH.forEach((f: any) => {
            if (f.dataVencimentoCNH) {
                const diff = Math.ceil((new Date(f.dataVencimentoCNH).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                if (diff <= 30) alertas.push({
                    nome: f.nome, cpf: f.cpf, cargo: f.cargo, tipo: 'CNH', detalhe: 'Renovação CNH',
                    dataVencimento: f.dataVencimentoCNH, diasRestantes: diff
                });
            }
            if (f.dataVencimentoMOPP) {
                const diff = Math.ceil((new Date(f.dataVencimentoMOPP).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                if (diff <= 30) alertas.push({
                    nome: f.nome, cpf: f.cpf, cargo: f.cargo, tipo: 'MOPP', detalhe: 'Renovação MOPP',
                    dataVencimento: f.dataVencimentoMOPP, diasRestantes: diff
                });
            }
        });

        alertas.sort((a, b) => a.diasRestantes - b.diasRestantes);

        const columns = [
            { key: 'nome', label: 'Funcionário' },
            { key: 'cpf', label: 'CPF' },
            { key: 'cargo', label: 'Cargo' },
            { key: 'tipo', label: 'Tipo' },
            { key: 'detalhe', label: 'Detalhe' },
            { key: 'dataVencimento', label: 'Data Vencimento' },
            { key: 'diasRestantes', label: 'Dias Restantes' },
        ];

        if (formato === 'csv') {
            return sendCSV(res, 'vencimentos_geral.csv', toCSV(alertas, columns));
        }
        res.json(alertas);
    } catch (error) {
        console.error('Relatório Vencimentos error:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
};
