import { useToast } from '../contexts/ToastContext';
import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import {
    Loader2, Plus, X, TrendingUp, TrendingDown, DollarSign,
    AlertTriangle, CheckCircle2, Search,
    Banknote, BarChart3, Layers
} from 'lucide-react';

type Tab = 'pagar' | 'receber' | 'relatorio';

const CATEGORIAS = [
    { key: 'COMBUSTIVEL', label: 'Combustível' },
    { key: 'MANUTENCAO', label: 'Manutenção' },
    { key: 'ALUGUEL', label: 'Aluguel' },
    { key: 'SALARIOS', label: 'Salários' },
    { key: 'IMPOSTOS', label: 'Impostos' },
    { key: 'MATERIAL', label: 'Material' },
    { key: 'OUTROS', label: 'Outros' },
];

const FORMAS_PAGAMENTO = [
    { key: 'PIX', label: 'PIX' },
    { key: 'BOLETO', label: 'Boleto' },
    { key: 'DEBITO_CC', label: 'Débito em Conta' },
    { key: 'TRANSFERENCIA', label: 'Transferência' },
    { key: 'DINHEIRO', label: 'Dinheiro' },
    { key: 'CHEQUE', label: 'Cheque' },
];

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    ABERTO: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Aberto' },
    PAGO: { bg: 'bg-slate-200', text: 'text-slate-800', dot: 'bg-slate-500', label: 'Pago' },
    PAGO_PARCIAL: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Pago Parcial' },
    VENCIDO: { bg: 'bg-slate-900', text: 'text-white', dot: 'bg-slate-400', label: 'Vencido' },
    CANCELADO: { bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400', label: 'Cancelado' },
    PENDENTE: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Pendente' },
    RECEBIDO: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Recebido' },
};

