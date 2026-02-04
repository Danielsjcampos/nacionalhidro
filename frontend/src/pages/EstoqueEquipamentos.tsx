import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useForm, useFieldArray } from 'react-hook-form';
import { 
  Box, Plus, Search, ArrowUpCircle, AlertTriangle, MoreHorizontal, 
  Truck, Settings, Wrench, Image as ImageIcon, X, Save, Trash2, Edit, ChevronDown, ChevronUp 
} from 'lucide-react';
import { Loader2 } from 'lucide-react';

// --- COMPONENTS ---

const StockTab = () => {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEstoque = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:3000/estoque', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setList(response.data);
      } catch (err) {
        console.error('Failed to fetch stock', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEstoque();
  }, []);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium border border-slate-200">
            <ArrowUpCircle className="w-4 h-4 text-emerald-600" />
            Movimentação
          </button>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20 text-sm font-medium">
            <Plus className="w-4 h-4" />
            Novo Produto
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">Total de Itens</p>
          <h3 className="text-2xl font-bold text-slate-800">{list.reduce((acc, curr) => acc + curr.estoqueAtual, 0)}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">Abaixo do Mínimo</p>
          <h3 className="text-2xl font-bold text-red-600">{list.filter(p => p.estoqueAtual <= p.estoqueMinimo).length}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">Valor em Estoque</p>
          <h3 className="text-2xl font-bold text-slate-800">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
              list.reduce((acc, curr) => acc + (curr.estoqueAtual * curr.precoCusto), 0)
            )}
          </h3>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
            <div className="relative max-w-md">
            <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
            <input 
                type="text" 
                placeholder="Buscar SKU ou nome do produto..." 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
            />
            </div>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                <th className="px-6 py-4">Produto / SKU</th>
                <th className="px-6 py-4">Estoque Atual</th>
                <th className="px-6 py-4">Preço (Venda)</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {list.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                    <div>
                        <p className="font-semibold text-slate-800">{item.nome}</p>
                        <p className="text-xs font-mono text-slate-400 uppercase tracking-tighter">{item.sku || 'SEM SKU'}</p>
                    </div>
                    </td>
                    <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                        <span className={`font-bold ${item.estoqueAtual <= item.estoqueMinimo ? 'text-red-600' : 'text-slate-800'}`}>
                        {item.estoqueAtual}
                        </span>
                        <span className="text-xs text-slate-400 capitalize">{item.unidadeMedida.toLowerCase()}</span>
                    </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.precoVenda)}
                    </td>
                    <td className="px-6 py-4">
                    {item.estoqueAtual <= item.estoqueMinimo ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 uppercase">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        Repor Estoque
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase">
                        Em Dia
                        </span>
                    )}
                    </td>
                    <td className="px-6 py-4 text-right">
                    <button className="p-1 hover:bg-slate-100 rounded text-slate-400">
                        <MoreHorizontal className="w-4 h-4" />
                    </button>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

// --- EQUIPMENT SECTION COMPONENTS ---

const SectionCard = ({ title, children, defaultOpen = true }: { title: string, children: React.ReactNode, defaultOpen?: boolean }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="bg-slate-100/50 rounded-lg overflow-hidden mb-4 border border-slate-200">
            <button 
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 bg-slate-200/50 hover:bg-slate-200 transition-colors text-left"
            >
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                    {isOpen ? <ChevronUp className="w-5 h-5"/> : <ChevronDown className="w-5 h-5"/>}
                    {title}
                </h3>
            </button>
            {isOpen && <div className="p-6 space-y-4">{children}</div>}
        </div>
    )
}

