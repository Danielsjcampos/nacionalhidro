import { useToast } from '../contexts/ToastContext';
import { useEffect, useState } from 'react';
import api from '../services/api';
import {
  Plus, Search, X, Loader2, Mail, AlertTriangle,
  CheckCircle2, Eye, Copy, Ban, ThumbsDown, ThumbsUp,
  FileText, Send, ChevronLeft, ChevronRight, Power, Megaphone
} from 'lucide-react';
import ModalCadastroProposta from '../components/ModalCadastroProposta';
import ModalDisparoEquipe from '../components/ModalDisparoEquipe';
import moment from 'moment';

const fmtDate = (d: string) => d ? moment(d).format('DD/MM/YY') : '—';
const fmtBRL  = (v: number) => Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

const PIPELINE = [
  { key:'Em Aberto',   color:'#a8ccff', label:'Em Aberto'   },
  { key:'Aprovadas',   color:'#06ad17', label:'Aprovadas'   },
  { key:'Reprovadas',  color:'#80284E', label:'Reprovadas'  },
  { key:'Canceladas',  color:'#E90000', label:'Canceladas'  },
];

const STATUS_API: Record<string,string> = {
  'Em Aberto':'RASCUNHO,ENVIADA,EM_NEGOCIACAO', 'Aprovadas':'ACEITA',
  'Reprovadas':'RECUSADA', 'Canceladas':'CANCELADA'
};

