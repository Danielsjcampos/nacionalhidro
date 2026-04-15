import { useToast } from '../contexts/ToastContext';
import { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import {
  Plus, Loader2, X, CheckCircle2, AlertTriangle, Clock, ChevronRight,
  Send, Eye, RefreshCw, MessageSquare, CalendarDays, MapPin, Users,
  Truck, Shield, Package, ClipboardList, AlertCircle, FolderOpen
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PENDENTE:      { label: 'Pendente',      color: 'text-slate-600',   bg: 'bg-slate-100 border-slate-200' },
  DISPARADO:     { label: 'Disparado',     color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-200' },
  EM_ANDAMENTO:  { label: 'Em Andamento',  color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200' },
  PRONTO:        { label: 'Pronto',        color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  BLOQUEADO:     { label: 'Bloqueado',     color: 'text-red-600',     bg: 'bg-red-50 border-red-200' },
  EM_REVISAO:    { label: 'Em Revisão',    color: 'text-orange-600',  bg: 'bg-orange-50 border-orange-200' },
  CONCLUIDO:     { label: 'Concluído',     color: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-300' },
};

const TAREFA_STATUS: Record<string, { icon: any; color: string }> = {
  PENDENTE:  { icon: Clock,         color: 'text-slate-400' },
  CONCLUIDA: { icon: CheckCircle2,  color: 'text-emerald-500' },
  RESSALVA:  { icon: AlertTriangle, color: 'text-amber-500' },
  IMPEDIDA:  { icon: AlertCircle,   color: 'text-red-500' },
};

const AREA_ICON: Record<string, any> = {
  LOGISTICA:   Truck,
  RH:          Users,
  SEGURANCA:   Shield,
  SUPRIMENTOS: Package,
  SUPERVISAO:  ClipboardList,
  OPERACIONAL: Truck,
};

const INTEGRACAO_OPTIONS = [
  { value: 'NO_DIA', label: 'No dia de início' },
  { value: 'ANTES', label: 'Antes — enviar documentação' },
  { value: 'JA_ATIVA', label: 'Já ativa' },
  { value: 'NAO_NECESSARIA', label: 'Não necessária' },
];

export default function Agendamentos() {
    const { showToast } = useToast();
  const [list, setList] = useState<any[]>([]);
  const [ordens, setOrdens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [previewText, setPreviewText] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<any>({
    ordemServicoId: '',
    cidadeServico: '',
    dataViagem: '',
    dataInicio: '',
    dataTermino: '',
    duracaoDias: '',
    turno: 'DIURNO',
    equipeSummary: '',
    tipoAtividade: '',
    tipoIntegracao: 'NO_DIA',
    fornecimentosNH: '',
    fornecimentosCliente: '',
    contatosExtras: '',
    observacoes: '',
  });

  const osAbertas = useMemo(() =>
    ordens.filter((o: any) => !['BAIXADA', 'CONCLUIDA', 'CANCELADA', 'FINALIZADA'].includes(o.status)),
  [ordens]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [agRes, osRes] = await Promise.all([
        api.get('/agendamentos').catch(() => ({ data: [] })),
        api.get('/os').catch(() => ({ data: [] })),
      ]);
      setList(agRes.data || []);
      setOrdens(osRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleOsChange = (ordemServicoId: string) => {
    const os = ordens.find((o: any) => o.id === ordemServicoId);
    if (!os) return;
    
    const equipeSummary = '';
    const tipoAtividade = os.servicos?.map((s: any) => s.equipamento).filter(Boolean).join('\n') || '';

    setForm((prev: any) => ({
      ...prev,
      ordemServicoId,
      cidadeServico: os.cliente?.cidade || '',
      equipeSummary,
      tipoAtividade,
      contatosExtras: JSON.stringify([{
        nome: os.contato || os.cliente?.nome || '',
        tel: os.cliente?.telefone || '',
        depto: ''
      }]),
    }));
  };

  const handleSave = async () => {
    if (!form.ordemServicoId || !form.dataInicio || !form.cidadeServico) {
      showToast('Preencha a Ordem de Serviço, Data de Início e Cidade.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        dataViagem: form.dataViagem ? new Date(form.dataViagem).toISOString() : null,
        dataInicio: new Date(form.dataInicio).toISOString(),
        dataTermino: form.dataTermino ? new Date(form.dataTermino).toISOString() : null,
        duracaoDias: form.duracaoDias ? parseInt(form.duracaoDias) : null,
      };

      if (selected) {
        await api.patch(`/agendamentos/${selected.id}`, payload);
      } else {
        await api.post('/agendamentos', payload);
      }
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Erro ao salvar agendamento');
    } finally {
      setSaving(false);
    }
  };

  const handleDisparar = async (id: string) => {
    if (!window.confirm('Confirma o disparo da mensagem no WhatsApp e E-mail?')) return;
    try {
      const res = await api.post(`/agendamentos/${id}/disparar`);
      showToast(res.data.whatsappOk ? '✅ Mensagem disparada com sucesso!' : '⚠️ Agendamento salvo, mas WhatsApp não foi enviado. Verifique as configurações.');
      fetchData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Erro ao disparar');
    }
  };

  const handlePreview = async (id: string) => {
    try {
      const res = await api.get(`/agendamentos/${id}/preview`);
      setPreviewText(res.data.mensagem);
      setShowPreview(true);
    } catch { showToast('Erro ao gerar preview'); }
  };

  const handleUpdateTarefa = async (agId: string, tarefaId: string, statusTarefa: string, observacao?: string) => {
    try {
      await api.patch(`/agendamentos/${agId}/tarefas/${tarefaId}`, { statusTarefa, observacao });
      fetchData();
    } catch { showToast('Erro ao atualizar tarefa'); }
  };

  const handleRemarcar = async (id: string) => {
    if (!window.confirm('Deseja remarcar este agendamento? As tarefas serão resetadas.')) return;
    try {
      await api.post(`/agendamentos/${id}/remarcar`);
      fetchData();
    } catch { showToast('Erro ao remarcar'); }
  };

  const openEdit = (ag: any) => {
    setSelected(ag);
    setForm({
      ordemServicoId: ag.ordemServicoId || '',
      cidadeServico: ag.cidadeServico || '',
      dataViagem: ag.dataViagem ? ag.dataViagem.split('T')[0] : '',
      dataInicio: ag.dataInicio ? ag.dataInicio.split('T')[0] : '',
      dataTermino: ag.dataTermino ? ag.dataTermino.split('T')[0] : '',
      duracaoDias: ag.duracaoDias || '',
      turno: ag.turno || 'DIURNO',
      equipeSummary: ag.equipeSummary || '',
      tipoAtividade: ag.tipoAtividade || '',
      tipoIntegracao: ag.tipoIntegracao || 'NO_DIA',
      fornecimentosNH: ag.fornecimentosNH || '',
      fornecimentosCliente: ag.fornecimentosCliente || '',
      contatosExtras: ag.contatosExtras || '',
      observacoes: ag.observacoes || '',
    });
    setShowModal(true);
  };

  const openNew = () => {
    setSelected(null);
    setForm({
      ordemServicoId: '', cidadeServico: '', dataViagem: '', dataInicio: '', dataTermino: '',
      duracaoDias: '', turno: 'DIURNO', equipeSummary: '', tipoAtividade: '',
      tipoIntegracao: 'NO_DIA', fornecimentosNH: '', fornecimentosCliente: '',
      contatosExtras: '', observacoes: '',
    });
    setShowModal(true);
  };

  // Stats
  const stats = useMemo(() => ({
    total: list.length,
    pendentes: list.filter(a => a.status === 'PENDENTE' || a.status === 'DISPARADO').length,
    emAndamento: list.filter(a => a.status === 'EM_ANDAMENTO').length,
    prontos: list.filter(a => a.status === 'PRONTO' || a.status === 'CONCLUIDO').length,
    bloqueados: list.filter(a => a.status === 'BLOQUEADO').length,
  }), [list]);

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <CalendarDays className="w-7 h-7 text-blue-600" /> Agendamento Logístico
          </h1>
          <p className="text-sm text-slate-500">Disparo operacional de serviços para a equipe</p>
        </div>
        <button onClick={openNew} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold text-sm transition-all shadow-lg shadow-blue-500/20">
          <Plus className="w-4 h-4" /> Novo Agendamento
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'bg-slate-800', icon: CalendarDays },
          { label: 'Pendentes', value: stats.pendentes, color: 'bg-blue-600', icon: Clock },
          { label: 'Em Andamento', value: stats.emAndamento, color: 'bg-amber-500', icon: RefreshCw },
          { label: 'Prontos', value: stats.prontos, color: 'bg-emerald-600', icon: CheckCircle2 },
        ].map(s => (
          <div key={s.label} className={`${s.color} text-white rounded-xl p-4 flex items-center gap-3`}>
            <s.icon className="w-8 h-8 opacity-60" />
            <div>
              <p className="text-2xl font-black">{s.value}</p>
              <p className="text-[10px] uppercase tracking-widest opacity-80">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Cards List */}
      {list.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <FolderOpen className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-400 font-medium">Nenhum agendamento criado ainda.</p>
          <p className="text-slate-400 text-sm">Clique em "Novo Agendamento" para começar.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((ag: any) => {
            const statusCfg = STATUS_CONFIG[ag.status] || STATUS_CONFIG.PENDENTE;
            const tarefasDone = (ag.tarefas || []).filter((t: any) => t.statusTarefa === 'CONCLUIDA').length;
            const tarefasTotal = (ag.tarefas || []).length;
            const pct = tarefasTotal > 0 ? Math.round((tarefasDone / tarefasTotal) * 100) : 0;

            return (
              <div key={ag.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Card Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${statusCfg.bg} border`}>
                      <MapPin className={`w-6 h-6 ${statusCfg.color}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">{ag.cliente?.nome || '—'}</h3>
                      <p className="text-sm text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {ag.cidadeServico}
                        <span className="mx-2">•</span>
                        OS: <span className="font-bold text-blue-600">{ag.ordemServico?.codigo || ag.proposta?.codigo || '—'}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${statusCfg.bg} ${statusCfg.color}`}>
                      {statusCfg.label}
                    </span>
                    <div className="flex gap-1">
                      {ag.status === 'PENDENTE' && (
                        <button onClick={() => handleDisparar(ag.id)} title="Disparar" className="p-2 hover:bg-blue-50 rounded-lg text-blue-600">
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => handlePreview(ag.id)} title="Preview" className="p-2 hover:bg-slate-50 rounded-lg text-slate-500">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => openEdit(ag)} title="Editar" className="p-2 hover:bg-slate-50 rounded-lg text-slate-500">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      {['DISPARADO', 'EM_ANDAMENTO', 'PRONTO'].includes(ag.status) && (
                        <button onClick={() => handleRemarcar(ag.id)} title="Remarcar" className="p-2 hover:bg-orange-50 rounded-lg text-orange-500">
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Meta */}
                <div className="flex items-center gap-6 px-5 py-3 bg-slate-50 text-xs text-slate-500">
                  <span>📅 Início: <b className="text-slate-700">{ag.dataInicio ? new Date(ag.dataInicio).toLocaleDateString('pt-BR') : '—'}</b></span>
                  {ag.dataViagem && <span>🚛 Viagem: <b className="text-slate-700">{new Date(ag.dataViagem).toLocaleDateString('pt-BR')}</b></span>}
                  {ag.duracaoDias && <span>⏱ Duração: <b className="text-slate-700">{ag.duracaoDias} dias</b></span>}
                  {ag.turno && <span>🕐 Turno: <b className="text-slate-700">{ag.turno}</b></span>}
                </div>

                {/* Progress + Tasks */}
                {tarefasTotal > 0 && (
                  <div className="px-5 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tarefas ({tarefasDone}/{tarefasTotal})</span>
                      <span className="text-[10px] font-bold text-slate-500">{pct}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                      <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(ag.tarefas || []).map((t: any) => {
                        const tCfg = TAREFA_STATUS[t.statusTarefa] || TAREFA_STATUS.PENDENTE;
                        const TIcon = tCfg.icon;
                        const AreaIcon = AREA_ICON[t.area] || ClipboardList;
                        return (
                          <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 transition-all group">
                            <AreaIcon className="w-4 h-4 text-slate-300 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-700 truncate">{t.descricao}</p>
                              <p className="text-[10px] text-slate-400">{t.responsavel || t.area}</p>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {t.statusTarefa === 'PENDENTE' && (
                                <>
                                  <button onClick={() => handleUpdateTarefa(ag.id, t.id, 'CONCLUIDA')} className="p-1 text-emerald-500 hover:bg-emerald-50 rounded" title="Concluir">
                                    <CheckCircle2 className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => { const obs = prompt('Observação da ressalva:'); if (obs) handleUpdateTarefa(ag.id, t.id, 'RESSALVA', obs); }} className="p-1 text-amber-500 hover:bg-amber-50 rounded" title="Ressalva">
                                    <AlertTriangle className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => { const obs = prompt('Motivo do impedimento:'); if (obs) handleUpdateTarefa(ag.id, t.id, 'IMPEDIDA', obs); }} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Impedido">
                                    <AlertCircle className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                            <TIcon className={`w-4 h-4 flex-shrink-0 ${tCfg.color}`} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ NEW/EDIT MODAL ═══ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white z-10 rounded-t-2xl">
              <h2 className="text-lg font-bold text-slate-800">
                {selected ? 'Editar Agendamento' : 'Novo Agendamento'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-6">
              {/* OS Selector */}
              {!selected && (
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Ordem de Serviço *</label>
                  <select
                    value={form.ordemServicoId}
                    onChange={e => handleOsChange(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione uma Ordem de Serviço em Aberto...</option>
                    {osAbertas.map((o: any) => (
                      <option key={o.id} value={o.id}>{o.codigo} — {o.cliente?.nome}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Dados Operacionais */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Cidade do Serviço *</label>
                  <input value={form.cidadeServico} onChange={e => setForm({ ...form, cidadeServico: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: São Gonçalo - RJ" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Turno</label>
                  <select value={form.turno} onChange={e => setForm({ ...form, turno: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="DIURNO">Diurno</option>
                    <option value="NOTURNO">Noturno</option>
                    <option value="24H">24 Horas</option>
                  </select>
                </div>
              </div>

              {/* Datas */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Data Viagem</label>
                  <input type="date" value={form.dataViagem} onChange={e => setForm({ ...form, dataViagem: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Data Início *</label>
                  <input type="date" value={form.dataInicio} onChange={e => setForm({ ...form, dataInicio: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Data Término</label>
                  <input type="date" value={form.dataTermino} onChange={e => setForm({ ...form, dataTermino: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Duração (dias)</label>
                  <input type="number" min="1" value={form.duracaoDias} onChange={e => setForm({ ...form, duracaoDias: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Equipe + Atividade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Equipe</label>
                  <textarea rows={3} value={form.equipeSummary} onChange={e => setForm({ ...form, equipeSummary: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="01 Motorista&#10;02 Jatistas" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Tipo Atividade / Equipamentos</label>
                  <textarea rows={3} value={form.tipoAtividade} onChange={e => setForm({ ...form, tipoAtividade: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="01 Hidrojato SAP - 1 saída" />
                </div>
              </div>

              {/* Integração */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Integração</label>
                <select value={form.tipoIntegracao} onChange={e => setForm({ ...form, tipoIntegracao: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                  {INTEGRACAO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              {/* Fornecimentos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Fornecimentos NH</label>
                  <input value={form.fornecimentosNH} onChange={e => setForm({ ...form, fornecimentosNH: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Hospedagem, Lavanderia" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Fornecimentos Cliente</label>
                  <input value={form.fornecimentosCliente} onChange={e => setForm({ ...form, fornecimentosCliente: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Água, Almoço, Diesel" />
                </div>
              </div>

              {/* Contatos extras */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Contatos (nome - telefone)</label>
                <textarea rows={2} value={form.contatosExtras} onChange={e => setForm({ ...form, contatosExtras: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder='[{"nome":"Luiza","tel":"11 981360051","depto":"Compras"}]' />
              </div>

              {/* Observações */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Observações</label>
                <textarea rows={3} value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Anotações operacionais, instruções especiais..." />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100 sticky bottom-0 bg-white rounded-b-2xl">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button onClick={handleSave} disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-500/20">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {selected ? 'Salvar Alterações' : 'Criar Agendamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ PREVIEW MODAL ═══ */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10 rounded-t-2xl">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-500" /> Preview da Mensagem
              </h2>
              <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <pre className="bg-[#0b141a] text-[#e9edef] p-6 rounded-xl text-sm whitespace-pre-wrap font-sans leading-relaxed">
                {previewText}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
