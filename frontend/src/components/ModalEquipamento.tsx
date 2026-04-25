/**
 * Modal de Equipamento com seções colapsáveis:
 * Responsabilidades, Acessórios, Veículos, Natureza Contábil
 * Upload de imagem + preview + confirmação antes de salvar
 */
import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { X, ChevronDown, ChevronUp, Plus, Loader2, Upload, Image } from 'lucide-react';

interface SectionItem { _id: string; [k: string]: any; }
interface Props { data?: any; onClose: () => void; onSaved: () => void; }

const newId = () => Math.random().toString(36).slice(2);

export default function ModalEquipamento({ data, onClose, onSaved }: Props) {
  const isEdit = !!data?.id;
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [responsabilidades, setResponsabilidades] = useState<any[]>([]);
  const [acessoriosList, setAcessoriosList] = useState<any[]>([]);
  const [veiculosList, setVeiculosList] = useState<any[]>([]);
  const [naturezasList, setNaturezasList] = useState<any[]>([]);
  const [responsabilidadesPadrao, setResponsabilidadesPadrao] = useState<any[]>([]);

  const [openResp, setOpenResp] = useState(true);
  const [openAcess, setOpenAcess] = useState(false);
  const [openVeic, setOpenVeic] = useState(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(data?.imagem || '');
  const [showImageInput, setShowImageInput] = useState(!data?.imagem);
  const imgInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    nome: data?.nome || '',
    descricao: data?.descricao || '',
    ativo: data?.ativo !== undefined ? data.ativo : true,
    naturezaId: data?.naturezaId || '',
    secResp: ((data?.responsabilidades || []) as any[]).map((r: any) => ({ _id: newId(), ...r })) as SectionItem[],
    secAcess: ((data?.acessorios || []) as any[]).map((a: any) => ({ _id: newId(), ...a })) as SectionItem[],
    secVeic: ((data?.veiculos || []) as any[]).map((v: any) => ({ _id: newId(), ...v })) as SectionItem[],
  });

  useEffect(() => {
    Promise.all([
      api.get('/responsabilidades'),
      api.get('/acessorios'),
      api.get('/logistica/veiculos').catch(() => ({ data: [] })),
      api.get('/naturezas'),
    ]).then(([r, a, v, n]) => {
      setResponsabilidades(r.data);
      setAcessoriosList(a.data);
      setVeiculosList(v.data);
      setNaturezasList(n.data);
      // Pré-popular no cadastro novo
      if (!isEdit) {
        const padrao = (r.data as any[]).filter((x: any) => x.padrao);
        setResponsabilidadesPadrao(padrao);
        if (padrao.length > 0) {
          setForm(p => ({ ...p, secResp: padrao.map((x: any) => ({ _id: newId(), responsabilidadeId: x.id, descricao: x.descricao, padrao: true, responsavel: x.tipo })) }));
        }
        const padraoAcess = (a.data as any[]).filter((x: any) => x.padrao);
        if (padraoAcess.length > 0) {
          setForm(p => ({ ...p, secAcess: padraoAcess.map((x: any) => ({ _id: newId(), acessorioId: x.id, nome: x.nome, padrao: true })) }));
        }
      }
    }).catch(() => {});
  }, []);

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleImage = (file: File) => {
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setShowImageInput(false);
  };

  const canSave = form.nome.trim() !== '' && form.descricao.trim() !== '' && form.ativo !== null && form.ativo !== undefined;

  const executeSave = async () => {
    setSaving(true);
    try {
      let imagemUrl = imagePreview.startsWith('blob:') ? data?.imagem : imagePreview;
      if (imageFile) {
        const fd = new FormData();
        fd.append('file', imageFile);
        const up = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        imagemUrl = up.data.url;
      }
      const payload = {
        nome: form.nome,
        descricao: form.descricao,
        ativo: form.ativo,
        imagem: imagemUrl,
        responsabilidades: form.secResp.map(({ _id, ...rest }) => rest),
        acessorios: form.secAcess.map(({ _id, ...rest }) => rest),
        veiculos: form.secVeic.map(({ _id, ...rest }) => rest),
        naturezaId: form.naturezaId || null,
      };
      if (isEdit) await api.patch(`/equipamentos/${data.id}`, payload);
      else await api.post('/equipamentos', payload);
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

  const CollapsibleSection = ({ label, open, toggle, children }: any) => (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button onClick={toggle} className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition">
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{label}</span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>
      {open && <div className="p-4 space-y-2">{children}</div>}
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <h2 className="font-black text-slate-800 text-lg uppercase tracking-tight italic">{isEdit ? 'Editar Equipamento' : 'Novo Equipamento'}</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition"><X className="w-5 h-5 text-slate-500" /></button>
          </div>

          <div className="p-6 space-y-5">
            {/* Nome + Ativo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Equipamento *</label>
                <input type="text" value={form.nome} onChange={e => set('nome', e.target.value)} className={inputClass(form.nome.trim() !== '')} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Ativo *</label>
                <select value={String(form.ativo)} onChange={e => set('ativo', e.target.value === 'true')} className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none bg-white focus:ring-2 focus:ring-blue-500 transition ${form.ativo !== null ? 'border-slate-300' : 'border-red-400'}`}>
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </select>
              </div>
            </div>

            {/* Descricao */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Descrição *</label>
              <textarea value={form.descricao} onChange={e => set('descricao', e.target.value)} rows={3} className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none transition ${form.descricao.trim() !== '' ? 'border-slate-300' : 'border-red-400'}`} />
            </div>

            {/* Imagem */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Imagem</label>
              {imagePreview && !showImageInput ? (
                <div className="flex items-center gap-4">
                  <img src={imagePreview} alt="Equipamento" className="h-24 w-24 object-cover rounded-xl border border-slate-200 shadow" />
                  <button onClick={() => { setShowImageInput(true); setImagePreview(''); }} className="text-xs text-blue-600 hover:underline font-semibold">Alterar imagem</button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <input ref={imgInputRef} type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleImage(e.target.files[0])} className="hidden" />
                  <button onClick={() => imgInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600 transition">
                    <Upload className="w-4 h-4" /> Selecionar imagem
                  </button>
                </div>
              )}
            </div>

            {/* Responsabilidades */}
            <CollapsibleSection label="Responsabilidades" open={openResp} toggle={() => setOpenResp(!openResp)}>
              {form.secResp.map((r, i) => (
                <div key={r._id} className="flex items-center gap-3">
                  {r.padrao ? (
                    <input disabled value={r.descricao} className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 text-slate-500" />
                  ) : (
                    <select value={r.responsabilidadeId || ''} onChange={e => { const found = responsabilidades.find((x: any) => x.id === e.target.value); const next = [...form.secResp]; next[i] = { ...r, responsabilidadeId: e.target.value, descricao: found?.descricao, responsavel: found?.tipo }; set('secResp', next); }} className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none bg-white focus:ring-2 focus:ring-blue-500">
                      <option value="">Selecione</option>
                      {responsabilidades.map((x: any) => <option key={x.id} value={x.id}>{x.descricao}</option>)}
                    </select>
                  )}
                  <input disabled value={r.responsavel || ''} className="w-32 border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-50 text-slate-500" placeholder="Responsável" />
                  {!r.padrao && <button onClick={() => set('secResp', form.secResp.filter(x => x._id !== r._id))} className="text-red-400 hover:text-red-600 p-1"><X className="w-4 h-4" /></button>}
                </div>
              ))}
              <button onClick={() => set('secResp', [...form.secResp, { _id: newId(), responsabilidadeId: '', padrao: false }])} className="text-blue-600 text-xs font-semibold hover:underline flex items-center gap-1">
                <Plus className="w-3 h-3" /> Adicionar Responsabilidade
              </button>
            </CollapsibleSection>

            {/* Acessórios */}
            <CollapsibleSection label="Acessórios" open={openAcess} toggle={() => setOpenAcess(!openAcess)}>
              {form.secAcess.map((a, i) => (
                <div key={a._id} className="flex items-center gap-3">
                  {a.padrao ? (
                    <input disabled value={a.nome} className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 text-slate-500" />
                  ) : (
                    <select value={a.acessorioId || ''} onChange={e => { const found = acessoriosList.find((x: any) => x.id === e.target.value); const next = [...form.secAcess]; next[i] = { ...a, acessorioId: e.target.value, nome: found?.nome }; set('secAcess', next); }} className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none bg-white focus:ring-2 focus:ring-blue-500">
                      <option value="">Selecione</option>
                      {acessoriosList.map((x: any) => <option key={x.id} value={x.id}>{x.nome}</option>)}
                    </select>
                  )}
                  {!a.padrao && <button onClick={() => set('secAcess', form.secAcess.filter(x => x._id !== a._id))} className="text-red-400 hover:text-red-600 p-1"><X className="w-4 h-4" /></button>}
                </div>
              ))}
              <button onClick={() => set('secAcess', [...form.secAcess, { _id: newId(), acessorioId: '', padrao: false }])} className="text-blue-600 text-xs font-semibold hover:underline flex items-center gap-1">
                <Plus className="w-3 h-3" /> Adicionar Acessório
              </button>
            </CollapsibleSection>

            {/* Veículos */}
            <CollapsibleSection label="Veículos" open={openVeic} toggle={() => setOpenVeic(!openVeic)}>
              {form.secVeic.map((v, i) => (
                <div key={v._id} className="flex items-center gap-3">
                  <select value={v.veiculoId || ''} onChange={e => { const next = [...form.secVeic]; next[i] = { ...v, veiculoId: e.target.value }; set('secVeic', next); }} className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none bg-white focus:ring-2 focus:ring-blue-500">
                    <option value="">Selecione o veículo</option>
                    {veiculosList.map((x: any) => <option key={x.id} value={x.id}>{x.descricao || x.modelo}</option>)}
                  </select>
                  <button onClick={() => set('secVeic', form.secVeic.filter(x => x._id !== v._id))} className="text-red-400 hover:text-red-600 p-1"><X className="w-4 h-4" /></button>
                </div>
              ))}
              <button onClick={() => set('secVeic', [...form.secVeic, { _id: newId(), veiculoId: '' }])} className="text-blue-600 text-xs font-semibold hover:underline flex items-center gap-1">
                <Plus className="w-3 h-3" /> Adicionar Veículo
              </button>
            </CollapsibleSection>

            {/* Natureza Contábil */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Natureza Contábil</label>
              <select value={form.naturezaId} onChange={e => set('naturezaId', e.target.value)} className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none bg-white focus:ring-2 focus:ring-blue-500">
                <option value="">Nenhuma</option>
                {naturezasList.map((n: any) => <option key={n.id} value={n.id}>{n.descricao}</option>)}
              </select>
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
