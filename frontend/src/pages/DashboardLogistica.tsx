import { useEffect, useState } from 'react';
import api from '../services/api';
import {
    Loader2, Truck, Users, Wrench, Calendar, AlertTriangle,
    Clock, Activity, ArrowRight, PieChart as PieChartIcon, BarChart3
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

export default function DashboardLogistica() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/dashboard-logistica').then(r => {
            setData(r.data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

    if (loading || !data) return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

    const dataVeiculos = [
        { name: 'Disponíveis', value: data.veiculos.disponiveis },
        { name: 'Em Uso', value: data.veiculos.emUso },
        { name: 'Manutenção', value: data.veiculos.emManutencao },
    ];
    const COLORS_VEICULOS = ['#10b981', '#3b82f6', '#f59e0b'];

    const dataOS = [
        { name: 'Aberta', value: data.osPipeline.aberta, fill: '#cbd5e1' },
        { name: 'Execução', value: data.osPipeline.emExecucao, fill: '#3b82f6' },
        { name: 'Baixada', value: data.osPipeline.baixada, fill: '#f59e0b' },
        { name: 'Prec.', value: data.osPipeline.precificada, fill: '#10b981' },
        { name: 'Faturada', value: data.osPipeline.faturada, fill: '#94a3b8' },
    ];

    return (
        <div className="h-full overflow-y-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Dashboard Logística</h1>
                <p className="text-sm text-slate-500">Visão geral em tempo real</p>
            </div>

            {/* Top Stats Row */}
            <div className="grid grid-cols-5 gap-3">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
                    <div className="flex items-center gap-2 mb-2"><Activity className="w-4 h-4 opacity-80" /><span className="text-[10px] font-black uppercase opacity-80">Em Execução</span></div>
                    <p className="text-3xl font-black">{data.osPipeline.emExecucao}</p>
                    <p className="text-xs opacity-70 mt-1">OS ativas agora</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white">
                    <div className="flex items-center gap-2 mb-2"><Truck className="w-4 h-4 opacity-80" /><span className="text-[10px] font-black uppercase opacity-80">Veículos Disp.</span></div>
                    <p className="text-3xl font-black">{data.veiculos.disponiveis}</p>
                    <p className="text-xs opacity-70 mt-1">de {data.veiculos.total} total</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-4 text-white">
                    <div className="flex items-center gap-2 mb-2"><Wrench className="w-4 h-4 opacity-80" /><span className="text-[10px] font-black uppercase opacity-80">Manutenção</span></div>
                    <p className="text-3xl font-black">{data.veiculos.emManutencao}</p>
                    <p className="text-xs opacity-70 mt-1">{data.manutencoesPendentes} pendentes</p>
                </div>
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-4 text-white">
                    <div className="flex items-center gap-2 mb-2"><Users className="w-4 h-4 opacity-80" /><span className="text-[10px] font-black uppercase opacity-80">Funcionários</span></div>
                    <p className="text-3xl font-black">{data.funcionarios.ativos}</p>
                    <p className="text-xs opacity-70 mt-1">{data.funcionarios.ferias} férias · {data.funcionarios.afastados} afastados</p>
                </div>
                <div className="bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl p-4 text-white">
                    <div className="flex items-center gap-2 mb-2"><Calendar className="w-4 h-4 opacity-80" /><span className="text-[10px] font-black uppercase opacity-80">Escalas Hoje</span></div>
                    <p className="text-3xl font-black">{data.escalasHoje?.length || 0}</p>
                    <p className="text-xs opacity-70 mt-1">serviços agendados</p>
                </div>
            </div>

            {/* OS Pipeline */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h2 className="text-xs font-black text-slate-400 uppercase mb-3">Pipeline de OS</h2>
                <div className="flex items-center gap-2">
                    {[
                        { label: 'Aberta', count: data.osPipeline.aberta, color: 'bg-slate-100 text-slate-600' },
                        { label: 'Execução', count: data.osPipeline.emExecucao, color: 'bg-blue-100 text-blue-600' },
                        { label: 'Baixada', count: data.osPipeline.baixada, color: 'bg-amber-100 text-amber-600' },
                        { label: 'Precificada', count: data.osPipeline.precificada, color: 'bg-emerald-100 text-emerald-600' },
                        { label: 'Faturada', count: data.osPipeline.faturada, color: 'bg-slate-200 text-slate-500' },
                    ].map((s, i) => (
                        <div key={s.label} className="flex items-center gap-2">
                            <div className={`${s.color} rounded-lg px-4 py-2 text-center min-w-[100px]`}>
                                <p className="text-xl font-black">{s.count}</p>
                                <p className="text-[9px] font-black uppercase">{s.label}</p>
                            </div>
                            {i < 4 && <ArrowRight className="w-4 h-4 text-slate-300" />}
                        </div>
                    ))}
                </div>
            </div>

            {/* Gráficos e Visualizações */}
            <div className="grid grid-cols-3 gap-4">
                {/* Gráfico de Veículos */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <h2 className="text-xs font-black text-slate-400 uppercase mb-3 flex items-center gap-2">
                        <PieChartIcon className="w-3.5 h-3.5" /> Status da Frota
                    </h2>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={dataVeiculos}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={70}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {dataVeiculos.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS_VEICULOS[index % COLORS_VEICULOS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip 
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                />
                                <Legend wrapperStyle={{ fontSize: '10px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Gráfico de Pipeline de OS */}
                <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-4">
                    <h2 className="text-xs font-black text-slate-400 uppercase mb-3 flex items-center gap-2">
                        <BarChart3 className="w-3.5 h-3.5" /> Funil de Ordens de Serviço
                    </h2>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dataOS} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dx={-10} allowDecimals={false} />
                                <RechartsTooltip 
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={50}>
                                    {dataOS.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Serviços em Execução */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <h2 className="text-xs font-black text-slate-400 uppercase mb-3 flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5 text-blue-500" /> Serviços em Execução
                    </h2>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {data.servicosEmExecucao.length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-4 text-center">Nenhum serviço em execução</p>
                        ) : (
                            data.servicosEmExecucao.map((os: any) => (
                                <div key={os.id} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                                    <div>
                                        <p className="text-xs font-bold text-blue-700">OS {os.codigo}</p>
                                        <p className="text-[10px] text-slate-500">{os.cliente?.nome}</p>
                                    </div>
                                    <span className="text-[9px] font-black text-blue-600 bg-blue-100 px-2 py-0.5 rounded">ATIVA</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Próximos Serviços (7 dias) */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <h2 className="text-xs font-black text-slate-400 uppercase mb-3 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-emerald-500" /> Próximos 7 Dias
                    </h2>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {data.proximosServicos.length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-4 text-center">Nenhum serviço agendado</p>
                        ) : (
                            data.proximosServicos.map((e: any) => (
                                <div key={e.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                                    <div>
                                        <p className="text-xs font-bold text-slate-700">{fmtDate(e.data)}</p>
                                        <p className="text-[10px] text-slate-500">{e.cliente?.nome}</p>
                                    </div>
                                    {e.veiculo && <span className="text-[10px] font-bold text-slate-500">{e.veiculo.placa}</span>}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Caminhões em Manutenção */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <h2 className="text-xs font-black text-slate-400 uppercase mb-3 flex items-center gap-2">
                        <Wrench className="w-3.5 h-3.5 text-amber-500" /> Veículos em Manutenção
                    </h2>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {data.veiculos.listaManutencao.length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-4 text-center">Nenhum veículo em manutenção</p>
                        ) : (
                            data.veiculos.listaManutencao.map((v: any) => (
                                <div key={v.id} className="flex items-center justify-between p-2 bg-amber-50 rounded-lg">
                                    <div>
                                        <p className="text-xs font-bold text-amber-700">{v.placa}</p>
                                        <p className="text-[10px] text-slate-500">{v.tipo || v.modelo || '—'}</p>
                                    </div>
                                    <span className="text-[9px] font-black text-amber-600 bg-amber-100 px-2 py-0.5 rounded">MANUTENÇÃO</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Documentação Vencendo */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <h2 className="text-xs font-black text-slate-400 uppercase mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500" /> Docs Vencendo (30 dias)
                    </h2>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {data.docsVencendo.length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-4 text-center">Nenhuma documentação vencendo</p>
                        ) : (
                            data.docsVencendo.map((d: any) => (
                                <div key={d.id} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                                    <div>
                                        <p className="text-xs font-bold text-red-700">{d.documento || d.tipo}</p>
                                        <p className="text-[10px] text-slate-500">{d.cliente?.nome}</p>
                                    </div>
                                    <span className="text-[10px] font-bold text-red-500">{fmtDate(d.dataValidade)}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Escalas de Hoje */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h2 className="text-xs font-black text-slate-400 uppercase mb-3 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" /> Escalas de Hoje
                </h2>
                {data.escalasHoje.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-4 text-center">Nenhuma escala para hoje</p>
                ) : (
                    <div className="grid grid-cols-3 gap-2">
                        {data.escalasHoje.map((e: any) => (
                            <div key={e.id} className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                                <div className="flex items-center justify-between mb-1">
                                    <p className="text-xs font-bold text-indigo-700">{e.cliente?.nome || '—'}</p>
                                    {e.veiculo && <span className="text-[10px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded">{e.veiculo.placa}</span>}
                                </div>
                                {e.funcionarios && Array.isArray(e.funcionarios) && (
                                    <p className="text-[10px] text-slate-500">👷 {e.funcionarios.join(', ')}</p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
