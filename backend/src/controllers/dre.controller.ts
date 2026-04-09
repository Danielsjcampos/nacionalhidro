import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// ─── HELPERS ────────────────────────────────────────────────────
const toNum = (v: any): number => Number(v) || 0;

interface DRELine {
    codigo: string;
    descricao: string;
    valor: number;
    percentual: number;
    tipo: 'TITULO' | 'SUBTOTAL' | 'ANALITICA';
    nivel: number;
}

// ─── DRE COMPLETA COM PLANO DE CONTAS ───────────────────────────
export const getDrePorCnpj = async (req: AuthRequest, res: Response) => {
    try {
        const { ano, mes, empresa } = req.query;
        const year = ano ? Number(ano) : new Date().getFullYear();
        const month = mes ? Number(mes) - 1 : undefined; // 0-indexed

        // Date range
        let inicio: Date, fim: Date;
        if (month !== undefined) {
            inicio = new Date(year, month, 1);
            fim = new Date(year, month + 1, 1);
        } else {
            inicio = new Date(year, 0, 1);
            fim = new Date(year + 1, 0, 1);
        }

        // Get plano de contas
        const planoContas = await (prisma as any).planoContas.findMany({
            orderBy: { codigo: 'asc' },
        });

        // Get all financial data for the period
        const contasPagar = await prisma.contaPagar.findMany({
            where: {
                status: 'PAGO',
                dataPagamento: { gte: inicio, lt: fim },
            },
        });

        const contasReceber = await prisma.contaReceber.findMany({
            where: {
                status: 'RECEBIDO',
                dataRecebimento: { gte: inicio, lt: fim },
            },
        });

        const faturamentos = await (prisma as any).faturamento.findMany({
            where: {
                dataEmissao: { gte: inicio, lt: fim },
                status: { not: 'CANCELADA' },
            },
        });

        // Calculate per-plano values
        const valoresPorConta = new Map<string, number>();

        // Map contas a pagar by planoContasId
        contasPagar.forEach((c: any) => {
            if (c.planoContasId) {
                const current = valoresPorConta.get(c.planoContasId) || 0;
                valoresPorConta.set(c.planoContasId, current + toNum(c.valorPago || c.valorOriginal));
            } else {
                // Fallback: try to classify by categoria
                const key = `cat_${c.categoria}`;
                const current = valoresPorConta.get(key) || 0;
                valoresPorConta.set(key, current + toNum(c.valorPago || c.valorOriginal));
            }
        });

        // Map contas a receber by planoContasId
        contasReceber.forEach((c: any) => {
            if (c.planoContasId) {
                const current = valoresPorConta.get(c.planoContasId) || 0;
                valoresPorConta.set(c.planoContasId, current + toNum(c.valorRecebido || c.valorOriginal));
            }
        });

        // === CALCULATE DRE GROUPS ===

        // Receita Bruta = faturamento total
        const receitaBruta = faturamentos.reduce((s: number, f: any) => s + toNum(f.valorBruto), 0);

        // Receitas classified
        const receitaServicos = faturamentos
            .filter((f: any) => !empresa || f.cnpjFaturamento?.includes(empresa as string))
            .reduce((s: number, f: any) => s + toNum(f.valorBruto), 0);

        // Calculate sums by plano de contas groups (código prefix)
        const sumByPrefix = (prefix: string): number => {
            let total = 0;
            planoContas.forEach((pc: any) => {
                if (pc.codigo.startsWith(prefix) && pc.tipo === 'ANALITICA') {
                    total += valoresPorConta.get(pc.id) || 0;
                }
            });
            return total;
        };

        // Map category-based fallback sums
        const catSum = (cat: string): number => valoresPorConta.get(`cat_${cat}`) || 0;

        // Receitas (from plano de contas 1.x or fallback to contasReceber)
        const receitaOperacional = sumByPrefix('1.1');
        const receitasFinanceiras = sumByPrefix('1.2');
        const outrasReceitas = sumByPrefix('1.3');
        const totalReceitas = receitaBruta || (receitaOperacional + receitasFinanceiras + outrasReceitas);

        // Deduções (impostos)
        const deducoes = sumByPrefix('2.4') || catSum('IMPOSTOS');

        // Receita Líquida
        const receitaLiquida = totalReceitas - deducoes;

        // Custos (pessoal + operacional)
        const despesasPessoal = sumByPrefix('2.1') || catSum('SALARIOS');
        const despesasOperacionais = sumByPrefix('2.2') || (catSum('COMBUSTIVEL') + catSum('MANUTENCAO') + catSum('MATERIAL'));
        const custoTotal = despesasPessoal + despesasOperacionais;

        // Despesas Administrativas
        const despesasAdm = sumByPrefix('2.3') || catSum('ALUGUEL');

        // Despesas Financeiras
        const despesasFinanceiras = sumByPrefix('2.5');

        // Resultado
        const resultadoOperacional = receitaLiquida - custoTotal;
        const resultadoAntesImpostos = resultadoOperacional - despesasAdm - despesasFinanceiras;
        const resultadoLiquido = resultadoAntesImpostos;

        // Percentual helper
        const pct = (v: number) => totalReceitas > 0 ? Math.round((v / totalReceitas) * 10000) / 100 : 0;

        // Build DRE lines
        const linhas: DRELine[] = [
            { codigo: '1.0', descricao: '(+) RECEITA BRUTA', valor: totalReceitas, percentual: 100, tipo: 'TITULO', nivel: 1 },
            { codigo: '1.1', descricao: 'Faturamento de Serviços', valor: receitaServicos, percentual: pct(receitaServicos), tipo: 'ANALITICA', nivel: 2 },
            { codigo: '1.2', descricao: 'Receitas Financeiras', valor: receitasFinanceiras, percentual: pct(receitasFinanceiras), tipo: 'ANALITICA', nivel: 2 },
            { codigo: '1.3', descricao: 'Outras Receitas', valor: outrasReceitas, percentual: pct(outrasReceitas), tipo: 'ANALITICA', nivel: 2 },

            { codigo: '2.0', descricao: '(-) DEDUÇÕES DA RECEITA', valor: deducoes, percentual: pct(deducoes), tipo: 'TITULO', nivel: 1 },
            { codigo: '2.4', descricao: 'Impostos e Contribuições', valor: deducoes, percentual: pct(deducoes), tipo: 'ANALITICA', nivel: 2 },

            { codigo: '3.0', descricao: '(=) RECEITA OPERACIONAL LÍQUIDA', valor: receitaLiquida, percentual: pct(receitaLiquida), tipo: 'SUBTOTAL', nivel: 1 },

            { codigo: '4.0', descricao: '(-) CUSTO DOS SERVIÇOS', valor: custoTotal, percentual: pct(custoTotal), tipo: 'TITULO', nivel: 1 },
            { codigo: '4.1', descricao: 'Despesas com Pessoal', valor: despesasPessoal, percentual: pct(despesasPessoal), tipo: 'ANALITICA', nivel: 2 },
            { codigo: '4.2', descricao: 'Despesas Operacionais', valor: despesasOperacionais, percentual: pct(despesasOperacionais), tipo: 'ANALITICA', nivel: 2 },

            { codigo: '5.0', descricao: '(=) RESULTADO OPERACIONAL', valor: resultadoOperacional, percentual: pct(resultadoOperacional), tipo: 'SUBTOTAL', nivel: 1 },

            { codigo: '6.0', descricao: '(-) DESPESAS ADMINISTRATIVAS', valor: despesasAdm, percentual: pct(despesasAdm), tipo: 'TITULO', nivel: 1 },

            { codigo: '7.0', descricao: '(-) DESPESAS FINANCEIRAS', valor: despesasFinanceiras, percentual: pct(despesasFinanceiras), tipo: 'TITULO', nivel: 1 },

            { codigo: '8.0', descricao: '(=) RESULTADO ANTES DOS IMPOSTOS', valor: resultadoAntesImpostos, percentual: pct(resultadoAntesImpostos), tipo: 'SUBTOTAL', nivel: 1 },

            { codigo: '9.0', descricao: '(=) RESULTADO LÍQUIDO', valor: resultadoLiquido, percentual: pct(resultadoLiquido), tipo: 'SUBTOTAL', nivel: 1 },
        ];

        // Round all values
        linhas.forEach(l => {
            l.valor = Math.round(l.valor * 100) / 100;
        });

        // Alerts & Errors
        const erros: { msg: string; qtd: number }[] = [];
        const alertas: { msg: string; qtd: number }[] = [];

        // Check for contas without planoContas
        const semPlano = contasPagar.filter((c: any) => !c.planoContasId).length;
        if (semPlano > 0) erros.push({ msg: 'Contas a Pagar sem Plano de Conta', qtd: semPlano });

        const semPlanoReceber = contasReceber.filter((c: any) => !c.planoContasId).length;
        if (semPlanoReceber > 0) erros.push({ msg: 'Contas a Receber sem Plano de Conta', qtd: semPlanoReceber });

        // Contas em atraso
        const hoje = new Date();
        const emAtraso = await prisma.contaPagar.count({
            where: { status: 'ABERTO', dataVencimento: { lt: hoje } },
        });
        if (emAtraso > 0) alertas.push({ msg: 'Contas a Pagar em atraso ou em aberto', qtd: emAtraso });

        const receberEmAtraso = await prisma.contaReceber.count({
            where: { status: 'PENDENTE', dataVencimento: { lt: hoje } },
        });
        if (receberEmAtraso > 0) alertas.push({ msg: 'Contas a Receber em atraso ou em aberto', qtd: receberEmAtraso });

        res.json({
            periodo: month !== undefined
                ? `${String(month + 1).padStart(2, '0')}/${year}`
                : `${year}`,
            tipoCompetencia: month !== undefined ? 'mensal' : 'anual',
            linhas,
            erros,
            alertas,
        });
    } catch (error) {
        console.error('DRE por CNPJ error:', error);
        res.status(500).json({ error: 'Failed to generate DRE' });
    }
};
