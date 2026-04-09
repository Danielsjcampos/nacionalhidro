import { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import {
    Loader2, Plus, X, Search, RefreshCw, AlertTriangle, 
    Calendar, Clock, Building2, CheckCircle2,
    User
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    A_VENCER: { label: 'Programação', color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-500' },
    PROGRAMADA: { label: 'Programado', color: 'text-blue-600', bg: 'bg-blue-50', dot: 'bg-blue-500' },
    ENVIADO_CONTABILIDADE: { label: 'Contabilidade', color: 'text-indigo-600', bg: 'bg-indigo-50', dot: 'bg-indigo-500' },
    EM_FERIAS: { label: 'Em Férias', color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
    GOZADA: { label: 'Férias Gozadas', color: 'text-slate-500', bg: 'bg-slate-50', dot: 'bg-slate-400' },
    DESLIGADO: { label: 'Desligados', color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500' },
};

const statusOrder = ['A_VENCER', 'PROGRAMADA', 'ENVIADO_CONTABILIDADE', 'EM_FERIAS', 'GOZADA', 'DESLIGADO'];

const EMPTY_FORM = {
    funcionarioId: '',
    empresaContratante: '',
    periodoAquisitivo: '',
    diasDireito: '30',
    diasGozados: '0',
    diasVendidos: '0',
    dataInicio: '',
    dataFim: '',
    dataVencimento: '',
    status: 'A_VENCER',
    observacoes: '',
};

export default function FeriasPage() {
    const [ferias, setFerias] = useState<any[]>([]);
    const [funcionarios, setFuncionarios] = useState<any[]>([]);
    const [empresas, setEmpresas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [search, setSearch] = useState('');
    const [resumo, setResumo] = useState<any>(null);
    
    // Drawer Lateral
    const [showDetail, setShowDetail] = useState<any>(null);
    const [drawerForm, setDrawerForm] = useState<any>({});

    const fetchAll = async () => {
        try {
            const [fRes, funcRes, resumoRes, empresasRes] = await Promise.all([
                api.get('/ferias'),
                api.get('/rh?ativo=true'),
                api.get('/ferias/resumo'),
                api.get('/empresas'),
            ]);

            setFerias(fRes.data);
            setFuncionarios(funcRes.data);
            setResumo(resumoRes.data);
            setEmpresas(empresasRes.data);
        } catch (err) {
            console.error('Failed to fetch férias:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    const filteredFerias = useMemo(() => {
        if (!search) return ferias;
        const s = search.toLowerCase();
        return ferias.filter(f => 
            f.funcionario?.nome?.toLowerCase().includes(s) || 
            f.empresaContratante?.toLowerCase().includes(s)
        );
    }, [ferias, search]);

    const kanbanData = useMemo(() => {
        const columns: Record<string, any[]> = {};
        statusOrder.forEach(s => columns[s] = []);
        filteredFerias.forEach(f => {
            if (columns[f.status]) columns[f.status].push(f);
            else columns['A_VENCER'].push(f); // fallback
        });
        return columns;
    }, [filteredFerias]);

    const handleCreate = async () => {
        try {
            await api.post('/ferias', form);
            setShowForm(false);
            setForm({ ...EMPTY_FORM });
            fetchAll();
        } catch (err) {
            console.error('Create error:', err);
        }
    };

    const handleUpdateStatus = async (id: string, newStatus: string, extraData = {}) => {
        try {
            await api.patch(`/ferias/${id}`, { status: newStatus, ...extraData });
            setShowDetail(null);
            fetchAll();
        } catch (err) {
            console.error('Update error:', err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Deseja remover este registro de férias?')) return;
        try {
            await api.delete(`/ferias/${id}`);
            fetchAll();
        } catch (err) {
            console.error('Delete error:', err);
        }
    };

    const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
    
    const diasAte = (d: string) => {
        if (!d) return null;
        const diff = Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return diff;
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col space-y-4 overflow-hidden">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        <Calendar className="w-7 h-7 text-blue-600" />
                        Controle de Férias
                    </h1>
                    <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">
                        {resumo?.total || 0} Registros no Pipeline • {resumo?.counts?.EM_FERIAS || 0} Ativos Agora
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar colaborador..."
                            className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all w-64"
                        />
                    </div>
                    <button onClick={fetchAll} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all">
                        <RefreshCw className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setShowForm(true)}
                        className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
                    >
                        <Plus className="w-4 h-4" /> Novo Registro
                    </button>
                </div>
            </div>

            {/* Alerts for Near Deadlines */}
            {resumo?.vencendoEmBreve?.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 bg-amber-500/10 rounded-lg flex items-center justify-center">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                        </div>
                        <span className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Alerta: Férias vencendo nos próximos 60 dias</span>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                        {resumo.vencendoEmBreve.map((f: any) => (
                            <div key={f.id} className="min-w-[240px] bg-white rounded-xl p-3 border border-amber-100 flex items-center justify-between shadow-sm">
                                <div className="min-w-0">
                                    <p className="text-xs font-black text-slate-800 truncate">{f.funcionario?.nome}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase truncate">{f.funcionario?.cargo}</p>
                                </div>
                                <div className="text-right flex-shrink-0 ml-4">
                                    <p className="text-[10px] font-black text-amber-600">{diasAte(f.dataVencimento)} dias</p>
                                    <p className="text-[9px] font-bold text-slate-400">{fmtDate(f.dataVencimento)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4 custom-scrollbar flex gap-4">
                {statusOrder.map(status => {
                    const config = STATUS_CONFIG[status];
                    const cards = kanbanData[status] || [];
                    
                    return (
                        <div key={status} className="flex-shrink-0 w-80 flex flex-col bg-slate-100/50 rounded-2xl border border-slate-200/60 overflow-hidden">
                            <div className="p-4 flex items-center justify-between bg-white border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${config.dot}`} />
                                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-tighter">{config.label}</h3>
                                    <span className="ml-1 px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-black rounded-md">
                                        {cards.length}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                                {cards.map(f => {
                                    const diff = diasAte(f.dataVencimento);
                                    const isVencido = diff !== null && diff <= 0 && f.status === 'A_VENCER';
                                    const isAlerta = diff !== null && diff <= 30 && diff > 0 && f.status === 'A_VENCER';

                                    return (
                                        <div 
                                            key={f.id} 
                                            onClick={() => { setShowDetail(f); setDrawerForm(f); }}
                                            className={`bg-white rounded-xl p-4 border shadow-sm group hover:shadow-md hover:border-blue-200 transition-all cursor-pointer relative overflow-hidden ${isVencido ? 'border-rose-200' : isAlerta ? 'border-amber-200' : 'border-slate-100'}`}
                                        >
                                            {/* Top indicators */}
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{f.periodoAquisitivo || 'Período N/A'}</span>
                                                    <h4 className="text-sm font-black text-slate-800 leading-tight mt-0.5 group-hover:text-blue-600 transition-colors">
                                                        {f.funcionario?.nome}
                                                    </h4>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                     <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black">
                                                        {f.diasDireito}D
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Body Info */}
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-slate-500">
                                                    <Building2 className="w-3 h-3 flex-shrink-0" />
                                                    <span className="text-[10px] font-bold truncate">{f.empresaContratante || 'NACIONAL HIDRO'}</span>
                                                </div>
                                                
                                                {f.dataInicio ? (
                                                     <div className="flex items-center gap-2 text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100/50">
                                                        <Clock className="w-3 h-3 flex-shrink-0 text-blue-500" />
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-black text-slate-400 uppercase">Gozar de</span>
                                                            <span className="text-[10px] font-black">{fmtDate(f.dataInicio)} até {fmtDate(f.dataFim)}</span>
                                                        </div>
                                                     </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-slate-400 italic">
                                                        <span className="text-[10px]">Aguardando programação...</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Footer / Alerts */}
                                            <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                                                <div className="flex items-center gap-1.5">
                                                    {isVencido ? (
                                                        <span className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded-md text-[9px] font-black flex items-center gap-1">
                                                            <AlertTriangle className="w-3 h-3" /> VENCIDO
                                                        </span>
                                                    ) : (
                                                        <div className="flex flex-col">
                                                            <span className="text-[8px] font-black text-slate-400 uppercase leading-none">Vence em</span>
                                                            <span className={`text-[10px] font-black ${isAlerta ? 'text-amber-600' : 'text-slate-500'}`}>{fmtDate(f.dataVencimento)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* MODAL: NOVO REGISTRO */}
            {showForm && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                    <Plus className="w-5 h-5 text-blue-600" />
                                    Novo Controle de Férias
                                </h2>
                                <p className="text-xs font-bold text-slate-400 mt-1 uppercase">Etapa inicial de programação</p>
                            </div>
                            <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Funcionário *</label>
                                    <div className="relative mt-2">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <select
                                            value={form.funcionarioId}
                                            onChange={e => setForm({ ...form, funcionarioId: e.target.value })}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                                        >
                                            <option value="">Selecione o colaborador...</option>
                                            {funcionarios.map((f: any) => (
                                                <option key={f.id} value={f.id}>{f.nome} ({f.cargo})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Empresa Contratante</label>
                                    <div className="relative mt-2">
                                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <select
                                            value={form.empresaContratante}
                                            onChange={e => setForm({ ...form, empresaContratante: e.target.value })}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                                        >
                                            <option value="">Selecione a empresa...</option>
                                            {empresas.map((emp: any) => (
                                                <option key={emp.id} value={emp.nome}>{emp.nome}</option>
                                            ))}
                                            <option value="NACIONAL HIDRO">NACIONAL HIDRO (PADRÃO)</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Dias de Direito</label>
                                    <input
                                        type="number"
                                        value={form.diasDireito}
                                        onChange={e => setForm({ ...form, diasDireito: e.target.value })}
                                        className="w-full mt-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-700"
                                    />
                                </div>
                                
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Data Limite (Gozo)</label>
                                    <input
                                        type="date"
                                        value={form.dataVencimento}
                                        onChange={e => setForm({ ...form, dataVencimento: e.target.value })}
                                        className="w-full mt-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-700"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                            <button onClick={() => setShowForm(false)} className="flex-1 py-3 text-sm font-black text-slate-500 hover:text-slate-800 transition-colors">
                                CANCELAR
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={!form.funcionarioId}
                                className="flex-[2] bg-blue-600 text-white py-3 rounded-2xl text-xs font-black shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 uppercase tracking-widest"
                            >
                                Registrar e Iniciar Fluxo
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DRAWER LATERAL: VISUALIZAÇÃO E AÇÕES */}
            {showDetail && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-end" onClick={() => setShowDetail(null)}>
                    <div className="bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                        {/* Drawer Header */}
                        <div className="sticky top-0 bg-white z-10 p-6 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-blue-600" />
                                    Detalhes das Férias
                                </h2>
                                <p className="text-xs font-bold text-slate-500 mt-1">{showDetail.funcionario?.nome} ({showDetail.funcionario?.cargo})</p>
                            </div>
                            <button onClick={() => setShowDetail(null)} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
                                <X className="w-4 h-4 text-slate-500" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Resumo do Período */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                                <h3 className="text-sm font-black text-slate-800 border-b border-slate-200 pb-2">Resumo do Período</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Empresa Contratante</p>
                                        <p className="text-sm font-bold text-slate-700 mt-0.5">{showDetail.empresaContratante || 'NACIONAL HIDRO'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Período Aquisitivo</p>
                                        <p className="text-sm font-bold text-slate-700 mt-0.5">{showDetail.periodoAquisitivo || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Dias de Direito</p>
                                        <p className="text-sm font-black text-blue-600 mt-0.5">{showDetail.diasDireito} Dias</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Vencimento LImite</p>
                                        <p className="text-sm font-bold text-slate-700 mt-0.5">{fmtDate(showDetail.dataVencimento)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Programação de Datas */}
                            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                                <h3 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-2 flex items-center justify-between">
                                    Programação de Gozo
                                    {showDetail.status === 'A_VENCER' && (
                                        <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-black uppercase">Pendente</span>
                                    )}
                                </h3>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Data Início</label>
                                        <input
                                            type="date"
                                            value={drawerForm.dataInicio?.split('T')[0] || ''}
                                            onChange={(e) => setDrawerForm({...drawerForm, dataInicio: e.target.value})}
                                            disabled={showDetail.status === 'GOZADA' || showDetail.status === 'DESLIGADO'}
                                            className="w-full mt-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:border-blue-500 disabled:opacity-50"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Data Fim</label>
                                        <input
                                            type="date"
                                            value={drawerForm.dataFim?.split('T')[0] || ''}
                                            onChange={(e) => setDrawerForm({...drawerForm, dataFim: e.target.value})}
                                            disabled={showDetail.status === 'GOZADA' || showDetail.status === 'DESLIGADO'}
                                            className="w-full mt-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:border-blue-500 disabled:opacity-50"
                                        />
                                    </div>
                                </div>

                                {['A_VENCER', 'PROGRAMADA'].includes(showDetail.status) && (
                                    <button 
                                        onClick={() => handleUpdateStatus(showDetail.id, 'PROGRAMADA', { dataInicio: drawerForm.dataInicio, dataFim: drawerForm.dataFim })}
                                        className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 py-2.5 rounded-lg text-xs font-black transition-all border border-blue-200 mt-2"
                                    >
                                        Salvar Datas
                                    </button>
                                )}
                            </div>

                            {/* Envio Contabilidade */}
                            {['PROGRAMADA', 'ENVIADO_CONTABILIDADE', 'EM_FERIAS', 'GOZADA'].includes(showDetail.status) && (
                                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 shadow-sm space-y-4">
                                    <h3 className="text-sm font-black text-indigo-900 border-b border-indigo-200 pb-2 flex items-center justify-between">
                                        Envio DP / Contabilidade
                                        {showDetail.status === 'PROGRAMADA' && (
                                            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-black uppercase">Aguardando Envio</span>
                                        )}
                                    </h3>
                                    
                                    <div>
                                        <label className="text-[10px] font-black text-indigo-400 uppercase ml-1">Data de Envio</label>
                                        <input
                                            type="date"
                                            value={drawerForm.dataEnvioContabilidade?.split('T')[0] || ''}
                                            onChange={(e) => setDrawerForm({...drawerForm, dataEnvioContabilidade: e.target.value})}
                                            disabled={showDetail.status === 'EM_FERIAS' || showDetail.status === 'GOZADA' || showDetail.status === 'DESLIGADO'}
                                            className="w-full mt-2 px-3 py-2 bg-white border border-indigo-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 disabled:opacity-50"
                                        />
                                    </div>

                                    {showDetail.status === 'PROGRAMADA' && (
                                        <button 
                                            onClick={() => handleUpdateStatus(showDetail.id, 'ENVIADO_CONTABILIDADE', { dataEnvioContabilidade: drawerForm.dataEnvioContabilidade || new Date().toISOString() })}
                                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg text-xs font-black transition-all shadow-md mt-2"
                                        >
                                            Confirmar Envio para Contabilidade
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Controle de Etapa */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                                <h3 className="text-sm font-black text-slate-800 border-b border-slate-200 pb-2">Status do Pipeline</h3>
                                
                                <div className="flex flex-col gap-2">
                                    {showDetail.status === 'ENVIADO_CONTABILIDADE' && (
                                        <button 
                                            onClick={() => handleUpdateStatus(showDetail.id, 'EM_FERIAS')}
                                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-xs font-black transition-all shadow-md flex items-center justify-center gap-2"
                                        >
                                            <Calendar className="w-4 h-4" /> Marcar como "Em Férias" agora
                                        </button>
                                    )}

                                    {showDetail.status === 'EM_FERIAS' && (
                                        <button 
                                            onClick={() => handleUpdateStatus(showDetail.id, 'GOZADA', { diasGozados: showDetail.diasDireito })}
                                            className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3 rounded-xl text-xs font-black transition-all shadow-md flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle2 className="w-4 h-4" /> Concluir Férias (Férias Gozadas)
                                        </button>
                                    )}
                                </div>
                                <div className="pt-2 border-t border-slate-200">
                                    <button 
                                        onClick={() => {
                                            if (confirm('Deseja realmente excluir este registro?')) {
                                                handleDelete(showDetail.id);
                                                setShowDetail(null);
                                            }
                                        }}
                                        className="w-full text-center py-2 text-xs font-bold text-rose-500 hover:text-rose-700 transition-colors"
                                    >
                                        Excluir Registro
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
