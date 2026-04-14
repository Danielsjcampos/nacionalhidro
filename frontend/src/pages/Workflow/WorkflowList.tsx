import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { 
  Plus, Loader2, Database, Layout, 
  ArrowRight, Settings, Trash2, Import
} from 'lucide-react';

export default function WorkflowList() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBootstrapModal, setShowBootstrapModal] = useState(false);
  const [pipeId, setPipeId] = useState('');
  const [bootstrapping, setBootstrapping] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const res = await api.get('/workflows');
      setWorkflows(res.data);
    } catch (error) {
      console.error('Erro ao buscar workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBootstrap = async () => {
    if (!pipeId) return alert('Insira o ID do Pipe');
    setBootstrapping(true);
    try {
      const res = await api.post('/workflows/bootstrap', { pipeId });
      alert('Pipe importado com sucesso!');
      setShowBootstrapModal(false);
      fetchWorkflows();
      navigate(`/workflows/${res.data.workflowId}`);
    } catch (error: any) {
      alert(`Erro: ${error.response?.data?.details || error.message}`);
    } finally {
      setBootstrapping(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <Database className="w-8 h-8 text-blue-600" /> Workflows Nativos
          </h1>
          <p className="text-sm text-gray-500">Central de processos e automações Nacional Hidro</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowBootstrapModal(true)}
            className="border border-blue-600 text-blue-600 hover:bg-blue-50 px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold text-sm transition-all"
          >
            <Import className="w-4 h-4" /> Importar Pipefy
          </button>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold text-sm transition-all shadow-lg shadow-blue-500/20">
            <Plus className="w-4 h-4" /> Novo Workflow
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workflows.map((wf) => (
          <div 
            key={wf.id}
            className="group bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all cursor-pointer relative overflow-hidden"
            onClick={() => navigate(`/workflows/${wf.id}`)}
          >
            <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity`}>
              <Layout className="w-full h-full" />
            </div>

            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Layout className="w-6 h-6" />
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); /* TODO: Settings */ }}
                className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-1 group-hover:text-blue-600 transition-colors uppercase">
                {wf.nome}
              </h3>
              <p className="text-xs text-gray-400 font-medium tracking-wide uppercase">
                {wf.setor || 'Sem Setor'}
              </p>
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-gray-50 pt-4">
              <div className="flex flex-col">
                <span className="text-sm font-black text-gray-700">{wf._count?.cards || 0}</span>
                <span className="text-[10px] text-gray-400 uppercase font-bold">Cards Ativos</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-sm font-black text-gray-700">{wf.stages?.length || 0}</span>
                <span className="text-[10px] text-gray-400 uppercase font-bold">Fases</span>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <div className="flex items-center gap-2 text-blue-600 font-bold text-xs group-hover:gap-4 transition-all">
                Abrir Board <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        ))}

        {workflows.length === 0 && (
          <div className="col-span-full py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 text-center">
            <Database className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-gray-500 font-bold">Nenhum workflow configurado</h3>
            <p className="text-gray-400 text-sm mt-1">Importe do Pipefy para começar agora mesmo.</p>
          </div>
        )}
      </div>

      {/* Bootstrap Modal */}
      {showBootstrapModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Import className="w-5 h-5 text-blue-600" /> Importar do Pipefy
              </h2>
              <button onClick={() => setShowBootstrapModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-8 space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                Insira o **ID do Pipe** (os números no final da URL do seu pipe no Pipefy) para importar fases e campos automaticamente.
              </p>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Pipe ID</label>
                <input 
                  type="text" 
                  value={pipeId}
                  onChange={(e) => setPipeId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: 304593897"
                />
              </div>
            </div>

            <div className="p-6 bg-gray-50 flex items-center justify-end gap-3">
              <button onClick={() => setShowBootstrapModal(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-800 transition-colors">
                Cancelar
              </button>
              <button 
                onClick={handleBootstrap}
                disabled={bootstrapping}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all"
              >
                {bootstrapping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Import className="w-4 h-4" />}
                {bootstrapping ? 'Sincronizando...' : 'Começar Importação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
