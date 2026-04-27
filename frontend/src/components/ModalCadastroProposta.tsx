import React, { useState, useEffect, useCallback } from 'react';
import { X, Save, Plus, Trash2, ArrowRight, ArrowLeft, ChevronDown, ChevronUp, AlertTriangle, Loader2 } from 'lucide-react';
import { numeroExtenso } from '../utils/numeroExtenso';
import moment from 'moment';
import api from '../services/api';
import SearchableSelect from './SearchableSelect';

// ─── Enums ──────────────────────────────────────────────────────
export const TIPO_COBRANCA = { HORA: 1, DIARIA: 2, FRETE: 3, FECHADA: 4 } as const;
const TC_LABEL: Record<number, string> = { 1: 'Hora', 2: 'Diária', 3: 'Frete', 4: 'Fechada' };

// ─── Helpers ────────────────────────────────────────────────────
const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

// ─── Types ──────────────────────────────────────────────────────
interface PropostaItem {
  _uid: string;
  equipamentoId: string;
  equipamento: string;
  quantidade: number;
  area: string;
  tipoCobrancaInt: number;
  valorCobranca: number;
  horasDiaria: number;
  usoPrevisto: number;
  valorMobilizacao: number;
  valorTotal: number;
}

interface PropostaAcessorio {
  _uid: string;
  id: string;       // '0' = manual
  nome: string;
}

interface PropostaResponsabilidade {
  _uid: string;
  id: string;
  descricao: string;
  responsavel: number | null; // 1=Contratado 2=Contratante null=sem classificar
  importante: boolean;
}

interface PropostaEquipe {
  _uid: string;
  cargoId: string;
  cargo: any | null;
  equipamentoId: string;
  quantidade: number;
}

interface FormState {
  codigo: string;
  revisao: number;
  dataProposta: string;
  dataValidade: string;
  vendedorId: string;
  empresaId: string;
  clienteId: string;
  contatoId: string;
  emailCopia: string;
  naoEnviarEmail: boolean;
  introducao: string;
  objetivo: string;
  // arrays
  itens: PropostaItem[];
  acessorios: PropostaAcessorio[];
  responsabilidades: PropostaResponsabilidade[];
  equipes: PropostaEquipe[];
  // textos gerados
  descricaoValores: string;
  descricaoGarantia: string;
  condicaoPagamento: string;
  validadeProposta: string;
  // side fields
  porcentagemRL: number;
  cte: boolean;
  pagamentoAntecipado: boolean;
  valor: number;
  // melhorias
  tipoContrato: 'Individual' | 'Contrato';
  vigenciaMeses: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: any;
  userRole?: string;
  options: {
    clientes: any[];
    vendedores: any[];
    empresas: any[];
    equipamentos: any[];
    acessorios: any[];
    responsabilidades: any[];
    cargos: any[];
    configuracoes: any[];
  };
}

const uid = () => Math.random().toString(36).slice(2);
const newItem = (): PropostaItem => ({ _uid: uid(), equipamentoId: '', equipamento: '', quantidade: 1, area: '', tipoCobrancaInt: 2, valorCobranca: 0, horasDiaria: 10, usoPrevisto: 0, valorMobilizacao: 0, valorTotal: 0 });
const newAcessorio = (manual = false): PropostaAcessorio => ({ _uid: uid(), id: manual ? '0' : '', nome: '' });
const newEquipe = (): PropostaEquipe => ({ _uid: uid(), cargoId: '', cargo: null, equipamentoId: '', quantidade: 1 });

const INTRO_DEFAULT = 'Submetemos a apreciação de V.Sas., nossa proposta, visando o atendimento de sua solicitação conforme condições técnicas e comercias abaixo descriminada, a saber:';

// ─── Text Generators ────────────────────────────────────────────
function gerarDescricaoValores(itens: PropostaItem[]): string {
  const tcLabel: Record<number, string> = {
    1: 'Valor hora por', 2: 'Valor diária por', 3: 'Valor frete por', 4: 'Valor fechado por'
  };
  return itens
    .filter(it => it.equipamento && it.tipoCobrancaInt && it.valorCobranca)
    .map(it => {
      const tipo = tcLabel[it.tipoCobrancaInt] ?? 'Valor por';
      const area = it.area ? ` para área ${it.area},` : '';
      let linha = `     * ${tipo} ${it.quantidade ?? 1} ${it.equipamento},${area} horário comercial \nR$ ${fmtBRL(it.valorCobranca)}  (${numeroExtenso(it.valorCobranca)})\n`;
      if (it.valorMobilizacao > 0) {
        linha += `Valor por mobilização e desmobilização ${it.equipamento}, horário comercial:\nR$ ${fmtBRL(it.valorMobilizacao)} (${numeroExtenso(it.valorMobilizacao)})\n`;
      }
      return linha;
    })
    .join('\n');
}

