import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import OS from './pages/OS';
import EstoqueEquipamentos from './pages/EstoqueEquipamentos';
import EstoqueControle from './pages/EstoqueControle';
import Logistica from './pages/Logistica';
import Escala from './pages/Escala';
import FrotaMonitoramento from './pages/FrotaMonitoramento';
import FrotaVeiculos from './pages/FrotaVeiculos';

import Manutencao from './pages/Manutencao';
import Propostas from './pages/Propostas';

import RH from './pages/RH';
import Usuarios from './pages/Usuarios';
import Monitor from './pages/Monitor';
import CRM from './pages/CRM';
import Configuracoes from './pages/Configuracoes';
import Medicoes from './pages/Medicoes';
import AuditLog from './pages/AuditLog';
import Recrutamento from './pages/Recrutamento';
import RDO from './pages/RDO';
import FaturamentoPage from './pages/Faturamento';
import DashboardLogistica from './pages/DashboardLogistica';
import Fornecedores from './pages/Fornecedores';
import ContasPagarPage from './pages/ContasPagarPage';
import ContasReceberPage from './pages/ContasReceberPage';
import EmpresasPage from './pages/EmpresasPage';
import FluxoCaixa from './pages/FluxoCaixa';
import AdmissaoPage from './pages/AdmissaoPage';
import PainelMotorista from './pages/PainelMotorista';
import HospedagemPage from './pages/HospedagemPage';
import CentroCustoPage from './pages/CentroCustoPage';
import DrePage from './pages/DrePage';
import WhatsAppPage from './pages/WhatsAppPage';
import TriagemIAPage from './pages/TriagemIAPage';
import PontoEletronicoPage from './pages/PontoEletronicoPage';
import SegurancaTrabalhoPage from './pages/SegurancaTrabalhoPage';
import MigracaoPage from './pages/MigracaoPage';
import Administracao from './pages/Administracao';
import FeriasPage from './pages/FeriasPage';
import DesligamentoPage from './pages/DesligamentoPage';
import PedidosCompraPage from './pages/PedidosCompraPage';
import InscricaoPublica from './pages/InscricaoPublica';
import PortalAdmissao from './pages/PortalAdmissao';
import RelatoriosRHPage from './pages/RelatoriosRHPage';
import ASOControlePage from './pages/ASOControlePage';
import CobrancaPage from './pages/CobrancaPage';
import PlanoContasPage from './pages/PlanoContasPage';
import DashboardFinanceiroPage from './pages/DashboardFinanceiroPage';
import FluxoCaixaDiario from './pages/FluxoCaixaDiario';
import ContasBancariasPage from './pages/ContasBancariasPage';
import ImportacaoXMLPage from './pages/ImportacaoXMLPage';
import PreReservaPage from './pages/PreReservaPage';
import Contratos from './pages/Contratos';
import GestaoColaboradoresPage from './pages/GestaoColaboradoresPage';
import Agendamentos from './pages/Agendamentos';
import WorkflowList from './pages/Workflow/WorkflowList';
import WorkflowBoard from './pages/Workflow/WorkflowBoard';
import WorkflowSettings from './pages/Workflow/WorkflowSettings';
import PublicWorkflowForm from './pages/Workflow/PublicWorkflowForm';
import IntegracoesPage from './pages/IntegracoesPage';
import PerfilPage from './pages/PerfilPage';
import ChecklistPage from './pages/ChecklistPage';
import RelatoriosCentralPage from './pages/RelatoriosCentralPage';
import OcorrenciasPage from './pages/OcorrenciasPage';
import ProcessosTrabalhistasPage from './pages/ProcessosTrabalhistasPage';
import VagaSolicitacaoPage from './pages/VagaSolicitacao';
import VencimentosPage from './pages/VencimentosPage';
import DocumentosSeguracaPage from './pages/DocumentosSeguracaPage';


