import { useState, useEffect } from 'react';
import api from '../services/api';
import { X, Plus, Loader2, Trash2 } from 'lucide-react';
import {
  SEGMENTOS, TIPOS_FATURAMENTO, DIAS_SEMANA, TIPOS_CONTATO, STATUS_HISTORICO,
  maskCNPJ, maskCPF, maskPhone, maskCEP,
  isValidCNPJ, isValidCPF, emptyContato, ic,
} from './clienteModal.utils';

const ESTADOS_BR = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
const CATEGORIAS_RH = ['MOTORISTA','OPERADOR','AJUDANTE','JATISTA','ADMINISTRATIVO','LIDER'];
const TABS = ['Cadastro','Faturamento','Hierarquia','Contatos','Histórico CRM','Portal','RH/Integrações','Observações'];

interface Props { data?: any; clientes: any[]; onClose: () => void; onSaved: () => void; }

const emptyHistorico = () => ({ _id: Math.random().toString(36).slice(2), data: new Date().toISOString().slice(0,10), status: 'NOVO', texto: '' });

const SectionTitle = ({ color, label }: { color: string; label: string }) => (
  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
    <div className={`w-1.5 h-4 rounded-full ${color}`} />
    <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">{label}</h3>
  </div>
);

const Lbl = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{children}</label>
);

