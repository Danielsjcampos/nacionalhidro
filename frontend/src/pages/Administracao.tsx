import { useToast } from '../contexts/ToastContext';
import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Wrench, ShieldCheck, Plus, Trash2, Loader2,
  DollarSign, Users, Truck, Package,
  FileText, X, Medal, Home, User, Search, Edit2
} from 'lucide-react';

// Importação dos Modais
import ModalCliente from '../components/ModalCliente';
import ModalUsuario from '../components/ModalUsuario';
import ModalVeiculo from '../components/ModalVeiculo';
import ModalEmpresa from '../components/ModalEmpresa';
import ModalFuncionario from '../components/ModalFuncionario';
import ModalEquipamento from '../components/ModalEquipamento';
import ModalFornecedor from '../components/ModalFornecedor';
import ModalCentroCusto from '../components/ModalCentroCusto';
import ModalNaturezaContabil from '../components/ModalNaturezaContabil';
import ModalAcessorio from '../components/ModalAcessorio';

// ═══════════════════════════════════════════════════════════
// PAINEL ADMINISTRATIVO — Grid de cards estilo ADM (12 TILES)
// ═══════════════════════════════════════════════════════════

const adminModules = [
  { icon: Wrench,        label: 'Acessórios',            tab: 'acessorios',    endpoint: '/acessorios',    modal: ModalAcessorio,    columns: [{ key: 'nome', label: 'Nome' }] },
  { icon: Medal,         label: 'Cargos',                tab: 'cargos' },
  { icon: DollarSign,    label: 'Centro Custo',          tab: 'centro_custo',  endpoint: '/centros-custo', modal: ModalCentroCusto, columns: [{ key: 'nome', label: 'Nome' }, { key: 'codigo', label: 'Código' }] },
  { icon: Users,         label: 'Clientes',              tab: 'clientes',      endpoint: '/clientes',      modal: ModalCliente,      columns: [{ key: 'nome', label: 'Razão Social' }, { key: 'documento', label: 'CNPJ/CPF' }] },
  { icon: Home,          label: 'Empresas',              tab: 'empresas',      endpoint: '/empresas',      modal: ModalEmpresa,      columns: [{ key: 'razaoSocial', label: 'Razão Social' }, { key: 'cnpj', label: 'CNPJ' }] },
  { icon: Wrench,        label: 'Equipamentos',          tab: 'equipamentos',  endpoint: '/equipamentos',  modal: ModalEquipamento,  columns: [{ key: 'imagem', label: 'Foto' }, { key: 'nome', label: 'Nome' }, { key: 'id', label: 'Código' }] },
  { icon: Package,       label: 'Fornecedores',          tab: 'fornecedores',  endpoint: '/fornecedores',  modal: ModalFornecedor,   columns: [{ key: 'razaoSocial', label: 'Razão Social' }, { key: 'cnpj', label: 'CNPJ' }] },
  { icon: Users,         label: 'Funcionários',          tab: 'funcionarios',  endpoint: '/rh',            modal: ModalFuncionario,  columns: [{ key: 'nome', label: 'Nome' }, { key: 'funcao', label: 'Função' }] },
  { icon: FileText,      label: 'Naturezas Contábeis',   tab: 'plano_contas',  endpoint: '/naturezas',      modal: ModalNaturezaContabil, columns: [{ key: 'descricao', label: 'Nome' }, { key: 'id', label: 'ID' }] },
  { icon: ShieldCheck,   label: 'Responsabilidades',     tab: 'responsabilidades' },
  { icon: User,          label: 'Usuários',              tab: 'usuarios',      endpoint: '/equipe/members', modal: ModalUsuario,      columns: [{ key: 'name', label: 'Nome' }, { key: 'email', label: 'E-mail' }] },
  { icon: Truck,         label: 'Veículos',              tab: 'veiculos',      endpoint: '/logistica/veiculos', modal: ModalVeiculo,      columns: [{ key: 'modelo', label: 'Modelo' }, { key: 'placa', label: 'Placa' }] },
];