export default function Propostas() {
  const { showToast } = useToast();
  const [propostas, setPropostas]     = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selectedTipo, setSelectedTipo] = useState<'Em Aberto'|'Aprovadas'|'Reprovadas'|'Canceladas'>('Em Aberto');
  const [searchTerm, setSearchTerm]   = useState('');
  const [dataInicio, setDataInicio]   = useState(moment().subtract(2,'years').format('YYYY-MM-DD'));
  const [dataFim,    setDataFim]      = useState(moment().add(3,'months').format('YYYY-MM-DD'));
  const [isEditing,  setIsEditing]    = useState(false);
  const [selectedProposta, setSelectedProposta] = useState<any>(null);
  const [pdfLoading, setPdfLoading]   = useState<string|null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [saving, setSaving]           = useState(false);
  const [viewingPdf, setViewingPdf]   = useState<any | null>(null);
  const [disparando, setDisparando]   = useState<any | null>(null);
  const [stats, setStats]             = useState<Record<string,number>>({
    'Em Aberto': 0, 'Aprovadas': 0, 'Reprovadas': 0, 'Canceladas': 0
  });

  // Options for modal
  const [clientes,           setClientes]           = useState<any[]>([]);
  const [equipamentosOptions,setEquipamentosOptions] = useState<any[]>([]);
  const [vendedoresOptions,  setVendedoresOptions]   = useState<any[]>([]);
  const [acessoriosOptions,  setAcessoriosOptions]   = useState<any[]>([]);
  const [empresasOptions,    setEmpresasOptions]     = useState<any[]>([]);
  const [cargosData,         setCargosData]          = useState<any[]>([]);
  const [responsabilidades,  setResponsabilidades]   = useState<any[]>([]);
  const [configuracoes,      setConfiguracoes]       = useState<any[]>([]);
  const [veiculosOptions,    setVeiculosOptions]     = useState<any[]>([]);

  const fetchPropostas = async (page = 1) => {
    try {
      setLoading(true);
      const params: any = { page, limit: 25, search: searchTerm };
      const statusApi = STATUS_API[selectedTipo];
      if (statusApi) params.status = statusApi;
      
      // Always send date filters if they exist
      if (dataInicio) params.dataInicio = dataInicio;
      if (dataFim)    params.dataFim    = dataFim;

      const [res, statsRes] = await Promise.all([
        api.get('/propostas', { params }),
        api.get('/propostas/stats', { params: { dataInicio, dataFim } })
      ]);
      
      setPropostas(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);
      setStats(statsRes.data);
    } catch(e:any) {
      showToast('Erro ao carregar propostas: ' + (e.response?.data?.error || e.message));
    } finally { setLoading(false); }
  };

  const fetchOptions = async () => {
    const safe = async (fn: ()=>Promise<any>, fb: any[] = []) => { try { return await fn(); } catch { return fb; } };
    const [cl,eq,vd,ac,cp,em,rs,cfg,ve] = await Promise.all([
      safe(()=>api.get('/clientes').then(r=>r.data)),
      safe(()=>api.get('/equipamentos').then(r=>r.data)),
      safe(()=>api.get('/equipe/vendedores').then(r=>r.data)),
      safe(()=>api.get('/acessorios').then(r=>r.data)),
      safe(()=>api.get('/cargos').then(r=>r.data)),
      safe(()=>api.get('/empresas').then(r=>r.data)),
      safe(()=>api.get('/responsabilidades').then(r=>r.data)),
      safe(()=>api.get('/configuracoes').then(r=>r.data),[]),
      safe(()=>api.get('/veiculos').then(r=>r.data)),
    ]);
    setClientes(cl||[]);setEquipamentosOptions(eq||[]);setVendedoresOptions(vd||[]);
    setAcessoriosOptions(ac||[]);setCargosData(cp||[]);setEmpresasOptions(em||[]);
    setResponsabilidades(rs||[]);setConfiguracoes(cfg||[]);setVeiculosOptions(ve||[]);
  };

  useEffect(() => { setCurrentPage(1); fetchPropostas(1); }, [selectedTipo, searchTerm, dataInicio, dataFim]);
  useEffect(() => { fetchPropostas(currentPage); }, [currentPage]);
  useEffect(() => { fetchOptions(); }, []);

  const handleCreateNew = () => { setSelectedProposta({ novo:true }); setIsEditing(true); };

  const handleEdit = async (prop: any) => {
    try {
      setLoading(true);
      const r = await api.get(`/propostas/${prop.id}`);
      setSelectedProposta(r.data);
      setIsEditing(true);
    } catch(e:any) { showToast('Erro ao carregar proposta'); }
    finally { setLoading(false); }
  };

  const handleSave = async (data: any) => {
    setSaving(true);
    try {
      if (data._ehRevisao) {
        // Save as new revision
        await api.post('/propostas', { ...data, ehRevisao: true, enviada: false, id: undefined });
      } else if (selectedProposta?.novo || selectedProposta?._copied) {
        await api.post('/propostas', data);
      } else {
        await api.patch(`/propostas/${selectedProposta.id}`, data);
      }
      setIsEditing(false);
      setSelectedProposta(null);
      showToast('Proposta salva! Aguarde... gerando PDF.');
      fetchPropostas(currentPage);
    } catch(e:any) {
      showToast('Erro: ' + (e.response?.data?.error || e.message));
    } finally { setSaving(false); }
  };

  const handleStatusChange = async (id: string, status: string, extra?: any) => {
    try {
      let payload: any = { status, ...extra };
      if (status === 'CANCELADA') {
        const motivo = window.prompt('Motivo do cancelamento (obrigatório):');
        if (!motivo?.trim()) { showToast('Motivo é obrigatório.'); return; }
        payload.motivoCancelamento = motivo.toUpperCase();
        payload.dataCancelamento = new Date().toISOString();
      }
      if (status === 'RECUSADA') {
        const motivo = window.prompt('Motivo da reprovação (obrigatório):');
        if (!motivo?.trim()) { showToast('Motivo é obrigatório.'); return; }
        payload.motivoReprovacao = motivo.toUpperCase();
        payload.dataReprovacao = new Date().toISOString();
      }
      if (status === 'ACEITA') {
        if (!window.confirm('Confirmar aprovação desta proposta?')) return;
        payload.dataAprovacao = new Date().toISOString();
      }
      await api.patch(`/propostas/${id}/status`, payload);
      fetchPropostas(currentPage);
    } catch(e:any) { showToast('Erro: ' + (e.response?.data?.error||e.message)); }
  };

  const handleCopiar = async (prop: any) => {
    try {
      setLoading(true);
      const r = await api.get(`/propostas/${prop.id}`);
      const d = r.data;
      setSelectedProposta({
        ...d, _copied:true, id:undefined, codigo:undefined,
        dataProposta: moment().format('YYYY-MM-DD'),
        dataValidade: moment().add(30,'days').format('YYYY-MM-DD'),
        status:'RASCUNHO', revisao:0, enviada:false,
        itens:          (d.itens||[]).map((i:any)=>({...i,id:undefined,propostaId:undefined})),
        acessorios:     (d.acessorios||[]).map((a:any)=>({...a,id:undefined,propostaId:undefined})),
        responsabilidades:(d.responsabilidades||[]).map((r:any)=>({...r,id:undefined,propostaId:undefined})),
        equipe:         (d.equipe||[]).map((e:any)=>({...e,id:undefined,propostaId:undefined})),
      });
      setIsEditing(true);
    } catch(e:any) { showToast('Erro ao copiar'); }
    finally { setLoading(false); }
  };

  const handleInativar = async (prop: any) => {
    try {
      await api.patch(`/propostas/${prop.id}`, { vigente: !prop.vigente });
      fetchPropostas(currentPage);
    } catch(e:any) { showToast('Erro'); }
  };

  const handleEnviar = async (prop: any) => {
    if (!window.confirm(`Enviar proposta ${prop.codigo} por e-mail?`)) return;
    try {
      setLoading(true);
      await api.post(`/propostas/${prop.id}/enviar-email`, {});
      showToast('E-mail enviado!');
      fetchPropostas(currentPage);
    } catch(e:any) { showToast('Erro: '+(e.response?.data?.error||e.message)); }
    finally { setLoading(false); }
  };

  const handleVerPDF = (prop: any) => {
    const url = `${api.defaults.baseURL}/propostas/${prop.id}/gerar-pdf?token=${localStorage.getItem('accessToken')}`;
    window.open(url, '_blank');
  };

  const isVencida = (p: any) => p.dataValidade && moment(p.dataValidade).isBefore(moment(),'day');
  const isEnviada = (p: any) => p.enviada || p.status === 'ENVIADA';

  const counts = stats;

  if (isEditing) {
    return (
      <ModalCadastroProposta
        isOpen
        onClose={()=>{ setIsEditing(false); setSelectedProposta(null); }}
        onSave={handleSave}
        initialData={selectedProposta}
        options={{
          clientes, vendedores:vendedoresOptions, empresas:empresasOptions,
          equipamentos:equipamentosOptions, acessorios:acessoriosOptions,
          responsabilidades, cargos:cargosData, configuracoes,
          veiculos: veiculosOptions
        }}
      />
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-400">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Propostas Comerciais</h1>
          <p className="text-sm text-slate-500">Gestão do ciclo de vendas</p>
        </div>
        <button onClick={handleCreateNew} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold text-sm shadow-lg shadow-blue-500/20 transition-all">
          <Plus className="w-4 h-4" /> Nova Proposta
        </button>
      </div>

      {/* Pipeline Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          {PIPELINE.map((p, i) => (
            <div key={p.key} className="flex items-center gap-3 shrink-0">
              <button onClick={()=>setSelectedTipo(p.key as any)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all border-2 ${selectedTipo===p.key?'shadow-md scale-105':'opacity-60 hover:opacity-80'}`}
                style={{ borderColor: selectedTipo===p.key ? p.color : 'transparent', background: selectedTipo===p.key ? p.color+'22' : '#f8fafc' }}>
                <span className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-sm shadow-sm" style={{background:p.color}}>
                  {counts[p.key]??0}
                </span>
                <span className="font-black text-sm" style={{color: selectedTipo===p.key ? p.color : '#64748b'}}>{p.label}</span>
              </button>
              {i < PIPELINE.length-1 && <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-48 relative">
          <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
          <input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Buscar código / cliente..."
            className="w-full bg-slate-50 border border-slate-100 rounded-lg py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>
        {selectedTipo === 'Em Aberto' && (
          <>
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-black text-slate-500 uppercase whitespace-nowrap">De</label>
              <input type="date" value={dataInicio} onChange={e=>setDataInicio(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-black text-slate-500 uppercase whitespace-nowrap">Até</label>
              <input type="date" value={dataFim} onChange={e=>setDataFim(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
          </>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40"><Loader2 className="w-7 h-7 animate-spin text-blue-600" /></div>
        ) : propostas.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <FileText className="w-14 h-14 mx-auto mb-3 opacity-30" />
            <p className="font-bold">Nenhuma proposta encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-3 text-left">Ações</th>
                  <th className="px-3 py-3 text-center w-8">St</th>
                  <th className="px-3 py-3 text-left">Código</th>
                  <th className="px-3 py-3 text-center w-10">Rev</th>
                  <th className="px-3 py-3 text-left">Cliente</th>
                  <th className="px-3 py-3 text-left">Vendedor</th>
                  <th className="px-3 py-3 text-center">Geração</th>
                  <th className="px-3 py-3 text-center">Validade</th>
                  {selectedTipo === 'Aprovadas' && <th className="px-3 py-3 text-center">Aprovação</th>}
                  {selectedTipo === 'Reprovadas' && <th className="px-3 py-3 text-left">Motivo Repr.</th>}
                  {selectedTipo === 'Canceladas' && <th className="px-3 py-3 text-left">Motivo Canc.</th>}
                  <th className="px-3 py-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {propostas.map((p: any) => {
                  const vencida = isVencida(p);
                  const enviada = isEnviada(p);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Actions */}
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-0.5 flex-wrap">
                          {/* Visualizar PDF - sempre */}
                          <button title="Visualizar PDF" onClick={()=>handleVerPDF(p)}
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {/* Cancelar - sempre */}
                          {selectedTipo !== 'Canceladas' && (
                            <button title="Cancelar" onClick={()=>handleStatusChange(p.id,'CANCELADA')}
                              className="p-1.5 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors">
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {/* Copiar - sempre (exceto se você quiser limitar por tipo, mas vamos liberar para todas) */}
                          <button title="Copiar" onClick={()=>handleCopiar(p)}
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          {/* Reprovar - se Em Aberto */}
                          {selectedTipo==='Em Aberto' && (
                            <button title="Reprovar" onClick={()=>handleStatusChange(p.id,'RECUSADA')}
                              className="p-1.5 rounded hover:bg-rose-50 text-rose-400 hover:text-rose-600 transition-colors">
                              <ThumbsDown className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {/* Aprovar - se Em Aberto */}
                          {selectedTipo==='Em Aberto' && (
                            <button title="Aprovar" onClick={()=>handleStatusChange(p.id,'ACEITA')}
                              className="p-1.5 rounded hover:bg-emerald-50 text-emerald-400 hover:text-emerald-600 transition-colors">
                              <ThumbsUp className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {/* Inativar/Reativar - Aprovadas */}
                          {selectedTipo==='Aprovadas' && (
                            <div className="flex gap-1">
                              <button title="Disparar para Equipe" onClick={()=>setDisparando(p)}
                                className="p-1.5 rounded hover:bg-amber-50 text-amber-500 hover:text-amber-600 transition-colors">
                                <Megaphone className="w-3.5 h-3.5" />
                              </button>
                              <button title={p.vigente?'Inativar':'Reativar'} onClick={()=>handleInativar(p)}
                                className={`p-1.5 rounded transition-colors ${p.vigente?'hover:bg-amber-50 text-amber-400':'hover:bg-emerald-50 text-emerald-400'}`}>
                                <Power className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                          {/* Editar - sempre em aberto */}
                          {selectedTipo==='Em Aberto' && (
                            <button title="Editar" onClick={()=>handleEdit(p)}
                              className="p-1.5 rounded hover:bg-blue-50 text-blue-400 hover:text-blue-600 transition-colors">
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {/* Enviar - sempre disponível se em aberto */}
                          {selectedTipo==='Em Aberto' && (
                            <button title="Enviar E-mail" onClick={()=>handleEnviar(p)}
                              className="p-1.5 rounded hover:bg-blue-50 text-blue-400 hover:text-blue-600 transition-colors">
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {/* Ver PDF */}
                          {p.urlArquivo && (
                            <button title="Ver PDF" onClick={()=>handleVerPDF(p)}
                              className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                              {pdfLoading===p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          {/* Mail indicator */}
                          {p.naoEnviarAoCliente && (
                            <span title="Não enviar e-mail" className="text-slate-300"><Mail className="w-3 h-3"/></span>
                          )}
                        </div>
                      </td>
                      {/* Status bullet */}
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${enviada?'bg-blue-500':vencida?'bg-red-500':'bg-slate-300'}`}
                          title={enviada?'Enviada':vencida?'Vencida':'Rascunho'} />
                      </td>
                      <td className="px-3 py-2 font-bold text-slate-700 whitespace-nowrap">{p.codigo||'—'}</td>
                      <td className="px-3 py-2 text-center text-slate-500">{p.revisao??0}</td>
                      <td className="px-3 py-2 text-slate-700 max-w-[160px] truncate">{p.cliente?.nome||p.clienteId||'—'}</td>
                      <td className="px-3 py-2 text-slate-500 max-w-[120px] truncate">{p.vendedorNome||p.vendedor||'—'}</td>
                      <td className="px-3 py-2 text-center text-slate-500 whitespace-nowrap">{fmtDate(p.dataProposta)}</td>
                      <td className={`px-3 py-2 text-center whitespace-nowrap font-bold ${vencida?'text-red-500':'text-slate-500'}`}>{fmtDate(p.dataValidade)}</td>
                      {selectedTipo==='Aprovadas' && <td className="px-3 py-2 text-center text-slate-500 whitespace-nowrap">{fmtDate(p.dataAprovacao)}</td>}
                      {selectedTipo==='Reprovadas' && <td className="px-3 py-2 text-slate-500 max-w-[140px] truncate">{p.motivoReprovacao||'—'}</td>}
                      {selectedTipo==='Canceladas' && <td className="px-3 py-2 text-slate-500 max-w-[140px] truncate">{p.motivoCancelamento||'—'}</td>}
                      <td className="px-3 py-2 text-right font-bold text-slate-700 whitespace-nowrap">{fmtBRL(p.valorTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 p-3 border-t border-slate-100">
            <button disabled={currentPage===1} onClick={()=>setCurrentPage(p=>p-1)} className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30"><ChevronLeft className="w-4 h-4"/></button>
            <span className="text-xs font-bold text-slate-600">{currentPage} / {totalPages}</span>
            <button disabled={currentPage===totalPages} onClick={()=>setCurrentPage(p=>p+1)} className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30"><ChevronRight className="w-4 h-4"/></button>
          </div>
        )}
      </div>

      {/* PDF Side Viewer (Drawer) */}
      {viewingPdf && (
        <div className="fixed inset-0 z-[60] flex justify-end animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setViewingPdf(null)} />
          <div className="relative w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between p-4 border-b bg-slate-50">
              <div>
                <h3 className="text-lg font-black text-slate-800 uppercase">Visualizar Proposta</h3>
                <p className="text-xs text-slate-500">{viewingPdf.codigo} — Rev. {viewingPdf.revisao}</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => window.open(`${api.defaults.baseURL}/propostas/${viewingPdf.id}/gerar-pdf?token=${localStorage.getItem('accessToken')}`, '_blank')}
                  className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                  title="Abrir em nova aba"
                >
                  <Power className="w-5 h-5 rotate-90" />
                </button>
                <button onClick={() => setViewingPdf(null)} className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100 relative">
              <iframe 
                src={`${api.defaults.baseURL}/propostas/${viewingPdf.id}/gerar-pdf?token=${localStorage.getItem('accessToken')}`}
                className="w-full h-full border-none"
                title="PDF Viewer"
              />
            </div>
          </div>
        </div>
      )}

      {disparando && (
        <ModalDisparoEquipe 
          proposta={disparando} 
          onClose={()=>setDisparando(null)} 
          onSuccess={()=>{setDisparando(null); fetchPropostas(currentPage);}} 
        />
      )}
    </div>
  );
}
