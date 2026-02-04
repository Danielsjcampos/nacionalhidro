import { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  FileText, Plus, Search, Filter, ChevronRight, Save, X, 
  Trash2, Copy, User, 
  Building2, Calendar, DollarSign, Loader2, Wrench, 
  Mail, AlertTriangle
} from 'lucide-react';

export default function Propostas() {
  const [propostas, setPropostas] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedProposta, setSelectedProposta] = useState<any>(null);
  
  // Form State
  const [formData, setFormData] = useState<any>({
    itens: [],
    acessorios: [],
    responsabilidades: [],
    equipe: [],
    status: 'RASCUNHO',
    valorTotal: 0
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const [propsRes, clientsRes] = await Promise.all([
        axios.get(`http://localhost:3000/propostas?search=${searchTerm}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`http://localhost:3000/clientes`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setPropostas(propsRes.data);
      setClientes(clientsRes.data);
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchTerm]);

  const handleCreateNew = () => {
    setSelectedProposta({ novo: true });
    setFormData({
      codigo: `PROP-${new Date().getFullYear()}-000`, // To be set by backend or temp
      dataProposta: new Date().toISOString().split('T')[0],
      dataValidade: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'RASCUNHO',
      itens: [],
      acessorios: [],
      responsabilidades: [
        { tipo: 'CONTRATADO', descricao: '' },
        { tipo: 'CONTRATANTE', descricao: '' }
      ],
      equipe: [],
      valorTotal: 0
    });
    setIsEditing(true);
  };

  const addItem = () => {
    setFormData({
      ...formData,
      itens: [...formData.itens, { equipamento: '', quantidade: 1, valorAcobrar: 0, valorTotal: 0 }]
    });
  };

  const removeItem = (index: number) => {
    const newItems = [...formData.itens];
    newItems.splice(index, 1);
    setFormData({ ...formData, itens: newItems });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.itens];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'quantidade' || field === 'valorAcobrar') {
      const q = field === 'quantidade' ? value : newItems[index].quantidade;
      const v = field === 'valorAcobrar' ? value : newItems[index].valorAcobrar;
      newItems[index].valorTotal = q * v;
    }
    
    setFormData({ ...formData, itens: newItems });
  };

  const handleEdit = async (prop: any) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:3000/propostas/${prop.id}`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      
      const p = res.data;
      setSelectedProposta(p);
      setFormData({
        ...p,
        dataProposta: new Date(p.dataProposta).toISOString().split('T')[0],
        dataValidade: new Date(p.dataValidade).toISOString().split('T')[0],
        itens: p.itens || [],
        acessorios: p.acessorios || [],
        responsabilidades: p.responsabilidades || [],
        equipe: p.equipe || []
      });
      setIsEditing(true);
    } catch (err) {
      console.error('Error fetching proposal details', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      // Calculate total
      const total = formData.itens.reduce((acc: number, item: any) => acc + (parseFloat(item.valorTotal) || 0), 0);
      const dataToSave = { ...formData, valorTotal: total };

      if (selectedProposta.novo) {
        await axios.post('http://localhost:3000/propostas', dataToSave, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.patch(`http://localhost:3000/propostas/${selectedProposta.id}`, dataToSave, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setIsEditing(false);
      fetchData();
    } catch (err) {
      console.error('Error saving proposal', err);
    }
  };

  if (loading && !propostas.length) return (
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
              <h1 className="text-2xl font-bold text-slate-800">Propostas Comerciais</h1>
              <p className="text-sm text-slate-500">Gestão e acompanhamento do ciclo de vendas</p>
            </div>
            <button 
              onClick={handleCreateNew}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 text-sm font-bold uppercase"
            >
              <Plus className="w-4 h-4" /> Nova Proposta
            </button>
          </div>

          <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Buscar por código ou cliente..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-lg py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors border border-slate-100 text-sm font-bold uppercase">
              <Filter className="w-4 h-4" /> Filtros
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-bold text-slate-700">Código</th>
                    <th className="px-6 py-4 font-bold text-slate-700">Cliente</th>
                    <th className="px-6 py-4 font-bold text-slate-700">Vendedor</th>
                    <th className="px-6 py-4 font-bold text-slate-700">Data / Validade</th>
                    <th className="px-6 py-4 font-bold text-slate-700">Valor Total</th>
                    <th className="px-6 py-4 font-bold text-slate-700">Status</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 italic font-medium">
                  {propostas.map((prop) => (
                    <tr 
                      key={prop.id} 
                      onClick={() => handleEdit(prop)}
                      className="hover:bg-slate-50/50 transition-colors cursor-pointer group not-italic"
                    >
                      <td className="px-6 py-4">
                        <span className="font-bold text-blue-600">{prop.codigo}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{prop.cliente?.nome}</span>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider">{prop.cliente?.documento}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">{prop.vendedor || '---'}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Calendar className="w-3 h-3" /> {new Date(prop.dataProposta).toLocaleDateString('pt-BR')}
                          </div>
                          <div className="flex items-center gap-1.5 text-orange-500 font-bold text-[10px]">
                            <AlertTriangle className="w-3 h-3" /> {new Date(prop.dataValidade).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">
                        R$ {parseFloat(prop.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${
                          prop.status === 'ACEITA' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          prop.status === 'ENVIADA' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                          prop.status === 'RECUSADA' ? 'bg-red-50 text-red-600 border-red-100' :
                          'bg-slate-50 text-slate-500 border-slate-200'
                        }`}>
                          {prop.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md" title="Visualizar"><ChevronRight className="w-4 h-4" /></button>
                          <button className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-md" title="Copiar"><Copy className="w-4 h-4" /></button>
                          <button className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col h-full bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Form Header */}
          <div className="bg-slate-800 text-white p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/40">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold uppercase tracking-tight">Cadastro de Proposta</h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-slate-400 font-bold uppercase border-r border-slate-600 pr-3">Código: <span className="text-blue-400">{formData.codigo}</span></span>
                  <span className="text-xs text-slate-400 font-bold uppercase">Status: <span className="text-orange-400">{formData.status}</span></span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-xs font-bold uppercase text-slate-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 text-xs font-black uppercase"
              >
                <Save className="w-4 h-4" /> Salvar Proposta
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar bg-white">
            
            {/* Top Bar: Dates and Salesperson */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1.5"><Calendar className="w-3 h-3 text-blue-500" /> Data Proposta</label>
                  <input 
                    type="date" 
                    value={formData.dataProposta}
                    onChange={(e) => setFormData({...formData, dataProposta: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                  />
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1.5"><Calendar className="w-3 h-3 text-orange-500" /> Data Validade</label>
                  <input 
                    type="date" 
                    value={formData.dataValidade}
                    onChange={(e) => setFormData({...formData, dataValidade: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                  />
               </div>
               <div className="space-y-1.5 col-span-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1.5"><User className="w-3 h-3 text-blue-500" /> Vendedor</label>
                  <select 
                    value={formData.vendedor || ''}
                    onChange={(e) => setFormData({...formData, vendedor: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold appearance-none"
                  >
                    <option value="JOAO SILVA">JOÃO SILVA</option>
                    <option value="CARLOS TECH">CARLOS TECH</option>
                  </select>
               </div>
               <div className="space-y-1.5 col-span-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1.5"><Building2 className="w-3 h-3 text-blue-500" /> Empresa Faturamento</label>
                  <select 
                    value={formData.empresa || ''}
                    onChange={(e) => setFormData({...formData, empresa: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold appearance-none"
                  >
                    <option value="">Selecione...</option>
                    <option value="NACIONAL HIDRO LTDA">NACIONAL HIDRO LTDA</option>
                  </select>
               </div>
            </div>

            {/* Client Context */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <User className="w-4 h-4 text-blue-500" />
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-widest">Contexto do Cliente</h3>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Cliente Parceiro</label>
                    <select 
                      value={formData.clienteId || ''}
                      onChange={(e) => setFormData({...formData, clienteId: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-800 appearance-none"
                    >
                      <option value="">Selecione o Cliente...</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.nome} ({c.documento})</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Contato Direto</label>
                      <input 
                        type="text" 
                        value={formData.contato || ''}
                        onChange={(e) => setFormData({...formData, contato: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        placeholder="Nome do solicitante"
                      />
                    </div>
                    <div className="space-y-1.5 text-right">
                      <label className="text-[10px] font-black text-slate-500 uppercase block">Opções de Envio</label>
                      <label className="flex items-center justify-end gap-2 h-12 cursor-pointer group">
                        <span className="text-[10px] font-bold text-slate-400 group-hover:text-blue-600 transition-colors uppercase">Não enviar p/ cliente</span>
                        <input 
                          type="checkbox" 
                          checked={formData.naoEnviarAoCliente}
                          onChange={(e) => setFormData({...formData, naoEnviarAoCliente: e.target.checked})}
                          className="w-6 h-6 rounded-lg text-blue-600 focus:ring-blue-500"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                 <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Mail className="w-4 h-4 text-emerald-500" />
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-widest">Comunicações</h3>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase flex items-center justify-between">
                    E-mails em CC <span className="text-[9px] lowercase italic text-slate-400">(separar por vírgula)</span>
                  </label>
                  <textarea 
                    value={formData.cc || ''}
                    onChange={(e) => setFormData({...formData, cc: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all min-h-[116px]"
                    placeholder="financeiro@empresa.com, diretoria@empresa.com"
                  />
                </div>
              </div>
            </div>

            {/* Rich Text Areas: Intro & Objective */}
            <div className="grid grid-cols-1 gap-8">
               <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2">Introdução <Plus className="w-3 h-3" /></label>
                  <textarea 
                    value={formData.introducao || ''}
                    onChange={(e) => setFormData({...formData, introducao: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-6 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all min-h-[120px] font-serif leading-relaxed"
                    placeholder="Introdução da proposta..."
                  />
               </div>
               <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2">Objetivo <Plus className="w-3 h-3" /></label>
                  <textarea 
                    value={formData.objetivo || ''}
                    onChange={(e) => setFormData({...formData, objetivo: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-6 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all min-h-[120px]"
                    placeholder="Descreva o objetivo técnico..."
                  />
               </div>
            </div>

            {/* Dynamic Items Table */}
            <div className="space-y-6">
               <div className="flex items-center justify-between border-b-2 border-slate-800 pb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-800 rounded flex items-center justify-center text-white">
                      <Wrench className="w-4 h-4" />
                    </div>
                    <h3 className="font-black text-slate-800 text-sm uppercase tracking-tighter">Detalhamento de Equipamentos & Serviços</h3>
                  </div>
                  <button 
                    onClick={addItem}
                    className="bg-slate-800 text-white px-4 py-1.5 rounded text-[10px] font-black uppercase hover:bg-slate-700 transition-colors"
                  >
                    + Adicionar Equipamento
                  </button>
               </div>

               <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-800 text-white">
                      <tr>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider">Equipamento</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider w-20 text-center">Qtd</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider">Área / Local</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider">Cobrança</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider">Valor Unit.</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider">Uso / Mobilização</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider">Total</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {formData.itens.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-6 py-12 text-center text-slate-400 italic">
                             Clique em "Adicionar Equipamento" para iniciar o detalhamento.
                          </td>
                        </tr>
                      ) : (
                        formData.itens.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-4">
                               <input 
                                 type="text" 
                                 value={item.equipamento}
                                 onChange={(e) => updateItem(idx, 'equipamento', e.target.value)}
                                 className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                                 placeholder="Ex: Bomba X-100"
                               />
                            </td>
                            <td className="px-4 py-4">
                               <input 
                                 type="number" 
                                 value={item.quantidade}
                                 onChange={(e) => updateItem(idx, 'quantidade', parseInt(e.target.value))}
                                 className="w-16 mx-auto bg-white border border-slate-200 rounded-lg px-2 py-2 text-center outline-none focus:ring-2 focus:ring-blue-500"
                               />
                            </td>
                            <td className="px-4 py-4">
                               <input 
                                 type="text" 
                                 value={item.area}
                                 onChange={(e) => updateItem(idx, 'area', e.target.value)}
                                 className="w-32 bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-[11px]"
                                 placeholder="Área de atuação"
                               />
                            </td>
                            <td className="px-4 py-4">
                               <select 
                                 value={item.tipoCobranca || ''}
                                 onChange={(e) => updateItem(idx, 'tipoCobranca', e.target.value)}
                                 className="bg-white border border-slate-200 rounded-lg px-2 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-[11px]"
                               >
                                  <option value="VENDA">VENDA</option>
                                  <option value="DIARIA">DIÁRIA</option>
                                  <option value="HORA">HORA</option>
                               </select>
                            </td>
                            <td className="px-4 py-4">
                               <div className="relative">
                                  <span className="absolute left-2 top-2 text-slate-400">R$</span>
                                  <input 
                                    type="number" 
                                    value={item.valorAcobrar}
                                    onChange={(e) => updateItem(idx, 'valorAcobrar', parseFloat(e.target.value))}
                                    className="w-32 bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                                  />
                               </div>
                            </td>
                            <td className="px-4 py-4">
                               <div className="flex flex-col gap-1">
                                  <input 
                                    type="text" 
                                    value={item.usoPrevisto || ''}
                                    onChange={(e) => updateItem(idx, 'usoPrevisto', e.target.value)}
                                    className="w-32 bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none text-[10px]"
                                    placeholder="Uso previsto"
                                  />
                                  <input 
                                    type="number" 
                                    value={item.mobilizacao || ''}
                                    onChange={(e) => updateItem(idx, 'mobilizacao', parseFloat(e.target.value))}
                                    className="w-32 bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none text-[10px]"
                                    placeholder="Mobilização R$"
                                  />
                               </div>
                            </td>
                            <td className="px-4 py-4 font-black text-slate-800">
                               R$ {item.valorTotal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-4">
                               <button onClick={() => removeItem(idx)} className="text-slate-300 hover:text-red-500 transition-colors"><X className="w-5 h-5" /></button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
               </div>
            </div>

            {/* Bottom Form Sections: Finance, Guarantee, etc */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
               <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2">Descrição dos Valores</label>
                    <textarea 
                      value={formData.descricaoValores || ''}
                      onChange={(e) => setFormData({...formData, descricaoValores: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all min-h-[100px]"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2">Garantia Técnica</label>
                    <textarea 
                      value={formData.descricaoGarantia || ''}
                      onChange={(e) => setFormData({...formData, descricaoGarantia: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all min-h-[100px]"
                    />
                  </div>
               </div>

               <div className="bg-slate-900 rounded-3xl p-8 text-white space-y-8 shadow-2xl">
                  <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                    <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black uppercase tracking-tighter text-sm">Resumo Financeiro</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Consolidação de valores e condições</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-500 uppercase">Reter Legal (%)</label>
                       <input 
                         type="number" 
                         step="0.01"
                         value={formData.pRL || ''}
                         onChange={(e) => setFormData({...formData, pRL: e.target.value})}
                         className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-white"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-500 uppercase">CTe Incluso</label>
                       <select 
                         value={formData.cTe || ''}
                         onChange={(e) => setFormData({...formData, cTe: e.target.value})}
                         className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-white appearance-none"
                       >
                          <option value="Sim">Sim</option>
                          <option value="Não">Não</option>
                       </select>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4">
                     <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-widest">
                        <span>Total de Itens</span>
                        <span className="text-white">R$ {formData.itens.reduce((acc: number, i: any) => acc + (parseFloat(i.valorTotal) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                     </div>
                     <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-widest pt-2 border-t border-white/5">
                        <span>Mobilização Estimada</span>
                        <span className="text-white">R$ {formData.itens.reduce((acc: number, i: any) => acc + (parseFloat(i.mobilizacao) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                     </div>
                     
                     <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 mt-6">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">Total Geral da Proposta</span>
                          <span className="bg-emerald-500 text-white text-[9px] px-2 py-1 rounded font-black uppercase">Final</span>
                        </div>
                        <div className="text-4xl font-black text-white tracking-tighter">
                          R$ {formData.itens.reduce((acc: number, i: any) => acc + (parseFloat(i.valorTotal) || 0) + (parseFloat(i.mobilizacao) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                     </div>
                  </div>
               </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
