import React, { useEffect, useState } from 'react';
import { X, DollarSign, Loader2, Plus, Trash2, Info, Calculator, FileText } from 'lucide-react';
import api from '../services/api';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    osId: string;
    onSuccess: () => void;
}

const Field = ({ label, value, className = "" }: { label: string; value: any; className?: string }) => (
    <div className={`space-y-1 ${className}`}>
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-tight block">{label}</label>
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 truncate">
            {value || '—'}
        </div>
    </div>
);

const Input = ({ label, value, onChange, type = "text", placeholder = "" }: any) => (
    <div className="space-y-1">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-tight block">{label}</label>
        <input 
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors"
        />
    </div>
);

export default function ModalPrecificarOS({ isOpen, onClose, osId, onSuccess }: Props) {
    const [os, setOs] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    // Form fields
    const [tipoPrecificacao, setTipoPrecificacao] = useState<'Servico' | 'Hora'>('Servico');
    const [valorDesconto, setValorDesconto] = useState('0');
    const [valorAdicional, setValorAdicional] = useState('0');
    const [observacao, setObservacao] = useState('');
    
    // New item form
    const [itemForm, setItemForm] = useState({ descricao: '', valorUnitario: '', quantidade: '1' });
    const [showItemForm, setShowItemForm] = useState(false);

    useEffect(() => {
        if (isOpen && osId) {
            fetchOS();
        }
    }, [isOpen, osId]);

    const fetchOS = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/precificacao/${osId}`);
            setOs(res.data);
            setTipoPrecificacao(res.data.tipoPrecificacao || 'Servico');
            setValorDesconto(res.data.valorDesconto?.toString() || '0');
            setValorAdicional(res.data.valorAdicional?.toString() || '0');
            setObservacao(res.data.observacaoPrecificacao || '');
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = async () => {
        if (!itemForm.descricao || !itemForm.valorUnitario) return;
        try {
            await api.post(`/precificacao/${osId}/itens`, {
                ...itemForm,
                tipoCobranca: tipoPrecificacao === 'Servico' ? 'EXECUCAO' : 'HORA'
            });
            setItemForm({ descricao: '', valorUnitario: '', quantidade: '1' });
            setShowItemForm(false);
            fetchOS();
        } catch (err) { console.error(err); }
    };

    const handleRemoveItem = async (itemId: string) => {
        if (!window.confirm('Excluir este item?')) return;
        try {
            await api.delete(`/precificacao/itens/${itemId}`);
            fetchOS();
        } catch (err) { console.error(err); }
    };

    const handleFinalize = async () => {
        setSubmitting(true);
        try {
            await api.post(`/precificacao/${osId}/precificar`, {
                valorDesconto: parseFloat(valorDesconto),
                valorAdicional: parseFloat(valorAdicional),
                observacaoPrecificacao: observacao,
                tipoPrecificacao
            });
            onSuccess();
            onClose();
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    const fmt = (v: any) => {
        const val = typeof v === 'string' ? parseFloat(v) : v;
        return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const itemsTotal = os?.itensCobranca?.reduce((sum: number, i: any) => sum + parseFloat(i.valorTotal), 0) || 0;
    const totalServico = tipoPrecificacao === 'Servico' ? itemsTotal : 0;
    const totalHora = tipoPrecificacao === 'Hora' ? itemsTotal : 0;
    const grandTotal = itemsTotal + parseFloat(valorAdicional || '0') - parseFloat(valorDesconto || '0');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="bg-[#1e3a5f] px-6 py-4 flex items-center justify-between text-white">
                    <div className="flex items-center gap-3">
                        <Calculator className="w-5 h-5 text-emerald-400" />
                        <div>
                            <h2 className="font-black uppercase tracking-widest text-sm">Precificar OS's</h2>
                            <p className="text-[10px] text-white/60 font-bold uppercase tracking-tight">Módulo de Precificação e Faturamento</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {loading ? (
                    <div className="p-20 flex flex-col items-center justify-center gap-4">
                        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                        <p className="text-xs font-black text-slate-400 uppercase">Carregando dados da OS...</p>
                    </div>
                ) : (
                    <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                        {/* OS Info Grid */}
                        <div className="grid grid-cols-4 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                            <Field label="Nº da Proposta" value={os.proposta?.codigo} />
                            <Field label="Código OS" value={os.codigo} />
                            <Field label="Empresa" value={os.empresa} className="col-span-2" />
                            
                            <Field label="Cliente" value={os.cliente?.nome} className="col-span-2" />
                            <Field label="Contato" value={os.contato} />
                            <Field label="Acompanhante" value={os.acompanhante} />

                            <Field label="Equipamento" value={os.servicos?.[0]?.equipamento} />
                            <Field label="Data" value={os.dataInicial ? new Date(os.dataInicial).toLocaleDateString() : ''} />
                            <Field label="Hora" value={os.horaInicial} />
                            <Field label="Criado por" value={os.rdos?.[0]?.tecnico || 'LOGISTICA'} />

                            <Field label="Data Criação" value={new Date(os.createdAt).toLocaleDateString()} />
                            <Field label="Data Baixa" value={os.dataBaixa ? new Date(os.dataBaixa).toLocaleDateString() : ''} />
                        </div>

                        {/* Pricing Type & Items */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-8">
                                <label className="text-[10px] font-black text-slate-500 uppercase">Tipo de Precificação</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <input 
                                            type="radio" 
                                            name="tipo" 
                                            checked={tipoPrecificacao === 'Servico'} 
                                            onChange={() => setTipoPrecificacao('Servico')}
                                            className="w-4 h-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className={`text-xs font-bold ${tipoPrecificacao === 'Servico' ? 'text-blue-700' : 'text-slate-500'}`}>Serviço</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <input 
                                            type="radio" 
                                            name="tipo" 
                                            checked={tipoPrecificacao === 'Hora'} 
                                            onChange={() => setTipoPrecificacao('Hora')}
                                            className="w-4 h-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className={`text-xs font-bold ${tipoPrecificacao === 'Hora' ? 'text-blue-700' : 'text-slate-500'}`}>Hora</span>
                                    </label>
                                </div>
                            </div>

                            {/* Items Table */}
                            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase">Descrição do Serviço</th>
                                            <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase w-32">Valor Unitário</th>
                                            <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase w-24">Quantidade</th>
                                            <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase w-32">Valor Total</th>
                                            <th className="px-4 py-2 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {os.itensCobranca?.map((it: any) => (
                                            <tr key={it.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-4 py-3 text-xs font-bold text-slate-700 uppercase">{it.descricao}</td>
                                                <td className="px-4 py-3 text-xs font-bold text-slate-600">{fmt(it.valorUnitario)}</td>
                                                <td className="px-4 py-3 text-xs font-bold text-slate-600">{it.quantidade}</td>
                                                <td className="px-4 py-3 text-xs font-black text-blue-700">{fmt(it.valorTotal)}</td>
                                                <td className="px-4 py-3">
                                                    <button onClick={() => handleRemoveItem(it.id)} className="p-1 hover:text-red-500 text-slate-300 transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        
                                        {showItemForm ? (
                                            <tr className="bg-blue-50/30">
                                                <td className="px-4 py-2">
                                                    <input 
                                                        placeholder="Descrição do serviço..."
                                                        className="w-full bg-white border border-blue-200 rounded p-1.5 text-xs font-bold outline-none focus:border-blue-500"
                                                        value={itemForm.descricao}
                                                        onChange={e => setItemForm({...itemForm, descricao: e.target.value})}
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input 
                                                        type="number"
                                                        placeholder="0,00"
                                                        className="w-full bg-white border border-blue-200 rounded p-1.5 text-xs font-bold outline-none focus:border-blue-500"
                                                        value={itemForm.valorUnitario}
                                                        onChange={e => setItemForm({...itemForm, valorUnitario: e.target.value})}
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input 
                                                        type="number"
                                                        placeholder="1"
                                                        className="w-full bg-white border border-blue-200 rounded p-1.5 text-xs font-bold outline-none focus:border-blue-500"
                                                        value={itemForm.quantidade}
                                                        onChange={e => setItemForm({...itemForm, quantidade: e.target.value})}
                                                    />
                                                </td>
                                                <td className="px-4 py-2"></td>
                                                <td className="px-4 py-2 flex items-center gap-2">
                                                    <button onClick={handleAddItem} className="bg-blue-600 text-white p-1.5 rounded hover:bg-blue-700"><Plus className="w-4 h-4" /></button>
                                                    <button onClick={() => setShowItemForm(false)} className="text-slate-400 hover:text-slate-600 p-1.5"><X className="w-4 h-4" /></button>
                                                </td>
                                            </tr>
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-2">
                                                    <button 
                                                        onClick={() => setShowItemForm(true)}
                                                        className="text-[10px] font-black text-blue-600 flex items-center gap-1.5 hover:bg-blue-50 px-2 py-1 rounded transition-colors uppercase"
                                                    >
                                                        <Plus className="w-3 h-3" /> Adicionar Novo Item
                                                    </button>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Adjustments & Summary */}
                        <div className="grid grid-cols-2 gap-8 pt-4">
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <Input 
                                        label="Adicionar Desconto" 
                                        value={valorDesconto} 
                                        onChange={(e: any) => setValorDesconto(e.target.value)} 
                                        type="number"
                                        placeholder="0,00"
                                    />
                                    <Input 
                                        label="Adicionar Valor Extra" 
                                        value={valorAdicional} 
                                        onChange={(e: any) => setValorAdicional(e.target.value)} 
                                        type="number"
                                        placeholder="0,00"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase block">Observação</label>
                                    <textarea 
                                        rows={4}
                                        value={observacao}
                                        onChange={e => setObservacao(e.target.value)}
                                        placeholder="Observações da precificação..."
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-500 transition-all resize-none"
                                    />
                                </div>
                            </div>

                            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-4">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                                        <span className="uppercase tracking-wide">Total por serviço</span>
                                        <span>{fmt(totalServico)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                                        <span className="uppercase tracking-wide">Total por hora</span>
                                        <span>{fmt(totalHora)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                                        <span className="uppercase tracking-wide">Adicional extra</span>
                                        <span className="text-emerald-600">+{fmt(valorAdicional)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                                        <span className="uppercase tracking-wide">Descontos</span>
                                        <span className="text-red-500">-{fmt(valorDesconto)}</span>
                                    </div>
                                </div>
                                
                                <div className="h-px bg-slate-200" />

                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-black text-slate-700 uppercase tracking-widest">Valor total do serviço</span>
                                    <span className="text-2xl font-black text-blue-800">{fmt(grandTotal)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Footer Buttons */}
                        <div className="flex justify-end gap-3 pt-6">
                            <button 
                                onClick={onClose}
                                className="px-6 py-2.5 text-xs font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleFinalize}
                                disabled={submitting}
                                className="px-10 py-2.5 bg-[#1e3a5f] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-900 transition-all shadow-lg shadow-blue-900/20 flex items-center gap-2"
                            >
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                                Precificar
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