export default function FinanceiroPage() {
    const { showToast } = useToast();
    const [tab, setTab] = useState<Tab>('pagar');
    const [stats, setStats] = useState<any>(null);
    const [pagar, setPagar] = useState<any[]>([]);
    const [receber, setReceber] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [filterStatus, setFilterStatus] = useState('');
    const [filterVencimento, setFilterVencimento] = useState('');
    const [search, setSearch] = useState('');

    // Forms
    const [showForm, setShowForm] = useState(false);
    const [showBaixa, setShowBaixa] = useState<any>(null);
    const [showRelatorio, setShowRelatorio] = useState(false);
    const [relatorio, setRelatorio] = useState<any>(null);
    const [relatorioTipo, setRelatorioTipo] = useState('todos');

    // Selection for batch ops
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [showBaixaLote, setShowBaixaLote] = useState(false);

    // Dropdown data
    const [fornecedores, setFornecedores] = useState<any[]>([]);
    const [clientes, setClientes] = useState<any[]>([]);
    const [planoContasList, setPlanoContasList] = useState<any[]>([]);
    const [contasBancarias, setContasBancarias] = useState<any[]>([]);

    // Create form
    const [formPagar, setFormPagar] = useState({
        descricao: '', fornecedorId: '', categoria: 'OUTROS', naturezaFinanceira: '',
        notaFiscal: '', serieNF: '', valorOriginal: '', dataVencimento: '',
        centroCusto: '', totalParcelas: '1', observacoes: '',
        planoContasId: '', contaBancariaId: '',
    });
    const [formReceber, setFormReceber] = useState({
        descricao: '', clienteId: '', valorOriginal: '', dataVencimento: '', observacoes: ''
    });

    // Baixa form
    const [baixaForm, setBaixaForm] = useState({
        valorPago: '', formaPagamento: 'PIX', banco: '', agencia: '', conta: '',
        valorDesconto: '', observacoes: ''
    });
    const [baixaLoteForm, setBaixaLoteForm] = useState({
        formaPagamento: 'PIX', banco: '', agencia: '', conta: ''
    });

    const fetchAll = useCallback(async () => {
        try {
            const params: any = {};
            if (filterStatus) params.status = filterStatus;
            if (filterVencimento) params.vencimento = filterVencimento;

            const [s, p, r, f, c, pc, cb] = await Promise.all([
                api.get('/financeiro/stats'),
                api.get('/financeiro/contas-pagar', { params }),
                api.get('/financeiro/contas-receber'),
                api.get('/fornecedores').catch(() => ({ data: [] })),
                api.get('/clientes').catch(() => ({ data: [] })),
                api.get('/plano-contas/flat').catch(() => ({ data: [] })),
                api.get('/contas-bancarias').catch(() => ({ data: [] })),
            ]);
            setStats(s.data);
            setPagar(p.data);
            setReceber(r.data);
            setFornecedores(f.data);
            setClientes(c.data);
            setPlanoContasList(pc.data.filter((p: any) => p.tipo === 'ANALITICA'));
            setContasBancarias(cb.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [filterStatus, filterVencimento]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleCreatePagar = async () => {
        try {
            await api.post('/financeiro/contas-pagar', formPagar);
            setShowForm(false);
            setFormPagar({ descricao: '', fornecedorId: '', categoria: 'OUTROS', naturezaFinanceira: '', notaFiscal: '', serieNF: '', valorOriginal: '', dataVencimento: '', centroCusto: '', totalParcelas: '1', observacoes: '', planoContasId: '', contaBancariaId: '' });
            fetchAll();
        } catch (err) { console.error(err); }
    };

    const handleCreateReceber = async () => {
        try {
            await api.post('/financeiro/contas-receber', formReceber);
            setShowForm(false);
            setFormReceber({ descricao: '', clienteId: '', valorOriginal: '', dataVencimento: '', observacoes: '' });
            fetchAll();
        } catch (err) { console.error(err); }
    };

    const handleBaixar = async () => {
        if (!showBaixa) return;
        try {
            await api.patch(`/financeiro/contas-pagar/${showBaixa.id}/baixar`, baixaForm);
            setShowBaixa(null);
            setBaixaForm({ valorPago: '', formaPagamento: 'PIX', banco: '', agencia: '', conta: '', valorDesconto: '', observacoes: '' });
            fetchAll();
        } catch (err) { console.error(err); }
    };

    const handleBaixaLote = async () => {
        try {
            await api.post('/financeiro/contas-pagar/baixar-lote', {
                ids: Array.from(selected),
                ...baixaLoteForm,
            });
            setShowBaixaLote(false);
            setSelected(new Set());
            fetchAll();
        } catch (err) { console.error(err); }
    };

    const handleCancelar = async (id: string) => {
        if (!window.confirm('Cancelar este título?')) return;
        await api.patch(`/financeiro/contas-pagar/${id}/cancelar`, { motivo: 'Cancelado pelo usuário' });
        fetchAll();
    };

    const handleAgruparFatura = async () => {
        try {
            await api.post('/financeiro/contas-pagar/agrupar-fatura', { ids: Array.from(selected) });
            setSelected(new Set());
            fetchAll();
            showToast('Títulos agrupados em um Borderô/Fatura com sucesso!');
        } catch (err: any) {
            showToast(err.response?.data?.error || 'Erro ao agrupar.');
        }
    };

    const handleReceber = async (id: string, valor: number) => {
        await api.patch(`/financeiro/contas-receber/${id}/receber`, { valorRecebido: valor });
        fetchAll();
    };

    const fetchRelatorio = async () => {
        try {
            const res = await api.get('/financeiro/contas-pagar/relatorio', { params: { tipo: relatorioTipo } });
            setRelatorio(res.data);
            setShowRelatorio(true);
        } catch (err) { console.error(err); }
    };

    const toggleSelect = (id: string) => {
        const ns = new Set(selected);
        if (ns.has(id)) ns.delete(id); else ns.add(id);
        setSelected(ns);
    };
    const toggleSelectAll = () => {
        if (selected.size === pagar.filter(t => t.status === 'ABERTO' || t.status === 'PAGO_PARCIAL').length) {
            setSelected(new Set());
        } else {
            const abertos = pagar.filter(t => t.status === 'ABERTO' || t.status === 'PAGO_PARCIAL').map(t => t.id);
            setSelected(new Set(abertos));
        }
    };

    const openBaixa = (titulo: any) => {
        const saldo = titulo.saldoDevedor || titulo.valorOriginal;
        setBaixaForm({ ...baixaForm, valorPago: String(Number(saldo).toFixed(2)) });
        setShowBaixa(titulo);
    };

    const fmt = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

    const filteredPagar = pagar.filter(t => {
        if (!search) return true;
        const s = search.toLowerCase();
        return t.descricao?.toLowerCase().includes(s) || t.fornecedor?.nome?.toLowerCase().includes(s) || t.notaFiscal?.includes(s);
    });

    if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

    return (
        <div className="h-full flex flex-col space-y-4 overflow-hidden">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Financeiro</h1>
                    <p className="text-sm text-slate-500">Contas a Pagar • Contas a Receber • Relatórios</p>
                </div>
                <div className="flex gap-2">
                    {tab === 'pagar' && selected.size > 0 && (
                        <div className="flex gap-2">
                            {selected.size > 1 && (
                                <button onClick={handleAgruparFatura} className="bg-blue-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                                    <Layers className="w-4 h-4" /> Agrupar em Borderô
                                </button>
                            )}
                            <button onClick={() => setShowBaixaLote(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                                <Banknote className="w-4 h-4" /> Baixar {selected.size} Selecionados
                            </button>
                        </div>
                    )}
                    <button onClick={fetchRelatorio} className="bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" /> Relatórios
                    </button>
                    <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                        <Plus className="w-4 h-4" /> {tab === 'pagar' ? 'Nova Conta a Pagar' : 'Nova Conta a Receber'}
                    </button>
                </div>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-5 gap-3">
                    <div className="bg-white rounded-xl border border-slate-200 p-3">
                        <div className="flex items-center gap-2 mb-1"><TrendingDown className="w-4 h-4 text-slate-400" /><p className="text-[10px] font-black text-slate-400 uppercase">A Pagar</p></div>
                        <p className="text-lg font-black text-slate-700">{fmt(stats.totalPagar)}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-3">
                        <div className="flex items-center gap-2 mb-1"><CheckCircle2 className="w-4 h-4 text-slate-500" /><p className="text-[10px] font-black text-slate-400 uppercase">Pago</p></div>
                        <p className="text-lg font-black text-slate-600">{fmt(stats.totalPago)}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-3">
                        <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-emerald-500" /><p className="text-[10px] font-black text-slate-400 uppercase">A Receber</p></div>
                        <p className="text-lg font-black text-emerald-600">{fmt(stats.totalReceber)}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-3">
                        <div className="flex items-center gap-2 mb-1"><DollarSign className="w-4 h-4 text-blue-500" /><p className="text-[10px] font-black text-slate-400 uppercase">Saldo</p></div>
                        <p className={`text-lg font-black ${stats.saldo >= 0 ? 'text-emerald-600' : 'text-slate-800'}`}>{fmt(stats.saldo)}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-3">
                        <div className="flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4 text-slate-400" /><p className="text-[10px] font-black text-slate-400 uppercase">Vencidas</p></div>
                        <p className="text-lg font-black text-slate-700">{stats.vencidasPagar}</p>
                        {stats.totalVencido > 0 && <p className="text-[10px] text-slate-400 font-bold">{fmt(stats.totalVencido)}</p>}
                    </div>
                </div>
            )}

            {/* Tabs + Filters */}
            <div className="flex items-center justify-between">
                <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                    <button onClick={() => setTab('pagar')} className={`px-4 py-1.5 rounded-md text-xs font-bold ${tab === 'pagar' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>
                        Contas a Pagar ({pagar.length})
                    </button>
                    <button onClick={() => setTab('receber')} className={`px-4 py-1.5 rounded-md text-xs font-bold ${tab === 'receber' ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}>
                        Contas a Receber ({receber.length})
                    </button>
                </div>

                {tab === 'pagar' && (
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
                                className="border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs w-48" />
                        </div>
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs">
                            <option value="">Todos Status</option>
                            <option value="ABERTO">🟢 Aberto</option>
                            <option value="PAGO">⚪ Pago</option>
                            <option value="PAGO_PARCIAL">🔵 Parcial</option>
                            <option value="CANCELADO">Cancelado</option>
                        </select>
                        <select value={filterVencimento} onChange={e => setFilterVencimento(e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs">
                            <option value="">Todos</option>
                            <option value="vencidos">⚠️ Vencidos</option>
                            <option value="hoje">📅 Hoje</option>
                            <option value="semana">📆 Esta Semana</option>
                        </select>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="flex-1 overflow-y-auto">
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-slate-50 text-left">
                                {tab === 'pagar' && (
                                    <th className="p-3 w-8">
                                        <input type="checkbox" checked={selected.size > 0 && selected.size === pagar.filter(t => t.status === 'ABERTO' || t.status === 'PAGO_PARCIAL').length}
                                            onChange={toggleSelectAll} className="rounded border-slate-300" />
                                    </th>
                                )}
                                <th className="p-3 font-black text-slate-400 uppercase text-[10px]">Descrição</th>
                                {tab === 'pagar' && <th className="p-3 font-black text-slate-400 uppercase text-[10px]">NF</th>}
                                <th className="p-3 font-black text-slate-400 uppercase text-[10px]">{tab === 'pagar' ? 'Fornecedor' : 'Cliente'}</th>
                                <th className="p-3 font-black text-slate-400 uppercase text-[10px]">Vencimento</th>
                                <th className="p-3 font-black text-slate-400 uppercase text-[10px] text-right">Valor</th>
                                {tab === 'pagar' && <th className="p-3 font-black text-slate-400 uppercase text-[10px] text-right">Saldo</th>}
                                {tab === 'pagar' && <th className="p-3 font-black text-slate-400 uppercase text-[10px]">Atraso</th>}
                                <th className="p-3 font-black text-slate-400 uppercase text-[10px]">Classificação</th>
                                <th className="p-3 font-black text-slate-400 uppercase text-[10px]">Status</th>
                                <th className="p-3 font-black text-slate-400 uppercase text-[10px]">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tab === 'pagar' ? (
                                filteredPagar.length === 0 ? (
                                    <tr><td colSpan={10} className="p-8 text-center text-slate-400">Nenhuma conta a pagar encontrada</td></tr>
                                ) : filteredPagar.map((c: any) => {
                                    const isVencido = (c.status === 'ABERTO' || c.status === 'PAGO_PARCIAL') && new Date(c.dataVencimento) < new Date();
                                    const statusKey = isVencido ? 'VENCIDO' : c.status;
                                    const sc = STATUS_COLORS[statusKey] || STATUS_COLORS.ABERTO;
                                    const canSelect = c.status === 'ABERTO' || c.status === 'PAGO_PARCIAL';

                                    return (
                                        <tr key={c.id} className={`border-t border-slate-100 ${isVencido ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                                            <td className="p-3">
                                                {canSelect && (
                                                    <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} className="rounded border-slate-300" />
                                                )}
                                            </td>
                                            <td className="p-3">
                                                <p className="font-bold text-slate-700">{c.descricao}</p>
                                                {c.totalParcelas > 1 && <p className="text-[10px] text-slate-400">{c.numeroParcela}/{c.totalParcelas}</p>}
                                            </td>
                                            <td className="p-3 text-slate-400 font-mono text-[10px]">{c.notaFiscal || '—'}</td>
                                            <td className="p-3 text-slate-500">{c.fornecedor?.nome || '—'}</td>
                                            <td className="p-3 text-slate-500">{fmtDate(c.dataVencimento)}</td>
                                            <td className="p-3 text-right font-bold text-slate-700">{fmt(Number(c.valorOriginal))}</td>
                                            <td className="p-3 text-right">
                                                {c.saldoDevedor !== null && c.saldoDevedor !== undefined ? (
                                                    <span className={`font-bold ${Number(c.saldoDevedor) > 0 ? 'text-blue-600' : 'text-emerald-600'}`}>
                                                        {fmt(Number(c.saldoDevedor))}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            <td className="p-3">
                                                {c.diasAtraso > 0 && (c.status === 'ABERTO' || c.status === 'PAGO_PARCIAL') ? (
                                                    <span className="text-[10px] font-black text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{c.diasAtraso}d</span>
                                                ) : '—'}
                                                {c.faturaRef && (
                                                    <div className="mt-1">
                                                        <span className="text-[8px] font-black bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded uppercase" title={`Agrupado no Borderô: ${c.faturaRef}`}>Borderô</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                {(() => {
                                                    const pc = planoContasList.find((p: any) => p.id === c.planoContasId);
                                                    return pc ? (
                                                        <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{pc.codigo} {pc.descricao}</span>
                                                    ) : <span className="text-[9px] text-slate-300">—</span>;
                                                })()}
                                            </td>
                                            <td className="p-3">
                                                <span className={`text-[9px] font-black px-2 py-1 rounded-full inline-flex items-center gap-1 ${sc.bg} ${sc.text}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}></span>
                                                    {sc.label}
                                                </span>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex gap-1">
                                                    {canSelect && (
                                                        <button onClick={() => openBaixa(c)} className="text-emerald-600 text-[10px] font-bold hover:underline">
                                                            Baixar
                                                        </button>
                                                    )}
                                                    {c.status !== 'CANCELADO' && c.status !== 'PAGO' && (
                                                        <button onClick={() => handleCancelar(c.id)} className="text-slate-400 text-[10px] font-bold hover:underline ml-1">
                                                            ×
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                receber.length === 0 ? (
                                    <tr><td colSpan={7} className="p-8 text-center text-slate-400">Nenhuma conta a receber encontrada</td></tr>
                                ) : receber.map((c: any) => {
                                    const isVencida = c.status === 'PENDENTE' && new Date(c.dataVencimento) < new Date();
                                    const sc = STATUS_COLORS[isVencida ? 'VENCIDO' : c.status] || STATUS_COLORS.PENDENTE;
                                    return (
                                        <tr key={c.id} className={`border-t border-slate-100 ${isVencida ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                                            <td className="p-3 font-bold text-slate-700">{c.descricao}</td>
                                            <td className="p-3 text-slate-500">{c.cliente?.nome || '—'}</td>
                                            <td className="p-3 text-slate-500">{fmtDate(c.dataVencimento)}</td>
                                            <td className="p-3 text-right font-bold text-slate-700">{fmt(Number(c.valorOriginal))}</td>
                                            <td className="p-3">
                                                <span className={`text-[9px] font-black px-2 py-1 rounded-full inline-flex items-center gap-1 ${sc.bg} ${sc.text}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}></span>
                                                    {sc.label}
                                                </span>
                                            </td>
                                            <td className="p-3">
                                                {c.status === 'PENDENTE' && (
                                                    <button onClick={() => handleReceber(c.id, Number(c.valorOriginal))} className="text-emerald-600 text-[10px] font-bold hover:underline">
                                                        Receber
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Legenda */}
                {tab === 'pagar' && (
                    <div className="flex items-center gap-4 mt-3 px-1">
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span> Aberto
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                            <span className="w-2 h-2 rounded-full bg-slate-400"></span> Pago
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                            <span className="w-2 h-2 rounded-full bg-blue-400"></span> Pago Parcial
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                            <span className="w-2 h-2 rounded-full bg-slate-900"></span> Vencido
                        </div>
                    </div>
                )}
            </div>

            {/* ─── MODAL: Nova Conta ─────────────────────────────────── */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-3 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800">Nova Conta a {tab === 'pagar' ? 'Pagar' : 'Receber'}</h2>
                            <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        {tab === 'pagar' ? (
                            <>
                                <input value={formPagar.descricao} onChange={e => setFormPagar({ ...formPagar, descricao: e.target.value })}
                                    placeholder="Descrição *" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                                <select value={formPagar.fornecedorId} onChange={e => setFormPagar({ ...formPagar, fornecedorId: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm">
                                    <option value="">Fornecedor</option>
                                    {fornecedores.map((f: any) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                                </select>
                                <div className="grid grid-cols-2 gap-3">
                                    <select value={formPagar.categoria} onChange={e => setFormPagar({ ...formPagar, categoria: e.target.value })}
                                        className="border border-slate-200 rounded-lg p-2.5 text-sm">
                                        {CATEGORIAS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                                    </select>
                                    <input value={formPagar.naturezaFinanceira} onChange={e => setFormPagar({ ...formPagar, naturezaFinanceira: e.target.value })}
                                        placeholder="Natureza Financeira" className="border border-slate-200 rounded-lg p-2.5 text-sm" />
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <input value={formPagar.notaFiscal} onChange={e => setFormPagar({ ...formPagar, notaFiscal: e.target.value })}
                                        placeholder="Nº NF" className="border border-slate-200 rounded-lg p-2.5 text-sm" />
                                    <input value={formPagar.serieNF} onChange={e => setFormPagar({ ...formPagar, serieNF: e.target.value })}
                                        placeholder="Série" className="border border-slate-200 rounded-lg p-2.5 text-sm" />
                                    <input value={formPagar.centroCusto} onChange={e => setFormPagar({ ...formPagar, centroCusto: e.target.value })}
                                        placeholder="Centro de Custo" className="border border-slate-200 rounded-lg p-2.5 text-sm" />
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <input type="number" step="0.01" value={formPagar.valorOriginal} onChange={e => setFormPagar({ ...formPagar, valorOriginal: e.target.value })}
                                        placeholder="Valor *" className="border border-slate-200 rounded-lg p-2.5 text-sm" />
                                    <input type="date" value={formPagar.dataVencimento} onChange={e => setFormPagar({ ...formPagar, dataVencimento: e.target.value })}
                                        className="border border-slate-200 rounded-lg p-2.5 text-sm" />
                                    <input type="number" min="1" max="60" value={formPagar.totalParcelas} onChange={e => setFormPagar({ ...formPagar, totalParcelas: e.target.value })}
                                        placeholder="Parcelas" className="border border-slate-200 rounded-lg p-2.5 text-sm" />
                                </div>
                                {/* Plano de Contas and Conta Bancária */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Plano de Contas</label>
                                        <select value={formPagar.planoContasId} onChange={e => setFormPagar({ ...formPagar, planoContasId: e.target.value })}
                                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm">
                                            <option value="">Selecionar conta...</option>
                                            {planoContasList.map((pc: any) => <option key={pc.id} value={pc.id}>{pc.codigo} - {pc.descricao}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Conta Bancária</label>
                                        <select value={formPagar.contaBancariaId} onChange={e => setFormPagar({ ...formPagar, contaBancariaId: e.target.value })}
                                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm">
                                            <option value="">Selecionar conta...</option>
                                            {contasBancarias.map((cb: any) => <option key={cb.id} value={cb.id}>{cb.nome} {cb.banco ? `(${cb.banco})` : ''}</option>)}
                                        </select>
                                    </div>
                                </div>
                                {Number(formPagar.totalParcelas) > 1 && formPagar.valorOriginal && (
                                    <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
                                        📋 {formPagar.totalParcelas}x de {fmt(Number(formPagar.valorOriginal) / Number(formPagar.totalParcelas))}
                                    </div>
                                )}
                                <button onClick={handleCreatePagar} disabled={!formPagar.descricao || !formPagar.valorOriginal || !formPagar.dataVencimento}
                                    className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-bold text-sm disabled:opacity-50">
                                    Criar Conta a Pagar
                                </button>
                            </>
                        ) : (
                            <>
                                <input value={formReceber.descricao} onChange={e => setFormReceber({ ...formReceber, descricao: e.target.value })}
                                    placeholder="Descrição *" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                                <select value={formReceber.clienteId} onChange={e => setFormReceber({ ...formReceber, clienteId: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm">
                                    <option value="">Cliente</option>
                                    {clientes.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                </select>
                                <div className="grid grid-cols-2 gap-3">
                                    <input type="number" step="0.01" value={formReceber.valorOriginal} onChange={e => setFormReceber({ ...formReceber, valorOriginal: e.target.value })}
                                        placeholder="Valor *" className="border border-slate-200 rounded-lg p-2.5 text-sm" />
                                    <input type="date" value={formReceber.dataVencimento} onChange={e => setFormReceber({ ...formReceber, dataVencimento: e.target.value })}
                                        className="border border-slate-200 rounded-lg p-2.5 text-sm" />
                                </div>
                                <button onClick={handleCreateReceber} disabled={!formReceber.descricao || !formReceber.valorOriginal}
                                    className="w-full bg-emerald-600 text-white py-2.5 rounded-xl font-bold text-sm disabled:opacity-50">
                                    Criar Conta a Receber
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ─── MODAL: Baixa Individual ──────────────────────────── */}
            {showBaixa && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800">Baixar Título</h2>
                            <button onClick={() => setShowBaixa(null)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>

                        {/* Resumo do título */}
                        <div className="bg-slate-50 rounded-lg p-3 text-xs space-y-1">
                            <p className="font-bold text-slate-700">{showBaixa.descricao}</p>
                            <p className="text-slate-500">Fornecedor: {showBaixa.fornecedor?.nome || '—'}</p>
                            <div className="flex justify-between mt-1">
                                <span>Valor Original:</span> <span className="font-bold">{fmt(Number(showBaixa.valorOriginal))}</span>
                            </div>
                            {showBaixa.diasAtraso > 0 && (
                                <>
                                    <div className="flex justify-between text-blue-700">
                                        <span>Juros ({showBaixa.diasAtraso} dias):</span> <span className="font-bold">+{fmt(showBaixa.jurosCalculado)}</span>
                                    </div>
                                    <div className="flex justify-between text-blue-700">
                                        <span>Multa (2%):</span> <span className="font-bold">+{fmt(showBaixa.multaCalculada)}</span>
                                    </div>
                                </>
                            )}
                            <div className="flex justify-between font-bold text-slate-800 border-t border-slate-200 pt-1 mt-1">
                                <span>Total:</span> <span>{fmt(showBaixa.valorTotalCalculado || Number(showBaixa.valorOriginal))}</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase">Valor a Pagar *</label>
                                    <input type="number" step="0.01" value={baixaForm.valorPago} onChange={e => setBaixaForm({ ...baixaForm, valorPago: e.target.value })}
                                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm mt-1" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase">Desconto</label>
                                    <input type="number" step="0.01" value={baixaForm.valorDesconto} onChange={e => setBaixaForm({ ...baixaForm, valorDesconto: e.target.value })}
                                        placeholder="0.00" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm mt-1" />
                                </div>
                            </div>

                            <select value={baixaForm.formaPagamento} onChange={e => setBaixaForm({ ...baixaForm, formaPagamento: e.target.value })}
                                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm">
                                {FORMAS_PAGAMENTO.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                            </select>

                            {(baixaForm.formaPagamento === 'DEBITO_CC' || baixaForm.formaPagamento === 'TRANSFERENCIA') && (
                                <div className="grid grid-cols-3 gap-3">
                                    <input value={baixaForm.banco} onChange={e => setBaixaForm({ ...baixaForm, banco: e.target.value })}
                                        placeholder="Banco" className="border border-slate-200 rounded-lg p-2.5 text-sm" />
                                    <input value={baixaForm.agencia} onChange={e => setBaixaForm({ ...baixaForm, agencia: e.target.value })}
                                        placeholder="Agência" className="border border-slate-200 rounded-lg p-2.5 text-sm" />
                                    <input value={baixaForm.conta} onChange={e => setBaixaForm({ ...baixaForm, conta: e.target.value })}
                                        placeholder="Conta" className="border border-slate-200 rounded-lg p-2.5 text-sm" />
                                </div>
                            )}
                        </div>

                        <button onClick={handleBaixar} disabled={!baixaForm.valorPago}
                            className="w-full bg-emerald-600 text-white py-2.5 rounded-xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                            <Banknote className="w-4 h-4" /> Confirmar Baixa
                        </button>
                    </div>
                </div>
            )}

            {/* ─── MODAL: Baixa em Lote ─────────────────────────────── */}
            {showBaixaLote && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-emerald-700">Baixar {selected.size} Títulos em Lote</h2>
                            <button onClick={() => setShowBaixaLote(false)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <div className="bg-emerald-50 rounded-lg p-3 text-xs">
                            <p className="font-bold text-emerald-700">
                                Total: {fmt(pagar.filter(t => selected.has(t.id)).reduce((s: number, t: any) => s + Number(t.saldoDevedor || t.valorOriginal), 0))}
                            </p>
                            <p className="text-emerald-600 mt-1">{selected.size} títulos serão baixados integralmente</p>
                        </div>
                        <select value={baixaLoteForm.formaPagamento} onChange={e => setBaixaLoteForm({ ...baixaLoteForm, formaPagamento: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm">
                            {FORMAS_PAGAMENTO.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                        </select>
                        <button onClick={handleBaixaLote}
                            className="w-full bg-emerald-600 text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                            <Layers className="w-4 h-4" /> Baixar Todos
                        </button>
                    </div>
                </div>
            )}

            {/* ─── MODAL: Relatório ─────────────────────────────────── */}
            {showRelatorio && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800">Relatório de Contas a Pagar</h2>
                            <button onClick={() => setShowRelatorio(false)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <div className="flex gap-2">
                            {['todos', 'pagos', 'vencidos', 'a_vencer'].map(t => (
                                <button key={t} onClick={() => { setRelatorioTipo(t); }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold ${relatorioTipo === t ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                    {t === 'todos' ? 'Todos' : t === 'pagos' ? '⚪ Pagos' : t === 'vencidos' ? '🔵 Vencidos' : '📅 A Vencer'}
                                </button>
                            ))}
                            <button onClick={fetchRelatorio} className="ml-auto bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold">
                                Gerar
                            </button>
                        </div>
                        {relatorio && (
                            <>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                                        <p className="text-[10px] font-black text-slate-400 uppercase">Títulos</p>
                                        <p className="text-xl font-black text-slate-800">{relatorio.total}</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                                        <p className="text-[10px] font-black text-slate-400 uppercase">Valor Total</p>
                                        <p className="text-xl font-black text-slate-800">{fmt(relatorio.totalValor)}</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                                        <p className="text-[10px] font-black text-slate-400 uppercase">Total Pago</p>
                                        <p className="text-xl font-black text-emerald-600">{fmt(relatorio.totalPago)}</p>
                                    </div>
                                </div>

                                {/* Por fornecedor */}
                                {relatorio.porFornecedor?.length > 0 && (
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Por Fornecedor</p>
                                        <div className="space-y-1">
                                            {relatorio.porFornecedor.map((f: any) => (
                                                <div key={f.nome} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-xs">
                                                    <span className="font-bold text-slate-700">{f.nome}</span>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-slate-400">{f.qtd} títulos</span>
                                                        <span className="font-bold text-slate-700">{fmt(f.total)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Tabela */}
                                <div className="max-h-60 overflow-y-auto">
                                    <table className="w-full text-[10px]">
                                        <thead><tr className="bg-slate-50">
                                            <th className="p-2 text-left font-black text-slate-400">Descrição</th>
                                            <th className="p-2 text-left font-black text-slate-400">Fornecedor</th>
                                            <th className="p-2 text-left font-black text-slate-400">Venc.</th>
                                            <th className="p-2 text-right font-black text-slate-400">Valor</th>
                                            <th className="p-2 font-black text-slate-400">Status</th>
                                        </tr></thead>
                                        <tbody>
                                            {relatorio.titulos?.map((t: any) => {
                                                const sc = STATUS_COLORS[t.status] || STATUS_COLORS.ABERTO;
                                                return (
                                                    <tr key={t.id} className="border-t border-slate-100">
                                                        <td className="p-2 text-slate-700 font-bold">{t.descricao}</td>
                                                        <td className="p-2 text-slate-500">{t.fornecedor?.nome || '—'}</td>
                                                        <td className="p-2 text-slate-500">{fmtDate(t.dataVencimento)}</td>
                                                        <td className="p-2 text-right font-bold">{fmt(Number(t.valorOriginal))}</td>
                                                        <td className="p-2"><span className={`px-1.5 py-0.5 rounded ${sc.bg} ${sc.text} font-black`}>{sc.label}</span></td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
