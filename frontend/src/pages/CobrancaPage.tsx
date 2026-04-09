import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import {
    Loader2, X, DollarSign, AlertTriangle, TrendingUp,
    Search, Clock, Phone, MessageCircle,
    FileText, Handshake, BarChart3
} from 'lucide-react';

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    PENDENTE: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Em dia' },
    PARCIAL: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Parcial' },
    VENCIDO: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', label: 'Vencido' },
    EM_NEGOCIACAO: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Negociando' },
    RECEBIDO: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400', label: 'Recebido' },
    CANCELADO: { bg: 'bg-slate-100', text: 'text-slate-400', dot: 'bg-slate-300', label: 'Cancelado' },
};

const TIPO_COBRANCA = [
    { key: 'WHATSAPP', label: 'WhatsApp', icon: MessageCircle },
    { key: 'LIGACAO', label: 'Ligação', icon: Phone },
    { key: 'EMAIL', label: 'E-mail', icon: FileText },
    { key: 'MANUAL', label: 'Anotação', icon: FileText },
];

export default function CobrancaPage() {
    const [kpis, setKpis] = useState<any>(null);
    const [contas, setContas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    // Modals
    const [showCobranca, setShowCobranca] = useState<any>(null);
    const [showNegociacao, setShowNegociacao] = useState<any>(null);
    const [showHistorico, setShowHistorico] = useState<any>(null);
    const [showReceber, setShowReceber] = useState<any>(null);
    const [historico, setHistorico] = useState<any[]>([]);

    // Forms
    const [cobrancaForm, setCobrancaForm] = useState({
        tipo: 'WHATSAPP', mensagem: '', destinatario: '',
        promessaPagamento: false, dataPromessa: '', valorPromessa: ''
    });
    const [negForm, setNegForm] = useState({
        valorNegociado: '', qtdParcelas: '1', jurosMensalNegociado: '0',
        descontoAplicado: '', observacoes: ''
    });
    const [receberForm, setReceberForm] = useState({
        valorRecebido: '', formaPagamento: 'PIX', valorDesconto: ''
    });

    const fetchAll = useCallback(async () => {
        try {
            const params: any = {};
            if (filterStatus) params.status = filterStatus;

            const [k, c] = await Promise.all([
                api.get('/cobranca/kpis'),
                api.get('/cobranca/contas-receber', { params }),
            ]);
            setKpis(k.data);
            setContas(c.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [filterStatus]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const fmt = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

    const openHistorico = async (conta: any) => {
        try {
            const res = await api.get(`/cobranca/cobrancas/${conta.id}`);
            setHistorico(res.data);
            setShowHistorico(conta);
        } catch (err) { console.error(err); }
    };

    const handleCobranca = async () => {
        if (!showCobranca) return;
        try {
            await api.post('/cobranca/cobrancas', {
                contaReceberId: showCobranca.id,
                ...cobrancaForm,
                valorPromessa: cobrancaForm.valorPromessa ? Number(cobrancaForm.valorPromessa) : undefined,
            });
            setShowCobranca(null);
            setCobrancaForm({ tipo: 'WHATSAPP', mensagem: '', destinatario: '', promessaPagamento: false, dataPromessa: '', valorPromessa: '' });
            fetchAll();
        } catch (err) { console.error(err); }
    };

    const handleNegociacao = async () => {
        if (!showNegociacao) return;
        try {
            await api.post('/cobranca/negociacoes', {
                contaReceberId: showNegociacao.id,
                valorNegociado: Number(negForm.valorNegociado),
                qtdParcelas: Number(negForm.qtdParcelas),
                jurosMensalNegociado: Number(negForm.jurosMensalNegociado),
                descontoAplicado: Number(negForm.descontoAplicado),
                observacoes: negForm.observacoes,
            });
            setShowNegociacao(null);
            setNegForm({ valorNegociado: '', qtdParcelas: '1', jurosMensalNegociado: '0', descontoAplicado: '', observacoes: '' });
            fetchAll();
        } catch (err) { console.error(err); }
    };

    const handleReceber = async () => {
        if (!showReceber) return;
        try {
            await api.patch(`/cobranca/contas-receber/${showReceber.id}/receber`, receberForm);
            setShowReceber(null);
            setReceberForm({ valorRecebido: '', formaPagamento: 'PIX', valorDesconto: '' });
            fetchAll();
        } catch (err) { console.error(err); }
    };

    const openNegociacao = (conta: any) => {
        const saldo = Number(conta.saldoDevedor || conta.valorOriginal);
        setNegForm({ ...negForm, valorNegociado: String(saldo.toFixed(2)) });
        setShowNegociacao(conta);
    };

    const openReceber = (conta: any) => {
        const saldo = Number(conta.saldoDevedor || conta.valorOriginal);
        setReceberForm({ ...receberForm, valorRecebido: String(saldo.toFixed(2)) });
        setShowReceber(conta);
    };

    const filtered = contas.filter(c => {
        if (!search) return true;
        const s = search.toLowerCase();
        return c.descricao?.toLowerCase().includes(s) || c.cliente?.nome?.toLowerCase().includes(s);
    });

    // Agrupação por status (kanban)
    const grupos = {
        emDia: filtered.filter(c => c.status === 'PENDENTE' && !c.diasAtraso),
        vencidos: filtered.filter(c => c.diasAtraso > 0 && c.status !== 'EM_NEGOCIACAO' && c.status !== 'RECEBIDO'),
        negociando: filtered.filter(c => c.status === 'EM_NEGOCIACAO'),
        recebidos: filtered.filter(c => c.status === 'RECEBIDO'),
    };

    if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

    return (
        <div className="h-full flex flex-col space-y-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Cobrança de Débitos</h1>
                    <p className="text-sm text-slate-500">Régua de cobrança • Negociações • Inadimplência</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente..."
                            className="border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs w-52" />
                    </div>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs">
                        <option value="">Todos</option>
                        <option value="PENDENTE">Em dia</option>
                        <option value="VENCIDO">Vencidos</option>
                        <option value="EM_NEGOCIACAO">Em negociação</option>
                        <option value="RECEBIDO">Recebidos</option>
                    </select>
                </div>
            </div>

            {/* KPIs */}
            {kpis && (
                <div className="grid grid-cols-6 gap-3">
                    <div className="bg-white rounded-xl border border-slate-200 p-3">
                        <div className="flex items-center gap-1.5 mb-1"><DollarSign className="w-3.5 h-3.5 text-amber-500" /><p className="text-[9px] font-black text-slate-400 uppercase">Pendente</p></div>
                        <p className="text-lg font-black text-amber-600">{fmt(kpis.totalPendente)}</p>
                        <p className="text-[10px] text-slate-400">{kpis.qtdPendentes} títulos</p>
                    </div>
                    <div className="bg-white rounded-xl border border-red-100 p-3">
                        <div className="flex items-center gap-1.5 mb-1"><AlertTriangle className="w-3.5 h-3.5 text-red-500" /><p className="text-[9px] font-black text-slate-400 uppercase">Vencido</p></div>
                        <p className="text-lg font-black text-red-600">{fmt(kpis.totalVencido)}</p>
                        <p className="text-[10px] text-red-400">{kpis.qtdVencidos} títulos</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-3">
                        <div className="flex items-center gap-1.5 mb-1"><Handshake className="w-3.5 h-3.5 text-blue-500" /><p className="text-[9px] font-black text-slate-400 uppercase">Negociando</p></div>
                        <p className="text-lg font-black text-blue-600">{fmt(kpis.totalEmNegociacao)}</p>
                        <p className="text-[10px] text-blue-400">{kpis.qtdEmNegociacao} acordos</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-3">
                        <div className="flex items-center gap-1.5 mb-1"><BarChart3 className="w-3.5 h-3.5 text-slate-500" /><p className="text-[9px] font-black text-slate-400 uppercase">Inadimplência</p></div>
                        <p className="text-lg font-black text-slate-800">{kpis.indiceInadimplencia}%</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-3">
                        <div className="flex items-center gap-1.5 mb-1"><Clock className="w-3.5 h-3.5 text-slate-500" /><p className="text-[9px] font-black text-slate-400 uppercase">Recebimento</p></div>
                        <p className="text-lg font-black text-slate-800">{kpis.tempoMedioRecebimento}d</p>
                        <p className="text-[10px] text-slate-400">tempo médio</p>
                    </div>
                    <div className="bg-white rounded-xl border border-emerald-100 p-3">
                        <div className="flex items-center gap-1.5 mb-1"><TrendingUp className="w-3.5 h-3.5 text-emerald-500" /><p className="text-[9px] font-black text-slate-400 uppercase">Recuperação</p></div>
                        <p className="text-lg font-black text-emerald-600">{kpis.taxaRecuperacao}%</p>
                    </div>
                </div>
            )}

            {/* Aging Bar */}
            {kpis?.aging && kpis.totalVencido > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Aging de Recebíveis</p>
                    <div className="flex gap-1 h-3 rounded-full overflow-hidden">
                        {kpis.aging.ate30 > 0 && <div style={{ width: `${(kpis.aging.ate30 / kpis.totalVencido) * 100}%` }} className="bg-amber-400 rounded" title={`Até 30d: ${fmt(kpis.aging.ate30)}`}></div>}
                        {kpis.aging.de31a60 > 0 && <div style={{ width: `${(kpis.aging.de31a60 / kpis.totalVencido) * 100}%` }} className="bg-orange-500 rounded" title={`31-60d: ${fmt(kpis.aging.de31a60)}`}></div>}
                        {kpis.aging.de61a90 > 0 && <div style={{ width: `${(kpis.aging.de61a90 / kpis.totalVencido) * 100}%` }} className="bg-red-500 rounded" title={`61-90d: ${fmt(kpis.aging.de61a90)}`}></div>}
                        {kpis.aging.mais90 > 0 && <div style={{ width: `${(kpis.aging.mais90 / kpis.totalVencido) * 100}%` }} className="bg-red-800 rounded" title={`+90d: ${fmt(kpis.aging.mais90)}`}></div>}
                    </div>
                    <div className="flex gap-4 mt-1.5 text-[9px] text-slate-500">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-400"></span>Até 30d: {fmt(kpis.aging.ate30)}</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-orange-500"></span>31-60d: {fmt(kpis.aging.de31a60)}</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-500"></span>61-90d: {fmt(kpis.aging.de61a90)}</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-800"></span>+90d: {fmt(kpis.aging.mais90)}</span>
                    </div>
                </div>
            )}

            {/* Kanban View */}
            <div className="flex-1 overflow-hidden">
                <div className="flex gap-3 h-full overflow-x-auto pb-2">
                    {/* Em dia */}
                    <div className="flex-1 min-w-[260px] bg-slate-50 rounded-xl p-3 flex flex-col">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <p className="text-xs font-black text-slate-600">Em Dia ({grupos.emDia.length})</p>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2">
                            {grupos.emDia.map((c: any) => (
                                <ContaCard key={c.id} conta={c} fmt={fmt} fmtDate={fmtDate}
                                    onCobrar={() => { setCobrancaForm({ ...cobrancaForm, destinatario: c.cliente?.telefone || '' }); setShowCobranca(c); }}
                                    onReceber={() => openReceber(c)}
                                    onHistorico={() => openHistorico(c)} />
                            ))}
                        </div>
                    </div>

                    {/* Vencidos */}
                    <div className="flex-1 min-w-[260px] bg-red-50/50 rounded-xl p-3 flex flex-col">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            <p className="text-xs font-black text-red-600">Vencidos ({grupos.vencidos.length})</p>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2">
                            {grupos.vencidos.map((c: any) => (
                                <ContaCard key={c.id} conta={c} fmt={fmt} fmtDate={fmtDate} isVencido
                                    onCobrar={() => { setCobrancaForm({ ...cobrancaForm, destinatario: c.cliente?.telefone || '' }); setShowCobranca(c); }}
                                    onNegociar={() => openNegociacao(c)}
                                    onReceber={() => openReceber(c)}
                                    onHistorico={() => openHistorico(c)} />
                            ))}
                        </div>
                    </div>

                    {/* Em Negociação */}
                    <div className="flex-1 min-w-[260px] bg-amber-50/50 rounded-xl p-3 flex flex-col">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            <p className="text-xs font-black text-amber-600">Em Negociação ({grupos.negociando.length})</p>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2">
                            {grupos.negociando.map((c: any) => (
                                <ContaCard key={c.id} conta={c} fmt={fmt} fmtDate={fmtDate}
                                    onHistorico={() => openHistorico(c)} />
                            ))}
                        </div>
                    </div>

                    {/* Recebidos */}
                    <div className="flex-1 min-w-[260px] bg-slate-50 rounded-xl p-3 flex flex-col">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                            <p className="text-xs font-black text-slate-500">Recebidos ({grupos.recebidos.length})</p>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2">
                            {grupos.recebidos.slice(0, 20).map((c: any) => (
                                <ContaCard key={c.id} conta={c} fmt={fmt} fmtDate={fmtDate} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── MODAL: Registrar Cobrança ────────────────────────── */}
            {showCobranca && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800">Registrar Cobrança</h2>
                            <button onClick={() => setShowCobranca(null)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3 text-xs">
                            <p className="font-bold text-slate-700">{showCobranca.descricao}</p>
                            <p className="text-slate-500">Cliente: {showCobranca.cliente?.nome || '—'}</p>
                            <p className="font-bold text-red-600 mt-1">Saldo: {fmt(Number(showCobranca.saldoDevedor || showCobranca.valorOriginal))}</p>
                        </div>
                        <div className="flex gap-2">
                            {TIPO_COBRANCA.map(t => (
                                <button key={t.key} onClick={() => setCobrancaForm({ ...cobrancaForm, tipo: t.key })}
                                    className={`flex-1 p-2 rounded-lg text-[10px] font-bold text-center border ${cobrancaForm.tipo === t.key ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-slate-200 text-slate-500'}`}>
                                    <t.icon className="w-4 h-4 mx-auto mb-0.5" />{t.label}
                                </button>
                            ))}
                        </div>
                        <input value={cobrancaForm.destinatario} onChange={e => setCobrancaForm({ ...cobrancaForm, destinatario: e.target.value })}
                            placeholder="Telefone / E-mail" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                        <textarea value={cobrancaForm.mensagem} onChange={e => setCobrancaForm({ ...cobrancaForm, mensagem: e.target.value })}
                            placeholder="Mensagem da cobrança..." className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" rows={3} />

                        <label className="flex items-center gap-2 text-xs text-slate-600">
                            <input type="checkbox" checked={cobrancaForm.promessaPagamento}
                                onChange={e => setCobrancaForm({ ...cobrancaForm, promessaPagamento: e.target.checked })}
                                className="rounded border-slate-300" />
                            Promessa de pagamento
                        </label>
                        {cobrancaForm.promessaPagamento && (
                            <div className="grid grid-cols-2 gap-3">
                                <input type="date" value={cobrancaForm.dataPromessa} onChange={e => setCobrancaForm({ ...cobrancaForm, dataPromessa: e.target.value })}
                                    className="border border-slate-200 rounded-lg p-2.5 text-sm" />
                                <input type="number" value={cobrancaForm.valorPromessa} onChange={e => setCobrancaForm({ ...cobrancaForm, valorPromessa: e.target.value })}
                                    placeholder="Valor prometido" className="border border-slate-200 rounded-lg p-2.5 text-sm" />
                            </div>
                        )}
                        <button onClick={handleCobranca} disabled={!cobrancaForm.mensagem}
                            className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-bold text-sm disabled:opacity-50">
                            Registrar Cobrança
                        </button>
                    </div>
                </div>
            )}

            {/* ─── MODAL: Negociação ────────────────────────────────── */}
            {showNegociacao && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-amber-700">Nova Negociação</h2>
                            <button onClick={() => setShowNegociacao(null)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <div className="bg-red-50 rounded-lg p-3 text-xs">
                            <p className="font-bold text-slate-700">{showNegociacao.descricao}</p>
                            <p className="text-slate-500">Dívida: {fmt(Number(showNegociacao.saldoDevedor || showNegociacao.valorOriginal))}</p>
                            {showNegociacao.diasAtraso > 0 && (
                                <p className="text-red-600 font-bold mt-1">{showNegociacao.diasAtraso} dias em atraso — Juros: {fmt(showNegociacao.jurosCalculado)} + Multa: {fmt(showNegociacao.multaCalculada)}</p>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase">Valor Negociado *</label>
                                <input type="number" step="0.01" value={negForm.valorNegociado} onChange={e => setNegForm({ ...negForm, valorNegociado: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm mt-1" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase">Desconto</label>
                                <input type="number" step="0.01" value={negForm.descontoAplicado} onChange={e => setNegForm({ ...negForm, descontoAplicado: e.target.value })}
                                    placeholder="0" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm mt-1" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase">Parcelas</label>
                                <input type="number" min="1" max="60" value={negForm.qtdParcelas} onChange={e => setNegForm({ ...negForm, qtdParcelas: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm mt-1" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase">Juros Mensal (%)</label>
                                <input type="number" step="0.1" value={negForm.jurosMensalNegociado} onChange={e => setNegForm({ ...negForm, jurosMensalNegociado: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm mt-1" />
                            </div>
                        </div>
                        {/* Preview parcelas */}
                        {negForm.valorNegociado && Number(negForm.qtdParcelas) > 0 && (
                            <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
                                📋 {negForm.qtdParcelas}x de {fmt(Number(negForm.valorNegociado) / Number(negForm.qtdParcelas))}
                                {Number(negForm.jurosMensalNegociado) > 0 && ` (+${negForm.jurosMensalNegociado}% a.m.)`}
                            </div>
                        )}
                        <textarea value={negForm.observacoes} onChange={e => setNegForm({ ...negForm, observacoes: e.target.value })}
                            placeholder="Observações da negociação..." className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" rows={2} />
                        <button onClick={handleNegociacao} disabled={!negForm.valorNegociado}
                            className="w-full bg-amber-600 text-white py-2.5 rounded-xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                            <Handshake className="w-4 h-4" /> Criar Acordo
                        </button>
                    </div>
                </div>
            )}

            {/* ─── MODAL: Receber ───────────────────────────────────── */}
            {showReceber && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-emerald-700">Registrar Recebimento</h2>
                            <button onClick={() => setShowReceber(null)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3 text-xs">
                            <p className="font-bold text-slate-700">{showReceber.descricao}</p>
                            <p className="text-slate-500">Saldo: {fmt(Number(showReceber.saldoDevedor || showReceber.valorOriginal))}</p>
                        </div>
                        <input type="number" step="0.01" value={receberForm.valorRecebido} onChange={e => setReceberForm({ ...receberForm, valorRecebido: e.target.value })}
                            placeholder="Valor recebido *" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                        <select value={receberForm.formaPagamento} onChange={e => setReceberForm({ ...receberForm, formaPagamento: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm">
                            <option value="PIX">PIX</option>
                            <option value="BOLETO">Boleto</option>
                            <option value="TRANSFERENCIA">Transferência</option>
                            <option value="CARTAO">Cartão</option>
                            <option value="DINHEIRO">Dinheiro</option>
                        </select>
                        <button onClick={handleReceber} disabled={!receberForm.valorRecebido}
                            className="w-full bg-emerald-600 text-white py-2.5 rounded-xl font-bold text-sm disabled:opacity-50">
                            Confirmar Recebimento
                        </button>
                    </div>
                </div>
            )}

            {/* ─── MODAL: Histórico ─────────────────────────────────── */}
            {showHistorico && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-3 max-h-[80vh] overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800">Histórico de Cobrança</h2>
                            <button onClick={() => setShowHistorico(null)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3 text-xs">
                            <p className="font-bold text-slate-700">{showHistorico.descricao}</p>
                            <p className="text-slate-500">Cliente: {showHistorico.cliente?.nome} • Total cobranças: {showHistorico.totalCobrancas || 0}</p>
                        </div>
                        {historico.length === 0 ? (
                            <p className="text-center text-slate-400 text-sm py-8">Nenhuma cobrança registrada</p>
                        ) : (
                            <div className="space-y-3">
                                {historico.map((h: any) => (
                                    <div key={h.id} className="flex gap-3 items-start">
                                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            {h.tipo === 'WHATSAPP' && <MessageCircle className="w-4 h-4 text-emerald-600" />}
                                            {h.tipo === 'LIGACAO' && <Phone className="w-4 h-4 text-blue-600" />}
                                            {h.tipo === 'EMAIL' && <FileText className="w-4 h-4 text-amber-600" />}
                                            {(h.tipo === 'MANUAL' || h.tipo === 'SISTEMA') && <FileText className="w-4 h-4 text-slate-500" />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="text-[10px] font-black text-slate-400 uppercase">{h.tipo}</p>
                                                <p className="text-[10px] text-slate-300">{fmtDate(h.enviadoEm)}</p>
                                                {h.enviadoPor && <p className="text-[10px] text-slate-400">por {h.enviadoPor}</p>}
                                            </div>
                                            <p className="text-xs text-slate-600 mt-0.5">{h.mensagem}</p>
                                            {h.promessaPagamento && (
                                                <div className="mt-1 bg-emerald-50 rounded px-2 py-1 text-[10px] text-emerald-700 font-bold">
                                                    💰 Promessa: {fmt(Number(h.valorPromessa))} até {fmtDate(h.dataPromessa)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Card Component ─────────────────────────────────────────────
function ContaCard({ conta, fmt, fmtDate, isVencido, onCobrar, onNegociar, onReceber, onHistorico }: {
    conta: any; fmt: (v: number) => string; fmtDate: (d: string) => string;
    isVencido?: boolean; onCobrar?: () => void; onNegociar?: () => void;
    onReceber?: () => void; onHistorico?: () => void;
}) {
    const sc = STATUS_COLORS[conta.status] || STATUS_COLORS.PENDENTE;
    return (
        <div className={`bg-white rounded-lg border p-3 space-y-1.5 ${isVencido ? 'border-red-200' : 'border-slate-200'}`}>
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-700 truncate">{conta.descricao}</p>
                    <p className="text-[10px] text-slate-400 truncate">{conta.cliente?.nome || '—'}</p>
                </div>
                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${sc.bg} ${sc.text} flex-shrink-0`}>
                    {sc.label}
                </span>
            </div>
            <div className="flex justify-between text-[10px]">
                <span className="text-slate-400">{fmtDate(conta.dataVencimento)}</span>
                <span className="font-bold text-slate-700">{fmt(Number(conta.saldoDevedor || conta.valorOriginal))}</span>
            </div>
            {conta.diasAtraso > 0 && (
                <div className="flex items-center gap-1 text-[9px] text-red-600 font-bold">
                    <AlertTriangle className="w-3 h-3" /> {conta.diasAtraso} dias em atraso
                </div>
            )}
            {conta.totalCobrancas > 0 && (
                <p className="text-[9px] text-slate-400">{conta.totalCobrancas} cobrança(s) registrada(s)</p>
            )}
            <div className="flex gap-1.5 pt-1">
                {onCobrar && <button onClick={onCobrar} className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded hover:bg-blue-100">Cobrar</button>}
                {onNegociar && <button onClick={onNegociar} className="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded hover:bg-amber-100">Negociar</button>}
                {onReceber && <button onClick={onReceber} className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded hover:bg-emerald-100">Receber</button>}
                {onHistorico && <button onClick={onHistorico} className="text-[9px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded hover:bg-slate-100">Histórico</button>}
            </div>
        </div>
    );
}