const EquipmentForm = ({ initialData, onClose, onSave }: { initialData?: any, onClose: () => void, onSave: (data: any) => Promise<void> }) => {
  const { register, control, handleSubmit, setValue, watch } = useForm({
    defaultValues: initialData || {
      ativo: true,
      nome: '',
      descricao: '',
      imagem: '', // Initialize image
      responsabilidades: [],
      acessorios: [],
      veiculos: []
    }
  });

  const { fields: respFields, append: appendResp, remove: removeResp } = useFieldArray({ control, name: "responsabilidades" });
  const { fields: accFields, append: appendAcc, remove: removeAcc } = useFieldArray({ control, name: "acessorios" });
  const { fields: vehFields, append: appendVeh, remove: removeVeh } = useFieldArray({ control, name: "veiculos" });

  const inputClass = "w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400";
  const labelClass = "block text-xs font-bold text-slate-600 mb-1";

  return (
    <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Header Title */}
        <div className="p-6 bg-slate-100 border-b border-slate-200 rounded-t-lg">
            <h2 className="text-xl font-bold text-slate-800">Cadastro equipamento</h2>
        </div>
        
        <form onSubmit={handleSubmit(onSave)} className="flex-1 overflow-y-auto p-8 space-y-8 bg-white custom-scrollbar">
          
          {/* Top Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <div className="space-y-4">
                <div>
                    <label className={labelClass}>Equipamento</label>
                    <input {...register('nome', { required: true })} className={inputClass} placeholder="Nome do Equipamento" />
                </div>
                <div>
                    <label className={labelClass}>Ativo</label>
                    <select {...register('ativo')} className={inputClass}>
                        <option value="true">Sim</option>
                        <option value="false">Não</option>
                    </select>
                </div>
                <div>
                    <label className={labelClass}>Imagem</label>
                    <div className="aspect-video bg-slate-50 rounded-lg flex flex-col items-center justify-center border border-slate-300 overflow-hidden relative group">
                        {watch('imagem') ? (
                            <img src={watch('imagem')} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                            <ImageIcon className="w-12 h-12 text-slate-300 mb-2" />
                        )}
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <label className="cursor-pointer bg-slate-700 text-white px-4 py-2 rounded text-sm font-medium hover:bg-slate-800 transition-colors">
                                Alterar imagem
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

             <div className="space-y-4">
                <div className="h-full flex flex-col">
                    <label className={labelClass}>Descrição</label>
                    <textarea {...register('descricao')} className={`${inputClass} flex-1 resize-none`} placeholder="Descrição técnica..." />
                </div>
             </div>
          </div>

          {/* Dynamic Sections */}
          <div className="space-y-2">
            
            {/* Responsabilidades */}
            <SectionCard title="Responsabilidades">
                {respFields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end bg-slate-50 p-3 rounded border border-slate-200">
                        <div>
                            <label className={labelClass}>Responsabilidade</label>
                            <input {...register(`responsabilidades.${index}.descricao` as const)} className={inputClass} />
                        </div>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className={labelClass}>Responsável</label>
                                <input {...register(`responsabilidades.${index}.responsavel` as const)} className={inputClass} />
                            </div>
                            <button type="button" onClick={() => removeResp(index)} className="p-2 text-red-500 hover:bg-red-50 rounded self-end mb-[1px]">
                                <X className="w-5 h-5"/>
                            </button>
                        </div>
                    </div>
                ))}
                <button type="button" onClick={() => appendResp({ descricao: '', responsavel: '' })} className="text-blue-600 text-sm font-bold hover:underline">
                    + Adicionar Responsabilidade
                </button>
            </SectionCard>

            {/* Acessórios */}
            <SectionCard title="Acessórios">
                {accFields.map((field, index) => (
                    <div key={field.id} className="flex gap-2 items-center bg-slate-50 p-3 rounded border border-slate-200">
                        <div className="flex-1">
                            <label className={labelClass}>Acessório</label>
                            <input {...register(`acessorios.${index}` as const)} className={inputClass} />
                        </div>
                        <button type="button" onClick={() => removeAcc(index)} className="p-2 text-red-500 hover:bg-red-50 rounded mt-5">
                            <X className="w-5 h-5"/>
                        </button>
                    </div>
                ))}
                <button type="button" onClick={() => appendAcc('')} className="text-blue-600 text-sm font-bold hover:underline">
                    + Adicionar Acessório
                </button>
            </SectionCard>

            {/* Veículos */}
            <SectionCard title="Veículos">
                {vehFields.map((field, index) => (
                    <div key={field.id} className="flex gap-2 items-center bg-slate-50 p-3 rounded border border-slate-200">
                        <div className="flex-1">
                            <label className={labelClass}>Veículo Compatível</label>
                            <input {...register(`veiculos.${index}` as const)} className={inputClass} />
                        </div>
                        <button type="button" onClick={() => removeVeh(index)} className="p-2 text-red-500 hover:bg-red-50 rounded mt-5">
                            <X className="w-5 h-5"/>
                        </button>
                    </div>
                ))}
                <button type="button" onClick={() => appendVeh('')} className="text-blue-600 text-sm font-bold hover:underline">
                    + Adicionar Veículo
                </button>
            </SectionCard>

          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 sticky bottom-0 bg-white z-10 pb-2">
             <button type="button" onClick={onClose} className="px-6 py-2 rounded bg-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-300">Cancelar</button>
             <button type="submit" className="px-6 py-2 rounded bg-slate-800 text-white font-bold text-sm hover:bg-slate-900 flex items-center gap-2">
               Salvar
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EquipmentTab = () => {
   const [showForm, setShowForm] = useState(false);
   const [editingItem, setEditingItem] = useState<any>(null);
   const [equipamentos, setEquipamentos] = useState<any[]>([]);

   const fetchEquip = async () => {
      try {
          const token = localStorage.getItem('token');
          const res = await axios.get('http://localhost:3000/equipamentos', { headers: { Authorization: `Bearer ${token}` }});
          setEquipamentos(res.data);
      } catch (e) { console.error(e); }
   };

   useEffect(() => {
     fetchEquip();
   }, []);

   const handleSave = async (data: any) => {
      try {
          const token = localStorage.getItem('token');
          if (editingItem) {
             await axios.put(`http://localhost:3000/equipamentos/${editingItem.id}`, data, { headers: { Authorization: `Bearer ${token}` }});
          } else {
             await axios.post('http://localhost:3000/equipamentos', data, { headers: { Authorization: `Bearer ${token}` }});
          }
          setShowForm(false);
          setEditingItem(null);
          fetchEquip();
      } catch (e) {
          alert('Erro ao salvar');
      }
   };

   const handleDelete = async (id: string) => {
       if(!confirm('Tem certeza que deseja excluir este equipamento?')) return;
       try {
           const token = localStorage.getItem('token');
           await axios.delete(`http://localhost:3000/equipamentos/${id}`, { headers: { Authorization: `Bearer ${token}` }});
           fetchEquip();
       } catch (e) {
           alert('Erro ao deletar');
       }
   }

   const openEdit = (item: any) => {
       setEditingItem(item);
       setShowForm(true);
   }

   return (
     <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header Action Bar */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 flex justify-between items-center shadow-sm">
            <div>
                <h2 className="font-bold text-lg text-slate-800">Procurar</h2>
                <input 
                    type="text" 
                    placeholder="Procurar" 
                    className="mt-1 w-64 border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                />
            </div>
            <button onClick={() => { setEditingItem(null); setShowForm(true); }} className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2 rounded text-sm font-bold transition-colors shadow-lg">
                Adicionar
            </button>
        </div>

        {/* Table View */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-800 text-white font-bold uppercase text-xs">
                    <tr>
                        <th className="px-6 py-3 w-16">Foto</th>
                        <th className="px-6 py-3">Equipamento</th>
                        <th className="px-6 py-3 w-1/3">Descrição</th>
                        <th className="px-6 py-3 text-center w-24">Ativo</th>
                        <th className="px-6 py-3 text-right w-32">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {equipamentos.map(eq => (
                        <tr key={eq.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden border border-slate-200">
                                    {eq.imagem ? 
                                        <img src={eq.imagem} alt={eq.nome} className="w-full h-full object-cover"/> : 
                                        <ImageIcon className="w-5 h-5 text-slate-400"/>
                                    }
                                </div>
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-700 uppercase">
                                {eq.nome}
                            </td>
                            <td className="px-6 py-4 text-slate-500 truncate max-w-xs">
                                {eq.descricao || '-'}
                            </td>
                            <td className="px-6 py-4 text-center">
                                <span className={`px-3 py-1 rounded text-xs font-bold border ${eq.ativo ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                    {eq.ativo ? 'Sim' : 'Não'}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <button onClick={() => openEdit(eq)} className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Editar">
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(eq.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Excluir">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {equipamentos.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                                Nenhum equipamento encontrado.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>

        {showForm && <EquipmentForm initialData={editingItem} onClose={() => setShowForm(false)} onSave={handleSave} />}
     </div>
   );
};

export default function EstoqueEquipamentos() {
  const [activeTab, setActiveTab] = useState<'estoque' | 'equipamentos'>('estoque');

  return (
    <div className="space-y-8">
      <div>
         <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Administração | Equipamentos</h1>
      </div>

      <div className="border-b border-slate-200">
        <div className="flex gap-8">
            <button 
                onClick={() => setActiveTab('estoque')}
                className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'estoque' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                <Box className="w-4 h-4"/> Controle de Estoque
            </button>
            <button 
                onClick={() => setActiveTab('equipamentos')}
                className={`pb-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'equipamentos' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                <Truck className="w-4 h-4"/> Equipamentos
            </button>
        </div>
      </div>

      <div>
          {activeTab === 'estoque' ? <StockTab /> : <EquipmentTab />}
      </div>
    </div>
  );
}
