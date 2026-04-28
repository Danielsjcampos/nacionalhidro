import { useToast } from '../contexts/ToastContext';
import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import ModalNovaMedicao from '../components/ModalNovaMedicao';
import ModalEdicaoMedicao from '../components/ModalEdicaoMedicao';
import {
    FileText, Plus, Search, Loader2, X, CheckCircle2, Clock,
    DollarSign, Send, Ban, List, Columns, Printer, Pencil,
    ChevronRight, Mail, RefreshCw, AlertTriangle, Eye, ThumbsUp, ThumbsDown,
    Calculator, Save, Zap, Trash2, Package, ArrowLeftCircle, History, Snowflake
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

// ─── STATUS BADGE ───────────────────────────────────────────────
const StatusBadge = ({ status, dataCobranca }: { status: string; dataCobranca?: any }) => {
    const isAtrasado = dataCobranca && daysSince(dataCobranca) > DIAS_VENCIMENTO && 
        !['APROVADA', 'FINALIZADA', 'CANCELADA'].includes(status);
    
    const label = STATUS_LABEL[status] || status;
    const baseColor = STATUS_COLOR[status] || 'bg-slate-400';
    
    return (
        <div className="flex flex-col items-center gap-1">
            <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black text-white uppercase shadow-sm ${isAtrasado ? 'bg-red-500 animate-pulse' : baseColor}`}>
                {isAtrasado ? 'ATRASADO' : label}
            </span>
            {isAtrasado && <span className="text-[7px] font-black text-red-500 uppercase">Verificar!</span>}
        </div>
    );
};

export default function Medicoes() {
    const { showToast } = useToast();

    // ─── SETTINGS ───
    const [activeTab, setActiveTab] = useState<ActiveTab>('precificacao');
    const [loading, setLoading] = useState(true);

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
    const [showItemForm, setShowItemForm] = useState(false);
    const [itemForm, setItemForm] = useState({ 
        descricao: '', 
        quantidade: '1', 
        valorUnitario: '', 
        percentualAdicional: '',
        centroCustoId: '',
        tipoCobranca: 'HORA', // OU 'SERVICO_FECHADO', 'TONELADA', 'VIAGEM', 'M3'
        areaServico: '',
        horaInicio: '',
        horaFim: ''
    });
    const [showAutoCalc, setShowAutoCalc] = useState(false);
    const [autoCalcForm, setAutoCalcForm] = useState({ 
        valorDiaria: '', 
        valorHora: '', 
        toleranciaHoras: '',
        entradaData: '',
        entradaHora: '',
        saidaData: '',
        saidaHora: '',
        almoco: '00:00',
        franquia: '08:00',
        valorHoraExtra: '',
        aplicarMinimoHE: true
    });
    const [calculo, setCalculo] = useState<any>(null);

    const [submitting, setSubmitting] = useState(false);
    const [centrosCusto, setCentrosCusto] = useState<any[]>([]);

    // ─── FETCH LOGIC ───
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = { search, dataInicio, dataFim };

            const resPricing = await api.get('/precificacao', { params });
            setOsPricing(resPricing.data.kanban.EM_ABERTO || []);

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
    const openPricing = async (os: any) => {
        try {
            const pricingRes = await api.get(`/precificacao/${os.id}`);
            setSelectedOS(pricingRes.data);
            setSelectedMedicao(null);
            setCalculo(null);
        } catch {}
    };

    const handleAddItem = async () => {
        if (!selectedOS) return;
        try {
            await api.post(`/precificacao/${selectedOS.id}/itens`, itemForm);
            setItemForm({ 
                descricao: '', quantidade: '1', valorUnitario: '', percentualAdicional: '', 
                centroCustoId: '', tipoCobranca: 'HORA', areaServico: '', horaInicio: '', horaFim: '' 
            });
            setShowItemForm(false);
            openPricing(selectedOS);
            fetchData();
            showToast('Item adicionado');
        } catch (err: any) {
            showToast(err.response?.data?.error || 'Erro ao adicionar item', 'error');
        }
    };

    const handleCorrigir = async (osId: string) => {
        const obs = window.prompt("Justificativa para retornar à Logística:");
        if (obs === null) return;
        try {
            await api.post(`/precificacao/${osId}/corrigir`, { observacoes: obs });
            addToast('OS retornada para a Logística com sucesso.', 'success');
            fetchData();
            setSelectedOS(null);
        } catch (err) {
            addToast('Erro ao retornar OS.', 'error');
        }
    };

    const handleCorrigirMedicao = async (medicaoId: string) => {
        if (!window.confirm("Tem certeza que deseja voltar a Medição para correção?")) return;
        try {
            await api.post(`/medicoes/${medicaoId}/status`, { status: 'AGUARDANDO_APROVACAO' });
            addToast('Medição retornada para correção com sucesso.', 'success');
            fetchData();
        } catch (err) {
            addToast('Erro ao retornar medição.', 'error');
        }
    };

    const handlePrecificar = async () => {


        if (!selectedOS) return;
        try {
            await api.post(`/precificacao/${selectedOS.id}/precificar`);
            setSelectedOS(null);
            fetchData();
            showToast('OS precificada com sucesso!');
        } catch (err: any) {
            showToast(err.response?.data?.error || 'Erro ao finalizar precificação', 'error');
        }
    };

    const handleAutoCalcular = async () => {
        if (!selectedOS) return;
        try {
            const autoCalcRes = await api.post(`/precificacao/${selectedOS.id}/auto-calcular`, {
                valorDiaria: autoCalcForm.valorDiaria ? parseFloat(autoCalcForm.valorDiaria) : null,
                valorHora: autoCalcForm.valorHora ? parseFloat(autoCalcForm.valorHora) : null,
                toleranciaHoras: autoCalcForm.toleranciaHoras ? parseFloat(autoCalcForm.toleranciaHoras) : null,
                entrada: autoCalcForm.entradaData && autoCalcForm.entradaHora ? `${autoCalcForm.entradaData}T${autoCalcForm.entradaHora}` : null,
                saida: autoCalcForm.saidaData && autoCalcForm.saidaHora ? `${autoCalcForm.saidaData}T${autoCalcForm.saidaHora}` : null,
                almoco: autoCalcForm.almoco,
                franquia: autoCalcForm.franquia,
                valorHoraExtra: autoCalcForm.valorHoraExtra ? parseFloat(autoCalcForm.valorHoraExtra) : null,
                aplicarMinimoHE: autoCalcForm.aplicarMinimoHE
            });
            setSelectedOS(autoCalcRes.data.os);
            setCalculo(autoCalcRes.data.calculo);
            showToast('Cálculo realizado com sucesso!');
            setShowAutoCalc(false);
        } catch (err: any) { showToast(err.response?.data?.error || 'Erro no cálculo'); }
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
            await api.post(`/medicoes/${id}/recalcular`, {
                valorDiaria: autoCalcForm.valorDiaria ? parseFloat(autoCalcForm.valorDiaria) : null,
                valorHora: autoCalcForm.valorHora ? parseFloat(autoCalcForm.valorHora) : null,
                toleranciaHoras: autoCalcForm.toleranciaHoras ? parseFloat(autoCalcForm.toleranciaHoras) : null,
                aplicarMinimoHE: autoCalcForm.aplicarMinimoHE
            });
            showToast('Medição recalculada com sucesso!');
            openMedicao({ id });
            fetchData();
        } catch (err: any) {
            showToast(err.response?.data?.error || 'Erro ao recalcular medição', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEnviarDocumentacao = async (id: string) => {
        if (!window.confirm('Deseja enviar a documentação final (Medição + Nota Fiscal) para o cliente agora?')) return;
        setSubmitting(true);
        try {
            await api.post(`/medicoes/${id}/enviar-documentacao`);
            showToast('Documentação enviada com sucesso!');
        } catch (err: any) {
            showToast(err.response?.data?.error || 'Falha ao enviar documentação. Verifique se a nota fiscal já foi autorizada.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCorrigir = async (m: any) => {
        if (!window.confirm('Tem certeza que deseja voltar a Medição para correção?')) return;
        try {
            await api.patch(`/medicoes/${m.id}/status`, { status: 'AGUARDANDO_APROVACAO', valorAprovado: null });
            fetchData();
        } catch (err: any) { showToast(err.response?.data?.error || 'Erro'); }
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

    const list = getFilteredList();

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

            {/* ── HEADER ── */}
            <div className="bg-[#1e3a5f] rounded-xl p-6 text-white shadow-lg flex flex-col gap-6 relative overflow-hidden">
                <div className="flex items-center justify-between z-10">
                    <h1 className="text-xl font-black uppercase tracking-tighter">Medição</h1>
                    <div className="flex bg-white/10 p-1 rounded-full border border-white/20">
                        <button className="px-3 py-1 text-[10px] font-black uppercase rounded-full bg-blue-600">BR</button>
                    </div>
                </div>

                {/* Tab Progress Bar */}
                <div className="relative flex justify-between items-center px-10 z-10">
                    <div className="absolute left-10 right-10 h-0.5 bg-white/20 top-1/2 -translate-y-1/2"></div>
                    
                    {[
                        { id: 'precificacao', label: 'Precificação (OS Pendentes)', color: 'bg-orange-500', count: stats.precificacao },
                        { id: 'medicao',      label: 'Medição (Em Aberto/Fila)', color: 'bg-yellow-400', count: stats.medicao },
                        { id: 'finalizadas',  label: 'Histórico (Finalizadas)',  color: 'bg-green-500',  count: stats.finalizadas },
                        { id: 'cancelados',   label: 'Canceladas',             color: 'bg-red-600',    count: stats.cancelados },
                    ].map(step => (
                        <button 
                            key={step.id} 
                            onClick={() => { setActiveTab(step.id as ActiveTab); setStatusFilter(''); }}
                            className="flex flex-col items-center gap-3 relative group"
                        >
                            <div className="flex items-center gap-1.5 z-10 transition-transform group-hover:scale-110">
                                <div className={`w-5 h-5 rounded-full ${step.color} border-4 border-[#1e3a5f] shadow-lg ${activeTab === step.id ? 'ring-4 ring-white/30' : ''}`}></div>
                                <span className="text-[10px] font-black bg-white/10 px-2 py-0.5 rounded-full">{step.count}</span>
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === step.id ? 'text-white border-b-2 border-white pb-1' : 'text-white/40 hover:text-white'}`}>
                                {step.label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── FILTERS + LEGENDS ── */}
            <div className="flex items-end justify-between gap-4 flex-wrap">
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
                    {/* Legends */}
                    {activeTab === 'medicao' && (
                        <div className="flex gap-3 text-[10px] font-bold text-slate-500">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400"></span>Em aberto</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-fuchsia-400"></span>Em conferência</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>Validado</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span>Aguardando cliente</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400"></span>Aprovado parcial</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span>Atrasado</span>
                        </div>
                    )}
                    {activeTab === 'finalizadas' && (
                        <div className="flex gap-3 text-[10px] font-bold text-slate-500">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>Aprovada no Prazo</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400"></span>Aprovada com Atraso</span>
                        </div>
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
                <div className={`${(selectedOS || selectedMedicao) ? 'w-1/2' : 'w-full'} bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col transition-all`}>
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
                                            (selectedOS?.id === item.id || selectedMedicao?.id === item.id) ? 'bg-blue-50/50' : ''
                                        }`}
                                    >
                                        {/* ─── ACTIONS COLUMN ─── */}
                                        <Td className="sticky left-0 bg-white z-10 border-r border-slate-100">
                                            <div className="flex gap-2 text-slate-400 group-hover:text-slate-600 transition-colors">
                                                {activeTab === 'precificacao' && (<>
                                                    <button title="Precificar" className="hover:text-orange-600 transition-colors"><Calculator className="w-3.5 h-3.5" /></button>
                                                    <button 
                                                        title="Voltar para Logística" 
                                                        className="hover:text-red-600 transition-colors"
                                                        onClick={e => { e.stopPropagation(); handleCorrigir(item.id); }}
                                                    >
                                                        <ArrowLeftCircle className="w-3.5 h-3.5" />
                                                    </button>
                                                </>)}
                                                {activeTab === 'medicao' && (<>
                                                    <button title="Visualizar PDF" className="hover:text-slate-900 transition-colors" onClick={e => { e.stopPropagation(); handleVerPDF(item); }}>
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    {(item.status === 'EM_ABERTO' || item.status === 'EM_CONFERENCIA') && (
                                                        <button title="Editar" className="hover:text-blue-600 transition-colors" onClick={e => { e.stopPropagation(); openMedicaoModal(item); }}>
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </>)}

                                                {activeTab === 'finalizadas' && (<>
                                                    <button 
                                                        title="Corrigir Medição" 
                                                        className="hover:text-red-600 transition-colors"
                                                        onClick={e => { e.stopPropagation(); handleCorrigirMedicao(item.id); }}
                                                    >
                                                        <ArrowLeftCircle className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button title="Visualizar PDF" className="hover:text-slate-900 transition-colors" onClick={e => { e.stopPropagation(); downloadPdf(item); }}>
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button title="Histórico" className="hover:text-blue-600 transition-colors" onClick={e => { e.stopPropagation(); openMedicao(item); }}>
                                                        <History className="w-4 h-4" />
                                                    </button>
                                                </>)}

                                            </div>
                                        </Td>

                                        {/* ─── STATUS COLUMN ─── */}
                                        <Td className="text-center">
                                            {activeTab === 'precificacao' ? (
                                                <span className="bg-orange-100 text-orange-600 text-[9px] px-2 py-0.5 rounded-full font-black uppercase">PENDENTE</span>
                                            ) : activeTab === 'finalizadas' ? (
                                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${
                                                    diffDays(item.dataCobranca, item.aprovadaEm) <= DIAS_VENCIMENTO 
                                                        ? 'bg-emerald-100 text-emerald-600' : 'bg-yellow-100 text-yellow-600'
                                                }`}>{diffDays(item.dataCobranca, item.aprovadaEm) <= DIAS_VENCIMENTO ? 'NO PRAZO' : 'ATRASADO'}</span>
                                            ) : (
                                                <StatusBadge status={item.status} dataCobranca={item.dataCobranca} />
                                            )}
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
                    <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400">{list.length} registro(s)</span>
                        <span className="text-[10px] font-bold text-slate-300">Página 1 de 1</span>
                    </div>
                </div>

                {/* ── SIDE PANEL: PRECIFICAÇÃO DETALHADA ── */}
                {selectedOS && (
                    <div className="w-1/2 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="bg-[#1e3a5f] p-4 text-white flex items-center justify-between">
                            <div className="flex flex-col">
                                <h2 className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                                    <Calculator className="w-4 h-4 text-orange-400" />
                                    Precificar OS: {selectedOS.codigo}
                                </h2>
                                <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest mt-0.5">{selectedOS.cliente?.nome}</p>
                            </div>
                            <button onClick={() => setSelectedOS(null)} className="hover:bg-white/10 p-1.5 rounded-lg"><X className="w-4 h-4" /></button>
                        </div>

                        <div className="p-4 overflow-y-auto flex-1 bg-slate-50/50 custom-scrollbar space-y-6">
                            
                            {/* CALCULATOR SECTION */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Clock className="w-3.5 h-3.5 text-blue-500" /> Registro de Horas
                                </h3>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase">Entrada</label>
                                        <div className="flex gap-1.5">
                                            <input type="date" value={autoCalcForm.entradaData} onChange={e => setAutoCalcForm({...autoCalcForm, entradaData: e.target.value})} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold" />
                                            <input type="time" value={autoCalcForm.entradaHora} onChange={e => setAutoCalcForm({...autoCalcForm, entradaHora: e.target.value})} className="w-20 bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase">Saída</label>
                                        <div className="flex gap-1.5">
                                            <input type="date" value={autoCalcForm.saidaData} onChange={e => setAutoCalcForm({...autoCalcForm, saidaData: e.target.value})} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold" />
                                            <input type="time" value={autoCalcForm.saidaHora} onChange={e => setAutoCalcForm({...autoCalcForm, saidaHora: e.target.value})} className="w-20 bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase">Almoço</label>
                                        <input type="time" value={autoCalcForm.almoco} onChange={e => setAutoCalcForm({...autoCalcForm, almoco: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase">Franquia</label>
                                        <input type="time" value={autoCalcForm.franquia} onChange={e => setAutoCalcForm({...autoCalcForm, franquia: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold" />
                                    </div>
                                    <div className="col-span-2 space-y-1 pt-2">
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="checkbox" 
                                                id="minHe"
                                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                checked={autoCalcForm.aplicarMinimoHE}
                                                onChange={e => setAutoCalcForm({ ...autoCalcForm, aplicarMinimoHE: e.target.checked })}
                                            />
                                            <label htmlFor="minHe" className="text-[9px] font-black text-slate-500 uppercase cursor-pointer">
                                                Mínimo de 2h de Hora Extra (Regra Legado)
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    onClick={handleAutoCalcular}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white h-10 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <Zap className="w-3.5 h-3.5" /> Calcular Automático
                                </button>
                            </div>

                            {/* ITEMS SECTION */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <List className="w-3.5 h-3.5 text-emerald-500" /> Itens de Cobrança
                                    </h3>
                                    <button onClick={() => setShowItemForm(!showItemForm)} className="text-[9px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full hover:bg-blue-100 transition-all flex items-center gap-1.5"><Plus className="w-3 h-3" /> {showItemForm ? 'FECHAR' : 'NOVO'}</button>
                                </div>

                                {showItemForm && (
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="col-span-2 space-y-1">
                                                <label className="text-[8px] font-black text-slate-400 uppercase">Descrição</label>
                                                <input value={itemForm.descricao} onChange={e => setItemForm({...itemForm, descricao: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[8px] font-black text-slate-400 uppercase">Quantidade</label>
                                                <input type="number" step="0.01" value={itemForm.quantidade} onChange={e => setItemForm({...itemForm, quantidade: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[8px] font-black text-slate-400 uppercase">Valor</label>
                                                <input type="number" step="0.01" value={itemForm.valorUnitario} onChange={e => setItemForm({...itemForm, valorUnitario: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold" />
                                            </div>
                                        </div>
                                        <button onClick={handleAddItem} className="bg-slate-800 text-white w-full h-9 rounded-lg text-[10px] font-black uppercase">Adicionar Item</button>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    {selectedOS.itensCobranca?.map((it: any) => (
                                        <div key={it.id} className="flex items-center justify-between p-3 bg-slate-50/50 border border-slate-100 rounded-xl group hover:border-blue-200 transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-blue-600 border border-slate-200 font-black text-[10px]">{it.quantidade}x</div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-700 text-xs uppercase leading-tight">{it.descricao}</span>
                                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{fmt(it.valorUnitario)}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-black text-emerald-600 text-xs">{fmt(it.valorTotal)}</span>
                                                <button className="text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </div>
                                    ))}
                                    {!selectedOS.itensCobranca?.length && (
                                        <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-2xl text-slate-300 text-[10px] font-bold italic">Nenhum item lançado</div>
                                    )}
                                </div>
                            </div>

                            {/* SUMMARY & SUBMIT */}
                            <div className="bg-[#1e3a5f] p-6 rounded-3xl text-white space-y-6 shadow-xl shadow-blue-900/20">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Valor Total Precificado</p>
                                        <h3 className="text-2xl font-black">{fmt(selectedOS.valorPrecificado)}</h3>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Horas</p>
                                        <p className="text-sm font-black">{selectedOS.horasTotais || '0.00'}h (+{selectedOS.horasExtras || '0.00'} HE)</p>
                                    </div>
                                </div>

                                <button 
                                    onClick={handlePrecificar}
                                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white h-12 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-500/30 transition-all"
                                >
                                    Finalizar & Baixar OS
                                </button>
                            </div>
                        </div>
                    </div>
                )}

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
                                            <div className="pt-2 flex justify-end">
                                                <button 
                                                    onClick={() => { setSelectedOS(os); setSelectedMedicao(null); }}
                                                    className="text-[9px] font-black text-blue-600 uppercase hover:underline"
                                                >
                                                    Editar Itens da OS
                                                </button>
                                            </div>
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
                medicaoId={editMedicaoId}
                onClose={() => setEditMedicaoId(null)}
                onSuccess={() => { fetchData(); if (selectedMedicao) openMedicao(selectedMedicao); }}
            />
        </div>
    );
}
