import { useToast } from '../contexts/ToastContext';
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useForm, useFieldArray } from 'react-hook-form';
import {
    Plus, Image as ImageIcon, X, Trash2, Edit, ChevronDown, ChevronUp
} from 'lucide-react';

import ModalEquipamento from '../components/ModalEquipamento';

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

            {showForm && <ModalEquipamento data={editingItem} onClose={() => setShowForm(false)} onSaved={() => { fetchData(); setShowForm(false); }} />}
        </div>
    );
}
