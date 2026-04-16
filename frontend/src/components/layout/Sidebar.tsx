import { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Truck,
  DollarSign,
  Settings,
  LogOut,
  ChevronRight,
  Briefcase,
  Menu,
  ShieldCheck,
  Wrench,
} from 'lucide-react';

interface SubItem {
  label: string;
  path: string;
}

interface MenuGroup {
  icon: any;
  label: string;
  path?: string; // link direto (sem filhos)
  children?: SubItem[];
}

const menuGroups: MenuGroup[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  {
    icon: Briefcase, label: 'Comercial',
    children: [
      { label: 'Propostas', path: '/propostas' },
      { label: 'CRM Kanban', path: '/crm' },
      { label: 'Clientes', path: '/clientes' },
    ]
  },
  {
    icon: Truck, label: 'Logística',
    children: [
      { label: 'Ordens de Serviço', path: '/os' },
      { label: 'Agendamento Logístico', path: '/agendamentos' },
      { label: 'Logística Diária', path: '/logistica' },
      { label: 'Hospedagem & Viagens', path: '/hospedagens' },
      { label: 'Painel Logística', path: '/dashboard-logistica' },
      { label: 'Escala', path: '/escala' },
      { label: 'Escalas & RDO', path: '/rdo' },
      { label: 'Painel Motorista', path: '/painel-motorista' },
    ]
  },
  {
    icon: ShieldCheck, label: 'Segurança',
    children: [
      { label: 'Segurança do Trab.', path: '/seguranca-trabalho' },
    ]
  },
  {
    icon: ClipboardList, label: 'Medição',
    children: [
      { label: 'Medições', path: '/medicoes' },
    ]
  },
  {
    icon: DollarSign, label: 'Financeiro',
    children: [
      { label: 'Dashboard Financeiro', path: '/dashboard-financeiro' },
      { label: 'Pedidos de Compra', path: '/pedidos-compra' },
      { label: 'Contas a Pagar', path: '/contas-pagar' },
      { label: 'Contas a Receber', path: '/contas-receber' },
      { label: 'Cobrança de Débitos', path: '/cobranca' },
      { label: 'Faturamento', path: '/faturamento' },
      { label: 'Contratos', path: '/contratos' },
      { label: 'Fluxo de Caixa Diário', path: '/fluxo-caixa-diario' },
      { label: 'Relatórios & DRE', path: '/relatorios' },
      { label: 'DRE por CNPJ', path: '/dre' },
      { label: 'Centro de Custo', path: '/centros-custo' },
      { label: 'Plano de Contas', path: '/plano-contas' },
      { label: 'Contas Bancárias', path: '/contas-bancarias' },
      { label: 'Multi-CNPJ', path: '/empresas' },
    ]
  },
  {
    icon: Users, label: 'RH',
    children: [
      { label: 'Recrutamento (Kanban)', path: '/workflows/305769026' },
      { label: 'Admissão (Kanban)', path: '/workflows/305769030' },
      { label: 'Gestão de Colaboradores (Kanban)', path: '/workflows/306170058' },
      { label: 'Férias (Kanban)', path: '/workflows/306169969' },
      { label: 'Desligamento (Kanban)', path: '/workflows/305806492' },
      { label: '---', path: '#' },
      { label: 'Dashboard de Integrações', path: '/integracoes' },
      { label: 'Gestão Avançada (Legado)', path: '/rh' },
      { label: 'Triagem IA', path: '/triagem-ia' },
      { label: 'Controle ASO', path: '/aso-controle' },
      { label: 'Ponto Eletrônico', path: '/ponto' },
      { label: 'Relatórios RH', path: '/relatorios-rh' },
      { label: 'WhatsApp RH', path: '/whatsapp' },
    ]
  },
  {
    icon: Truck, label: 'Frota',
    children: [
      { label: 'Monitoramento GPS', path: '/frota/mapa' },
      { label: 'Veículos e Documentos', path: '/frota/veiculos' },
      { label: 'Checklist Veicular', path: '/checklist' },
      { label: 'Manutenção', path: '/manutencao' },
    ]
  },
  {
    icon: Wrench, label: 'Estoque',
    children: [
      { label: 'Controle de Estoque', path: '/estoque/controle' },
      { label: 'Equipamentos', path: '/estoque/equipamentos' },
    ]
  },
  {
    icon: Settings, label: 'Sistema',
    children: [
      { label: 'Painel Geral', path: '/administracao' },
      { label: 'Fornecedores', path: '/fornecedores' },
      { label: 'Equipe & Permissões', path: '/usuarios' },
      { label: 'Configurações', path: '/configuracoes' },
      { label: 'Monitoramento', path: '/monitor' },
      { label: 'Log de Alterações', path: '/audit-log' },
      { label: 'Migração de Dados', path: '/migracao' },
    ]
  },
];

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
}

