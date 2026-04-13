import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import {
    FileText, Plus, Search, Loader2, X, CheckCircle2, Clock,
    DollarSign, Send, Ban, List, Columns, Printer, Pencil,
    ChevronRight, Mail, RefreshCw, AlertTriangle, Eye, ThumbsUp, ThumbsDown,
    Calculator, Save, Zap, Trash2, Package
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

const newSubitem = () => ({ id: crypto.randomUUID(), descricao: '', valor: '' });

export default function Medicoes() {
    // ─── SETTINGS ───
    const [activeTab, setActiveTab] = useState<ActiveTab>('precificacao');
    const [loading, setLoading] = useState(true);

    // ─── DATA ───
    const [osPricing, setOsPricing] = useState<any[]>([]); // OS em aberto para precificar
    const [medicoesList, setMedicoesList] = useState<any[]>([]); // Lista de medições (Tab 2, 3)
    const [stats, setStats] = useState<any>({ precificacao: 0, medicao: 0, finalizadas: 0, cancelados: 0 });

    // ─── FILTERS ───
    const [search, setSearch] = useState('');
    const [dataInicio, setDataInicio] = useState(() => {
        const d = new Date(); d.setMonth(d.getMonth() - 2); return d.toISOString().split('T')[0];
    });
    const [dataFim, setDataFim] = useState(() => new Date().toISOString().split('T')[0]);

    // ─── SELECTION ───
    const [selectedOS, setSelectedOS] = useState<any>(null); // OS sendo precificada
    const [selectedMedicao, setSelectedMedicao] = useState<any>(null); // Medição em detalhe

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
    const [osProntas, setOsProntas] = useState<any[]>([]); // OS já precificadas do cliente
    const [selectedOsIds, setSelectedOsIds] = useState<string[]>([]);
    const [periodo, setPeriodo] = useState('');
    const [solicitante, setSolicitante] = useState('');
    const [vendedorId, setVendedorId] = useState('');
    const [subitens, setSubitens] = useState<any[]>([]);
    const [submitting, setSubmitting] = useState(false);

    // ─── FETCH LOGIC ───
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = { search, dataInicio, dataFim };
            
            // 1. Fetch OS para precificação (Tab 1)
            const resPricing = await api.get('/precificacao', { params });
            setOsPricing(resPricing.data.kanban.EM_ABERTO || []);
            
            // 2. Fetch Medições (Tab 2, 3, 4)
            const resMed = await api.get('/medicoes', { params });
            setMedicoesList(resMed.data.list || []);

            // 3. Stats (para os contadores do topo)
            setStats({
                precificacao: resPricing.data.kanban.EM_ABERTO?.length || 0,
                medicao: (resMed.data.list || []).filter((m: any) => !['FINALIZADA', 'CANCELADA'].includes(m.status)).length,
                finalizadas: (resMed.data.list || []).filter((m: any) => m.status === 'FINALIZADA').length,
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
            if (motivo === null) return; // User cancelled
            if (!motivo.trim()) {
                alert('O motivo da contestação é obrigatório.');
                return;
            }
            extra.motivoContestacao = motivo;
        }

        try {
            await api.patch(`/medicoes/${id}/status`, { status: next, ...extra });
            fetchData(); openMedicao({ id });
        } catch (err: any) { alert(err.response?.data?.error || 'Erro'); }
    };

    // ─── CREATE MEDIÇÃO ───
    const openCreateMedicao = async () => {
        const [cRes, uRes] = await Promise.all([api.get('/clientes'), api.get('/usuarios')]);
        setClientes(cRes.data);
        setVendedores(uRes.data);
        setShowCreate(true);
        setSelectedClienteId(''); setSelectedOsIds([]); setPeriodo('');
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
            });
            setShowCreate(false);
            fetchData();
            setActiveTab('medicao');
        } catch (err: any) { alert(err.response?.data?.error || 'Erro'); }
        finally { setSubmitting(false); }
    };

    // ─── RENDER HELPERS ───
    const getFilteredList = () => {
        if (activeTab === 'precificacao') return osPricing;
        if (activeTab === 'medicao') return medicoesList.filter(m => !['FINALIZADA', 'CANCELADA'].includes(m.status));
        if (activeTab === 'finalizadas') return medicoesList.filter(m => m.status === 'FINALIZADA');
        if (activeTab === 'cancelados') return medicoesList.filter(m => m.status === 'CANCELADA');
        return [];
    };

    const list = getFilteredList();

    if (loading && !list.length) return (
        <div className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
    );

    return (
        <div className="h-full flex flex-col gap-4">

            {/* ── HEADER LEGADO ── */}
            <div className="bg-[#1e3a5f] rounded-xl p-6 text-white shadow-lg flex flex-col gap-6 relative overflow-hidden">
                <div className="flex items-center justify-between z-10">
                    <h1 className="text-xl font-black uppercase tracking-tighter">Medição</h1>
                    <div className="flex bg-white/10 p-1 rounded-full border border-white/20">
                        <button className="px-3 py-1 text-[10px] font-black uppercase rounded-full bg-blue-600">BR</button>
                    </div>
                </div>

                {/* Progress Bar Line */}
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
                            onClick={() => setActiveTab(step.id as ActiveTab)}
                            className="flex flex-col items-center gap-3 relative group"
                        >
                            <div className={`w-4 h-4 rounded-full ${step.color} border-4 border-[#1e3a5f] shadow-lg z-10 transition-transform group-hover:scale-125 ${activeTab === step.id ? 'ring-4 ring-white/20' : ''}`}></div>
                            <span className={`text-[10px] font-bold uppercase transition-colors ${activeTab === step.id ? 'text-white border-b-2 border-white' : 'text-white/60 hover:text-white'}`}>
                                {step.label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── FILTERS ── */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex gap-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Filtrar Data</label>
                        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded px-3 py-2 shadow-sm">
                            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="text-xs font-bold outline-none" />
                            <span className="text-xs text-slate-300">até</span>
                            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="text-xs font-bold outline-none" />
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Status</label>
                        <select className="bg-white border border-slate-200 rounded px-3 py-2 text-xs font-bold shadow-sm min-w-[150px]">
                            <option value="">Selecione...</option>
                        </select>
                    </div>
                </div>
                <button 
                    onClick={openCreateMedicao}
                    className="bg-[#1e3a5f] hover:bg-slate-700 text-white px-6 py-2.5 rounded text-xs font-black uppercase shadow-lg transition-all active:scale-95"
                >
                    Criar nova Medição
                </button>
            </div>

            {/* ── CONTENT ── */}
            <div className="flex-1 flex gap-4 min-h-0">
                <div className={`${(selectedOS || selectedMedicao) ? 'w-1/2' : 'w-full'} bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col transition-all`}>
                    <div className="overflow-auto flex-1 custom-scrollbar">
                        <table className="w-full text-[11px] border-collapse">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-[#1e3a5f] text-white uppercase text-[10px] font-black">
                                    <th className="px-3 py-2 text-left border-r border-white/10">AÇÕES</th>
                                    <th className="px-3 py-2 text-center border-r border-white/10">STATUS</th>
                                    {activeTab === 'precificacao' ? (
                                        <>
                                            <th className="px-3 py-2 text-left border-r border-white/10">Nº OS</th>
                                            <th className="px-3 py-2 text-center border-r border-white/10">DIAS EM ABER..</th>
                                            <th className="px-3 py-2 text-left border-r border-white/10">EMPRESA</th>
                                            <th className="px-3 py-2 text-center border-r border-white/10">CÓD. CLIENTE</th>
                                            <th className="px-3 py-2 text-left border-r border-white/10">CLIENTE</th>
                                            <th className="px-3 py-2 text-left">CONTATO</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="px-3 py-2 text-left border-r border-white/10">Nº MEDIÇÃO</th>
                                            <th className="px-3 py-2 text-center border-r border-white/10">REVISÃO</th>
                                            <th className="px-3 py-2 text-left border-r border-white/10">EMPRESA</th>
                                            <th className="px-3 py-2 text-center border-r border-white/10">CÓD. CLIENTE</th>
                                            <th className="px-3 py-2 text-left border-r border-white/10">CLIENTE</th>
                                            <th className="px-3 py-2 text-right">VALOR TOT..</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {list.length === 0 ? (
                                    <tr><td colSpan={10} className="text-center py-20 text-slate-400 italic font-medium">Nenhum registro encontrado nesta etapa.</td></tr>
                                ) : list.map((item: any) => (
                                    <tr 
                                        key={item.id} 
                                        onClick={() => activeTab === 'precificacao' ? openPricing(item) : openMedicao(item)}
                                        className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors ${
                                            (selectedOS?.id === item.id || selectedMedicao?.id === item.id) ? 'bg-blue-50/50' : ''
                                        }`}
                                    >
                                        <td className="px-3 py-2.5">
                                            <div className="flex gap-2 text-slate-600">
                                                {activeTab === 'precificacao' ? (
                                                    <button title="Precificar" className="hover:text-blue-600"><ChevronRight className="w-4 h-4" /></button>
                                                ) : (
                                                    <button title="Detalhes" className="hover:text-blue-600"><Eye className="w-4 h-4" /></button>
                                                )}
                                                <button title="Imprimir PDF" className="hover:text-slate-900" onClick={e => { e.stopPropagation(); downloadPdf(item); }}>
                                                    <Printer className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2.5 text-center">
                                            <div className={`w-2 h-2 rounded-full mx-auto ${
                                                activeTab === 'precificacao' ? 'bg-orange-500' : 
                                                item.status === 'EM_ABERTO' ? 'bg-orange-500' :
                                                item.status === 'FINALIZADA' ? 'bg-green-500' : 'bg-yellow-400'
                                            }`}></div>
                                        </td>
                                        {activeTab === 'precificacao' ? (
                                            <>
                                                <td className="px-3 py-2.5 font-black text-slate-700">{item.codigo}</td>
                                                <td className="px-3 py-2.5 text-center font-bold text-slate-500">
                                                    {Math.floor((new Date().getTime() - new Date(item.dataBaixa || item.createdAt).getTime()) / (1000 * 3600 * 24))}
                                                </td>
                                                <td className="px-3 py-2.5 text-slate-400 font-bold truncate max-w-[100px] uppercase">NACIONAL HIDRO</td>
                                                <td className="px-3 py-2.5 text-center font-bold text-slate-500">{item.cliente?.codigo || '-'}</td>
                                                <td className="px-3 py-2.5 font-black text-slate-700 truncate max-w-[150px] uppercase">{item.cliente?.nome}</td>
                                                <td className="px-3 py-2.5 text-slate-500 truncate max-w-[120px] uppercase">{item.solicitante || '-'}</td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-3 py-2.5 font-black text-slate-700">{item.codigo}</td>
                                                <td className="px-3 py-2.5 text-center font-bold text-slate-400">{item.revisao || 0}</td>
                                                <td className="px-3 py-2.5 text-slate-400 font-bold truncate max-w-[100px] uppercase">NACIONAL HIDRO</td>
                                                <td className="px-3 py-2.5 text-center font-bold text-slate-500">{item.cliente?.codigo || '-'}</td>
                                                <td className="px-3 py-2.5 font-black text-slate-700 truncate max-w-[150px] uppercase">{item.cliente?.nome}</td>
                                                <td className="px-3 py-2.5 text-right font-black text-emerald-600">{fmt(item.valorTotal)}</td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── DETAIL PANELS (Precificação ou Medição) ── */}
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

                {selectedMedicao && (
                    <div className="w-1/2 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="bg-[#1e3a5f] text-white p-4 flex items-center justify-between">
                            <div>
                                <h3 className="font-black uppercase text-sm flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-emerald-400" />
                                    Medição {selectedMedicao.codigo}
                                </h3>
                                <p className="text-[10px] text-white/60">{selectedMedicao.cliente?.nome}</p>
                            </div>
                            <button onClick={() => setSelectedMedicao(null)} className="hover:bg-white/10 p-1.5 rounded-lg"><X className="w-4 h-4" /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
                            {/* Actions bar legada */}
                            <div className="flex gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                                <button onClick={() => handleMedicaoAction(selectedMedicao.id, 'ENVIAR_CLIENTE')} title="Enviar p/ Cliente" className="flex-1 bg-blue-600 text-white h-9 rounded-lg flex items-center justify-center hover:bg-blue-700"><Send className="w-4 h-4" /></button>
                                <button onClick={() => handleMedicaoAction(selectedMedicao.id, 'APROVADA')} title="Aprovar" className="flex-1 bg-emerald-600 text-white h-9 rounded-lg flex items-center justify-center hover:bg-emerald-700 transition-colors"><ThumbsUp className="w-4 h-4" /></button>
                                <button onClick={() => handleMedicaoAction(selectedMedicao.id, 'CONTESTADA')} title="Contestar" className="flex-1 bg-orange-500 text-white h-9 rounded-lg flex items-center justify-center hover:bg-orange-600 transition-colors"><ThumbsDown className="w-4 h-4" /></button>
                                <button onClick={() => handleMedicaoAction(selectedMedicao.id, 'CANCELADA')} title="Cancelar" className="flex-1 bg-red-600 text-white h-9 rounded-lg flex items-center justify-center hover:bg-red-700 transition-colors"><Ban className="w-4 h-4" /></button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Status Atual</p>
                                    <span className="text-xs font-black uppercase text-blue-700">{STATUS_LABEL[selectedMedicao.status]}</span>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Valor Total</p>
                                    <span className="text-sm font-black text-emerald-600">{fmt(selectedMedicao.valorTotal)}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase">Ordens de Serviço Vincuadas</h4>
                                {selectedMedicao.ordensServico?.map((os: any) => (
                                    <div key={os.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
                                        <div className="flex flex-col"><span className="font-bold text-slate-700 uppercase text-xs">{os.codigo}</span><span className="text-[10px] text-slate-400 uppercase">{os.tipoCobranca}</span></div>
                                        <span className="font-black text-blue-700">{fmt(os.valorPrecificado)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── MODALS (Reutilizados do Create) ── */}
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
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Período Referência</label>
                                    <input type="text" value={periodo} onChange={e => setPeriodo(e.target.value)} placeholder="Ex: Março/2025" className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm font-bold shadow-sm" />
                                </div>
                            </div>

                            {selectedClienteId && (
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">OS Disponíveis para Medição ({osProntas.length})</label>
                                    <div className="grid grid-cols-2 gap-2">
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
                                </div>
                            )}
                        </div>
                        <div className="p-5 bg-white border-t border-slate-100 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase">Resumo da Medição</p>
                                <p className="text-xl font-black text-slate-800">{fmt(osProntas.filter(o => selectedOsIds.includes(o.id)).reduce((s,o) => s + (o.valorPrecificado || 0), 0))}</p>
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
