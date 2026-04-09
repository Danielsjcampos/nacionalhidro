import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  Users, UserCheck, Clock, Palmtree, AlertTriangle, Search, Filter,
  Loader2, RefreshCw, ArrowRight, UserPlus,
  Shield, X, FileText, Phone, Mail, XCircle, CheckCircle2
} from 'lucide-react';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  NOVO_COLABORADOR: { label: 'Novo Colaborador', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200', dot: 'bg-indigo-500' },
  EFETIVADO:      { label: 'Efetivado',       color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  EXPERIENCIA_40: { label: 'Experiência 40d', color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',    dot: 'bg-amber-500'   },
  EXPERIENCIA_90: { label: 'Experiência 90d', color: 'text-orange-700',  bg: 'bg-orange-50 border-orange-200',  dot: 'bg-orange-500'  },
  FERIAS:         { label: 'Em Férias',        color: 'text-cyan-700',    bg: 'bg-cyan-50 border-cyan-200',      dot: 'bg-cyan-500'    },
  AFASTADO:       { label: 'Afastado',         color: 'text-red-700',     bg: 'bg-red-50 border-red-200',        dot: 'bg-red-500'     },
  DESLIGADO:      { label: 'Desligado',        color: 'text-slate-500',   bg: 'bg-slate-100 border-slate-300',   dot: 'bg-slate-400'   },
};

const COLUNAS_KANBAN = [
  { id: 'NOVO_COLABORADOR', title: 'Novo Colaborador', color: 'indigo' },
  { id: 'EXPERIENCIA_40', title: 'Experiência 40 dias', color: 'amber' },
  { id: 'EXPERIENCIA_90', title: 'Experiência 90 dias', color: 'orange' },
  { id: 'EFETIVADO', title: 'Efetivo', color: 'emerald' },
  { id: 'AFASTADO', title: 'Afastamentos +15 dias', color: 'rose' },
  { id: 'DESLIGADO', title: 'Desligamento', color: 'slate' }
];

const CATEGORIAS = ['MOTORISTA', 'OPERADOR', 'AJUDANTE', 'JATISTA', 'ADMINISTRATIVO', 'LIDER'];

export default function GestaoColaboradoresPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<any>(null);
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [loadingList, setLoadingList] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [categoriaFilter, setCategoriaFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [updatingFeedbackId, setUpdatingFeedbackId] = useState<string | null>(null);

  // DP Onboarding State
  const [showOnboardingForm, setShowOnboardingForm] = useState(false);
  const [formOnboarding, setFormOnboarding] = useState<any>({});

  // DP Feedback / CCT Cicle State
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [formFeedback, setFormFeedback] = useState<any>({});
  const [feedbackTipo, setFeedbackTipo] = useState<'45' | '90'>('45');

  // Efetivo & Afastamento State
  const [showEfetivoForm, setShowEfetivoForm] = useState(false);
  const [formEfetivo, setFormEfetivo] = useState<any>({});
  const [showAfastamentoForm, setShowAfastamentoForm] = useState(false);
  const [formAfastamento, setFormAfastamento] = useState<any>({
    dataFim: new Date().toISOString().split('T')[0],
    motivo: '',
  });

  // Desligamento State
  const [showDesligamentoForm, setShowDesligamentoForm] = useState(false);
  const [formDesligamento, setFormDesligamento] = useState<any>({
    tipoDesligamento: 'DISPENSA_SEM_JUSTA_CAUSA',
    dataDesligamento: new Date().toISOString().split('T')[0],
    motivoDesligamento: '',
  });
  const [isSubmittingDesligamento, setIsSubmittingDesligamento] = useState(false);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/gestao-colaboradores/dashboard');
      setDashboard(res.data);
    } catch (err) {
      console.error('Dashboard fetch error', err);
    }
  };

  const fetchColaboradores = async (p = page) => {
    setLoadingList(true);
    try {
      const params: any = { page: p, limit: 500 };
      if (search) params.search = search;
      if (statusFilter && statusFilter !== 'TODOS') params.status = statusFilter;
      if (categoriaFilter) params.categoria = categoriaFilter;
      const res = await api.get('/gestao-colaboradores', { params });
      setColaboradores(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('List fetch error', err);
    } finally {
      setLoadingList(false);
    }
  };

  const handleRequestFeedback = async (id: string, tipo: '45' | '90') => {
    try {
      setUpdatingFeedbackId(id);
      await api.patch(`/gestao-colaboradores/${id}`, { requestFeedback: tipo });
      alert(`E-mail de solicitação de feedback (${tipo} dias) enviado ao gestor.`);
      fetchDashboard();
      fetchColaboradores();
    } catch (err) {
      console.error('Feedback request error', err);
      alert('Erro ao solicitar feedback.');
    } finally {
      setUpdatingFeedbackId(null);
    }
  };

  const handleSaveOnboarding = async (concluir = false) => {
    if (!showDetail) return;
    try {
      const isConcluido = concluir ? true : showDetail.onboardingConcluido;
      const patched = await api.patch(`/gestao-colaboradores/${showDetail.id}`, {
        dadosOnboarding: formOnboarding,
        onboardingConcluido: isConcluido
      });
      setShowDetail(patched.data); // Update detail view
      setShowOnboardingForm(false);
      fetchColaboradores();
    } catch (err) {
      console.error('Save onboarding error', err);
      alert('Erro ao salvar Setup do Colaborador');
    }
  };

  const handleSaveFeedback = async () => {
    if (!showDetail) return;
    try {
      if (!formFeedback.recomendacao) {
        alert("Escolha uma recomendação antes de continuar.");
        return;
      }

      const payload: any = {
        anotacoesReferentesExperiencia: {
          ...(showDetail.anotacoesReferentesExperiencia || {}),
          [feedbackTipo]: formFeedback,
        }
      };

      if (feedbackTipo === '45') {
        payload.statusExperiencia45 = formFeedback.recomendacao;
        payload.dataFeedback45 = new Date().toISOString();
      } else {
        payload.statusExperiencia90 = formFeedback.recomendacao;
        payload.dataFeedback90 = new Date().toISOString();
      }

      if (formFeedback.recomendacao === 'REPROVADO' || formFeedback.recomendacao === 'PEDIDO_DEMISSAO') {
        const confirmou = window.confirm("Você selecionou desligamento. Deseja desativar este colaborador do sistema?");
        if (confirmou) {
          payload.status = 'DESLIGADO';
          payload.dataDesligamento = new Date().toISOString();
        }
      }

      const patched = await api.patch(`/gestao-colaboradores/${showDetail.id}`, payload);
      setShowDetail(patched.data);
      setShowFeedbackForm(false);
      fetchDashboard();
      fetchColaboradores();
      alert('Registro de Fechamento de Experiência salvo com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar Fechamento de Experiência');
    }
  };

  const handleSaveEfetivo = async () => {
    if (!showDetail) return;
    try {
      const patched = await api.patch(`/gestao-colaboradores/${showDetail.id}`, {
        dadosEfetivacao: formEfetivo,
        efetivacaoConcluida: true,
        armarioVestiario: formEfetivo.armarioVestiario,
        equipamentosAdministrativos: formEfetivo.equipamentosAdministrativos,
        seguroVidaAtivo: formEfetivo.seguroVidaAtivo,
        convenioMedico: formEfetivo.convenioMedico
      });
      setShowDetail(patched.data);
      setShowEfetivoForm(false);
      fetchColaboradores();
      alert('Cadastro de Efetivação concluído!');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar Efetivação');
    }
  };

  const handleSaveAfastamento = async () => {
    if (!showDetail) return;
    try {
      await api.patch(`/gestao-colaboradores/${showDetail.id}`, {
        afastamento: formAfastamento
      });
      setShowAfastamentoForm(false);
      setShowDetail(null); // Close drawer to reflect status change in list
      fetchDashboard();
      fetchColaboradores();
      alert('Afastamento registrado com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao registrar afastamento');
    }
  };

  const handleSaveDesligamento = async () => {
    if (!showDetail) return;
    try {
      setIsSubmittingDesligamento(true);
      const patched = await api.patch(`/gestao-colaboradores/${showDetail.id}`, {
        desligamento: formDesligamento
      });
      setShowDetail(patched.data);
      setShowDesligamentoForm(false);
      fetchDashboard();
      fetchColaboradores();
      alert('Processo de desligamento iniciado com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao registrar desligamento');
    } finally {
      setIsSubmittingDesligamento(false);
    }
  };

  const handleUpdateChecklistDesligamento = async (desligamentoId: string, field: string, value: boolean) => {
    if (!showDetail) return;
    try {
      const currentDesligamento = showDetail.desligamentos?.find((d: any) => d.id === desligamentoId);
      if (!currentDesligamento) return;

      const newChecklist = {
        ...(currentDesligamento.checklistRescisao || {}),
        [field]: value
      };

      // Check if all are done (simplified check based on common items)
      const commonItems = ['emailInativado', 'sistemasInativados', 'cajuCancelado', 'exameDemissional'];
      const allDone = commonItems.every(item => newChecklist[item]);

      const patched = await api.patch(`/gestao-colaboradores/${showDetail.id}`, {
        updateChecklistDesligamento: {
          desligamentoId,
          checklistRescisao: newChecklist,
          concluido: allDone
        }
      });
      setShowDetail(patched.data);
      fetchColaboradores();
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar checklist');
    }
  };

  useEffect(() => {
    Promise.all([fetchDashboard(), fetchColaboradores(1)]).then(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading) fetchColaboradores(1);
  }, [statusFilter, categoriaFilter]);

  useEffect(() => {
    if (!loading) {
      const timeout = setTimeout(() => fetchColaboradores(1), 400);
      return () => clearTimeout(timeout);
    }
  }, [search]);

  const d = dashboard || {};

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-6 overflow-y-auto bg-slate-50 p-6 rounded-3xl">
      {/* Header */}
      <header className="flex items-center justify-between flex-wrap gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Gestão de Colaboradores</h1>
            <p className="text-sm font-medium text-slate-500">Visão consolidada de todos os funcionários</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => navigate('/admissao')} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all shadow-md">
            <UserPlus className="w-4 h-4" /> Nova Admissão
          </button>
          <button onClick={() => { fetchDashboard(); fetchColaboradores(); }} className="p-2 border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 rounded-xl transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Ativos',          value: d.ativos,              icon: Users,           gradient: 'from-slate-800 to-slate-900',     filter: 'TODOS' },
          { label: 'Experiência 45d', value: d.experiencia45,       icon: Clock,           gradient: 'from-amber-500 to-amber-600',     filter: 'EXPERIENCIA_45' },
          { label: 'Experiência 90d', value: d.experiencia90,       icon: Clock,           gradient: 'from-orange-500 to-orange-600',   filter: 'EXPERIENCIA_90' },
          { label: 'Efetivados',      value: d.efetivados,          icon: UserCheck,       gradient: 'from-emerald-500 to-emerald-600', filter: 'EFETIVADO' },
          { label: 'Afastados',       value: d.afastados,           icon: AlertTriangle,   gradient: 'from-red-500 to-rose-600',        filter: 'AFASTADO' },
          { label: 'Em Férias',       value: d.emFerias,            icon: Palmtree,        gradient: 'from-cyan-500 to-cyan-600',       filter: 'FERIAS' },
          { label: 'Desligamento',    value: d.emDesligamento,      icon: X,               gradient: 'from-slate-500 to-slate-600',     filter: 'DESLIGADO' },
        ].map((card, i) => (
          <button
            key={i}
            onClick={() => { setStatusFilter(card.filter); setPage(1); }}
            className={`bg-gradient-to-br ${card.gradient} rounded-2xl p-4 text-left transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-95 ${statusFilter === card.filter ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
          >
            <card.icon className="w-5 h-5 text-white/60 mb-2" />
            <p className="text-2xl font-black text-white leading-none">{card.value ?? 0}</p>
            <p className="text-[10px] font-bold text-white/70 uppercase mt-1">{card.label}</p>
          </button>
        ))}
      </section>



      {/* Filters Bar */}
      <section className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text" placeholder="Buscar por nome, CPF, cargo, matrícula..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select value={categoriaFilter} onChange={e => { setCategoriaFilter(e.target.value); setPage(1); }}
            className="border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-600 outline-none focus:border-blue-500">
            <option value="">Todas Categorias</option>
            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <span className="text-xs font-bold text-slate-400 ml-auto">{pagination.total} resultados</span>
      </section>

      {/* Kanban Board */}
      <section className="flex-1 min-h-[500px] flex">
        {loadingList ? (
          <div className="w-full flex items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : colaboradores.length === 0 ? (
          <div className="w-full text-center py-20 bg-white rounded-2xl border border-slate-200 text-slate-400 text-sm">
            Nenhum colaborador encontrado
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar w-full items-stretch">
            {COLUNAS_KANBAN.map(col => {
              // Group users
              let items = colaboradores.filter(c => c.statusComputado === col.id);
              // Fallback: If status is 'FERIAS', show them in 'AFASTADO' column
              if (col.id === 'AFASTADO') {
                items = [...items, ...colaboradores.filter(c => c.statusComputado === 'FERIAS')];
              }

              return (
                <div key={col.id} className="min-w-[320px] w-[320px] bg-slate-200/50 rounded-2xl border border-slate-200 flex flex-col overflow-hidden shadow-sm">
                  {/* Column Header */}
                  <div className={`p-4 border-b border-slate-200 bg-${col.color}-50/80 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm`}>
                    <h3 className={`font-black text-${col.color}-900 text-sm flex items-center gap-2`}>
                      <div className={`w-2 h-2 rounded-full bg-${col.color}-500`} />
                      {col.title}
                    </h3>
                    <span className={`bg-${col.color}-200/50 text-${col.color}-800 px-2 py-0.5 rounded-md text-[10px] font-black border border-${col.color}-200`}>
                      {items.length}
                    </span>
                  </div>
                  
                  {/* Column Content */}
                  <div className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                    {items.map(c => (
                      <div 
                        key={c.id} 
                        onClick={() => setShowDetail(c)} 
                        className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group hover:-translate-y-0.5"
                      >
                        <div className="flex items-start gap-3 mb-2">
                           <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white bg-gradient-to-br from-${col.color}-500 to-${col.color}-600 flex-shrink-0 shadow-sm shadow-${col.color}-500/20`}>
                             {c.nome?.charAt(0)}
                           </div>
                           <div className="flex-1 min-w-0">
                             <p className="text-sm font-bold text-slate-800 truncate" title={c.nome}>{c.nome}</p>
                             <p className="text-[10px] font-bold text-slate-400 truncate">{c.cargo} • {c.categoria || 'S/Categoria'}</p>
                           </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-50">
                          <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
                            {c.tipoContrato}
                          </span>
                          
                          <div className="flex items-center gap-2">
                            {/* Warnings/Badges */}
                            {c.statusComputado === 'NOVO_COLABORADOR' && (
                              <span className="bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded text-[9px] font-black uppercase shadow-sm">Setup DP</span>
                            )}
                            {c.statusComputado === 'EFETIVADO' && !c.efetivacaoConcluida && (
                              <span className="bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded text-[9px] font-black uppercase shadow-sm">Pendente</span>
                            )}
                            {c.statusComputado === 'EXPERIENCIA_40' && c.statusExperiencia45 !== 'APROVADO' && (
                              <span className="bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded text-[9px] font-black uppercase shadow-sm">Feedback</span>
                            )}
                            {c.statusComputado === 'EXPERIENCIA_90' && c.statusExperiencia90 !== 'APROVADO' && (
                              <span className="bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded text-[9px] font-black uppercase shadow-sm">Feedback</span>
                            )}
                            <span className="text-[10px] font-black text-slate-400">
                              {c.diasNaEmpresa}d
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {items.length === 0 && (
                      <div className="h-20 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-xs font-medium text-slate-400">
                        Nenhum colaborador
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Quick Links */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { label: 'Pipeline Admissão', desc: `${d.admissoesAndamento ?? 0} em andamento`, icon: UserPlus, path: '/admissao', color: 'indigo' },
          { label: 'Segurança do Trabalho', desc: 'EPIs, Treinamentos, NRs', icon: Shield, path: '/seguranca-trabalho', color: 'orange' },
          { label: 'Relatórios RH', desc: 'Análises e exportações', icon: FileText, path: '/relatorios-rh', color: 'blue' },
        ].map((link, i) => (
          <button key={i} onClick={() => navigate(link.path)}
            className={`bg-white p-4 rounded-2xl border border-slate-200 hover:border-${link.color}-400 flex items-center justify-between group transition-all hover:shadow-md`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-${link.color}-50 group-hover:bg-${link.color}-100 flex items-center justify-center transition-colors`}>
                <link.icon className={`w-5 h-5 text-${link.color}-500`} />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-slate-700">{link.label}</p>
                <p className="text-[10px] text-slate-400">{link.desc}</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />
          </button>
        ))}
      </section>

      {/* Detail Drawer */}
      {showDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-end" onClick={() => setShowDetail(null)}>
          <div className="bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white z-10 p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-800">{showDetail.nome}</h2>
                <p className="text-xs text-slate-500">{showDetail.cargo} • {showDetail.departamento}</p>
              </div>
              <button onClick={() => setShowDetail(null)} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status Badge */}
              {(() => {
                const st = STATUS_MAP[showDetail.statusComputado] || STATUS_MAP['EFETIVADO'];
                return (
                  <div className="flex flex-col gap-3">
                    <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border ${st.bg}`}>
                      <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                      <span className={`text-sm font-bold ${st.color}`}>{st.label}</span>
                      <span className="text-xs text-slate-400 ml-auto">{showDetail.diasNaEmpresa} dias na empresa</span>
                    </div>

                    {!showDetail.onboardingConcluido && (
                      <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="text-sm font-black text-rose-800 flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Setup de Integração DP Pendente</p>
                          <p className="text-[10px] text-rose-600 mt-1">E-mails corporativos, acessos aos sistemas e envio do KIT ainda não foram confirmados pelo RH/TI.</p>
                        </div>
                        <button 
                          onClick={() => { setFormOnboarding(showDetail.dadosOnboarding || {}); setShowOnboardingForm(true); }}
                          className="bg-white border border-rose-300 text-rose-700 px-4 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-rose-100 transition-colors whitespace-nowrap"
                        >
                          Iniciar Setup
                        </button>
                      </div>
                    )}
                    {showDetail.onboardingConcluido && (
                      <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center justify-between">
                        <p className="text-xs font-black text-emerald-800 flex items-center gap-1">✅ Onboarding de DP Concluído</p>
                        <button 
                          onClick={() => { setFormOnboarding(showDetail.dadosOnboarding || {}); setShowOnboardingForm(true); }}
                          className="text-xs font-bold text-emerald-700 underline hover:text-emerald-800"
                        >
                          Ver Detalhes
                        </button>
                      </div>
                    )}

                    {showDetail.statusComputado === 'EFETIVADO' && !showDetail.efetivacaoConcluida && (
                      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="text-sm font-black text-amber-800 flex items-center gap-1"><Shield className="w-4 h-4" /> Cadastro de Efetivação Pendente</p>
                          <p className="text-[10px] text-amber-600 mt-1">O colaborador já passou dos 90 dias, mas o checklist final de contrato e sindicato ainda não foi realizado.</p>
                        </div>
                        <button 
                          onClick={() => { setFormEfetivo(showDetail.dadosEfetivacao || {}); setShowEfetivoForm(true); }}
                          className="bg-white border border-amber-300 text-amber-700 px-4 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-amber-100 transition-colors whitespace-nowrap"
                        >
                          Fase 7: Efetivar
                        </button>
                      </div>
                    )}

                    {showDetail.statusComputado === 'EFETIVADO' && showDetail.efetivacaoConcluida && (
                      <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center justify-between">
                        <p className="text-xs font-black text-emerald-800 flex items-center gap-1">✅ Cadastro de Efetivação Concluído</p>
                        <button 
                          onClick={() => { setFormEfetivo(showDetail.dadosEfetivacao || {}); setShowEfetivoForm(true); }}
                          className="text-xs font-bold text-emerald-700 underline hover:text-emerald-800"
                        >
                          Ver Detalhes
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Contact */}
              <div className="grid grid-cols-2 gap-3">
                {showDetail.email && (
                  <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl">
                    <Mail className="w-4 h-4 text-slate-400" /> {showDetail.email}
                  </div>
                )}
                {showDetail.telefone && (
                  <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl">
                    <Phone className="w-4 h-4 text-slate-400" /> {showDetail.telefone}
                  </div>
                )}

                {/* Termination Checklist Alert (Drawer) */}
                {showDetail.statusComputado === 'DESLIGADO' && showDetail.desligamentos?.[0] && !showDetail.desligamentos[0].concluido && (
                  <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-xl overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <XCircle className="w-16 h-16 text-rose-500 -rotate-12" />
                    </div>
                    
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 bg-rose-500/10 rounded-lg flex items-center justify-center">
                          <Clock className="w-4 h-4 text-rose-400" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-white uppercase tracking-wider">Checklist de Desligamento</h4>
                          <p className="text-[10px] text-slate-400 font-bold">Rescisão em processamento</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {[
                          { id: 'emailInativado', label: 'Inativar E-mail / Workspace' },
                          { id: 'sistemasInativados', label: 'Remover dos Sistemas (ERP/TiqueTaque)' },
                          { id: 'cajuCancelado', label: 'Cancelar Cartão Caju (VT/VR)' },
                          { id: 'exameDemissional', label: 'Efetuar Exame Demissional' },
                          { id: 'homologacao', label: 'Homologação e Baixa CTPS' },
                        ].map((item) => (
                          <label key={item.id} className="flex items-center gap-3 cursor-pointer group/item">
                            <div className="relative flex items-center justify-center">
                              <input 
                                type="checkbox" 
                                className="peer appearance-none w-5 h-5 rounded-md border-2 border-slate-700 bg-slate-800 checked:bg-rose-500 checked:border-rose-500 transition-all cursor-pointer"
                                checked={!!showDetail.desligamentos[0].checklistRescisao?.[item.id]}
                                onChange={(e) => handleUpdateChecklistDesligamento(showDetail.desligamentos[0].id, item.id, e.target.checked)}
                              />
                              <CheckCircle2 className="w-3 h-3 text-white absolute opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                            </div>
                            <span className="text-xs font-bold text-slate-300 group-hover/item:text-white transition-colors">
                              {item.label}
                            </span>
                          </label>
                        ))}
                      </div>

                      <div className="mt-5 pt-4 border-t border-slate-800">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Etapa Atual</span>
                          <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 rounded-md text-[9px] font-black uppercase">
                            {showDetail.desligamentos[0].etapa}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Info Grid */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase">Informações</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'CPF', value: showDetail.cpf },
                    { label: 'Matrícula', value: showDetail.matricula },
                    { label: 'Tipo Contrato', value: showDetail.tipoContrato },
                    { label: 'Categoria', value: showDetail.categoria },
                    { label: 'Data Admissão', value: new Date(showDetail.dataAdmissao).toLocaleDateString('pt-BR') },
                    { label: 'CNH', value: showDetail.cnh ? `${showDetail.categoriaCNH} - ${showDetail.cnh}` : '—' },
                  ].map((item, i) => (
                    <div key={i} className="bg-slate-50 p-3 rounded-xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{item.label}</p>
                      <p className="text-sm font-bold text-slate-700 mt-0.5">{item.value || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Benefícios Grid */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase">Benefícios e Regimes</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Alocação', value: showDetail.alocacaoAtividade },
                    { label: 'Regime Refeição', value: showDetail.regimeRefeicao },
                    { label: 'Ticket / V.A.', value: showDetail.valeAlimentacao },
                    { label: 'Prêmio Assiduidade', value: showDetail.premioAssiduidade },
                    { label: 'Seguro de Vida', value: showDetail.seguroVidaAtivo ? 'Ativo' : 'Inativo' },
                    { label: 'Convênio Médico', value: showDetail.convenioMedico },
                  ].map((item, i) => (
                    <div key={i} className="bg-slate-50 p-3 rounded-xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{item.label}</p>
                      <p className="text-sm font-bold text-slate-700 mt-0.5">{item.value || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Counts */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase">Resumo de Documentação</h3>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Integrações', value: showDetail._count?.integracoes ?? 0 },
                    { label: 'ASOs', value: showDetail._count?.asosControle ?? 0 },
                    { label: 'Treinam.', value: showDetail._count?.treinamentos ?? 0 },
                    { label: 'EPIs', value: showDetail._count?.episEntregues ?? 0 },
                  ].map((item, i) => (
                    <div key={i} className="bg-blue-50 p-3 rounded-xl text-center">
                      <p className="text-xl font-black text-blue-700">{item.value}</p>
                      <p className="text-[9px] font-bold text-blue-400 uppercase mt-1">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* CNH Alert */}
              {showDetail.dataVencimentoCNH && (() => {
                const venc = new Date(showDetail.dataVencimentoCNH);
                const diff = Math.floor((venc.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                if (diff <= 30) {
                  return (
                    <div className={`p-3 rounded-xl border ${diff <= 0 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                      <p className={`text-xs font-bold ${diff <= 0 ? 'text-red-700' : 'text-amber-700'}`}>
                        ⚠️ CNH {diff <= 0 ? 'VENCIDA' : `vence em ${diff} dias`} ({venc.toLocaleDateString('pt-BR')})
                      </p>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Actions */}
              <div className="flex flex-col gap-3 pt-4 border-t border-slate-100">
                <div className="flex gap-2">
                  <button onClick={() => navigate('/seguranca-trabalho')} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2">
                    <Shield className="w-4 h-4" /> EPIs & Treinos
                  </button>
                </div>
                
                {/* Feedback Actions */}
                {(showDetail.statusComputado === 'EXPERIENCIA_45' || showDetail.statusComputado === 'EXPERIENCIA_90') && (
                  <div className="flex flex-col gap-2 mt-2">
                    <button
                      onClick={() => handleRequestFeedback(showDetail.id, showDetail.statusComputado === 'EXPERIENCIA_45' ? '45' : '90')}
                      disabled={updatingFeedbackId === showDetail.id}
                      className="w-full bg-amber-100 hover:bg-amber-200 text-amber-800 disabled:opacity-50 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                    >
                      {updatingFeedbackId === showDetail.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Mail className="w-4 h-4" />
                      )}
                      Solicitar Parecer do Gestor {showDetail.statusComputado === 'EXPERIENCIA_45' ? '45d' : '90d'}
                    </button>
                    
                    <button 
                      onClick={() => {
                        const tipo = showDetail.statusComputado === 'EXPERIENCIA_45' ? '45' : '90';
                        setFeedbackTipo(tipo);
                        setFormFeedback((showDetail.anotacoesReferentesExperiencia || {})[tipo] || {});
                        setShowFeedbackForm(true);
                      }}
                      className="w-full bg-slate-800 hover:bg-slate-900 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-md mt-1"
                    >
                      Registrar Fechamento C.C.T ({showDetail.statusComputado === 'EXPERIENCIA_45' ? '45 dias' : '90 dias'})
                    </button>
                  </div>
                )}

                {/* Afastamento Action */}
                {showDetail.statusComputado !== 'DESLIGADO' && showDetail.statusComputado !== 'AFASTADO' && (
                  <button 
                    onClick={() => setShowAfastamentoForm(true)}
                    className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border border-rose-100"
                  >
                    <Clock className="w-4 h-4" /> Registrar Afastamento (Licença/Médico)
                  </button>
                )}

                {/* Termination Action */}
                {showDetail.statusComputado !== 'DESLIGADO' && (
                  <button 
                    onClick={() => setShowDesligamentoForm(true)}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4 text-rose-500" /> Encerrar Contrato / Desligar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DP ONBOARDING FORM MODAL */}
      {showOnboardingForm && showDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-600" />
                  Formulário Interno: Setup do Colaborador
                </h2>
                <p className="text-xs font-bold text-slate-500 mt-1">{showDetail.nome}</p>
              </div>
              <button onClick={() => setShowOnboardingForm(false)} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* DADOS DE CADASTRO E SISTEMAS */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-black text-slate-800 border-b pb-2">📋 Formulário Inicial - Novo Colaborador</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Link da pasta com os documentos pessoais</label>
                    <input className="w-full mt-1 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500" 
                      placeholder="https://drive.google.com/..."
                      value={formOnboarding?.linkPastaDocumentos || ''} 
                      onChange={e => setFormOnboarding({...formOnboarding, linkPastaDocumentos: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Cód eSocial</label>
                    <input className="w-full mt-1 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500" 
                      placeholder="00000000"
                      value={formOnboarding?.codESocial || ''} 
                      onChange={e => setFormOnboarding({...formOnboarding, codESocial: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Acesso ERP / E-mail Corporativo</label>
                    <input className="w-full mt-1 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500" 
                      placeholder="nome@nacionalhidro.com.br"
                      value={formOnboarding?.emailCorporativo || ''} 
                      onChange={e => setFormOnboarding({...formOnboarding, emailCorporativo: e.target.value})} 
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="flex items-center gap-2 mt-2 cursor-pointer p-2 border border-slate-100 rounded-lg bg-slate-50 hover:bg-slate-100">
                      <input type="checkbox" className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                        checked={!!formOnboarding?.grupoWhatsapp}
                        onChange={e => setFormOnboarding({...formOnboarding, grupoWhatsapp: e.target.checked})}
                      />
                      <span className="text-xs font-semibold text-slate-700">Adicionado ao Grupo de WhatsApp da Filial</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* UNIFORMES / KIT */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-black text-slate-800 border-b pb-2">👕 Entrega do Kit Início (Uniformes/EPIs)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center gap-2 cursor-pointer p-2 border border-slate-100 rounded-lg hover:bg-slate-50">
                    <input type="checkbox" className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      checked={!!formOnboarding?.uniformeEntregue}
                      onChange={e => setFormOnboarding({...formOnboarding, uniformeEntregue: e.target.checked})}
                    />
                    <span className="text-xs font-semibold text-slate-700">Uniformes Entregues (Camiseta/Calça)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer p-2 border border-slate-100 rounded-lg hover:bg-slate-50">
                    <input type="checkbox" className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      checked={!!formOnboarding?.botaEntregue}
                      onChange={e => setFormOnboarding({...formOnboarding, botaEntregue: e.target.checked})}
                    />
                    <span className="text-xs font-semibold text-slate-700">Botina / Calçado Entregue</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer p-2 border border-slate-100 rounded-lg hover:bg-slate-50">
                    <input type="checkbox" className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      checked={!!formOnboarding?.epiBasicoEntregue}
                      onChange={e => setFormOnboarding({...formOnboarding, epiBasicoEntregue: e.target.checked})}
                    />
                    <span className="text-xs font-semibold text-slate-700">Kit EPI Básico Entregue (Óculos, Protetor)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer p-2 border border-slate-100 rounded-lg hover:bg-slate-50">
                    <input type="checkbox" className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      checked={!!formOnboarding?.crachaEntregue}
                      onChange={e => setFormOnboarding({...formOnboarding, crachaEntregue: e.target.checked})}
                    />
                    <span className="text-xs font-semibold text-slate-700">Crachá / Identificação Entregues</span>
                  </label>
                </div>
              </div>

              {/* BENEFÍCIOS */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-black text-slate-800 border-b pb-2">💳 Solicitação de Benefícios (VR/VA/Saúde)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center gap-2 cursor-pointer p-2 border border-slate-100 rounded-lg hover:bg-slate-50">
                    <input type="checkbox" className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      checked={!!formOnboarding?.vrSolicitado}
                      onChange={e => setFormOnboarding({...formOnboarding, vrSolicitado: e.target.checked})}
                    />
                    <span className="text-xs font-semibold text-slate-700">Cartão de Alimentação Solicitado</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer p-2 border border-slate-100 rounded-lg hover:bg-slate-50">
                    <input type="checkbox" className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      checked={!!formOnboarding?.vtSolicitado}
                      onChange={e => setFormOnboarding({...formOnboarding, vtSolicitado: e.target.checked})}
                    />
                    <span className="text-xs font-semibold text-slate-700">Vale Transporte / Bilhete Único Mapeado</span>
                  </label>
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Anotações Adicionais do RH</label>
                    <textarea 
                      className="w-full mt-1 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500" 
                      rows={2} placeholder="Ex: Atraso no fornecedor do crachá plano odontológico."
                      value={formOnboarding?.anotacoesManuais || ''} 
                      onChange={e => setFormOnboarding({...formOnboarding, anotacoesManuais: e.target.value})}
                    />
                  </div>
                </div>
              </div>

            </div>
            
            <div className="p-5 border-t border-slate-100 bg-white flex justify-end gap-3">
              <button onClick={() => handleSaveOnboarding(false)} className="px-6 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors">
                Salvar Progresso (Sem Concluir)
              </button>
              <button onClick={() => handleSaveOnboarding(true)} className="px-8 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-500/30 hover:bg-indigo-700 active:scale-95 transition-all">
                Finalizar 100% Setup de TI/DP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FEEDBACK CCT FORM MODAL */}
      {showFeedbackForm && showDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 bg-amber-50 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-amber-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Fechamento C.C.T
                </h2>
                <p className="text-xs font-bold text-amber-700/80 mt-1">Registrar decisão do período de experiência de {feedbackTipo} dias</p>
              </div>
              <button onClick={() => setShowFeedbackForm(false)} className="p-2 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors">
                <X className="w-4 h-4 text-amber-700" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 bg-amber-50/10">
              <div>
                <label className="text-xs font-black text-slate-800 uppercase">Qual a sua recomendação?</label>
                <div className="mt-3 flex flex-col gap-3">
                  <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                    <input type="radio" name="recomendacao" value="APROVADO" className="w-4 h-4 text-emerald-600 focus:ring-emerald-600 border-slate-300" 
                      checked={formFeedback?.recomendacao === 'APROVADO'}
                      onChange={e => setFormFeedback({...formFeedback, recomendacao: e.target.value})}
                    />
                    <div>
                      <span className="text-sm font-bold text-slate-700 block">Aprovar Continuidade / Efetivação</span>
                      <span className="text-[10px] text-slate-500 font-medium">O colaborador continuará na equipe</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-rose-400 focus-within:ring-2 focus-within:ring-rose-500/20 transition-all">
                    <input type="radio" name="recomendacao" value="REPROVADO" className="w-4 h-4 text-rose-600 focus:ring-rose-600 border-slate-300" 
                      checked={formFeedback?.recomendacao === 'REPROVADO'}
                      onChange={e => setFormFeedback({...formFeedback, recomendacao: e.target.value})}
                    />
                    <div>
                      <span className="text-sm font-bold text-slate-700 block">Solicitar Desligamento (Imediato)</span>
                      <span className="text-[10px] text-slate-500 font-medium">O RH enviará para o processo de Rescisão</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-amber-400 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all">
                    <input type="radio" name="recomendacao" value="PEDIDO_DEMISSAO" className="w-4 h-4 text-amber-600 focus:ring-amber-600 border-slate-300" 
                      checked={formFeedback?.recomendacao === 'PEDIDO_DEMISSAO'}
                      onChange={e => setFormFeedback({...formFeedback, recomendacao: e.target.value})}
                    />
                    <div>
                      <span className="text-sm font-bold text-slate-700 block">Desligamento por Comum Acordo / Demissão</span>
                      <span className="text-[10px] text-slate-500 font-medium">Acordo firmado ou demissão voluntária do colaborador</span>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-800 uppercase">Anotações do Feedback</label>
                <p className="text-[10px] text-slate-500 mt-1 mb-2">Descreva de forma pontual o que foi conversado.</p>
                <textarea 
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-white" 
                  rows={4} placeholder="O colaborador desempenhou bem as atividades, mas teve pontos de atenção em..."
                  value={formFeedback?.anotacaoGeral || ''} 
                  onChange={e => setFormFeedback({...formFeedback, anotacaoGeral: e.target.value})}
                />
              </div>

            </div>
            
            <div className="p-5 border-t border-slate-100 bg-white flex justify-end gap-3">
              <button onClick={() => setShowFeedbackForm(false)} className="px-6 py-2.5 text-slate-500 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors">
                Cancelar
              </button>
              <button 
                onClick={handleSaveFeedback} 
                className="px-8 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95 flex items-center gap-2"
              >
                <Shield className="w-4 h-4" /> Registrar Decisão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EFETIVO CHECKLIST FORM MODAL */}
      {showEfetivoForm && showDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-emerald-600" />
                  Checklist Final: Efetivação (Fase 7)
                </h2>
                <p className="text-xs font-bold text-slate-500 mt-1">{showDetail.nome}</p>
              </div>
              <button onClick={() => setShowEfetivoForm(false)} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-5">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase">Armário de Vestiário (Nº)</label>
                  <input type="text" className="w-full mt-2 border border-slate-200 rounded-xl p-3 text-sm outline-none font-medium text-slate-700 focus:border-emerald-500"
                    placeholder="Ex: Armário 42"
                    value={formEfetivo?.armarioVestiario || ''}
                    onChange={e => setFormEfetivo({...formEfetivo, armarioVestiario: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase">Equipamentos Administrativos</label>
                  <input type="text" className="w-full mt-2 border border-slate-200 rounded-xl p-3 text-sm outline-none font-medium text-slate-700 focus:border-emerald-500"
                    placeholder="Ex: Notebook, Celular"
                    value={formEfetivo?.equipamentosAdministrativos || ''}
                    onChange={e => setFormEfetivo({...formEfetivo, equipamentosAdministrativos: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-5">
                <label className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors border border-slate-100">
                  <input type="checkbox" className="w-5 h-5 mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                    checked={!!formEfetivo?.seguroVidaAtivo}
                    onChange={e => setFormEfetivo({...formEfetivo, seguroVidaAtivo: e.target.checked})}
                  />
                  <div>
                    <span className="text-sm font-black text-slate-800 block leading-tight">Seguro de Vida Ativo</span>
                    <span className="text-[10px] text-slate-500 font-bold block mt-1 uppercase">Adesão confirmada</span>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors border border-slate-100">
                  <input type="checkbox" className="w-5 h-5 mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                    checked={!!formEfetivo?.convenioMedico}
                    onChange={e => setFormEfetivo({...formEfetivo, convenioMedico: e.target.checked})}
                  />
                  <div>
                    <span className="text-sm font-black text-slate-800 block leading-tight">Convênio Médico/Odonto</span>
                    <span className="text-[10px] text-slate-500 font-bold block mt-1 uppercase">Benefício ativo</span>
                  </div>
                </label>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Demais Lembretes / Observações</label>
                <textarea 
                  className="w-full mt-2 border border-slate-200 rounded-2xl p-4 text-sm outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all bg-white" 
                  rows={2} placeholder="Ex: Pendente assinatura de aditivo..."
                  value={formEfetivo?.observacoes || ''} 
                  onChange={e => setFormEfetivo({...formEfetivo, observacoes: e.target.value})}
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
              <button 
                onClick={handleSaveEfetivo} 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black shadow-lg shadow-emerald-600/20 py-3.5 transition-all active:scale-[0.98]"
              >
                Concluir Cadastro de Efetivação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AFASTAMENTO FORM MODAL */}
      {showAfastamentoForm && showDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 bg-rose-50 flex items-center justify-between text-rose-900">
              <div>
                <h2 className="text-lg font-black flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Registrar Afastamento
                </h2>
                <p className="text-xs font-bold opacity-70 mt-1">{showDetail.nome}</p>
              </div>
              <button onClick={() => setShowAfastamentoForm(false)} className="p-2 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors">
                <X className="w-4 h-4 text-rose-700" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Tipo de Afastamento</label>
                  <select className="w-full mt-2 border border-slate-200 rounded-xl p-3 text-sm outline-none font-bold text-slate-700 cursor-pointer"
                    value={formAfastamento.tipo}
                    onChange={e => setFormAfastamento({...formAfastamento, tipo: e.target.value})}
                  >
                    <option value="ATESTADO">Atestado Médico</option>
                    <option value="INSS">Afastamento INSS (Doença)</option>
                    <option value="ACIDENTE">Afastamento Acidente Trabalho</option>
                    <option value="LICENCA">Licença Maternidade/Paternidade</option>
                    <option value="SUSPENSAO">Suspensão Disciplinar</option>
                    <option value="OUTROS">Outros</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase">Data Início</label>
                  <input type="date" className="w-full mt-2 border border-slate-200 rounded-xl p-3 text-sm outline-none font-bold text-slate-700"
                    value={formAfastamento.dataInicio}
                    onChange={e => setFormAfastamento({...formAfastamento, dataInicio: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase">Data Retorno (Prevista)</label>
                  <input type="date" className="w-full mt-2 border border-slate-200 rounded-xl p-3 text-sm outline-none font-bold text-slate-700"
                    value={formAfastamento.dataFim}
                    onChange={e => setFormAfastamento({...formAfastamento, dataFim: e.target.value})}
                  />
                </div>
                
                {formAfastamento.tipo === 'INSS' && (
                  <div className="col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase text-rose-600">Previsão Retorno Perícia INSS</label>
                    <input type="date" className="w-full mt-2 border border-rose-200 rounded-xl p-3 text-sm outline-none font-bold text-rose-700 bg-rose-50/50"
                      value={formAfastamento.previsaoRetornoINSS || ''}
                      onChange={e => setFormAfastamento({...formAfastamento, previsaoRetornoINSS: e.target.value})}
                    />
                  </div>
                )}

                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Motivo / Anotações</label>
                  <textarea 
                    className="w-full mt-2 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-rose-500 bg-white" 
                    rows={3} placeholder="Descreva brevemente o motivo..."
                    value={formAfastamento.motivo || ''} 
                    onChange={e => setFormAfastamento({...formAfastamento, motivo: e.target.value})}
                  />
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3">
              <button onClick={() => setShowAfastamentoForm(false)} className="px-6 py-2.5 text-slate-500 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors">
                Cancelar
              </button>
              <button 
                onClick={handleSaveAfastamento} 
                className="px-8 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-lg shadow-rose-600/20 transition-all active:scale-95 flex items-center gap-2"
              >
                Confirmar Afastamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DESLIGAMENTO FORM MODAL */}
      {showDesligamentoForm && showDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 bg-slate-900 flex items-center justify-between text-white">
              <div>
                <h2 className="text-lg font-black flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-rose-500" />
                  Iniciar Processo de Desligamento
                </h2>
                <p className="text-xs font-bold opacity-70 mt-1">{showDetail.nome}</p>
              </div>
              <button onClick={() => setShowDesligamentoForm(false)} className="p-2 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">Tipo de Desligamento</label>
                <select className="w-full mt-2 border border-slate-200 rounded-xl p-3 text-sm outline-none font-bold text-slate-700 cursor-pointer"
                  value={formDesligamento.tipoDesligamento}
                  onChange={e => setFormDesligamento({...formDesligamento, tipoDesligamento: e.target.value})}
                >
                  <option value="DISPENSA_SEM_JUSTA_CAUSA">Dispensa sem Justa Causa</option>
                  <option value="DISPENSA_COM_JUSTA_CAUSA">Dispensa por Justa Causa</option>
                  <option value="PEDIDO_DEMISSAO">Pedido de Demissão</option>
                  <option value="ACORDO">Acordo entre as Partes</option>
                  <option value="REPROVADO_EXPERIENCIA">Reprovado na Experiência</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">Data de Saída / Último Dia</label>
                <input type="date" className="w-full mt-2 border border-slate-200 rounded-xl p-3 text-sm outline-none font-bold text-slate-700"
                  value={formDesligamento.dataDesligamento}
                  onChange={e => setFormDesligamento({...formDesligamento, dataDesligamento: e.target.value})}
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">Motivo / Detalhes</label>
                <textarea 
                  className="w-full mt-2 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-rose-500 bg-white" 
                  rows={3} placeholder="Descreva brevemente o motivo do desligamento..."
                  value={formDesligamento.motivoDesligamento || ''} 
                  onChange={e => setFormDesligamento({...formDesligamento, motivoDesligamento: e.target.value})}
                />
              </div>

              <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100">
                <p className="text-[10px] font-black text-rose-800 uppercase flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3" /> Atenção
                </p>
                <p className="text-[10px] text-rose-700 font-bold mt-1">
                  Ao confirmar, o status do colaborador mudará para DESLIGADO imediatamente e o checklist de encerramento será habilitado no painel.
                </p>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3">
              <button onClick={() => setShowDesligamentoForm(false)} className="px-6 py-2.5 text-slate-500 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors">
                Cancelar
              </button>
              <button 
                onClick={handleSaveDesligamento} 
                disabled={isSubmittingDesligamento}
                className="px-8 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-lg shadow-rose-600/20 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmittingDesligamento ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Confirmar Desligamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