export default function ModalCliente({ data, clientes, onClose, onSaved }: Props) {
  const isEdit = !!data?.id;
  const [tab, setTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [cidades, setCidades] = useState<string[]>([]);
  const [novaInteg, setNovaInteg] = useState('');

  const tipoPJ = (data?.tipoPessoa ?? 'PJ') === 'PJ';
  const [form, setForm] = useState({
    tipoPessoa: data?.tipoPessoa || 'PJ',
    codigo: data?.codigo || '',
    nome: data?.nome || '',
    nomeFantasia: data?.nomeFantasia || '',
    documento: data?.documento || '',
    segmento: data?.segmento || '',
    // endereco
    endereco: data?.endereco || '',
    numero: data?.numero || '',
    complemento: data?.complemento || '',
    bairro: data?.bairro || '',
    uf: data?.uf || '',
    municipio: data?.municipio || '',
    cep: data?.cep || '',
    // contato
    telefone: data?.telefone || '',
    celular: data?.celular || '',
    fax: data?.fax || '',
    email: data?.email || '',
    aniversarioReajuste: data?.aniversarioReajuste || '',
    // faturamento
    tipoFaturamento: data?.tipoFaturamento || 1,
    diaBaseMensal: data?.diaBaseMensal || '',
    diaBaseQuinzenalInicio: data?.diaBaseQuinzenalInicio || '',
    diaBaseQuinzenalFim: data?.diaBaseQuinzenalFim || '',
    diaBaseSemanal: data?.diaBaseSemanal || 1,
    vendedorResponsavel: data?.vendedorResponsavel || '',
    empresaFaturamento: data?.empresaFaturamento || '',
    aceitaCTe: data?.aceitaCTe ?? false,
    porcentagemRL: data?.porcentagemRL || '',
    diasVencimentoRL: data?.diasVencimentoRL || '',
    bloquearCliente: data?.bloquearCliente ?? false,
    dataDesbloqueio: data?.dataDesbloqueio || '',
    observacaoCobranca: data?.observacaoCobranca || '',
    orientacoesFatura: data?.orientacoesFatura || '',
    // hierarquia
    tipoCliente: data?.tipoCliente || 'PADRAO',
    matrizId: data?.matrizId || '',
    // portal
    linkPortal: data?.linkPortal || '',
    usuarioPortal: data?.usuarioPortal || '',
    senhaPortal: data?.senhaPortal || '',
    // rh
    prazoIntegracao: data?.prazoIntegracao || '',
    integracoesExigidas: data?.integracoesExigidas || [] as string[],
    categoriasExigidas: data?.categoriasExigidas || [] as string[],
    descontaAlmoco: data?.descontaAlmoco ?? false,
    tempoAlmocoMin: data?.tempoAlmocoMin || '',
    // obs
    observacaoGeral: data?.observacaoGeral || '',
    observacoesGerais: data?.observacoesGerais || '',
    // arrays
    contatos: (data?.contatos || []).map((c: any) => ({ ...c, _id: c.id || Math.random().toString(36).slice(2) })),
    historicos: (data?.historicos || []).map((h: any) => ({ ...h, _id: h.id || Math.random().toString(36).slice(2) })),
  });

  const isPJ = form.tipoPessoa === 'PJ';
  const docValido = isPJ ? isValidCNPJ(form.documento) : isValidCPF(form.documento);
  const canSave = form.nome.trim() !== '' && docValido;

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!form.uf || form.uf.length !== 2) { setCidades([]); return; }
    api.get(`/clientes/cidades?uf=${form.uf}`).then(r => setCidades(r.data || [])).catch(() => setCidades([]));
  }, [form.uf]);

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        nome: form.nome.toUpperCase(),
        nomeFantasia: form.nomeFantasia.toUpperCase(),
        endereco: form.endereco.toUpperCase(),
        bairro: form.bairro.toUpperCase(),
        complemento: form.complemento.toUpperCase(),
        email: form.email.toUpperCase(),
        tipoFaturamento: Number(form.tipoFaturamento),
        contatos: form.contatos.map(({ _id, ...c }: any) => c),
        historicos: form.historicos.map(({ _id, ...h }: any) => h),
      };
      if (isEdit) await api.patch(`/clientes/${data.id}`, payload);
      else await api.post('/clientes', payload);
      onSaved(); onClose();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const updContato = (id: string, k: string, v: any) =>
    set('contatos', form.contatos.map((c: any) => c._id === id ? { ...c, [k]: v } : c));
  const remContato = (id: string) => set('contatos', form.contatos.filter((c: any) => c._id !== id));

  const updHist = (id: string, k: string, v: any) =>
    set('historicos', form.historicos.map((h: any) => h._id === id ? { ...h, [k]: v } : h));
  const remHist = (id: string) => set('historicos', form.historicos.filter((h: any) => h._id !== id));

  const toggleCategoria = (cat: string) => {
    const arr: string[] = form.categoriasExigidas;
    set('categoriasExigidas', arr.includes(cat) ? arr.filter(c => c !== cat) : [...arr, cat]);
  };

  const filiais = clientes.filter(c => c.matrizId === data?.id);
  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="font-black text-slate-800 text-lg uppercase tracking-tight italic">
            {isEdit ? 'Editar Cliente' : 'Novo Cliente'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3 pb-0 border-b border-slate-100 overflow-x-auto shrink-0">
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)}
              className={`px-3 py-1.5 text-xs font-bold rounded-t-lg whitespace-nowrap transition
                ${tab === i ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">

          {/* ── TAB 0: Cadastro ── */}
          {tab === 0 && <>
            <SectionTitle color="bg-blue-500" label="Identificação" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Lbl>Tipo</Lbl>
                <select value={form.tipoPessoa} onChange={e => { set('tipoPessoa', e.target.value); set('documento', ''); }} className={ic() + ' bg-white'}>
                  <option value="PJ">PJ</option>
                  <option value="PF">PF</option>
                </select>
              </div>
              <div>
                <Lbl>Código</Lbl>
                <input className={ic()} value={form.codigo} onChange={e => set('codigo', e.target.value.toUpperCase())} />
              </div>
              <div className="md:col-span-2">
                <Lbl>{isPJ ? 'Razão Social' : 'Nome'} *</Lbl>
                <input className={ic(form.nome.trim() !== '')} value={form.nome}
                  onChange={e => set('nome', e.target.value.toUpperCase())} placeholder={isPJ ? 'RAZÃO SOCIAL' : 'NOME COMPLETO'} />
              </div>
              <div className="md:col-span-2">
                <Lbl>Nome Fantasia</Lbl>
                <input className={ic()} value={form.nomeFantasia} onChange={e => set('nomeFantasia', e.target.value.toUpperCase())} />
              </div>
              <div>
                <Lbl>{isPJ ? 'CNPJ' : 'CPF'} *</Lbl>
                <input className={ic(docValido || form.documento === '')} value={form.documento}
                  onChange={e => set('documento', isPJ ? maskCNPJ(e.target.value) : maskCPF(e.target.value))}
                  placeholder={isPJ ? 'XX.XXX.XXX/XXXX-XX' : 'XXX.XXX.XXX-XX'} maxLength={isPJ ? 18 : 14} />
              </div>
              <div>
                <Lbl>Segmento</Lbl>
                <select value={form.segmento} onChange={e => set('segmento', e.target.value)} className={ic() + ' bg-white'}>
                  <option value="">Selecione...</option>
                  {SEGMENTOS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <SectionTitle color="bg-emerald-500" label="Endereço" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <Lbl>Logradouro</Lbl>
                <input className={ic()} value={form.endereco} onChange={e => set('endereco', e.target.value.toUpperCase())} />
              </div>
              <div>
                <Lbl>Número</Lbl>
                <input className={ic()} value={form.numero} onChange={e => set('numero', e.target.value)} />
              </div>
              <div>
                <Lbl>Complemento</Lbl>
                <input className={ic()} value={form.complemento} onChange={e => set('complemento', e.target.value.toUpperCase())} />
              </div>
              <div>
                <Lbl>Bairro</Lbl>
                <input className={ic()} value={form.bairro} onChange={e => set('bairro', e.target.value.toUpperCase())} />
              </div>
              <div>
                <Lbl>CEP</Lbl>
                <input className={ic()} value={form.cep} onChange={e => set('cep', maskCEP(e.target.value))} placeholder="00000-000" maxLength={9} />
              </div>
              <div>
                <Lbl>UF</Lbl>
                <select value={form.uf} onChange={e => { set('uf', e.target.value); set('municipio', ''); }} className={ic() + ' bg-white'}>
                  <option value="">UF</option>
                  {ESTADOS_BR.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <Lbl>Município</Lbl>
                {cidades.length > 0 ? (
                  <select value={form.municipio} onChange={e => set('municipio', e.target.value)} className={ic() + ' bg-white'}>
                    <option value="">Selecione...</option>
                    {cidades.map((c: any) => <option key={c.codigo || c} value={c.nome || c}>{c.nome || c}</option>)}
                  </select>
                ) : (
                  <input className={ic()} value={form.municipio} onChange={e => set('municipio', e.target.value.toUpperCase())} />
                )}
              </div>
            </div>

            <SectionTitle color="bg-amber-500" label="Contato e Datas" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Lbl>Telefone</Lbl>
                <input className={ic()} value={form.telefone} onChange={e => set('telefone', maskPhone(e.target.value))} placeholder="(99) 99999-9999" maxLength={15} />
              </div>
              <div>
                <Lbl>Celular</Lbl>
                <input className={ic()} value={form.celular} onChange={e => set('celular', maskPhone(e.target.value))} placeholder="(99) 99999-9999" maxLength={15} />
              </div>
              <div>
                <Lbl>Fax</Lbl>
                <input className={ic()} value={form.fax} onChange={e => set('fax', maskPhone(e.target.value))} maxLength={15} />
              </div>
              <div>
                <Lbl>E-mail</Lbl>
                <input className={ic()} value={form.email} onChange={e => set('email', e.target.value.toUpperCase())} type="email" />
              </div>
              <div>
                <Lbl>Aniversário de Reajuste</Lbl>
                <input type="date" className={ic()} value={form.aniversarioReajuste} onChange={e => set('aniversarioReajuste', e.target.value)} />
              </div>
            </div>
          </>}

          {/* ── TAB 1: Faturamento ── */}
          {tab === 1 && <>
            <SectionTitle color="bg-blue-500" label="Configuração de Faturamento" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Lbl>Tipo Faturamento</Lbl>
                <select value={form.tipoFaturamento} onChange={e => set('tipoFaturamento', Number(e.target.value))} className={ic() + ' bg-white'}>
                  {TIPOS_FATURAMENTO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              {form.tipoFaturamento === 1 && <div>
                <Lbl>Dia Base Mensal</Lbl>
                <input type="number" min={1} max={31} className={ic()} value={form.diaBaseMensal} onChange={e => set('diaBaseMensal', e.target.value)} />
              </div>}
              {form.tipoFaturamento === 2 && <>
                <div><Lbl>Quinzenal — Início</Lbl>
                  <input type="number" min={1} max={15} className={ic()} value={form.diaBaseQuinzenalInicio} onChange={e => set('diaBaseQuinzenalInicio', e.target.value)} /></div>
                <div><Lbl>Quinzenal — Fim</Lbl>
                  <input type="number" min={16} max={31} className={ic()} value={form.diaBaseQuinzenalFim} onChange={e => set('diaBaseQuinzenalFim', e.target.value)} /></div>
              </>}
              {form.tipoFaturamento === 3 && <div>
                <Lbl>Dia Base Semanal</Lbl>
                <select value={form.diaBaseSemanal} onChange={e => set('diaBaseSemanal', Number(e.target.value))} className={ic() + ' bg-white'}>
                  {DIAS_SEMANA.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>}
              <div><Lbl>Vendedor Responsável</Lbl>
                <input className={ic()} value={form.vendedorResponsavel} onChange={e => set('vendedorResponsavel', e.target.value.toUpperCase())} /></div>
              <div><Lbl>Empresa Faturamento</Lbl>
                <input className={ic()} value={form.empresaFaturamento} onChange={e => set('empresaFaturamento', e.target.value.toUpperCase())} /></div>
              <div><Lbl>% RL</Lbl>
                <input type="number" className={ic()} value={form.porcentagemRL} onChange={e => set('porcentagemRL', e.target.value)} /></div>
              <div><Lbl>Dias Vencimento RL</Lbl>
                <input type="number" className={ic()} value={form.diasVencimentoRL} onChange={e => set('diasVencimentoRL', e.target.value)} /></div>
              <div><Lbl>Data Desbloqueio</Lbl>
                <input type="date" className={ic()} value={form.dataDesbloqueio} onChange={e => set('dataDesbloqueio', e.target.value)} /></div>
            </div>
            <div className="flex gap-6 mt-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={form.aceitaCTe} onChange={e => set('aceitaCTe', e.target.checked)} className="rounded" />
                Aceita CTe
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={form.bloquearCliente} onChange={e => set('bloquearCliente', e.target.checked)} className="rounded" />
                Bloquear Cliente
              </label>
            </div>
            <SectionTitle color="bg-amber-500" label="Observações de Cobrança" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Lbl>Observação Cobrança</Lbl>
                <textarea rows={3} className={ic()} value={form.observacaoCobranca} onChange={e => set('observacaoCobranca', e.target.value.toUpperCase())} /></div>
              <div><Lbl>Orientações Fatura</Lbl>
                <textarea rows={3} className={ic()} value={form.orientacoesFatura} onChange={e => set('orientacoesFatura', e.target.value.toUpperCase())} /></div>
            </div>
          </>}

          {/* ── TAB 2: Hierarquia ── */}
          {tab === 2 && <>
            <SectionTitle color="bg-rose-500" label="Tipo de Cliente" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Lbl>Tipo Cliente</Lbl>
                <select value={form.tipoCliente} onChange={e => set('tipoCliente', e.target.value)} className={ic() + ' bg-white'}>
                  {['PADRAO','MATRIZ','FILIAL','SETOR'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {(form.tipoCliente === 'FILIAL' || form.tipoCliente === 'SETOR') && (
                <div>
                  <Lbl>Matriz / Superior</Lbl>
                  <select value={form.matrizId} onChange={e => set('matrizId', e.target.value)} className={ic() + ' bg-white'}>
                    <option value="">Selecione...</option>
                    {clientes.filter(c => c.id !== data?.id).map((c: any) => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            {isEdit && filiais.length > 0 && <>
              <SectionTitle color="bg-slate-400" label="Filiais Vinculadas" />
              <div className="space-y-2">
                {filiais.map((f: any) => (
                  <div key={f.id} className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 text-sm">
                    <span className="font-bold text-slate-700">{f.nome}</span>
                    <span className="text-slate-400 text-xs">{f.documento}</span>
                    <span className="ml-auto text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{f.tipoCliente}</span>
                  </div>
                ))}
              </div>
            </>}
          </>}

          {/* ── TAB 3: Contatos ── */}
          {tab === 3 && <>
            <SectionTitle color="bg-teal-500" label="Contatos" />
            <div className="space-y-4">
              {form.contatos.map((c: any) => (
                <div key={c._id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="md:col-span-2"><Lbl>Nome</Lbl>
                      <input className={ic()} value={c.nome} onChange={e => updContato(c._id, 'nome', e.target.value.toUpperCase())} /></div>
                    <div><Lbl>Setor</Lbl>
                      <input className={ic()} value={c.setor} onChange={e => updContato(c._id, 'setor', e.target.value.toUpperCase())} /></div>
                    <div><Lbl>Tipo</Lbl>
                      <select value={c.tipo} onChange={e => updContato(c._id, 'tipo', e.target.value)} className={ic() + ' bg-white'}>
                        <option value="">Selecione...</option>
                        {TIPOS_CONTATO.map(t => <option key={t} value={t}>{t}</option>)}
                      </select></div>
                    <div><Lbl>E-mail</Lbl>
                      <input className={ic()} value={c.email} onChange={e => updContato(c._id, 'email', e.target.value.toUpperCase())} /></div>
                    <div><Lbl>Telefone</Lbl>
                      <input className={ic()} value={c.telefone} onChange={e => updContato(c._id, 'telefone', maskPhone(e.target.value))} maxLength={15} /></div>
                    <div><Lbl>Celular</Lbl>
                      <input className={ic()} value={c.celular} onChange={e => updContato(c._id, 'celular', maskPhone(e.target.value))} maxLength={15} /></div>
                    <div><Lbl>Ramal</Lbl>
                      <input className={ic()} value={c.ramal} onChange={e => updContato(c._id, 'ramal', e.target.value)} /></div>
                  </div>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                      <input type="checkbox" checked={c.emailMedicao} onChange={e => updContato(c._id, 'emailMedicao', e.target.checked)} className="rounded" />
                      E-mail Medição
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                      <input type="checkbox" checked={c.emailProposta} onChange={e => updContato(c._id, 'emailProposta', e.target.checked)} className="rounded" />
                      E-mail Proposta
                    </label>
                    <button onClick={() => remContato(c._id)} className="ml-auto text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={() => set('contatos', [...form.contatos, emptyContato()])}
                className="text-blue-600 text-xs font-bold hover:underline flex items-center gap-1">
                <Plus className="w-3 h-3" /> Adicionar Contato
              </button>
            </div>
          </>}

          {/* ── TAB 4: Histórico CRM ── */}
          {tab === 4 && <>
            <SectionTitle color="bg-indigo-500" label="Histórico CRM" />
            <div className="space-y-3">
              {form.historicos.map((h: any) => (
                <div key={h._id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div><Lbl>Data</Lbl>
                      <input type="date" className={ic()} value={h.data} onChange={e => updHist(h._id, 'data', e.target.value)} /></div>
                    <div><Lbl>Status</Lbl>
                      <select value={h.status} onChange={e => updHist(h._id, 'status', e.target.value)} className={ic() + ' bg-white'}>
                        {STATUS_HISTORICO.map(s => <option key={s} value={s}>{s}</option>)}
                      </select></div>
                    <div className="md:col-span-2"><Lbl>Texto</Lbl>
                      <input className={ic()} value={h.texto} onChange={e => updHist(h._id, 'texto', e.target.value.toUpperCase())} /></div>
                  </div>
                  <div className="flex justify-end">
                    <button onClick={() => remHist(h._id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={() => set('historicos', [...form.historicos, emptyHistorico()])}
                className="text-blue-600 text-xs font-bold hover:underline flex items-center gap-1">
                <Plus className="w-3 h-3" /> Adicionar Registro
              </button>
            </div>
          </>}

          {/* ── TAB 5: Portal ── */}
          {tab === 5 && <>
            <SectionTitle color="bg-cyan-500" label="Acesso ao Portal" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3"><Lbl>Link Portal</Lbl>
                <input className={ic()} value={form.linkPortal} onChange={e => set('linkPortal', e.target.value.toUpperCase())} placeholder="https://..." /></div>
              <div><Lbl>Usuário Portal</Lbl>
                <input className={ic()} value={form.usuarioPortal} onChange={e => set('usuarioPortal', e.target.value.toUpperCase())} /></div>
              <div><Lbl>Senha Portal</Lbl>
                <input type="password" className={ic()} value={form.senhaPortal} onChange={e => set('senhaPortal', e.target.value)} /></div>
            </div>
          </>}

          {/* ── TAB 6: RH / Integrações ── */}
          {tab === 6 && <>
            <SectionTitle color="bg-orange-500" label="RH e Integrações" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Lbl>Prazo Integração (dias)</Lbl>
                <input type="number" className={ic()} value={form.prazoIntegracao} onChange={e => set('prazoIntegracao', e.target.value)} /></div>
              <div><Lbl>Tempo Almoço (min)</Lbl>
                <input type="number" className={ic()} value={form.tempoAlmocoMin} onChange={e => set('tempoAlmocoMin', e.target.value)} /></div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={form.descontaAlmoco} onChange={e => set('descontaAlmoco', e.target.checked)} className="rounded" />
                  Desconta Almoço
                </label>
              </div>
            </div>
            <div className="mt-4">
              <Lbl>Integrações Exigidas</Lbl>
              <div className="flex gap-2 mb-2">
                <input className={ic() + ' max-w-xs'} value={novaInteg}
                  onChange={e => setNovaInteg(e.target.value.toUpperCase())}
                  onKeyDown={e => { if (e.key === 'Enter' && novaInteg.trim()) { set('integracoesExigidas', [...form.integracoesExigidas, novaInteg.trim()]); setNovaInteg(''); } }}
                  placeholder="Digite e pressione Enter" />
              </div>
              <div className="flex flex-wrap gap-2">
                {form.integracoesExigidas.map((ig: string, i: number) => (
                  <span key={i} className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                    {ig}
                    <button onClick={() => set('integracoesExigidas', form.integracoesExigidas.filter((_: string, j: number) => j !== i))} className="hover:text-red-500 transition">×</button>
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <Lbl>Categorias Exigidas</Lbl>
              <div className="flex flex-wrap gap-4 mt-2">
                {CATEGORIAS_RH.map(cat => (
                  <label key={cat} className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                    <input type="checkbox" className="rounded"
                      checked={form.categoriasExigidas.includes(cat)}
                      onChange={() => toggleCategoria(cat)} />
                    {cat}
                  </label>
                ))}
              </div>
            </div>
          </>}

          {/* ── TAB 7: Observações ── */}
          {tab === 7 && <>
            <SectionTitle color="bg-slate-500" label="Observações" />
            <div className="grid grid-cols-1 gap-4">
              <div><Lbl>Observação Geral</Lbl>
                <textarea rows={4} className={ic()} value={form.observacaoGeral} onChange={e => set('observacaoGeral', e.target.value.toUpperCase())} /></div>
              <div><Lbl>Observações Gerais</Lbl>
                <textarea rows={4} className={ic()} value={form.observacoesGerais} onChange={e => set('observacoesGerais', e.target.value.toUpperCase())} /></div>
            </div>
          </>}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={!canSave || saving}
            className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
