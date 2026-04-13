import { useState } from 'react';
import api from '../services/api';
import {
    Download, FileSpreadsheet, Users, UserPlus, UserMinus,
    Crown, List, Loader2, Award, FileWarning
} from 'lucide-react';

const REPORTS = [
    {
        key: 'ativos', label: 'Colaboradores Ativos (Lista de Folha)', icon: Users,
        color: 'bg-emerald-500', endpoint: '/relatorios-rh/ativos',
        desc: 'Colaboradores ativos com salários, alocações e benefícios (VA, VR, Seguro).',
    },
    {
        key: 'ativos-pj', label: 'Colaboradores Ativos (PJ)', icon: Users,
        color: 'bg-blue-500', endpoint: '/relatorios-rh/ativos?tipo=PJ',
        desc: 'Prestadores de serviço PJ ativos.',
    },
    {
        key: 'ativos-tst', label: 'Ativos TST', icon: Users,
        color: 'bg-indigo-500', endpoint: '/relatorios-rh/ativos?tipo=TST',
        desc: 'Colaboradores do setor de Segurança do Trabalho.',
    },
    {
        key: 'vencimentos-geral', label: 'Vencimentos Gerais', icon: FileWarning,
        color: 'bg-amber-500', endpoint: '/relatorios-rh/vencimentos-geral',
        desc: 'Consolidado: ASOs (30d), CNH/MOPP (30d) e Treinamentos (60d) próximos do vencimento.',
    },
    {
        key: 'admissoes', label: 'Admissões por Período', icon: UserPlus,
        color: 'bg-cyan-500', endpoint: '/relatorios-rh/admissoes',
        desc: 'Funcionários admitidos no período selecionado.',
        hasDateFilter: true,
    },
    {
        key: 'desligamentos', label: 'Desligamentos por Período', icon: UserMinus,
        color: 'bg-slate-500', endpoint: '/relatorios-rh/desligamentos',
        desc: 'Funcionários desligados no período selecionado.',
        hasDateFilter: true,
    },
    {
        key: 'lideres', label: 'Relatório de Líderes', icon: Crown,
        color: 'bg-blue-700', endpoint: '/relatorios-rh/lideres',
        desc: 'Hierarquia: líderes, gerentes, supervisores, coordenadores.',
    },
    {
        key: 'geral', label: 'Relatório Geral', icon: List,
        color: 'bg-slate-400', endpoint: '/relatorios-rh/geral',
        desc: 'Todos os funcionários com todas as informações.',
    },
    {
        key: 'premios', label: 'Prêmios (Motoristas/Jatistas)', icon: Award,
        color: 'bg-blue-400', endpoint: '/relatorios-rh/premios',
        desc: 'Motoristas, jatistas e ajudantes elegíveis a prêmios.',
    },
    {
        key: 'ppp', label: 'PPP (Desligados)', icon: FileWarning,
        color: 'bg-slate-700', endpoint: '/relatorios-rh/ppp',
        desc: 'Perfil Profissiográfico Previdenciário — desligados que precisam fazer.',
    },
];

