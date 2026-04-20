import { useToast } from '../contexts/ToastContext';
import { useEffect, useState } from 'react';
import api from '../services/api';
import { Loader2, Brain, CheckCircle2, AlertTriangle, XCircle, User, UserCheck, Users, RefreshCw, MessageCircle } from 'lucide-react';

export default function TriagemIAPage() {
    const { showToast } = useToast();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [approving, setApproving] = useState<string | null>(null);
    const [bulkApproving, setBulkApproving] = useState(false);

    const fetchData = () => {
        setLoading(true);
        api.get('/triagem-ia').then(r => { 
            setData(r.data || { stats: { total: 0, aprovados: 0, pendentes: 0, incompletos: 0, mediaScore: 0 }, candidatos: [] }); 
            setLoading(false); 
        }).catch(() => {
            setData({ stats: { total: 0, aprovados: 0, pendentes: 0, incompletos: 0, mediaScore: 0 }, candidatos: [] });
            setLoading(false);
        });
    };

    useEffect(() => { fetchData(); }, []);

    const handleAprovar = async (admissaoId: string) => {
        setApproving(admissaoId);
        try {
            await api.post(`/triagem-ia/aprovar/${admissaoId}`);
            fetchData();
        } catch (err: any) {
            showToast(err.response?.data?.error || 'Erro ao aprovar');
        } finally {
            setApproving(null);
        }
    };

    const handleAprovarTodos = async () => {
        if (!window.confirm('Aprovar TODOS os candidatos com score ≥80% e criar como funcionários?')) return;
        setBulkApproving(true);
        try {
            const res = await api.post('/triagem-ia/aprovar-todos');
            showToast(`${res.data.total} admissões aprovadas e funcionários criados!`);
            fetchData();
        } catch (err: any) {
            showToast(err.response?.data?.error || 'Erro ao aprovar em lote');
        } finally {
            setBulkApproving(false);
        }
    };

    if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
    if (!data) return null;

    const classColor: any = {
        APROVADO: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle2 },
        PENDENTE: { bg: 'bg-amber-100', text: 'text-amber-700', icon: AlertTriangle },
        INCOMPLETO: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
    };

    return (
        <div className="h-full flex flex-col space-y-4 overflow-hidden">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Brain className="w-6 h-6 text-cyan-500" /> IA Triagem de Candidatos</h1>
                    <p className="text-sm text-slate-500">Análise automática e aprovação de admissões em andamento</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchData} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                        <RefreshCw className="w-5 h-5" />
                    </button>
                    {data.stats.aprovados > 0 && (
                        <button
                            onClick={handleAprovarTodos}
                            disabled={bulkApproving}
                            className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-emerald-700 transition-colors disabled:opacity-50"
                        >
                            {bulkApproving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                            Aprovar Todos ({data.stats.aprovados})
                        </button>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-5 gap-3">
                <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl p-4 text-white">
                    <p className="text-[10px] font-black uppercase opacity-70">Total</p>
                    <p className="text-2xl font-black">{data.stats.total}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white">
                    <p className="text-[10px] font-black uppercase opacity-70">Aprovados</p>
                    <p className="text-2xl font-black">{data.stats.aprovados}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-4 text-white">
                    <p className="text-[10px] font-black uppercase opacity-70">Pendentes</p>
                    <p className="text-2xl font-black">{data.stats.pendentes}</p>
                </div>
                <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 text-white">
                    <p className="text-[10px] font-black uppercase opacity-70">Incompletos</p>
                    <p className="text-2xl font-black">{data.stats.incompletos}</p>
                </div>
                <div className="bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl p-4 text-white">
                    <p className="text-[10px] font-black uppercase opacity-70">Score Médio</p>
                    <p className="text-2xl font-black">{data.stats.mediaScore}%</p>
                </div>
            </div>

            {/* Candidates */}
            <div className="flex-1 overflow-y-auto space-y-2">
                {data.candidatos.map((c: any) => {
                    const cls = classColor[c.classificacao] || classColor.INCOMPLETO;
                    const Icon = cls.icon;
                    return (
                        <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-4">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg ${cls.bg} flex items-center justify-center`}>
                                        <Icon className={`w-5 h-5 ${cls.text}`} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800 flex items-center gap-1"><User className="w-3 h-3 text-slate-400" /> {c.nome}</p>
                                        <p className="text-[10px] text-slate-400">{c.cargo || '—'} • {c.departamento || '—'} • Etapa: {c.etapa?.replace(/_/g, ' ')}</p>
                                        {(c.telefone || c.email) && (
                                            <div className="flex items-center gap-2 mt-0.5">
                                                {c.telefone && (
                                                    <a href={`https://wa.me/55${c.telefone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                                                        className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700">
                                                        <MessageCircle className="w-3 h-3" />
                                                        <span className="text-[10px] font-bold">{c.telefone}</span>
                                                    </a>
                                                )}
                                                {c.email && (
                                                    <span className="text-[10px] text-slate-400 truncate">{c.email}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-right">
                                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-black ${cls.bg} ${cls.text}`}>
                                            <Icon className="w-3 h-3" /> {c.classificacao}
                                        </div>
                                        <div className="mt-1 flex items-center gap-1">
                                            <div className="w-20 bg-slate-100 rounded-full h-2">
                                                <div className={`h-2 rounded-full ${c.score >= 80 ? 'bg-emerald-500' : c.score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                    style={{ width: `${c.score}%` }} />
                                            </div>
                                            <span className="text-[10px] font-black text-slate-500">{c.score}%</span>
                                        </div>
                                    </div>
                                    {c.classificacao === 'APROVADO' && (
                                        <button
                                            onClick={() => handleAprovar(c.id)}
                                            disabled={approving === c.id}
                                            className="bg-emerald-600 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-emerald-700 transition-colors disabled:opacity-50 whitespace-nowrap"
                                        >
                                            {approving === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3 h-3" />}
                                            Admitir
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="mt-2 flex gap-1 flex-wrap">
                                {c.criteriosAtendidos.map((cr: string) => (
                                    <span key={cr} className="text-[9px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-bold">✓ {cr}</span>
                                ))}
                                {c.criteriosPendentes.map((cr: string) => (
                                    <span key={cr} className="text-[9px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded font-bold">✗ {cr}</span>
                                ))}
                            </div>
                        </div>
                    );
                })}
                {data.candidatos.length === 0 && <p className="text-xs text-slate-400 italic text-center py-8">Nenhum candidato em processo de admissão</p>}
            </div>
        </div>
    );
}
