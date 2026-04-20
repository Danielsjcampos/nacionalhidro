import { useToast } from '../contexts/ToastContext';
import { useEffect, useState, useMemo, useCallback } from 'react';
import api from '../services/api';
import {
    Loader2, ChevronLeft, ChevronRight, Calendar, Plus,
    X, Save, Truck, Eye, AlertTriangle, Wrench, Clock, Sparkles, Copy, Ban, Users, Printer,
    RotateCcw, UserX
} from 'lucide-react';
import ModalCancelarEscala from '../components/ModalCancelarEscala';
import ModalQuadroFuncionarios from '../components/ModalQuadroFuncionarios';
import ModalQuadroVeiculos from '../components/ModalQuadroVeiculos';
import ReportEscala from '../components/ReportEscala';
import ModalCadastroEscala from '../components/ModalCadastroEscala';

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
    naoCompareceu?: any[];
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
    const { showToast } = useToast();
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

    // Team Availability (unused in main page now, handled by modal)
    // IA Assistant (unused in main page now, handled by modal)

    // Cancel / Duplicate / Quadro modals
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [cancelEscalaId, setCancelEscalaId] = useState<string | null>(null);
    const [quadroFuncOpen, setQuadroFuncOpen] = useState(false);
    const [quadroVeicOpen, setQuadroVeicOpen] = useState(false);
    const [reportOpen, setReportOpen] = useState(false);

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

    // Availability logic moved to ModalCadastroEscala

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

    // Handlers moved to ModalCadastroEscala



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

    // ── Duplicate / Cancel handlers ─────────────────────────────────────────────

    const handleDuplicateEscala = async () => {
        if (!modalEscala?.id) return;
        try {
            await api.post(`/logistica/escalas/${modalEscala.id}/duplicar`);
            showToast('Escala duplicada para o dia seguinte!', 'success');
            setModalOpen(false);
            setModalEscala(null);
            fetchData();
        } catch (err: any) {
            console.error('Duplicate escala error:', err);
            showToast(err.response?.data?.error || 'Erro ao duplicar escala.');
        }
    };

    const handleCancelEscala = async (motivo: string) => {
        if (!cancelEscalaId) return;
        try {
            await api.patch(`/logistica/escalas/${cancelEscalaId}/cancelar`, { motivoCancelamento: motivo });
            showToast('Escala cancelada com sucesso.', 'success');
            setCancelModalOpen(false);
            setCancelEscalaId(null);
            setModalOpen(false);
            setModalEscala(null);
            fetchData();
        } catch (err: any) {
            console.error('Cancel escala error:', err);
            showToast(err.response?.data?.error || 'Erro ao cancelar escala.');
        }
    };

    const handleQuadroFuncConfirm = (selected: any[]) => {
        const funcObjs = selected.map((f: any) => ({
            nome: typeof f === 'object' ? (f.nome || f.nome_completo || '') : f,
            statusOperacional: 'NORMAL',
            ausente: false
        }));
        setModalEscala(prev => prev ? { ...prev, funcionarios: funcObjs } : prev);
    };

    const handleQuadroVeicConfirm = (selected: any[]) => {
        if (selected.length > 0) {
            setModalEscala(prev => prev ? { ...prev, veiculoId: selected[0].id } : prev);
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

                    {/* Report Button */}
                    <button
                        onClick={() => setReportOpen(true)}
                        className="bg-white border border-slate-200 rounded-xl px-3 py-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-blue-600 hover:border-blue-300 transition-all shadow-sm"
                    >
                        <Printer className="w-3.5 h-3.5" /> Relatorio
                    </button>
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
                                    <td className="px-4 py-3 text-slate-500 text-xs">{Array.isArray(esc.funcionarios) ? esc.funcionarios.map((f: any) => typeof f === 'object' ? f.nome : f).join(', ') : '—'}</td>
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
            <ModalCadastroEscala
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); setModalEscala(null); }}
                data={modalEscala}
                mode={modalMode}
                onSave={async (formData) => {
                    if (modalMode === 'create') {
                        await api.post('/logistica/escalas', formData);
                    } else {
                        await api.patch(`/logistica/escalas/${formData.id}`, formData);
                    }
                    setModalOpen(false);
                    fetchData();
                }}
                onModeChange={setModalMode}
                clientes={clientes}
                veiculos={veiculos}
                onQuadroFuncOpen={() => setQuadroFuncOpen(true)}
                onDuplicate={handleDuplicateEscala}
                onCancelOpen={() => {
                    setCancelEscalaId(modalEscala?.id || null);
                    setCancelModalOpen(true);
                }}
                onRevertCancel={async (justificativa) => {
                    await api.patch(`/logistica/escalas/${modalEscala?.id}/reverter-cancelamento`, { justificativa });
                    showToast('Cancelamento revertido!', 'success');
                    fetchData();
                    setModalOpen(false);
                }}
                onRegisterFalta={async (funcId, funcNome) => {
                    await api.patch(`/logistica/escalas/${modalEscala?.id}/nao-compareceu`, {
                        funcionarioId: funcId,
                        funcionarioNome: funcNome
                    });
                    showToast(`Falta registrada para ${funcNome}`, 'success');
                    fetchData();
                    setModalOpen(false);
                }}
            />

            {/* ═══ Cancel Escala Modal ═══ */}
            <ModalCancelarEscala
                isOpen={cancelModalOpen}
                onClose={() => { setCancelModalOpen(false); setCancelEscalaId(null); }}
                onConfirm={handleCancelEscala}
                escalaInfo={modalEscala?.cliente?.nome ? `${modalEscala.cliente.nome} - ${new Date(modalEscala.data || '').toLocaleDateString('pt-BR')}` : undefined}
            />

            {/* ═══ Quadro Funcionários Modal ═══ */}
            <ModalQuadroFuncionarios
                isOpen={quadroFuncOpen}
                onClose={() => setQuadroFuncOpen(false)}
                onConfirm={handleQuadroFuncConfirm}
                data={modalEscala?.data?.toString().split('T')[0] || new Date().toISOString().split('T')[0]}
                clienteId={modalEscala?.clienteId}
                selectedIds={[]}
            />

            {/* ═══ Quadro Veículos Modal ═══ */}
            <ModalQuadroVeiculos
                isOpen={quadroVeicOpen}
                onClose={() => setQuadroVeicOpen(false)}
                onConfirm={handleQuadroVeicConfirm}
                data={modalEscala?.data?.toString().split('T')[0] || new Date().toISOString().split('T')[0]}
                selectedIds={modalEscala?.veiculoId ? [modalEscala.veiculoId] : []}
            />

            {/* ═══ Report Escala ═══ */}
            <ReportEscala
                isOpen={reportOpen}
                onClose={() => setReportOpen(false)}
                startDate={startDate?.toISOString() || new Date().toISOString()}
                endDate={endDate?.toISOString() || new Date().toISOString()}
            />
        </div>
    );
}
