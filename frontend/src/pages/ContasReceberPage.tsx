import { useToast } from '../contexts/ToastContext';
import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import {
    Loader2, Plus, X, Search,
    CheckCircle, Edit3, Calendar,
    ChevronLeft, ChevronRight, RotateCcw,
    Banknote, CheckSquare
} from 'lucide-react';

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    PENDENTE: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'A Receber' },
    RECEBIDO: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Recebido' },
    VENCIDO: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Vencido' },
    CANCELADO: { bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400', label: 'Cancelado' },
};

export default function ContasReceberPage() {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'ABERTOS' | 'RECEBER' | 'HISTORICO' | 'CANCELADOS'>('ABERTOS');
    const [receber, setReceber] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [showBaixa, setShowBaixa] = useState<any>(null);
    const [showEditarBaixa, setShowEditarBaixa] = useState<any>(null);

    // Batch selection
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [showBaixaLote, setShowBaixaLote] = useState(false);
    const [loteItems, setLoteItems] = useState<any[]>([]);
    const [loteForm, setLoteForm] = useState({ formaPagamento: 'PIX', contaBancariaId: '' });

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Date Range Filter
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const [clientes, setClientes] = useState<any[]>([]);

    const [formReceber, setFormReceber] = useState({
        descricao: '', clienteId: '', valorOriginal: '', dataVencimento: '', observacoes: '',
        planoContasId: '', contaBancariaId: '', empresa: 'NACIONAL', naturezaFinanceira: '',
        centroCustoId: '', notaFiscal: '', serieNF: ''
    });

    const [filters, setFilters] = useState({
        id: '', empresa: '', cliente: '', nf: '', emissao: '', valor: '',
        vencimento: '', natureza: '', centroCusto: '', entrada: '', usuario: '', status: ''
    });

    const [centrosCusto, setCentrosCusto] = useState<any[]>([]);
    const [contasBancarias, setContasBancarias] = useState<any[]>([]);

    const [baixaForm, setBaixaForm] = useState({
        valorRecebido: '', formaPagamento: 'PIX', banco: '', agencia: '', conta: '1',
        valorDesconto: '', observacoes: ''
    });

    const [editarForm, setEditarForm] = useState({
        valorRecebido: '', formaPagamento: 'PIX', conta: '',
        valorDesconto: '', observacoes: ''
    });

    const fetchAll = useCallback(async () => {
        try {
            const [, r, c, cc, cb] = await Promise.all([
                api.get('/financeiro/stats'),
                api.get('/financeiro/contas-receber'),
                api.get('/clientes').catch(() => ({ data: [] })),
                api.get('/centros-custo').catch(() => ({ data: [] })),
                api.get('/contas-bancarias').catch(() => ({ data: [] })),
            ]);

            setReceber(r.data);
            setClientes(c.data);
            setCentrosCusto(cc.data);
            setContasBancarias(cb.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleCreateReceber = async () => {
        try {
            await api.post('/financeiro/contas-receber', formReceber);
            setShowForm(false);
            setFormReceber({ 
                descricao: '', clienteId: '', valorOriginal: '', dataVencimento: '', observacoes: '', 
                planoContasId: '', contaBancariaId: '', empresa: 'NACIONAL', naturezaFinanceira: '',
                centroCustoId: '', notaFiscal: '', serieNF: '' 
            });
            fetchAll();
        } catch (err) { console.error(err); }
    };

    const handleReceber = async () => {
        if (!showBaixa) return;
        if (!baixaForm.conta) {
            showToast('Por favor, selecione o banco de destino.');
            return;
        }
        try {
            await api.patch(`/financeiro/contas-receber/${showBaixa.id}/receber`, baixaForm);
            setShowBaixa(null);
            setBaixaForm({ valorRecebido: '', formaPagamento: 'PIX', banco: '', agencia: '', conta: '', valorDesconto: '', observacoes: '' });
            fetchAll();
            showToast('Recebimento confirmado com sucesso!');
        } catch (err: any) {
            showToast(err.response?.data?.error || 'Erro ao confirmar recebimento');
        }
    };

    // Batch selection helpers
    const toggleSelect = (id: string) => {
        const ns = new Set(selected);
        if (ns.has(id)) ns.delete(id); else ns.add(id);
        setSelected(ns);
    };

    const toggleSelectAll = (list: any[]) => {
        if (selected.size === list.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(list.map(t => t.id)));
        }
    };

    const prepararBaixaLote = () => {
        const items = receber.filter(r => selected.has(r.id)).map(r => ({
            ...r,
            userDesconto: 0,
            userJuros: 0
        }));
        setLoteItems(items);
        setShowBaixaLote(true);
    };

    const processarBaixaLote = async () => {
        if (!loteForm.contaBancariaId) {
            showToast('Por favor, selecione o banco de destino para o lote.');
            return;
        }
        try {
            const titulosBaixa = loteItems.map(i => ({
                id: i.id,
                valorDesconto: i.userDesconto,
                valorJuros: i.userJuros
            }));

            await api.post('/financeiro/contas-receber/receber-lote', {
                titulosBaixa,
                formaPagamento: loteForm.formaPagamento,
                contaBancariaId: loteForm.contaBancariaId
            });

            setShowBaixaLote(false);
            setSelected(new Set());
            setActiveTab('HISTORICO');
            fetchAll();
            showToast('Recebimento em lote realizado com sucesso!');
        } catch (err: any) {
            showToast(err.response?.data?.error || 'Erro ao receber lote');
        }
    };

    const handleEditarBaixa = async () => {
        if (!showEditarBaixa) return;
        try {
            await api.patch(`/financeiro/contas-receber/${showEditarBaixa.id}/corrigir-baixa`, editarForm);
            setShowEditarBaixa(null);
            fetchAll();
            showToast('Baixa atualizada com sucesso!');
        } catch (err) { console.error(err); }
    }

    const openBaixa = (titulo: any) => {
        const saldo = titulo.valorOriginal;
        setBaixaForm({ ...baixaForm, valorRecebido: String(Number(saldo).toFixed(2)) });
        setShowBaixa(titulo);
    };

    const openEditarBaixa = (titulo: any) => {
        setEditarForm({
            valorRecebido: String(Number(titulo.valorRecebido || titulo.valorOriginal).toFixed(2)),
            formaPagamento: titulo.formaPagamento || 'PIX',
            conta: titulo.contaBancariaId || '1',
            valorDesconto: String(Number(titulo.valorDesconto || 0).toFixed(2)),
            observacoes: '' // nova observacao appended
        });
        setShowEditarBaixa(titulo);
    };

    const fmt = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

    const displayedData = receber.filter(t => {
        // Tab status filter
        if (activeTab === 'HISTORICO') {
            if (t.status !== 'RECEBIDO') return false;
        } else if (activeTab === 'CANCELADOS') {
            if (t.status !== 'CANCELADO') return false;
        } else {
            if (t.status !== 'PENDENTE' && t.status !== 'PARCIAL') return false;
        }

        // Date range filter
        if (dateFrom && t.dataVencimento) {
            if (new Date(t.dataVencimento) < new Date(dateFrom)) return false;
        }
        if (dateTo && t.dataVencimento) {
            if (new Date(t.dataVencimento) > new Date(dateTo)) return false;
        }

        // Search bar
        if (search) {
            const s = search.toLowerCase();
            const m = t.descricao?.toLowerCase().includes(s) || t.cliente?.nome?.toLowerCase().includes(s) || t.empresa?.toLowerCase().includes(s);
            if (!m) return false;
        }

        // Column filters
        if (filters.id && !t.id.toLowerCase().includes(filters.id.toLowerCase())) return false;
        if (filters.empresa && !t.empresa?.toLowerCase().includes(filters.empresa.toLowerCase())) return false;
        if (filters.cliente && !t.cliente?.nome?.toLowerCase().includes(filters.cliente.toLowerCase())) return false;
        if (filters.nf && !t.notaFiscal?.toLowerCase().includes(filters.nf.toLowerCase())) return false;
        if (filters.valor && !t.valorOriginal?.toString().includes(filters.valor)) return false;
        if (filters.natureza && !t.naturezaFinanceira?.toLowerCase().includes(filters.natureza.toLowerCase())) return false;
        if (filters.centroCusto) {
            const cc = centrosCusto.find(c => c.id === t.centroCustoId);
            if (!cc?.nome?.toLowerCase().includes(filters.centroCusto.toLowerCase())) return false;
        }
        if (filters.usuario && !t.usuarioCriador?.toLowerCase().includes(filters.usuario.toLowerCase())) return false;
        if (filters.status && !t.status?.toLowerCase().includes(filters.status.toLowerCase())) return false;

        return true;
    });

    // Totals
    const totalValor = displayedData.reduce((acc: number, c: any) => acc + Number(c.valorOriginal || 0), 0);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(displayedData.length / itemsPerPage));
    const paginatedData = displayedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Reset page on tab/filter change
    useEffect(() => { setCurrentPage(1); }, [activeTab, search, dateFrom, dateTo, filters]);

    if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;

    return (
        <div className="h-full flex flex-col space-y-4 overflow-hidden">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Contas a Receber</h1>
                    <p className="text-sm text-slate-500">Pipeline de faturamentos e recebimentos</p>
                </div>
                <div className="flex gap-2">
                    {activeTab === 'RECEBER' && selected.size > 0 && (
                        <button onClick={prepararBaixaLote} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                            <Banknote className="w-4 h-4" /> Receber {selected.size} Selecionados
                        </button>
                    )}
                    <button onClick={() => setShowForm(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20">
                        <Plus className="w-4 h-4" /> Novo Faturamento
                    </button>
                </div>
            </div>

            {/* PIPELINE TABS */}
            <div className="flex bg-slate-100/50 p-1 rounded-xl w-max border border-slate-200 shadow-sm">
                <button onClick={() => setActiveTab('ABERTOS')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'ABERTOS' ? 'bg-white text-emerald-700 shadow border border-slate-200' : 'text-slate-500 hover:bg-slate-200/50'}`}>
                    1. Cadastrar
                </button>
                <button onClick={() => setActiveTab('RECEBER')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'RECEBER' ? 'bg-white text-emerald-700 shadow border border-slate-200' : 'text-slate-500 hover:bg-slate-200/50'}`}>
                    2. Receber
                </button>
                <button onClick={() => setActiveTab('HISTORICO')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'HISTORICO' ? 'bg-white text-emerald-700 shadow border border-slate-200' : 'text-slate-500 hover:bg-slate-200/50'}`}>
                    3. Recebido(s)
                </button>
                <button onClick={() => setActiveTab('CANCELADOS')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'CANCELADOS' ? 'bg-white text-red-700 shadow border border-slate-200' : 'text-slate-500 hover:bg-slate-200/50'}`}>
                    4. Cancelado(s)
                </button>
            </div>

            {/* FILTERS ROW: Date Range + Search + Legends */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Filtrar data de vencimento</span>
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border-0 text-xs text-slate-600 outline-none bg-transparent w-28" />
                        <span className="text-xs text-slate-400">até</span>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border-0 text-xs text-slate-600 outline-none bg-transparent w-28" />
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar..."
                            className="border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm w-56 focus:ring-2 focus:ring-emerald-500 outline-none" />
                    </div>
                    {/* LEGENDS */}
                    <div className="flex items-center gap-3 text-[10px] font-bold">
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> Recebimento atrasado</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span> Recebimento parcial</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-auto bg-white rounded-xl shadow-sm border border-slate-200">
                <table className="w-full text-[11px] whitespace-nowrap min-w-max">
                    <thead className="sticky top-0 bg-white z-10">
                        <tr className="bg-slate-50 border-b border-slate-200 text-left">
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider w-10 text-center">Ações</th>
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider w-20 text-center">Status</th>
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider w-16 text-center">ID</th>
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">Número Faturamento</th>
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider text-center">Tipo Faturamento</th>
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider text-center">Data Emissão</th>
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">Empresa</th>
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider text-center">Cód. Cliente</th>
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider text-center">CNPJ Cliente</th>
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider text-center">Vencimento</th>
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider text-center">Data Recebimento</th>
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider text-center">Dias em Atraso</th>
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider text-right">Total Líquido</th>
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider text-right">Valor da Parcela</th>
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider text-right">Acréscimo</th>
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider text-right">Decréscimo</th>
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider text-right">Valor a Receber</th>
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider text-right">Valor Recebido</th>
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider text-center">Nº Parcela</th>
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">Centros de Custo</th>
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">Naturezas Contábeis</th>
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider text-center">Data de Entrada</th>
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider text-center">Tipo Inserção</th>
                            {(activeTab === 'HISTORICO' || activeTab === 'CANCELADOS') && (
                                <>
                                    <th className="p-3 font-bold text-slate-500 uppercase tracking-wider text-center">Parcial</th>
                                    <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">Banco Receb.</th>
                                </>
                            )}
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">Observações</th>
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">Usuário</th>
                            {activeTab === 'RECEBER' && (
                                <th className="p-3 w-10 text-center">
                                    <input type="checkbox" checked={selected.size > 0 && selected.size === displayedData.filter(d => d.status === 'PENDENTE').length}
                                        onChange={() => toggleSelectAll(displayedData.filter(d => d.status === 'PENDENTE'))} className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                                </th>
                            )}
                        </tr>
                        {/* FILTER ROW */}
                        <tr className="bg-slate-50/50 border-b border-slate-200">
                            <td className="p-1 px-2"></td>
                            <td className="p-1 px-2"><input value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})} className="w-full border border-slate-200 rounded p-1.5 text-[10px] bg-white outline-none focus:border-emerald-400" placeholder="Filtrar..." /></td>
                            <td className="p-1 px-2"><input value={filters.id} onChange={e => setFilters({...filters, id: e.target.value})} className="w-full border border-slate-200 rounded p-1.5 text-[10px] bg-white outline-none focus:border-emerald-400" placeholder="Filtrar..." /></td>
                            <td className="p-1 px-2"><input value={filters.nf} onChange={e => setFilters({...filters, nf: e.target.value})} className="w-full border border-slate-200 rounded p-1.5 text-[10px] bg-white outline-none focus:border-emerald-400" placeholder="Filtrar..." /></td>
                            <td className="p-1 px-2"></td>
                            <td className="p-1 px-2"><input value={filters.emissao} onChange={e => setFilters({...filters, emissao: e.target.value})} className="w-full border border-slate-200 rounded p-1.5 text-[10px] bg-white text-center outline-none focus:border-emerald-400" placeholder="Filtrar..." /></td>
                            <td className="p-1 px-2"><input value={filters.empresa} onChange={e => setFilters({...filters, empresa: e.target.value})} className="w-full border border-slate-200 rounded p-1.5 text-[10px] bg-white outline-none focus:border-emerald-400" placeholder="Filtrar..." /></td>
                            <td className="p-1 px-2"></td>
                            <td className="p-1 px-2"></td>
                            <td className="p-1 px-2"><input value={filters.cliente} onChange={e => setFilters({...filters, cliente: e.target.value})} className="w-full border border-slate-200 rounded p-1.5 text-[10px] bg-white outline-none focus:border-emerald-400" placeholder="Filtrar..." /></td>
                            <td className="p-1 px-2"><input value={filters.vencimento} onChange={e => setFilters({...filters, vencimento: e.target.value})} className="w-full border border-slate-200 rounded p-1.5 text-[10px] bg-white text-center outline-none focus:border-emerald-400" placeholder="Filtrar..." /></td>
                            <td className="p-1 px-2"></td>
                            <td className="p-1 px-2"></td>
                            <td className="p-1 px-2"><input value={filters.valor} onChange={e => setFilters({...filters, valor: e.target.value})} className="w-full border border-slate-200 rounded p-1.5 text-[10px] bg-white text-right outline-none focus:border-emerald-400" placeholder="Filtrar..." /></td>
                            <td className="p-1 px-2"></td>
                            <td className="p-1 px-2"></td>
                            <td className="p-1 px-2"></td>
                            <td className="p-1 px-2"></td>
                            <td className="p-1 px-2"></td>
                            <td className="p-1 px-2"><input value={filters.centroCusto} onChange={e => setFilters({...filters, centroCusto: e.target.value})} className="w-full border border-slate-200 rounded p-1.5 text-[10px] bg-white outline-none focus:border-emerald-400" placeholder="Filtrar..." /></td>
                            <td className="p-1 px-2"><input value={filters.natureza} onChange={e => setFilters({...filters, natureza: e.target.value})} className="w-full border border-slate-200 rounded p-1.5 text-[10px] bg-white outline-none focus:border-emerald-400" placeholder="Filtrar..." /></td>
                            <td className="p-1 px-2"><input value={filters.entrada} onChange={e => setFilters({...filters, entrada: e.target.value})} className="w-full border border-slate-200 rounded p-1.5 text-[10px] bg-white text-center outline-none focus:border-emerald-400" placeholder="Filtrar..." /></td>
                            <td className="p-1 px-2"></td>
                            <td className="p-1 px-2"><input value={filters.usuario} onChange={e => setFilters({...filters, usuario: e.target.value})} className="w-full border border-slate-200 rounded p-1.5 text-[10px] bg-white outline-none focus:border-emerald-400" placeholder="Filtrar..." /></td>
                        </tr>
                    </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedData.length === 0 ? (
                                <tr><td colSpan={26} className="p-8 text-center text-slate-400">Nenhum registro nesta etapa</td></tr>
                            ) : paginatedData.map((c: any) => {
                                const isVencida = c.status === 'PENDENTE' && new Date(c.dataVencimento) < new Date();
                                const sc = STATUS_COLORS[isVencida ? 'VENCIDO' : c.status] || STATUS_COLORS.PENDENTE;
                                
                                const valOrig = Number(c.valorOriginal || 0);
                                const vJuros = Number(c.valorJuros || 0) + Number(c.valorMulta || 0) + Number(c.valorCorrecao || 0);
                                const vDesc = Number(c.valorDesconto || 0);
                                const totLiq = valOrig + vJuros - vDesc;
                                const valReceber = totLiq - Number(c.valorRecebido || 0);
                                
                                let diasAtraso = 0;
                                if (isVencida) {
                                    diasAtraso = Math.floor((new Date().getTime() - new Date(c.dataVencimento).getTime()) / (1000 * 3600 * 24));
                                }

                                return (
                                    <tr key={c.id} className={`hover:bg-slate-50 transition-colors ${isVencida ? 'bg-amber-50/20' : ''}`}>
                                        <td className="p-2 px-3 text-center">
                                            <div className="flex flex-col gap-1">
                                                {activeTab === 'RECEBER' && c.status === 'PENDENTE' && (
                                                    <button onClick={() => openBaixa(c)} className="px-2 py-0.5 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 font-bold rounded-md text-[9px] shadow-sm">
                                                        Baixar
                                                    </button>
                                                )}
                                                {activeTab === 'HISTORICO' && c.status === 'RECEBIDO' && (
                                                    <>
                                                        <button onClick={() => openEditarBaixa(c)} className="p-1 bg-slate-100 text-blue-600 hover:bg-blue-100 rounded-md shadow-sm" title="Corrigir Baixa">
                                                            <Edit3 className="w-3.5 h-3.5 mx-auto"/>
                                                        </button>
                                                        <button onClick={() => { if(confirm('Revogar recebimento e voltar para Mesa de Operações?')) { api.patch(`/financeiro/contas-receber/${c.id}/revogar`).then(() => fetchAll()).catch(() => showToast('Erro ao revogar')); } }} className="p-1 bg-slate-100 text-amber-600 hover:bg-amber-100 rounded-md shadow-sm" title="Revogar Baixa">
                                                            <RotateCcw className="w-3.5 h-3.5 mx-auto"/>
                                                        </button>
                                                    </>
                                                )}
                                                {(activeTab === 'ABERTOS' || activeTab === 'RECEBER') && (
                                                    <button onClick={() => { if(confirm('Cancelar faturamento?')) { api.patch(`/financeiro/contas-receber/${c.id}/cancelar`, {motivo: 'Cancelado pelo usuário'}).then(() => fetchAll()); } }} className="p-1 text-red-500 hover:text-red-700 mx-auto" title="Cancelar"><X className="w-3.5 h-3.5 mx-auto"/></button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-2 px-3 text-center text-[10px]">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold uppercase tracking-tight ${sc.bg} ${sc.text}`}>
                                                {sc.label}
                                            </span>
                                        </td>
                                        <td className="p-2 px-3 text-center text-slate-400 font-mono text-[9px]">{c.id.substring(0, 5)}</td>
                                        <td className="p-2 px-3 text-slate-600 font-mono">{c.notaFiscal || '—'}</td>
                                        <td className="p-2 px-3 text-center text-slate-500">—</td>
                                        <td className="p-2 px-3 text-center text-slate-500 font-mono">{fmtDate(c.dataEmissao)}</td>
                                        <td className="p-2 px-3 font-medium text-slate-600 truncate max-w-[100px]">{c.empresa || 'NACIONAL'}</td>
                                        <td className="p-2 px-3 text-slate-500 text-center font-mono">{c.cliente?.codigo || c.cliente?.id?.substring(0, 5) || '—'}</td>
                                        <td className="p-2 px-3 text-slate-500 text-center font-mono">{c.cliente?.documento || c.cliente?.cnpj || '—'}</td>
                                        <td className="p-2 px-3 text-slate-700 font-bold truncate max-w-[150px]">{c.cliente?.nome || '—'}</td>
                                        <td className={`p-2 px-3 text-center font-bold ${isVencida ? 'text-red-600 text-[12px]' : 'text-slate-600'}`}>
                                            {fmtDate(c.dataVencimento)}
                                        </td>
                                        <td className="p-2 px-3 text-center text-emerald-600 font-bold">{c.dataRecebimento ? fmtDate(c.dataRecebimento) : '—'}</td>
                                        <td className={`p-2 px-3 text-center font-bold ${diasAtraso > 0 ? 'text-red-500' : 'text-slate-400'}`}>{diasAtraso > 0 ? `${diasAtraso}d` : '—'}</td>
                                        <td className="p-2 px-3 text-right">
                                            <p className="font-bold text-emerald-700">{fmt(totLiq)}</p>
                                        </td>
                                        <td className="p-2 px-3 text-right text-slate-600 font-medium">{fmt(valOrig)}</td>
                                        <td className="p-2 px-3 text-right text-red-500 font-medium">{vJuros > 0 ? `+${fmt(vJuros)}` : '—'}</td>
                                        <td className="p-2 px-3 text-right text-emerald-500 font-medium">{vDesc > 0 ? `-${fmt(vDesc)}` : '—'}</td>
                                        <td className="p-2 px-3 text-right font-semibold text-slate-700">{fmt(valReceber)}</td>
                                        <td className="p-2 px-3 text-right font-black text-slate-800">{c.valorRecebido ? fmt(Number(c.valorRecebido)) : '—'}</td>
                                        <td className="p-2 px-3 text-center text-slate-500 font-medium bg-slate-50 rounded">{`${c.numeroParcela || 1}/${c.totalParcelas || 1}`}</td>
                                        <td className="p-2 px-3">
                                             {(() => {
                                                const cc = centrosCusto.find((p: any) => p.id === c.centroCustoId);
                                                return cc ? <span className="font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md max-w-[150px] inline-block truncate align-middle">{cc.nome}</span> : <span className="text-slate-400">—</span>;
                                            })()}
                                        </td>
                                        <td className="p-2 px-3 text-slate-500 italic max-w-[150px] truncate">{c.naturezaFinanceira || '—'}</td>
                                        <td className="p-2 px-3 text-center text-slate-400 italic font-mono">{fmtDate(c.createdAt)}</td>
                                        <td className="p-2 px-3 text-center">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.faturamentoId ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                                                {c.faturamentoId ? 'AUTOMÁTICO' : 'MANUAL'}
                                            </span>
                                        </td>
                                        {(activeTab === 'HISTORICO' || activeTab === 'CANCELADOS') && (
                                            <>
                                                <td className="p-2 px-3 text-center text-slate-500 font-medium">{c.pagamentoParcial ? 'Sim' : 'Não'}</td>
                                                <td className="p-2 px-3 text-slate-600 truncate max-w-[130px]">
                                                    {(() => {
                                                        const cb = contasBancarias.find(b => b.id === c.contaBancariaId);
                                                        return cb ? <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[10px]">{cb.nome}{cb.empresa ? ` (${cb.empresa})` : ''}</span> : <span className="text-slate-400">—</span>;
                                                    })()}
                                                </td>
                                            </>
                                        )}
                                        <td className="p-2 px-3 text-slate-400 italic truncate max-w-[120px]">{c.observacoes || '—'}</td>
                                        <td className="p-2 px-3 text-slate-500 truncate max-w-[120px]">{c.usuarioCriador || '—'}</td>
                                        {activeTab === 'RECEBER' && (
                                            <td className="p-2 px-3 text-center">
                                                {c.status === 'PENDENTE' && (
                                                    <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} className="rounded border-slate-300 text-emerald-600 w-4 h-4 cursor-pointer" />
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* FOOTER: Total + Pagination */}
                <div className="flex items-center justify-between py-3 px-2 bg-white border-t border-slate-200 rounded-b-xl text-sm">
                    <div className="font-bold text-slate-700">
                        {activeTab === 'HISTORICO' ? 'Valor recebido: ' : 'Total a receber: '}
                        <span className="text-emerald-700">{fmt(totalValor)}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1">
                            <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                        </button>
                        <span className="text-xs text-slate-500">
                            Página <strong className="text-slate-800">{currentPage}</strong> de <strong className="text-slate-800">{totalPages}</strong>
                        </span>
                        <select value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                            className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-600 bg-white">
                            <option value={10}>10 itens</option>
                            <option value={25}>25 itens</option>
                            <option value={50}>50 itens</option>
                        </select>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1">
                            Próximo <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>



            {/* MODAL: NOVA CONTA A RECEBER */}
            {showForm && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Novo Faturamento a Receber</h2>
                            </div>
                            <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        <div className="p-6 bg-slate-50">
                            {/* OMITTING VERBOSE FORM CODE FOR BREVITY - the original fields map correctly */}
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-400 uppercase mb-1.5 block">Empresa *</label>
                                        <select value={formReceber.empresa} onChange={e => setFormReceber({ ...formReceber, empresa: e.target.value })}
                                            className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-lg p-2.5 text-sm outline-none">
                                            <option value="NACIONAL">NACIONAL HIDRO</option>
                                            <option value="HIDRO">HIDRO LOCAÇÕES</option>
                                            <option value="OUTRA">OUTRA</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-400 uppercase mb-1.5 block">Descrição *</label>
                                        <input value={formReceber.descricao} onChange={e => setFormReceber({ ...formReceber, descricao: e.target.value })}
                                            className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-lg p-2.5 text-sm outline-none" placeholder="Ex: Fatura Serviço Venda" />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-400 uppercase mb-1.5 block">Cliente</label>
                                        <select value={formReceber.clienteId} onChange={e => setFormReceber({ ...formReceber, clienteId: e.target.value })}
                                            className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-lg p-2.5 text-sm outline-none">
                                            <option value="">Selecione um cliente</option>
                                            {clientes.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-400 uppercase mb-1.5 block">Centro de Custo</label>
                                        <select value={formReceber.centroCustoId} onChange={e => setFormReceber({ ...formReceber, centroCustoId: e.target.value })}
                                            className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-lg p-2.5 text-sm outline-none">
                                            <option value="">Selecione um centro de custo</option>
                                            {centrosCusto.map((cc: any) => <option key={cc.id} value={cc.id}>{cc.nome}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-400 uppercase mb-1.5 block">Natureza Financeira</label>
                                        <input value={formReceber.naturezaFinanceira} onChange={e => setFormReceber({ ...formReceber, naturezaFinanceira: e.target.value })}
                                            className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-lg p-2.5 text-sm" placeholder="Ex: RECEITA VENDA" />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-400 uppercase mb-1.5 block">Nº Nota Fiscal</label>
                                        <input value={formReceber.notaFiscal} onChange={e => setFormReceber({ ...formReceber, notaFiscal: e.target.value })}
                                            className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-lg p-2.5 text-sm" placeholder="000.000" />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-400 uppercase mb-1.5 block">Série NF</label>
                                        <input value={formReceber.serieNF} onChange={e => setFormReceber({ ...formReceber, serieNF: e.target.value })}
                                            className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-lg p-2.5 text-sm" placeholder="001" />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-400 uppercase mb-1.5 block">Valor (R$) *</label>
                                        <input type="number" step="0.01" value={formReceber.valorOriginal} onChange={e => setFormReceber({ ...formReceber, valorOriginal: e.target.value })}
                                            className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-lg p-2.5 text-sm font-semibold" placeholder="0.00" />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-400 uppercase mb-1.5 block">Vencimento *</label>
                                        <input type="date" value={formReceber.dataVencimento} onChange={e => setFormReceber({ ...formReceber, dataVencimento: e.target.value })}
                                            className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-lg p-2.5 text-sm" />
                                    </div>
                                </div>
                        </div>
                        <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3">
                            <button onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-lg text-slate-600 font-bold text-sm bg-slate-100 hover:bg-slate-200">Cancelar</button>
                            <button onClick={handleCreateReceber} className="px-5 py-2.5 rounded-lg text-white font-bold text-sm bg-emerald-600 hover:bg-emerald-700">Salvar Faturamento</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: Baixar Conta */}
            {showBaixa && (
                 <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden p-0 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-emerald-600 text-white">
                            <h2 className="text-lg font-bold">Confirmar Recebimento</h2>
                            <button onClick={() => setShowBaixa(null)} className="p-1 hover:bg-emerald-500 rounded-lg transition-colors"><X className="w-5 h-5 text-white" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 mb-2">
                                <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Título Selecionado</p>
                                <p className="font-bold text-emerald-800 text-sm">{showBaixa.descricao}</p>
                                <p className="text-xs text-emerald-600 mt-1">Valor do Título: <b>{fmt(Number(showBaixa.valorOriginal))}</b></p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Valor Recebido (R$)</label>
                                    <input type="number" step="0.01" value={baixaForm.valorRecebido} onChange={e => setBaixaForm({ ...baixaForm, valorRecebido: e.target.value })}
                                        className="w-full border border-slate-200 rounded-lg p-2.5 text-lg font-black text-emerald-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50" />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-red-400 uppercase block mb-1">Taxas / Desconto (R$)</label>
                                    <input type="number" step="0.01" value={baixaForm.valorDesconto} onChange={e => setBaixaForm({ ...baixaForm, valorDesconto: e.target.value })}
                                        className="w-full border border-slate-200 rounded-lg p-2.5 text-lg font-bold text-red-600 outline-none focus:ring-2 focus:ring-red-400 bg-slate-50" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Banco de Destino *</label>
                                <select value={baixaForm.conta} onChange={e => setBaixaForm({ ...baixaForm, conta: e.target.value })}
                                    className={`w-full border ${!baixaForm.conta ? 'border-amber-300 bg-amber-50' : 'border-slate-200'} rounded-lg p-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none transition-all`}>
                                    <option value="">Selecione o banco de destino</option>
                                    {contasBancarias.filter(b => b.ativa !== false).map((b: any) => (
                                        <option key={b.id} value={b.id}>
                                            {b.nome}{b.empresa ? ` (${b.empresa})` : ''} {b.conta ? `• Cc: ${b.conta}` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Forma de Pagamento</label>
                                <select value={baixaForm.formaPagamento} onChange={e => setBaixaForm({ ...baixaForm, formaPagamento: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm font-bold text-slate-700">
                                    <option value="PIX">PIX</option>
                                    <option value="BOLETO">BOLETO</option>
                                    <option value="TRANSFERENCIA">TRANSFERÊNCIA</option>
                                    <option value="DEPOSITO">DEPÓSITO</option>
                                    <option value="CARTAO">CARTÃO</option>
                                </select>
                            </div>
                            <button onClick={handleReceber} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-bold flex justify-center gap-2 mt-4 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all">
                                <CheckCircle className="w-5 h-5" /> Confirmar Baixa
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: Editar Baixa */}
            {showEditarBaixa && (
                 <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden p-0 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-blue-600 text-white">
                            <h2 className="text-lg font-bold">Corrigir Detalhes do Recebimento</h2>
                            <button onClick={() => setShowEditarBaixa(null)} className="p-1 hover:bg-blue-500 rounded-lg transition-colors"><X className="w-5 h-5 text-white" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <p className="text-blue-800 text-xs font-medium leading-relaxed">Ajuste valores, desconto bancário ou conta de destino sem precisar revogar o título.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Valor Recebido (R$)</label>
                                    <input type="number" step="0.01" value={editarForm.valorRecebido} onChange={e => setEditarForm({ ...editarForm, valorRecebido: e.target.value })}
                                        className="w-full border border-slate-200 rounded-lg p-2.5 text-lg font-black text-blue-700 outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-red-500 uppercase block mb-1">Taxas / Desconto (R$)</label>
                                    <input type="number" step="0.01" value={editarForm.valorDesconto} onChange={e => setEditarForm({ ...editarForm, valorDesconto: e.target.value })}
                                        className="w-full border border-slate-200 rounded-lg p-2.5 text-lg font-bold text-red-600 outline-none focus:ring-2 focus:ring-red-400 bg-slate-50" />
                                </div>
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Forma de Pagamento</label>
                                <select value={editarForm.formaPagamento} onChange={e => setEditarForm({ ...editarForm, formaPagamento: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm font-bold text-slate-700">
                                    <option value="PIX">PIX</option>
                                    <option value="BOLETO">BOLETO</option>
                                    <option value="TRANSFERENCIA">TRANSFERÊNCIA</option>
                                    <option value="CARTAO">CARTÃO</option>
                                    <option value="DEPOSITO">DEPÓSITO</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Conta Bancária de Destino</label>
                                <select value={editarForm.conta} onChange={e => setEditarForm({ ...editarForm, conta: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none">
                                    <option value="">Manter conta atual</option>
                                    {contasBancarias.filter(b => b.ativa !== false).map((b: any) => (
                                        <option key={b.id} value={b.id}>
                                            {b.nome}{b.empresa ? ` (${b.empresa})` : ''} • Cc: {b.conta}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Motivo da Correção</label>
                                <textarea spellCheck={false} value={editarForm.observacoes} onChange={e => setEditarForm({ ...editarForm, observacoes: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 h-20 resize-none" 
                                    placeholder="Ex: Ajuste de taxa bancária não informada no momento da baixa" />
                            </div>

                            <button onClick={handleEditarBaixa} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold flex justify-center gap-2 mt-4 shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all">
                                <Edit3 className="w-5 h-5" /> Atualizar Recebimento
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: RECEBER EM LOTE */}
            {showBaixaLote && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-emerald-600 text-white">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2"><Banknote className="w-5 h-5"/> Receber em Lote</h2>
                                <p className="text-sm text-emerald-100 mt-1">Insira descontos e acréscimos antes de confirmar.</p>
                            </div>
                            <button onClick={() => setShowBaixaLote(false)}><X className="w-6 h-6 text-white hover:text-emerald-200" /></button>
                        </div>

                        <div className="p-6 bg-slate-50 flex-1 overflow-y-auto">
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-left">
                                            <th className="p-3 font-semibold text-slate-500">Descrição</th>
                                            <th className="p-3 font-semibold text-slate-500">Cliente</th>
                                            <th className="p-3 font-semibold text-slate-500 text-right">Valor Orig.</th>
                                            <th className="p-3 font-semibold text-slate-500 text-center">Juros Adic. (R$)</th>
                                            <th className="p-3 font-semibold text-slate-500 text-center">Desconto (R$)</th>
                                            <th className="p-3 font-semibold text-slate-500 text-right">Total Final (R$)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {loteItems.map((item, idx) => {
                                            const final1 = Number(item.valorOriginal) + Number(item.userJuros || 0) - Number(item.userDesconto || 0);
                                            return (
                                                <tr key={item.id} className="hover:bg-slate-50">
                                                    <td className="p-3 font-bold text-slate-700">{item.descricao}</td>
                                                    <td className="p-3 text-slate-500">{item.cliente?.nome || '—'}</td>
                                                    <td className="p-3 text-right">{fmt(Number(item.valorOriginal))}</td>
                                                    <td className="p-3 text-center w-32">
                                                        <input type="number" step="0.01" value={item.userJuros}
                                                            onChange={e => {
                                                                const neo = [...loteItems];
                                                                neo[idx].userJuros = Number(e.target.value);
                                                                setLoteItems(neo);
                                                            }}
                                                            className="w-24 text-center border border-slate-200 p-1.5 focus:border-emerald-500 rounded text-amber-600 font-bold" />
                                                    </td>
                                                    <td className="p-3 text-center w-32">
                                                        <input type="number" step="0.01" value={item.userDesconto}
                                                            onChange={e => {
                                                                const neo = [...loteItems];
                                                                neo[idx].userDesconto = Number(e.target.value);
                                                                setLoteItems(neo);
                                                            }}
                                                            className="w-24 text-center border border-slate-200 p-1.5 focus:border-emerald-500 rounded text-emerald-600 font-bold" />
                                                    </td>
                                                    <td className="p-3 text-right font-black text-emerald-700 bg-emerald-50/50">{fmt(final1)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot className="bg-slate-100 font-bold text-sm">
                                        <tr>
                                            <td colSpan={5} className="p-3 text-right uppercase text-slate-500">Total do Lote:</td>
                                            <td className="p-3 text-right text-emerald-800 text-base">
                                                {fmt(loteItems.reduce((acc, item) => acc + Number(item.valorOriginal) + Number(item.userJuros || 0) - Number(item.userDesconto || 0), 0))}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {/* Config do Banco */}
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-end gap-4">
                                <div className="flex-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-2"><CheckSquare className="w-4 h-4"/> Banco Destino (Recebimento)</label>
                                    <select value={loteForm.contaBancariaId} onChange={e => setLoteForm({...loteForm, contaBancariaId: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-lg font-bold text-slate-700">
                                        <option value="">Selecione o banco de destino</option>
                                        {contasBancarias.filter(b => b.ativa !== false).map((b: any) => (
                                            <option key={b.id} value={b.id}>
                                                {b.nome}{b.empresa ? ` (${b.empresa})` : ''}{b.agencia ? ` — Ag: ${b.agencia}` : ''}{b.conta ? ` Cc: ${b.conta}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3">
                            <button onClick={() => setShowBaixaLote(false)} className="px-6 py-3 rounded-xl text-slate-600 font-bold text-sm bg-slate-100 hover:bg-slate-200 transition-colors">Cancelar</button>
                            <button onClick={processarBaixaLote} className="px-6 py-3 rounded-xl text-white font-bold text-sm bg-emerald-600 hover:bg-emerald-700 shadow-md flex items-center gap-2">
                                <CheckCircle className="w-5 h-5" /> Confirmar Recebimento
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