function gerarDescricaoGarantia(itens: PropostaItem[], configuracoes: any[]): string {
  const cfg = (key: string) => {
    if (Array.isArray(configuracoes)) return configuracoes.find(c => c.key === key || c.descricao === key)?.valor || '';
    return '';
  };

  let text = '';
  
  const validItems = itens.filter(it => it.equipamento);
  
  const horaItems = validItems.filter(it => it.tipoCobrancaInt === 1);
  const diariaItems = validItems.filter(it => it.tipoCobrancaInt === 2);
  const fechadoItems = validItems.filter(it => it.tipoCobrancaInt === 4);

  if (horaItems.length > 0) {
    const groups: Record<number, string[]> = {};
    horaItems.forEach(it => {
      const h = it.horasDiaria || 10;
      if (!groups[h]) groups[h] = [];
      groups[h].push(it.equipamento);
    });
    
    Object.entries(groups).forEach(([h, equips]) => {
      const eqText = equips.length > 1 
        ? 'os equipamentos ' + equips.slice(0, -1).join(', ') + ' e ' + equips[equips.length - 1]
        : 'o equipamento ' + equips[0];
      
      let tpl = cfg('ModalidadeHora');
      if (tpl) {
        text += tpl.replace(/\{\{HorasDiaria\}\}/g, String(h)).replace(/\{\{Equipamento\}\}/g, eqText) + '\n';
      } else {
        text += `Garantia de faturamento de ${h} horas diárias para ${eqText}.\n`;
      }
    });
  }

  if (diariaItems.length > 0) {
    const equips = diariaItems.map(i => i.equipamento);
    const eqText = equips.length > 1 
      ? 'os equipamentos ' + equips.slice(0, -1).join(', ') + ' e ' + equips[equips.length - 1]
      : 'o equipamento ' + equips[0];
      
    let tpl = cfg('ModalidadeDiaria');
    if (tpl) text += tpl.replace(/\{\{Equipamento\}\}/g, eqText) + '\n';
    else text += `Garantia de faturamento mínimo de 01 diária por chamado para ${eqText}.\n`;
  }

  if (fechadoItems.length > 0) {
    const equips = fechadoItems.map(i => i.equipamento);
    const eqText = equips.length > 1 
      ? 'os equipamentos ' + equips.slice(0, -1).join(', ') + ' e ' + equips[equips.length - 1]
      : 'o equipamento ' + equips[0];
      
    let tpl = cfg('ModalidadeFechado');
    if (tpl) text += tpl.replace(/\{\{Equipamento\}\}/g, eqText) + '\n';
    else text += `Garantia de faturamento conforme valor fechado para ${eqText}.\n`;
  }

  // Fallback for empty item
  if (!text && itens.length > 0) {
    const it = itens[0];
    if (it.tipoCobrancaInt === 1) text += `Garantia de faturamento de ${it.horasDiaria || 10} horas diárias para o equipamento .\n`;
    else if (it.tipoCobrancaInt === 2) text += `Garantia de faturamento mínimo de 01 diária por chamado para o equipamento .\n`;
    else if (it.tipoCobrancaInt === 4) text += `Garantia de faturamento conforme valor fechado para o equipamento .\n`;
  }

  if (horaItems.length > 0) text += '\n' + (cfg('DescricaoGarantiaHora') || '') + '\n';
  if (diariaItems.length > 0) text += '\n' + (cfg('DescricaoGarantiaDiaria') || '') + '\n';
  if (validItems.some(it => it.tipoCobrancaInt === 3)) text += '\n' + (cfg('DescricaoGarantiaFrete') || '') + '\n';
  if (fechadoItems.length > 0) text += '\n' + (cfg('DescricaoGarantiaFechado') || '') + '\n';

  return text.trim();
}

function gerarCondicaoPagamento(state: { pagamentoAntecipado: boolean; cte: boolean; porcentagemRL: number; valor: number }): string {
  const { pagamentoAntecipado, cte, porcentagemRL, valor } = state;
  const textPagamento = pagamentoAntecipado
    ? 'Pagamento antecipado'
    : 'Faturamento para 20 (VINTE) dias após execução dos serviços.';
  const textExecucao = 'Após execução, será enviado relatório de prestação de serviço e depois de aceite, emitido a Nota Fiscal Eletrônica e boleto bancário, será enviado ao email da Contratante Cadastrada.';
  const textAceite = 'Nota: Prazo para verificação e aceite dos serviços de no Maximo 02 (dois) dias, caso não tenhamos o aceite a nota será emitida automaticamente.';

  let textNf = '';
  if (!cte && !porcentagemRL) {
    textNf = 'O total dos serviços será emitido em nota de serviço.';
  } else if (cte) {
    textNf = 'O total dos serviços será emitido em CTe.';
  } else {
    const rl = porcentagemRL;
    const vLoc = fmtBRL(valor * (rl / 100));
    const vServ = fmtBRL(valor * ((100 - rl) / 100));
    textNf = `O total dos serviços será emitido em 02 notas, sendo:\n${rl}% do valor, referente ao recibo de locação. (R$ ${vLoc})\n${100 - rl}% do valor, referente a manuseio do equipamento, nota fiscal de serviço. (R$ ${vServ})`;
  }

  const obsRL = (porcentagemRL > 0 && !cte)
    ? '\n\nOBS: Para atividades de locação de BENS MOVEIS, por força de veto Presidencial, foi retirado do campo de incidência o ISS. Conforme disposições do RISS consubstanciadas no decreto municipal 44.540/2004, A empresa não poderá emitir nota fiscal para atividades de locação de bens móveis tendo que emitir recibos para documentar a mesma.'
    : '';

  return `${textPagamento}\n\n${textExecucao}\n\n${textAceite}\n\nDimensionamento em Nota Fiscal:\n\n${textNf}${obsRL}`;
}

function gerarValidadeProposta(dataValidade: string): string {
  if (!dataValidade) return '';
  return `Essa proposta possui validade até o dia: ${moment(dataValidade).format('DD/MM/YYYY')}`;
}

function calcularValorTotal(itens: PropostaItem[]): number {
  return itens.reduce((acc, it) => acc + (it.valorTotal || 0), 0);
}
// ─── Main Component ────────────────────────────────────────────

const lbl = 'text-[10px] font-black text-slate-500 uppercase mb-1 block';
const inp = 'w-full border border-slate-300 rounded px-2.5 py-1.5 text-sm focus:border-blue-500 outline-none';
const cel = 'w-full border border-slate-200 rounded px-1.5 py-1 text-xs outline-none focus:border-blue-400';

