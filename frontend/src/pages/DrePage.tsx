import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import { Loader2, AlertTriangle, AlertCircle, BarChart3 } from 'lucide-react';

const MESES = [
    { value: '', label: 'Anual' },
    { value: '1', label: 'Janeiro' }, { value: '2', label: 'Fevereiro' },
    { value: '3', label: 'Março' }, { value: '4', label: 'Abril' },
    { value: '5', label: 'Maio' }, { value: '6', label: 'Junho' },
    { value: '7', label: 'Julho' }, { value: '8', label: 'Agosto' },
    { value: '9', label: 'Setembro' }, { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' }, { value: '12', label: 'Dezembro' },
];

export default function DrePage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [ano, setAno] = useState(new Date().getFullYear());
    const [mes, setMes] = useState('');

    const fmt = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const fetchDre = useCallback(async () => {
        try {
            setLoading(true);
            const params: any = { ano };
            if (mes) params.mes = mes;
            const res = await api.get('/dre', { params });
            setData(res.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [ano, mes]);

    useEffect(() => { fetchDre(); }, [fetchDre]);

    if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
    if (!data) return <p className="text-sm text-slate-400">Sem dados</p>;

    const getBgColor = (tipo: string) => {
        if (tipo === 'TITULO') return 'bg-slate-100';
        if (tipo === 'SUBTOTAL') return 'bg-blue-50';
        return '';
    };

    const getTextWeight = (tipo: string) => {
        if (tipo === 'TITULO' || tipo === 'SUBTOTAL') return 'font-black';
        return 'font-medium';
    };

    const getValueColor = (valor: number, tipo: string) => {
        if (tipo === 'SUBTOTAL') return valor >= 0 ? 'text-emerald-700' : 'text-slate-700';
        if (tipo === 'TITULO') return 'text-slate-800';
        return valor >= 0 ? 'text-blue-700' : 'text-slate-600';
    };

    return (
        <div className="h-full flex flex-col space-y-4 overflow-hidden">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Demonstrativo de Resultado do Exercício</h1>
                    <p className="text-sm text-slate-500">D.R.E. {mes ? 'Mensal' : 'Anual'} — {data.periodo}</p>
                </div>
                <div className="flex gap-2 items-center">
                    <select 
                        aria-label="Selecionar mês"
                        value={mes} 
                        onChange={e => setMes(e.target.value)}
                        className="border border-slate-200 rounded-lg p-2 text-sm"
                    >
                        {MESES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                    <select 
                        aria-label="Selecionar ano"
                        value={ano} 
                        onChange={e => setAno(Number(e.target.value))}
                        className="border border-slate-200 rounded-lg p-2 text-sm"
                    >
                        {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <button onClick={fetchDre} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" /> Calcular D.R.E.
                    </button>
                </div>
            </div>

            {/* Erros e Alertas */}
            {(data.erros?.length > 0 || data.alertas?.length > 0) && (
                <div className="grid grid-cols-2 gap-3">
                    {data.erros?.length > 0 && (
                        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                            <p className="text-xs font-black text-slate-700 uppercase mb-2">ERROS</p>
                            <table className="w-full text-[10px]">
                                <tbody>
                                    {data.erros.map((e: any, i: number) => (
                                        <tr key={i} className="border-t border-slate-100">
                                            <td className="py-1 text-slate-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-slate-400" />{e.msg}</td>
                                            <td className="py-1 text-right font-black text-slate-700">{e.qtd}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {data.alertas?.length > 0 && (
                        <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-sm">
                            <p className="text-xs font-black text-blue-600 uppercase mb-2">ALERTAS</p>
                            <table className="w-full text-[10px]">
                                <tbody>
                                    {data.alertas.map((a: any, i: number) => (
                                        <tr key={i} className="border-t border-blue-50">
                                            <td className="py-1 text-slate-600 flex items-center gap-1"><AlertCircle className="w-3 h-3 text-blue-500" />{a.msg}</td>
                                            <td className="py-1 text-right font-black text-blue-600">{a.qtd}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* DRE Table */}
            <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="bg-emerald-600 text-white">
                            <th className="p-3 text-left font-black text-[10px] uppercase">Descrição</th>
                            <th className="p-3 text-right font-black text-[10px] uppercase">R$</th>
                            <th className="p-3 text-right font-black text-[10px] uppercase">%</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.linhas?.map((l: any, i: number) => (
                            <tr key={i} className={`border-t border-slate-100 ${getBgColor(l.tipo)} hover:bg-slate-50/50`}>
                                <td className={`p-3 ${getTextWeight(l.tipo)} text-slate-800`}
                                    style={{ paddingLeft: l.nivel > 1 ? `${l.nivel * 16}px` : '12px' }}>
                                    {l.codigo} {l.descricao}
                                </td>
                                <td className={`p-3 text-right ${getTextWeight(l.tipo)} ${getValueColor(l.valor, l.tipo)}`}>
                                    {fmt(l.valor)}
                                </td>
                                <td className={`p-3 text-right ${getTextWeight(l.tipo)} text-slate-500`}>
                                    {l.percentual.toFixed(2)} %
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
