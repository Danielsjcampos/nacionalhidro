import { useEffect, useState } from 'react';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import {
    Loader2, RefreshCw, AlertTriangle, Search, Download,
    Plus, X, Edit3, Trash2, Stethoscope
} from 'lucide-react';

const ASO_TIPOS = ['ADMISSIONAL', 'PERIODICO', 'DEMISSIONAL', 'RETORNO_TRABALHO', 'MUDANCA_FUNCAO'];
const ASO_RESULTADOS = ['APTO', 'INAPTO'];

interface Funcionario { id: string; nome: string; }

const emptyForm = {
    funcionarioId: '',
    tipo: 'PERIODICO',
    clinica: '',
    dataExame: new Date().toISOString().substring(0, 10),
    dataVencimento: '',
    resultado: '',
    observacoes: '',
};

export default function ASOControlePage() {
    const { showToast } = useToast();
    const [asos, setAsos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filtroTipo, setFiltroTipo] = useState('');
    const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({ ...emptyForm });
    const [saving, setSaving] = useState(false);

    const fetchAll = async () => {
        try {
            setLoading(true);
            const [asoRes, funcRes] = await Promise.all([
                api.get('/asos'),
                api.get('/rh'),
            ]);
            setAsos(asoRes.data);
            setFuncionarios(funcRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    const handleExportCSV = async () => {
        try {
            const res = await api.get('/relatorios-rh/asos?formato=csv', { responseType: 'blob' });
            const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'asos_controle.csv';
            link.click();
        } catch (err) { console.error(err); }
    };

    const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

    const filtered = asos.filter(a => {
        const nome = a.funcionario?.nome || '';
        const matchSearch = !search || nome.toLowerCase().includes(search.toLowerCase());
        const matchTipo = !filtroTipo || a.tipo === filtroTipo;
        return matchSearch && matchTipo;
    });

    const vencidas = filtered.filter(a => a.diasRestantes !== null && a.diasRestantes < 0);
    const vencendo = filtered.filter(a => a.diasRestantes !== null && a.diasRestantes >= 0 && a.diasRestantes <= 30);
    const ok = filtered.filter(a => a.diasRestantes === null || a.diasRestantes > 30);

    const openNew = () => {
        setEditingId(null);
        setForm({ ...emptyForm });
        setShowModal(true);
    };

    const openEdit = (aso: any) => {
        setEditingId(aso.id);
        setForm({
            funcionarioId: aso.funcionarioId || '',
            tipo: aso.tipo || 'PERIODICO',
            clinica: aso.clinica || '',
            dataExame: aso.dataExame ? new Date(aso.dataExame).toISOString().substring(0, 10) : '',
            dataVencimento: aso.dataVencimento ? new Date(aso.dataVencimento).toISOString().substring(0, 10) : '',
            resultado: aso.resultado || '',
            observacoes: aso.observacoes || '',
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.funcionarioId || !form.tipo) {
            showToast('Funcionário e Tipo são obrigatórios', 'error');
            return;
        }
        try {
            setSaving(true);
            const payload = {
                ...form,
                resultado: form.resultado || null,
                clinica: form.clinica || null,
                dataExame: form.dataExame || null,
                dataVencimento: form.dataVencimento || null,
                observacoes: form.observacoes || null,
            };

            if (editingId) {
                await api.put(`/asos/${editingId}`, payload);
                showToast('ASO atualizado com sucesso', 'success');
            } else {
                await api.post('/asos', payload);
                showToast('ASO cadastrado com sucesso', 'success');
            }
            setShowModal(false);
            fetchAll();
        } catch (err: any) {
            showToast(err.response?.data?.error || 'Erro ao salvar ASO', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Excluir este registro de ASO?')) return;
        try {
            await api.delete(`/asos/${id}`);
            showToast('ASO excluído', 'success');
            fetchAll();
        } catch (err) {
            showToast('Erro ao excluir ASO', 'error');
        }
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col space-y-4 overflow-y-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        <Stethoscope className="w-7 h-7 text-blue-500" />
                        Controle de ASO
                    </h1>
                    <p className="text-sm text-slate-500 font-medium">Atestado de Saúde Ocupacional • {asos.length} registros</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={openNew} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95">
                        <Plus className="w-4 h-4" /> Novo ASO
                    </button>
                    <button onClick={handleExportCSV} className="bg-emerald-600 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-emerald-700">
                        <Download className="w-4 h-4" /> Exportar CSV
                    </button>
                    <button onClick={fetchAll} className="text-slate-400 hover:text-slate-600">
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-xs font-black text-red-700 uppercase">Vencidas</span>
                    </div>
                    <p className="text-3xl font-black text-red-600">{vencidas.length}</p>
                    <p className="text-[10px] text-red-400">Funcionários sem ASO válido</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-xs font-black text-amber-700 uppercase">Vencendo em 30 dias</span>
                    </div>
                    <p className="text-3xl font-black text-amber-600">{vencendo.length}</p>
                    <p className="text-[10px] text-amber-400">Agendar exame com urgência</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-black text-emerald-700 uppercase">Em dia</span>
                    </div>
                    <p className="text-3xl font-black text-emerald-600">{ok.length}</p>
                    <p className="text-[10px] text-emerald-400">ASOs válidos</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-3 items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text" value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar funcionário..."
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs"
                    />
                </div>
                <select
                    value={filtroTipo}
                    onChange={e => setFiltroTipo(e.target.value)}
                    className="border border-slate-200 rounded-xl px-3 py-2 text-xs"
                >
                    <option value="">Todos os tipos</option>
                    {ASO_TIPOS.map(t => (
                        <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                    ))}
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="text-left py-3 px-4 text-[10px] font-black text-slate-400 uppercase">Status</th>
                                <th className="text-left py-3 px-4 text-[10px] font-black text-slate-400 uppercase">Funcionário</th>
                                <th className="text-left py-3 px-4 text-[10px] font-black text-slate-400 uppercase">Cargo</th>
                                <th className="text-left py-3 px-4 text-[10px] font-black text-slate-400 uppercase">Tipo</th>
                                <th className="text-left py-3 px-4 text-[10px] font-black text-slate-400 uppercase">Clínica</th>
                                <th className="text-left py-3 px-4 text-[10px] font-black text-slate-400 uppercase">Data Exame</th>
                                <th className="text-left py-3 px-4 text-[10px] font-black text-slate-400 uppercase">Vencimento</th>
                                <th className="text-left py-3 px-4 text-[10px] font-black text-slate-400 uppercase">Dias</th>
                                <th className="text-left py-3 px-4 text-[10px] font-black text-slate-400 uppercase">Resultado</th>
                                <th className="text-right py-3 px-4 text-[10px] font-black text-slate-400 uppercase">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...vencidas, ...vencendo, ...ok].map((a) => {
                                const isVencida = a.diasRestantes !== null && a.diasRestantes < 0;
                                const isVencendo = a.diasRestantes !== null && a.diasRestantes >= 0 && a.diasRestantes <= 30;
                                return (
                                    <tr key={a.id} className={`border-b border-slate-100 ${isVencida ? 'bg-red-50' : isVencendo ? 'bg-amber-50' : 'hover:bg-slate-50'}`}>
                                        <td className="py-2.5 px-4">
                                            {isVencida ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                                                    <AlertTriangle className="w-3 h-3" /> VENCIDO
                                                </span>
                                            ) : isVencendo ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full animate-pulse">
                                                    ⚠️ VENCENDO
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">✓ OK</span>
                                            )}
                                        </td>
                                        <td className="py-2.5 px-4 font-bold text-slate-700">{a.funcionario?.nome}</td>
                                        <td className="py-2.5 px-4 text-slate-500">{a.funcionario?.cargo}</td>
                                        <td className="py-2.5 px-4 text-slate-500 text-xs">{a.tipo?.replace(/_/g, ' ')}</td>
                                        <td className="py-2.5 px-4 text-slate-500">{a.clinica || '—'}</td>
                                        <td className="py-2.5 px-4 text-slate-400">{fmtDate(a.dataExame)}</td>
                                        <td className="py-2.5 px-4 text-slate-400 font-bold">{fmtDate(a.dataVencimento)}</td>
                                        <td className="py-2.5 px-4">
                                            <span className={`font-black text-xs ${isVencida ? 'text-red-600' : isVencendo ? 'text-amber-600' : 'text-slate-400'}`}>
                                                {a.diasRestantes ?? '—'}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-4">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${a.resultado === 'APTO' ? 'bg-emerald-100 text-emerald-700' : a.resultado === 'INAPTO' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {a.resultado || '—'}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => openEdit(a)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Editar">
                                                    <Edit3 className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => handleDelete(a.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Excluir">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filtered.length === 0 && (
                                <tr><td colSpan={10} className="py-8 text-center text-slate-400 italic">Nenhum ASO encontrado</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Criar/Editar ASO */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h2 className="text-lg font-black text-slate-800">{editingId ? 'Editar ASO' : 'Novo ASO'}</h2>
                                <p className="text-xs text-slate-400 font-medium">Atestado de Saúde Ocupacional</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
                            {!editingId && (
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Funcionário *</label>
                                    <select
                                        value={form.funcionarioId}
                                        onChange={e => setForm({ ...form, funcionarioId: e.target.value })}
                                        className="w-full border border-slate-200 rounded-xl p-3 text-sm font-bold"
                                    >
                                        <option value="">Selecionar Funcionário</option>
                                        {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                                    </select>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Tipo *</label>
                                    <select
                                        value={form.tipo}
                                        onChange={e => setForm({ ...form, tipo: e.target.value })}
                                        className="w-full border border-slate-200 rounded-xl p-3 text-sm"
                                    >
                                        {ASO_TIPOS.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Resultado</label>
                                    <select
                                        value={form.resultado}
                                        onChange={e => setForm({ ...form, resultado: e.target.value })}
                                        className="w-full border border-slate-200 rounded-xl p-3 text-sm"
                                    >
                                        <option value="">Pendente</option>
                                        {ASO_RESULTADOS.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Clínica</label>
                                <input
                                    value={form.clinica}
                                    onChange={e => setForm({ ...form, clinica: e.target.value })}
                                    placeholder="Nome da clínica ou médico"
                                    className="w-full border border-slate-200 rounded-xl p-3 text-sm"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Data do Exame</label>
                                    <input
                                        type="date"
                                        value={form.dataExame}
                                        onChange={e => setForm({ ...form, dataExame: e.target.value })}
                                        className="w-full border border-slate-200 rounded-xl p-3 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Vencimento</label>
                                    <input
                                        type="date"
                                        value={form.dataVencimento}
                                        onChange={e => setForm({ ...form, dataVencimento: e.target.value })}
                                        className="w-full border border-slate-200 rounded-xl p-3 text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Observações</label>
                                <textarea
                                    value={form.observacoes}
                                    onChange={e => setForm({ ...form, observacoes: e.target.value })}
                                    placeholder="Anotações adicionais..."
                                    rows={2}
                                    className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none"
                                />
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-slate-50/30">
                            <button
                                onClick={handleSave}
                                disabled={saving || !form.funcionarioId || !form.tipo}
                                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:bg-blue-700 shadow-lg shadow-blue-500/20 active:scale-[0.98] disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Stethoscope className="w-4 h-4" />}
                                {editingId ? 'Salvar Alterações' : 'Cadastrar ASO'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
