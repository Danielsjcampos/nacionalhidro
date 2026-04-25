import React, { useEffect, useState } from 'react';
import { X, Save, Plus, AlertTriangle, Users, Truck } from 'lucide-react';
import ModalQuadroFuncionariosLogistica from './ModalQuadroFuncionariosLogistica';
import ModalQuadroVeiculosLogistica from './ModalQuadroVeiculosLogistica';
import { STATUS_OPERACIONAL } from '../utils/logistica';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Props {
  data: any;
  modal: boolean;
  handleClose: () => void;
  save: (escala: any) => void;
  equipamentos?: any[];
  clientes?: any[];
  ordens?: any[];
  veiculos?: any[];
  funcionarios?: any[];
  escalas?: any[];
  empresas?: any[];
}

const inp = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors bg-white';
const inpErr = `w-full border border-red-400 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-500 transition-colors bg-white`;
const inpDis = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-400 cursor-not-allowed';
const Label = ({ c, children }: { c?: string; children: React.ReactNode }) => (
  <label className={`text-[10px] font-black uppercase tracking-widest block mb-1 ${c ?? 'text-slate-500'}`}>{children}</label>
);
const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <div>
    <Label>{label}{required && <span className="text-red-500 ml-0.5">*</span>}</Label>
    {children}
  </div>
);

