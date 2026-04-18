import { useToast } from '../contexts/ToastContext';
import { useEffect, useState } from 'react';
import api from '../services/api';
import { 
  Users, Search, Filter, AlertTriangle, CheckCircle, 
  ExternalLink, Loader2, RefreshCw, FileText, ChevronRight, ShieldCheck,
  Settings, Calendar, Trash2, X, UploadCloud, XCircle
} from 'lucide-react';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  VALIDO:   { label: 'Válido',    color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  VENCIDO:  { label: 'Vencido',   color: 'text-red-700',     bg: 'bg-red-50 border-red-200' },
  PENDENTE: { label: 'Pendente',  color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200' },
  AGENDADO: { label: 'Agendado',  color: 'text-indigo-700',  bg: 'bg-indigo-50 border-indigo-200' },
  EM_ANALISE: { label: 'Em Análise', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
};

const CATEGORIES = ['Ajudante', 'Motorista', 'Motorista Operador', 'Jatista', 'Auxiliar', 'Líder', 'Operador de Vácuo', 'Mecânico'];

export default function IntegracoesPage() {
    const { showToast } = useToast();
  const [integracoes, setIntegracoes] = useState<any[]>([]);
  const [pendencias, setPendencias] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCliente, setFilterCliente] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'geral' | 'pendencias' | 'homologacao' | 'conferencia'>('geral');
  const [showConfig, setShowConfig] = useState<any>(null); // { id, nome, integracoesExigidas, categoriasExigidas, prazoIntegracao }
  const [savingConfig, setSavingConfig] = useState(false);
  const [uploadModalItem, setUploadModalItem] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [intRes, cliRes, pendRes] = await Promise.all([
        api.get('/integracoes/dashboard', { 
          params: { clienteId: filterCliente, status: filterStatus, busca: search } 
        }),
        api.get('/clientes'),
        api.get('/integracoes/pendencias')
      ]);
      setIntegracoes(intRes.data);
      setClientes(cliRes.data);
      setPendencias(pendRes.data);
    } catch (err) {
      console.error('Erro ao buscar dados das integrações:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterCliente, filterStatus]);

  useEffect(() => {
    const timer = setTimeout(fetchData, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // KPIs
  const total = integracoes.length;
  const vencidas = integracoes.filter(i => i.status === 'VENCIDO' || new Date(i.dataVencimento) < new Date()).length;
  const countPendencias = pendencias.length;
  
  const getValidityColor = (vencimento: string, status?: string) => {
    if (status === 'AGENDADO') return 'text-indigo-600 italic font-medium';
    const dataVenc = new Date(vencimento);
    const hoje = new Date();
    const trintaDias = new Date();
    trintaDias.setDate(hoje.getDate() + 30);

    if (dataVenc < hoje) return 'text-red-600 font-bold';
    if (dataVenc < trintaDias) return 'text-amber-600 font-bold';
    return 'text-emerald-600';
  };

  const handleAgendar = async (pend: any) => {
    try {
      if (!window.confirm(`Deseja agendar a integração de ${pend.funcionarioNome} para ${pend.clienteNome}?`)) return;
      
      await api.post('/integracoes', {
        funcionarioId: pend.funcionarioId,
        clienteId: pend.clienteId,
        nome: pend.documentoFaltante,
        dataEmissao: new Date(),
        status: 'AGENDADO',
        observacoes: `Agendado via Painel de Pendências em ${new Date().toLocaleDateString('pt-BR')}`
      });
      
      fetchData();
    } catch (err) {
      console.error('Erro ao agendar integração:', err);
      showToast('Erro ao agendar integração');
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fileInput = document.getElementById('cert-upload') as HTMLInputElement;
    const file = fileInput?.files?.[0];
    if (!file) {
       showToast('Selecione um arquivo de certificado primeiro', 'error');
       return;
    }
    try {
       setUploading(true);
       const formData = new FormData();
       formData.append('file', file);
       const resUpload = await api.post('/upload', formData);
       const arquivoUrl = resUpload.data.url;

       await api.post(`/integracoes/${uploadModalItem.id}/confirmar`, { arquivoUrl });
       showToast('Certificado anexado e enviado para conferência!', 'success');
       setUploadModalItem(null);
       fetchData();
    } catch(err) {
       console.error(err);
       showToast('Erro ao anexar arquivo', 'error');
    } finally {
       setUploading(false);
    }
  };

  const handleAnaliseRH = async (id: string, isValid: boolean) => {
    try {
      if (isValid) {
        await api.put(`/integracoes/${id}`, { status: 'VALIDO' });
        showToast('Integração validada e oficializada com sucesso', 'success');
      } else {
        await api.delete(`/integracoes/${id}`);
        showToast('Documento recusado. A pendência retornou para a Logística.', 'info');
      }
      setSelectedItems(prev => prev.filter(i => i !== id));
      fetchData();
    } catch(err) {
      showToast('Erro ao validar documento', 'error');
    }
  };

  const handleBatchAnalise = async (isValid: boolean) => {
    if (selectedItems.length === 0) return;
    if (!window.confirm(`Deseja ${isValid ? 'APROVAR' : 'RECUSAR'} ${selectedItems.length} documentos em lote?`)) return;

    try {
      setUploading(true);
      await Promise.all(selectedItems.map(async (id) => {
        if (isValid) {
          await api.put(`/integracoes/${id}`, { status: 'VALIDO' });
        } else {
          await api.delete(`/integracoes/${id}`);
        }
      }));
      showToast(`${selectedItems.length} documentos processados com sucesso`, 'success');
      setSelectedItems([]);
      fetchData();
    } catch (err) {
      showToast('Erro ao processar lote', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      setSavingConfig(true);
      await api.put(`/integracoes/cliente/${showConfig.id}/opcoes`, {
        integracoesExigidas: showConfig.integracoesExigidas,
        categoriasExigidas: showConfig.categoriasExigidas,
        prazoIntegracao: showConfig.prazoIntegracao
      });
      setShowConfig(null);
      fetchData();
    } catch (err) {
      console.error('Erro ao salvar configuração:', err);
      showToast('Erro ao salvar configuração');
    } finally {
      setSavingConfig(false);
    }
  };

  const homologacoes = integracoes.filter(i => i.status === 'AGENDADO');
  const emAnalise = integracoes.filter(i => i.status === 'EM_ANALISE');

  return (
    <div className="h-full flex flex-col space-y-6 overflow-y-auto bg-slate-50 p-6 rounded-3xl">
      {/* Header */}
      <header className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Painel de Integrações</h1>
            <p className="text-sm font-medium text-slate-500">Gestão de conformidade e validade de documentos por cliente</p>
          </div>
        </div>
        <button 
          onClick={fetchData} 
          className="p-2 border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 rounded-xl transition-all"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total de Integrações', value: total, icon: FileText, color: 'blue' },
          { label: 'Vencidas / Alertas', value: vencidas, icon: AlertTriangle, color: 'red' },
          { label: 'Pendências de Conformidade', value: countPendencias, icon: Users, color: 'purple' },
        ].map((card, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-6">
            <div className={`w-14 h-14 rounded-2xl bg-${card.color === 'purple' ? 'indigo' : card.color}-50 flex items-center justify-center`}>
              <card.icon className={`w-7 h-7 text-${card.color === 'purple' ? 'indigo' : card.color}-600`} />
            </div>
            <div>
              <p className="text-3xl font-black text-slate-800 leading-none">{card.value}</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 text-balance leading-tight">{card.label}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-200/50 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveTab('geral')}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'geral' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Painel Geral
        </button>
        <button 
          onClick={() => setActiveTab('pendencias')}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'pendencias' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Pendências de Documentação
          {countPendencias > 0 && <span className="bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">{countPendencias}</span>}
        </button>
        <button 
          onClick={() => setActiveTab('homologacao')}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'homologacao' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Homologação Logística
          {homologacoes.length > 0 && <span className="bg-indigo-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">{homologacoes.length}</span>}
        </button>
        <button 
          onClick={() => setActiveTab('conferencia')}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'conferencia' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Conferência (RH)
          {emAnalise.length > 0 && <span className="bg-orange-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">{emAnalise.length}</span>}
        </button>
      </div>

      {activeTab === 'geral' ? (
        <>
          {/* Filters Bar */}
          <section className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text" 
                placeholder="Buscar por funcionário..."
                value={search} 
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 bg-white"
              />
            </div>
            
            <div className="flex items-center gap-3">
              <Filter className="w-4 h-4 text-slate-400" />
              <select 
                value={filterCliente} 
                onChange={e => setFilterCliente(e.target.value)}
                className="border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-600 outline-none focus:border-indigo-500 bg-white"
              >
                <option value="">Todos os Clientes</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
              
              {filterCliente && (
                <button 
                  onClick={() => {
                    const cli = clientes.find(c => c.id === filterCliente);
                    setShowConfig({
                      id: cli.id,
                      nome: cli.nome,
                      integracoesExigidas: cli.integracoesExigidas || [],
                      categoriasExigidas: cli.categoriasExigidas || [],
                      prazoIntegracao: cli.prazoIntegracao || 365
                    });
                  }}
                  className="p-3 bg-white border border-slate-200 rounded-xl text-indigo-600 hover:bg-slate-50 transition-all flex items-center gap-2 font-bold text-sm shadow-sm"
                >
                  <Settings className="w-4 h-4" />
                  Configurar Regras
                </button>
              )}
              
              <select 
                value={filterStatus} 
                onChange={e => setFilterStatus(e.target.value)}
                className="border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-600 outline-none focus:border-indigo-500 bg-white"
              >
                <option value="">Todos os Status</option>
                <option value="VALIDO">Válido</option>
                <option value="VENCIDO">Vencido</option>
                <option value="PENDENTE">Pendente</option>
              </select>
            </div>
          </section>

          {/* Main List */}
          <section className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden min-h-[400px]">
            {loading ? (
              <div className="flex-1 flex items-center justify-center p-20">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
              </div>
            ) : integracoes.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-20 text-slate-400">
                <FileText className="w-12 h-12 mb-4 opacity-20" />
                <p className="font-bold uppercase tracking-widest text-xs">Nenhuma integração encontrada</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Funcionário / Cargo</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Data Emissão</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Vencimento</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {integracoes.map((item) => {
                      const st = STATUS_MAP[item.status] || STATUS_MAP['PENDENTE'];
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 font-mono">
                                {item.funcionario?.nome?.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-800">{item.funcionario?.nome}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">{item.funcionario?.cargo || 'S/ Cargo'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-indigo-400" />
                              <p className="text-xs font-bold text-slate-600 truncate max-w-[200px]" title={item.cliente?.nome}>
                                {item.cliente?.nome}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <p className="text-xs text-slate-500">
                              {new Date(item.dataEmissao).toLocaleDateString('pt-BR')}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <p className={`text-xs ${getValidityColor(item.dataVencimento, item.status)}`}>
                              {item.status === 'AGENDADO' ? 'Aguardando Presença' : new Date(item.dataVencimento).toLocaleDateString('pt-BR')}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase border ${st.bg} ${st.color}`}>
                              {st.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {item.arquivoUrl && (
                                <a 
                                  href={item.arquivoUrl} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                  title="Ver Documento"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              )}
                              <button 
                                className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
                                title="Ver Cadastro Completo"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : activeTab === 'pendencias' ? (
        /* Pendencias View */
        <section className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden min-h-[400px]">
          <div className="bg-indigo-50/50 p-6 border-b border-indigo-100">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="text-sm font-black text-indigo-900 uppercase tracking-tighter leading-none">Falhas de Conformidade</h3>
                <p className="text-xs text-indigo-600 mt-1">Funcionários em funções obrigatórias que ainda não possuem as integrações exigidas por seus clientes.</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {pendencias.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-20 text-slate-400">
                <CheckCircle className="w-12 h-12 mb-4 text-emerald-500 opacity-50" />
                <p className="font-bold uppercase tracking-widest text-xs text-emerald-700">Tudo em dia! Nenhuma pendência encontrada.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Funcionário / Função RH</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente Sugerido</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Documento Faltante</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Motivo da Exigência</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {pendencias.map((pend, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                         <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 font-mono">
                            {pend.funcionarioNome?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{pend.funcionarioNome}</p>
                            <span className="text-[10px] font-black bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase tracking-widest">{pend.funcionarioCategoria}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-black text-slate-700">{pend.clienteNome}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-bold px-2 py-1 rounded-lg ${pend.documentoFaltante.includes('ASO') ? 'bg-red-600 text-white animate-pulse' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                          {pend.documentoFaltante}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-[10px] text-slate-400 font-medium italic">{pend.motivo}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleAgendar(pend)}
                          className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 flex items-center gap-2 mx-auto"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          Agendar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      ) : activeTab === 'homologacao' ? (
        /* Homologação Logística View */
        <section className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden min-h-[400px]">
          <div className="bg-emerald-50/50 p-6 border-b border-emerald-100 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="text-sm font-black text-emerald-900 uppercase tracking-tighter leading-none">Validação de Presença</h3>
                <p className="text-xs text-emerald-600 mt-1">Confirme o comparecimento dos funcionários às integrações agendadas.</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {homologacoes.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-20 text-slate-400">
                <CheckCircle className="w-12 h-12 mb-4 text-emerald-500 opacity-20" />
                <p className="font-bold uppercase tracking-widest text-xs">Nenhum agendamento pendente</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Funcionário / Cargo</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Documento</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Agendado em</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {homologacoes.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 font-mono">
                            {item.funcionario?.nome?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{item.funcionario?.nome}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{item.funcionario?.cargo}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-bold text-slate-700">{item.cliente?.nome}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {item.nome}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-slate-500">
                          {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => setUploadModalItem(item)}
                            className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100 flex items-center gap-2"
                          >
                            <UploadCloud className="w-3 h-3" />
                            Anexar e Confirmar
                          </button>
                          <button 
                            onClick={async () => {
                              if (window.confirm('Excluir este agendamento?')) {
                                await api.delete(`/integracoes/${item.id}`);
                                fetchData();
                              }
                            }}
                            className="p-2 text-red-400 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all"
                            title="Remover Agendamento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      ) : activeTab === 'conferencia' ? (
        /* Conferência RH View */
        <section className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden min-h-[400px]">
          <div className="bg-orange-50/50 p-6 border-b border-orange-100 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-orange-600" />
              <div>
                <h3 className="text-sm font-black text-orange-900 uppercase tracking-tighter leading-none">Dupla Validação (RH)</h3>
                <p className="text-xs text-orange-600 mt-1">Verifique o certificado anexado pela Logística e valide a integração.</p>
              </div>
            </div>
            {selectedItems.length > 0 && (
              <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-4">
                 <span className="text-[10px] font-black uppercase text-orange-700 bg-orange-100 px-3 py-1 rounded-full">{selectedItems.length} selecionados</span>
                 <button 
                  onClick={() => handleBatchAnalise(true)}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-md shadow-emerald-100"
                 >
                   <CheckCircle className="w-3 h-3" /> Aprovar Lote
                 </button>
                 <button 
                  onClick={() => handleBatchAnalise(false)}
                  className="bg-red-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all flex items-center gap-2 shadow-md shadow-red-100"
                 >
                   <XCircle className="w-3 h-3" /> Recusar Lote
                 </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            {emAnalise.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-20 text-slate-400">
                <CheckCircle className="w-12 h-12 mb-4 text-orange-500 opacity-20" />
                <p className="font-bold uppercase tracking-widest text-xs">Nenhum documento aguardando revisão</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 w-10">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                        checked={selectedItems.length === emAnalise.length && emAnalise.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedItems(emAnalise.map(i => i.id));
                          else setSelectedItems([]);
                        }}
                      />
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Funcionário / Cargo</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Documento</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Anexo</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {emAnalise.map((item) => (
                    <tr key={item.id} className={`hover:bg-slate-50/50 transition-colors ${selectedItems.includes(item.id) ? 'bg-orange-50/30' : ''}`}>
                      <td className="px-6 py-4">
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                          checked={selectedItems.includes(item.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedItems(prev => [...prev, item.id]);
                            else setSelectedItems(prev => prev.filter(i => i !== item.id));
                          }}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 font-mono">
                            {item.funcionario?.nome?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{item.funcionario?.nome}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{item.funcionario?.cargo}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-bold text-slate-700">{item.cliente?.nome}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold px-2 py-1 rounded-lg bg-orange-50 text-orange-700 border border-orange-100">
                          {item.nome}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                         {item.arquivoUrl ? (
                           <a href={item.arquivoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors w-fit">
                              <ExternalLink className="w-3.5 h-3.5" />
                              Ver Certificado
                           </a>
                         ) : (
                           <span className="text-xs text-slate-400 italic">Sem Anexo</span>
                         )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={async () => {
                              if (window.confirm('Aprovar e oficializar essa integração?')) {
                                handleAnaliseRH(item.id, true);
                              }
                            }}
                            className="bg-emerald-600 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-1.5"
                          >
                            <CheckCircle className="w-3 h-3" />
                            Aprovar
                          </button>
                          <button 
                            onClick={async () => {
                              if (window.confirm('Recusar o documento e retornar para a Logística?')) {
                                handleAnaliseRH(item.id, false);
                              }
                            }}
                            className="bg-red-50 text-red-600 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-all flex items-center gap-1.5"
                          >
                            <XCircle className="w-3 h-3" />
                            Recusar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      ) : null}

      {/* Upload Modal (Logística) */}
      {uploadModalItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
               <div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">Anexar Certificado</h3>
                  <p className="text-xs text-slate-500 font-medium">Validando presença de {uploadModalItem.funcionario?.nome}</p>
               </div>
               <button onClick={() => setUploadModalItem(null)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl">
                 <X className="w-5 h-5" />
               </button>
             </div>
             <form onSubmit={handleUploadSubmit} className="p-6 space-y-6">
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:bg-slate-50 transition-colors">
                  <UploadCloud className="w-10 h-10 text-indigo-500 mx-auto mb-4" />
                  <label className="cursor-pointer">
                    <span className="bg-white border border-indigo-200 text-indigo-600 px-4 py-2 rounded-xl text-sm font-bold shadow-sm">Selecionar Arquivo (PDF/Imagem)</span>
                    <input type="file" id="cert-upload" className="hidden" accept=".pdf,image/*" required />
                  </label>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-4">Comprove a realização do curso</p>
                </div>
                <button type="submit" disabled={uploading} className="w-full bg-indigo-600 text-white rounded-xl py-3 text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                   {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                   Encaminhar para RH
                </button>
             </form>
          </div>
        </div>
      )}

      {/* Config Modal */}
      {showConfig && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <Settings className="w-6 h-6 text-indigo-600" />
                <div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight line-height-none">Regras: {showConfig.nome}</h3>
                  <p className="text-xs text-slate-500 font-medium">Configure as exigências documentais para este cliente</p>
                </div>
              </div>
              <button 
                onClick={() => setShowConfig(null)}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh]">
              {/* Prazo */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Validade Padrão da Integração (Dias)</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="number"
                    value={showConfig.prazoIntegracao}
                    onChange={e => setShowConfig({...showConfig, prazoIntegracao: parseInt(e.target.value)})}
                    className="w-32 px-4 py-3 border border-slate-200 rounded-2xl text-sm font-black text-slate-700 outline-none focus:border-indigo-500"
                  />
                  <p className="text-xs text-slate-400 font-medium">Ex: 365 para um ano, 90 para três meses.</p>
                </div>
              </div>

              {/* Categorias Exigidas */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Categorias Profissionais Obrigatórias</label>
                <div className="grid grid-cols-2 gap-3">
                  {CATEGORIES.map(cat => {
                    const isSelected = showConfig.categoriasExigidas.includes(cat);
                    return (
                      <button
                        key={cat}
                        onClick={() => {
                          const newCats = isSelected 
                            ? showConfig.categoriasExigidas.filter((c: string) => c !== cat)
                            : [...showConfig.categoriasExigidas, cat];
                          setShowConfig({...showConfig, categoriasExigidas: newCats});
                        }}
                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isSelected ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700' : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-300'}`}
                      >
                        <span className="text-xs font-bold">{cat}</span>
                        {isSelected && <CheckCircle className="w-4 h-4" />}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-400 text-center font-medium italic">Se nenhuma categoria for selecionada, o sistema não calculará pendências automáticas.</p>
              </div>

              {/* Documentos Exigidos */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Documentos / Treinamentos Exigidos</label>
                <div className="flex flex-wrap gap-2">
                  {showConfig.integracoesExigidas.map((item: string, i: number) => (
                    <span key={i} className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-2">
                       {item}
                       <button onClick={() => setShowConfig({...showConfig, integracoesExigidas: showConfig.integracoesExigidas.filter((_: any, idx: number) => idx !== i)})}>
                         <X className="w-3 h-3 hover:text-red-500" />
                       </button>
                    </span>
                  ))}
                  <button 
                    onClick={() => {
                      const item = window.prompt('Qual o nome da integração/documento exigido? (ex: Integração Geral, NR-35, Trabalho em Altura)');
                      if (item) setShowConfig({...showConfig, integracoesExigidas: [...showConfig.integracoesExigidas, item]});
                    }}
                    className="px-3 py-1.5 border border-dashed border-indigo-300 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-50"
                  >
                    + Adicionar Exigência
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setShowConfig(null)}
                className="px-6 py-3 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button 
                disabled={savingConfig}
                onClick={handleSaveConfig}
                className="px-8 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Salvar Configurações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
