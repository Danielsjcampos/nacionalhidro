import { useToast } from '../../contexts/ToastContext';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import { 
  Plus, Loader2, MoreVertical, 
  Settings, Search, X, 
  Save, AlertCircle, Layout, Mail, Link
} from 'lucide-react';
import FormRenderer from '../../components/Workflow/FormRenderer';

export default function WorkflowBoard() {
    const { showToast } = useToast();
  const { id: workflowId } = useParams();
  const [workflow, setWorkflow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCardModal, setShowCardModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [selectedStageId, setSelectedStageId] = useState('');
  const [saving, setSaving] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  useEffect(() => {
    if (workflowId) {
      fetchWorkflow();
    }
  }, [workflowId]);

  const fetchWorkflow = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/workflows/${workflowId}`);
      setWorkflow(res.data);
    } catch (error) {
      console.error('Erro ao buscar workflow:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCard = (stageId: string, card?: any) => {
    setSelectedStageId(stageId);
    if (card) {
      setSelectedCard(card);
      setFormData(card.dados || {});
    } else {
      setSelectedCard(null);
      setFormData({});
    }
    setShowCardModal(true);
  };

  const handleSaveCard = async () => {
    setSaving(true);
    try {
      const payload = {
        workflowId,
        stageId: selectedStageId,
        titulo: formData.titulo || selectedCard?.titulo || 'Novo Card',
        dados: formData
      };

      if (selectedCard) {
        await api.put(`/workflows/card/${selectedCard.id}`, payload);
      } else {
        await api.post('/workflows/card', payload);
      }
      
      setShowCardModal(false);
      fetchWorkflow();
    } catch (error) {
      showToast('Erro ao salvar card');
    } finally {
      setSaving(false);
    }
  };

  const handleMoveCard = async (cardId: string, targetStageId: string) => {
    try {
      await api.patch(`/workflows/card/${cardId}/move`, { stageId: targetStageId });
      fetchWorkflow();
    } catch (error) {
      showToast('Erro ao mover card');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
    </div>
  );

  if (!workflow) return (
    <div className="p-10 text-center">
      <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
      <h2 className="text-2xl font-bold">Workflow não encontrado</h2>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white">
            <Layout className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">{workflow.nome}</h1>
            <p className="text-xs text-gray-500">{workflow.setor || 'Nacional Hidro'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Pesquisar cards..." 
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-full text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <button 
            onClick={() => setShowTemplatesModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 rounded-lg text-gray-600 text-xs font-bold transition-all border border-gray-200"
            title="Templates de E-mail"
          >
            <Mail className="w-4 h-4 text-blue-500" />
            Templates
          </button>
          <button 
            onClick={() => {
                const url = `${window.location.origin}/workflow/apply/${workflowId}`;
                navigator.clipboard.writeText(url);
                showToast('Link de inscrição copiado com sucesso!');
            }}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 rounded-lg text-blue-600 text-xs font-bold transition-all border border-blue-100 bg-blue-50/50"
            title="Copiar Link Público de Inscrição"
          >
            <Link className="w-4 h-4" />
            Link Público
          </button>
          <button 
            onClick={() => window.location.href = `/workflows/${workflowId}/settings`}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-600"
            title="Configurações do Workflow"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 gap-6 flex items-start">
        {workflow.stages.map((stage: any) => (
          <div key={stage.id} className="min-w-[320px] max-w-[320px] flex flex-col max-h-full">
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-700 uppercase tracking-wider text-xs">{stage.nome}</h3>
                <span className="bg-gray-200 text-gray-600 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {stage.cards?.length || 0}
                </span>
              </div>
              <button 
                onClick={() => handleOpenCard(stage.id)}
                className="p-1 hover:bg-white rounded-md text-gray-400 hover:text-blue-600 transition-colors"
                title="Novo Card"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
              {stage.cards?.map((card: any) => (
                <div 
                  key={card.id}
                  onClick={() => handleOpenCard(stage.id, card)}
                  className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-blue-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-bold text-gray-800 text-sm group-hover:text-blue-600">{card.titulo}</h4>
                    <button className="text-gray-300 hover:text-gray-600 opacity-0 group-hover:opacity-100">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Metadata display placeholders */}
                  <div className="space-y-2 mt-3">
                    {Object.keys(card.dados || {}).slice(0, 2).map(key => (
                      <div key={key} className="text-[10px] text-gray-500 truncate">
                        <span className="font-semibold uppercase">{key}:</span> {String(card.dados[key])}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
                    <div className="flex -space-x-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-blue-600">VH</div>
                    </div>
                    <span className="text-[9px] text-gray-400">
                      {new Date(card.updatedAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              ))}

              {stage.cards?.length === 0 && (
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
                  <p className="text-xs text-gray-400 font-medium italic">Nenhum card aqui</p>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Add Stage Placeholder */}
        <div className="min-w-[320px] flex flex-col h-14 border-2 border-dashed border-gray-200 rounded-xl items-center justify-center hover:bg-white transition-colors cursor-pointer text-gray-400 hover:text-blue-500">
          <Plus className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-wider">Nova Fase</span>
        </div>
      </div>

      {/* Email Templates Modal */}
      {showTemplatesModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Templates de E-mail</h2>
                  <p className="text-xs text-gray-500 uppercase font-black tracking-widest">Sincronizados do Pipefy</p>
                </div>
              </div>
              <button 
                onClick={() => setShowTemplatesModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-400"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex">
              {/* List */}
              <div className="w-1/3 border-r border-gray-100 overflow-y-auto p-4 space-y-2 bg-gray-50/50">
                {workflow.emailTemplates?.map((template: any) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className={`w-full text-left p-3 rounded-xl transition-all border ${
                      selectedTemplate?.id === template.id 
                        ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/30' 
                        : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:shadow-sm'
                    }`}
                  >
                    <p className="font-bold text-xs truncate uppercase tracking-tight">{template.nome}</p>
                    <p className={`text-[10px] truncate mt-1 ${selectedTemplate?.id === template.id ? 'text-blue-100 font-medium' : 'text-gray-400'}`}>
                      {template.assunto}
                    </p>
                  </button>
                ))}
                {!workflow.emailTemplates?.length && (
                  <div className="p-8 text-center text-gray-400 italic text-sm">Nenhum template importado</div>
                )}
              </div>

              {/* Preview */}
              <div className="flex-1 bg-white overflow-y-auto p-8">
                {selectedTemplate ? (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Assunto do E-mail</label>
                      <h3 className="text-xl font-bold text-gray-800 border-b border-gray-100 pb-4">{selectedTemplate.assunto}</h3>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Corpo da Mensagem</label>
                      <div className="bg-gray-50 rounded-2xl p-6 text-sm text-gray-700 leading-relaxed font-serif min-h-[300px] whitespace-pre-wrap border border-gray-100">
                        {selectedTemplate.corpo}
                      </div>
                    </div>
                    <div className="flex justify-end gap-3">
                      <button className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all uppercase tracking-wider">
                        Usar como Base
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                    <Mail className="w-16 h-16 text-gray-300 mb-4" />
                    <p className="text-gray-500 font-medium">Selecione um template para visualizar o conteúdo</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
 
      {/* Card Modal (Editor) */}
      {showCardModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-end">
          <div className="bg-white h-full w-full max-w-xl shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-800">
                  {selectedCard ? 'Editar Card' : 'Novo Card'}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">
                    Fase Atual:
                  </p>
                  <select
                    className="text-[10px] font-bold text-blue-600 bg-blue-50 border-none rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-blue-400"
                    value={selectedStageId}
                    onChange={(e) => setSelectedStageId(e.target.value)}
                  >
                    {workflow.stages.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.nome}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button 
                onClick={() => setShowCardModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-400"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30">
              <div className="space-y-6">
                <div className="flex flex-col">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Título do Card</label>
                  <input 
                    type="text" 
                    className="w-full p-3 border border-gray-300 rounded-xl text-lg font-bold outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                    value={formData.titulo || ''}
                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                    placeholder="Ex: Nome do Colaborador"
                  />
                </div>

                <div className="h-px bg-gray-100 my-6" />

                {/* DYNAMIC FORM RENDERER */}
                <FormRenderer 
                  fields={
                    !selectedCard 
                      ? workflow.fields.filter((f: any) => f.isStartField) // Somente campos de entrada no Novo
                      : workflow.fields.filter((f: any) => f.stageId === selectedStageId || f.isStartField) // Todos da fase + entrada na edição
                  }
                  values={formData}
                  onChange={(nome, value) => setFormData({ ...formData, [nome]: value })}
                />
              </div>
            </div>

            <div className="p-6 bg-white border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button 
                  className="px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  onClick={() => {/* TODO: Archive/Delete */}}
                >
                  Arquivar
                </button>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowCardModal(false)}
                  className="px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveCard}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
}
