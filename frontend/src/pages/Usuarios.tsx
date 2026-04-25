import { useToast } from '../contexts/ToastContext';
import { useEffect, useState } from 'react';
import api from '../services/api';
import { 
  Shield, Check, X, Plus, Trash2, 
  Settings, ShieldAlert, Loader2, Save,
  Users as UsersIcon, Mail, Phone, Lock, Building, Upload
} from 'lucide-react';


export default function Usuarios() {
    const { showToast } = useToast();
  const [categorias, setCategorias] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'usuarios' | 'permissoes'>('usuarios');
  
  // Modais / Estados de edição
  const [editingCat, setEditingCat] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [catsRes, usersRes] = await Promise.all([
        api.get('/equipe/categories'),
        api.get('/equipe/members')
      ]);
      setCategorias(catsRes.data);
      setUsuarios(usersRes.data);
    } catch (err) {
      console.error('Failed to fetch user data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

    const handleSaveCategoria = async () => {
        try {
            if (editingCat.id) {
                await api.patch(`/categorias/${editingCat.id}`, editingCat);
            } else {
                await api.post('/categorias', editingCat);
            }
      setEditingCat(null);
      fetchData();
    } catch (err) {
      console.error('Error saving category', err);
    }
  };

    const handleSaveUser = async () => {
        try {
            if (editingUser.id) {
                await api.patch(`/equipe/members/${editingUser.id}`, editingUser);
            } else {
                await api.post('/equipe/members', editingUser);
            }
      setEditingUser(null);
      fetchData();
    } catch (err) {
      console.error('Error saving member', err);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Deseja remover este membro da equipe? O acesso será revogado imediatamente.')) return;
    try {
      await api.delete(`/equipe/members/${id}`);
      fetchData();
    } catch (err) {
      console.error('Error deleting member', err);
    }
  };

  const handleDeleteCategoria = async (id: string) => {
    if (!window.confirm('Deseja excluir esta categoria? Isso pode afetar usuários vinculados.')) return;
    try {
      await api.delete(`/categorias/${id}`);
      fetchData();
    } catch (err) {
      console.error('Error deleting category', err);
    }
  };

  const togglePermission = (key: string) => {
    setEditingCat({ ...editingCat, [key]: !editingCat[key] });
  };

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter italic">Equipe & Permissões</h1>
          <p className="text-sm text-slate-500 font-medium italic">Gestão de membros e controle granular de acessos</p>
        </div>
        <button 
          onClick={() => setEditingUser({ name: '', email: '', password: '', telefone: '', roleId: '' })}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 text-xs font-black uppercase italic"
        >
          <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" /> Novo Membro
        </button>
      </div>

      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
        <button 
          onClick={() => setActiveTab('usuarios')}
          className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-lg ${activeTab === 'usuarios' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Usuários
        </button>
        <button 
          onClick={() => setActiveTab('permissoes')}
          className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-lg ${activeTab === 'permissoes' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Categorias & Permissões
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === 'usuarios' ? (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest text-slate-500 italic">Membro</th>
                  <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest text-slate-500 italic">Categoria / Nível</th>
                  <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest text-slate-500 italic">Departamento</th>
                  <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest text-slate-500 italic">Contato</th>
                  <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest text-slate-500 italic text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usuarios.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                             <UsersIcon className="w-5 h-5" />
                          </div>
                          <div>
                             <p className="font-black text-slate-800 uppercase italic leading-none">{u.name}</p>
                             <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{u.email}</p>
                          </div>
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border border-blue-100 shadow-sm shadow-blue-500/5">
                        {u.categoria?.nome || u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-500 uppercase text-[10px] tracking-tighter italic">{u.departamento || '---'}</td>
                    <td className="px-6 py-4">
                       <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs uppercase tracking-tighter">
                             <Phone className="w-3 h-3 text-slate-400" /> {u.telefone || '---'}
                          </div>
                       </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingUser(u)} className="text-slate-300 hover:text-blue-600 p-2 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-100"><Settings className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteUser(u.id)} className="text-slate-300 hover:text-red-600 p-2 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-100"><Trash2 className="w-4 h-4" /></button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categorias.map((cat) => (
              <div key={cat.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col hover:shadow-lg transition-all group overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 group-hover:bg-blue-600 transition-colors">
                   <h3 className="font-black text-slate-800 uppercase tracking-widest text-[10px] flex items-center gap-2 group-hover:text-white italic">
                    <Shield className="w-4 h-4 text-blue-500 group-hover:text-white" /> {cat.nome}
                  </h3>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setEditingCat(cat)}
                      className="text-slate-300 hover:text-blue-600 group-hover:text-white p-1"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteCategoria(cat.id)} className="text-slate-300 hover:text-white p-1 hover:bg-white/10 rounded transition-all"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="p-5 flex-1 space-y-3 bg-white">
                  {[
                    { label: 'Financeiro', active: cat.canAccessFinanceiro },
                    { label: 'Contas a Pagar', active: cat.canAccessContasPagar },
                    { label: 'Contas a Receber', active: cat.canAccessContasReceber },
                    { label: 'Cobrança', active: cat.canAccessCobranca },
                    { label: 'Faturamento', active: cat.canAccessFaturamento },
                    { label: 'Logística', active: cat.canAccessLogistica },
                    { label: 'Operacional', active: cat.canAccessOperacao },
                    { label: 'Medições', active: cat.canAccessMedicoes },
                    { label: 'Manutenção', active: cat.canAccessManutencao },
                    { label: 'Frota', active: cat.canAccessFrota },
                    { label: 'Estoque', active: cat.canAccessEstoque },
                    { label: 'Comercial', active: cat.canAccessComercial },
                    { label: 'RH', active: cat.canAccessRH },
                    { label: 'DP', active: cat.canAccessDP },
                  ].map(p => (
                    <div key={p.label} className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest italic">
                      <span className="text-slate-400">{p.label}</span>
                      {p.active ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <X className="w-3.5 h-3.5 text-slate-200" />}
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest border-t border-slate-100 pt-4 mt-2">
                    <span className="text-slate-500 italic">Membros Ativos</span>
                    <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">{cat._count?.users || 0}</span>
                  </div>
                </div>
              </div>
            ))}
            
            <button 
              onClick={() => setEditingCat({ nome: '', canAccessComercial: true })}
              className="border-2 border-dashed border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center gap-4 text-slate-300 hover:border-blue-400 hover:text-blue-500 transition-all bg-slate-50/20 group"
            >
              <Plus className="w-10 h-10 transition-transform group-hover:scale-110" />
              <span className="font-black text-[10px] uppercase tracking-[0.2em] italic">Nova Categoria de Acesso</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal Edição Membro */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-blue-600 italic">
                 <div className="flex items-center gap-3">
                    <UsersIcon className="w-5 h-5 text-white" />
                    <h2 className="font-black uppercase tracking-[0.1em] text-white text-sm">Configuração de Membro</h2>
                 </div>
                 <button onClick={() => setEditingUser(null)} className="text-white/60 hover:text-white transition-all"><X className="w-6 h-6" /></button>
              </div>

              <div className="p-10 space-y-8 bg-slate-50/50">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest block">Nome Completo</label>
                       <div className="relative">
                          <UsersIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                          <input 
                            type="text" 
                            className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all"
                            value={editingUser.name}
                            onChange={e => setEditingUser({...editingUser, name: e.target.value})}
                          />
                       </div>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest block">E-mail Corporativo</label>
                       <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                          <input 
                            type="email" 
                            className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all"
                            value={editingUser.email}
                            onChange={e => setEditingUser({...editingUser, email: e.target.value})}
                          />
                       </div>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest block">Senha de Acesso</label>
                       <div className="relative">
                          <Lock className="absolute left-4 top-1/3 -translate-y-1/2 w-4 h-4 text-slate-300" />
                          <input 
                            type="password" 
                            className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all"
                            placeholder={editingUser.id ? "Deixe em branco p/ manter" : "Mínimo 6 caracteres"}
                            onChange={e => setEditingUser({...editingUser, password: e.target.value})}
                          />
                          <p className="text-[9px] text-slate-400 mt-2 font-bold flex items-center gap-1 italic"><Shield className="w-3 h-3" /> Criptografia de Ponta-a-Ponta</p>
                       </div>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest block">Telefone / WhatsApp</label>
                       <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                          <input 
                            type="text" 
                            className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all"
                            value={editingUser.telefone}
                            onChange={e => setEditingUser({...editingUser, telefone: e.target.value})}
                          />
                       </div>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest block">Departamento / Unidade</label>
                       <div className="relative">
                          <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                          <input 
                            type="text" 
                            className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all"
                            value={editingUser.departamento}
                            onChange={e => setEditingUser({...editingUser, departamento: e.target.value})}
                          />
                       </div>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest block">Grupo de Permissão</label>
                       <select 
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all appearance-none cursor-pointer"
                          value={editingUser.roleId}
                          onChange={e => setEditingUser({...editingUser, roleId: e.target.value})}
                        >
                          <option value="">Selecione um grupo...</option>
                          {categorias.map(c => <option key={c.id} value={c.id}>{c.nome.toUpperCase()}</option>)}
                       </select>
                    </div>
                 </div>

                 {/* Assinatura Section */}
                 <div className="space-y-4 pt-6 border-t border-slate-200">
                    <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest block">Assinatura Eletrônica (Sincronizada do Legado)</label>
                    <div className="flex gap-6 items-start">
                      <div className="flex-1 bg-white border-2 border-dashed border-slate-200 rounded-3xl p-6 flex flex-col items-center justify-center min-h-[140px] text-center">
                        {editingUser.signatureUrl ? (
                          <>
                            <img 
                              src={editingUser.signatureUrl} 
                              alt="Assinatura" 
                              className="max-h-24 object-contain brightness-0 contrast-200" 
                              onError={(e) => {
                                (e.target as any).src = 'https://placehold.co/200x100?text=Assinatura+Inv%C3%A1lida';
                              }}
                            />
                            <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase tracking-tighter">URL: {editingUser.signatureUrl.split('/').pop()}</p>
                          </>
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-slate-300">
                            <Settings className="w-8 h-8 opacity-20" />
                            <p className="text-[10px] font-black uppercase italic italic tracking-tighter">Nenhuma assinatura migrada</p>
                          </div>
                        )}
                      </div>
                      <div className="w-64 space-y-3">
                        <div className="relative">
                          <input 
                            type="file" 
                            id="signature-upload"
                            className="hidden" 
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const formData = new FormData();
                              formData.append('file', file);
                              try {
                                const res = await api.post('/upload', formData, {
                                  headers: { 'Content-Type': 'multipart/form-data' }
                                });
                                setEditingUser({ ...editingUser, signatureUrl: res.data.url });
                              } catch (err) {
                                console.error('Upload failed', err);
                                showToast('Falha ao subir imagem');
                              }
                            }}
                          />
                          <label 
                            htmlFor="signature-upload"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-3 text-[10px] font-black uppercase italic tracking-widest text-center cursor-pointer flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/10"
                          >
                             <Upload className="w-4 h-4" /> Selecionar Imagem
                          </label>
                        </div>
                        <input 
                          type="text" 
                          placeholder="URL da Assinatura..." 
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                          value={editingUser.signatureUrl || ''}
                          onChange={e => setEditingUser({...editingUser, signatureUrl: e.target.value})}
                        />
                        <p className="text-[9px] text-slate-400 leading-relaxed font-medium text-justify">As assinaturas são essenciais para a geração de PDFs com validade comercial e jurídica.</p>
                      </div>
                    </div>
                 </div>
              </div>

              <div className="p-6 bg-slate-100 flex justify-end gap-3 border-t border-slate-200">
                 <button onClick={() => setEditingUser(null)} className="px-6 py-3 text-[10px] font-black uppercase text-slate-500 hover:text-slate-800 transition-all italic">Cancelar</button>
                 <button 
                    onClick={handleSaveUser}
                    className="bg-slate-800 hover:bg-slate-900 text-white px-10 py-3.5 rounded-2xl flex items-center gap-2 transition-all shadow-xl shadow-slate-200 text-[10px] font-black uppercase italic tracking-widest"
                 >
                    <Save className="w-5 h-5" /> Confirmar Cadastro
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Modal Edição Permissões — Granular */}
      {editingCat && (
        <PermissaoModal 
          categoria={editingCat} 
          onClose={() => setEditingCat(null)} 
          onSaved={() => { setEditingCat(null); fetchData(); }}
        />
      )}
    </div>
  );
}

// Subcomponente para renderização de toggles mais elegantes
function PermissionToggle({ label, active, onToggle }: { label: string, active: boolean, onToggle: () => void }) {
  return (
    <div 
      onClick={onToggle}
      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group ${active ? 'border-blue-500 bg-blue-50/30' : 'border-slate-100 hover:bg-white hover:border-slate-200 hover:shadow-sm'}`}
    >
      <span className={`text-[10px] font-black uppercase tracking-tighter italic transition-colors ${active ? 'text-blue-700' : 'text-slate-400 group-hover:text-slate-600'}`}>
        {label}
      </span>
      <div className={`w-8 h-4 rounded-full relative transition-all ${active ? 'bg-blue-600' : 'bg-slate-200 shadow-inner'}`}>
        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm ${active ? 'left-[1.125rem] scale-110' : 'left-0.5'}`}></div>
      </div>
    </div>
  );
}

