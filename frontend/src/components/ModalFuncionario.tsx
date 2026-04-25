/**
 * Modal de Cadastro/Edição de Funcionário
 * Campos: Nome, Cargo, Empresa, Função, MotivoAfastamento, datas, Bloqueado
 * Seção Documentos: 3 abas (Pessoais, Integrações, Segurança)
 */
import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import api from '../services/api';
import { X, ChevronDown, Download, Trash2, Plus, Send, Loader2 } from 'lucide-react';

// ── Enums ──────────────────────────────────────────────────────────────────────

const MOTIVOS_AFASTAMENTO = [
  { value: 0, label: 'Nenhum' },
  { value: 1, label: 'Férias' },
  { value: 2, label: 'Atestado' },
  { value: 3, label: 'Afastamento' },
  { value: 4, label: 'Licença' },
];

const EMPRESAS = [
  { value: 'hidro', label: 'Nacional Hidro Saneamento' },
  { value: 'locacao', label: 'Nacional Locação' },
];

const FUNCOES = [
  { value: 'jatista_junior', label: 'Jatista Júnior' },
  { value: 'jatista_pleno', label: 'Jatista Pleno' },
  { value: 'jatista_senior', label: 'Jatista Sênior' },
  { value: 'motorista_operador', label: 'Motorista Operador' },
  { value: 'motorista_carreteiro', label: 'Motorista Carreteiro' },
  { value: 'ajudante', label: 'Ajudante' },
  { value: 'tecnico_seguranca', label: 'Técnico de Segurança' },
  { value: 'engenheiro', label: 'Engenheiro' },
  { value: 'lider', label: 'Líder' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'pj', label: 'PJ' },
  { value: 'outros', label: 'Outros' },
];

// ── Types ──────────────────────────────────────────────────────────────────────

interface DocItem {
  _localId: string;
  id?: number;
  descricao: string;
  urlArquivo?: string;
  selecionado: boolean;
  file?: File;
  filename?: string;
  tipo?: string;
  extension?: string;
  showInput?: boolean;
}

interface FuncionarioData {
  nome: string;
  cargoId: string;
  empresa: string;
  funcao: string;
  motivoAfastamento: number;
  inicioAfastamento: string;
  fimAfastamento: string;
  bloqueado: boolean;
  documentosPessoais: DocItem[];
  documentosIntegracoes: DocItem[];
  documentosSeguranca: DocItem[];
}

interface Props {
  data?: any;
  onClose: () => void;
  onSaved: () => void;
}

// ── Helper ─────────────────────────────────────────────────────────────────────

const newDoc = (): DocItem => ({ _localId: uuidv4(), descricao: '', selecionado: false });

// ── Seção de Documentos (reutilizável por aba) ─────────────────────────────────

