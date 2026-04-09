import { useEffect, useState } from 'react';
import api from '../services/api';
import {
    Loader2, TrendingUp, TrendingDown, DollarSign, BarChart3,
    Users, Truck, FileText, Briefcase, PieChart, ArrowUpRight, ArrowDownRight
} from 'lucide-react';

export default function FluxoCaixa() {
    const [fluxo, setFluxo] = useState<any[]>([]);
    const [gerencial, setGerencial] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'fluxo' | 'gerencial'>('fluxo');

    useEffect(() => {
        Promise.all([
            api.get('/relatorios/fluxo-caixa'),
            api.get('/relatorios/relatorio-gerencial')
        ]).then(([f, g]) => {
            setFluxo(f.data);
            setGerencial(g.data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const fmt = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

    return (
        <div className="h-full flex flex-col space-y-4 overflow-hidden">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Relatórios Gerenciais</h1>
                    <p className="text-sm text-slate-500">Fluxo de Caixa • Indicadores em tempo real</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
                <button onClick={() => setTab('fluxo')} className={`px-4 py-1.5 rounded-md text-xs font-bold ${tab === 'fluxo' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>
                    <BarChart3 className="w-3.5 h-3.5 inline mr-1" /> Fluxo de Caixa
                </button>
                <button onClick={() => setTab('gerencial')} className={`px-4 py-1.5 rounded-md text-xs font-bold ${tab === 'gerencial' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>
                    <PieChart className="w-3.5 h-3.5 inline mr-1" /> Relatório Gerencial
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {tab === 'fluxo' && (
                    <div className="space-y-4">
                        {/* Chart-like bar visualization */}
                        <div className="bg-white rounded-xl border border-slate-200 p-4">
                            <h2 className="text-xs font-black text-slate-400 uppercase mb-4">Fluxo de Caixa — Últimos 6 meses + Projeção 3 meses</h2>
                            <div className="grid grid-cols-10 gap-1">
                                {fluxo.map((m, i) => {
                                    const maxVal = Math.max(...fluxo.map(f => Math.max(f.entradas.total, f.saidas.total, 1)));
                                    const entradaH = Math.max(8, (m.entradas.total / maxVal) * 120);
                                    const saidaH = Math.max(8, (m.saidas.total / maxVal) * 120);
                                    const isFuturo = i >= 7;
                                    return (
                                        <div key={m.mes} className={`text-center ${isFuturo ? 'opacity-60' : ''}`}>
                                            <div className="flex items-end justify-center gap-0.5 h-[130px]">
                                                <div className="w-3 bg-emerald-400 rounded-t" style={{ height: entradaH }} title={`Entradas: ${fmt(m.entradas.total)}`} />
                                                <div className="w-3 bg-blue-800 rounded-t" style={{ height: saidaH }} title={`Saídas: ${fmt(m.saidas.total)}`} />
                                            </div>
                                            <p className="text-[9px] font-bold text-slate-500 mt-1">{m.mes}</p>
                                            <p className={`text-[9px] font-black ${m.saldo >= 0 ? 'text-emerald-600' : 'text-blue-700'}`}>{m.saldo >= 0 ? '+' : ''}{fmt(m.saldo)}</p>
                                        </div>
                                    );
                                })}
                            </div>
                             <div className="flex gap-4 mt-3 text-[10px] text-slate-500">
                                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-400 rounded" /> Entradas</span>
                                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-blue-800 rounded" /> Saídas</span>
                                <span className="flex items-center gap-1 ml-4 opacity-60">Meses futuros = projeção</span>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-slate-50 text-left">
                                        <th className="p-3 font-black text-slate-400 uppercase text-[10px]">Mês</th>
                                        <th className="p-3 font-black text-emerald-500 uppercase text-[10px] text-right">Entradas</th>
                                        <th className="p-3 font-black text-blue-900 uppercase text-[10px] text-right">Saídas</th>
                                        <th className="p-3 font-black text-blue-500 uppercase text-[10px] text-right">Faturamento</th>
                                        <th className="p-3 font-black text-slate-400 uppercase text-[10px] text-right">Saldo Mês</th>
                                        <th className="p-3 font-black text-slate-400 uppercase text-[10px] text-right">Acumulado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {fluxo.map((m, i) => (
                                         <tr key={m.mes} className={`border-t border-slate-100 ${i >= 7 ? 'bg-slate-50/50' : 'hover:bg-slate-50'}`}>
                                            <td className="p-3 font-bold text-slate-700">{m.mes} {i >= 7 && <span className="text-[8px] text-slate-400">(proj)</span>}</td>
                                            <td className="p-3 text-right text-emerald-600 font-bold">{fmt(m.entradas.total)}</td>
                                            <td className="p-3 text-right text-blue-800 font-bold">{fmt(m.saidas.total)}</td>
                                            <td className="p-3 text-right text-blue-600">{fmt(m.faturamento)}</td>
                                            <td className={`p-3 text-right font-black ${m.saldo >= 0 ? 'text-emerald-600' : 'text-blue-700'}`}>
                                                {m.saldo >= 0 ? <ArrowUpRight className="w-3 h-3 inline" /> : <ArrowDownRight className="w-3 h-3 inline" />}
                                                {fmt(m.saldo)}
                                            </td>
                                            <td className={`p-3 text-right font-bold ${m.saldoAcumulado >= 0 ? 'text-slate-700' : 'text-blue-900'}`}>{fmt(m.saldoAcumulado)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {tab === 'gerencial' && gerencial && (
                    <div className="space-y-4">
                        {/* KPIs */}
                        <div className="grid grid-cols-4 gap-3">
                            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
                                <div className="flex items-center gap-2 mb-1"><Briefcase className="w-4 h-4 opacity-80" /><span className="text-[10px] font-black uppercase opacity-80">OS Total</span></div>
                                <p className="text-2xl font-black">{gerencial.os.total}</p>
                                <p className="text-xs opacity-70">{gerencial.os.emExecucao} em execução · {gerencial.os.mesAtual} este mês</p>
                            </div>
                            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white">
                                <div className="flex items-center gap-2 mb-1"><DollarSign className="w-4 h-4 opacity-80" /><span className="text-[10px] font-black uppercase opacity-80">Faturamento Mensal</span></div>
                                <p className="text-2xl font-black">{fmt(gerencial.financeiro.faturamentoMensal)}</p>
                                <p className="text-xs opacity-70">Saldo: {fmt(gerencial.financeiro.saldo)}</p>
                            </div>
                            <div className="bg-gradient-to-br from-blue-400 to-blue-500 rounded-xl p-4 text-white">
                                <div className="flex items-center gap-2 mb-1"><FileText className="w-4 h-4 opacity-80" /><span className="text-[10px] font-black uppercase opacity-80">Propostas</span></div>
                                <p className="text-2xl font-black">{gerencial.propostas.total}</p>
                                <p className="text-xs opacity-70">{gerencial.propostas.taxaConversao}% conversão · {gerencial.propostas.pendentes} pendentes</p>
                            </div>
                            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-4 text-white">
                                <div className="flex items-center gap-2 mb-1"><Users className="w-4 h-4 opacity-80" /><span className="text-[10px] font-black uppercase opacity-80">Clientes</span></div>
                                <p className="text-2xl font-black">{gerencial.clientes.ativos}</p>
                                <p className="text-xs opacity-70">de {gerencial.clientes.total} total</p>
                            </div>
                        </div>

                        {/* Financial detail */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white rounded-xl border border-slate-200 p-4">
                                <h2 className="text-xs font-black text-slate-400 uppercase mb-3">Resumo Financeiro</h2>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                         <span className="text-xs text-slate-500 flex items-center gap-1"><TrendingDown className="w-3 h-3 text-blue-500" /> Contas a Pagar</span>
                                        <span className="text-sm font-bold text-blue-800">{fmt(gerencial.financeiro.pendentePagar)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-slate-500 flex items-center gap-1"><TrendingUp className="w-3 h-3 text-emerald-500" /> Contas a Receber</span>
                                        <span className="text-sm font-bold text-emerald-600">{fmt(gerencial.financeiro.pendenteReceber)}</span>
                                    </div>
                                    <hr className="border-slate-100" />
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-slate-500">Total Pago</span>
                                        <span className="text-sm font-bold text-slate-600">{fmt(gerencial.financeiro.totalPago)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-slate-500">Total Recebido</span>
                                        <span className="text-sm font-bold text-slate-600">{fmt(gerencial.financeiro.totalRecebido)}</span>
                                    </div>
                                    <hr className="border-slate-100" />
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-700">Saldo Líquido</span>
                                        <span className={`text-lg font-black ${gerencial.financeiro.saldo >= 0 ? 'text-emerald-600' : 'text-blue-900'}`}>{fmt(gerencial.financeiro.saldo)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl border border-slate-200 p-4">
                                <h2 className="text-xs font-black text-slate-400 uppercase mb-3">Recursos</h2>
                                <div className="space-y-3">
                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-slate-500 flex items-center gap-1"><Truck className="w-3 h-3" /> Veículos Disponíveis</span>
                                            <span className="font-bold text-slate-700">{gerencial.veiculos.disponiveis}/{gerencial.veiculos.total}</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2">
                                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${gerencial.veiculos.total > 0 ? (gerencial.veiculos.disponiveis / gerencial.veiculos.total) * 100 : 0}%` }} />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-slate-500 flex items-center gap-1"><Users className="w-3 h-3" /> Funcionários Ativos</span>
                                            <span className="font-bold text-slate-700">{gerencial.funcionarios.ativos}/{gerencial.funcionarios.total}</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2">
                                            <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${gerencial.funcionarios.total > 0 ? (gerencial.funcionarios.ativos / gerencial.funcionarios.total) * 100 : 0}%` }} />
                                        </div>
                                    </div>
                                    <div className="pt-2 mt-2 border-t border-slate-100">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-500">Veículos em Manutenção</span>
                                             <span className="font-bold text-blue-700">{gerencial.veiculos.manutencao}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
