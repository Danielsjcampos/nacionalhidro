import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard,
  ClipboardList,
  Users, 
  FileText, 
  Truck, 
  Wrench, 
  DollarSign, 
  BarChart3, 
  Settings,
  Shield,
  Package,
  Activity
} from 'lucide-react';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: FileText, label: 'Propostas', path: '/propostas' },
  { icon: ClipboardList, label: 'Ordens de Serviço', path: '/os' },
  { icon: Users, label: 'Clientes', path: '/clientes' },
  { icon: Truck, label: 'Logística', path: '/logistica' },
  { icon: Wrench, label: 'Manutenção', path: '/manutencao' },
  { icon: Package, label: 'Estoque & Equip.', path: '/estoque' },
  { icon: DollarSign, label: 'Financeiro', path: '/financeiro' },
  { icon: Users, label: 'RH', path: '/rh' },
  { icon: Shield, label: 'Equipe & Permissões', path: '/usuarios' },
  { icon: BarChart3, label: 'Relatórios', path: '/relatorios' },
  { icon: Activity, label: 'Monitoramento', path: '/monitor' },
  { icon: Settings, label: 'Configurações', path: '/configuracoes' },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900 text-white flex flex-col z-20 shadow-xl overflow-hidden">
      <div className="p-6 border-b border-white/10 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <LayoutDashboard className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight">Nacional Hidro</h1>
          <p className="text-xs text-slate-400">Sistema Integrado</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium text-sm">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2 bg-slate-800/50 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-300">
            AD
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">Administrador</p>
            <p className="text-xs text-slate-500 truncate">admin@nacional.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