function DocSection({ docs, onChange }: { docs: DocItem[]; onChange: (d: DocItem[]) => void }) {
  const [sendModal, setSendModal] = useState(false);
  const [emails, setEmails] = useState('');

  const update = (localId: string, patch: Partial<DocItem>) =>
    onChange(docs.map(d => d._localId === localId ? { ...d, ...patch } : d));

  const handleFile = (localId: string, file: File) => {
    const ext = file.name.split('.').pop() || '';
    update(localId, { file, filename: uuidv4(), tipo: file.type, extension: ext, showInput: true });
  };

  const downloadUri = (url: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.click();
  };

  const handleSend = async () => {
    const selected = docs.filter(d => d.selecionado && d.urlArquivo);
    await api.post('/configuracoes/send', { files: selected.map(d => ({ Descricao: d.descricao, UrlArquivo: d.urlArquivo, TipoArquivo: d.extension })), copy: emails }).catch(() => {});
    setSendModal(false);
  };

  const anySelected = docs.some(d => d.selecionado && d.urlArquivo);

  return (
    <div className="space-y-2">
      {docs.map((doc) => (
        <div key={doc._localId} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <input type="checkbox" checked={doc.selecionado} onChange={e => update(doc._localId, { selecionado: e.target.checked })} className="w-4 h-4 text-blue-600 rounded border-slate-300" />
          <input
            type="text"
            value={doc.descricao}
            onChange={e => update(doc._localId, { descricao: e.target.value })}
            placeholder="Descrição"
            className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          {doc.urlArquivo && !doc.showInput ? (
            <div className="flex items-center gap-2">
              <button onClick={() => downloadUri(doc.urlArquivo!)} title="Download" className="text-blue-600 hover:text-blue-800">
                <Download className="w-4 h-4" />
              </button>
              <button onClick={() => update(doc._localId, { showInput: true })} className="text-xs text-slate-500 hover:text-slate-700 underline">Alterar</button>
            </div>
          ) : (
            <input
              type="file"
              onChange={e => e.target.files?.[0] && handleFile(doc._localId, e.target.files[0])}
              className="text-xs text-slate-600 file:mr-2 file:text-xs file:py-1 file:px-2 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700"
            />
          )}
          <button onClick={() => onChange(docs.filter(d => d._localId !== doc._localId))} className="text-red-400 hover:text-red-600 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}

      <button onClick={() => onChange([...docs, newDoc()])} className="text-blue-600 text-xs font-semibold hover:underline flex items-center gap-1 mt-1">
        <Plus className="w-3 h-3" /> Adicionar Documento
      </button>

      {docs.length > 0 && (
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => docs.filter(d => d.selecionado && d.urlArquivo).forEach(d => downloadUri(d.urlArquivo!))}
            disabled={!anySelected}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <Download className="w-3.5 h-3.5" /> Baixar Selecionados
          </button>
          <button
            onClick={() => setSendModal(true)}
            disabled={!anySelected}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <Send className="w-3.5 h-3.5" /> Enviar Selecionados
          </button>
        </div>
      )}

      {sendModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 w-96 shadow-2xl">
            <h3 className="font-bold text-slate-800 mb-3">Enviar por E-mail</h3>
            <label className="text-xs text-slate-500 font-medium">E-mails para cópia (separar com ";")</label>
            <textarea value={emails} onChange={e => setEmails(e.target.value)} rows={3} className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="email1@empresa.com;email2@empresa.com" />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setSendModal(false)} className="flex-1 py-2 rounded-lg border border-slate-300 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button onClick={handleSend} className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700">Enviar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Modal ─────────────────────────────────────────────────────────────────

export default function ModalFuncionario({ data, onClose, onSaved }: Props) {
  const isEdit = !!data?.id;
  const [saving, setSaving] = useState(false);
  const [cargos, setCargos] = useState<any[]>([]);
  const [abaDoc, setAbaDoc] = useState(0);

  const [form, setForm] = useState<FuncionarioData>({
    nome: data?.nome || '',
    cargoId: data?.cargoId || '',
    empresa: data?.empresa || 'hidro',
    funcao: data?.funcao || '',
    motivoAfastamento: data?.motivoAfastamento ?? 0,
    inicioAfastamento: data?.inicioAfastamento ? data.inicioAfastamento.slice(0, 10) : '',
    fimAfastamento: data?.fimAfastamento ? data.fimAfastamento.slice(0, 10) : '',
    bloqueado: data?.bloqueado ?? false,
    documentosPessoais: (data?.documentosPessoais || []).map((d: any) => ({ ...d, _localId: uuidv4(), selecionado: false })),
    documentosIntegracoes: (data?.documentosIntegracoes || []).map((d: any) => ({ ...d, _localId: uuidv4(), selecionado: false })),
    documentosSeguranca: (data?.documentosSeguranca || []).map((d: any) => ({ ...d, _localId: uuidv4(), selecionado: false })),
  });

  useEffect(() => {
    api.get('/cargos').then(r => setCargos(r.data)).catch(() => {});
  }, []);

  const setField = (k: keyof FuncionarioData, v: any) => {
    setForm(prev => {
      const next = { ...prev, [k]: v };
      if (k === 'motivoAfastamento' && Number(v) === 0) {
        next.inicioAfastamento = '';
        next.fimAfastamento = '';
      }
      return next;
    });
  };

  const canSave = form.nome.trim() !== '' && form.cargoId !== '';

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        nome: form.nome.toUpperCase(),
        motivoAfastamento: Number(form.motivoAfastamento),
        documentosPessoais: form.documentosPessoais.map(({ _localId, selecionado, file, showInput, ...rest }) => rest),
        documentosIntegracoes: form.documentosIntegracoes.map(({ _localId, selecionado, file, showInput, ...rest }) => rest),
        documentosSeguranca: form.documentosSeguranca.map(({ _localId, selecionado, file, showInput, ...rest }) => rest),
      };
      if (isEdit) {
        await api.put(`/rh/${data.id}`, payload);
      } else {
        await api.post('/rh', payload);
      }
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = (valid: boolean) =>
    `w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition ${valid ? 'border-slate-300' : 'border-red-400'}`;

  const ABA_DOCS = [
    { label: 'Pessoais', key: 'documentosPessoais' as const },
    { label: 'Integrações', key: 'documentosIntegracoes' as const },
    { label: 'Segurança', key: 'documentosSeguranca' as const },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="font-black text-slate-800 text-lg uppercase tracking-tight italic">
            {isEdit ? 'Editar Funcionário' : 'Novo Funcionário'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition"><X className="w-5 h-5 text-slate-500" /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Row 1: Nome + Cargo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Nome *</label>
              <input
                type="text"
                value={form.nome}
                onChange={e => setField('nome', e.target.value.toUpperCase())}
                className={inputClass(form.nome.trim() !== '')}
                placeholder="Nome completo"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Cargo *</label>
              <select
                value={form.cargoId}
                onChange={e => setField('cargoId', e.target.value)}
                className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white transition ${form.cargoId ? 'border-slate-300' : 'border-red-400'}`}
              >
                <option value="">Selecione o cargo</option>
                {cargos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          </div>

          {/* Row 2: Empresa + Função */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Empresa</label>
              <select value={form.empresa} onChange={e => setField('empresa', e.target.value)} className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none bg-white focus:ring-2 focus:ring-blue-500">
                {EMPRESAS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Função</label>
              <select value={form.funcao} onChange={e => setField('funcao', e.target.value)} className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none bg-white focus:ring-2 focus:ring-blue-500">
                <option value="">Selecione a função</option>
                {FUNCOES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          </div>

          {/* Row 3: Afastamento */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Motivo Afastamento</label>
              <select value={form.motivoAfastamento} onChange={e => setField('motivoAfastamento', Number(e.target.value))} className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm outline-none bg-white focus:ring-2 focus:ring-blue-500">
                {MOTIVOS_AFASTAMENTO.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Início Afastamento</label>
              <input type="date" value={form.inicioAfastamento} onChange={e => setField('inicioAfastamento', e.target.value)} disabled={form.motivoAfastamento === 0} className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Fim Afastamento</label>
              <input type="date" value={form.fimAfastamento} onChange={e => setField('fimAfastamento', e.target.value)} disabled={form.motivoAfastamento === 0} className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400" />
            </div>
            <div className="flex flex-col justify-end pb-1">
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Bloqueado</label>
              <button
                type="button"
                onClick={() => setField('bloqueado', !form.bloqueado)}
                className={`relative inline-flex items-center h-7 w-14 rounded-full transition-colors ${form.bloqueado ? 'bg-red-500' : 'bg-slate-300'}`}
              >
                <span className={`inline-block w-5 h-5 bg-white rounded-full shadow transform transition-transform ${form.bloqueado ? 'translate-x-8' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>

          {/* Documentos */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">Documentos</label>
            <div className="flex gap-2 mb-4">
              {ABA_DOCS.map((a, i) => (
                <button key={a.key} onClick={() => setAbaDoc(i)} className={`px-4 py-2 text-xs font-bold rounded-lg transition ${abaDoc === i ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {a.label}
                </button>
              ))}
            </div>
            <DocSection docs={form[ABA_DOCS[abaDoc].key]} onChange={d => setField(ABA_DOCS[abaDoc].key, d)} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
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
