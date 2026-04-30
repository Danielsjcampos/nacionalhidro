import { useToast } from '../contexts/ToastContext';
import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import ModalNovaMedicao from '../components/ModalNovaMedicao';
import ModalEdicaoMedicao from '../components/ModalEdicaoMedicao';
import ModalPrecificarOS from '../components/ModalPrecificarOS';
import ModalPrecificacaoLote from '../components/ModalPrecificacaoLote';
import ModalFaturamentoMedicao from '../components/ModalFaturamentoMedicao';
import {
    FileText, Plus, Search, Loader2, X, CheckCircle2, Clock,
    DollarSign, Send, Ban, List, Columns, Printer, Pencil,
    ChevronRight, Mail, RefreshCw, AlertTriangle, Eye, ThumbsUp, ThumbsDown,
    Calculator, Save, Zap, Trash2, Package, ArrowLeftCircle, History, Snowflake, XCircle, Receipt
} from 'lucide-react';

// ─── HELPERS ────────────────────────────────────────────────────
const fmt = (v: any) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);

const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('pt-BR') : '-';

const diffDays = (from: any, to: any) => {
    if (!from || !to) return '-';
    const diff = Math.floor((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 3600 * 24));
    return diff;
};

const daysSince = (d: any) => {
    if (!d) return '-';
    return Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 3600 * 24));
};

const STATUS_LABEL: Record<string, string> = {
    EM_ABERTO:            'Em aberto',
    EM_CONFERENCIA:       'Em conferência',
    AGUARDANDO_APROVACAO: 'Aguardando aprovação do cliente',
    APROVADA:             'Validado',
    APROVADA_PARCIAL:     'Aprovado parcialmente',
    CONTESTADA:           'Contestada',
    REPROVADA:            'Atrasado',
    FINALIZADA:           'Finalizada',
    CANCELADA:            'Cancelada',
};

const STATUS_COLOR: Record<string, string> = {
    EM_ABERTO:            'bg-orange-400',
    EM_CONFERENCIA:       'bg-blue-600',
    AGUARDANDO_APROVACAO: 'bg-slate-800',
    APROVADA:             'bg-green-500',
    APROVADA_PARCIAL:     'bg-slate-400',
    CONTESTADA:           'bg-orange-600',
    REPROVADA:            'bg-red-500',
    FINALIZADA:           'bg-green-500',
    CANCELADA:            'bg-red-500',
};

const DIAS_VENCIMENTO = 2;

// ─── TYPES ──────────────────────────────────────────────────────
type ActiveTab = 'precificacao' | 'medicao' | 'finalizadas' | 'cancelados';

interface ItemCobranca {
    id: string;
    descricao: string;
    quantidade: number;
    valorUnitario: number;
    percentualAdicional: number | null;
    valorTotal: number;
}

const newSubitem = () => ({ 
    id: Math.random().toString(36).substring(2, 9), 
    descricao: '', 
    valor: '', 
    centroCustoId: '', 
    unidade: 'un', 
    quantidade: 1 
});

// ─── HEADER CELL ────────────────────────────────────────────────
const Th = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <th className={`px-3 py-2.5 text-left border-r border-white/10 whitespace-nowrap ${className}`}>{children}</th>
);
const Td = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <td className={`px-3 py-2.5 whitespace-nowrap ${className}`}>{children}</td>
);

