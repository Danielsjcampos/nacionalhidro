import { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  Plus, Loader2, Wrench, Save, History, 
  AlertTriangle, CheckCircle2, Clock, Truck, 
  ArrowRight, ShieldAlert, ClipboardList, DollarSign, Calendar
} from 'lucide-react';

export default function Manutencao() {
  const [manutencoes, setManutencoes] = useState<any[]>([]);
  const [veiculos, setVeiculos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedMaint, setSelectedMaint] = useState<any>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const [maintRes, veiRes] = await Promise.all([
        axios.get(`http://localhost:3000/manutencao`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`http://localhost:3000/logistica/veiculos`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setManutencoes(maintRes.data);
      setVeiculos(veiRes.data);
    } catch (err) {
      console.error('Failed to fetch maintenance data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateNew = () => {
    setSelectedMaint({ 
      novo: true, 
      status: 'PENDENTE', 
      prioridade: 'MEDIA',
      custoPecas: 0,
      custoMaoObra: 0,
      statusFinanceiro: 'PENDENTE'
    });
    setIsEditing(true);
  };

  const handleEdit = (maint: any) => {
    setSelectedMaint({ ...maint });
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      if (selectedMaint.id) {
        await axios.patch(`http://localhost:3000/manutencao/${selectedMaint.id}`, selectedMaint, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`http://localhost:3000/manutencao`, selectedMaint, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setIsEditing(false);
      setSelectedMaint(null);
      fetchData();
    } catch (err) {
       console.error('Error saving maintenance', err);
    }
  };

  const handleLiberar = async (id: string) => {
     try {
        const token = localStorage.getItem('token');
        await axios.patch(`http://localhost:3000/manutencao/${id}/liberar`, {}, {
           headers: { Authorization: `Bearer ${token}` }
        });
        fetchData();
     } catch (err) {
        console.error('Error releasing vehicle', err);
     }
  };

  if (loading && !manutencoes.length) return (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="h-full flex flex-col space-y-6">
      {!isEditing ? (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter italic">Gestão de Manutenção</h1>
              <p className="text-sm text-slate-500 font-medium italic">Controle de reparos, revisões e custos da frota</p>
            </div>
            <button 
              onClick={handleCreateNew}
              className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20 text-xs font-black uppercase italic"
            >
              <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" /> Nova Ordem de Serviço
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             {[
               { icon: ShieldAlert, label: 'Em Oficina', value: manutencoes.filter(m => m.status === 'EM_EXECUCAO').length, color: 'amber' },
               { icon: AlertTriangle, label: 'Prioridade Alta', value: manutencoes.filter(m => m.prioridade === 'ALTA' || m.prioridade === 'CRITICA').length, color: 'red' },
               { icon: DollarSign, label: 'Custo Total Mes', value: `R$ ${manutencoes.filter(m => m.status === 'CONCLUIDA').reduce((acc, curr) => acc + Number(curr.valorTotal || 0), 0).toLocaleString('pt-BR')}`, color: 'emerald' },
               { icon: CheckCircle2, label: 'Aguardando Pagto', value: manutencoes.filter(m => m.statusFinanceiro === 'PENDENTE' && m.status === 'CONCLUIDA').length, color: 'blue' },
             ].map((stat, i) => (
                <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                   <div className={`w-12 h-12 rounded-xl bg-${stat.color}-50 text-${stat.color}-500 flex items-center justify-center`}>
                      <stat.icon className="w-6 h-6" />
                   </div>
                   <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                      <p className="text-xl font-black text-slate-800 italic leading-none">{stat.value}</p>
                   </div>
                </div>
             ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1">
             <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                   <tr>
                      <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest text-slate-500 italic">Status / Financeiro</th>
                      <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest text-slate-500 italic">Veículo / Tipo</th>
                      <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest text-slate-500 italic">Serviço / OS</th>
                      <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest text-slate-500 italic">Custos (R$)</th>
                      <th className="px-6 py-4 text-right"></th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {manutencoes.map(m => (
                      <tr key={m.id} onClick={() => handleEdit(m)} className="hover:bg-slate-50/50 transition-colors cursor-pointer group">
                        <td className="px-6 py-4">
                           <div className="flex flex-col gap-1">
                              <span className={`w-fit px-2 py-0.5 rounded-[4px] text-[8px] font-black uppercase tracking-tighter ${
                                m.status === 'CONCLUIDA' ? 'bg-emerald-100 text-emerald-700' :
                                m.status === 'EM_EXECUCAO' ? 'bg-amber-100 text-amber-700' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {m.status}
                              </span>
                              <span className={`w-fit px-2 py-0.5 rounded-[4px] text-[8px] font-black uppercase tracking-tighter border ${
                                m.statusFinanceiro === 'PAGO' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-red-50 text-red-600 border-red-100'
                              }`}>
                                FIN: {m.statusFinanceiro}
                              </span>
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-amber-600 group-hover:text-white transition-all shadow-inner">
                                 <Truck className="w-5 h-5" />
                              </div>
                              <div>
                                 <p className="font-black text-slate-800 uppercase italic leading-none tracking-tighter">{m.veiculo?.placa || 'EQUI-X'}</p>
                                 <p className="text-[9px] text-slate-500 font-bold uppercase mt-1 tracking-widest">{m.veiculo?.modelo || m.equipamento}</p>
                              </div>
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           <p className="font-black text-slate-700 uppercase italic text-[11px] tracking-tight truncate max-w-[200px]">{m.descricao || 'Serviço s/ descrição'}</p>
                           <p className="text-[9px] text-slate-400 mt-1 font-bold uppercase">Prioridade: {m.prioridade}</p>
                        </td>
                        <td className="px-6 py-4">
                           <div className="font-black text-slate-700 italic text-xs">
                              R$ {Number(m.valorTotal || 0).toLocaleString('pt-BR')}
                              <p className="text-[9px] text-slate-400 uppercase not-italic font-bold tracking-widest">Total Acumulado</p>
                           </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                           <div className="flex items-center justify-end gap-3">
                              {m.status !== 'CONCLUIDA' && (
                                 <button 
                                    onClick={(e) => { e.stopPropagation(); handleLiberar(m.id); }}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase italic tracking-widest shadow-lg shadow-emerald-500/20 transition-all"
                                 >
                                    Liberar Veículo
                                 </button>
                              )}
                              <ArrowRight className="w-5 h-5 text-slate-200 group-hover:text-amber-500 transition-all transform group-hover:translate-x-1" />
                           </div>
                        </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 duration-500 max-w-6xl mx-auto w-full">
           <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-amber-500">
              <div className="flex items-center gap-4 text-white">
                 <Wrench className="w-8 h-8" />
                 <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter italic leading-none">Manutenção Corretiva/Preventiva</h2>
                    <p className="text-xs font-bold text-white/70 uppercase tracking-widest mt-1">Ordem de Serviço Técnica & Financeira</p>
                 </div>
              </div>
              <div className="flex gap-4">
                 <button onClick={() => setIsEditing(false)} className="px-6 py-3 text-[10px] font-black uppercase text-white hover:text-red-200 transition-colors tracking-widest">Abandonar</button>
                 <button onClick={handleSave} className="bg-white text-amber-600 px-10 py-4 rounded-2xl flex items-center gap-2 hover:bg-slate-50 transition-all shadow-2xl text-[10px] font-black uppercase italic tracking-widest"><Save className="w-5 h-5" /> Salvar Ordem</button>
              </div>
           </div>
           
           <div className="p-12 space-y-12 bg-slate-50/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                 <section className="space-y-8 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                       <Truck className="w-5 h-5 text-amber-500" />
                       <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em] italic">Detalhamento Técnico</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">Veículo Alocado</label>
                          <select 
                             className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3.5 text-sm font-bold focus:border-amber-500 outline-none transition-all appearance-none cursor-pointer"
                             value={selectedMaint.veiculoId || ''}
                             onChange={e => setSelectedMaint({...selectedMaint, veiculoId: e.target.value})}
                           >
                             <option value="">Selecione o veículo na frota...</option>
                             {veiculos.map(v => <option key={v.id} value={v.id} disabled={v.status === 'MANUTENCAO' && v.id !== selectedMaint.veiculoId}>{v.placa} - {v.modelo} ({v.status})</option>)}
                          </select>
                       </div>
                       <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">Prioridade</label>
                             <select 
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3.5 text-sm font-bold outline-none focus:border-amber-500"
                                value={selectedMaint.prioridade}
                                onChange={e => setSelectedMaint({...selectedMaint, prioridade: e.target.value})}
                              >
                                <option value="BAIXA">🟢 BAIXA</option>
                                <option value="MEDIA">🟡 MÉDIA</option>
                                <option value="ALTA">🟠 ALTA</option>
                                <option value="CRITICA">🔴 CRÍTICA</option>
                             </select>
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">Status OS</label>
                             <select 
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3.5 text-sm font-bold outline-none focus:border-amber-500"
                                value={selectedMaint.status}
                                onChange={e => setSelectedMaint({...selectedMaint, status: e.target.value})}
                              >
                                <option value="PENDENTE">⏱️ PENDENTE</option>
                                <option value="EM_EXECUCAO">⚙️ EM REPARO</option>
                                <option value="CONCLUIDA">✅ CONCLUÍDA</option>
                             </select>
                          </div>
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">Descrição Técnica do Serviço</label>
                          <textarea 
                             className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-6 text-sm min-h-[140px] focus:border-amber-500 outline-none transition-all font-bold tracking-tight"
                             placeholder="Relatório detalhado do problema ou revisão..."
                             value={selectedMaint.descricao || ''}
                             onChange={e => setSelectedMaint({...selectedMaint, descricao: e.target.value})}
                          ></textarea>
                       </div>
                    </div>
                 </section>

                 <section className="space-y-8 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                       <DollarSign className="w-5 h-5 text-emerald-500" />
                       <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em] italic">Controle Financeiro</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-8">
                       <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">Custo de Peças (R$)</label>
                             <input 
                                type="number" 
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3.5 text-sm font-black italic focus:border-emerald-500 outline-none"
                                value={selectedMaint.custoPecas || 0}
                                onChange={e => setSelectedMaint({...selectedMaint, custoPecas: Number(e.target.value)})}
                             />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">Mão de Obra (R$)</label>
                             <input 
                                type="number" 
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3.5 text-sm font-black italic focus:border-emerald-500 outline-none"
                                value={selectedMaint.custoMaoObra || 0}
                                onChange={e => setSelectedMaint({...selectedMaint, custoMaoObra: Number(e.target.value)})}
                             />
                          </div>
                       </div>

                       <div className="bg-emerald-50 p-6 rounded-2xl border-2 border-emerald-100 shadow-inner flex items-center justify-between">
                          <div>
                             <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest italic">Valor Total Calculado</p>
                             <h4 className="text-3xl font-black text-emerald-700 italic tracking-tighter">R$ {(Number(selectedMaint.custoPecas || 0) + Number(selectedMaint.custoMaoObra || 0)).toLocaleString('pt-BR')}</h4>
                          </div>
                          <DollarSign className="w-10 h-10 text-emerald-200" />
                       </div>

                       <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">Situação de Pagamento</label>
                             <select 
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3.5 text-sm font-bold outline-none focus:border-blue-500"
                                value={selectedMaint.statusFinanceiro}
                                onChange={e => setSelectedMaint({...selectedMaint, statusFinanceiro: e.target.value})}
                              >
                                <option value="PENDENTE">🔴 PENDENTE</option>
                                <option value="PAGO">🔵 LIQUIDADO</option>
                             </select>
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">Data do Pagamento</label>
                             <input 
                                type="date" 
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3.5 text-sm font-bold" 
                                value={selectedMaint.dataPagamento ? new Date(selectedMaint.dataPagamento).toISOString().split('T')[0] : ''}
                                onChange={e => setSelectedMaint({...selectedMaint, dataPagamento: e.target.value})}
                              />
                          </div>
                       </div>
                    </div>
                 </section>
              </div>

              <section className="bg-blue-600/5 p-8 rounded-[2rem] border-2 border-blue-100/30 grid grid-cols-1 md:grid-cols-3 gap-8">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest block">Próxima Revisão Programada</label>
                    <div className="relative">
                       <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                       <input 
                         type="date" 
                         className="w-full bg-white border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-black italic text-blue-600 outline-none focus:border-blue-500" 
                         value={selectedMaint.proximaRevisao ? new Date(selectedMaint.proximaRevisao).toISOString().split('T')[0] : ''}
                         onChange={e => setSelectedMaint({...selectedMaint, proximaRevisao: e.target.value})}
                        />
                    </div>
                 </div>
                 <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest block">Histórico / Notas Internas</label>
                    <input 
                      type="text" 
                      className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-3.5 text-sm font-bold outline-none focus:border-blue-500" 
                      placeholder="Ex: Trocado filtro de óleo e pastilhas dianteiras..."
                      value={selectedMaint.historico || ''}
                      onChange={e => setSelectedMaint({...selectedMaint, historico: e.target.value})}
                    />
                 </div>
              </section>
           </div>
        </div>
      )}
    </div>
  );
}
