import { useEffect, useState } from 'react';
import api from '../services/api';
import {
    Plus, Loader2, X, ChevronRight, Users, Briefcase,
    Mail, Star, CheckCircle2, XCircle,
    UserPlus, MessageCircle, TrendingUp, User, Calendar, AlignLeft
} from 'lucide-react';

const ETAPAS = [
    { key: 'TRIAGEM', label: 'Triagem', color: 'bg-slate-500' },
    { key: 'ENTREVISTA_RH', label: 'Entrevista - RH', color: 'bg-indigo-500' },
    { key: 'ENTREVISTA_GESTOR', label: 'Entrevista - Gestor', color: 'bg-emerald-500' },
    { key: 'TESTE_PRATICO', label: 'Teste Prático', color: 'bg-blue-300' },
    { key: 'AGUARDANDO_PROPOSTA', label: 'Aguardando aceite da proposta', color: 'bg-blue-500' },
    { key: 'ADMITIDO', label: 'Proposta aceita/Admissão', color: 'bg-emerald-500' },
    { key: 'PROPOSTA_RECUSADA', label: 'Proposta recusada', color: 'bg-blue-900' },
    { key: 'INCOMPATIVEL', label: 'Incompatível', color: 'bg-slate-700' },
    { key: 'BANCO_TALENTOS', label: 'Banco de Talentos', color: 'bg-slate-400' },
];

const PRIORIDADE_COLOR: Record<string, string> = {
    BAIXA: 'bg-slate-100 text-slate-600',
    MEDIA: 'bg-blue-100 text-blue-600',
    ALTA: 'bg-blue-100 text-blue-700',
    URGENTE: 'bg-blue-900 text-white',
};

const CARGOS_DISPONIVEIS = [
    'MOTORISTA OP DE BOMBA',
    'MOTORISTA',
    'MOTORISTA CARRETEIRO',
    'JATISTA JUNIOR',
    'JATISTA PLENO',
    'JATISTA SENIOR',
    'AJUDANTE GERAL',
    'AJUDANTE GERAL PLENO',
    'ANALISTA DE LOGISTICA',
    'ANALISTA FINANCEIRO',
    'ANALISTA DE RH',
    'AUXILIAR DE RH',
    'ASSISTENTE DE RH',
    'ESTAGIÁRIO ADMINISTRATIVO',
    'ESTAGIÁRIO DE RH',
    'APONTADOR',
    'CONTROLADOR (A) DE ACESSO',
    'VENDEDOR',
    'LIDER DE EQUIPE',
    'LIDER DE EQUIPE TRAINEE',
    'SUPERVISOR',
    'TEC SEGURANCA DO TRABALHO',
    'ENGENHEIRO SEG TRABALHO',
    'GERENTE ADMINISTRATIVO',
    'MECANICO DE FROTA',
    'MEIO OFICIAL ELETRICISTA DE FROTA',
    'ELETROMECANICO DE FROTA',
    'GERENTE OPERACIONAL'
];

