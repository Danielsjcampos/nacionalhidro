import { useToast } from '../contexts/ToastContext';
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useForm, useFieldArray } from 'react-hook-form';
import {
    Plus, Image as ImageIcon, X, Trash2, ChevronDown, ChevronUp
} from 'lucide-react';

const SectionCard = ({ title, children, defaultOpen = true }: { title: string, children: React.ReactNode, defaultOpen?: boolean }) => {
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

interface ModalEquipamentoProps {
  data?: any;
  onClose: () => void;
  onSaved: () => void;
}

export default function ModalEquipamento({ data: initialData, onClose, onSaved }: ModalEquipamentoProps) {
    const isEdit = !!initialData?.id;
    const { showToast } = useToast();
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

    const onSave = async (data: any) => {
        try {
            if (isEdit) {
                await api.put(`/equipamentos/${initialData.id}`, data);
            } else {
                await api.post('/equipamentos', data);
            }
            onSaved();
        } catch (e) {
            showToast('Erro ao salvar equipamento.');
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-200">
                <div className="p-6 bg-slate-800 border-b border-slate-900 flex justify-between items-center italic">
                    <h2 className="text-sm font-black text-white uppercase tracking-widest">{isEdit ? 'Edição de Ativo Técnico' : 'Configuração de Ativo Técnico'}</h2>
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
}
