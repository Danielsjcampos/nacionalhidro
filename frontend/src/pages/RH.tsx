import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  Users, Briefcase, UserPlus, Stethoscope, AlertTriangle, 
  Loader2, RefreshCw, BarChart3, Palmtree, ArrowRight, ClipboardList, Clock, X
} from 'lucide-react';

interface StatCardProps {
  icon: any;
  value: string | number | undefined;
  label: string;
  color?: string;
  bgColor?: string;
  gradient?: string;
  onClick?: () => void;
  details?: { label: string; value: any };
}

const StatCard = ({ icon: Icon, value, label, color, bgColor, gradient, onClick, details }: StatCardProps) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-2xl border border-slate-200 overflow-hidden transition-all ${onClick ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-blue-300' : 'hover:shadow-sm'}`}
  >
    <div className={`p-4 ${gradient ? gradient : bgColor} flex items-center justify-between`}>
      <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm`}>
          <Icon className={`w-5 h-5 ${gradient ? 'text-white' : color}`} />
          </div>
          <div>
              <p className={`text-2xl font-black ${gradient ? 'text-white' : color} leading-none`}>{value !== undefined ? value : '—'}</p>
              <p className={`text-xs font-bold uppercase mt-1 ${gradient ? 'text-white/80' : 'text-slate-500'}`}>{label}</p>
          </div>
      </div>
      {onClick && <ArrowRight className={`w-5 h-5 ${gradient ? 'text-white/50' : 'text-slate-300'}`} />}
    </div>
    {details && (
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">{details.label}</span>
            <span className="text-xs font-bold text-slate-700">{details.value}</span>
        </div>
    )}
  </div>
);

const AlertDetailsModal = ({ isOpen, onClose, title, type, data }: { isOpen: boolean, onClose: () => void, title: string, type: string, data: any[] }) => {
    if (!isOpen) return null;

    const formatDate = (date: any) => date ? new Date(date).toLocaleDateString('pt-BR') : '---';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div>
                        <h3 className="text-lg font-black text-slate-800">{title}</h3>
                        <p className="text-xs font-medium text-slate-500">{data.length} registros encontrados</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>
                
                <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
                    {data.length === 0 ? (
                        <div className="py-12 text-center">
                            <p className="text-slate-400 font-medium">Nenhum registro encontrado para este alerta.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {data.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center font-bold text-slate-400">
                                            {(item.funcionario?.nome || item.nome || '?').charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">{item.funcionario?.nome || item.nome}</p>
                                            <p className="text-xs text-slate-500">{item.funcionario?.cargo || item.cargo} • {item.funcionario?.departamento || item.departamento}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] uppercase font-bold text-slate-400">Vencimento</p>
                                        <p className="text-xs font-black text-blue-600">
                                            {formatDate(item.dataVencimento || item.dataVencimentoCNH || item.dataAdmissao || item.dataVencimentoMOPP)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-900 transition-all">
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};
export default function RH() {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [attendance, setAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Alerta Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalType, setModalType] = useState('');
  const [modalData, setModalData] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchDashboard = async () => {
    try {
      const [resStats, resAtt] = await Promise.all([
        api.get('/dashboard-rh/stats'),
        api.get('/rh/attendance/today').catch(() => ({ data: { ativos: 0, presentes: 0, faltas: 0 } }))
      ]);
      setData(resStats.data);
      setAttendance(resAtt.data);
    } catch (err) {
      console.error('Failed to fetch RH dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  const openAlertDetails = async (type: string, title: string) => {
    setModalTitle(title);
    setModalType(type);
    setModalOpen(true);
    setModalLoading(true);
    setModalData([]);
    
    try {
        const res = await api.get(`/dashboard-rh/detalhes?tipo=${type}`);
        setModalData(res.data);
    } catch (err) {
        console.error('Failed to fetch alert details', err);
    } finally {
        setModalLoading(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }


  const d = data || {};
  const alertas = d.detalhesAlertas || {};

  return (
    <div className="h-full flex flex-col space-y-6 overflow-y-auto bg-slate-50 p-6 rounded-3xl">
      {/* Header with Quick Actions */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Painel Gerencial RH</h1>
            <p className="text-sm font-medium text-slate-500">Indicadores em tempo real para tomada de decisão</p>
            </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => navigate('/admissao')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            <UserPlus className="w-4 h-4" /> Pipeline de Admissão
          </button>
          <button
            onClick={() => navigate('/recrutamento')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            <Briefcase className="w-4 h-4" /> Vagas & Recrutamento
          </button>
          <button 
            aria-label="Atualizar indicadores"
            onClick={fetchDashboard} 
            className="p-2 border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 rounded-xl transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ativos */}
        <StatCard 
            icon={Users} value={attendance?.ativos || d.colaboradoresAtivos || 0} label="Ativos na Empresa" color="text-slate-800" bgColor="bg-white"
            gradient="bg-gradient-to-br from-slate-800 to-slate-900"
            onClick={() => navigate('/relatorios-rh')}
        />
        
        {/* Recrutamento */}
        <StatCard 
            icon={Briefcase} value={d.emRecrutamento} label="Candidatos no Funil" color="text-blue-600" bgColor="bg-blue-50"
            details={{ label: 'Vagas Abertas', value: d.vagasAbertas }}
            onClick={() => navigate('/recrutamento')}
        />

        {/* Admissão */}
        <StatCard 
            icon={UserPlus} value={d.emProcessoAdmissao} label="Em Processo de Admissão" color="text-indigo-600" bgColor="bg-indigo-50"
            details={{ label: 'Esperando Assinatura/Exames', value: d.emProcessoAdmissao }}
            onClick={() => navigate('/admissao')}
        />

        {/* Alertas */}
        <StatCard 
            icon={AlertTriangle} value={d.alertasPendentes} label="Alertas Pendentes" color="text-blue-600" bgColor="bg-blue-50"
            gradient={d.alertasPendentes > 0 ? "bg-gradient-to-br from-blue-800 to-blue-950" : "bg-emerald-50"}
            onClick={() => navigate('/aso-controle')}
        />
      </div>

      {/* Secondary Metrics & Quick Links */}
      <h2 className="text-lg font-black text-slate-800 pt-4 border-b border-slate-200 pb-2">Detalhes Operacionais</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-blue-400 cursor-pointer transition-colors group" onClick={() => openAlertDetails('ASO', 'ASOs Vencendo (Próximos 30 dias)')}>
              <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                      <Stethoscope className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                      <h3 className="text-sm font-bold text-slate-700 group-hover:text-blue-600">ASOs Vencendo (30d)</h3>
                      <p className="text-xs text-slate-500 mt-1">Exames médicos expirando na clínica</p>
                  </div>
              </div>
              <div className="text-2xl font-black text-slate-800 bg-slate-50 w-12 h-12 rounded-xl flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all">
                  {alertas.asoVencendo || d.experiencia45 || 0}
              </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-cyan-400 cursor-pointer transition-colors group" onClick={() => openAlertDetails('FERIAS', 'Colaboradores com Férias a Vencer')}>
              <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-cyan-50 flex items-center justify-center group-hover:bg-cyan-100 transition-colors">
                      <Palmtree className="w-5 h-5 text-cyan-500" />
                  </div>
                  <div>
                      <h3 className="text-sm font-bold text-slate-700 group-hover:text-cyan-600">Férias a Vencer</h3>
                      <p className="text-xs text-slate-500 mt-1">Colaboradores com o 2º período vencendo</p>
                  </div>
              </div>
              <div className="text-2xl font-black text-slate-800 bg-slate-50 w-12 h-12 rounded-xl flex items-center justify-center group-hover:bg-cyan-500 group-hover:text-white transition-all">
                  {alertas.feriasVencendo || 0}
              </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-cyan-400 cursor-pointer transition-colors group" onClick={() => openAlertDetails('CNH', 'CNHs dos Motoristas Vencendo')}>
              <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-cyan-50 flex items-center justify-center group-hover:bg-cyan-100 transition-colors">
                      <ClipboardList className="w-5 h-5 text-cyan-500" />
                  </div>
                  <div>
                      <h3 className="text-sm font-bold text-slate-700 group-hover:text-cyan-600">CNHs Vencendo</h3>
                      <p className="text-xs text-slate-500 mt-1">Documentos dos motoristas expirando</p>
                  </div>
              </div>
              <div className="text-2xl font-black text-slate-800 bg-slate-50 w-12 h-12 rounded-xl flex items-center justify-center group-hover:bg-cyan-500 group-hover:text-white transition-all">
                  {alertas.cnhVencendo || 0}
              </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-blue-400 cursor-pointer transition-colors group" onClick={() => navigate('/seguranca-trabalho')}>
              <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                      <AlertTriangle className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                      <h3 className="text-sm font-bold text-slate-700 group-hover:text-blue-600">Treinamentos Vencendo</h3>
                      <p className="text-xs text-slate-500 mt-1">NRs e certificações expirando</p>
                  </div>
              </div>
              <div className="text-2xl font-black text-slate-800 bg-slate-50 w-12 h-12 rounded-xl flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all">
                  {alertas.treinamentoVencendo || 0}
              </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-blue-400 cursor-pointer transition-colors group" onClick={() => navigate('/ponto')}>
              <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                      <AlertTriangle className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                      <h3 className="text-sm font-bold text-slate-700 group-hover:text-blue-700">Faltas Hoje</h3>
                      <p className="text-xs text-slate-500 mt-1">Sincronizado via TiqueTaque</p>
                  </div>
              </div>
              <div className="text-2xl font-black text-slate-800 bg-slate-50 w-12 h-12 rounded-xl flex items-center justify-center group-hover:bg-blue-800 group-hover:text-white transition-all">
                  {attendance?.faltas ?? d.faltasHoje ?? 0}
              </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-indigo-400 cursor-pointer transition-colors group" onClick={() => openAlertDetails('EXPERIENCIA_45', 'Vencimento de Experiência (45 Dias)')}>
              <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                      <Clock className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div>
                      <h3 className="text-sm font-bold text-slate-700 group-hover:text-indigo-600">Venc. Experiência</h3>
                      <p className="text-xs text-slate-500 mt-1">Contratos de 45/90 dias vencendo</p>
                  </div>
              </div>
              <div className="flex flex-col items-center gap-1">
                  <span className="text-xs font-bold text-slate-400 hover:text-indigo-600" onClick={(e) => { e.stopPropagation(); openAlertDetails('EXPERIENCIA_45', 'Vencimento de Experiência (45 Dias)'); }}>45d: {d.experiencia45 || 0}</span>
                  <span className="text-xs font-bold text-slate-400 hover:text-indigo-600" onClick={(e) => { e.stopPropagation(); openAlertDetails('EXPERIENCIA_90', 'Vencimento de Experiência (90 Dias)'); }}>90d: {d.experiencia90 || 0}</span>
              </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-slate-400 cursor-pointer transition-colors group" onClick={() => navigate('/desligamento')}>
              <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                      <Users className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                      <h3 className="text-sm font-bold text-slate-700 group-hover:text-slate-900">Demissões (30d)</h3>
                      <p className="text-xs text-slate-500 mt-1">Colaboradores desligados recentemente</p>
                  </div>
              </div>
              <div className="text-2xl font-black text-slate-800 bg-slate-50 w-12 h-12 rounded-xl flex items-center justify-center group-hover:bg-slate-800 group-hover:text-white transition-all">
                  {d.desligamentos30d || 0}
              </div>
          </div>

      </div>

      <AlertDetailsModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        title={modalTitle} 
        type={modalType} 
        data={modalData} 
      />
    </div>
  );
}
