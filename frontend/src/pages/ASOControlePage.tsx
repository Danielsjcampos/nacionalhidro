import { useEffect, useState } from 'react';
import api from '../services/api';
import {
    Loader2, RefreshCw, AlertTriangle, Search, Download
} from 'lucide-react';

const ASO_TIPOS = [
    'ADMISSIONAL', 'PERIODICO', 'DEMISSIONAL', 'RETORNO_TRABALHO', 'MUDANCA_FUNCAO',
];

export default function ASOControlePage() {
    const [asos, setAsos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filtroTipo, setFiltroTipo] = useState('');

    const fetchAll = async () => {
        try {
            const asoRes = await api.get('/relatorios-rh/asos');
            setAsos(asoRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    const handleExportCSV = async () => {
        try {
            const res = await api.get('/relatorios-rh/asos?formato=csv', { responseType: 'blob' });
            const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'asos_controle.csv';
            link.click();
        } catch (err) { console.error(err); }
    };

    const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

    const filtered = asos.filter(a => {
        const matchSearch = !search || a.nome?.toLowerCase().includes(search.toLowerCase());
        const matchTipo = !filtroTipo || a.tipo === filtroTipo;
        return matchSearch && matchTipo;
    });

    const vencidas = filtered.filter(a => a.diasRestantes !== null && a.diasRestantes < 0);
    const vencendo = filtered.filter(a => a.diasRestantes !== null && a.diasRestantes >= 0 && a.diasRestantes <= 30);
    const ok = filtered.filter(a => a.diasRestantes === null || a.diasRestantes > 30);

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col space-y-4 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Controle de ASO</h1>
                    <p className="text-sm text-slate-500">Atestado de Saúde Ocupacional • {asos.length} registros</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleExportCSV} className="bg-emerald-600 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-emerald-700">
                        <Download className="w-4 h-4" /> Exportar Excel
                    </button>
                    <button onClick={fetchAll} className="text-slate-400 hover:text-slate-600">
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-xs font-black text-red-700 uppercase">Vencidas</span>
                    </div>
                    <p className="text-3xl font-black text-red-600">{vencidas.length}</p>
                    <p className="text-[10px] text-red-400">Funcionários sem ASO válido</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-xs font-black text-amber-700 uppercase">Vencendo em 30 dias</span>
                    </div>
                    <p className="text-3xl font-black text-amber-600">{vencendo.length}</p>
                    <p className="text-[10px] text-amber-400">Agendar exame com urgência</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-black text-emerald-700 uppercase">Em dia</span>
                    </div>
                    <p className="text-3xl font-black text-emerald-600">{ok.length}</p>
                    <p className="text-[10px] text-emerald-400">ASOs válidos</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-3 items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text" value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar funcionário..."
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs"
                    />
                </div>
                <select
                    value={filtroTipo}
                    onChange={e => setFiltroTipo(e.target.value)}
                    className="border border-slate-200 rounded-xl px-3 py-2 text-xs"
                >
                    <option value="">Todos os tipos</option>
                    {ASO_TIPOS.map(t => (
                        <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                    ))}
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="text-left py-3 px-4 text-[10px] font-black text-slate-400 uppercase">Status</th>
                                <th className="text-left py-3 px-4 text-[10px] font-black text-slate-400 uppercase">Funcionário</th>
                                <th className="text-left py-3 px-4 text-[10px] font-black text-slate-400 uppercase">Cargo</th>
                                <th className="text-left py-3 px-4 text-[10px] font-black text-slate-400 uppercase">Tipo</th>
                                <th className="text-left py-3 px-4 text-[10px] font-black text-slate-400 uppercase">Clínica</th>
                                <th className="text-left py-3 px-4 text-[10px] font-black text-slate-400 uppercase">Data Exame</th>
                                <th className="text-left py-3 px-4 text-[10px] font-black text-slate-400 uppercase">Vencimento</th>
                                <th className="text-left py-3 px-4 text-[10px] font-black text-slate-400 uppercase">Dias</th>
                                <th className="text-left py-3 px-4 text-[10px] font-black text-slate-400 uppercase">Resultado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...vencidas, ...vencendo, ...ok].map((a, i) => {
                                const isVencida = a.diasRestantes !== null && a.diasRestantes < 0;
                                const isVencendo = a.diasRestantes !== null && a.diasRestantes >= 0 && a.diasRestantes <= 30;
                                return (
                                    <tr key={i} className={`border-b border-slate-100 ${isVencida ? 'bg-red-50' : isVencendo ? 'bg-amber-50' : 'hover:bg-slate-50'}`}>
                                        <td className="py-2.5 px-4">
                                            {isVencida ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                                                    <AlertTriangle className="w-3 h-3" /> VENCIDO
                                                </span>
                                            ) : isVencendo ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full animate-pulse">
                                                    ⚠️ VENCENDO
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">✓ OK</span>
                                            )}
                                        </td>
                                        <td className="py-2.5 px-4 font-bold text-slate-700">{a.nome}</td>
                                        <td className="py-2.5 px-4 text-slate-500">{a.cargo}</td>
                                        <td className="py-2.5 px-4 text-slate-500 text-xs">{a.tipo?.replace(/_/g, ' ')}</td>
                                        <td className="py-2.5 px-4 text-slate-500">{a.clinica || '—'}</td>
                                        <td className="py-2.5 px-4 text-slate-400">{fmtDate(a.dataExame)}</td>
                                        <td className="py-2.5 px-4 text-slate-400 font-bold">{fmtDate(a.dataVencimento)}</td>
                                        <td className="py-2.5 px-4">
                                            <span className={`font-black text-xs ${isVencida ? 'text-red-600' : isVencendo ? 'text-amber-600' : 'text-slate-400'}`}>
                                                {a.diasRestantes ?? '—'}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-4">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${a.resultado === 'APTO' ? 'bg-emerald-100 text-emerald-700' : a.resultado === 'INAPTO' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {a.resultado || '—'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filtered.length === 0 && (
                                <tr><td colSpan={9} className="py-8 text-center text-slate-400 italic">Nenhum ASO encontrado</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
