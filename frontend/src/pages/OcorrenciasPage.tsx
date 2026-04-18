import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Users, AlertTriangle, Trash2, Plus, Search, Filter, 
  Calendar, FileText, Download, X, Loader2, UserMinus, ShieldAlert
} from 'lucide-react';

interface Ocorrencia {
  id: string;
  funcionarioId: string;
  tipo: string;
  data: string;
  descricao: string;
  valorDesconto?: number;
  status: string;
  testemunhas?: string;
  observacoes?: string;
  arquivoUrl?: string;
  funcionario?: {
    nome: string;
    cargo: string;
    departamento: string;
  };
}

const TIPO_MAP: Record<string, { label: string; color: string; bg: string }> = {
  ADVERTENCIA: { label: 'Advertência', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  SUSPENSAO:   { label: 'Suspensão',   color: 'text-red-700',   bg: 'bg-red-50 border-red-200' },
  MULTA:       { label: 'Multa',       color: 'text-rose-700',  bg: 'bg-rose-50 border-rose-200' },
  FEEDBACK:    { label: 'Feedback',    color: 'text-blue-700',  bg: 'bg-blue-50 border-blue-200' },
  FALTA:       { label: 'Falta Just.', color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' },
};

const STATUS_VARIANTS: Record<string, string> = {
  PENDENTE: 'bg-amber-100 text-amber-700 border-amber-200',
  ASSINADO: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  LANCADO:  'bg-blue-100 text-blue-700 border-blue-200',
  CANCELADO: 'bg-slate-100 text-slate-700 border-slate-200',
};

const OcorrenciasPage: React.FC = () => {
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    id: '',
    funcionarioId: '',
    tipo: 'ADVERTENCIA',
    data: new Date().toISOString().split('T')[0],
    descricao: '',
    valorDesconto: '',
    testemunhas: '',
    observacoes: '',
    arquivoUrl: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resOcor, resFunc] = await Promise.all([
        api.get('/ocorrencias'),
        api.get('/rh')
      ]);
      setOcorrencias(resOcor.data);
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
      if (formData.id) {
        await api.patch(`/ocorrencias/${formData.id}`, formData);
      } else {
        await api.post('/ocorrencias', formData);
      }
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
       console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      id: '',
      funcionarioId: '',
      tipo: 'ADVERTENCIA',
      data: new Date().toISOString().split('T')[0],
      descricao: '',
      valorDesconto: '',
      testemunhas: '',
      observacoes: '',
      arquivoUrl: ''
    });
  };

  const handleEdit = (item: Ocorrencia) => {
    setFormData({
      id: item.id,
      funcionarioId: item.funcionarioId,
      tipo: item.tipo,
      data: item.data.split('T')[0],
      descricao: item.descricao,
      valorDesconto: item.valorDesconto?.toString() || '',
      testemunhas: item.testemunhas || '',
      observacoes: item.observacoes || '',
      arquivoUrl: item.arquivoUrl || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta ocorrência?')) return;
    try {
      await api.delete(`/ocorrencias/${id}`);
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const filteredOcorrencias = ocorrencias.filter(o => 
    ((o.funcionario?.nome || '').toLowerCase().includes(search.toLowerCase()) || 
     (o.descricao || '').toLowerCase().includes(search.toLowerCase())) &&
    (filterTipo === '' || o.tipo === filterTipo)
  );

  return (
    <div className="h-full flex flex-col space-y-6 overflow-y-auto bg-slate-50 p-6 rounded-3xl custom-scrollbar">
      <header className="flex justify-between items-center bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-rose-600 p-3 rounded-2xl shadow-lg shadow-rose-100">
            <ShieldAlert className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Ocorrências & Medidas Disciplinares</h1>
            <p className="text-sm text-slate-500 font-medium">Gestão de advertências, multas e penalidades disciplinares.</p>
          </div>
        </div>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Lançar Nova Medida
        </button>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex-shrink-0">
        <div className="col-span-2 relative">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
           <input 
             type="text" 
             placeholder="Buscar por funcionário ou descrição..."
             className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 border-none text-sm focus:ring-2 focus:ring-blue-500 transition-all font-medium"
             value={search}
             onChange={(e) => setSearch(e.target.value)}
           />
        </div>
        <div>
          <select 
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl bg-slate-50 border-none text-sm focus:ring-2 focus:ring-blue-500 transition-all font-medium"
          >
            <option value="">Todos os Tipos</option>
            {Object.entries(TIPO_MAP).map(([key, info]) => (
              <option key={key} value={key}>{info.label}</option>
            ))}
          </select>
        </div>
        <div className="bg-slate-50 rounded-2xl px-4 py-3 flex items-center justify-between">
           <span className="text-[10px] font-black uppercase text-slate-400">Total</span>
           <span className="text-sm font-black text-slate-800">{filteredOcorrencias.length}</span>
        </div>
      </section>

      <main className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex-1 min-h-0">
        <div className="h-full flex flex-col">
          <div className="overflow-y-auto flex-1 custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data / Tipo</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Funcionário</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Detalhes</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status / Valor</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                       <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
                       <p className="text-xs font-black uppercase tracking-widest text-slate-400 mt-4">Carregando histórico...</p>
                    </td>
                  </tr>
                ) : filteredOcorrencias.length === 0 ? (
                   <tr>
                    <td colSpan={5} className="py-20 text-center text-slate-400">
                       <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                       <p className="text-sm font-bold">Nenhuma ocorrência encontrada.</p>
                    </td>
                  </tr>
                ) : (
                  filteredOcorrencias.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-black text-slate-800">{new Date(item.data).toLocaleDateString('pt-BR')}</span>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border w-fit ${TIPO_MAP[item.tipo]?.bg} ${TIPO_MAP[item.tipo]?.color}`}>
                            {TIPO_MAP[item.tipo]?.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-800 truncate max-w-[150px]">{item.funcionario?.nome}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase truncate max-w-[150px]">{item.funcionario?.cargo}</p>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                         <p className="text-xs text-slate-600 line-clamp-2">{item.descricao}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border w-fit ${STATUS_VARIANTS[item.status]}`}>
                            {item.status}
                          </span>
                          {item.valorDesconto && (
                            <span className="text-[10px] font-black text-rose-600">
                              Desconto: R$ {Number(item.valorDesconto).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end items-center gap-2">
                          <button onClick={() => handleEdit(item)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                            <FileText className="w-4 h-4" />
                          </button>
                          {item.arquivoUrl && (
                            <a href={item.arquivoUrl} target="_blank" rel="noreferrer" className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all">
                              <Download className="w-4 h-4" />
                            </a>
                          )}
                          <button 
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <div className="flex items-center gap-4">
                 <div className="bg-blue-900 p-3 rounded-2xl shadow-lg shadow-blue-200">
                   <Plus className="text-white w-5 h-5" />
                 </div>
                 <div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">{formData.id ? 'Editar' : 'Lançar'} Medida Disciplinar</h2>
                    <p className="text-xs text-slate-500 font-medium">Preencha os detalhes para registro e desconto em folha.</p>
                 </div>
               </div>
               <button onClick={() => setShowModal(false)} className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all">
                 <X className="w-6 h-6" />
               </button>
            </div>

            <form onSubmit={handleSubmit} className="p-10 space-y-6 overflow-y-auto custom-scrollbar max-h-[70vh]">
              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-2 col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Funcionário Envolvido</label>
                  <select 
                    required
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white focus:ring-0 transition-all text-sm font-bold"
                    value={formData.funcionarioId}
                    onChange={(e) => setFormData({...formData, funcionarioId: e.target.value})}
                  >
                    <option value="">Selecione o Funcionário</option>
                    {funcionarios.map(f => (
                      <option key={f.id} value={f.id}>{f.nome} - {f.cargo}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tipo de Ocorrência</label>
                  <select 
                    required
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white focus:ring-0 transition-all text-sm font-bold"
                    value={formData.tipo}
                    onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                  >
                    {Object.entries(TIPO_MAP).map(([key, info]) => (
                      <option key={key} value={key}>{info.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Data do Evento</label>
                  <input 
                    type="date"
                    required
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white focus:ring-0 transition-all text-sm font-bold"
                    value={formData.data}
                    onChange={(e) => setFormData({...formData, data: e.target.value})}
                  />
                </div>

                {formData.tipo === 'MULTA' && (
                  <div className="flex flex-col gap-2 col-span-2 bg-rose-50 p-4 rounded-2xl border border-rose-100">
                    <label className="text-[10px] font-black uppercase text-rose-600 tracking-widest">Valor do Desconto (R$)</label>
                    <input 
                      type="number"
                      step="0.01"
                      required
                      placeholder="0,00"
                      className="w-full px-6 py-4 rounded-2xl bg-white border-2 border-transparent focus:border-rose-500 focus:ring-0 transition-all text-base font-black text-rose-700"
                      value={formData.valorDesconto}
                      onChange={(e) => setFormData({...formData, valorDesconto: e.target.value})}
                    />
                    <p className="text-[9px] font-bold text-rose-400 italic">Este valor será descontado no próximo fechamento financeiro.</p>
                  </div>
                )}

                <div className="flex flex-col gap-2 col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Descrição do Ocorrido</label>
                  <textarea 
                    required
                    rows={4}
                    placeholder="Relate os detalhes do evento..."
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white focus:ring-0 transition-all text-sm font-bold resize-none"
                    value={formData.descricao}
                    onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Testemunhas</label>
                  <input 
                    type="text"
                    placeholder="Nomes das testemunhas"
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white focus:ring-0 transition-all text-sm font-bold"
                    value={formData.testemunhas}
                    onChange={(e) => setFormData({...formData, testemunhas: e.target.value})}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Observações RH</label>
                  <input 
                    type="text"
                    placeholder="Notas internas"
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white focus:ring-0 transition-all text-sm font-bold"
                    value={formData.observacoes}
                    onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                  {formData.id ? 'Salvar Alterações' : 'Registrar Ocorrência'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OcorrenciasPage;

    </div>
  );
};

export default OcorrenciasPage;
