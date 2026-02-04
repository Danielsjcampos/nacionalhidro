import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { 
  TrendingUp, Users, FileText, CheckCircle, Home, ClipboardList, UserPlus, 
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
  apiHealth: {
    uptime: number;
    memory: any;
    status: string;
  };
  chartData: any[];
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
        <div className={`text-xs font-medium mt-2 flex items-center ${trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-600' : 'text-slate-400'}`}>
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:3000/dashboard/stats', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setData(response.data);
      } catch (err) {
        console.error('Failed to fetch dashboard stats', err);
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
    <div className="space-y-6 pb-12">
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
          color="bg-orange-500"
          subtext="Serviços Ativos"
        />
      </div>

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
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="receitas" stroke="#10b981" fillOpacity={1} fill="url(#colorReceitas)" />
                <Area type="monotone" dataKey="despesas" stroke="#ef4444" fillOpacity={1} fill="url(#colorDespesas)" />
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
                { name: 'Recusadas', value: data.propostas.recusadas, fill: '#ef4444' },
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
          color="bg-amber-500"
          subtext="Veículos indisponíveis"
          trend="down"
        />
        <StatCard 
          title="Estoque Crítico" 
          value={data.operacional.estoqueBaixo} 
          icon={Package} 
          color="bg-red-500"
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
