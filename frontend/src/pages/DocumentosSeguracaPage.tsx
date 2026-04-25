import { useEffect, useState } from 'react';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import {
    Loader2, RefreshCw, Download, Search, Plus, X,
    Edit3, Trash2, FileCheck, AlertTriangle
} from 'lucide-react';

const DOC_TIPOS = ['PGR', 'PCMSO', 'PPRA', 'LTCAT', 'NR10', 'NR35', 'OUTROS'];

const emptyForm = {
    nome: '',
    tipo: 'PGR',
    dataEmissao: new Date().toISOString().substring(0, 10),
    dataVencimento: '',
    arquivoUrl: '',
    observacoes: '',
};

export default function DocumentosSeguracaPage() {
    const { showToast } = useToast();
    const [docs, setDocs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filtroTipo, setFiltroTipo] = useState('');

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({ ...emptyForm });
    const [saving, setSaving] = useState(false);

    const fetchAll = async () => {
        try {
            setLoading(true);
            const res = await api.get('/documentos');
            setDocs(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

    const filtered = docs.filter(d => {
        const matchSearch = !search || d.nome?.toLowerCase().includes(search.toLowerCase());
        const matchTipo = !filtroTipo || d.tipo === filtroTipo;
        return matchSearch && matchTipo;
    });

    const openNew = () => {
        setEditingId(null);
        setForm({ ...emptyForm });
        setShowModal(true);
    };

    const openEdit = (doc: any) => {
        setEditingId(doc.id);
        setForm({
            nome: doc.nome || '',
            tipo: doc.tipo || 'PGR',
            dataEmissao: doc.dataEmissao ? new Date(doc.dataEmissao).toISOString().substring(0, 10) : '',
            dataVencimento: doc.dataVencimento ? new Date(doc.dataVencimento).toISOString().substring(0, 10) : '',
            arquivoUrl: doc.arquivoUrl || '',
            observacoes: doc.observacoes || '',
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.nome || !form.tipo) {
            showToast('Nome e Tipo são obrigatórios', 'error');
            return;
        }
        try {
            setSaving(true);
            const payload = {
                ...form,
                dataEmissao: form.dataEmissao || null,
                dataVencimento: form.dataVencimento || null,
                arquivoUrl: form.arquivoUrl || null,
                observacoes: form.observacoes || null,
            };
            if (editingId) {
                await api.put(`/documentos/${editingId}`, payload);
                showToast('Documento atualizado', 'success');
            } else {
                await api.post('/documentos', payload);
                showToast('Documento cadastrado', 'success');
            }
            setShowModal(false);
            fetchAll();
        } catch (err: any) {
            showToast(err.response?.data?.error || 'Erro ao salvar', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Excluir este documento?')) return;
        try {
            await api.delete(`/documentos/${id}`);
            showToast('Documento excluído', 'success');
            fetchAll();
        } catch (err) {
            showToast('Erro ao excluir', 'error');
        }
    };

    const handleExportCSV = () => {
        const header = 'Tipo;Nome;Emissão;Vencimento;Status;Dias Restantes';
        const rows = filtered.map(d =>
            `${d.tipo};${d.nome};${fmtDate(d.dataEmissao)};${fmtDate(d.dataVencimento)};${d.statusCalculado};${d.diasRestantes ?? '—'}`
        );
        const csv = '\uFEFF' + [header, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'documentos_seguranca.csv';
        link.click();
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'VENCIDO': return 'bg-red-100 text-red-700 border-red-200';
            case 'VENCENDO': return 'bg-amber-100 text-amber-700 border-amber-200';
            default: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
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
        <div className="h-full flex flex-col space-y-5 overflow-y-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        <FileCheck className="w-7 h-7 text-blue-500" />
                        Documentos de Segurança
                    </h1>
                    <p className="text-sm text-slate-500 font-medium">PGR, PCMSO, PPRA, LTCAT e NRs • {docs.length} documentos</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={openNew} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95">
                        <Plus className="w-4 h-4" /> Novo Documento
                    </button>
                    <button onClick={handleExportCSV} className="bg-emerald-600 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-emerald-700">
                        <Download className="w-4 h-4" /> Exportar
                    </button>
                    <button onClick={fetchAll} className="p-2 text-slate-400 hover:text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Status Summary */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <span className="text-xs font-black text-red-700 uppercase">Vencidos</span>
                    <p className="text-2xl font-black text-red-600 mt-1">{docs.filter(d => d.statusCalculado === 'VENCIDO').length}</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <span className="text-xs font-black text-amber-700 uppercase">Vencendo</span>
                    <p className="text-2xl font-black text-amber-600 mt-1">{docs.filter(d => d.statusCalculado === 'VENCENDO').length}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <span className="text-xs font-black text-emerald-700 uppercase">Válidos</span>
                    <p className="text-2xl font-black text-emerald-600 mt-1">{docs.filter(d => d.statusCalculado === 'VALIDO').length}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-3 items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text" value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar documento..."
                        className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 bg-white"
                    />
                </div>
                <select
                    value={filtroTipo}
                    onChange={e => setFiltroTipo(e.target.value)}
                    className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 bg-white"
                >
                    <option value="">Todos os Tipos</option>
                    {DOC_TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex-1">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="text-left py-3 px-5 text-[10px] font-black text-slate-400 uppercase">Tipo</th>
                                <th className="text-left py-3 px-5 text-[10px] font-black text-slate-400 uppercase">Nome</th>
                                <th className="text-left py-3 px-5 text-[10px] font-black text-slate-400 uppercase">Emissão</th>
                                <th className="text-left py-3 px-5 text-[10px] font-black text-slate-400 uppercase">Vencimento</th>
                                <th className="text-center py-3 px-5 text-[10px] font-black text-slate-400 uppercase">Status</th>
                                <th className="text-left py-3 px-5 text-[10px] font-black text-slate-400 uppercase">Arquivo</th>
                                <th className="text-right py-3 px-5 text-[10px] font-black text-slate-400 uppercase">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(d => (
                                <tr key={d.id} className={`border-b border-slate-100 transition-colors ${d.statusCalculado === 'VENCIDO' ? 'bg-red-50' : d.statusCalculado === 'VENCENDO' ? 'bg-amber-50' : 'hover:bg-slate-50'}`}>
                                    <td className="py-3 px-5">
                                        <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 uppercase">{d.tipo}</span>
                                    </td>
                                    <td className="py-3 px-5 font-bold text-slate-700">{d.nome}</td>
                                    <td className="py-3 px-5 text-slate-400">{fmtDate(d.dataEmissao)}</td>
                                    <td className="py-3 px-5 text-slate-400 font-bold">{fmtDate(d.dataVencimento)}</td>
                                    <td className="py-3 px-5 text-center">
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full border ${getStatusBadge(d.statusCalculado)}`}>
                                            {d.statusCalculado === 'VENCIDO' && <AlertTriangle className="w-3 h-3" />}
                                            {d.statusCalculado}
                                        </span>
                                    </td>
                                    <td className="py-3 px-5">
                                        {d.arquivoUrl ? (
                                            <a href={d.arquivoUrl} target="_blank" rel="noreferrer" className="text-blue-600 text-xs font-bold underline hover:text-blue-800">Ver</a>
                                        ) : <span className="text-slate-300">—</span>}
                                    </td>
                                    <td className="py-3 px-5 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => openEdit(d)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Editar">
                                                <Edit3 className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => handleDelete(d.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Excluir">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="py-16 text-center text-slate-400">
                                        <FileCheck className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                        <p className="text-xs font-bold uppercase tracking-widest">Nenhum documento encontrado</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h2 className="text-lg font-black text-slate-800">{editingId ? 'Editar Documento' : 'Novo Documento'}</h2>
                                <p className="text-xs text-slate-400 font-medium">Documento corporativo de segurança</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Nome do Documento *</label>
                                <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })}
                                    placeholder="Ex: PGR - Nacional Hidro 2026"
                                    className="w-full border border-slate-200 rounded-xl p-3 text-sm" />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Tipo *</label>
                                <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}
                                    className="w-full border border-slate-200 rounded-xl p-3 text-sm">
                                    {DOC_TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Data Emissão</label>
                                    <input type="date" value={form.dataEmissao} onChange={e => setForm({ ...form, dataEmissao: e.target.value })}
                                        className="w-full border border-slate-200 rounded-xl p-3 text-sm" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Vencimento</label>
                                    <input type="date" value={form.dataVencimento} onChange={e => setForm({ ...form, dataVencimento: e.target.value })}
                                        className="w-full border border-slate-200 rounded-xl p-3 text-sm" />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">URL do Arquivo</label>
                                <input value={form.arquivoUrl} onChange={e => setForm({ ...form, arquivoUrl: e.target.value })}
                                    placeholder="Link do PDF ou documento"
                                    className="w-full border border-slate-200 rounded-xl p-3 text-sm" />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Observações</label>
                                <textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })}
                                    placeholder="Anotações adicionais..."
                                    rows={2}
                                    className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none" />
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-slate-50/30">
                            <button onClick={handleSave} disabled={saving || !form.nome || !form.tipo}
                                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:bg-blue-700 shadow-lg shadow-blue-500/20 active:scale-[0.98] disabled:opacity-50">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
                                {editingId ? 'Salvar Alterações' : 'Cadastrar Documento'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
