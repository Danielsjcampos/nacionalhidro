import React, { useState } from 'react';
import { X, Calculator, Loader2, FileText } from 'lucide-react';
import api from '../services/api';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    osList: any[];
    onSuccess: () => void;
}

export default function ModalPrecificacaoLote({ isOpen, onClose, osList, onSuccess }: Props) {
    const [submitting, setSubmitting] = useState(false);
    const [valorTotalLote, setValorTotalLote] = useState('');
    const [descricaoItem, setDescricaoItem] = useState('');

    const handleFinalize = async () => {
        if (!valorTotalLote || isNaN(parseFloat(valorTotalLote))) {
            alert('Insira um valor total válido para o lote.');
            return;
        }

        setSubmitting(true);
        try {
            await api.post(`/precificacao/lote`, {
                osIds: osList.map(os => os.id),
                valorTotalLote: parseFloat(valorTotalLote),
                descricaoItem
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            alert('Erro ao precificar em lote: ' + (err.response?.data?.error || err.message));
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const valorFracionado = valorTotalLote && !isNaN(parseFloat(valorTotalLote)) 
        ? parseFloat(valorTotalLote) / osList.length 
        : 0;

    const fmt = (v: any) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-[#1e3a5f] px-6 py-4 flex items-center justify-between text-white">
                    <div className="flex items-center gap-3">
                        <Calculator className="w-5 h-5 text-emerald-400" />
                        <div>
                            <h2 className="font-black uppercase tracking-widest text-sm">Precificação em Lote</h2>
                            <p className="text-[10px] text-white/60 font-bold uppercase tracking-tight">Fracionar valor da proposta</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                        <p className="text-xs font-bold text-slate-500">
                            Você selecionou <strong className="text-blue-700">{osList.length}</strong> ordens de serviço. 
                            O valor total informado será dividido igualmente entre elas.
                        </p>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase">Valor Total do Lote (R$)</label>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    value={valorTotalLote}
                                    onChange={e => setValorTotalLote(e.target.value)}
                                    placeholder="Ex: 100000.00"
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-blue-500"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase">Descrição do Item</label>
                                <input 
                                    type="text" 
                                    value={descricaoItem}
                                    onChange={e => setDescricaoItem(e.target.value)}
                                    placeholder="Ex: Serviço ref. à Proposta X (Parcela)"
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>

                        {valorFracionado > 0 && (
                            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex justify-between items-center">
                                <span className="text-xs font-black text-blue-800 uppercase">Valor Fracionado por OS</span>
                                <span className="text-lg font-black text-emerald-600">{fmt(valorFracionado)}</span>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase">OSs Selecionadas</h3>
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase">CÓDIGO OS</th>
                                        <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase">CLIENTE</th>
                                        <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase">PROPOSTA</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {osList.map((os) => (
                                        <tr key={os.id} className="text-xs font-bold text-slate-600">
                                            <td className="px-4 py-2 uppercase">{os.codigo}</td>
                                            <td className="px-4 py-2 uppercase">{os.cliente?.nome || '-'}</td>
                                            <td className="px-4 py-2 uppercase">{os.proposta?.codigo || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 p-6 bg-slate-50 border-t border-slate-200">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2.5 text-xs font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleFinalize}
                        disabled={submitting || osList.length === 0}
                        className="px-10 py-2.5 bg-[#1e3a5f] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-900 transition-all shadow-lg shadow-blue-900/20 flex items-center gap-2 disabled:opacity-50"
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                        Precificar Lote
                    </button>
                </div>
            </div>
        </div>
    );
}
