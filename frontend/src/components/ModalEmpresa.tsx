/**
 * ModalEmpresa — Cadastro/Edição de Empresa (EmpresaCNPJ)
 * Seções: Dados Principais, Fiscal/Integração, Dados Bancários (array)
 */
import { useState, useEffect } from 'react';
import api from '../services/api';
import { X, Plus, Loader2 } from 'lucide-react';

// ── Enums ──────────────────────────────────────────────────────────
const REGIMES = [
  { value: 1, label: 'Simples Nacional' },
  { value: 2, label: 'Lucro Presumido' },
  { value: 3, label: 'Lucro Real' },
];

const ESTADOS_BR = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

// ── Masks ──────────────────────────────────────────────────────────
const maskCNPJ = (v: string) =>
  v.replace(/\D/g, '')
   .replace(/(\d{2})(\d)/, '$1.$2')
   .replace(/(\d{3})(\d)/, '$1.$2')
   .replace(/(\d{3})(\d)/, '$1/$2')
   .replace(/(\d{4})(\d)/, '$1-$2')
   .slice(0, 18);

const maskPhone = (v: string) =>
  v.replace(/\D/g, '')
   .replace(/(\d{2})(\d)/, '($1) $2')
   .replace(/(\d{5})(\d)/, '$1-$2')
   .slice(0, 15);

// ── Types ──────────────────────────────────────────────────────────
interface Banco { _id: string; banco: string; agencia: string; conta: string; }

interface Props { data?: any; onClose: () => void; onSaved: () => void; }

const newBanco = (): Banco => ({ _id: Math.random().toString(36).slice(2), banco: '', agencia: '', conta: '' });

