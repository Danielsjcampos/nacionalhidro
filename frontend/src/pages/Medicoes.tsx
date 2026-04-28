import { useToast } from '../contexts/ToastContext';
import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import ModalNovaMedicao from '../components/ModalNovaMedicao';
import ModalEdicaoMedicao from '../components/ModalEdicaoMedicao';
import ModalPrecificarOS from '../components/ModalPrecificarOS';
import {
    FileText, Plus, Search, Loader2, X, CheckCircle2, Clock,
    DollarSign, Send, Ban, List, Columns, Printer, Pencil,
    ChevronRight, Mail, RefreshCw, AlertTriangle, Eye, ThumbsUp, ThumbsDown,
    Calculator, Save, Zap, Trash2, Package, ArrowLeftCircle, History, Snowflake, XCircle
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
    EM_ABERTO:            'Em Aberto',
    EM_CONFERENCIA:       'Conferência',
    AGUARDANDO_APROVACAO: 'Aguard. Aprovação',
    APROVADA:             'Aprovada',
    APROVADA_PARCIAL:     'Aprov. Parcial',
    CONTESTADA:           'Contestada',
    REPROVADA:            'Reprovada',
    FINALIZADA:           'Finalizada',
    CANCELADA:            'Cancelada',
};

const STATUS_COLOR: Record<string, string> = {
    EM_ABERTO:            'bg-yellow-400',
    EM_CONFERENCIA:       'bg-fuchsia-400',
    AGUARDANDO_APROVACAO: 'bg-blue-500',
    APROVADA:             'bg-emerald-500',
    APROVADA_PARCIAL:     'bg-slate-400',
    CONTESTADA:           'bg-orange-500',
    REPROVADA:            'bg-red-600',
    FINALIZADA:           'bg-emerald-500',
    CANCELADA:            'bg-red-600',
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
const LegacyStatusIndicator = ({ status, dataBaixa, periodo }: { status: string; dataBaixa?: string; periodo?: string }) => {
    if (['BAIXADA', 'APROVADA', 'FINALIZADA', 'EM_CONFERENCIA', 'AGUARDANDO_APROVACAO'].includes(status)) {
        return (
            <div className="flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" title={status} />
            </div>
        );
    }

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

    // ─── MODALS / FORMS ───
    const [showCreate, setShowCreate] = useState(false);
    const [editMedicaoId, setEditMedicaoId] = useState<string | null>(null);
    const [showPricingModal, setShowPricingModal] = useState(false);
    const [pricingOSId, setPricingOSId] = useState<string | null>(null);

    const [submitting, setSubmitting] = useState(false);
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
                finalizadas: (resMed.data.list || []).filter((m: any) => ['FINALIZADA', 'APROVADA'].includes(m.status)).length,
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
            const { data } = await api.get('/centro-custo');
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
            const motivo = window.prompt('Motivo da reprovação (será criada uma nova revisão):');
            if (motivo === null) return;
            extra.motivoContestacao = motivo;
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
        else if (activeTab === 'medicao') items = medicoesList.filter(m => !['FINALIZADA', 'APROVADA', 'CANCELADA'].includes(m.status));
        else if (activeTab === 'finalizadas') items = medicoesList.filter(m => ['FINALIZADA', 'APROVADA'].includes(m.status));
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
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> Em aberto</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-400" /> Precificada</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Em Medição</span>
                        <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-orange-500" /> Fora do período de medição</span>
                    </div>
                </div>
                <div className="flex gap-4 items-end">
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
                                                    <button title="Visualizar / Editar" className="hover:text-slate-900 transition-colors" onClick={e => { e.stopPropagation(); openMedicaoModal(item); }}>
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button title="Contestar" className="hover:text-orange-600 transition-colors" onClick={e => { e.stopPropagation(); openMedicao(item); }}>
                                                        <ThumbsDown className="w-4 h-4" />
                                                    </button>
                                                    <button title="Aprovar" className="hover:text-emerald-600 transition-colors" onClick={e => { e.stopPropagation(); openMedicao(item); }}>
                                                        <ThumbsUp className="w-4 h-4" />
                                                    </button>
                                                </>)}

                                                {activeTab === 'finalizadas' && (<>
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
                                            <Td className="font-black text-slate-700">{item.codigo}</Td>
                                            <Td className="text-center font-bold text-slate-500">
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
                            {!['CANCELADA'].includes(selectedMedicao.status) && (
                                <div className="flex gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                                    {(selectedMedicao.status === 'EM_ABERTO' || selectedMedicao.status === 'EM_CONFERENCIA') && (
                                        <button onClick={() => handleMedicaoAction(selectedMedicao.id, 'EM_CONFERENCIA')} title="Enviar para Conferência" className="flex-1 bg-fuchsia-500 text-white h-9 rounded-lg flex items-center justify-center gap-1.5 hover:bg-fuchsia-600 text-[10px] font-black uppercase"><Send className="w-3.5 h-3.5" /> Conferência</button>
                                    )}
                                    {selectedMedicao.status === 'EM_CONFERENCIA' && (
                                        <button onClick={() => handleMedicaoAction(selectedMedicao.id, 'ENVIAR_CLIENTE')} title="Enviar p/ Cliente" className="flex-1 bg-blue-600 text-white h-9 rounded-lg flex items-center justify-center gap-1.5 hover:bg-blue-700 text-[10px] font-black uppercase"><Mail className="w-3.5 h-3.5" /> Enviar</button>
                                    )}
                                    {selectedMedicao.status === 'AGUARDANDO_APROVACAO' && (<>
                                        <button onClick={() => handleMedicaoAction(selectedMedicao.id, 'APROVADA')} title="Aprovar" className="flex-1 bg-emerald-600 text-white h-9 rounded-lg flex items-center justify-center gap-1.5 hover:bg-emerald-700 text-[10px] font-black uppercase"><ThumbsUp className="w-3.5 h-3.5" /> Aprovar</button>
                                        <button onClick={() => handleMedicaoAction(selectedMedicao.id, 'REPROVADA')} title="Reprovar" className="flex-1 bg-red-500 text-white h-9 rounded-lg flex items-center justify-center gap-1.5 hover:bg-red-600 text-[10px] font-black uppercase"><ThumbsDown className="w-3.5 h-3.5" /> Reprovar</button>
                                    </>)}
                                    <button onClick={() => handleMedicaoAction(selectedMedicao.id, 'CONTESTADA')} title="Contestar/Congelar" className="flex-1 bg-orange-500 text-white h-9 rounded-lg flex items-center justify-center gap-1.5 hover:bg-orange-600 text-[10px] font-black uppercase"><Snowflake className="w-3.5 h-3.5" /> Congelar</button>
                                    <button onClick={() => handleMedicaoAction(selectedMedicao.id, 'CANCELADA')} title="Cancelar" className="flex-1 bg-red-600 text-white h-9 rounded-lg flex items-center justify-center gap-1.5 hover:bg-red-700 text-[10px] font-black uppercase"><Ban className="w-3.5 h-3.5" /> Cancelar</button>
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
        </div>
    );
}
