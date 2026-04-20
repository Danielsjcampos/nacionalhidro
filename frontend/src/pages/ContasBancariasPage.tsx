import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import {
    Loader2, Plus, X, Building2, Wallet, DollarSign,
    TrendingUp, TrendingDown, Edit3
} from 'lucide-react';

const TIPOS = [
    { key: 'CORRENTE', label: 'Conta Corrente' },
    { key: 'POUPANCA', label: 'Poupança' },
    { key: 'CAIXINHA', label: 'Caixinha' },
];

const EMPRESAS = [
    { key: 'HIDRO', label: 'Nacional Hidrosaneamento' },
    { key: 'LOCACAO', label: 'Nacional Locação' },
    { key: 'AMBAS', label: 'Ambas Empresas' },
];

export default function ContasBancariasPage() {
    const [contas, setContas] = useState<any[]>([]);
    const [saldos, setSaldos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState('');
    const [form, setForm] = useState({
        nome: '', banco: '', agencia: '', conta: '',
        tipo: 'CORRENTE', saldoInicial: '', empresa: 'AMBAS',
    });

    const fmt = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [c, s] = await Promise.all([
                api.get('/contas-bancarias'),
                api.get('/contas-bancarias/saldos'),
            ]);
            setContas(c.data);
            setSaldos(s.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSave = async () => {
        try {
            if (editId) {
                await api.patch(`/contas-bancarias/${editId}`, form);
            } else {
                await api.post('/contas-bancarias', form);
            }
            setShowForm(false);
            setEditId('');
            setForm({ nome: '', banco: '', agencia: '', conta: '', tipo: 'CORRENTE', saldoInicial: '', empresa: 'AMBAS' });
            fetchData();
        } catch (err) { console.error(err); }
    };

    const handleEdit = (conta: any) => {
        setEditId(conta.id);
        setForm({
            nome: conta.nome || '',
            banco: conta.banco || '',
            agencia: conta.agencia || '',
            conta: conta.conta || '',
            tipo: conta.tipo || 'CORRENTE',
            saldoInicial: String(Number(conta.saldoInicial || 0)),
            empresa: conta.empresa || 'AMBAS',
        });
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Desativar esta conta bancária?')) return;
        await api.delete(`/contas-bancarias/${id}`);
        fetchData();
    };

    // Get saldo for a specific conta
    const getSaldo = (id: string) => saldos.find((s: any) => s.id === id);

    // Totais
    const totalSaldo = saldos.reduce((s: number, c: any) => s + (c.saldoAtual || 0), 0);
    const totalRecebido = saldos.reduce((s: number, c: any) => s + (c.totalRecebido || 0), 0);
    const totalPago = saldos.reduce((s: number, c: any) => s + (c.totalPago || 0), 0);

    if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

    return (
        <div className="h-full flex flex-col space-y-4 overflow-hidden">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Contas Bancárias</h1>
                    <p className="text-sm text-slate-500">Gerencie suas contas correntes, poupanças e caixinhas</p>
                </div>
                <button onClick={() => { setEditId(''); setForm({ nome: '', banco: '', agencia: '', conta: '', tipo: 'CORRENTE', saldoInicial: '', empresa: 'AMBAS' }); setShowForm(true); }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Nova Conta
                </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-4 gap-3">
                <div className="bg-white rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center gap-1.5 mb-1"><Wallet className="w-4 h-4 text-blue-500" /><span className="text-[9px] font-black text-slate-400 uppercase">Total Contas</span></div>
                    <p className="text-lg font-black text-slate-700">{contas.length}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center gap-1.5 mb-1"><TrendingUp className="w-4 h-4 text-emerald-500" /><span className="text-[9px] font-black text-slate-400 uppercase">Total Recebido</span></div>
                    <p className="text-lg font-black text-emerald-600">{fmt(totalRecebido)}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center gap-1.5 mb-1"><TrendingDown className="w-4 h-4 text-red-500" /><span className="text-[9px] font-black text-slate-400 uppercase">Total Pago</span></div>
                    <p className="text-lg font-black text-red-600">{fmt(totalPago)}</p>
                </div>
                <div className={`bg-white rounded-xl border p-3 ${totalSaldo >= 0 ? 'border-emerald-200' : 'border-red-200'}`}>
                    <div className="flex items-center gap-1.5 mb-1"><DollarSign className="w-4 h-4 text-slate-500" /><span className="text-[9px] font-black text-slate-400 uppercase">Saldo Total</span></div>
                    <p className={`text-lg font-black ${totalSaldo >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(totalSaldo)}</p>
                </div>
            </div>

            {/* Cards das Contas */}
            <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {contas.map((conta: any) => {
                        const saldo = getSaldo(conta.id);
                        return (
                            <div key={conta.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-300 transition-colors">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                            <Building2 className="w-5 h-5 text-blue-500" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">{conta.nome}</p>
                                            <p className="text-[10px] text-slate-400">{conta.tipo} • {conta.empresa || 'AMBAS'}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => handleEdit(conta)} className="text-slate-400 hover:text-blue-500 transition-colors">
                                            <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => handleDelete(conta.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {conta.banco && (
                                    <div className="text-[10px] text-slate-400 mb-2 font-mono">
                                        Banco: {conta.banco} | Ag: {conta.agencia || '—'} | C/C: {conta.conta || '—'}
                                    </div>
                                )}

                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="bg-emerald-50 rounded-lg p-2">
                                        <p className="text-[8px] font-black text-emerald-500 uppercase">Recebido</p>
                                        <p className="text-xs font-black text-emerald-600">{fmt(saldo?.totalRecebido || 0)}</p>
                                    </div>
                                    <div className="bg-red-50 rounded-lg p-2">
                                        <p className="text-[8px] font-black text-red-500 uppercase">Pago</p>
                                        <p className="text-xs font-black text-red-600">{fmt(saldo?.totalPago || 0)}</p>
                                    </div>
                                    <div className={`rounded-lg p-2 ${(saldo?.saldoAtual || 0) >= 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
                                        <p className="text-[8px] font-black text-slate-500 uppercase">Saldo</p>
                                        <p className={`text-xs font-black ${(saldo?.saldoAtual || 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                            {fmt(saldo?.saldoAtual || 0)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {contas.length === 0 && (
                        <div className="col-span-3 text-center py-16 text-slate-400">
                            <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="text-sm font-bold">Nenhuma conta bancária cadastrada</p>
                            <p className="text-xs">Clique em "Nova Conta" para começar</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal: Criar/Editar */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800">{editId ? 'Editar' : 'Nova'} Conta Bancária</h2>
                            <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })}
                            placeholder="Nome da conta *" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                        <div className="grid grid-cols-2 gap-3">
                            <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}
                                className="border border-slate-200 rounded-lg p-2.5 text-sm">
                                {TIPOS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                            </select>
                            <select value={form.empresa} onChange={e => setForm({ ...form, empresa: e.target.value })}
                                className="border border-slate-200 rounded-lg p-2.5 text-sm">
                                {EMPRESAS.map(e => <option key={e.key} value={e.key}>{e.label}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <input value={form.banco} onChange={e => setForm({ ...form, banco: e.target.value })}
                                placeholder="Banco" className="border border-slate-200 rounded-lg p-2.5 text-sm" />
                            <input value={form.agencia} onChange={e => setForm({ ...form, agencia: e.target.value })}
                                placeholder="Agência" className="border border-slate-200 rounded-lg p-2.5 text-sm" />
                            <input value={form.conta} onChange={e => setForm({ ...form, conta: e.target.value })}
                                placeholder="Conta" className="border border-slate-200 rounded-lg p-2.5 text-sm" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Saldo Inicial (R$)</label>
                            <input type="number" step="0.01" value={form.saldoInicial} onChange={e => setForm({ ...form, saldoInicial: e.target.value })}
                                placeholder="0.00" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                        </div>
                        <button onClick={handleSave} disabled={!form.nome}
                            className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-bold text-sm disabled:opacity-50">
                            {editId ? 'Salvar Alterações' : 'Criar Conta'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
