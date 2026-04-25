import { useEffect, useState } from 'react';
import api from '../services/api';
import {
    Loader2, RefreshCw, Download, Search, AlertTriangle,
    Shield, Clock, Filter
} from 'lucide-react';

interface Alerta {
    nome: string;
    cpf: string;
    cargo: string;
    tipo: string;
    detalhe: string;
    dataVencimento: string;
    diasRestantes: number;
}

export default function VencimentosPage() {
    const [alertas, setAlertas] = useState<Alerta[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filtroTipo, setFiltroTipo] = useState('');

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await api.get('/relatorios-rh/vencimentos-geral');
            setAlertas(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleExportCSV = async () => {
        try {
            const res = await api.get('/relatorios-rh/vencimentos-geral?formato=csv', { responseType: 'blob' });
            const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'vencimentos_geral.csv';
            link.click();
        } catch (err) { console.error(err); }
    };

    const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

    const filtered = alertas.filter(a => {
        const matchSearch = !search || a.nome?.toLowerCase().includes(search.toLowerCase());
        const matchTipo = !filtroTipo || a.tipo === filtroTipo;
        return matchSearch && matchTipo;
    });

    // KPIs
    const asoCount = filtered.filter(a => a.tipo === 'ASO').length;
    const treinCount = filtered.filter(a => a.tipo === 'TREINAMENTO').length;
    const cnhCount = filtered.filter(a => a.tipo === 'CNH').length;
    const moppCount = filtered.filter(a => a.tipo === 'MOPP').length;

    const getRowStyle = (dias: number) => {
        if (dias < 0) return 'bg-red-50';
        if (dias <= 15) return 'bg-orange-50';
        if (dias <= 30) return 'bg-amber-50';
        return 'hover:bg-slate-50';
    };

    const getBadgeStyle = (dias: number) => {
        if (dias < 0) return 'bg-red-100 text-red-700 border-red-200';
        if (dias <= 15) return 'bg-orange-100 text-orange-700 border-orange-200';
        if (dias <= 30) return 'bg-amber-100 text-amber-700 border-amber-200';
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    };

    const getStatusLabel = (dias: number) => {
        if (dias < 0) return 'VENCIDO';
        if (dias <= 15) return 'URGENTE';
        if (dias <= 30) return 'VENCENDO';
        return 'OK';
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col space-y-5 overflow-y-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        <Clock className="w-7 h-7 text-blue-500" />
                        Central de Vencimentos
                    </h1>
                    <p className="text-sm text-slate-500 font-medium">
                        ASOs, Treinamentos, CNH e MOPP • {alertas.length} alertas ativos
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleExportCSV} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 active:scale-95">
                        <Download className="w-4 h-4" /> Exportar CSV
                    </button>
                    <button onClick={fetchData} className="p-2 text-slate-400 hover:text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    { label: 'ASOs Vencendo', value: asoCount, color: 'red', icon: '🩺' },
                    { label: 'NRs Vencendo', value: treinCount, color: 'amber', icon: '📋' },
                    { label: 'CNH Vencendo', value: cnhCount, color: 'blue', icon: '🚗' },
                    { label: 'MOPP Vencendo', value: moppCount, color: 'indigo', icon: '🛢️' },
                ].map((card, i) => (
                    <div key={i} className={`bg-${card.color === 'red' ? 'red' : card.color === 'amber' ? 'amber' : card.color === 'blue' ? 'blue' : 'indigo'}-50 border border-${card.color === 'red' ? 'red' : card.color === 'amber' ? 'amber' : card.color === 'blue' ? 'blue' : 'indigo'}-200 rounded-2xl p-5`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl">{card.icon}</span>
                            {card.value > 0 && <div className={`w-3 h-3 rounded-full bg-${card.color === 'red' ? 'red' : card.color === 'amber' ? 'amber' : card.color === 'blue' ? 'blue' : 'indigo'}-500 animate-pulse`} />}
                        </div>
                        <p className="text-3xl font-black text-slate-800">{card.value}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{card.label}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex gap-3 items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text" value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar funcionário..."
                        className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 bg-white"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <select
                        value={filtroTipo}
                        onChange={e => setFiltroTipo(e.target.value)}
                        className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 outline-none focus:border-blue-500 bg-white"
                    >
                        <option value="">Todos os Tipos</option>
                        <option value="ASO">ASO</option>
                        <option value="TREINAMENTO">Treinamento (NR)</option>
                        <option value="CNH">CNH</option>
                        <option value="MOPP">MOPP</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex-1">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="text-left py-3 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="text-left py-3 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Funcionário</th>
                                <th className="text-left py-3 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cargo</th>
                                <th className="text-left py-3 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                                <th className="text-left py-3 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Documento</th>
                                <th className="text-left py-3 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vencimento</th>
                                <th className="text-right py-3 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Dias Restantes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((a, i) => (
                                <tr key={i} className={`border-b border-slate-100 transition-colors ${getRowStyle(a.diasRestantes)}`}>
                                    <td className="py-3 px-5">
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full border ${getBadgeStyle(a.diasRestantes)}`}>
                                            {a.diasRestantes < 0 && <AlertTriangle className="w-3 h-3" />}
                                            {getStatusLabel(a.diasRestantes)}
                                        </span>
                                    </td>
                                    <td className="py-3 px-5 font-bold text-slate-700">{a.nome}</td>
                                    <td className="py-3 px-5 text-slate-500">{a.cargo}</td>
                                    <td className="py-3 px-5">
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg uppercase ${
                                            a.tipo === 'ASO' ? 'bg-red-50 text-red-600' :
                                            a.tipo === 'TREINAMENTO' ? 'bg-amber-50 text-amber-600' :
                                            a.tipo === 'CNH' ? 'bg-blue-50 text-blue-600' :
                                            'bg-indigo-50 text-indigo-600'
                                        }`}>
                                            {a.tipo}
                                        </span>
                                    </td>
                                    <td className="py-3 px-5 text-slate-600 font-medium">{a.detalhe}</td>
                                    <td className="py-3 px-5 text-slate-400 font-bold">{fmtDate(a.dataVencimento)}</td>
                                    <td className="py-3 px-5 text-right">
                                        <span className={`font-black text-sm ${
                                            a.diasRestantes < 0 ? 'text-red-600' :
                                            a.diasRestantes <= 15 ? 'text-orange-600' :
                                            a.diasRestantes <= 30 ? 'text-amber-600' :
                                            'text-emerald-600'
                                        }`}>
                                            {a.diasRestantes}d
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="py-16 text-center text-slate-400">
                                        <Shield className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                        <p className="text-xs font-bold uppercase tracking-widest">Nenhum vencimento encontrado</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
