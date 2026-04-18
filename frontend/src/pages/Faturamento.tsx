import { useToast } from '../contexts/ToastContext';
import { useEffect, useState } from 'react';
import api from '../services/api';
import {
    Plus, Loader2, X, DollarSign, Send, CheckCircle2,
    AlertTriangle, Clock, TrendingUp, Receipt, Filter, Download, RotateCw, FileText, Shield, Pencil
} from 'lucide-react';
import ModalEdicaoFaturamento from '../components/ModalEdicaoFaturamento';

const TIPOS: Record<string, { label: string; color: string }> = {
    RL: { label: 'RL (Locação 90%)', color: 'bg-blue-100 text-blue-700' },
    NFSE: { label: 'NFS-e (Serviço 10%)', color: 'bg-emerald-100 text-emerald-700' },
    CTE: { label: 'CT-e (Transporte)', color: 'bg-amber-100 text-amber-700' },
    NFE: { label: 'NF-e (Produtos)', color: 'bg-indigo-100 text-indigo-700' }
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    EMITIDA: { label: 'Emitida', color: 'bg-slate-100 text-slate-600' },
    ENVIADA: { label: 'Enviada', color: 'bg-blue-100 text-blue-600' },
    PAGA: { label: 'Paga', color: 'bg-emerald-100 text-emerald-600' },
    VENCIDA: { label: 'Vencida', color: 'bg-red-100 text-red-600' },
    CANCELADA: { label: 'Cancelada', color: 'bg-slate-200 text-slate-500' },
};

const CENTROS_CUSTO = [
    { key: 'EQUIPAMENTO_COMBINADO', label: 'Equip. Combinado' },
    { key: 'ALTO_VACUO_SUCCAO', label: 'Alto Vácuo / Sucção' },
    { key: 'ALTA_PRESSAO_SAP', label: 'Alta Pressão / SAP' },
    { key: 'HIDROJATO', label: 'Hidrojato' },
    { key: 'MAO_DE_OBRA_SERVICO', label: 'Mão de Obra / Serviço' },
    { key: 'OUTROS', label: 'Outros' },
];