export default function ModalCadastroProposta({ isOpen, onClose, onSave, initialData, userRole, options }: Props) {
  const [aba, setAba] = useState(0);
  const [abaOpen, setAbaOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [internalClientes, setInternalClientes] = useState(options.clientes);

  useEffect(() => {
    setInternalClientes(options.clientes);
  }, [options.clientes]);

  const initForm = (): FormState => ({
    codigo: '', revisao: 0,
    dataProposta: moment().format('YYYY-MM-DD'),
    dataValidade: moment().add(30, 'days').format('YYYY-MM-DD'),
    vendedorId: '', empresaId: '', clienteId: '', contatoId: '',
    emailCopia: '', naoEnviarEmail: false,
    introducao: INTRO_DEFAULT, objetivo: '',
    itens: [newItem()], acessorios: [newAcessorio()],
    responsabilidades: [{ _uid: uid(), id: '0', descricao: '', responsavel: null, importante: false }],
    equipes: [newEquipe()],
    descricaoValores: '', descricaoGarantia: '',
    condicaoPagamento: gerarCondicaoPagamento({ pagamentoAntecipado: false, cte: false, porcentagemRL: 90, valor: 0 }),
    validadeProposta: gerarValidadeProposta(moment().add(30,'days').format('YYYY-MM-DD')),
    porcentagemRL: 90, cte: false, pagamentoAntecipado: false, valor: 0,
    tipoContrato: 'Individual', vigenciaMeses: 12,
  });

  const [form, setForm] = useState<FormState>(initForm);

  useEffect(() => {
    if (!isOpen) return;
    if (initialData && initialData.id) {
      // edit / copy
      const d = initialData;
      setForm({
        codigo: d.codigo || '',
        revisao: d.revisao || 0,
        dataProposta: d.dataProposta ? moment(d.dataProposta).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD'),
        dataValidade: d.dataValidade ? moment(d.dataValidade).format('YYYY-MM-DD') : moment().add(30,'days').format('YYYY-MM-DD'),
        vendedorId: d.vendedorId || d.vendedor || '',
        empresaId: d.empresaId || d.empresa || '',
        clienteId: d.clienteId || '',
        contatoId: d.contatoId || d.contato || '',
        emailCopia: d.cc || d.emailCopia || '',
        naoEnviarEmail: d.naoEnviarAoCliente || false,
        introducao: d.introducao || INTRO_DEFAULT,
        objetivo: d.objetivo || '',
        itens: (d.itens || []).map((i: any) => ({
          _uid: uid(),
          equipamentoId: i.equipamentoId || '',
          equipamento: i.equipamento || '',
          quantidade: i.quantidade || 1,
          area: i.area || '',
          tipoCobrancaInt: i.tipoCobrancaInt || tcStrToInt(i.tipoCobranca) || 2,
          valorCobranca: parseFloat(i.valorAcobrar) || 0,
          horasDiaria: i.horasPorDia || 10,
          usoPrevisto: parseFloat(i.usoPrevisto) || 0,
          valorMobilizacao: parseFloat(i.mobilizacao) || 0,
          valorTotal: parseFloat(i.valorTotal) || 0,
        })),
        acessorios: (d.acessorios || []).map((a: any) => ({ _uid: uid(), id: a.acessorioId || a.id || '', nome: a.acessorio || a.nome || '' })),
        responsabilidades: (d.responsabilidades || []).map((r: any) => ({
          _uid: uid(), id: r.responsabilidadeId || r.id || '0',
          descricao: r.descricao || '', responsavel: r.responsavel || r.tipo === 'CONTRATANTE' ? 2 : r.tipo === 'CONTRATADA' ? 1 : null,
          importante: r.importante || false,
        })),
        equipes: (d.equipe || []).map((e: any) => ({
          _uid: uid(), cargoId: e.cargoId || '',
          cargo: options.cargos.find((c: any) => c.id === e.cargoId) || null,
          equipamentoId: e.equipamentoId || '', quantidade: e.quantidade || 1,
        })),
        descricaoValores: d.descricaoValores || '',
        descricaoGarantia: d.descricaoGarantia || '',
        condicaoPagamento: d.condicoesPagamento || d.condicaoPagamento || '',
        validadeProposta: d.validadeProposta || '',
        porcentagemRL: d.pRL || 90, cte: !!d.cTe, pagamentoAntecipado: !!d.pagamentoAntecipado,
        valor: parseFloat(d.valorTotal) || 0,
        tipoContrato: d.tipoContrato || 'Individual',
        vigenciaMeses: d.vigenciaMeses || 12,
      });
    } else {
      setForm(initForm());
    }
    setAba(0); setError('');
  }, [initialData, isOpen]);

  const tcStrToInt = (s?: string): number => {
    if (!s) return 2;
    const m: Record<string,number> = { HORA:1, HORA_ADICIONAL:1, DIARIA:2, 'DIÁRIA':2, FRETE:3, FECHADA:4, EXECUCAO:4, EMPREITADA:4 };
    return m[s.toUpperCase()] ?? 2;
  };

  const set = useCallback(<K extends keyof FormState>(k: K, v: FormState[K]) => setForm(p => ({ ...p, [k]: v })), []);

  // Quick contact state
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newContact, setNewContact] = useState({ nome: '', email: '', telefone: '' });
  const [creatingContact, setCreatingContact] = useState(false);

  // ── Item helpers ──
  const recalcItem = (item: PropostaItem): PropostaItem => {
    const total = item.usoPrevisto > 0
      ? item.usoPrevisto * item.valorCobranca + item.valorMobilizacao
      : item.valorCobranca + item.valorMobilizacao;
    return { ...item, valorTotal: total };
  };

  const updateItem = (uid: string, patch: Partial<PropostaItem>) => {
    setForm(p => {
      const itens = p.itens.map(it => it._uid === uid ? recalcItem({ ...it, ...patch }) : it);
      const valor = calcularValorTotal(itens);
      return {
        ...p, itens,
        valor,
        descricaoValores: gerarDescricaoValores(itens),
        descricaoGarantia: gerarDescricaoGarantia(itens, options.configuracoes),
        condicaoPagamento: gerarCondicaoPagamento({ ...p, valor }),
      };
    });
  };

  const handleEquipamentoChange = (itemUid: string, equipId: string) => {
    const eq = options.equipamentos.find((e: any) => e.id === equipId);
    updateItem(itemUid, { equipamentoId: equipId, equipamento: eq?.nome || '' });
    if (!eq) return;

    // ── Auto-fill acessórios from junction table (EquipamentoAcessorio) ──
    const eqAcs: PropostaAcessorio[] = (eq.acessoriosVinculados || eq.acessorios || []).map((a: any) => {
      // Junction table format: { id, acessorio: { id, nome } }
      if (a.acessorio && typeof a.acessorio === 'object') {
        return { _uid: uid(), id: a.acessorio.id, nome: a.acessorio.nome };
      }
      // Fallback: legacy JSON format or flat
      const found = options.acessorios.find((oa: any) => oa.id === (a.id || a));
      return { _uid: uid(), id: found?.id || '', nome: found?.nome || a.nome || '' };
    });

    // ── Auto-fill responsabilidades from junction table (EquipamentoResponsabilidade) ──
    const eqResps: PropostaResponsabilidade[] = (eq.responsabilidadesPadrao || eq.responsabilidades || []).map((r: any) => ({
      _uid: uid(), id: r.id || '0',
      descricao: r.descricao || r.Responsabilidade?.Responsabilidade || r.responsabilidade || '',
      responsavel: r.tipo === 'CONTRATANTE' ? 2 : r.tipo === 'CONTRATADA' ? 1 : (r.responsavel ?? null),
      importante: r.importante || false,
    }));

    setForm(p => ({
      ...p,
      acessorios: [...p.acessorios.filter(a => a.id === '0'), ...eqAcs],
      responsabilidades: [
        ...p.responsabilidades.filter(r => r.responsavel !== null),
        ...eqResps.filter(nr => !p.responsabilidades.some(er => er.descricao === nr.descricao)),
      ],
    }));
  };

  const removeItem = (uid: string) => {
    setForm(p => {
      const itens = p.itens.filter(it => it._uid !== uid);
      const valor = calcularValorTotal(itens);
      return { ...p, itens, valor, descricaoValores: gerarDescricaoValores(itens), descricaoGarantia: gerarDescricaoGarantia(itens, options.configuracoes), condicaoPagamento: gerarCondicaoPagamento({ ...p, valor }) };
    });
  };

  // validity
  const validate = (): string => {
    if (!form.dataProposta) return 'Favor informar a data da proposta!';
    if (!form.dataValidade) return 'Favor informar a data de validade!';
    if (!form.empresaId) return 'Favor informar a empresa!';
    if (!form.clienteId) return 'Favor informar o cliente!';
    if (!form.contatoId) return 'Favor informar o contato!';
    if (form.itens.some(it => !it.equipamento || !it.tipoCobrancaInt)) return 'Favor verificar os equipamentos!';
    if (form.acessorios.some(a => !a.nome)) return 'Favor verificar os acessórios!';
    if (form.responsabilidades.some(r => !r.descricao || r.responsavel === null)) return 'Favor verificar as responsabilidades!';
    if (form.equipes.some(e => !e.cargoId || !e.quantidade || (!e.cargo?.unicoEquipamento && !e.equipamentoId))) return 'Favor verificar as equipes!';
    return '';
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setSaving(true);
    const payload = {
      ...form,
      clienteId: form.clienteId,
      vendedor: form.vendedorId,
      vendedorId: form.vendedorId || undefined,
      empresa: form.empresaId,
      contato: form.contatoId,
      cc: form.emailCopia,
      naoEnviarAoCliente: form.naoEnviarEmail,
      pRL: form.porcentagemRL,
      cTe: form.cte,
      valorTotal: form.valor,
      itens: form.itens.map(({ _uid, ...i }) => ({
        equipamento: i.equipamento, equipamentoId: i.equipamentoId,
        quantidade: i.quantidade, area: i.area,
        tipoCobranca: ['HORA','DIARIA','FRETE','FECHADA'][i.tipoCobrancaInt - 1],
        tipoCobrancaInt: i.tipoCobrancaInt,
        valorAcobrar: i.valorCobranca, horasPorDia: i.horasDiaria,
        usoPrevisto: i.usoPrevisto, mobilizacao: i.valorMobilizacao, valorTotal: i.valorTotal,
      })),
      acessorios: form.acessorios.map(({ _uid, ...a }) => ({ acessorio: a.nome, id: a.id !== '0' ? a.id : undefined })),
      responsabilidades: form.responsabilidades.map(({ _uid, ...r }) => ({
        responsabilidadeId: r.id !== '0' ? r.id : undefined,
        descricao: r.descricao,
        responsavel: r.responsavel,
        tipo: r.responsavel === 2 ? 'CONTRATANTE' : 'CONTRATADA',
        importante: r.importante || false,
      })),
      equipe: form.equipes.map(({ _uid, cargo, ...e }) => ({
        ...e,
        cargoId: e.cargoId || undefined,
        cargo: cargo?.nome || cargo?.descricao || e.cargoId,
        equipamentoId: e.equipamentoId || undefined,
      })),
      condicoesPagamento: form.condicaoPagamento,
    };
    try { await onSave(payload); } finally { setSaving(false); }
  };

  const cliente = internalClientes.find((c: any) => c.id === form.clienteId);
  const contatosList = cliente?.contatosList || [];
  const contatosLegado = typeof cliente?.contatos === 'string' 
    ? JSON.parse(cliente.contatos || '[]') 
    : (Array.isArray(cliente?.contatos) ? cliente.contatos : []);
  
  // Combine contacts from database relation and legacy JSON, removing duplicates by name
  const allContatos = [...contatosList, ...contatosLegado];
  const contatos = allContatos.filter((v, i, a) => a.findIndex(t => (t.nome === v.nome)) === i);
  const isEnviada = initialData?.enviada || initialData?.status === 'ENVIADA';
  const isGerRev = isEnviada;
  const validationErr = validate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl my-auto flex flex-col h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b bg-slate-50 rounded-t-xl">
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">
            {form.codigo ? `Proposta ${form.codigo} — Rev. ${form.revisao}` : 'Nova Proposta'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-2"><label className={lbl}>Código</label><input disabled value={form.codigo} className={inp} placeholder="Automático" /></div>
            <div className="col-span-1"><label className={lbl}>Revisão</label><input disabled value={form.revisao} className={inp} /></div>
            <div className="col-span-2"><label className={lbl}>Data Proposta</label><input type="date" value={form.dataProposta} onChange={e => set('dataProposta', e.target.value as any)} className={inp} /></div>
            <div className="col-span-2"><label className={lbl}>Validade</label><input type="date" value={form.dataValidade} onChange={e => setForm(p => { const v = e.target.value; return { ...p, dataValidade: v, validadeProposta: `Essa proposta possui validade até o dia: ${moment(v).format('DD/MM/YYYY')}` }; })} className={inp} /></div>
            <div className="col-span-2"><label className={lbl}>Vendedor</label>
              <SearchableSelect 
                value={form.vendedorId} 
                onChange={v => set('vendedorId', v as any)}
                options={options.vendedores.map((v: any) => ({ id: v.id, label: v.name || v.nome || v.email }))}
                placeholder="Selecione..."
              />
            </div>
            <div className="col-span-3"><label className={lbl}>Empresa</label>
              <SearchableSelect 
                value={form.empresaId} 
                onChange={v => set('empresaId', v as any)}
                options={options.empresas.map((e: any) => ({ id: e.id, label: e.nome || e.razaoSocial }))}
                placeholder="Selecione..."
              />
            </div>
          </div>
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-4"><label className={lbl}>Cliente</label>
              <SearchableSelect 
                value={form.clienteId} 
                onChange={v => set('clienteId', v as any)}
                options={options.clientes.map((c: any) => ({ 
                  id: c.id, 
                  label: c.nome || c.razaoSocial,
                  sublabel: c.documento || c.cnpj
                }))}
                placeholder="Selecione o cliente..."
              />
            </div>
            <div className="col-span-3">
              <div className="flex items-center justify-between mb-1">
                <label className={lbl}>Contato (A/C)</label>
                {form.clienteId && (
                  <button 
                    type="button" 
                    onClick={() => setIsAddingContact(true)}
                    className="text-[10px] font-black text-blue-600 uppercase hover:underline"
                  >
                    + Novo
                  </button>
                )}
              </div>
              <SearchableSelect 
                value={form.contatoId} 
                onChange={v => set('contatoId', v as any)}
                options={contatos.map((c: any, i: number) => ({ 
                  id: c.id || c.nome, 
                  label: c.nome,
                  sublabel: c.setor || c.cargo || ''
                }))}
                placeholder="Selecione..."
              />
            </div>
            <div className="col-span-4"><label className={lbl}>CC (Cópia E-mail)</label>
              <input value={form.emailCopia} onChange={e => set('emailCopia', e.target.value as any)} placeholder="separar com ';'" className={inp} />
            </div>
            <div className="col-span-1 flex flex-col items-center justify-end pb-1">
              <span className="text-[9px] font-black text-slate-400 uppercase mb-1">Não Env.</span>
              <button type="button" onClick={() => set('naoEnviarEmail', !form.naoEnviarEmail as any)} className={`w-10 h-5 rounded-full transition-colors ${form.naoEnviarEmail ? 'bg-red-500' : 'bg-slate-200'}`}>
                <span className={`block w-4 h-4 bg-white rounded-full shadow transition-transform mx-0.5 ${form.naoEnviarEmail ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={lbl}>Introdução</label><textarea value={form.introducao} onChange={e => set('introducao', e.target.value as any)} rows={3} className={`${inp} resize-none`} /></div>
            <div><label className={lbl}>Objetivo / Escopo</label><textarea value={form.objetivo} onChange={e => set('objetivo', e.target.value as any)} rows={3} className={`${inp} resize-none`} /></div>
          </div>
          <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col min-h-[380px]">
            <div className="flex bg-slate-50 border-b border-slate-200">
              {['Equipamentos', 'Acessórios', 'Responsabilidades', 'Equipe'].map((t, i) => (
                <button key={t} onClick={() => setAba(i)} className={`px-5 py-3 text-xs font-black uppercase tracking-widest transition-all ${aba === i ? 'bg-white text-blue-600 border-x border-slate-200 shadow-[inset_0_-2px_0_#2563eb]' : 'text-slate-400 hover:text-slate-600'}`}>{t}</button>
              ))}
            </div>
            <div className="p-4 flex-1 overflow-auto">
              {aba === 0 && (
                <div className="space-y-3">
                  <table className="w-full text-xs border-collapse">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase border-b border-slate-200">
                      <tr>
                        <th className="px-2 py-2 text-left">Equipamento</th>
                        <th className="px-2 py-2 w-14 text-center">Qtd</th>
                        <th className="px-2 py-2 w-28 text-left">Área</th>
                        <th className="px-2 py-2 w-24 text-left">Cobrança</th>
                        <th className="px-2 py-2 w-24 text-left">Valor Unit.</th>
                        <th className="px-2 py-2 w-16 text-center">Hrs/Dia</th>
                        <th className="px-2 py-2 w-20 text-left">Uso Prev.</th>
                        <th className="px-2 py-2 w-24 text-left">Mobilização</th>
                        <th className="px-2 py-2 w-24 text-right">Total</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {form.itens.map(it => (
                        <tr key={it._uid} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="px-1 py-1 min-w-[250px]">
                            <SearchableSelect 
                              value={it.equipamentoId} 
                              onChange={v => handleEquipamentoChange(it._uid, v)}
                              options={options.equipamentos.map((e: any) => ({ id: e.id, label: e.nome, sublabel: e.codigo }))}
                              placeholder="Equipamento..."
                              className="!h-auto"
                            />
                          </td>
                          <td className="px-1 py-1"><input type="number" value={it.quantidade} min={1} onChange={e => updateItem(it._uid, { quantidade: +e.target.value })} className={`${cel} text-center`} /></td>
                          <td className="px-1 py-1"><input value={it.area} onChange={e => updateItem(it._uid, { area: e.target.value })} className={cel} /></td>
                          <td className="px-1 py-1">
                            <select value={it.tipoCobrancaInt} onChange={e => updateItem(it._uid, { tipoCobrancaInt: +e.target.value })} className={cel}>
                              <option value={1}>Hora</option>
                              <option value={2}>Diária</option>
                              <option value={3}>Frete</option>
                              <option value={4}>Fechada</option>
                            </select>
                          </td>
                          <td className="px-1 py-1"><input type="number" value={it.valorCobranca} onChange={e => updateItem(it._uid, { valorCobranca: +e.target.value })} className={cel} /></td>
                          <td className="px-1 py-1"><input type="number" value={it.horasDiaria} onChange={e => updateItem(it._uid, { horasDiaria: +e.target.value })} className={`${cel} text-center`} /></td>
                          <td className="px-1 py-1"><input type="number" value={it.usoPrevisto} onChange={e => updateItem(it._uid, { usoPrevisto: +e.target.value })} className={cel} /></td>
                          <td className="px-1 py-1"><input type="number" value={it.valorMobilizacao} onChange={e => updateItem(it._uid, { valorMobilizacao: +e.target.value })} className={cel} /></td>
                          <td className="px-2 py-1 font-bold text-slate-700 text-right whitespace-nowrap">R$ {fmtBRL(it.valorTotal)}</td>
                          <td className="px-1 py-1 text-center"><button onClick={() => removeItem(it._uid)} className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button onClick={() => setForm(p => ({ ...p, itens: [...p.itens, newItem()] }))} className="flex items-center gap-1.5 text-blue-600 font-black text-[10px] uppercase tracking-wider hover:text-blue-700">
                    <Plus className="w-4 h-4" /> Adicionar Equipamento
                  </button>
                </div>
              )}
              {aba === 1 && (
                <div className="space-y-3">
                  <table className="w-full text-xs border-collapse">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase border-b border-slate-200">
                      <tr><th className="px-3 py-2 text-left">Acessório</th><th className="w-8" /></tr>
                    </thead>
                    <tbody>
                      {form.acessorios.map((ac, i) => (
                        <tr key={ac._uid} className="border-b border-slate-100">
                          <td className="px-1 py-1">
                            {ac.id === '0'
                              ? <input value={ac.nome} onChange={e => setForm(p => ({ ...p, acessorios: p.acessorios.map((a, j) => j === i ? { ...a, nome: e.target.value } : a) }))} placeholder="Nome do acessório avulso..." className={cel} />
                              : <select value={ac.id} onChange={e => { const found = options.acessorios.find((a: any) => a.id === e.target.value); setForm(p => ({ ...p, acessorios: p.acessorios.map((a, j) => j === i ? { ...a, id: e.target.value, nome: found?.nome || '' } : a) })); }} className={cel}>
                                <option value="">Selecione...</option>
                                {options.acessorios.map((a: any) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                              </select>
                            }
                          </td>
                          <td className="px-1 py-1 text-center"><button onClick={() => setForm(p => ({ ...p, acessorios: p.acessorios.filter((_, j) => j !== i) }))} className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex gap-4">
                    <button onClick={() => setForm(p => ({ ...p, acessorios: [...p.acessorios, newAcessorio(false)] }))} className="flex items-center gap-1.5 text-blue-600 font-black text-[10px] uppercase tracking-wider hover:text-blue-700"><Plus className="w-4 h-4" />Adicionar Acessório</button>
                    <button onClick={() => setForm(p => ({ ...p, acessorios: [...p.acessorios, newAcessorio(true)] }))} className="flex items-center gap-1.5 text-slate-600 font-black text-[10px] uppercase tracking-wider hover:text-slate-700"><Plus className="w-4 h-4" />Acessório Avulso</button>
                  </div>
                </div>
              )}
              {aba === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    {([{ label: 'Contratante (Cliente)', val: 2 }, { label: 'Contratada (Nacional Hidro)', val: 1 }] as const).map(panel => (
                      <div key={panel.val} className="space-y-2">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">{panel.label}</h4>
                        <div className="space-y-1.5 min-h-[180px] bg-slate-50/50 rounded-lg p-2">
                          {form.responsabilidades.filter(r => r.responsavel === panel.val).map(r => (
                            <div key={r._uid} className="flex items-start gap-2 bg-white p-2 rounded border border-slate-200 group shadow-sm">
                              {panel.val === 2 && <button onClick={() => setForm(p => ({ ...p, responsabilidades: p.responsabilidades.map(x => x._uid === r._uid ? { ...x, responsavel: 1 } : x) }))} className="opacity-0 group-hover:opacity-100 p-0.5 text-blue-400 hover:text-blue-600 shrink-0 mt-0.5"><ArrowRight className="w-3.5 h-3.5" /></button>}
                              {panel.val === 1 && <button onClick={() => setForm(p => ({ ...p, responsabilidades: p.responsabilidades.map(x => x._uid === r._uid ? { ...x, responsavel: 2 } : x) }))} className="opacity-0 group-hover:opacity-100 p-0.5 text-blue-400 hover:text-blue-600 shrink-0 mt-0.5"><ArrowLeft className="w-3.5 h-3.5" /></button>}
                              {r.importante && <span className="text-amber-500 shrink-0 mt-0.5 text-xs">⚠</span>}
                              <span className="flex-1 text-xs text-slate-600 leading-snug">{r.descricao}</span>
                              <button onClick={() => setForm(p => ({ ...p, responsabilidades: p.responsabilidades.filter(x => x._uid !== r._uid) }))} className="p-0.5 text-red-300 hover:text-red-500 shrink-0"><X className="w-3 h-3" /></button>
                            </div>
                          ))}
                          {form.responsabilidades.filter(r => r.responsavel === null).length > 0 && panel.val === 2 && (
                            <div className="mt-2 pt-2 border-t border-dashed border-amber-200">
                              <p className="text-[9px] font-black text-amber-500 uppercase mb-1">Não classificadas</p>
                              {form.responsabilidades.filter(r => r.responsavel === null).map(r => (
                                <div key={r._uid} className="flex items-center gap-1 bg-amber-50 p-1.5 rounded border border-amber-200 mb-1">
                                  <span className="flex-1 text-xs text-amber-700">{r.descricao}</span>
                                  <button onClick={() => setForm(p => ({ ...p, responsabilidades: p.responsabilidades.map(x => x._uid === r._uid ? { ...x, responsavel: 2 } : x) }))} className="p-0.5 text-blue-400 hover:text-blue-600"><ArrowLeft className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => setForm(p => ({ ...p, responsabilidades: p.responsabilidades.map(x => x._uid === r._uid ? { ...x, responsavel: 1 } : x) }))} className="p-0.5 text-blue-400 hover:text-blue-600"><ArrowRight className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => setForm(p => ({ ...p, responsabilidades: p.responsabilidades.filter(x => x._uid !== r._uid) }))} className="p-0.5 text-red-300 hover:text-red-500"><X className="w-3 h-3" /></button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => { const desc = window.prompt('Descrição da responsabilidade:'); if (desc) setForm(p => ({ ...p, responsabilidades: [...p.responsabilidades, { _uid: uid(), id: '0', descricao: desc, responsavel: null, importante: false }] })); }} className="flex items-center gap-1.5 text-blue-600 font-black text-[10px] uppercase tracking-wider hover:text-blue-700"><Plus className="w-4 h-4" />Adicionar Responsabilidade Avulsa</button>
                </div>
              )}
              {aba === 3 && (
                <div className="space-y-3">
                  <table className="w-full text-xs border-collapse">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase border-b border-slate-200">
                      <tr>
                        <th className="px-2 py-2 text-left">Cargo</th>
                        <th className="px-2 py-2 text-left">Equipamento</th>
                        <th className="px-2 py-2 w-20 text-center">Qtd</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {form.equipes.map((e, i) => (
                        <tr key={e._uid} className="border-b border-slate-100">
                          <td className="px-1 py-1">
                            <select value={e.cargoId} onChange={ev => { const c = options.cargos.find((c: any) => c.id === ev.target.value); setForm(p => ({ ...p, equipes: p.equipes.map((eq, j) => j === i ? { ...eq, cargoId: ev.target.value, cargo: c || null } : eq) })); }} className={cel}>
                              <option value="">Selecione o cargo...</option>
                              {options.cargos.map((c: any) => <option key={c.id} value={c.id}>{c.nome || c.descricao}</option>)}
                            </select>
                          </td>
                          <td className="px-1 py-1">
                            {!e.cargo?.unicoEquipamento && (
                              <select value={e.equipamentoId} onChange={ev => setForm(p => ({ ...p, equipes: p.equipes.map((eq, j) => j === i ? { ...eq, equipamentoId: ev.target.value } : eq) }))} className={cel}>
                                <option value="">Selecione...</option>
                                {form.itens.map(it => <option key={it._uid} value={it.equipamentoId}>{it.equipamento}</option>)}
                                <option value="VARIOS">VÁRIOS</option>
                              </select>
                            )}
                          </td>
                          <td className="px-1 py-1"><input type="number" min={1} value={e.quantidade} onChange={ev => setForm(p => ({ ...p, equipes: p.equipes.map((eq, j) => j === i ? { ...eq, quantidade: +ev.target.value } : eq) }))} className={`${cel} text-center`} /></td>
                          <td className="px-1 py-1 text-center"><button onClick={() => setForm(p => ({ ...p, equipes: p.equipes.filter((_, j) => j !== i) }))} className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex items-center gap-4">
                    <button onClick={() => setForm(p => ({ ...p, equipes: [...p.equipes, newEquipe()] }))} className="flex items-center gap-1.5 text-blue-600 font-black text-[10px] uppercase tracking-wider hover:text-blue-700">
                      <Plus className="w-4 h-4" />Adicionar Cargo
                    </button>
                    
                    <div className="h-4 w-px bg-slate-200" />
                    
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Modelos Rápidos:</span>
                      {[
                        { label: 'Hidrojato', roles: ['Operador de Hidrojato', 'Ajudante de Hidrojato', 'Ajudante de Hidrojato'] },
                        { label: 'Vácuo', roles: ['Motorista Operador', 'Ajudante de Vácuo'] },
                        { label: 'Pipa', roles: ['Motorista Operador'] },
                        { label: 'Vídeo', roles: ['Técnico de Vídeo Inspeção', 'Ajudante de Hidrojato'] }
                      ].map(m => (
                        <button 
                          key={m.label}
                          onClick={() => {
                            const newRows = m.roles.map(roleName => {
                              const found = options.cargos.find((c: any) => c.nome === roleName);
                              return {
                                _uid: uid(),
                                cargoId: found?.id || '',
                                cargo: found || null,
                                equipamentoId: form.itens[0]?.equipamentoId || '',
                                quantidade: 1
                              };
                            });
                            setForm(p => ({ ...p, equipes: [...p.equipes, ...newRows] }));
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[9px] font-bold rounded uppercase transition-colors"
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-4">
              <div><label className={lbl}>Descrição dos Valores</label><textarea value={form.descricaoValores} onChange={e => set('descricaoValores', e.target.value as any)} rows={6} className={`${inp} resize-none bg-slate-50/30 text-xs`} /></div>
              <div>
                <label className={lbl}>Descrição da Garantia</label>
                <textarea value={form.descricaoGarantia} onChange={e => set('descricaoGarantia', e.target.value as any)} rows={6} className={`${inp} resize-none bg-slate-50/30 text-xs`} />
                {form.descricaoGarantia && <div className="flex items-center gap-1.5 mt-1 text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1.5"><AlertTriangle className="w-3 h-3 shrink-0" />Texto gerado automaticamente — revise antes de enviar.</div>}
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className={lbl}>Condições de Pagamento</label>
                  <div className="flex items-center gap-3 text-[9px] font-bold text-slate-500">
                    <label className="flex items-center gap-1">RL (%)<input type="number" value={form.porcentagemRL} min={0} max={100} onChange={e => setForm(p => { const s = { ...p, porcentagemRL: +e.target.value }; return { ...s, condicaoPagamento: gerarCondicaoPagamento(s) }; })} className="w-10 border border-slate-300 rounded px-1 py-0.5 ml-1 text-xs" /></label>
                    <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={form.cte} onChange={e => setForm(p => { const s = { ...p, cte: e.target.checked }; return { ...s, condicaoPagamento: gerarCondicaoPagamento(s) }; })} />CTe</label>
                    <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={form.pagamentoAntecipado} onChange={e => setForm(p => { const s = { ...p, pagamentoAntecipado: e.target.checked }; return { ...s, condicaoPagamento: gerarCondicaoPagamento(s) }; })} />Antecipado</label>
                  </div>
                </div>
                <textarea value={form.condicaoPagamento} onChange={e => set('condicaoPagamento', e.target.value as any)} rows={7} className={`${inp} resize-none bg-slate-50/30 text-xs`} />
              </div>
              <div><label className={lbl}>Validade da Proposta</label><textarea value={form.validadeProposta} onChange={e => set('validadeProposta', e.target.value as any)} rows={2} className={`${inp} resize-none bg-slate-50/30 text-xs`} /></div>
              <div className="bg-slate-900 rounded-xl p-4 flex items-center justify-between shadow-lg">
                <div className="text-white/50 text-[10px] font-black uppercase tracking-wider">Valor Total da Proposta</div>
                <div className="text-2xl font-black text-white">R$ {fmtBRL(form.valor)}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 border-t bg-slate-50 rounded-b-xl space-y-2">
          {error && <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs font-bold"><AlertTriangle className="w-4 h-4 shrink-0" />{error}</div>}
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-all">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-sm uppercase tracking-widest rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isGerRev ? 'Gerar Revisão' : 'Salvar Proposta'}
            </button>
          </div>
        </div>

        {/* Quick Contact Modal */}
        {isAddingContact && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
              <h3 className="text-lg font-black text-slate-800 uppercase mb-4 border-b pb-2">Novo Contato Rápido</h3>
              <div className="space-y-4">
                <div>
                  <label className={lbl}>Nome <span className="text-red-500">*</span></label>
                  <input 
                    value={newContact.nome}
                    onChange={e => setNewContact(p => ({ ...p, nome: e.target.value }))}
                    className={inp}
                    placeholder="Nome completo"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>E-mail</label>
                    <input 
                      value={newContact.email}
                      onChange={e => setNewContact(p => ({ ...p, email: e.target.value }))}
                      className={inp}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div>
                    <label className={lbl}>Telefone / Celular</label>
                    <input 
                      value={newContact.telefone}
                      onChange={e => setNewContact(p => ({ ...p, telefone: e.target.value }))}
                      className={inp}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => { setIsAddingContact(false); setNewContact({ nome: '', email: '', telefone: '' }); }}
                    className="flex-1 py-2 text-xs font-black uppercase text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    disabled={creatingContact || !newContact.nome}
                    onClick={async () => {
                      setCreatingContact(true);
                      try {
                        const res = await api.post(`/clientes/${form.clienteId}/contatos`, newContact);
                        const savedContact = res.data;
                        
                        // Update local options
                        setInternalClientes(prev => prev.map(c => {
                          if (c.id === form.clienteId) {
                            const currentContatos = c.contatosList || (typeof c.contatos === 'string' ? JSON.parse(c.contatos || '[]') : (c.contatos || []));
                            return {
                              ...c,
                              contatosList: [...(c.contatosList || []), savedContact],
                              contatos: [...currentContatos, savedContact]
                            };
                          }
                          return c;
                        }));

                        // Select the new contact
                        set('contatoId', savedContact.id);
                        setIsAddingContact(false);
                        setNewContact({ nome: '', email: '', telefone: '' });
                      } catch (err) {
                        alert('Erro ao salvar contato');
                      } finally {
                        setCreatingContact(false);
                      }
                    }}
                    className="flex-1 py-2 text-xs font-black uppercase bg-blue-600 text-white hover:bg-blue-700 rounded-lg shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
                  >
                    {creatingContact ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    Salvar Contato
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