// ─── LEGACY STATUS INDICATORS ──────────────────────────────────
// ─── LEGACY STATUS INDICATORS ──────────────────────────────────
const LegacyStatusIndicator = ({ status, isMedicao }: { status: string; isMedicao?: boolean }) => {
    if (isMedicao) {
        const color = STATUS_COLOR[status] || 'bg-slate-300';
        const label = STATUS_LABEL[status] || status;
        return (
            <div className="flex items-center justify-center">
                <div className={`w-2.5 h-2.5 rounded-full ${color} shadow-sm`} title={label} />
            </div>
        );
    }

    // Para a aba Precificação (OS)
    if (status === 'EM_PRECIFICACAO' || status === 'PENDENTE') {
        return (
            <div className="flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-orange-500 fill-orange-500/10" title="Fora do período de medição" />
            </div>
        );
    }

    if (status === 'PRECIFICADA') {
        return (
            <div className="flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-orange-400 shadow-sm" title="Precificada" />
            </div>
        );
    }

    if (['BAIXADA', 'APROVADA', 'FINALIZADA', 'EM_CONFERENCIA', 'AGUARDANDO_APROVACAO'].includes(status)) {
        return (
            <div className="flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm" title="Em Medição" />
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm" title="Em aberto" />
        </div>
    );
};



export default function Medicoes() {
    const { showToast } = useToast();

    // ─── SETTINGS ───
    const [activeTab, setActiveTab] = useState<ActiveTab>('precificacao');
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [faturarMedicao, setFaturarMedicao] = useState<any>(null);

    // ─── DATA ───
    const [osPricing, setOsPricing] = useState<any[]>([]);
    const [medicoesList, setMedicoesList] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({ precificacao: 0, medicao: 0, finalizadas: 0, cancelados: 0 });

    // ─── FILTERS ───
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [dataInicio, setDataInicio] = useState(() => {
        const d = new Date(); d.setMonth(d.getMonth() - 3); return d.toISOString().split('T')[0];
    });
    const [dataFim, setDataFim] = useState(() => {
        const d = new Date(); d.setMonth(d.getMonth() + 3); return d.toISOString().split('T')[0];
    });

    // ─── SELECTION ───
    const [selectedOS, setSelectedOS] = useState<any>(null);
    const [selectedMedicao, setSelectedMedicao] = useState<any>(null);
    const [selectedLote, setSelectedLote] = useState<any[]>([]);

    // ─── MODALS / FORMS ───
    const [showCreate, setShowCreate] = useState(false);
    const [editMedicaoId, setEditMedicaoId] = useState<string | null>(null);
    const [showPricingModal, setShowPricingModal] = useState(false);
    const [pricingOSId, setPricingOSId] = useState<string | null>(null);
    const [showPricingLoteModal, setShowPricingLoteModal] = useState(false);

    const [submitting, setSubmitting] = useState(false);

    // --- ACAO MODAL STATE ---
    const [aprovarMedicaoItem, setAprovarMedicaoItem] = useState<any>(null);
    const [valorAprovadoParcial, setValorAprovadoParcial] = useState<string>('');
    const [comprovanteImagem, setComprovanteImagem] = useState<File | null>(null);

    const [reprovarMedicaoItem, setReprovarMedicaoItem] = useState<any>(null);
    const [motivoReprovacao, setMotivoReprovacao] = useState('');

    const [centrosCusto, setCentrosCusto] = useState<any[]>([]);

    // ─── FETCH LOGIC ───
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = { search, dataInicio, dataFim };

            const resPricing = await api.get('/precificacao', { params });
            setOsPricing([
                ...(resPricing.data.kanban.EM_ABERTO || []),
                ...(resPricing.data.kanban.PRECIFICADAS || []),
                ...(resPricing.data.kanban.EM_NEGOCIACAO || [])
            ]);

            const resMed = await api.get('/medicoes', { params });
            setMedicoesList(resMed.data.list || []);

            setStats({
                precificacao: resPricing.data.kanban.EM_ABERTO?.length || 0,
                medicao: (resMed.data.list || []).filter((m: any) => !['FINALIZADA', 'CANCELADA'].includes(m.status)).length,
                finalizadas: (resMed.data.list || []).filter((m: any) => m.status === 'FINALIZADA').length,
                cancelados: (resMed.data.list || []).filter((m: any) => m.status === 'CANCELADA').length,
            });
        } catch (err: any) {
            console.error('FetchData error:', err);
        } finally {
            setLoading(false);
        }
    }, [search, dataInicio, dataFim]);

    const fetchCC = useCallback(async () => {
        try {
            const { data } = await api.get('/centros-custo');
            setCentrosCusto(data);
        } catch (err: any) {
            console.error('Fetch CC error:', err);
        }
    }, []);

    useEffect(() => { 
        fetchData(); 
        fetchCC();
    }, [fetchData, fetchCC]);

    // ─── OS PRICING ACTIONS ───
    const openPricing = (os: any) => {
        setPricingOSId(os.id);
        setShowPricingModal(true);
    };

    const handleCorrigirOS = async (osId: string) => {
        const obs = window.prompt("Justificativa para retornar à Logística:");
        if (obs === null) return;
        try {
            await api.post(`/precificacao/${osId}/corrigir`, { observacoes: obs });
            showToast('OS retornada para a Logística com sucesso.', 'success');
            fetchData();
        } catch (err: any) {
            showToast(err.response?.data?.error || 'Erro ao retornar OS.', 'error');
        }
    };


    const handleCorrigirMedicao = async (medicaoId: string) => {
        if (!window.confirm("Tem certeza que deseja voltar a Medição para correção?")) return;
        try {
            await api.patch(`/medicoes/${medicaoId}/status`, { status: 'AGUARDANDO_APROVACAO', valorAprovado: null });
            showToast('Medição retornada para correção com sucesso.', 'success');
            fetchData();
        } catch (err: any) {
            showToast(err.response?.data?.error || 'Erro ao retornar medição.', 'error');
        }
    };


    // ─── MEDICAO ACTIONS ───
    const openMedicao = async (m: any) => {
        try {
            const medRes = await api.get(`/medicoes/${m.id}`);
            setSelectedMedicao(medRes.data);
            setSelectedOS(null);
        } catch {}
    };

    const openMedicaoModal = (m: any) => {
        setEditMedicaoId(m.id);
    };

    const openAprovarModal = (m: any) => {
        setAprovarMedicaoItem(m);
        setValorAprovadoParcial('');
        setComprovanteImagem(null);
    };

    const openReprovarModal = (m: any) => {
        setReprovarMedicaoItem(m);
        setMotivoReprovacao('');
    };

    const handleAprovarSubmit = async () => {
        if (!aprovarMedicaoItem) return;
        setSubmitting(true);
        
        let valorAprovadoFinal = Number(aprovarMedicaoItem.valorTotal);
        let statusToSet = 'APROVADA';
        
        if (valorAprovadoParcial && Number(valorAprovadoParcial) > 0 && Number(valorAprovadoParcial) < valorAprovadoFinal) {
            valorAprovadoFinal = Number(valorAprovadoParcial);
            statusToSet = 'APROVADA_PARCIAL';
        }

        try {
            // Note: If you have an image upload endpoint, you would append `comprovanteImagem` here using FormData
            await api.patch(`/medicoes/${aprovarMedicaoItem.id}/status`, { 
                status: statusToSet,
                valorAprovado: valorAprovadoFinal
            });
            showToast('Medição aprovada com sucesso!', 'success');
            setAprovarMedicaoItem(null);
            fetchData();
            if (selectedMedicao?.id === aprovarMedicaoItem.id) openMedicao({ id: aprovarMedicaoItem.id });
        } catch (err: any) {
            showToast(err.response?.data?.error || 'Erro na operação', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleReprovarSubmit = async () => {
        if (!reprovarMedicaoItem) return;
        if (!motivoReprovacao.trim()) {
            showToast('O motivo da reprovação é obrigatório.', 'error');
            return;
        }
        setSubmitting(true);
        try {
            await api.patch(`/medicoes/${reprovarMedicaoItem.id}/status`, { 
                status: 'REPROVADA',
                motivoContestacao: motivoReprovacao
            });
            showToast('Medição reprovada!', 'success');
            setReprovarMedicaoItem(null);
            fetchData();
            if (selectedMedicao?.id === reprovarMedicaoItem.id) setSelectedMedicao(null);
        } catch (err: any) {
            showToast(err.response?.data?.error || 'Erro na operação', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleVerPDF = (m: any) => {
        const token = localStorage.getItem('accessToken');
        const url = `${api.defaults.baseURL}/medicoes/${m.id}/pdf?token=${token}`;
        window.open(url, '_blank');
    };

    const handleMedicaoAction = async (id: string, next: string, extra: any = {}) => {
        if (next === 'ENVIAR_CLIENTE') {
            try {
                await api.post(`/medicoes/${id}/enviar`);
                showToast('Medição enviada ao cliente!');
                fetchData(); openMedicao({ id });
            } catch (err: any) { showToast(err.response?.data?.error || 'Erro ao enviar'); }
            return;
        }

        if (next === 'ENVIAR_COBRANCA') {
            try {
                const med = fullList.find(x => x.id === id) || selectedMedicao;
                let emailOverride = null;
                if (med && !med.cliente?.email) {
                    emailOverride = window.prompt("⚠️ O cliente não possui e-mail cadastrado. Informe um e-mail para enviar a cobrança:");
                    if (emailOverride === null) return;
                    if (!emailOverride.includes('@')) {
                        showToast('E-mail inválido.');
                        return;
                    }
                }

                if (!window.confirm("Deseja disparar o e-mail de faturamento e notas fiscais para o cliente?")) return;
                setSubmitting(true);
                await api.post(`/medicoes/${id}/enviar-documentacao`, { emailOverride });
                showToast('E-mail de cobrança enviado com sucesso!', 'success');
                fetchData();
            } catch (err: any) { 
                showToast(err.response?.data?.error || 'Erro ao enviar e-mail', 'error'); 
            } finally {
                setSubmitting(false);
            }
            return;
        }

        if (next === 'CONTESTADA') {
            const motivo = window.prompt('Por favor, informe o motivo da contestação:');
            if (motivo === null) return;
            if (!motivo.trim()) { showToast('O motivo da contestação é obrigatório.'); return; }
            extra.motivoContestacao = motivo;
        }

        if (next === 'CANCELADA') {
            const motivo = window.prompt('Motivo do cancelamento:');
            if (motivo === null) return;
            if (!motivo.trim()) { showToast('O motivo é obrigatório.'); return; }
            extra.justificativaCancelamento = motivo;
        }

        if (next === 'REPROVADA') {
            const med = fullList.find(x => x.id === id) || selectedMedicao;
            if (med) openReprovarModal(med);
            return;
        }

        if (next === 'APROVADA' || next === 'APROVADA_PARCIAL') {
            const med = fullList.find(x => x.id === id) || selectedMedicao;
            if (med) openAprovarModal(med);
            return;
        }

        try {
            await api.patch(`/medicoes/${id}/status`, { status: next, ...extra });
            fetchData();
            if (next !== 'CANCELADA') openMedicao({ id });
            else setSelectedMedicao(null);
        } catch (err: any) { showToast(err.response?.data?.error || 'Erro'); }
    };

    const handleRecalcularMedicao = async (id: string) => {
        if (!window.confirm('Deseja recalcular automaticamente todos os itens das OS desta medição seguindo as regras de proposta atual?')) return;
        setSubmitting(true);
        try {
            await api.post(`/medicoes/${id}/recalcular`);
            showToast('Medição recalculada com sucesso!');
            openMedicao({ id });
            fetchData();
        } catch (err: any) {
            showToast(err.response?.data?.error || 'Erro ao recalcular medição', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // ─── CREATE MEDIÇÃO ───
    const openCreateMedicao = async () => {
        setShowCreate(true);
    };

    // ─── RENDER HELPERS ───
    const getFilteredList = () => {
        let items: any[] = [];
        if (activeTab === 'precificacao') items = osPricing;
        else if (activeTab === 'medicao') items = medicoesList.filter(m => !['FINALIZADA', 'CANCELADA'].includes(m.status));
        else if (activeTab === 'finalizadas') items = medicoesList.filter(m => m.status === 'FINALIZADA');
        else if (activeTab === 'cancelados') items = medicoesList.filter(m => m.status === 'CANCELADA');

        // Apply status filter
        if (statusFilter) {
            if (activeTab === 'medicao') {
                if (statusFilter === 'ATRASADO') {
                    items = items.filter(m => m.dataCobranca && daysSince(m.dataCobranca) > DIAS_VENCIMENTO);
                } else {
                    items = items.filter(m => m.status === statusFilter);
                }
            } else if (activeTab === 'finalizadas') {
                if (statusFilter === 'NO_PRAZO') {
                    items = items.filter(m => diffDays(m.dataCobranca, m.aprovadaEm) <= DIAS_VENCIMENTO);
                } else if (statusFilter === 'COM_ATRASO') {
                    items = items.filter(m => diffDays(m.dataCobranca, m.aprovadaEm) > DIAS_VENCIMENTO);
                }
            }
        }

        return items;
    };

    const fullList = getFilteredList();
    const totalPages = Math.max(1, Math.ceil(fullList.length / itemsPerPage));
    const list = fullList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Status filter options based on tab
    const getStatusOptions = () => {
        if (activeTab === 'medicao') return [
            { value: '', label: 'Todos' },
            { value: 'EM_ABERTO', label: 'Em Aberto' },
            { value: 'EM_CONFERENCIA', label: 'Em Conferência' },
            { value: 'AGUARDANDO_APROVACAO', label: 'Aguardando Aprovação' },
            { value: 'APROVADA_PARCIAL', label: 'Aprovada Parcialmente' },
            { value: 'CONTESTADA', label: 'Contestada' },
            { value: 'ATRASADO', label: 'Atrasado' },
        ];
        if (activeTab === 'finalizadas') return [
            { value: '', label: 'Todos' },
            { value: 'NO_PRAZO', label: 'Aprovada no Prazo' },
            { value: 'COM_ATRASO', label: 'Aprovada com Atraso' },
        ];
        return [];
    };

    if (loading && !list.length) return (
        <div className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
    );

    return (
        <div className="h-full flex flex-col gap-4">

            {/* ── LEGACY STATUS PROGRESS BAR ── */}
            <div className="bg-[#1e3a5f] p-8 rounded-xl shadow-xl border border-white/5 relative overflow-hidden mb-6">
                <div className="absolute top-0 left-0 w-full h-1 bg-white/10" />
                
                <div className="flex items-center justify-between relative z-10">
                    {[
                        { id: 'precificacao', label: 'Status da Precificação', color: 'bg-orange-400' },
                        { id: 'medicao', label: 'Status da Medição', color: 'bg-yellow-400' },
                        { id: 'finalizadas', label: 'Medições Finalizadas', color: 'bg-emerald-500' },
                        { id: 'cancelados', label: 'Cancelados', color: 'bg-red-500' }
                    ].map((step, idx, arr) => (
                        <React.Fragment key={step.id}>
                            <button 
                                onClick={() => { setActiveTab(step.id as any); setCurrentPage(1); }}
                                className="flex flex-col items-center group transition-all duration-300"
                            >
                                <div className={`w-3.5 h-3.5 rounded-full ${activeTab === step.id ? step.color : 'bg-white/20'} mb-3 shadow-lg group-hover:scale-125 transition-transform`} />
                                <span className={`text-[10px] font-black uppercase tracking-widest ${activeTab === step.id ? 'text-white' : 'text-white/40 group-hover:text-white/60'}`}>
                                    {step.label}
                                </span>
                            </button>
                            {idx < arr.length - 1 && (
                                <div className="flex-1 h-px bg-white/10 mx-4 mt-[-24px]" />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* ── FILTERS + LEGENDS ── */}
            <div className="flex items-end justify-between gap-4 flex-wrap">
                <div className="flex gap-4 items-center">
                    <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-tighter text-slate-400">
                        {activeTab === 'precificacao' ? (
                            <>
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> Em aberto</span>
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-400" /> Precificada</span>
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /> Em Medição</span>
                                <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-orange-500" /> Fora do período de medição</span>
                            </>
                        ) : activeTab === 'medicao' ? (
                            <>
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-400" /> Em aberto</span>
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-600" /> Em conferência</span>
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /> Validado</span>
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-800" /> Aguardando aprovação</span>
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-400" /> Aprovado parc.</span>
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> Atrasado</span>
                            </>
                        ) : null}
                    </div>
                </div>
                <div className="flex gap-4 items-end flex-wrap">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Buscar (OS, Cliente, Empresa...)</label>
                        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded px-3 py-2 shadow-sm min-w-[200px]">
                            <Search className="w-3.5 h-3.5 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Buscar..." 
                                value={search} 
                                onChange={e => setSearch(e.target.value)} 
                                className="text-xs font-bold outline-none w-full" 
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Filtrar Data</label>
                        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded px-3 py-2 shadow-sm">
                            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="text-xs font-bold outline-none" />
                            <span className="text-xs text-slate-300">até</span>
                            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="text-xs font-bold outline-none" />
                        </div>
                    </div>
                    {(activeTab === 'medicao' || activeTab === 'finalizadas') && (
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase">Status</label>
                            <select 
                                value={statusFilter} 
                                onChange={e => setStatusFilter(e.target.value)}
                                className="bg-white border border-slate-200 rounded px-3 py-2 text-xs font-bold shadow-sm min-w-[180px]"
                            >
                                {getStatusOptions().map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    {activeTab === 'precificacao' && selectedLote.length > 0 && (
                        <button 
                            onClick={() => setShowPricingLoteModal(true)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded text-xs font-black uppercase shadow-lg transition-all active:scale-95 flex items-center gap-2"
                        >
                            Precificar Lote ({selectedLote.length})
                        </button>
                    )}
                    <button 
                        onClick={openCreateMedicao}
                        className="bg-[#1e3a5f] hover:bg-slate-700 text-white px-6 py-2.5 rounded text-xs font-black uppercase shadow-lg transition-all active:scale-95"
                    >
                        Criar nova Medição
                    </button>
                </div>
            </div>

            {/* ── CONTENT ── */}
            <div className="flex-1 flex gap-4 min-h-0">
                <div className={`${(selectedMedicao) ? 'w-1/2' : 'w-full'} bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col transition-all`}>
                    <div className="overflow-auto flex-1 custom-scrollbar">
                        <table className="w-full text-[11px] border-collapse min-w-[1200px]">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-[#1e3a5f] text-white uppercase text-[10px] font-black">
                                    <Th className="sticky left-0 bg-[#1e3a5f] z-20">AÇÕES</Th>
                                    <Th className="text-center">STATUS</Th>

                                    {/* ─── ABA 1: PRECIFICAÇÃO ─── */}
                                    {activeTab === 'precificacao' && (<>
                                        <Th className="w-10 text-center">LOTE</Th>
                                        <Th>Nº OS</Th>
                                        <Th className="text-center">DIAS EM ABERTO</Th>
                                        <Th>EMPRESA</Th>
                                        <Th>CÓD. CLIENTE</Th>
                                        <Th>CLIENTE</Th>
                                        <Th>CONTATO</Th>
                                        <Th>DATA OS</Th>
                                        <Th>DATA BAIXA</Th>
                                        <Th className="text-right">VALOR PRECIF.</Th>
                                    </>)}

                                    {/* ─── ABA 2: STATUS MEDIÇÃO ─── */}
                                    {activeTab === 'medicao' && (<>
                                        <Th>Nº MEDIÇÃO</Th>
                                        <Th>PERÍODO</Th>
                                        <Th className="text-center">REVISÃO</Th>
                                        <Th>DATA CRIAÇÃO</Th>
                                        <Th>EMPRESA</Th>
                                        <Th>CÓD. CLIENTE</Th>
                                        <Th>CLIENTE</Th>
                                        <Th>CONTATO</Th>
                                        <Th className="text-right">VALOR TOTAL</Th>
                                        <Th>VENDEDOR RESP</Th>
                                        <Th>APROVAÇÃO INTERNA</Th>
                                        <Th>COBRANÇA ENVIADA</Th>
                                        <Th className="text-center">DIAS COBRANÇA</Th>
                                    </>)}


                                    {/* ─── ABA 3: FINALIZADAS ─── */}
                                    {activeTab === 'finalizadas' && (<>
                                        <Th>Nº MEDIÇÃO</Th>
                                        <Th>PERÍODO</Th>
                                        <Th className="text-center">REVISÃO</Th>
                                        <Th>DATA CRIAÇÃO</Th>
                                        <Th>EMPRESA</Th>
                                        <Th>CÓD. CLIENTE</Th>
                                        <Th>CLIENTE</Th>
                                        <Th>CONTATO</Th>
                                        <Th className="text-right">VALOR TOTAL</Th>
                                        <Th>VENDEDOR RESP</Th>
                                        <Th>APROVAÇÃO INTERNA</Th>
                                        <Th>COBRANÇA ENVIADA</Th>
                                        <Th>APROVAÇÃO CLIENTE</Th>
                                        <Th className="text-center">DIAS ATÉ APROV.</Th>
                                    </>)}


                                    {/* ─── ABA 4: CANCELADAS ─── */}
                                    {activeTab === 'cancelados' && (<>
                                        <Th>Nº MEDIÇÃO</Th>
                                        <Th>PERÍODO</Th>
                                        <Th className="text-center">REVISÃO</Th>
                                        <Th>DATA CRIAÇÃO</Th>
                                        <Th>EMPRESA</Th>
                                        <Th>CÓD. CLIENTE</Th>
                                        <Th>CLIENTE</Th>
                                        <Th>CONTATO</Th>
                                        <Th className="text-right">VALOR TOTAL</Th>
                                        <Th>VENDEDOR RESP</Th>
                                        <Th>APROVAÇÃO INTERNA</Th>
                                        <Th>COBRANÇA ENVIADA</Th>
                                        <Th>DATA CANCELAMENTO</Th>
                                        <Th>MOTIVO</Th>
                                        <Th className="text-center">DIAS ATÉ CANC.</Th>
                                    </>)}

                                </tr>
                            </thead>
                            <tbody>
                                {list.length === 0 ? (
                                    <tr><td colSpan={20} className="text-center py-20 text-slate-400 italic font-medium">Nenhum registro encontrado nesta etapa.</td></tr>
                                ) : list.map((item: any) => (
                                    <tr 
                                        key={item.id} 
                                        onClick={() => activeTab === 'precificacao' ? openPricing(item) : openMedicao(item)}
                                        className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors group ${
                                            (selectedMedicao?.id === item.id) ? 'bg-blue-50/50' : ''
                                        }`}
                                    >
                                        {/* ─── ACTIONS COLUMN ─── */}
                                        <Td className="sticky left-0 bg-white z-10 border-r border-slate-100">
                                            <div className="flex gap-2 text-slate-400 group-hover:text-slate-600 transition-colors">
                                                {activeTab === 'precificacao' && (<>
                                                    <button title="Precificar" className="hover:text-orange-600 transition-colors" onClick={e => { e.stopPropagation(); openPricing(item); }}>
                                                        <Calculator className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        title="Voltar para Logística" 
                                                        className="hover:text-red-600 transition-colors"
                                                        onClick={e => { e.stopPropagation(); handleCorrigirOS(item.id); }}
                                                    >
                                                        <ArrowLeftCircle className="w-4 h-4" />
                                                    </button>
                                                </>)}
                                                {activeTab === 'medicao' && (<>
                                                    <button title="Cancelar / Retornar" className="hover:text-red-600 transition-colors" onClick={e => { e.stopPropagation(); handleCorrigirMedicao(item.id); }}>
                                                        <XCircle className="w-4 h-4" />
                                                    </button>
                                                    <button title="Visualizar PDF" className="hover:text-blue-600 transition-colors" onClick={e => { e.stopPropagation(); handleVerPDF(item); }}>
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    {['EM_ABERTO', 'EM_CONFERENCIA', 'AGUARDANDO_APROVACAO'].includes(item.status) && (
                                                        <>
                                                            <button title="Reprovar" className="hover:text-red-600 transition-colors" onClick={e => { e.stopPropagation(); openReprovarModal(item); }}>
                                                                <ThumbsDown className="w-4 h-4" />
                                                            </button>
                                                            <button title="Aprovar" className="hover:text-emerald-600 transition-colors" onClick={e => { e.stopPropagation(); openAprovarModal(item); }}>
                                                                <ThumbsUp className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                    {item.status === 'APROVADA' && (
                                                        <button title="Gerar Faturamento" className="hover:text-emerald-600 transition-colors" onClick={e => { e.stopPropagation(); setFaturarMedicao(item); }}>
                                                            <FileText className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </>)}

                                                {activeTab === 'finalizadas' && (<>
                                                    <button title="Gerar Faturamento" className="hover:text-emerald-600 transition-colors" onClick={e => { e.stopPropagation(); setFaturarMedicao(item); }}>
                                                        <Receipt className="w-4 h-4" />
                                                    </button>
                                                    <button title="Disparar Cobrança (E-mail)" className="hover:text-blue-600 transition-colors" onClick={e => { e.stopPropagation(); handleMedicaoAction(item.id, 'ENVIAR_COBRANCA'); }}>
                                                        <Send className="w-4 h-4" />
                                                    </button>
                                                    <button title="Cancelar / Retornar" className="hover:text-red-600 transition-colors" onClick={e => { e.stopPropagation(); handleCorrigirMedicao(item.id); }}>
                                                        <XCircle className="w-4 h-4" />
                                                    </button>
                                                    <button title="Visualizar" className="hover:text-slate-900 transition-colors" onClick={e => { e.stopPropagation(); handleVerPDF(item); }}>
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button title="Histórico" className="hover:text-blue-600 transition-colors" onClick={e => { e.stopPropagation(); openMedicao(item); }}>
                                                        <History className="w-4 h-4" />
                                                    </button>
                                                </>)}

                                            </div>
                                        </Td>

                                        {/* ─── STATUS COLUMN ─── */}
                                        <Td className="text-center border-r border-slate-100">
                                            <LegacyStatusIndicator 
                                                status={item.status} 
                                                dataBaixa={item.dataBaixa} 
                                                periodo={item.periodo} 
                                            />
                                        </Td>

                                        {/* ─── DATA COLUMNS ─── */}
                                        {/* ─── DATA ABA 1: PRECIFICAÇÃO ─── */}
                                        {activeTab === 'precificacao' && (<>
                                            <Td className="text-center">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedLote.some(l => l.id === item.id)}
                                                    onChange={(e) => {
                                                        e.stopPropagation();
                                                        if (e.target.checked) setSelectedLote([...selectedLote, item]);
                                                        else setSelectedLote(selectedLote.filter(l => l.id !== item.id));
                                                    }}
                                                    className="w-4 h-4 rounded border-slate-300 text-[#1e3a5f] focus:ring-[#1e3a5f]"
                                                />
                                            </Td>
                                            <Td className="font-black text-slate-700">{item.codigo}</Td>
                                            <Td className="text-center font-bold text-slate-500">
                                                <LegacyStatusIndicator status={item.status} isMedicao={activeTab !== 'precificacao'} />
                                                <span className={daysSince(item.dataBaixa || item.createdAt) > 2 ? 'text-red-500' : ''}>
                                                    {daysSince(item.dataBaixa || item.createdAt)}d
                                                </span>
                                            </Td>
                                            <Td className="text-slate-500 font-bold truncate max-w-[120px] uppercase">{item.empresa?.split(' ')[0]}</Td>
                                            <Td className="text-slate-500 font-bold">{item.cliente?.codigo || item.cliente?.id?.slice(0,6).toUpperCase()}</Td>
                                            <Td className="font-black text-slate-700 truncate max-w-[200px] uppercase">{item.cliente?.nome}</Td>
                                            <Td className="text-slate-500 uppercase">{item.contato || '-'}</Td>
                                            <Td className="text-slate-500">{fmtDate(item.createdAt)}</Td>
                                            <Td className="text-slate-500">{fmtDate(item.dataBaixa)}</Td>
                                            <Td className="text-right font-black text-orange-600">{fmt(item.valorPrecificado)}</Td>
                                        </>)}

                                        {/* ─── DATA ABA 2: STATUS MEDIÇÃO ─── */}
                                        {activeTab === 'medicao' && (<>
                                            <Td className="font-black text-slate-700">{item.codigo}</Td>
                                            <Td className="text-slate-500 font-bold uppercase">{item.periodo || '-'}</Td>
                                            <Td className="text-center font-bold text-slate-400">R{item.revisao || 0}</Td>
                                            <Td className="text-slate-500">{fmtDate(item.createdAt)}</Td>
                                            <Td className="uppercase text-[10px] font-bold text-slate-500">{item.empresa || 'NACIONAL HIDRO'}</Td>
                                            <Td className="text-slate-500 font-bold">{item.cliente?.codigo || '-'}</Td>
                                            <Td className="font-black text-slate-700 truncate max-w-[200px] uppercase">
                                                {item.cliente?.nome}
                                                {item.cte && <span className="ml-2 bg-blue-100 text-blue-700 text-[8px] px-1.5 py-0.5 rounded-full font-black">CTE</span>}
                                            </Td>
                                            <Td className="text-slate-500">{item.cliente?.telefone || '-'}</Td>
                                            <Td className="text-right font-black text-blue-700">{fmt(item.valorTotal)}</Td>
                                            <Td className="text-slate-500 uppercase">{item.vendedor?.name || '-'}</Td>
                                            <Td className="text-slate-500">{fmtDate(item.dataAprovacaoInterna)}</Td>
                                            <Td className="text-slate-500">{fmtDate(item.dataCobranca)}</Td>
                                            <Td className="text-center font-bold">
                                                {item.dataCobranca ? (
                                                    <span className={`${Number(daysSince(item.dataCobranca)) > DIAS_VENCIMENTO ? 'text-red-600' : 'text-slate-500'}`}>
                                                        {daysSince(item.dataCobranca)}d
                                                    </span>
                                                ) : '-'}
                                            </Td>
                                        </>)}

                                        {/* ─── DATA ABA 3: FINALIZADAS ─── */}
                                        {activeTab === 'finalizadas' && (<>
                                            <Td className="font-black text-slate-700">{item.codigo}</Td>
                                            <Td className="text-slate-500 font-bold uppercase">{item.periodo || '-'}</Td>
                                            <Td className="text-center font-black text-slate-400">R{item.revisao || 0}</Td>
                                            <Td className="text-slate-500">{fmtDate(item.createdAt)}</Td>
                                            <Td className="uppercase text-[10px] font-bold text-slate-500">{item.empresa || 'NACIONAL HIDRO'}</Td>
                                            <Td className="text-slate-500 font-bold">{item.cliente?.codigo || '-'}</Td>
                                            <Td className="font-black text-slate-700 truncate max-w-[200px] uppercase">{item.cliente?.nome}</Td>
                                            <Td className="text-slate-500">{item.cliente?.telefone || '-'}</Td>
                                            <Td className="text-right font-black text-emerald-600">{fmt(item.valorTotal)}</Td>
                                            <Td className="text-slate-500 uppercase">{item.vendedor?.name || '-'}</Td>
                                            <Td className="text-slate-500">{fmtDate(item.dataAprovacaoInterna)}</Td>
                                            <Td className="text-slate-500">{fmtDate(item.dataCobranca)}</Td>
                                            <Td className="text-slate-500">{fmtDate(item.aprovadaEm)}</Td>
                                            <Td className="text-center font-bold text-slate-500">{diffDays(item.dataCobranca, item.aprovadaEm)}d</Td>
                                        </>)}


                                        {/* ─── DATA ABA 4: CANCELADOS ─── */}
                                        {activeTab === 'cancelados' && (<>
                                            <Td className="font-black text-slate-700">{item.codigo}</Td>
                                            <Td className="text-slate-500 font-bold uppercase">{item.periodo || '-'}</Td>
                                            <Td className="text-center font-black text-slate-400">R{item.revisao || 0}</Td>
                                            <Td className="text-slate-500">{fmtDate(item.createdAt)}</Td>
                                            <Td className="uppercase text-[10px] font-bold text-slate-500">{item.empresa || 'NACIONAL HIDRO'}</Td>
                                            <Td className="text-slate-500 font-bold">{item.cliente?.codigo || '-'}</Td>
                                            <Td className="font-black text-slate-700 uppercase">{item.cliente?.nome}</Td>
                                            <Td className="text-slate-500">{item.cliente?.telefone || '-'}</Td>
                                            <Td className="text-right font-black text-slate-400">{fmt(item.valorTotal)}</Td>
                                            <Td className="text-slate-500 uppercase">{item.vendedor?.name || '-'}</Td>
                                            <Td className="text-slate-500">{fmtDate(item.dataAprovacaoInterna)}</Td>
                                            <Td className="text-slate-500">{fmtDate(item.dataCobranca)}</Td>
                                            <Td className="text-slate-500">{fmtDate(item.dataCancelamento)}</Td>
                                            <Td className="text-slate-500 truncate max-w-[150px] italic">{item.justificativaCancelamento || '-'}</Td>
                                            <Td className="text-center font-bold text-slate-500">{diffDays(item.dataCobranca, item.dataCancelamento)}d</Td>
                                        </>)}


                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination info */}
                    <div className="bg-slate-50 border-t border-slate-200 p-3 flex items-center justify-between text-xs font-bold text-slate-500">
                        <button 
                            disabled={currentPage === 1} 
                            onClick={() => setCurrentPage(p => p - 1)}
                            className="px-4 py-2 hover:bg-slate-200 rounded disabled:opacity-50 transition-colors uppercase tracking-widest text-[10px]"
                        >
                            Anterior
                        </button>
                        
                        <div className="flex items-center gap-4">
                            <span className="uppercase tracking-widest text-[10px]">
                                Página 
                                <input 
                                    type="number" 
                                    value={currentPage} 
                                    onChange={e => {
                                        const val = Number(e.target.value);
                                        if (val >= 1 && val <= totalPages) setCurrentPage(val);
                                    }} 
                                    className="w-12 text-center border border-slate-200 rounded p-1 mx-2 focus:outline-none focus:border-blue-500" 
                                /> 
                                de {totalPages}
                            </span>
                            
                            <select 
                                value={itemsPerPage} 
                                onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} 
                                className="border border-slate-200 rounded p-1 outline-none text-[10px] uppercase tracking-widest"
                            >
                                <option value={10}>10 itens</option>
                                <option value={20}>20 itens</option>
                                <option value={50}>50 itens</option>
                                <option value={100}>100 itens</option>
                            </select>
                        </div>

                        <button 
                            disabled={currentPage === totalPages || fullList.length === 0}
                            onClick={() => setCurrentPage(p => p + 1)}
                            className="px-4 py-2 hover:bg-slate-200 rounded disabled:opacity-50 transition-colors uppercase tracking-widest text-[10px]"
                        >
                            Próximo
                        </button>
                    </div>
                </div>

                {/* ── DETAIL PANEL: MEDIÇÃO ── */}
                {selectedMedicao && (
                    <div className="w-1/2 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="bg-[#1e3a5f] text-white p-4 flex items-center justify-between">
                            <div>
                                <h3 className="font-black uppercase text-sm flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-emerald-400" />
                                    Medição {selectedMedicao.codigo}
                                    {selectedMedicao.revisao > 0 && <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded-full">R{selectedMedicao.revisao}</span>}
                                </h3>
                                <p className="text-[10px] text-white/60">{selectedMedicao.cliente?.nome}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => openMedicaoModal(selectedMedicao)} title="Edição Completa" className="hover:bg-white/10 p-1.5 rounded-lg text-blue-300 hover:text-white transition-colors"><Pencil className="w-4 h-4" /></button>
                                <button onClick={() => setSelectedMedicao(null)} className="hover:bg-white/10 p-1.5 rounded-lg"><X className="w-4 h-4" /></button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
                            {/* Actions bar */}
                            {['EM_ABERTO', 'AGUARDANDO_APROVACAO'].includes(selectedMedicao.status) && (
                                <div className="flex gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                                    <button onClick={() => openAprovarModal(selectedMedicao)} title="Aprovar" className="flex-1 bg-emerald-600 text-white h-9 rounded-lg flex items-center justify-center gap-1.5 hover:bg-emerald-700 text-[10px] font-black uppercase"><ThumbsUp className="w-3.5 h-3.5" /> Aprovar</button>
                                    <button onClick={() => openReprovarModal(selectedMedicao)} title="Reprovar" className="flex-1 bg-red-500 text-white h-9 rounded-lg flex items-center justify-center gap-1.5 hover:bg-red-600 text-[10px] font-black uppercase"><ThumbsDown className="w-3.5 h-3.5" /> Reprovar</button>
                                </div>
                            )}
                            {selectedMedicao.status === 'APROVADA' && (
                                                        <div className="flex gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                                                            <button onClick={() => setFaturarMedicao(selectedMedicao)} title="Gerar Faturamento" className="flex-1 bg-emerald-600 text-white h-9 rounded-lg flex items-center justify-center gap-1.5 hover:bg-emerald-700 text-[10px] font-black uppercase"><FileText className="w-3.5 h-3.5" /> Gerar Faturamento</button>
                                                        </div>
                                                    )}
                            {selectedMedicao.status === 'FINALIZADA' && (
                                <div className="flex gap-2 p-3 bg-blue-50 rounded-xl border border-blue-200">
                                    <button onClick={() => handleMedicaoAction(selectedMedicao.id, 'ENVIAR_COBRANCA')} title="Disparar Cobrança (E-mail)" className="flex-1 bg-blue-600 text-white h-9 rounded-lg flex items-center justify-center gap-1.5 hover:bg-blue-700 text-[10px] font-black uppercase"><Send className="w-3.5 h-3.5" /> Disparar Cobrança</button>
                                </div>
                            )}

                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 font-bold">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Empresa</p>
                                    <span className="text-xs font-black text-slate-700 uppercase">{selectedMedicao.empresa || 'NACIONAL HIDRO'}</span>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 font-bold">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Status</p>
                                    <span className={`text-xs font-black uppercase ${
                                        selectedMedicao.status === 'CONTESTADA' ? 'text-orange-600' :
                                        selectedMedicao.status === 'CANCELADA' ? 'text-red-600' :
                                        selectedMedicao.status === 'APROVADA' ? 'text-emerald-600' : 'text-blue-700'
                                    }`}>{STATUS_LABEL[selectedMedicao.status]}</span>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 font-bold">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Solicitante</p>
                                    <span className="text-xs font-black text-slate-700 uppercase">{selectedMedicao.solicitante || '-'}</span>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 font-bold">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Tipo Doc</p>
                                    <span className="text-xs font-black text-slate-700">{selectedMedicao.tipoDocumento === 'ND' ? 'Nota de Débito' : 'Recibo (RL)'}</span>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 font-bold col-span-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">E-mail CC</p>
                                    <span className="text-[10px] font-bold text-slate-600 truncate block">{selectedMedicao.emailCobrancaCC || '-'}</span>
                                </div>
                                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-right col-span-2">
                                    <p className="text-[10px] font-black text-emerald-800 uppercase mb-1">Valor Total</p>
                                    <span className="text-xl font-black text-emerald-600">{fmt(selectedMedicao.valorTotal)}</span>
                                </div>
                            </div>

                            {/* Timeline / Dates */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase">Criação</p>
                                    <p className="text-xs font-bold">{fmtDate(selectedMedicao.createdAt)}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase">Aprovação Interna</p>
                                    <p className="text-xs font-bold">{fmtDate(selectedMedicao.dataAprovacaoInterna)}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase">Cobrança Enviada</p>
                                    <p className="text-xs font-bold">{fmtDate(selectedMedicao.dataCobranca)}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase">Aprovação Cliente</p>
                                    <p className="text-xs font-bold">{fmtDate(selectedMedicao.aprovadaEm)}</p>
                                </div>
                            </div>

                            {/* Reprovação info (reaberta para edição) */}
                            {selectedMedicao.motivoReprovacao && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                                    <p className="text-[10px] font-black text-red-600 uppercase mb-1">⚠ Reprovada Anteriormente</p>
                                    <p className="text-xs text-red-800">{selectedMedicao.motivoReprovacao}</p>
                                    {selectedMedicao.reprovadaEm && <p className="text-[10px] text-red-500 mt-1">Em: {fmtDate(selectedMedicao.reprovadaEm)}</p>}
                                </div>
                            )}

                            {/* Contestação info */}
                            {selectedMedicao.status === 'CONTESTADA' && selectedMedicao.motivoContestacao && (
                                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                                    <p className="text-[10px] font-black text-orange-600 uppercase mb-1">Motivo da Contestação</p>
                                    <p className="text-xs text-orange-800">{selectedMedicao.motivoContestacao}</p>
                                </div>
                            )}

                            {/* DOCUMENTOS GERADOS (Faturamento) */}
                            {selectedMedicao.faturamentos && selectedMedicao.faturamentos.length > 0 && (
                                <div className="space-y-3 pt-2 border-t border-slate-100">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2">
                                        <FileText className="w-3 h-3" /> Documentos de Faturamento
                                    </h4>
                                    <div className="grid grid-cols-1 gap-2">
                                        {selectedMedicao.faturamentos.map((f: any) => (
                                            <div key={f.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100 hover:border-blue-200 transition-colors">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-8 h-8 rounded flex items-center justify-center font-black text-[10px] ${
                                                        f.tipo === 'NFSE' ? 'bg-fuchsia-100 text-fuchsia-700' : 
                                                        f.tipo === 'CTE' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                                                    }`}>
                                                        {f.tipo}
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-700">Doc {f.numero || f.id.slice(0,8)}</p>
                                                        <p className="text-[9px] text-slate-400">Status: <span className={f.status === 'EMITIDO' ? 'text-emerald-600' : 'text-orange-500'}>{f.status}</span></p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {['NFSE', 'CTE', 'NFE'].includes(f.tipo) && (
                                                        <button 
                                                            onClick={async () => {
                                                                try {
                                                                    showToast('Consultando status na Focus NFe...', 'info');
                                                                    const res = await api.get(`/faturamento/${f.id}/status`);
                                                                    showToast(`Status: ${res.data.status || 'Processando'}`, 'success');
                                                                    openMedicao({ id: selectedMedicao.id });
                                                                } catch (err: any) {
                                                                    showToast(err.response?.data?.error || 'Erro ao consultar', 'error');
                                                                }
                                                            }}
                                                            className="p-1.5 hover:bg-white rounded border border-transparent hover:border-slate-200 text-slate-600 transition-all"
                                                            title="Atualizar Status (Focus NFe)"
                                                        >
                                                            <RefreshCw className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => {
                                                            const token = localStorage.getItem('token');
                                                            const url = `${api.defaults.baseURL}/faturamento/${f.id}/pdf?token=${token}`;
                                                            window.open(url, '_blank');
                                                        }}
                                                        className="p-1.5 hover:bg-white rounded border border-transparent hover:border-slate-200 text-blue-600 transition-all"
                                                        title="Ver PDF"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Cancelamento info */}
                            {selectedMedicao.status === 'CANCELADA' && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                                    <p className="text-[10px] font-black text-red-600 uppercase mb-1">Motivo do Cancelamento</p>
                                    <p className="text-xs text-red-800">{selectedMedicao.justificativaCancelamento || '-'}</p>
                                    <p className="text-[10px] text-red-500 mt-1">Data: {fmtDate(selectedMedicao.dataCancelamento)}</p>
                                </div>
                            )}

                            {/* OS Vinculadas */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase">Ordens de Serviço Vinculadas</h4>
                                    {selectedMedicao.status === 'EM_ABERTO' && (
                                        <button 
                                            onClick={() => handleRecalcularMedicao(selectedMedicao.id)}
                                            className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-full hover:bg-blue-100 flex items-center gap-1 transition-all"
                                        >
                                            <RefreshCw className="w-3 h-3" /> RECALCULAR TUDO
                                        </button>
                                    )}
                                </div>
                                {selectedMedicao.ordensServico?.map((os: any) => (
                                    <details key={os.id} className="group bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
                                        <summary className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 transition-colors list-none">
                                            <div className="flex items-center gap-3">
                                                <ChevronRight className="w-3.5 h-3.5 text-slate-400 transition-transform group-open:rotate-90" />
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-700 uppercase text-xs">{os.codigo}</span>
                                                    <span className="text-[9px] text-slate-400 uppercase font-bold">{fmtDate(os.createdAt)}</span>
                                                </div>
                                            </div>
                                            <span className="font-black text-blue-700 text-xs">{fmt(os.valorPrecificado)}</span>
                                        </summary>
                                        <div className="p-3 bg-slate-50/50 border-t border-slate-50 space-y-2">
                                            {os.itensCobranca?.map((it: any) => (
                                                <div key={it.id} className="flex justify-between items-center text-[10px]">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-600 uppercase">{it.descricao}</span>
                                                        <span className="text-slate-400">{it.quantidade}x {fmt(it.valorUnitario)}</span>
                                                    </div>
                                                    <span className="font-black text-slate-500">{fmt(it.valorTotal)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </details>
                                ))}
                            </div>

                            {/* Email History */}
                            {selectedMedicao.cobrancasEmail?.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase">Histórico de E-mails</h4>
                                    {selectedMedicao.cobrancasEmail.map((email: any) => (
                                        <div key={email.id} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-100 rounded-lg">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-slate-600 truncate max-w-[200px]">{email.assunto}</span>
                                                <span className="text-[9px] text-slate-400">{email.destinatario} — {fmtDate(email.dataEnvio)}</span>
                                            </div>
                                            <span className={`text-[9px] font-black uppercase ${email.statusEnvio === 'ENVIADO' ? 'text-emerald-600' : 'text-red-500'}`}>{email.statusEnvio}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ── MODALS ── */}
            <ModalNovaMedicao 
                isOpen={showCreate} 
                onClose={() => setShowCreate(false)} 
                onSuccess={() => { fetchData(); setActiveTab('medicao'); }} 
            />
            <ModalEdicaoMedicao 
                isOpen={!!editMedicaoId} 
                onClose={() => setEditMedicaoId(null)}
                medicaoId={editMedicaoId!}
                onSuccess={fetchData}
            />

            {showPricingModal && pricingOSId && (
                <ModalPrecificarOS 
                    isOpen={showPricingModal}
                    onClose={() => setShowPricingModal(false)}
                    osId={pricingOSId}
                    onSuccess={fetchData}
                />
            )}
            {faturarMedicao && (
                <ModalFaturamentoMedicao 
                    medicao={faturarMedicao} 
                    onClose={() => setFaturarMedicao(null)} 
                    onSuccess={fetchData} 
                />
            )}
            {/* MODAL DE APROVAÇÃO DA MEDIÇÃO */}
            {aprovarMedicaoItem && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-5xl rounded shadow-2xl overflow-hidden flex flex-col border border-white/20">
                        <div className="bg-slate-200 p-3 flex items-center justify-between text-slate-800 border-b border-slate-300">
                            <h2 className="text-sm font-bold">Aprovar cobrança</h2>
                            <button onClick={() => setAprovarMedicaoItem(null)} className="hover:bg-slate-300 p-1.5 rounded transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-6 grid grid-cols-5 gap-4">
                            {/* ROW 1 */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-700">Código Medição</label>
                                <div className="bg-slate-100 border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-600 font-medium truncate">{aprovarMedicaoItem.codigo}</div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-700">Empresa</label>
                                <div className="bg-slate-100 border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-600 font-medium truncate">{aprovarMedicaoItem.empresa || 'NACIONAL HIDRO'}</div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-700">Cliente</label>
                                <div className="bg-slate-100 border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-600 font-medium truncate">{aprovarMedicaoItem.cliente?.nome}</div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-700">Contato</label>
                                <div className="bg-slate-100 border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-600 font-medium truncate">{aprovarMedicaoItem.solicitante || aprovarMedicaoItem.contato?.nome || '-'}</div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-700">Data Cobrança</label>
                                <div className="bg-slate-100 border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-600 font-medium truncate">{aprovarMedicaoItem.dataCobranca ? new Date(aprovarMedicaoItem.dataCobranca).toLocaleString('pt-BR') : '-'}</div>
                            </div>

                            {/* ROW 2 */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-700">Valor por serviço</label>
                                <div className="bg-slate-100 border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-600 font-medium truncate">{fmt(aprovarMedicaoItem.totalServico || aprovarMedicaoItem.valorTotal)}</div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-700">Valor por hora</label>
                                <div className="bg-slate-100 border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-600 font-medium truncate">{fmt(aprovarMedicaoItem.totalHora || 0)}</div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-700">Valor adicional</label>
                                <div className="bg-slate-100 border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-600 font-medium truncate">{fmt(aprovarMedicaoItem.adicional || 0)}</div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-700">Valor descontado</label>
                                <div className="bg-slate-100 border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-600 font-medium truncate">{fmt(aprovarMedicaoItem.desconto || 0)}</div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-700">Valor Total</label>
                                <div className="bg-slate-100 border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-600 font-medium truncate">{fmt(aprovarMedicaoItem.valorTotal)}</div>
                            </div>

                            {/* ROW 3 */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-700">Aprovado Parcial</label>
                                <input 
                                    type="number"
                                    value={valorAprovadoParcial}
                                    onChange={e => setValorAprovadoParcial(e.target.value)}
                                    className="bg-white border border-slate-300 rounded px-2 py-1.5 text-xs font-medium outline-none focus:border-blue-500"
                                    placeholder="R$ 0,00"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-700">Valor Restante</label>
                                <div className="bg-slate-100 border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-600 font-medium truncate">
                                    {fmt(valorAprovadoParcial ? Number(aprovarMedicaoItem.valorTotal) - Number(valorAprovadoParcial) : aprovarMedicaoItem.valorTotal)}
                                </div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-700">Valor Aprovado</label>
                                <div className="bg-slate-100 border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-600 font-medium truncate">
                                    {fmt(valorAprovadoParcial ? Number(valorAprovadoParcial) : aprovarMedicaoItem.valorTotal)}
                                </div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-700">Valor em RL</label>
                                <div className="bg-slate-100 border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-600 font-medium truncate">
                                    {fmt(aprovarMedicaoItem.valorRL || 0)}
                                </div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-700">Valor em NF</label>
                                <div className="bg-slate-100 border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-600 font-medium truncate">
                                    {fmt(aprovarMedicaoItem.valorNFSe || 0)}
                                </div>
                            </div>

                            {/* IMAGE UPLOAD */}
                            <div className="col-span-5 flex flex-col gap-1 mt-2">
                                <label className="text-[10px] font-bold text-slate-700">Imagem</label>
                                <div className="border border-dashed border-slate-300 rounded bg-white p-6 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                                    <FileText className="w-6 h-6" />
                                    Cole ou carregue aqui sua imagem...
                                </div>
                            </div>
                        </div>

                        <div className="p-4 flex items-center justify-end gap-3 border-t border-slate-200 bg-white">
                            <button 
                                onClick={() => setAprovarMedicaoItem(null)}
                                className="px-6 py-2 bg-slate-400 hover:bg-slate-500 text-white rounded text-sm font-bold transition-all"
                            >
                                Fechar
                            </button>
                            <button 
                                onClick={handleAprovarSubmit}
                                disabled={submitting}
                                className="px-6 py-2 bg-[#1e3a5f] hover:bg-blue-900 text-white rounded text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {submitting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                Aprovar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE REPROVAÇÃO */}
            {reprovarMedicaoItem && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-lg shadow-2xl overflow-hidden flex flex-col">
                        <div className="bg-red-600 p-4 flex items-center justify-between text-white">
                            <h2 className="text-sm font-bold">Reprovar Medição {reprovarMedicaoItem.codigo}</h2>
                            <button onClick={() => setReprovarMedicaoItem(null)} className="hover:bg-white/10 p-1 rounded">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 flex flex-col gap-4">
                            <p className="text-sm text-slate-600 font-medium">As Ordens de Serviço voltarão para o status de Precificada para que você possa editá-las.</p>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-slate-700">Motivo da Reprovação</label>
                                <textarea 
                                    rows={4}
                                    value={motivoReprovacao}
                                    onChange={e => setMotivoReprovacao(e.target.value)}
                                    placeholder="Ex: Cliente pediu desconto, valor incorreto..."
                                    className="bg-white border border-slate-300 rounded px-3 py-2 text-sm outline-none resize-none focus:border-red-500"
                                />
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
                            <button 
                                onClick={() => setReprovarMedicaoItem(null)}
                                className="px-6 py-2 text-slate-500 hover:text-slate-700 text-sm font-bold transition-all"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleReprovarSubmit}
                                disabled={submitting}
                                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-bold transition-all disabled:opacity-50"
                            >
                                Reprovar Medição
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showPricingLoteModal && (
                <ModalPrecificacaoLote 
                    isOpen={showPricingLoteModal}
                    onClose={() => setShowPricingLoteModal(false)}
                    osList={selectedLote}
                    onSuccess={() => {
                        setSelectedLote([]);
                        fetchData();
                    }}
                />
            )}
        </div>
    );
}
