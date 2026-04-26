import React, { useEffect, useState } from 'react';
import { X, ChevronDown, ChevronUp, Plus, ArrowDownToLine, Save, Clock, Users, Truck, Info, ExternalLink, AlertTriangle, Copy } from 'lucide-react';
import {
  TIPO_COBRANCA, STATUS_OPERACIONAL, DIAS_SEMANA_OPTIONS,
  calcularTempoTotal, horaParaMinutos, formatarHoraParaTime
} from '../utils/logistica';
import ModalQuadroVeiculosLogistica from './ModalQuadroVeiculosLogistica';
import ModalQuadroFuncionariosLogistica from './ModalQuadroFuncionariosLogistica';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Props {
  data: any;
  modal: boolean;
  handleClose: () => void;
  save: (ordem: any, baixar?: boolean) => void;
  veiculos?: any[];
  funcionarios?: any[];
  escalas?: any[];
  empresas?: any[];
  onlyView?: boolean;
  onOpenLote?: (ordemBase: any) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const inp = "w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors bg-white";
const inpErr = `${inp} border-red-400`;
const inpDis = `${inp} bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200`;
const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">{children}</label>
);
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div><Label>{label}</Label>{children}</div>
);

// ─── Component ───────────────────────────────────────────────────────────────

export default function ModalCadastroOrdem({
  data, modal, handleClose, save,
  veiculos = [], funcionarios = [], escalas = [], empresas = [], onlyView = false, onOpenLote,
}: Props) {
  const [ordem, setOrdem] = useState<any>({});
  const [tab, setTab] = useState<'servicos' | 'escala'>('servicos');
  const [collapsedServicos, setCollapsedServicos] = useState(false);
  const [collapsedEscala, setCollapsedEscala] = useState(false);
  const [showBaixaConfirm, setShowBaixaConfirm] = useState(false);
  const [quadroVeiculosOpen, setQuadroVeiculosOpen] = useState(false);
  const [quadroFuncionariosOpen, setQuadroFuncionariosOpen] = useState(false);

  useEffect(() => {
    if (!modal) return;
    const base = data ? { ...data } : {};
    if (!base.Escala) base.Escala = { id: 0, Status: 1, Data: new Date().toISOString().split('T')[0] };
    if (!base.Servicos || !base.Servicos.length) base.Servicos = [{ Discriminacao: '' }];
    if (!base.EscalaFuncionarios) base.EscalaFuncionarios = [];
    if (!base.EscalaVeiculos) base.EscalaVeiculos = [];
    setOrdem(base);
    setTab('servicos');
  }, [modal, data]);

  const set = (field: string, value: any) =>
    setOrdem((p: any) => ({ ...p, [field]: value }));

  const setNested = (parent: string, field: string, value: any) =>
    setOrdem((p: any) => ({ ...p, [parent]: { ...(p[parent] || {}), [field]: value } }));

  // ── Servicos array ──────────────────────────────────────────────────────────
  const addServico = () =>
    setOrdem((p: any) => ({ ...p, Servicos: [...(p.Servicos || []), { Discriminacao: '' }] }));

  const removeServico = (i: number) =>
    setOrdem((p: any) => ({ ...p, Servicos: p.Servicos.filter((_: any, idx: number) => idx !== i) }));

  const updateServico = (i: number, val: string) =>
    setOrdem((p: any) => {
      const s = [...(p.Servicos || [])];
      s[i] = { ...s[i], Discriminacao: val };
      return { ...p, Servicos: s };
    });

  // ── Escala arrays ───────────────────────────────────────────────────────────
  const addVeiculo = () =>
    setOrdem((p: any) => ({ ...p, EscalaVeiculos: [...(p.EscalaVeiculos || []), { veiculoId: '', manutencao: false }] }));

  const removeVeiculo = (i: number) =>
    setOrdem((p: any) => ({ ...p, EscalaVeiculos: p.EscalaVeiculos.filter((_: any, idx: number) => idx !== i) }));

  const updateVeiculo = (i: number, field: string, value: any) =>
    setOrdem((p: any) => {
      const arr = [...(p.EscalaVeiculos || [])];
      arr[i] = { ...arr[i], [field]: value };
      return { ...p, EscalaVeiculos: arr };
    });

  const addFuncionario = () =>
    setOrdem((p: any) => ({ ...p, EscalaFuncionarios: [...(p.EscalaFuncionarios || []), { funcionarioId: '', statusOperacao: 0, ausente: false }] }));

  const removeFuncionario = (i: number) =>
    setOrdem((p: any) => ({ ...p, EscalaFuncionarios: p.EscalaFuncionarios.filter((_: any, idx: number) => idx !== i) }));

  const updateFuncionario = (i: number, field: string, value: any) =>
    setOrdem((p: any) => {
      const arr = [...(p.EscalaFuncionarios || [])];
      arr[i] = { ...arr[i], [field]: value };
      return { ...p, EscalaFuncionarios: arr };
    });

  // ── Calc tempo ──────────────────────────────────────────────────────────────
  const calcTempo = () => {
    const r = calcularTempoTotal({
      horaPadrao: ordem.HoraPadrao || '',
      horaEntrada: ordem.HoraEntrada || '',
      horaSaida: ordem.HoraSaida || '',
      horaAlmoco: ordem.HoraAlmoco || '',
      horaTolerancia: ordem.HoraTolerancia || '',
      descontarAlmoco: !!ordem.DescontarAlmoco,
    });
    setOrdem((p: any) => ({ ...p, HoraTotal: r.horaTotal, HoraAdicional: r.horaAdicional }));
  };

  // ── Validation ──────────────────────────────────────────────────────────────
  const isServicoValido = (s: any) => s?.Discriminacao?.trim().length > 0;

  const fullData = (baixa = false) => {
    if (!ordem.TipoCobranca || !ordem.DataInicial || !ordem.HoraInicial) return false;
    if (!(ordem.Servicos || []).every(isServicoValido)) return false;
    // P1: Validar equipamento se proposta tem itens
    if ((ordem._propostaItens?.length > 0 || ordem.Proposta?.itens?.length > 0) && !ordem.EquipamentoId && !ordem.equipamentoId) return false;
    if (baixa) {
      if (!(ordem.EscalaFuncionarios || []).length) return false;
      if (!(ordem.EscalaVeiculos || []).length) return false;
      if (ordem.TipoCobranca === 1 && (!ordem.HoraEntrada || !ordem.HoraSaida)) return false;
    }
    return true;
  };

  // P1: Travas de validação — avisos de manutenção/afastamento
  const validationWarnings = React.useMemo(() => {
    const warnings: string[] = [];
    // Veículos em manutenção na escala
    (ordem.EscalaVeiculos || []).forEach((ev: any) => {
      const v = veiculos.find((vei: any) => vei.id === ev.veiculoId);
      if (v && (v.status === 'MANUTENCAO' || v.manutencao === true)) {
        warnings.push(`⚠️ Veículo "${v.descricao || v.modelo || v.placa}" está em MANUTENÇÃO`);
      }
    });
    // Funcionários afastados na escala
    (ordem.EscalaFuncionarios || []).forEach((ef: any) => {
      const f = funcionarios.find((func: any) => func.id === ef.funcionarioId);
      if (f && (f.motivoAfastamento > 0 || f.statusComputado === 'AFASTADO' || f.statusComputado === 'FERIAS')) {
        const motivo = f.statusComputado === 'FERIAS' ? 'Férias' : 'Afastado';
        warnings.push(`⚠️ Funcionário "${f.nome}" está ${motivo}`);
      }
    });
    return warnings;
  }, [ordem.EscalaVeiculos, ordem.EscalaFuncionarios, veiculos, funcionarios]);

  const codigoOS = ordem.Codigo
    ? `${ordem.Codigo}/${ordem.Numero || ''}`
    : '';

  if (!modal) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[95vh]">
        {/* ── Header ── */}
        <div className="bg-[#1e3a5f] px-6 py-4 flex items-center justify-between text-white rounded-t-2xl flex-shrink-0">
          <div>
            <h2 className="font-black uppercase tracking-tight text-base">
              {ordem.id ? 'Editar Ordem de Serviço' : 'Abrir Ordem de Serviço'}
            </h2>
            {codigoOS && <p className="text-[10px] text-blue-300 mt-0.5">{codigoOS}</p>}
          </div>
          <button onClick={handleClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {/* ── Linha 1: Cabeçalho ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="Nº Proposta">
              <input disabled className={inpDis} value={ordem.Proposta?.Codigo || ordem.Proposta?.codigo || ordem.Codigo || ''} />
            </Field>
            <Field label="Código OS">
              <input disabled className={inpDis} value={codigoOS} />
            </Field>
            <Field label="Data Inicial *">
              <input
                type="date"
                className={!ordem.DataInicial ? inpErr : inp}
                value={ordem.DataInicial || ''}
                disabled={onlyView}
                onChange={e => set('DataInicial', e.target.value)}
              />
            </Field>
            <Field label="Hora Inicial *">
              <input
                type="time"
                className={!ordem.HoraInicial ? inpErr : inp}
                value={ordem.HoraInicial || ''}
                disabled={onlyView}
                onChange={e => set('HoraInicial', e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="Tipo Cobrança *">
              <select
                className={!ordem.TipoCobranca ? inpErr : inp}
                value={ordem.TipoCobranca || ''}
                disabled={onlyView}
                onChange={e => set('TipoCobranca', Number(e.target.value))}
              >
                <option value="">Selecione...</option>
                {TIPO_COBRANCA.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Empresa">
              {onlyView
                ? <input disabled className={inpDis} value={ordem.Empresa || ''} />
                : <input className={inp} value={ordem.Empresa || ''} onChange={e => set('Empresa', e.target.value)} />
              }
            </Field>
            <Field label="Acompanhante">
              <input
                className={inp}
                value={ordem.Acompanhante || ''}
                disabled={onlyView}
                onChange={e => set('Acompanhante', e.target.value)}
              />
            </Field>
          </div>

          {/* ── Linha 2: Dias semana ── */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Dias da Semana">
              <select
                multiple
                className={`${inp} h-24`}
                value={(ordem.DiasSemana || []).map((d: any) => String(d.value ?? d))}
                disabled={onlyView}
                onChange={e => {
                  const vals = Array.from(e.target.selectedOptions).map(o => {
                    const n = Number(o.value);
                    return DIAS_SEMANA_OPTIONS.find(d => d.value === n) ?? { value: n, label: o.text };
                  });
                  set('DiasSemana', vals);
                }}
              >
                {DIAS_SEMANA_OPTIONS.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Quantidade por Dia">
              <input
                type="number"
                min={1}
                className={inp}
                value={ordem.QuantidadeDia || ''}
                disabled={onlyView}
                onChange={e => set('QuantidadeDia', Number(e.target.value))}
              />
            </Field>
          </div>

          {/* ── Linha 3: Cliente / Contato ── */}
          <div className="grid grid-cols-3 gap-3">
            <Field label="Cliente">
              <input disabled className={inpDis} value={ordem.Cliente?.nome || ordem.Cliente?.razaoSocial || ordem.Cliente?.RazaoSocial || ''} />
            </Field>
            <Field label="Contato *">
              <select
                className={!ordem.ContatoId && !ordem.contatoId ? inpErr : inp}
                value={ordem.ContatoId || ordem.contatoId || ''}
                disabled={onlyView}
                onChange={e => { set('ContatoId', e.target.value); set('contatoId', e.target.value); }}
              >
                <option value="">Selecione...</option>
                {(ordem.Cliente?.contatos || ordem.Cliente?.contatosList || []).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.nome}{c.telefone ? ` — ${c.telefone}` : ''}</option>
                ))}
              </select>
            </Field>
            <Field label="Acompanhante">
              <input
                className={inp}
                value={ordem.Acompanhante || ''}
                disabled={onlyView}
                onChange={e => set('Acompanhante', e.target.value)}
              />
            </Field>
          </div>

          {/* ── P0-2: Seletor de Equipamento da Proposta ── */}
          {(ordem._propostaItens?.length > 0 || ordem.Proposta?.itens?.length > 0) && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Equipamento (da Proposta) *">
                <select
                  className={!ordem.EquipamentoId && !ordem.equipamentoId ? inpErr : inp}
                  value={ordem.EquipamentoId || ordem.equipamentoId || ''}
                  disabled={onlyView}
                  onChange={e => {
                    const itemId = e.target.value;
                    const itens = ordem._propostaItens || ordem.Proposta?.itens || [];
                    const item = itens.find((i: any) => (i.id || i.equipamento) === itemId);
                    setOrdem((p: any) => ({
                      ...p,
                      EquipamentoId: itemId,
                      equipamentoId: itemId,
                      // P0-3: Auto-preencher TipoCobranca e HoraPadrao
                      TipoCobranca: item?.tipoCobrancaInt ?? item?.tipoCobranca ?? p.TipoCobranca,
                      tipoCobranca: item?.tipoCobrancaInt ?? item?.tipoCobranca ?? p.tipoCobranca,
                      HoraPadrao: item?.horasPorDia ? formatarHoraParaTime(item.horasPorDia) : p.HoraPadrao,
                    }));
                  }}
                >
                  <option value="">Selecione o equipamento...</option>
                  {(ordem._propostaItens || ordem.Proposta?.itens || []).map((item: any, idx: number) => {
                    const tipoLabel = ['', 'Hora', 'Diária', 'Frete', 'Fechada'][item.tipoCobrancaInt] ?? item.tipoCobranca ?? '';
                    return (
                      <option key={item.id || idx} value={item.id || item.equipamento}>
                        {item.equipamento}{tipoLabel ? ` — ${tipoLabel}` : ''}
                      </option>
                    );
                  })}
                </select>
              </Field>
            </div>
          )}

          {/* ── P0: Info de equipes da proposta ── */}
          {(ordem._propostaEquipe?.length > 0 || ordem.Proposta?.equipe?.length > 0) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-700">
                <span className="font-bold">Equipe da Proposta: </span>
                {(ordem._propostaEquipe || ordem.Proposta?.equipe || []).map((e: any, i: number) =>
                  <span key={i}>{e.cargo || e.funcao} ({e.quantidade || 1}){i < (ordem._propostaEquipe || ordem.Proposta?.equipe || []).length - 1 ? ', ' : ''}</span>
                )}
              </div>
            </div>
          )}

          {/* ── Tabs ── */}
          <div className="flex border-b border-slate-200">
            {(['servicos', 'escala'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-2.5 text-xs font-black uppercase tracking-wide border-b-2 transition-all ${
                  tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                {t === 'servicos' ? 'Serviços' : 'Escala'}
              </button>
            ))}
          </div>

          {/* ── Aba Serviços ── */}
          {tab === 'servicos' && (
            <div className="space-y-3">
              <button
                onClick={() => setCollapsedServicos(p => !p)}
                className="flex items-center gap-2 text-xs font-black text-slate-600 uppercase tracking-wide"
              >
                {collapsedServicos ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                Serviços / Discriminação
              </button>
              {!collapsedServicos && (
                <div className="space-y-2">
                  {(ordem.Servicos || []).map((s: any, i: number) => (
                    <div key={i} className="flex gap-2">
                      <input
                        className={!isServicoValido(s) && !onlyView ? inpErr : inp}
                        value={s.Discriminacao || ''}
                        placeholder="Descrição do serviço..."
                        disabled={onlyView}
                        onChange={e => updateServico(i, e.target.value)}
                      />
                      {!onlyView && (ordem.Servicos || []).length > 1 && (
                        <button onClick={() => removeServico(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {!onlyView && (
                    <button onClick={addServico} className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1 mt-1">
                      <Plus className="w-3.5 h-3.5" /> Adicionar Serviço
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Aba Escala ── */}
          {tab === 'escala' && (
            <div className="space-y-4">
              <button
                onClick={() => setCollapsedEscala(p => !p)}
                className="flex items-center gap-2 text-xs font-black text-slate-600 uppercase tracking-wide"
              >
                {collapsedEscala ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                Detalhes da Escala
              </button>

              {!collapsedEscala && (
                <div className="space-y-4">
                  {/* Veículos */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-slate-500" />
                      <span className="text-xs font-black text-slate-600 uppercase tracking-wide">Veículos</span>
                      {!onlyView && (
                        <button
                          onClick={() => setQuadroVeiculosOpen(true)}
                          className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-1 ml-2"
                        >
                          <ExternalLink className="w-3 h-3" /> Ver Quadro de Veículos
                        </button>
                      )}
                    </div>
                    {(ordem.EscalaVeiculos || []).map((v: any, i: number) => (
                      <div key={i} className="flex gap-2 items-center">
                        {onlyView
                          ? <input disabled className={inpDis} value={veiculos.find(x => x.id === v.veiculoId)?.placa || v.veiculoId || ''} />
                          : (
                            <>
                              <select
                                className={inp}
                                value={v.veiculoId || ''}
                                onChange={e => updateVeiculo(i, 'veiculoId', e.target.value)}
                              >
                                <option value="">Selecione Veículo...</option>
                                {veiculos.map((vei: any) => (
                                  <option key={vei.id} value={vei.id}>{vei.placa} - {vei.modelo}</option>
                                ))}
                              </select>
                              <select
                                className="border rounded-lg px-2 py-2 text-xs outline-none focus:border-blue-500"
                                value={v.manutencao ? 'sim' : 'nao'}
                                onChange={e => updateVeiculo(i, 'manutencao', e.target.value === 'sim')}
                              >
                                <option value="nao">Normal</option>
                                <option value="sim">Manutenção</option>
                              </select>
                              {(ordem.EscalaVeiculos || []).length > 1 && (
                                <button onClick={() => removeVeiculo(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0">
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )
                        }
                      </div>
                    ))}
                    {!onlyView && (
                      <button onClick={addVeiculo} className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5" /> Adicionar Veículo
                      </button>
                    )}
                  </div>

                  {/* Funcionários */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-500" />
                      <span className="text-xs font-black text-slate-600 uppercase tracking-wide">Funcionários</span>
                      {!onlyView && (
                        <button
                          onClick={() => setQuadroFuncionariosOpen(true)}
                          className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-1 ml-2"
                        >
                          <ExternalLink className="w-3 h-3" /> Ver Quadro de Funcionários
                        </button>
                      )}
                    </div>
                    {(ordem.EscalaFuncionarios || []).map((f: any, i: number) => (
                      <div key={i} className="flex gap-2 items-center">
                        {onlyView
                          ? <input disabled className={inpDis} value={funcionarios.find((x: any) => x.id === f.funcionarioId)?.nome || f.funcionarioId || ''} />
                          : (
                            <>
                              <select
                                className={inp}
                                value={f.funcionarioId || ''}
                                onChange={e => updateFuncionario(i, 'funcionarioId', e.target.value)}
                              >
                                <option value="">Selecione Funcionário...</option>
                                {funcionarios.map((fn: any) => (
                                  <option key={fn.id} value={fn.id}>{fn.nome} - {fn.cargo}</option>
                                ))}
                              </select>
                              <select
                                className="border rounded-lg px-2 py-2 text-xs outline-none focus:border-blue-500"
                                value={f.statusOperacao ?? 0}
                                onChange={e => updateFuncionario(i, 'statusOperacao', Number(e.target.value))}
                              >
                                {STATUS_OPERACIONAL.map(s => (
                                  <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                              </select>
                              {(ordem.EscalaFuncionarios || []).length > 1 && (
                                <button onClick={() => removeFuncionario(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0">
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )
                        }
                      </div>
                    ))}
                    {!onlyView && (
                      <button onClick={addFuncionario} className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5" /> Adicionar Funcionário
                      </button>
                    )}
                  </div>

                  {/* Observações Escala */}
                  <Field label="Observações da Escala">
                    <textarea
                      rows={2}
                      className={`${inp} resize-none`}
                      value={ordem.Escala?.Observacoes || ''}
                      disabled={onlyView}
                      onChange={e => setNested('Escala', 'Observacoes', e.target.value)}
                      placeholder="Observações..."
                    />
                  </Field>
                </div>
              )}
            </div>
          )}

          {/* ── Efetuar Baixa ── */}
          <div className="border-t border-slate-200 pt-4">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Efetuar Baixa</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Field label={ordem.TipoCobranca === 3 ? 'Tolerância' : 'Mínimo de Horas'}>
                <input type="time" className={inp} value={ordem.HoraPadrao || ''} disabled={onlyView} onChange={e => set('HoraPadrao', e.target.value)} onBlur={calcTempo} />
              </Field>
              <Field label="Hora Entrada">
                <input type="time" className={inp} value={ordem.HoraEntrada || ''} disabled={onlyView} onChange={e => set('HoraEntrada', e.target.value)} onBlur={calcTempo} />
              </Field>
              <Field label="Hora Saída">
                <input type="time" className={inp} value={ordem.HoraSaida || ''} disabled={onlyView} onChange={e => set('HoraSaida', e.target.value)} onBlur={calcTempo} />
              </Field>
              <Field label="Hora Almoço">
                <input type="time" className={inp} value={ordem.HoraAlmoco || ''} disabled={onlyView} onChange={e => set('HoraAlmoco', e.target.value)} onBlur={calcTempo} />
              </Field>
              <Field label="Hora Total">
                <div className={`${inpDis} flex items-center gap-2`}>
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="font-mono">{ordem.HoraTotal || '--:--'}</span>
                </div>
              </Field>
              <Field label="Hora Adicional">
                <div className={`${inpDis} flex items-center gap-2`}>
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="font-mono">{ordem.HoraAdicional || '--:--'}</span>
                </div>
              </Field>
            </div>
            {!onlyView && (
              <div className="flex items-center gap-2 mt-3">
                <input
                  type="checkbox"
                  id="descontarAlmoco"
                  checked={!!ordem.DescontarAlmoco}
                  onChange={e => { set('DescontarAlmoco', e.target.checked); setTimeout(calcTempo, 0); }}
                  className="w-4 h-4 accent-blue-600"
                />
                <label htmlFor="descontarAlmoco" className="text-xs font-bold text-slate-600 cursor-pointer">
                  Descontar Almoço
                </label>
              </div>
            )}
          </div>

          {/* P1: Avisos de validação */}
          {validationWarnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-2 text-xs font-black text-amber-700">
                <AlertTriangle className="w-4 h-4" /> Atenção — Possíveis conflitos:
              </div>
              {validationWarnings.map((w, i) => (
                <p key={i} className="text-[11px] text-amber-600 ml-6">{w}</p>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {!onlyView && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between rounded-b-2xl flex-shrink-0">
            <div className="text-[10px] text-slate-400">
              {ordem.CriadoPor && (
                <span>Criado por: <strong>{ordem.CriadoPor}</strong></span>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={handleClose} className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 uppercase tracking-wide transition-colors">
                Cancelar
              </button>
              {onOpenLote && !ordem.id && (
                <button
                  disabled={!fullData(false)}
                  onClick={() => onOpenLote(ordem)}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-wide rounded-xl flex items-center gap-2 transition-colors shadow-md"
                >
                  <Copy className="w-4 h-4" />
                  Criar em Lote
                </button>
              )}
              <button
                disabled={!fullData(true)}
                onClick={() => {
                  if (validationWarnings.length > 0 && !window.confirm(`Existem ${validationWarnings.length} aviso(s) de conflito. Deseja prosseguir mesmo assim?`)) return;
                  if (window.confirm('Antes de prosseguir, confira a escala!')) {
                    save(ordem, true);
                  }
                }}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-wide rounded-xl flex items-center gap-2 transition-colors shadow-md"
              >
                <ArrowDownToLine className="w-4 h-4" />
                Baixar Ordem
              </button>
              <button
                disabled={!fullData(false)}
                onClick={() => {
                  if (validationWarnings.length > 0 && !window.confirm(`Existem ${validationWarnings.length} aviso(s) de conflito. Deseja prosseguir mesmo assim?`)) return;
                  save(ordem, false);
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-wide rounded-xl flex items-center gap-2 transition-colors shadow-md"
              >
                <Save className="w-4 h-4" />
                {ordem.id ? 'Salvar Ordem' : 'Abrir Ordem'}
              </button>
            </div>
          </div>
        )}
        {onlyView && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end rounded-b-2xl flex-shrink-0">
            <button onClick={handleClose} className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-black uppercase tracking-wide rounded-xl transition-colors">
              Fechar
            </button>
          </div>
        )}
      </div>

      {/* ── P0-4: Modais de Quadro ── */}
      <ModalQuadroVeiculosLogistica
        modal={quadroVeiculosOpen}
        handleClose={() => setQuadroVeiculosOpen(false)}
        veiculos={veiculos}
        escalas={escalas}
        data={ordem.DataInicial || ordem.dataInicial || ''}
        updateVeiculos={(selecionados) => {
          const novos = selecionados.map((v: any) => ({
            veiculoId: v.id,
            manutencao: v._manutencao ?? false,
          }));
          setOrdem((p: any) => ({ ...p, EscalaVeiculos: [...(p.EscalaVeiculos || []), ...novos] }));
        }}
      />

      <ModalQuadroFuncionariosLogistica
        modal={quadroFuncionariosOpen}
        handleClose={() => setQuadroFuncionariosOpen(false)}
        funcionarios={funcionarios}
        escalas={escalas}
        cliente={ordem.Cliente}
        data={ordem.DataInicial || ordem.dataInicial || ''}
        updateFuncionarios={(integrados, naoIntegrados) => {
          const todos = [...integrados, ...naoIntegrados].map((f: any) => ({
            funcionarioId: f.id,
            statusOperacao: f._statusOperacao ?? 0,
            ausente: false,
          }));
          setOrdem((p: any) => ({ ...p, EscalaFuncionarios: [...(p.EscalaFuncionarios || []), ...todos] }));
        }}
      />
    </div>
  );
}
