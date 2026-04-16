import { useEffect, useState } from 'react';
import api from '../services/api';
import {
  ClipboardCheck, Plus, X, Loader2, Truck, ChevronRight,
  CheckCircle2, AlertTriangle, XCircle, Save, ArrowLeft,
  History, Settings2, Play, Eye, Trash2, GripVertical
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────

interface ChecklistItem { id: string; nome: string; ordem: number; }
interface ChecklistGrupo { id: string; nome: string; ordem: number; itens: ChecklistItem[]; }
interface ChecklistTemplate { id: string; nome: string; tipo: string; ativo: boolean; grupos: ChecklistGrupo[]; createdAt: string; }
interface Veiculo { id: string; placa: string; modelo: string; status: string; }
interface Resposta { itemNome: string; grupoNome: string; status: string; observacao: string; }

type Tab = 'execucao' | 'templates' | 'historico';

// ─── STATUS BUTTON ──────────────────────────────────────────────────

const StatusButton = ({ current, value, icon: Icon, label, color, onClick }: any) => {
  const isActive = current === value;
  const colorMap: Record<string, string> = {
    emerald: isActive ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100',
    amber: isActive ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 scale-105' : 'bg-amber-50 text-amber-600 hover:bg-amber-100',
    red: isActive ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 scale-105' : 'bg-red-50 text-red-600 hover:bg-red-100',
  };
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${colorMap[color]}`}
    >
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );
};

// ─── TEMPLATE EDITOR ────────────────────────────────────────────────

const TemplateEditor = ({ template, onClose, onSaved }: { template?: ChecklistTemplate | null; onClose: () => void; onSaved: () => void }) => {
  const [nome, setNome] = useState(template?.nome || '');
  const [tipo, setTipo] = useState(template?.tipo || 'VEICULO');
  const [grupos, setGrupos] = useState<{ nome: string; itens: { nome: string }[] }[]>(
    template?.grupos.map(g => ({ nome: g.nome, itens: g.itens.map(i => ({ nome: i.nome })) })) || [{ nome: 'Iluminação', itens: [{ nome: 'Farol Direito' }, { nome: 'Farol Esquerdo' }] }]
  );
  const [saving, setSaving] = useState(false);

  const addGrupo = () => setGrupos(prev => [...prev, { nome: '', itens: [{ nome: '' }] }]);
  const removeGrupo = (gi: number) => setGrupos(prev => prev.filter((_, i) => i !== gi));
  const updateGrupoNome = (gi: number, val: string) => setGrupos(prev => { const arr = [...prev]; arr[gi] = { ...arr[gi], nome: val }; return arr; });
  const addItem = (gi: number) => setGrupos(prev => { const arr = [...prev]; arr[gi] = { ...arr[gi], itens: [...arr[gi].itens, { nome: '' }] }; return arr; });
  const removeItem = (gi: number, ii: number) => setGrupos(prev => { const arr = [...prev]; arr[gi] = { ...arr[gi], itens: arr[gi].itens.filter((_, i) => i !== ii) }; return arr; });
  const updateItemNome = (gi: number, ii: number, val: string) => setGrupos(prev => { const arr = [...prev]; const itens = [...arr[gi].itens]; itens[ii] = { nome: val }; arr[gi] = { ...arr[gi], itens }; return arr; });

  const handleSave = async () => {
    if (!nome.trim()) return;
    setSaving(true);
    try {
      const payload = { nome, tipo, grupos: grupos.filter(g => g.nome.trim()).map((g, gi) => ({ nome: g.nome, ordem: gi, itens: g.itens.filter(i => i.nome.trim()).map((i, ii) => ({ nome: i.nome, ordem: ii })) })) };
      if (template?.id) {
        await api.patch(`/checklist/templates/${template.id}`, payload);
      } else {
        await api.post('/checklist/templates', payload);
      }
      onSaved();
      onClose();
    } catch (err) { console.error(err); } finally { setSaving(false); }
  };

  const inputClass = "w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all";

  return (
    <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-start justify-center p-4 pt-12 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden border border-slate-200">
        <div className="p-6 bg-blue-600 flex justify-between items-center">
          <h2 className="text-sm font-black text-white uppercase tracking-widest italic">{template ? 'Editar Template' : 'Novo Template de Checklist'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-8 space-y-6 bg-slate-50/50 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Nome do Template</label>
              <input value={nome} onChange={e => setNome(e.target.value)} className={inputClass} placeholder="Ex: Checklist Saída Caminhão" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Tipo</label>
              <select value={tipo} onChange={e => setTipo(e.target.value)} className={inputClass}>
                <option value="VEICULO">Veículo</option>
                <option value="EQUIPAMENTO">Equipamento</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Grupos e Itens de Inspeção</label>
              <button type="button" onClick={addGrupo} className="text-[10px] font-black text-blue-600 hover:text-blue-700 flex items-center gap-1 uppercase tracking-widest">
                <Plus className="w-3.5 h-3.5" /> Novo Grupo
              </button>
            </div>

            {grupos.map((grupo, gi) => (
              <div key={gi} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                  <GripVertical className="w-4 h-4 text-slate-300" />
                  <input
                    value={grupo.nome}
                    onChange={e => updateGrupoNome(gi, e.target.value)}
                    placeholder="Nome do grupo (ex: Iluminação, Pneus, Freios...)"
                    className="flex-1 bg-transparent text-sm font-bold text-slate-700 outline-none placeholder:text-slate-300"
                  />
                  <button onClick={() => removeGrupo(gi)} className="p-1 text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <div className="p-4 space-y-2">
                  {grupo.itens.map((item, ii) => (
                    <div key={ii} className="flex items-center gap-2">
                      <span className="text-[9px] text-slate-300 font-mono w-5 text-right">{ii + 1}.</span>
                      <input
                        value={item.nome}
                        onChange={e => updateItemNome(gi, ii, e.target.value)}
                        placeholder="Item de inspeção (ex: Farol Direito)"
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 transition-all"
                      />
                      <button onClick={() => removeItem(gi, ii)} className="p-1 text-slate-300 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                  <button onClick={() => addItem(gi)} className="text-[9px] text-blue-500 hover:text-blue-600 font-bold flex items-center gap-1 mt-1 ml-7">
                    <Plus className="w-3 h-3" /> Adicionar Item
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="p-6 border-t border-slate-200 flex justify-end gap-3 bg-white">
          <button onClick={onClose} className="px-8 py-3 rounded-2xl bg-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-slate-300 transition-all">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="px-8 py-3 rounded-2xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 flex items-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar Template
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── EXECUÇÃO DE CHECKLIST ──────────────────────────────────────────

const ChecklistExecution = ({ template, veiculos, onClose, onCompleted }: {
  template: ChecklistTemplate; veiculos: Veiculo[]; onClose: () => void; onCompleted: () => void;
}) => {
  const [veiculoId, setVeiculoId] = useState('');
  const [motoristaNome, setMotoristaNome] = useState('');
  const [motoristaCpf, setMotoristaCpf] = useState('');
  const [execucaoId, setExecucaoId] = useState('');
  const [started, setStarted] = useState(false);
  const [respostas, setRespostas] = useState<Record<string, Resposta>>({});
  const [observacaoGeral, setObservacaoGeral] = useState('');
  const [saving, setSaving] = useState(false);

  const startChecklist = async () => {
    try {
      const res = await api.post('/checklist/execucao', {
        templateId: template.id,
        veiculoId: veiculoId || undefined,
        motoristaNome,
        motoristaCpf,
        tipo: 'SAIDA'
      });
      setExecucaoId(res.data.execucao.id);
      setStarted(true);
    } catch (err) { console.error(err); }
  };

  const setItemStatus = (grupoNome: string, itemNome: string, status: string) => {
    const key = `${grupoNome}::${itemNome}`;
    setRespostas(prev => ({
      ...prev,
      [key]: { ...prev[key], itemNome, grupoNome, status, observacao: prev[key]?.observacao || '' }
    }));
  };

  const setItemObs = (grupoNome: string, itemNome: string, observacao: string) => {
    const key = `${grupoNome}::${itemNome}`;
    setRespostas(prev => ({
      ...prev,
      [key]: { ...prev[key], itemNome, grupoNome, status: prev[key]?.status || 'OK', observacao }
    }));
  };

  const totalItens = template.grupos.reduce((sum, g) => sum + g.itens.length, 0);
  const respondidos = Object.keys(respostas).length;
  const defeitos = Object.values(respostas).filter(r => r.status === 'DEFEITO').length;
  const progress = totalItens > 0 ? (respondidos / totalItens) * 100 : 0;

  const finalize = async () => {
    setSaving(true);
    try {
      const respostasArr = Object.values(respostas);
      await api.patch(`/checklist/execucao/${execucaoId}/finalizar`, {
        respostas: respostasArr,
        observacaoGeral,
        criarManutencao: defeitos > 0
      });
      onCompleted();
      onClose();
    } catch (err) { console.error(err); } finally { setSaving(false); }
  };

  if (!started) {
    return (
      <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200">
          <div className="p-6 bg-amber-500 flex justify-between items-center">
            <h2 className="text-sm font-black text-white uppercase tracking-widest italic">Iniciar Checklist: {template.nome}</h2>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white"><X className="w-5 h-5" /></button>
          </div>
          <div className="p-8 space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Veículo</label>
              <select value={veiculoId} onChange={e => setVeiculoId(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500">
                <option value="">Selecione o veículo...</option>
                {veiculos.filter(v => v.status !== 'MANUTENCAO').map(v => (
                  <option key={v.id} value={v.id}>{v.placa} - {v.modelo}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Motorista (Nome)</label>
                <input value={motoristaNome} onChange={e => setMotoristaNome(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-amber-500" placeholder="Nome completo" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">CPF</label>
                <input value={motoristaCpf} onChange={e => setMotoristaCpf(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-amber-500" placeholder="000.000.000-00" />
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Resumo do Template</p>
              <p className="text-sm text-slate-600 font-bold">{template.grupos.length} grupos • {totalItens} itens de inspeção</p>
            </div>
          </div>
          <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
            <button onClick={onClose} className="px-8 py-3 rounded-2xl bg-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-slate-300">Cancelar</button>
            <button onClick={startChecklist} disabled={!veiculoId} className="px-8 py-3 rounded-2xl bg-amber-500 text-white font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 shadow-xl shadow-amber-200 flex items-center gap-2 disabled:opacity-50">
              <Play className="w-4 h-4" /> Iniciar Inspeção
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Execution form
  return (
    <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-start justify-center p-4 pt-8 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden border border-slate-200 mb-8">
        <div className="p-6 bg-amber-500 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4 text-white">
            <ClipboardCheck className="w-7 h-7" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest italic">{template.nome}</h2>
              <p className="text-xs text-white/70 font-bold">{veiculos.find(v => v.id === veiculoId)?.placa} • {motoristaNome}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white/20 rounded-xl px-4 py-2 text-white text-[10px] font-black uppercase tracking-widest">
              {respondidos}/{totalItens} itens
              {defeitos > 0 && <span className="ml-2 bg-red-500 text-white px-2 py-0.5 rounded-full">{defeitos} defeitos</span>}
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-slate-100">
          <div className="h-full bg-amber-500 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>

        <div className="p-8 space-y-8">
          {template.grupos.map((grupo) => (
            <div key={grupo.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">{grupo.nome}</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {grupo.itens.map((item) => {
                  const key = `${grupo.nome}::${item.nome}`;
                  const resp = respostas[key];
                  return (
                    <div key={item.id} className={`px-6 py-4 transition-all ${resp?.status === 'DEFEITO' ? 'bg-red-50/50' : resp?.status === 'ATENCAO' ? 'bg-amber-50/30' : ''}`}>
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-sm font-bold text-slate-700 flex-1">{item.nome}</p>
                        <div className="flex items-center gap-2">
                          <StatusButton current={resp?.status} value="OK" icon={CheckCircle2} label="OK" color="emerald" onClick={(s: string) => setItemStatus(grupo.nome, item.nome, s)} />
                          <StatusButton current={resp?.status} value="ATENCAO" icon={AlertTriangle} label="Atenção" color="amber" onClick={(s: string) => setItemStatus(grupo.nome, item.nome, s)} />
                          <StatusButton current={resp?.status} value="DEFEITO" icon={XCircle} label="Defeito" color="red" onClick={(s: string) => setItemStatus(grupo.nome, item.nome, s)} />
                        </div>
                      </div>
                      {(resp?.status === 'DEFEITO' || resp?.status === 'ATENCAO') && (
                        <input
                          value={resp?.observacao || ''}
                          onChange={e => setItemObs(grupo.nome, item.nome, e.target.value)}
                          placeholder="Descreva o problema encontrado..."
                          className="mt-3 w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-amber-500 transition-all"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Observação Geral</label>
            <textarea
              value={observacaoGeral}
              onChange={e => setObservacaoGeral(e.target.value)}
              placeholder="Observações adicionais sobre o veículo..."
              className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-700 min-h-[80px] outline-none focus:border-amber-500 transition-all"
            />
          </div>

          {defeitos > 0 && (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-black text-red-700">{defeitos} defeito{defeitos > 1 ? 's' : ''} identificado{defeitos > 1 ? 's' : ''}</p>
                <p className="text-xs text-red-600 mt-1">Uma Ordem de Manutenção será criada automaticamente e o veículo ficará INDISPONÍVEL para escalas até a conclusão do reparo.</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 flex justify-between sticky bottom-0 bg-white z-10">
          <button onClick={onClose} className="px-8 py-3 rounded-2xl bg-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-slate-300 flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Abandonar
          </button>
          <button onClick={finalize} disabled={saving || respondidos < totalItens} className="px-10 py-3 rounded-2xl bg-amber-500 text-white font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 shadow-xl shadow-amber-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
            Finalizar Checklist ({respondidos}/{totalItens})
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN PAGE ──────────────────────────────────────────────────────

export default function ChecklistPage() {
  const [tab, setTab] = useState<Tab>('execucao');
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [execucoes, setExecucoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ChecklistTemplate | null>(null);
  const [executingTemplate, setExecutingTemplate] = useState<ChecklistTemplate | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tplRes, veiRes, execRes] = await Promise.all([
        api.get('/checklist/templates'),
        api.get('/logistica/veiculos'),
        api.get('/checklist/execucoes').catch(() => ({ data: [] })),
      ]);
      setTemplates(tplRes.data);
      setVeiculos(veiRes.data);
      setExecucoes(execRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm('Excluir este template de checklist?')) return;
    try { await api.delete(`/checklist/templates/${id}`); fetchData(); } catch (err) { console.error(err); }
  };

  const tabs = [
    { id: 'execucao' as Tab, label: 'Executar Checklist', icon: Play },
    { id: 'templates' as Tab, label: 'Templates', icon: Settings2 },
    { id: 'historico' as Tab, label: 'Histórico', icon: History },
  ];

  if (loading && !templates.length) return (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter italic leading-none">Checklist Veicular</h1>
          <p className="text-xs text-slate-400 font-bold uppercase italic tracking-widest mt-2">Inspeção de saída, retorno e manutenção preventiva da frota</p>
        </div>
        <div className="flex gap-2">
          {tab === 'templates' && (
            <button onClick={() => { setEditingTemplate(null); setShowTemplateEditor(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-xl shadow-blue-500/20 text-[10px] font-black uppercase italic tracking-widest">
              <Plus className="w-5 h-5" /> Novo Template
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === t.id ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Executar Checklist ── */}
      {tab === 'execucao' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.filter(t => t.ativo).map(tpl => (
            <div key={tpl.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-amber-200 hover:shadow-md transition-all group overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all shadow-inner">
                    <ClipboardCheck className="w-6 h-6" />
                  </div>
                  <span className="text-[9px] font-black text-slate-400 uppercase bg-slate-100 px-2 py-1 rounded">{tpl.tipo}</span>
                </div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight italic">{tpl.nome}</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-2">{tpl.grupos.length} grupos • {tpl.grupos.reduce((s, g) => s + g.itens.length, 0)} itens</p>
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                <button
                  onClick={() => setExecutingTemplate(tpl)}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20"
                >
                  <Play className="w-4 h-4" /> Iniciar Inspeção
                </button>
              </div>
            </div>
          ))}
          {templates.filter(t => t.ativo).length === 0 && (
            <div className="col-span-full text-center py-16">
              <ClipboardCheck className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-400 font-bold italic">Nenhum template de checklist</p>
              <p className="text-xs text-slate-300 mt-1">Crie um template na aba "Templates" para começar</p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Templates ── */}
      {tab === 'templates' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">
                <th className="px-6 py-5">Template</th>
                <th className="px-6 py-5">Tipo</th>
                <th className="px-6 py-5">Grupos / Itens</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {templates.map(tpl => (
                <tr key={tpl.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 font-black text-slate-800 text-sm uppercase italic tracking-tight">{tpl.nome}</td>
                  <td className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">{tpl.tipo}</td>
                  <td className="px-6 py-4 text-xs text-slate-500 font-bold">{tpl.grupos.length} grupos • {tpl.grupos.reduce((s, g) => s + g.itens.length, 0)} itens</td>
                  <td className="px-6 py-4">
                    <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${tpl.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                      {tpl.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => { setEditingTemplate(tpl); setShowTemplateEditor(true); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl" title="Editar">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteTemplate(tpl.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl" title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── TAB: Histórico ── */}
      {tab === 'historico' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">
                <th className="px-6 py-5">Data</th>
                <th className="px-6 py-5">Template</th>
                <th className="px-6 py-5">Veículo</th>
                <th className="px-6 py-5">Motorista</th>
                <th className="px-6 py-5">Resultado</th>
                <th className="px-6 py-5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {execucoes.map((exec: any) => {
                const defeitos = (exec.respostas || []).filter((r: any) => r.status === 'DEFEITO').length;
                const atencao = (exec.respostas || []).filter((r: any) => r.status === 'ATENCAO').length;
                return (
                  <tr key={exec.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-xs font-bold text-slate-600">
                      {new Date(exec.createdAt).toLocaleDateString('pt-BR')} {new Date(exec.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 text-xs font-black text-slate-700 uppercase italic">{exec.template?.nome || '—'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-bold text-slate-700">{exec.veiculo?.placa || '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-bold">{exec.motoristaNome || '—'}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {defeitos > 0 && <span className="text-[9px] font-black bg-red-100 text-red-700 px-2 py-0.5 rounded">{defeitos} defeitos</span>}
                        {atencao > 0 && <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded">{atencao} atenção</span>}
                        {defeitos === 0 && atencao === 0 && <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">Tudo OK</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${exec.status === 'CONCLUIDO' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {exec.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {execucoes.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <History className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm text-slate-400 font-bold italic">Nenhum checklist executado</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {showTemplateEditor && (
        <TemplateEditor
          template={editingTemplate}
          onClose={() => { setShowTemplateEditor(false); setEditingTemplate(null); }}
          onSaved={fetchData}
        />
      )}

      {executingTemplate && (
        <ChecklistExecution
          template={executingTemplate}
          veiculos={veiculos}
          onClose={() => setExecutingTemplate(null)}
          onCompleted={fetchData}
        />
      )}
    </div>
  );
}
