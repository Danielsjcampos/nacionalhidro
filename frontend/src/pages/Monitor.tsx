import { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import { 
  Activity, Database, Zap, 
  RefreshCw,
  ChevronRight, Terminal, Globe, ShieldCheck,
  Server, HardDrive as DiskIcon, BarChart3,
  AlertTriangle, Info,
  LogOut, UserCheck
} from 'lucide-react';
import { motion } from 'framer-motion';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer
} from 'recharts';

interface SystemEvent {
  id: string;
  type: 'LOGIN' | 'AUTH_ERROR' | 'DB_ERROR' | 'SERVER_START' | 'CONFIG_CHANGE';
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  timestamp: string;
  metadata?: any;
}

interface MonitorStats {
  system: {
    uptime: number;
    memory: {
      total: number;
      free: number;
      used: number;
      processHeap: number;
    };
    cpu: number[];
    platform: string;
    arch: string;
    cpus: number;
  };
  db: {
    status: string;
    latency: number;
    provider: string;
  };
  traffic: {
    requests: number;
    errors: number;
    avgLatency: number;
  };
  logs: any[];
  events: SystemEvent[];
  webhooks: any[];
}

export default function Monitor() {
  const [data, setData] = useState<MonitorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(2000);
  const [history, setHistory] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchStats = async () => {
    try {
      const response = await api.get('/monitor/stats');
      const newData = response.data;
      setData(newData);
      
      setHistory(prev => {
        const newHistory = [...prev, {
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          latency: newData.db.latency,
          memory: Math.round(newData.system.memory.processHeap / 1024 / 1024),
          requests: newData.traffic.requests
        }];
        return newHistory.slice(-30);
      });
    } catch (err) {
      console.error('Failed to fetch monitor stats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Auto-scroll logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [data?.logs]);

  if (loading && !data) return (
    <div className="h-[80vh] flex flex-col items-center justify-center space-y-6">
      <div className="relative">
        <RefreshCw className="w-12 h-12 animate-spin text-blue-600" />
        <div className="absolute inset-0 animate-ping rounded-full bg-blue-400 opacity-20" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter italic">Sincronizando Telemetria</h2>
        <p className="text-slate-500 text-sm font-medium animate-pulse">Aguardando resposta do núcleo do sistema...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-20 max-w-[1600px] mx-auto">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
        <div className="relative z-10 flex items-center gap-6">
          <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/40 transform -rotate-6 rotate-container group hover:rotate-0 transition-transform duration-500">
             <Activity className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">Command Center</h1>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-1.5 animate-pulse">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                Live: {data?.system?.platform}
              </span>
            </div>
            <p className="text-slate-500 font-medium italic mt-1">Monitoramento unificado de infraestrutura, banco de dados e eventos críticos</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="bg-slate-50 p-1.5 rounded-2xl border border-slate-200 flex gap-1">
             {[2000, 5000].map(val => (
                <button 
                  key={val}
                  onClick={() => setRefreshInterval(val)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${refreshInterval === val ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {val/1000}s
                </button>
             ))}
          </div>
          <button 
            onClick={fetchStats}
            className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center hover:bg-slate-50 transition-all shadow-sm group active:scale-95"
          >
            <RefreshCw className="w-5 h-5 text-slate-500 group-hover:rotate-180 transition-transform duration-700" />
          </button>
        </div>
      </div>

      {/* Real-time Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatusCard 
          title="Server Health"
          value={data?.system.uptime ? formatUptime(data.system.uptime) : '---'}
          icon={Server}
          color="blue"
          trend="UPTIME"
          subtext={`CPU: ${Math.round((data?.system?.cpu?.[0] || 0) * 10)}% Load`}
        />
        <StatusCard 
          title="Database Latency"
          value={`${data?.db.latency || 0}ms`}
          icon={Database}
          color={data?.db.status === 'connected' ? 'emerald' : 'red'}
          trend={data?.db.status === 'connected' ? 'ONLINE' : 'ERROR'}
          subtext={data?.db.provider}
        />
        <StatusCard 
          title="Memory Consumption"
          value={`${Math.round((data?.system.memory.processHeap || 0) / 1024 / 1024)} MB`}
          icon={DiskIcon}
          color="violet"
          trend="RESOURCES"
          subtext={`Free System: ${Math.round((data?.system.memory.free || 0) / 1024 / 1024 / 1024)} GB`}
        />
        <StatusCard 
          title="Network Traffic"
          value={`${data?.traffic.requests || 0}`}
          icon={Globe}
          color="orange"
          trend="HITS"
          subtext={`Avg Latency: ${data?.traffic.avgLatency.toFixed(1)}ms`}
        />
      </div>

      {/* Main Analysis Section */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Analytics Charts */}
        <div className="xl:col-span-8 space-y-8">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl">
             <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                      <BarChart3 className="w-5 h-5" />
                   </div>
                   <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter italic">Telemetria de Performance</h3>
                </div>
                <div className="flex gap-2">
                   <span className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest"><div className="w-2 h-2 rounded-full bg-blue-500" /> Latência</span>
                   <span className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4"><div className="w-2 h-2 rounded-full bg-violet-500" /> Memória</span>
                </div>
             </div>
             <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={history}>
                      <defs>
                         <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                         </linearGradient>
                         <linearGradient id="memoryGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                         </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#94a3b8', fontWeight: 'bold'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#94a3b8', fontWeight: 'bold'}} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                      />
                      <Area type="monotone" dataKey="latency" stroke="#3b82f6" strokeWidth={3} fill="url(#latencyGrad)" />
                      <Area type="monotone" dataKey="memory" stroke="#8b5cf6" strokeWidth={3} fill="url(#memoryGrad)" />
                   </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             {/* System Events */}
             <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col h-[450px]">
                <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                   <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest italic flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-500" /> Eventos do Core
                   </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                   {data?.events.map((event) => (
                      <div key={event.id} className={`p-4 rounded-2xl border flex gap-4 items-start transition-all hover:scale-[1.02] ${
                        event.severity === 'CRITICAL' ? 'bg-red-50 border-red-100' :
                        event.severity === 'WARNING' ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'
                      }`}>
                         <div className={`p-2 rounded-xl flex-shrink-0 ${
                            event.type === 'LOGIN' ? 'bg-emerald-100 text-emerald-600' :
                            event.type === 'SERVER_START' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'
                         }`}>
                            {event.type === 'LOGIN' ? <UserCheck className="w-4 h-4" /> :
                             event.type === 'AUTH_ERROR' ? <LogOut className="w-4 h-4" /> :
                             event.type === 'SERVER_START' ? <Zap className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                         </div>
                         <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between mb-1">
                               <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{event.type}</span>
                               <span className="text-[9px] font-bold text-slate-400">{new Date(event.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <p className="text-xs font-bold text-slate-700 leading-snug truncate-2-lines">{event.message}</p>
                         </div>
                      </div>
                   ))}
                   {!data?.events.length && (
                      <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50 italic">
                         <Info className="w-8 h-8 mb-2" />
                         <p className="text-xs">Nenhum evento registrado</p>
                      </div>
                   )}
                </div>
             </div>

             {/* Webhook Activity */}
             <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col h-[450px]">
                <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                   <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest italic flex items-center gap-2">
                      <Globe className="w-5 h-5 text-orange-500" /> Gateway Webhooks
                   </h3>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-slate-50 custom-scrollbar">
                   {data?.webhooks.map((wh) => (
                      <div key={wh.id} className="p-5 hover:bg-slate-50 transition-colors group">
                         <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-black text-slate-800 uppercase italic tracking-tighter">{wh.provider || 'EXTERNAL'}</span>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded italic border ${
                               wh.statusCode < 300 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
                            }`}>CODE {wh.statusCode}</span>
                         </div>
                         <p className="text-[10px] text-slate-500 font-medium truncate mb-2">{wh.url}</p>
                         <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{new Date(wh.createdAt).toLocaleString('pt-BR')}</span>
                            <div className="bg-slate-100 p-1 rounded group-hover:bg-blue-600 group-hover:text-white transition-all">
                               <ChevronRight className="w-3 h-3" />
                            </div>
                         </div>
                      </div>
                   ))}
                   {!data?.webhooks.length && (
                      <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50 italic">
                         <Zap className="w-8 h-8 mb-2" />
                         <p className="text-xs">Aguardando sinais externos...</p>
                      </div>
                   )}
                </div>
             </div>
          </div>
        </div>

        {/* Real-time Console Log */}
        <div className="xl:col-span-4 bg-slate-950 rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[calc(350px+450px+2rem)] lg:sticky lg:top-8">
           <div className="p-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80 shadow-lg shadow-red-500/20" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/80 shadow-lg shadow-amber-500/20" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/80 shadow-lg shadow-emerald-500/20" />
                 </div>
                 <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] italic ml-2">Kernel Feed</h3>
              </div>
              <Terminal className="w-4 h-4 text-slate-600" />
           </div>
           
           <div 
             ref={scrollRef}
             className="flex-1 overflow-y-auto p-6 font-mono text-[10px] leading-relaxed space-y-1 custom-scrollbar text-slate-300 selection:bg-blue-500/30"
           >
              {data?.logs.map((log) => (
                 <div key={log.id} className="flex gap-4 p-2 rounded-lg hover:bg-slate-900 transition-colors group">
                    <span className="text-slate-600 tabular-nums">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span className={`font-black tracking-tighter shrink-0 ${
                       log.method === 'GET' ? 'text-blue-400' :
                       log.method === 'POST' ? 'text-emerald-400' :
                       log.method === 'PATCH' ? 'text-amber-400' : 'text-red-400'
                    }`}>{log.method}</span>
                    <span className="text-slate-300 truncate opacity-90 group-hover:opacity-100">{log.url}</span>
                    <div className="ml-auto flex items-center gap-3">
                       <span className={`font-black ${log.status >= 400 ? 'text-red-500' : 'text-emerald-500'}`}>{log.status}</span>
                       <span className="text-slate-600 min-w-[40px] text-right">{log.duration}ms</span>
                    </div>
                 </div>
              ))}
              {data?.logs.length === 0 && (
                 <div className="h-full flex items-center justify-center text-slate-700 italic">
                    <p>&gt; idle_mode_active</p>
                 </div>
              )}
           </div>
           <div className="p-4 bg-slate-900/50 border-t border-slate-800 text-[9px] font-black text-slate-500 flex items-center justify-between italic tracking-widest">
              <span>TCP_CONNECTED: {data?.system?.platform?.toUpperCase()}</span>
              <span className="animate-pulse">SINKING_BUFFERS...</span>
           </div>
        </div>

      </div>
    </div>
  );
}

const StatusCard = ({ title, value, subtext, icon: Icon, color, trend }: any) => {
    const colorClasses: any = {
        blue: 'from-blue-600 to-blue-700 text-white shadow-blue-500/30',
        emerald: 'from-emerald-600 to-emerald-700 text-white shadow-emerald-500/30',
        violet: 'from-violet-600 to-violet-700 text-white shadow-violet-500/30',
        orange: 'from-orange-600 to-orange-700 text-white shadow-orange-500/30',
        red: 'from-red-600 to-red-700 text-white shadow-red-500/30',
    };

    const iconBg: any = {
        blue: 'bg-blue-400/20',
        emerald: 'bg-emerald-400/20',
        violet: 'bg-violet-400/20',
        orange: 'bg-orange-400/20',
        red: 'bg-red-400/20',
    };

    return (
        <motion.div 
            whileHover={{ y: -8, scale: 1.02 }}
            className={`p-1 rounded-[2.5rem] bg-gradient-to-br ${colorClasses[color]} shadow-2xl relative overflow-hidden group`}
        >
            <div className="absolute top-0 right-0 p-8 transform translate-x-12 -translate-y-12 scale-150 rotate-12 opacity-10 group-hover:rotate-0 transition-transform duration-700">
               <Icon className="w-32 h-32" />
            </div>
            
            <div className="p-8 relative z-10 flex flex-col h-full">
                <div className="flex items-center justify-between mb-6">
                    <div className={`p-4 rounded-3xl ${iconBg[color]} backdrop-blur-md`}>
                        <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] italic opacity-60">{trend}</span>
                </div>
                
                <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-1 italic">{title}</p>
                <h4 className="text-2xl font-black italic tracking-tighter mb-4">{value}</h4>
                
                <div className="mt-auto flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-white opacity-40 animate-pulse" />
                    <p className="text-[10px] font-bold text-white/70 tracking-tight italic uppercase">{subtext}</p>
                </div>
            </div>
        </motion.div>
    );
};

const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
};
