import { useEffect, useState } from 'react';
import api from '../services/api';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import {
  TrendingUp, Users, FileText,
  PieChart as PieIcon, Loader2, AlertTriangle, Hammer, DollarSign, Activity,
  Truck, Package, Server, ArrowUpRight, ArrowDownRight, Briefcase
} from 'lucide-react';

// --- Types ---
interface DashboardData {
  summary: {
    faturamento: number;
    lucroLiquido: number;
    clientesAtivos: number;
    novosClientes: number;
  };
  propostas: {
    total: number;
    aceitas: number;
    pendentes: number;
    recusadas: number;
    valorTotal: number;
  };
  operacional: {
    osTotal: number;
    osEmAndamento: number;
    osFinalizadas: number;
    frotaManutencao: number;
    estoqueBaixo: number;
    totalProdutos: number;
  };
  rh: {
    total: number;
    aptos: number;
    emContratacao: number;
    atestados: number;
    afastados: number;
  };
  apiHealth: {
    uptime: number;
    memory: any;
    status: string;
  };
  chartData: any[];
}

interface TetoFiscalItem {
  id: string;
  nome: string;
  cnpj: string;
  limiteMensal: number;
  faturamentoMensal: number;
  faturamentoAnual: number;
  percentualMensal: number;
  alertaPercentual: number;
  status: 'OK' | 'ALERTA' | 'CRITICO';
}

// --- Components ---

const StatCard = ({ title, value, icon: Icon, color, subtext, trend }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between hover:shadow-md transition-shadow"
  >
    <div>
      <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
      {subtext && (
    <div className={`text-xs font-medium mt-2 flex items-center ${trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-slate-400' : 'text-slate-400'}`}>
      {trend === 'up' ? <ArrowUpRight className="w-3 h-3 mr-1" /> : trend === 'down' ? <ArrowDownRight className="w-3 h-3 mr-1" /> : null}
          {subtext}
        </div>
      )}
    </div>
    <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
      <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
    </div>
  </motion.div>
);

const SectionHeader = ({ title, icon: Icon }: any) => (
  <div className="flex items-center space-x-2 mb-4 mt-8">
    <Icon className="w-5 h-5 text-blue-600" />
    <h2 className="text-lg font-bold text-slate-800">{title}</h2>
  </div>
);

