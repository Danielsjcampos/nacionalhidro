import { useToast } from '../contexts/ToastContext';
import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import {
  Plus, Search, Loader2, FileText, Banknote,
  History, X, Eye, ChevronLeft, ChevronRight, Receipt
} from 'lucide-react';
import StatusContasReceber from '../components/StatusContasReceber';
import ModalContasCadastrarCR from '../components/ModalContasCadastrarCR';
import ModalReceberParcelaCR from '../components/ModalReceberParcelaCR';
import ModalHistoricoCR from '../components/ModalHistoricoCR';

const STATUS_LABEL: Record<string, { label: string; bg: string; text: string }> = {
  PENDENTE: { label: 'Pendente', bg: 'bg-blue-100', text: 'text-blue-700' },
  PARCIAL: { label: 'Parcial', bg: 'bg-amber-100', text: 'text-amber-700' },
  RECEBIDO: { label: 'Recebido', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  CANCELADO: { label: 'Cancelado', bg: 'bg-red-100', text: 'text-red-600' },
};

export default function ContasReceberPage() {
  const { showToast } = useToast();
  const [activeStep, setActiveStep] = useState('CADASTRO');
  const [contas, setContas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(15);

  const [clientes, setClientes] = useState<any[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<any[]>([]);
  const [naturezas, setNaturezas] = useState<any[]>([]);
  const [contasBancarias, setContasBancarias] = useState<any[]>([]);

  const [showCadastrar, setShowCadastrar] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [showReceber, setShowReceber] = useState<any>(null);
  const [showHistorico, setShowHistorico] = useState<any>(null);
  const [sidebarConta, setSidebarConta] = useState<any>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [cr, cl, cc, nat, cb] = await Promise.all([
        api.get('/contas-receber'),
        api.get('/clientes').catch(() => ({ data: [] })),
        api.get('/centros-custo').catch(() => ({ data: [] })),
        api.get('/naturezas').catch(() => ({ data: [] })),
        api.get('/contas-bancarias').catch(() => ({ data: [] })),
      ]);
      setContas(cr.data);
      setClientes(cl.data);
      setCentrosCusto(cc.data);
      setNaturezas(nat.data);
      setContasBancarias(cb.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const counts: Record<string, number> = {
    CADASTRO: contas.filter(c => c.status === 'PENDENTE').length,
    RECEBER: contas.filter(c => c.status === 'PENDENTE' || c.status === 'PARCIAL').length,
    RECEBIDOS: contas.filter(c => c.status === 'RECEBIDO').length,
    CANCELADOS: contas.filter(c => c.status === 'CANCELADO').length,
  };

  const filtered = contas.filter(c => {
    if (activeStep === 'CADASTRO') return c.status === 'PENDENTE';
    if (activeStep === 'RECEBER') return c.status === 'PENDENTE' || c.status === 'PARCIAL';
    if (activeStep === 'RECEBIDOS') return c.status === 'RECEBIDO';
    if (activeStep === 'CANCELADOS') return c.status === 'CANCELADO';
    return true;
  }).filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    return c.cliente?.nome?.toLowerCase().includes(s) ||
      c.notaFiscal?.toLowerCase().includes(s) ||
      c.descricao?.toLowerCase().includes(s) ||
      c.empresa?.toLowerCase().includes(s) ||
      c.tipoFatura?.toLowerCase().includes(s);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);
  const totalValor = filtered.reduce((s, c) => s + Number(c.valorTotal || c.valorOriginal || 0), 0);

  useEffect(() => { setCurrentPage(1); }, [activeStep, search]);

  const fmt = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

  const handleSave = async (payload: any) => {
    try {
      if (payload.id) {
        await api.patch(`/contas-receber/${payload.id}`, payload);
        showToast('Conta atualizada!');
      } else {
        await api.post('/contas-receber', payload);
        showToast('Conta cadastrada!');
      }
      setShowCadastrar(false);
      setEditData(null);
      fetchAll();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Erro ao salvar');
    }
  };

  const handleReceber = async (contaId: string, payload: any) => {
    try {
      await api.post(`/contas-receber/${contaId}/receber`, payload);
      showToast('Recebimento registrado!');
      setShowReceber(null);
      fetchAll();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Erro ao receber');
    }
  };

  const handleCancelar = async (id: string) => {
    const motivo = window.prompt('Motivo do cancelamento:');
    if (motivo === null) return;
    try {
      await api.delete(`/contas-receber/${id}`, { data: { motivoCancelamento: motivo } });
      showToast('Conta cancelada');
      fetchAll();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Erro ao cancelar');
    }
  };

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-teal-600" /></div>;

  return (
    <div className="h-full flex flex-col space-y-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Contas a Receber</h1>
          <p className="text-sm text-slate-400">Pipeline de faturamento, recebimento e histórico</p>
        </div>
        <button onClick={() => { setEditData(null); setShowCadastrar(true); }} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-teal-500/20">
          <Plus className="w-4 h-4" /> Nova Conta
        </button>
      </div>

      <StatusContasReceber activeStep={activeStep} onChange={setActiveStep} counts={counts} />

      <div className="flex items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente, NF, tipo..."
            className="border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm w-72 focus:ring-2 focus:ring-teal-500 outline-none" />
        </div>
        <span className="text-sm font-bold text-slate-600">{filtered.length} registros · Total: <span className="text-teal-700">{fmt(totalValor)}</span></span>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        <div className={`flex-1 overflow-auto bg-white rounded-xl shadow-sm border border-slate-200 ${sidebarConta ? 'max-w-[65%]' : ''}`}>
          <table className="w-full text-[11px] whitespace-nowrap min-w-max">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="bg-slate-50 border-b border-slate-200 text-left">
                <th className="p-3 font-bold text-slate-500 uppercase w-10 text-center">Ações</th>
                <th className="p-3 font-bold text-slate-500 uppercase w-20 text-center">Status</th>
                <th className="p-3 font-bold text-slate-500 uppercase">Empresa</th>
                <th className="p-3 font-bold text-slate-500 uppercase">Cliente</th>
                <th className="p-3 font-bold text-slate-500 uppercase text-center">Tipo</th>
                <th className="p-3 font-bold text-slate-500 uppercase">Nº Nota</th>
                <th className="p-3 font-bold text-slate-500 uppercase text-center">Emissão</th>
                <th className="p-3 font-bold text-slate-500 uppercase text-right">Valor Líq. (R$)</th>
                <th className="p-3 font-bold text-slate-500 uppercase text-center">Parcelas</th>
                <th className="p-3 font-bold text-slate-500 uppercase text-center">Vencimento</th>
                <th className="p-3 font-bold text-slate-500 uppercase">Usuário</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.length === 0 ? (
                <tr><td colSpan={11} className="p-8 text-center text-slate-400">Nenhum registro nesta etapa.</td></tr>
              ) : paginated.map((c: any) => {
                const st = STATUS_LABEL[c.status] || STATUS_LABEL.PENDENTE;
                const isVencido = (c.status === 'PENDENTE' || c.status === 'PARCIAL') && c.dataVencimento && new Date(c.dataVencimento) < new Date();
                const isSelected = sidebarConta?.id === c.id;

                return (
                  <tr key={c.id} onClick={() => setSidebarConta(c)} className={`cursor-pointer transition-colors ${isSelected ? 'bg-teal-50' : isVencido ? 'bg-red-50/30 hover:bg-red-50/60' : 'hover:bg-slate-50'}`}>
                    <td className="p-2 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        {activeStep === 'CADASTRO' && (
                          <>
                            <button onClick={e => { e.stopPropagation(); setEditData(c); setShowCadastrar(true); }} className="text-teal-600 hover:text-teal-800 p-1" title="Editar"><FileText className="w-3.5 h-3.5" /></button>
                            <button onClick={e => { e.stopPropagation(); handleCancelar(c.id); }} className="text-red-400 hover:text-red-600 p-1" title="Cancelar"><X className="w-3.5 h-3.5" /></button>
                          </>
                        )}
                        {activeStep === 'RECEBER' && (
                          <button onClick={e => { e.stopPropagation(); setShowReceber(c); }} className="text-teal-600 hover:text-teal-800 p-1" title="Receber"><Banknote className="w-3.5 h-3.5" /></button>
                        )}
                        {(activeStep === 'RECEBIDOS' || activeStep === 'CANCELADOS') && (
                          <button onClick={e => { e.stopPropagation(); setShowHistorico(c); }} className="text-slate-500 hover:text-slate-700 p-1" title="Histórico"><History className="w-3.5 h-3.5" /></button>
                        )}
                      </div>
                    </td>
                    <td className="p-2 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full font-bold text-[9px] uppercase ${st.bg} ${st.text}`}>{st.label}</span>
                    </td>
                    <td className="p-2 font-medium text-slate-600 truncate max-w-[80px]">{c.empresa || 'NACIONAL'}</td>
                    <td className="p-2 text-slate-600 font-medium truncate max-w-[130px]">{c.cliente?.nome || '—'}</td>
                    <td className="p-2 text-center">
                      {c.tipoFatura && <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${c.tipoFatura === 'NF' ? 'bg-blue-100 text-blue-700' : c.tipoFatura === 'CTE' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{c.tipoFatura}</span>}
                    </td>
                    <td className="p-2 text-slate-500 font-mono">{c.notaFiscal || '—'}</td>
                    <td className="p-2 text-center text-slate-500 font-mono">{fmtDate(c.dataEmissao)}</td>
                    <td className="p-2 text-right font-bold text-slate-800">{fmt(Number(c.valorTotal || c.valorOriginal))}</td>
                    <td className="p-2 text-center text-slate-500">{c.totalParcelas || 1}</td>
                    <td className={`p-2 text-center font-bold ${isVencido ? 'text-red-600' : 'text-slate-600'}`}>{fmtDate(c.dataVencimento)}</td>
                    <td className="p-2 text-slate-400 truncate max-w-[80px]">{c.usuarioCriador || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {sidebarConta && (
          <div className="w-[35%] min-w-[320px] bg-white rounded-xl shadow-sm border border-slate-200 overflow-y-auto">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-black text-slate-700">Detalhes</h3>
              <button onClick={() => setSidebarConta(null)} className="p-1 hover:bg-slate-200 rounded"><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <div className="p-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-slate-400 font-bold block">Cliente</span><span className="font-bold text-slate-700">{sidebarConta.cliente?.nome || '—'}</span></div>
                <div><span className="text-slate-400 font-bold block">Empresa</span><span className="font-bold text-slate-700">{sidebarConta.empresa}</span></div>
                <div><span className="text-slate-400 font-bold block">Tipo/NF</span><span className="font-mono text-slate-700">{sidebarConta.tipoFatura || '—'} {sidebarConta.notaFiscal || ''}</span></div>
                <div><span className="text-slate-400 font-bold block">Valor Líquido</span><span className="font-black text-teal-700">{fmt(Number(sidebarConta.valorTotal || sidebarConta.valorOriginal))}</span></div>
              </div>

              {/* Impostos */}
              {Number(sidebarConta.valorIss) > 0 && (
                <div className="bg-teal-50 p-2 rounded-lg border border-teal-200">
                  <span className="text-slate-400 font-bold text-[10px] block mb-1">Impostos Retidos</span>
                  <div className="flex flex-wrap gap-2">
                    {[['ISS', sidebarConta.valorIss], ['INSS', sidebarConta.valorInss], ['PIS', sidebarConta.valorPis], ['COFINS', sidebarConta.valorCofins], ['IR', sidebarConta.valorIr], ['CSLL', sidebarConta.valorCsll]].filter(([, v]) => Number(v) > 0).map(([l, v]) => (
                      <span key={l as string} className="text-[10px] font-bold text-red-600">{l}: {fmt(Number(v))}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Parcelas */}
              {sidebarConta.recebimentoCR?.parcelas?.length > 0 && (
                <div>
                  <h4 className="font-black text-slate-600 mb-1">Parcelas</h4>
                  {sidebarConta.recebimentoCR.parcelas.map((p: any) => {
                    const stLabel = p.statusRecebimento === 2 ? 'Recebido' : p.statusRecebimento === 1 ? 'Parcial' : 'Pendente';
                    const stColor = p.statusRecebimento === 2 ? 'text-emerald-600' : p.statusRecebimento === 1 ? 'text-amber-600' : 'text-slate-500';
                    return (
                      <div key={p.id} className="flex justify-between items-center bg-slate-50 p-2 rounded mb-1">
                        <span className="text-slate-600">{p.numeroParcela}. {fmtDate(p.dataVencimento)}</span>
                        <div className="text-right">
                          <span className="font-bold text-slate-700">{fmt(Number(p.valorAReceber || p.valorParcela))}</span>
                          <span className={`ml-2 text-[9px] font-bold uppercase ${stColor}`}>{stLabel}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {sidebarConta.observacoes && (
                <div><span className="text-slate-400 font-bold block">Observações</span><p className="text-slate-600 italic whitespace-pre-wrap">{sidebarConta.observacoes}</p></div>
              )}

              <div className="flex gap-2 pt-2">
                {sidebarConta.status === 'PENDENTE' && (
                  <button onClick={() => { setEditData(sidebarConta); setShowCadastrar(true); }} className="flex-1 bg-teal-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-teal-700 flex items-center justify-center gap-1">
                    <Eye className="w-3.5 h-3.5" /> Editar
                  </button>
                )}
                {(sidebarConta.status === 'PENDENTE' || sidebarConta.status === 'PARCIAL') && (
                  <button onClick={() => setShowReceber(sidebarConta)} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-emerald-700 flex items-center justify-center gap-1">
                    <Banknote className="w-3.5 h-3.5" /> Receber
                  </button>
                )}
                <button onClick={() => setShowHistorico(sidebarConta)} className="flex-1 bg-slate-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-slate-700 flex items-center justify-center gap-1">
                  <History className="w-3.5 h-3.5" /> Histórico
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between py-2 px-1 text-sm">
        <span className="text-slate-500">{filtered.length} registros</span>
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1">
            <ChevronLeft className="w-3.5 h-3.5" /> Anterior
          </button>
          <span className="text-xs text-slate-500">Pág. <strong>{currentPage}</strong> de <strong>{totalPages}</strong></span>
          <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setCurrentPage(1); }}
            className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-600 bg-white">
            <option value={15}>15</option><option value={30}>30</option><option value={50}>50</option>
          </select>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1">
            Próximo <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Modals */}
      <ModalContasCadastrarCR
        data={editData}
        open={showCadastrar}
        onClose={() => { setShowCadastrar(false); setEditData(null); }}
        onSave={handleSave}
        clientes={clientes}
        listas={{ centroscusto: centrosCusto, naturezascontabeis: naturezas }}
      />
      <ModalReceberParcelaCR
        conta={showReceber}
        open={!!showReceber}
        onClose={() => setShowReceber(null)}
        onReceber={handleReceber}
        contasBancarias={contasBancarias}
      />
      <ModalHistoricoCR
        conta={showHistorico}
        open={!!showHistorico}
        onClose={() => setShowHistorico(null)}
      />
    </div>
  );
}
