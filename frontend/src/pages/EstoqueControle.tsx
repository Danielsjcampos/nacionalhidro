import { useEffect, useState } from 'react';
import api from '../services/api';
import { useForm } from 'react-hook-form';
import {
    Plus, Search, ArrowUpCircle, AlertTriangle, MoreHorizontal,
    X, Loader2
} from 'lucide-react';

const ProductForm = ({ onClose, onSave }: { onClose: () => void, onSave: (data: any) => Promise<void> }) => {
    const { register, handleSubmit } = useForm();
    const inputClass = "w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all italic";
    const labelClass = "block text-[10px] font-black text-slate-400 uppercase italic mb-1 tracking-widest";

    return (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95">
                <div className="p-6 bg-blue-600 border-b border-blue-700 flex justify-between items-center italic">
                    <h2 className="text-sm font-black text-white uppercase tracking-widest">Novo Produto em Estoque</h2>
                    <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSubmit(onSave)} className="p-8 space-y-6 bg-slate-50/50">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-2">
                            <label className={labelClass}>Nome do Produto / Insumo</label>
                            <input {...register('nome', { required: true })} className={inputClass} placeholder="Ex: Bobina de Sucção 10m" />
                        </div>
                        <div>
                            <label className={labelClass}>SKU / Código Interno</label>
                            <input {...register('sku')} className={inputClass} placeholder="Bipe o código aqui..." />
                        </div>
                        <div>
                            <label className={labelClass}>Unidade de Medida</label>
                            <select {...register('unidadeMedida')} className={inputClass}>
                                <option value="UN">Unidade (UN)</option>
                                <option value="KG">Quilos (KG)</option>
                                <option value="M">Metros (M)</option>
                                <option value="L">Litros (L)</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Preço de Custo (R$)</label>
                            <input type="number" step="0.01" {...register('precoCusto')} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Preço de Venda (R$)</label>
                            <input type="number" step="0.01" {...register('precoVenda')} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Qtd. Inicial</label>
                            <input type="number" {...register('estoqueAtual')} className={inputClass} defaultValue={0} />
                        </div>
                        <div>
                            <label className={labelClass}>Estoque Mínimo (Aviso)</label>
                            <input type="number" {...register('estoqueMinimo')} className={inputClass} defaultValue={0} />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
                        <button type="button" onClick={onClose} className="px-8 py-3 rounded-2xl bg-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-slate-300 transition-all italic">Cancelar</button>
                        <button type="submit" className="px-8 py-3 rounded-2xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 italic">Salvar Produto</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const MovimentacaoForm = ({ produtos, onClose, onSave }: { produtos: any[], onClose: () => void, onSave: (data: any, produtoId: string) => Promise<void> }) => {
    const { register, handleSubmit, setValue } = useForm();
    const [barcode, setBarcode] = useState('');

    const inputClass = "w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all italic";
    const labelClass = "block text-[10px] font-black text-slate-400 uppercase italic mb-1 tracking-widest";

    const handleBarcodeSearch = (val: string) => {
        setBarcode(val);
        const prod = produtos.find(p => p.sku === val);
        if (prod) {
            setValue('produtoId', prod.id);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95">
                <div className="p-6 bg-emerald-600 border-b border-emerald-700 flex justify-between items-center italic">
                    <h2 className="text-sm font-black text-white uppercase tracking-widest">Movimentação de Estoque</h2>
                    <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <form 
                    onSubmit={handleSubmit(data => onSave({
                        quantidade: Number(data.quantidade),
                        tipo: data.tipo,
                        motivo: data.motivo
                    }, data.produtoId))} 
                    className="p-8 space-y-6 bg-slate-50/50"
                >
                    <div className="bg-white p-6 rounded-2xl border-2 border-dashed border-emerald-200 flex items-start gap-4">
                        <div className="p-3 bg-emerald-50 rounded-xl"><Search className="w-6 h-6 text-emerald-600" /></div>
                        <div className="flex-1">
                            <label className="text-[10px] font-black text-emerald-800 uppercase italic tracking-widest">Leitor BIP (Scanner)</label>
                            <input 
                                type="text"
                                autoFocus
                                value={barcode}
                                onChange={(e) => handleBarcodeSearch(e.target.value)}
                                placeholder="Bipe o código do produto..."
                                className="mt-2 w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-lg font-black text-slate-800 outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all font-mono"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-2">
                            <label className={labelClass}>Produto Relacionado</label>
                            <select {...register('produtoId', { required: true })} className={inputClass}>
                                <option value="">Selecione manualmente ou use o Bip...</option>
                                {produtos.map(p => (
                                    <option key={p.id} value={p.id}>{p.nome} (Atual: {p.estoqueAtual} {p.unidadeMedida})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Operação</label>
                            <select {...register('tipo', { required: true })} className={inputClass}>
                                <option value="ENTRADA">ENTRADA (Aporte)</option>
                                <option value="SAIDA">SAÍDA (Baixa)</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Quantidade</label>
                            <input type="number" {...register('quantidade', { required: true, min: 1 })} className={inputClass} min="1" defaultValue={1} />
                        </div>
                        <div className="col-span-2">
                            <label className={labelClass}>Justificativa / Motivo</label>
                            <input {...register('motivo', { required: true })} className={inputClass} placeholder="Ex: Uso em campo, Reposição de fornecedor..." />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
                        <button type="button" onClick={onClose} className="px-8 py-3 rounded-2xl bg-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-slate-300 transition-all italic">Cancelar</button>
                        <button type="submit" className="px-8 py-3 rounded-2xl bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 italic">Efetivar Baixa/Entrada</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default function EstoqueControle() {
    const [list, setList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showProductForm, setShowProductForm] = useState(false);
    const [showMovimentacaoForm, setShowMovimentacaoForm] = useState(false);

    const fetchEstoque = async () => {
        try {
            setLoading(true);
            const response = await api.get('/estoque');
            setList(response.data);
        } catch (err) {
            console.error('Failed to fetch stock', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEstoque();
    }, []);

    if (loading) return (
        <div className="h-full flex flex-col items-center justify-center italic text-slate-400 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            <span className="font-black text-[10px] uppercase tracking-widest">Sincronizando Inventário...</span>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-end justify-between">
                <div>
                   <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter italic leading-none">Administração | Controle de Estoque</h1>
                   <p className="text-xs text-slate-400 font-bold uppercase italic tracking-widest mt-2">Monitoramento de ativos, insumos e movimentações de almoxarifado</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setShowMovimentacaoForm(true)}
                        className="bg-white border-2 border-emerald-100 hover:border-emerald-200 text-emerald-700 px-6 py-3 rounded-2xl flex items-center gap-2 transition-all text-[10px] font-black uppercase italic tracking-widest shadow-sm"
                    >
                        <ArrowUpCircle className="w-5 h-5" /> Movimentação (BIP)
                    </button>
                    <button 
                        onClick={() => setShowProductForm(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-xl shadow-blue-500/20 text-[10px] font-black uppercase italic tracking-widest"
                    >
                        <Plus className="w-5 h-5" /> Novo Produto
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm group hover:border-blue-200 transition-all">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mb-2">Total de Unidades</p>
                    <h3 className="text-3xl font-black text-slate-800 italic">{list.reduce((acc, curr) => acc + curr.estoqueAtual, 0)}</h3>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm group hover:border-red-200 transition-all">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mb-2">Pendências de Reposição</p>
                    <h3 className="text-3xl font-black text-red-600 italic">{list.filter(p => p.estoqueAtual <= p.estoqueMinimo).length}</h3>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm group hover:border-emerald-200 transition-all">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mb-2">Avaliação de Patrimônio</p>
                    <h3 className="text-3xl font-black text-slate-800 italic">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                            list.reduce((acc, curr) => acc + (curr.estoqueAtual * curr.precoCusto), 0)
                        )}
                    </h3>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                    <div className="relative w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar por SKU ou Nome..."
                            className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-11 pr-4 text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all italic"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">
                                <th className="px-8 py-5">Identificação / SKU</th>
                                <th className="px-8 py-5">Saldo em Estoque</th>
                                <th className="px-8 py-5">Preço (Venda)</th>
                                <th className="px-8 py-5">Status Crítico</th>
                                <th className="px-8 py-5 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 italic">
                            {list.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-5">
                                        <p className="font-black text-slate-800 uppercase tracking-tighter text-sm leading-none">{item.nome}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest">{item.sku || 'SEM SKU'}</p>
                                    </td>
                                    <td className="px-8 py-5 uppercase font-black tracking-widest text-[10px]">
                                        <div className="flex items-center gap-2">
                                            <span className={`${item.estoqueAtual <= item.estoqueMinimo ? 'text-red-600' : 'text-slate-800'}`}>
                                                {item.estoqueAtual}
                                            </span>
                                            <span className="text-slate-400 opacity-60">{item.unidadeMedida}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 font-bold text-slate-600 text-xs">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.precoVenda)}
                                    </td>
                                    <td className="px-8 py-5">
                                        {item.estoqueAtual <= item.estoqueMinimo ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[9px] font-black bg-red-100 text-red-700 uppercase tracking-tighter">
                                                <AlertTriangle className="w-3 h-3" />
                                                Reposição Imediata
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[9px] font-black bg-emerald-100 text-emerald-700 uppercase tracking-tighter">
                                                Operacional
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <button className="p-2 text-slate-300 hover:text-slate-600 hover:bg-white rounded-xl border border-transparent transition-all">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showProductForm && (
                <ProductForm 
                    onClose={() => setShowProductForm(false)} 
                    onSave={async (data) => {
                        await api.post('/estoque', data);
                        setShowProductForm(false);
                        fetchEstoque();
                    }} 
                />
            )}

            {showMovimentacaoForm && (
                <MovimentacaoForm 
                    produtos={list}
                    onClose={() => setShowMovimentacaoForm(false)} 
                    onSave={async (data, produtoId) => {
                        await api.post(`/estoque/${produtoId}/movimentacao`, data);
                        setShowMovimentacaoForm(false);
                        fetchEstoque();
                    }} 
                />
            )}
        </div>
    );
};
