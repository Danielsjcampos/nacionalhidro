import React, { useEffect, useState, useCallback } from 'react';
import {
    X, Save, Calendar, Eye, AlertTriangle, Clock, Sparkles, Copy, Ban, Users,
    RotateCcw, UserX, Loader2, Search, Link2
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';

interface ModalCadastroEscalaProps {
    isOpen: boolean;
    onClose: () => void;
    data: any; // Partial<Escala>
    mode: 'view' | 'create' | 'edit';
    onSave: (formData: any) => Promise<void>;
    onModeChange: (mode: 'view' | 'create' | 'edit') => void;
    clientes: any[];
    veiculos: any[];
    onQuadroFuncOpen: () => void;
    onDuplicate: () => void;
    onCancelOpen: () => void;
    onRevertCancel: (justificativa: string) => Promise<void>;
    onRegisterFalta: (funcIdOrNome: string, funcNome: string) => Promise<void>;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; label: string }> = {
    AGENDADO: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', label: 'Agendado' },
    EM_ANDAMENTO: { bg: 'bg-blue-900', text: 'text-white', border: 'border-blue-800', label: 'Em Execução' },
    CONCLUIDO: { bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-200', label: 'Concluído' },
    CANCELADO: { bg: 'bg-slate-200', text: 'text-slate-800', border: 'border-slate-300', label: 'Cancelado' },
    CANCELADA: { bg: 'bg-slate-200', text: 'text-slate-800', border: 'border-slate-300', label: 'Cancelado' },
};

const TIPO_CONFIG: Record<string, { dot: string; label: string }> = {
    PRE_AGENDADO: { dot: 'bg-sky-400', label: 'Pré-agendado' },
    CONFIRMADO: { dot: 'bg-emerald-500', label: 'Confirmado' },
};

const STATUS_OPERACIONAL = [
    { value: 'NORMAL', label: 'Normal' },
    { value: 'FERIAS', label: 'Férias' },
    { value: 'ATESTADO', label: 'Atestado' },
    { value: 'LICENCA', label: 'Licença' },
    { value: 'INSS', label: 'INSS' },
    { value: 'FOLGA', label: 'Folga' },
];

export default function ModalCadastroEscala({
    isOpen,
    onClose,
    data,
    mode,
    onSave,
    onModeChange,
    clientes,
    veiculos,
    onQuadroFuncOpen,
    onDuplicate,
    onCancelOpen,
    onRevertCancel,
    onRegisterFalta
}: ModalCadastroEscalaProps) {
    const { showToast } = useToast();
    const [formData, setFormData] = useState<any>(null);
    const [teamAvailability, setTeamAvailability] = useState<any[]>([]);
    const [loadingIA, setLoadingIA] = useState(false);
    const [sugestaoIA, setSugestaoIA] = useState<any>(null);
    const [saving, setSaving] = useState(false);

    // Search OS logic
    const [osSearch, setOsSearch] = useState('');
    const [osResults, setOsResults] = useState<any[]>([]);
    const [searchingOs, setSearchingOs] = useState(false);
    const [showOsResults, setShowOsResults] = useState(false);

    useEffect(() => {
        if (isOpen && data) {
            setFormData({ ...data });
            setSugestaoIA(null);
            setOsSearch(data.codigoOS || '');
        }
    }, [isOpen, data]);

    useEffect(() => {
        if (isOpen && mode !== 'view' && formData?.data && formData?.clienteId) {
            api.get('/rh/disponibilidade', { params: { data: formData.data, clienteId: formData.clienteId } })
                .then(res => setTeamAvailability(res.data))
                .catch(err => console.error('Error fetching team availability', err));
        } else {
            setTeamAvailability([]);
        }
    }, [isOpen, mode, formData?.data, formData?.clienteId]);

    const handleSave = async () => {
        if (!formData) return;
        setSaving(true);
        try {
            await onSave(formData);
        } finally {
            setSaving(false);
        }
    };

    const handleSugerirIA = async () => {
        if (!formData?.data) {
            showToast('Selecione uma data para a IA analisar.');
            return;
        }
        setLoadingIA(true);
        setSugestaoIA(null);
        try {
            const res = await api.post('/instograma/ia-sugerir', {
                date: formData.data,
                clienteId: formData.clienteId,
                equipamento: formData.equipamento
            });
            setSugestaoIA(res.data);
        } catch (err: any) {
            console.error(err);
            showToast(err.response?.data?.error?.message || 'Erro ao consultar inteligência artificial.');
        } finally {
            setLoadingIA(false);
        }
    };

    const updateFuncionarioField = (index: number, field: string, value: any) => {
        setFormData((prev: any) => {
            if (!prev) return prev;
            const funcs = Array.isArray(prev.funcionarios) ? [...prev.funcionarios] : [];
            if (funcs[index]) {
                const item = typeof funcs[index] === 'object' ? { ...funcs[index] } : { nome: funcs[index], statusOperacional: 'NORMAL', ausente: false };
                item[field] = value;
                funcs[index] = item;
            }
            return { ...prev, funcionarios: funcs };
        });
    };

    const removeFuncionario = (index: number) => {
        setFormData((prev: any) => {
            if (!prev) return prev;
            const funcs = Array.isArray(prev.funcionarios) ? [...prev.funcionarios] : [];
            return { ...prev, funcionarios: funcs.filter((_: any, i: number) => i !== index) };
        });
    };

    const addFuncionarioRow = () => {
        setFormData((prev: any) => {
            if (!prev) return prev;
            const funcs = Array.isArray(prev.funcionarios) ? [...prev.funcionarios] : [];
            return { ...prev, funcionarios: [...funcs, { nome: '', statusOperacional: 'NORMAL', ausente: false }] };
        });
    };

    // OS Search logic
    const searchOS = useCallback(async (val: string) => {
        if (!val || val.length < 2) {
            setOsResults([]);
            setShowOsResults(false);
            return;
        }
        setSearchingOs(true);
        try {
            const res = await api.get('/os', { params: { search: val, limit: 10 } });
            setOsResults(res.data);
            setShowOsResults(true);
        } catch (err) {
            console.error('OS Search error', err);
        } finally {
            setSearchingOs(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (mode !== 'view') searchOS(osSearch);
        }, 500);
        return () => clearTimeout(timer);
    }, [osSearch, searchOS, mode]);

    const selectOS = (os: any) => {
        setFormData((prev: any) => ({
            ...prev,
            codigoOS: os.codigo,
            clienteId: os.clienteId || prev.clienteId,
            equipamento: os.servicos?.[0]?.equipamento || prev.equipamento || os.servicos?.[0]?.descricao,
            empresaId: os.empresa || prev.empresaId,
            data: os.dataInicial ? os.dataInicial.split('T')[0] : prev.data
        }));
        setOsSearch(os.codigo);
        setShowOsResults(false);
        showToast(`OS ${os.codigo} vinculada! Cliente e Equipamento atualizados.`, 'success');
    };

    if (!isOpen || !formData) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 motion-safe:animate-[fadeIn_200ms_ease]">
                {/* Modal Header */}
                <div className="bg-blue-600 p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-white italic">
                        <Calendar className="w-6 h-6" />
                        <div>
                            <h2 className="font-black uppercase tracking-tighter text-lg leading-none">
                                {mode === 'create' ? 'Nova Escala' : mode === 'edit' ? 'Editar Escala' : 'Detalhes da Escala'}
                            </h2>
                            {formData.veiculo?.placa && (
                                <p className="text-[10px] text-white/70 font-bold uppercase mt-1 tracking-widest">
                                    {formData.veiculo.placa} — {formData.veiculo.modelo}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/70 hover:text-white transition-colors p-1"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                    {mode === 'view' ? (
                        /* ── View Mode ────────────────────────────────────────── */
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-6">
                                <InfoRow label="Cliente" value={formData.cliente?.nome || '—'} />
                                <InfoRow label="Equipamento" value={formData.equipamento || '—'} />
                                <InfoRow label="Data" value={formData.data ? new Date(formData.data).toLocaleDateString('pt-BR') : '—'} />
                                <InfoRow label="Horário" value={formData.hora || '—'} />
                                <InfoRow label="Status" value={STATUS_CONFIG[formData.status || '']?.label || formData.status || '—'} />
                                <InfoRow label="Tipo" value={TIPO_CONFIG[formData.tipoAgendamento || '']?.label || '—'} />
                                <InfoRow label="OS Vinculada" value={formData.codigoOS || '—'} />
                                <InfoRow label="Empresa" value={formData.empresa || '—'} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest block mb-1">Equipe Escalada</label>
                                {Array.isArray(formData.funcionarios) && formData.funcionarios.length > 0 ? (
                                    <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                                        <thead className="bg-slate-100">
                                            <tr>
                                                <th className="px-3 py-1.5 text-left text-[9px] font-black text-slate-500 uppercase">Funcionário</th>
                                                <th className="px-3 py-1.5 text-left text-[9px] font-black text-slate-500 uppercase">Status Operacional</th>
                                                <th className="px-3 py-1.5 text-center text-[9px] font-black text-slate-500 uppercase">Ausente</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {formData.funcionarios.map((f: any, i: number) => {
                                                const nome = typeof f === 'object' ? f.nome : f;
                                                const status = typeof f === 'object' ? f.statusOperacional : 'NORMAL';
                                                const ausente = typeof f === 'object' ? f.ausente : false;
                                                return (
                                                    <tr key={i} className={ausente ? 'bg-red-50' : ''}>
                                                        <td className="px-3 py-1.5 font-bold text-slate-700">{nome}</td>
                                                        <td className="px-3 py-1.5">
                                                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                                                                status === 'NORMAL' ? 'bg-emerald-100 text-emerald-700' :
                                                                status === 'FERIAS' ? 'bg-blue-100 text-blue-700' :
                                                                status === 'ATESTADO' ? 'bg-amber-100 text-amber-700' :
                                                                'bg-slate-100 text-slate-600'
                                                            }`}>{status}</span>
                                                        </td>
                                                        <td className="px-3 py-1.5 text-center">{ausente ? <span className="text-red-600 font-black">SIM</span> : '—'}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                ) : (
                                    <span className="text-xs text-slate-500 italic">Nenhum funcionário escalado</span>
                                )}
                            </div>
                            {formData.observacoes && (
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest block mb-1">Observações</label>
                                    <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-xl">{formData.observacoes}</p>
                                </div>
                            )}

                            {/* Accões de Contexto (view mode) */}
                            {formData.tipoAgendamento === 'PRE_AGENDADO' && (
                                <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-5 space-y-3">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-orange-900 italic">📌 Dados da Pré-Reserva</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <InfoRow label="Solicitante" value={formData.solicitanteNome || '—'} />
                                        <InfoRow label="Telefone" value={formData.solicitanteTelefone || '—'} />
                                        <InfoRow label="Bicos" value={`${formData.qtdBicos || 1} bico(s)`} />
                                        <InfoRow label="Turnos" value={formData.turnos || 'DIURNO'} />
                                        <InfoRow label="Equipe Necessária" value={`${formData.qtdPessoas || '—'} pessoas`} />
                                    </div>
                                    <button
                                        onClick={() => {
                                            const params = new URLSearchParams();
                                            if (formData.clienteId) params.set('clienteId', formData.clienteId);
                                            if (formData.solicitanteNome) params.set('clienteNome', formData.solicitanteNome);
                                            if (formData.data) params.set('data', formData.data.toString().split('T')[0]);
                                            if (formData.veiculoId) params.set('veiculoId', formData.veiculoId);
                                            window.location.href = `/propostas?${params.toString()}`;
                                        }}
                                        className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg transition-all"
                                    >
                                        🚀 Gerar Proposta
                                    </button>
                                </div>
                            )}

                            {!formData.codigoOS && (
                                <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 space-y-3">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-700 italic">📋 Gerar Ordem de Serviço</h3>
                                    <p className="text-xs text-slate-500">
                                        Crie uma OS para este agendamento.
                                    </p>
                                    <button
                                        onClick={() => {
                                            const params = new URLSearchParams();
                                            if (formData.clienteId) params.set('clienteId', formData.clienteId);
                                            if (formData.cliente?.nome) params.set('clienteNome', formData.cliente.nome);
                                            if (formData.data) params.set('data', formData.data.toString().split('T')[0]);
                                            if (formData.veiculoId) params.set('veiculoId', formData.veiculoId);
                                            params.set('autoOpen', 'true');
                                            window.location.href = `/os?${params.toString()}`;
                                        }}
                                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg transition-all"
                                    >
                                        📋 Gerar OS
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* ── Create / Edit Mode ───────────────────────────────── */
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField label="Vincular Ordem de Serviço (OS)">
                                    <div className="relative">
                                        <div className="flex items-center gap-2 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 focus-within:border-blue-600 transition-all">
                                            <Search className="w-4 h-4 text-slate-400" />
                                            <input
                                                type="text"
                                                className="w-full bg-transparent text-sm font-bold outline-none"
                                                value={osSearch}
                                                onChange={(e) => setOsSearch(e.target.value)}
                                                onFocus={() => osResults.length > 0 && setShowOsResults(true)}
                                                placeholder="Buscar por código ou cliente..."
                                            />
                                            {searchingOs && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
                                        </div>
                                        
                                        {showOsResults && (
                                            <div className="absolute top-full left-0 w-full bg-white border border-slate-200 mt-2 rounded-xl shadow-xl z-[60] overflow-hidden max-h-[300px] overflow-y-auto">
                                                {osResults.map(os => (
                                                    <button
                                                        key={os.id}
                                                        onClick={() => selectOS(os)}
                                                        className="w-full text-left p-3 hover:bg-blue-50 border-b border-slate-50 last:border-0 transition-colors flex items-center justify-between"
                                                    >
                                                        <div>
                                                            <span className="font-black text-blue-600 block text-xs">{os.codigo}</span>
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase">{os.cliente?.nome}</span>
                                                        </div>
                                                        <Link2 className="w-3 h-3 text-slate-300" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </FormField>

                                <FormField label="Data Programada">
                                    <input
                                        type="date"
                                        className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-600 transition-all"
                                        value={formData.data ? formData.data.split('T')[0] : ''}
                                        onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                                    />
                                </FormField>

                                <FormField label="Horário Previsto">
                                    <input
                                        type="time"
                                        className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-600 transition-all"
                                        value={formData.hora || ''}
                                        onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                                    />
                                </FormField>

                                <FormField label="Cliente">
                                    <select
                                        className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-600 transition-all appearance-none cursor-pointer"
                                        value={formData.clienteId || ''}
                                        onChange={(e) => setFormData({ ...formData, clienteId: e.target.value })}
                                    >
                                        <option value="">Selecione o cliente...</option>
                                        {clientes.map((c) => (
                                            <option key={c.id} value={c.id}>{c.nome.toUpperCase()}</option>
                                        ))}
                                    </select>
                                </FormField>

                                <FormField label="Empresa">
                                    <select
                                        className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-600 transition-all appearance-none cursor-pointer"
                                        value={formData.empresaId || ''}
                                        onChange={(e) => setFormData({ ...formData, empresaId: e.target.value })}
                                    >
                                        <option value="">Selecione a empresa...</option>
                                        <option value="NACIONAL HIDROSANEAMENTO EIRELI EPP">NACIONAL HIDROSANEAMENTO EIRELI EPP</option>
                                        <option value="NACIONAL HIDRO">NACIONAL HIDRO</option>
                                    </select>
                                </FormField>

                                <FormField label="Equipamento">
                                    <input
                                        type="text"
                                        className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-600 transition-all"
                                        value={formData.equipamento || ''}
                                        onChange={(e) => setFormData({ ...formData, equipamento: e.target.value })}
                                        placeholder="Ex: Combinado, SAP, Vácuo..."
                                    />
                                </FormField>

                                <FormField label="Veículo">
                                    <select
                                        className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-600 transition-all appearance-none cursor-pointer"
                                        value={formData.veiculoId || ''}
                                        onChange={(e) => setFormData({ ...formData, veiculoId: e.target.value })}
                                    >
                                        <option value="">Selecione o veículo...</option>
                                        {veiculos.map((v) => (
                                            <option key={v.id} value={v.id} disabled={v.status === 'MANUTENCAO'}>
                                                {v.placa} - {v.modelo} ({v.status})
                                            </option>
                                        ))}
                                    </select>
                                </FormField>

                                <FormField label="Tipo de Agendamento">
                                    <div className="grid grid-cols-2 gap-2">
                                        {(['PRE_AGENDADO', 'CONFIRMADO'] as const).map((tipo) => (
                                            <button
                                                key={tipo}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, tipoAgendamento: tipo })}
                                                className={`py-2.5 rounded-xl text-[10px] font-black uppercase italic border-2 transition-all ${formData.tipoAgendamento === tipo
                                                    ? tipo === 'PRE_AGENDADO' ? 'bg-orange-500 border-orange-500 text-white shadow-lg' : 'bg-emerald-500 border-emerald-500 text-white shadow-lg'
                                                    : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'
                                                }`}
                                            >
                                                {TIPO_CONFIG[tipo].label}
                                            </button>
                                        ))}
                                    </div>
                                </FormField>
                            </div>

                            {/* Detalhes Operacionais */}
                            <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-5 space-y-4">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic flex items-center gap-2">
                                    <AlertTriangle className="w-3.5 h-3.5" /> Detalhes da Escala Operacional
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField label="Qtd. Equipamentos/Bicos">
                                        <div className="grid grid-cols-2 gap-2">
                                            {[1, 2].map(n => (
                                                <button
                                                    key={n}
                                                    type="button"
                                                    onClick={() => {
                                                        const bicos = n;
                                                        const turnoMultiplier = formData.turnos === '24H' ? 2 : 1;
                                                        const pessoas = bicos === 1 ? (1 + 2) * turnoMultiplier : (1 + 4) * turnoMultiplier;
                                                        setFormData({ ...formData, qtdBicos: bicos, qtdPessoas: pessoas });
                                                    }}
                                                    className={`py-2 px-1 rounded-xl text-xs font-black border-2 transition-all ${formData.qtdBicos === n
                                                        ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                                        : 'bg-white border-slate-100 text-slate-400 hover:border-blue-300'
                                                    }`}
                                                >
                                                    {n} Equip{n > 1 ? 's' : ''} / Bico{n > 1 ? 's' : ''}
                                                </button>
                                            ))}
                                        </div>
                                    </FormField>
                                    <FormField label="Turnos Operacionais">
                                        <div className="grid grid-cols-3 gap-2">
                                            {['DIURNO', 'NOTURNO', '24H'].map(turno => (
                                                <button
                                                    key={turno}
                                                    type="button"
                                                    onClick={() => {
                                                        const bicos = formData.qtdBicos || 1;
                                                        const turnoMultiplier = turno === '24H' ? 2 : 1;
                                                        const pessoas = bicos === 1 ? (1 + 2) * turnoMultiplier : (1 + 4) * turnoMultiplier;
                                                        setFormData({ ...formData, turnos: turno, qtdPessoas: pessoas });
                                                    }}
                                                    className={`py-2 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${formData.turnos === turno
                                                        ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                                        : 'bg-white border-slate-100 text-slate-400 hover:border-blue-300'
                                                    }`}
                                                >
                                                    {turno}
                                                </button>
                                            ))}
                                        </div>
                                    </FormField>
                                </div>
                                
                                {formData.qtdPessoas && (
                                    <div className="text-center bg-white rounded-xl border border-blue-200 py-3 mt-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-900">Equipe Necessária: </span>
                                        <span className="text-lg font-black text-blue-950">{formData.qtdPessoas}</span>
                                        <span className="text-[10px] font-bold text-slate-400 ml-1">pessoas</span>
                                    </div>
                                )}
                            </div>

                            {/* Assistente de IA */}
                            <div className="bg-indigo-50 border-2 border-indigo-100 rounded-2xl p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-700 italic flex items-center gap-2">
                                        <Sparkles className="w-3.5 h-3.5" /> Assistente de Escala IA
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={handleSugerirIA}
                                        disabled={loadingIA || !formData.data}
                                        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase italic tracking-widest flex items-center gap-2 shadow-sm transition-all"
                                    >
                                        {loadingIA ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                        Sugerir Equipe Ideal
                                    </button>
                                </div>
                                {sugestaoIA && (
                                    <div className="mt-4 text-xs text-indigo-900 bg-white p-4 rounded-xl shadow-sm border border-indigo-100">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-bold uppercase text-[10px]">Sugestão (Confiança: {sugestaoIA.scoreConfianca}%)</span>
                                            <button 
                                                type="button" 
                                                className="text-indigo-600 hover:underline font-bold text-[10px] uppercase tracking-wider"
                                                onClick={() => {
                                                    const funcs = sugestaoIA.funcionariosSugeridos?.map((f: any) => ({
                                                        nome: f.nome,
                                                        statusOperacional: 'NORMAL',
                                                        ausente: false
                                                    })) || [];
                                                    setFormData((prev: any) => ({ 
                                                        ...prev, 
                                                        veiculoId: sugestaoIA.veiculoSugerido?.id || prev.veiculoId,
                                                        funcionarios: funcs
                                                    }));
                                                }}
                                            >✨ Aplicar Sugestão</button>
                                        </div>
                                        <p className="mb-3 italic font-semibold text-slate-700">"{sugestaoIA.justificativa}"</p>
                                    </div>
                                )}
                            </div>

                            {/* Funcionários */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">Funcionários</label>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={onQuadroFuncOpen} className="text-[9px] font-bold text-teal-600 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 hover:bg-teal-100 transition-all uppercase tracking-wider">Ver Quadro</button>
                                        <button type="button" onClick={addFuncionarioRow} className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 hover:bg-blue-100 transition-all uppercase tracking-wider">+ Adicionar</button>
                                    </div>
                                </div>

                                {Array.isArray(formData.funcionarios) && formData.funcionarios.length > 0 ? (
                                    <table className="w-full text-xs border border-slate-200 rounded-xl overflow-hidden">
                                        <thead className="bg-slate-100">
                                            <tr>
                                                <th className="px-3 py-2 text-left text-[9px] font-black text-slate-500 uppercase w-[40%]">Funcionário</th>
                                                <th className="px-3 py-2 text-left text-[9px] font-black text-slate-500 uppercase w-[30%]">Status Operacional</th>
                                                <th className="px-3 py-2 text-center text-[9px] font-black text-slate-500 uppercase w-[15%]">Ausente</th>
                                                <th className="px-3 py-2 text-center text-[9px] font-black text-slate-500 uppercase w-[15%]">Ação</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {formData.funcionarios.map((f: any, idx: number) => (
                                                <tr key={idx} className={`hover:bg-blue-50/30 ${f.ausente ? 'bg-red-50/50' : ''}`}>
                                                    <td className="px-3 py-2">
                                                        <select
                                                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:border-blue-500 appearance-none"
                                                            value={typeof f === 'object' ? f.nome : f}
                                                            onChange={(e) => updateFuncionarioField(idx, 'nome', e.target.value)}
                                                        >
                                                            <option value="">Selecione...</option>
                                                            {teamAvailability.map(ta => (
                                                                <option key={ta.id} value={ta.nome}>{ta.nome}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <select
                                                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:border-blue-500 appearance-none"
                                                            value={f.statusOperacional || 'NORMAL'}
                                                            onChange={(e) => updateFuncionarioField(idx, 'statusOperacional', e.target.value)}
                                                        >
                                                            {STATUS_OPERACIONAL.map(s => (
                                                                <option key={s.value} value={s.value}>{s.label}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="px-3 py-2 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!f.ausente}
                                                            onChange={(e) => updateFuncionarioField(idx, 'ausente', e.target.checked)}
                                                            className="w-4 h-4 accent-red-600 cursor-pointer"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2 text-center">
                                                        <button type="button" onClick={() => removeFuncionario(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors">
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="p-4 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                        Nenhum funcionário adicionado.
                                    </div>
                                )}
                            </div>

                            <FormField label="Observações">
                                <textarea
                                    className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl p-4 text-sm min-h-[100px] outline-none focus:border-blue-600 font-bold tracking-tight transition-all"
                                    value={formData.observacoes || ''}
                                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                                    placeholder="Detalhes adicionais..."
                                />
                            </FormField>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                    <div className="flex gap-2">
                        {mode === 'view' && formData.id && formData.status !== 'CANCELADO' && formData.status !== 'CANCELADA' && (
                            <>
                                <button onClick={onDuplicate} className="px-4 py-2.5 text-[10px] font-bold uppercase text-blue-600 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-all flex items-center gap-1.5 tracking-wide"><Copy className="w-3.5 h-3.5" /> Duplicar</button>
                                <button onClick={async () => {
                                    const res = window.prompt("Nome do funcionário que faltou:");
                                    if(res) onRegisterFalta(res, res);
                                }} className="px-4 py-2.5 text-[10px] font-bold uppercase text-amber-700 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-all flex items-center gap-1.5 tracking-wide"><UserX className="w-3.5 h-3.5" /> Faltou</button>
                                <button onClick={onCancelOpen} className="px-4 py-2.5 text-[10px] font-bold uppercase text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-all flex items-center gap-1.5 tracking-wide"><Ban className="w-3.5 h-3.5" /> Cancelar</button>
                            </>
                        )}
                        {mode === 'view' && (formData.status === 'CANCELADO' || formData.status === 'CANCELADA') && (
                            <button onClick={async () => {
                                const j = window.prompt("Justificativa:");
                                if(j) onRevertCancel(j);
                            }} className="px-4 py-2.5 text-[10px] font-bold uppercase text-teal-700 bg-teal-50 border border-teal-200 rounded-xl hover:bg-teal-100 transition-all flex items-center gap-1.5 tracking-wide"><RotateCcw className="w-3.5 h-3.5" /> Reverter</button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-6 py-3 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 transition-all italic">{mode === 'view' ? 'Fechar' : 'Cancelar'}</button>
                        {mode === 'view' && <button onClick={() => onModeChange('edit')} className="bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-2xl flex items-center gap-2 hover:border-blue-400 transition-all text-[10px] font-black uppercase italic tracking-widest"><Eye className="w-4 h-4" /> Editar</button>}
                        {(mode === 'create' || mode === 'edit') && (
                            <>
                                <button onClick={onQuadroFuncOpen} className="bg-teal-50 border border-teal-200 text-teal-700 px-4 py-3 rounded-2xl flex items-center gap-2 hover:bg-teal-100 transition-all text-[10px] font-bold uppercase tracking-widest"><Users className="w-4 h-4" /> Quadro</button>
                                <button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-3.5 rounded-2xl flex items-center gap-2 transition-all shadow-xl shadow-blue-500/20 text-[10px] font-black uppercase italic tracking-widest">
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    Salvar
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest block mb-1">{label}</label>
            <p className="text-sm font-bold text-slate-700">{value}</p>
        </div>
    );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">{label}</label>
            {children}
        </div>
    );
}
