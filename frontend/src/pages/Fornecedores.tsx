import { useEffect, useState } from 'react';
import api from '../services/api';
import { Plus, Loader2, X, Search, Phone, Mail, MapPin, Building2, CreditCard } from 'lucide-react';

export default function Fornecedores() {
    const [fornecedores, setFornecedores] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState({
        nome: '', razaoSocial: '', documento: '', tipo: 'PJ', segmento: '',
        endereco: '', cidade: '', estado: '', cep: '', email: '', telefone: '',
        contato: '', banco: '', agencia: '', conta: '', chavePix: '', observacoes: ''
    });

    const fetchAll = async () => {
        try {
            const params: any = {};
            if (search) params.search = search;
            const res = await api.get('/fornecedores', { params });
            setFornecedores(res.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchAll(); }, [search]);

    const handleSave = async () => {
        try {
            if (editId) {
                await api.patch(`/fornecedores/${editId}`, form);
            } else {
                await api.post('/fornecedores', form);
            }
            setShowForm(false);
            setEditId(null);
            setForm({ nome: '', razaoSocial: '', documento: '', tipo: 'PJ', segmento: '', endereco: '', cidade: '', estado: '', cep: '', email: '', telefone: '', contato: '', banco: '', agencia: '', conta: '', chavePix: '', observacoes: '' });
            fetchAll();
        } catch (err) { console.error(err); }
    };

    const openEdit = (f: any) => {
        setEditId(f.id);
        setForm({
            nome: f.nome || '', razaoSocial: f.razaoSocial || '', documento: f.documento || '',
            tipo: f.tipo || 'PJ', segmento: f.segmento || '', endereco: f.endereco || '',
            cidade: f.cidade || '', estado: f.estado || '', cep: f.cep || '',
            email: f.email || '', telefone: f.telefone || '', contato: f.contato || '',
            banco: f.banco || '', agencia: f.agencia || '', conta: f.conta || '',
            chavePix: f.chavePix || '', observacoes: f.observacoes || ''
        });
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Excluir fornecedor?')) return;
        await api.delete(`/fornecedores/${id}`);
        fetchAll();
    };

    if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

    return (
        <div className="h-full flex flex-col space-y-4 overflow-hidden">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Fornecedores</h1>
                    <p className="text-sm text-slate-500">Cadastro e gestão de fornecedores</p>
                </div>
                <button onClick={() => { setEditId(null); setForm({ nome: '', razaoSocial: '', documento: '', tipo: 'PJ', segmento: '', endereco: '', cidade: '', estado: '', cep: '', email: '', telefone: '', contato: '', banco: '', agencia: '', conta: '', chavePix: '', observacoes: '' }); setShowForm(true); }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Novo Fornecedor
                </button>
            </div>

            <div className="relative max-w-md">
                <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                <input type="text" placeholder="Buscar por nome ou CNPJ..." value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-10 pr-4 text-sm outline-none shadow-sm" />
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-3 content-start">
                {fornecedores.map((f: any) => (
                    <div key={f.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow transition-shadow">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="font-bold text-slate-800 text-sm">{f.nome}</h3>
                                {f.razaoSocial && <p className="text-[10px] text-slate-400">{f.razaoSocial}</p>}
                            </div>
                            <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{f.tipo}</span>
                        </div>
                        <div className="mt-2 space-y-1">
                            {f.documento && <p className="text-xs text-slate-500 flex items-center gap-1"><Building2 className="w-3 h-3" />{f.documento}</p>}
                            {f.telefone && <p className="text-xs text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3" />{f.telefone}</p>}
                            {f.email && <p className="text-xs text-slate-500 flex items-center gap-1"><Mail className="w-3 h-3" />{f.email}</p>}
                            {f.cidade && <p className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{f.cidade}/{f.estado}</p>}
                            {f.banco && <p className="text-xs text-slate-500 flex items-center gap-1"><CreditCard className="w-3 h-3" />{f.banco} Ag:{f.agencia} Cc:{f.conta}</p>}
                        </div>
                        <div className="mt-3 flex gap-2">
                            <button onClick={() => openEdit(f)} className="text-xs text-blue-600 font-bold">Editar</button>
                            <button onClick={() => handleDelete(f.id)} className="text-xs text-slate-400 font-bold hover:text-slate-600">Excluir</button>
                        </div>
                    </div>
                ))}
                {fornecedores.length === 0 && <p className="text-slate-400 text-sm italic col-span-2 text-center py-8">Nenhum fornecedor cadastrado</p>}
            </div>

            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 space-y-3 max-h-[85vh] overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800">{editId ? 'Editar' : 'Novo'} Fornecedor</h2>
                            <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Nome *" className="border border-slate-200 rounded-lg p-2.5 text-sm" />
                            <input value={form.razaoSocial} onChange={e => setForm({ ...form, razaoSocial: e.target.value })} placeholder="Razão Social" className="border border-slate-200 rounded-lg p-2.5 text-sm" />
                            <input value={form.documento} onChange={e => setForm({ ...form, documento: e.target.value })} placeholder="CNPJ/CPF" className="border border-slate-200 rounded-lg p-2.5 text-sm" />
                            <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="border border-slate-200 rounded-lg p-2.5 text-sm">
                                <option value="PJ">Pessoa Jurídica</option>
                                <option value="PF">Pessoa Física</option>
                            </select>
                            <input value={form.segmento} onChange={e => setForm({ ...form, segmento: e.target.value })} placeholder="Segmento" className="border border-slate-200 rounded-lg p-2.5 text-sm" />
                            <input value={form.contato} onChange={e => setForm({ ...form, contato: e.target.value })} placeholder="Pessoa de Contato" className="border border-slate-200 rounded-lg p-2.5 text-sm" />
                            <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="E-mail" className="border border-slate-200 rounded-lg p-2.5 text-sm" />
                            <input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} placeholder="Telefone" className="border border-slate-200 rounded-lg p-2.5 text-sm" />
                            <input value={form.endereco} onChange={e => setForm({ ...form, endereco: e.target.value })} placeholder="Endereço" className="border border-slate-200 rounded-lg p-2.5 text-sm col-span-2" />
                            <input value={form.cidade} onChange={e => setForm({ ...form, cidade: e.target.value })} placeholder="Cidade" className="border border-slate-200 rounded-lg p-2.5 text-sm" />
                            <div className="grid grid-cols-2 gap-3">
                                <input value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })} placeholder="UF" className="border border-slate-200 rounded-lg p-2.5 text-sm" />
                                <input value={form.cep} onChange={e => setForm({ ...form, cep: e.target.value })} placeholder="CEP" className="border border-slate-200 rounded-lg p-2.5 text-sm" />
                            </div>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase mt-2">Dados Bancários</p>
                        <div className="grid grid-cols-4 gap-3">
                            <input value={form.banco} onChange={e => setForm({ ...form, banco: e.target.value })} placeholder="Banco" className="border border-slate-200 rounded-lg p-2.5 text-sm" />
                            <input value={form.agencia} onChange={e => setForm({ ...form, agencia: e.target.value })} placeholder="Agência" className="border border-slate-200 rounded-lg p-2.5 text-sm" />
                            <input value={form.conta} onChange={e => setForm({ ...form, conta: e.target.value })} placeholder="Conta" className="border border-slate-200 rounded-lg p-2.5 text-sm" />
                            <input value={form.chavePix} onChange={e => setForm({ ...form, chavePix: e.target.value })} placeholder="Chave Pix" className="border border-slate-200 rounded-lg p-2.5 text-sm" />
                        </div>
                        <textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} placeholder="Observações" rows={2}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                        <button onClick={handleSave} disabled={!form.nome}
                            className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-bold text-sm disabled:opacity-50">
                            {editId ? 'Salvar Alterações' : 'Cadastrar Fornecedor'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
