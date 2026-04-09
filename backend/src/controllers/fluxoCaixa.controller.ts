import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// ─── FLUXO DE CAIXA (últimos 6 meses + próximos 3) ──────────────
export const getFluxoCaixa = async (req: AuthRequest, res: Response) => {
    try {
        const now = new Date();
        const meses: { label: string; inicio: Date; fim: Date }[] = [];

        // 6 meses atrás + mês atual + 3 meses à frente = 10 meses
        for (let i = -6; i <= 3; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
            const fim = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
            meses.push({
                label: `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`,
                inicio: d,
                fim
            });
        }

        const pagar = await prisma.contaPagar.findMany();
        const receber = await prisma.contaReceber.findMany();
        const faturamentos = await (prisma as any).faturamento.findMany();

        const fluxo = meses.map(m => {
            // Entradas (recebidas ou previstas)
            const entradasRecebidas = receber
                .filter((c: any) => c.status === 'RECEBIDO' && new Date(c.dataRecebimento!) >= m.inicio && new Date(c.dataRecebimento!) < m.fim)
                .reduce((s: number, c: any) => s + Number(c.valorRecebido || c.valorOriginal), 0);
            const entradasPrevistas = receber
                .filter((c: any) => c.status === 'PENDENTE' && new Date(c.dataVencimento) >= m.inicio && new Date(c.dataVencimento) < m.fim)
                .reduce((s: number, c: any) => s + Number(c.valorOriginal), 0);

            // Faturamento do mês
            const faturamentoMes = faturamentos
                .filter((f: any) => new Date(f.dataEmissao) >= m.inicio && new Date(f.dataEmissao) < m.fim && f.status !== 'CANCELADA')
                .reduce((s: number, f: any) => s + Number(f.valorBruto || 0), 0);

            // Saídas (pagas ou previstas)
            const saidasPagas = pagar
                .filter((c: any) => c.status === 'PAGO' && new Date(c.dataPagamento!) >= m.inicio && new Date(c.dataPagamento!) < m.fim)
                .reduce((s: number, c: any) => s + Number(c.valorPago || c.valorOriginal), 0);
            const saidasPrevistas = pagar
                .filter((c: any) => c.status === 'PENDENTE' && new Date(c.dataVencimento) >= m.inicio && new Date(c.dataVencimento) < m.fim)
                .reduce((s: number, c: any) => s + Number(c.valorOriginal), 0);

            const totalEntradas = entradasRecebidas + entradasPrevistas;
            const totalSaidas = saidasPagas + saidasPrevistas;

            return {
                mes: m.label,
                entradas: {
                    recebidas: Math.round(entradasRecebidas * 100) / 100,
                    previstas: Math.round(entradasPrevistas * 100) / 100,
                    total: Math.round(totalEntradas * 100) / 100,
                },
                saidas: {
                    pagas: Math.round(saidasPagas * 100) / 100,
                    previstas: Math.round(saidasPrevistas * 100) / 100,
                    total: Math.round(totalSaidas * 100) / 100,
                },
                faturamento: Math.round(faturamentoMes * 100) / 100,
                saldo: Math.round((totalEntradas - totalSaidas) * 100) / 100,
            };
        });

        // Saldo acumulado
        let acumulado = 0;
        const fluxoComAcumulado = fluxo.map(m => {
            acumulado += m.saldo;
            return { ...m, saldoAcumulado: Math.round(acumulado * 100) / 100 };
        });

        res.json(fluxoComAcumulado);
    } catch (error) {
        console.error('Fluxo caixa error:', error);
        res.status(500).json({ error: 'Failed to get cashflow' });
    }
};

