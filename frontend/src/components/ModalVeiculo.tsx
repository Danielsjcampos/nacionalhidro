/**
 * Modal de Cadastro/Edição de Veículo
 * Campos: Descricao (UPPERCASE), Placa (UPPERCASE), Tipo, Manutencao, VisivelEstograma, Bicos
 * Seção Funcionários: colapsável, pelo menos 1 obrigatório
 */
import { useState, useEffect } from 'react';
import api from '../services/api';
import { X, ChevronDown, ChevronUp, Plus, Loader2 } from 'lucide-react';

const TIPOS_VEICULO = [
  { value: 'AP', label: 'Alta Pressão (AP)' },
  { value: 'SAP', label: 'Super Alta Pressão (SAP)' },
  { value: 'ALTO_VACUO', label: 'Alto Vácuo' },
  { value: 'COMBINADO', label: 'Combinado' },
  { value: 'CARRETA', label: 'Carreta' },
  { value: 'CARRO_APOIO', label: 'Carro/Apoio' },
];

interface FuncItem { id: string; }
interface Props { data?: any; onClose: () => void; onSaved: () => void; }

export default function ModalVeiculo({ data, onClose, onSaved }: Props) {
  const isEdit = !!data?.id;
  const [saving, setSaving] = useState(false);
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [openFuncs, setOpenFuncs] = useState(true);

  const [form, setForm] = useState({
    descricao: data?.descricao || data?.modelo || '',
    placa: data?.placa || '',
    tipo: data?.tipo || 'AP',
    manutencao: data?.status === 'MANUTENCAO' || data?.manutencao || false,
    visivelEstograma: data?.visivelEstograma ?? (data?.tipo === 'CARRO_APOIO' ? false : true),
    bicos: data?.bicos || 1,
    funcs: (data?.funcionariosIds || []).map((id: string) => ({ id })) as FuncItem[],
  });

  useEffect(() => {
    api.get('/rh').then(r => setFuncionarios(r.data)).catch(() => {});
    if (!isEdit && form.funcs.length === 0) {
      setForm(p => ({ ...p, funcs: [{ id: '' }] }));
    }
  }, []);

  useEffect(() => {
    if (form.tipo === 'CARRO_APOIO') setForm(p => ({ ...p, visivelEstograma: false }));
  }, [form.tipo]);

  const setField = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const updateFunc = (i: number, id: string) => {
    const next = [...form.funcs];
    next[i] = { id };
    setForm(p => ({ ...p, funcs: next }));
  };

  const removeFunc = (i: number) => setForm(p => ({ ...p, funcs: p.funcs.filter((_, idx) => idx !== i) }));

  const canSave =
    form.descricao.trim() !== '' &&
    form.placa.trim() !== '' &&
    form.funcs.length > 0 &&
    form.funcs.every(f => f.id !== '');

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const payload = {
        descricao: form.descricao.toUpperCase(),
        modelo: form.descricao.toUpperCase(),
        placa: form.placa.toUpperCase(),
        tipo: form.tipo,
        manutencao: form.manutencao,
        visivelEstograma: form.visivelEstograma,
        bicos: ['AP', 'SAP'].includes(form.tipo) ? Number(form.bicos) : null,
        funcionariosIds: form.funcs.map(f => f.id),
      };
      if (isEdit) await api.patch(`/logistica/veiculos/${data.id}`, payload);
      else await api.post('/logistica/veiculos', payload);
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const showBicos = ['AP', 'SAP'].includes(form.tipo);

  const inputClass = (valid: boolean) =>
    `w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition ${valid ? 'border-slate-300' : 'border-red-400'}`;

  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="font-black text-slate-800 text-lg uppercase tracking-tight italic">{isEdit ? 'Editar Veículo' : 'Novo Veículo'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition"><X className="w-5 h-5 text-slate-500" /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Row 1: Descricao + Placa */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Veículo *</label>
              <input type="text" value={form.descricao} onChange={e => setField('descricao', e.target.value.toUpperCase())} className={inputClass(form.descricao.trim() !== '')} placeholder="Descrição do veículo" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Placa *</label>
              <input type="text" value={form.placa} onChange={e => setField('placa', e.target.value.toUpperCase())} className={inputClass(form.placa.trim() !== '')} placeholder="AAA-0000" />
            </div>
          </div>

          {/* Row 2: Tipo, Manutencao, Bicos, VisivelEstograma */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Tipo</label>
              <select value={form.tipo} onChange={e => setField('tipo', e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm outline-none bg-white focus:ring-2 focus:ring-blue-500">
                {TIPOS_VEICULO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Manutenção</label>
              <select value={String(form.manutencao)} onChange={e => setField('manutencao', e.target.value === 'true')} className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm outline-none bg-white focus:ring-2 focus:ring-blue-500">
                <option value="false">Não</option>
                <option value="true">Sim</option>
              </select>
            </div>
            {showBicos && (
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Bicos</label>
                <select value={form.bicos} onChange={e => setField('bicos', Number(e.target.value))} className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm outline-none bg-white focus:ring-2 focus:ring-blue-500">
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Visível Estograma</label>
              <button type="button" onClick={() => setField('visivelEstograma', !form.visivelEstograma)} className={`relative inline-flex items-center h-7 w-14 rounded-full transition-colors ${form.visivelEstograma ? 'bg-blue-600' : 'bg-slate-300'}`}>
                <span className={`inline-block w-5 h-5 bg-white rounded-full shadow transform transition-transform ${form.visivelEstograma ? 'translate-x-8' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>

          {/* Seção Funcionários */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button onClick={() => setOpenFuncs(!openFuncs)} className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Funcionários Responsáveis *</span>
              {openFuncs ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>
            {openFuncs && (
              <div className="p-4 space-y-2">
                {form.funcs.map((f, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <select
                      value={f.id}
                      onChange={e => updateFunc(i, e.target.value)}
                      className={`flex-1 border rounded-xl px-3 py-2 text-sm outline-none bg-white focus:ring-2 focus:ring-blue-500 transition ${f.id ? 'border-slate-300' : 'border-red-400'}`}
                    >
                      <option value="">Selecione o funcionário</option>
                      {funcionarios.map((fn: any) => (
                        <option key={fn.id} value={fn.id}>{fn.nome} — {fn.cargo}</option>
                      ))}
                    </select>
                    <button onClick={() => removeFunc(i)} className="text-red-400 hover:text-red-600 p-1"><X className="w-4 h-4" /></button>
                  </div>
                ))}
                <button onClick={() => setForm(p => ({ ...p, funcs: [...p.funcs, { id: '' }] }))} className="text-blue-600 text-xs font-semibold hover:underline flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Adicionar Funcionário
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">Cancelar</button>
          <button onClick={handleSave} disabled={!canSave || saving} className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
