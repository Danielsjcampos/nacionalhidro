import { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  Plus, Loader2, FileText, ChevronRight, Save, X, Clock
} from 'lucide-react';

export default function OS() {
  const [osList, setOsList] = useState<any[]>([]);
  const [propostas, setPropostas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedOS, setSelectedOS] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'servicos' | 'escala'>('servicos');
  
  // Form State
  const [formData, setFormData] = useState<any>({
    servicos: [],
    status: 'ABERTA',
    prioridade: 'MEDIA',
    empresa: 'NACIONAL HIDROSANEAMENTO EIRELI EPP',
    dataInicial: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const [osRes, propsRes] = await Promise.all([
        axios.get(`http://localhost:3000/os`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`http://localhost:3000/propostas`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setOsList(osRes.data);
      setPropostas(propsRes.data);
    } catch (err) {
      console.error('Failed to fetch OS data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateNew = () => {
    setSelectedOS({ novo: true });
    setFormData({
      codigo: '',
      dataInicial: new Date().toISOString().split('T')[0],
      horaInicial: '',
      tipoCobranca: 'Cobrança',
      empresa: 'NACIONAL HIDROSANEAMENTO EIRELI EPP',
      servicos: [],
      status: 'ABERTA'
    });
    setIsEditing(true);
  };

  const handleEdit = async (os: any) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:3000/os/${os.id}`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      const data = res.data;
      setSelectedOS(data);
      setFormData({
        ...data,
        dataInicial: new Date(data.dataInicial).toISOString().split('T')[0],
        entrada: data.entrada ? new Date(data.entrada).toISOString().slice(0, 16) : '',
        saida: data.saida ? new Date(data.saida).toISOString().slice(0, 16) : '',
        almoco: data.almoco ? new Date(data.almoco).toISOString().slice(0, 16) : '',
        servicos: data.servicos || []
      });
      setIsEditing(true);
    } catch (err) {
      console.error('Error fetching OS details', err);
    } finally {
      setLoading(false);
    }
  };

  const addServico = () => {
    setFormData({
      ...formData,
      servicos: [...formData.servicos, { equipamento: '', descricao: '' }]
    });
  };

  const removeServico = (index: number) => {
    const newServ = [...formData.servicos];
    newServ.splice(index, 1);
    setFormData({ ...formData, servicos: newServ });
  };

  const updateServico = (index: number, field: string, value: any) => {
    const newServ = [...formData.servicos];
    newServ[index] = { ...newServ[index], [field]: value };
    setFormData({ ...formData, servicos: newServ });
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      if (selectedOS.novo) {
        await axios.post('http://localhost:3000/os', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.patch(`http://localhost:3000/os/${selectedOS.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setIsEditing(false);
      fetchData();
    } catch (err) {
      console.error('Error saving OS', err);
    }
  };

  const onProposalChange = (propId: string) => {
    const prop = propostas.find(p => p.id === propId);
    if (prop) {
      setFormData({
        ...formData,
        propostaId: prop.id,
        clienteId: prop.clienteId,
        contato: prop.contato || '',
        servicos: prop.itens?.map((i: any) => ({
          equipamento: i.equipamento,
          descricao: `Serviço referente a ${i.equipamento}`
        })) || []
      });
    } else {
      setFormData({ ...formData, propostaId: '', clienteId: '', contato: '', servicos: [] });
    }
  };

  if (loading && !osList.length) return (
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
              <h1 className="text-2xl font-bold text-slate-800 italic">Gestão de Ordens de Serviço</h1>
              <p className="text-sm text-slate-500">Acompanhamento de execuções e medições em campo</p>
            </div>
            <button 
              onClick={handleCreateNew}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 text-sm font-bold uppercase italic"
            >
              <Plus className="w-4 h-4" /> Abertura de OS
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-bold text-slate-700 uppercase tracking-tighter italic">Código</th>
                    <th className="px-6 py-4 font-bold text-slate-700 uppercase tracking-tighter italic">Cliente</th>
                    <th className="px-6 py-4 font-bold text-slate-700 uppercase tracking-tighter italic">Data Inicial</th>
                    <th className="px-6 py-4 font-bold text-slate-700 uppercase tracking-tighter italic">Equipamentos</th>
                    <th className="px-6 py-4 font-bold text-slate-700 uppercase tracking-tighter italic">Status</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {osList.map((os) => (
                    <tr 
                      key={os.id} 
                      onClick={() => handleEdit(os)}
                      className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4 font-bold text-blue-600 italic">{os.codigo}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{os.cliente?.nome}</span>
                          <span className="text-[10px] text-slate-400 uppercase tracking-widest">{os.contato}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {new Date(os.dataInicial).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {os.servicos?.slice(0, 2).map((s: any, i: number) => (
                            <span key={i} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">
                              {s.equipamento}
                            </span>
                          ))}
                          {os.servicos?.length > 2 && <span className="text-[10px] text-slate-400">+{os.servicos.length - 2}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${
                          os.status === 'CONCLUIDA' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          os.status === 'EM_EXECUCAO' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                          'bg-slate-50 text-slate-500 border-slate-200'
                        }`}>
                          {os.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors ml-auto" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col h-full bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
          {/* Header OS */}
          <div className="bg-slate-100/50 border-b border-slate-200 p-6 flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter italic">Abertura de OS</h2>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-xs font-bold uppercase text-slate-500 hover:text-red-500 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                className="bg-slate-800 hover:bg-slate-900 text-white px-8 py-3 rounded-xl flex items-center gap-2 transition-all shadow-xl shadow-slate-200 text-xs font-black uppercase italic"
              >
                <Save className="w-4 h-4" /> Salvar OS
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
            
            {/* Form Top Row */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
               <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase italic">N° Proposta</label>
                  <select 
                    value={formData.propostaId || ''}
                    onChange={(e) => onProposalChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione...</option>
                    {propostas.map(p => <option key={p.id} value={p.id}>{p.codigo}</option>)}
                  </select>
               </div>
               <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase italic">Código OS</label>
                  <input 
                    type="text" 
                    value={formData.codigo}
                    onChange={(e) => setFormData({...formData, codigo: e.target.value})}
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-bold outline-none text-slate-500"
                    placeholder="Auto-gerado"
                  />
               </div>
               <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase italic">Data Inicial</label>
                  <input 
                    type="date" 
                    value={formData.dataInicial}
                    onChange={(e) => setFormData({...formData, dataInicial: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                  />
               </div>
               <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase italic">Hora Inicial</label>
                  <div className="relative">
                    <input 
                      type="time" 
                      value={formData.horaInicial}
                      onChange={(e) => setFormData({...formData, horaInicial: e.target.value})}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Clock className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                  </div>
               </div>
               <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase italic">Tipo Cobrança</label>
                  <select 
                    value={formData.tipoCobranca}
                    onChange={(e) => setFormData({...formData, tipoCobranca: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 border-red-200"
                  >
                    <option value="Cobrança">Cobrança</option>
                    <option value="Cortesia">Cortesia</option>
                  </select>
               </div>
               <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase italic">Empresa</label>
                  <select 
                    value={formData.empresa}
                    onChange={(e) => setFormData({...formData, empresa: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="NACIONAL HIDROSANEAMENTO EIRELI EPP">NACIONAL HIDROSANEAMENTO EIRELI EPP</option>
                  </select>
               </div>
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase italic">Dias da semana</label>
                  <select className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                    <option value="DIAS">DIAS</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase italic">Quantidade p/ dia</label>
                  <input 
                    type="text" 
                    placeholder="Quantidade p/ dia"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
            </div>

            {/* Client Context */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="space-y-1 md:col-span-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase italic">Cliente</label>
                  <input 
                    type="text" 
                    readOnly 
                    value={propostas.find(p => p.id === formData.propostaId)?.cliente?.nome || ''}
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-black text-slate-500 uppercase tracking-tighter"
                    placeholder="Selecione a Proposta..."
                  />
               </div>
               <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase italic">Contato</label>
                  <input 
                    type="text" 
                    value={formData.contato}
                    onChange={(e) => setFormData({...formData, contato: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nome do contato"
                  />
               </div>
               <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase italic">Acompanhante</label>
                  <input 
                    type="text" 
                    value={formData.acompanhante || ''}
                    onChange={(e) => setFormData({...formData, acompanhante: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Acompanhante"
                  />
               </div>
            </div>

            {/* Tabs & Content */}
            <div className="space-y-4">
               <div className="flex gap-1">
                  <button 
                    onClick={() => setActiveTab('servicos')}
                    className={`px-6 py-2 rounded-t-lg text-[10px] font-black uppercase transition-all tracking-widest border-t border-l border-r ${activeTab === 'servicos' ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-50 border-transparent text-slate-400'}`}
                  >
                    Serviços
                  </button>
                  <button 
                    onClick={() => setActiveTab('escala')}
                    className={`px-6 py-2 rounded-t-lg text-[10px] font-black uppercase transition-all tracking-widest border-t border-l border-r ${activeTab === 'escala' ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-50 border-transparent text-slate-400'}`}
                  >
                    Escala
                  </button>
               </div>

               <div className="border border-slate-200 rounded-2xl rounded-tl-none p-6 bg-white min-h-[200px] space-y-6">
                  {activeTab === 'servicos' ? (
                    <div className="space-y-4">
                       <h3 className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2 tracking-widest">
                         <ChevronRight className="w-3 h-3 text-blue-500" /> Serviços Selecionados
                       </h3>
                       <div className="space-y-4">
                          {formData.servicos.map((s: any, idx: number) => (
                            <div key={idx} className="flex gap-4 items-start group">
                               <div className="flex-1 space-y-3">
                                  <div className="space-y-1">
                                     <label className="text-[9px] font-bold text-slate-500 uppercase">Equipamento</label>
                                     <select 
                                        value={s.equipamento}
                                        onChange={(e) => updateServico(idx, 'equipamento', e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-black border-red-200"
                                     >
                                        <option value="">Selecione...</option>
                                        <option value="BOMBA HIDRAULICA">BOMBA HIDRÁULICA</option>
                                        <option value="MOTOR ELETRICO">MOTOR ELÉTRICO</option>
                                     </select>
                                  </div>
                                  <div className="space-y-1">
                                     <label className="text-[9px] font-bold text-slate-500 uppercase">Descrição do serviço</label>
                                     <input 
                                        type="text" 
                                        value={s.descricao}
                                        onChange={(e) => updateServico(idx, 'descricao', e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium border-red-200"
                                        placeholder="Discriminação do serviço..."
                                     />
                                  </div>
                               </div>
                               <button 
                                 onClick={() => removeServico(idx)}
                                 className="mt-6 p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                               >
                                  <X className="w-5 h-5" />
                               </button>
                            </div>
                          ))}
                          <button 
                            onClick={addServico}
                            className="text-blue-600 font-black text-[10px] uppercase tracking-widest hover:underline pt-2 inline-block"
                          >
                            + Adicionar Serviço
                          </button>
                       </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-12 text-slate-400 italic text-sm">
                       Módulo de Escala Técnica em desenvolvimento...
                    </div>
                  )}
               </div>
            </div>

            {/* Observations */}
            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase italic">Observações</label>
               <textarea 
                  value={formData.observacoes || ''}
                  onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-xl p-4 text-sm min-h-[120px] outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  placeholder="Observações gerais da OS..."
               />
            </div>

            {/* Measurement Section */}
            <div className="space-y-4 pt-6">
               <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter italic border-b-2 border-slate-800 pb-1">Efetuar Baixa</h3>
               <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  <div className="space-y-1">
                     <label className="text-[9px] font-black text-slate-500 uppercase">Mínimo de Horas</label>
                     <div className="relative">
                        <input 
                          type="number" 
                          value={formData.minimoHoras || ''}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold"
                        />
                        <Clock className="absolute right-3 top-2.5 w-3 h-3 text-slate-400" />
                     </div>
                  </div>
                  <div className="space-y-1">
                     <label className="text-[9px] font-black text-slate-500 uppercase">Entrada</label>
                     <div className="relative">
                        <input 
                          type="datetime-local" 
                          value={formData.entrada || ''}
                          onChange={(e) => setFormData({...formData, entrada: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-[10px] font-bold"
                        />
                        <Clock className="absolute right-2 top-2.5 w-3 h-3 text-slate-400 pointer-events-none" />
                     </div>
                  </div>
                  <div className="space-y-1">
                     <label className="text-[9px] font-black text-slate-500 uppercase">Saída</label>
                     <div className="relative">
                        <input 
                          type="datetime-local" 
                          value={formData.saida || ''}
                          onChange={(e) => setFormData({...formData, saida: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-[10px] font-bold"
                        />
                        <Clock className="absolute right-2 top-2.5 w-3 h-3 text-slate-400 pointer-events-none" />
                     </div>
                  </div>
                  <div className="space-y-1">
                     <label className="text-[9px] font-black text-slate-500 uppercase">Almoço</label>
                     <div className="relative">
                        <input 
                          type="datetime-local" 
                          value={formData.almoco || ''}
                          onChange={(e) => setFormData({...formData, almoco: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-[10px] font-bold"
                        />
                        <Clock className="absolute right-2 top-2.5 w-3 h-3 text-slate-400 pointer-events-none" />
                     </div>
                  </div>
                  <div className="space-y-1">
                     <label className="text-[9px] font-black text-slate-500 uppercase">Horas Totais</label>
                     <input 
                       type="text" 
                       readOnly 
                       className="w-full bg-slate-200 border border-slate-300 rounded-lg px-3 py-2 text-sm font-black text-slate-600"
                       value="---"
                     />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[9px] font-black text-slate-500 uppercase">Horas Adicional</label>
                     <input 
                       type="text" 
                       readOnly 
                       className="w-full bg-slate-200 border border-slate-300 rounded-lg px-3 py-2 text-sm font-black text-slate-600"
                       value="---"
                     />
                  </div>
               </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
