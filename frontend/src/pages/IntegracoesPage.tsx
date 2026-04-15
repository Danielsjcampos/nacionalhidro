import { useEffect, useState } from 'react';
import api from '../services/api';
import { 
  Users, Search, Filter, AlertTriangle, CheckCircle, Clock, 
  ExternalLink, Loader2, RefreshCw, FileText, ChevronRight, ShieldCheck
} from 'lucide-react';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  VALIDO:  { label: 'Válido',    color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  VENCIDO: { label: 'Vencido',   color: 'text-red-700',     bg: 'bg-red-50 border-red-200' },
  PENDENTE: { label: 'Pendente',  color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200' },
};

export default function IntegracoesPage() {
  const [integracoes, setIntegracoes] = useState<any[]>([]);
  const [pendencias, setPendencias] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCliente, setFilterCliente] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'geral' | 'pendencias'>('geral');

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
  
  const getValidityColor = (vencimento: string) => {
    const dataVenc = new Date(vencimento);
    const hoje = new Date();
    const trintaDias = new Date();
    trintaDias.setDate(hoje.getDate() + 30);

    if (dataVenc < hoje) return 'text-red-600 font-bold';
    if (dataVenc < trintaDias) return 'text-amber-600 font-bold';
    return 'text-emerald-600';
  };

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
                            <p className={`text-xs ${getValidityColor(item.dataVencimento)}`}>
                              {new Date(item.dataVencimento).toLocaleDateString('pt-BR')}
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
      ) : (
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
                        <button className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-indigo-700 transition-colors">
                          Regularizar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
