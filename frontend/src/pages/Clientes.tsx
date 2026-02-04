import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  Users, Plus, Search, ChevronRight, Save, X, Trash2, 
  FileText, Wrench, DollarSign, History, FileUp, Loader2,
  Lock, Globe
} from 'lucide-react';

const TABS = [
  { id: 'cadastro', label: 'Cadastro', icon: FileText },
  { id: 'propostas', label: 'Propostas', icon: FileText },
  { id: 'os', label: 'Ordens Serv.', icon: Wrench },
  { id: 'medicoes', label: 'Medições', icon: FileText },
  { id: 'faturamentos', label: 'Faturamentos', icon: DollarSign },
  { id: 'contas_receber', label: 'Contas Receber', icon: DollarSign },
  { id: 'contatos', label: 'Histórico de Contatos', icon: History },
  { id: 'documentos', label: 'Documentos', icon: FileUp },
];

export default function Clientes() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('cadastro');

  // Form State
  const [isListCollapsed, setIsListCollapsed] = useState(false);
  const [formData, setFormData] = useState<any>({});

  const fetchClientes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:3000/clientes?search=${searchTerm}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClientes(response.data);
    } catch (err) {
      console.error('Failed to fetch clients', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, [searchTerm]);

  const handleOpenCliente = async (cliente: any) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:3000/clientes/${cliente.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedCliente(response.data);
      setFormData(response.data);
      setIsEditing(true);
      setActiveTab('cadastro');
    } catch (err) {
      console.error('Error loading client details', err);
    }
  };

  const handleCreateNew = () => {
    setSelectedCliente({ novo: true });
    setFormData({
      tipo: 'PJ',
      aceitaCTe: false,
      bloquearCliente: false,
    });
    setIsEditing(true);
    setActiveTab('cadastro');
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      if (selectedCliente.novo) {
        await axios.post('http://localhost:3000/clientes', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.patch(`http://localhost:3000/clientes/${selectedCliente.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setIsEditing(false);
      fetchClientes();
    } catch (err) {
      console.error('Error saving client', err);
      alert('Erro ao salvar cliente. Verifique os campos e o documento.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:3000/clientes/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsEditing(false);
      fetchClientes();
    } catch (err) {
      console.error('Error deleting client', err);
    }
  };

  if (loading && !clientes.length) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header */}
      {!isListCollapsed && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Clientes</h1>
            <p className="text-sm text-slate-500">Gestão de parceiros e histórico comercial</p>
          </div>
          <button 
            onClick={handleCreateNew}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Novo Cliente
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 grid grid-cols-12 gap-6 overflow-hidden relative">
        
        {/* Left Side: List */}
        <div className={`lg:flex flex-col overflow-hidden bg-white rounded-xl border border-slate-200 shadow-sm transition-all duration-300 ${isListCollapsed ? 'w-0 opacity-0 pointer-events-none' : 'col-span-12 lg:col-span-4'} ${isEditing ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Buscar cliente..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-50">
            {clientes.map((cliente) => (
              <div 
                key={cliente.id}
                onClick={() => handleOpenCliente(cliente)}
                className={`p-4 cursor-pointer transition-colors flex items-center gap-4 group ${selectedCliente?.id === cliente.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${cliente.tipo === 'PJ' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                  {cliente.tipo}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 truncate leading-none mb-1">{cliente.nome}</p>
                  <p className="text-xs text-slate-500 truncate">{cliente.documento}</p>
                </div>
                <ChevronRight className={`w-4 h-4 text-slate-300 transition-transform group-hover:text-blue-500 ${selectedCliente?.id === cliente.id ? 'translate-x-1 text-blue-500' : ''}`} />
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Detailed View / Form */}
        <div className={`flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 ${isListCollapsed ? 'col-span-12' : 'col-span-12 lg:col-span-8'} ${isEditing ? 'flex' : 'hidden lg:flex items-center justify-center bg-slate-50/30'}`}>
          
          {isEditing ? (
            <>
              {/* Record Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setIsListCollapsed(!isListCollapsed)}
                    className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 text-slate-400 transition-all"
                    title={isListCollapsed ? "Mostrar Lista" : "Expandir Formulário"}
                  >
                    {isListCollapsed ? <ChevronRight className="w-5 h-5 rotate-180" /> : <ChevronRight className="w-5 h-5" />}
                  </button>
                  <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-800 leading-none flex items-center gap-2">
                      {selectedCliente.novo ? 'Novo Cadastro' : formData.nome}
                      {!selectedCliente.novo && <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest">{formData.codigo}</span>}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 uppercase tracking-tight font-medium">
                      {selectedCliente.novo ? 'Preencha os dados abaixo' : `Editando cliente ID: ${selectedCliente.id.slice(0,8)}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!selectedCliente.novo && (
                    <button 
                      onClick={() => handleDelete(selectedCliente.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Tabs Navigation */}
              <div className="bg-slate-50 p-1 flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-slate-200">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                      activeTab === tab.id 
                        ? 'bg-white text-blue-600 shadow-sm border border-slate-200' 
                        : 'text-slate-500 hover:bg-slate-200/50'
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {activeTab === 'cadastro' && (
                  <div className="space-y-8">
                    {/* Basic Info */}
                    <section>
                      <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                        <div className="w-1.5 h-4 bg-blue-500 rounded-full"></div>
                        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Dados Principais</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Tipo de Pessoa</label>
                          <div className="flex items-center gap-4 h-10">
                            {['PF', 'PJ'].map(t => (
                              <label key={t} className="flex items-center gap-2 cursor-pointer group">
                                <input 
                                  type="radio" 
                                  name="tipo" 
                                  checked={formData.tipo === t}
                                  onChange={() => setFormData({...formData, tipo: t})}
                                  className="w-4 h-4 text-blue-600 accent-blue-600 mt-[-2px]" 
                                />
                                <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors">{t === 'PF' ? 'Física' : 'Jurídica'}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Código Cliente</label>
                          <input 
                            type="text" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                            placeholder="Ex: CLI001"
                            value={formData.codigo || ''}
                            onChange={(e) => setFormData({...formData, codigo: e.target.value})}
                          />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Nome / Razão Social</label>
                          <input 
                            type="text" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-slate-800"
                            placeholder="Nome Completo ou Razão Social"
                            value={formData.nome || ''}
                            onChange={(e) => setFormData({...formData, nome: e.target.value})}
                          />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Nome Fantasia</label>
                          <input 
                            type="text" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            value={formData.nomeFantasia || ''}
                            onChange={(e) => setFormData({...formData, nomeFantasia: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">CPF / CNPJ</label>
                          <input 
                            type="text" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            value={formData.documento || ''}
                            onChange={(e) => setFormData({...formData, documento: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Segmento Principal</label>
                          <select 
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
                            value={formData.segmento || ''}
                            onChange={(e) => setFormData({...formData, segmento: e.target.value})}
                          >
                            <option value="">Selecione...</option>
                            <option value="Industrial">Industrial</option>
                            <option value="Comercial">Comercial</option>
                            <option value="Residencial">Residencial</option>
                            <option value="Servicos">Serviços</option>
                          </select>
                        </div>
                      </div>
                    </section>

                    {/* Address Info */}
                    <section>
                      <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                        <div className="w-1.5 h-4 bg-orange-400 rounded-full"></div>
                        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Localização</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2 space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Endereço</label>
                          <input 
                            type="text" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            value={formData.endereco || ''}
                            onChange={(e) => setFormData({...formData, endereco: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Número</label>
                          <input 
                            type="text" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            value={formData.numero || ''}
                            onChange={(e) => setFormData({...formData, numero: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Bairro</label>
                          <input 
                            type="text" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            value={formData.bairro || ''}
                            onChange={(e) => setFormData({...formData, bairro: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Cidade</label>
                          <input 
                            type="text" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            value={formData.cidade || ''}
                            onChange={(e) => setFormData({...formData, cidade: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">UF</label>
                          <input 
                            type="text" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            value={formData.uf || ''}
                            onChange={(e) => setFormData({...formData, uf: e.target.value})}
                            maxLength={2}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">CEP</label>
                          <input 
                            type="text" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            value={formData.cep || ''}
                            onChange={(e) => setFormData({...formData, cep: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Telefone</label>
                          <input 
                            type="text" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            value={formData.telefone || ''}
                            onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                          />
                        </div>
                      </div>
                    </section>

                    {/* Financial & Commercial */}
                    <section>
                      <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                        <div className="w-1.5 h-4 bg-emerald-400 rounded-full"></div>
                        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Comercial & Faturamento</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Vendedor Resp.</label>
                          <input 
                            type="text" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            value={formData.vendedorResponsavel || ''}
                            onChange={(e) => setFormData({...formData, vendedorResponsavel: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">% Reter Legal</label>
                          <input 
                            type="number" 
                            step="0.01"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            value={formData.porcentagemRL || ''}
                            onChange={(e) => setFormData({...formData, porcentagemRL: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Dias Venc. RL</label>
                          <input 
                            type="number" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            value={formData.diasVencimentoRL || ''}
                            onChange={(e) => setFormData({...formData, diasVencimentoRL: e.target.value})}
                          />
                        </div>
                        <div className="flex items-center gap-6 h-14">
                          <label className="flex items-center gap-2 cursor-pointer group">
                            <input 
                              type="checkbox" 
                              checked={formData.aceitaCTe}
                              onChange={(e) => setFormData({...formData, aceitaCTe: e.target.checked})}
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300" 
                            />
                            <span className="text-[11px] font-bold text-slate-600 uppercase">Aceita CTe</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer group">
                            <input 
                              type="checkbox" 
                              checked={formData.bloquearCliente}
                              onChange={(e) => setFormData({...formData, bloquearCliente: e.target.checked})}
                              className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-slate-300" 
                            />
                            <span className="text-[11px] font-bold text-red-600 uppercase">Bloquear</span>
                          </label>
                        </div>
                      </div>
                    </section>

                    {/* Portal Section */}
                    <section className="bg-slate-50 p-6 rounded-xl border border-slate-200 border-dashed">
                      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200/50">
                        <Lock className="w-4 h-4 text-slate-400" />
                        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Acesso ao Portal</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                            <Globe className="w-3 h-3" /> Link do Portal
                          </label>
                          <input 
                            type="text" 
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-blue-600"
                            placeholder="https://portal.cliente.pt"
                            value={formData.linkPortal || ''}
                            onChange={(e) => setFormData({...formData, linkPortal: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Usuário</label>
                          <input 
                            type="text" 
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            value={formData.usuarioPortal || ''}
                            onChange={(e) => setFormData({...formData, usuarioPortal: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Senha Portal</label>
                          <input 
                            type="password" 
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            value={formData.senhaPortal || ''}
                            onChange={(e) => setFormData({...formData, senhaPortal: e.target.value})}
                          />
                        </div>
                      </div>
                    </section>
                  </div>
                )}

                {activeTab === 'propostas' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-800">Propostas Vinculadas</h3>
                      <button className="text-blue-600 text-xs font-bold uppercase hover:underline">+ Nova Proposta</button>
                    </div>
                    {selectedCliente.propostas?.length > 0 ? (
                      <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden text-sm">
                        {selectedCliente.propostas.map((prop: any) => (
                           <div key={prop.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                             <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-[10px]">
                                 PROP
                               </div>
                               <div>
                                 <p className="font-bold text-slate-700">#{prop.id.slice(0,6).toUpperCase()}</p>
                                 <p className="text-[10px] text-slate-400">{new Date(prop.createdAt).toLocaleDateString('pt-BR')}</p>
                               </div>
                             </div>
                             <div className="text-right">
                               <p className="font-bold text-slate-800">R$ {prop.valorTotal.toLocaleString('pt-BR')}</p>
                               <span className="text-[9px] font-black uppercase text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">{prop.status}</span>
                             </div>
                           </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <FileText className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                        <p className="text-slate-400 text-sm">Sem propostas registradas para este cliente</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'os' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-800">Ordens de Serviço</h3>
                      <button className="text-blue-600 text-xs font-bold uppercase hover:underline">+ Gerar OS</button>
                    </div>
                    {selectedCliente.ordensServico?.length > 0 ? (
                      <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden text-sm">
                        {selectedCliente.ordensServico.map((os: any) => (
                           <div key={os.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                             <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded bg-orange-50 flex items-center justify-center text-orange-600 font-bold text-[10px]">
                                 OS
                               </div>
                               <div>
                                 <p className="font-bold text-slate-700">{os.codigo}</p>
                                 <p className="text-[10px] text-slate-400">{new Date(os.createdAt).toLocaleDateString('pt-BR')}</p>
                               </div>
                             </div>
                             <div className="text-right">
                               <p className="font-medium text-slate-600 text-xs truncate max-w-[200px]">{os.descricao}</p>
                               <span className="text-[9px] font-black uppercase text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">{os.status}</span>
                             </div>
                           </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <Wrench className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                        <p className="text-slate-400 text-sm">Sem ordens de serviço (OS) registradas</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Other tabs as placeholders */}
                {['medicoes', 'faturamentos', 'contas_receber', 'contatos', 'documentos'].includes(activeTab) && (
                  <div className="py-20 text-center flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4 animate-pulse">
                      {React.createElement(TABS.find(t => t.id === activeTab)?.icon || FileText, { className: 'w-8 h-8' })}
                    </div>
                    <h4 className="font-bold text-slate-800 uppercase tracking-widest text-sm">Módulo em Integração</h4>
                    <p className="text-slate-400 text-xs mt-2 max-w-xs">Esta seção será populada automaticamente conforme as transações forem registradas no sistema.</p>
                  </div>
                )}
              </div>

              {/* Record Footer / Actions */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSave}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 text-sm font-bold uppercase tracking-wider"
                >
                  <Save className="w-4 h-4" />
                  Salvar Cadastro
                </button>
              </div>
            </>
          ) : (
            <div className="text-center p-12 max-w-sm">
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Selecione um Cliente</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Clique em um cliente na lista ao lado para visualizar o cadastro completo e histórico comercial, ou utilize o botão acima para criar um novo registro.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