export default function Recrutamento() {
    const [vagas, setVagas] = useState<any[]>([]);
    const [candidatos, setCandidatos] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedVaga, setSelectedVaga] = useState<any>(null);
    const [showNewVaga, setShowNewVaga] = useState(false);
    const [showNewCandidato, setShowNewCandidato] = useState(false);
    const [isEvaluating, setIsEvaluating] = useState<string | null>(null);
    const [showReproval, setShowReproval] = useState<any>(null);
    const [reprovalMotivo, setReprovalMotivo] = useState('');
    const [vagaForm, setVagaForm] = useState({ cargo: '', departamento: '', solicitanteNome: '', prioridade: 'MEDIA', prazo: '', descricao: '' });
    const [candForm, setCandForm] = useState({ nome: '', email: '', telefone: '', whatsapp: '' });

    // Drawer Lateral
    const [showDetail, setShowDetail] = useState<any>(null);
    const [drawerForm, setDrawerForm] = useState<any>({});


    const fetchAll = async () => {
        try {
            const [vagasRes, candRes, statsRes] = await Promise.all([
                api.get('/recrutamento/vagas'),
                api.get('/recrutamento/candidatos'),
                api.get('/recrutamento/stats'),
            ]);
            setVagas(vagasRes.data);
            setCandidatos(candRes.data);
            setStats(statsRes.data);
        } catch (err) {
            console.error('Fetch error', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    const handleCreateVaga = async () => {
        try {
            await api.post('/recrutamento/vagas', vagaForm);
            setShowNewVaga(false);
            setVagaForm({ cargo: '', departamento: '', solicitanteNome: '', prioridade: 'MEDIA', prazo: '', descricao: '' });
            fetchAll();
        } catch (err: any) {
             console.error(err);
             alert('Erro ao criar vaga: ' + (err.response?.data?.error || err.message));
        }
    };

    const copyToClipboard = (text: string) => {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => {
                alert(`Link copiado!\n${text}`);
            }).catch(() => {
                alert(`Erro ao copiar link automaticamente. Por favor copie manualmente:\n\n${text}`);
            });
        } else {
            // Fallback for non-HTTPS environments (e.g. testing in local network by IP)
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-999999px";
            textArea.style.top = "-999999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                alert(`Link copiado!\n${text}`);
            } catch (err) {
                alert(`Erro ao copiar link automaticamente. Por favor copie manualmente:\n\n${text}`);
            }
            textArea.remove();
        }
    };

    const handleCreateCandidato = async () => {
        if (!selectedVaga) return;
        try {
            await api.post('/recrutamento/candidatos', { ...candForm, vagaId: selectedVaga.id });
            setShowNewCandidato(false);
            setCandForm({ nome: '', email: '', telefone: '', whatsapp: '' });
            fetchAll();
        } catch (err) { console.error(err); }
    };

    const handleMoverEtapa = async (candId: string, novaEtapa: string) => {
        if (novaEtapa === 'REPROVADO' || novaEtapa === 'PROPOSTA_RECUSADA' || novaEtapa === 'INCOMPATIVEL') {
            setShowReproval({ candId, etapa: novaEtapa });
            return;
        }

        try {
            await api.patch(`/recrutamento/candidatos/${candId}/mover`, { etapa: novaEtapa });
            fetchAll();
        } catch (err) { console.error(err); }
    };


    const handleReprove = async () => {
        if (!reprovalMotivo.trim()) return;
        try {
            await api.patch(`/recrutamento/candidatos/${showReproval.candId}/mover`, {
                etapa: showReproval.etapa, motivoReprovacao: reprovalMotivo
            });
            setShowReproval(null);
            setReprovalMotivo('');
            fetchAll();
        } catch (err) { console.error(err); }
    };

    const whatsappLinkComMensagem = (cand: any) => {
        if (!cand.whatsapp && !cand.telefone) return '#';
        const num = (cand.whatsapp || cand.telefone).replace(/\D/g, '');
        const phone = num.startsWith('55') ? num : `55${num}`;
        const cargo = selectedVaga?.cargo || cand.vaga?.cargo || 'nossa oportunidade';
        const text = encodeURIComponent(`Olá ${cand.nome}, me chamo do RH da Nacional Hidro. Vimos seu currículo para a vaga de ${cargo} e gostaríamos de dar continuidade no seu processo de seleção.`);
        return `https://wa.me/${phone}?text=${text}`;
    };

    const handleAvaliarIA = async (candId: string) => {
        setIsEvaluating(candId);
        try {
            const res = await api.post(`/recrutamento/candidatos/${candId}/triagem-ia`);
            alert(res.data.message + '\\n\\nParecer IA:\\n' + res.data.result.avaliacaoIA);
            fetchAll();
        } catch (err: any) {
             alert('❌ Erro na avaliação por IA: ' + (err.response?.data?.error || err.message));
        } finally {
            setIsEvaluating(null);
        }
    };

    const onDragStart = (e: React.DragEvent, candId: string) => {
        e.dataTransfer.setData('candId', candId);
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Necessary to allow dropping
    };

    const onDrop = (e: React.DragEvent, novaEtapa: string) => {
        e.preventDefault();
        const candId = e.dataTransfer.getData('candId');
        if (candId) {
            handleMoverEtapa(candId, novaEtapa);
        }
    };

    const vagaCandidatos = selectedVaga ? candidatos.filter((c: any) => c.vagaId === selectedVaga.id) : [];

    const whatsappLink = (num: string) => `https://wa.me/55${num.replace(/\D/g, '')}`;

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="h-full w-full flex flex-col overflow-hidden gap-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Recrutamento & Seleção</h1>
                    <p className="text-sm text-slate-500">Pipeline Kanban • {stats?.totalCandidatos || 0} candidatos</p>
                </div>
                <button onClick={() => setShowNewVaga(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Nova Vaga
                </button>
            </div>

            {/* Stats */}
            {stats && (
                <div className="flex gap-3 flex-shrink-0">
                    <div className="bg-white rounded-xl border border-slate-200 px-4 py-2 flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-blue-500" />
                        <span className="text-xs font-bold text-slate-600">Vagas Abertas: <span className="text-blue-600">{stats.vagasAbertas}</span></span>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 px-4 py-2 flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-bold text-slate-600">Candidatos: <span className="text-emerald-600">{stats.totalCandidatos}</span></span>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 px-4 py-2 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-bold text-slate-600">Taxa Aprovação: <span className="text-emerald-600">{stats.taxaAprovacao}%</span></span>
                    </div>
                </div>
            )}

            {/* Funil de Recrutamento */}
            {stats?.funnel && (
                <div className="bg-white rounded-xl border border-slate-200 p-3 flex-shrink-0">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-cyan-500" />
                            <span className="text-xs font-black text-slate-600 uppercase">Funil de Conversão</span>
                        </div>
                        {stats.tempoMedio > 0 && (
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                                ⏱️ Tempo médio: <span className="text-cyan-600">{stats.tempoMedio} dias</span>
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        {ETAPAS.map((etapa) => {
                            const count = stats.funnel[etapa.key] || 0;
                            const maxCount = Math.max(...Object.values(stats.funnel).map((v: any) => v || 0), 1);
                            const width = Math.max(20, (count / (maxCount as number)) * 100);
                            return (
                                <div key={etapa.key} className="flex-1 text-center">
                                    <div className={`${etapa.color} rounded-md mx-auto transition-all`}
                                        style={{ width: `${width}%`, height: '24px', minWidth: '20px' }}
                                        title={`${etapa.label}: ${count}`}
                                    />
                                    <p className="text-[9px] font-bold text-slate-500 mt-1 truncate">{etapa.label}</p>
                                    <p className="text-[10px] font-black text-slate-700">{count}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
                {/* Vagas Sidebar */}
                <div className="w-72 flex-shrink-0 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
                    <div className="p-3 border-b border-slate-200 bg-slate-50">
                        <p className="text-xs font-black text-slate-400 uppercase">Vagas ({vagas.length})</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        {vagas.map((v: any) => (
                            <button
                                key={v.id}
                                onClick={() => setSelectedVaga(v)}
                                className={`w-full text-left p-3 rounded-lg transition-all ${selectedVaga?.id === v.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50 border border-transparent'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <p className="text-xs font-bold text-slate-700 truncate">{v.cargo}</p>
                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${PRIORIDADE_COLOR[v.prioridade] || 'bg-slate-100'}`}>
                                        {v.prioridade}
                                    </span>
                                </div>
                                <p className="text-[10px] text-slate-400">{v.departamento} • {v.solicitanteNome}</p>
                                <div className="flex items-center gap-1 mt-1">
                                    <Users className="w-3 h-3 text-slate-300" />
                                    <span className="text-[10px] font-bold text-slate-500">{v.totalCandidatos} candidatos</span>
                                </div>
                                <div
                                    className="mt-1.5 bg-emerald-50 text-emerald-600 text-[9px] font-bold px-2 py-1 rounded text-center hover:bg-emerald-100 transition-colors cursor-pointer"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const url = `${window.location.origin}/inscricao/${v.id}`;
                                        copyToClipboard(url);
                                    }}
                                >
                                    📋 Copiar Link de Inscrição
                                </div>
                            </button>
                        ))}
                        {vagas.length === 0 && (
                            <p className="text-center text-slate-400 text-xs py-8 italic">Nenhuma vaga cadastrada</p>
                        )}
                    </div>
                </div>

                {/* Kanban Board Container */}
                <div className="flex-1 overflow-x-auto custom-scrollbar pb-2 min-h-0 bg-slate-50/50 rounded-xl border border-slate-200">
                    {!selectedVaga ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="text-center">
                                <Briefcase className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                <p className="text-slate-400 font-medium">Selecione uma vaga para ver o pipeline</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex gap-3 h-full p-2">
                            {ETAPAS.map(etapa => {
                                const cards = vagaCandidatos.filter((c: any) => c.etapa === etapa.key);

                                return (
                                    <div 
                                        key={etapa.key} 
                                        className="w-56 flex-shrink-0 flex flex-col bg-slate-50 rounded-xl border border-slate-200 overflow-hidden"
                                        onDragOver={onDragOver}
                                        onDrop={(e) => onDrop(e, etapa.key)}
                                    >
                                        <div className={`${etapa.color} text-white p-2.5 flex items-center justify-between`}>
                                            <span className="text-[10px] font-black uppercase">{etapa.label}</span>
                                            <span className="text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded">{cards.length}</span>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                            {cards.map((c: any) => (
                                                <div 
                                                    key={c.id} 
                                                    draggable
                                                    onDragStart={(e) => onDragStart(e, c.id)}
                                                    onClick={() => {
                                                        setShowDetail(c);
                                                        setDrawerForm({ ...c }); // Initialize form with candidate data
                                                    }}
                                                    className="bg-white rounded-lg p-2.5 border border-slate-200 hover:shadow-sm hover:border-blue-300 transition-all cursor-grab active:cursor-grabbing"
                                                >
                                                    <p className="text-xs font-bold text-slate-700">{c.nome}</p>
                                                    {c.email && (
                                                        <div className="flex items-center gap-1 mt-1">
                                                            <Mail className="w-3 h-3 text-slate-300" />
                                                            <span className="text-[10px] text-slate-400 truncate">{c.email}</span>
                                                        </div>
                                                    )}
                                                    {c.whatsapp && (
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            <a href={whatsappLink(c.whatsapp)} target="_blank" rel="noreferrer"
                                                                className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700">
                                                                <MessageCircle className="w-3 h-3" />
                                                                <span className="text-[10px] font-bold">{c.whatsapp}</span>
                                                            </a>
                                                            <a href={whatsappLinkComMensagem(c)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded hover:bg-emerald-100">
                                                                <MessageCircle className="w-3 h-3" /> Chamar RH
                                                            </a>
                                                        </div>
                                                    )}
                                                    {c.avaliacao && (
                                                        <div className="flex gap-0.5 mt-1">
                                                            {[1, 2, 3, 4, 5].map(s => (
                                                                <Star key={s} className={`w-3 h-3 ${s <= c.avaliacao ? 'text-blue-400 fill-blue-400' : 'text-slate-200'}`} />
                                                            ))}
                                                        </div>
                                                    )}
                                                    {c.motivoReprovacao && (
                                                        <p className="text-[10px] text-blue-900 mt-1 italic">"{c.motivoReprovacao}"</p>
                                                    )}
                                                    {c.avaliacaoIA && (
                                                        <div className="mt-2 p-1.5 bg-indigo-50 border border-indigo-100 rounded text-[9px] text-indigo-700">
                                                            <p className="font-bold mb-0.5">🤖 Parecer IA (Score: {c.scoreIA}/100)</p>
                                                            <p className="line-clamp-3" title={c.avaliacaoIA}>{c.avaliacaoIA}</p>
                                                        </div>
                                                    )}
                                                    {/* Action buttons */}
                                                    <div className="flex gap-1 mt-2">
                                                        {etapa.key === 'TRIAGEM' && (
                                                            <button
                                                                onClick={() => handleAvaliarIA(c.id)}
                                                                disabled={isEvaluating === c.id}
                                                                title="Triagem Inteligente com Gemini"
                                                                className="flex-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold py-1.5 rounded flex items-center justify-center gap-1 hover:bg-indigo-100 transition-colors disabled:opacity-50"
                                                            >
                                                                {isEvaluating === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Star className="w-3 h-3" />}
                                                                Avaliar IA
                                                            </button>
                                                        )}
                                                        <a
                                                            href={whatsappLinkComMensagem(c)}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            title="Conversar no WhatsApp"
                                                            className="flex-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold py-1.5 rounded flex items-center justify-center gap-1 hover:bg-emerald-100 transition-colors"
                                                        >
                                                            <MessageCircle className="w-3 h-3" /> Chamar RH
                                                        </a>
                                                         {etapa.key !== 'REPROVADO' && etapa.key !== 'ADMITIDO' && (
                                                            <button
                                                                onClick={() => handleMoverEtapa(c.id, 'REPROVADO')}
                                                                title="Reprovar"
                                                                className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1.5 rounded hover:bg-slate-200 transition-colors"
                                                            >
                                                                <XCircle className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <p className="text-[8px] text-slate-400 text-center mt-2 italic flex items-center justify-center gap-1">
                                                        <ChevronRight className="w-2 h-2" /> Arraste para mover
                                                    </p>
                                                </div>
                                            ))}
                                            {etapa.key === 'TRIAGEM' && (
                                                <button
                                                    onClick={() => setShowNewCandidato(true)}
                                                    className="w-full border-2 border-dashed border-slate-200 rounded-lg py-3 text-slate-400 hover:text-blue-500 hover:border-blue-300 flex items-center justify-center gap-1 text-[10px] font-bold"
                                                >
                                                    <UserPlus className="w-3 h-3" /> Novo Candidato
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* New Vaga Modal */}
            {showNewVaga && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800">Nova Vaga</h2>
                            <button onClick={() => setShowNewVaga(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>
                        <select value={vagaForm.cargo} onChange={(e) => setVagaForm({ ...vagaForm, cargo: e.target.value })}
                            className={`w-full border border-slate-200 rounded-lg p-2.5 text-sm ${!vagaForm.cargo ? 'text-slate-400' : 'text-slate-800'}`}>
                            <option value="" disabled>Selecione o Cargo *</option>
                            {CARGOS_DISPONIVEIS.map(c => <option key={c} value={c} className="text-slate-800">{c}</option>)}
                        </select>
                        <input value={vagaForm.departamento} onChange={(e) => setVagaForm({ ...vagaForm, departamento: e.target.value })}
                            placeholder="Departamento *" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                        <input value={vagaForm.solicitanteNome} onChange={(e) => setVagaForm({ ...vagaForm, solicitanteNome: e.target.value })}
                            placeholder="Solicitante *" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                        <div className="flex gap-3">
                            <select value={vagaForm.prioridade} onChange={(e) => setVagaForm({ ...vagaForm, prioridade: e.target.value })}
                                className="flex-1 border border-slate-200 rounded-lg p-2.5 text-sm">
                                <option value="BAIXA">Baixa</option>
                                <option value="MEDIA">Média</option>
                                <option value="ALTA">Alta</option>
                                <option value="URGENTE">Urgente</option>
                            </select>
                            <input type="date" value={vagaForm.prazo} onChange={(e) => setVagaForm({ ...vagaForm, prazo: e.target.value })}
                                className="flex-1 border border-slate-200 rounded-lg p-2.5 text-sm" />
                        </div>
                        <textarea value={vagaForm.descricao} onChange={(e) => setVagaForm({ ...vagaForm, descricao: e.target.value })}
                            placeholder="Descrição da vaga" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" rows={3} />
                        <button onClick={handleCreateVaga} disabled={!vagaForm.cargo || !vagaForm.departamento || !vagaForm.solicitanteNome}
                            className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-bold text-sm disabled:opacity-50">
                            Criar Vaga
                        </button>
                    </div>
                </div>
            )}

            {/* New Candidato Modal */}
            {showNewCandidato && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800">Novo Candidato</h2>
                            <button onClick={() => setShowNewCandidato(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>
                        <p className="text-xs text-slate-400">Vaga: <span className="font-bold text-slate-600">{selectedVaga?.cargo}</span></p>
                        <input value={candForm.nome} onChange={(e) => setCandForm({ ...candForm, nome: e.target.value })}
                            placeholder="Nome completo *" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                        <input value={candForm.email} onChange={(e) => setCandForm({ ...candForm, email: e.target.value })}
                            placeholder="E-mail" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                        <div className="flex gap-3">
                            <input value={candForm.telefone} onChange={(e) => setCandForm({ ...candForm, telefone: e.target.value })}
                                placeholder="Telefone" className="flex-1 border border-slate-200 rounded-lg p-2.5 text-sm" />
                            <input value={candForm.whatsapp} onChange={(e) => setCandForm({ ...candForm, whatsapp: e.target.value })}
                                placeholder="WhatsApp" className="flex-1 border border-slate-200 rounded-lg p-2.5 text-sm" />
                        </div>
                        <button onClick={handleCreateCandidato} disabled={!candForm.nome}
                            className="w-full bg-emerald-600 text-white py-2.5 rounded-xl font-bold text-sm disabled:opacity-50">
                            Adicionar Candidato
                        </button>
                    </div>
                </div>
            )}

            {/* Reproval Modal */}
            {showReproval && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
                        <h2 className="text-lg font-bold text-red-600">Reprovar Candidato</h2>
                        <p className="text-xs text-slate-500">Informe o motivo da reprovação (obrigatório):</p>
                        <textarea
                            value={reprovalMotivo}
                            onChange={(e) => setReprovalMotivo(e.target.value)}
                            placeholder="Motivo da reprovação..."
                            className="w-full border border-red-200 rounded-lg p-2.5 text-sm"
                            rows={3}
                        />
                        <div className="flex gap-2">
                            <button onClick={() => { setShowReproval(null); setReprovalMotivo(''); }}
                                className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-xl font-bold text-sm">
                                Cancelar
                            </button>
                             <button onClick={handleReprove} disabled={!reprovalMotivo.trim()}
                                className="flex-1 bg-blue-950 text-white py-2 rounded-xl font-bold text-sm disabled:opacity-50"
                            >
                                Reprovar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Drawer Lateral - Detalhes do Candidato */}
            {showDetail && (
                <>
                    <div 
                        className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity"
                        onClick={() => { setShowDetail(null); setDrawerForm({}); }}
                    />
                    <div className="fixed inset-y-0 right-0 w-[500px] bg-white shadow-2xl z-50 transform transition-transform duration-300 translate-x-0 flex flex-col border-l border-slate-200">
                        {/* Header */}
                        <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50 flex-shrink-0">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 tracking-tight">{showDetail.nome}</h2>
                                <p className="text-sm font-bold text-blue-600 mt-0.5">Vaga: {selectedVaga?.cargo || showDetail.vaga?.cargo}</p>
                            </div>
                            <button onClick={() => { setShowDetail(null); setDrawerForm({}); }} className="text-slate-400 hover:text-slate-600 bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        {/* Resumo IA / Perfil */}
                        <div className="p-5 border-b border-slate-100 bg-white flex-shrink-0">
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Contato</p>
                                    <p className="text-xs font-semibold text-slate-700 mt-1">{showDetail.telefone || showDetail.whatsapp || 'Sem telefone'}</p>
                                    <p className="text-xs font-semibold text-slate-700">{showDetail.email || 'Sem email'}</p>
                                </div>
                                {showDetail.avaliacaoIA && (
                                    <div className="flex-1 bg-indigo-50 p-2 rounded-lg border border-indigo-100 text-[10px] text-indigo-700">
                                        <p className="font-bold mb-0.5">🤖 Parecer IA (Score: {showDetail.scoreIA}/100)</p>
                                        <p className="line-clamp-2" title={showDetail.avaliacaoIA}>{showDetail.avaliacaoIA}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Corpo: Formulários Dinâmicos */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-slate-50">
                            {showDetail.etapa === 'TRIAGEM' && (
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                    <div className="text-center py-4">
                                        <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                        <p className="text-sm font-bold text-slate-600">Candidato em Triagem</p>
                                        <p className="text-xs text-slate-400 mt-1">Mova o card para a próxima etapa para iniciar entrevistas.</p>
                                    </div>
                                    <div className="border-t border-slate-100 pt-4 w-full text-left">
                                        <label className="text-sm font-bold text-[#c73315]">
                                            * Vaga Confirmada
                                        </label>
                                        <select
                                            value={drawerForm.vagaId || ''}
                                            onChange={(e) => setDrawerForm({ ...drawerForm, vagaId: e.target.value })}
                                            className="mt-2 w-full border border-[#c73315] rounded-lg p-3 text-sm outline-none bg-white text-slate-700 focus:ring-1 focus:ring-[#c73315]"
                                        >
                                            <option value="">Escolha uma opção</option>
                                            {vagas.map((v: any) => (
                                                <option key={v.id} value={v.id} className="uppercase">{v.cargo}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {showDetail.etapa === 'ENTREVISTA_RH' && (
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                    <h3 className="text-sm font-black text-slate-800 border-b pb-2">Entrevista com RH</h3>
                                    <div>
                                        <label className="text-xs font-bold text-slate-700">Data e Hora da Entrevista</label>
                                        <input type="datetime-local" value={drawerForm.dataEntrevistaRH || ''} onChange={(e) => setDrawerForm({ ...drawerForm, dataEntrevistaRH: e.target.value })} className="mt-1 w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-700">Pretensão Salarial (R$)</label>
                                        <input type="number" step="0.01" value={drawerForm.pretensaoSalarial || ''} onChange={(e) => setDrawerForm({ ...drawerForm, pretensaoSalarial: e.target.value })} className="mt-1 w-full border border-slate-200 rounded-lg p-2.5 text-sm font-black text-emerald-600" placeholder="Ex: 2500.00" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-700">Comentários do RH</label>
                                        <textarea value={drawerForm.comentariosRH || ''} onChange={(e) => setDrawerForm({ ...drawerForm, comentariosRH: e.target.value })} className="mt-1 w-full border border-slate-200 rounded-lg p-2.5 text-sm" rows={4} placeholder="Perfil comportamental, aderência à cultura, etc." />
                                    </div>
                                    <label className="flex items-center gap-2 mt-2">
                                        <input type="checkbox" checked={drawerForm.aprovadoRH || false} onChange={(e) => setDrawerForm({ ...drawerForm, aprovadoRH: e.target.checked })} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" />
                                        <span className="text-sm font-bold text-slate-700">Candidato Aprovado pelo RH?</span>
                                    </label>
                                </div>
                            )}

                            {showDetail.etapa === 'ENTREVISTA_GESTOR' && (
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-6">
                                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                        <Users className="w-4 h-4 text-emerald-600" />
                                        <h3 className="text-sm font-black text-slate-800">Entrevista - Gestor</h3>
                                    </div>
                                    
                                    <div>
                                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-2">
                                            <User className="w-4 h-4 text-slate-400" />
                                            Gestor da vaga
                                        </label>
                                        <input type="text" value={drawerForm.gestorVaga || ''} onChange={(e) => setDrawerForm({ ...drawerForm, gestorVaga: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:bg-white transition-colors" placeholder="Nome do gestor" />
                                    </div>

                                    <div>
                                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-2">
                                            <Calendar className="w-4 h-4 text-slate-400" />
                                            Data da segunda entrevista
                                        </label>
                                        <input type="datetime-local" value={drawerForm.dataSegundaEntrevista || ''} onChange={(e) => setDrawerForm({ ...drawerForm, dataSegundaEntrevista: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:bg-white transition-colors" />
                                    </div>

                                    <div>
                                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
                                            <div className="w-4 h-4 rounded-full border-2 border-slate-400 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div></div>
                                            Conhecimento técnico
                                        </label>
                                        <div className="flex items-center gap-4">
                                            {[1, 2, 3, 4, 5].map((num) => (
                                                <label key={num} className="flex items-center gap-2 cursor-pointer">
                                                    <input 
                                                        type="radio" 
                                                        name="conhecimentoTecnico" 
                                                        value={num.toString()} 
                                                        checked={drawerForm.conhecimentoTecnico === num.toString()} 
                                                        onChange={(e) => setDrawerForm({ ...drawerForm, conhecimentoTecnico: e.target.value })}
                                                        className="w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500"
                                                    />
                                                    <span className="text-sm text-slate-600">{num}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-2">
                                            <AlignLeft className="w-4 h-4 text-slate-400" />
                                            Comentários do gestor
                                        </label>
                                        <textarea value={drawerForm.comentariosGestor || ''} onChange={(e) => setDrawerForm({ ...drawerForm, comentariosGestor: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm min-h-[100px] focus:bg-white transition-colors" />
                                    </div>
                                    
                                    <div>
                                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
                                            <div className="w-4 h-4 rounded-full border-2 border-slate-400 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div></div>
                                            * O/A candidato/a está aprovado/a?
                                        </label>
                                        <div className="flex items-center gap-6">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="radio" name="aprovadoGestor" checked={drawerForm.aprovadoGestor === true} onChange={() => setDrawerForm({ ...drawerForm, aprovadoGestor: true })} className="w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500" />
                                                <span className="text-sm text-slate-600">Sim</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="radio" name="aprovadoGestor" checked={drawerForm.aprovadoGestor === false} onChange={() => setDrawerForm({ ...drawerForm, aprovadoGestor: false })} className="w-4 h-4 text-rose-500 border-slate-300 focus:ring-rose-500" />
                                                <span className="text-sm text-slate-600">Não</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {showDetail.etapa === 'TESTE_PRATICO' && (
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-6">
                                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                        <Users className="w-4 h-4 text-emerald-600" />
                                        <h3 className="text-sm font-black text-slate-800">Teste Prático</h3>
                                    </div>

                                    <div>
                                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
                                            <div className="w-4 h-4 rounded-full border-2 border-slate-400 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div></div>
                                            * Tipo de Teste
                                        </label>
                                        <div className="flex items-center gap-6">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="radio" name="tipoTeste" value="Motorista" checked={drawerForm.tipoTeste === 'Motorista'} onChange={(e) => setDrawerForm({ ...drawerForm, tipoTeste: e.target.value })} className="w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500" />
                                                <span className="text-sm text-slate-600">Motorista</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="radio" name="tipoTeste" value="Jatista" checked={drawerForm.tipoTeste === 'Jatista'} onChange={(e) => setDrawerForm({ ...drawerForm, tipoTeste: e.target.value })} className="w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500" />
                                                <span className="text-sm text-slate-600">Jatista</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-2">
                                            <Calendar className="w-4 h-4 text-slate-400" />
                                            * Data de aplicação do teste:
                                        </label>
                                        <input type="datetime-local" value={drawerForm.dataAplicacaoTeste || ''} onChange={(e) => setDrawerForm({ ...drawerForm, dataAplicacaoTeste: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:bg-white transition-colors" />
                                    </div>

                                    <div>
                                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-2">
                                            <User className="w-4 h-4 text-slate-400" />
                                            * Quem fez a aplicação do teste?
                                        </label>
                                        <input type="text" value={drawerForm.aplicadorTeste || ''} onChange={(e) => setDrawerForm({ ...drawerForm, aplicadorTeste: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:bg-white transition-colors" />
                                    </div>

                                    <div>
                                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
                                            <div className="w-4 h-4 rounded-full border-2 border-slate-400 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div></div>
                                            * O candidato passou no teste prático?
                                        </label>
                                        <div className="flex items-center gap-6">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="radio" name="passouTestePratico" checked={drawerForm.passouTestePratico === true} onChange={() => setDrawerForm({ ...drawerForm, passouTestePratico: true })} className="w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500" />
                                                <span className="text-sm text-slate-600">Sim</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="radio" name="passouTestePratico" checked={drawerForm.passouTestePratico === false} onChange={() => setDrawerForm({ ...drawerForm, passouTestePratico: false })} className="w-4 h-4 text-rose-500 border-slate-300 focus:ring-rose-500" />
                                                <span className="text-sm text-slate-600">Não</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {showDetail.etapa === 'AGUARDANDO_PROPOSTA' && (
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-6">
                                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                        <Users className="w-4 h-4 text-emerald-600" />
                                        <h3 className="text-sm font-black text-slate-800">Aguardando aceite da proposta</h3>
                                    </div>

                                    <div>
                                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-2">
                                            <Calendar className="w-4 h-4 text-slate-400" />
                                            * Previsão de retorno do candidato
                                        </label>
                                        <input type="date" value={drawerForm.previsaoRetornoCandidato ? drawerForm.previsaoRetornoCandidato.split('T')[0] : ''} onChange={(e) => setDrawerForm({ ...drawerForm, previsaoRetornoCandidato: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:bg-white transition-colors" />
                                    </div>

                                    <div>
                                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
                                            <div className="w-4 h-4 rounded-full border-2 border-slate-400 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div></div>
                                            * A proposta foi aceita?
                                        </label>
                                        <div className="flex items-center gap-6">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="radio" name="propostaAceita" checked={drawerForm.propostaAceita === true} onChange={() => setDrawerForm({ ...drawerForm, propostaAceita: true })} className="w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500" />
                                                <span className="text-sm text-slate-600">Sim</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="radio" name="propostaAceita" checked={drawerForm.propostaAceita === false} onChange={() => setDrawerForm({ ...drawerForm, propostaAceita: false })} className="w-4 h-4 text-rose-500 border-slate-300 focus:ring-rose-500" />
                                                <span className="text-sm text-slate-600">Não</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="radio" name="propostaAceita" checked={drawerForm.propostaAceita === null || drawerForm.propostaAceita === undefined} onChange={() => setDrawerForm({ ...drawerForm, propostaAceita: null })} className="w-4 h-4 text-amber-500 border-slate-300 focus:ring-amber-500" />
                                                <span className="text-sm text-slate-600">Pendente retorno</span>
                                            </label>
                                        </div>
                                    </div>

                                    {drawerForm.propostaAceita === false && (
                                        <div>
                                            <label className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-2">
                                                <AlignLeft className="w-4 h-4 text-slate-400" />
                                                Motivo
                                            </label>
                                            <p className="text-xs text-slate-500 mb-2">Qual foi a razão principal da proposta ter sido negada?</p>
                                            <textarea value={drawerForm.motivoReprovacao || ''} onChange={(e) => setDrawerForm({ ...drawerForm, motivoReprovacao: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm min-h-[100px] focus:bg-white transition-colors" />
                                        </div>
                                    )}
                                </div>
                            )}

                            {['REPROVADO', 'PROPOSTA_RECUSADA', 'INCOMPATIVEL'].includes(showDetail.etapa) && (
                                <div className="bg-red-50 p-5 rounded-xl border border-red-200 space-y-2">
                                    <h3 className="text-sm font-black text-red-800">Candidato Desqualificado</h3>
                                    <p className="text-xs font-bold text-slate-700 mt-2">Motivo do Cancelamento/Reprovação:</p>
                                    <p className="text-sm text-red-900 bg-white p-3 rounded-lg border border-red-100">{showDetail.motivoReprovacao || 'Não informado.'}</p>
                                </div>
                            )}
                            
                            {showDetail.etapa === 'ADMITIDO' && (
                                <div className="text-center py-10 bg-emerald-50 rounded-xl border border-emerald-200">
                                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                                    <p className="text-sm font-bold text-emerald-800">Candidato Contratado!</p>
                                    <p className="text-xs text-emerald-600 mt-1">Este candidato foi aprovado e agora o processo segue no Pipeline de Admissão.</p>
                                </div>
                            )}
                        </div>

                        {/* Footer Ações */}
                        <div className="p-5 border-t border-slate-100 bg-white flex justify-end flex-shrink-0">
                            <button 
                                onClick={async () => {
                                    try {
                                        await api.patch(`/recrutamento/candidatos/${showDetail.id}/mover`, { etapa: showDetail.etapa, ...drawerForm });
                                        fetchAll();
                                        setShowDetail(null);
                                        setDrawerForm({});
                                    } catch (err) {
                                        console.error(err);
                                    }
                                }} 
                                disabled={['TRIAGEM', 'REPROVADO', 'PROPOSTA_RECUSADA', 'INCOMPATIVEL', 'ADMITIDO'].includes(showDetail.etapa)}
                                className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold uppercase text-xs tracking-wider shadow-md hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Salvar Requisitos
                            </button>
                        </div>
                    </div>
                </>
            )}

        </div>
    );
}
