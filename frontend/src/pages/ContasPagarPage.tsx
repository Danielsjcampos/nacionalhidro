import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import {
    Plus, X, Banknote, FileText, BarChart3,
    Search, CheckCircle, UploadCloud,
    Download, CheckSquare, Loader2, Calendar,
    RotateCcw, List, ChevronLeft, ChevronRight, Edit3
} from 'lucide-react';

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    ABERTO: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Aberto' },
    PAGO: { bg: 'bg-slate-200', text: 'text-slate-800', dot: 'bg-slate-500', label: 'Pago' },
    PAGO_PARCIAL: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Pago Parcial' },
    VENCIDO: { bg: 'bg-slate-900', text: 'text-white', dot: 'bg-slate-400', label: 'Vencido' },
    CANCELADO: { bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400', label: 'Cancelado' },
};

export default function ContasPagarPage() {
    const [activeTab, setActiveTab] = useState<'ABERTOS' | 'PAGAR' | 'HISTORICO' | 'CANCELADOS'>('ABERTOS');
    const [pagar, setPagar] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [isEditing, setIsEditing] = useState<string | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Date Range Filter
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    
    // Baixa Lote
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [showBaixaLote, setShowBaixaLote] = useState(false);
    const [loteItems, setLoteItems] = useState<any[]>([]);
    const [loteForm, setLoteForm] = useState({ formaPagamento: 'PIX', banco: '', agencia: '', conta: '' });

    // Editar Baixa
    const [showEditarBaixa, setShowEditarBaixa] = useState<any>(null);
    const [editarForm, setEditarForm] = useState({ valorPago: '', formaPagamento: '', conta: '', observacoes: '', dataPagamento: '' });

    const [fornecedores, setFornecedores] = useState<any[]>([]);
    const [centrosCusto, setCentrosCusto] = useState<any[]>([]);
    const [contasBancarias, setContasBancarias] = useState<any[]>([]);

    const [formPagar, setFormPagar] = useState({
        descricao: '', fornecedorId: '', categoria: 'OUTROS', naturezaFinanceira: '',
        notaFiscal: '', serieNF: '', valorOriginal: '', dataVencimento: '',
        centroCustoId: '', totalParcelas: '1', observacoes: '',
        planoContasId: '', contaBancariaId: '', formaPagamento: '',
        codigoBarras: '', anexoUrl: '', empresa: 'NACIONAL', clienteId: '',
        impostoPis: '', impostoCofins: '', impostoIpi: '', impostoCsll: '', impostoIr: '', ncm: ''
    });

    const [filters, setFilters] = useState({
        id: '', empresa: '', fornecedor: '', nf: '', emissao: '', valor: '',
        vencimento: '', natureza: '', centroCusto: '', entrada: '', cliente: '', usuario: '', status: '', banco: ''
    });

    const [clientes, setClientes] = useState<any[]>([]);

    const fetchAll = useCallback(async () => {
        try {
            const [, p, f, , cb, cc, cl] = await Promise.all([
                api.get('/financeiro/stats'),
                api.get('/financeiro/contas-pagar'),
                api.get('/fornecedores').catch(() => ({ data: [] })),
                api.get('/plano-contas/flat').catch(() => ({ data: [] })),
                api.get('/contas-bancarias').catch(() => ({ data: [] })),
                api.get('/centros-custo').catch(() => ({ data: [] })),
                api.get('/clientes').catch(() => ({ data: [] })),
            ]);

            setPagar(p.data);
            setFornecedores(f.data);
            setContasBancarias(cb.data);
            setCentrosCusto(cc.data);
            setClientes(cl.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleImportXmlFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        try {
            const formData = new FormData();
            formData.append('xml', file);
            
            // Phase 1: Parse
            const parseRes = await api.post('/importacao-xml/parse', formData);
            const nfe = parseRes.data;
            if (nfe.jaImportada) {
                alert('Esta NF-e já foi importada!');
                return;
            }

            // Phase 2: Confirm & Import
            if(confirm(`NF ${nfe.numero} de ${nfe.emitente?.razaoSocial} no valor de R$${nfe.totais?.valorNF}. Deseja importar?`)) {
                await api.post('/importacao-xml/importar', { nfe });
                alert('XML Importado com sucesso!');
                fetchAll();
            }
        } catch (err: any) {
             alert(err.response?.data?.error || 'Erro ao processar XML');
        }
    };

    const handleCreatePagar = async () => {
        try {
            if (isEditing) {
                await api.put(`/financeiro/contas-pagar/${isEditing}`, formPagar);
            } else {
                await api.post('/financeiro/contas-pagar', formPagar);
            }
            setShowForm(false);
            setIsEditing(null);
            setFormPagar({
                descricao: '', fornecedorId: '', categoria: 'OUTROS', naturezaFinanceira: '',
                notaFiscal: '', serieNF: '', valorOriginal: '', dataVencimento: '',
                centroCustoId: '', totalParcelas: '1', observacoes: '',
                planoContasId: '', contaBancariaId: '', formaPagamento: '',
                codigoBarras: '', anexoUrl: '', empresa: 'NACIONAL', clienteId: '',
                impostoPis: '', impostoCofins: '', impostoIpi: '', impostoCsll: '', impostoIr: '', ncm: ''
            });
            fetchAll();
        } catch (err) { console.error(err); }
    };

    const handleEditClick = (item: any) => {
        setIsEditing(item.id);
        setFormPagar({
            descricao: item.descricao || '',
            fornecedorId: item.fornecedorId || '',
            categoria: item.categoria || 'OUTROS',
            naturezaFinanceira: item.naturezaFinanceira || '',
            notaFiscal: item.notaFiscal || '',
            serieNF: item.serieNF || '',
            valorOriginal: item.valorOriginal ? String(item.valorOriginal) : '',
            dataVencimento: item.dataVencimento ? new Date(item.dataVencimento).toISOString().split('T')[0] : '',
            centroCustoId: item.centroCustoId || '',
            totalParcelas: String(item.totalParcelas || '1'),
            observacoes: item.observacoes || '',
            planoContasId: item.planoContasId || '',
            contaBancariaId: item.contaBancariaId || '',
            formaPagamento: item.formaPagamento || '',
            codigoBarras: item.codigoBarras || '',
            anexoUrl: item.anexoUrl || '',
            empresa: item.empresa || 'NACIONAL',
            clienteId: item.clienteId || '',
            impostoPis: item.impostoPis ? String(item.impostoPis) : '',
            impostoCofins: item.impostoCofins ? String(item.impostoCofins) : '',
            impostoIpi: item.impostoIpi ? String(item.impostoIpi) : '',
            impostoCsll: item.impostoCsll ? String(item.impostoCsll) : '',
            impostoIr: item.impostoIr ? String(item.impostoIr) : '',
            ncm: item.ncm || ''
        });
        setShowForm(true);
    };

    const handleCancelar = async (id: string) => {
        if (!confirm('Cancelar este título?')) return;
        await api.patch(`/financeiro/contas-pagar/${id}/cancelar`, { motivo: 'Cancelado pelo usuário' });
        fetchAll();
    };

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

    // Baixa Lote Preparar
    const prepararBaixaLote = () => {
        const items = pagar.filter(p => selected.has(p.id)).map(p => ({
            ...p,
            userDesconto: 0,
            userJuros: 0
        }));
        setLoteItems(items);
        setShowBaixaLote(true);
    };

    const processarBaixaLote = async () => {
        try {
            if (!loteForm.conta) return alert('Selecione o banco de saída para o malote!');

            const titulosBaixa = loteItems.map(i => ({
                id: i.id,
                valorDesconto: i.userDesconto,
                valorJuros: i.userJuros
            }));

            await api.post('/financeiro/contas-pagar/baixar-lote', {
               titulosBaixa,
               formaPagamento: loteForm.formaPagamento,
               conta: loteForm.conta 
            });

            setShowBaixaLote(false);
            setSelected(new Set());
            setActiveTab('HISTORICO');
            fetchAll();
            alert('Baixa em lote realizada com sucesso!');
        } catch (err: any) {
            alert(err.response?.data?.error || 'Erro ao baixar lote');
        }
    };

    const handleEditarBaixaClick = (item: any) => {
        setShowEditarBaixa(item);
        setEditarForm({
            valorPago: String(item.valorPago || item.valorOriginal),
            formaPagamento: item.formaPagamento || 'PIX',
            conta: item.contaBancariaId || '',
            observacoes: '',
            dataPagamento: item.dataPagamento ? new Date(item.dataPagamento).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
        });
    };

    const handleEditarBaixa = async () => {
        try {
            await api.patch(`/financeiro/contas-pagar/${showEditarBaixa.id}/corrigir-baixa`, {
                valorPago: Number(editarForm.valorPago),
                formaPagamento: editarForm.formaPagamento,
                dataPagamento: editarForm.dataPagamento,
                contaBancariaId: editarForm.conta,
                observacoes: editarForm.observacoes
            });
            setShowEditarBaixa(null);
            fetchAll();
            alert('Baixa corrigida com sucesso!');
        } catch (err: any) {
             alert(err.response?.data?.error || 'Erro ao corrigir baixa');
        }
    };

    const exportarExcel = () => {
        if (selected.size === 0) return alert('Selecione itens na aba Pagar');
        const ids = Array.from(selected).join(',');
        window.open(`${api.defaults.baseURL}/financeiro/contas-pagar/exportar-excel?ids=${ids}`, '_blank');
    };

    const exportarCNAB = () => {
        if (selected.size === 0) return alert('Selecione itens na aba Pagar');
        const ids = Array.from(selected).join(',');
        window.open(`${api.defaults.baseURL}/financeiro/contas-pagar/exportar-cnab?ids=${ids}&banco=ITAU`, '_blank');
    };


    const fmt = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

    // Filter pipeline logic
    const displayedData = pagar.filter(t => {
        // Tab status filter
        if (activeTab === 'HISTORICO') {
            if (t.status !== 'PAGO') return false;
        } else if (activeTab === 'CANCELADOS') {
            if (t.status !== 'CANCELADO') return false;
        } else {
            if (t.status !== 'ABERTO' && t.status !== 'PAGO_PARCIAL') return false;
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
            const matches = t.descricao?.toLowerCase().includes(s) || t.fornecedor?.nome?.toLowerCase().includes(s) || t.notaFiscal?.includes(s) || t.empresa?.toLowerCase().includes(s);
            if (!matches) return false;
        }

        // Column filters
        if (filters.id && !t.id.toLowerCase().includes(filters.id.toLowerCase())) return false;
        if (filters.empresa && !t.empresa?.toLowerCase().includes(filters.empresa.toLowerCase())) return false;
        if (filters.fornecedor && !t.fornecedor?.nome?.toLowerCase().includes(filters.fornecedor.toLowerCase())) return false;
        if (filters.nf && !t.notaFiscal?.toLowerCase().includes(filters.nf.toLowerCase())) return false;
        if (filters.valor && !t.valorOriginal?.toString().includes(filters.valor)) return false;
        if (filters.natureza && !t.naturezaFinanceira?.toLowerCase().includes(filters.natureza.toLowerCase())) return false;
        if (filters.centroCusto) {
            const cc = centrosCusto.find(c => c.id === t.centroCustoId);
            if (!cc?.nome?.toLowerCase().includes(filters.centroCusto.toLowerCase())) return false;
        }
        if (filters.cliente) {
            if (!t.clienteRef?.nome?.toLowerCase().includes(filters.cliente.toLowerCase())) return false;
        }
        if (filters.usuario && !t.usuarioCriador?.toLowerCase().includes(filters.usuario.toLowerCase())) return false;
        if (filters.status && !t.status?.toLowerCase().includes(filters.status.toLowerCase())) return false;
        if (filters.banco) {
            const cb = contasBancarias.find(b => b.id === t.contaBancariaId);
            if (!cb?.nome?.toLowerCase().includes(filters.banco.toLowerCase())) return false;
        }

        return true;
    });

    // Totals
    const totalValor = displayedData.reduce((acc: number, c: any) => acc + Number(c.valorOriginal || 0), 0);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(displayedData.length / itemsPerPage));
    const paginatedData = displayedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Reset page on tab/filter change
    useEffect(() => { setCurrentPage(1); }, [activeTab, search, dateFrom, dateTo, filters]);

    const isPendingTab = activeTab === 'ABERTOS' || activeTab === 'PAGAR';

    if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

    return (
        <div className="h-full flex flex-col space-y-4 overflow-hidden">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Contas a Pagar</h1>
                    <p className="text-sm text-slate-500">Pipeline de aprovação e pagamentos</p>
                </div>
                <div className="flex gap-2">
                    <input type="file" id="import-xml" accept=".xml" className="hidden" onChange={handleImportXmlFile} />
                    <label htmlFor="import-xml" className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-sm">
                        <UploadCloud className="w-4 h-4" /> Importar XML
                    </label>
                    
                    <button onClick={() => { setIsEditing(null); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20">
                        <Plus className="w-4 h-4" /> Nova Conta
                    </button>
                </div>
            </div>

            {/* PIPELINE TABS */}
            <div className="flex bg-slate-100/50 p-1 rounded-xl w-max border border-slate-200 shadow-sm">
                <button onClick={() => setActiveTab('ABERTOS')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'ABERTOS' ? 'bg-white text-blue-700 shadow border border-slate-200' : 'text-slate-500 hover:bg-slate-200/50'}`}>
                    1. Cadastrar
                </button>
                <button onClick={() => setActiveTab('PAGAR')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'PAGAR' ? 'bg-white text-blue-700 shadow border border-slate-200' : 'text-slate-500 hover:bg-slate-200/50'}`}>
                    2. Pagar
                </button>
                <button onClick={() => setActiveTab('HISTORICO')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'HISTORICO' ? 'bg-white text-blue-700 shadow border border-slate-200' : 'text-slate-500 hover:bg-slate-200/50'}`}>
                    3. Pago(s)
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
                            className="border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm w-56 focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    {/* LEGENDS */}
                    <div className="flex items-center gap-3 text-[10px] font-bold">
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> Pagamento atrasado</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span> Pagamento parcial</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-800 inline-block"></span> Conta em correção</span>
                    </div>
                </div>

                {activeTab === 'PAGAR' && selected.size > 0 && (
                    <div className="flex gap-2 animate-in fade-in zoom-in-95 duration-200">
                        <button onClick={exportarExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm">
                            <Download className="w-4 h-4" /> Exportar Relatório Diretoria
                        </button>
                        <button onClick={exportarCNAB} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm">
                            <Download className="w-4 h-4" /> Gerar CNAB
                        </button>
                        <button onClick={prepararBaixaLote} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm">
                            <Banknote className="w-4 h-4" /> Efetuar Pagamento Lote ({selected.size})
                        </button>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-auto bg-white rounded-xl shadow-sm border border-slate-200">
                <table className="w-full text-[11px] whitespace-nowrap min-w-max">
                    <thead className="sticky top-0 bg-white z-10">
                        <tr className="bg-slate-50 border-b border-slate-200 text-left">
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider w-10 text-center">Ações</th>
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider w-20 text-center">Status</th>
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider w-16 text-center">ID</th>
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">Empresa</th>
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">Fornecedor</th>
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">Nº NF</th>
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider text-center">Emissão NF</th>
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider text-right">Valor a Pagar (R$)</th>
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider text-center">Parcela</th>
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider text-center">Vencimento</th>
                            {(activeTab === 'HISTORICO' || activeTab === 'CANCELADOS') && (
                                <>
                                    <th className="p-3 font-bold text-slate-500 uppercase tracking-wider text-center">Data de Pag.</th>
                                    <th className="p-3 font-bold text-slate-500 uppercase tracking-wider text-right">Valor Pago (R$)</th>
                                    <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">Banco Pag.</th>
                                </>
                            )}
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">Naturezas Contábeis</th>
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">Centros de Custo</th>
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider text-center">Data de Entrada</th>
                            {(activeTab === 'HISTORICO' || activeTab === 'CANCELADOS') && (
                                <th className="p-3 font-bold text-slate-500 uppercase tracking-wider text-center">Parcial</th>
                            )}
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">Observações</th>
                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">Usuário</th>
                            {activeTab === 'PAGAR' && (
                                <th className="p-3 w-10 text-center">
                                    <input type="checkbox" checked={selected.size > 0 && selected.size === displayedData.length}
                                        onChange={() => toggleSelectAll(displayedData)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                </th>
                            )}
                        </tr>
                        {/* FILTER ROW */}
                        <tr className="bg-slate-50/50 border-b border-slate-200">
                            <td className="p-1 px-2"></td>
                            <td className="p-1 px-2"><input value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})} className="w-full border border-slate-200 rounded p-1.5 text-[10px] bg-white outline-none focus:border-blue-400" placeholder="Filtrar..." /></td>
                            <td className="p-1 px-2"><input value={filters.id} onChange={e => setFilters({...filters, id: e.target.value})} className="w-full border border-slate-200 rounded p-1.5 text-[10px] bg-white outline-none focus:border-blue-400" placeholder="Filtrar..." /></td>
                            <td className="p-1 px-2"><input value={filters.empresa} onChange={e => setFilters({...filters, empresa: e.target.value})} className="w-full border border-slate-200 rounded p-1.5 text-[10px] bg-white outline-none focus:border-blue-400" placeholder="Filtrar..." /></td>
                            <td className="p-1 px-2"><input value={filters.fornecedor} onChange={e => setFilters({...filters, fornecedor: e.target.value})} className="w-full border border-slate-200 rounded p-1.5 text-[10px] bg-white outline-none focus:border-blue-400" placeholder="Filtrar..." /></td>
                            <td className="p-1 px-2"><input value={filters.nf} onChange={e => setFilters({...filters, nf: e.target.value})} className="w-full border border-slate-200 rounded p-1.5 text-[10px] bg-white outline-none focus:border-blue-400" placeholder="Filtrar..." /></td>
                            <td className="p-1 px-2"><input value={filters.emissao} onChange={e => setFilters({...filters, emissao: e.target.value})} className="w-full border border-slate-200 rounded p-1.5 text-[10px] bg-white text-center outline-none focus:border-blue-400" placeholder="Filtrar..." /></td>
                            <td className="p-1 px-2"><input value={filters.valor} onChange={e => setFilters({...filters, valor: e.target.value})} className="w-full border border-slate-200 rounded p-1.5 text-[10px] bg-white text-right outline-none focus:border-blue-400" placeholder="Filtrar..." /></td>
                            <td className="p-1 px-2"><input value={filters.vencimento} onChange={e => setFilters({...filters, vencimento: e.target.value})} className="w-full border border-slate-200 rounded p-1.5 text-[10px] bg-white text-center outline-none focus:border-blue-400" placeholder="Filtrar..." /></td>
                            <td className="p-1 px-2"><input value={filters.natureza} onChange={e => setFilters({...filters, natureza: e.target.value})} className="w-full border border-slate-200 rounded p-1.5 text-[10px] bg-white outline-none focus:border-blue-400" placeholder="Filtrar..." /></td>
                            <td className="p-1 px-2"><input value={filters.centroCusto} onChange={e => setFilters({...filters, centroCusto: e.target.value})} className="w-full border border-slate-200 rounded p-1.5 text-[10px] bg-white outline-none focus:border-blue-400" placeholder="Filtrar..." /></td>
                            <td className="p-1 px-2"><input value={filters.entrada} onChange={e => setFilters({...filters, entrada: e.target.value})} className="w-full border border-slate-200 rounded p-1.5 text-[10px] bg-white text-center outline-none focus:border-blue-400" placeholder="Filtrar..." /></td>
                            {(activeTab === 'HISTORICO' || activeTab === 'CANCELADOS') && (
                                <td className="p-1 px-2"><input value={filters.banco} onChange={e => setFilters({...filters, banco: e.target.value})} className="w-full border border-slate-200 rounded p-1.5 text-[10px] bg-white outline-none focus:border-blue-400" placeholder="Filtrar..." /></td>
                            )}
                            <td className="p-1 px-2"><input value={filters.cliente} onChange={e => setFilters({...filters, cliente: e.target.value})} className="w-full border border-slate-200 rounded p-1.5 text-[10px] bg-white outline-none focus:border-blue-400" placeholder="Filtrar..." /></td>
                            <td className="p-1 px-2"><input value={filters.usuario} onChange={e => setFilters({...filters, usuario: e.target.value})} className="w-full border border-slate-200 rounded p-1.5 text-[10px] bg-white outline-none focus:border-blue-400" placeholder="Filtrar..." /></td>
                            {activeTab === 'PAGAR' && <td className="p-1 px-2"></td>}
                        </tr>
                    </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedData.length === 0 ? (
                                <tr><td colSpan={20} className="p-8 text-center text-slate-400">Nenhum registro nesta etapa.</td></tr>
                            ) : paginatedData.map((c: any) => {
                                const isVencido = isPendingTab && new Date(c.dataVencimento) < new Date();
                                const sc = STATUS_COLORS[isVencido ? 'VENCIDO' : c.status] || STATUS_COLORS.ABERTO;

                                return (
                                    <tr key={c.id} className={`hover:bg-slate-50 transition-colors ${isVencido ? 'bg-red-50/10 border-l-2 border-l-red-400' : ''}`}>
                                        <td className="p-2 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                {activeTab === 'ABERTOS' && (
                                                    <>
                                                        <button onClick={() => handleEditClick(c)} className="text-blue-600 hover:text-blue-800 p-1" title="Editar"><FileText className="w-3.5 h-3.5"/></button>
                                                        <button onClick={() => handleCancelar(c.id)} className="text-red-500 hover:text-red-700 p-1" title="Cancelar"><X className="w-3.5 h-3.5"/></button>
                                                    </>
                                                )}
                                                {activeTab === 'PAGAR' && (
                                                    <button onClick={() => handleCancelar(c.id)} className="text-red-500 hover:text-red-700 p-1" title="Cancelar"><X className="w-3.5 h-3.5"/></button>
                                                )}
                                                {activeTab === 'HISTORICO' && (
                                                    <>
                                                        <button onClick={() => handleEditarBaixaClick(c)} className="text-blue-600 hover:text-blue-800 p-1" title="Corrigir Baixa"><Edit3 className="w-3.5 h-3.5"/></button>
                                                        <button onClick={() => { if(confirm('Revogar pagamento e voltar para etapa Pagar?')) { api.patch(`/financeiro/contas-pagar/${c.id}/revogar`).then(() => fetchAll()).catch(() => alert('Erro ao revogar')); } }} className="text-amber-600 hover:text-amber-800 p-1" title="Revogar / Voltar"><RotateCcw className="w-3.5 h-3.5"/></button>
                                                        <button onClick={() => alert(`Histórico:\n• Entrada: ${fmtDate(c.createdAt)}\n• Vencimento: ${fmtDate(c.dataVencimento)}\n• Pagamento: ${fmtDate(c.dataPagamento || c.updatedAt)}`)} className="text-slate-500 hover:text-slate-700 p-1" title="Ver Histórico"><List className="w-3.5 h-3.5"/></button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-2 text-center text-[10px]">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold uppercase tracking-tight ${sc.bg} ${sc.text}`}>
                                                {sc.label}
                                            </span>
                                        </td>
                                        <td className="p-2 text-center text-slate-400 font-mono text-[9px]">{c.id.substring(0, 5)}</td>
                                        <td className="p-2 font-medium text-slate-600 truncate max-w-[80px]">{c.empresa || 'NACIONAL'}</td>
                                        <td className="p-2 text-slate-600 font-medium truncate max-w-[120px]">{c.fornecedor?.nome || '—'}</td>
                                        <td className="p-2 text-slate-500 font-mono">{c.notaFiscal || '—'}</td>
                                        <td className="p-2 px-3 text-center text-slate-500 font-mono">{fmtDate(c.dataEmissao)}</td>
                                        <td className="p-2 px-3 text-right">
                                            <p className="font-bold text-slate-800">{fmt(Number(c.valorOriginal))}</p>
                                        </td>
                                        <td className="p-2 px-3 text-center text-slate-500 font-medium bg-slate-50 rounded">{`${c.numeroParcela || 1} de ${c.totalParcelas || 1}`}</td>
                                        <td className={`p-2 px-3 text-center font-bold ${isVencido ? 'text-red-600 text-[12px]' : 'text-slate-600'}`}>
                                            {fmtDate(c.dataVencimento)}
                                        </td>
                                        {(activeTab === 'HISTORICO' || activeTab === 'CANCELADOS') && (
                                            <>
                                                <td className="p-2 px-3 text-center text-slate-500 font-mono">{fmtDate(c.dataPagamento || c.updatedAt)}</td>
                                                <td className="p-2 px-3 text-right font-bold text-emerald-700">{fmt(Number(c.valorPago || c.valorOriginal || 0))}</td>
                                                <td className="p-2 px-3 text-slate-600 truncate max-w-[120px]">
                                                    {(() => {
                                                        const cb = contasBancarias.find(b => b.id === c.contaBancariaId);
                                                        return cb ? <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[10px]">{cb.nome}{cb.empresa ? ` (${cb.empresa})` : ''}</span> : <span className="text-slate-400">—</span>;
                                                    })()}
                                                </td>
                                            </>
                                        )}
                                        <td className="p-2 px-3 text-slate-500 italic max-w-[150px] truncate">{c.naturezaFinanceira || '—'}</td>
                                        <td className="p-2 px-3">
                                             {(() => {
                                                const cc = centrosCusto.find((p: any) => p.id === c.centroCustoId);
                                                return cc ? <span className="font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md max-w-[150px] inline-block truncate align-middle">{cc.nome}</span> : <span className="text-slate-400">—</span>;
                                            })()}
                                        </td>
                                        <td className="p-2 px-3 text-center text-slate-400 italic font-mono">{fmtDate(c.createdAt)}</td>
                                        {(activeTab === 'HISTORICO' || activeTab === 'CANCELADOS') && (
                                            <td className="p-2 px-3 text-center text-slate-500 font-medium">{c.pagamentoParcial ? 'Sim' : 'Não'}</td>
                                        )}
                                        <td className="p-2 px-3 text-slate-600 truncate max-w-[150px]">{c.clienteRef?.nome || '—'}</td>
                                        <td className="p-2 px-3 text-slate-400 italic truncate max-w-[120px]">{c.observacoes || '—'}</td>
                                        <td className="p-2 px-3 text-slate-500 truncate max-w-[120px]">{c.usuarioCriador || '—'}</td>
                                        {activeTab === 'PAGAR' && (
                                            <td className="p-2 px-3 text-center">
                                                 <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} className="rounded border-slate-300 text-blue-600 w-4 h-4 cursor-pointer" />
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
                        {activeTab === 'HISTORICO' ? 'Valor pago: ' : 'Valor à pagar: '}
                        <span className="text-blue-700">{fmt(totalValor)}</span>
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

            {/* MODALS */}

            {showForm && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">{isEditing ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}</h2>
                                <p className="text-sm text-slate-500 mt-1">Insira os detalhes e espelhamento de impostos</p>
                            </div>
                            <button onClick={() => { setShowForm(false); setIsEditing(null); }} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto bg-slate-50 flex-1 space-y-6">
                            {/* Bloco Primário */}
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-blue-600" /> Dados Básicos
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-400 uppercase mb-1.5 block">Empresa *</label>
                                        <select value={formPagar.empresa} onChange={e => setFormPagar({ ...formPagar, empresa: e.target.value })}
                                            className="w-full border border-slate-200 focus:border-blue-500 rounded-lg p-2.5 text-sm outline-none bg-blue-50/30">
                                            <option value="NACIONAL">NACIONAL HIDRO</option>
                                            <option value="HIDRO">HIDRO LOCAÇÕES</option>
                                            <option value="OUTRA">OUTRA</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-400 uppercase mb-1.5 block">Descrição *</label>
                                        <input value={formPagar.descricao} onChange={e => setFormPagar({ ...formPagar, descricao: e.target.value })}
                                            className="w-full border border-slate-200 focus:border-blue-500 rounded-lg p-2.5 text-sm outline-none" placeholder="Ex: Conta de Luz" />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-400 uppercase mb-1.5 block">Fornecedor</label>
                                        <select value={formPagar.fornecedorId} onChange={e => setFormPagar({ ...formPagar, fornecedorId: e.target.value })}
                                            className="w-full border border-slate-200 focus:border-blue-500 rounded-lg p-2.5 text-sm outline-none">
                                            <option value="">Selecione um fornecedor</option>
                                            {fornecedores.map((f: any) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-400 uppercase mb-1.5 block">Nº Nota Fiscal</label>
                                        <input value={formPagar.notaFiscal} onChange={e => setFormPagar({ ...formPagar, notaFiscal: e.target.value })}
                                            className="w-full border border-slate-200 focus:border-blue-500 rounded-lg p-2.5 text-sm outline-none" placeholder="000.000" />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-400 uppercase mb-1.5 block">Natureza Financeira</label>
                                        <input value={formPagar.naturezaFinanceira} onChange={e => setFormPagar({ ...formPagar, naturezaFinanceira: e.target.value })}
                                            className="w-full border border-slate-200 focus:border-blue-500 rounded-lg p-2.5 text-sm outline-none" placeholder="Ex: MANUTENÇÃO" />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-400 uppercase mb-1.5 block">Centro de Custo</label>
                                        <select value={formPagar.centroCustoId} onChange={e => setFormPagar({ ...formPagar, centroCustoId: e.target.value })}
                                            className="w-full border border-slate-200 focus:border-blue-500 rounded-lg p-2.5 text-sm outline-none">
                                            <option value="">Nenhum</option>
                                            {centrosCusto.map((cc: any) => (
                                                <option key={cc.id} value={cc.id}>{cc.nome}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-400 uppercase mb-1.5 block">Vinculo Cliente (Opcional)</label>
                                        <select value={formPagar.clienteId} onChange={e => setFormPagar({ ...formPagar, clienteId: e.target.value })}
                                            className="w-full border border-slate-200 focus:border-blue-500 rounded-lg p-2.5 text-sm outline-none">
                                            <option value="">Selecione um cliente se houver repasse</option>
                                            {clientes.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-400 uppercase mb-1.5 block">Valor (R$) *</label>
                                        <input type="number" step="0.01" value={formPagar.valorOriginal} onChange={e => setFormPagar({ ...formPagar, valorOriginal: e.target.value })}
                                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm font-semibold text-blue-700 outline-none" placeholder="0.00" />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-400 uppercase mb-1.5 block">Vencimento *</label>
                                        <input type="date" value={formPagar.dataVencimento} onChange={e => setFormPagar({ ...formPagar, dataVencimento: e.target.value })}
                                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none" />
                                    </div>
                                </div>
                            </div>

                            {/* Impostos (Espelhamento de Nota) */}
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4 text-blue-600" /> Tributação (Espelhamento)
                                </h3>
                                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">PIS (R$)</label>
                                        <input type="number" step="0.01" value={formPagar.impostoPis} onChange={e => setFormPagar({ ...formPagar, impostoPis: e.target.value })}
                                            className="w-full border border-slate-200 rounded bg-slate-50 p-2 text-xs" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">COFINS (R$)</label>
                                        <input type="number" step="0.01" value={formPagar.impostoCofins} onChange={e => setFormPagar({ ...formPagar, impostoCofins: e.target.value })}
                                            className="w-full border border-slate-200 rounded bg-slate-50 p-2 text-xs" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">IPI (R$)</label>
                                        <input type="number" step="0.01" value={formPagar.impostoIpi} onChange={e => setFormPagar({ ...formPagar, impostoIpi: e.target.value })}
                                            className="w-full border border-slate-200 rounded bg-slate-50 p-2 text-xs" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">CSLL (R$)</label>
                                        <input type="number" step="0.01" value={formPagar.impostoCsll} onChange={e => setFormPagar({ ...formPagar, impostoCsll: e.target.value })}
                                            className="w-full border border-slate-200 rounded bg-slate-50 p-2 text-xs" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">IR (R$)</label>
                                        <input type="number" step="0.01" value={formPagar.impostoIr} onChange={e => setFormPagar({ ...formPagar, impostoIr: e.target.value })}
                                            className="w-full border border-slate-200 rounded bg-slate-50 p-2 text-xs" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Cód NCM</label>
                                        <input value={formPagar.ncm} onChange={e => setFormPagar({ ...formPagar, ncm: e.target.value })}
                                            className="w-full border border-slate-200 rounded bg-slate-50 p-2 text-xs" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3">
                            <button onClick={() => { setShowForm(false); setIsEditing(null); }} className="px-5 py-2.5 rounded-lg text-slate-600 font-bold text-sm bg-slate-100 hover:bg-slate-200">
                                Cancelar
                            </button>
                            <button onClick={handleCreatePagar} disabled={!formPagar.descricao || !formPagar.valorOriginal || !formPagar.dataVencimento}
                                className="px-5 py-2.5 rounded-lg text-white font-bold text-sm bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 disabled:opacity-50">
                                {isEditing ? 'Salvar Alterações' : 'Salvar Despesa'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL LOTE BAIXA */}

            {showBaixaLote && (
                 <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
                 <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
                     <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-blue-600 text-white">
                         <div>
                             <h2 className="text-xl font-bold flex items-center gap-2"><Banknote className="w-5 h-5"/> Processar Pagamento em Lote</h2>
                             <p className="text-sm text-blue-100 mt-1">Insira descontos e juros manualmente antes da baixa.</p>
                         </div>
                         <button onClick={() => setShowBaixaLote(false)}><X className="w-6 h-6 text-white hover:text-blue-200" /></button>
                     </div>

                     <div className="p-6 bg-slate-50 flex-1 overflow-y-auto">
                         <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                             <table className="w-full text-xs">
                                 <thead>
                                     <tr className="bg-slate-50 border-b border-slate-200 text-left">
                                         <th className="p-3 font-semibold text-slate-500">Descrição</th>
                                         <th className="p-3 font-semibold text-slate-500 text-right">Valor Orig.</th>
                                         <th className="p-3 font-semibold text-slate-500 text-center">Juros Adic. (R$)</th>
                                         <th className="p-3 font-semibold text-slate-500 text-center">Desconto (R$)</th>
                                         <th className="p-3 font-semibold text-slate-500 text-right">Total Final (R$)</th>
                                     </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-100">
                                     {loteItems.map((item, idx) => {
                                         const final = Number(item.valorOriginal) + Number(item.userJuros || 0) - Number(item.userDesconto || 0);
                                         return (
                                             <tr key={item.id} className="hover:bg-slate-50">
                                                 <td className="p-3 font-bold text-slate-700">{item.descricao}</td>
                                                 <td className="p-3 text-right">{fmt(Number(item.valorOriginal))}</td>
                                                 <td className="p-3 text-center w-32">
                                                     <input type="number" step="0.01" value={item.userJuros} 
                                                         onChange={e => {
                                                             const neo = [...loteItems];
                                                             neo[idx].userJuros = Number(e.target.value);
                                                             setLoteItems(neo);
                                                         }}
                                                         className="w-24 text-center border border-slate-200 p-1.5 focus:border-blue-500 rounded text-amber-600 font-bold" />
                                                 </td>
                                                 <td className="p-3 text-center w-32">
                                                     <input type="number" step="0.01" value={item.userDesconto} 
                                                         onChange={e => {
                                                             const neo = [...loteItems];
                                                             neo[idx].userDesconto = Number(e.target.value);
                                                             setLoteItems(neo);
                                                         }}
                                                         className="w-24 text-center border border-slate-200 p-1.5 focus:border-blue-500 rounded text-emerald-600 font-bold" />
                                                 </td>
                                                 <td className="p-3 text-right font-black text-blue-700 bg-blue-50/50">{fmt(final)}</td>
                                             </tr>
                                         )
                                     })}
                                 </tbody>
                                 <tfoot className="bg-slate-100 font-bold text-sm">
                                     <tr>
                                         <td colSpan={4} className="p-3 text-right uppercase text-slate-500">Total do Malote:</td>
                                         <td className="p-3 text-right text-blue-800 text-base">
                                             {fmt(loteItems.reduce((acc, item) => acc + Number(item.valorOriginal) + Number(item.userJuros||0) - Number(item.userDesconto||0), 0))}
                                         </td>
                                     </tr>
                                 </tfoot>
                             </table>
                         </div>

                         {/* Config do Banco */}
                         <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-end gap-4">
                            <div className="flex-1">
                                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-2"><CheckSquare className="w-4 h-4"/> Banco Saída (Malote)</label>
                                <select value={loteForm.conta} onChange={e => setLoteForm({...loteForm, conta: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-lg font-bold text-slate-700">
                                    <option value="">Selecione o banco de saída</option>
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
                         <button onClick={processarBaixaLote} className="px-6 py-3 rounded-xl text-white font-bold text-sm bg-blue-600 hover:bg-blue-700 shadow-md flex items-center gap-2">
                            <CheckCircle className="w-5 h-5" /> Confirmar e Baixar Tudo
                         </button>
                     </div>
                 </div>
             </div>
            )}

            {/* MODAL: Editar Baixa (Correction) */}
            {showEditarBaixa && (
                 <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                            <h2 className="text-lg font-bold text-slate-800">Corrigir Detalhes do Pagamento</h2>
                            <button onClick={() => setShowEditarBaixa(null)}><X className="w-5 h-5 text-slate-400 hover:text-blue-500" /></button>
                        </div>
                        <p className="font-bold text-blue-800 text-[10px] mb-4 bg-blue-50 p-3 rounded-lg uppercase tracking-tight">AJUSTE VALORES, DATA, FORMA DE PAGAMENTO OU BANCO SEM PRECISAR REVOGAR O TÍTULO.</p>

                        <div>
                            <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Valor Pago (R$)</label>
                            <input type="number" step="0.01" value={editarForm.valorPago} onChange={e => setEditarForm({ ...editarForm, valorPago: e.target.value })}
                                className="w-full border border-slate-200 rounded-lg p-2.5 text-lg font-bold text-blue-700 outline-none focus:border-blue-400" />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Data do Pagamento</label>
                            <input type="date" value={editarForm.dataPagamento} onChange={e => setEditarForm({ ...editarForm, dataPagamento: e.target.value })}
                                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm font-bold text-slate-700" />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Forma de Pagamento</label>
                            <select value={editarForm.formaPagamento} onChange={e => setEditarForm({ ...editarForm, formaPagamento: e.target.value })}
                                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm font-bold text-slate-700">
                                <option value="PIX">PIX</option>
                                <option value="BOLETO">Boleto (DDA)</option>
                                <option value="TRANSFERENCIA">Transferência / TED</option>
                                <option value="CARTAO">Cartão Corporativo</option>
                                <option value="DEPOSITO">Depósito</option>
                                <option value="DINHEIRO">Dinheiro (Caixinha)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Banco Origem (Saída)</label>
                            <select value={editarForm.conta} onChange={e => setEditarForm({ ...editarForm, conta: e.target.value })}
                                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm font-bold text-slate-700">
                                <option value="">Selecione o banco</option>
                                {contasBancarias.filter(b => b.ativa !== false).map((b: any) => (
                                    <option key={b.id} value={b.id}>
                                        {b.nome}{b.empresa ? ` (${b.empresa})` : ''}{b.agencia ? ` — Ag: ${b.agencia}` : ''}{b.conta ? ` Cc: ${b.conta}` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Motivo da Correção / Observações</label>
                            <textarea value={editarForm.observacoes} onChange={e => setEditarForm({ ...editarForm, observacoes: e.target.value })}
                                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-blue-400 h-20 resize-none" placeholder="Ex: Ajuste de centavos ou correção de banco de saída..." />
                        </div>
                        <button onClick={handleEditarBaixa} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 mt-4 shadow-lg shadow-blue-500/20 transition-all">
                            <CheckCircle className="w-5 h-5" /> Salvar Correções
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

