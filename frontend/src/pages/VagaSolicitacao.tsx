import React, { useEffect, useState } from 'react';
import { 
    Plus, Loader2, X, Check, XCircle, 
    FileText, User, Briefcase, Calendar, 
    AlertCircle, Search, Filter 
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';

const PRIORIDADES = [
    { value: 'BAIXA', label: 'Baixa', color: 'bg-slate-100 text-slate-600' },
    { value: 'MEDIA', label: 'Média', color: 'bg-blue-100 text-blue-600' },
    { value: 'ALTA', label: 'Alta', color: 'bg-orange-100 text-orange-600' },
    { value: 'URGENTE', label: 'Urgente', color: 'bg-red-100 text-red-600' },
];

const STATUS_VARIANTS: Record<string, string> = {
    PENDENTE: 'bg-amber-100 text-amber-700 border-amber-200',
    APROVADA: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    REPROVADA: 'bg-red-100 text-red-700 border-red-200',
    CANCELADA: 'bg-slate-100 text-slate-700 border-slate-200',
};

const CARGOS_DISPONIVEIS = [
    'MOTORISTA OP DE BOMBA', 'MOTORISTA', 'MOTORISTA CARRETEIRO',
    'JATISTA JUNIOR', 'JATISTA PLENO', 'JATISTA SENIOR',
    'AJUDANTE GERAL', 'AJUDANTE GERAL PLENO',
    'ANALISTA DE LOGISTICA', 'ANALISTA FINANCEIRO', 'ANALISTA DE RH',
    'AUXILIAR DE RH', 'ASSISTENTE DE RH', 'ESTAGIÁRIO ADMINISTRATIVO',
    'ESTAGIÁRIO DE RH', 'APONTADOR', 'CONTROLADOR (A) DE ACESSO',
    'VENDEDOR', 'LIDER DE EQUIPE', 'LIDER DE EQUIPE TRAINEE',
    'SUPERVISOR', 'TEC SEGURANCA DO TRABALHO', 'ENGENHEIRO SEG TRABALHO',
    'GERENTE ADMINISTRATIVO', 'MECANICO DE FROTA', 'MEIO OFICIAL ELETRICISTA DE FROTA',
    'ELETROMECANICO DE FROTA', 'GERENTE OPERACIONAL'
];

export default function VagaSolicitacaoPage() {
    const { showToast } = useToast();
    const [solicitacoes, setSolicitacoes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [filter, setFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('PENDENTE');

    const [form, setForm] = useState({
        cargo: '',
        departamento: '',
        motivo: '',
        quantidade: 1,
        prioridade: 'MEDIA',
        requisitos: '',
        solicitanteNome: ''
    });

    const fetchSolicitacoes = async () => {
        try {
            setLoading(true);
            const res = await api.get('/rh/vaga-solicitacoes', {
                params: { status: statusFilter === 'TODOS' ? undefined : statusFilter }
            });
            setSolicitacoes(res.data);
        } catch (error) {
            console.error(error);
            showToast('Erro ao buscar solicitações');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSolicitacoes();
    }, [statusFilter]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/rh/vaga-solicitacoes', form);
            showToast('Solicitação enviada com sucesso!');
            setShowModal(false);
            setForm({
                cargo: '', departamento: '', motivo: '',
                quantidade: 1, prioridade: 'MEDIA', requisitos: '', solicitanteNome: ''
            });
            fetchSolicitacoes();
        } catch (error: any) {
            showToast('Erro ao enviar solicitação');
        }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            await api.patch(`/rh/vaga-solicitacoes/${id}`, { status: newStatus });
            showToast(`Solicitação ${newStatus.toLowerCase()} com sucesso!`);
            fetchSolicitacoes();
        } catch (error) {
            showToast('Erro ao atualizar status');
        }
    };

    const filtered = solicitacoes.filter(s => 
        s.cargo.toLowerCase().includes(filter.toLowerCase()) ||
        s.solicitanteNome.toLowerCase().includes(filter.toLowerCase()) ||
        s.departamento.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col gap-6 p-1">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Solicitações de Vagas</h1>
                    <p className="text-sm text-slate-500 font-medium">Líderes e gestores solicitando reforço de equipe</p>
                </div>
                <button 
                    onClick={() => setShowModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-200"
                >
                    <Plus className="w-5 h-5" /> Nova Solicitação
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Buscar por cargo, solicitante ou depto..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                </div>
                <div className="flex gap-2">
                    {['TODOS', 'PENDENTE', 'APROVADA', 'REPROVADA'].map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                                statusFilter === s 
                                ? 'bg-blue-600 text-white border-blue-600' 
                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                            }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((s) => (
                        <div key={s.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col gap-4 relative overflow-hidden">
                            {/* Priority Indicator */}
                            <div className={`absolute top-0 right-0 px-3 py-1 text-[10px] font-black uppercase rounded-bl-xl ${PRIORIDADES.find(p => p.value === s.prioridade)?.color}`}>
                                {s.prioridade}
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="p-3 bg-blue-50 rounded-xl">
                                    <Briefcase className="w-6 h-6 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-base font-bold text-slate-800 truncate uppercase">{s.cargo}</h3>
                                    <p className="text-xs text-slate-500 font-medium">{s.departamento}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                    <User className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="font-semibold">Solicitante:</span> {s.solicitanteNome}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="font-semibold">Data:</span> {new Date(s.createdAt).toLocaleDateString()}
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="font-semibold">Motivo:</span> 
                                    <p className="text-slate-500 line-clamp-2 italic">{s.motivo || 'Nenhum motivo informado'}</p>
                                </div>
                            </div>

                            <div className="pt-4 mt-auto border-t border-slate-100 flex items-center justify-between">
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${STATUS_VARIANTS[s.status]}`}>
                                    {s.status}
                                </span>
                                
                                {s.status === 'PENDENTE' && (
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handleStatusChange(s.id, 'APROVADA')}
                                            className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200" 
                                            title="Aprovar e Criar Vaga"
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => handleStatusChange(s.id, 'REPROVADA')}
                                            className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
                                            title="Reprovar Solicitação"
                                        >
                                            <XCircle className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {filtered.length === 0 && (
                        <div className="col-span-full py-20 text-center">
                            <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                            <p className="text-slate-400 font-medium">Nenhuma solicitação encontrada</p>
                        </div>
                    )}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h2 className="text-lg font-black text-slate-800">Nova Solicitação de Vaga</h2>
                            <button onClick={() => setShowModal(false)} className="bg-white p-2 rounded-xl text-slate-400 hover:text-slate-600 border border-slate-200 shadow-sm transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="text-xs font-black text-slate-400 uppercase ml-1">Cargo Desejado</label>
                                    <select 
                                        required
                                        value={form.cargo} 
                                        onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                                        className="w-full mt-1.5 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                                    >
                                        <option value="">Selecione o cargo...</option>
                                        {CARGOS_DISPONIVEIS.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-xs font-black text-slate-400 uppercase ml-1">Departamento</label>
                                    <input 
                                        required
                                        type="text" 
                                        placeholder="Ex: Operacional, RH, Financeiro..."
                                        value={form.departamento} 
                                        onChange={(e) => setForm({ ...form, departamento: e.target.value })}
                                        className="w-full mt-1.5 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase ml-1">Quantidade</label>
                                    <input 
                                        type="number" 
                                        min="1"
                                        value={form.quantidade} 
                                        onChange={(e) => setForm({ ...form, quantidade: parseInt(e.target.value) })}
                                        className="w-full mt-1.5 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase ml-1">Prioridade</label>
                                    <select 
                                        value={form.prioridade} 
                                        onChange={(e) => setForm({ ...form, prioridade: e.target.value })}
                                        className="w-full mt-1.5 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                                    >
                                        {PRIORIDADES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-xs font-black text-slate-400 uppercase ml-1">Seu Nome (Solicitante)</label>
                                    <input 
                                        required
                                        type="text" 
                                        placeholder="Quem está solicitando?"
                                        value={form.solicitanteNome} 
                                        onChange={(e) => setForm({ ...form, solicitanteNome: e.target.value })}
                                        className="w-full mt-1.5 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-xs font-black text-slate-400 uppercase ml-1">Motivo / Descrição</label>
                                    <textarea 
                                        placeholder="Explique por que precisa desta vaga..."
                                        value={form.motivo} 
                                        onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                                        className="w-full mt-1.5 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none min-h-[80px]"
                                    />
                                </div>
                            </div>
                            <button 
                                type="submit" 
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl font-black text-sm transition-all shadow-xl shadow-blue-200 mt-2"
                            >
                                Enviar Solicitação
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