// ─── RELATÓRIO GERENCIAL ────────────────────────────────────────
export const getRelatorioGerencial = async (req: AuthRequest, res: Response) => {
    try {
        const now = new Date();
        const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
        const fimMes = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        // OS stats
        const totalOS = await prisma.ordemServico.count();
        const osEmExecucao = await prisma.ordemServico.count({ where: { status: 'EM_EXECUCAO' } });
        const osMesAtual = await prisma.ordemServico.count({
            where: { createdAt: { gte: inicioMes, lt: fimMes } }
        });

        // Clientes
        const totalClientes = await prisma.cliente.count();
        const clientesAtivos = totalClientes;

        // Propostas
        const totalPropostas = await prisma.proposta.count();
        const propostasAprovadas = await prisma.proposta.count({ where: { status: 'APROVADA' } });
        const propostasPendentes = await prisma.proposta.count({ where: { status: 'PENDENTE' } });
        const taxaConversao = totalPropostas > 0 ? Math.round((propostasAprovadas / totalPropostas) * 100) : 0;

        // Financeiro 
        const pagar = await prisma.contaPagar.findMany();
        const receber = await prisma.contaReceber.findMany();

        const pendentePagar = pagar.filter((c: any) => c.status === 'PENDENTE').reduce((s: number, c: any) => s + Number(c.valorOriginal), 0);
        const pendeteReceber = receber.filter((c: any) => c.status === 'PENDENTE').reduce((s: number, c: any) => s + Number(c.valorOriginal), 0);
        const totalPago = pagar.filter((c: any) => c.status === 'PAGO').reduce((s: number, c: any) => s + Number(c.valorPago || c.valorOriginal), 0);
        const totalRecebido = receber.filter((c: any) => c.status === 'RECEBIDO').reduce((s: number, c: any) => s + Number(c.valorRecebido || c.valorOriginal), 0);

        // Veículos
        const veiculosTotal = await prisma.veiculo.count();
        const veiculosDisponiveis = await prisma.veiculo.count({ where: { status: 'DISPONIVEL' } });
        const veiculosManutencao = await prisma.veiculo.count({ where: { status: 'MANUTENCAO' } });

        // Funcionários
        const funcTotal = await prisma.funcionario.count();
        const funcAtivos = await prisma.funcionario.count({ where: { status: 'ATIVO' } });

        // Faturamento mensal
        const faturamentos = await (prisma as any).faturamento.findMany({
            where: { dataEmissao: { gte: inicioMes, lt: fimMes }, status: { not: 'CANCELADA' } }
        });
        const faturamentoMensal = faturamentos.reduce((s: number, f: any) => s + Number(f.valorBruto || 0), 0);

        res.json({
            os: { total: totalOS, emExecucao: osEmExecucao, mesAtual: osMesAtual },
            clientes: { total: totalClientes, ativos: clientesAtivos },
            propostas: { total: totalPropostas, aprovadas: propostasAprovadas, pendentes: propostasPendentes, taxaConversao },
            financeiro: {
                pendentePagar: Math.round(pendentePagar * 100) / 100,
                pendenteReceber: Math.round(pendeteReceber * 100) / 100,
                totalPago: Math.round(totalPago * 100) / 100,
                totalRecebido: Math.round(totalRecebido * 100) / 100,
                saldo: Math.round((totalRecebido - totalPago) * 100) / 100,
                faturamentoMensal: Math.round(faturamentoMensal * 100) / 100,
            },
            veiculos: { total: veiculosTotal, disponiveis: veiculosDisponiveis, manutencao: veiculosManutencao },
            funcionarios: { total: funcTotal, ativos: funcAtivos },
        });
    } catch (error) {
        console.error('Relatorio gerencial error:', error);
        res.status(500).json({ error: 'Failed to get management report' });
    }
};

// ─── FLUXO DE CAIXA DIÁRIO ──────────────────────────────────────
export const getFluxoCaixaDiario = async (req: AuthRequest, res: Response) => {
    try {
        const { dataInicio, dataFim, contaBancariaId } = req.query;
        
        const inicio = dataInicio ? new Date(dataInicio as string) : (() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d; })();
        const fim = dataFim ? new Date(dataFim as string) : (() => { const d = new Date(); d.setMonth(d.getMonth() + 1, 0); d.setHours(23,59,59,999); return d; })();
        
        const wherePagar: any = {};
        const whereReceber: any = {};
        if (contaBancariaId) {
            wherePagar.contaBancariaId = contaBancariaId;
            whereReceber.contaBancariaId = contaBancariaId;
        }

        const pagar = await (prisma as any).contaPagar.findMany({ where: wherePagar });
        const receber = await (prisma as any).contaReceber.findMany({ where: whereReceber });

        // Build day-by-day data
        const dias: Map<string, { credito: number; debito: number }> = new Map();
        const diaNames = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

        // Credits (recebidos or previstos)
        receber.forEach((c: any) => {
            const d = c.status === 'RECEBIDO' && c.dataRecebimento
                ? new Date(c.dataRecebimento)
                : new Date(c.dataVencimento);
            if (d >= inicio && d <= fim) {
                const key = d.toISOString().substring(0, 10);
                const val = Number(c.status === 'RECEBIDO' ? (c.valorRecebido || c.valorOriginal) : c.valorOriginal);
                const entry = dias.get(key) || { credito: 0, debito: 0 };
                entry.credito += val;
                dias.set(key, entry);
            }
        });

        // Debits (pagos or previstos)
        pagar.forEach((c: any) => {
            const d = c.status === 'PAGO' && c.dataPagamento
                ? new Date(c.dataPagamento)
                : new Date(c.dataVencimento);
            if (d >= inicio && d <= fim) {
                const key = d.toISOString().substring(0, 10);
                const val = Number(c.status === 'PAGO' ? (c.valorPago || c.valorOriginal) : c.valorOriginal);
                const entry = dias.get(key) || { credito: 0, debito: 0 };
                entry.debito += val;
                dias.set(key, entry);
            }
        });

        // Calculate running balance
        // Get initial balance from conta bancária if provided
        let saldoInicial = 0;
        if (contaBancariaId) {
            const conta = await (prisma as any).contaBancaria.findUnique({ where: { id: contaBancariaId as string } });
            saldoInicial = Number(conta?.saldoInicial || 0);
            // Add movements before inicio
            receber.forEach((c: any) => {
                const d = c.status === 'RECEBIDO' && c.dataRecebimento ? new Date(c.dataRecebimento) : new Date(c.dataVencimento);
                if (d < inicio && c.status === 'RECEBIDO') saldoInicial += Number(c.valorRecebido || c.valorOriginal);
            });
            pagar.forEach((c: any) => {
                const d = c.status === 'PAGO' && c.dataPagamento ? new Date(c.dataPagamento) : new Date(c.dataVencimento);
                if (d < inicio && c.status === 'PAGO') saldoInicial -= Number(c.valorPago || c.valorOriginal);
            });
        }

        // Sort and build result
        const sorted = Array.from(dias.entries()).sort(([a], [b]) => a.localeCompare(b));
        let saldoAcumulado = saldoInicial;
        const resultado = sorted.map(([dateStr, val]) => {
            const d = new Date(dateStr + 'T12:00:00');
            const saldoDia = val.credito - val.debito;
            saldoAcumulado += saldoDia;
            return {
                data: dateStr,
                diaSemana: diaNames[d.getDay()],
                credito: Math.round(val.credito * 100) / 100,
                debito: Math.round(val.debito * 100) / 100,
                saldoDia: Math.round(saldoDia * 100) / 100,
                saldoAcumulado: Math.round(saldoAcumulado * 100) / 100,
            };
        });

        res.json({
            periodo: { inicio: inicio.toISOString().substring(0, 10), fim: fim.toISOString().substring(0, 10) },
            saldoInicial: Math.round(saldoInicial * 100) / 100,
            dias: resultado,
            totais: {
                credito: Math.round(resultado.reduce((s, d) => s + d.credito, 0) * 100) / 100,
                debito: Math.round(resultado.reduce((s, d) => s + d.debito, 0) * 100) / 100,
                saldo: Math.round((resultado.reduce((s, d) => s + d.credito, 0) - resultado.reduce((s, d) => s + d.debito, 0)) * 100) / 100,
            }
        });
    } catch (error) {
        console.error('Fluxo caixa diário error:', error);
        res.status(500).json({ error: 'Failed to get daily cashflow' });
    }
};

