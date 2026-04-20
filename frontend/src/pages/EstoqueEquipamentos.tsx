import { useToast } from '../contexts/ToastContext';
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useForm, useFieldArray } from 'react-hook-form';
import {
    Plus, Image as ImageIcon, X, Trash2, Edit, ChevronDown, ChevronUp
} from 'lucide-react';

const SectionCard = ({ title, children, defaultOpen = true }: { title: string, children: React.ReactNode, defaultOpen?: boolean }) => {
    const { showToast } = useToast();
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="bg-slate-50/50 rounded-2xl overflow-hidden mb-6 border border-slate-200 shadow-sm">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-5 bg-white hover:bg-slate-50 transition-colors text-left italic border-b border-slate-100"
            >
                <h3 className="font-black text-slate-800 text-[10px] uppercase tracking-widest flex items-center gap-3">
                    {isOpen ? <ChevronUp className="w-4 h-4 text-blue-600" /> : <ChevronDown className="w-4 h-4 text-blue-600" />}
                    {title}
                </h3>
            </button>
            {isOpen && <div className="p-8 space-y-6">{children}</div>}
        </div>
    )
}

const EquipmentForm = ({ initialData, onClose, onSave }: { initialData?: any, onClose: () => void, onSave: (data: any) => Promise<void> }) => {
    const { register, control, handleSubmit, setValue, watch } = useForm({
        defaultValues: initialData || {
            ativo: true,
            nome: '',
            descricao: '',
            imagem: '',
            responsabilidades: [],
            acessorios: [],
            veiculos: []
        }
    });

    const [globalAcessorios, setGlobalAcessorios] = useState<any[]>([]);
    const [globalResponsabilidades, setGlobalResponsabilidades] = useState<any[]>([]);

    useEffect(() => {
        const fetchGlobals = async () => {
            try {
                const [accRes, respRes] = await Promise.all([
                    api.get('/acessorios'),
                    api.get('/responsabilidades')
                ]);
                setGlobalAcessorios(accRes.data);
                setGlobalResponsabilidades(respRes.data);
            } catch (e) { console.error('Error fetching global lists', e); }
        };
        fetchGlobals();
    }, []);

    const { fields: respFields, append: appendResp, remove: removeResp } = useFieldArray({ control, name: "responsabilidades" });
    const { fields: accFields, append: appendAcc, remove: removeAcc } = useFieldArray({ control, name: "acessorios" });
    const { fields: vehFields, append: appendVeh, remove: removeVeh } = useFieldArray({ control, name: "veiculos" });

    const inputClass = "w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all italic";
    const labelClass = "block text-[10px] font-black text-slate-400 uppercase italic mb-1 tracking-widest";

    return (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-200">
                <div className="p-6 bg-slate-800 border-b border-slate-900 flex justify-between items-center italic">
                    <h2 className="text-sm font-black text-white uppercase tracking-widest">Configuração de Ativo Técnico</h2>
                    <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white transition-colors"><X className="w-5 h-5" /></button>
                </div>

                <form onSubmit={handleSubmit(onSave)} className="flex-1 overflow-y-auto p-10 space-y-10 bg-slate-50/30 custom-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        <div className="space-y-6">
                            <div>
                                <label className={labelClass}>Nome do Equipamento</label>
                                <input {...register('nome', { required: true })} className={inputClass} placeholder="Ex: Hidrojato Alta Pressão" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Status Operacional</label>
                                    <select {...register('ativo')} className={inputClass}>
                                        <option value="true">ATIVO</option>
                                        <option value="false">INATIVO</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Foto de Referência (Catálogo)</label>
                                <div className="aspect-video bg-white rounded-3xl flex flex-col items-center justify-center border-2 border-dashed border-slate-200 overflow-hidden relative group shadow-inner">
                                    {watch('imagem') ? (
                                        <img src={watch('imagem')} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <ImageIcon className="w-12 h-12 text-slate-200 mb-2" />
                                    )}
                                    <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <label className="cursor-pointer bg-white text-slate-900 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase italic tracking-widest hover:scale-105 transition-all shadow-xl">
                                            Fazer Upload
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            setValue('imagem', reader.result as string);
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col">
                            <label className={labelClass}>Especificações Técnicas / Descrição</label>
                            <textarea {...register('descricao')} className={`${inputClass} flex-1 resize-none h-full min-h-[200px] py-4`} placeholder="Descreva os componentes, potência e detalhes técnicos..." />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <SectionCard title="Cargos & Responsabilidades">
                            {respFields.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                    <div>
                                        <label className={labelClass}>Responsabilidade</label>
                                        <select {...register(`responsabilidades.${index}.descricao` as const)} className={inputClass}>
                                            <option value="">Selecione...</option>
                                            {globalResponsabilidades.map(g => (
                                                <option key={g.id} value={g.descricao}>{g.descricao.toUpperCase()} ({g.tipo})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className={labelClass}>Nome do Responsável</label>
                                            <input {...register(`responsabilidades.${index}.responsavel` as const)} className={inputClass} />
                                        </div>
                                        <button type="button" onClick={() => removeResp(index)} className="p-3 text-red-100 hover:text-white bg-red-600/10 hover:bg-red-600 rounded-xl transition-all self-end mb-[2px]">
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <button type="button" onClick={() => appendResp({ descricao: '', responsavel: '' })} className="text-blue-600 text-[10px] font-black uppercase tracking-widest hover:underline italic flex items-center gap-2">
                                <Plus className="w-4 h-4" /> Registrar Responsabilidade
                            </button>
                        </SectionCard>

                        <SectionCard title="Acessórios e Ferramental">
                            {accFields.map((field, index) => (
                                <div key={field.id} className="flex gap-4 items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                    <div className="flex-1">
                                        <label className={labelClass}>Acessório Vinculado</label>
                                        <select {...register(`acessorios.${index}` as const)} className={inputClass}>
                                            <option value="">Selecione...</option>
                                            {globalAcessorios.map(g => (
                                                <option key={g.id} value={g.nome}>{g.nome.toUpperCase()}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <button type="button" onClick={() => removeAcc(index)} className="p-3 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all mt-6">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                            <button type="button" onClick={() => appendAcc('')} className="text-blue-600 text-[10px] font-black uppercase tracking-widest hover:underline italic flex items-center gap-2">
                                <Plus className="w-4 h-4" /> Víncular Acessório
                            </button>
                        </SectionCard>

                        <SectionCard title="Caminhões & Veículos Compatíveis">
                            {vehFields.map((field, index) => (
                                <div key={field.id} className="flex gap-4 items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                    <div className="flex-1">
                                        <label className={labelClass}>Identificação do Veículo</label>
                                        <input {...register(`veiculos.${index}` as const)} className={inputClass} placeholder="Ex: Placa ou Modelo" />
                                    </div>
                                    <button type="button" onClick={() => removeVeh(index)} className="p-3 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all mt-6">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                            <button type="button" onClick={() => appendVeh('')} className="text-blue-600 text-[10px] font-black uppercase tracking-widest hover:underline italic flex items-center gap-2">
                                <Plus className="w-4 h-4" /> Autorizar Veículo
                            </button>
                        </SectionCard>
                    </div>

                    <div className="flex justify-end gap-3 pt-8 border-t border-slate-200 sticky bottom-0 bg-slate-50/95 backdrop-blur-sm z-10 pb-4">
                        <button type="button" onClick={onClose} className="px-8 py-3.5 rounded-2xl bg-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-slate-300 transition-all italic">Descartar</button>
                        <button type="submit" className="px-10 py-3.5 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-200 italic">Confirmar Equipamento</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default function EstoqueEquipamentos() {
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [equipamentos, setEquipamentos] = useState<any[]>([]);

    const fetchEquip = async () => {
        try {
            const res = await api.get('/equipamentos');
            setEquipamentos(res.data);
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        fetchEquip();
    }, []);

    const handleSave = async (data: any) => {
        try {
            if (editingItem) {
                await api.put(`/equipamentos/${editingItem.id}`, data);
            } else {
                await api.post('/equipamentos', data);
            }
            setShowForm(false);
            setEditingItem(null);
            fetchEquip();
        } catch (e) {
            showToast('Erro ao salvar');
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Tem certeza que deseja excluir este equipamento?')) return;
        try {
            await api.delete(`/equipamentos/${id}`);
            fetchEquip();
        } catch (e) {
            showToast('Erro ao deletar');
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                   <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter italic leading-none">Administração | Equipamentos</h1>
                   <p className="text-xs text-slate-400 font-bold uppercase italic tracking-widest mt-2">Especificações técnicas, responsabilidades e acessórios de ativos móveis</p>
                </div>
                <button 
                  onClick={() => { setEditingItem(null); setShowForm(true); }} 
                  className="bg-slate-900 hover:bg-black text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-slate-200 italic flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" /> Adicionar Equipamento
                </button>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex-1 overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">
                            <th className="px-8 py-5 w-24">Foto</th>
                            <th className="px-8 py-5">Identificação</th>
                            <th className="px-8 py-5 w-1/3">Especificação Resumida</th>
                            <th className="px-8 py-5 text-center w-32">Status</th>
                            <th className="px-8 py-5 text-right w-40">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 italic">
                        {equipamentos.map(eq => (
                            <tr key={eq.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-8 py-5">
                                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-100 shadow-inner group-hover:scale-105 transition-transform">
                                        {eq.imagem ?
                                            <img src={eq.imagem} alt={eq.nome} className="w-full h-full object-cover" /> :
                                            <ImageIcon className="w-6 h-6 text-slate-200" />
                                        }
                                    </div>
                                </td>
                                <td className="px-8 py-5">
                                    <p className="font-black text-slate-800 uppercase tracking-tighter text-sm leading-none">{eq.nome}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Ativo Técnico</p>
                                </td>
                                <td className="px-8 py-5 text-slate-500 font-medium text-xs leading-relaxed max-w-xs">
                                    {eq.descricao ? (eq.descricao.length > 80 ? eq.descricao.slice(0, 80) + '...' : eq.descricao) : 'Sem descrições cadastradas.'}
                                </td>
                                <td className="px-8 py-5 text-center">
                                    <span className={`px-4 py-1.5 rounded-md text-[9px] font-black border uppercase tracking-widest ${eq.ativo ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                        {eq.ativo ? 'Operando' : 'Inativo'}
                                    </span>
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => { setEditingItem(eq); setShowForm(true); }} className="p-2 text-blue-600 hover:bg-white rounded-xl border border-transparent hover:border-slate-100 transition-all shadow-sm">
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(eq.id)} className="p-2 text-slate-300 hover:text-red-600 hover:bg-white rounded-xl border border-transparent hover:border-slate-100 transition-all shadow-sm">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showForm && <EquipmentForm initialData={editingItem} onClose={() => setShowForm(false)} onSave={handleSave} />}
        </div>
    );
}