// Route-to-permission mapping (granular keys)
const routePermissions: Record<string, string[]> = {
  '/dashboard': ['financeiro.dashboard.ver', 'logistica.dashboard.ver', 'rh.funcionarios.listar', 'comercial.propostas.listar'],
  '/propostas': ['comercial.propostas.listar'], '/crm': ['comercial.crm.ver'], '/clientes': ['comercial.clientes.listar'],
  '/os': ['logistica.os.listar'], '/logistica': ['logistica.escala.listar'],
  '/agendamentos': ['logistica.escala.listar'],
  '/hospedagens': ['logistica.hospedagem.listar'], '/dashboard-logistica': ['logistica.dashboard.ver'],
  '/escala': ['logistica.escala.listar'], '/rdo': ['logistica.rdo.listar'],
  '/painel-motorista': ['logistica.os.listar'],
  '/frota/mapa': ['frota.mapa.ver'], '/frota/veiculos': ['frota.veiculos.listar'],
  '/manutencao': ['manutencao.listar'],
  '/checklist': ['frota.checklist.ver'],
  '/estoque/controle': ['estoque.listar'], '/estoque/equipamentos': ['estoque.equipamentos.ver'],
  '/seguranca-trabalho': ['rh.funcionarios.listar'],
  '/medicoes': ['medicoes.listar'],
  '/dashboard-financeiro': ['financeiro.dashboard.ver'],
  '/pedidos-compra': ['financeiro.contas_pagar.listar'],
  '/contas-pagar': ['financeiro.contas_pagar.listar'], '/contas-receber': ['financeiro.contas_receber.listar'],
  '/cobranca': ['financeiro.cobranca.listar'], '/faturamento': ['financeiro.faturamento.listar'],
  '/contratos': ['financeiro.faturamento.listar'], '/fluxo-caixa-diario': ['financeiro.fluxo_caixa.ver'],
  '/relatorios': ['financeiro.dre.ver'], '/dre': ['financeiro.dre.ver'],
  '/centros-custo': ['financeiro.dashboard.ver'], '/plano-contas': ['financeiro.dashboard.ver'],
  '/contas-bancarias': ['financeiro.dashboard.ver'], '/empresas': ['financeiro.dashboard.ver'],
  '/importacao-xml': ['financeiro.contas_pagar.criar'],
  '/gestao-colaboradores': ['rh.funcionarios.listar'], '/rh': ['rh.funcionarios.listar'],
  '/recrutamento': ['rh.recrutamento.ver'], '/admissao': ['rh.admissao.ver'],
  '/ferias': ['rh.ferias.ver'], '/desligamento': ['rh.desligamento.ver'],
  '/aso-controle': ['rh.aso.ver'], '/relatorios-rh': ['rh.relatorios.ver'],
  '/vencimentos': ['rh.aso.ver'], '/documentos-seguranca': ['rh.funcionarios.listar'],
  '/vaga-solicitacoes': ['rh.recrutamento.ver'],
  '/integracoes': ['rh.funcionarios.listar'],
  '/ponto': ['rh.ponto.ver'], '/triagem-ia': ['rh.recrutamento.ver'],
  '/workflows': ['rh.recrutamento.ver', 'rh.admissao.ver'],
  '/ocorrencias': ['rh.ocorrencias.ver'],
  '/processos-trabalhistas': ['rh.funcionarios.listar'],
  '/usuarios': ['admin.usuarios.ver'], '/configuracoes': ['admin.usuarios.ver'],
  '/audit-log': ['admin.logs.ver'],
};

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('accessToken');
  if (!token) return <Navigate to="/login" replace />;

  const userJson = localStorage.getItem('userData');
  const user = userJson ? JSON.parse(userJson) : null;
  const permissionKeys: string[] = user?.permissionKeys || [];
  const perms = user?.permissoes;
  const pathname = window.location.pathname;

  // Admin = acesso total
  const roleName = user?.role?.name || user?.role;
  if (roleName === 'admin') {
    return <MainLayout>{children}</MainLayout>;
  }

  // Verificar permissão granular
  const required = routePermissions[pathname];
  if (required) {
    // Checar pelo novo sistema de chaves granulares
    const hasGranular = permissionKeys.length > 0 && required.some(key => permissionKeys.includes(key));
    // Fallback: checar pelo sistema legado de booleanos
    const hasLegacy = perms && required.some(key => {
      const legacyKey = key.split('.')[0];
      return (perms as any)[legacyKey];
    });

    if (!hasGranular && !hasLegacy) {
      return (
        <MainLayout>
          <div className="flex items-center justify-center h-full">
            <div className="text-center bg-white rounded-2xl border border-slate-200 p-12 shadow-lg max-w-md">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🔒</span>
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Acesso Restrito</h2>
              <p className="text-sm text-slate-500 mb-6">Você não tem permissão para acessar este módulo. Solicite acesso ao administrador do sistema.</p>
              <button onClick={() => window.location.href = '/dashboard'} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all">
                Voltar ao Dashboard
              </button>
            </div>
          </div>
        </MainLayout>
      );
    }
  }

  return <MainLayout>{children}</MainLayout>;
}