const Administracao = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const handleCardClick = (mod: typeof adminModules[0]) => {
    setActiveTab(mod.tab);
  };

  const activeModule = useMemo(() => adminModules.find(m => m.tab === activeTab), [activeTab]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter italic">Administração</h1>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Painel Geral do Sistema</p>
      </div>

      {/* Grid de Módulos — 12 TILES estilo Legado */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-7xl mx-auto py-4">
        {adminModules.map((mod) => {
          const Icon = mod.icon;
          const isActive = activeTab === mod.tab;
          return (
            <button
              key={mod.label}
              onClick={() => handleCardClick(mod)}
              className={`group relative flex flex-col items-center justify-center gap-4 p-6 rounded-2xl border-b-4 transition-all duration-300 min-h-[140px] shadow-sm hover:shadow-xl hover:-translate-y-1 ${
                isActive
                  ? 'bg-blue-600 border-blue-800 text-white shadow-blue-500/40 scale-105 z-10'
                  : 'bg-[#2b3e5a] border-slate-900 text-slate-100 hover:bg-[#344b6d] hover:border-blue-500'
              }`}
            >
              <div className={`p-4 rounded-full transition-all duration-300 ${isActive ? 'bg-white/20' : 'bg-white/5 group-hover:bg-white/10'}`}>
                <Icon className={`w-8 h-8 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-300'}`} />
              </div>
              <span className="text-[10px] font-black text-center leading-tight tracking-[0.2em] uppercase">{mod.label}</span>
              
              {isActive && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-lg">
                   <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Tabs inline para Acessórios, Responsabilidades e Cargos */}
      {activeTab && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 ring-1 ring-black/5">
          <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-slate-50/50 backdrop-blur-sm">
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-4 italic">
              {activeModule && <activeModule.icon className="w-5 h-5 text-blue-600" />}
              {activeModule?.label}
            </h2>
            <button 
              onClick={() => setActiveTab(null)} 
              className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-full transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="p-8">
            {activeTab === 'responsabilidades' && <ResponsabilidadesTab />}
            {activeTab === 'cargos' && <CargosTab />}
            
            {/* Renderiza CRUD Genérico para os outros módulos */}
            {activeModule && !['responsabilidades', 'cargos'].includes(activeTab) && (
              <GenericCRUDTab 
                endpoint={activeModule.endpoint!} 
                modal={activeModule.modal!} 
                columns={activeModule.columns!} 
                label={activeModule.label}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// COMPONENTE CRUD GENÉRICO
// ═══════════════════════════════════════════════════════════
const GenericCRUDTab = ({ endpoint, modal: ModalComponent, columns, label }: { endpoint: string, modal: any, columns: any[], label: string }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { showToast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get(endpoint);
      setItems(res.data || []);
    } catch (e) {
      console.error(e);
      showToast(`Erro ao buscar dados de ${label}.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [endpoint]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    return items.filter(it => 
      Object.values(it).some(v => 
        String(v).toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [items, search]);

  const handleDelete = async (id: string) => {
    if (!window.confirm(`Deseja realmente excluir este registro de ${label}?`)) return;
    try {
      await api.delete(`${endpoint}/${id}`);
      showToast('Registro excluído com sucesso.');
      fetchData();
    } catch (e) {
      showToast('Erro ao excluir registro.');
    }
  };

  if (loading && items.length === 0) return (
    <div className="flex flex-col items-center justify-center p-20 gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Carregando {label}...</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Buscar em ${label}...`}
            className="w-full pl-12 pr-4 py-3 bg-slate-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-slate-700"
          />
        </div>
        <button 
          onClick={() => { setSelected(null); setIsModalOpen(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all shadow-lg hover:shadow-blue-500/30 active:scale-95"
        >
          <Plus className="w-4 h-4" /> Novo Registro
        </button>
      </div>

      <div className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm bg-white">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-800 text-white font-black text-[10px] uppercase tracking-[0.2em]">
            <tr>
              {columns.map(col => <th key={col.key} className="px-8 py-5">{col.label}</th>)}
              <th className="px-8 py-5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredItems.map(item => (
              <tr key={item.id} className="group hover:bg-blue-50/50 transition-colors">
                {columns.map(col => (
                  <td key={col.key} className="px-8 py-5 font-bold text-slate-700">
                    {col.key === 'imagem' ? (
                      <div className="w-12 h-12 bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                        {item[col.key] ? (
                          <img src={item[col.key]} alt="Thumb" className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-5 h-5 text-slate-300 m-auto mt-3" />
                        )}
                      </div>
                    ) : (
                      item[col.key] || '-'
                    )}
                  </td>
                ))}
                <td className="px-8 py-5 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => { setSelected(item); setIsModalOpen(true); }}
                      className="text-slate-400 hover:text-blue-600 p-2 hover:bg-blue-100 rounded-xl transition-all"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleDelete(item.id)}
                      className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-100 rounded-xl transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-8 py-20 text-center">
                  <div className="flex flex-col items-center gap-3 opacity-30">
                    <Search className="w-10 h-10" />
                    <p className="text-xs font-bold uppercase tracking-widest">Nenhum registro encontrado</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <ModalComponent 
          data={selected} 
          clientes={endpoint === '/clientes' ? items : []} // Algumas modais como a de Clientes precisam da lista de clientes
          onClose={() => setIsModalOpen(false)} 
          onSaved={() => { fetchData(); setIsModalOpen(false); }} 
        />
      )}
    </div>
  );
};


// ═══════════════════════════════════════════════════════════
// RESPONSABILIDADES TAB
// ═══════════════════════════════════════════════════════════
const ResponsabilidadesTab = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { register, handleSubmit, reset } = useForm();
  const { showToast } = useToast();

  const fetchResponsabilidades = async () => {
    try { const res = await api.get('/responsabilidades'); setItems(res.data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchResponsabilidades(); }, []);

  const onResponsabilidadeSubmit = async (data: any) => {
    try { await api.post('/responsabilidades', data); reset(); fetchResponsabilidades(); }
    catch (e) { showToast('Erro ao salvar responsabilidade.'); }
  };

  const handleDeleteResponsabilidade = async (id: string) => {
    if (!window.confirm('Deseja realmente excluir esta responsabilidade?')) return;
    try { await api.delete(`/responsabilidades/${id}`); fetchResponsabilidades(); }
    catch (e) { showToast('Erro ao excluir responsabilidade.'); }
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onResponsabilidadeSubmit)} className="p-8 bg-slate-50 rounded-3xl border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <div className="col-span-2">
            <label className="block text-[10px] font-black text-slate-500 mb-3 uppercase tracking-[0.2em] ml-1">Descrição da Responsabilidade</label>
            <input
              {...register('descricao', { required: true })}
              className="w-full border-none bg-white rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm font-bold text-slate-700"
              placeholder="Ex: Fornecimento de EPIs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-500 mb-3 uppercase tracking-[0.2em] ml-1">Responsável (Tipo)</label>
            <select {...register('tipo')} className="w-full border-none bg-white rounded-2xl px-5 py-4 text-sm outline-none shadow-sm focus:ring-2 focus:ring-blue-500 font-bold text-slate-700">
              <option value="CONTRATADA (HIDRO)">Contratada (Nacional Hidro)</option>
              <option value="CONTRATANTE (CLIENTE)">Contratante (Cliente)</option>
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all shadow-lg hover:shadow-blue-500/20 active:scale-95">
            <Plus className="w-4 h-4" /> Adicionar
          </button>
        </div>
      </form>

      <div className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm bg-white">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-800 text-white font-black text-[10px] uppercase tracking-[0.2em]">
            <tr>
              <th className="px-8 py-5">Responsabilidade</th>
              <th className="px-8 py-5">Tipo</th>
              <th className="px-8 py-5 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-8 py-5 font-bold text-slate-700">{item.descricao}</td>
                <td className="px-8 py-5">
                  <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${item.tipo === 'CONTRATADA (HIDRO)' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                    {item.tipo}
                  </span>
                </td>
                <td className="px-8 py-5 text-right">
                  <button onClick={() => handleDeleteResponsabilidade(item.id)} className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-5 h-5" /></button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={3} className="px-8 py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhuma responsabilidade cadastrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// [NOVO] CARGOS TAB
// ═══════════════════════════════════════════════════════════
const CargosTab = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { register, handleSubmit, reset } = useForm({
    defaultValues: { nome: '', unicoEquipamento: false }
  });
  const { showToast } = useToast();

  const fetchCargos = async () => {
    try {
      setLoading(true);
      const res = await api.get('/cargos');
      setItems(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCargos(); }, []);

  const onCargoSubmit = async (data: any) => {
    try { 
      await api.post('/cargos', { 
        ...data, 
        unicoEquipamento: !!data.unicoEquipamento 
      }); 
      reset(); 
      fetchCargos(); 
    }
    catch (e) { showToast('Erro ao salvar cargo.'); }
  };

  const toggleUnico = async (item: any) => {
    try {
      await api.patch(`/cargos/${item.id}`, { 
        unicoEquipamento: !item.unicoEquipamento 
      });
      fetchCargos();
    } catch (e) {
      showToast('Erro ao atualizar cargo.');
    }
  };

  const handleDeleteCargo = async (id: string) => {
    if (!window.confirm('Deseja realmente excluir este cargo?')) return;
    try { await api.delete(`/cargos/${id}`); fetchCargos(); }
    catch (e) { showToast('Erro ao excluir cargo.'); }
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onCargoSubmit)} className="p-8 bg-slate-50 rounded-3xl border border-slate-200">
        <div className="flex items-end gap-6">
          <div className="flex-1">
            <label className="block text-[10px] font-black text-slate-500 mb-3 uppercase tracking-[0.2em] ml-1">Nome do Cargo</label>
            <input
              {...register('nome', { required: true })}
              className="w-full border-none bg-white rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm font-bold text-slate-700"
              placeholder="Ex: Operador de Hidrojato"
            />
          </div>
          <div className="flex items-center gap-3 mb-4">
             <input
               type="checkbox"
               id="unicoEquipamento"
               {...register('unicoEquipamento')}
               className="w-5 h-5 text-blue-600 rounded-lg border-slate-300 focus:ring-blue-500"
             />
             <label htmlFor="unicoEquipamento" className="text-[10px] font-black text-slate-500 uppercase tracking-widest cursor-pointer">
               Único p/ Equipamento
             </label>
          </div>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all shadow-lg hover:shadow-blue-500/20 active:scale-95">
            <Plus className="w-4 h-4" /> Adicionar
          </button>
        </div>
        <p className="mt-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-1">
          * "Único p/ Equipamento" indica que este cargo é fixo por equipamento na proposta.
        </p>
      </form>

      <div className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm bg-white">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-800 text-white font-black text-[10px] uppercase tracking-[0.2em]">
            <tr>
              <th className="px-8 py-5">Nome do Cargo</th>
              <th className="px-8 py-5 text-center">Único por Equip.</th>
              <th className="px-8 py-5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-8 py-5 font-bold text-slate-700">{item.nome}</td>
                <td className="px-8 py-5 text-center">
                  <button 
                    onClick={() => toggleUnico(item)}
                    className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                      item.unicoEquipamento 
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm shadow-emerald-500/10' 
                        : 'bg-slate-100 text-slate-400 border-slate-200'
                    }`}
                  >
                    {item.unicoEquipamento ? 'SIM' : 'NÃO'}
                  </button>
                </td>
                <td className="px-8 py-5 text-right">
                  <button onClick={() => handleDeleteCargo(item.id)} className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-5 h-5" /></button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={3} className="px-8 py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhum cargo cadastrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Administracao;
