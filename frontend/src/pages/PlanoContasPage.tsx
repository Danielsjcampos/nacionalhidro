import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import {
    Loader2, Plus, X, ChevronRight, ChevronDown, FolderTree,
    BookOpen, Edit, Trash2, Upload
} from 'lucide-react';

type ContaNode = {
    id: string; codigo: string; descricao: string; tipo: string;
    natureza: string; nivel: number; empresa: string;
    ativo: boolean; children: ContaNode[];
};

export default function PlanoContasPage() {
    const [tree, setTree] = useState<ContaNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState<any>(null);
    const [empresaFilter, setEmpresaFilter] = useState('');

    const [form, setForm] = useState({
        codigo: '', descricao: '', tipo: 'ANALITICA', natureza: 'DESPESA',
        nivel: 3, parentId: '', empresa: 'AMBAS'
    });

    const fetchTree = useCallback(async () => {
        try {
            const params: any = {};
            if (empresaFilter) params.empresa = empresaFilter;
            const res = await api.get('/plano-contas', { params });
            setTree(res.data);
            const l1 = new Set<string>(res.data.map((n: ContaNode) => n.id));
            setExpanded(prev => new Set<string>([...prev, ...l1]));
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [empresaFilter]);

    useEffect(() => { fetchTree(); }, [fetchTree]);

    const handleSeed = async () => {
        if (!confirm('Importar plano de contas padrão?')) return;
        try {
            await api.post('/plano-contas/seed');
            fetchTree();
        } catch (err: any) { alert(err.response?.data?.error || 'Erro'); }
    };

    const toggleExpand = (id: string) => {
        const ns = new Set(expanded);
        if (ns.has(id)) ns.delete(id); else ns.add(id);
        setExpanded(ns);
    };

    const expandAll = () => {
        const all = new Set<string>();
        const walk = (nodes: ContaNode[]) => {
            nodes.forEach(n => { all.add(n.id); if (n.children) walk(n.children); });
        };
        walk(tree);
        setExpanded(all);
    };

    const collapseAll = () => setExpanded(new Set());

    const handleCreate = async () => {
        try {
            await api.post('/plano-contas', form);
            setShowForm(false);
            setForm({ codigo: '', descricao: '', tipo: 'ANALITICA', natureza: 'DESPESA', nivel: 3, parentId: '', empresa: 'AMBAS' });
            fetchTree();
        } catch (err: any) { alert(err.response?.data?.error || 'Erro'); }
    };

    const handleUpdate = async () => {
        if (!editItem) return;
        try {
            await api.patch(`/plano-contas/${editItem.id}`, { descricao: editItem.descricao, empresa: editItem.empresa, ativo: editItem.ativo });
            setEditItem(null);
            fetchTree();
        } catch (err) { console.error(err); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Excluir esta conta?')) return;
        try {
            await api.delete(`/plano-contas/${id}`);
            fetchTree();
        } catch (err: any) { alert(err.response?.data?.error || 'Erro'); }
    };

    const openCreateChild = (parent: ContaNode) => {
        setForm({ ...form, parentId: parent.id, natureza: parent.natureza, nivel: parent.nivel + 1, codigo: parent.codigo + '.', empresa: parent.empresa || 'AMBAS' });
        setShowForm(true);
    };

    const countNodes = (nodes: ContaNode[]): number => nodes.reduce((s, n) => s + 1 + (n.children ? countNodes(n.children) : 0), 0);

    if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

    return (
        <div className="h-full flex flex-col space-y-4 overflow-hidden">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Plano de Contas</h1>
                    <p className="text-sm text-slate-500">{countNodes(tree)} contas cadastradas</p>
                </div>
                <div className="flex gap-2">
                    <select value={empresaFilter} onChange={e => setEmpresaFilter(e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs">
                        <option value="">Todas Empresas</option>
                        <option value="HIDRO">Nacional Hidro</option>
                        <option value="LOCACAO">Nacional Locação</option>
                    </select>
                    <button onClick={expandAll} className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold">Expandir</button>
                    <button onClick={collapseAll} className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold">Recolher</button>
                    {tree.length === 0 && (
                        <button onClick={handleSeed} className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5">
                            <Upload className="w-3.5 h-3.5" /> Importar Padrão
                        </button>
                    )}
                    <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5" /> Nova Conta
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-slate-200">
                {tree.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <FolderTree className="w-12 h-12 mb-3" />
                        <p className="text-sm font-bold">Nenhuma conta cadastrada</p>
                        <p className="text-xs">Clique em Importar Padrão para iniciar</p>
                    </div>
                ) : (
                    <div className="p-3">
                        {tree.map(node => (
                            <TreeNode key={node.id} node={node} level={0} expanded={expanded}
                                onToggle={toggleExpand} onEdit={setEditItem} onDelete={handleDelete} onAddChild={openCreateChild} />
                        ))}
                    </div>
                )}
            </div>

            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800">Nova Conta Contábil</h2>
                            <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <input value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} placeholder="Código (ex: 2.1.01) *" className="border border-slate-200 rounded-lg p-2.5 text-sm" />
                            <select value={form.natureza} onChange={e => setForm({ ...form, natureza: e.target.value })} className="border border-slate-200 rounded-lg p-2.5 text-sm">
                                <option value="RECEITA">Receita</option>
                                <option value="DESPESA">Despesa</option>
                            </select>
                        </div>
                        <input value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Descrição *" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                        <div className="grid grid-cols-3 gap-3">
                            <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="border border-slate-200 rounded-lg p-2.5 text-sm">
                                <option value="SINTETICA">Sintética (grupo)</option>
                                <option value="ANALITICA">Analítica (conta)</option>
                            </select>
                            <select value={form.empresa} onChange={e => setForm({ ...form, empresa: e.target.value })} className="border border-slate-200 rounded-lg p-2.5 text-sm">
                                <option value="AMBAS">Ambas</option>
                                <option value="HIDRO">Hidro</option>
                                <option value="LOCACAO">Locação</option>
                            </select>
                            <input type="number" min="1" max="5" value={form.nivel} onChange={e => setForm({ ...form, nivel: Number(e.target.value) })} className="border border-slate-200 rounded-lg p-2.5 text-sm" />
                        </div>
                        <button onClick={handleCreate} disabled={!form.codigo || !form.descricao} className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-bold text-sm disabled:opacity-50">Criar Conta</button>
                    </div>
                </div>
            )}

            {editItem && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800">Editar {editItem.codigo}</h2>
                            <button onClick={() => setEditItem(null)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <input value={editItem.descricao} onChange={e => setEditItem({ ...editItem, descricao: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                        <select value={editItem.empresa || 'AMBAS'} onChange={e => setEditItem({ ...editItem, empresa: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm">
                            <option value="AMBAS">Ambas</option>
                            <option value="HIDRO">Hidro</option>
                            <option value="LOCACAO">Locação</option>
                        </select>
                        <label className="flex items-center gap-2 text-xs text-slate-600">
                            <input type="checkbox" checked={editItem.ativo} onChange={e => setEditItem({ ...editItem, ativo: e.target.checked })} className="rounded border-slate-300" /> Ativo
                        </label>
                        <button onClick={handleUpdate} className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-bold text-sm">Salvar</button>
                    </div>
                </div>
            )}
        </div>
    );
}

function TreeNode({ node, level, expanded, onToggle, onEdit, onDelete, onAddChild }: {
    node: ContaNode; level: number; expanded: Set<string>;
    onToggle: (id: string) => void; onEdit: (item: any) => void;
    onDelete: (id: string) => void; onAddChild: (parent: ContaNode) => void;
}) {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expanded.has(node.id);
    const isSintetica = node.tipo === 'SINTETICA';
    const naturezaColor = node.natureza === 'RECEITA' ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50';
    const empresaLabel: Record<string, string> = { HIDRO: 'H', LOCACAO: 'L', AMBAS: 'A' };

    return (
        <div>
            <div
                className={`flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-50 group cursor-pointer ${!node.ativo ? 'opacity-40' : ''}`}
                style={{ paddingLeft: `${level * 24 + 8}px` }}
                onClick={() => hasChildren && onToggle(node.id)}
            >
                <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                    {hasChildren ? (isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />) : <span className="w-1 h-1 rounded-full bg-slate-300"></span>}
                </div>
                {isSintetica ? <FolderTree className="w-4 h-4 text-amber-500 flex-shrink-0" /> : <BookOpen className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                <span className={`text-xs font-mono font-bold ${isSintetica ? 'text-slate-800' : 'text-slate-500'}`}>{node.codigo}</span>
                <span className={`text-xs flex-1 ${isSintetica ? 'font-bold text-slate-800' : 'text-slate-600'}`}>{node.descricao}</span>
                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${naturezaColor}`}>{node.natureza === 'RECEITA' ? 'R' : 'D'}</span>
                {node.empresa && node.empresa !== 'AMBAS' && <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">{empresaLabel[node.empresa]}</span>}
                <div className="hidden group-hover:flex items-center gap-1">
                    {isSintetica && <button onClick={e => { e.stopPropagation(); onAddChild(node); }} className="p-0.5 hover:bg-blue-50 rounded" title="Adicionar subconta"><Plus className="w-3 h-3 text-blue-500" /></button>}
                    <button onClick={e => { e.stopPropagation(); onEdit(node); }} className="p-0.5 hover:bg-slate-100 rounded"><Edit className="w-3 h-3 text-slate-400" /></button>
                    {!hasChildren && <button onClick={e => { e.stopPropagation(); onDelete(node.id); }} className="p-0.5 hover:bg-red-50 rounded"><Trash2 className="w-3 h-3 text-red-400" /></button>}
                </div>
            </div>
            {hasChildren && isExpanded && node.children.map(child => (
                <TreeNode key={child.id} node={child} level={level + 1} expanded={expanded} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} onAddChild={onAddChild} />
            ))}
        </div>
    );
}
