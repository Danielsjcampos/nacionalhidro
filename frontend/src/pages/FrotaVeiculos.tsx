import { useToast } from '../contexts/ToastContext';
import { useState, useEffect } from 'react';
import { Truck, AlertCircle, Plus, Edit, Trash2, X, FileText, History, Wrench, ClipboardCheck, ChevronRight } from 'lucide-react';
import api from '../services/api';

const VeiculoForm = ({ initialData, onClose, onSave }: { initialData?: any, onClose: () => void, onSave: (data: any) => Promise<void> }) => {
    const [formData, setFormData] = useState<any>(initialData || {
        placa: '', modelo: '', marca: '', ano: '', tipo: 'CAMINHAO', tipoEquipamento: '',
        kmAtual: 0, nivelCombustivel: 100, crlvVencimento: '', anttVencimento: '', tacografoVencimento: '', seguroVencimento: '', certificacaoLiquidosVencimento: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { showToast } = useToast();
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const inputClass = "w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all italic";
    const labelClass = "block text-[10px] font-black text-slate-400 uppercase italic mb-1 tracking-widest";

    return (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
                <div className="p-6 bg-indigo-600 border-b border-indigo-700 flex justify-between items-center italic">
                    <h2 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-widest">
                        <Truck className="w-5 h-5" />
                        {initialData ? 'Editar Veículo' : 'Novo Veículo'}
                    </h2>
                    <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white transition-colors"><X className="w-5 h-5" /></button>
                </div>
                
                <form 
                    onSubmit={(e) => { e.preventDefault(); onSave(formData); }} 
                    className="p-8 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar bg-slate-50/50"
                >
                    <div>
                        <h3 className="text-[10px] font-black text-indigo-700 uppercase tracking-widest mb-4 border-b border-indigo-100 pb-2 italic">Informações Base</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="col-span-1">
                                <label className={labelClass}>Placa</label>
                                <input required name="placa" value={formData.placa} onChange={handleChange} className={inputClass} placeholder="ABC-1234" />
                            </div>
                            <div className="col-span-2">
                                <label className={labelClass}>Modelo / Versão</label>
                                <input required name="modelo" value={formData.modelo} onChange={handleChange} className={inputClass} placeholder="Scania P360" />
                            </div>
                            <div>
                                <label className={labelClass}>Marca</label>
                                <input name="marca" value={formData.marca || ''} onChange={handleChange} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Ano</label>
                                <input type="number" name="ano" value={formData.ano || ''} onChange={handleChange} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Tipo</label>
                                <select required name="tipo" value={formData.tipo} onChange={handleChange} className={inputClass}>
                                    <option value="CAMINHAO">Caminhão</option>
                                    <option value="UTILITARIO">Utilitário</option>
                                    <option value="CARRO">Carro Comum</option>
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className={labelClass}>Equipamento/Função</label>
                                <input name="tipoEquipamento" value={formData.tipoEquipamento || ''} onChange={handleChange} className={inputClass} placeholder="ex: HIDROJATO, CARRETA" />
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-[10px] font-black text-blue-900 uppercase tracking-widest mb-4 border-b border-blue-100 pb-2 flex items-center gap-2 italic">
                            <FileText className="w-4 h-4" /> Vencimentos Adicionais (Checklist Legal)
                        </h3>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className={labelClass}>Venc. CRLV</label>
                                <input type="date" name="crlvVencimento" value={formData.crlvVencimento ? formData.crlvVencimento.substring(0, 10) : ''} onChange={handleChange} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Venc. Seguro</label>
                                <input type="date" name="seguroVencimento" value={formData.seguroVencimento ? formData.seguroVencimento.substring(0, 10) : ''} onChange={handleChange} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Venc. ANTT</label>
                                <input type="date" name="anttVencimento" value={formData.anttVencimento ? formData.anttVencimento.substring(0, 10) : ''} onChange={handleChange} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Venc. Tacógrafo</label>
                                <input type="date" name="tacografoVencimento" value={formData.tacografoVencimento ? formData.tacografoVencimento.substring(0, 10) : ''} onChange={handleChange} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Certif. Líquidos</label>
                                <input type="date" name="certificacaoLiquidosVencimento" value={formData.certificacaoLiquidosVencimento ? formData.certificacaoLiquidosVencimento.substring(0, 10) : ''} onChange={handleChange} className={inputClass} />
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className={labelClass}>Hodômetro (Km)</label>
                            <input type="number" name="kmAtual" value={formData.kmAtual} onChange={handleChange} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Tanque (%)</label>
                            <input type="number" name="nivelCombustivel" value={formData.nivelCombustivel} onChange={handleChange} className={inputClass} />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
                        <button type="button" onClick={onClose} className="px-8 py-3 rounded-2xl bg-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-slate-300 transition-all italic">Cancelar</button>
                        <button type="submit" className="px-8 py-3 rounded-2xl bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 italic">Salvar Registro</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const VeiculoTimeline = ({ veiculoId, onClose }: { veiculoId: string, onClose: () => void }) => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTimeline = async () => {
            try {
                const res = await api.get(`/checklist/veiculo/${veiculoId}/historico`);
                setData(res.data);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        fetchTimeline();
    }, [veiculoId]);

    return (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
                <div className="p-6 bg-slate-900 flex justify-between items-center text-white">
                    <h2 className="text-sm font-black flex items-center gap-2 uppercase tracking-widest italic">
                        <History className="w-5 h-5 text-amber-500" />
                        Histórico Unificado: {data?.veiculo?.placa || '...'}
                    </h2>
                    <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                </div>
                
                <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar bg-slate-50/50">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Plus className="w-8 h-8 animate-spin text-slate-300" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">Sincronizando Timeline...</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-3 gap-4 mb-8">
                                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Investimento Total</p>
                                    <p className="text-lg font-black text-emerald-600 italic">R$ {Number(data.stats.custoTotalManutencao).toLocaleString('pt-BR')}</p>
                                </div>
                                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Checklists</p>
                                    <p className="text-lg font-black text-slate-800 italic">{data.stats.totalChecklists}</p>
                                </div>
                                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Manutenções</p>
                                    <p className="text-lg font-black text-slate-800 italic">{data.stats.totalManutencoes}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {data.timeline.map((item: any, i: number) => (
                                    <div key={i} className="relative pl-8 before:content-[''] before:absolute before:left-3 before:top-2 before:bottom-[-1.5rem] before:w-px before:bg-slate-200 last:before:hidden">
                                        <div className={`absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center z-10 shadow-sm ${
                                            item.tipo === 'CHECKLIST' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                                        }`}>
                                            {item.tipo === 'CHECKLIST' ? <ClipboardCheck className="w-3.5 h-3.5" /> : <Wrench className="w-3.5 h-3.5" />}
                                        </div>
                                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                        {new Date(item.data).toLocaleDateString('pt-BR')} {new Date(item.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                    <h4 className="text-xs font-black text-slate-800 uppercase italic tracking-tight">{item.descricao}</h4>
                                                </div>
                                                {item.tipo === 'MANUTENCAO' && (
                                                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded italic">
                                                        R$ {item.detalhes.custoTotal.toLocaleString('pt-BR')}
                                                    </span>
                                                )}
                                            </div>
                                            {item.tipo === 'CHECKLIST' ? (
                                                <div className="flex gap-2">
                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded ${item.detalhes.defeitos > 0 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                        {item.detalhes.defeitos} Defeitos
                                                    </span>
                                                    <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                                        Motorista: {item.detalhes.motorista}
                                                    </span>
                                                </div>
                                            ) : (
                                                <p className="text-[10px] text-slate-500 font-medium italic">{item.detalhes.status} • {item.detalhes.prioridade}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {data.timeline.length === 0 && (
                                    <p className="text-center py-8 text-xs text-slate-400 font-bold italic">Nenhum evento registrado para este veículo.</p>
                                )}
                            </div>
                        </>
                    )}
                </div>
                <div className="p-6 border-t border-slate-200 flex justify-end bg-white">
                    <button onClick={onClose} className="px-8 py-3 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all italic">Fechar Histórico</button>
                </div>
            </div>
        </div>
    );
};

export default function FrotaVeiculos() {
    const [veiculos, setVeiculos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [viewingTimeline, setViewingTimeline] = useState<string | null>(null);

    const fetchVeiculos = async () => {
        try {
            setLoading(true);
            const res = await api.get('/logistica/veiculos');
            setVeiculos(res.data);
        } catch (e) { console.error('Error fetching veiculos', e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchVeiculos(); }, []);

    const handleSave = async (data: any) => {
        try {
            if (editingItem) {
                await api.patch(`/logistica/veiculos/${editingItem.id}`, data);
            } else {
                await api.post('/logistica/veiculos', data);
            }
            setShowForm(false);
            setEditingItem(null);
            fetchVeiculos();
        } catch (e) { showToast('Erro ao salvar veículo'); }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Deseja excluir este veículo? O histórico de manutenções e OS será afetado.')) return;
        try {
            await api.delete(`/logistica/veiculos/${id}`);
            fetchVeiculos();
        } catch (e) { showToast('Erro ao excluir veículo'); }
    };

    const getStatusVencimento = (dataStr: string | null | undefined) => {
        if (!dataStr) return { text: '-', color: 'text-slate-400' };
        const dataVenc = new Date(dataStr);
        const hoje = new Date();
        const diffEmDias = Math.ceil((dataVenc.getTime() - hoje.getTime()) / (1000 * 3600 * 24));
        
        if (diffEmDias < 0) return { text: 'VENCIDO!', color: 'text-blue-900 font-black bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-md' };
        if (diffEmDias <= 30) return { text: `Vence em ${diffEmDias}d`, color: 'text-blue-600 font-black bg-blue-50 px-2.5 py-1 rounded-md' };
        return { text: new Date(dataStr).toLocaleDateString('pt-BR'), color: 'text-emerald-700 font-bold' };
    };

    const today = new Date();
    const alertsToDisplay = veiculos.flatMap(v => {
        const expirations = [
            { name: 'CRLV', date: v.crlvVencimento },
            { name: 'Seguro', date: v.seguroVencimento },
            { name: 'ANTT', date: v.anttVencimento },
            { name: 'Tacógrafo', date: v.tacografoVencimento },
            { name: 'Líquidos', date: v.certificacaoLiquidosVencimento }
        ];

        return expirations
            .map(exp => {
                if (!exp.date) return null;
                const dateVal = new Date(exp.date);
                const diffDays = Math.ceil((dateVal.getTime() - today.getTime()) / (1000 * 3600 * 24));
                if (diffDays <= 30) {
                    return { placa: v.placa, doc: exp.name, days: diffDays, v };
                }
                return null;
            })
            .filter(Boolean);
    });

    return (
        <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                   <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter italic">Frota | Veículos e Documentos</h1>
                   <p className="text-xs text-slate-400 font-bold uppercase italic tracking-widest mt-1">Gestão centralizada de conformidade e documentos da frota</p>
                </div>
                <button 
                    onClick={() => { setEditingItem(null); setShowForm(true); }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-500/20 transition-all italic"
                >
                    <Plus className="w-5 h-5" /> Adicionar Veículo
                </button>
            </div>

            {alertsToDisplay.length > 0 && (
                <div className="bg-blue-900 border-l-4 border-blue-400 rounded-r-2xl p-6 shadow-xl shadow-blue-900/10 flex gap-4 animate-in slide-in-from-top-4 duration-500">
                    <AlertCircle className="w-8 h-8 text-white flex-shrink-0" />
                    <div className="flex-1">
                        <h3 className="text-white font-black text-xs uppercase tracking-widest italic mb-2">Alerta de Compliance (Vencimentos Próximos):</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1">
                            {alertsToDisplay.map((al: any, i) => (
                                <p key={i} className="text-[10px] font-bold text-white/80 uppercase italic tracking-tighter">
                                    • <span className="text-white">{al.placa}</span>: {al.doc} {al.days < 0 ? `VENCIDO!` : `vence em ${al.days}d`}
                                </p>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex-1 overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">
                            <th className="px-6 py-5">Veículo / Placa</th>
                            <th className="px-6 py-5 text-center">Operação</th>
                            <th className="px-6 py-5 text-center">CRLV</th>
                            <th className="px-6 py-5 text-center">Seguro</th>
                            <th className="px-6 py-5 text-center">ANTT</th>
                            <th className="px-6 py-5 text-center">Tacógrafo</th>
                            <th className="px-6 py-5 text-center bg-indigo-50/30">Líquidos</th>
                            <th className="px-6 py-5 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 italic">
                        {loading ? (
                            <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">Sincronizando Frota...</td></tr>
                        ) : veiculos.map(v => (
                            <tr key={v.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-6 py-4">
                                    <p className="font-black text-slate-800 text-lg uppercase leading-none tracking-tighter">{v.placa}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{v.modelo} {v.marca ? `(${v.marca})` : ''}</p>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter
                                        ${v.status === 'DISPONIVEL' ? 'bg-emerald-100 text-emerald-700' :
                                        v.status === 'EM_USO' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-800 text-white'}`}>
                                        {v.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center whitespace-nowrap text-[10px] uppercase font-black tracking-tighter">
                                    <span className={getStatusVencimento(v.crlvVencimento).color}>
                                        {getStatusVencimento(v.crlvVencimento).text}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center whitespace-nowrap text-[10px] uppercase font-black tracking-tighter">
                                    <span className={getStatusVencimento(v.seguroVencimento).color}>
                                        {getStatusVencimento(v.seguroVencimento).text}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center whitespace-nowrap text-[10px] uppercase font-black tracking-tighter">
                                    <span className={getStatusVencimento(v.anttVencimento).color}>
                                        {getStatusVencimento(v.anttVencimento).text}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center whitespace-nowrap text-[10px] uppercase font-black tracking-tighter">
                                    <span className={getStatusVencimento(v.tacografoVencimento).color}>
                                        {getStatusVencimento(v.tacografoVencimento).text}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center whitespace-nowrap bg-indigo-50/10 text-[10px] uppercase font-black tracking-tighter">
                                    <span className={getStatusVencimento(v.certificacaoLiquidosVencimento).color}>
                                        {getStatusVencimento(v.certificacaoLiquidosVencimento).text}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setViewingTimeline(v.id)} className="p-2 text-amber-600 hover:bg-white rounded-xl border border-transparent hover:border-slate-100 transition-all shadow-sm" title="Ver Histórico">
                                            <History className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => { setEditingItem(v); setShowForm(true); }} className="p-2 text-indigo-600 hover:bg-white rounded-xl border border-transparent hover:border-slate-100 transition-all shadow-sm">
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(v.id)} className="p-2 text-slate-300 hover:text-slate-600 hover:bg-white rounded-xl border border-transparent hover:border-slate-100 transition-all shadow-sm">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {showForm && <VeiculoForm initialData={editingItem} onClose={() => setShowForm(false)} onSave={handleSave} />}
            {viewingTimeline && <VeiculoTimeline veiculoId={viewingTimeline} onClose={() => setViewingTimeline(null)} />}
        </div>
    );
}
