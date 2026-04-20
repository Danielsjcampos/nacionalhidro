import { useToast } from '../contexts/ToastContext';
import { useEffect, useState } from 'react';
import api from '../services/api';
import { Loader2, Building2, AlertTriangle, CheckCircle, Settings, Edit3 } from 'lucide-react';

export default function EmpresasPage() {
    const { showToast } = useToast();
    const [indicadores, setIndicadores] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [editForm, setEditForm] = useState({ 
        limiteMenusal: '', 
        alertaPercentual: '',
        nfseAtiva: false,
        nfseAmbient: 'HOMOLOGACAO',
        nfseCertificate: '',
        nfsePrivateKey: '',
        nfsePassphrase: '',
        banco: '',
        agencia: '',
        conta: ''
    });
    const [newEmpresa, setNewEmpresa] = useState({ nome: '', cnpj: '', limiteMenusal: '500000', alertaPercentual: '80', banco: '', agencia: '', conta: '' });

    const fetchIndicadores = async () => {
        try {
            const res = await api.get('/empresas/indicador');
            setIndicadores(res.data);
        } catch (err: any) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIndicadores();
    }, []);

    const handleEdit = (emp: any) => {
        setEditForm({
            limiteMenusal: String(emp.limite),
            alertaPercentual: String(emp.alertaPercentual),
            nfseAtiva: !!emp.nfseAtiva,
            nfseAmbient: emp.nfseAmbient || 'HOMOLOGACAO',
            nfseCertificate: emp.nfseCertificate || '',
            nfsePrivateKey: emp.nfsePrivateKey || '',
            nfsePassphrase: emp.nfsePassphrase || '',
            banco: emp.banco || '',
            agencia: emp.agencia || '',
            conta: emp.conta || ''
        });
        setEditingId(emp.id);
    };

    const handleSave = async (id: string) => {
        try {
            await api.patch(`/empresas/${id}`, {
                limiteMenusal: Number(editForm.limiteMenusal),
                alertaPercentual: Number(editForm.alertaPercentual),
                nfseAtiva: editForm.nfseAtiva,
                nfseAmbient: editForm.nfseAmbient,
                nfseCertificate: editForm.nfseCertificate,
                nfsePrivateKey: editForm.nfsePrivateKey,
                nfsePassphrase: editForm.nfsePassphrase,
                banco: editForm.banco,
                agencia: editForm.agencia,
                conta: editForm.conta
            });
            setEditingId(null);
            fetchIndicadores();
        } catch (err: any) {
            showToast('Falha ao salvar configurações.');
        }
    };

    const handleCreate = async () => {
        try {
            if (!newEmpresa.nome || !newEmpresa.cnpj) {
                showToast('Nome e CNPJ são obrigatórios');
                return;
            }
            await api.post('/empresas', newEmpresa);
            setIsAdding(false);
            setNewEmpresa({ nome: '', cnpj: '', limiteMenusal: '500000', alertaPercentual: '80', banco: '', agencia: '', conta: '' });
            fetchIndicadores();
        } catch (err: any) {
            showToast('Falha ao adicionar empresa.');
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Tem certeza que deseja remover este CNPJ? Histórico de faturamento será mantido mas ele não aparecerá mais nos novos faturamentos.')) return;
        try {
            await api.delete(`/empresas/${id}`);
            fetchIndicadores();
        } catch (err: any) {
            showToast('Falha ao remover empresa.');
        }
    };

    const fmt = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

    return (
        <div className="h-full overflow-y-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Multi-CNPJ (Teto Fiscal)</h1>
                    <p className="text-sm text-slate-500">Acompanhamento do uso do Teto Fiscal de faturamento por CNPJ ativo.</p>
                </div>
                <button 
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-blue-700 transition-colors"
                >
                    <Building2 className="w-4 h-4" />
                    Adicionar Novo CNPJ
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {indicadores.map((emp) => {
                    const statusColor = 
                        emp.status === 'ESTOURADO' ? 'text-red-600 bg-red-50 border-red-200' :
                        emp.status === 'ALERTA' ? 'text-amber-600 bg-amber-50 border-amber-200' :
                        'text-emerald-600 bg-emerald-50 border-emerald-200';

                    const StatusIcon = 
                        emp.status === 'ESTOURADO' ? AlertTriangle :
                        emp.status === 'ALERTA' ? AlertTriangle : CheckCircle;

                    const widthPercent = Math.min(100, emp.percentualUsado);
                    const isEditing = editingId === emp.id;

                    return (
                        <div key={emp.id} className={`bg-white rounded-xl border p-5 space-y-4 ${emp.status === 'ESTOURADO' ? 'border-red-300 shadow-sm shadow-red-100' : 'border-slate-200 shadow-sm'}`}>
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${statusColor}`}>
                                        <Building2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-slate-800">{emp.nome}</h2>
                                        <p className="text-xs text-slate-500 font-mono tracking-tight">{emp.cnpj}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold ${statusColor}`}>
                                        <StatusIcon className="w-3 h-3" />
                                        {emp.status}
                                    </div>
                                    <button 
                                        onClick={() => handleDelete(emp.id)}
                                        className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                                        title="Remover CNPJ"
                                    >
                                        <AlertTriangle className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="bg-slate-50 border border-slate-100 rounded-lg p-4">
                                <div className="flex justify-between items-end mb-2">
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-slate-400">Total Faturado ({emp.mesReferencia})</p>
                                        <p className="text-xl font-black text-slate-800">{fmt(emp.totalFaturado)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] uppercase font-bold text-slate-400">Limite / Teto</p>
                                        <p className="text-sm font-bold text-slate-500">{fmt(emp.limite)}</p>
                                    </div>
                                </div>
                                
                                {/* Progress Bar */}
                                <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden mb-1 mt-3">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-500 ${emp.status === 'ESTOURADO' ? 'bg-red-500' : emp.status === 'ALERTA' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                        style={{ width: `${widthPercent}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between items-center text-[10px] text-slate-500">
                                    <span>{emp.percentualUsado}% Utilizado</span>
                                    <span>{emp.qtdFaturas} faturas emitidas</span>
                                </div>
                            </div>

                            {/* Settings / Configs */}
                            {isEditing ? (
                                <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 space-y-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Settings className="w-4 h-4 text-blue-600" />
                                        <p className="text-xs font-bold text-blue-800">Configurar Alertas e Teto</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-500">Teto Mensal (R$)</label>
                                            <input 
                                                type="number"
                                                value={editForm.limiteMenusal} 
                                                onChange={e => setEditForm({...editForm, limiteMenusal: e.target.value})}
                                                className="w-full text-xs p-2 rounded border border-slate-200 outline-none focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-500">Alerta (%)</label>
                                            <input 
                                                type="number"
                                                value={editForm.alertaPercentual} 
                                                onChange={e => setEditForm({...editForm, alertaPercentual: e.target.value})}
                                                className="w-full text-xs p-2 rounded border border-slate-200 outline-none focus:border-blue-500"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-500">Banco</label>
                                            <input 
                                                type="text"
                                                value={editForm.banco} 
                                                onChange={e => setEditForm({...editForm, banco: e.target.value})}
                                                placeholder="Ex: Itaú (341)"
                                                className="w-full text-xs p-2 rounded border border-slate-200 outline-none focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-500">Agência</label>
                                            <input 
                                                type="text"
                                                value={editForm.agencia} 
                                                onChange={e => setEditForm({...editForm, agencia: e.target.value})}
                                                placeholder="Ex: 4009"
                                                className="w-full text-xs p-2 rounded border border-slate-200 outline-none focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-500">Conta/Pix</label>
                                            <input 
                                                type="text"
                                                value={editForm.conta} 
                                                onChange={e => setEditForm({...editForm, conta: e.target.value})}
                                                placeholder="Ex: 55747-3"
                                                className="w-full text-xs p-2 rounded border border-slate-200 outline-none focus:border-blue-500"
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-3 border-t border-blue-100">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Settings className="w-4 h-4 text-blue-600" />
                                            <p className="text-xs font-bold text-blue-800 uppercase tracking-tighter">Configurações NFS-e (Campinas)</p>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-100">
                                                <span className="text-[10px] font-black uppercase text-slate-500 italic">Ativar Emissão NFSe</span>
                                                <button 
                                                    onClick={() => setEditForm({...editForm, nfseAtiva: !editForm.nfseAtiva})}
                                                    className={`w-10 h-5 rounded-full relative transition-all ${editForm.nfseAtiva ? 'bg-emerald-500' : 'bg-slate-200'}`}
                                                >
                                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${editForm.nfseAtiva ? 'left-5.5' : 'left-0.5'}`}></div>
                                                </button>
                                            </div>

                                            {editForm.nfseAtiva && (
                                                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                                    <div>
                                                        <label className="text-[10px] font-black uppercase text-slate-500 italic">Ambiente de Transmissão</label>
                                                        <select 
                                                            value={editForm.nfseAmbient}
                                                            onChange={e => setEditForm({...editForm, nfseAmbient: e.target.value})}
                                                            className="w-full text-xs p-2 rounded border border-slate-200 outline-none focus:border-blue-500 mt-1"
                                                        >
                                                            <option value="HOMOLOGACAO">HOMOLOGAÇÃO (TESTES)</option>
                                                            <option value="PRODUCAO">PRODUÇÃO (REAL)</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black uppercase text-slate-500 italic">Certificado Digital (PEM)</label>
                                                        <textarea 
                                                            value={editForm.nfseCertificate}
                                                            onChange={e => setEditForm({...editForm, nfseCertificate: e.target.value})}
                                                            className="w-full text-[10px] p-2 rounded border border-slate-200 h-20 font-mono outline-none focus:border-blue-500 mt-1"
                                                            placeholder="-----BEGIN CERTIFICATE----- ..."
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black uppercase text-slate-500 italic">Chave Privada (PEM)</label>
                                                        <textarea 
                                                            value={editForm.nfsePrivateKey}
                                                            onChange={e => setEditForm({...editForm, nfsePrivateKey: e.target.value})}
                                                            className="w-full text-[10px] p-2 rounded border border-slate-200 h-20 font-mono outline-none focus:border-blue-500 mt-1"
                                                            placeholder="-----BEGIN PRIVATE KEY----- ..."
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-1 border-t border-blue-100 mt-4">
                                        <button onClick={() => setEditingId(null)} className="flex-1 text-xs py-2 bg-white border border-slate-200 text-slate-600 rounded-lg focus:outline-none hover:bg-slate-50 italic">Descartar</button>
                                        <button onClick={() => handleSave(emp.id)} className="flex-1 text-xs py-2 bg-slate-900 font-black text-white rounded-lg focus:outline-none hover:bg-black shadow-sm uppercase italic tracking-widest">Salvar Empresa</button>
                                    </div>
                                </div>
                            ) : (
                                <button onClick={() => handleEdit(emp)} className="w-full text-xs py-2 border border-slate-200 text-slate-500 rounded-lg flex items-center justify-center gap-1.5 focus:outline-none hover:bg-slate-50 transition-colors">
                                    <Edit3 className="w-3.5 h-3.5" /> Ajustar Limites e Alertas
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
            
            {indicadores.length === 0 && (
                <div className="text-center bg-white border border-slate-200 rounded-xl p-8">
                    <p className="text-sm text-slate-400 font-semibold mb-2">Nenhum CNPJ faturando neste mês.</p>
                </div>
            )}

            {/* Modal de Adição */}
            {isAdding && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="bg-slate-800 p-6 text-white">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Building2 className="w-6 h-6 text-blue-400" />
                                Novo CNPJ Faturador
                            </h2>
                            <p className="text-slate-400 text-xs mt-1">Configure uma nova entidade para faturamento no sistema.</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-500">Nome da Entidade</label>
                                <input 
                                    type="text"
                                    value={newEmpresa.nome}
                                    onChange={e => setNewEmpresa({...newEmpresa, nome: e.target.value})}
                                    placeholder="Ex: Nacional Hidro Locação"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-500">CNPJ</label>
                                <input 
                                    type="text"
                                    value={newEmpresa.cnpj}
                                    onChange={e => setNewEmpresa({...newEmpresa, cnpj: e.target.value})}
                                    placeholder="00.000.000/0000-00"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-500">Teto Mensal (R$)</label>
                                    <input 
                                        type="number"
                                        value={newEmpresa.limiteMenusal}
                                        onChange={e => setNewEmpresa({...newEmpresa, limiteMenusal: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-500">Alerta (%)</label>
                                    <input 
                                        type="number"
                                        value={newEmpresa.alertaPercentual}
                                        onChange={e => setNewEmpresa({...newEmpresa, alertaPercentual: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-500">Banco</label>
                                    <input 
                                        type="text"
                                        value={newEmpresa.banco}
                                        onChange={e => setNewEmpresa({...newEmpresa, banco: e.target.value})}
                                        placeholder="Ex: Itaú"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-500">Agência</label>
                                    <input 
                                        type="text"
                                        value={newEmpresa.agencia}
                                        onChange={e => setNewEmpresa({...newEmpresa, agencia: e.target.value})}
                                        placeholder="Ag"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-500">Conta</label>
                                    <input 
                                        type="text"
                                        value={newEmpresa.conta}
                                        onChange={e => setNewEmpresa({...newEmpresa, conta: e.target.value})}
                                        placeholder="C/C ou Pix"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button 
                                    onClick={() => setIsAdding(false)}
                                    className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleCreate}
                                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                                >
                                    Cadastrar CNPJ
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
