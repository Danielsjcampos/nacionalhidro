import { useToast } from '../contexts/ToastContext';
import { useState, useEffect } from 'react';
import api from '../services/api';
import { useForm, useFieldArray } from 'react-hook-form';
import { Loader2, Plus, ShoppingCart, CheckCircle, XCircle, Trash2, X, Building2 } from 'lucide-react';

type Pedido = {
  id: string;
  numero: number;
  status: string;
  valorTotal: string;
  dataEmissao: string;
  dataVencimentoPrevisto?: string;
  observacoes?: string;
  solicitante: { id: string; name: string };
  fornecedor: { id: string; nome: string };
  itens: Array<{ descricao: string; quantidade: number; valorUnitario: string; valorTotal: string }>;
};

export default function PedidosCompraPage() {
    const { showToast } = useToast();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  
  const { register, control, handleSubmit, reset } = useForm({
    defaultValues: {
      fornecedorId: '',
      observacoes: '',
      dataVencimentoPrevisto: '',
      itens: [{ descricao: '', quantidade: 1, valorUnitario: 0 }]
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'itens' });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resPedidos, resForn] = await Promise.all([
        api.get('/pedidos-compra'),
        api.get('/fornecedores')
      ]);
      setPedidos(resPedidos.data);
      setFornecedores(resForn.data.filter((f: any) => f.ativo));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onSubmit = async (data: any) => {
    try {
      await api.post('/pedidos-compra', data);
      setShowForm(false);
      reset();
      fetchData();
    } catch (error) {
      showToast('Erro ao criar pedido de compra.');
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    if (!confirm(`Deseja alterar o status do pedido para ${status}?`)) return;
    try {
      const res = await api.patch(`/pedidos-compra/${id}/status`, { status });
      if (res.data?.contaPagarId) {
          showToast('Pedido aprovado e integrado ao Contas a Pagar com sucesso!');
      }
      fetchData();
    } catch (err) {
      showToast('Erro ao alterar status.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este pedido? A exclusão afeta o Contas a Pagar vinculado.')) return;
    try {
      await api.delete(`/pedidos-compra/${id}`);
      fetchData();
    } catch (err) {
      showToast('Erro ao excluir pedido.');
    }
  };

  const formatCurrency = (val: string | number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val));

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShoppingCart className="text-blue-600" /> Pedidos de Compra
          </h1>
          <p className="text-slate-500 text-sm">Gerencie suprimentos e provisione o Contas a Pagar</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all">
          <Plus className="w-4 h-4" /> Novo Pedido
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-800 text-white font-bold text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Status / N°</th>
              <th className="px-6 py-4">Fornecedor</th>
              <th className="px-6 py-4">Solicitante</th>
              <th className="px-6 py-4 text-right">Valor Total</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pedidos.map(pedido => (
              <tr key={pedido.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <span className={`px-2.5 py-1 text-[10px] items-center text-center font-black rounded-full uppercase tracking-widest inline-flex self-start ${
                      pedido.status === 'APROVADO' ? 'bg-emerald-100 text-emerald-700' :
                      pedido.status === 'REPROVADO' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {pedido.status}
                    </span>
                    <span className="font-bold text-slate-700">#{pedido.numero}</span>
                    <span className="text-xs text-slate-400">
                      {new Intl.DateTimeFormat('pt-BR').format(new Date(pedido.dataEmissao))}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span className="font-semibold text-slate-700 truncate max-w-[200px]" title={pedido.fornecedor.nome}>{pedido.fornecedor.nome}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600">{pedido.solicitante.name || 'Sistema'}</td>
                <td className="px-6 py-4 text-right">
                  <span className="font-bold text-slate-800">{formatCurrency(pedido.valorTotal)}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    {pedido.status === 'PENDENTE' && (
                      <>
                        <button onClick={() => handleStatusChange(pedido.id, 'APROVADO')} className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors" title="Aprovar Pedido e Lançar no Financeiro">
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleStatusChange(pedido.id, 'REPROVADO')} className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors" title="Reprovar Pedido">
                          <XCircle className="w-5 h-5" />
                        </button>
                      </>
                    )}
                    <button onClick={() => handleDelete(pedido.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {pedidos.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">Nenhum pedido de compra encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-end z-50">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <ShoppingCart className="w-6 h-6 text-blue-600" /> Novo Pedido de Compra
              </h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <form id="pedidoForm" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-widest">Fornecedor</label>
                  <select {...register('fornecedorId', { required: true })} className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">Selecione um fornecedor...</option>
                    {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome} - {f.documento}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-widest">Previsão Vencimento</label>
                    <input type="date" {...register('dataVencimentoPrevisto')} className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-widest">Observações (Opcional)</label>
                  <textarea {...register('observacoes')} className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500" rows={2} placeholder="Motivo da compra, urgência..." />
                </div>

                <div className="border-t border-slate-200 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-sm font-bold text-slate-800 uppercase tracking-widest">Itens do Pedido</label>
                    <button type="button" onClick={() => append({ descricao: '', quantidade: 1, valorUnitario: 0 })} className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                      <Plus className="w-4 h-4" /> Adicionar Item
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {fields.map((field, index) => (
                      <div key={field.id} className="flex gap-4 items-center bg-slate-50 p-4 rounded-xl border border-slate-200 relative group">
                        <div className="flex-1">
                          <input {...register(`itens.${index}.descricao`, { required: true })} placeholder="Nome do Produto / Serviço" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div className="w-24">
                          <input type="number" {...register(`itens.${index}.quantidade`, { required: true })} placeholder="Qtd" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" min="1" />
                        </div>
                        <div className="w-32">
                          <input type="number" step="0.01" {...register(`itens.${index}.valorUnitario`, { required: true })} placeholder="R$ Unit." className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" min="0" />
                        </div>
                        {fields.length > 1 && (
                          <button type="button" onClick={() => remove(index)} className="text-slate-400 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-200 transition-colors">
                Cancelar
              </button>
              <button type="submit" form="pedidoForm" className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                Salvar Pedido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
