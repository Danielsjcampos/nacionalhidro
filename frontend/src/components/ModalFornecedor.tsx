/**
 * Modal de Cadastro/Edição de Fornecedor
 * Seções: Principal, Dados Contato, Dados Bancários
 * Melhoria: campo TipoFornecedor
 */
import { useState } from 'react';
import api from '../services/api';
import { X, Loader2 } from 'lucide-react';

const TIPOS_FORNECEDOR = [
  { value: 'geral', label: 'Geral' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'agencia', label: 'Agência de Viagem' },
  { value: 'transportadora', label: 'Transportadora' },
];

const TIPOS_PIX = ['CNPJ', 'Email', 'Celular', 'Aleatório'];

interface Props { data?: any; onClose: () => void; onSaved: () => void; }

const applyMaskCNPJ = (v: string) => v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d)/, '$1-$2').slice(0, 18);
const applyMaskPhone = (v: string) => v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 15);

export default function ModalFornecedor({ data, onClose, onSaved }: Props) {
  const isEdit = !!data?.id;
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    nome: data?.nome || '',
    nomeFantasia: data?.nomeFantasia || '',
    cnpj: data?.cnpj || data?.documento || '',
    inscricao: data?.inscricao || data?.inscricaoEstadual || '',
    endereco: data?.endereco || '',
    email: data?.email || '',
    telefone: data?.telefone || '',
    bloqueado: data?.bloqueado ?? false,
    tipoFornecedor: data?.tipoFornecedor || 'geral',
    contatoFinanceiro: data?.contatoFinanceiro || '',
    contatoVenda: data?.contatoVenda || '',
    tipoPix: data?.tipoPix || '',
    chavePix: data?.chavePix || '',
    banco: data?.banco || '',
    agenciaBanco: data?.agenciaBanco || data?.agencia || '',
    contaBanco: data?.contaBanco || data?.conta || '',
  });

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        nome: form.nome.toUpperCase(),
        nomeFantasia: form.nomeFantasia.toUpperCase(),
        endereco: form.endereco.toUpperCase(),
        email: form.email.toUpperCase(),
        contatoFinanceiro: form.contatoFinanceiro.toUpperCase(),
        contatoVenda: form.contatoVenda.toUpperCase(),
        documento: form.cnpj,
        inscricaoEstadual: form.inscricao,
        agencia: form.agenciaBanco,
        conta: form.contaBanco,
      };
      if (isEdit) await api.patch(`/fornecedores/${data.id}`, payload);
      else await api.post('/fornecedores', payload);
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition';
  const textareaClass = 'w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition resize-none';

  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="font-black text-slate-800 text-lg uppercase tracking-tight italic">{isEdit ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition"><X className="w-5 h-5 text-slate-500" /></button>
        </div>

        <div className="p-6 space-y-6">
          {/* Seção Principal */}
          <div>
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Dados Principais</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Tipo de Fornecedor</label>
                <select value={form.tipoFornecedor} onChange={e => set('tipoFornecedor', e.target.value)} className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none bg-white focus:ring-2 focus:ring-blue-500">
                  {TIPOS_FORNECEDOR.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Nome (Razão Social)</label>
                <input type="text" value={form.nome} onChange={e => set('nome', e.target.value.toUpperCase())} className={inputClass} placeholder="RAZÃO SOCIAL" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Nome Fantasia</label>
                <input type="text" value={form.nomeFantasia} onChange={e => set('nomeFantasia', e.target.value.toUpperCase())} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">CNPJ</label>
                <input type="text" value={form.cnpj} onChange={e => set('cnpj', applyMaskCNPJ(e.target.value))} className={inputClass} placeholder="XX.XXX.XXX/XXXX-XX" maxLength={18} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Inscrição Estadual</label>
                <input type="text" value={form.inscricao} onChange={e => set('inscricao', e.target.value)} className={inputClass} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Endereço</label>
                <input type="text" value={form.endereco} onChange={e => set('endereco', e.target.value.toUpperCase())} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">E-mail</label>
                <input type="text" value={form.email} onChange={e => set('email', e.target.value.toUpperCase())} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Telefone</label>
                <input type="text" value={form.telefone} onChange={e => set('telefone', applyMaskPhone(e.target.value))} className={inputClass} placeholder="(99) 99999-9999" maxLength={15} />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-slate-600 uppercase">Bloqueado</label>
                <button type="button" onClick={() => set('bloqueado', !form.bloqueado)} className={`relative inline-flex items-center h-7 w-14 rounded-full transition-colors ${form.bloqueado ? 'bg-red-500' : 'bg-slate-300'}`}>
                  <span className={`inline-block w-5 h-5 bg-white rounded-full shadow transform transition-transform ${form.bloqueado ? 'translate-x-8' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Dados Contato */}
          <div>
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Dados Contato</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Contato Financeiro</label>
                <textarea value={form.contatoFinanceiro} onChange={e => set('contatoFinanceiro', e.target.value.toUpperCase())} rows={3} className={textareaClass} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Contato Venda</label>
                <textarea value={form.contatoVenda} onChange={e => set('contatoVenda', e.target.value.toUpperCase())} rows={3} className={textareaClass} />
              </div>
            </div>
          </div>

          {/* Dados Bancários */}
          <div>
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Dados Bancários</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Tipo Pix</label>
                <select value={form.tipoPix} onChange={e => set('tipoPix', e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm outline-none bg-white focus:ring-2 focus:ring-blue-500">
                  <option value="">Selecione</option>
                  {TIPOS_PIX.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="col-span-3">
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Chave Pix</label>
                <input type="text" value={form.chavePix} onChange={e => set('chavePix', e.target.value)} className={inputClass} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Banco</label>
                <input type="text" value={form.banco} onChange={e => set('banco', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Agência</label>
                <input type="text" value={form.agenciaBanco} onChange={e => set('agenciaBanco', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Conta</label>
                <input type="text" value={form.contaBanco} onChange={e => set('contaBanco', e.target.value)} className={inputClass} />
              </div>
            </div>
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