// ── Modal de Permissões Granulares ──────────────────────────────
function PermissaoModal({ categoria, onClose, onSaved }: { categoria: any, onClose: () => void, onSaved: () => void }) {
  const [allPerms, setAllPerms] = useState<Record<string, any[]>>({});
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [nome, setNome] = useState(categoria.nome || '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [permsRes, catRes] = await Promise.all([
          api.get('/permissions'),
          categoria.id ? api.get(`/permissions/categorias/${categoria.id}`) : Promise.resolve({ data: { permissionKeys: [] } })
        ]);
        setAllPerms(permsRes.data.grouped || {});
        setSelectedKeys(new Set(catRes.data.permissionKeys || []));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [categoria.id]);

  const toggleKey = (chave: string) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(chave)) next.delete(chave); else next.add(chave);
      return next;
    });
  };

  const toggleModule = (modulo: string) => {
    const modulePerms = allPerms[modulo] || [];
    const allSelected = modulePerms.every(p => selectedKeys.has(p.chave));
    setSelectedKeys(prev => {
      const next = new Set(prev);
      modulePerms.forEach(p => { if (allSelected) next.delete(p.chave); else next.add(p.chave); });
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save categoria name (legacy)
      if (categoria.id) {
        await api.patch(`/categorias/${categoria.id}`, { nome });
        await api.put(`/permissions/categorias/${categoria.id}`, { permissionKeys: Array.from(selectedKeys) });
      } else {
        const res = await api.post('/categorias', { nome, canAccessComercial: true });
        if (res.data?.id) {
          await api.put(`/permissions/categorias/${res.data.id}`, { permissionKeys: Array.from(selectedKeys) });
        }
      }
      onSaved();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const moduleLabels: Record<string, string> = {
    financeiro: '💰 Financeiro', comercial: '📊 Comercial', logistica: '🚛 Logística',
    medicoes: '📐 Medições', rh: '👥 RH / DP', frota: '🚗 Frota',
    manutencao: '🔧 Manutenção', estoque: '📦 Estoque', admin: '⚙️ Administração',
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] w-full max-w-5xl shadow-2xl overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-black uppercase tracking-widest text-lg text-slate-800 italic">Permissões Granulares</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Selecione as ações permitidas para cada módulo</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
              {selectedKeys.size} permissões
            </span>
            <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="max-w-sm mb-6">
            <label className="text-[10px] font-black text-slate-400 uppercase italic block mb-2">Nome da Categoria</label>
            <input type="text" value={nome} onChange={e => setNome(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 font-bold text-slate-800"
              placeholder="Ex: Financeiro Senior" />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(allPerms).map(([modulo, perms]) => {
                const allChecked = perms.every(p => selectedKeys.has(p.chave));
                const someChecked = perms.some(p => selectedKeys.has(p.chave));
                return (
                  <div key={modulo} className="border border-slate-200 rounded-2xl overflow-hidden">
                    <div
                      onClick={() => toggleModule(modulo)}
                      className={`p-3 flex items-center justify-between cursor-pointer transition-all ${allChecked ? 'bg-blue-600 text-white' : someChecked ? 'bg-blue-50 text-blue-800' : 'bg-slate-50 text-slate-700'}`}
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest italic">
                        {moduleLabels[modulo] || modulo}
                      </span>
                      <span className="text-[9px] font-bold opacity-70">
                        {perms.filter(p => selectedKeys.has(p.chave)).length}/{perms.length}
                      </span>
                    </div>
                    <div className="p-2 space-y-1 bg-white">
                      {perms.map(p => (
                        <label key={p.chave} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={selectedKeys.has(p.chave)}
                            onChange={() => toggleKey(p.chave)}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-slate-700 truncate">{p.descricao}</p>
                            <p className="text-[8px] text-slate-400 font-mono truncate">{p.chave}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase italic">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="bg-slate-800 hover:bg-black text-white px-10 py-3.5 rounded-2xl text-[10px] font-black uppercase italic flex items-center gap-2 shadow-xl disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar Permissões'}
          </button>
        </div>
      </div>
    </div>
  );
}

