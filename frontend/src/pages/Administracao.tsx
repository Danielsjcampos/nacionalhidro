import { useState, useEffect } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Wrench, ShieldCheck, Plus, Trash2, Loader2,
  DollarSign, Users, Truck, Package,
  FileText, X, Medal, Home, User
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════
// PAINEL ADMINISTRATIVO — Grid de cards estilo ADM (12 TILES)
// ═══════════════════════════════════════════════════════════

const adminModules = [
  { icon: Wrench,        label: 'Acessórios',            tab: 'acessorios' },
  { icon: Medal,         label: 'Cargos',                tab: 'cargos' },
  { icon: DollarSign,    label: 'Centro Custo',          path: '/centros-custo' },
  { icon: User,          label: 'Clientes',              path: '/clientes' },
  { icon: Home,          label: 'Empresas',              path: '/empresas' },
  { icon: Wrench,        label: 'Equipamentos',          path: '/estoque' },
  { icon: Package,       label: 'Fornecedores',          path: '/fornecedores' },
  { icon: Users,         label: 'Funcionários',          path: '/gestao-colaboradores' },
  { icon: FileText,      label: 'Naturezas Contábeis',   path: '/plano-contas' },
  { icon: ShieldCheck,   label: 'Responsabilidades',     tab: 'responsabilidades' },
  { icon: Users,         label: 'Usuários',              path: '/usuarios' },
  { icon: Truck,         label: 'Veículos',              path: '/frota' },
];

