import { useEffect, useState, useMemo, useCallback } from 'react';
import api from '../services/api';
import {
    Loader2, ChevronLeft, ChevronRight, Calendar, Plus,
    X, Save, Truck, Eye, AlertTriangle, Wrench, Clock, Sparkles
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Veiculo {
    id: string;
    placa: string;
    modelo: string;
    marca?: string;
    tipo: string;
    status: string;
    tipoEquipamento?: string;
    exibirNoHistograma?: boolean;
}

interface Cliente {
    id: string;
    nome: string;
    razaoSocial?: string;
}

interface Escala {
    id: string;
    data: string;
    dataFim?: string | null;
    hora?: string;
    codigoOS?: string;
    equipamento?: string;
    status: string;
    tipoAgendamento: string;
    cor?: string | null;
    observacoes?: string;
    funcionarios?: any;
    veiculoId?: string;
    clienteId?: string;
    veiculo?: Veiculo;
    cliente?: Cliente;
    solicitanteNome?: string;
    solicitanteTelefone?: string;
    qtdBicos?: number;
    turnos?: string;
    qtdPessoas?: number;
}

interface ManutencaoAtiva {
    veiculoId: string;
    descricao?: string;
    prioridade: string;
}

type ViewMode = 'semana' | 'mes' | 'ano';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
}

function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();
}

function dateToKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(d: Date): string {
    return d.toLocaleDateString('pt-BR');
}

// ─── Status Config ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; label: string }> = {
    AGENDADO: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', label: 'Agendado' },
    EM_ANDAMENTO: { bg: 'bg-blue-900', text: 'text-white', border: 'border-blue-800', label: 'Em Execução' },
    CONCLUIDO: { bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-200', label: 'Concluído' },
    CANCELADO: { bg: 'bg-slate-200', text: 'text-slate-800', border: 'border-slate-300', label: 'Cancelado' },
};

const TIPO_CONFIG: Record<string, { dot: string; label: string }> = {
    PRE_AGENDADO: { dot: 'bg-sky-400', label: 'Pré-agendado' },
    CONFIRMADO: { dot: 'bg-emerald-500', label: 'Confirmado' },
};

// ═════════════════════════════════════════════════════════════════════════════
// Component: Histograma
// ═════════════════════════════════════════════════════════════════════════════

