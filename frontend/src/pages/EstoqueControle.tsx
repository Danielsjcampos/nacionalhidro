import { useEffect, useState } from 'react';
import api from '../services/api';
import { useForm } from 'react-hook-form';
import {
    Plus, Search, ArrowUpCircle, AlertTriangle, MoreHorizontal,
    X, Loader2, MapPin, Factory, Ruler, Filter, Package
} from 'lucide-react';

const CATEGORIAS = [
  { value: '', label: 'Todas' },
  { value: 'ELETRICO', label: 'Elétrico' },
  { value: 'MECANICO', label: 'Mecânico' },
  { value: 'HIDRAULICO', label: 'Hidráulico' },
  { value: 'CONSUMIVEL', label: 'Consumível' },
  { value: 'OUTROS', label: 'Outros' },
];

const ProductForm = ({ onClose, onSave, editItem }: { onClose: () => void, onSave: (data: any) => Promise<void>, editItem?: any }) => {
    const { register, handleSubmit } = useForm({ defaultValues: editItem || {} });
    const inputClass = "w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all italic";
    const labelClass = "block text-[10px] font-black text-slate-400 uppercase italic mb-1 tracking-widest";

    return (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95">
                <div className="p-6 bg-blue-600 border-b border-blue-700 flex justify-between items-center italic">
                    <h2 className="text-sm font-black text-white uppercase tracking-widest">
                        {editItem ? 'Editar Produto' : 'Novo Produto em Estoque'}
                    </h2>
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
                            <input {...register('sku')} className={inputClass} placeholder="Ex: C2-P10-001" />
                        </div>
                        <div>
                            <label className={labelClass}>Categoria</label>
                            <select {...register('categoria')} className={inputClass}>
                                <option value="">Selecione...</option>
                                <option value="ELETRICO">Elétrico</option>
                                <option value="MECANICO">Mecânico</option>
                                <option value="HIDRAULICO">Hidráulico</option>
                                <option value="CONSUMIVEL">Consumível</option>
                                <option value="OUTROS">Outros</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Fabricante</label>
                            <input {...register('fabricante')} className={inputClass} placeholder="Ex: Parker, Gates..." />
                        </div>
                        <div>
                            <label className={labelClass}>Medida / Dimensão</label>
                            <input {...register('medida')} className={inputClass} placeholder="Ex: 1/2&quot;, 3mm, 10m" />
                        </div>
                        <div>
                            <label className={labelClass}>Localização (Endereçamento)</label>
                            <input {...register('localizacao')} className={inputClass} placeholder="Ex: C2-P10 (Corredor 2, Prat. 10)" />
                        </div>
                        <div>
                            <label className={labelClass}>Unidade de Medida</label>
                            <select {...register('unidadeMedida')} className={inputClass}>
                                <option value="UN">Unidade (UN)</option>
                                <option value="KG">Quilos (KG)</option>
                                <option value="M">Metros (M)</option>
                                <option value="L">Litros (L)</option>
                                <option value="PC">Peça (PC)</option>
                                <option value="CX">Caixa (CX)</option>
                                <option value="RL">Rolo (RL)</option>
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
                            <input type="number" step="0.001" {...register('estoqueAtual')} className={inputClass} defaultValue={0} />
                        </div>
                        <div>
                            <label className={labelClass}>Estoque Mínimo (Aviso)</label>
                            <input type="number" step="0.001" {...register('estoqueMinimo')} className={inputClass} defaultValue={0} />
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
    const { register, handleSubmit, setValue, watch } = useForm();
    const [barcode, setBarcode] = useState('');
    const selectedProdutoId = watch('produtoId');
    const selectedProduto = produtos.find(p => p.id === selectedProdutoId);

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

                    {selectedProduto && (
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-4">
                            <Package className="w-8 h-8 text-blue-500" />
                            <div>
                                <p className="font-black text-blue-800 text-sm uppercase">{selectedProduto.nome}</p>
                                <p className="text-[10px] text-blue-600 font-bold">
                                    Estoque: {Number(selectedProduto.estoqueAtual).toFixed(selectedProduto.unidadeMedida === 'M' ? 1 : 0)} {selectedProduto.unidadeMedida}
                                    {selectedProduto.localizacao && ` • Local: ${selectedProduto.localizacao}`}
                                    {selectedProduto.fabricante && ` • ${selectedProduto.fabricante}`}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-2">
                            <label className={labelClass}>Produto Relacionado</label>
                            <select {...register('produtoId', { required: true })} className={inputClass}>
                                <option value="">Selecione manualmente ou use o Bip...</option>
                                {produtos.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.nome} (Atual: {Number(p.estoqueAtual).toFixed(p.unidadeMedida === 'M' ? 1 : 0)} {p.unidadeMedida})
                                        {p.localizacao ? ` [${p.localizacao}]` : ''}
                                    </option>
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
                            <input type="number" step="0.001" {...register('quantidade', { required: true, min: 0.001 })} className={inputClass} min="0.001" defaultValue={1} />
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
    const [editItem, setEditItem] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategoria, setFilterCategoria] = useState('');

    const fetchEstoque = async () => {
        try {
            setLoading(true);
            const params: any = {};
            if (searchTerm) params.search = searchTerm;
            if (filterCategoria) params.categoria = filterCategoria;
            const response = await api.get('/estoque', { params });
            setList(response.data);
        } catch (err) {
            console.error('Failed to fetch stock', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEstoque();
    }, [filterCategoria]);

    useEffect(() => {
        const timer = setTimeout(() => { fetchEstoque(); }, 400);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleDelete = async (id: string) => {
        if (!window.confirm('Remover este produto do estoque?')) return;
        try {
            await api.delete(`/estoque/${id}`);
            fetchEstoque();
        } catch (err) {
            console.error('Delete error', err);
        }
    };

    if (loading && !list.length) return (
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
                        onClick={() => { setEditItem(null); setShowProductForm(true); }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-xl shadow-blue-500/20 text-[10px] font-black uppercase italic tracking-widest"
                    >
                        <Plus className="w-5 h-5" /> Novo Produto
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm group hover:border-blue-200 transition-all">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mb-2">Total de Itens</p>
                    <h3 className="text-3xl font-black text-slate-800 italic">{list.length}</h3>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm group hover:border-blue-200 transition-all">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mb-2">Unidades em Estoque</p>
                    <h3 className="text-3xl font-black text-slate-800 italic">{list.reduce((acc, curr) => acc + Number(curr.estoqueAtual), 0).toFixed(1)}</h3>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm group hover:border-red-200 transition-all">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mb-2">Pendências de Reposição</p>
                    <h3 className="text-3xl font-black text-red-600 italic">{list.filter(p => Number(p.estoqueAtual) <= Number(p.estoqueMinimo) && Number(p.estoqueMinimo) > 0).length}</h3>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm group hover:border-emerald-200 transition-all">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mb-2">Avaliação de Patrimônio</p>
                    <h3 className="text-2xl font-black text-slate-800 italic">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                            list.reduce((acc, curr) => acc + (Number(curr.estoqueAtual) * Number(curr.precoCusto)), 0)
                        )}
                    </h3>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30 gap-4">
                    <div className="relative w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar por SKU, Nome, Fabricante, Local..."
                            className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-11 pr-4 text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all italic"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-400" />
                        <select 
                            value={filterCategoria}
                            onChange={(e) => setFilterCategoria(e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl py-2 px-4 text-xs font-bold text-slate-600 outline-none focus:ring-4 focus:ring-blue-500/10 italic"
                        >
                            {CATEGORIAS.map(c => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">
                                <th className="px-6 py-5">Identificação / SKU</th>
                                <th className="px-6 py-5">Categoria / Fabricante</th>
                                <th className="px-6 py-5">Localização</th>
                                <th className="px-6 py-5">Saldo em Estoque</th>
                                <th className="px-6 py-5">Custo Unit.</th>
                                <th className="px-6 py-5">Status</th>
                                <th className="px-6 py-5 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 italic">
                            {list.map((item) => {
                                const atual = Number(item.estoqueAtual);
                                const minimo = Number(item.estoqueMinimo);
                                const isMetros = item.unidadeMedida === 'M';
                                const isBaixo = minimo > 0 && atual <= minimo;
                                return (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <p className="font-black text-slate-800 uppercase tracking-tighter text-sm leading-none">{item.nome}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.sku || 'SEM SKU'}</p>
                                            {item.medida && (
                                                <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">
                                                    <Ruler className="w-2.5 h-2.5 inline mr-0.5" />{item.medida}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            {item.categoria && (
                                                <span className="text-[9px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded w-fit uppercase">{item.categoria}</span>
                                            )}
                                            {item.fabricante && (
                                                <span className="text-[9px] font-bold text-slate-500 flex items-center gap-1">
                                                    <Factory className="w-2.5 h-2.5" />{item.fabricante}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {item.localizacao ? (
                                            <span className="text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-100 px-2 py-1 rounded-lg flex items-center gap-1 w-fit">
                                                <MapPin className="w-3 h-3" />{item.localizacao}
                                            </span>
                                        ) : (
                                            <span className="text-[9px] text-slate-300 italic">—</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 uppercase font-black tracking-widest text-[11px]">
                                        <div className="flex items-center gap-2">
                                            <span className={isBaixo ? 'text-red-600' : 'text-slate-800'}>
                                                {isMetros ? atual.toFixed(1) : atual.toFixed(0)}
                                            </span>
                                            <span className="text-slate-400 opacity-60 text-[9px]">{item.unidadeMedida}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-slate-600 text-xs">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.precoCusto))}
                                    </td>
                                    <td className="px-6 py-4">
                                        {isBaixo ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[9px] font-black bg-red-100 text-red-700 uppercase tracking-tighter">
                                                <AlertTriangle className="w-3 h-3" />
                                                Reposição
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[9px] font-black bg-emerald-100 text-emerald-700 uppercase tracking-tighter">
                                                Operacional
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                            <button 
                                                onClick={() => { setEditItem(item); setShowProductForm(true); }}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all text-[9px] font-black"
                                                title="Editar"
                                            >
                                                ✏️
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(item.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all text-[9px] font-black"
                                                title="Excluir"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );})}
                        </tbody>
                    </table>

                    {list.length === 0 && !loading && (
                        <div className="text-center py-16">
                            <Package className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                            <p className="text-sm text-slate-400 font-bold italic">Nenhum produto encontrado</p>
                            <p className="text-xs text-slate-300 mt-1">Cadastre o primeiro produto clicando em "Novo Produto"</p>
                        </div>
                    )}
                </div>
            </div>

            {showProductForm && (
                <ProductForm 
                    editItem={editItem}
                    onClose={() => { setShowProductForm(false); setEditItem(null); }} 
                    onSave={async (data) => {
                        if (editItem) {
                            await api.patch(`/estoque/${editItem.id}`, data);
                        } else {
                            await api.post('/estoque', data);
                        }
                        setShowProductForm(false);
                        setEditItem(null);
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
