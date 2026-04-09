import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import {
    Loader2, Plus, X, CheckCircle2, XCircle, Calendar, Truck,
    Clock, Users, Phone, AlertTriangle, Search,
    FileText
} from 'lucide-react';

type FilterStatus = 'pendentes' | 'todas' | 'canceladas';

export default function PreReservaPage() {
    const [reservas, setReservas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterStatus>('pendentes');
    const [search, setSearch] = useState('');

    // Create form
    const [showForm, setShowForm] = useState(false);
    const [veiculos, setVeiculos] = useState<any[]>([]);
    const [clientes, setClientes] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        veiculoId: '', clienteId: '', data: '', dataFim: '', hora: '',
        equipamento: '', solicitanteNome: '', solicitanteTelefone: '',
        qtdBicos: 1, turnos: 'DIURNO', qtdPessoas: 3, observacoes: '',
    });

    // Disponibilidade
    const [disponibilidade, setDisponibilidade] = useState<any>(null);

    const fetchReservas = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/pre-reservas', { params: { status: filter } });
            setReservas(res.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [filter]);

    useEffect(() => { fetchReservas(); }, [fetchReservas]);

    useEffect(() => {
        if (showForm) {
            Promise.all([
                api.get('/instograma/disponibilidade', { params: { date: form.data || new Date().toISOString() } }).catch(() => ({ data: { disponiveis: [] } })),
                api.get('/clientes').catch(() => ({ data: [] })),
            ]).then(([v, c]) => {
                setVeiculos(v.data.disponiveis || []);
                setClientes(c.data);
            });
        }
    }, [showForm]);

    // Auto calculate equipe
    const calcEquipe = (bicos: number, turnos: string) => {
        const turnoMult = turnos === '24H' ? 2 : 1;
        return bicos === 1 ? (1 + 2) * turnoMult : (1 + 4) * turnoMult;
    };

    // Check disponibilidade when date changes
    useEffect(() => {
        if (form.data) {
            api.get('/pre-reservas/disponibilidade', {
                params: { data: form.data, dataFim: form.dataFim || undefined },
            }).then(res => setDisponibilidade(res.data))
                .catch(() => setDisponibilidade(null));
        }
    }, [form.data, form.dataFim]);

    const handleCreate = async () => {
        setSaving(true);
        try {
            await api.post('/pre-reservas', form);
            setShowForm(false);
            setForm({ veiculoId: '', clienteId: '', data: '', dataFim: '', hora: '', equipamento: '', solicitanteNome: '', solicitanteTelefone: '', qtdBicos: 1, turnos: 'DIURNO', qtdPessoas: 3, observacoes: '' });
            fetchReservas();
        } catch (err: any) {
            alert(err.response?.data?.error?.message || 'Erro ao criar');
        }
        finally { setSaving(false); }
    };

    const handleConfirmar = async (id: string) => {
        if (!confirm('Confirmar esta pré-reserva?')) return;
        try {
            await api.patch(`/pre-reservas/${id}/confirmar`);
            fetchReservas();
        } catch (err: any) {
            alert(err.response?.data?.error?.message || 'Erro');
        }
    };

    const handleCancelar = async (id: string) => {
        const motivo = prompt('Motivo do cancelamento:');
        if (motivo === null) return;
        try {
            await api.patch(`/pre-reservas/${id}/cancelar`, { motivo });
            fetchReservas();
        } catch (err: any) {
            alert(err.response?.data?.error?.message || 'Erro');
        }
    };

    const fmt = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

    const filteredReservas = reservas.filter(r => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (
            r.solicitanteNome?.toLowerCase().includes(s) ||
            r.cliente?.nome?.toLowerCase().includes(s) ||
            r.veiculo?.placa?.toLowerCase().includes(s) ||
            r.equipamento?.toLowerCase().includes(s)
        );
    });

    return (
        <div className="h-full flex flex-col space-y-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Pré-Reservas</h1>
                    <p className="text-sm text-slate-500">Gerenciar reservas de equipamentos antes da confirmação</p>
                </div>
                <button onClick={() => setShowForm(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors">
                    <Plus className="w-4 h-4" /> Nova Pré-Reserva
                </button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3">
                <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                    {([
                        { key: 'pendentes', label: 'Pendentes' },
                        { key: 'todas', label: 'Todas' },
                        { key: 'canceladas', label: 'Canceladas' },
                    ] as const).map(f => (
                        <button key={f.key} onClick={() => setFilter(f.key)}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold ${filter === f.key ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>
                            {f.label}
                        </button>
                    ))}
                </div>
                <div className="flex-1 relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por cliente, placa, equipamento..."
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
                <span className="text-xs text-slate-400 font-bold">{filteredReservas.length} reserva(s)</span>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-3">
                {loading ? (
                    <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
                ) : filteredReservas.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <Calendar className="w-12 h-12 mb-3 opacity-30" />
                        <p className="text-sm font-bold">Nenhuma pré-reserva encontrada</p>
                    </div>
                ) : (
                    filteredReservas.map(r => (
                        <div key={r.id} className={`bg-white rounded-xl border p-4 transition-colors ${r.status === 'CANCELADO'
                            ? 'border-red-200 opacity-60'
                            : r.tipoAgendamento === 'CONFIRMADO'
                                ? 'border-emerald-200'
                                : r.diasAte < 0
                                    ? 'border-red-300 bg-red-50/30'
                                    : r.diasAte <= 3
                                        ? 'border-amber-300 bg-amber-50/30'
                                        : 'border-slate-200'
                            }`}>
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3 flex-1">
                                    {/* Icon */}
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${r.tipoAgendamento === 'CONFIRMADO' ? 'bg-emerald-100' : 'bg-sky-100'}`}>
                                        {r.tipoAgendamento === 'CONFIRMADO'
                                            ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                            : <Clock className="w-5 h-5 text-sky-500" />
                                        }
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-bold text-slate-800">
                                                {r.cliente?.nome || r.solicitanteNome || 'Sem identificação'}
                                            </span>
                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${r.tipoAgendamento === 'CONFIRMADO'
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : r.status === 'CANCELADO'
                                                    ? 'bg-red-100 text-red-600'
                                                    : 'bg-sky-100 text-sky-700'
                                                }`}>
                                                {r.tipoAgendamento === 'CONFIRMADO' ? 'Confirmado' : r.status === 'CANCELADO' ? 'Cancelado' : 'Pré-Reserva'}
                                            </span>
                                            {r.diasAte < 0 && r.status !== 'CANCELADO' && (
                                                <span className="text-[9px] font-black text-red-600 bg-red-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                    <AlertTriangle className="w-2.5 h-2.5" /> {Math.abs(r.diasAte)}d atrás
                                                </span>
                                            )}
                                            {r.diasAte >= 0 && r.diasAte <= 3 && r.status !== 'CANCELADO' && (
                                                <span className="text-[9px] font-black text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                                                    em {r.diasAte}d
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {fmt(r.data)}{r.dataFim ? ` → ${fmt(r.dataFim)}` : ''}
                                            </span>
                                            {r.hora && (
                                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{r.hora}</span>
                                            )}
                                            {r.veiculo && (
                                                <span className="flex items-center gap-1">
                                                    <Truck className="w-3 h-3" />
                                                    {r.veiculo.placa} — {r.veiculo.modelo}
                                                </span>
                                            )}
                                            {r.equipamento && (
                                                <span className="flex items-center gap-1 font-bold text-slate-600">{r.equipamento}</span>
                                            )}
                                            {r.solicitanteTelefone && (
                                                <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{r.solicitanteTelefone}</span>
                                            )}
                                        </div>

                                        {/* Bicos/Turnos/Equipe */}
                                        {(r.qtdBicos || r.turnos) && (
                                            <div className="flex gap-2 mt-1.5">
                                                <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                                    {r.qtdBicos || 1} bico(s)
                                                </span>
                                                <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                                    {r.turnos || 'DIURNO'}
                                                </span>
                                                {r.qtdPessoas && (
                                                    <span className="text-[9px] font-bold bg-blue-100 text-blue-600 px-2 py-0.5 rounded flex items-center gap-1">
                                                        <Users className="w-2.5 h-2.5" /> {r.qtdPessoas} pessoas
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                {r.status !== 'CANCELADO' && r.tipoAgendamento !== 'CONFIRMADO' && (
                                    <div className="flex gap-2 flex-shrink-0">
                                        <button onClick={() => handleConfirmar(r.id)} title="Confirmar"
                                            className="bg-emerald-50 text-emerald-600 p-2 rounded-lg hover:bg-emerald-100 transition-colors">
                                            <CheckCircle2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => {
                                            const params = new URLSearchParams();
                                            if (r.clienteId) params.set('clienteId', r.clienteId);
                                            if (r.solicitanteNome) params.set('clienteNome', r.solicitanteNome);
                                            if (r.data) params.set('data', r.data.split('T')[0]);
                                            if (r.veiculoId) params.set('veiculoId', r.veiculoId);
                                            window.location.href = `/propostas?${params.toString()}`;
                                        }} title="Gerar Proposta"
                                            className="bg-blue-50 text-blue-600 p-2 rounded-lg hover:bg-blue-100 transition-colors">
                                            <FileText className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleCancelar(r.id)} title="Cancelar"
                                            className="bg-red-50 text-red-500 p-2 rounded-lg hover:bg-red-100 transition-colors">
                                            <XCircle className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="bg-sky-600 p-6 flex items-center justify-between rounded-t-2xl">
                            <div className="text-white">
                                <h2 className="text-lg font-bold">Nova Pré-Reserva</h2>
                                <p className="text-xs text-white/70">Reserve equipamento antes da confirmação formal</p>
                            </div>
                            <button onClick={() => setShowForm(false)} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Dates */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Data Início *</label>
                                    <input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })}
                                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Data Fim</label>
                                    <input type="date" value={form.dataFim} onChange={e => setForm({ ...form, dataFim: e.target.value })}
                                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Horário</label>
                                    <input type="time" value={form.hora} onChange={e => setForm({ ...form, hora: e.target.value })}
                                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                                </div>
                            </div>

                            {/* Disponibilidade preview */}
                            {disponibilidade && (
                                <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-4 text-[10px]">
                                    <span className="flex items-center gap-1 text-emerald-600 font-bold">
                                        <Truck className="w-3 h-3" /> {disponibilidade.resumo.totalDisponiveis} disponíveis
                                    </span>
                                    <span className="flex items-center gap-1 text-amber-600 font-bold">
                                        {disponibilidade.resumo.totalOcupados} ocupados
                                    </span>
                                    <span className="flex items-center gap-1 text-slate-400 font-bold">
                                        {disponibilidade.resumo.totalManutencao} em manutenção
                                    </span>
                                </div>
                            )}

                            {/* Client / Solicitante */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Cliente (cadastrado)</label>
                                    <select value={form.clienteId} onChange={e => setForm({ ...form, clienteId: e.target.value })}
                                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm">
                                        <option value="">Selecionar...</option>
                                        {clientes.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Ou Nome do Solicitante</label>
                                    <input value={form.solicitanteNome} onChange={e => setForm({ ...form, solicitanteNome: e.target.value })}
                                        placeholder="Cliente não cadastrado" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Telefone do Solicitante</label>
                                <input value={form.solicitanteTelefone} onChange={e => setForm({ ...form, solicitanteTelefone: e.target.value })}
                                    placeholder="(XX) XXXXX-XXXX" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                            </div>

                            {/* Vehicle */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Veículo</label>
                                    <select value={form.veiculoId} onChange={e => setForm({ ...form, veiculoId: e.target.value })}
                                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm">
                                        <option value="">Selecionar...</option>
                                        {(disponibilidade?.disponiveis || veiculos).map((v: any) => (
                                            <option key={v.id} value={v.id}>{v.placa} — {v.modelo} ({v.tipoEquipamento || 'N/A'})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Equipamento</label>
                                    <input value={form.equipamento} onChange={e => setForm({ ...form, equipamento: e.target.value })}
                                        placeholder="Ex: Combinado, SAP, Vácuo" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                                </div>
                            </div>

                            {/* Bicos / Turnos / Equipe */}
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                                <h3 className="text-[10px] font-black text-amber-700 uppercase">Dimensionamento de Equipe</h3>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Bicos</label>
                                        <div className="flex gap-2">
                                            {[1, 2].map(n => (
                                                <button key={n} type="button"
                                                    onClick={() => {
                                                        const pessoas = calcEquipe(n, form.turnos);
                                                        setForm({ ...form, qtdBicos: n, qtdPessoas: pessoas });
                                                    }}
                                                    className={`flex-1 py-2 rounded-lg text-sm font-bold border-2 transition-all ${form.qtdBicos === n
                                                        ? 'bg-amber-500 border-amber-500 text-white'
                                                        : 'bg-white border-slate-200 text-slate-500'
                                                        }`}>
                                                    {n}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Turnos</label>
                                        <select value={form.turnos}
                                            onChange={e => {
                                                const pessoas = calcEquipe(form.qtdBicos, e.target.value);
                                                setForm({ ...form, turnos: e.target.value, qtdPessoas: pessoas });
                                            }}
                                            className="w-full border border-slate-200 rounded-lg p-2 text-sm">
                                            <option value="DIURNO">Diurno</option>
                                            <option value="NOTURNO">Noturno</option>
                                            <option value="24H">24 Horas</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Equipe</label>
                                        <div className="bg-white border border-amber-200 rounded-lg p-2 text-center">
                                            <span className="text-lg font-black text-amber-700">{form.qtdPessoas}</span>
                                            <span className="text-[10px] text-slate-400 ml-1">pessoas</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Observações */}
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Observações</label>
                                <textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })}
                                    placeholder="Detalhes adicionais..." rows={3}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                            </div>

                            <button onClick={handleCreate} disabled={saving || !form.data}
                                className="w-full bg-sky-600 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-sky-700 transition-colors">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                Criar Pré-Reserva
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
