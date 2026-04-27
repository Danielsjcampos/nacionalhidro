import { useState } from 'react';
import api from '../services/api';
import { X, Loader2, Package } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface Props {
  data?: any;
  onClose: () => void;
  onSaved: () => void;
}

export default function ModalAcessorio({ data, onClose, onSaved }: Props) {
  const isEdit = !!data?.id;
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  
  const [nome, setNome] = useState(data?.nome || '');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/acessorios/${data.id}`, { nome });
      } else {
        await api.post('/acessorios', { nome });
      }
      showToast(`Acessório ${isEdit ? 'atualizado' : 'cadastrado'} com sucesso!`);
      onSaved();
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar acessório.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        <div className="p-6 bg-slate-800 border-b border-slate-900 flex justify-between items-center italic">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
              <Package className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-sm font-black text-white uppercase tracking-widest">
              {isEdit ? 'Editar Acessório Tecnico' : 'Novo Registro de Acessório'}
            </h2>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-2 hover:bg-white/10 rounded-full text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-8 space-y-6 bg-slate-50/30">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase italic tracking-widest ml-1">
              Nome do Acessório / Ferramental
            </label>
            <input
              autoFocus
              value={nome}
              onChange={(e) => setNome(e.target.value.toUpperCase())}
              className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all italic shadow-sm"
              placeholder="Ex: MANGUEIRA DE SUCÇÃO 4&quot;"
              required
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-3.5 rounded-2xl bg-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-slate-300 transition-all italic"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !nome.trim()}
              className="px-10 py-3.5 rounded-2xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 italic flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Confirmar Registro'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