export default function Sidebar({ isCollapsed, setIsCollapsed }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [config, setConfig] = useState<any>(null);
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await api.get('/configuracoes');
        setConfig(res.data);
        if (res.data?.favicon) {
          const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
          if (link) {
            link.href = res.data.favicon;
          } else {
            const newLink = document.createElement('link');
            newLink.rel = 'icon';
            newLink.href = res.data.favicon;
            document.head.appendChild(newLink);
          }
        }
      } catch (e) { console.error(e); }
    };
    fetchConfig();
  }, []);

  // Check if sub-item is active
  const isSubItemActive = (item: SubItem): boolean => {
    return location.pathname.startsWith(item.path);
  };

  // Auto-open group containing current path
  useEffect(() => {
    const current = menuGroups.find(g =>
      g.children?.some(c => isSubItemActive(c))
    );
    if (current) setOpenGroup(current.label);
  }, [location.pathname]);

  const userJson = localStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : null;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const userInitials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
    : 'AD';

  const isGroupActive = (group: MenuGroup) => {
    if (group.path) return location.pathname === group.path;
    return group.children?.some(c => isSubItemActive(c)) || false;
  };

  const toggleGroup = (label: string) => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setOpenGroup(label);
    } else {
      setOpenGroup(prev => prev === label ? null : label);
    }
  };

  // Permission-based menu filtering
  const filteredGroups = menuGroups.filter(g => {
    // Dashboard and Sistema are always visible
    if (['Dashboard', 'Sistema'].includes(g.label)) return true;
    
    const perms = user?.permissoes;
    // If no permissions object (legacy admin or role=admin), show everything
    if (!perms || user?.role === 'admin') return true;

    // Map sidebar groups to permission keys
    const groupPermMap: Record<string, (keyof typeof perms)[]> = {
      'Comercial':  ['comercial'],
      'Logística':  ['logistica', 'operacao'],
      'Frota':      ['frota', 'manutencao'],
      'Estoque':    ['estoque'],
      'Segurança':  ['rh'], // segurança está vinculada ao RH
      'Medição':    ['medicoes'],
      'Financeiro': ['financeiro', 'contasPagar', 'contasReceber', 'cobranca', 'faturamento'],
      'RH':         ['rh', 'dp'],
    };

    const requiredPerms = groupPermMap[g.label];
    if (!requiredPerms) return true; // not mapped = show
    
    // Show group if user has ANY of the required permissions
    return requiredPerms.some(key => (perms as any)?.[key]);
  });

  return (
    <aside className={`fixed left-0 top-0 h-screen bg-slate-900 text-white flex flex-col z-20 shadow-xl overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className={`p-4 border-b border-white/10 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} relative min-h-[73px]`}>
        {!isCollapsed && config?.logo ? (
          <div className="w-full h-10 flex flex-1 items-center justify-center overflow-hidden pr-8">
            <img src={config.logo} alt="Logo" className="max-w-full max-h-full object-contain" />
          </div>
        ) : !isCollapsed ? (
          <div className="flex-1 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <div className="overflow-hidden">
              <h1 className="font-bold text-lg leading-tight truncate">Nacional Hidro</h1>
              <p className="text-[10px] text-slate-400 truncate">Sistema Integrado</p>
            </div>
          </div>
        ) : (
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`absolute text-slate-400 hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 p-1.5 rounded-md ${isCollapsed ? 'right-auto' : 'right-4'}`}
          title={isCollapsed ? "Expandir" : "Recolher"}
        >
          <Menu className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 custom-scrollbar">
        {filteredGroups.map((group) => {
          const Icon = group.icon;
          const active = isGroupActive(group);
          const isOpen = openGroup === group.label;

          // Direct link (no children)
          if (group.path) {
            return (
              <NavLink
                key={group.label}
                to={group.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg transition-all text-sm ${isCollapsed ? 'justify-center py-3' : 'px-3 py-2'
                  } ${isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`
                }
                title={isCollapsed ? group.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span className="font-medium truncate">{group.label}</span>}
              </NavLink>
            );
          }

          // Group with children
          return (
            <div key={group.label}>
              <button
                onClick={() => toggleGroup(group.label)}
                className={`w-full flex items-center gap-3 rounded-lg transition-all text-sm group ${isCollapsed ? 'justify-center py-3' : 'px-3 py-2'
                  } ${active ? 'text-white bg-white/5' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                title={isCollapsed ? group.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && (
                  <>
                    <span className="font-medium flex-1 text-left truncate">{group.label}</span>
                    <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                  </>
                )}
              </button>

              {/* Submenu with slide animation */}
              <div
                className={`overflow-hidden transition-all duration-200 ease-in-out ${isCollapsed ? 'hidden' : ''}`}
                style={{
                  maxHeight: isOpen ? `${(group.children?.length || 0) * 36}px` : '0px',
                  opacity: isOpen ? 1 : 0,
                }}
              >
                <div className="ml-4 pl-3 border-l border-white/10 py-1 space-y-0.5">
                  {group.children?.map((child) => (
                    child.label === '---' ? (
                      <div key={child.path} className="h-px bg-white/10 my-2 mx-3" />
                    ) : (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={({ isActive }) =>
                          `block px-3 py-1.5 rounded-md transition-all text-xs ${isActive
                            ? 'bg-blue-600/80 text-white font-bold'
                            : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
                          }`
                        }
                      >
                        {child.label}
                      </NavLink>
                    )
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      <div className={`p-3 border-t border-white/10 ${isCollapsed ? 'flex justify-center' : ''}`}>
        <div className={`flex items-center gap-3 px-3 py-2 bg-slate-800/50 rounded-lg ${isCollapsed ? 'flex-col px-1 py-3 justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-300 flex-shrink-0" title={user?.name}>
            {userInitials}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <NavLink to="/perfil" className="block hover:text-blue-400 transition-colors">
                <p className="text-sm font-medium truncate">{user?.name || 'Administrador'}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email || 'admin@nacional.com'}</p>
              </NavLink>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex-shrink-0 ${isCollapsed ? 'mt-1' : ''}`}
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
