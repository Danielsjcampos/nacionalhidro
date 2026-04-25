/**
 * Modal de Usuário com upload de assinatura e confirmação antes de salvar
 */
import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { X, Loader2 } from 'lucide-react';

interface Props { data?: any; onClose: () => void; onSaved: () => void; }

export default function ModalUsuario({ data, onClose, onSaved }: Props) {
  const isEdit = !!data?.id;
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [roles, setRoles] = useState<any[]>([]);
  const [signFile, setSignFile] = useState<File | null>(null);
  const [showSignInput, setShowSignInput] = useState(!data?.signatureUrl);
  const signRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    username: data?.name || '',
    email: data?.email || '',
    roleId: data?.roleId || data?.role?.id || '',
    blocked: data?.blocked || data?.isAtivo === false || false,
    signatureUrl: data?.signatureUrl || '',
  });

  useEffect(() => {
    api.get('/categorias').then(r => setRoles(r.data)).catch(() => {});
  }, []);

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const canSave = form.username.trim() !== '' && form.email.trim() !== '';

  const executeSave = async () => {
    setSaving(true);
    try {
      let signatureUrl = form.signatureUrl;
      if (signFile) {
        const fd = new FormData();
        fd.append('file', signFile);
        const up = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        signatureUrl = up.data.url;
      }
      const payload = {
        name: form.username.toUpperCase(),
        email: form.email.toUpperCase(),
        roleId: form.roleId || null,
        isAtivo: !form.blocked,
        signatureUrl,
      };
      if (isEdit) await api.patch(`/equipe/members/${data.id}`, payload);
      else await api.post('/equipe/members', payload);
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
      setShowConfirm(false);
    }
  };

  const inputClass = (valid: boolean) =>
    `w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition ${valid ? 'border-slate-300' : 'border-red-400'}`;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <h2 className="font-black text-slate-800 text-lg uppercase tracking-tight italic">{isEdit ? 'Editar Usuário' : 'Novo Usuário'}</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition"><X className="w-5 h-5 text-slate-500" /></button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Nome *</label>
              <input type="text" value={form.username} onChange={e => set('username', e.target.value.toUpperCase())} className={inputClass(form.username.trim() !== '')} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">E-mail *</label>
              <input type="text" value={form.email} onChange={e => set('email', e.target.value.toUpperCase())} className={inputClass(form.email.trim() !== '')} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Permissão (Role)</label>
              <select value={form.roleId} onChange={e => set('roleId', e.target.value)} className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none bg-white focus:ring-2 focus:ring-blue-500 transition ${form.roleId ? 'border-slate-300' : 'border-red-400'}`}>
                <option value="">Selecione</option>
                {roles.map((r: any) => <option key={r.id} value={r.id}>{r.nome}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-600 uppercase">Bloqueado</label>
              <button type="button" onClick={() => set('blocked', !form.blocked)} className={`relative inline-flex items-center h-7 w-14 rounded-full transition-colors ${form.blocked ? 'bg-red-500' : 'bg-slate-300'}`}>
                <span className={`inline-block w-5 h-5 bg-white rounded-full shadow transform transition-transform ${form.blocked ? 'translate-x-8' : 'translate-x-1'}`} />
              </button>
            </div>

            {/* Assinatura */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Assinatura Digital</label>
              {form.signatureUrl && !showSignInput ? (
                <div className="flex items-center gap-4">
                  <img src={form.signatureUrl} alt="Assinatura" className="h-16 object-contain rounded-lg border border-slate-200 shadow bg-white p-2" />
                  <button onClick={() => { setShowSignInput(true); setSignFile(null); }} className="text-xs text-blue-600 hover:underline font-semibold">Importar nova</button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <input ref={signRef} type="file" accept="image/*" onChange={e => { if (e.target.files?.[0]) { setSignFile(e.target.files[0]); setForm(p => ({ ...p, signatureUrl: URL.createObjectURL(e.target.files![0]) })); setShowSignInput(false); } }} className="hidden" />
                  <button onClick={() => signRef.current?.click()} className="px-4 py-2 border-2 border-dashed border-slate-300 rounded-xl text-xs text-slate-500 hover:border-blue-400 hover:text-blue-600 transition font-semibold">
                    Selecionar imagem de assinatura
                  </button>
                  {form.signatureUrl && <button onClick={() => setShowSignInput(false)} className="text-xs text-slate-500 hover:underline">Cancelar</button>}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100">
            <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">Cancelar</button>
            <button onClick={() => setShowConfirm(true)} disabled={!canSave || saving} className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-40 flex items-center gap-2 transition">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}Salvar
            </button>
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl text-center">
            <p className="text-sm font-bold text-slate-800 mb-4">Tem certeza que deseja salvar os dados?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-600">Cancelar</button>
              <button onClick={executeSave} disabled={saving} className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
