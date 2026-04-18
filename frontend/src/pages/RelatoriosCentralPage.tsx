import { useState } from 'react';
import { 
  FileText, Download, Filter, FileSpreadsheet, 
  BarChart, DollarSign, Users, Truck 
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';

type ReportCategory = 'OPERACIONAL' | 'FINANCEIRO' | 'RH';

interface ReportOption {
  id: string;
  name: string;
  description: string;
  category: ReportCategory;
  icon: any;
  endpoint?: string;
  fields: ('date_range' | 'cliente' | 'veiculo' | 'status')[];
}

const REPORT_OPTIONS: ReportOption[] = [
  {
    id: 'escala-diaria',
    name: 'Escala Diária / Instograma',
    description: 'Relatório logístico de alocação de veículos e equipes por data.',
    category: 'OPERACIONAL',
    icon: Truck,
    fields: ['date_range']
  },
  {
    id: 'produtividade-frota',
    name: 'Produtividade da Frota',
    description: 'Total de horas operadas, custos e ordens de serviço por caminhão.',
    category: 'OPERACIONAL',
    icon: BarChart,
    fields: ['date_range', 'veiculo']
  },
  {
    id: 'fluxo-caixa',
    name: 'Fluxo de Caixa Consolidado',
    description: 'Entradas, saídas e saldos provisionados.',
    category: 'FINANCEIRO',
    icon: DollarSign,
    fields: ['date_range']
  },
  {
    id: 'inadimplencia',
    name: 'Relatório de Inadimplência',
    description: 'Visão geral de faturas atrasadas e títulos não pagos por cliente.',
    category: 'FINANCEIRO',
    icon: FileText,
    fields: ['date_range', 'cliente', 'status']
  },
  {
    id: 'absenteismo',
    name: 'Absenteísmo e Faltas (RH)',
    description: 'Faltas não justificadas e advertências da equipe operacional.',
    category: 'RH',
    icon: Users,
    fields: ['date_range']
  }
];

export default function RelatoriosCentralPage() {
  const { showToast } = useToast();
  const [activeCategory, setActiveCategory] = useState<ReportCategory>('OPERACIONAL');
  const [filterParams, setFilterParams] = useState({
    startDate: '',
    endDate: '',
    clienteId: '',
    veiculoId: '',
    status: ''
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const filteredReports = REPORT_OPTIONS.filter(r => r.category === activeCategory);

  const handleGenerateReport = async (reportId: string, format: 'PDF' | 'EXCEL') => {
    setIsGenerating(true);
    showToast(`Iniciando geração do relatório ${format}...`, 'info');
    
    try {
        // Fallback simulação para as APIs que ainda não possuem PDF export no backend 
        // mas que a interface visual já exige "export":
        await new Promise(res => setTimeout(res, 1200)); 
        showToast('Relatório gerado com sucesso! (Download simulado)', 'success');

        /* 
        // Implementação real seria algo como:
        const response = await api.get(`/relatorios/${reportId}/export`, {
            params: { ...filterParams, format },
            responseType: 'blob'
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `relatorio_${reportId}_${new Date().getTime()}.${format === 'PDF' ? 'pdf' : 'xlsx'}`);
        document.body.appendChild(link);
        link.click();
        */
    } catch (e) {
        showToast('Erro ao gerar relatório', 'error');
    } finally {
        setIsGenerating(false);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Central de Relatórios</h1>
          <p className="text-sm text-slate-500 font-medium">Extração de dados operacionais, financeiros e humanos.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full min-h-0">
        
        {/* Category Sidebar */}
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-2">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 px-2">Categorias</h2>
          
          <button
            onClick={() => setActiveCategory('OPERACIONAL')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeCategory === 'OPERACIONAL' ? 'bg-blue-50 text-blue-700 font-bold border border-blue-100' : 'text-slate-600 hover:bg-slate-50 font-semibold'
            }`}
          >
            <Truck className={`w-4 h-4 ${activeCategory === 'OPERACIONAL' ? 'text-blue-500' : 'text-slate-400'}`} /> Logística e Operação
          </button>

          <button
            onClick={() => setActiveCategory('FINANCEIRO')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeCategory === 'FINANCEIRO' ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-100' : 'text-slate-600 hover:bg-slate-50 font-semibold'
            }`}
          >
            <DollarSign className={`w-4 h-4 ${activeCategory === 'FINANCEIRO' ? 'text-emerald-500' : 'text-slate-400'}`} /> Financeiro e Faturamento
          </button>

          <button
            onClick={() => setActiveCategory('RH')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeCategory === 'RH' ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-100' : 'text-slate-600 hover:bg-slate-50 font-semibold'
            }`}
          >
            <Users className={`w-4 h-4 ${activeCategory === 'RH' ? 'text-indigo-500' : 'text-slate-400'}`} /> Recursos Humanos
          </button>
        </div>

        {/* Dashboard Panels */}
        <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col gap-6 overflow-y-auto">
          
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-wrap gap-4 items-end">
             <div className="flex-1 min-w-[200px]">
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Data Inicial</label>
                <input type="date" value={filterParams.startDate} onChange={e => setFilterParams({...filterParams, startDate: e.target.value})} className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 font-bold outline-none focus:border-blue-500" />
             </div>
             <div className="flex-1 min-w-[200px]">
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Data Final</label>
                <input type="date" value={filterParams.endDate} onChange={e => setFilterParams({...filterParams, endDate: e.target.value})} className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 font-bold outline-none focus:border-blue-500" />
             </div>
             <div className="self-end pb-1 flex items-center text-xs font-bold text-slate-400">
                <Filter className="w-4 h-4 mr-1" />
                Os filtros são globais para exportação
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {filteredReports.map(report => {
               const Icon = report.icon;
               return (
                 <div key={report.id} className="border-2 border-slate-100 bg-white rounded-2xl p-5 hover:border-blue-200 transition-colors group flex flex-col">
                    <div className="flex items-start gap-4 mb-4">
                        <div className={`p-3 rounded-xl transition-colors ${
                          activeCategory === 'FINANCEIRO' ? 'bg-emerald-100 text-emerald-600' :
                          activeCategory === 'RH' ? 'bg-indigo-100 text-indigo-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                           <Icon className="w-6 h-6" />
                        </div>
                        <div>
                           <h3 className="font-bold text-slate-800 leading-tight mb-1">{report.name}</h3>
                           <p className="text-xs text-slate-500 font-medium line-clamp-2">{report.description}</p>
                        </div>
                    </div>
                    
                    <div className="mt-auto flex flex-col gap-2 pt-4 border-t border-slate-100">
                      <button 
                         onClick={() => handleGenerateReport(report.id, 'PDF')}
                         disabled={isGenerating}
                         className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                      >
                         <FileText className="w-4 h-4" /> Gerar PDF
                      </button>
                      <button 
                         onClick={() => handleGenerateReport(report.id, 'EXCEL')}
                         disabled={isGenerating}
                         className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                      >
                         <FileSpreadsheet className="w-4 h-4" /> Exportar Excel
                      </button>
                    </div>
                 </div>
               )
             })}
          </div>

          {filteredReports.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 py-8 text-slate-400">
               <FileText className="w-12 h-12 mb-2 opacity-50" />
               <p className="text-sm font-bold">Nenhum relatório configurado para esta categoria ainda.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