// ── Component ──────────────────────────────────────────────────────
export default function ModalEmpresa({ data, onClose, onSaved }: Props) {
  const isEdit = !!data?.id;
  const [saving, setSaving] = useState(false);
  const [cidades, setCidades] = useState<string[]>([]);

  const [form, setForm] = useState({
    nome: data?.nome || '',
    cnpj: data?.cnpj || '',
    endereco: data?.endereco || '',
    numero: data?.numero || '',
    logradouro: data?.logradouro || '',
    bairro: data?.bairro || '',
    uf: data?.uf || '',
    telefone: data?.telefone || '',
    municipio: data?.municipio || '',
    codigoMunicipio: data?.codigoMunicipio || '',
    cep: data?.cep || '',
    cnae: data?.cnae || '',
    rntrc: data?.rntrc || '',
    inscricaoEstadual: data?.inscricaoEstadual || '',
    inscricaoMunicipal: data?.inscricaoMunicipal || '',
    regimeTributario: data?.regimeTributario || 1,
    dadosDeposito: data?.dadosDeposito || '',
    naturezaOperacao: data?.naturezaOperacao || '',
    focusToken: data?.focusToken || '',
    focusAmbiente: data?.focusAmbiente || 'homologacao',
    bancos: (data?.bancos || []).map((b: any) => ({ ...b, _id: b.id || Math.random().toString(36).slice(2) })) as Banco[],
  });

  // Carregar municípios ao selecionar UF
  useEffect(() => {
    if (!form.uf || form.uf.length !== 2) { setCidades([]); return; }
    api.get(`/clientes/cidades?uf=${form.uf}`).then(r => setCidades(r.data || [])).catch(() => setCidades([]));
  }, [form.uf]);

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const canSave = form.nome.trim() !== '' && form.cnpj.replace(/\D/g, '').length === 14;

  const bancoValid = (b: Banco) => b.banco.trim() !== '' && b.agencia.trim() !== '' && b.conta.trim() !== '';

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        nome: form.nome.toUpperCase(),
        endereco: form.endereco.toUpperCase(),
        logradouro: form.logradouro.toUpperCase(),
        bairro: form.bairro.toUpperCase(),
        uf: form.uf.toUpperCase(),
        dadosDeposito: form.dadosDeposito.toUpperCase(),
        naturezaOperacao: form.naturezaOperacao.toUpperCase(),
        focusToken: form.focusToken.toUpperCase(),
        regimeTributario: Number(form.regimeTributario),
        bancos: form.bancos.map(({ _id, ...b }) => ({ ...b, banco: b.banco.toUpperCase() })),
      };
      if (isEdit) await api.patch(`/empresas/${data.id}`, payload);
      else await api.post('/empresas', payload);
      onSaved();
      onClose();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const inputClass = (valid = true) =>
    `w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition ${valid ? 'border-slate-300' : 'border-red-400'}`;

  const updateBanco = (id: string, k: keyof Banco, v: string) =>
    set('bancos', form.bancos.map(b => b._id === id ? { ...b, [k]: v } : b));

  const removeBanco = (id: string) =>
    set('bancos', form.bancos.filter(b => b._id !== id));

  const SectionTitle = ({ color, label }: { color: string; label: string }) => (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
      <div className={`w-1.5 h-4 rounded-full ${color}`} />
      <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">{label}</h3>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h2 className="font-black text-slate-800 text-lg uppercase tracking-tight italic">
            {isEdit ? 'Editar Empresa' : 'Nova Empresa'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-8">

          {/* ── Dados Principais ── */}
          <section>
            <SectionTitle color="bg-blue-500" label="Dados Principais" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Razão Social *</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={e => set('nome', e.target.value.toUpperCase())}
                  className={inputClass(form.nome.trim() !== '')}
                  placeholder="RAZÃO SOCIAL DA EMPRESA"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">CNPJ *</label>
                <input
                  type="text"
                  value={form.cnpj}
                  onChange={e => set('cnpj', maskCNPJ(e.target.value))}
                  className={inputClass(form.cnpj.replace(/\D/g, '').length === 14)}
                  placeholder="XX.XXX.XXX/XXXX-XX"
                  maxLength={18}
                />
              </div>

              {/* Endereço */}
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Endereço</label>
                <input type="text" value={form.endereco} onChange={e => set('endereco', e.target.value.toUpperCase())} className={inputClass()} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Número</label>
                <input type="number" value={form.numero} onChange={e => set('numero', e.target.value)} className={inputClass()} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Complemento</label>
                <input type="text" value={form.logradouro} onChange={e => set('logradouro', e.target.value.toUpperCase())} className={inputClass()} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Bairro</label>
                <input type="text" value={form.bairro} onChange={e => set('bairro', e.target.value.toUpperCase())} className={inputClass()} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">UF</label>
                <select value={form.uf} onChange={e => { set('uf', e.target.value.toUpperCase()); set('municipio', ''); set('codigoMunicipio', ''); }}
                  className={`${inputClass()} bg-white appearance-none`}>
                  <option value="">UF</option>
                  {ESTADOS_BR.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Município</label>
                {cidades.length > 0 ? (
                  <select value={form.municipio} onChange={e => {
                    const opt = e.target.selectedOptions[0];
                    set('municipio', opt.value);
                    set('codigoMunicipio', opt.dataset.codigo || '');
                  }} className={`${inputClass()} bg-white appearance-none`}>
                    <option value="">Selecione...</option>
                    {cidades.map((c: any) => (
                      <option key={c.codigo || c} value={c.nome || c} data-codigo={c.codigo || ''}>{c.nome || c}</option>
                    ))}
                  </select>
                ) : (
                  <input type="text" value={form.municipio} onChange={e => set('municipio', e.target.value)} className={inputClass()} placeholder="Município" />
                )}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">CEP</label>
                <input type="text" value={form.cep} onChange={e => set('cep', e.target.value)} className={inputClass()} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Telefone</label>
                <input type="text" value={form.telefone} onChange={e => set('telefone', maskPhone(e.target.value))} className={inputClass()} placeholder="(99) 99999-9999" maxLength={15} />
              </div>
            </div>
          </section>

          {/* ── Fiscal e Integração ── */}
          <section>
            <SectionTitle color="bg-emerald-500" label="Fiscal / Integração FocusNFe" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">CNAE</label>
                <input type="text" value={form.cnae} onChange={e => set('cnae', e.target.value)} className={inputClass()} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">RNTRC</label>
                <input type="text" value={form.rntrc} onChange={e => set('rntrc', e.target.value)} className={inputClass()} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Inscrição Estadual</label>
                <input type="text" value={form.inscricaoEstadual} onChange={e => set('inscricaoEstadual', e.target.value)} className={inputClass()} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Inscrição Municipal</label>
                <input type="text" value={form.inscricaoMunicipal} onChange={e => set('inscricaoMunicipal', e.target.value)} className={inputClass()} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Regime Tributário</label>
                <select value={form.regimeTributario} onChange={e => set('regimeTributario', Number(e.target.value))} className={`${inputClass()} bg-white`}>
                  {REGIMES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Natureza da Operação</label>
                <input type="text" value={form.naturezaOperacao} onChange={e => set('naturezaOperacao', e.target.value.toUpperCase())} className={inputClass()} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Dados de Depósito</label>
                <input type="text" value={form.dadosDeposito} onChange={e => set('dadosDeposito', e.target.value.toUpperCase())} className={inputClass()} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Ambiente FocusNFe</label>
                <select value={form.focusAmbiente} onChange={e => set('focusAmbiente', e.target.value)} className={`${inputClass()} bg-white`}>
                  <option value="homologacao">Homologação</option>
                  <option value="producao">Produção</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Focus Token</label>
                <input type="text" value={form.focusToken} onChange={e => set('focusToken', e.target.value.toUpperCase())} className={inputClass()} placeholder="TOKEN DE AUTENTICAÇÃO FOCUSNFE" />
              </div>
            </div>
          </section>

          {/* ── Dados Bancários (array) ── */}
          <section>
            <SectionTitle color="bg-amber-500" label="Dados Bancários" />
            <div className="space-y-3">
              {form.bancos.map((b) => (
                <div key={b._id} className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Banco *</label>
                    <input type="text" value={b.banco} onChange={e => updateBanco(b._id, 'banco', e.target.value.toUpperCase())}
                      className={`w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition bg-white ${b.banco.trim() ? 'border-slate-300' : 'border-red-400'}`} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Agência *</label>
                    <input type="text" value={b.agencia} onChange={e => updateBanco(b._id, 'agencia', e.target.value)}
                      className={`w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition bg-white ${b.agencia.trim() ? 'border-slate-300' : 'border-red-400'}`} />
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Conta *</label>
                      <input type="text" value={b.conta} onChange={e => updateBanco(b._id, 'conta', e.target.value)}
                        className={`w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition bg-white ${b.conta.trim() ? 'border-slate-300' : 'border-red-400'}`} />
                    </div>
                    <button onClick={() => removeBanco(b._id)} className="mb-0.5 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={() => set('bancos', [...form.bancos, newBanco()])}
                className="text-blue-600 text-xs font-bold hover:underline flex items-center gap-1 pt-1">
                <Plus className="w-3 h-3" /> Adicionar Banco
              </button>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving || form.bancos.some(b => !bancoValid(b))}
            className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