export default function RelatoriosRHPage() {
    const [loading, setLoading] = useState<string | null>(null);
    const [previewData, setPreviewData] = useState<any[] | null>(null);
    const [previewTitle, setPreviewTitle] = useState('');
    const [dateFilters, setDateFilters] = useState<Record<string, { inicio: string; fim: string }>>({});

    const handlePreview = async (report: typeof REPORTS[0]) => {
        setLoading(report.key);
        try {
            let url = report.endpoint;
            const df = dateFilters[report.key];
            if (report.hasDateFilter && df?.inicio && df?.fim) {
                const sep = url.includes('?') ? '&' : '?';
                url += `${sep}dataInicio=${df.inicio}&dataFim=${df.fim}`;
            }
            const res = await api.get(url);
            setPreviewData(res.data);
            setPreviewTitle(report.label);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(null);
        }
    };

    const handleExport = async (report: typeof REPORTS[0]) => {
        setLoading(`${report.key}-csv`);
        try {
            let url = report.endpoint;
            const sep = url.includes('?') ? '&' : '?';
            url += `${sep}formato=csv`;
            const df = dateFilters[report.key];
            if (report.hasDateFilter && df?.inicio && df?.fim) {
                url += `&dataInicio=${df.inicio}&dataFim=${df.fim}`;
            }
            const res = await api.get(url, { responseType: 'blob' });
            const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${report.key}.csv`;
            link.click();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="h-full flex flex-col space-y-6 overflow-y-auto">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Relatórios RH</h1>
                <p className="text-sm text-slate-500">Exportação para Excel (CSV) e visualização de dados</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {REPORTS.map(report => {
                    const Icon = report.icon;
                    const df = dateFilters[report.key] || { inicio: '', fim: '' };

                    return (
                        <div key={report.key} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-all">
                            <div className={`${report.color} text-white p-3 flex items-center gap-2`}>
                                <Icon className="w-5 h-5" />
                                <span className="text-sm font-bold">{report.label}</span>
                            </div>
                            <div className="p-4 space-y-3">
                                <p className="text-xs text-slate-500">{report.desc}</p>

                                {report.hasDateFilter && (
                                    <div className="flex flex-col gap-2">
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <label htmlFor={`inicio-${report.key}`} className="sr-only">Data Início</label>
                                                <input
                                                    id={`inicio-${report.key}`}
                                                    type="date" value={df.inicio}
                                                    onChange={e => setDateFilters({ ...dateFilters, [report.key]: { ...df, inicio: e.target.value } })}
                                                    className="w-full border border-slate-200 rounded-lg p-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                                                    placeholder="Início"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label htmlFor={`fim-${report.key}`} className="sr-only">Data Fim</label>
                                                <input
                                                    id={`fim-${report.key}`}
                                                    type="date" value={df.fim}
                                                    onChange={e => setDateFilters({ ...dateFilters, [report.key]: { ...df, fim: e.target.value } })}
                                                    className="w-full border border-slate-200 rounded-lg p-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                                                    placeholder="Fim"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handlePreview(report)}
                                        disabled={loading === report.key}
                                        className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                                    >
                                        {loading === report.key ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileSpreadsheet className="w-3 h-3" />}
                                        Visualizar
                                    </button>
                                    <button
                                        onClick={() => handleExport(report)}
                                        disabled={loading === `${report.key}-csv`}
                                        className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                                    >
                                        {loading === `${report.key}-csv` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                                        Exportar Excel
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Preview Table */}
            {previewData && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="flex items-center justify-between bg-slate-50 px-4 py-3 border-b border-slate-200">
                        <h2 className="text-sm font-bold text-slate-700">{previewTitle} — {previewData.length} registros</h2>
                        <button onClick={() => setPreviewData(null)} className="text-slate-400 hover:text-slate-600 text-xs font-bold">
                            Fechar ✕
                        </button>
                    </div>
                    <div className="overflow-x-auto max-h-96">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    {previewData.length > 0 && Object.keys(previewData[0]).map(k => (
                                        <th key={k} className="text-left py-2 px-3 text-[10px] font-black text-slate-400 uppercase whitespace-nowrap">
                                            {k}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {previewData.slice(0, 50).map((row, i) => (
                                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                                        {Object.values(row).map((v: any, j) => (
                                            <td key={j} className="py-2 px-3 text-slate-600 whitespace-nowrap">
                                                {v instanceof Date ? v.toLocaleDateString('pt-BR') :
                                                    v === null || v === undefined ? '—' :
                                                        typeof v === 'boolean' ? (v ? 'Sim' : 'Não') :
                                                            String(v).length > 40 ? String(v).substring(0, 40) + '...' : String(v)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {previewData.length > 50 && (
                        <p className="text-center text-xs text-slate-400 py-2">Mostrando 50 de {previewData.length} registros. Exporte para Excel para ver todos.</p>
                    )}
                </div>
            )}
        </div>
    );
}
