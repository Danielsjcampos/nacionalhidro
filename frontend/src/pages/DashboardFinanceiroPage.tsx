import { useEffect, useState } from 'react';
import api from '../services/api';
import {
    Loader2, DollarSign, TrendingUp, TrendingDown, AlertTriangle,
    ArrowUpRight, ArrowDownRight, Calendar, BarChart3, AlertCircle, Info
} from 'lucide-react';

export default function DashboardFinanceiroPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const defaultData = {
            pagar: { pendente: 0, qtdPendente: 0, qtdVencido: 0, pagoMes: 0 },
            receber: { pendente: 0, qtdPendente: 0, qtdVencido: 0, recebidoMes: 0 },
            faturamento: { mes: 0, ano: 0 },
            saldoLiquido: 0,
            alertas: [],
            fluxoMensal: [],
            proximosPagar: [],
            proximosReceber: []
        };
        api.get('/dashboard-financeiro').then(r => { 
            setData(r.data || defaultData); 
            setLoading(false); 
        }).catch(() => {
            setData(defaultData);
            setLoading(false);
        });
    }, []);

    const fmt = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

    if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
    if (!data) return <p className="text-sm text-slate-400">Sem dados</p>;

    const maxFluxo = Math.max(...data.fluxoMensal.map((m: any) => Math.max(m.entradas, m.saidas)), 1);

    return (
        <div className="h-full flex flex-col space-y-4 overflow-y-auto">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Dashboard Financeiro</h1>
                <p className="text-sm text-slate-500">Visão unificada — Pagar, Receber e Faturamento</p>
            </div>

            {/* Alertas */}
            {data.alertas.length > 0 && (
                <div className="space-y-1.5">
                    {data.alertas.map((a: any, i: number) => (
                        <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold ${a.tipo === 'CRITICO' ? 'bg-red-50 text-red-700' : a.tipo === 'ALERTA' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                            {a.tipo === 'CRITICO' ? <AlertTriangle className="w-3.5 h-3.5" /> : a.tipo === 'ALERTA' ? <AlertCircle className="w-3.5 h-3.5" /> : <Info className="w-3.5 h-3.5" />}
                            {a.msg}
                        </div>
                    ))}
                </div>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-5 gap-3">
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-1.5 mb-2"><TrendingDown className="w-4 h-4 text-red-500" /><span className="text-[9px] font-black text-slate-400 uppercase">A Pagar</span></div>
                    <p className="text-xl font-black text-red-600">{fmt(data.pagar.pendente)}</p>
                    <div className="flex gap-2 mt-1.5 text-[10px]">
                        <span className="text-slate-400">{data.pagar.qtdPendente} títulos</span>
                        {data.pagar.qtdVencido > 0 && <span className="text-red-500 font-bold">⚠️ {data.pagar.qtdVencido} vencido(s)</span>}
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-1.5 mb-2"><TrendingUp className="w-4 h-4 text-emerald-500" /><span className="text-[9px] font-black text-slate-400 uppercase">A Receber</span></div>
                    <p className="text-xl font-black text-emerald-600">{fmt(data.receber.pendente)}</p>
                    <div className="flex gap-2 mt-1.5 text-[10px]">
                        <span className="text-slate-400">{data.receber.qtdPendente} títulos</span>
                        {data.receber.qtdVencido > 0 && <span className="text-amber-500 font-bold">⚠️ {data.receber.qtdVencido} vencido(s)</span>}
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-1.5 mb-2"><BarChart3 className="w-4 h-4 text-blue-500" /><span className="text-[9px] font-black text-slate-400 uppercase">Faturamento/Mês</span></div>
                    <p className="text-xl font-black text-blue-600">{fmt(data.faturamento.mes)}</p>
                    <p className="text-[10px] text-slate-400 mt-1.5">Ano: {fmt(data.faturamento.ano)}</p>
                </div>
                <div className={`bg-white rounded-xl border p-4 ${data.saldoLiquido >= 0 ? 'border-emerald-200' : 'border-red-200'}`}>
                    <div className="flex items-center gap-1.5 mb-2"><DollarSign className="w-4 h-4 text-slate-500" /><span className="text-[9px] font-black text-slate-400 uppercase">Saldo Líquido</span></div>
                    <p className={`text-xl font-black ${data.saldoLiquido >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(data.saldoLiquido)}</p>
                    <p className="text-[10px] text-slate-400 mt-1.5">Receber - Pagar</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-1.5 mb-2"><Calendar className="w-4 h-4 text-slate-500" /><span className="text-[9px] font-black text-slate-400 uppercase">Movimentado/Mês</span></div>
                    <div className="flex gap-2 mt-1">
                        <div><p className="text-[9px] text-emerald-500 font-bold">Recebido</p><p className="text-sm font-black text-emerald-600">{fmt(data.receber.recebidoMes)}</p></div>
                        <div><p className="text-[9px] text-red-500 font-bold">Pago</p><p className="text-sm font-black text-red-600">{fmt(data.pagar.pagoMes)}</p></div>
                    </div>
                </div>
            </div>

            {/* Fluxo Mensal Chart + Próximos Vencimentos */}
            <div className="grid grid-cols-3 gap-3">
                {/* Mini Chart */}
                <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-3">Fluxo de Caixa — Últimos 6 Meses</p>
                    <div className="flex items-end gap-2 h-32">
                        {data.fluxoMensal.map((m: any, i: number) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                <div className="flex gap-0.5 items-end w-full justify-center" style={{ height: '100px' }}>
                                    <div className="w-3 bg-emerald-400 rounded-t" style={{ height: `${(m.entradas / maxFluxo) * 100}px` }} title={`Entradas: ${fmt(m.entradas)}`}></div>
                                    <div className="w-3 bg-red-400 rounded-t" style={{ height: `${(m.saidas / maxFluxo) * 100}px` }} title={`Saídas: ${fmt(m.saidas)}`}></div>
                                </div>
                                <p className="text-[8px] text-slate-400 font-bold">{m.mes.substring(0, 2)}</p>
                                <p className={`text-[8px] font-black ${m.saldo >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{m.saldo >= 0 ? '+' : ''}{(m.saldo / 1000).toFixed(0)}k</p>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-4 mt-2 text-[9px] text-slate-400">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-400"></span>Entradas</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-400"></span>Saídas</span>
                    </div>
                </div>

                {/* Próximos Vencimentos */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 overflow-y-auto" style={{ maxHeight: '220px' }}>
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Próximos 7 Dias</p>
                    <div className="space-y-1.5">
                        {[...data.proximosPagar, ...data.proximosReceber]
                            .sort((a: any, b: any) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime())
                            .map((item: any, i: number) => (
                                <div key={i} className="flex items-center justify-between text-[10px] py-1 border-b border-slate-50">
                                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                        {item.tipo === 'PAGAR' ? <ArrowDownRight className="w-3 h-3 text-red-500 flex-shrink-0" /> : <ArrowUpRight className="w-3 h-3 text-emerald-500 flex-shrink-0" />}
                                        <span className="truncate text-slate-600">{item.descricao}</span>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className="text-slate-400">{fmtDate(item.vencimento)}</span>
                                        <span className={`font-black ${item.tipo === 'PAGAR' ? 'text-red-600' : 'text-emerald-600'}`}>{fmt(item.valor)}</span>
                                    </div>
                                </div>
                            ))}
                        {data.proximosPagar.length === 0 && data.proximosReceber.length === 0 && (
                            <p className="text-[10px] text-slate-400 text-center py-4">Sem vencimentos próximos</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Access */}
            <div className="grid grid-cols-4 gap-3">
                <a href="/contas-pagar" className="bg-white rounded-xl border border-slate-200 p-3 hover:border-blue-300 hover:bg-blue-50/30 transition-colors group">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center"><TrendingDown className="w-4 h-4 text-red-500" /></div>
                        <div><p className="text-xs font-bold text-slate-700 group-hover:text-blue-700">Contas a Pagar</p><p className="text-[9px] text-slate-400">{data.pagar.qtdPendente} pendentes</p></div>
                    </div>
                </a>
                <a href="/cobranca" className="bg-white rounded-xl border border-slate-200 p-3 hover:border-blue-300 hover:bg-blue-50/30 transition-colors group">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center"><TrendingUp className="w-4 h-4 text-emerald-500" /></div>
                        <div><p className="text-xs font-bold text-slate-700 group-hover:text-blue-700">Cobrança</p><p className="text-[9px] text-slate-400">{data.receber.qtdVencido} vencidos</p></div>
                    </div>
                </a>
                <a href="/dre" className="bg-white rounded-xl border border-slate-200 p-3 hover:border-blue-300 hover:bg-blue-50/30 transition-colors group">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center"><BarChart3 className="w-4 h-4 text-blue-500" /></div>
                        <div><p className="text-xs font-bold text-slate-700 group-hover:text-blue-700">DRE</p><p className="text-[9px] text-slate-400">Por CNPJ</p></div>
                    </div>
                </a>
                <a href="/plano-contas" className="bg-white rounded-xl border border-slate-200 p-3 hover:border-blue-300 hover:bg-blue-50/30 transition-colors group">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center"><DollarSign className="w-4 h-4 text-amber-500" /></div>
                        <div><p className="text-xs font-bold text-slate-700 group-hover:text-blue-700">Plano de Contas</p><p className="text-[9px] text-slate-400">Classificação</p></div>
                    </div>
                </a>
            </div>
        </div>
    );
}