// --- Main Page ---

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [tetoFiscal, setTetoFiscal] = useState<TetoFiscalItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [statsRes, tetoRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/dashboard/teto-fiscal').catch(() => ({ data: [] })),
        ]);
        setData(statsRes.data);
        setTetoFiscal(tetoRes.data || []);
      } catch (err) {
        console.error('Failed to fetch dashboard stats', err);
        setTetoFiscal([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!data) return <div>Erro ao carregar dados.</div>;

  return (
    <div className="h-full overflow-y-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Painel de Controle</h1>
          <p className="text-sm text-slate-500">Visão geral do sistema Nacional Hidro</p>
        </div>
        <div className="text-right">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Status do Servidor</div>
          <div className="flex items-center justify-end space-x-2 text-emerald-600">
            <Activity className="w-4 h-4" />
            <span className="font-bold">{data.apiHealth.status}</span>
            <span className="text-slate-400 text-xs">({Math.floor(data.apiHealth.uptime / 60)}min uptime)</span>
          </div>
        </div>
      </div>

      {/* ─── Teto Fiscal Section ─── */}
      {tetoFiscal.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-800">Teto Fiscal por CNPJ</h2>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-auto">
              Mês Corrente
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tetoFiscal.map(empresa => {
              const statusColors = {
                OK: { bar: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
                ALERTA: { bar: 'bg-blue-600', text: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
                CRITICO: { bar: 'bg-slate-800', text: 'text-slate-800', bg: 'bg-slate-50', border: 'border-slate-200' },
              };
              const colors = statusColors[empresa.status];
              return (
                <div key={empresa.id} className={`${colors.bg} border ${colors.border} rounded-xl p-4 space-y-3`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{empresa.nome}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{empresa.cnpj}</p>
                    </div>
                    <span className={`text-xs font-black uppercase tracking-wider px-2 py-1 rounded-lg ${colors.bg} ${colors.text} border ${colors.border}`}>
                      {empresa.status}
                    </span>
                  </div>
                  {/* Progress Bar */}
                  <div className="relative h-4 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`absolute inset-y-0 left-0 ${colors.bar} rounded-full transition-all duration-500 motion-reduce:transition-none`}
                      style={{ width: `${Math.min(empresa.percentualMensal, 100)}%` }}
                    />
                    {/* Alert threshold line */}
                    <div
                      className="absolute inset-y-0 w-0.5 bg-slate-600/30"
                      style={{ left: `${empresa.alertaPercentual}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-600">
                      R$ {empresa.faturamentoMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className={`font-black ${colors.text}`}>
                      {empresa.percentualMensal}%
                    </span>
                    <span className="font-bold text-slate-400">
                      Limite: R$ {empresa.limiteMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-bold">
                    Acumulado no ano: R$ {empresa.faturamentoAnual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* --- Overview Section --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Faturamento Total"
          value={`R$ ${data.summary.faturamento.toLocaleString('pt-BR')}`}
          icon={DollarSign}
          color="bg-emerald-600"
          subtext="Receita Confirmada"
          trend="up"
        />
        <StatCard
          title="Lucro Líquido"
          value={`R$ ${data.summary.lucroLiquido.toLocaleString('pt-BR')}`}
          icon={TrendingUp}
          color="bg-blue-600"
          subtext="Resultados do Período"
          trend="up"
        />
        <StatCard
          title="Clientes Ativos"
          value={data.summary.clientesAtivos}
          icon={Users}
          color="bg-indigo-600"
          subtext={`${data.summary.novosClientes} novos este mês`}
          trend="up"
        />
        <StatCard
          title="OS em Andamento"
          value={data.operacional.osEmAndamento}
          icon={Hammer}
          color="bg-blue-600"
          subtext="Serviços Ativos"
        />
      </div>

      {/* --- HR Operational Flow (New) --- */}
      {data.rh && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-6">
            <Briefcase className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800">Força de Trabalho (RH)</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4">
              <p className="text-xs font-bold text-emerald-600 uppercase mb-1">Aptos (Operação)</p>
              <h4 className="text-2xl font-black text-emerald-700">{data.rh.aptos}</h4>
              <p className="text-[10px] text-emerald-600/70 mt-1 font-medium">Equipe disponível</p>
            </div>
            
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <p className="text-xs font-bold text-blue-600 uppercase mb-1">Em Contratação</p>
              <h4 className="text-2xl font-black text-blue-700">{data.rh.emContratacao}</h4>
              <p className="text-[10px] text-blue-600/70 mt-1 font-medium">Processo de admissão</p>
            </div>
            
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-4">
              <p className="text-xs font-bold text-slate-500 uppercase mb-1">Com Atestado</p>
              <h4 className="text-2xl font-black text-slate-700">{data.rh.atestados}</h4>
              <p className="text-[10px] text-slate-500/70 mt-1 font-medium">Restrições temporárias</p>
            </div>
            
            <div className="bg-slate-100 border border-slate-200 rounded-lg p-4">
              <p className="text-xs font-bold text-slate-600 uppercase mb-1">Afastados</p>
              <h4 className="text-2xl font-black text-slate-800">{data.rh.afastados}</h4>
              <p className="text-[10px] text-slate-600/70 mt-1 font-medium">Inaptos momentâneos</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* --- Charts Row --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Fluxo de Caixa (Semestral)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.chartData}> // Use AreaChart for fancier look
                <defs>
                  <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#64748b" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#64748b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="receitas" stroke="#10b981" fillOpacity={1} fill="url(#colorReceitas)" />
                <Area type="monotone" dataKey="despesas" stroke="#64748b" fillOpacity={1} fill="url(#colorDespesas)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Proposals Funnel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Funil de Propostas</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Enviadas', value: data.propostas.pendentes, fill: '#64748b' },
                { name: 'Aceitas', value: data.propostas.aceitas, fill: '#10b981' },
                { name: 'Recusadas', value: data.propostas.recusadas, fill: '#94a3b8' },
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* --- Operational & Logistics Section --- */}
      <SectionHeader title="Operacional & Logística" icon={Truck} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Frota em Manutenção"
          value={data.operacional.frotaManutencao}
          icon={AlertTriangle}
          color="bg-slate-500"
          subtext="Veículos indisponíveis"
          trend="down"
        />
        <StatCard
          title="Estoque Crítico"
          value={data.operacional.estoqueBaixo}
          icon={Package}
          color="bg-slate-600"
          subtext="Itens abaixo do mínimo"
          trend="down"
        />
        <StatCard
          title="Total Produtos"
          value={data.operacional.totalProdutos}
          icon={Server}
          color="bg-slate-600"
          subtext="Itens cadastrados"
        />
      </div>

      {/* --- Commercial Section --- */}
      <SectionHeader title="Comercial" icon={Briefcase} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Propostas Totais"
          value={data.propostas.total}
          icon={FileText}
          color="bg-blue-500"
          subtext="Histórico completo"
        />
        <StatCard
          title="Valor em Carteira"
          value={`R$ ${data.propostas.valorTotal.toLocaleString('pt-BR')}`}
          icon={DollarSign}
          color="bg-emerald-500"
          subtext="Propostas Aceitas (Potencial)"
        />
        <StatCard
          title="Taxa de Conversão"
          value={`${data.propostas.total > 0 ? Math.round((data.propostas.aceitas / data.propostas.total) * 100) : 0}%`}
          icon={PieIcon}
          color="bg-violet-500"
          subtext="Aceitas vs Total"
        />
      </div>

    </div>
  );
}
