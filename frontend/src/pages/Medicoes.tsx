import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import {
    FileText, Plus, Search, Loader2, X, CheckCircle2, Clock,
    DollarSign, Send, Ban, List, Columns, Printer, Pencil,
    ChevronRight, Mail, RefreshCw, AlertTriangle
} from 'lucide-react';

// ─── HELPERS ────────────────────────────────────────────────────
const fmt = (v: any) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);

const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('pt-BR') : '-';

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
    EM_ABERTO:            'bg-slate-100 text-slate-700',
    EM_CONFERENCIA:       'bg-blue-100 text-blue-700',
    AGUARDANDO_APROVACAO: 'bg-indigo-100 text-indigo-700',
    APROVADA:             'bg-emerald-100 text-emerald-700',
    APROVADA_PARCIAL:     'bg-teal-100 text-teal-700',
    CONTESTADA:           'bg-orange-100 text-orange-700',
    REPROVADA:            'bg-red-100 text-red-700',
    FINALIZADA:           'bg-slate-200 text-slate-500',
    CANCELADA:            'bg-rose-100 text-rose-700',
};

// ─── KANBAN CONFIG ───────────────────────────────────────────────
const KANBAN_COLS = [
    { key: 'EM_ABERTO',            label: 'Em Aberto',        color: 'border-slate-400',   icon: Clock,         iconColor: 'text-slate-500'  },
    { key: 'EM_CONFERENCIA',       label: 'Conferência',      color: 'border-blue-400',    icon: FileText,      iconColor: 'text-blue-500'   },
    { key: 'AGUARDANDO_APROVACAO', label: 'Aguard. Aprovação',color: 'border-indigo-500',  icon: Send,          iconColor: 'text-indigo-600' },
    { key: 'APROVADA',             label: 'Aprovada',         color: 'border-emerald-400', icon: CheckCircle2,  iconColor: 'text-emerald-500'},
    { key: 'CONTESTADA',           label: 'Contestada',       color: 'border-orange-400',  icon: AlertTriangle, iconColor: 'text-orange-500' },
    { key: 'FINALIZADA',           label: 'Finalizada',       color: 'border-slate-300',   icon: DollarSign,    iconColor: 'text-slate-400'  },
];

// ─── STATUS ACTIONS (pipeline idêntica ao legado) ───────────────
const STATUS_ACTIONS: Record<string, { label: string; next: string; color: string }[]> = {
    'EM_ABERTO': [
        { label: 'Enviar p/ Conferência → Vendedor', next: 'EM_CONFERENCIA', color: 'bg-blue-600 hover:bg-blue-700' }
    ],
    'EM_CONFERENCIA': [
        { label: 'Enviar ao Cliente', next: 'ENVIAR_CLIENTE', color: 'bg-indigo-600 hover:bg-indigo-700' }
    ],
    'AGUARDANDO_APROVACAO': [
        { label: '✅ Aprovar 100%',        next: 'APROVADA',       color: 'bg-emerald-600 hover:bg-emerald-700' },
        { label: '🔢 Aprovar Parcialmente', next: 'APROVADA_PARCIAL', color: 'bg-teal-600 hover:bg-teal-700'    },
        { label: '⚠️ Contestar',           next: 'CONTESTADA',    color: 'bg-orange-600 hover:bg-orange-700'   },
        { label: '🔄 Reprovar (Revisão)',   next: 'REPROVADA',     color: 'bg-red-600 hover:bg-red-700'         },
    ],
    'APROVADA':         [{ label: 'Finalizar',  next: 'FINALIZADA', color: 'bg-slate-600 hover:bg-slate-700' }],
    'APROVADA_PARCIAL': [{ label: 'Finalizar',  next: 'FINALIZADA', color: 'bg-slate-600 hover:bg-slate-700' }],
    'CONTESTADA':       [{ label: 'Reabrir',    next: 'EM_ABERTO',  color: 'bg-slate-500 hover:bg-slate-600' }],
};

// ─── SUBITEM default ─────────────────────────────────────────────
const newSubitem = () => ({ id: crypto.randomUUID(), descricao: '', valor: '' });