export default function Faturamento() {
    const { showToast } = useToast();
    const [faturas, setFaturas] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [clientes, setClientes] = useState<any[]>([]);
    const [medicoes, setMedicoes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [showGerarRL, setShowGerarRL] = useState(false);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterTipo, setFilterTipo] = useState('');
    const [actionModal, setActionModal] = useState<{ type: 'cce' | 'cancelar' | null, id: string, text: string }>({ type: null, id: '', text: '' });
    const [tetoFiscal, setTetoFiscal] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'Status_do_Faturamento' | 'Cancelados'>('Status_do_Faturamento');
    const [editFaturamento, setEditFaturamento] = useState<any>(null);

    const [form, setForm] = useState({
        clienteId: '', tipo: 'RL', numero: '', pedidoCompras: '',
        dataEmissao: '', dataVencimento: '', centroCusto: '',
        valorBruto: '', percentualINSS: '3.5', cnpjFaturamento: '', observacoes: ''
    });

    const [rlForm, setRlForm] = useState({
        clienteId: '', valorTotal: '', centroCusto: '', cnpjFaturamento: '',
        pedidoCompras: '', dataVencimento: '', medicaoId: '', osId: '', percentualRL: '90'
    });

    const fetchAll = async () => {
        try {
            const params: any = {};
            if (filterStatus) params.status = filterStatus;
            if (filterTipo) params.tipo = filterTipo;

            const [fatRes, statsRes, cliRes, tetoRes, medRes] = await Promise.all([
                api.get('/faturamento', { params }),
                api.get('/faturamento/stats'),
                api.get('/clientes'),
                api.get('/dashboard/teto-fiscal').catch(() => ({ data: [] })),
                api.get('/medicoes', { params: { status: 'EM_ABERTO' } }).catch(() => ({ data: [] })),
            ]);
            setFaturas(fatRes.data);
            setStats(statsRes.data);
            setClientes(cliRes.data);
            setTetoFiscal(Array.isArray(tetoRes.data) ? tetoRes.data : []);
            setMedicoes(Array.isArray(medRes.data) ? medRes.data : []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchAll(); }, [filterStatus, filterTipo]);

    const handleSelectMedicao = (id: string) => {
        const med = medicoes.find(m => m.id === id);
        if (med) {
            setRlForm({
                ...rlForm,
                medicaoId: med.id,
                clienteId: med.clienteId,
                valorTotal: med.valorTotal,
                centroCusto: 'MAO_DE_OBRA_SERVICO' // Suggest a default
            });
        }
    };

    const handleCreate = async (overrideTeto = false) => {
        try {
            const bruto = Number(form.valorBruto) || 0;
            const inss = bruto * (Number(form.percentualINSS) / 100);
            await api.post(`/faturamento${overrideTeto ? '?overrideTeto=true' : ''}`, {
                ...form,
                valorBruto: bruto,
                valorINSS: inss,
                valorLiquido: bruto - inss
            });
            setShowForm(false);
            setForm({ clienteId: '', tipo: 'RL', numero: '', pedidoCompras: '', dataEmissao: '', dataVencimento: '', centroCusto: '', valorBruto: '', percentualINSS: '3.5', cnpjFaturamento: '', observacoes: '' });
            fetchAll();
        } catch (err: any) {
            if (err.response?.data?.error === 'TETO_FISCAL_EXCEDIDO') {
                if (window.confirm(err.response.data.message + '\n\nDeseja emitir mesmo assim?')) {
                    handleCreate(true);
                }
            } else {
                console.error(err);
                showToast(err.response?.data?.error || 'Erro ao criar faturamento');
            }
        }
    };

    const handleGerarRL = async (overrideTeto = false) => {
        try {
            await api.post(`/faturamento/gerar-rl${overrideTeto ? '?overrideTeto=true' : ''}`, rlForm);
            setShowGerarRL(false);
            setRlForm({ clienteId: '', valorTotal: '', centroCusto: '', cnpjFaturamento: '', pedidoCompras: '', dataVencimento: '', medicaoId: '', osId: '', percentualRL: '90' });
            fetchAll();
        } catch (err: any) {
            if (err.response?.data?.error === 'TETO_FISCAL_EXCEDIDO') {
                if (window.confirm(err.response.data.message + '\n\nDeseja emitir mesmo assim?')) {
                    handleGerarRL(true);
                }
            } else {
                console.error(err);
                showToast(err.response?.data?.error || 'Erro ao gerar RL');
            }
        }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            const update: any = { status: newStatus };
            if (newStatus === 'PAGA') update.dataPagamento = new Date().toISOString();
            if (newStatus === 'ENVIADA') update.emailEnviadoEm = new Date().toISOString();
            await api.patch(`/faturamento/${id}`, update);
            fetchAll();
        } catch (err) { console.error(err); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Excluir esta fatura?')) return;
        await api.delete(`/faturamento/${id}`);
        fetchAll();
    };

    const handleEmitirFiscal = async (id: string) => {
        try {
            await api.post(`/faturamento/${id}/emitir`);
            showToast('Comando de emissão enviado para a Focus NFe.');
            fetchAll();
        } catch (err: any) {
             showToast(err.response?.data?.details || 'Erro ao emitir documento fiscal');
        }
    };

    const handleConsultarStatus = async (id: string) => {
        try {
            await api.get(`/faturamento/${id}/status`);
            fetchAll();
        } catch (err: any) {
             showToast(err.response?.data?.error || 'Erro ao consultar status');
        }
    };

    const handleActionSubmit = async () => {
        try {
            if (actionModal.type === 'cancelar') {
                await api.post(`/faturamento/${actionModal.id}/cancelar`, { justificativa: actionModal.text });
                showToast('Solicitação de cancelamento enviada com sucesso.');
            } else if (actionModal.type === 'cce') {
                await api.post(`/faturamento/${actionModal.id}/carta-correcao`, { correcao: actionModal.text });
                showToast('Carta de Correção emitida (verifique o status via API da Focus).');
            }
            setActionModal({ type: null, id: '', text: '' });
            fetchAll();
        } catch (err: any) {
             showToast(err.response?.data?.error || err.response?.data?.details || 'Erro ao executar ação');
        }
    };

    const fmt = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

    const handleEditSave = async (data: any) => {
        try {
            const { id, ...payload } = data;
            await api.patch(`/faturamento/${id}`, payload);
            showToast('Faturamento salvo com sucesso!');
            setEditFaturamento(null);
            fetchAll();
        } catch (err: any) {
            showToast(err.response?.data?.error || 'Erro ao salvar', 'error');
        }
    };

    const handleEditEmitir = async (data: any) => {
        try {
            const { id, ...payload } = data;
            await api.patch(`/faturamento/${id}`, payload);
            await api.post(`/faturamento/${id}/emitir`);
            showToast('Fatura salva e comando de emissão enviado!');
            setEditFaturamento(null);
            fetchAll();
        } catch (err: any) {
            showToast(err.response?.data?.error || err.response?.data?.details || 'Erro ao emitir', 'error');
        }
    };

    if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

    return (
        <div className="h-full flex flex-col space-y-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Faturamento</h1>
                    <p className="text-sm text-slate-500">RL • NFS-e • CT-e — Gestão fiscal completa</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowGerarRL(true)} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                        <Receipt className="w-4 h-4" /> Gerar RL + NFS-e (90/10)
                    </button>
                    <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Nova Fatura
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 mt-2">
                {['Status_do_Faturamento', 'Cancelados'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`py-3 px-6 font-bold text-sm border-b-2 transition-all ${
                            activeTab === tab
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                    >
                        {tab.replace(/_/g, ' ')}
                    </button>
                ))}
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-4 gap-3">
                    <div className="bg-white rounded-xl border border-slate-200 p-3">
                        <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="w-4 h-4 text-blue-500" />
                            <p className="text-[10px] font-black text-slate-400 uppercase">Total Bruto</p>
                        </div>
                        <p className="text-lg font-black text-slate-800">{fmt(stats.valorTotalBruto)}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-3">
                        <div className="flex items-center gap-2 mb-1">
                            <DollarSign className="w-4 h-4 text-emerald-500" />
                            <p className="text-[10px] font-black text-slate-400 uppercase">Recebido</p>
                        </div>
                        <p className="text-lg font-black text-emerald-600">{fmt(stats.valorPago)}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-3">
                        <div className="flex items-center gap-2 mb-1">
                            <Clock className="w-4 h-4 text-amber-500" />
                            <p className="text-[10px] font-black text-slate-400 uppercase">A Receber</p>
                        </div>
                        <p className="text-lg font-black text-amber-600">{fmt(stats.valorAReceber)}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-3">
                        <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            <p className="text-[10px] font-black text-slate-400 uppercase">Vencidas</p>
                        </div>
                        <p className="text-lg font-black text-red-600">{stats.totalVencidas}</p>
                    </div>
                </div>
            )}

            {/* Teto Fiscal Alerts */}
            {tetoFiscal.filter((t: any) => t.status !== 'OK').length > 0 && (
                <div className="space-y-2">
                    {tetoFiscal.filter((t: any) => t.status !== 'OK').map((t: any) => (
                        <div key={t.id} className={`rounded-xl p-3 flex items-center gap-3 ${
                            t.status === 'CRITICO' ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'
                        }`}>
                            <Shield className={`w-5 h-5 flex-shrink-0 ${
                                t.status === 'CRITICO' ? 'text-red-500' : 'text-amber-500'
                            }`} />
                            <div className="flex-1 min-w-0">
                                <p className={`text-xs font-bold ${
                                    t.status === 'CRITICO' ? 'text-red-700' : 'text-amber-700'
                                }`}>
                                    {t.status === 'CRITICO' ? '🚨 TETO FISCAL ATINGIDO' : '⚠️ TETO FISCAL EM ALERTA'} — {t.nome}
                                </p>
                                <p className={`text-[10px] ${
                                    t.status === 'CRITICO' ? 'text-red-500' : 'text-amber-500'
                                }`}>
                                    CNPJ: {t.cnpj} • Faturado: {fmt(t.faturamentoMensal)} de {fmt(t.limiteMensal)} ({t.percentualMensal}%)
                                </p>
                            </div>
                            <div className={`text-right min-w-[80px]`}>
                                <div className="w-full bg-slate-200 rounded-full h-2 mb-1">
                                    <div className={`h-2 rounded-full ${
                                        t.status === 'CRITICO' ? 'bg-red-500' : 'bg-amber-500'
                                    }`} style={{ width: `${Math.min(100, t.percentualMensal)}%` }} />
                                </div>
                                <p className={`text-[9px] font-black ${
                                    t.status === 'CRITICO' ? 'text-red-600' : 'text-amber-600'
                                }`}>{t.percentualMensal}%</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Filters */}
            <div className="flex gap-2 items-center">
                <Filter className="w-4 h-4 text-slate-400" />
                <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs">
                    <option value="">Todos os Tipos</option>
                    <option value="RL">RL</option>
                    <option value="NFSE">NFS-e</option>
                    <option value="CTE">CT-e</option>
                    <option value="NFE">NF-e</option>
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs">
                    <option value="">Todos os Status</option>
                    <option value="EMITIDA">Emitida</option>
                    <option value="ENVIADA">Enviada</option>
                    <option value="PAGA">Paga</option>
                    <option value="VENCIDA">Vencida</option>
                </select>
            </div>

            {/* Invoice Table */}
            <div className="flex-1 overflow-y-auto">
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-slate-50 text-left">
                                <th className="p-3 font-black text-slate-400 uppercase text-[10px]">Tipo</th>
                                <th className="p-3 font-black text-slate-400 uppercase text-[10px]">Nº</th>
                                <th className="p-3 font-black text-slate-400 uppercase text-[10px]">Cliente</th>
                                <th className="p-3 font-black text-slate-400 uppercase text-[10px]">Centro Custo</th>
                                <th className="p-3 font-black text-slate-400 uppercase text-[10px]">Emissão</th>
                                <th className="p-3 font-black text-slate-400 uppercase text-[10px]">Vencimento</th>
                                <th className="p-3 font-black text-slate-400 uppercase text-[10px] text-right">Bruto</th>
                                <th className="p-3 font-black text-slate-400 uppercase text-[10px] text-right">Líquido</th>
                                <th className="p-3 font-black text-slate-400 uppercase text-[10px]">Status</th>
                                <th className="p-3 font-black text-slate-400 uppercase text-[10px]">Prefeitura (NFS-e)</th>
                                <th className="p-3 font-black text-slate-400 uppercase text-[10px]">Origem</th>
                                <th className="p-3 font-black text-slate-400 uppercase text-[10px]">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {faturas.filter(f => activeTab === 'Cancelados' ? f.status === 'CANCELADA' || f.focusStatus === 'CANCELADA' : f.status !== 'CANCELADA' && f.focusStatus !== 'CANCELADA').map((f: any) => {
                                const tipoInfo = TIPOS[f.tipo] || TIPOS.RL;
                                const statusInfo = STATUS_MAP[f.status] || STATUS_MAP.EMITIDA;
                                return (
                                    <tr key={f.id} className="border-t border-slate-100 hover:bg-slate-50">
                                        <td className="p-3"><span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${tipoInfo.color}`}>{tipoInfo.label.split(' ')[0]}</span></td>
                                        <td className="p-3 font-bold text-slate-700">{f.numero || '—'}</td>
                                        <td className="p-3 text-slate-600">{f.cliente?.nome || '—'}</td>
                                        <td className="p-3 text-slate-400">{CENTROS_CUSTO.find(c => c.key === f.centroCusto)?.label || f.centroCusto || '—'}</td>
                                        <td className="p-3 text-slate-500">{formatDate(f.dataEmissao)}</td>
                                        <td className="p-3 text-slate-500">{formatDate(f.dataVencimento)}</td>
                                        <td className="p-3 text-right font-bold text-slate-700">{fmt(Number(f.valorBruto))}</td>
                                        <td className="p-3 text-right font-bold text-emerald-600">{fmt(Number(f.valorLiquido))}</td>
                                        <td className="p-3"><span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${statusInfo.color}`}>{statusInfo.label}</span></td>
                                        <td className="p-3 text-[10px] font-bold text-indigo-600">
                                            {f.medicao?.codigo || (f.osId ? `OS ${f.osId.slice(0,4)}` : '—')}
                                        </td>
                                        <td className="p-3">
                                            {['NFSE', 'CTE', 'NFE'].includes(f.tipo) ? (
                                                <div className="flex flex-col gap-1 items-start">
                                                    {f.focusStatus ? (
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                                                                f.status === 'EMITIDO' ? 'bg-emerald-100 text-emerald-700' :
                                                                f.status === 'FALHA' ? 'bg-red-100 text-red-700' :
                                                                'bg-amber-100 text-amber-700'
                                                            }`}>{f.focusStatus}</span>
                                                            <button onClick={() => handleConsultarStatus(f.id)} className="text-slate-400 hover:text-blue-600" title="Atualizar Status">
                                                                <RotateCw className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button onClick={() => handleEmitirFiscal(f.id)} className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1">
                                                            <FileText className="w-3 h-3" /> Emitir {f.tipo}
                                                        </button>
                                                    )}
                                                    {f.urlArquivoNota && (
                                                        <a href={f.urlArquivoNota} target="_blank" rel="noopener noreferrer" className="text-[10px] text-emerald-600 hover:underline flex items-center gap-1 mt-1">
                                                            <Download className="w-3 h-3" /> Ver {f.tipo === 'NFSE' ? 'Nota' : 'DACTE'}
                                                        </a>
                                                    )}
                                                    {f.focusStatus && !['CANCELADO', 'ERRO'].includes(f.focusStatus) && (
                                                        <div className="flex gap-2 mt-1">
                                                            {f.tipo === 'NFSE' && f.status === 'EMITIDO' && (
                                                                <button onClick={() => setActionModal({ type: 'cce', id: f.id, text: '' })} className="text-[9px] text-amber-600 font-bold hover:underline">CC-e</button>
                                                            )}
                                                            <button onClick={() => setActionModal({ type: 'cancelar', id: f.id, text: '' })} className="text-[9px] text-red-600 font-bold hover:underline">Cancelar</button>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : <span className="text-[10px] text-slate-400">N/A</span>}
                                        </td>
                                        <td className="p-3">
                                            <div className="flex gap-2 items-center">
                                                <button onClick={() => setEditFaturamento(f)} className="text-indigo-500 hover:text-indigo-700" title="Editar / Emitir"><Pencil className="w-4 h-4" /></button>
                                                {f.status === 'EMITIDA' && (
                                                    <button onClick={() => handleStatusChange(f.id, 'ENVIADA')} className="text-blue-500 hover:text-blue-700" title="Marcar como Enviada"><Send className="w-4 h-4" /></button>
                                                )}
                                                {f.status === 'ENVIADA' && (
                                                    <button onClick={() => handleStatusChange(f.id, 'PAGA')} className="text-emerald-500 hover:text-emerald-700" title="Marcar como Paga"><CheckCircle2 className="w-4 h-4" /></button>
                                                )}
                                                <button onClick={() => handleDelete(f.id)} className="text-red-400 hover:text-red-600 text-lg leading-none" title="Excluir">×</button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {faturas.filter(f => activeTab === 'Cancelados' ? f.status === 'CANCELADA' || f.focusStatus === 'CANCELADA' : f.status !== 'CANCELADA' && f.focusStatus !== 'CANCELADA').length === 0 && (
                                <tr><td colSpan={10} className="p-8 text-center text-slate-400">Nenhuma fatura encontrada</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* New Fatura Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-3 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800">Nova Fatura</h2>
                            <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="clienteId" className="text-[10px] font-bold text-slate-600 uppercase">Cliente</label>
                            <select id="clienteId" value={form.clienteId} onChange={e => setForm({ ...form, clienteId: e.target.value })}
                                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm">
                                <option value="">Selecione o Cliente *</option>
                                {clientes.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="cnpjFaturamento" className="text-[10px] font-bold text-slate-600 uppercase">CNPJ de Faturamento</label>
                            <select id="cnpjFaturamento" value={form.cnpjFaturamento} onChange={e => setForm({ ...form, cnpjFaturamento: e.target.value })}
                                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm">
                                <option value="">CNPJ de Faturamento (Opcional)</option>
                                {tetoFiscal.map((t: any) => <option key={t.cnpj} value={t.cnpj}>{t.nome} — {t.cnpj}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label htmlFor="tipo" className="text-[10px] font-bold text-slate-600 uppercase">Tipo</label>
                                <select id="tipo" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm">
                                    <option value="RL">RL (Locação)</option>
                                    <option value="NFSE">NFS-e (Serviço)</option>
                                    <option value="CTE">CT-e (Transporte)</option>
                                    <option value="NFE">NF-e (Produtos)</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label htmlFor="numero" className="text-[10px] font-bold text-slate-600 uppercase">Número</label>
                                <input id="numero" value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })}
                                    placeholder="Número da nota" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label htmlFor="dataEmissao" className="text-[10px] font-bold text-slate-600 uppercase">Data de Emissão</label>
                                <input id="dataEmissao" type="date" value={form.dataEmissao} onChange={e => setForm({ ...form, dataEmissao: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                            </div>
                            <div className="space-y-1">
                                <label htmlFor="dataVencimento" className="text-[10px] font-bold text-slate-600 uppercase">Vencimento</label>
                                <input id="dataVencimento" type="date" value={form.dataVencimento} onChange={e => setForm({ ...form, dataVencimento: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" placeholder="Vencimento" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="centroCusto" className="text-[10px] font-bold text-slate-600 uppercase">Centro de Custo</label>
                            <select id="centroCusto" value={form.centroCusto} onChange={e => setForm({ ...form, centroCusto: e.target.value })}
                                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm">
                                <option value="">Centro de Custo</option>
                                {CENTROS_CUSTO.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <input type="number" step="0.01" value={form.valorBruto} onChange={e => setForm({ ...form, valorBruto: e.target.value })}
                                placeholder="Valor Bruto *" className="border border-slate-200 rounded-lg p-2.5 text-sm" />
                            <input type="number" step="0.1" value={form.percentualINSS} onChange={e => setForm({ ...form, percentualINSS: e.target.value })}
                                placeholder="% INSS (3.5)" className="border border-slate-200 rounded-lg p-2.5 text-sm" />
                        </div>
                        <input value={form.pedidoCompras} onChange={e => setForm({ ...form, pedidoCompras: e.target.value })}
                            placeholder="Pedido de Compras do Cliente" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                        <button onClick={() => handleCreate()} disabled={!form.clienteId || !form.valorBruto}
                            className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-bold text-sm disabled:opacity-50">
                            Criar Fatura
                        </button>
                    </div>
                </div>
            )}

            {/* Gerar RL + NFS-e Modal */}
            {showGerarRL && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-emerald-700">Gerar RL (90%) + NFS-e (10%)</h2>
                            <button onClick={() => setShowGerarRL(false)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <p className="text-xs text-slate-500">O sistema criará automaticamente 2 faturas: RL (90% locação) e NFS-e (10% serviço com INSS 3.5%)</p>
                        
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase">Vincular Medição (Opcional)</label>
                            <select 
                                value={rlForm.medicaoId} 
                                onChange={e => handleSelectMedicao(e.target.value)}
                                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-blue-50/50"
                            >
                                <option value="">--- Selecione uma Medição Pendente ---</option>
                                {medicoes.map((m: any) => (
                                    <option key={m.id} value={m.id}>
                                        {m.codigo} - {m.cliente?.nome} ({fmt(Number(m.valorTotal))})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <select value={rlForm.clienteId} onChange={e => setRlForm({ ...rlForm, clienteId: e.target.value })}
                            disabled={!!rlForm.medicaoId}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm disabled:bg-slate-50">
                            <option value="">Selecione o Cliente *</option>
                            {clientes.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </select>
                        <select value={rlForm.cnpjFaturamento} onChange={e => setRlForm({ ...rlForm, cnpjFaturamento: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm">
                            <option value="">CNPJ de Faturamento (Opcional)</option>
                            {tetoFiscal.map((t: any) => <option key={t.cnpj} value={t.cnpj}>{t.nome} — {t.cnpj}</option>)}
                        </select>
                        <div className="relative">
                            <input type="number" step="0.01" value={rlForm.valorTotal} onChange={e => setRlForm({ ...rlForm, valorTotal: e.target.value })}
                                disabled={!!rlForm.medicaoId}
                                placeholder="Valor Total do Serviço *" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm disabled:bg-slate-50 font-bold" />
                            {rlForm.medicaoId && <div className="absolute right-3 top-3 text-blue-500" title="Valor travado pela Medição"><Shield className="w-4 h-4" /></div>}
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase">Split RL / NFS-e (%)</label>
                            <div className="flex items-center gap-3">
                                <input type="range" min="50" max="100" step="5" value={rlForm.percentualRL}
                                    onChange={e => setRlForm({ ...rlForm, percentualRL: e.target.value })}
                                    className="flex-1 accent-blue-600" />
                                <span className="text-sm font-black text-slate-700 min-w-[70px] text-right">
                                    {rlForm.percentualRL}% / {100 - Number(rlForm.percentualRL)}%
                                </span>
                            </div>
                        </div>
                        {rlForm.valorTotal && (
                            <div className="bg-slate-50 rounded-lg p-3 text-xs space-y-1">
                                <p>📋 <strong>RL ({rlForm.percentualRL}%):</strong> {fmt(Number(rlForm.valorTotal) * Number(rlForm.percentualRL) / 100)}</p>
                                <p>📋 <strong>NFS-e ({100 - Number(rlForm.percentualRL)}%):</strong> {fmt(Number(rlForm.valorTotal) * (100 - Number(rlForm.percentualRL)) / 100)} <span className="text-slate-400">(INSS 3.5%: {fmt(Number(rlForm.valorTotal) * (100 - Number(rlForm.percentualRL)) / 100 * 0.035)})</span></p>
                            </div>
                        )}
                        <select value={rlForm.centroCusto} onChange={e => setRlForm({ ...rlForm, centroCusto: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm">
                            <option value="">Centro de Custo</option>
                            {CENTROS_CUSTO.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                        </select>
                        <input value={rlForm.pedidoCompras} onChange={e => setRlForm({ ...rlForm, pedidoCompras: e.target.value })}
                            placeholder="Pedido de Compras" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                        <input type="date" value={rlForm.dataVencimento} onChange={e => setRlForm({ ...rlForm, dataVencimento: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                        <button onClick={() => handleGerarRL()} disabled={!rlForm.clienteId || !rlForm.valorTotal}
                            className="w-full bg-emerald-600 text-white py-2.5 rounded-xl font-bold text-sm disabled:opacity-50">
                            Confirmar Faturamento
                        </button>
                    </div>
                </div>
            )}

            {/* Action Modal (Cancelar / CC-e) */}
            {actionModal.type && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className={`text-lg font-bold ${actionModal.type === 'cancelar' ? 'text-red-600' : 'text-amber-600'}`}>
                                {actionModal.type === 'cancelar' ? 'Cancelar Nota Fiscal' : 'Carta de Correção (CC-e)'}
                            </h2>
                            <button onClick={() => setActionModal({ type: null, id: '', text: '' })}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <p className="text-xs text-slate-500">
                            {actionModal.type === 'cancelar' 
                                ? 'Informe o motivo do cancelamento da nota. Esta ação não poderá ser desfeita.'
                                : 'Descreva a correção a ser aplicada na nota.'}
                        </p>
                        <textarea 
                            value={actionModal.text} 
                            onChange={e => setActionModal({ ...actionModal, text: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg p-3 text-sm min-h-[100px]"
                            placeholder={actionModal.type === 'cancelar' ? "Justificativa de cancelamento..." : "Texto da correção..."}
                        />
                        <button 
                            onClick={handleActionSubmit} 
                            disabled={actionModal.text.length < 5}
                            className={`w-full text-white py-2.5 rounded-xl font-bold text-sm disabled:opacity-50 ${actionModal.type === 'cancelar' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'}`}>
                            {actionModal.type === 'cancelar' ? 'Confirmar Cancelamento' : 'Emitir CC-e'}
                        </button>
                    </div>
                </div>
            )}

            {/* Modal de Edição de Faturamento (5 abas CTE / 2 abas NF) */}
            {editFaturamento && (
                <ModalEdicaoFaturamento
                    faturamento={editFaturamento}
                    onClose={() => setEditFaturamento(null)}
                    onSave={handleEditSave}
                    onEmitir={handleEditEmitir}
                />
            )}
        </div>
    );
}