const Administracao = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const handleCardClick = (mod: typeof adminModules[0]) => {
    if (mod.tab) {
      setActiveTab(mod.tab);
    } else if (mod.path) {
      navigate(mod.path);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-800">Administração</h1>
        <p className="text-sm text-slate-500">
          Painel Administrativo: <button onClick={() => navigate('/usuarios')} className="text-blue-600 hover:underline font-medium">Clique aqui</button>
        </p>
      </div>

      {/* Grid de Módulos — 12 TILES estilo Legado */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-7xl mx-auto py-4">
        {adminModules.map((mod) => {
          const Icon = mod.icon;
          const isActive = mod.tab && activeTab === mod.tab;
          return (
            <button
              key={mod.label}
              onClick={() => handleCardClick(mod)}
              className={`group relative flex flex-col items-center justify-center gap-4 p-8 rounded-xl border-2 transition-all duration-300 min-h-[160px] ${
                isActive
                  ? 'bg-blue-800 border-blue-600 text-white shadow-xl shadow-blue-500/40 ring-4 ring-blue-500/20 scale-105 z-10'
                  : 'bg-[#2c3e5a] border-[#2c3e5a] text-white hover:bg-[#34495e] hover:border-blue-400 hover:shadow-2xl hover:shadow-blue-500/30'
              }`}
            >
              <div className={`p-4 rounded-full transition-all duration-300 ${isActive ? 'bg-white/10' : 'group-hover:bg-blue-500/10'}`}>
                <Icon className={`w-10 h-10 transition-transform duration-300 group-hover:scale-115 ${isActive ? 'text-white' : 'text-slate-300'}`} />
              </div>
              <span className="text-xs font-bold text-center leading-tight tracking-wider uppercase">{mod.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tabs inline para Acessórios, Responsabilidades e Cargos */}
      {activeTab && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-widest flex items-center gap-3">
              {activeTab === 'acessorios' && <><Wrench className="w-5 h-5 text-blue-600" /> Gerenciar Acessórios</>}
              {activeTab === 'responsabilidades' && <><ShieldCheck className="w-5 h-5 text-blue-600" /> Gerenciar Responsabilidades</>}
              {activeTab === 'cargos' && <><Medal className="w-5 h-5 text-blue-600" /> Gerenciar Cargos</>}
            </h2>
            <button 
              onClick={() => setActiveTab(null)} 
              className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="p-8">
            {activeTab === 'acessorios' && <AcessoriosTab />}
            {activeTab === 'responsabilidades' && <ResponsabilidadesTab />}
            {activeTab === 'cargos' && <CargosTab />}
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// ACESSÓRIOS TAB
// ═══════════════════════════════════════════════════════════
const AcessoriosTab = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { register, handleSubmit, reset } = useForm();

  const fetchItems = async () => {
    try {
      const res = await api.get('/acessorios');
      setItems(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, []);

  const onSubmit = async (data: any) => {
    try { await api.post('/acessorios', data); reset(); fetchItems(); }
    catch (e) { alert('Erro ao salvar acessório.'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este acessório?')) return;
    try { await api.delete(`/acessorios/${id}`); fetchItems(); }
    catch (e) { alert('Erro ao excluir acessório.'); }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="flex items-end gap-4 p-6 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex-1">
          <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Nome do Acessório</label>
          <input
            {...register('nome', { required: true })}
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
            placeholder="Ex: Mangueira de 30m"
          />
        </div>
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg hover:shadow-blue-500/20 active:scale-95">
          <Plus className="w-4 h-4" /> Adicionar
        </button>
      </form>

      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-800 text-white font-bold text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Nome do Acessório</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-semibold text-slate-700">{item.nome}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleDelete(item.id)} className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-5 h-5" /></button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={2} className="px-6 py-12 text-center text-slate-400 font-medium">Nenhum acessório cadastrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
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

  const fetchItems = async () => {
    try { const res = await api.get('/responsabilidades'); setItems(res.data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, []);

  const onSubmit = async (data: any) => {
    try { await api.post('/responsabilidades', data); reset(); fetchItems(); }
    catch (e) { alert('Erro ao salvar responsabilidade.'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta responsabilidade?')) return;
    try { await api.delete(`/responsabilidades/${id}`); fetchItems(); }
    catch (e) { alert('Erro ao excluir responsabilidade.'); }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="p-6 bg-slate-50 rounded-xl border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <div className="col-span-2">
            <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Descrição da Responsabilidade</label>
            <input
              {...register('descricao', { required: true })}
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
              placeholder="Ex: Fornecimento de EPIs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Responsável (Tipo)</label>
            <select {...register('tipo')} className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none bg-white shadow-sm focus:ring-2 focus:ring-blue-500">
              <option value="CONTRATADA (HIDRO)">Contratada (Nacional Hidro)</option>
              <option value="CONTRATANTE (CLIENTE)">Contratante (Cliente)</option>
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg hover:shadow-blue-500/20 active:scale-95">
            <Plus className="w-4 h-4" /> Adicionar
          </button>
        </div>
      </form>

      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-800 text-white font-bold text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Responsabilidade</th>
              <th className="px-6 py-4">Tipo</th>
              <th className="px-6 py-4 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-semibold text-slate-700">{item.descricao}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${item.tipo === 'CONTRATADA (HIDRO)' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                    {item.tipo}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleDelete(item.id)} className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-5 h-5" /></button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-400 font-medium">Nenhuma responsabilidade cadastrada.</td></tr>
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

  const fetchItems = async () => {
    try {
      const res = await api.get('/cargos');
      setItems(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, []);

  const onSubmit = async (data: any) => {
    try { 
      await api.post('/cargos', { 
        ...data, 
        unicoEquipamento: !!data.unicoEquipamento 
      }); 
      reset(); 
      fetchItems(); 
    }
    catch (e) { alert('Erro ao salvar cargo.'); }
  };

  const toggleUnico = async (item: any) => {
    try {
      await api.patch(`/cargos/${item.id}`, { 
        unicoEquipamento: !item.unicoEquipamento 
      });
      fetchItems();
    } catch (e) {
      alert('Erro ao atualizar cargo.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este cargo?')) return;
    try { await api.delete(`/cargos/${id}`); fetchItems(); }
    catch (e) { alert('Erro ao excluir cargo.'); }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="p-6 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex items-end gap-6">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Nome do Cargo</label>
            <input
              {...register('nome', { required: true })}
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
              placeholder="Ex: Operador de Hidrojato"
            />
          </div>
          <div className="flex items-center gap-2 mb-3">
             <input
               type="checkbox"
               id="unicoEquipamento"
               {...register('unicoEquipamento')}
               className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
             />
             <label htmlFor="unicoEquipamento" className="text-xs font-bold text-slate-600 uppercase tracking-wide cursor-pointer">
               Único p/ Equipamento
             </label>
          </div>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg hover:shadow-blue-500/20 active:scale-95">
            <Plus className="w-4 h-4" /> Adicionar
          </button>
        </div>
        <p className="mt-2 text-[10px] text-slate-400 font-medium">
          * "Único p/ Equipamento" indica que este cargo é fixo por equipamento na proposta, independente da quantidade de turnos ou pessoas.
        </p>
      </form>

      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-800 text-white font-bold text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Nome do Cargo</th>
              <th className="px-6 py-4 text-center">Único por Equip.</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-semibold text-slate-700">{item.nome}</td>
                <td className="px-6 py-4 text-center">
                  <button 
                    onClick={() => toggleUnico(item)}
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter transition-all ${
                      item.unicoEquipamento 
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}
                  >
                    {item.unicoEquipamento ? 'SIM' : 'NÃO'}
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleDelete(item.id)} className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-5 h-5" /></button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-400 font-medium">Nenhum cargo cadastrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Administracao;