export default function Medicoes() {
    // View mode
    const [viewMode, setViewMode] = useState<'kanban' | 'lista'>('lista');

    // Data
    const [kanban, setKanban] = useState<any>({});
    const [lista,  setLista]  = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [search,     setSearch]     = useState('');
    const [filtroStatus, setFiltroStatus] = useState('');
    const [dataInicio, setDataInicio] = useState(() => {
        const d = new Date(); d.setMonth(d.getMonth() - 3); return d.toISOString().split('T')[0];
    });
    const [dataFim, setDataFim] = useState(() => new Date().toISOString().split('T')[0]);

    // Selected detail
    const [selected, setSelected] = useState<any>(null);

    // Create modal
    const [showCreate,        setShowCreate]        = useState(false);
    const [clientes,          setClientes]          = useState<any[]>([]);
    const [vendedores,        setVendedores]        = useState<any[]>([]);
    const [selectedClienteId, setSelectedClienteId] = useState('');
    const [osDisponiveis,     setOsDisponiveis]     = useState<any[]>([]);
    const [selectedOsIds,     setSelectedOsIds]     = useState<string[]>([]);
    const [periodo,           setPeriodo]           = useState('');
    const [solicitante,       setSolicitante]       = useState('');
    const [vendedorId,        setVendedorId]        = useState('');
    const [cte,               setCte]               = useState(false);
    const [porcentagemRL,     setPorcentagemRL]     = useState('');
    const [totalServico,      setTotalServico]      = useState('');
    const [totalHora,         setTotalHora]         = useState('');
    const [adicional,         setAdicional]         = useState('');
    const [desconto,          setDesconto]          = useState('');
    const [subitens,          setSubitens]          = useState<any[]>([]);
    const [submitting,        setSubmitting]        = useState(false);

    // Modals for actions
    const [showConferir,        setShowConferir]        = useState<any>(null);
    const [emailVendedor,       setEmailVendedor]       = useState('');
    const [showContestar,       setShowContestar]       = useState<any>(null);
    const [motivoContestacao,   setMotivoContestacao]   = useState('');
    const [showAprovaParcial,   setShowAprovaParcial]   = useState<any>(null);
    const [valorAprovadoInput,  setValorAprovadoInput]  = useState('');
    const [aprovadoPorInput,    setAprovadoPorInput]    = useState('');
    const [showReprovar,        setShowReprovar]        = useState<any>(null);
    const [motivoReprovar,      setMotivoReprovar]      = useState('');

    // Email history
    const [showEmailHistory,   setShowEmailHistory]   = useState<any>(null);
    const [emailHistory,       setEmailHistory]       = useState<any[]>([]);
    const [loadingEmails,      setLoadingEmails]      = useState(false);

    // Edit modal
    const [showEdit,    setShowEdit]    = useState<any>(null);
    const [editData,    setEditData]    = useState<any>({});

    // ─── FETCH ────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (search)       params.search     = search;
            if (filtroStatus) params.status     = filtroStatus;
            if (dataInicio)   params.dataInicio = dataInicio;
            if (dataFim)      params.dataFim    = `${dataFim}T23:59:59`;
            const res = await api.get('/medicoes', { params });
            setKanban(res.data.kanban || {});
            setLista(res.data.list   || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [search, filtroStatus, dataInicio, dataFim]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ─── OPEN CREATE ──────────────────────────────────────────────
    const openCreate = async () => {
        try {
            const [cRes, uRes] = await Promise.all([api.get('/clientes'), api.get('/usuarios')]);
            setClientes(cRes.data);
            setVendedores(uRes.data);
        } catch {}
        setShowCreate(true);
        setSelectedClienteId(''); setSelectedOsIds([]); setPeriodo('');
        setSolicitante(''); setVendedorId(''); setCte(false);
        setPorcentagemRL(''); setTotalServico(''); setTotalHora('');
        setAdicional(''); setDesconto(''); setSubitens([]);
    };

    const fetchOSDisponiveis = async (cId: string) => {
        setSelectedClienteId(cId); setSelectedOsIds([]);
        if (!cId) { setOsDisponiveis([]); return; }
        try {
            const res = await api.get('/medicoes/os-disponiveis', { params: { clienteId: cId } });
            setOsDisponiveis(res.data);
        } catch {}
    };

    // ─── TOTAL CALC ───────────────────────────────────────────────
    const baseOsTotal = osDisponiveis
        .filter(os => selectedOsIds.includes(os.id))
        .reduce((s: number, os: any) => s + Number(os.valorPrecificado || 0), 0);
    const subitensTotal = subitens.reduce((s, sub) => s + (parseFloat(sub.valor) || 0), 0);

    // Se campos manuais preenchidos, usa eles; senão soma OS + subitens
    const manualTotal = (totalServico || totalHora || adicional)
        ? (Number(totalServico || 0) + Number(totalHora || 0) + Number(adicional || 0) - Number(desconto || 0))
        : null;
    const displayTotal = manualTotal !== null ? manualTotal : (baseOsTotal + subitensTotal);

    // ─── CREATE ───────────────────────────────────────────────────
    const handleCreate = async () => {
        if (selectedOsIds.length === 0) { alert('Selecione pelo menos uma OS'); return; }
        setSubmitting(true);
        try {
            await api.post('/medicoes', {
                clienteId: selectedClienteId,
                osIds: selectedOsIds,
                periodo, solicitante, vendedorId, cte,
                porcentagemRL: porcentagemRL ? Number(porcentagemRL) : undefined,
                totalServico:  totalServico  ? Number(totalServico)  : undefined,
                totalHora:     totalHora     ? Number(totalHora)     : undefined,
                adicional:     adicional     ? Number(adicional)     : undefined,
                desconto:      desconto      ? Number(desconto)      : undefined,
                subitens,
            });
            setShowCreate(false);
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Erro ao criar medição');
        } finally { setSubmitting(false); }
    };

    // ─── OPEN DETAIL ─────────────────────────────────────────────
    const openDetail = async (m: any) => {
        try {
            const res = await api.get(`/medicoes/${m.id}`);
            setSelected(res.data);
        } catch {}
    };

    // ─── ACTIONS ─────────────────────────────────────────────────
    const handleAction = async (id: string, next: string, extra: any = {}) => {
        if (next === 'ENVIAR_CLIENTE') {
            try {
                await api.post(`/medicoes/${id}/enviar`);
                alert('Medição enviada ao cliente com sucesso!');
                fetchData();
                if (selected?.id === id) openDetail({ id });
            } catch (err: any) { alert(err.response?.data?.error || 'Erro ao enviar'); }
            return;
        }
        if (next === 'EM_CONFERENCIA') {
            setShowConferir({ id }); return;
        }
        if (next === 'CONTESTADA') {
            setShowContestar({ id }); return;
        }
        if (next === 'APROVADA_PARCIAL') {
            setShowAprovaParcial({ id }); return;
        }
        if (next === 'REPROVADA') {
            setShowReprovar({ id }); return;
        }
        try {
            await api.patch(`/medicoes/${id}/status`, { status: next, ...extra });
            fetchData();
            if (selected?.id === id) openDetail({ id });
        } catch (err: any) { alert(err.response?.data?.error || 'Erro ao atualizar status'); }
    };

    const submitConferir = async () => {
        if (!showConferir) return;
        try {
            await api.patch(`/medicoes/${showConferir.id}/status`, { status: 'EM_CONFERENCIA', emailVendedor });
            alert('PDF enviado ao vendedor para conferência!');
            setShowConferir(null); setEmailVendedor('');
            fetchData(); if (selected?.id === showConferir.id) openDetail({ id: showConferir.id });
        } catch (err: any) { alert(err.response?.data?.error || 'Erro ao enviar conferência'); }
    };

    const submitContestar = async () => {
        if (!showContestar || !motivoContestacao) return;
        await handleAction(showContestar.id, 'CONTESTADA_CONFIRM', { status: 'CONTESTADA', motivoContestacao });
        try {
            await api.patch(`/medicoes/${showContestar.id}/status`, { status: 'CONTESTADA', motivoContestacao });
            setShowContestar(null); setMotivoContestacao('');
            fetchData(); if (selected?.id === showContestar.id) openDetail({ id: showContestar.id });
        } catch (err: any) { alert(err.response?.data?.error || 'Erro'); }
    };

    const submitAprovaParcial = async () => {
        if (!showAprovaParcial || !valorAprovadoInput) return;
        try {
            await api.patch(`/medicoes/${showAprovaParcial.id}/status`, {
                status: 'APROVADA_PARCIAL', valorAprovado: Number(valorAprovadoInput), aprovadaPor: aprovadoPorInput
            });
            setShowAprovaParcial(null); setValorAprovadoInput(''); setAprovadoPorInput('');
            fetchData(); if (selected?.id === showAprovaParcial.id) openDetail({ id: showAprovaParcial.id });
        } catch (err: any) { alert(err.response?.data?.error || 'Erro'); }
    };

    const submitReprovar = async () => {
        if (!showReprovar) return;
        try {
            await api.patch(`/medicoes/${showReprovar.id}/status`, { status: 'REPROVADA', motivoContestacao: motivoReprovar });
            alert('Nova revisão criada com sucesso!');
            setShowReprovar(null); setMotivoReprovar('');
            fetchData(); if (selected?.id === showReprovar.id) setSelected(null);
        } catch (err: any) { alert(err.response?.data?.error || 'Erro ao reprovar'); }
    };

    // ─── PDF ─────────────────────────────────────────────────────
    const downloadPdf = async (id: string, codigo: string) => {
        try {
            const res = await api.post(`/medicoes/${id}/pdf`, {}, { responseType: 'blob' });
            const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const a = document.createElement('a'); a.href = url; a.download = `Medicao_${codigo}.pdf`; a.click();
            URL.revokeObjectURL(url);
        } catch { alert('Erro ao gerar PDF'); }
    };

    // ─── EMAIL HISTORY ──────────────────────────────────────────
    const fetchEmailHistory = async (m: any) => {
        setShowEmailHistory(m); setLoadingEmails(true);
        try { const r = await api.get(`/medicoes/${m.id}/emails`); setEmailHistory(r.data); }
        catch { setEmailHistory([]); } finally { setLoadingEmails(false); }
    };

    // ─── EDIT ────────────────────────────────────────────────────
    const openEdit = (m: any) => {
        setEditData({
            id: m.id, periodo: m.periodo || '', solicitante: m.solicitante || '',
            observacoes: m.observacoes || '', porcentagemRL: m.porcentagemRL || '',
            totalServico: m.totalServico || '', totalHora: m.totalHora || '',
            adicional: m.adicional || '', desconto: m.desconto || '', cte: m.cte
        });
        setShowEdit(m);
    };

    const submitEdit = async () => {
        try {
            await api.put(`/medicoes/${showEdit.id}`, {
                ...editData,
                totalServico: editData.totalServico ? Number(editData.totalServico) : undefined,
                totalHora:    editData.totalHora    ? Number(editData.totalHora)    : undefined,
                adicional:    editData.adicional    ? Number(editData.adicional)    : undefined,
                desconto:     editData.desconto     ? Number(editData.desconto)     : undefined,
                porcentagemRL: editData.porcentagemRL ? Number(editData.porcentagemRL) : undefined,
            });
            setShowEdit(null);
            fetchData();
            if (selected?.id === showEdit.id) openDetail({ id: showEdit.id });
        } catch (err: any) { alert(err.response?.data?.error || 'Erro ao editar'); }
    };

    // ─── RENDER ───────────────────────────────────────────────────
    if (loading) return (
        <div className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
    );

    return (
        <div className="h-full flex flex-col gap-4">

            {/* ── HEADER ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">Medições</h1>
                    <p className="text-xs text-slate-500">Pipeline de aprovação e faturamento</p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Toggle Vista */}
                    <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                        <button onClick={() => setViewMode('lista')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'lista' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                            <List className="w-3.5 h-3.5" /> Lista
                        </button>
                        <button onClick={() => setViewMode('kanban')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'kanban' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                            <Columns className="w-3.5 h-3.5" /> Kanban
                        </button>
                    </div>
                    <button onClick={fetchData} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 border border-slate-200">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <button onClick={openCreate}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-lg shadow-blue-500/20">
                        <Plus className="w-4 h-4" /> Nova Medição
                    </button>
                </div>
            </div>

            {/* ── FILTERS ── */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                    <input type="text" placeholder="Buscar código ou cliente..." value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg py-2 pl-10 pr-4 text-sm font-medium outline-none shadow-sm focus:ring-2 focus:ring-blue-500/20 w-56" />
                </div>
                <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium outline-none shadow-sm">
                    <option value="">Todos os status</option>
                    {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
                    <span className="text-xs font-black text-slate-400 uppercase">De</span>
                    <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                        className="text-sm font-medium outline-none bg-transparent" />
                    <span className="text-xs font-black text-slate-400">até</span>
                    <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
                        className="text-sm font-medium outline-none bg-transparent" />
                </div>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                    {lista.length} medições
                </span>
            </div>

            {/* ── CONTENT ── */}
            <div className="flex gap-4 flex-1 min-h-0">

                {/* ── LISTA VIEW ── */}
                {viewMode === 'lista' && (
                    <div className={`${selected ? 'w-2/3' : 'w-full'} flex flex-col min-h-0 transition-all`}>
                        <div className="flex-1 overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50">
                                        {['Nº Medição', 'Rev.', 'Cliente', 'Contato', 'Período', 'Total', 'RL', 'NF/CTE', '% RL', 'Data', 'Status', 'Ações'].map(h => (
                                            <th key={h} className="px-3 py-2.5 text-left font-black text-slate-500 uppercase text-[10px] whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {lista.length === 0 ? (
                                        <tr><td colSpan={12} className="text-center py-12 text-slate-400 italic">Nenhuma medição encontrada</td></tr>
                                    ) : lista.map((m: any) => (
                                        <tr key={m.id}
                                            onClick={() => openDetail(m)}
                                            className={`border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors ${selected?.id === m.id ? 'bg-blue-50 hover:bg-blue-50' : ''}`}>
                                            <td className="px-3 py-2.5">
                                                <span className="font-black text-blue-600">{m.codigo}</span>
                                            </td>
                                            <td className="px-3 py-2.5 font-bold text-slate-400">R{m.revisao || 0}</td>
                                            <td className="px-3 py-2.5 font-bold text-slate-700 max-w-[150px] truncate">{m.cliente?.nome}</td>
                                            <td className="px-3 py-2.5 text-slate-500 max-w-[120px] truncate">{m.cliente?.email || '-'}</td>
                                            <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{m.periodo || '-'}</td>
                                            <td className="px-3 py-2.5 font-black text-emerald-600 whitespace-nowrap">{fmt(m.valorTotal)}</td>
                                            <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{fmt(m.valorRL)}</td>
                                            <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{fmt(m.valorNFSe)}</td>
                                            <td className="px-3 py-2.5 text-slate-500">{m.porcentagemRL ? `${Number(m.porcentagemRL)}%` : '90%'}</td>
                                            <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{fmtDate(m.createdAt)}</td>
                                            <td className="px-3 py-2.5">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${STATUS_COLOR[m.status] || 'bg-slate-100 text-slate-600'}`}>
                                                    {STATUS_LABEL[m.status] || m.status}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => downloadPdf(m.id, m.codigo)} title="Imprimir PDF"
                                                        className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition-colors">
                                                        <Printer className="w-3.5 h-3.5" />
                                                    </button>
                                                    {m.status === 'EM_ABERTO' && (
                                                        <button onClick={() => openEdit(m)} title="Editar"
                                                            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-amber-600 transition-colors">
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    <button onClick={() => openDetail(m)} title="Detalhes"
                                                        className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors">
                                                        <ChevronRight className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── KANBAN VIEW ── */}
                {viewMode === 'kanban' && (
                    <div className={`flex gap-3 ${selected ? 'w-2/3' : 'w-full'} overflow-x-auto min-h-0 transition-all`}>
                        {KANBAN_COLS.map(col => (
                            <div key={col.key} className="flex-1 min-w-[170px] flex flex-col">
                                <div className={`bg-white border-t-4 ${col.color} rounded-t-xl p-2.5 flex items-center justify-between`}>
                                    <div className="flex items-center gap-1.5">
                                        <col.icon className={`w-3.5 h-3.5 ${col.iconColor}`} />
                                        <span className="text-[10px] font-black text-slate-600 uppercase">{col.label}</span>
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                                        {kanban[col.key]?.length || 0}
                                    </span>
                                </div>
                                <div className="flex-1 bg-slate-50/50 rounded-b-xl p-1.5 space-y-1.5 overflow-y-auto border border-slate-200 border-t-0">
                                    {(kanban[col.key] || []).length === 0 ? (
                                        <p className="text-center text-slate-400 text-[10px] py-6 italic">Vazio</p>
                                    ) : (kanban[col.key] || []).map((m: any) => (
                                        <div key={m.id} onClick={() => openDetail(m)}
                                            className={`bg-white rounded-lg p-2.5 border cursor-pointer hover:shadow transition-all text-xs ${selected?.id === m.id ? 'ring-2 ring-blue-500 border-blue-200' : 'border-slate-200'}`}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-black text-blue-600">{m.codigo}{m.revisao > 0 ? `/R${m.revisao}` : ''}</span>
                                            </div>
                                            <p className="font-bold text-slate-700 truncate text-[11px]">{m.cliente?.nome}</p>
                                            <div className="flex items-center justify-between mt-1">
                                                <span className="text-[10px] text-slate-400">{m.ordensServico?.length || 0} OS</span>
                                                <span className="font-black text-emerald-600">{fmt(m.valorTotal)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── DETAIL PANEL ── */}
                {selected && (
                    <div className="w-1/3 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="bg-slate-800 text-white p-4 flex items-center justify-between flex-shrink-0">
                            <div>
                                <h3 className="font-bold">{selected.codigo}{selected.revisao > 0 ? `/R${selected.revisao}` : ''}</h3>
                                <p className="text-xs text-slate-400">{selected.cliente?.nome}</p>
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={() => downloadPdf(selected.id, selected.codigo)} title="Imprimir"
                                    className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                                    <Printer className="w-4 h-4" />
                                </button>
                                {selected.status === 'EM_ABERTO' && (
                                    <button onClick={() => openEdit(selected)} title="Editar"
                                        className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                )}
                                <button onClick={() => setSelected(null)} className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Info financeira */}
                        <div className="p-4 border-b border-slate-100 grid grid-cols-2 gap-3 flex-shrink-0">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase">Total</p>
                                <p className="text-lg font-black text-slate-800">{fmt(selected.valorTotal)}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase">Status</p>
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${STATUS_COLOR[selected.status] || ''}`}>
                                    {STATUS_LABEL[selected.status] || selected.status}
                                </span>
                            </div>
                            {selected.valorRL > 0 && <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase">RL ({selected.porcentagemRL || 90}%)</p>
                                <p className="text-sm font-bold text-slate-700">{fmt(selected.valorRL)}</p>
                            </div>}
                            {selected.valorNFSe > 0 && <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase">{selected.cte ? 'CTE' : 'NFS-e'}</p>
                                <p className="text-sm font-bold text-slate-700">{fmt(selected.valorNFSe)}</p>
                            </div>}
                            {selected.desconto > 0 && <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase">Desconto</p>
                                <p className="text-sm font-bold text-red-600">- {fmt(selected.desconto)}</p>
                            </div>}
                            {selected.adicional > 0 && <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase">Adicional</p>
                                <p className="text-sm font-bold text-blue-600">+ {fmt(selected.adicional)}</p>
                            </div>}
                            <div><p className="text-[10px] font-black text-slate-400 uppercase">Solicitante</p>
                                <p className="text-xs font-bold text-slate-600">{selected.solicitante || '-'}</p></div>
                            <div><p className="text-[10px] font-black text-slate-400 uppercase">Período</p>
                                <p className="text-xs font-bold text-slate-600">{selected.periodo || '-'}</p></div>
                            <div><p className="text-[10px] font-black text-slate-400 uppercase">Criado em</p>
                                <p className="text-xs font-bold text-slate-600">{fmtDate(selected.createdAt)}</p></div>
                            {selected.aprovadaEm && <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase">Aprovado em</p>
                                <p className="text-xs font-bold text-slate-600">{fmtDate(selected.aprovadaEm)}</p>
                            </div>}

                            {/* Badges aprovação / contestação */}
                            {selected.aprovadaEm && (
                                <div className="col-span-2 bg-emerald-50 rounded-lg p-2">
                                    <p className="text-[10px] font-black text-emerald-700 uppercase">
                                        ✓ Aprovada {selected.percentualAprovado != null ? `(${Number(selected.percentualAprovado).toFixed(0)}%)` : ''}
                                    </p>
                                    <p className="text-xs text-emerald-700">Valor: {fmt(selected.valorAprovado)}</p>
                                    {selected.aprovadaPor && <p className="text-[10px] text-emerald-500">Por: {selected.aprovadaPor}</p>}
                                </div>
                            )}
                            {selected.motivoContestacao && (
                                <div className="col-span-2 bg-orange-50 border border-orange-200 rounded-lg p-2">
                                    <p className="text-[10px] font-black text-orange-700 uppercase">⚠ Contestada</p>
                                    <p className="text-xs text-orange-700">{selected.motivoContestacao}</p>
                                    {selected.contestadaEm && <p className="text-[10px] text-orange-400">Em: {fmtDate(selected.contestadaEm)}</p>}
                                </div>
                            )}
                        </div>

                        {/* OS vinculadas + subitens */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase">OS Vinculadas</h4>
                            {selected.ordensServico?.map((os: any) => (
                                <div key={os.id} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-black text-blue-600">{os.codigo}</span>
                                        <span className="text-xs font-bold text-emerald-600">{fmt(os.valorPrecificado)}</span>
                                    </div>
                                    {os.itensCobranca?.length > 0 && (
                                        <div className="mt-1 space-y-0.5">
                                            {os.itensCobranca.map((item: any) => (
                                                <p key={item.id} className="text-[10px] text-slate-400">
                                                    {item.descricao}: {item.quantidade}x {fmt(item.valorUnitario)}
                                                </p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {(selected.subitens as any[])?.length > 0 && (
                                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 mt-2">
                                    <h5 className="text-[10px] font-black text-blue-600 uppercase mb-2">Subitens / Acréscimos</h5>
                                    {(selected.subitens as any[]).map((sub: any) => (
                                        <div key={sub.id} className="flex items-center justify-between border-b border-blue-100/50 pb-1 mb-1 last:border-0">
                                            <span className="text-[10px] font-black italic text-blue-900">{sub.descricao}</span>
                                            <span className="text-xs font-bold text-emerald-600">{fmt(sub.valor)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        {STATUS_ACTIONS[selected.status] && (
                            <div className="border-t border-slate-100 p-3 flex flex-wrap gap-1.5 flex-shrink-0">
                                {STATUS_ACTIONS[selected.status].map(action => (
                                    <button key={action.next} onClick={() => handleAction(selected.id, action.next)}
                                        className={`flex-1 min-w-[100px] ${action.color} text-white px-2 py-2 rounded-lg text-[10px] font-black uppercase transition-colors`}>
                                        {action.label}
                                    </button>
                                ))}
                            </div>
                        )}
                        <div className="border-t border-slate-100 p-3 flex gap-2 flex-shrink-0">
                            <button onClick={() => fetchEmailHistory(selected)}
                                className="flex-1 bg-slate-100 text-indigo-600 px-3 py-2 rounded-lg text-[10px] font-black uppercase hover:bg-slate-200 flex items-center justify-center gap-1.5">
                                <Mail className="w-3.5 h-3.5" /> Histórico de E-mails
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ════════════════════════════════════════════════════
                MODALS
            ════════════════════════════════════════════════════ */}

            {/* ── CRIAR MEDIÇÃO ── */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
                            <h2 className="text-lg font-bold text-slate-800">Nova Medição</h2>
                            <button onClick={() => setShowCreate(false)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <div className="p-5 space-y-5 overflow-y-auto flex-1">

                            {/* Campos básicos */}
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { label: 'Cliente *', el: <select value={selectedClienteId} onChange={e => fetchOSDisponiveis(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none">
                                        <option value="">Selecione...</option>
                                        {clientes.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                    </select> },
                                    { label: 'Período (referência)', el: <input type="text" value={periodo} onChange={e => setPeriodo(e.target.value)} placeholder="Ex: Março/2025"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none" /> },
                                    { label: 'Vendedor', el: <select value={vendedorId} onChange={e => setVendedorId(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none">
                                        <option value="">Selecione...</option>
                                        {vendedores.map((v: any) => <option key={v.id} value={v.id}>{v.nome || v.email}</option>)}
                                    </select> },
                                    { label: 'Solicitante', el: <input type="text" value={solicitante} onChange={e => setSolicitante(e.target.value)} placeholder="Nome do solicitante no cliente"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none" /> },
                                ].map(({ label, el }) => (
                                    <div key={label} className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-500 uppercase">{label}</label>
                                        {el}
                                    </div>
                                ))}
                            </div>

                            {/* Rateio e CTE */}
                            <div className="grid grid-cols-3 gap-4 items-end">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase">% Rateio Locação (RL)</label>
                                    <input type="number" value={porcentagemRL} onChange={e => setPorcentagemRL(e.target.value)} placeholder="Padrão: 90%"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none" />
                                </div>
                                <div className="col-span-2 flex items-center gap-3 pt-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <div className={`w-10 h-5 rounded-full relative transition-colors ${cte ? 'bg-blue-600' : 'bg-slate-300'}`}>
                                            <input type="checkbox" className="sr-only" checked={cte} onChange={e => setCte(e.target.checked)} />
                                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${cte ? 'right-0.5' : 'left-0.5'}`} />
                                        </div>
                                        <span className="text-xs font-black text-slate-600 uppercase">Faturamento 100% CTE</span>
                                    </label>
                                </div>
                            </div>

                            {/* Desdobramento de valores (legado: TotalServico, TotalHora, Adicional, Desconto) */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                                <p className="text-[10px] font-black text-slate-500 uppercase">Desdobramento de Valores (Opcional — sobrepõe cálculo automático das OS)</p>
                                <div className="grid grid-cols-4 gap-3">
                                    {[
                                        { label: 'Total Serviços (R$)', val: totalServico, set: setTotalServico },
                                        { label: 'Total Horas (R$)',     val: totalHora,    set: setTotalHora    },
                                        { label: 'Adicional (R$)',       val: adicional,    set: setAdicional    },
                                        { label: 'Desconto (R$)',        val: desconto,     set: setDesconto     },
                                    ].map(({ label, val, set }) => (
                                        <div key={label} className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase">{label}</label>
                                            <input type="number" step="0.01" value={val} onChange={e => set(e.target.value)} placeholder="0,00"
                                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20" />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* OS Disponíveis */}
                            {selectedClienteId && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black text-slate-500 uppercase">
                                            OS Precificadas Disponíveis ({osDisponiveis.length})
                                        </label>
                                        {selectedOsIds.length > 0 && (
                                            <span className="text-xs font-black text-emerald-600">
                                                {selectedOsIds.length} selecionadas • {fmt(baseOsTotal)}
                                            </span>
                                        )}
                                    </div>
                                    {osDisponiveis.length === 0 ? (
                                        <p className="text-center text-slate-400 py-6 italic text-sm">Nenhuma OS precificada disponível para este cliente.</p>
                                    ) : (
                                        <div className="space-y-1 max-h-48 overflow-y-auto">
                                            {osDisponiveis.map((os: any) => (
                                                <label key={os.id} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                                                    selectedOsIds.includes(os.id) ? 'bg-blue-50 border-blue-300 shadow-sm' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <input type="checkbox" checked={selectedOsIds.includes(os.id)}
                                                            onChange={() => setSelectedOsIds(p => p.includes(os.id) ? p.filter(i => i !== os.id) : [...p, os.id])}
                                                            className="rounded border-slate-300" />
                                                        <div>
                                                            <span className="text-xs font-black text-blue-600">{os.codigo}</span>
                                                            <p className="text-[10px] text-slate-400">{os.cliente?.nome} • {os.itensCobranca?.length || 0} itens</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-sm font-black text-emerald-600">{fmt(os.valorPrecificado)}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}

                                    {/* Subitens */}
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <label className="text-[10px] font-black text-slate-500 uppercase">Subitens Adicionais</label>
                                            <button onClick={() => setSubitens(p => [...p, newSubitem()])}
                                                className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold flex gap-1 items-center hover:bg-blue-200">
                                                <Plus className="w-3 h-3" /> Adicionar
                                            </button>
                                        </div>
                                        {subitens.length === 0 ? (
                                            <p className="text-xs text-slate-400 italic">Nenhum subitem. (ex: Horas Extras, Adicional Noturno)</p>
                                        ) : subitens.map((sub, i) => (
                                            <div key={sub.id} className="flex gap-2 items-center mb-2">
                                                <input type="text" placeholder="Descrição" value={sub.descricao}
                                                    onChange={e => { const ns = [...subitens]; ns[i].descricao = e.target.value; setSubitens(ns); }}
                                                    className="flex-1 outline-none border border-slate-200 rounded-lg p-2 text-xs" />
                                                <input type="number" placeholder="Valor (R$)" value={sub.valor}
                                                    onChange={e => { const ns = [...subitens]; ns[i].valor = e.target.value; setSubitens(ns); }}
                                                    className="w-32 outline-none border border-slate-200 rounded-lg p-2 text-xs" />
                                                <button onClick={() => setSubitens(subitens.filter(s => s.id !== sub.id))}
                                                    className="text-slate-400 hover:text-red-500 p-1"><X className="w-4 h-4" /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between flex-shrink-0">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase">Total da Medição</p>
                                <p className="text-xl font-black text-slate-800">{fmt(displayTotal)}</p>
                                {!cte && <p className="text-[10px] text-slate-400 mt-0.5">RL: {fmt(displayTotal * ((porcentagemRL ? Number(porcentagemRL) : 90) / 100))} | NF: {fmt(displayTotal - displayTotal * ((porcentagemRL ? Number(porcentagemRL) : 90) / 100))}</p>}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setShowCreate(false)} className="text-slate-500 px-4 py-2 text-sm font-bold">Voltar</button>
                                <button onClick={handleCreate} disabled={submitting || selectedOsIds.length === 0}
                                    className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-500/20">
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Medição'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── CONFERIR (email vendedor) ── */}
            {showConferir && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
                        <h2 className="text-lg font-bold text-slate-800">Enviar para Conferência — Vendedor</h2>
                        <p className="text-xs text-slate-500">Um PDF da medição será gerado e enviado ao vendedor para validação antes do envio ao cliente. CC: financeiro@nacionalhidro.com.br</p>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase">E-mail do Vendedor</label>
                            <input type="email" value={emailVendedor} onChange={e => setEmailVendedor(e.target.value)}
                                placeholder="Deixe em branco para usar o e-mail cadastrado"
                                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm mt-1 outline-none focus:border-blue-500" />
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => { setShowConferir(null); setEmailVendedor(''); }} className="px-4 py-2 text-sm text-slate-500 font-bold">Voltar</button>
                            <button onClick={submitConferir} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-blue-700">
                                📧 Enviar ao Vendedor
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── CONTESTAR ── */}
            {showContestar && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
                        <h2 className="text-lg font-bold text-slate-800">Contestar Medição</h2>
                        <p className="text-xs text-slate-500">A medição será marcada como contestada. Informe o motivo.</p>
                        <textarea value={motivoContestacao} onChange={e => setMotivoContestacao(e.target.value)}
                            placeholder="Motivo da contestação..." rows={4}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-orange-400 resize-none" />
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => { setShowContestar(null); setMotivoContestacao(''); }} className="px-4 py-2 text-sm text-slate-500 font-bold">Voltar</button>
                            <button onClick={submitContestar} disabled={!motivoContestacao}
                                className="bg-orange-600 text-white px-6 py-2 rounded-lg text-sm font-bold disabled:opacity-50">Confirmar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── APROVAÇÃO PARCIAL ── */}
            {showAprovaParcial && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
                        <h2 className="text-lg font-bold text-slate-800">Aprovação Parcial</h2>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase">Valor Aprovado (R$) *</label>
                            <input type="number" step="0.01" value={valorAprovadoInput} onChange={e => setValorAprovadoInput(e.target.value)}
                                placeholder="Ex: 15000.00" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm mt-1 outline-none focus:border-teal-500" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase">Aprovado Por</label>
                            <input value={aprovadoPorInput} onChange={e => setAprovadoPorInput(e.target.value)}
                                placeholder="Nome de quem aprovou" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm mt-1 outline-none focus:border-teal-500" />
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => { setShowAprovaParcial(null); setValorAprovadoInput(''); setAprovadoPorInput(''); }} className="px-4 py-2 text-sm text-slate-500 font-bold">Voltar</button>
                            <button onClick={submitAprovaParcial} disabled={!valorAprovadoInput}
                                className="bg-teal-600 text-white px-6 py-2 rounded-lg text-sm font-bold disabled:opacity-50">Confirmar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── REPROVAR (nova revisão) ── */}
            {showReprovar && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
                        <h2 className="text-lg font-bold text-slate-800">Reprovar — Criar Nova Revisão</h2>
                        <p className="text-xs text-slate-500">A medição atual será marcada como <strong>contestada</strong> e uma nova revisão será gerada automaticamente com <strong>Revisão + 1</strong>.</p>
                        <textarea value={motivoReprovar} onChange={e => setMotivoReprovar(e.target.value)}
                            placeholder="Motivo da reprovação / pedido de revisão..." rows={4}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-red-400 resize-none" />
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => { setShowReprovar(null); setMotivoReprovar(''); }} className="px-4 py-2 text-sm text-slate-500 font-bold">Cancelar</button>
                            <button onClick={submitReprovar}
                                className="bg-red-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-red-700">🔄 Reprovar e criar revisão</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── EDITAR ── */}
            {showEdit && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800">Editar Medição — {showEdit.codigo}</h2>
                            <button onClick={() => setShowEdit(null)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { label: 'Período', key: 'periodo', type: 'text' },
                                { label: 'Solicitante', key: 'solicitante', type: 'text' },
                                { label: '% Rateio RL', key: 'porcentagemRL', type: 'number' },
                                { label: 'Total Serviços (R$)', key: 'totalServico', type: 'number' },
                                { label: 'Total Horas (R$)', key: 'totalHora', type: 'number' },
                                { label: 'Adicional (R$)', key: 'adicional', type: 'number' },
                                { label: 'Desconto (R$)', key: 'desconto', type: 'number' },
                            ].map(({ label, key, type }) => (
                                <div key={key} className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase">{label}</label>
                                    <input type={type} value={editData[key] || ''} onChange={e => setEditData({...editData, [key]: e.target.value})}
                                        className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
                                </div>
                            ))}
                        </div>
                        <div className="space-y-1 col-span-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase">Observações</label>
                            <textarea value={editData.observacoes || ''} onChange={e => setEditData({...editData, observacoes: e.target.value})}
                                rows={3} className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none resize-none focus:ring-2 focus:ring-blue-500/20" />
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setShowEdit(null)} className="px-4 py-2 text-sm text-slate-500 font-bold">Voltar</button>
                            <button onClick={submitEdit} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-blue-700">Salvar Alterações</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── EMAIL HISTORY ── */}
            {showEmailHistory && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 flex-shrink-0">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">Histórico de E-mails</h2>
                                <p className="text-xs text-slate-500">Medição {showEmailHistory.codigo}</p>
                            </div>
                            <button onClick={() => setShowEmailHistory(null)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1">
                            {loadingEmails ? (
                                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div>
                            ) : emailHistory.length === 0 ? (
                                <p className="text-center text-slate-400 py-8 italic text-sm">Nenhum e-mail registrado para esta medição.</p>
                            ) : emailHistory.map((email: any) => (
                                <div key={email.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-3">
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="text-sm font-bold text-slate-800">{email.assunto}</p>
                                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                            email.statusEnvio === 'ENVIADO' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                            {email.statusEnvio}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mb-1">Para: {email.destinatario}</p>
                                    <p className="text-[10px] text-slate-400 border-b border-slate-100 pb-2 mb-2">
                                        {new Date(email.dataEnvio).toLocaleString('pt-BR')}
                                    </p>
                                    {email.erro && <p className="text-xs text-red-600 bg-red-50 p-2 rounded italic"><strong>Erro:</strong> {email.erro}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
