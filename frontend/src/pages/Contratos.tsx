import { useToast } from '../contexts/ToastContext';
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Loader2, Plus, X, Calendar, FileText, Search, Filter,
    CheckCircle2, AlertTriangle, AlertCircle, TrendingUp, XCircle, RotateCw, Save 
} from 'lucide-react';
import api from '../services/api';

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface Cliente {
    id: string;
    nome: string;
    documento?: string;
}

interface Contrato {
    id: string;
    codigo: string;
    clienteId: string;
    cliente?: Cliente;
    status: string;
    objeto: string;
    valorMensal: number | string;
    valorTotal?: number | string;
    dataInicio: string;
    dataVencimento: string;
    renovacaoAutomatica: boolean;
    diaVencimentoFatura: number;
    observacoes?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: any }> = {
    ATIVO: { label: 'Ativo', bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle2 },
    A_VENCER: { label: 'A Vencer', bg: 'bg-amber-100', text: 'text-amber-700', icon: AlertTriangle },
    VENCIDO: { label: 'Vencido', bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle },
    CANCELADO: { label: 'Cancelado', bg: 'bg-slate-200', text: 'text-slate-600', icon: XCircle },
    ENCERRADO: { label: 'Encerrado', bg: 'bg-slate-800', text: 'text-slate-300', icon: CheckCircle2 }
};

