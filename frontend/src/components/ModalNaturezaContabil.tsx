/**
 * ModalNaturezaContabil — Cadastro/Edição simples
 * Campos: Descricao (UPPERCASE), Inativo
 */
import { useState } from 'react';
import api from '../services/api';
import { X, Loader2 } from 'lucide-react';

interface Props { data?: any; onClose: () => void; onSaved: () => void; }

export default function ModalNaturezaContabil({ data, onClose, onSaved }: Props) {
  const isEdit = !!data?.id;
  const [saving, setSaving] = useState(false);
  const [descricao, setDescricao] = useState(data?.descricao || '');
  const [inativo, setInativo] = useState(data?.inativo ?? false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { descricao: descricao.toUpperCase(), inativo };
      if (isEdit) await api.patch(`/naturezas/${data.id}`, payload);
      else await api.post('/naturezas', payload);
      onSaved();
      onClose();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="font-black text-slate-800 text-lg uppercase tracking-tight italic">{isEdit ? 'Editar Natureza Contábil' : 'Nova Natureza Contábil'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition"><X className="w-5 h-5 text-slate-500" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Descrição</label>
            <input type="text" value={descricao} onChange={e => setDescricao(e.target.value.toUpperCase())} className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Inativo</label>
            <select value={String(inativo)} onChange={e => setInativo(e.target.value === 'true')} className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none bg-white focus:ring-2 focus:ring-blue-500">
              <option value="false">Não</option>
              <option value="true">Sim</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-40 flex items-center gap-2 transition">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