export default function Histograma() {
    // ── State ──────────────────────────────────────────────────────────────────

    const [loading, setLoading] = useState(true);
    const [escalas, setEscalas] = useState<Escala[]>([]);
    const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
    const [manutencoesAtivas, setManutencoesAtivas] = useState<ManutencaoAtiva[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);

    const [viewMode, setViewMode] = useState<ViewMode>('mes');
    const [currentDate, setCurrentDate] = useState(new Date());

    const [selectedTipo, setSelectedTipo] = useState<'Abertas' | 'Executadas' | 'Canceladas'>('Abertas');

    // ── Filters ─────────────────────────────────────────────────────────────
    const [filtroTipos, setFiltroTipos] = useState<Set<string>>(new Set());

    const TIPOS_EQUIPAMENTO = [
        { value: 'HIDROJATO', label: 'Hidrojato', color: 'bg-blue-500' },
        { value: 'VACUO', label: 'Vácuo', color: 'bg-blue-700' },
        { value: 'CARRETA', label: 'Carreta', color: 'bg-emerald-500' },
        { value: 'CARRO_APOIO', label: 'Carro Apoio', color: 'bg-slate-400' },
    ];

    const toggleFiltroTipo = (tipo: string) => {
        setFiltroTipos(prev => {
            const next = new Set(prev);
            if (next.has(tipo)) next.delete(tipo);
            else next.add(tipo);
            return next;
        });
    };

    // Filtered vehicles (respect exibirNoHistograma + type filters)
    const filteredVeiculos = useMemo(() => {
        return veiculos.filter(v => {
            if (v.exibirNoHistograma === false) return false;
            if (filtroTipos.size === 0) return true;
            return filtroTipos.has(v.tipoEquipamento || '');
        });
    }, [veiculos, filtroTipos]);

    // Modal
    const [modalOpen, setModalOpen] = useState(false);
    const [modalEscala, setModalEscala] = useState<Partial<Escala> | null>(null);
    const [modalMode, setModalMode] = useState<'view' | 'create' | 'edit'>('view');

    // Tooltip
    const [tooltip, setTooltip] = useState<{ x: number; y: number; escala: Escala } | null>(null);

    // Drag and Drop
    const [draggedEscala, setDraggedEscala] = useState<Escala | null>(null);

    // Team Availability
    const [teamAvailability, setTeamAvailability] = useState<any[]>([]);

    // IA Assistant
    const [loadingIA, setLoadingIA] = useState(false);
    const [sugestaoIA, setSugestaoIA] = useState<any>(null);

    // ── Date Range Calculation ─────────────────────────────────────────────────

    const { days, startDate, endDate, headerLabel } = useMemo(() => {
        const result: Date[] = [];

        if (viewMode === 'semana') {
            const monday = getMonday(currentDate);
            for (let i = 0; i < 7; i++) {
                const d = new Date(monday);
                d.setDate(monday.getDate() + i);
                result.push(d);
            }
            const start = result[0];
            const end = result[6];
            return {
                days: result,
                startDate: start,
                endDate: end,
                headerLabel: `${formatDate(start)} — ${formatDate(end)}`,
            };
        } else if (viewMode === 'mes') {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const total = getDaysInMonth(year, month);
            for (let i = 1; i <= total; i++) {
                result.push(new Date(year, month, i));
            }
            return {
                days: result,
                startDate: result[0],
                endDate: result[result.length - 1],
                headerLabel: `${MESES[month]} ${year}`,
            };
        } else {
            // mode = ano
            const year = currentDate.getFullYear();
            const totalDays = (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 366 : 365;
            for (let i = 0; i < totalDays; i++) {
                const d = new Date(year, 0, 1);
                d.setDate(d.getDate() + i);
                result.push(d);
            }
            return {
                days: result,
                startDate: result[0],
                endDate: result[result.length - 1],
                headerLabel: `Ano ${year}`,
            };
        }
    }, [viewMode, currentDate]);

    // ── Fetch Data ─────────────────────────────────────────────────────────────

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const sDate = new Date(startDate);
            sDate.setDate(sDate.getDate() - 1);
            const eDate = new Date(endDate);
            eDate.setDate(eDate.getDate() + 1);

            const [instRes, cliRes] = await Promise.all([
                api.get('/instograma', {
                    params: {
                        startDate: sDate.toISOString(),
                        endDate: eDate.toISOString(),
                    },
                }),
                api.get('/clientes'),
            ]);

            setEscalas(instRes.data.escalas);
            setVeiculos(instRes.data.veiculos);
            setManutencoesAtivas(instRes.data.manutencoesAtivas);
            setClientes(cliRes.data);
        } catch (err) {
            console.error('Instograma fetch error', err);
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (modalMode !== 'view' && modalEscala?.data && modalEscala?.clienteId) {
            api.get('/rh/disponibilidade', { params: { data: modalEscala.data, clienteId: modalEscala.clienteId } })
                .then(res => setTeamAvailability(res.data))
                .catch(err => console.error('Error fetching team availability', err));
        } else {
            setTeamAvailability([]);
        }
    }, [modalMode, modalEscala?.data, modalEscala?.clienteId]);

    // ── Escalas Map (veiculoId → dateKey → escalas[]) ─────────────────────────

    const escalasMap = useMemo(() => {
        const map: Record<string, Record<string, Escala[]>> = {};

        escalas.forEach((esc) => {
            const vId = esc.veiculoId || '__sem_veiculo__';
            if (!map[vId]) map[vId] = {};

            const start = new Date(esc.data);
            start.setHours(0, 0, 0, 0);
            const end = esc.dataFim ? new Date(esc.dataFim) : start;
            end.setHours(0, 0, 0, 0);

            const current = new Date(start);
            while (current <= end) {
                const key = dateToKey(current);
                if (!map[vId][key]) map[vId][key] = [];
                map[vId][key].push(esc);
                current.setDate(current.getDate() + 1);
            }
        });

        return map;
    }, [escalas]);

    // ── Manutenções Set ────────────────────────────────────────────────────────

    const manutencaoSet = useMemo(() => {
        return new Set(manutencoesAtivas.map((m) => m.veiculoId));
    }, [manutencoesAtivas]);

    // ── Navigation ─────────────────────────────────────────────────────────────

    const navigatePrev = () => {
        const d = new Date(currentDate);
        if (viewMode === 'semana') d.setDate(d.getDate() - 7);
        else if (viewMode === 'mes') d.setMonth(d.getMonth() - 1);
        else d.setFullYear(d.getFullYear() - 1);
        setCurrentDate(d);
    };

    const navigateNext = () => {
        const d = new Date(currentDate);
        if (viewMode === 'semana') d.setDate(d.getDate() + 7);
        else if (viewMode === 'mes') d.setMonth(d.getMonth() + 1);
        else d.setFullYear(d.getFullYear() + 1);
        setCurrentDate(d);
    };

    const goToToday = () => setCurrentDate(new Date());

    // ── Modal Handlers ─────────────────────────────────────────────────────────

    const openCreateModal = (veiculoId: string, date: Date) => {
        setModalEscala({
            veiculoId,
            data: date.toISOString().split('T')[0],
            status: 'AGENDADO',
            tipoAgendamento: 'PRE_AGENDADO',
        });
        setModalMode('create');
        setModalOpen(true);
    };

    const openViewModal = (escala: Escala) => {
        setModalEscala({ ...escala });
        setModalMode('view');
        setModalOpen(true);
    };

    // Drag & Drop Handlers
    const handleDragStart = (e: React.DragEvent, escala: Escala) => {
        e.dataTransfer.setData('text/plain', escala.id);
        setDraggedEscala(escala);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // allow drop
    };

    const handleDrop = async (e: React.DragEvent, targetVeiculoId: string, targetDate: Date) => {
        e.preventDefault();
        const escalaId = e.dataTransfer.getData('text/plain');
        if (!escalaId || !draggedEscala) return;

        if (draggedEscala.veiculoId === targetVeiculoId && isSameDay(new Date(draggedEscala.data), targetDate)) {
            setDraggedEscala(null);
            return;
        }

        try {
            await api.patch(`/logistica/escalas/${escalaId}`, {
                veiculoId: targetVeiculoId,
                data: targetDate.toISOString()
            });
            fetchData();
        } catch (err) {
            console.error('Error dropping escala', err);
        }
        setDraggedEscala(null);
    };

    const toggleFuncionario = (nome: string, disabled: boolean) => {
        if (disabled) return;
        setModalEscala(prev => {
            if (!prev) return prev;
            const funcs = Array.isArray(prev.funcionarios) ? [...prev.funcionarios] : [];
            if (funcs.includes(nome)) {
                return { ...prev, funcionarios: funcs.filter(n => n !== nome) };
            } else {
                return { ...prev, funcionarios: [...funcs, nome] };
            }
        });
    };

    const handleSugerirIA = async () => {
        if (!modalEscala?.data) {
            alert('Selecione uma data para a IA analisar.');
            return;
        }
        setLoadingIA(true);
        setSugestaoIA(null);
        try {
            // Note: date input gives string format YYYY-MM-DD which is fine
            const res = await api.post('/instograma/ia-sugerir', {
                date: modalEscala.data,
                clienteId: modalEscala.clienteId,
                equipamento: modalEscala.equipamento
            });
            setSugestaoIA(res.data);
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.error?.message || 'Erro ao consultar inteligência artificial.');
        } finally {
            setLoadingIA(false);
        }
    };



    const handleSaveModal = async () => {
        if (!modalEscala) return;
        try {
            if (modalMode === 'create') {
                await api.post('/logistica/escalas', {
                    ...modalEscala,
                    data: modalEscala.data,
                });
            } else {
                await api.patch(`/logistica/escalas/${modalEscala.id}`, modalEscala);
            }
            setModalOpen(false);
            setModalEscala(null);
            fetchData();
        } catch (err) {
            console.error('Error saving escala', err);
        }
    };

    // ── Components ─────────────────────────────────────────────────────────────────

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (loading && !veiculos.length) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col gap-4">
            {/* ─── Header ─────────────────────────────────────────────────────── */}
            <header className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter italic">
                        Histograma
                    </h1>
                    <p className="text-sm text-slate-500 font-medium italic">
                        Planejamento visual de equipamentos e equipes
                    </p>
                </div>

                <div className="flex border-b border-slate-200">
                    {['Abertas', 'Executadas', 'Canceladas'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setSelectedTipo(tab as any)}
                            className={`py-3 px-6 font-bold text-sm border-b-2 transition-all ${
                                selectedTipo === tab
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {selectedTipo === 'Abertas' && (
                <div className="flex items-center gap-2">
                    {/* View Mode Toggle */}
                    <div className="bg-white rounded-xl border border-slate-200 p-1 flex gap-1 shadow-sm">
                        {(['semana', 'mes', 'ano'] as ViewMode[]).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === mode
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                {mode === 'semana' ? 'Semana' : mode === 'mes' ? 'Mês' : 'Ano'}
                            </button>
                        ))}
                    </div>

                    {/* Navigation */}
                    <div className="bg-white rounded-xl border border-slate-200 flex items-center shadow-sm">
                        <button
                            onClick={navigatePrev}
                            className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                            aria-label="Período anterior"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={goToToday}
                            className="px-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 transition-colors"
                        >
                            Hoje
                        </button>
                        <button
                            onClick={navigateNext}
                            className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                            aria-label="Próximo período"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <span className="text-sm font-black text-slate-700 italic min-w-[180px] text-center">
                        {headerLabel}
                    </span>
                </div>
                )}
            </header>

            {/* ─── Legend ──────────────────────────────────────────────────────── */}
            {selectedTipo === 'Abertas' && (
            <nav className="flex items-center gap-4 flex-wrap text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-sky-200 border border-sky-300" />
                    Pré-agendado
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-emerald-200 border border-emerald-300" />
                    Confirmado
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-blue-900 border border-blue-800" />
                    Em Execução
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-slate-100 border border-slate-200" />
                    Concluído
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-slate-300 border border-slate-400" />
                    Cancelado
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-slate-800 border border-slate-900" />
                    Manutenção
                </span>
            </nav>
            )}

            {/* ─── Equipment Type Filters ──────────────────────────────────────── */}
            {selectedTipo === 'Abertas' && (
            <nav className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-1">Filtrar:</span>
                {TIPOS_EQUIPAMENTO.map(t => (
                    <button
                        key={t.value}
                        onClick={() => toggleFiltroTipo(t.value)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border-2 transition-all motion-reduce:transition-none ${filtroTipos.has(t.value)
                            ? `${t.color} border-transparent text-white shadow-sm`
                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}
                    >
                        {t.label}
                    </button>
                ))}
                {filtroTipos.size > 0 && (
                    <button
                        onClick={() => setFiltroTipos(new Set())}
                        className="px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        ✕ Limpar
                    </button>
                )}
                <span className="ml-auto text-[10px] text-slate-400 font-bold">
                    {filteredVeiculos.length} veículo(s)
                </span>
            </nav>
            )}

            {/* ─── Canceladas View ─────────────────────────────────────────────── */}
            {selectedTipo === 'Canceladas' && (
                <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-[#1e3a5f] text-white">
                            <tr>
                                <th className="px-4 py-3 text-left font-bold uppercase text-[11px]">Equipamento</th>
                                <th className="px-4 py-3 text-left font-bold uppercase text-[11px]">Cliente</th>
                                <th className="px-4 py-3 text-left font-bold uppercase text-[11px]">Data</th>
                                <th className="px-4 py-3 text-left font-bold uppercase text-[11px]">OS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {escalas.filter(e => e.status === 'CANCELADO').length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-8 text-center text-slate-400 italic">Nenhuma escala cancelada encontrada.</td>
                                </tr>
                            ) : escalas.filter(e => e.status === 'CANCELADO').map(esc => (
                                <tr key={esc.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 font-semibold text-slate-700">{esc.equipamento || '—'}</td>
                                    <td className="px-4 py-3 text-slate-600">{esc.cliente?.nome || '—'}</td>
                                    <td className="px-4 py-3 text-slate-500">{new Date(esc.data).toLocaleDateString('pt-BR')}</td>
                                    <td className="px-4 py-3 font-medium text-slate-800">{esc.codigoOS || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ─── Executadas View ────────────────────────────────────────────── */}
            {selectedTipo === 'Executadas' && (
                <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-[#1e3a5f] text-white">
                            <tr>
                                <th className="px-4 py-3 text-left font-bold uppercase text-[11px]">Equipamento</th>
                                <th className="px-4 py-3 text-left font-bold uppercase text-[11px]">Cliente</th>
                                <th className="px-4 py-3 text-left font-bold uppercase text-[11px]">Data</th>
                                <th className="px-4 py-3 text-left font-bold uppercase text-[11px]">Horário</th>
                                <th className="px-4 py-3 text-left font-bold uppercase text-[11px]">Equipe</th>
                                <th className="px-4 py-3 text-left font-bold uppercase text-[11px]">OS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {escalas.filter(e => e.status === 'CONCLUIDO').length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-8 text-center text-slate-400 italic">Nenhuma escala executada encontrada.</td>
                                </tr>
                            ) : escalas.filter(e => e.status === 'CONCLUIDO').map(esc => (
                                <tr key={esc.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => openViewModal(esc)}>
                                    <td className="px-4 py-3 font-semibold text-slate-700">{esc.equipamento || '—'}</td>
                                    <td className="px-4 py-3 text-slate-600">{esc.cliente?.nome || '—'}</td>
                                    <td className="px-4 py-3 text-slate-500">{new Date(esc.data).toLocaleDateString('pt-BR')}</td>
                                    <td className="px-4 py-3 text-slate-500">{esc.hora || '—'}</td>
                                    <td className="px-4 py-3 text-slate-500 text-xs">{Array.isArray(esc.funcionarios) ? esc.funcionarios.join(', ') : '—'}</td>
                                    <td className="px-4 py-3 font-medium text-slate-800">{esc.codigoOS || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ─── Grid ────────────────────────────────────────────────────────── */}
            {selectedTipo === 'Abertas' && (
            <section className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
                <div className="overflow-auto h-full">
                    <table className="w-full border-collapse min-w-max">
                        {/* Header: day numbers + day names */}
                        <thead className="sticky top-0 z-20">
                            <tr className="bg-slate-800 text-white">
                                <th className="sticky left-0 z-30 bg-slate-800 min-w-[180px] px-4 py-3 text-left">
                                    <span className="text-[10px] font-black uppercase tracking-widest italic flex items-center gap-2">
                                        <Truck className="w-3.5 h-3.5" /> Veículo / Equip.
                                    </span>
                                </th>
                                {days.map((day) => {
                                    const isToday = isSameDay(day, today);
                                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                    return (
                                        <th
                                            key={dateToKey(day)}
                                            className={`min-w-[48px] px-1 py-2 text-center ${isToday ? 'bg-blue-600' : isWeekend ? 'bg-slate-700' : ''
                                                }`}
                                        >
                                            <span className={`text-[10px] font-bold block ${isWeekend ? 'text-slate-400' : 'text-slate-300'}`}>
                                                {DIAS_SEMANA[day.getDay()]}
                                            </span>
                                            <span className={`text-sm font-black block ${isToday ? 'text-white' : ''}`}>
                                                {day.getDate()}
                                            </span>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>

                        <tbody>
                            {filteredVeiculos.map((veiculo) => {
                                const isInMaintenance = manutencaoSet.has(veiculo.id);

                                return (
                                    <tr key={veiculo.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                        {/* Vehicle Label (sticky left) */}
                                        <td className={`sticky left-0 z-10 px-4 py-2 border-r border-slate-200 min-w-[180px] ${isInMaintenance ? 'bg-slate-100' : 'bg-white'}`}>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-black ${isInMaintenance ? 'bg-slate-800' : 'bg-blue-600'
                                                    }`}>
                                                    {isInMaintenance ? <Wrench className="w-3.5 h-3.5" /> : <Truck className="w-3.5 h-3.5" />}
                                                </div>
                                                <div className="leading-tight">
                                                    <p className="text-xs font-black text-slate-800 uppercase italic tracking-tighter">
                                                        {veiculo.placa}
                                                    </p>
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                                        {veiculo.modelo}
                                                    </p>
                                                </div>
                                            </div>
                                            {isInMaintenance && (
                                                <span className="mt-1 inline-flex items-center gap-1 text-[8px] font-black uppercase bg-slate-800 text-white px-1.5 py-0.5 rounded">
                                                    <AlertTriangle className="w-2.5 h-2.5" /> Manutenção
                                                </span>
                                            )}
                                        </td>

                                        {/* Day Cells */}
                                        {days.map((day) => {
                                            const key = dateToKey(day);
                                            const cellEscalas = escalasMap[veiculo.id]?.[key] || [];
                                            const isToday = isSameDay(day, today);
                                            const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                                            return (
                                                <td
                                                    key={key}
                                                    className={`relative min-w-[48px] h-[52px] border-r border-slate-100 transition-colors cursor-pointer group ${isInMaintenance
                                                        ? 'bg-slate-800/5'
                                                        : isToday
                                                            ? 'bg-blue-50/50'
                                                            : isWeekend
                                                                ? 'bg-slate-50/50'
                                                                : 'hover:bg-blue-50/30'
                                                        } ${draggedEscala && !isInMaintenance ? 'hover:bg-blue-100 ring-inset ring-1 ring-transparent hover:ring-blue-300' : ''}`}
                                                    onDragOver={!isInMaintenance ? handleDragOver : undefined}
                                                    onDrop={!isInMaintenance ? (e) => handleDrop(e, veiculo.id, day) : undefined}
                                                    onClick={() => {
                                                        if (cellEscalas.length === 0 && !isInMaintenance) {
                                                            openCreateModal(veiculo.id, day);
                                                        }
                                                    }}
                                                >
                                                    {/* Empty cell: show + on hover */}
                                                    {cellEscalas.length === 0 && !isInMaintenance && (
                                                        <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Plus className="w-3.5 h-3.5 text-blue-300" />
                                                        </span>
                                                    )}

                                                    {/* Maintenance overlay */}
                                                    {isInMaintenance && cellEscalas.length === 0 && (
                                                        <span className="absolute inset-0 flex items-center justify-center">
                                                            <span className="w-2 h-2 rounded-full bg-slate-300" />
                                                        </span>
                                                    )}

                                                    {/* Escalas in cell */}
                                                    {cellEscalas.map((esc, idx) => {
                                                        const statusCfg = STATUS_CONFIG[esc.status] || STATUS_CONFIG.AGENDADO;
                                                        const tipoCfg = TIPO_CONFIG[esc.tipoAgendamento] || TIPO_CONFIG.CONFIRMADO;

                                                        // Use different background for pre-agendado
                                                        const cellBg = esc.tipoAgendamento === 'PRE_AGENDADO'
                                                            ? 'bg-sky-100 border-sky-200 border-dashed'
                                                            : `${statusCfg.bg} ${statusCfg.border}`;

                                                        return (
                                                            <button
                                                                key={esc.id + idx}
                                                                draggable
                                                                onDragStart={(e) => handleDragStart(e, esc)}
                                                                className={`absolute inset-0.5 rounded ${cellBg} border flex items-center justify-center overflow-hidden transition-all hover:shadow-md hover:scale-[1.02] motion-reduce:transition-none motion-reduce:hover:scale-100 z-10`}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openViewModal(esc);
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                                    setTooltip({ x: rect.left + rect.width / 2, y: rect.top - 8, escala: esc });
                                                                }}
                                                                onMouseLeave={() => setTooltip(null)}
                                                                title={esc.cliente?.nome || 'Sem cliente'}
                                                            >
                                                                <div className={`flex flex-col items-center justify-center w-full h-full p-0.5 text-center ${statusCfg.text}`}>
                                                                    <span className="text-[9px] font-black uppercase tracking-tight leading-none truncate w-full px-1">
                                                                        {esc.cliente?.nome?.substring(0, 15) || (esc.status === 'MANUTENCAO' ? 'MANUTENÇÃO' : '—')}
                                                                    </span>
                                                                    {(esc.qtdBicos || esc.equipamento) && (
                                                                        <span className="text-[7px] font-bold tracking-widest uppercase leading-none mt-0.5 opacity-90 truncate w-full">
                                                                            {esc.qtdBicos ? `${String(esc.qtdBicos).padStart(2, '0')} ${esc.equipamento?.toUpperCase().includes('VACUO') ? 'SAIDA' : 'BICO'}${esc.qtdBicos > 1 ? 'S' : ''}` : esc.equipamento}
                                                                        </span>
                                                                    )}
                                                                    {esc.turnos && esc.turnos !== 'DIURNO' && (
                                                                        <span className="text-[7px] font-black tracking-widest uppercase leading-none mt-0.5 bg-black/10 rounded px-1 py-[1px]">
                                                                            {esc.turnos === '24H' ? '24 HORAS' : esc.turnos}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {/* Tipo dot */}
                                                                <span className={`absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full ${tipoCfg.dot} shadow-sm border border-black/10`} />
                                                            </button>
                                                        );
                                                    })}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}

                            {veiculos.length === 0 && (
                                <tr>
                                    <td colSpan={days.length + 1} className="text-center py-20 text-slate-400">
                                        <Truck className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                                        <p className="text-sm font-bold">Nenhum veículo cadastrado</p>
                                        <p className="text-xs">Cadastre veículos na tela de Logística para visualizar aqui.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* ─── Tooltip (hover) ──────────────────────────────────────────── */}
                {tooltip && (
                    <div
                        className="fixed z-50 bg-slate-900 text-white rounded-xl px-4 py-3 shadow-2xl pointer-events-none motion-reduce:transition-none"
                        style={{
                            left: tooltip.x,
                            top: tooltip.y,
                            transform: 'translate(-50%, -100%)',
                        }}
                    >
                        <p className="text-xs font-black uppercase italic tracking-tighter">
                            {tooltip.escala.cliente?.nome || 'Sem cliente'}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-300">
                            <span>{tooltip.escala.equipamento || '—'}</span>
                            <span>•</span>
                            <span className={TIPO_CONFIG[tooltip.escala.tipoAgendamento]?.dot === 'bg-sky-400' ? 'text-sky-400' : 'text-emerald-400'}>
                                {TIPO_CONFIG[tooltip.escala.tipoAgendamento]?.label}
                            </span>
                        </div>
                        {tooltip.escala.hora && (
                            <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" /> {tooltip.escala.hora}
                            </p>
                        )}
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45" />
                    </div>
                )}
            </section>
            )}

            {/* ═══ Modal ═══════════════════════════════════════════════════════════ */}
            {modalOpen && modalEscala && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 motion-safe:animate-[fadeIn_200ms_ease]">
                        {/* Modal Header */}
                        <div className="bg-blue-600 p-6 flex items-center justify-between">
                            <div className="flex items-center gap-3 text-white italic">
                                <Calendar className="w-6 h-6" />
                                <div>
                                    <h2 className="font-black uppercase tracking-tighter text-lg leading-none">
                                        {modalMode === 'create' ? 'Nova Escala' : modalMode === 'edit' ? 'Editar Escala' : 'Detalhes da Escala'}
                                    </h2>
                                    {modalEscala.veiculo && (
                                        <p className="text-[10px] text-white/70 font-bold uppercase mt-1 tracking-widest">
                                            {modalEscala.veiculo.placa} — {modalEscala.veiculo.modelo}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => { setModalOpen(false); setModalEscala(null); }}
                                className="text-white/70 hover:text-white transition-colors p-1"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
                            {modalMode === 'view' ? (
                                /* ── View Mode ────────────────────────────────────────── */
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-6">
                                        <InfoRow label="Cliente" value={modalEscala.cliente?.nome || '—'} />
                                        <InfoRow label="Equipamento" value={modalEscala.equipamento || '—'} />
                                        <InfoRow label="Data" value={modalEscala.data ? new Date(modalEscala.data).toLocaleDateString('pt-BR') : '—'} />
                                        <InfoRow label="Horário" value={modalEscala.hora || '—'} />
                                        <InfoRow label="Status" value={STATUS_CONFIG[modalEscala.status || '']?.label || modalEscala.status || '—'} />
                                        <InfoRow label="Tipo" value={TIPO_CONFIG[modalEscala.tipoAgendamento || '']?.label || '—'} />
                                        <InfoRow label="OS Vinculada" value={modalEscala.codigoOS || '—'} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest block mb-1">Equipe Escalada</label>
                                        <div className="flex flex-wrap gap-2">
                                            {Array.isArray(modalEscala.funcionarios) && modalEscala.funcionarios.length > 0 ? (
                                                modalEscala.funcionarios.map(nome => (
                                                    <span key={nome} className="px-2 py-1 bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg uppercase tracking-tight">
                                                        {nome}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-xs text-slate-500 italic">Nenhum funcionário escalado</span>
                                            )}
                                        </div>
                                    </div>
                                    {modalEscala.observacoes && (
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest block mb-1">Observações</label>
                                            <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-xl">{modalEscala.observacoes}</p>
                                        </div>
                                    )}

                                    {/* Pré-Reserva Info (view mode) */}
                                    {modalEscala.tipoAgendamento === 'PRE_AGENDADO' && (
                                        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 space-y-3">
                                            <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-900 italic">📌 Dados da Pré-Reserva</h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <InfoRow label="Solicitante" value={modalEscala.solicitanteNome || '—'} />
                                                <InfoRow label="Telefone" value={modalEscala.solicitanteTelefone || '—'} />
                                                <InfoRow label="Bicos" value={`${modalEscala.qtdBicos || 1} bico(s)`} />
                                                <InfoRow label="Turnos" value={modalEscala.turnos || 'DIURNO'} />
                                                <InfoRow label="Equipe Necessária" value={`${modalEscala.qtdPessoas || '—'} pessoas`} />
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const params = new URLSearchParams();
                                                    if (modalEscala.clienteId) params.set('clienteId', modalEscala.clienteId);
                                                    if (modalEscala.solicitanteNome) params.set('clienteNome', modalEscala.solicitanteNome);
                                                    if (modalEscala.data) params.set('data', modalEscala.data.toString().split('T')[0]);
                                                    if (modalEscala.veiculoId) params.set('veiculoId', modalEscala.veiculoId);
                                                    window.location.href = `/propostas?${params.toString()}`;
                                                }}
                                                className="w-full py-3 bg-blue-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg transition-all motion-reduce:transition-none"
                                            >
                                                🚀 Gerar Proposta
                                            </button>
                                        </div>
                                    )}

                                    {/* Gerar OS (for CONFIRMADO without OS, or any escala) */}
                                    {!modalEscala.codigoOS && (
                                        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 space-y-3">
                                            <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-700 italic">📋 Gerar Ordem de Serviço</h3>
                                            <p className="text-xs text-slate-500">
                                                {modalEscala.tipoAgendamento === 'PRE_AGENDADO'
                                                    ? 'Converta esta pré-reserva em uma OS formal.'
                                                    : 'Crie uma OS para este agendamento confirmado.'}
                                            </p>
                                            <button
                                                onClick={() => {
                                                    const params = new URLSearchParams();
                                                    if (modalEscala.clienteId) params.set('clienteId', modalEscala.clienteId);
                                                    if (modalEscala.cliente?.nome) params.set('clienteNome', modalEscala.cliente.nome);
                                                    if (modalEscala.data) params.set('data', modalEscala.data.toString().split('T')[0]);
                                                    if (modalEscala.veiculoId) params.set('veiculoId', modalEscala.veiculoId);
                                                    params.set('autoOpen', 'true');
                                                    window.location.href = `/os?${params.toString()}`;
                                                }}
                                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg transition-all motion-reduce:transition-none"
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
                                        <FormField label="Data Programada">
                                            <input
                                                type="date"
                                                className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-600 transition-all"
                                                value={modalEscala.data ? (modalEscala.data as string).split('T')[0] : ''}
                                                onChange={(e) => setModalEscala({ ...modalEscala, data: e.target.value })}
                                            />
                                        </FormField>

                                        <FormField label="Horário Previsto">
                                            <input
                                                type="time"
                                                className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-600 transition-all"
                                                value={modalEscala.hora || ''}
                                                onChange={(e) => setModalEscala({ ...modalEscala, hora: e.target.value })}
                                            />
                                        </FormField>

                                        <FormField label="Cliente">
                                            <select
                                                className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-600 transition-all appearance-none cursor-pointer"
                                                value={modalEscala.clienteId || ''}
                                                onChange={(e) => setModalEscala({ ...modalEscala, clienteId: e.target.value })}
                                            >
                                                <option value="">Selecione o cliente...</option>
                                                {clientes.map((c) => (
                                                    <option key={c.id} value={c.id}>{c.nome.toUpperCase()}</option>
                                                ))}
                                            </select>
                                        </FormField>

                                        <FormField label="Veículo">
                                            <select
                                                className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-600 transition-all appearance-none cursor-pointer"
                                                value={modalEscala.veiculoId || ''}
                                                onChange={(e) => setModalEscala({ ...modalEscala, veiculoId: e.target.value })}
                                            >
                                                <option value="">Selecione o veículo...</option>
                                                {veiculos.map((v) => (
                                                    <option key={v.id} value={v.id} disabled={v.status === 'MANUTENCAO'}>
                                                        {v.placa} - {v.modelo} ({v.status})
                                                    </option>
                                                ))}
                                            </select>
                                        </FormField>

                                        <FormField label="Equipamento">
                                            <input
                                                type="text"
                                                className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-600 transition-all"
                                                value={modalEscala.equipamento || ''}
                                                onChange={(e) => setModalEscala({ ...modalEscala, equipamento: e.target.value })}
                                                placeholder="Ex: Combinado, SAP, Vácuo..."
                                            />
                                        </FormField>

                                        <FormField label="Tipo de Agendamento">
                                            <div className="grid grid-cols-2 gap-2">
                                                {(['PRE_AGENDADO', 'CONFIRMADO'] as const).map((tipo) => (
                                                    <button
                                                        key={tipo}
                                                        onClick={() => setModalEscala({ ...modalEscala, tipoAgendamento: tipo })}
                                                        className={`py-2.5 rounded-xl text-[10px] font-black uppercase italic border-2 transition-all ${modalEscala.tipoAgendamento === tipo
                                                            ? tipo === 'PRE_AGENDADO'
                                                                ? 'bg-sky-500 border-sky-500 text-white shadow-lg'
                                                                : 'bg-emerald-500 border-emerald-500 text-white shadow-lg'
                                                            : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'
                                                            }`}
                                                    >
                                                        {TIPO_CONFIG[tipo].label}
                                                    </button>
                                                ))}
                                            </div>
                                        </FormField>

                                        <FormField label="OS Vinculada">
                                            <input
                                                type="text"
                                                className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-600 transition-all"
                                                value={modalEscala.codigoOS || ''}
                                                onChange={(e) => setModalEscala({ ...modalEscala, codigoOS: e.target.value })}
                                                placeholder="Ex: OS-2024-001"
                                            />
                                        </FormField>

                                        <FormField label="Status">
                                            <select
                                                className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-600 transition-all appearance-none cursor-pointer"
                                                value={modalEscala.status || 'AGENDADO'}
                                                onChange={(e) => setModalEscala({ ...modalEscala, status: e.target.value })}
                                            >
                                                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                                    <option key={k} value={k}>{v.label}</option>
                                                ))}
                                            </select>
                                        </FormField>
                                    </div>

                                        {/* Campos Globais Operacionais: Turnos e Bicos */}
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
                                                                    const turnoMultiplier = modalEscala.turnos === '24H' ? 2 : 1;
                                                                    const pessoas = bicos === 1 ? (1 + 2) * turnoMultiplier : (1 + 4) * turnoMultiplier;
                                                                    setModalEscala({ ...modalEscala, qtdBicos: bicos, qtdPessoas: pessoas });
                                                                }}
                                                                className={`py-2 px-1 rounded-xl text-xs font-black border-2 transition-all ${modalEscala.qtdBicos === n
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
                                                                    const bicos = modalEscala.qtdBicos || 1;
                                                                    const turnoMultiplier = turno === '24H' ? 2 : 1;
                                                                    const pessoas = bicos === 1 ? (1 + 2) * turnoMultiplier : (1 + 4) * turnoMultiplier;
                                                                    setModalEscala({ ...modalEscala, turnos: turno, qtdPessoas: pessoas });
                                                                }}
                                                                className={`py-2 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${modalEscala.turnos === turno
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
                                            
                                            {modalEscala.qtdPessoas && (
                                                <div className="text-center bg-white rounded-xl border border-blue-200 py-3 mt-2">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-900">Equipe Necessária: </span>
                                                    <span className="text-lg font-black text-blue-950">{modalEscala.qtdPessoas}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 ml-1">pessoas</span>
                                                </div>
                                            )}
                                        </div>

                                    {/* ─── Pré-Reserva Fields (shown when PRE_AGENDADO) ─── */}
                                    {modalEscala.tipoAgendamento === 'PRE_AGENDADO' && (
                                        <div className="bg-sky-50 border-2 border-sky-200 rounded-2xl p-5 space-y-4">
                                            <h3 className="text-[10px] font-black uppercase tracking-widest text-sky-900 italic flex items-center gap-2">
                                                <AlertTriangle className="w-3.5 h-3.5" /> Dados Adicionais da Pré-Reserva
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <FormField label="Nome do Solicitante">
                                                    <input
                                                        type="text"
                                                        className="w-full bg-white border-2 border-sky-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-sky-600 transition-all"
                                                        value={modalEscala.solicitanteNome || ''}
                                                        onChange={(e) => setModalEscala({ ...modalEscala, solicitanteNome: e.target.value })}
                                                        placeholder="Nome do contato"
                                                    />
                                                </FormField>
                                                <FormField label="Telefone do Solicitante">
                                                    <input
                                                        type="tel"
                                                        className="w-full bg-white border-2 border-sky-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-sky-600 transition-all"
                                                        value={modalEscala.solicitanteTelefone || ''}
                                                        onChange={(e) => setModalEscala({ ...modalEscala, solicitanteTelefone: e.target.value })}
                                                        placeholder="(XX) XXXXX-XXXX"
                                                    />
                                                </FormField>
                                            </div>
                                        </div>
                                    )}

                                    {/* ─── Assistente de IA ─── */}
                                    <div className="bg-indigo-50 border-2 border-indigo-100 rounded-2xl p-5 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-700 italic flex items-center gap-2">
                                                <Sparkles className="w-3.5 h-3.5" /> Assistente de Escala IA
                                            </h3>
                                            <button
                                                type="button"
                                                onClick={handleSugerirIA}
                                                disabled={loadingIA || !modalEscala.data}
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
                                                            const funcs = sugestaoIA.funcionariosSugeridos?.map((f: any) => f.nome) || [];
                                                            setModalEscala(prev => ({ 
                                                                ...prev!, 
                                                                veiculoId: sugestaoIA.veiculoSugerido?.id || prev?.veiculoId,
                                                                funcionarios: funcs
                                                            }));
                                                        }}
                                                    >✨ Aplicar Sugestão</button>
                                                </div>
                                                <p className="mb-3 italic font-semibold text-slate-700">"{sugestaoIA.justificativa}"</p>
                                                <div className="grid grid-cols-2 gap-4 mt-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                    <div>
                                                        <span className="text-[10px] uppercase font-black text-slate-400 block mb-0.5">Veículo:</span> 
                                                        <span className="font-bold">{sugestaoIA.veiculoSugerido?.placa || 'N/A'}</span> <span className="text-slate-500">— {sugestaoIA.veiculoSugerido?.modelo}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] uppercase font-black text-slate-400 block mb-0.5">Equipe:</span> 
                                                        <span className="font-bold">{sugestaoIA.funcionariosSugeridos?.map((f:any)=>f.nome).join(', ') || 'N/A'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <FormField label="Equipe Escalada (Selecione Cliente e Data primeiro)">
                                        {modalEscala.clienteId && modalEscala.data ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {teamAvailability.map(func => {
                                                    const isSelected = Array.isArray(modalEscala.funcionarios) && modalEscala.funcionarios.includes(func.nome);
                                                    const isUnavailable = func.disponibilidade === 'INDISPONIVEL';

                                                    let badgeCfg = { bg: 'bg-slate-100', text: 'text-slate-500', label: 'Disponível' };
                                                    if (func.disponibilidade === 'INDISPONIVEL') badgeCfg = { bg: 'bg-slate-200 border border-slate-300', text: 'text-slate-800', label: func.motivo || 'Indisponível' };
                                                    else if (func.disponibilidade === 'ALERTA') badgeCfg = { bg: 'bg-blue-950 border border-blue-800', text: 'text-white', label: func.motivo || 'Atenção' };

                                                    return (
                                                        <button
                                                            key={func.id}
                                                            type="button"
                                                            disabled={isUnavailable}
                                                            onClick={() => toggleFuncionario(func.nome, isUnavailable)}
                                                            className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${isUnavailable ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200' :
                                                                isSelected ? 'bg-blue-50 border-blue-400 shadow-inner' : 'bg-white border-slate-200 hover:border-slate-300'
                                                                }`}
                                                        >
                                                            <div className="flex items-center justify-between w-full mb-1">
                                                                <span className={`text-xs font-black uppercase tracking-tight ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
                                                                    {func.nome}
                                                                </span>
                                                                <div className={`w-3 h-3 rounded-full border ${isSelected ? 'bg-blue-500 border-blue-600 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]' : 'bg-white border-slate-300'}`} />
                                                            </div>
                                                            <span className="text-[10px] text-slate-500 font-bold mb-2">{func.cargo || 'Funcinário'}</span>
                                                            <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${badgeCfg.bg} ${badgeCfg.text}`}>
                                                                {badgeCfg.label}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                                {teamAvailability.length === 0 && (
                                                    <div className="col-span-full p-4 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                                        Nenhum funcionário encontrado.
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="p-4 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                                Preencha Data e Cliente para visualizar os funcionários e suas disponibilidades.
                                            </div>
                                        )}
                                    </FormField>

                                    <FormField label="Observações">
                                        <textarea
                                            className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl p-4 text-sm min-h-[100px] outline-none focus:border-blue-600 font-bold tracking-tight transition-all"
                                            value={modalEscala.observacoes || ''}
                                            onChange={(e) => setModalEscala({ ...modalEscala, observacoes: e.target.value })}
                                            placeholder="Detalhes adicionais..."
                                        />
                                    </FormField>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                            <button
                                onClick={() => { setModalOpen(false); setModalEscala(null); }}
                                className="px-6 py-3 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 transition-all italic"
                            >
                                {modalMode === 'view' ? 'Fechar' : 'Cancelar'}
                            </button>

                            {modalMode === 'view' && (
                                <button
                                    onClick={() => setModalMode('edit')}
                                    className="bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-2xl flex items-center gap-2 hover:border-blue-400 transition-all text-[10px] font-black uppercase italic tracking-widest"
                                >
                                    <Eye className="w-4 h-4" /> Editar
                                </button>
                            )}

                            {(modalMode === 'create' || modalMode === 'edit') && (
                                <button
                                    onClick={handleSaveModal}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-3.5 rounded-2xl flex items-center gap-2 transition-all shadow-xl shadow-blue-500/20 text-[10px] font-black uppercase italic tracking-widest"
                                >
                                    <Save className="w-5 h-5" /> Salvar
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

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
