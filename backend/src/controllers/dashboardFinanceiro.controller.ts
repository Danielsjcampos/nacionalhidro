import { Response } from 'express';
import prismaClient from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// Cast to any to support new models/fields added to schema
const prisma = prismaClient as any;

const toNum = (v: any): number => Number(v) || 0;

export const getDashboardFinanceiro = async (req: AuthRequest, res: Response) => {
    try {
        const now = new Date();
        const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
        const fimMes = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const inicioAno = new Date(now.getFullYear(), 0, 1);

        const [pagar, receber, faturamentos] = await Promise.all([
            prisma.contaPagar.findMany(),
            prisma.contaReceber.findMany(),
            (prisma as any).faturamento.findMany({ where: { status: { not: 'CANCELADA' } } }),
        ]);

        // ─── A PAGAR ─────────────────────────────────────────────
        const pagarPendente = pagar.filter((c: any) => ['PENDENTE', 'ABERTO'].includes(c.status));
        const pagarVencido = pagarPendente.filter((c: any) => new Date(c.dataVencimento) < now);
        const pagarPagoMes = pagar.filter((c: any) => c.status === 'PAGO' && c.dataPagamento && new Date(c.dataPagamento) >= inicioMes && new Date(c.dataPagamento) < fimMes);
        const totalPagarPendente = pagarPendente.reduce((s: number, c: any) => s + toNum(c.saldoDevedor || c.valorOriginal), 0);
        const totalPagarVencido = pagarVencido.reduce((s: number, c: any) => s + toNum(c.saldoDevedor || c.valorOriginal), 0);
        const totalPagoMes = pagarPagoMes.reduce((s: number, c: any) => s + toNum(c.valorPago || c.valorOriginal), 0);

        // ─── A RECEBER ───────────────────────────────────────────
        const receberPendente = receber.filter((c: any) => ['PENDENTE', 'PARCIAL', 'VENCIDO', 'EM_NEGOCIACAO'].includes(c.status));
        const receberVencido = receberPendente.filter((c: any) => new Date(c.dataVencimento) < now);
        const receberRecebidoMes = receber.filter((c: any) => c.status === 'RECEBIDO' && c.dataRecebimento && new Date(c.dataRecebimento) >= inicioMes && new Date(c.dataRecebimento) < fimMes);
        const totalReceberPendente = receberPendente.reduce((s: number, c: any) => s + toNum(c.saldoDevedor || c.valorOriginal), 0);
        const totalReceberVencido = receberVencido.reduce((s: number, c: any) => s + toNum(c.saldoDevedor || c.valorOriginal), 0);
        const totalRecebidoMes = receberRecebidoMes.reduce((s: number, c: any) => s + toNum(c.valorRecebido || c.valorOriginal), 0);

        // ─── FATURAMENTO ─────────────────────────────────────────
        const fatMes = faturamentos.filter((f: any) => new Date(f.dataEmissao) >= inicioMes && new Date(f.dataEmissao) < fimMes);
        const fatAno = faturamentos.filter((f: any) => new Date(f.dataEmissao) >= inicioAno);
        const totalFatMes = fatMes.reduce((s: number, f: any) => s + toNum(f.valorBruto), 0);
        const totalFatAno = fatAno.reduce((s: number, f: any) => s + toNum(f.valorBruto), 0);

        // ─── SALDO ───────────────────────────────────────────────
        const saldoLiquido = totalReceberPendente - totalPagarPendente;

        // ─── FLUXO 6 MESES ──────────────────────────────────────
        const fluxoMensal: any[] = [];
        for (let i = -5; i <= 0; i++) {
            const inicio = new Date(now.getFullYear(), now.getMonth() + i, 1);
            const fim = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
            const label = `${String(inicio.getMonth() + 1).padStart(2, '0')}/${inicio.getFullYear()}`;
            const entradas = receber.filter((c: any) => c.status === 'RECEBIDO' && c.dataRecebimento && new Date(c.dataRecebimento) >= inicio && new Date(c.dataRecebimento) < fim).reduce((s: number, c: any) => s + toNum(c.valorRecebido || c.valorOriginal), 0);
            const saidas = pagar.filter((c: any) => c.status === 'PAGO' && c.dataPagamento && new Date(c.dataPagamento) >= inicio && new Date(c.dataPagamento) < fim).reduce((s: number, c: any) => s + toNum(c.valorPago || c.valorOriginal), 0);
            fluxoMensal.push({ mes: label, entradas: Math.round(entradas * 100) / 100, saidas: Math.round(saidas * 100) / 100, saldo: Math.round((entradas - saidas) * 100) / 100 });
        }

        // ─── PRÓXIMOS VENCIMENTOS (7 dias) ───────────────────────
        const semana = new Date(now); semana.setDate(semana.getDate() + 7);
        const proximosPagar = pagar
            .filter((c: any) => ['PENDENTE', 'ABERTO'].includes(c.status) && new Date(c.dataVencimento) >= now && new Date(c.dataVencimento) <= semana)
            .map((c: any) => ({ id: c.id, descricao: c.descricao, valor: toNum(c.saldoDevedor || c.valorOriginal), vencimento: c.dataVencimento, tipo: 'PAGAR' }))
            .sort((a: any, b: any) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime())
            .slice(0, 10);

        const proximosReceber = receber
            .filter((c: any) => ['PENDENTE', 'PARCIAL'].includes(c.status) && new Date(c.dataVencimento) >= now && new Date(c.dataVencimento) <= semana)
            .map((c: any) => ({ id: c.id, descricao: c.descricao, valor: toNum(c.saldoDevedor || c.valorOriginal), vencimento: c.dataVencimento, tipo: 'RECEBER' }))
            .sort((a: any, b: any) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime())
            .slice(0, 10);

        // ─── ALERTAS ─────────────────────────────────────────────
        const alertas: any[] = [];
        if (totalPagarVencido > 0) alertas.push({ tipo: 'CRITICO', msg: `${pagarVencido.length} conta(s) a pagar vencida(s): R$ ${totalPagarVencido.toFixed(2)}` });
        if (totalReceberVencido > 0) alertas.push({ tipo: 'ALERTA', msg: `${receberVencido.length} conta(s) a receber vencida(s): R$ ${totalReceberVencido.toFixed(2)}` });
        if (saldoLiquido < 0) alertas.push({ tipo: 'CRITICO', msg: `Saldo líquido negativo: R$ ${saldoLiquido.toFixed(2)}` });
        if (proximosPagar.length > 5) alertas.push({ tipo: 'INFO', msg: `${proximosPagar.length} pagamentos nos próximos 7 dias` });

        res.json({
            pagar: {
                pendente: Math.round(totalPagarPendente * 100) / 100,
                vencido: Math.round(totalPagarVencido * 100) / 100,
                pagoMes: Math.round(totalPagoMes * 100) / 100,
                qtdPendente: pagarPendente.length,
                qtdVencido: pagarVencido.length,
            },
            receber: {
                pendente: Math.round(totalReceberPendente * 100) / 100,
                vencido: Math.round(totalReceberVencido * 100) / 100,
                recebidoMes: Math.round(totalRecebidoMes * 100) / 100,
                qtdPendente: receberPendente.length,
                qtdVencido: receberVencido.length,
            },
            faturamento: {
                mes: Math.round(totalFatMes * 100) / 100,
                ano: Math.round(totalFatAno * 100) / 100,
            },
            saldoLiquido: Math.round(saldoLiquido * 100) / 100,
            fluxoMensal,
            proximosPagar,
            proximosReceber,
            alertas,
        });
    } catch (error) {
        console.error('Dashboard financeiro error:', error);
        res.status(500).json({ error: 'Falha ao gerar dashboard' });
    }
};
