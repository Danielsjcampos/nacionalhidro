import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { 
  Save, ArrowLeft, Plus, Trash2, 
  GripVertical, Loader2, Settings
} from 'lucide-react';

export default function WorkflowSettings() {
  const { id: workflowId } = useParams();
  const navigate = useNavigate();
  const [workflow, setWorkflow] = useState<any>(null);
  const [fields, setFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchWorkflow();
  }, [workflowId]);

  const fetchWorkflow = async () => {
    try {
      const res = await api.get(`/workflows/${workflowId}`);
      setWorkflow(res.data);
      setFields(res.data.fields || []);
    } catch (error) {
      alert('Erro ao carregar workflow');
    } finally {
      setLoading(false);
    }
  };

  const handleAddField = () => {
    const newField = {
      id: `temp-${Date.now()}`,
      nome: 'novo_campo',
      label: 'Novo Campo',
      tipo: 'TEXT',
      obrigatorio: false,
      opcoes: []
    };
    setFields([...fields, newField]);
  };

  const handleRemoveField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const handleFieldChange = (id: string, key: string, value: any) => {
    setFields(fields.map(f => f.id === id ? { ...f, [key]: value } : f));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Limpar IDs temporários antes de enviar
      const fieldsToSave = fields.map(({ id, ...rest }) => ({
        ...rest,
        nome: rest.nome || rest.label.toLowerCase().replace(/\s+/g, '_')
      }));
      
      await api.put(`/workflows/${workflowId}/fields`, { fields: fieldsToSave });
      alert('Configurações salvas com sucesso!');
      navigate(`/workflows/${workflowId}`);
    } catch (error) {
      alert('Erro ao salvar campos');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin inline-block mr-2" /> Carregando...</div>;

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Editor de Formulário</h1>
            <p className="text-sm text-gray-500 uppercase font-black tracking-widest">{workflow.nome}</p>
          </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar Configurações
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden">
        <div className="p-6 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-600 uppercase tracking-widest flex items-center gap-2">
            <Settings className="w-4 h-4" /> Layout dos Campos
          </h2>
          <button 
            onClick={handleAddField}
            className="text-xs font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Adicionar Campo
          </button>
        </div>

        <div className="p-8 space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="group bg-gray-50 hover:bg-white p-6 rounded-2xl border border-transparent hover:border-gray-200 hover:shadow-lg transition-all flex items-start gap-6">
              <div className="mt-2 text-gray-300 group-hover:text-gray-400 cursor-move">
                <GripVertical className="w-5 h-5" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1">
                <div className="md:col-span-5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Rótulo (Label)</label>
                  <input 
                    type="text" 
                    value={field.label}
                    onChange={(e) => handleFieldChange(field.id, 'label', e.target.value)}
                    className="w-full bg-transparent border-b border-gray-200 focus:border-blue-500 py-2 font-bold outline-none transition-colors"
                    placeholder="Nome do Campo"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Tipo</label>
                  <select 
                    value={field.tipo}
                    onChange={(e) => handleFieldChange(field.id, 'tipo', e.target.value)}
                    className="w-full bg-transparent border-b border-gray-200 focus:border-blue-500 py-2 outline-none font-medium"
                  >
                    <option value="TEXT">Texto Curto</option>
                    <option value="TEXTAREA">Texto Longo</option>
                    <option value="NUMBER">Número</option>
                    <option value="SELECT">Seleção (Lista)</option>
                    <option value="DATE">Data</option>
                    <option value="FILE">Arquivo / Anexo</option>
                    <option value="CHECKBOX">Sim/Não</option>
                  </select>
                </div>

                <div className="md:col-span-2 flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-blue-600 rounded"
                      checked={field.obrigatorio}
                      onChange={(e) => handleFieldChange(field.id, 'obrigatorio', e.target.checked)}
                    />
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Obrigatório</span>
                  </label>
                </div>

                <div className="md:col-span-2 flex items-center justify-end pt-5">
                  <button 
                    onClick={() => handleRemoveField(field.id)}
                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {field.tipo === 'SELECT' && (
                  <div className="md:col-span-12 mt-4 p-4 bg-white rounded-xl border border-gray-100">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Opções (separadas por vírgula)</label>
                    <textarea 
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      value={Array.isArray(field.opcoes) ? field.opcoes.join(', ') : field.opcoes || ''}
                      onChange={(e) => handleFieldChange(field.id, 'opcoes', e.target.value.split(',').map(s => s.trim()))}
                      placeholder="Opção 1, Opção 2, Opção 3"
                      rows={2}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}

          {fields.length === 0 && (
            <div className="py-20 text-center">
              <Plus className="w-12 h-12 mx-auto text-gray-200 mb-4" />
              <p className="text-gray-400 font-medium">Nenhum campo configurado para este workflow.</p>
              <button 
                onClick={handleAddField}
                className="mt-4 bg-blue-50 text-blue-600 px-6 py-2 rounded-xl text-sm font-bold hover:bg-blue-100 transition-colors"
              >
                Começar a adicionar campos
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