// ─── DETALHES DE UM DIA ESPECÍFICO ──────────────────────────────
export const getFluxoCaixaDiarioDetalhes = async (req: AuthRequest, res: Response) => {
    try {
        const { data } = req.params;
        const { contaBancariaId } = req.query;
        const dia = new Date(data as string);
        dia.setHours(0, 0, 0, 0);
        const proximoDia = new Date(dia);
        proximoDia.setDate(proximoDia.getDate() + 1);

        const wherePagar: any = {};
        const whereReceber: any = {};
        if (contaBancariaId) {
            wherePagar.contaBancariaId = contaBancariaId;
            whereReceber.contaBancariaId = contaBancariaId;
        }

        const pagar = await (prisma as any).contaPagar.findMany({
            where: wherePagar,
            include: { fornecedor: { select: { nome: true } } },
        });
        const receber = await (prisma as any).contaReceber.findMany({
            where: whereReceber,
            include: { cliente: { select: { nome: true } } },
        });

        const creditos: any[] = [];
        receber.forEach((c: any) => {
            const d = c.status === 'RECEBIDO' && c.dataRecebimento ? new Date(c.dataRecebimento) : new Date(c.dataVencimento);
            if (d >= dia && d < proximoDia) {
                creditos.push({
                    tipo: 'CREDITO',
                    id: c.id,
                    descricao: c.descricao,
                    entidade: c.cliente?.nome || '—',
                    valor: Number(c.status === 'RECEBIDO' ? (c.valorRecebido || c.valorOriginal) : c.valorOriginal),
                    status: c.status,
                    formaPagamento: c.formaPagamento,
                    notaFiscal: c.notaFiscal,
                });
            }
        });

        const debitos: any[] = [];
        pagar.forEach((c: any) => {
            const d = c.status === 'PAGO' && c.dataPagamento ? new Date(c.dataPagamento) : new Date(c.dataVencimento);
            if (d >= dia && d < proximoDia) {
                debitos.push({
                    tipo: 'DEBITO',
                    id: c.id,
                    descricao: c.descricao,
                    entidade: c.fornecedor?.nome || '—',
                    valor: Number(c.status === 'PAGO' ? (c.valorPago || c.valorOriginal) : c.valorOriginal),
                    status: c.status,
                    formaPagamento: c.formaPagamento,
                    notaFiscal: c.notaFiscal,
                });
            }
        });

        const totalCredito = creditos.reduce((s, c) => s + c.valor, 0);
        const totalDebito = debitos.reduce((s, d) => s + d.valor, 0);

        res.json({
            data: data,
            creditos,
            debitos,
            totalCredito: Math.round(totalCredito * 100) / 100,
            totalDebito: Math.round(totalDebito * 100) / 100,
            saldo: Math.round((totalCredito - totalDebito) * 100) / 100,
        });
    } catch (error) {
        console.error('Fluxo caixa detalhes error:', error);
        res.status(500).json({ error: 'Failed to get daily details' });
    }
};
