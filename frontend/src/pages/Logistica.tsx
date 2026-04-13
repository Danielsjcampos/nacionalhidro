import { useEffect, useState } from 'react';
import api from '../services/api';
import {
   Plus, Settings, Save, X,
   Loader2, Wrench, ClipboardList, Send,
   Truck, Gauge
} from 'lucide-react';

export default function Logistica() {
   const [activeTab, setActiveTab] = useState<'escala' | 'frota'>('escala');
   const [escalas, setEscalas] = useState<any[]>([]);
   const [veiculos, setVeiculos] = useState<any[]>([]);
   const [clientes, setClientes] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const [isEditing, setIsEditing] = useState(false);
   const [selectedItem, setSelectedItem] = useState<any>(null);

   // Modal Manutenção
   const [maintModal, setMaintModal] = useState<{ open: boolean, veiculo: any, descricao: string, prioridade: string }>({
      open: false,
      veiculo: null,
      descricao: '',
      prioridade: 'MEDIA'
   });

   // Team Availability
   const [teamAvailability, setTeamAvailability] = useState<any[]>([]);

   // Doc Warning Modal (T09)
   const [docWarning, setDocWarning] = useState<{ open: boolean, data: any }>({
      open: false,
      data: null
   });

   const fetchData = async () => {
      try {
         setLoading(true);
         const [escRes, veiRes, cliRes] = await Promise.all([
            api.get('/logistica/escalas'),
            api.get('/logistica/veiculos'),
            api.get('/clientes')
         ]);
         setEscalas(escRes.data);
         setVeiculos(veiRes.data);
         setClientes(cliRes.data);
      } catch (err) {
         console.error('Failed to fetch logistics data', err);
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      fetchData();
   }, []);

   useEffect(() => {
      const fetchAvailability = async () => {
         if (activeTab === 'escala' && isEditing && selectedItem?.data && selectedItem?.clienteId) {
            try {
               const res = await api.get('/rh/disponibilidade', { params: { data: selectedItem.data, clienteId: selectedItem.clienteId } });
               
               // For each available employee, verify their integration and ASO status for this specific client
               const availabilityWithValidation = await Promise.all(
                  res.data.map(async (func: any) => {
                     try {
                        const validationRes = await api.get(`/logistica/verificar-funcionario/${func.id}/${selectedItem.clienteId}`);
                        return { ...func, linkStatus: validationRes.data.status, statusMessage: validationRes.data.mensagem };
                     } catch(e) {
                         // Fallback if the route fails or isn't there yet
                        return { ...func, linkStatus: 'OK', statusMessage: '' };
                     }
                  })
               );
               setTeamAvailability(availabilityWithValidation);

            } catch(err) {
               console.error('Error fetching team availability', err);
            }
         } else {
            setTeamAvailability([]);
         }
      };
      
      fetchAvailability();
   }, [activeTab, isEditing, selectedItem?.data, selectedItem?.clienteId]);

   const toggleFuncionario = (nome: string, disabled: boolean) => {
      if (disabled) return;
      setSelectedItem((prev: any) => {
         if (!prev) return prev;
         const funcs = Array.isArray(prev.funcionarios) ? [...prev.funcionarios] : [];
         if (funcs.includes(nome)) {
            return { ...prev, funcionarios: funcs.filter((n: string) => n !== nome) };
         } else {
            return { ...prev, funcionarios: [...funcs, nome] };
         }
      });
   };

   const handleCreateNew = () => {
      setSelectedItem({ novo: true });
      setIsEditing(true);
   };

   const handleEdit = (item: any) => {
      setSelectedItem({ ...item });
      setIsEditing(true);
   };

   const handleSave = async () => {
      try {
         const endpoint = activeTab === 'escala' ? 'escalas' : 'veiculos';

         if (selectedItem.id) {
            await api.patch(`/logistica/${endpoint}/${selectedItem.id}`, { ...selectedItem, force: true });
         } else {
            await api.post(`/logistica/${endpoint}`, { ...selectedItem, force: true });
         }

         setIsEditing(false);
         setSelectedItem(null);
         fetchData();
      } catch (err) {
         console.error('Error saving item', err);
      }
   };

   const handleSendToMaint = async () => {
      try {
         await api.patch(`/logistica/veiculos/${maintModal.veiculo.id}/manutencao`, {
            descricao: maintModal.descricao,
            prioridade: maintModal.prioridade
         });

         setMaintModal({ open: false, veiculo: null, descricao: '', prioridade: 'MEDIA' });
         fetchData();
      } catch (err) {
         console.error('Error sending to maintenance', err);
      }
   };

   const handleDeleteVeiculo = async (id: string) => {
      if (!confirm('Deseja realmente excluir este veículo? Esta ação não pode ser desfeita.')) return;
      try {
         await api.delete(`/logistica/veiculos/${id}`);
         fetchData();
      } catch (err) {
         console.error('Error deleting vehicle', err);
         alert('Erro ao excluir veículo. Verifique se ele não está vinculado a nenhuma escala.');
      }
   };

   if (loading && !escalas.length && !veiculos.length) return (
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
                     <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter italic">Logística & Escalas</h1>
                     <p className="text-sm text-slate-500 font-medium italic">Gestão de frota e agendamento de equipes em campo</p>
                  </div>
                  <div className="flex gap-2">
                     <button
                        onClick={handleCreateNew}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 text-xs font-black uppercase italic"
                     >
                        <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" /> {activeTab === 'escala' ? 'Nova Escala' : 'Novo Veículo'}
                     </button>
                  </div>
               </div>

               <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
                  <div className="bg-slate-50 p-2 flex gap-2 border-b border-slate-200">
                     <button
                        onClick={() => setActiveTab('escala')}
                        className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'escala' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                     >
                        Escala de Trabalho
                     </button>
                     <button
                        onClick={() => setActiveTab('frota')}
                        className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'frota' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                     >
                        Controle de Frota
                     </button>
                  </div>

                  <div className="flex-1 overflow-auto">
                     {activeTab === 'escala' ? (
                        <table className="w-full text-left text-sm">
                           <thead className="bg-slate-800 text-white border-b border-slate-700">
                              <tr>
                                 <th className="px-4 py-4 font-black uppercase text-[10px] tracking-widest italic">Ações</th>
                                 <th className="px-4 py-4 font-black uppercase text-[10px] tracking-widest italic">OS</th>
                                 <th className="px-4 py-4 font-black uppercase text-[10px] tracking-widest italic">Empresa</th>
                                 <th className="px-4 py-4 font-black uppercase text-[10px] tracking-widest italic">Cliente</th>
                                 <th className="px-4 py-4 font-black uppercase text-[10px] tracking-widest italic">Data</th>
                                 <th className="px-4 py-4 font-black uppercase text-[10px] tracking-widest italic">Equipamento</th>
                                 <th className="px-4 py-4 font-black uppercase text-[10px] tracking-widest italic">Veículos</th>
                                 <th className="px-4 py-4 font-black uppercase text-[10px] tracking-widest italic">Status</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                              {escalas.map(escala => (
                                 <tr key={escala.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-4 py-3">
                                       <div className="flex gap-1">
                                          <button onClick={() => handleEdit(escala)} className="p-2 text-slate-300 hover:text-blue-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-100"><Settings className="w-3.5 h-3.5" /></button>
                                          <button className="p-2 text-slate-300 hover:text-blue-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-100"><X className="w-3.5 h-3.5" /></button>
                                       </div>
                                    </td>
                                    <td className="px-4 py-3 font-black text-slate-700 uppercase italic tracking-tighter">{escala.codigoOS}</td>
                                    <td className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-tighter italic">{escala.empresa}</td>
                                    <td className="px-4 py-3 font-black text-slate-800 uppercase italic tracking-tighter leading-none">
                                       {escala.cliente?.nome}
                                       <p className="text-[9px] text-slate-400 font-bold lowercase mt-1 tracking-normal">{escala.cliente?.email}</p>
                                    </td>
                                    <td className="px-4 py-3 font-black text-[10px] uppercase italic tracking-widest text-slate-600">
                                       {new Date(escala.data).toLocaleDateString('pt-BR')}
                                       <span className="block text-blue-500">{escala.hora}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                       <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border border-slate-200 italic">
                                          {escala.equipamento}
                                       </span>
                                    </td>
                                    <td className="px-4 py-3">
                                       <div className="flex items-center gap-1.5 text-slate-700 font-black text-[10px] uppercase italic tracking-tighter">
                                          <Truck className="w-3.5 h-3.5 text-slate-400" /> {escala.veiculo?.placa || escala.veiculo?.modelo}
                                       </div>
                                    </td>
                                    <td className="px-4 py-3">
                                       <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${escala.status === 'CONCLUIDO' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                                          }`}>
                                          {escala.status}
                                       </span>
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     ) : (
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                           {veiculos.map(v => (
                              <div key={v.id} className="bg-white border border-slate-200 rounded-3xl p-6 hover:shadow-2xl transition-all group relative overflow-hidden flex flex-col">
                                 <div className="absolute top-0 right-0 p-6">
                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm ${v.status === 'DISPONIVEL' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-500/10' :
                                       v.status === 'EM_USO' ? 'bg-blue-50 text-blue-600 border-blue-100 shadow-blue-500/10' :
                                          'bg-slate-800 text-white border-slate-700 shadow-slate-500/10'
                                       }`}>
                                       {v.status}
                                    </span>
                                 </div>
                                 <div className="flex items-center gap-5 mb-6">
                                    <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                                       <Truck className="w-7 h-7" />
                                    </div>
                                    <div>
                                       <h3 className="font-black text-slate-800 uppercase italic leading-none text-lg tracking-tighter">{v.placa}</h3>
                                       <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">{v.modelo} • {v.marca}</p>
                                    </div>
                                 </div>

                                 <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100 shadow-inner">
                                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 italic">KM Atual</label>
                                       <div className="flex items-center gap-2">
                                          <Gauge className="w-3.5 h-3.5 text-blue-500" />
                                          <span className="font-black text-sm text-slate-700 tracking-tighter italic">{v.kmAtual.toLocaleString('pt-BR')} KM</span>
                                       </div>
                                    </div>
                                    <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100 shadow-inner">
                                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 italic">Combustível</label>
                                       <div className="flex items-center gap-2">
                                          <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
                                             <div
                                                className={`h-full rounded-full transition-all duration-1000 ${Number(v.nivelCombustivel) > 50 ? 'bg-emerald-500' :
                                                   Number(v.nivelCombustivel) > 20 ? 'bg-blue-600' : 'bg-slate-800'
                                                   }`}
                                                style={{ width: `${v.nivelCombustivel}%` }}
                                             ></div>
                                          </div>
                                          <span className="font-black text-[10px] text-slate-700 italic">{Math.round(v.nivelCombustivel)}%</span>
                                       </div>
                                    </div>
                                 </div>

                                 <div className="mt-auto pt-4 border-t border-slate-50 flex gap-2">
                                    <button onClick={() => handleEdit(v)} className="flex-1 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 text-slate-600 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase italic tracking-widest transition-all shadow-sm flex items-center justify-center gap-2">
                                       <Settings className="w-3.5 h-3.5" /> Detalhes
                                    </button>
                                    {v.status !== 'MANUTENCAO' ? (
                                       <button
                                          onClick={() => setMaintModal({ open: true, veiculo: v, descricao: '', prioridade: 'MEDIA' })}
                                           className="flex-1 bg-slate-800 hover:bg-slate-900 text-white px-3 py-2.5 rounded-xl text-[10px] font-black uppercase italic tracking-widest transition-all shadow-lg shadow-slate-500/20 flex items-center justify-center gap-2"
                                       >
                                          <Wrench className="w-3.5 h-3.5" /> Oficina
                                       </button>
                                    ) : (
                                       <button
                                          onClick={() => handleDeleteVeiculo(v.id)}
                                          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase italic tracking-widest transition-all flex items-center justify-center gap-2"
                                       >
                                          <X className="w-3.5 h-3.5" /> Excluir
                                       </button>
                                    )}
                                 </div>
                              </div>
                           ))}
                        </div>
                     )}
                  </div>
               </div>
            </>
         ) : (
            <div className="flex flex-col h-full bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
               <div className="bg-blue-600 border-b border-slate-200 p-8 flex items-center justify-between italic">
                  <div className="flex items-center gap-3 text-white">
                     <ClipboardList className="w-6 h-6" />
                     <h2 className="text-xl font-black uppercase tracking-tighter">{selectedItem.id ? 'Edição de Cadastro' : (activeTab === 'escala' ? 'Abertura de Escala' : 'Cadastro de Veículo')}</h2>
                  </div>
                  <div className="flex items-center gap-4">
                     <button onClick={() => { setIsEditing(false); setSelectedItem(null); }} className="px-6 py-2 text-[10px] font-black uppercase text-white/70 hover:text-white transition-colors tracking-widest">Descartar</button>
                     <button onClick={handleSave} className="bg-white text-blue-600 px-10 py-3.5 rounded-2xl flex items-center gap-2 hover:bg-slate-50 transition-all shadow-2xl text-[10px] font-black uppercase italic tracking-widest"><Save className="w-5 h-5" /> Confirmar e Salvar</button>
                  </div>
               </div>

               <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-slate-50/50">
                  {activeTab === 'escala' ? (
                     <div className="space-y-12 max-w-5xl mx-auto">
                        <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm space-y-8 relative overflow-hidden">
                           <div className="absolute top-0 left-0 w-2 h-full bg-blue-900"></div>
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                              <div className="space-y-2">
                                 <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">Código OS Vinculada</label>
                                 <input
                                    type="text"
                                    className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-700 transition-all"
                                    value={selectedItem.codigoOS || ''}
                                    onChange={e => setSelectedItem({ ...selectedItem, codigoOS: e.target.value })}
                                    placeholder="Ex: OS-2024-001"
                                 />
                              </div>
                              <div className="space-y-2">
                                 <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">Data Programada</label>
                                 <input
                                    type="date"
                                    className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-600 transition-all"
                                    value={selectedItem.data ? new Date(selectedItem.data).toISOString().split('T')[0] : ''}
                                    onChange={e => setSelectedItem({ ...selectedItem, data: e.target.value })}
                                 />
                              </div>
                              <div className="space-y-2">
                                 <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">Horário Previsto</label>
                                 <input
                                    type="time"
                                    className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-600 transition-all"
                                    value={selectedItem.hora || ''}
                                    onChange={e => setSelectedItem({ ...selectedItem, hora: e.target.value })}
                                 />
                              </div>
                           </div>

                           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div className="space-y-2">
                                 <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">Empresa Executora</label>
                                 <select
                                    className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-xl px-4 py-3.5 text-sm font-bold outline-none focus:border-blue-600 transition-all appearance-none cursor-pointer"
                                    value={selectedItem.empresa || ''}
                                    onChange={e => setSelectedItem({ ...selectedItem, empresa: e.target.value })}
                                 >
                                    <option value="NACIONAL HIDROSANEAMENTO EIRELI EPP">NACIONAL HIDROSANEAMENTO</option>
                                 </select>
                              </div>
                              <div className="space-y-2">
                                 <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">Cliente / Base</label>
                                 <select
                                    className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-xl px-4 py-3.5 text-sm font-bold outline-none focus:border-blue-600 transition-all appearance-none cursor-pointer"
                                    value={selectedItem.clienteId || ''}
                                    onChange={e => setSelectedItem({ ...selectedItem, clienteId: e.target.value })}
                                 >
                                    <option value="">Selecione o cliente...</option>
                                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nome.toUpperCase()}</option>)}
                                 </select>
                              </div>
                           </div>

                           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div className="space-y-2">
                                 <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">Equipamento Requerido</label>
                                 <input
                                    type="text"
                                    className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-600 transition-all"
                                    value={selectedItem.equipamento || ''}
                                    onChange={e => setSelectedItem({ ...selectedItem, equipamento: e.target.value })}
                                    placeholder="Ex: Bomba de Vácuo"
                                 />
                              </div>
                              <div className="space-y-2">
                                 <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">Veículo Alocado</label>
                                 <select
                                    className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-xl px-4 py-3.5 text-sm font-bold outline-none focus:border-blue-600 transition-all appearance-none cursor-pointer"
                                    value={selectedItem.veiculoId || ''}
                                    onChange={e => setSelectedItem({ ...selectedItem, veiculoId: e.target.value })}
                                 >
                                    <option value="">Selecione o veículo...</option>
                                    {veiculos.map(v => <option key={v.id} value={v.id} disabled={v.status === 'MANUTENCAO'}>{v.placa} - {v.modelo} ({v.status})</option>)}
                                 </select>
                              </div>
                           </div>

                           <div className="space-y-4 pt-4 border-t border-slate-100">
                              <div>
                                 <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest block mb-1">Equipe Escalada Atual</label>
                                 <div className="flex flex-wrap gap-2">
                                    {Array.isArray(selectedItem.funcionarios) && selectedItem.funcionarios.length > 0 ? (
                                       selectedItem.funcionarios.map((nome: string) => (
                                          <span key={nome} className="px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold rounded-lg uppercase tracking-tight">
                                             {nome}
                                          </span>
                                       ))
                                    ) : (
                                       <span className="text-xs text-slate-500 italic">Nenhuma equipe escalada</span>
                                    )}
                                 </div>
                              </div>

                              <div className="space-y-2">
                                 <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest block">Disponibilidade de Funcionários (Selecione Cliente e Data primeiro)</label>
                                 {selectedItem.clienteId && selectedItem.data ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {teamAvailability.map(func => {
                                          const isSelected = Array.isArray(selectedItem.funcionarios) && selectedItem.funcionarios.includes(func.nome);
                                          const isUnavailable = func.disponibilidade === 'INDISPONIVEL';
                                          
                                          // Document validation
                                          const docStatus = func.linkStatus || 'OK'; // OK | VENCENDO | VENCIDO | INEXISTENTE
                                          const isBlockedByDoc = docStatus === 'VENCIDO' || docStatus === 'INEXISTENTE';

                                          let badgeCfg = { bg: 'bg-slate-100', text: 'text-slate-500', label: 'Disponível' };
                                          if (func.disponibilidade === 'INDISPONIVEL') badgeCfg = { bg: 'bg-slate-200 border border-slate-300', text: 'text-slate-700', label: func.motivo || 'Indisponível' };
                                          else if (func.disponibilidade === 'ALERTA') badgeCfg = { bg: 'bg-blue-50 border border-blue-200', text: 'text-blue-700', label: func.motivo || 'Atenção' };

                                          // Document badge
                                          let docBadge = null;
                                          if (docStatus === 'VENCENDO') {
                                             docBadge = <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-blue-100/50 border border-blue-200 text-blue-900" title={func.statusMessage}>⚠️ Doc. Vencendo</span>;
                                          } else if (docStatus === 'VENCIDO' || docStatus === 'INEXISTENTE') {
                                             docBadge = <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-slate-200/50 border border-slate-300 text-slate-800" title={func.statusMessage}>⛔ Doc. Inválido</span>;
                                          }

                                          return (
                                             <button
                                                key={func.id}
                                                type="button"
                                                disabled={isUnavailable}
                                                onClick={() => {
                                                   if (isBlockedByDoc && !isSelected) {
                                                      setDocWarning({ 
                                                         open: true, 
                                                         data: { 
                                                            funcionario: func, 
                                                            message: func.statusMessage 
                                                         } 
                                                      });
                                                      return;
                                                   }
                                                   toggleFuncionario(func.nome, isUnavailable);
                                                }}
                                                className={`flex flex-col items-start p-3 rounded-2xl border text-left transition-all ${isUnavailable ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200' :
                                                   isSelected ? 'bg-blue-50 border-blue-400 shadow-inner' : 
                                                   isBlockedByDoc ? 'bg-red-50/50 border-red-200' : 'bg-white border-slate-200 hover:border-slate-300'
                                                   }`}
                                             >
                                                <div className="flex items-center justify-between w-full mb-1">
                                                   <span className={`text-xs font-black uppercase tracking-tight ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
                                                      {func.nome}
                                                   </span>
                                                   <div className={`w-3 h-3 rounded-full border ${isSelected ? 'bg-blue-500 border-blue-600 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]' : 'bg-white border-slate-300'}`} />
                                                </div>
                                                <span className="text-[10px] text-slate-500 font-bold mb-2">{func.cargo || 'Funcionário'}</span>
                                                <div className="flex gap-1 flex-wrap mt-auto">
                                                   <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${badgeCfg.bg} ${badgeCfg.text}`}>
                                                      {badgeCfg.label}
                                                   </span>
                                                   {docBadge}
                                                </div>
                                             </button>
                                          );
                                       })}
                                       {teamAvailability.length === 0 && (
                                          <div className="col-span-full p-4 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                             Nenhum funcionário encontrado.
                                          </div>
                                       )}
                                    </div>
                                 ) : (
                                    <div className="p-4 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                       Preencha Data e Cliente para visualizar os funcionários e suas disponibilidades.
                                    </div>
                                 )}
                              </div>
                           </div>

                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">Instruções Adicionais / Observações</label>
                              <textarea
                                 className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl p-6 text-sm min-h-[150px] outline-none focus:border-blue-600 font-bold tracking-tight transition-all"
                                 value={selectedItem.observacoes || ''}
                                 onChange={e => setSelectedItem({ ...selectedItem, observacoes: e.target.value })}
                                 placeholder="Detalhes sobre acesso, equipe e riscos..."
                              ></textarea>
                           </div>
                        </div>
                     </div>
                  ) : (
                     <div className="max-w-4xl mx-auto space-y-10">
                        <div className="bg-white p-12 rounded-[3rem] border-2 border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-10">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest block">Placa de Identificação</label>
                              <input
                                 type="text"
                                 className="w-full bg-slate-50 border-b-4 border-slate-100 rounded-2xl px-6 py-4 text-2xl font-black uppercase italic tracking-widest outline-none focus:border-blue-600 transition-all"
                                 value={selectedItem.placa || ''}
                                 onChange={e => setSelectedItem({ ...selectedItem, placa: e.target.value.toUpperCase() })}
                                 placeholder="AAA-0000"
                              />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest block">Nível de Combustível (%)</label>
                              <div className="flex items-center gap-6">
                                 <input
                                    type="range"
                                    min="0" max="100"
                                    className="flex-1 accent-blue-600 h-2 bg-slate-100 rounded-full appearance-none cursor-pointer"
                                    value={selectedItem.nivelCombustivel || 0}
                                    onChange={e => setSelectedItem({ ...selectedItem, nivelCombustivel: Number(e.target.value) })}
                                 />
                                 <span className="text-3xl font-black italic text-blue-600 min-w-[80px]">{Math.round(selectedItem.nivelCombustivel || 0)}%</span>
                              </div>
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest block">Marca / Fabricante</label>
                              <input
                                 type="text"
                                 className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-6 py-3 text-sm font-bold outline-none focus:border-blue-600 transition-all font-black uppercase italic"
                                 value={selectedItem.marca || ''}
                                 onChange={e => setSelectedItem({ ...selectedItem, marca: e.target.value })}
                                 placeholder="Ex: Mercedes-Benz"
                              />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest block">Modelo Comercial</label>
                              <input
                                 type="text"
                                 className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-6 py-3 text-sm font-bold outline-none focus:border-blue-600 transition-all font-black uppercase italic"
                                 value={selectedItem.modelo || ''}
                                 onChange={e => setSelectedItem({ ...selectedItem, modelo: e.target.value })}
                                 placeholder="Ex: Actros 2548"
                              />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest block">Quilometragem (KM)</label>
                              <input
                                 type="number"
                                 className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-6 py-3 text-sm font-bold outline-none focus:border-blue-600 transition-all font-black italic"
                                 value={selectedItem.kmAtual || 0}
                                 onChange={e => setSelectedItem({ ...selectedItem, kmAtual: Number(e.target.value) })}
                              />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest block">Tipo de Veículo</label>
                              <select
                                 className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-6 py-3 text-sm font-bold outline-none focus:border-blue-600 transition-all font-black uppercase italic cursor-pointer"
                                 value={selectedItem.tipo || 'CAMINHAO'}
                                 onChange={e => setSelectedItem({ ...selectedItem, tipo: e.target.value })}
                              >
                                 <option value="CAMINHAO TOCO">CAMINHÃO TOCO</option>
                                 <option value="CAMINHAO TRUCK">CAMINHÃO TRUCK</option>
                                 <option value="CAVALO MECANICO">CAVALO MECÂNICO</option>
                                 <option value="CARRETA">CARRETA</option>
                                 <option value="UTILITARIO">UTILITÁRIO</option>
                                 <option value="CARRO">CARRO DE APOIO</option>
                                 <option value="OUTRO">OUTRO</option>
                              </select>
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest block">Disponibilidade Operacional</label>
                              <select
                                 className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-6 py-3 text-sm font-bold outline-none focus:border-blue-600 transition-all font-black uppercase italic cursor-pointer text-emerald-600"
                                 value={selectedItem.status || 'DISPONIVEL'}
                                 onChange={e => setSelectedItem({ ...selectedItem, status: e.target.value })}
                              >
                                 <option value="DISPONIVEL">✅ DISPONÍVEL</option>
                                 <option value="EM_USO">🔵 EM OPERAÇÃO</option>
                                 <option value="MANUTENCAO">🟠 EM MANUTENÇÃO</option>
                              </select>
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest block">Tipo de Equipamento</label>
                              <select
                                 className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-6 py-3 text-sm font-bold outline-none focus:border-blue-600 transition-all font-black uppercase italic cursor-pointer"
                                 value={selectedItem.tipoEquipamento || ''}
                                 onChange={e => setSelectedItem({ ...selectedItem, tipoEquipamento: e.target.value })}
                              >
                                 <option value="">Nenhum</option>
                                 <option value="HIDROJATO">🔵 Hidrojato</option>
                                 <option value="VACUO">🟢 Vácuo</option>
                                 <option value="CARRETA">🟠 Carreta</option>
                                 <option value="CARRO_APOIO">🟣 Carro Apoio</option>
                              </select>
                           </div>
                           <div className="md:col-span-2">
                              <label className="flex items-center gap-4 cursor-pointer group p-4 bg-blue-50 rounded-2xl border-2 border-blue-100 hover:border-blue-300 transition-all">
                                 <input
                                    type="checkbox"
                                    checked={selectedItem.exibirNaEscala !== false}
                                    onChange={e => setSelectedItem({ ...selectedItem, exibirNaEscala: e.target.checked })}
                                    className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 accent-blue-600"
                                 />
                                 <div>
                                    <span className="text-sm font-black text-blue-700 uppercase italic tracking-tight">Exibir na Escala</span>
                                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">Quando ativo, este veículo aparecerá na grade de pré-reservas e agendamentos da Escala.</p>
                                 </div>
                              </label>
                           </div>
                        </div>
                     </div>
                  )}
               </div>
            </div>
         )}

         {/* Modal Enviar Manutenção */}
         {maintModal.open && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
               <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
                  <div className="bg-slate-800 p-8 flex items-center gap-4 italic">
                     <Wrench className="w-8 h-8 text-white" />
                     <div>
                        <h2 className="font-black uppercase tracking-tighter text-white text-lg leading-none">Abertura de Oficina</h2>
                        <p className="text-[10px] text-white/70 font-bold uppercase mt-1 tracking-widest">Veículo: {maintModal.veiculo?.placa}</p>
                     </div>
                  </div>

                  <div className="p-10 space-y-6">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest block font-black">Descrição do Defeito / Serviço</label>
                        <textarea
                           className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm min-h-[120px] outline-none focus:border-blue-900 font-bold transition-all"
                           placeholder="Descreva o problema apresentado..."
                           value={maintModal.descricao}
                           onChange={e => setMaintModal({ ...maintModal, descricao: e.target.value })}
                        ></textarea>
                     </div>

                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest block">Grau de Prioridade</label>
                        <div className="grid grid-cols-3 gap-2">
                           {['BAIXA', 'MEDIA', 'ALTA'].map(p => (
                              <button
                                 key={p}
                                 onClick={() => setMaintModal({ ...maintModal, prioridade: p })}
                                 className={`py-2.5 rounded-xl text-[10px] font-black uppercase italic border-2 transition-all ${maintModal.prioridade === p ? 'bg-slate-800 border-slate-800 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'
                                    }`}
                              >
                                 {p}
                              </button>
                           ))}
                        </div>
                     </div>
                  </div>

                  <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                     <button onClick={() => setMaintModal({ ...maintModal, open: false })} className="px-6 py-3 text-[10px] font-black uppercase text-slate-400 hover:text-slate-800 transition-all italic">Cancelar</button>
                     <button
                        onClick={handleSendToMaint}
                        className="bg-slate-800 hover:bg-slate-900 text-white px-10 py-3.5 rounded-2xl flex items-center gap-2 transition-all shadow-xl shadow-slate-500/20 text-[10px] font-black uppercase italic tracking-widest"
                     >
                        <Send className="w-5 h-5" /> Enviar para Manutenção
                     </button>
                  </div>
               </div>
            </div>
         )}

         {/* Modal Aviso Documentação (T09) */}
         {docWarning.open && (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
               <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border-4 border-red-500">
                  <div className="bg-red-500 p-8 flex items-center gap-6 italic">
                     <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-white">
                        <X className="w-10 h-10" />
                     </div>
                     <div>
                        <h2 className="font-black uppercase tracking-tighter text-white text-2xl leading-none">Aviso de Pendência</h2>
                        <p className="text-xs text-white/80 font-bold uppercase mt-1 tracking-widest">Segurança & Conformidade RH</p>
                     </div>
                  </div>

                  <div className="p-10 space-y-6">
                     <p className="text-slate-500 font-bold text-sm leading-relaxed italic">
                        O funcionário <span className="text-red-600 font-black uppercase underline">{docWarning.data?.funcionario?.nome}</span> possui a seguinte irregularidade detectada:
                     </p>
                     
                     <div className="bg-red-50 p-6 rounded-3xl border-2 border-red-100 flex items-start gap-4">
                        <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                        <p className="text-red-700 font-black uppercase text-xs italic tracking-tight">{docWarning.data?.message}</p>
                     </div>

                     <div className="bg-slate-50 p-4 rounded-2xl text-[10px] text-slate-400 font-bold uppercase italic leading-tight">
                        A escalação deste colaborador sem a documentação em dia pode gerar multas e riscos jurídicos para a Nacional Hidro.
                     </div>
                  </div>

                  <div className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col gap-3">
                     <button
                        onClick={() => {
                           toggleFuncionario(docWarning.data.funcionario.nome, false);
                           setDocWarning({ open: false, data: null });
                        }}
                        className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-red-500/20 text-xs font-black uppercase italic tracking-widest"
                     >
                        <Save className="w-5 h-5" /> Entendo o Risco e Desejo Escalar
                     </button>
                     <button 
                        onClick={() => setDocWarning({ open: false, data: null })} 
                        className="w-full py-3 text-xs font-black uppercase text-slate-400 hover:text-slate-800 transition-all italic tracking-widest"
                     >
                        Cancelar e Escolher Outro
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
}
