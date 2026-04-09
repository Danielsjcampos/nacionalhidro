import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import {
    Loader2, X, TrendingUp, TrendingDown, DollarSign,
    Calendar, ArrowUpRight, ArrowDownRight, Plus
} from 'lucide-react';

export default function FluxoCaixaDiario() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [detalhes, setDetalhes] = useState<any>(null);
    const [selectedDay, setSelectedDay] = useState('');

    // Filters
    const [contaBancariaId, setContaBancariaId] = useState('');
    const [dataInicio, setDataInicio] = useState(() => {
        const d = new Date(); d.setDate(1); return d.toISOString().substring(0, 10);
    });
    const [dataFim, setDataFim] = useState(() => {
        const d = new Date(); d.setMonth(d.getMonth() + 1, 0); return d.toISOString().substring(0, 10);
    });
    const [contas, setContas] = useState<any[]>([]);

    const fmt = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const fmtDate = (d: string) => {
        const parts = d.split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const params: any = { dataInicio, dataFim };
            if (contaBancariaId) params.contaBancariaId = contaBancariaId;

            const [fluxo, bancarias] = await Promise.all([
                api.get('/relatorios/fluxo-caixa/diario', { params }),
                api.get('/contas-bancarias').catch(() => ({ data: [] })),
            ]);
            setData(fluxo.data);
            setContas(bancarias.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [dataInicio, dataFim, contaBancariaId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleHoje = () => {
        const hoje = new Date();
        setDataInicio(hoje.toISOString().substring(0, 10));
        setDataFim(hoje.toISOString().substring(0, 10));
    };

    const handleSemana = () => {
        const hoje = new Date();
        const inicio = new Date(hoje);
        inicio.setDate(inicio.getDate() - inicio.getDay()); // Start of week (Sunday)
        const fim = new Date(inicio);
        fim.setDate(fim.getDate() + 6);
        setDataInicio(inicio.toISOString().substring(0, 10));
        setDataFim(fim.toISOString().substring(0, 10));
    };

    const handleMes = () => {
        const d = new Date();
        d.setDate(1);
        setDataInicio(d.toISOString().substring(0, 10));
        const fim = new Date(d);
        fim.setMonth(fim.getMonth() + 1, 0);
        setDataFim(fim.toISOString().substring(0, 10));
    };

    const handleDrillDown = async (dateStr: string) => {
        try {
            setSelectedDay(dateStr);
            const params: any = {};
            if (contaBancariaId) params.contaBancariaId = contaBancariaId;
            const res = await api.get(`/relatorios/fluxo-caixa/diario/${dateStr}/detalhes`, { params });
            setDetalhes(res.data);
        } catch (err) { console.error(err); }
    };

    if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

    return (
        <div className="h-full flex flex-col space-y-4 overflow-hidden">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Fluxo de Caixa Diário</h1>
                    <p className="text-sm text-slate-500">Créditos • Débitos • Saldo Acumulado</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => window.open(`/financeiro`, '_self')} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors">
                        <Plus className="w-4 h-4" /> Nova Conta
                    </button>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-3 flex-wrap">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Conta Corrente</label>
                        <select value={contaBancariaId} onChange={e => setContaBancariaId(e.target.value)}
                            className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs min-w-[160px]">
                            <option value="">Todas as Contas</option>
                            {contas.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Data Inicial</label>
                        <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                            className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Data Final</label>
                        <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
                            className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs" />
                    </div>
                    <div className="flex items-end gap-1.5 pb-0.5">
                        <button onClick={handleHoje} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold">Hoje</button>
                        <button onClick={handleSemana} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold">Semana</button>
                        <button onClick={handleMes} className="bg-slate-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold">Mês</button>
                    </div>
                    {data && (
                        <div className="ml-auto text-xs text-slate-500">
                            Saldo Inicial: <span className="font-bold text-slate-700">{fmt(data.saldoInicial)}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* KPI Totais */}
            {data && (
                <div className="grid grid-cols-4 gap-3">
                    <div className="bg-white rounded-xl border border-slate-200 p-3">
                        <div className="flex items-center gap-1.5 mb-1"><TrendingUp className="w-4 h-4 text-emerald-500" /><span className="text-[9px] font-black text-slate-400 uppercase">Total Créditos</span></div>
                        <p className="text-lg font-black text-emerald-600">{fmt(data.totais.credito)}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-3">
                        <div className="flex items-center gap-1.5 mb-1"><TrendingDown className="w-4 h-4 text-red-500" /><span className="text-[9px] font-black text-slate-400 uppercase">Total Débitos</span></div>
                        <p className="text-lg font-black text-red-600">{fmt(data.totais.debito)}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-3">
                        <div className="flex items-center gap-1.5 mb-1"><DollarSign className="w-4 h-4 text-blue-500" /><span className="text-[9px] font-black text-slate-400 uppercase">Saldo Período</span></div>
                        <p className={`text-lg font-black ${data.totais.saldo >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(data.totais.saldo)}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-3">
                        <div className="flex items-center gap-1.5 mb-1"><Calendar className="w-4 h-4 text-slate-500" /><span className="text-[9px] font-black text-slate-400 uppercase">Dias c/ Movto</span></div>
                        <p className="text-lg font-black text-slate-700">{data.dias.length}</p>
                    </div>
                </div>
            )}

            {/* Tabela Diária */}
            <div className="flex-1 overflow-y-auto">
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-slate-50 text-left">
                                <th className="p-3 font-black text-slate-400 uppercase text-[10px]">Data</th>
                                <th className="p-3 font-black text-slate-400 uppercase text-[10px]">Dia</th>
                                <th className="p-3 font-black text-slate-400 uppercase text-[10px] text-right">Crédito R$</th>
                                <th className="p-3 font-black text-slate-400 uppercase text-[10px] text-right">Débito R$</th>
                                <th className="p-3 font-black text-slate-400 uppercase text-[10px] text-right">Crédito − Débito R$</th>
                                <th className="p-3 font-black text-slate-400 uppercase text-[10px] text-right">Saldo C/C R$</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data?.dias?.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-slate-400">Sem movimentações no período</td></tr>
                            ) : data?.dias?.map((dia: any) => {
                                const isNeg = dia.saldoDia < 0;
                                return (
                                    <tr key={dia.data}
                                        onClick={() => handleDrillDown(dia.data)}
                                        className={`border-t border-slate-100 cursor-pointer transition-colors ${isNeg ? 'bg-red-50/40 hover:bg-red-50' : 'hover:bg-emerald-50/30'} ${selectedDay === dia.data ? 'ring-2 ring-blue-400 ring-inset' : ''}`}>
                                        <td className="p-3 font-bold text-slate-700">{fmtDate(dia.data)}</td>
                                        <td className="p-3 text-slate-500 capitalize">{dia.diaSemana}</td>
                                        <td className="p-3 text-right font-bold text-emerald-600">
                                            {dia.credito > 0 && fmt(dia.credito)}
                                        </td>
                                        <td className="p-3 text-right font-bold text-red-600">
                                            {dia.debito > 0 && <span>-{fmt(dia.debito)}</span>}
                                        </td>
                                        <td className={`p-3 text-right font-bold ${dia.saldoDia >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {fmt(dia.saldoDia)}
                                        </td>
                                        <td className={`p-3 text-right font-black ${dia.saldoAcumulado >= 0 ? 'text-slate-700' : 'text-red-700'}`}>
                                            {fmt(dia.saldoAcumulado)}
                                        </td>
                                    </tr>
                                );
                            })}
                            {/* Totais */}
                            {data?.dias?.length > 0 && (
                                <tr className="bg-slate-100 border-t-2 border-slate-300">
                                    <td className="p-3 font-black text-slate-700" colSpan={2}>TOTAL</td>
                                    <td className="p-3 text-right font-black text-emerald-700">{fmt(data.totais.credito)}</td>
                                    <td className="p-3 text-right font-black text-red-700">-{fmt(data.totais.debito)}</td>
                                    <td className={`p-3 text-right font-black ${data.totais.saldo >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmt(data.totais.saldo)}</td>
                                    <td className="p-3 text-right font-black text-slate-700">
                                        {data.dias.length > 0 && fmt(data.dias[data.dias.length - 1].saldoAcumulado)}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Detalhes do Dia */}
            {detalhes && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">
                                    Movimentações — {fmtDate(detalhes.data)}
                                </h2>
                                <p className="text-xs text-slate-500">Detalhamento de créditos e débitos</p>
                            </div>
                            <button onClick={() => { setDetalhes(null); setSelectedDay(''); }}>
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        {/* Créditos */}
                        {detalhes.creditos.length > 0 && (
                            <div>
                                <p className="text-[10px] font-black text-emerald-600 uppercase mb-2 flex items-center gap-1">
                                    <ArrowUpRight className="w-3 h-3" /> Créditos ({detalhes.creditos.length})
                                </p>
                                <table className="w-full text-[10px]">
                                    <thead><tr className="bg-emerald-50">
                                        <th className="p-2 text-left font-black text-emerald-700">Descrição</th>
                                        <th className="p-2 text-left font-black text-emerald-700">Cliente</th>
                                        <th className="p-2 text-left font-black text-emerald-700">NF</th>
                                        <th className="p-2 text-left font-black text-emerald-700">Pagamento</th>
                                        <th className="p-2 text-right font-black text-emerald-700">Valor</th>
                                        <th className="p-2 font-black text-emerald-700">Status</th>
                                    </tr></thead>
                                    <tbody>
                                        {detalhes.creditos.map((c: any) => (
                                            <tr key={c.id} className="border-t border-emerald-100">
                                                <td className="p-2 font-bold text-slate-700">{c.descricao}</td>
                                                <td className="p-2 text-slate-500">{c.entidade}</td>
                                                <td className="p-2 text-slate-400 font-mono">{c.notaFiscal || '—'}</td>
                                                <td className="p-2 text-slate-400">{c.formaPagamento || '—'}</td>
                                                <td className="p-2 text-right font-black text-emerald-600">{fmt(c.valor)}</td>
                                                <td className="p-2"><span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-black text-[9px]">{c.status}</span></td>
                                            </tr>
                                        ))}
                                        <tr className="bg-emerald-50 border-t border-emerald-200">
                                            <td colSpan={4} className="p-2 font-black text-emerald-700 text-right">TOTAL CRÉDITOS</td>
                                            <td className="p-2 text-right font-black text-emerald-700">{fmt(detalhes.totalCredito)}</td>
                                            <td></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Débitos */}
                        {detalhes.debitos.length > 0 && (
                            <div>
                                <p className="text-[10px] font-black text-red-600 uppercase mb-2 flex items-center gap-1">
                                    <ArrowDownRight className="w-3 h-3" /> Débitos ({detalhes.debitos.length})
                                </p>
                                <table className="w-full text-[10px]">
                                    <thead><tr className="bg-red-50">
                                        <th className="p-2 text-left font-black text-red-700">Descrição</th>
                                        <th className="p-2 text-left font-black text-red-700">Fornecedor</th>
                                        <th className="p-2 text-left font-black text-red-700">NF</th>
                                        <th className="p-2 text-left font-black text-red-700">Pagamento</th>
                                        <th className="p-2 text-right font-black text-red-700">Valor</th>
                                        <th className="p-2 font-black text-red-700">Status</th>
                                    </tr></thead>
                                    <tbody>
                                        {detalhes.debitos.map((d: any) => (
                                            <tr key={d.id} className="border-t border-red-100">
                                                <td className="p-2 font-bold text-slate-700">{d.descricao}</td>
                                                <td className="p-2 text-slate-500">{d.entidade}</td>
                                                <td className="p-2 text-slate-400 font-mono">{d.notaFiscal || '—'}</td>
                                                <td className="p-2 text-slate-400">{d.formaPagamento || '—'}</td>
                                                <td className="p-2 text-right font-black text-red-600">{fmt(d.valor)}</td>
                                                <td className="p-2"><span className="px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-black text-[9px]">{d.status}</span></td>
                                            </tr>
                                        ))}
                                        <tr className="bg-red-50 border-t border-red-200">
                                            <td colSpan={4} className="p-2 font-black text-red-700 text-right">TOTAL DÉBITOS</td>
                                            <td className="p-2 text-right font-black text-red-700">{fmt(detalhes.totalDebito)}</td>
                                            <td></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Saldo do Dia */}
                        <div className={`rounded-lg p-3 text-center ${detalhes.saldo >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Saldo do Dia</p>
                            <p className={`text-xl font-black ${detalhes.saldo >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmt(detalhes.saldo)}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
