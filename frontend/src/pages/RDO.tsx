import { useToast } from '../contexts/ToastContext';
import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import {
    Plus, Loader2, X, FileText, Clock, Sun, Moon,
    CheckCircle2, Calendar, TrendingUp, AlertTriangle,
    DollarSign, Receipt, ChevronRight, Zap, Edit2, Trash2
} from 'lucide-react';

const TURNOS = [
    { key: 'DIURNO', label: 'Diurno', icon: Sun, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200' },
    { key: 'NOTURNO', label: 'Noturno', icon: Moon, color: 'text-indigo-500', bg: 'bg-indigo-50 border-indigo-200' },
    { key: '24H', label: '24 Horas', icon: Clock, color: 'text-slate-700', bg: 'bg-slate-100 border-slate-300' },
];

const CLIMA: Record<string, { label: string; emoji: string }> = {
    BOM: { label: 'Bom', emoji: '☀️' },
    CHUVOSO: { label: 'Chuvoso', emoji: '🌧️' },
    NUBLADO: { label: 'Nublado', emoji: '☁️' },
};

const STATUS_OS: Record<string, { label: string; color: string }> = {
    ABERTA: { label: 'Aberta', color: 'bg-blue-100 text-blue-700' },
    EM_ANDAMENTO: { label: 'Em Andamento', color: 'bg-amber-100 text-amber-700' },
    CONCLUIDA: { label: 'Concluída', color: 'bg-emerald-100 text-emerald-700' },
    CANCELADA: { label: 'Cancelada', color: 'bg-red-100 text-red-600' },
};

const EMPTY_FORM = {
    data: '', turno: 'DIURNO', equipamento: '', operador: '',
    entrada: '', saida: '', almoco: '',
    horasTrabalhadas: '', horasExtras: '', horasNoturnas: '',
    atividadesRealizadas: '', condicoesClimaticas: 'BOM', observacoes: ''
};

export default function RDOPage() {
    const { showToast } = useToast();
    const [osList, setOsList] = useState<any[]>([]);
    const [osSearch, setOsSearch] = useState('');
    const [selectedOS, setSelectedOS] = useState<any>(null);
    const [rdos, setRdos] = useState<any[]>([]);
    const [resumo, setResumo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [savingRDO, setSavingRDO] = useState(false);
    const [closingMedicao, setClosingMedicao] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editRDO, setEditRDO] = useState<any>(null);
    const [form, setForm] = useState<any>({ ...EMPTY_FORM });
    const [showMedicaoModal, setShowMedicaoModal] = useState(false);
    const [medicaoForm, setMedicaoForm] = useState({ dataInicio: '', dataFim: '', observacoes: '' });

    useEffect(() => {
        api.get('/os').then(r => {
            setOsList(r.data || []);
            setLoading(false);
        }).catch(() => {
            setOsList([]);
            setLoading(false);
        });
    }, []);

    const fetchRDOs = useCallback(async (osId: string) => {
        try {
            const res = await api.get(`/rdos/os/${osId}`);
            setRdos(res.data.rdos || []);
            setResumo(res.data.resumo || null);
        } catch (err) { console.error(err); }
    }, []);

    const selectOS = (os: any) => {
        setSelectedOS(os);
        setShowForm(false);
        fetchRDOs(os.id);
    };

    const resetForm = () => { setForm({ ...EMPTY_FORM }); setEditRDO(null); };

    const handleSave = async () => {
        if (!selectedOS) return;
        setSavingRDO(true);
        try {
            const payload = { ...form, osId: selectedOS.id };
            if (editRDO) {
                await api.patch(`/rdos/${editRDO.id}`, payload);
            } else {
                await api.post('/rdos', payload);
            }
            setShowForm(false);
            resetForm();
            fetchRDOs(selectedOS.id);
        } catch (err: any) {
            showToast(err.response?.data?.error || 'Erro ao salvar RDO');
        } finally {
            setSavingRDO(false);
        }
    };

    const handleEdit = (rdo: any) => {
        setForm({
            data: rdo.data?.split('T')[0] || '',
            turno: rdo.turno || 'DIURNO',
            equipamento: rdo.equipamento || '',
            operador: rdo.operador || '',
            entrada: rdo.entrada || '',
            saida: rdo.saida || '',
            almoco: rdo.almoco || '',
            horasTrabalhadas: rdo.horasTrabalhadas?.toString() || '',
            horasExtras: rdo.horasExtras?.toString() || '',
            horasNoturnas: rdo.horasNoturnas?.toString() || '',
            atividadesRealizadas: rdo.atividadesRealizadas || '',
            condicoesClimaticas: rdo.condicoesClimaticas || 'BOM',
            observacoes: rdo.observacoes || ''
        });
        setEditRDO(rdo);
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Excluir este RDO?')) return;
        await api.delete(`/rdos/${id}`);
        if (selectedOS) fetchRDOs(selectedOS.id);
    };

    const handleFecharMedicao = async () => {
        if (!selectedOS) return;
        setClosingMedicao(true);
        try {
            const res = await api.post(`/medicoes/fechar-por-rdo`, {
                osId: selectedOS.id,
                ...medicaoForm
            });
            showToast(`Medição ${res.data.codigo || ''} gerada com sucesso! RDOs vinculados ao fechamento.`);
            setShowMedicaoModal(false);
            fetchRDOs(selectedOS.id);
            // Refresh OS to potentially update status
            const osRes = await api.get('/os');
            setOsList(osRes.data || []);
            const updatedOS = (osRes.data || []).find((o: any) => o.id === selectedOS.id);
            if (updatedOS) setSelectedOS(updatedOS);
        } catch (err: any) {
            showToast(err.response?.data?.error || 'Erro ao fechar medição');
        } finally {
            setClosingMedicao(false);
        }
    };

    const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
    const turnoInfo = (key: string) => TURNOS.find(t => t.key === key) || TURNOS[0];
    const fmt = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Computed financial preview from RDOs
    const financeiro = (() => {
        if (!resumo || !selectedOS) return null;
        const proposta = selectedOS.proposta;
        if (!proposta) return null;

        const valorBase = Number(proposta.valorTotal) || 0;
        const pctExtra = Number(proposta.adicionalHoraExtra) || 35; // % adicional h extra
        const pctNoturno = Number(proposta.adicionalNoturno) || 35; // % adicional h noturno
        const franquia = Number(proposta.franquiaHoras) || 8; // horas franquia/dia

        const totalExtras = Number(resumo.totalExtras) || 0;
        const totalNoturnas = Number(resumo.totalNoturnas) || 0;

        // Valor hora base = valorTotal / (dias * franquia)
        const dias = Number(resumo.totalDias) || 1;
        const valorHoraBase = valorBase / (dias * franquia);

        const valorExtras = totalExtras * valorHoraBase * (pctExtra / 100);
        const valorNoturno = totalNoturnas * valorHoraBase * (pctNoturno / 100);
        const totalComAdicionais = valorBase + valorExtras + valorNoturno;

        return {
            valorBase, valorExtras, valorNoturno, totalComAdicionais,
            valorHoraBase, totalExtras, totalNoturnas, pctExtra, pctNoturno
        };
    })();

    const filteredOS = osList.filter(os =>
        os.codigo?.toLowerCase().includes(osSearch.toLowerCase()) ||
        os.cliente?.nome?.toLowerCase().includes(osSearch.toLowerCase())
    );

    if (loading) return (
        <div className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
    );

    return (
        <div className="h-full flex flex-col space-y-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">RDO — Relatório Diário de Obra</h1>
                    <p className="text-sm text-slate-500">Registro diário de atividades · Cálculo automático de horas extras</p>
                </div>
            </div>

            <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
                {/* OS Sidebar */}
                <div className="w-72 flex-shrink-0 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col shadow-sm">
                    <div className="p-3 border-b border-slate-200 bg-slate-50">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Ordens de Serviço</p>
                        <input
                            type="text"
                            placeholder="Buscar OS ou cliente..."
                            value={osSearch}
                            onChange={e => setOsSearch(e.target.value)}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-400"
                        />
                    </div>
                    <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
                        {filteredOS.map((os: any) => {
                            const statusCfg = STATUS_OS[os.status] || STATUS_OS.ABERTA;
                            return (
                                <button
                                    key={os.id}
                                    onClick={() => selectOS(os)}
                                    className={`w-full text-left p-3 flex items-center gap-3 transition-all hover:bg-blue-50 ${selectedOS?.id === os.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-slate-700 truncate">OS {os.codigo}</p>
                                        <p className="text-[10px] text-slate-400 truncate">{os.cliente?.nome || '—'}</p>
                                        <span className={`mt-1 inline-block text-[9px] font-black px-1.5 py-0.5 rounded ${statusCfg.color}`}>{statusCfg.label}</span>
                                    </div>
                                    <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0" />
                                </button>
                            );
                        })}
                        {filteredOS.length === 0 && (
                            <div className="p-6 text-center text-xs text-slate-400 italic">Nenhuma OS encontrada</div>
                        )}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
                    {!selectedOS ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="text-center">
                                <FileText className="w-14 h-14 text-slate-200 mx-auto mb-4" />
                                <p className="text-slate-400 font-medium">Selecione uma OS para gerenciar os RDOs</p>
                                <p className="text-slate-300 text-sm mt-1">O sistema calculará automaticamente as horas extras</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* OS Header */}
                            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h2 className="text-lg font-black text-slate-800">OS {selectedOS.codigo}</h2>
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${STATUS_OS[selectedOS.status]?.color || ''}`}>
                                                {STATUS_OS[selectedOS.status]?.label || selectedOS.status}
                                            </span>
                                        </div>
                                        <p className="text-sm font-bold text-slate-500">{selectedOS.cliente?.nome}</p>
                                        {selectedOS.proposta && (
                                            <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <FileText className="w-3 h-3" />
                                                    Proposta: <strong>{selectedOS.proposta.codigo}</strong>
                                                </span>
                                                {selectedOS.proposta.franquiaHoras && (
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        Franquia: <strong>{selectedOS.proposta.franquiaHoras}h/dia</strong>
                                                    </span>
                                                )}
                                                {selectedOS.proposta.adicionalHoraExtra && (
                                                    <span className="flex items-center gap-1">
                                                        <TrendingUp className="w-3 h-3" />
                                                        H.Extra: <strong>+{selectedOS.proposta.adicionalHoraExtra}%</strong>
                                                    </span>
                                                )}
                                                {selectedOS.proposta.adicionalNoturno && (
                                                    <span className="flex items-center gap-1">
                                                        <Moon className="w-3 h-3" />
                                                        Noturno: <strong>+{selectedOS.proposta.adicionalNoturno}%</strong>
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        {rdos.length > 0 && (
                                            <button
                                                onClick={() => {
                                                    setMedicaoForm({
                                                        dataInicio: rdos[rdos.length - 1]?.data?.split('T')[0] || '',
                                                        dataFim: rdos[0]?.data?.split('T')[0] || '',
                                                        observacoes: ''
                                                    });
                                                    setShowMedicaoModal(true);
                                                }}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 shadow-md shadow-emerald-500/20 transition-all"
                                            >
                                                <Receipt className="w-4 h-4" /> Fechar Medição
                                            </button>
                                        )}
                                        <button
                                            onClick={() => { resetForm(); setShowForm(true); }}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all"
                                        >
                                            <Plus className="w-4 h-4" /> Novo RDO
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Summary Cards */}
                            {resumo && (
                                <div className="grid grid-cols-5 gap-3">
                                    <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
                                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Dias</p>
                                        <p className="text-2xl font-black text-slate-800">{resumo.totalDias}</p>
                                        <p className="text-[10px] text-slate-400">dias de RDO</p>
                                    </div>
                                    <div className="bg-white rounded-xl border border-blue-100 p-3 shadow-sm">
                                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Horas Total</p>
                                        <p className="text-2xl font-black text-blue-600">{resumo.totalHoras}h</p>
                                        <p className="text-[10px] text-slate-400">trabalhadas</p>
                                    </div>
                                    <div className={`rounded-xl border p-3 shadow-sm ${Number(resumo.totalExtras) > 0 ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}>
                                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Horas Extras</p>
                                        <p className={`text-2xl font-black ${Number(resumo.totalExtras) > 0 ? 'text-blue-600' : 'text-slate-300'}`}>{resumo.totalExtras}h</p>
                                        {Number(resumo.totalExtras) > 0 && financeiro && (
                                            <p className="text-[10px] text-blue-500 font-bold">{fmt(financeiro.valorExtras)}</p>
                                        )}
                                    </div>
                                    <div className={`rounded-xl border p-3 shadow-sm ${Number(resumo.totalNoturnas) > 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200'}`}>
                                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Horas Not.</p>
                                        <p className={`text-2xl font-black ${Number(resumo.totalNoturnas) > 0 ? 'text-indigo-600' : 'text-slate-300'}`}>{resumo.totalNoturnas}h</p>
                                        {Number(resumo.totalNoturnas) > 0 && financeiro && (
                                            <p className="text-[10px] text-indigo-500 font-bold">{fmt(financeiro.valorNoturno)}</p>
                                        )}
                                    </div>
                                    {financeiro && (
                                        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-3 shadow-sm">
                                            <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Total c/ Adicionais</p>
                                            <p className="text-lg font-black text-emerald-700">{fmt(financeiro.totalComAdicionais)}</p>
                                            <p className="text-[10px] text-emerald-500">estimado</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Financial alert when extras exist */}
                            {financeiro && (financeiro.valorExtras > 0 || financeiro.valorNoturno > 0) && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 text-xs">
                                        <p className="font-black text-amber-800 uppercase tracking-wide">⚠️ Horas adicionais identificadas — não deixe dinheiro na mesa!</p>
                                        <div className="flex flex-wrap gap-4 mt-1 text-amber-700">
                                            {financeiro.valorExtras > 0 && (
                                                <span>Extra (+{financeiro.pctExtra}%): <strong>{financeiro.totalExtras}h = {fmt(financeiro.valorExtras)}</strong></span>
                                            )}
                                            {financeiro.valorNoturno > 0 && (
                                                <span>Noturno (+{financeiro.pctNoturno}%): <strong>{financeiro.totalNoturnas}h = {fmt(financeiro.valorNoturno)}</strong></span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setMedicaoForm({
                                                dataInicio: rdos[rdos.length - 1]?.data?.split('T')[0] || '',
                                                dataFim: rdos[0]?.data?.split('T')[0] || '',
                                                observacoes: ''
                                            });
                                            setShowMedicaoModal(true);
                                        }}
                                        className="flex-shrink-0 bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all"
                                    >
                                        <Zap className="w-3 h-3" /> Fechar Medição
                                    </button>
                                </div>
                            )}

                            {/* RDO List */}
                            <div className="space-y-3">
                                {rdos.length === 0 ? (
                                    <div className="bg-white rounded-xl border border-dashed border-slate-200 p-12 text-center">
                                        <Calendar className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                                        <p className="text-slate-400 font-medium">Nenhum RDO registrado para esta OS</p>
                                        <p className="text-slate-300 text-xs mt-1">Clique em "Novo RDO" para começar</p>
                                    </div>
                                ) : (
                                    rdos.map((rdo: any) => {
                                        const t = turnoInfo(rdo.turno);
                                        const TurnoIcon = t.icon;
                                        const climaInfo = CLIMA[rdo.condicoesClimaticas] || { label: rdo.condicoesClimaticas, emoji: '🌤️' };
                                        const hasExtras = Number(rdo.horasExtras) > 0;
                                        const hasNoturnas = Number(rdo.horasNoturnas) > 0;
                                        return (
                                            <div key={rdo.id} className={`bg-white rounded-xl border p-4 hover:shadow-md transition-all ${hasExtras || hasNoturnas ? 'border-blue-100' : 'border-slate-200'}`}>
                                                <div className="flex items-start gap-4">
                                                    {/* Turno icon */}
                                                    <div className={`w-11 h-11 rounded-xl border-2 flex items-center justify-center flex-shrink-0 ${t.bg}`}>
                                                        <TurnoIcon className={`w-5 h-5 ${t.color}`} />
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                                            <p className="text-sm font-black text-slate-800">{formatDate(rdo.data)}</p>
                                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${t.bg} ${t.color}`}>{t.label}</span>
                                                            <span className="text-[10px]">{climaInfo.emoji} {climaInfo.label}</span>
                                                        </div>

                                                        <div className="flex flex-wrap gap-3 text-[10px] text-slate-500 mb-2">
                                                            {rdo.equipamento && <span>🔧 {rdo.equipamento}</span>}
                                                            {rdo.operador && <span>👷 {rdo.operador}</span>}
                                                            {rdo.entrada && rdo.saida && <span>🕐 {rdo.entrada} — {rdo.saida}{rdo.almoco ? ` (⏸ ${rdo.almoco})` : ''}</span>}
                                                        </div>

                                                        {rdo.atividadesRealizadas && (
                                                            <p className="text-xs text-slate-500 border-l-2 border-slate-100 pl-3 mb-2 line-clamp-2">{rdo.atividadesRealizadas}</p>
                                                        )}

                                                        {/* Hours breakdown */}
                                                        <div className="flex gap-3 flex-wrap">
                                                            <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2 py-1">
                                                                <Clock className="w-3 h-3 text-slate-500" />
                                                                <span className="text-[10px] font-black text-slate-700">{rdo.horasTrabalhadas || 0}h trabalhadas</span>
                                                            </div>
                                                            {hasExtras && (
                                                                <div className="flex items-center gap-1.5 bg-blue-50 rounded-lg px-2 py-1">
                                                                    <TrendingUp className="w-3 h-3 text-blue-500" />
                                                                    <span className="text-[10px] font-black text-blue-700">+{rdo.horasExtras}h extra</span>
                                                                </div>
                                                            )}
                                                            {hasNoturnas && (
                                                                <div className="flex items-center gap-1.5 bg-indigo-50 rounded-lg px-2 py-1">
                                                                    <Moon className="w-3 h-3 text-indigo-500" />
                                                                    <span className="text-[10px] font-black text-indigo-700">{rdo.horasNoturnas}h noturnas</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {rdo.assinadoPor && (
                                                            <div className="flex items-center gap-1 mt-2 text-[10px] text-emerald-600">
                                                                <CheckCircle2 className="w-3 h-3" />
                                                                <span>Assinado por {rdo.assinadoPor} em {formatDate(rdo.assinadoEm)}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex-shrink-0 flex items-center gap-1">
                                                        <button onClick={() => handleEdit(rdo)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Editar">
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => handleDelete(rdo.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Excluir">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ─── RDO Form Modal ─────────────────────────── */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                            <h2 className="text-base font-black text-slate-800">{editRDO ? 'Editar RDO' : 'Novo Relatório Diário'}</h2>
                            <button onClick={() => { setShowForm(false); resetForm(); }} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Row 1: Data + Turno */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Data *</label>
                                    <input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })}
                                        className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm font-bold focus:border-blue-400 outline-none transition-all" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Turno</label>
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {TURNOS.map(t => (
                                            <button key={t.key} type="button" onClick={() => setForm({ ...form, turno: t.key })}
                                                className={`flex flex-col items-center gap-1 py-2 rounded-xl border-2 text-[9px] font-black uppercase transition-all ${form.turno === t.key ? `${t.bg} ${t.color} border-current` : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}>
                                                <t.icon className="w-3.5 h-3.5" />
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Row 2: Equipamento + Operador */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Equipamento</label>
                                    <input value={form.equipamento} onChange={e => setForm({ ...form, equipamento: e.target.value })}
                                        placeholder="Ex: Combinado SAP" className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm font-bold focus:border-blue-400 outline-none" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Operador / Encarregado</label>
                                    <input value={form.operador} onChange={e => setForm({ ...form, operador: e.target.value })}
                                        placeholder="Nome do operador" className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm font-bold focus:border-blue-400 outline-none" />
                                </div>
                            </div>

                            {/* Row 3: Ponto (Entrada / Saída / Almoço) */}
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Controle de ponto</label>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-[9px] text-slate-400 font-bold block mb-1">Entrada</label>
                                        <input type="time" value={form.entrada} onChange={e => setForm({ ...form, entrada: e.target.value })}
                                            className="w-full border-2 border-slate-100 rounded-xl p-2.5 text-sm font-bold focus:border-blue-400 outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-[9px] text-slate-400 font-bold block mb-1">Saída</label>
                                        <input type="time" value={form.saida} onChange={e => setForm({ ...form, saida: e.target.value })}
                                            className="w-full border-2 border-slate-100 rounded-xl p-2.5 text-sm font-bold focus:border-blue-400 outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-[9px] text-slate-400 font-bold block mb-1">Descarte (almoço)</label>
                                        <input value={form.almoco} onChange={e => setForm({ ...form, almoco: e.target.value })}
                                            placeholder="ex: 12:00-13:00" className="w-full border-2 border-slate-100 rounded-xl p-2.5 text-sm font-bold focus:border-blue-400 outline-none" />
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1.5 italic">O sistema calculará automaticamente as horas conforme a franquia da proposta vinculada.</p>
                            </div>

                            {/* Row 4: Horas (auto-calculated, but editable) */}
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Horas calculadas (editável)</label>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-[9px] text-slate-500 font-bold block mb-1">🕐 Trabalhadas</label>
                                        <input type="number" step="0.5" value={form.horasTrabalhadas} onChange={e => setForm({ ...form, horasTrabalhadas: e.target.value })}
                                            placeholder="8" className="w-full border-2 border-slate-100 rounded-xl p-2.5 text-sm font-bold focus:border-blue-400 outline-none text-center" />
                                    </div>
                                    <div>
                                        <label className="text-[9px] text-blue-500 font-bold block mb-1">📈 Extras</label>
                                        <input type="number" step="0.5" value={form.horasExtras} onChange={e => setForm({ ...form, horasExtras: e.target.value })}
                                            placeholder="0" className="w-full border-2 border-blue-100 bg-blue-50/30 rounded-xl p-2.5 text-sm font-bold focus:border-blue-400 outline-none text-center" />
                                    </div>
                                    <div>
                                        <label className="text-[9px] text-indigo-500 font-bold block mb-1">🌙 Noturnas</label>
                                        <input type="number" step="0.5" value={form.horasNoturnas} onChange={e => setForm({ ...form, horasNoturnas: e.target.value })}
                                            placeholder="0" className="w-full border-2 border-indigo-100 bg-indigo-50/30 rounded-xl p-2.5 text-sm font-bold focus:border-indigo-400 outline-none text-center" />
                                    </div>
                                </div>
                            </div>

                            {/* Row 5: Clima */}
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Condições Climáticas</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {Object.entries(CLIMA).map(([key, val]) => (
                                        <button key={key} type="button" onClick={() => setForm({ ...form, condicoesClimaticas: key })}
                                            className={`py-2 rounded-xl border-2 text-xs font-black transition-all ${form.condicoesClimaticas === key ? 'bg-slate-700 border-slate-700 text-white' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'}`}>
                                            {val.emoji} {val.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Row 6: Atividades */}
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Atividades Realizadas</label>
                                <textarea value={form.atividadesRealizadas} onChange={e => setForm({ ...form, atividadesRealizadas: e.target.value })}
                                    placeholder="Descreva as atividades executadas no dia..." className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm font-bold focus:border-blue-400 outline-none min-h-[80px] resize-none" />
                            </div>

                            {/* Row 7: Observações */}
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Observações</label>
                                <textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })}
                                    placeholder="Pendências, ocorrências, paralisações..." className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm font-bold focus:border-blue-400 outline-none min-h-[60px] resize-none" />
                            </div>

                            <button onClick={handleSave} disabled={!form.data || savingRDO}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-black text-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20">
                                {savingRDO ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                {editRDO ? 'Salvar Alterações' : 'Registrar RDO'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Fechar Medição Modal ─────────────────── */}
            {showMedicaoModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="bg-emerald-600 rounded-t-2xl px-6 py-4 flex items-center justify-between">
                            <div>
                                <h2 className="text-base font-black text-white">Fechar Medição</h2>
                                <p className="text-emerald-200 text-xs">OS {selectedOS?.codigo} · {selectedOS?.cliente?.nome}</p>
                            </div>
                            <button onClick={() => setShowMedicaoModal(false)} className="text-emerald-200 hover:text-white p-1 transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Financial Summary */}
                            {financeiro && (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
                                    <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Resumo Financeiro dos RDOs</p>
                                    <div className="space-y-1.5 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Valor Base OS</span>
                                            <span className="font-black text-slate-800">{fmt(financeiro.valorBase)}</span>
                                        </div>
                                        {financeiro.valorExtras > 0 && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">H. Extras ({financeiro.totalExtras}h × +{financeiro.pctExtra}%)</span>
                                                <span className="font-black text-blue-600">+{fmt(financeiro.valorExtras)}</span>
                                            </div>
                                        )}
                                        {financeiro.valorNoturno > 0 && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">H. Noturnas ({financeiro.totalNoturnas}h × +{financeiro.pctNoturno}%)</span>
                                                <span className="font-black text-indigo-600">+{fmt(financeiro.valorNoturno)}</span>
                                            </div>
                                        )}
                                        <div className="border-t border-emerald-200 pt-1.5 flex justify-between">
                                            <span className="font-black text-emerald-800 uppercase text-[10px] tracking-widest">Total para Cobrança</span>
                                            <span className="font-black text-emerald-700 text-base">{fmt(financeiro.totalComAdicionais)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Data Início</label>
                                    <input type="date" value={medicaoForm.dataInicio} onChange={e => setMedicaoForm({ ...medicaoForm, dataInicio: e.target.value })}
                                        className="w-full border-2 border-slate-100 rounded-xl p-2.5 text-sm font-bold focus:border-emerald-400 outline-none" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Data Fim</label>
                                    <input type="date" value={medicaoForm.dataFim} onChange={e => setMedicaoForm({ ...medicaoForm, dataFim: e.target.value })}
                                        className="w-full border-2 border-slate-100 rounded-xl p-2.5 text-sm font-bold focus:border-emerald-400 outline-none" />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Observações da Medição</label>
                                <textarea value={medicaoForm.observacoes} onChange={e => setMedicaoForm({ ...medicaoForm, observacoes: e.target.value })}
                                    placeholder="Informações adicionais para a medição..." className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm font-bold focus:border-emerald-400 outline-none min-h-[60px] resize-none" />
                            </div>

                            <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-500 flex items-start gap-2">
                                <DollarSign className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                                <p>O sistema criará uma <strong>Medição</strong> vinculada a esta OS com todas as horas dos RDOs. Você poderá então gerar o <strong>Faturamento (RL + NFS-e)</strong> a partir da tela de Faturamento.</p>
                            </div>

                            <button onClick={handleFecharMedicao} disabled={closingMedicao || !medicaoForm.dataInicio || !medicaoForm.dataFim}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-black text-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
                                {closingMedicao ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
                                Gerar Medição e Fechar Período
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
