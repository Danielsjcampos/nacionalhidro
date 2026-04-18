import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Scale, Plus, Search, Filter, Calendar, FileText, 
  X, Loader2, AlertTriangle, Edit3, Trash2, Gavel, ExternalLink
} from 'lucide-react';

interface Processo {
  id: string;
  funcionarioId: string;
  numeroProcesso: string;
  status: string;
  valorEnvolvido?: number;
  advogado?: string;
  descricao?: string;
  dataAbertura: string;
  funcionario?: {
    nome: string;
    cargo: string;
  };
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  ATIVO:     { label: 'Em Andamento', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
  ENCERRADO: { label: 'Encerrado',     color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' },
  ACORDO:    { label: 'Acordo Firmado', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
};

const ProcessosTrabalhistasPage: React.FC = () => {
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const [formData, setFormData] = useState({
    funcionarioId: '',
    numeroProcesso: '',
    status: 'ATIVO',
    valorEnvolvido: '',
    advogado: '',
    descricao: '',
    dataAbertura: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resProc, resFunc] = await Promise.all([
        api.get('/processos'),
        api.get('/rh')
      ]);
      setProcessos(resProc.data);
      setFuncionarios(resFunc.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.post('/processos', {
        ...formData,
        valorEnvolvido: formData.valorEnvolvido ? parseFloat(formData.valorEnvolvido) : undefined
      });
      setShowModal(false);
      setFormData({
        funcionarioId: '',
        numeroProcesso: '',
        status: 'ATIVO',
        valorEnvolvido: '',
        advogado: '',
        descricao: '',
        dataAbertura: new Date().toISOString().split('T')[0]
      });
      fetchData();
    } catch (error) {
       console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6 overflow-y-auto bg-slate-50 p-6 rounded-3xl">
      <header className="flex justify-between items-center bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="bg-slate-900 p-3 rounded-2xl shadow-lg shadow-slate-200">
            <Scale className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Processos Trabalhistas</h1>
            <p className="text-sm text-slate-500 font-medium">Controle jurídico e contingência de colaboradores.</p>
          </div>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Processo
        </button>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        <div className="col-span-2 relative">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
           <input 
             type="text" 
             placeholder="Buscar por n° processo, funcionário ou advogado..."
             className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 border-none text-sm focus:ring-2 focus:ring-slate-500 transition-all font-medium"
             value={search}
             onChange={(e) => setSearch(e.target.value)}
           />
        </div>
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-6 py-3 flex items-center justify-between">
           <span className="text-[10px] font-black uppercase text-indigo-400">Total Provisionado</span>
           <span className="text-sm font-black text-indigo-700">
             R$ {processos.reduce((acc, p) => acc + (p.valorEnvolvido || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
           </span>
        </div>
      </section>

      <main className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">NProcesso / Abertura</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Funcionário Envolvido</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Advogado / Status</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
             {loading ? (
                <tr>
                   <td colSpan={4} className="py-20 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-slate-600 mx-auto" />
                   </td>
                </tr>
             ) : processos.length === 0 ? (
                <tr>
                   <td colSpan={4} className="py-20 text-center text-slate-400 italic">Nenhum processo registrado.</td>
                </tr>
             ) : processos.map(proc => (
                <tr key={proc.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                     <p className="text-xs font-black text-slate-800">{proc.numeroProcesso}</p>
                     <p className="text-[10px] text-slate-400 font-bold">{new Date(proc.dataAbertura).toLocaleDateString('pt-BR')}</p>
                  </td>
                  <td className="px-6 py-4">
                     <p className="text-sm font-bold text-slate-800">{proc.funcionario?.nome}</p>
                     <p className="text-[10px] font-bold text-slate-400 uppercase">{proc.funcionario?.cargo}</p>
                  </td>
                  <td className="px-6 py-4">
                     <p className="text-xs font-bold text-slate-700">{proc.advogado || 'Não Informado'}</p>
                     <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border w-fit ${STATUS_MAP[proc.status]?.bg} ${STATUS_MAP[proc.status]?.color}`}>
                        {STATUS_MAP[proc.status]?.label}
                      </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                     <span className="text-sm font-black text-slate-900">
                       R$ {Number(proc.valorEnvolvido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                     </span>
                  </td>
                </tr>
             ))}
          </tbody>
        </table>
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <div className="flex items-center gap-4">
                 <div className="bg-slate-900 p-3 rounded-2xl">
                   <Gavel className="text-white w-5 h-5" />
                 </div>
                 <h2 className="text-xl font-black text-slate-800">Novo Registro Jurídico</h2>
               </div>
               <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-red-500 transition-all">
                 <X className="w-6 h-6" />
               </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
               <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2 col-span-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">Funcionário</label>
                    <select 
                      required
                      className="w-full px-5 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-slate-400 focus:bg-white transition-all text-sm font-bold"
                      value={formData.funcionarioId}
                      onChange={(e) => setFormData({...formData, funcionarioId: e.target.value})}
                    >
                      <option value="">Selecione...</option>
                      {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">Número do Processo</label>
                    <input 
                      type="text" required
                      className="w-full px-5 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-slate-400 focus:bg-white transition-all text-sm font-bold"
                      value={formData.numeroProcesso}
                      onChange={(e) => setFormData({...formData, numeroProcesso: e.target.value})}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">Data de Abertura</label>
                    <input 
                      type="date"
                      className="w-full px-5 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-slate-400 focus:bg-white transition-all text-sm font-bold"
                      value={formData.dataAbertura}
                      onChange={(e) => setFormData({...formData, dataAbertura: e.target.value})}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">Valor Estimado (R$)</label>
                    <input 
                      type="number" step="0.01"
                      className="w-full px-5 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-slate-400 focus:bg-white transition-all text-sm font-bold"
                      value={formData.valorEnvolvido}
                      onChange={(e) => setFormData({...formData, valorEnvolvido: e.target.value})}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">Status</label>
                    <select 
                      className="w-full px-5 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-slate-400 focus:bg-white transition-all text-sm font-bold"
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                    >
                      {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2 col-span-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">Advogado Responsável</label>
                    <input 
                      type="text"
                      className="w-full px-5 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-slate-400 focus:bg-white transition-all text-sm font-bold"
                      value={formData.advogado}
                      onChange={(e) => setFormData({...formData, advogado: e.target.value})}
                    />
                  </div>
                  <div className="flex flex-col gap-2 col-span-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">Resumo / Objeto da Ação</label>
                    <textarea 
                      rows={3}
                      className="w-full px-5 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-slate-400 focus:bg-white transition-all text-sm font-bold resize-none"
                      value={formData.descricao}
                      onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                    />
                  </div>
               </div>
               <button type="submit" disabled={saving} className="w-full bg-slate-900 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-200">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scale className="w-4 h-4" />}
                  Finalizar Cadastro
               </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcessosTrabalhistasPage;