// ─── Component ───────────────────────────────────────────────────────────────
export default function ModalCadastroEscalaLogistica({
  data, modal, handleClose, save,
  equipamentos = [], clientes = [], ordens = [],
  veiculos = [], funcionarios = [], escalas = [], empresas = [],
}: Props) {
  const [escala, setEscala] = useState<any>({});
  const [quadroFuncOpen, setQuadroFuncOpen] = useState(false);
  const [quadroVeicOpen, setQuadroVeicOpen] = useState(false);
  const [alertaOS, setAlertaOS] = useState('');

  useEffect(() => {
    if (!modal) return;
    const base = data ? { ...data } : {};
    if (!base.EscalaFuncionarios || !base.EscalaFuncionarios.length)
      base.EscalaFuncionarios = [{ funcionarioId: '', statusOperacao: 0, ausente: false }];
    if (!base.EscalaVeiculos) base.EscalaVeiculos = [];
    setEscala(base);
    setAlertaOS('');
  }, [modal, data]);

  const set = (field: string, value: any) => setEscala((p: any) => ({ ...p, [field]: value }));

  // ── Selecionar OS ───────────────────────────────────────────────────────────
  const handleSelectOrdem = (ordemId: string) => {
    const os = ordens.find((o: any) => String(o.id) === ordemId);
    if (!os) { set('OrdemId', ''); return; }

    // Verifica se OS já tem escala diferente da atual
    const escalaExistente = escalas.find((e: any) => e.ordemId === os.id && e.id !== escala.id);
    if (escalaExistente) {
      setAlertaOS('⚠️ OS já possui uma escala. Se prosseguir, ela será substituída!');
    } else {
      setAlertaOS('');
    }

    setEscala((prev: any) => ({
      ...prev,
      OrdemId: os.id,
      ClienteId: os.clienteId ?? prev.ClienteId,
      EquipamentoId: os.equipamentoId ?? prev.EquipamentoId,
      Data: os.dataInicial ? os.dataInicial.split('T')[0] : prev.Data,
      EmpresaId: os.empresaId ?? prev.EmpresaId,
    }));
  };

  // ── Validação ───────────────────────────────────────────────────────────────
  const isValid = () => {
    if (!escala.Data) return false;
    if (!escala.EquipamentoId) return false;
    if (!escala.EmpresaId) return false;
    const funcs = escala.EscalaFuncionarios || [];
    if (!funcs.every((f: any) => f.funcionarioId)) return false;
    return true;
  };

  // ── Arrays ──────────────────────────────────────────────────────────────────
  const addFuncionario = () =>
    setEscala((p: any) => ({ ...p, EscalaFuncionarios: [...(p.EscalaFuncionarios || []), { funcionarioId: '', statusOperacao: 0, ausente: false }] }));

  const removeFuncionario = (i: number) =>
    setEscala((p: any) => ({ ...p, EscalaFuncionarios: p.EscalaFuncionarios.filter((_: any, idx: number) => idx !== i) }));

  const updateFuncionario = (i: number, field: string, val: any) =>
    setEscala((p: any) => {
      const arr = [...(p.EscalaFuncionarios || [])];
      arr[i] = { ...arr[i], [field]: val };

      // Alerta se selecionado está afastado
      if (field === 'funcionarioId') {
        const func = funcionarios.find((f: any) => f.id === val);
        if (func?.motivoAfastamento && func.motivoAfastamento > 0) {
          const fim = func.fimAfastamento ? new Date(func.fimAfastamento) : null;
          if (!fim || fim > new Date()) {
            alert('⚠️ O funcionário selecionado está afastado!');
            arr[i].statusOperacao = func.motivoAfastamento;
          }
        } else {
          // Verifica se já escalado em outro cliente na mesma data
          const dataEscala = p.Data;
          if (dataEscala) {
            const jaEscalado = escalas.some((e: any) => {
              const mesmaData = e.data?.split('T')[0] === dataEscala.split('T')[0];
              const temFunc = (e.funcionarios || e.EscalaFuncionarios || []).some(
                (f: any) => (f.funcionarioId ?? f.id) === val
              );
              return mesmaData && temFunc && e.id !== escala.id;
            });
            if (jaEscalado) alert('⚠️ Funcionário já está escalado em outro cliente nesta data!');
          }
        }
      }
      return { ...p, EscalaFuncionarios: arr };
    });

  const addVeiculo = () =>
    setEscala((p: any) => ({ ...p, EscalaVeiculos: [...(p.EscalaVeiculos || []), { veiculoId: '', manutencao: false }] }));

  const removeVeiculo = (i: number) =>
    setEscala((p: any) => ({ ...p, EscalaVeiculos: p.EscalaVeiculos.filter((_: any, idx: number) => idx !== i) }));

  const updateVeiculo = (i: number, field: string, val: any) =>
    setEscala((p: any) => { const arr = [...(p.EscalaVeiculos || [])]; arr[i] = { ...arr[i], [field]: val }; return { ...p, EscalaVeiculos: arr }; });

  // ── Callbacks quadros ───────────────────────────────────────────────────────
  const handleUpdateFuncionarios = (integrados: any[], naoIntegrados: any[]) => {
    const todos = [...integrados, ...naoIntegrados];
    const mapped = todos.map(f => ({ funcionarioId: f.id, statusOperacao: f._statusOperacao ?? 0, ausente: false }));
    setEscala((p: any) => ({ ...p, EscalaFuncionarios: mapped.length ? mapped : [{ funcionarioId: '', statusOperacao: 0, ausente: false }] }));
  };

  const handleUpdateVeiculos = (selecionados: any[]) => {
    const mapped = selecionados.map(v => ({ veiculoId: v.id, manutencao: v._manutencao ?? false }));
    setEscala((p: any) => ({ ...p, EscalaVeiculos: mapped }));
  };

  if (!modal) return null;

  const clienteSelecionado = clientes.find((c: any) => c.id === escala.ClienteId);

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[95vh]">
          {/* Header */}
          <div className="bg-[#1e3a5f] px-6 py-4 flex items-center justify-between text-white rounded-t-2xl flex-shrink-0">
            <h2 className="font-black uppercase tracking-tight text-sm">
              {escala.id ? 'Editar Escala' : 'Nova Escala'}
            </h2>
            <button onClick={handleClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-6 space-y-4">
            {/* Alerta OS com escala existente */}
            {alertaOS && (
              <div className="bg-red-50 border border-red-300 rounded-lg px-4 py-3 flex items-center gap-2 text-xs text-red-700 font-bold">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {alertaOS}
              </div>
            )}

            {/* Linha 1 */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="OS (Código)">
                <select className={inp} value={String(escala.OrdemId || '')} onChange={e => handleSelectOrdem(e.target.value)}>
                  <option value="">Selecione OS (opcional)...</option>
                  {ordens.map((o: any) => (
                    <option key={o.id} value={String(o.id)}>{o.codigo ?? `OS-${o.id}`}{o.numero ? `/${o.numero}` : ''}</option>
                  ))}
                </select>
              </Field>
              <Field label="Data *" required>
                <input
                  type="date"
                  className={!escala.Data ? inpErr : inp}
                  value={escala.Data || ''}
                  disabled={!!escala.OrdemId}
                  onChange={e => set('Data', e.target.value)}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Hora">
                <input type="time" className={inp} value={escala.Hora || ''} onChange={e => set('Hora', e.target.value)} />
              </Field>
              <Field label="Empresa *" required>
                <select className={!escala.EmpresaId ? inpErr : inp} value={escala.EmpresaId || ''} onChange={e => set('EmpresaId', e.target.value)}>
                  <option value="">Selecione...</option>
                  {empresas.length
                    ? empresas.map((e: any) => <option key={e.id} value={e.id}>{e.nomeFantasia ?? e.razaoSocial}</option>)
                    : <><option value="NH1">NACIONAL HIDROSANEAMENTO EIRELI EPP</option><option value="NH2">NACIONAL HIDRO LOCAÇÃO</option></>
                  }
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Cliente">
                <select
                  className={inp}
                  value={escala.ClienteId || ''}
                  disabled={!!escala.OrdemId}
                  onChange={e => set('ClienteId', e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {clientes.map((c: any) => <option key={c.id} value={c.id}>{c.razaoSocial ?? c.nome}</option>)}
                </select>
              </Field>
              <Field label="Equipamento *" required>
                <select
                  className={!escala.EquipamentoId ? inpErr : inp}
                  value={escala.EquipamentoId || ''}
                  onChange={e => set('EquipamentoId', e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {equipamentos.map((eq: any) => <option key={eq.id} value={eq.id}>{eq.nome}</option>)}
                </select>
              </Field>
            </div>

            {/* Veículos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-slate-500" />
                  <Label>Veículos</Label>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setQuadroVeicOpen(true)}
                    className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 hover:bg-teal-100 transition-all uppercase tracking-wider">
                    Ver Quadro
                  </button>
                  <button type="button" onClick={addVeiculo}
                    className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 hover:bg-blue-100 transition-all uppercase tracking-wider">
                    <Plus className="w-3 h-3 inline" /> Adicionar
                  </button>
                </div>
              </div>
              {(escala.EscalaVeiculos || []).map((v: any, i: number) => (
                <div key={i} className="flex gap-2 items-center">
                  <select className={inp} value={v.veiculoId || ''} onChange={e => updateVeiculo(i, 'veiculoId', e.target.value)}>
                    <option value="">Selecione...</option>
                    {veiculos.map((vei: any) => <option key={vei.id} value={vei.id}>{vei.placa} — {vei.modelo}</option>)}
                  </select>
                  <select className="border border-slate-200 rounded-lg px-2 py-2 text-xs outline-none flex-shrink-0"
                    value={v.manutencao ? 'sim' : 'nao'} onChange={e => updateVeiculo(i, 'manutencao', e.target.value === 'sim')}>
                    <option value="nao">Normal</option>
                    <option value="sim">Manutenção</option>
                  </select>
                  <button onClick={() => removeVeiculo(i)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg flex-shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Funcionários */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-500" />
                  <Label>Funcionários</Label>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setQuadroFuncOpen(true)}
                    className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 hover:bg-teal-100 transition-all uppercase tracking-wider">
                    Ver Quadro
                  </button>
                  <button type="button" onClick={addFuncionario}
                    className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 hover:bg-blue-100 transition-all uppercase tracking-wider">
                    <Plus className="w-3 h-3 inline" /> Adicionar
                  </button>
                </div>
              </div>
              {(escala.EscalaFuncionarios || []).map((f: any, i: number) => (
                <div key={i} className="flex gap-2 items-center">
                  <select className={inp} value={f.funcionarioId || ''}
                    onChange={e => updateFuncionario(i, 'funcionarioId', e.target.value)}>
                    <option value="">Selecione...</option>
                    {funcionarios.map((fn: any) => <option key={fn.id} value={fn.id}>{fn.nome} — {fn.cargo}</option>)}
                  </select>
                  <select className="border border-slate-200 rounded-lg px-2 py-2 text-xs outline-none flex-shrink-0"
                    value={f.statusOperacao ?? 0} onChange={e => updateFuncionario(i, 'statusOperacao', Number(e.target.value))}>
                    {STATUS_OPERACIONAL.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <label className="flex items-center gap-1 text-[10px] font-bold text-slate-500 flex-shrink-0 cursor-pointer">
                    <input type="checkbox" checked={!!f.ausente} onChange={e => updateFuncionario(i, 'ausente', e.target.checked)}
                      className="w-3.5 h-3.5 accent-red-600" />
                    Ausente
                  </label>
                  {(escala.EscalaFuncionarios || []).length > 1 && (
                    <button onClick={() => removeFuncionario(i)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg flex-shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Observações */}
            <div>
              <Label>Observações</Label>
              <textarea rows={2} className={`${inp} resize-none`}
                value={escala.Observacoes || ''} onChange={e => set('Observacoes', e.target.value)}
                placeholder="Observações..." />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 rounded-b-2xl flex-shrink-0">
            <button onClick={handleClose} className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 uppercase tracking-wide transition-colors">
              Cancelar
            </button>
            <button disabled={!isValid()} onClick={() => save(escala)}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-wide rounded-xl flex items-center gap-2 transition-colors shadow-md">
              <Save className="w-4 h-4" />
              Salvar Escala
            </button>
          </div>
        </div>
      </div>

      {/* Sub-modals */}
      <ModalQuadroFuncionariosLogistica
        modal={quadroFuncOpen}
        handleClose={() => setQuadroFuncOpen(false)}
        funcionarios={funcionarios}
        escalas={escalas}
        cliente={clienteSelecionado}
        data={escala.Data || ''}
        updateFuncionarios={handleUpdateFuncionarios}
      />
      <ModalQuadroVeiculosLogistica
        modal={quadroVeicOpen}
        handleClose={() => setQuadroVeicOpen(false)}
        veiculos={veiculos}
        escalas={escalas}
        data={escala.Data || ''}
        updateVeiculos={handleUpdateVeiculos}
      />
    </>
  );
}
