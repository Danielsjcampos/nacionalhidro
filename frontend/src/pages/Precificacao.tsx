import { useEffect, useState } from 'react';
import api from '../services/api';
import {
    Search, Plus, Trash2, CheckCircle2, Clock, AlertTriangle,
    Loader2, X, FileText, Package, Calculator, Save, Zap
} from 'lucide-react';

interface ItemCobranca {
    id: string;
    descricao: string;
    quantidade: number;
    valorUnitario: number;
    percentualAdicional: number | null;
    valorTotal: number;
}

export default function Precificacao() {
    const [kanban, setKanban] = useState<any>({ EM_ABERTO: [], PRECIFICADAS: [], EM_NEGOCIACAO: [] });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedOS, setSelectedOS] = useState<any>(null);

    // Item form
    const [itemForm, setItemForm] = useState({
        descricao: '', quantidade: '', valorUnitario: '', percentualAdicional: ''
    });
    const [showItemForm, setShowItemForm] = useState(false);

    // Auto-calc
    const [showAutoCalc, setShowAutoCalc] = useState(false);
    const [autoCalcForm, setAutoCalcForm] = useState({ valorDiaria: '', valorHora: '', toleranciaHoras: '' });
    const [calculo, setCalculo] = useState<any>(null);

    const fetchKanban = async () => {
        try {
            const params: any = {};
            if (search) params.search = search;
            const res = await api.get('/precificacao', { params });
            setKanban(res.data.kanban);
        } catch (err) {
            console.error('Failed to fetch precificacao', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchKanban(); }, [search]);

    const openOS = async (os: any) => {
        try {
            const res = await api.get(`/precificacao/${os.id}`);
            setSelectedOS(res.data);
        } catch (err) {
            console.error('Failed to fetch OS detail', err);
        }
    };

    const handleAddItem = async () => {
        if (!selectedOS) return;
        try {
            await api.post(`/precificacao/${selectedOS.id}/itens`, {
                descricao: itemForm.descricao,
                quantidade: parseFloat(itemForm.quantidade),
                valorUnitario: parseFloat(itemForm.valorUnitario),
                percentualAdicional: itemForm.percentualAdicional ? parseFloat(itemForm.percentualAdicional) : null
            });
            setItemForm({ descricao: '', quantidade: '', valorUnitario: '', percentualAdicional: '' });
            setShowItemForm(false);
            const res = await api.get(`/precificacao/${selectedOS.id}`);
            setSelectedOS(res.data);
            fetchKanban();
        } catch (err) {
            console.error('Failed to add item', err);
        }
    };

    const handleRemoveItem = async (itemId: string) => {
        if (!selectedOS) return;
        try {
            await api.delete(`/precificacao/${selectedOS.id}/itens/${itemId}`);
            const res = await api.get(`/precificacao/${selectedOS.id}`);
            setSelectedOS(res.data);
            fetchKanban();
        } catch (err) {
            console.error('Failed to remove item', err);
        }
    };

    const handlePrecificar = async () => {
        if (!selectedOS) return;
        try {
            await api.post(`/precificacao/${selectedOS.id}/precificar`);
            setSelectedOS(null);
            setCalculo(null);
            fetchKanban();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Erro ao precificar');
        }
    };

    const handleAutoCalcular = async () => {
        if (!selectedOS) return;
        try {
            const res = await api.post(`/precificacao/${selectedOS.id}/auto-calcular`, {
                valorDiaria: autoCalcForm.valorDiaria ? parseFloat(autoCalcForm.valorDiaria) : null,
                valorHora: autoCalcForm.valorHora ? parseFloat(autoCalcForm.valorHora) : null,
                toleranciaHoras: autoCalcForm.toleranciaHoras ? parseFloat(autoCalcForm.toleranciaHoras) : null,
            });
            setSelectedOS(res.data.os);
            setCalculo(res.data.calculo);
            setShowAutoCalc(false);
            fetchKanban();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Erro ao calcular automaticamente');
        }
    };

    const columns = [
        { key: 'EM_ABERTO', label: 'Em Aberto', color: 'border-blue-400', bg: 'bg-blue-50', icon: Clock, iconColor: 'text-blue-500' },
        { key: 'PRECIFICADAS', label: 'Precificadas', color: 'border-emerald-400', bg: 'bg-emerald-50', icon: CheckCircle2, iconColor: 'text-emerald-500' },
        { key: 'EM_NEGOCIACAO', label: 'Em Negociação', color: 'border-slate-400', bg: 'bg-slate-50', icon: AlertTriangle, iconColor: 'text-slate-500' },
    ];

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Precificação</h1>
                    <p className="text-sm text-slate-500">Pipeline de precificação de OS baixadas</p>
                </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-4">
                <div className="flex-1 relative max-w-md">
                    <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Buscar por código ou cliente..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm font-medium"
                    />
                </div>
            </div>

            {/* Kanban + Detail */}
            <div className="flex gap-6 flex-1 min-h-0">
                {/* Kanban Columns */}
                <div className={`flex gap-4 ${selectedOS ? 'w-1/2' : 'w-full'} transition-all overflow-x-auto`}>
                    {columns.map((col) => (
                        <div key={col.key} className="flex-1 min-w-[250px] flex flex-col">
                            {/* Column Header */}
                            <div className={`${col.bg} border-t-4 ${col.color} rounded-t-xl p-3 flex items-center justify-between`}>
                                <div className="flex items-center gap-2">
                                    <col.icon className={`w-4 h-4 ${col.iconColor}`} />
                                    <span className="text-xs font-black text-slate-700 uppercase">{col.label}</span>
                                </div>
                                <span className="text-xs font-black text-slate-500 bg-white px-2 py-0.5 rounded-full">
                                    {kanban[col.key]?.length || 0}
                                </span>
                            </div>

                            {/* Cards */}
                            <div className="flex-1 bg-slate-50/50 rounded-b-xl p-2 space-y-2 overflow-y-auto border border-slate-200 border-t-0">
                                {(kanban[col.key] || []).length === 0 ? (
                                    <p className="text-center text-slate-400 text-xs py-8 italic">Nenhuma OS</p>
                                ) : (
                                    (kanban[col.key] || []).map((os: any) => (
                                        <div
                                            key={os.id}
                                            onClick={() => openOS(os)}
                                            className={`bg-white rounded-lg p-3 border border-slate-200 cursor-pointer hover:shadow-md transition-all ${selectedOS?.id === os.id ? 'ring-2 ring-blue-500 shadow-md' : ''
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-black text-blue-600">{os.codigo}</span>
                                                {os.valorPrecificado && (
                                                    <span className="text-xs font-bold text-emerald-600">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(os.valorPrecificado)}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm font-bold text-slate-700 truncate">{os.cliente?.nome}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] text-slate-400">
                                                    {os.dataBaixa ? new Date(os.dataBaixa).toLocaleDateString('pt-BR') : 'Sem baixa'}
                                                </span>
                                                {os.itensCobranca?.length > 0 && (
                                                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                                        {os.itensCobranca.length} itens
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Detail Panel */}
                {selectedOS && (
                    <div className="w-1/2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="bg-slate-800 text-white p-5 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-blue-400" />
                                    OS {selectedOS.codigo}
                                </h3>
                                <p className="text-xs text-slate-400">{selectedOS.cliente?.nome}</p>
                            </div>
                            <button onClick={() => setSelectedOS(null)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* OS Info */}
                        <div className="p-4 border-b border-slate-100 grid grid-cols-3 gap-3">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase">Baixa</p>
                                <p className="text-sm font-bold text-slate-700">
                                    {selectedOS.dataBaixa ? new Date(selectedOS.dataBaixa).toLocaleDateString('pt-BR') : '—'}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase">Horas</p>
                                <p className="text-sm font-bold text-slate-700">{selectedOS.horasTotais || '—'}h</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase">Tipo Cobrança</p>
                                <p className="text-sm font-bold text-slate-700">{selectedOS.tipoCobranca || '—'}</p>
                            </div>
                        </div>

                        {/* Itens de Cobrança */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-black text-slate-500 uppercase flex items-center gap-1">
                                    <Package className="w-3.5 h-3.5" /> Itens de Cobrança
                                </h4>
                                <div className="flex gap-1.5">
                                    {selectedOS.entrada && selectedOS.saida && (
                                        <button
                                            onClick={() => setShowAutoCalc(true)}
                                            className="bg-blue-600 text-white px-3 py-1 rounded text-[10px] font-black uppercase hover:bg-blue-700 flex items-center gap-1"
                                        >
                                            <Zap className="w-3 h-3" /> Auto Calcular
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setShowItemForm(true)}
                                        className="bg-blue-600 text-white px-3 py-1 rounded text-[10px] font-black uppercase hover:bg-blue-700 flex items-center gap-1"
                                    >
                                        <Plus className="w-3 h-3" /> Manual
                                    </button>
                                </div>
                            </div>

                            {/* Auto-calc result summary */}
                            {calculo && (
                                <div className="bg-gradient-to-r from-blue-50 to-slate-50 border border-blue-200 rounded-xl p-3 space-y-1">
                                    <p className="text-[10px] font-black text-blue-700 uppercase flex items-center gap-1">
                                        <Zap className="w-3 h-3" /> Cálculo Automático
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="text-[10px] bg-white px-2 py-0.5 rounded font-bold text-slate-600">
                                            ⏱ {calculo.horasTrabalhadas}h trabalhadas
                                        </span>
                                        {calculo.horasExcedentes > 0 && (
                                            <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded font-bold text-slate-800">
                                                +{calculo.horasExcedentes}h extras
                                            </span>
                                        )}
                                        {calculo.horasNoturnas > 0 && (
                                            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">
                                                🌙 {calculo.horasNoturnas}h noturnas
                                            </span>
                                        )}
                                        {calculo.isFDS && (
                                            <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-700">
                                                📅 FDS
                                            </span>
                                        )}
                                        <span className="text-[10px] bg-emerald-100 px-2 py-0.5 rounded font-bold text-emerald-700">
                                            {calculo.itensGerados} itens gerados
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Auto-calc modal */}
                            {showAutoCalc && (
                                <div className="bg-gradient-to-br from-blue-50 to-slate-50 border border-blue-300 rounded-xl p-4 space-y-3">
                                    <p className="text-xs font-black text-blue-700 uppercase flex items-center gap-1">
                                        <Zap className="w-3.5 h-3.5" /> Cálculo Automático de Itens
                                    </p>
                                    <p className="text-[10px] text-slate-500">
                                        Informe os valores da proposta. O sistema calcula automaticamente: diária/horas, hora extra, adicional noturno e FDS.
                                    </p>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-500 uppercase">Valor Diária (R$)</label>
                                            <input
                                                type="number" step="0.01"
                                                value={autoCalcForm.valorDiaria}
                                                onChange={(e) => setAutoCalcForm({ ...autoCalcForm, valorDiaria: e.target.value })}
                                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold"
                                                placeholder="0,00"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-500 uppercase">Valor Hora (R$)</label>
                                            <input
                                                type="number" step="0.01"
                                                value={autoCalcForm.valorHora}
                                                onChange={(e) => setAutoCalcForm({ ...autoCalcForm, valorHora: e.target.value })}
                                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold"
                                                placeholder="0,00"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-500 uppercase">Tolerância (h)</label>
                                            <input
                                                type="number" step="0.5"
                                                value={autoCalcForm.toleranciaHoras}
                                                onChange={(e) => setAutoCalcForm({ ...autoCalcForm, toleranciaHoras: e.target.value })}
                                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleAutoCalcular}
                                            disabled={!autoCalcForm.valorDiaria && !autoCalcForm.valorHora}
                                            className="bg-blue-600 text-white px-4 py-1.5 rounded text-[10px] font-black uppercase hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50"
                                        >
                                            <Zap className="w-3 h-3" /> Calcular
                                        </button>
                                        <button onClick={() => setShowAutoCalc(false)} className="text-slate-500 px-3 py-1.5 text-[10px] font-bold uppercase">
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            )}

                            {showItemForm && (
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="col-span-2 space-y-1">
                                            <label className="text-[10px] font-black text-slate-500 uppercase">Descrição</label>
                                            <select
                                                value={itemForm.descricao}
                                                onChange={(e) => setItemForm({ ...itemForm, descricao: e.target.value })}
                                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold appearance-none"
                                            >
                                                <option value="">Selecione...</option>
                                                <option value="Diária">Diária</option>
                                                <option value="Hora Extra">Hora Extra</option>
                                                <option value="Adicional Noturno">Adicional Noturno (35%)</option>
                                                <option value="Adicional FDS">Adicional Final de Semana</option>
                                                <option value="Mobilização">Mobilização / Desmobilização</option>
                                                <option value="Hora Normal">Hora Normal</option>
                                                <option value="Frete">Frete</option>
                                                <option value="Outro">Outro</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-500 uppercase">Quantidade</label>
                                            <input
                                                type="number"
                                                step="0.5"
                                                value={itemForm.quantidade}
                                                onChange={(e) => setItemForm({ ...itemForm, quantidade: e.target.value })}
                                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold"
                                                placeholder="1"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-500 uppercase">Valor Unitário (R$)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={itemForm.valorUnitario}
                                                onChange={(e) => setItemForm({ ...itemForm, valorUnitario: e.target.value })}
                                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold"
                                                placeholder="0,00"
                                            />
                                        </div>
                                        <div className="space-y-1 col-span-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase">% Adicional (opcional)</label>
                                            <input
                                                type="number"
                                                step="1"
                                                value={itemForm.percentualAdicional}
                                                onChange={(e) => setItemForm({ ...itemForm, percentualAdicional: e.target.value })}
                                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm"
                                                placeholder="Ex: 35 para noturno, 50 para HE"
                                            />
                                        </div>
                                    </div>
                                    {itemForm.quantidade && itemForm.valorUnitario && (
                                        <div className="text-right text-sm font-bold text-emerald-600">
                                            Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                                parseFloat(itemForm.quantidade) * parseFloat(itemForm.valorUnitario) * (1 + (parseFloat(itemForm.percentualAdicional || '0') / 100))
                                            )}
                                        </div>
                                    )}
                                    <div className="flex gap-2">
                                        <button onClick={handleAddItem} className="bg-blue-600 text-white px-4 py-1.5 rounded text-[10px] font-black uppercase hover:bg-blue-700 flex items-center gap-1">
                                            <Save className="w-3 h-3" /> Salvar Item
                                        </button>
                                        <button onClick={() => setShowItemForm(false)} className="text-slate-500 px-3 py-1.5 text-[10px] font-bold uppercase hover:text-slate-700">
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Items list */}
                            {selectedOS.itensCobranca?.length === 0 ? (
                                <p className="text-center text-slate-400 italic text-sm py-6">Nenhum item adicionado.</p>
                            ) : (
                                <div className="space-y-2">
                                    {selectedOS.itensCobranca?.map((item: ItemCobranca) => (
                                        <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-slate-700">{item.descricao}</span>
                                                    {item.percentualAdicional && (
                                                        <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                                                            +{item.percentualAdicional}%
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-slate-400">
                                                    {item.quantidade} × {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valorUnitario)}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-black text-emerald-600">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valorTotal)}
                                                </span>
                                                <button onClick={() => handleRemoveItem(item.id)} className="text-slate-300 hover:text-slate-600">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer: Total + Precificar */}
                        <div className="border-t border-slate-200 p-4 flex items-center justify-between bg-slate-50">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase">Total Precificado</p>
                                <p className="text-xl font-black text-slate-800">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                        selectedOS.itensCobranca?.reduce((s: number, i: ItemCobranca) => s + i.valorTotal, 0) || 0
                                    )}
                                </p>
                            </div>
                            {selectedOS.statusPrecificacao !== 'PRECIFICADA' && (
                                <button
                                    onClick={handlePrecificar}
                                    disabled={!selectedOS.itensCobranca?.length}
                                    className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg text-xs font-black uppercase hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                                >
                                    <Calculator className="w-4 h-4" /> Finalizar Precificação
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
