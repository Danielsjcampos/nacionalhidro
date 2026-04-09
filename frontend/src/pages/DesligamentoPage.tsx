import { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import {
    Loader2, Plus, X, Search, RefreshCw, UserX,
    ChevronRight, Building2, User, Calendar, CheckCircle2,
    FileText, Scale, Clock
} from 'lucide-react';

// ─── CONFIG ─────────────────────────────────────────────────────

const ETAPAS_PRINCIPAL = [
    { key: 'NOVA_SOLICITACAO', label: 'Nova Solicitação', dot: 'bg-amber-500', color: 'text-amber-600', bg: 'bg-amber-50' },
    { key: 'APURACAO_RESCISAO', label: 'Apuração Rescisão', dot: 'bg-blue-500', color: 'text-blue-600', bg: 'bg-blue-50' },
    { key: 'ENVIADO_CONTABILIDADE', label: 'Contabilidade', dot: 'bg-indigo-500', color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { key: 'ENVIADO_SIN', label: 'Enviado SIN', dot: 'bg-violet-500', color: 'text-violet-600', bg: 'bg-violet-50' },
    { key: 'ASSINATURA_DOCUMENTOS', label: 'Assinatura Docs', dot: 'bg-teal-500', color: 'text-teal-600', bg: 'bg-teal-50' },
    { key: 'CONCLUIDO', label: 'Concluídos', dot: 'bg-slate-400', color: 'text-slate-500', bg: 'bg-slate-50' },
];

const ETAPAS_JURIDICA = [
    { key: 'RECEBIMENTO_NOTIFICACAO', label: 'Notificação', dot: 'bg-rose-400', color: 'text-rose-600', bg: 'bg-rose-50' },
    { key: 'PRE_ANALISE_JURIDICA', label: 'Pré-Análise', dot: 'bg-rose-500', color: 'text-rose-600', bg: 'bg-rose-50' },
    { key: 'PROVIDENCIANDO_DOCUMENTACAO', label: 'Providenciando Docs', dot: 'bg-orange-500', color: 'text-orange-600', bg: 'bg-orange-50' },
    { key: 'AUDIENCIA_AGENDADA', label: 'Audiência Agendada', dot: 'bg-amber-500', color: 'text-amber-600', bg: 'bg-amber-50' },
    { key: 'PROCESSO_ANDAMENTO', label: 'Em Andamento', dot: 'bg-yellow-500', color: 'text-yellow-700', bg: 'bg-yellow-50' },
    { key: 'PROCESSO_ACORDO', label: 'Processo em Acordo', dot: 'bg-lime-500', color: 'text-lime-700', bg: 'bg-lime-50' },
    { key: 'LANCADO_SIN_JURIDICO', label: 'Lançado no SIN', dot: 'bg-emerald-500', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { key: 'PROCESSO_ENCERRADO', label: 'Encerrado', dot: 'bg-slate-400', color: 'text-slate-500', bg: 'bg-slate-50' },
];


const TIPOS_DESLIGAMENTO = [
    { key: 'AVISO_PREVIO_TRABALHADO', label: 'Aviso prévio trabalhado' },
    { key: 'AVISO_PREVIO_INDENIZADO', label: 'Aviso prévio indenizado' },
    { key: 'JUSTA_CAUSA_ABANDONO', label: 'Justa causa/Abandono' },
    { key: 'PEDIDO_DEMISSAO', label: 'Pedido de demissão' },
    { key: 'RESCISAO_INDIRETA', label: 'Rescisão indireta' },
    { key: 'TERMINO_CONTRATO_EXPERIENCIA', label: 'Término Contrato de Experiência' },
    { key: 'FALECIMENTO', label: 'Falecimento' },
];

const EMPTY_FORM = {
    funcionarioId: '', empresaContratante: '', tipoDesligamento: '',
    dataAdmissao: '', dataDesligamento: '', dataLimitePagamentoRescisao: '',
    contaBancaria: '', pix: '', motivoDesligamento: '',
};

type View = 'principal' | 'juridica';

export default function DesligamentoPage() {
    const [list, setList] = useState<any[]>([]);
    const [funcionarios, setFuncionarios] = useState<any[]>([]);
    const [empresas, setEmpresas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [view, setView] = useState<View>('principal');
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [showDetail, setShowDetail] = useState<any>(null);
    const [drawerForm, setDrawerForm] = useState<Record<string, any>>({});
    const [stats, setStats] = useState<any>(null);

    const fetchAll = async () => {
        try {
            const [dRes, fRes, sRes, eRes] = await Promise.all([
                api.get('/desligamentos'),
                api.get('/gestao-colaboradores?ativo=true'),
                api.get('/desligamentos/stats'),
                api.get('/empresas').catch(() => ({ data: [] })),
            ]);
            setList(dRes.data);
            setFuncionarios(fRes.data);
            setStats(sRes.data);
            setEmpresas(eRes.data);
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    const filtered = useMemo(() => {
        if (!search) return list;
        const s = search.toLowerCase();
        return list.filter((d: any) =>
            d.nome?.toLowerCase().includes(s) ||
            d.cpf?.includes(s) ||
            d.empresaContratante?.toLowerCase().includes(s)
        );
    }, [list, search]);

    const etapas = view === 'principal' ? ETAPAS_PRINCIPAL : ETAPAS_JURIDICA;

    const kanbanData = useMemo(() => {
        const cols: Record<string, any[]> = {};
        etapas.forEach(e => cols[e.key] = []);
        filtered.forEach((d: any) => {
            if (cols[d.etapa]) cols[d.etapa].push(d);
        });
        return cols;
    }, [filtered, etapas]);

    const handleCreate = async () => {
        try {
            await api.post('/desligamentos', form);
            setShowForm(false);
            setForm({ ...EMPTY_FORM });
            fetchAll();
        } catch (err) { console.error(err); }
    };

    const handleMover = async (id: string, etapa: string, extra: Record<string, any> = {}) => {
        try {
            await api.patch(`/desligamentos/${id}/mover`, { etapa, ...extra });
            setShowDetail(null);
            setDrawerForm({});
            fetchAll();
        } catch (err) { console.error(err); }
    };


    const handleDelete = async (id: string) => {
        if (!confirm('Remover registro de desligamento?')) return;
        try {
            await api.delete(`/desligamentos/${id}`);
            fetchAll();
        } catch (err) { console.error(err); }
    };

    const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
    const tipoLabel = (key: string) => TIPOS_DESLIGAMENTO.find(t => t.key === key)?.label || key;

    if (loading) return (
        <div className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
        </div>
    );

    return (
        <div className="h-full flex flex-col space-y-4 overflow-hidden">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        <UserX className="w-7 h-7 text-rose-600" />
                        Desligamentos
                    </h1>
                    <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">
                        {stats?.emAndamento || 0} em andamento • {stats?.counts?.CONCLUIDO || 0} concluídos
                    </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    {/* View toggle */}
                    <div className="flex bg-slate-100 rounded-xl p-1">
                        <button
                            onClick={() => setView('principal')}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${view === 'principal' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
                        >
                            Pipeline DP
                        </button>
                        <button
                            onClick={() => setView('juridica')}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1.5 ${view === 'juridica' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-400'}`}
                        >
                            <Scale className="w-3 h-3" /> Jurídico
                        </button>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text" value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar colaborador..."
                            className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-rose-400 transition-all w-56"
                        />
                    </div>
                    <button onClick={fetchAll} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-rose-600 transition-all">
                        <RefreshCw className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setShowForm(true)}
                        className="bg-rose-600 text-white px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-rose-700 shadow-lg shadow-rose-600/20 active:scale-95 transition-all"
                    >
                        <Plus className="w-4 h-4" /> Novo Desligamento
                    </button>
                </div>
            </div>

            {/* Kanban */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4 flex gap-4">
                {etapas.map(etapa => {
                    const cards = kanbanData[etapa.key] || [];
                    return (
                        <div key={etapa.key} className="flex-shrink-0 w-72 flex flex-col bg-slate-100/50 rounded-2xl border border-slate-200/60 overflow-hidden">
                            <div className="p-4 bg-white border-b border-slate-100 flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${etapa.dot}`} />
                                <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-tight">{etapa.label}</h3>
                                <span className="ml-auto px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-black rounded-md">{cards.length}</span>
                            </div>

                            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                                {cards.map((d: any) => (
                                    <div 
                                        key={d.id} 
                                        onClick={() => { setShowDetail(d); setDrawerForm({}); }}
                                        className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm group hover:shadow-md hover:border-rose-100 transition-all cursor-pointer"
                                    >
                                        {/* Top */}
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{d.empresaContratante || 'NACIONAL HIDRO'}</span>
                                                <h4 className="text-sm font-black text-slate-800 leading-tight group-hover:text-rose-600 transition-colors">{d.nome}</h4>
                                                <p className="text-[10px] font-bold text-slate-400">{d.cargo}</p>
                                            </div>
                                        </div>

                                        {/* Tipo Tag */}
                                        {d.tipoDesligamento && (
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black mb-3 ${etapa.bg} ${etapa.color}`}>
                                                {tipoLabel(d.tipoDesligamento)}
                                            </span>
                                        )}

                                        {/* Dates */}
                                        <div className="space-y-1.5">
                                            {d.dataDesligamento && (
                                                <div className="flex items-center gap-2 text-slate-500">
                                                    <Calendar className="w-3 h-3 flex-shrink-0 text-rose-400" />
                                                    <span className="text-[10px] font-bold">Desligamento: {fmtDate(d.dataDesligamento)}</span>
                                                </div>
                                            )}
                                            {d.dataLimitePagamentoRescisao && (
                                                <div className="flex items-center gap-2 text-slate-500">
                                                    <Clock className="w-3 h-3 flex-shrink-0 text-amber-400" />
                                                    <span className="text-[10px] font-bold">Limite Rescisão: {fmtDate(d.dataLimitePagamentoRescisao)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {cards.length === 0 && (
                                    <div className="py-6 text-center text-xs text-slate-400 italic">Nenhum processo</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ─── MODAL: NOVO DESLIGAMENTO ─────────────────────────────── */}
            {showForm && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 bg-rose-600 text-white">
                            <h2 className="text-lg font-black flex items-center gap-2"><UserX className="w-5 h-5" /> Novo Desligamento</h2>
                            <p className="text-[10px] font-bold opacity-80 mt-1 uppercase">Etapa inicial do processo</p>
                        </div>

                        <div className="p-8 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Funcionário *</label>
                                    <div className="relative mt-2">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <select 
                                            value={form.funcionarioId} 
                                            onChange={e => {
                                                const id = e.target.value;
                                                const func = funcionarios.find(f => f.id === id);
                                                if (func) {
                                                    setForm({
                                                        ...form,
                                                        funcionarioId: id,
                                                        dataAdmissao: func.dataAdmissao?.split('T')[0] || '',
                                                        pix: func.chavePix || '',
                                                        contaBancaria: func.banco ? `${func.banco} / Ag ${func.agencia} / CC ${func.conta}` : '',
                                                    });
                                                } else {
                                                    setForm({ ...form, funcionarioId: id });
                                                }
                                            }}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-700 outline-none focus:border-rose-400 transition-all appearance-none">
                                            <option value="">Selecione o colaborador...</option>
                                            {funcionarios.map((f: any) => <option key={f.id} value={f.id}>{f.nome} ({f.cargo})</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Empresa Contratante</label>
                                    <div className="relative mt-2">
                                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <select value={form.empresaContratante} onChange={e => setForm({ ...form, empresaContratante: e.target.value })}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-700 outline-none focus:border-rose-400 transition-all appearance-none">
                                            <option value="">Selecione a empresa...</option>
                                            {empresas.map((emp: any) => <option key={emp.id} value={emp.nome}>{emp.nome}</option>)}
                                            <option value="NACIONAL HIDRO">NACIONAL HIDRO (PADRÃO)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Tipo de Desligamento *</label>
                                    <select value={form.tipoDesligamento} onChange={e => setForm({ ...form, tipoDesligamento: e.target.value })}
                                        className="w-full mt-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-700 outline-none focus:border-rose-400 transition-all">
                                        <option value="">Selecione o tipo...</option>
                                        {TIPOS_DESLIGAMENTO.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Data de Admissão</label>
                                    <input type="date" value={form.dataAdmissao} onChange={e => setForm({ ...form, dataAdmissao: e.target.value })}
                                        className="w-full mt-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-700" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Data do Desligamento</label>
                                    <input type="date" value={form.dataDesligamento} onChange={e => setForm({ ...form, dataDesligamento: e.target.value })}
                                        className="w-full mt-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-700" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Data Limite Pagamento Rescisão</label>
                                    <input type="date" value={form.dataLimitePagamentoRescisao} onChange={e => setForm({ ...form, dataLimitePagamentoRescisao: e.target.value })}
                                        className="w-full mt-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-700" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">PIX do Colaborador</label>
                                    <input type="text" value={form.pix} onChange={e => setForm({ ...form, pix: e.target.value })}
                                        placeholder="CPF, e-mail ou telefone"
                                        className="w-full mt-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-700" />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Conta Bancária</label>
                                    <input type="text" value={form.contaBancaria} onChange={e => setForm({ ...form, contaBancaria: e.target.value })}
                                        placeholder="Banco/Agência/Conta corrente com dígito"
                                        className="w-full mt-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-700" />
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                            <button onClick={() => setShowForm(false)} className="flex-1 py-3 text-sm font-black text-slate-500 hover:text-slate-800 transition-colors">CANCELAR</button>
                            <button onClick={handleCreate} disabled={!form.funcionarioId || !form.tipoDesligamento}
                                className="flex-[2] bg-rose-600 text-white py-3 rounded-2xl text-xs font-black shadow-lg shadow-rose-600/20 hover:bg-rose-700 active:scale-[0.98] transition-all disabled:opacity-50 uppercase tracking-widest">
                                Iniciar Processo de Desligamento
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── DRAWER (SIDEBAR) ──────────────────────────────────────────────── */}
            {showDetail && (
                <>
                    <div
                        className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[60] transition-opacity"
                        onClick={() => setShowDetail(null)}
                    />
                    <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-[70] flex flex-col animate-in slide-in-from-right duration-300">
                        {/* Header */}
                        <div className={`p-6 text-white shrink-0 ${
                            ['RECEBIMENTO_NOTIFICACAO', 'PRE_ANALISE_JURIDICA', 'PROVIDENCIANDO_DOCUMENTACAO', 'AUDIENCIA_AGENDADA', 'PROCESSO_ANDAMENTO', 'PROCESSO_ACORDO', 'LANCADO_SIN_JURIDICO'].includes(showDetail.etapa) ? 'bg-rose-600' :
                            showDetail.etapa === 'NOVA_SOLICITACAO' ? 'bg-blue-600' :
                            showDetail.etapa === 'APURACAO_RESCISAO' ? 'bg-indigo-600' :
                            showDetail.etapa === 'ENVIADO_CONTABILIDADE' ? 'bg-violet-600' :
                            showDetail.etapa === 'ENVIADO_SIN' ? 'bg-teal-600' :
                            showDetail.etapa === 'ASSINATURA_DOCUMENTOS' ? 'bg-slate-800' :
                            'bg-slate-600'
                        }`}>
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-2 opacity-80 mb-1">
                                        <Building2 className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">{showDetail.empresaContratante || 'NACIONAL HIDRO'}</span>
                                    </div>
                                    <h2 className="text-xl font-black">{showDetail.nome}</h2>
                                    <p className="text-sm font-medium opacity-90">{showDetail.cargo}</p>
                                </div>
                                <button onClick={() => setShowDetail(null)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/50">
                            {/* Info Box */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                <div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase">Tipo de Desligamento</span>
                                    <p className="text-sm font-bold text-slate-800 mt-0.5">{tipoLabel(showDetail.tipoDesligamento)}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase">Admissão</span>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                            <span className="text-sm font-bold text-slate-700">{fmtDate(showDetail.dataAdmissao)}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase">Desligamento</span>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Calendar className="w-3.5 h-3.5 text-rose-400" />
                                            <span className="text-sm font-bold text-slate-700">{fmtDate(showDetail.dataDesligamento)}</span>
                                        </div>
                                    </div>
                                    {showDetail.dataLimitePagamentoRescisao && (
                                        <div className="col-span-2 pt-2 border-t border-slate-100">
                                            <span className="text-[10px] font-black text-slate-400 uppercase">Limite Pagamento Rescisão</span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Clock className="w-3.5 h-3.5 text-amber-500" />
                                                <span className="text-sm font-bold text-amber-600">{fmtDate(showDetail.dataLimitePagamentoRescisao)}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Etapa Específica Form */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                    {showDetail.etapa === 'NOVA_SOLICITACAO' && <><CheckCircle2 className="w-4 h-4 text-blue-500" /> Preparar Apuração</>}
                                    {showDetail.etapa === 'APURACAO_RESCISAO' && <><FileText className="w-4 h-4 text-indigo-500" /> Apurar Rescisão</>}
                                    {showDetail.etapa === 'ENVIADO_CONTABILIDADE' && <><Building2 className="w-4 h-4 text-violet-500" /> Retorno Contabilidade</>}
                                    {showDetail.etapa === 'ENVIADO_SIN' && <><FileText className="w-4 h-4 text-teal-500" /> Dados para Pagamento</>}
                                    {showDetail.etapa === 'ASSINATURA_DOCUMENTOS' && <><CheckCircle2 className="w-4 h-4 text-slate-700" /> Assinatura</>}
                                    {showDetail.etapa === 'RECEBIMENTO_NOTIFICACAO' && <><Scale className="w-4 h-4 text-rose-500" /> Registrar Notificação</>}
                                </h3>

                                {showDetail.etapa === 'NOVA_SOLICITACAO' && (
                                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                        <p className="text-xs font-bold text-slate-500 uppercase">Checklists obrigatórios antes de avançar:</p>
                                        {[
                                            { key: 'sinExcluido', label: '✓ Colaborador excluído do SIN?' },
                                            { key: 'whatsappEscalaExcluido', label: '✓ Excluído WhatsApp da Escala?' },
                                        ].map(item => (
                                            <label key={item.key} className="flex items-center gap-3 cursor-pointer group">
                                                <input type="checkbox" checked={!!drawerForm[item.key]}
                                                    onChange={e => setDrawerForm({ ...drawerForm, [item.key]: e.target.checked })}
                                                    className="w-5 h-5 rounded border-slate-300 text-blue-600" />
                                                <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">{item.label}</span>
                                            </label>
                                        ))}
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase">Link da Pasta de Rescisão</label>
                                            <input type="url" value={drawerForm.linkPastaRescisao || ''} onChange={e => setDrawerForm({ ...drawerForm, linkPastaRescisao: e.target.value })}
                                                placeholder="https://drive.google.com/..."
                                                className="w-full mt-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-blue-400" />
                                        </div>
                                    </div>
                                )}

                                {showDetail.etapa === 'APURACAO_RESCISAO' && (
                                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                        {[
                                            { key: 'pontoApurado', label: 'Ponto do último período apurado?' },
                                            { key: 'vrVtApurado', label: 'Desconto de VR/VT apurado?' },
                                            { key: 'descontarPassagem', label: 'Descontar passagem retorno de viagem?' },
                                            { key: 'haDescontos', label: 'Há algum desconto a realizar na rescisão?' },
                                        ].map(item => (
                                            <label key={item.key} className="flex items-center gap-3 cursor-pointer group">
                                                <input type="checkbox" checked={!!drawerForm[item.key]}
                                                    onChange={e => setDrawerForm({ ...drawerForm, [item.key]: e.target.checked })}
                                                    className="w-5 h-5 rounded border-slate-300 text-indigo-600" />
                                                <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">{item.label}</span>
                                            </label>
                                        ))}
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase">Devolução de Equipamentos</label>
                                            <select value={drawerForm.devolucaoEquipamentos || ''} onChange={e => setDrawerForm({ ...drawerForm, devolucaoEquipamentos: e.target.value })}
                                                className="w-full mt-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700">
                                                <option value="">Selecione...</option>
                                                <option value="SIM">Concluída</option>
                                                <option value="PENDENTE">Pendente</option>
                                            </select>
                                        </div>
                                        {drawerForm.haDescontos && (
                                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase">Valor Total do Desconto (R$)</label>
                                                    <input type="number" step="0.01" value={drawerForm.valorDesconto || ''} onChange={e => setDrawerForm({ ...drawerForm, valorDesconto: e.target.value })}
                                                        className="w-full mt-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700" />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase">Descrição dos Descontos</label>
                                                    <textarea value={drawerForm.descricaoDescontos || ''} onChange={e => setDrawerForm({ ...drawerForm, descricaoDescontos: e.target.value })}
                                                        rows={2} className="w-full mt-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {showDetail.etapa === 'ENVIADO_CONTABILIDADE' && (
                                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase">Data Envio p/ Contabilidade</label>
                                            <input type="date" value={drawerForm.dataEnvioContabilidade || new Date().toISOString().split('T')[0]}
                                                onChange={e => setDrawerForm({ ...drawerForm, dataEnvioContabilidade: e.target.value })}
                                                className="w-full mt-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase">Data Retorno Contabilidade</label>
                                            <input type="date" value={drawerForm.dataRetornoContabilidade || ''}
                                                onChange={e => setDrawerForm({ ...drawerForm, dataRetornoContabilidade: e.target.value })}
                                                className="w-full mt-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase">Prévia Aprovada?</label>
                                            <select value={drawerForm.previaAprovada || ''} onChange={e => setDrawerForm({ ...drawerForm, previaAprovada: e.target.value })}
                                                className="w-full mt-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700">
                                                <option value="">Selecione...</option>
                                                <option value="APROVADA">Aprovada</option>
                                                <option value="PENDENTE">Pendente</option>
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {showDetail.etapa === 'ENVIADO_SIN' && (
                                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <input type="checkbox" checked={!!drawerForm.rescisaoLancada}
                                                onChange={e => setDrawerForm({ ...drawerForm, rescisaoLancada: e.target.checked })}
                                                className="w-5 h-5 text-teal-600 rounded border-slate-300" />
                                            <span className="text-sm font-bold text-slate-700">Rescisão lançada no sistema?</span>
                                        </label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase">FGTS Lançado?</label>
                                                <select value={drawerForm.fgtsLancado || ''} onChange={e => setDrawerForm({ ...drawerForm, fgtsLancado: e.target.value })}
                                                    className="w-full mt-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
                                                    <option value="">—</option>
                                                    <option value="FEITO">Feito</option>
                                                    <option value="N_A">N/A</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase">Pensão Alimentícia?</label>
                                                <select value={drawerForm.pensaoAlimenticia || ''} onChange={e => setDrawerForm({ ...drawerForm, pensaoAlimenticia: e.target.value })}
                                                    className="w-full mt-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
                                                    <option value="">—</option>
                                                    <option value="FEITO">Feito</option>
                                                    <option value="N_A">N/A</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase">Venc. Rescisão</label>
                                                <input type="date" value={drawerForm.dataVencimentoRescisao || ''} onChange={e => setDrawerForm({ ...drawerForm, dataVencimentoRescisao: e.target.value })}
                                                    className="w-full mt-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase">Venc. Guia FGTS</label>
                                                <input type="date" value={drawerForm.dataVencimentoFGTS || ''} onChange={e => setDrawerForm({ ...drawerForm, dataVencimentoFGTS: e.target.value })}
                                                    className="w-full mt-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase">Guia Paga?</label>
                                            <select value={drawerForm.guiaPaga || ''} onChange={e => setDrawerForm({ ...drawerForm, guiaPaga: e.target.value })}
                                                className="w-full mt-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700">
                                                <option value="">Selecione...</option>
                                                <option value="PAGO_NA_DATA">Pago na data</option>
                                                <option value="PAGO_COM_MULTA">Pago com atraso</option>
                                                <option value="PENDENTE">Pendente</option>
                                                <option value="N_A">N/A</option>
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {showDetail.etapa === 'ASSINATURA_DOCUMENTOS' && (
                                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase">Envio/Agendamento</label>
                                            <input type="date" value={drawerForm.dataAssinatura || new Date().toISOString().split('T')[0]}
                                                onChange={e => setDrawerForm({ ...drawerForm, dataAssinatura: e.target.value })}
                                                className="w-full mt-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase">Forma Assinatura</label>
                                            <select value={drawerForm.formaAssinatura || ''} onChange={e => setDrawerForm({ ...drawerForm, formaAssinatura: e.target.value })}
                                                className="w-full mt-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700">
                                                <option value="">Selecione...</option>
                                                <option value="PRESENCIAL">Presencial</option>
                                                <option value="DIGITAL">Digital</option>
                                                <option value="EMAIL">E-mail</option>
                                            </select>
                                        </div>
                                        {[
                                            { key: 'colaboradorAssinou', label: 'Colaborador assinou / respondeu?' },
                                            { key: 'cajuExcluido', label: 'Excluído do CAJU?' },
                                        ].map(item => (
                                            <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                                                <input type="checkbox" checked={!!drawerForm[item.key]}
                                                    onChange={e => setDrawerForm({ ...drawerForm, [item.key]: e.target.checked })}
                                                    className="w-5 h-5 text-slate-700 rounded border-slate-300" />
                                                <span className="text-sm font-bold text-slate-700">{item.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {showDetail.etapa === 'RECEBIMENTO_NOTIFICACAO' && (
                                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase">Forma Recebimento</label>
                                            <select value={drawerForm.formaRecepcaoNotificacao || ''} onChange={e => setDrawerForm({ ...drawerForm, formaRecepcaoNotificacao: e.target.value })}
                                                className="w-full mt-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700">
                                                <option value="">Selecione...</option>
                                                <option value="EMAIL_JURIDICO">E-mail jurídico</option>
                                                <option value="CORREIOS">Correios</option>
                                                <option value="EMAIL_TRIBUNAL">E-mail Tribunal</option>
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase">Data Recebimento</label>
                                                <input type="date" value={drawerForm.dataRecepcaoNotificacao || ''} onChange={e => setDrawerForm({ ...drawerForm, dataRecepcaoNotificacao: e.target.value })}
                                                    className="w-full mt-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase">Envio Jurídico</label>
                                                <input type="date" value={drawerForm.dataEnvioJuridico || ''} onChange={e => setDrawerForm({ ...drawerForm, dataEnvioJuridico: e.target.value })}
                                                    className="w-full mt-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase">Número do Processo</label>
                                            <input type="text" value={drawerForm.numeroProcesso || ''} onChange={e => setDrawerForm({ ...drawerForm, numeroProcesso: e.target.value })}
                                                className="w-full mt-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase">Link da Pasta de Processo</label>
                                            <input type="url" value={drawerForm.linkPastaProcesso || ''} onChange={e => setDrawerForm({ ...drawerForm, linkPastaProcesso: e.target.value })}
                                                placeholder="https://..."
                                                className="w-full mt-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700" />
                                        </div>
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input type="checkbox" checked={!!drawerForm.emailEnviadoJuridico}
                                                onChange={e => setDrawerForm({ ...drawerForm, emailEnviadoJuridico: e.target.checked })}
                                                className="w-5 h-5 text-rose-600 rounded border-slate-300" />
                                            <span className="text-sm font-bold text-slate-700">E-mail enviado para o jurídico?</span>
                                        </label>
                                    </div>
                                )}
                            </div>

                            {/* Additional Actions (Excluir, Transferir p/ Jurídico) */}
                            {['NOVA_SOLICITACAO', 'APURACAO_RESCISAO'].includes(showDetail.etapa) && (
                                <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 flex items-center justify-between">
                                    <div>
                                        <h4 className="text-sm font-black text-rose-800">Processo Trabalhista</h4>
                                        <p className="text-[10px] font-bold text-rose-600 mt-0.5">Mover funcionário para trilha jurídica</p>
                                    </div>
                                    <button 
                                        onClick={() => handleMover(showDetail.id, 'RECEBIMENTO_NOTIFICACAO', { temProcessoTrabalhista: true })}
                                        className="px-4 py-2 bg-white text-rose-600 border border-rose-200 rounded-lg text-xs font-black shadow-sm hover:shadow hover:border-rose-300 transition-all flex items-center gap-2"
                                    >
                                        <Scale className="w-3.5 h-3.5" /> Transferir
                                    </button>
                                </div>
                            )}

                            <div className="pt-8">
                                <button onClick={() => handleDelete(showDetail.id)} className="text-xs font-bold text-slate-400 hover:text-rose-600 transition-colors flex items-center gap-1.5 mx-auto">
                                    <X className="w-3.5 h-3.5" /> Excluir Registro
                                </button>
                            </div>
                        </div>

                        {/* Footer / Actions */}
                        <div className="p-6 bg-white border-t border-slate-100 shrink-0">
                            {showDetail.etapa === 'NOVA_SOLICITACAO' && (
                                <button onClick={() => handleMover(showDetail.id, 'APURACAO_RESCISAO', drawerForm)} className="w-full bg-blue-600 text-white py-3.5 rounded-2xl text-xs font-black shadow-lg shadow-blue-600/20 hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest">
                                    Avançar p/ Apuração <ChevronRight className="w-4 h-4" />
                                </button>
                            )}
                            {showDetail.etapa === 'APURACAO_RESCISAO' && (
                                <button onClick={() => handleMover(showDetail.id, 'ENVIADO_CONTABILIDADE', drawerForm)} className="w-full bg-indigo-600 text-white py-3.5 rounded-2xl text-xs font-black shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest">
                                    Enviar Contabilidade <ChevronRight className="w-4 h-4" />
                                </button>
                            )}
                            {showDetail.etapa === 'ENVIADO_CONTABILIDADE' && (
                                <button onClick={() => handleMover(showDetail.id, 'ENVIADO_SIN', drawerForm)} className="w-full bg-violet-600 text-white py-3.5 rounded-2xl text-xs font-black shadow-lg shadow-violet-600/20 hover:bg-violet-700 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest">
                                    Lançar no SIN <ChevronRight className="w-4 h-4" />
                                </button>
                            )}
                            {showDetail.etapa === 'ENVIADO_SIN' && (
                                <button onClick={() => handleMover(showDetail.id, 'ASSINATURA_DOCUMENTOS', drawerForm)} className="w-full bg-teal-600 text-white py-3.5 rounded-2xl text-xs font-black shadow-lg shadow-teal-600/20 hover:bg-teal-700 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest">
                                    Avançar p/ Assinatura <ChevronRight className="w-4 h-4" />
                                </button>
                            )}
                            {showDetail.etapa === 'ASSINATURA_DOCUMENTOS' && (
                                <button onClick={() => {
                                    const expurgo = new Date();
                                    expurgo.setFullYear(expurgo.getFullYear() + 5);
                                    handleMover(showDetail.id, 'CONCLUIDO', {
                                        ...drawerForm, concluido: true, dataExpurgo: expurgo.toISOString(),
                                    });
                                }} className="w-full bg-slate-800 text-white py-3.5 rounded-2xl text-xs font-black shadow-lg shadow-slate-800/20 hover:bg-black hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest">
                                    Concluir <CheckCircle2 className="w-4 h-4" />
                                </button>
                            )}

                            {view === 'juridica' && showDetail.etapa === 'RECEBIMENTO_NOTIFICACAO' && (
                                <button onClick={() => handleMover(showDetail.id, 'PRE_ANALISE_JURIDICA', drawerForm)} className="w-full bg-rose-600 text-white py-3.5 rounded-2xl text-xs font-black shadow-lg shadow-rose-600/20 hover:bg-rose-700 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest">
                                    Avançar p/ Pré-Análise <ChevronRight className="w-4 h-4" />
                                </button>
                            )}
                            {view === 'juridica' && showDetail.etapa === 'AUDIENCIA_AGENDADA' && (
                                <button onClick={() => handleMover(showDetail.id, 'PROCESSO_ANDAMENTO')} className="w-full bg-amber-600 text-white py-3.5 rounded-2xl text-xs font-black shadow-lg shadow-amber-600/20 hover:bg-amber-700 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest">
                                    Em Andamento <ChevronRight className="w-4 h-4" />
                                </button>
                            )}
                            {view === 'juridica' && showDetail.etapa === 'PROCESSO_ACORDO' && (
                                <button onClick={() => handleMover(showDetail.id, 'LANCADO_SIN_JURIDICO')} className="w-full bg-emerald-600 text-white py-3.5 rounded-2xl text-xs font-black shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest">
                                    Lançar SIN Jurídico <ChevronRight className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
