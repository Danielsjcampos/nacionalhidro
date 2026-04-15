import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
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
    id: crypto.randomUUID(), 
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
const StatusBullet = ({ status, dataCobranca }: { status: string; dataCobranca?: any }) => {
    const isAtrasado = dataCobranca && daysSince(dataCobranca) > DIAS_VENCIMENTO && 
        !['APROVADA', 'FINALIZADA', 'CANCELADA'].includes(status);
    const color = isAtrasado ? 'bg-red-500' : (STATUS_COLOR[status] || 'bg-slate-300');
    return <div className={`w-2.5 h-2.5 rounded-full mx-auto ${color}`}></div>;
};

export default function Medicoes() {
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
    const [showItemForm, setShowItemForm] = useState(false);
    const [itemForm, setItemForm] = useState({ descricao: '', quantidade: '', valorUnitario: '', percentualAdicional: '' });
    const [showAutoCalc, setShowAutoCalc] = useState(false);
    const [autoCalcForm, setAutoCalcForm] = useState({ valorDiaria: '', valorHora: '', toleranciaHoras: '' });
    const [calculo, setCalculo] = useState<any>(null);

    // Medição creation
    const [clientes, setClientes] = useState<any[]>([]);
    const [vendedores, setVendedores] = useState<any[]>([]);
    const [selectedClienteId, setSelectedClienteId] = useState('');
    const [osProntas, setOsProntas] = useState<any[]>([]);
    const [selectedOsIds, setSelectedOsIds] = useState<string[]>([]);
    const [periodo, setPeriodo] = useState('');
    const [solicitante, setSolicitante] = useState('');
    const [vendedorId, setVendedorId] = useState('');
    const [subitens, setSubitens] = useState<any[]>([]);
    const [tipoDocumento, setTipoDocumento] = useState<'RL' | 'ND'>('RL');
    const [centrosCusto, setCentrosCusto] = useState<any[]>([]);
    const [submitting, setSubmitting] = useState(false);

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
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [search, dataInicio, dataFim]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ─── OS PRICING ACTIONS ───
    const openPricing = async (os: any) => {
        try {
            const res = await api.get(`/precificacao/${os.id}`);
            setSelectedOS(res.data);
            setSelectedMedicao(null);
            setCalculo(null);
        } catch {}
    };

    const handleAddItem = async () => {
        if (!selectedOS) return;
        try {
            await api.post(`/precificacao/${selectedOS.id}/itens`, {
                descricao: itemForm.descricao,
                quantidade: parseFloat(itemForm.quantidade),
                valorUnitario: parseFloat(itemForm.valorUnitario),
                percentualAdicional: itemForm.percentualAdicional ? parseFloat(itemForm.percentualAdicional) : null
            });
            setItemForm({ descricao: '', quantidade: '', valorUnitario: '', percentualAdicional: '' });
            setShowItemForm(false);
            openPricing(selectedOS);
            fetchData();
        } catch {}
    };

    const handlePrecificar = async () => {
        if (!selectedOS) return;
        try {
            await api.post(`/precificacao/${selectedOS.id}/precificar`);
            setSelectedOS(null);
            fetchData();
            alert('OS precificada com sucesso!');
        } catch {}
    };

    const handleAutoCalcular = async () => {
        if (!selectedOS) return;
        try {
            const res = await api.post(`/precificacao/${selectedOS.id}/auto-calcular`, {
                valorDiaria: autoCalcForm.valorDiaria ? parseFloat(autoCalcForm.valorDiaria) : null,
                valorHora: autoCalcForm.valorHora ? parseFloat(autoCalcForm.valorHora) : null,
                toleranciaHoras: autoCalcForm.toleranciaHoras ? parseFloat(autoCalcForm.toleranciaHoras) : null,
            });
            setSelectedOS(res.data.os);
            setCalculo(res.data.calculo);
            setShowAutoCalc(false);
        } catch (err: any) { alert(err.response?.data?.error || 'Erro no cálculo'); }
    };

    // ─── MEDICAO ACTIONS ───
    const openMedicao = async (m: any) => {
        try {
            const res = await api.get(`/medicoes/${m.id}`);
            setSelectedMedicao(res.data);
            setSelectedOS(null);
        } catch {}
    };

    const downloadPdf = async (m: any) => {
        try {
            const res = await api.post(`/medicoes/${m.id}/pdf`, {}, { responseType: 'blob' });
            const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const a = document.createElement('a'); a.href = url; a.download = `Medicao_${m.codigo}.pdf`; a.click();
            URL.revokeObjectURL(url);
        } catch { alert('Erro ao gerar PDF'); }
    };

    const handleMedicaoAction = async (id: string, next: string, extra: any = {}) => {
        if (next === 'ENVIAR_CLIENTE') {
            try {
                await api.post(`/medicoes/${id}/enviar`);
                alert('Medição enviada ao cliente!');
                fetchData(); openMedicao({ id });
            } catch (err: any) { alert(err.response?.data?.error || 'Erro ao enviar'); }
            return;
        }

        if (next === 'CONTESTADA') {
            const motivo = prompt('Por favor, informe o motivo da contestação:');
            if (motivo === null) return;
            if (!motivo.trim()) { alert('O motivo da contestação é obrigatório.'); return; }
            extra.motivoContestacao = motivo;
        }

        if (next === 'CANCELADA') {
            const motivo = prompt('Motivo do cancelamento:');
            if (motivo === null) return;
            if (!motivo.trim()) { alert('O motivo é obrigatório.'); return; }
            extra.justificativaCancelamento = motivo;
        }

        if (next === 'REPROVADA') {
            const motivo = prompt('Motivo da reprovação (será criada uma nova revisão):');
            if (motivo === null) return;
            extra.motivoContestacao = motivo;
        }

        try {
            await api.patch(`/medicoes/${id}/status`, { status: next, ...extra });
            fetchData();
            if (next !== 'CANCELADA') openMedicao({ id });
            else setSelectedMedicao(null);
        } catch (err: any) { alert(err.response?.data?.error || 'Erro'); }
    };

    const handleCorrigir = async (m: any) => {
        if (!confirm('Tem certeza que deseja voltar a Medição para correção?')) return;
        try {
            await api.patch(`/medicoes/${m.id}/status`, { status: 'AGUARDANDO_APROVACAO', valorAprovado: null });
            fetchData();
        } catch (err: any) { alert(err.response?.data?.error || 'Erro'); }
    };

    // ─── CREATE MEDIÇÃO ───
    const openCreateMedicao = async () => {
        const [cRes, uRes, ccRes] = await Promise.all([
            api.get('/clientes'), 
            api.get('/usuarios'),
            api.get('/centro-custo')
        ]);
        setClientes(cRes.data);
        setVendedores(uRes.data);
        setCentrosCusto(ccRes.data || []);
        setShowCreate(true);
        setSelectedClienteId(''); setSelectedOsIds([]); setPeriodo('');
        setSubitens([]);
        setTipoDocumento('RL');
    };

    const fetchOSProntas = async (cId: string) => {
        setSelectedClienteId(cId);
        if (!cId) { setOsProntas([]); return; }
        const res = await api.get('/medicoes/os-disponiveis', { params: { clienteId: cId } });
        setOsProntas(res.data);
    };

    const handleCreateMedicao = async () => {
        setSubmitting(true);
        try {
            await api.post('/medicoes', {
                clienteId: selectedClienteId,
                osIds: selectedOsIds,
                periodo, solicitante, vendedorId, subitens,
                tipoDocumento
            });
            setShowCreate(false);
            fetchData();
            setActiveTab('medicao');
        } catch (err: any) { alert(err.response?.data?.error || 'Erro'); }
        finally { setSubmitting(false); }
    };

    // ─── RENDER HELPERS ───
    const getFilteredList = () => {
        let items: any[] = [];
        if (activeTab === 'precificacao') items = osPricing;
        else if (activeTab === 'medicao') items = medicoesList.filter(m => !['FINALIZADA', 'APROVADA', 'CANCELADA'].includes(m.status));
        else if (activeTab === 'finalizadas') items = medicoesList.filter(m => ['FINALIZADA', 'APROVADA'].includes(m.status));
        else if (activeTab === 'cancelados') items = medicoesList.filter(m => m.status === 'CANCELADA');

        // Apply status filter
        if (statusFilter && activeTab === 'medicao') {
            if (statusFilter === 'ATRASADO') {
                items = items.filter(m => m.dataCobranca && daysSince(m.dataCobranca) > DIAS_VENCIMENTO);
            } else {
                items = items.filter(m => m.status === statusFilter);
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
                        { id: 'precificacao', label: 'Status da Precificação', color: 'bg-orange-500', count: stats.precificacao },
                        { id: 'medicao',      label: 'Status da Medição',      color: 'bg-yellow-400', count: stats.medicao },
                        { id: 'finalizadas',  label: 'Medições Finalizadas',   color: 'bg-green-500',  count: stats.finalizadas },
                        { id: 'cancelados',   label: 'Cancelados',             color: 'bg-red-600',    count: stats.cancelados },
                    ].map(step => (
                        <button 
                            key={step.id} 
                            onClick={() => { setActiveTab(step.id as ActiveTab); setStatusFilter(''); }}
                            className="flex flex-col items-center gap-3 relative group"
                        >
                            <div className="flex items-center gap-1.5 z-10">
                                <div className={`w-4 h-4 rounded-full ${step.color} border-4 border-[#1e3a5f] shadow-lg transition-transform group-hover:scale-125 ${activeTab === step.id ? 'ring-4 ring-white/20' : ''}`}></div>
                                <span className="text-[9px] font-black bg-white/10 px-1.5 py-0.5 rounded-full">{step.count}</span>
                            </div>
                            <span className={`text-[10px] font-bold uppercase transition-colors ${activeTab === step.id ? 'text-white border-b-2 border-white' : 'text-white/60 hover:text-white'}`}>
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
                                        <Th className="text-center">CÓD. CLIENTE</Th>
                                        <Th>CLIENTE</Th>
                                        <Th>CONTATO</Th>
                                        <Th>DATA OS</Th>
                                        <Th>DATA BAIXA OS</Th>
                                        <Th>PERÍODO MEDIÇÃO</Th>
                                        <Th className="text-right">VALOR PRECIF.</Th>
                                    </>)}

                                    {/* ─── ABA 2: STATUS MEDIÇÃO ─── */}
                                    {activeTab === 'medicao' && (<>
                                        <Th>Nº MEDIÇÃO</Th>
                                        <Th className="text-center">REVISÃO</Th>
                                        <Th>DATA CRIAÇÃO</Th>
                                        <Th>EMPRESA</Th>
                                        <Th className="text-center">CÓD. CLIENTE</Th>
                                        <Th>CLIENTE</Th>
                                        <Th>CONTATO</Th>
                                        <Th className="text-right">VALOR TOTAL</Th>
                                        <Th>VENDEDOR RESP</Th>
                                        <Th>APROVAÇÃO INTERNA</Th>
                                        <Th>COBRANÇA ENVIADA</Th>
                                        <Th className="text-center">DIAS DESDE COBRANÇA</Th>
                                    </>)}

                                    {/* ─── ABA 3: FINALIZADAS ─── */}
                                    {activeTab === 'finalizadas' && (<>
                                        <Th>Nº MEDIÇÃO</Th>
                                        <Th className="text-center">REVISÃO</Th>
                                        <Th>DATA CRIAÇÃO</Th>
                                        <Th>EMPRESA</Th>
                                        <Th className="text-center">CÓD. CLIENTE</Th>
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
                                        <Th className="text-center">CÓD. CLIENTE</Th>
                                        <Th>CLIENTE</Th>
                                        <Th>CONTATO</Th>
                                        <Th className="text-right">VALOR TOTAL</Th>
                                        <Th>VENDEDOR RESP</Th>
                                        <Th>APROVAÇÃO INTERNA</Th>
                                        <Th>COBRANÇA ENVIADA</Th>
                                        <Th>DATA CANCELAMENTO</Th>
                                        <Th>MOTIVO CANCELAMENTO</Th>
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
                                        className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors ${
                                            (selectedOS?.id === item.id || selectedMedicao?.id === item.id) ? 'bg-blue-50/50' : ''
                                        }`}
                                    >
                                        {/* ─── ACTIONS COLUMN ─── */}
                                        <Td className="sticky left-0 bg-white z-10 border-r border-slate-100">
                                            <div className="flex gap-1.5 text-slate-500">
                                                {activeTab === 'precificacao' && (
                                                    <button title="Precificar" className="hover:text-blue-600 transition-colors"><ChevronRight className="w-4 h-4" /></button>
                                                )}
                                                {activeTab === 'medicao' && (<>
                                                    {item.status !== 'APROVADA_PARCIAL' && (
                                                        <button title="Cancelar" className="hover:text-red-500 transition-colors" onClick={e => { e.stopPropagation(); handleMedicaoAction(item.id, 'CANCELADA'); }}>
                                                            <Ban className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    <button title="Visualizar PDF" className="hover:text-slate-900 transition-colors" onClick={e => { e.stopPropagation(); downloadPdf(item); }}>
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                    {(item.status === 'EM_ABERTO' || item.status === 'EM_CONFERENCIA') && (
                                                        <button title="Editar" className="hover:text-blue-600 transition-colors" onClick={e => { e.stopPropagation(); openMedicao(item); }}>
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    {item.status === 'AGUARDANDO_APROVACAO' && (<>
                                                        <button title="Reprovar" className="hover:text-red-500 transition-colors" onClick={e => { e.stopPropagation(); handleMedicaoAction(item.id, 'REPROVADA'); }}>
                                                            <ThumbsDown className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button title="Aprovar" className="hover:text-emerald-600 transition-colors" onClick={e => { e.stopPropagation(); handleMedicaoAction(item.id, 'APROVADA'); }}>
                                                            <ThumbsUp className="w-3.5 h-3.5" />
                                                        </button>
                                                    </>)}
                                                    {item.status === 'EM_CONFERENCIA' && (
                                                        <button title="Enviar p/ Cliente" className="hover:text-blue-600 transition-colors" onClick={e => { e.stopPropagation(); handleMedicaoAction(item.id, 'ENVIAR_CLIENTE'); }}>
                                                            <Send className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </>)}
                                                {activeTab === 'finalizadas' && (<>
                                                    <button title="Voltar p/ correção" className="hover:text-orange-600 transition-colors" onClick={e => { e.stopPropagation(); handleCorrigir(item); }}>
                                                        <ArrowLeftCircle className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button title="Visualizar PDF" className="hover:text-slate-900 transition-colors" onClick={e => { e.stopPropagation(); downloadPdf(item); }}>
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button title="Histórico" className="hover:text-blue-600 transition-colors" onClick={e => { e.stopPropagation(); openMedicao(item); }}>
                                                        <History className="w-3.5 h-3.5" />
                                                    </button>
                                                </>)}
                                                {activeTab === 'cancelados' && (
                                                    <button title="Visualizar" className="hover:text-blue-600 transition-colors" onClick={e => { e.stopPropagation(); openMedicao(item); }}>
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </Td>

                                        {/* ─── STATUS COLUMN ─── */}
                                        <Td className="text-center">
                                            {activeTab === 'precificacao' ? (
                                                <div className="w-2.5 h-2.5 rounded-full bg-orange-500 mx-auto"></div>
                                            ) : activeTab === 'finalizadas' ? (
                                                <div className={`w-2.5 h-2.5 rounded-full mx-auto ${
                                                    diffDays(item.dataCobranca, item.aprovadaEm) <= DIAS_VENCIMENTO 
                                                        ? 'bg-emerald-500' : 'bg-yellow-400'
                                                }`}></div>
                                            ) : (
                                                <StatusBullet status={item.status} dataCobranca={item.dataCobranca} />
                                            )}
                                        </Td>

                                        {/* ─── DATA COLUMNS PER TAB ─── */}
                                        {activeTab === 'precificacao' && (<>
                                            <Td className="font-black text-slate-700">{item.codigo}</Td>
                                            <Td className="text-center font-bold text-slate-500">{daysSince(item.dataBaixa || item.createdAt)}</Td>
                                            <Td className="text-slate-500 font-bold truncate max-w-[120px] uppercase">{item.empresa || 'NACIONAL HIDRO'}</Td>
                                            <Td className="text-center font-bold text-slate-500">{item.cliente?.codigo || '-'}</Td>
                                            <Td className="font-black text-slate-700 truncate max-w-[150px] uppercase">{item.cliente?.nome}</Td>
                                            <Td className="text-slate-500 truncate max-w-[120px] uppercase">{item.contato || '-'}</Td>
                                            <Td className="text-slate-500">{fmtDate(item.createdAt)}</Td>
                                            <Td className="text-slate-500">{fmtDate(item.dataBaixa)}</Td>
                                            <Td className="text-slate-500">{item.periodo || '-'}</Td>
                                            <Td className="text-right font-black text-emerald-600">{fmt(item.valorPrecificado)}</Td>
                                        </>)}

                                        {activeTab === 'medicao' && (<>
                                            <Td className="font-black text-slate-700">{item.codigo}</Td>
                                            <Td className="text-center font-bold text-slate-400">{item.revisao || 0}</Td>
                                            <Td className="text-slate-500">{fmtDate(item.createdAt)}</Td>
                                            <Td className="text-slate-500 font-bold truncate max-w-[120px] uppercase">NACIONAL HIDRO</Td>
                                            <Td className="text-center font-bold text-slate-500">{item.cliente?.codigo || '-'}</Td>
                                            <Td className="font-black text-slate-700 truncate max-w-[150px] uppercase">{item.cliente?.nome}</Td>
                                            <Td className="text-slate-500 truncate max-w-[120px] uppercase">{item.solicitante || '-'}</Td>
                                            <Td className="text-right font-black text-emerald-600">{fmt(item.valorTotal)}</Td>
                                            <Td className="text-slate-500 truncate max-w-[120px]">{item.vendedor?.name || '-'}</Td>
                                            <Td className="text-slate-500">{fmtDate(item.dataAprovacaoInterna)}</Td>
                                            <Td className="text-slate-500">{fmtDate(item.dataCobranca)}</Td>
                                            <Td className="text-center font-bold">
                                                {item.dataCobranca ? (
                                                    <span className={`${Number(daysSince(item.dataCobranca)) > DIAS_VENCIMENTO ? 'text-red-600' : 'text-slate-500'}`}>
                                                        {daysSince(item.dataCobranca)}
                                                    </span>
                                                ) : '-'}
                                            </Td>
                                        </>)}

                                        {activeTab === 'finalizadas' && (<>
                                            <Td className="font-black text-slate-700">{item.codigo}</Td>
                                            <Td className="text-center font-bold text-slate-400">{item.revisao || 0}</Td>
                                            <Td className="text-slate-500">{fmtDate(item.createdAt)}</Td>
                                            <Td className="text-slate-500 font-bold truncate max-w-[120px] uppercase">NACIONAL HIDRO</Td>
                                            <Td className="text-center font-bold text-slate-500">{item.cliente?.codigo || '-'}</Td>
                                            <Td className="font-black text-slate-700 truncate max-w-[150px] uppercase">{item.cliente?.nome}</Td>
                                            <Td className="text-slate-500 truncate max-w-[120px] uppercase">{item.solicitante || '-'}</Td>
                                            <Td className="text-right font-black text-emerald-600">{fmt(item.valorTotal)}</Td>
                                            <Td className="text-slate-500 truncate max-w-[120px]">{item.vendedor?.name || '-'}</Td>
                                            <Td className="text-slate-500">{fmtDate(item.dataAprovacaoInterna)}</Td>
                                            <Td className="text-slate-500">{fmtDate(item.dataCobranca)}</Td>
                                            <Td className="text-slate-500">{fmtDate(item.aprovadaEm)}</Td>
                                            <Td className="text-center font-bold text-slate-500">{diffDays(item.dataCobranca, item.aprovadaEm)}</Td>
                                        </>)}

                                        {activeTab === 'cancelados' && (<>
                                            <Td className="font-black text-slate-700">{item.codigo}</Td>
                                            <Td className="text-center font-bold text-slate-400">{item.revisao || 0}</Td>
                                            <Td className="text-slate-500">{fmtDate(item.createdAt)}</Td>
                                            <Td className="text-slate-500 font-bold truncate max-w-[120px] uppercase">NACIONAL HIDRO</Td>
                                            <Td className="text-center font-bold text-slate-500">{item.cliente?.codigo || '-'}</Td>
                                            <Td className="font-black text-slate-700 truncate max-w-[150px] uppercase">{item.cliente?.nome}</Td>
                                            <Td className="text-slate-500 truncate max-w-[120px] uppercase">{item.solicitante || '-'}</Td>
                                            <Td className="text-right font-black text-emerald-600">{fmt(item.valorTotal)}</Td>
                                            <Td className="text-slate-500 truncate max-w-[120px]">{item.vendedor?.name || '-'}</Td>
                                            <Td className="text-slate-500">{fmtDate(item.dataAprovacaoInterna)}</Td>
                                            <Td className="text-slate-500">{fmtDate(item.dataCobranca)}</Td>
                                            <Td className="text-slate-500">{fmtDate(item.dataCancelamento)}</Td>
                                            <Td className="text-slate-500 truncate max-w-[180px]">{item.justificativaCancelamento || '-'}</Td>
                                            <Td className="text-center font-bold text-slate-500">{diffDays(item.dataCobranca, item.dataCancelamento)}</Td>
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

                {/* ── DETAIL PANEL: PRECIFICAÇÃO ── */}
                {selectedOS && (
                    <div className="w-1/2 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="bg-[#1e3a5f] text-white p-4 flex items-center justify-between">
                            <div>
                                <h3 className="font-black uppercase text-sm flex items-center gap-2">
                                    <Calculator className="w-4 h-4 text-orange-400" />
                                    Precificar OS {selectedOS.codigo}
                                </h3>
                                <p className="text-[10px] text-white/60">{selectedOS.cliente?.nome}</p>
                            </div>
                            <button onClick={() => setSelectedOS(null)} className="hover:bg-white/10 p-1.5 rounded-lg"><X className="w-4 h-4" /></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                           <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <div><p className="text-[10px] font-black text-slate-400 uppercase">Horas Totais</p><p className="text-sm font-bold">{selectedOS.horasTotais || '—'}h</p></div>
                                <div><p className="text-[10px] font-black text-slate-400 uppercase">Tipo Cobr.</p><p className="text-sm font-bold uppercase">{selectedOS.tipoCobranca || '—'}</p></div>
                           </div>

                           <div className="flex items-center justify-between">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase">Bloco de Cobrança</h4>
                                <div className="flex gap-1.5">
                                    <button onClick={() => setShowAutoCalc(true)} className="bg-blue-600 text-white px-3 py-1 rounded text-[9px] font-black uppercase hover:bg-blue-700 flex items-center gap-1 shadow-sm"><Zap className="w-3 h-3" /> Auto Calc</button>
                                    <button onClick={() => setShowItemForm(true)} className="bg-slate-800 text-white px-3 py-1 rounded text-[9px] font-black uppercase hover:bg-slate-900 flex items-center gap-1 shadow-sm"><Plus className="w-3 h-3" /> Manual</button>
                                </div>
                           </div>

                           {showAutoCalc && (
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                                    <div className="grid grid-cols-3 gap-2">
                                        <div><label className="text-[9px] font-black uppercase text-blue-600">Diária (R$)</label><input type="number" step="0.01" value={autoCalcForm.valorDiaria} onChange={e => setAutoCalcForm({...autoCalcForm, valorDiaria: e.target.value})} className="w-full border p-1 rounded font-bold text-xs" /></div>
                                        <div><label className="text-[9px] font-black uppercase text-blue-600">Hora (R$)</label><input type="number" step="0.01" value={autoCalcForm.valorHora} onChange={e => setAutoCalcForm({...autoCalcForm, valorHora: e.target.value})} className="w-full border p-1 rounded font-bold text-xs" /></div>
                                        <div><label className="text-[9px] font-black uppercase text-blue-600">Tol. (h)</label><input type="number" value={autoCalcForm.toleranciaHoras} onChange={e => setAutoCalcForm({...autoCalcForm, toleranciaHoras: e.target.value})} className="w-full border p-1 rounded font-bold text-xs" /></div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={handleAutoCalcular} className="bg-blue-600 text-white px-3 py-1 rounded text-[9px] font-black uppercase">Calcular</button>
                                        <button onClick={() => setShowAutoCalc(false)} className="text-slate-500 px-3 py-1 text-[9px] font-bold">Cancelar</button>
                                    </div>
                                </div>
                           )}

                           {showItemForm && (
                                <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 space-y-3">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="col-span-2"><label className="text-[9px] font-black uppercase text-slate-500">Descrição</label><input value={itemForm.descricao} onChange={e => setItemForm({...itemForm, descricao: e.target.value})} className="w-full border p-1 rounded font-bold text-xs" /></div>
                                        <div><label className="text-[9px] font-black uppercase text-slate-500">Qtd</label><input type="number" value={itemForm.quantidade} onChange={e => setItemForm({...itemForm, quantidade: e.target.value})} className="w-full border p-1 rounded font-bold text-xs" /></div>
                                        <div><label className="text-[9px] font-black uppercase text-slate-500">Valor Un.</label><input type="number" value={itemForm.valorUnitario} onChange={e => setItemForm({...itemForm, valorUnitario: e.target.value})} className="w-full border p-1 rounded font-bold text-xs" /></div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={handleAddItem} className="bg-slate-800 text-white px-3 py-1 rounded text-[9px] font-black uppercase">Salvar</button>
                                        <button onClick={() => setShowItemForm(false)} className="text-slate-500 px-3 py-1 text-[9px] font-bold">Cancelar</button>
                                    </div>
                                </div>
                           )}

                           <div className="space-y-2">
                                {selectedOS.itensCobranca?.map((it: any) => (
                                    <div key={it.id} className="flex items-center justify-between p-2.5 bg-white border border-slate-100 rounded-lg shadow-sm">
                                        <div className="flex flex-col"><span className="font-bold text-slate-700">{it.descricao}</span><span className="text-[10px] text-slate-400">{it.quantidade}x {fmt(it.valorUnitario)}</span></div>
                                        <span className="font-black text-emerald-600">{fmt(it.valorTotal)}</span>
                                    </div>
                                ))}
                           </div>
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                            <div><p className="text-[10px] font-black text-slate-400 uppercase">Subtotal</p><p className="text-lg font-black text-slate-800">{fmt(selectedOS.valorPrecificado)}</p></div>
                            <button onClick={handlePrecificar} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg text-xs font-black uppercase shadow-lg shadow-emerald-500/20">Finalizar Precificação</button>
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
                            <button onClick={() => setSelectedMedicao(null)} className="hover:bg-white/10 p-1.5 rounded-lg"><X className="w-4 h-4" /></button>
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
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Status</p>
                                    <span className={`text-xs font-black uppercase ${
                                        selectedMedicao.status === 'CONTESTADA' ? 'text-orange-600' :
                                        selectedMedicao.status === 'CANCELADA' ? 'text-red-600' :
                                        selectedMedicao.status === 'APROVADA' ? 'text-emerald-600' : 'text-blue-700'
                                    }`}>{STATUS_LABEL[selectedMedicao.status]}</span>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Valor Total</p>
                                    <span className="text-sm font-black text-emerald-600">{fmt(selectedMedicao.valorTotal)}</span>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Tipo Doc</p>
                                    <span className="text-xs font-black text-slate-700">{selectedMedicao.tipoDocumento === 'ND' ? 'Nota de Débito' : 'Recibo (RL)'}</span>
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
                            <div className="space-y-2">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase">Ordens de Serviço Vinculadas</h4>
                                {selectedMedicao.ordensServico?.map((os: any) => (
                                    <div key={os.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
                                        <div className="flex flex-col"><span className="font-bold text-slate-700 uppercase text-xs">{os.codigo}</span><span className="text-[10px] text-slate-400 uppercase">{os.tipoCobranca}</span></div>
                                        <span className="font-black text-blue-700">{fmt(os.valorPrecificado)}</span>
                                    </div>
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

            {/* ── MODAL: CREATE MEDIÇÃO ── */}
            {showCreate && (
                 <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-white/20">
                        <div className="bg-[#1e3a5f] p-5 text-white flex items-center justify-between">
                            <h2 className="text-lg font-black uppercase tracking-tight flex items-center gap-2"><DollarSign className="w-5 h-5 text-yellow-400" /> Gerar Nova Medição</h2>
                            <button onClick={() => setShowCreate(false)} className="hover:bg-white/10 p-2 rounded-full"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 custom-scrollbar space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</label>
                                    <select value={selectedClienteId} onChange={e => fetchOSProntas(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-blue-500/10">
                                        <option value="">Selecione...</option>
                                        {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                    </select>
                                </div>
                                 <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Documento</label>
                                    <div className="flex bg-white border border-slate-200 rounded-lg p-1 gap-1">
                                        <button 
                                            onClick={() => setTipoDocumento('RL')}
                                            className={`flex-1 py-1.5 rounded text-[10px] font-black uppercase transition-all ${tipoDocumento === 'RL' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
                                        >
                                            Recibo (RL)
                                        </button>
                                        <button 
                                            onClick={() => setTipoDocumento('ND')}
                                            className={`flex-1 py-1.5 rounded text-[10px] font-black uppercase transition-all ${tipoDocumento === 'ND' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
                                        >
                                            Nota Débito (ND)
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Período Referência</label>
                                    <input type="text" value={periodo} onChange={e => setPeriodo(e.target.value)} placeholder="Ex: Março/2025" className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm font-bold shadow-sm" />
                                </div>
                            </div>

                            {selectedClienteId && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">OS Disponíveis para Medição ({osProntas.length})</label>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto custom-scrollbar p-1">
                                        {osProntas.map(os => (
                                            <label key={os.id} className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all ${selectedOsIds.includes(os.id) ? 'bg-blue-600 text-white border-blue-700 shadow-md transform scale-[1.02]' : 'bg-white border-slate-200 hover:border-blue-400 text-slate-700'}`}>
                                                <div className="flex items-center gap-3">
                                                    <input type="checkbox" className="sr-only" checked={selectedOsIds.includes(os.id)} onChange={() => setSelectedOsIds(p => p.includes(os.id) ? p.filter(x => x !== os.id) : [...p, os.id])} />
                                                    <div className="flex flex-col"><span className="text-xs font-black uppercase">{os.codigo}</span><span className={`text-[9px] font-bold ${selectedOsIds.includes(os.id) ? 'text-white/70' : 'text-slate-400'}`}>Tipo: {os.tipoCobranca}</span></div>
                                                </div>
                                                <span className="font-black text-xs">{fmt(os.valorPrecificado)}</span>
                                            </label>
                                        ))}
                                    </div>

                                    {/* MÚLTIPLOS ITENS ADICIONAIS */}
                                    <div className="space-y-3 pt-4 border-t border-slate-200">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Itens Adicionais / Extra</label>
                                            <button 
                                                onClick={() => setSubitens([...subitens, newSubitem()])}
                                                className="text-[10px] font-black text-blue-600 flex items-center gap-1 hover:text-blue-800"
                                            >
                                                <Plus className="w-3 h-3" /> ADICIONAR LINHA
                                            </button>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            {subitens.map((sub, idx) => (
                                                <div key={sub.id} className="grid grid-cols-12 gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm items-end animate-in fade-in slide-in-from-left duration-200">
                                                    <div className="col-span-4">
                                                        <label className="text-[9px] font-bold text-slate-400 uppercase block pl-1">Descrição</label>
                                                        <input type="text" value={sub.descricao} onChange={e => {
                                                            const n = [...subitens]; n[idx].descricao = e.target.value; setSubitens(n);
                                                        }} className="w-full text-xs font-bold p-1.5 border border-slate-100 rounded bg-slate-50/50 outline-none focus:bg-white focus:border-blue-300" placeholder="Ex: Hora Extra 50%" />
                                                    </div>
                                                    <div className="col-span-3">
                                                        <label className="text-[9px] font-bold text-slate-400 uppercase block pl-1">Centro de Custo</label>
                                                        <select value={sub.centroCustoId} onChange={e => {
                                                            const n = [...subitens]; n[idx].centroCustoId = e.target.value; setSubitens(n);
                                                        }} className="w-full text-[10px] font-bold p-1.5 border border-slate-100 rounded bg-slate-50/50 outline-none focus:bg-white focus:border-blue-300">
                                                            <option value="">Selecione...</option>
                                                            {centrosCusto.map(cc => <option key={cc.id} value={cc.id}>{cc.nome}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <label className="text-[9px] font-bold text-slate-400 uppercase block pl-1">Qtd / Un</label>
                                                        <div className="flex gap-1">
                                                            <input type="number" value={sub.quantidade} onChange={e => {
                                                                const n = [...subitens]; n[idx].quantidade = Number(e.target.value); setSubitens(n);
                                                            }} className="w-full text-xs font-bold p-1.5 border border-slate-100 rounded bg-slate-50/50 outline-none focus:bg-white focus:border-blue-300" />
                                                            <input type="text" value={sub.unidade} onChange={e => {
                                                                const n = [...subitens]; n[idx].unidade = e.target.value; setSubitens(n);
                                                            }} className="w-12 text-[10px] font-bold p-1.5 border border-slate-100 rounded bg-slate-50/50 outline-none focus:bg-white focus:border-blue-300" />
                                                        </div>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <label className="text-[9px] font-bold text-slate-400 uppercase block pl-1">Valor Unitário</label>
                                                        <input type="number" step="0.01" value={sub.valor} onChange={e => {
                                                            const n = [...subitens]; n[idx].valor = e.target.value; setSubitens(n);
                                                        }} className="w-full text-xs font-black p-1.5 border border-slate-100 rounded bg-slate-50/50 text-emerald-600 outline-none focus:bg-white focus:border-blue-300" placeholder="0.00" />
                                                    </div>
                                                    <div className="col-span-1 flex justify-center pb-1">
                                                        <button onClick={() => setSubitens(subitens.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
                                                    </div>
                                                </div>
                                            ))}
                                            {subitens.length === 0 && (
                                                <div className="text-center py-4 border-2 border-dashed border-slate-100 rounded-xl text-slate-300 text-[10px] font-bold italic">Nenhum item adicional lançado</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-5 bg-white border-t border-slate-100 flex items-center justify-between">
                            <div>
                                <p className="text-xl font-black text-slate-800">
                                    {fmt(
                                        osProntas.filter(o => selectedOsIds.includes(o.id)).reduce((s,o) => s + (o.valorPrecificado || 0), 0) +
                                        subitens.reduce((s, it) => s + (Number(it.valor || 0) * Number(it.quantidade || 1)), 0)
                                    )}
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => setShowCreate(false)} className="px-6 py-2.5 text-xs font-black uppercase text-slate-400 hover:text-slate-600">Cancelar</button>
                                <button 
                                    onClick={handleCreateMedicao} 
                                    disabled={submitting || !selectedOsIds.length} 
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2.5 rounded-xl text-xs font-black uppercase shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                                >
                                    {submitting ? 'Gerando...' : 'Confirmar & Gerar'}
                                </button>
                            </div>
                        </div>
                    </div>
                 </div>
            )}
        </div>
    );
}