import { ToastProvider } from './contexts/ToastContext';

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/inscricao/:vagaId" element={<InscricaoPublica />} />
        <Route path="/workflow/apply/:workflowId" element={<PublicWorkflowForm />} />
        <Route path="/admissao-portal/:id" element={<PortalAdmissao />} />
        <Route path="/escala" element={<ProtectedRoute><Escala /></ProtectedRoute>} />
        <Route path="/contratos" element={<ProtectedRoute><Contratos /></ProtectedRoute>} />


        {/* Protected Routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
        <Route path="/os" element={<ProtectedRoute><OS /></ProtectedRoute>} />
        <Route path="/logistica" element={<ProtectedRoute><Logistica /></ProtectedRoute>} />

        <Route path="/manutencao" element={<ProtectedRoute><Manutencao /></ProtectedRoute>} />
        <Route path="/estoque/controle" element={<ProtectedRoute><EstoqueControle /></ProtectedRoute>} />
        <Route path="/checklist" element={<ProtectedRoute><ChecklistPage /></ProtectedRoute>} />
        <Route path="/estoque/equipamentos" element={<ProtectedRoute><EstoqueEquipamentos /></ProtectedRoute>} />
        <Route path="/propostas" element={<ProtectedRoute><Propostas /></ProtectedRoute>} />
        <Route path="/contas-pagar" element={<ProtectedRoute><ContasPagarPage /></ProtectedRoute>} />
        <Route path="/contas-receber" element={<ProtectedRoute><ContasReceberPage /></ProtectedRoute>} />
        <Route path="/empresas" element={<ProtectedRoute><EmpresasPage /></ProtectedRoute>} />
        <Route path="/cobranca" element={<ProtectedRoute><CobrancaPage /></ProtectedRoute>} />
        <Route path="/plano-contas" element={<ProtectedRoute><PlanoContasPage /></ProtectedRoute>} />
        <Route path="/dashboard-financeiro" element={<ProtectedRoute><DashboardFinanceiroPage /></ProtectedRoute>} />
        <Route path="/gestao-colaboradores" element={<ProtectedRoute><GestaoColaboradoresPage /></ProtectedRoute>} />
        <Route path="/rh" element={<ProtectedRoute><RH /></ProtectedRoute>} />

        <Route path="/medicoes" element={<ProtectedRoute><Medicoes /></ProtectedRoute>} />
        <Route path="/audit-log" element={<ProtectedRoute><AuditLog /></ProtectedRoute>} />
        <Route path="/recrutamento" element={<ProtectedRoute><Recrutamento /></ProtectedRoute>} />
        <Route path="/vaga-solicitacoes" element={<ProtectedRoute><VagaSolicitacaoPage /></ProtectedRoute>} />
        <Route path="/rdo" element={<ProtectedRoute><RDO /></ProtectedRoute>} />
        <Route path="/faturamento" element={<ProtectedRoute><FaturamentoPage /></ProtectedRoute>} />
        <Route path="/dashboard-logistica" element={<ProtectedRoute><DashboardLogistica /></ProtectedRoute>} />
        <Route path="/fornecedores" element={<ProtectedRoute><Fornecedores /></ProtectedRoute>} />
        <Route path="/relatorios" element={<ProtectedRoute><FluxoCaixa /></ProtectedRoute>} />
        <Route path="/ocorrencias" element={<ProtectedRoute><OcorrenciasPage /></ProtectedRoute>} />
        <Route path="/processos-trabalhistas" element={<ProtectedRoute><ProcessosTrabalhistasPage /></ProtectedRoute>} />
        <Route path="/relatorios-central" element={<ProtectedRoute><RelatoriosCentralPage /></ProtectedRoute>} />
        <Route path="/admissao" element={<ProtectedRoute><AdmissaoPage /></ProtectedRoute>} />
        <Route path="/painel-motorista" element={<ProtectedRoute><PainelMotorista /></ProtectedRoute>} />
        <Route path="/frota/mapa" element={<ProtectedRoute><FrotaMonitoramento /></ProtectedRoute>} />
        <Route path="/frota/veiculos" element={<ProtectedRoute><FrotaVeiculos /></ProtectedRoute>} />
        <Route path="/hospedagens" element={<ProtectedRoute><HospedagemPage /></ProtectedRoute>} />
        <Route path="/centros-custo" element={<ProtectedRoute><CentroCustoPage /></ProtectedRoute>} />
        <Route path="/dre" element={<ProtectedRoute><DrePage /></ProtectedRoute>} />
        <Route path="/fluxo-caixa-diario" element={<ProtectedRoute><FluxoCaixaDiario /></ProtectedRoute>} />
        <Route path="/contas-bancarias" element={<ProtectedRoute><ContasBancariasPage /></ProtectedRoute>} />
        <Route path="/importacao-xml" element={<ProtectedRoute><ImportacaoXMLPage /></ProtectedRoute>} />
        <Route path="/pre-reservas" element={<ProtectedRoute><PreReservaPage /></ProtectedRoute>} />
        <Route path="/whatsapp" element={<ProtectedRoute><WhatsAppPage /></ProtectedRoute>} />
        <Route path="/triagem-ia" element={<ProtectedRoute><TriagemIAPage /></ProtectedRoute>} />
        <Route path="/ponto" element={<ProtectedRoute><PontoEletronicoPage /></ProtectedRoute>} />
        <Route path="/seguranca-trabalho" element={<ProtectedRoute><SegurancaTrabalhoPage /></ProtectedRoute>} />
        <Route path="/migracao" element={<ProtectedRoute><MigracaoPage /></ProtectedRoute>} />
        <Route path="/ferias" element={<ProtectedRoute><FeriasPage /></ProtectedRoute>} />
        <Route path="/desligamento" element={<ProtectedRoute><DesligamentoPage /></ProtectedRoute>} />
        <Route path="/relatorios-rh" element={<ProtectedRoute><RelatoriosRHPage /></ProtectedRoute>} />
        <Route path="/aso-controle" element={<ProtectedRoute><ASOControlePage /></ProtectedRoute>} />
        <Route path="/integracoes" element={<ProtectedRoute><IntegracoesPage /></ProtectedRoute>} />
        <Route path="/vencimentos" element={<ProtectedRoute><VencimentosPage /></ProtectedRoute>} />
        <Route path="/documentos-seguranca" element={<ProtectedRoute><DocumentosSeguracaPage /></ProtectedRoute>} />
        <Route path="/agendamentos" element={<ProtectedRoute><Agendamentos /></ProtectedRoute>} />
        <Route path="/workflows" element={<ProtectedRoute><WorkflowList /></ProtectedRoute>} />
        <Route path="/workflows/:id" element={<ProtectedRoute><WorkflowBoard /></ProtectedRoute>} />
        <Route path="/workflows/:id/settings" element={<ProtectedRoute><WorkflowSettings /></ProtectedRoute>} />

        <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
        <Route path="/usuarios" element={<ProtectedRoute><Usuarios /></ProtectedRoute>} />
        <Route path="/monitor" element={<ProtectedRoute><Monitor /></ProtectedRoute>} />
        <Route path="/crm" element={<ProtectedRoute><CRM /></ProtectedRoute>} />
        <Route path="/administracao" element={<ProtectedRoute><Administracao /></ProtectedRoute>} />
        <Route path="/perfil" element={<ProtectedRoute><PerfilPage /></ProtectedRoute>} />
        <Route path="/pedidos-compra" element={<ProtectedRoute><PedidosCompraPage /></ProtectedRoute>} />


        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
