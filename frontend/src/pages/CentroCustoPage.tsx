import { useEffect, useState } from 'react';
import api from '../services/api';
import { Loader2, Plus, X, Wallet, ArrowDownRight, ArrowUpRight, AlertCircle } from 'lucide-react';

export default function CentroCustoPage() {
    const [centros, setCentros] = useState<any[]>([]);
    const [planoContas, setPlanoContas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [showLanc, setShowLanc] = useState(false);
    const [form, setForm] = useState({ nome: '', codigo: '', tipo: 'EQUIPAMENTO', equipamentoTipo: '', orcamentoMensal: '' });
    const [lancForm, setLancForm] = useState({ centroCustoId: '', descricao: '', valor: '', tipo: 'DESPESA', planoContasId: '', data: '' });

    const fetchAll = () => {
        Promise.all([
            api.get('/centros-custo'),
            api.get('/plano-contas/flat')
        ]).then(([rCentros, rPlano]) => { 
            setCentros(rCentros.data); 
            setPlanoContas(rPlano.data.filter((x: any) => x.tipo === 'ANALITICA'));
            setLoading(false); 
        }).catch(() => setLoading(false));
    };
    useEffect(() => { fetchAll(); }, []);

    const handleCreate = async () => {
        await api.post('/centros-custo', form);
        setShowForm(false);
        setForm({ nome: '', codigo: '', tipo: 'EQUIPAMENTO', equipamentoTipo: '', orcamentoMensal: '' });
        fetchAll();
    };

    const handleLancamento = async () => {
        await api.post('/centros-custo/lancamentos', lancForm);
        setShowLanc(false);
        setLancForm({ centroCustoId: '', descricao: '', valor: '', tipo: 'DESPESA', planoContasId: '', data: '' });
        fetchAll();
    };

    const fmt = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

    const totalGasto = centros.reduce((s, c) => s + (c.totalGasto || 0), 0);
    const totalReceita = centros.reduce((s, c) => s + (c.totalReceita || 0), 0);

    return (
        <div className="h-full flex flex-col space-y-4 overflow-hidden">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Centro de Custo</h1>
                    <p className="text-sm text-slate-500">Controle por tipo de equipamento / departamento</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowLanc(true)} className="bg-emerald-600 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5" /> Lançamento
                    </button>
                    <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5" /> Novo Centro
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 text-white">
                    <p className="text-[10px] font-black uppercase opacity-70 flex items-center gap-1"><ArrowDownRight className="w-3 h-3" /> Total Despesas</p>
                    <p className="text-2xl font-black">{fmt(totalGasto)}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white">
                    <p className="text-[10px] font-black uppercase opacity-70 flex items-center gap-1"><ArrowUpRight className="w-3 h-3" /> Total Receitas</p>
                    <p className="text-2xl font-black">{fmt(totalReceita)}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
                    <p className="text-[10px] font-black uppercase opacity-70"><Wallet className="w-3 h-3 inline" /> Resultado</p>
                    <p className="text-2xl font-black">{fmt(totalReceita - totalGasto)}</p>
                </div>
            </div>

            {/* Cards */}
            <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-3 content-start">
                {centros.length === 0 ? (
                    <div className="col-span-2 py-20 text-center space-y-3">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                            <Wallet className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-slate-500 text-sm font-medium">Nenhum Centro de Custo cadastrado.</p>
                        <p className="text-slate-400 text-xs">Crie um centro de custo (ex: Unidade, Caminhão) antes de realizar lançamentos.</p>
                    </div>
                ) : centros.map(cc => (
                    <div key={cc.id} className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-bold text-slate-800">{cc.nome}</p>
                                <p className="text-[10px] text-slate-400">{cc.codigo || '—'} • {cc.tipo} {cc.equipamentoTipo ? `(${cc.equipamentoTipo})` : ''}</p>
                            </div>
                            {cc.percentualOrcamento !== null && (
                                <div className={`text-[10px] font-black px-2 py-1 rounded ${cc.percentualOrcamento > 100 ? 'bg-red-100 text-red-600' : cc.percentualOrcamento > 80 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                    {cc.percentualOrcamento}%
                                </div>
                            )}
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                            <div><p className="text-[10px] text-slate-400">Gasto</p><p className="text-xs font-bold text-red-600">{fmt(cc.totalGasto)}</p></div>
                            <div><p className="text-[10px] text-slate-400">Receita</p><p className="text-xs font-bold text-emerald-600">{fmt(cc.totalReceita)}</p></div>
                            <div><p className="text-[10px] text-slate-400">Saldo</p><p className={`text-xs font-bold ${cc.saldo >= 0 ? 'text-slate-700' : 'text-red-600'}`}>{fmt(cc.saldo)}</p></div>
                        </div>
                        {cc.orcamentoMensal && (
                            <div className="mt-2">
                                <div className="w-full bg-slate-100 rounded-full h-1.5">
                                    <div className={`h-1.5 rounded-full ${cc.percentualOrcamento > 100 ? 'bg-red-500' : 'bg-blue-500'}`}
                                        style={{ width: `${Math.min(cc.percentualOrcamento || 0, 100)}%` }} />
                                </div>
                                <p className="text-[9px] text-slate-400 mt-0.5">Orçamento: {fmt(Number(cc.orcamentoMensal))}</p>
                            </div>
                        )}
                        {cc.lancamentos?.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
                                {cc.lancamentos.slice(0, 3).map((l: any) => (
                                    <div key={l.id} className="flex justify-between text-[10px]">
                                        <span className="text-slate-500 truncate flex-1">{l.descricao}</span>
                                        <span className={`font-bold ${l.tipo === 'DESPESA' ? 'text-red-500' : 'text-emerald-500'}`}>{l.tipo === 'DESPESA' ? '-' : '+'}{fmt(Number(l.valor))}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Form - Novo Centro */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800">Novo Centro de Custo</h2>
                            <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })}
                            placeholder="Nome *" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                        <div className="grid grid-cols-2 gap-3">
                            <input value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })}
                                placeholder="Código" className="border border-slate-200 rounded-lg p-2.5 text-sm" />
                            <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}
                                className="border border-slate-200 rounded-lg p-2.5 text-sm">
                                <option value="EQUIPAMENTO">Equipamento</option>
                                <option value="DEPARTAMENTO">Departamento</option>
                                <option value="PROJETO">Projeto</option>
                                <option value="VIAGEM">Viagem</option>
                            </select>
                        </div>
                        <input value={form.equipamentoTipo} onChange={e => setForm({ ...form, equipamentoTipo: e.target.value })}
                            placeholder="Tipo de Equipamento (ex: Escavadeira, CaminhãoPlaca)" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                        <input type="number" step="0.01" value={form.orcamentoMensal} onChange={e => setForm({ ...form, orcamentoMensal: e.target.value })}
                            placeholder="Orçamento Mensal (R$)" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                        <button onClick={handleCreate} disabled={!form.nome}
                            className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-bold text-sm disabled:opacity-50">Criar Centro</button>
                    </div>
                </div>
            )}

            {/* Form - Novo Lançamento */}
            {showLanc && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800">Novo Lançamento</h2>
                            <button onClick={() => setShowLanc(false)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        
                        {centros.length === 0 ? (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                                <p className="text-sm font-bold text-amber-800">Atenção!</p>
                                <p className="text-xs text-amber-700 mt-1">Você precisa cadastrar pelo menos um **Centro de Custo** antes de realizar lançamentos.</p>
                                <button onClick={() => { setShowLanc(false); setShowForm(true); }} className="mt-3 text-xs font-bold text-amber-900 underline">Criar agora</button>
                            </div>
                        ) : (
                            <>
                                <select value={lancForm.centroCustoId} onChange={e => setLancForm({ ...lancForm, centroCustoId: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm">
                                    <option value="">Selecione o Centro de Custo *</option>
                                    {centros.map(cc => <option key={cc.id} value={cc.id}>{cc.nome}</option>)}
                                </select>
                                <input value={lancForm.descricao} onChange={e => setLancForm({ ...lancForm, descricao: e.target.value })}
                                    placeholder="Descrição *" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                                <div className="grid grid-cols-3 gap-3">
                                    <input type="number" step="0.01" value={lancForm.valor} onChange={e => setLancForm({ ...lancForm, valor: e.target.value })}
                                        placeholder="Valor *" className="border border-slate-200 rounded-lg p-2.5 text-sm" />
                                    <select value={lancForm.tipo} onChange={e => setLancForm({ ...lancForm, tipo: e.target.value })}
                                        className="border border-slate-200 rounded-lg p-2.5 text-sm">
                                        <option value="DESPESA">Despesa</option>
                                        <option value="RECEITA">Receita</option>
                                    </select>
                                    <input type="date" value={lancForm.data} onChange={e => setLancForm({ ...lancForm, data: e.target.value })}
                                        className="border border-slate-200 rounded-lg p-2.5 text-sm" />
                                </div>
                                <select value={lancForm.planoContasId} onChange={e => setLancForm({ ...lancForm, planoContasId: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm">
                                    <option value="">Categoria DRE (Plano de Contas)</option>
                                    {planoContas.map(pc => <option key={pc.id} value={pc.id}>{pc.codigo} - {pc.descricao}</option>)}
                                </select>
                                <button onClick={handleLancamento} disabled={!lancForm.centroCustoId || !lancForm.descricao || !lancForm.valor}
                                    className="w-full bg-emerald-600 text-white py-2.5 rounded-xl font-bold text-sm disabled:opacity-50">Registrar Lançamento</button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
