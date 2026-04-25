import { useToast } from '../contexts/ToastContext';
import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import {
  Plus, Search, Loader2, FileText, UploadCloud,
  Banknote, History, X, Eye, ChevronLeft, ChevronRight
} from 'lucide-react';
import StatusContasAPagar from '../components/StatusContasAPagar';
import ModalContasCadastrarCP from '../components/ModalContasCadastrarCP';
import ModalContasPagarCP from '../components/ModalContasPagarCP';
import ModalHistoricoCP from '../components/ModalHistoricoCP';
import ModalImportarContasCP from '../components/ModalImportarContasCP';

const STATUS_LABEL: Record<string, { label: string; bg: string; text: string }> = {
  ABERTO: { label: 'Aberto', bg: 'bg-blue-100', text: 'text-blue-700' },
  PAGO_PARCIAL: { label: 'Parcial', bg: 'bg-amber-100', text: 'text-amber-700' },
  PAGO: { label: 'Pago', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  CANCELADO: { label: 'Cancelado', bg: 'bg-red-100', text: 'text-red-600' },
};

export default function ContasPagarPage() {
  const { showToast } = useToast();
  const [activeStep, setActiveStep] = useState('CADASTRAR');
  const [contas, setContas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(15);

  // Reference data
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<any[]>([]);
  const [naturezas, setNaturezas] = useState<any[]>([]);
  const [contasBancarias, setContasBancarias] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);

  // Modals
  const [showCadastrar, setShowCadastrar] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [showPagar, setShowPagar] = useState<any>(null);
  const [showHistorico, setShowHistorico] = useState<any>(null);
  const [showImportar, setShowImportar] = useState(false);
  const [sidebarConta, setSidebarConta] = useState<any>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [cp, f, cl, cc, nat, cb, emp] = await Promise.all([
        api.get('/contas-pagar'),
        api.get('/fornecedores').catch(() => ({ data: [] })),
        api.get('/clientes').catch(() => ({ data: [] })),
        api.get('/centros-custo').catch(() => ({ data: [] })),
        api.get('/naturezas').catch(() => ({ data: [] })),
        api.get('/contas-bancarias').catch(() => ({ data: [] })),
        api.get('/empresas/list').catch(() => ({ data: [] })),
      ]);
      setContas(cp.data);
      setFornecedores(f.data);
      setClientes(cl.data);
      setCentrosCusto(cc.data);
      setNaturezas(nat.data);
      setContasBancarias(cb.data);
      setEmpresas(Array.isArray(emp.data) ? emp.data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Pipeline counts
  const counts: Record<string, number> = {
    CADASTRAR: contas.filter(c => c.status === 'ABERTO').length,
    PAGAR: contas.filter(c => c.status === 'ABERTO' || c.status === 'PAGO_PARCIAL').length,
    PAGOS: contas.filter(c => c.status === 'PAGO').length,
    CANCELADOS: contas.filter(c => c.status === 'CANCELADO').length,
  };

  // Filter by pipeline step
  const filtered = contas.filter(c => {
    if (activeStep === 'CADASTRAR') return c.status === 'ABERTO';
    if (activeStep === 'PAGAR') return c.status === 'ABERTO' || c.status === 'PAGO_PARCIAL';
    if (activeStep === 'PAGOS') return c.status === 'PAGO';
    if (activeStep === 'CANCELADOS') return c.status === 'CANCELADO';
    return true;
  }).filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    return c.fornecedor?.nome?.toLowerCase().includes(s) ||
      c.notaFiscal?.toLowerCase().includes(s) ||
      c.descricao?.toLowerCase().includes(s) ||
      c.empresa?.toLowerCase().includes(s);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);
  const totalValor = filtered.reduce((s, c) => s + Number(c.valorOriginal || 0), 0);

  useEffect(() => { setCurrentPage(1); }, [activeStep, search]);

  const fmt = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

  const handleSave = async (payload: any) => {
    try {
      if (payload.id) {
        await api.patch(`/contas-pagar/${payload.id}`, payload);
        showToast('Conta atualizada!');
      } else {
        await api.post('/contas-pagar', payload);
        showToast('Conta cadastrada!');
      }
      setShowCadastrar(false);
      setEditData(null);
      fetchAll();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Erro ao salvar');
    }
  };

  const handlePagar = async (contaId: string, payload: any) => {
    try {
      await api.post(`/contas-pagar/${contaId}/pagar`, payload);
      showToast('Pagamento registrado!');
      setShowPagar(null);
      fetchAll();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Erro ao pagar');
    }
  };

  const handleCancelar = async (id: string) => {
    const motivo = window.prompt('Motivo do cancelamento:');
    if (motivo === null) return;
    try {
      await api.delete(`/contas-pagar/${id}`, { data: { motivoCancelamento: motivo } });
      showToast('Conta cancelada');
      fetchAll();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Erro ao cancelar');
    }
  };

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="h-full flex flex-col space-y-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Contas a Pagar</h1>
          <p className="text-sm text-slate-400">Pipeline de cadastro, pagamento e histórico</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowImportar(true)} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm">
            <UploadCloud className="w-4 h-4" /> Importar XML
          </button>
          <button onClick={() => { setEditData(null); setShowCadastrar(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20">
            <Plus className="w-4 h-4" /> Nova Conta
          </button>
        </div>
      </div>

      {/* Pipeline */}
      <StatusContasAPagar activeStep={activeStep} onChange={setActiveStep} counts={counts} />

      {/* Search + Total */}
      <div className="flex items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar fornecedor, NF, descrição..."
            className="border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm w-72 focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <span className="text-sm font-bold text-slate-600">{filtered.length} registros · Total: <span className="text-blue-700">{fmt(totalValor)}</span></span>
      </div>

      {/* Table + Sidebar */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Table */}
        <div className={`flex-1 overflow-auto bg-white rounded-xl shadow-sm border border-slate-200 ${sidebarConta ? 'max-w-[65%]' : ''}`}>
          <table className="w-full text-[11px] whitespace-nowrap min-w-max">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="bg-slate-50 border-b border-slate-200 text-left">
                <th className="p-3 font-bold text-slate-500 uppercase w-10 text-center">Ações</th>
                <th className="p-3 font-bold text-slate-500 uppercase w-20 text-center">Status</th>
                <th className="p-3 font-bold text-slate-500 uppercase">Empresa</th>
                <th className="p-3 font-bold text-slate-500 uppercase">Fornecedor</th>
                <th className="p-3 font-bold text-slate-500 uppercase">Nº NF</th>
                <th className="p-3 font-bold text-slate-500 uppercase text-center">Emissão</th>
                <th className="p-3 font-bold text-slate-500 uppercase text-right">Valor (R$)</th>
                <th className="p-3 font-bold text-slate-500 uppercase text-center">Parcelas</th>
                <th className="p-3 font-bold text-slate-500 uppercase text-center">Vencimento</th>
                <th className="p-3 font-bold text-slate-500 uppercase">Usuário</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.length === 0 ? (
                <tr><td colSpan={10} className="p-8 text-center text-slate-400">Nenhum registro nesta etapa.</td></tr>
              ) : paginated.map((c: any) => {
                const st = STATUS_LABEL[c.status] || STATUS_LABEL.ABERTO;
                const isVencido = (c.status === 'ABERTO' || c.status === 'PAGO_PARCIAL') && c.dataVencimento && new Date(c.dataVencimento) < new Date();
                const isSelected = sidebarConta?.id === c.id;

                return (
                  <tr key={c.id} onClick={() => setSidebarConta(c)} className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : isVencido ? 'bg-red-50/30 hover:bg-red-50/60' : 'hover:bg-slate-50'}`}>
                    <td className="p-2 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        {activeStep === 'CADASTRAR' && (
                          <>
                            <button onClick={e => { e.stopPropagation(); setEditData(c); setShowCadastrar(true); }} className="text-blue-600 hover:text-blue-800 p-1" title="Editar"><FileText className="w-3.5 h-3.5" /></button>
                            <button onClick={e => { e.stopPropagation(); handleCancelar(c.id); }} className="text-red-400 hover:text-red-600 p-1" title="Cancelar"><X className="w-3.5 h-3.5" /></button>
                          </>
                        )}
                        {activeStep === 'PAGAR' && (
                          <button onClick={e => { e.stopPropagation(); setShowPagar(c); }} className="text-emerald-600 hover:text-emerald-800 p-1" title="Pagar"><Banknote className="w-3.5 h-3.5" /></button>
                        )}
                        {(activeStep === 'PAGOS' || activeStep === 'CANCELADOS') && (
                          <button onClick={e => { e.stopPropagation(); setShowHistorico(c); }} className="text-slate-500 hover:text-slate-700 p-1" title="Histórico"><History className="w-3.5 h-3.5" /></button>
                        )}
                      </div>
                    </td>
                    <td className="p-2 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full font-bold text-[9px] uppercase ${st.bg} ${st.text}`}>{st.label}</span>
                    </td>
                    <td className="p-2 font-medium text-slate-600 truncate max-w-[80px]">{c.empresa || 'NACIONAL'}</td>
                    <td className="p-2 text-slate-600 font-medium truncate max-w-[130px]">{c.fornecedor?.nome || '—'}</td>
                    <td className="p-2 text-slate-500 font-mono">{c.notaFiscal || '—'}</td>
                    <td className="p-2 text-center text-slate-500 font-mono">{fmtDate(c.dataEmissao)}</td>
                    <td className="p-2 text-right font-bold text-slate-800">{fmt(Number(c.valorOriginal))}</td>
                    <td className="p-2 text-center text-slate-500">{c.totalParcelas || 1}</td>
                    <td className={`p-2 text-center font-bold ${isVencido ? 'text-red-600' : 'text-slate-600'}`}>{fmtDate(c.dataVencimento)}</td>
                    <td className="p-2 text-slate-400 truncate max-w-[80px]">{c.usuarioCriador || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Sidebar */}
        {sidebarConta && (
          <div className="w-[35%] min-w-[320px] bg-white rounded-xl shadow-sm border border-slate-200 overflow-y-auto">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-black text-slate-700">Detalhes</h3>
              <button onClick={() => setSidebarConta(null)} className="p-1 hover:bg-slate-200 rounded"><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <div className="p-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-slate-400 font-bold block">Fornecedor</span><span className="font-bold text-slate-700">{sidebarConta.fornecedor?.nome || '—'}</span></div>
                <div><span className="text-slate-400 font-bold block">Empresa</span><span className="font-bold text-slate-700">{sidebarConta.empresa}</span></div>
                <div><span className="text-slate-400 font-bold block">NF</span><span className="font-mono text-slate-700">{sidebarConta.notaFiscal || '—'}</span></div>
                <div><span className="text-slate-400 font-bold block">Valor Total</span><span className="font-black text-blue-700">{fmt(Number(sidebarConta.valorOriginal))}</span></div>
              </div>

              {/* Produtos */}
              {sidebarConta.produtos?.length > 0 && (
                <div>
                  <h4 className="font-black text-slate-600 mb-1">Produtos ({sidebarConta.produtos.length})</h4>
                  {sidebarConta.produtos.map((p: any, i: number) => (
                    <div key={i} className="flex justify-between bg-slate-50 p-2 rounded mb-1">
                      <span className="text-slate-600 truncate max-w-[180px]">{p.descricao}</span>
                      <span className="font-bold text-slate-700">{p.quantidade}x {fmt(Number(p.valorUnitario))}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Parcelas */}
              {sidebarConta.pagamentoCP?.parcelas?.length > 0 && (
                <div>
                  <h4 className="font-black text-slate-600 mb-1">Parcelas</h4>
                  {sidebarConta.pagamentoCP.parcelas.map((p: any) => {
                    const stParcela = p.statusPagamento === 1 ? 'Pago' : p.statusPagamento === 2 ? 'Parcial' : 'Pendente';
                    const stColor = p.statusPagamento === 1 ? 'text-emerald-600' : p.statusPagamento === 2 ? 'text-amber-600' : 'text-slate-500';
                    return (
                      <div key={p.id} className="flex justify-between items-center bg-slate-50 p-2 rounded mb-1">
                        <span className="text-slate-600">{p.numeroParcela}. {fmtDate(p.dataVencimento)}</span>
                        <div className="text-right">
                          <span className="font-bold text-slate-700">{fmt(Number(p.valorAPagar))}</span>
                          <span className={`ml-2 text-[9px] font-bold uppercase ${stColor}`}>{stParcela}</span>
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
                {sidebarConta.status === 'ABERTO' && (
                  <button onClick={() => { setEditData(sidebarConta); setShowCadastrar(true); }} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center justify-center gap-1">
                    <Eye className="w-3.5 h-3.5" /> Editar
                  </button>
                )}
                {(sidebarConta.status === 'ABERTO' || sidebarConta.status === 'PAGO_PARCIAL') && (
                  <button onClick={() => setShowPagar(sidebarConta)} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-emerald-700 flex items-center justify-center gap-1">
                    <Banknote className="w-3.5 h-3.5" /> Pagar
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
      <ModalContasCadastrarCP
        data={editData}
        open={showCadastrar}
        onClose={() => { setShowCadastrar(false); setEditData(null); }}
        onSave={handleSave}
        empresas={empresas}
        clientes={clientes}
        listas={{ fornecedores, centroscusto: centrosCusto, naturezascontabeis: naturezas }}
      />
      <ModalContasPagarCP
        conta={showPagar}
        open={!!showPagar}
        onClose={() => setShowPagar(null)}
        onPagar={handlePagar}
        contasBancarias={contasBancarias}
      />
      <ModalHistoricoCP
        conta={showHistorico}
        open={!!showHistorico}
        onClose={() => setShowHistorico(null)}
      />
      <ModalImportarContasCP
        open={showImportar}
        onClose={() => setShowImportar(false)}
        onImported={() => { showToast('XMLs importados!'); fetchAll(); }}
      />
    </div>
  );
}