const formatCurrency = (value: any) => {
    const { showToast } = useToast();
    const num = Number(value);
    if (isNaN(num)) return 'R$ 0,00';
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// ═════════════════════════════════════════════════════════════════════════════
// Component: Contratos
// ═════════════════════════════════════════════════════════════════════════════

export default function Contratos() {
    // ── State ──────────────────────────────────────────────────────────────
    const [contratos, setContratos] = useState<Contrato[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [dashboardMetrics, setDashboardMetrics] = useState<any>({ ativos: 0, vencidos: 0, aVencer30dias: 0, receitaMensalEstimada: 0 });
    
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('TODOS');
    
    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [formData, setFormData] = useState<Partial<Contrato>>({});

    // ── Fetching ───────────────────────────────────────────────────────────
    const fetchData = async () => {
        setLoading(true);
        try {
            const [contratosRes, dashboardRes, clientesRes] = await Promise.all([
                api.get('/contratos'),
                api.get('/contratos/dashboard'),
                api.get('/clientes')
            ]);
            setContratos(contratosRes.data);
            setDashboardMetrics(dashboardRes.data);
            setClientes(clientesRes.data);
        } catch (err: any) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // ── Derived State ──────────────────────────────────────────────────────
    const filteredContratos = useMemo(() => {
        return contratos.filter(c => {
            if (statusFilter !== 'TODOS' && c.status !== statusFilter) return false;
            if (search) {
                const term = search.toLowerCase();
                return c.codigo.toLowerCase().includes(term) || 
                       c.cliente?.nome.toLowerCase().includes(term) ||
                       c.objeto.toLowerCase().includes(term);
            }
            return true;
        });
    }, [contratos, search, statusFilter]);

    // ── Handlers ───────────────────────────────────────────────────────────
    const openCreateModal = () => {
        setFormData({
            status: 'ATIVO',
            valorMensal: 0,
            renovacaoAutomatica: false,
            diaVencimentoFatura: 10,
            dataInicio: new Date().toISOString().split('T')[0],
            dataVencimento: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
        });
        setModalMode('create');
        setModalOpen(true);
    };

    const openEditModal = (contrato: Contrato) => {
        setFormData({
            ...contrato,
            dataInicio: new Date(contrato.dataInicio).toISOString().split('T')[0],
            dataVencimento: new Date(contrato.dataVencimento).toISOString().split('T')[0]
        });
        setModalMode('edit');
        setModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (modalMode === 'create') {
                await api.post('/contratos', formData);
            } else {
                await api.patch(`/contratos/${formData.id}`, formData);
            }
            setModalOpen(false);
            fetchData();
        } catch (err: any) {
            showToast(err.response?.data?.error || 'Erro ao salvar contrato.');
        }
    };

    // ── Components ─────────────────────────────────────────────────────────────
    if (loading && contratos.length === 0) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10">
            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter italic flex items-center gap-3">
                        <FileText className="w-8 h-8 text-blue-600" />
                        Acompanhamento de Contratos
                    </h1>
                    <p className="text-sm text-slate-500 font-medium italic mt-1">
                        Gestão de faturamentos recorrentes e vencimentos de locações
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20"
                >
                    <Plus className="w-4 h-4" /> Novo Contrato
                </button>
            </div>

            {/* ── KPI Dashboard ── */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <FileText className="w-16 h-16 text-blue-600" />
                    </div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Total Ativos</span>
                    <p className="text-3xl font-black text-slate-800">{dashboardMetrics.ativos}</p>
                </div>
                
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <TrendingUp className="w-16 h-16 text-emerald-600" />
                    </div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Receita Mensal Fixa</span>
                    <p className="text-2xl font-black text-emerald-600 mt-1">{formatCurrency(dashboardMetrics.receitaMensalEstimada)}</p>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-amber-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <AlertTriangle className="w-16 h-16 text-amber-600" />
                    </div>
                    <span className="text-[10px] font-black uppercase text-amber-600 tracking-widest block mb-1">A Vencer (30 dias)</span>
                    <p className="text-3xl font-black text-amber-700">{dashboardMetrics.aVencer30dias}</p>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-red-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <AlertCircle className="w-16 h-16 text-red-600" />
                    </div>
                    <span className="text-[10px] font-black uppercase text-red-500 tracking-widest block mb-1">Vencidos Atuais</span>
                    <p className="text-3xl font-black text-red-600">{dashboardMetrics.vencidos}</p>
                </div>
            </div>

            {/* ── Filters ── */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por código, cliente ou objeto..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:font-medium"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                    >
                        <option value="TODOS">Todos os Status</option>
                        {Object.keys(STATUS_CONFIG).map(k => (
                            <option key={k} value={k}>{STATUS_CONFIG[k].label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ── Table / List ── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Contrato / Cliente</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Objeto</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Mensal / Fatura</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Vigência</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredContratos.map(contrato => {
                                const st = STATUS_CONFIG[contrato.status] || STATUS_CONFIG.ATIVO;
                                const Icon = st.icon;
                                return (
                                    <tr 
                                        key={contrato.id} 
                                        onClick={() => openEditModal(contrato)}
                                        className="hover:bg-slate-50/50 cursor-pointer transition-colors group"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="font-black text-slate-800 uppercase tracking-tighter text-sm mb-1">
                                                {contrato.codigo}
                                            </div>
                                            <div className="text-xs font-bold text-slate-500 uppercase">
                                                {contrato.cliente?.nome || '—'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs text-slate-600 font-medium line-clamp-2 max-w-xs" title={contrato.objeto}>
                                                {contrato.objeto}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-black text-emerald-600 block">
                                                {formatCurrency(contrato.valorMensal)}
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase mt-1 flex items-center gap-1">
                                                <Calendar className="w-3 h-3" /> Dia {contrato.diaVencimentoFatura}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs font-bold text-slate-700">
                                                {new Date(contrato.dataInicio).toLocaleDateString()} a {new Date(contrato.dataVencimento).toLocaleDateString()}
                                            </div>
                                            {contrato.renovacaoAutomatica && (
                                                <div className="text-[9px] font-black uppercase text-blue-500 mt-1 flex items-center gap-1">
                                                    <RotateCw className="w-3 h-3" /> Renovação Automática
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${st.bg} ${st.text}`}>
                                                <Icon className="w-3 h-3" /> {st.label}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                            
                            {filteredContratos.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-slate-400">
                                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p className="text-sm font-bold">Nenhum contrato encontrado.</p>
                                        <p className="text-xs mt-1">Ajuste os filtros ou crie um novo contrato.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Modal (Create / Edit) ── */}
            {modalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <form onSubmit={handleSave} className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden border border-slate-200">
                        <div className="bg-blue-600 p-6 flex items-center justify-between">
                            <h2 className="font-black text-white uppercase tracking-tighter text-lg italic flex items-center gap-3">
                                <FileText className="w-6 h-6" />
                                {modalMode === 'create' ? 'Novo Contrato' : 'Editar Contrato'}
                            </h2>
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="text-white/70 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto">
                            
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">Código Referência</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.codigo || ''}
                                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                                    placeholder="Ex: CTR-2024-001"
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-600 transition-all uppercase"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">Cliente</label>
                                <select
                                    required
                                    value={formData.clienteId || ''}
                                    onChange={(e) => setFormData({ ...formData, clienteId: e.target.value })}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-600 transition-all cursor-pointer"
                                >
                                    <option value="" disabled>Selecione um cliente...</option>
                                    {clientes.map(c => (
                                        <option key={c.id} value={c.id}>{c.nome.toUpperCase()}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">Objeto do Contrato</label>
                                <textarea
                                    required
                                    value={formData.objeto || ''}
                                    onChange={(e) => setFormData({ ...formData, objeto: e.target.value })}
                                    placeholder="Descrição detalhada sobre equipamento locado, serviços recorrentes, etc..."
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-600 transition-all min-h-[80px]"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">Valor Mensal (R$)</label>
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    value={formData.valorMensal || ''}
                                    onChange={(e) => setFormData({ ...formData, valorMensal: e.target.value })}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-black text-emerald-600 outline-none focus:border-blue-600 transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">Dia Faturamento</label>
                                <select
                                    value={formData.diaVencimentoFatura || 10}
                                    onChange={(e) => setFormData({ ...formData, diaVencimentoFatura: Number(e.target.value) })}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-600 transition-all cursor-pointer"
                                >
                                    {Array.from({length: 31}, (_, i) => i + 1).map(d => (
                                        <option key={d} value={d}>Todo dia {d}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">Início Vigência</label>
                                <input
                                    required
                                    type="date"
                                    value={formData.dataInicio?.split('T')[0] || ''}
                                    onChange={(e) => setFormData({ ...formData, dataInicio: e.target.value })}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-600 transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">Fim Vigência / Vencimento</label>
                                <input
                                    required
                                    type="date"
                                    value={formData.dataVencimento?.split('T')[0] || ''}
                                    onChange={(e) => setFormData({ ...formData, dataVencimento: e.target.value })}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-600 transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">Status Geral</label>
                                <select
                                    value={formData.status || 'ATIVO'}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-600 transition-all cursor-pointer"
                                >
                                    {Object.keys(STATUS_CONFIG).map(k => (
                                        <option key={k} value={k}>{STATUS_CONFIG[k].label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2 flex items-center mt-6">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <div className="relative">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only peer"
                                            checked={formData.renovacaoAutomatica || false}
                                            onChange={(e) => setFormData({ ...formData, renovacaoAutomatica: e.target.checked })}
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </div>
                                    <span className="text-sm font-bold text-slate-700">Renovação Automática</span>
                                </label>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">Observações Adicionais</label>
                                <textarea
                                    value={formData.observacoes || ''}
                                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-600 transition-all min-h-[60px]"
                                />
                            </div>

                        </div>
                        
                        <div className="bg-slate-50 p-6 flex justify-end gap-3 border-t border-slate-200">
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="px-6 py-3 text-[10px] font-black uppercase text-slate-400 hover:text-red-500 transition-all italic"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-xl shadow-blue-500/20 text-[10px] font-black uppercase italic tracking-widest"
                            >
                                <Save className="w-4 h-4" />
                                {modalMode === 'create' ? 'Salvar Contrato' : 'Atualizar Contrato'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

        </div>
    );
}
