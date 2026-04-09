import { useEffect, useState } from 'react';
import api from '../services/api';
import {
    Search, Loader2, Clock, FileText, ClipboardList,
    Users, Truck, DollarSign, RefreshCw
} from 'lucide-react';

const ENTIDADE_LABELS: Record<string, { label: string; color: string; icon: any }> = {
    OS: { label: 'Ordem de Serviço', color: 'bg-blue-100 text-blue-700', icon: ClipboardList },
    ESCALA: { label: 'Escala', color: 'bg-purple-100 text-purple-700', icon: Clock },
    PROPOSTA: { label: 'Proposta', color: 'bg-emerald-100 text-emerald-700', icon: FileText },
    MEDICAO: { label: 'Medição', color: 'bg-amber-100 text-amber-700', icon: DollarSign },
    FUNCIONARIO: { label: 'Funcionário', color: 'bg-cyan-100 text-cyan-700', icon: Users },
    CLIENTE: { label: 'Cliente', color: 'bg-pink-100 text-pink-700', icon: Truck },
};

const ACAO_LABELS: Record<string, { label: string; color: string }> = {
    CRIAR: { label: 'Criação', color: 'bg-emerald-500' },
    ATUALIZAR: { label: 'Atualização', color: 'bg-blue-500' },
    DELETAR: { label: 'Exclusão', color: 'bg-red-500' },
    STATUS_CHANGE: { label: 'Mudança Status', color: 'bg-amber-500' },
};

export default function AuditLog() {
    const [logs, setLogs] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterEntidade, setFilterEntidade] = useState('');
    const [filterAcao, setFilterAcao] = useState('');
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 30;

    const fetchLogs = async () => {
        try {
            const params: any = { limit: PAGE_SIZE, offset: page * PAGE_SIZE };
            if (search) params.search = search;
            if (filterEntidade) params.entidade = filterEntidade;
            if (filterAcao) params.acao = filterAcao;

            const [logsRes, statsRes] = await Promise.all([
                api.get('/logs', { params }),
                api.get('/logs/stats'),
            ]);
            setLogs(logsRes.data.logs);
            setTotal(logsRes.data.total);
            setStats(statsRes.data);
        } catch (err) {
            console.error('Failed to fetch logs', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchLogs(); }, [search, filterEntidade, filterAcao, page]);

    const formatDate = (d: string) => {
        const dt = new Date(d);
        return dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Log de Alterações</h1>
                    <p className="text-sm text-slate-500">Auditoria completa de todas as alterações no sistema</p>
                </div>
                <button onClick={() => { setPage(0); fetchLogs(); }} className="text-slate-400 hover:text-slate-600">
                    <RefreshCw className="w-5 h-5" />
                </button>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Total Registros</p>
                        <p className="text-2xl font-black text-slate-800">{stats.total}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Hoje</p>
                        <p className="text-2xl font-black text-blue-600">{stats.hoje}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Entidades</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                            {Object.entries(stats.porEntidade || {}).map(([ent, count]: any) => (
                                <span key={ent} className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${ENTIDADE_LABELS[ent]?.color || 'bg-slate-100 text-slate-600'}`}>
                                    {ent}: {count}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Ações</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                            {Object.entries(stats.porAcao || {}).map(([acao, count]: any) => (
                                <span key={acao} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                    {ACAO_LABELS[acao]?.label || acao}: {count}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex items-center gap-3">
                <div className="flex-1 relative max-w-sm">
                    <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Buscar..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                        className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-10 pr-4 text-sm outline-none shadow-sm font-medium focus:ring-2 focus:ring-blue-500/20"
                    />
                </div>
                <select
                    value={filterEntidade}
                    onChange={(e) => { setFilterEntidade(e.target.value); setPage(0); }}
                    className="bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm font-bold appearance-none"
                >
                    <option value="">Todas Entidades</option>
                    <option value="OS">Ordem de Serviço</option>
                    <option value="ESCALA">Escala</option>
                    <option value="PROPOSTA">Proposta</option>
                    <option value="MEDICAO">Medição</option>
                    <option value="FUNCIONARIO">Funcionário</option>
                    <option value="CLIENTE">Cliente</option>
                </select>
                <select
                    value={filterAcao}
                    onChange={(e) => { setFilterAcao(e.target.value); setPage(0); }}
                    className="bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm font-bold appearance-none"
                >
                    <option value="">Todas Ações</option>
                    <option value="CRIAR">Criação</option>
                    <option value="ATUALIZAR">Atualização</option>
                    <option value="DELETAR">Exclusão</option>
                    <option value="STATUS_CHANGE">Mudança Status</option>
                </select>
            </div>

            {/* Log Timeline */}
            <div className="flex-1 overflow-y-auto space-y-2">
                {logs.length === 0 ? (
                    <div className="text-center py-16">
                        <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-400 font-medium">Nenhum log encontrado</p>
                    </div>
                ) : (
                    logs.map((log: any) => {
                        const entConfig = ENTIDADE_LABELS[log.entidade] || { label: log.entidade, color: 'bg-slate-100 text-slate-600', icon: FileText };
                        const acaoConfig = ACAO_LABELS[log.acao] || { label: log.acao, color: 'bg-slate-400' };
                        const EntIcon = entConfig.icon;

                        return (
                            <div key={log.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-4 hover:shadow-sm transition-all">
                                {/* Icon */}
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${entConfig.color}`}>
                                    <EntIcon className="w-5 h-5" />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded text-white ${acaoConfig.color}`}>
                                            {acaoConfig.label}
                                        </span>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${entConfig.color}`}>
                                            {entConfig.label}
                                        </span>
                                        {log.campo && (
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                                                {log.campo}
                                            </span>
                                        )}
                                    </div>
                                    {log.descricao && (
                                        <p className="text-sm text-slate-700 font-medium">{log.descricao}</p>
                                    )}
                                    {log.valorAnterior && log.valorNovo && (
                                        <div className="flex items-center gap-2 mt-1 text-[10px]">
                                            <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded font-mono line-through">
                                                {log.valorAnterior.length > 60 ? log.valorAnterior.substring(0, 60) + '...' : log.valorAnterior}
                                            </span>
                                            <span className="text-slate-400">→</span>
                                            <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded font-mono">
                                                {log.valorNovo.length > 60 ? log.valorNovo.substring(0, 60) + '...' : log.valorNovo}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Meta */}
                                <div className="text-right flex-shrink-0">
                                    <p className="text-[10px] text-slate-400">{formatDate(log.createdAt)}</p>
                                    {log.usuarioNome && (
                                        <p className="text-[10px] font-bold text-slate-500">{log.usuarioNome}</p>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Pagination */}
            {total > PAGE_SIZE && (
                <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                    <p className="text-xs text-slate-400">
                        Mostrando {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, total)} de {total}
                    </p>
                    <div className="flex gap-2">
                        <button
                            disabled={page === 0}
                            onClick={() => setPage(p => p - 1)}
                            className="bg-white border border-slate-200 rounded px-3 py-1 text-xs font-bold disabled:opacity-50"
                        >
                            Anterior
                        </button>
                        <button
                            disabled={(page + 1) * PAGE_SIZE >= total}
                            onClick={() => setPage(p => p + 1)}
                            className="bg-white border border-slate-200 rounded px-3 py-1 text-xs font-bold disabled:opacity-50"
                        >
                            Próximo
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
