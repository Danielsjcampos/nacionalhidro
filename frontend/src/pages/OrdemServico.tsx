import { useEffect, useState, useMemo } from 'react';
import { Loader2, Plus, ChevronRight, X, Printer, ArrowDownToLine } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';
import ModalCadastroOrdem from '../components/ModalCadastroOrdem';
import ModalBaixarOrdem from '../components/ModalBaixarOrdem';

// ─── Tipos de pipeline ────────────────────────────────────────────────────────
type OsTab = 'abrir' | 'em_aberto' | 'executadas' | 'canceladas';

const TABS: { id: OsTab; label: string; dot: string; statusMatch: number[] }[] = [
  { id: 'abrir',      label: 'Abrir',      dot: 'bg-[#a8ccff]', statusMatch: [] },
  { id: 'em_aberto',  label: 'Em Aberto',  dot: 'bg-[#0083ff]', statusMatch: [1] },
  { id: 'executadas', label: 'Executadas', dot: 'bg-[#06ad17]',  statusMatch: [2] },
  { id: 'canceladas', label: 'Canceladas', dot: 'bg-[#E90000]',  statusMatch: [0] },
];

const thCls = 'px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-white';
const tdCls = 'px-4 py-3 text-xs text-slate-700';

// ─── Page ────────────────────────────────────────────────────────────────────
export default function OrdemServico() {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [ordens, setOrdens] = useState<any[]>([]);
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [veiculos, setVeiculos] = useState<any[]>([]);
  const [escalas, setEscalas] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState<OsTab>('em_aberto');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<any>(null);
  const [onlyView, setOnlyView] = useState(false);
  const [baixaLoteOpen, setBaixaLoteOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Filtros
  const [filtroEquip, setFiltroEquip] = useState('');
  const [filtroEmpresa, setFiltroEmpresa] = useState('');
  const [filtroInicio, setFiltroInicio] = useState('');
  const [filtroFim, setFiltroFim] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordRes, funcRes, veicRes, escRes, empRes] = await Promise.all([
        api.get('/os-logistica').catch(() => ({ data: [] })),
        api.get('/funcionarios').catch(() => ({ data: [] })),
        api.get('/logistica/veiculos').catch(() => ({ data: [] })),
        api.get('/escala-logistica').catch(() => ({ data: [] })),
        api.get('/empresas').catch(() => ({ data: [] })),
      ]);
      setOrdens(Array.isArray(ordRes.data) ? ordRes.data : []);
      setFuncionarios(Array.isArray(funcRes.data) ? funcRes.data : []);
      setVeiculos(Array.isArray(veicRes.data) ? veicRes.data : []);
      setEscalas(Array.isArray(escRes.data) ? escRes.data : []);
      setEmpresas(Array.isArray(empRes.data) ? empRes.data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const tab = TABS.find(t => t.id === activeTab);
    if (!tab || !tab.statusMatch.length) return [];
    return ordens.filter(o => {
      if (!tab.statusMatch.includes(o.status)) return false;
      if (filtroEquip && !(o.equipamentoId ?? '').includes(filtroEquip)) return false;
      if (filtroEmpresa && !(o.empresaId ?? '').includes(filtroEmpresa)) return false;
      if (filtroInicio && o.dataInicial && o.dataInicial < filtroInicio) return false;
      if (filtroFim && o.dataInicial && o.dataInicial > filtroFim) return false;
      return true;
    });
  }, [ordens, activeTab, filtroEquip, filtroEmpresa, filtroInicio, filtroFim]);

  const countFor = (ids: number[]) => ordens.filter(o => ids.includes(o.status)).length;

  // ── Actions ─────────────────────────────────────────────────────────────────
  const openNew = () => { setModalData(null); setOnlyView(false); setModalOpen(true); };
  const openEdit = (os: any) => { setModalData(os); setOnlyView(false); setModalOpen(true); };
  const openView = (os: any) => { setModalData(os); setOnlyView(true); setModalOpen(true); };

  const handleSave = async (ordem: any, baixar = false) => {
    try {
      const payload = { ...ordem, status: baixar ? 2 : 1 };
      if (ordem.id) {
        await api.patch(`/os-logistica/${ordem.id}`, payload);
      } else {
        await api.post('/os-logistica', payload);
      }
      showToast(baixar ? 'OS baixada com sucesso!' : 'OS salva com sucesso!', 'success');
      setModalOpen(false);
      fetchData();
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Erro ao salvar OS.');
    }
  };

  const handleCancel = async (os: any) => {
    const motivo = window.prompt('Motivo do cancelamento (obrigatório):');
    if (!motivo?.trim()) return;
    try {
      await api.patch(`/os-logistica/${os.id}`, { status: 0, motivoCancelamento: motivo });
      showToast('OS cancelada.', 'success');
      fetchData();
    } catch { showToast('Erro ao cancelar OS.'); }
  };

  const handleBaixaLote = async (ordem: any) => {
    if (!selectedIds.length) return;
    try {
      await api.patch('/os-logistica/baixar-lote', { ids: selectedIds, ...ordem });
      showToast(`${selectedIds.length} OS(s) baixada(s)!`, 'success');
      setSelectedIds([]);
      setBaixaLoteOpen(false);
      fetchData();
    } catch { showToast('Erro na baixa em lote.'); }
  };

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <>
      <div className="h-full flex flex-col gap-4">
        {/* Pipeline header */}
        <div className="bg-[#1e3a5f] rounded-xl px-6 py-3 flex items-center gap-8">
          {TABS.map(t => (
            <button key={t.id} onClick={() => { setActiveTab(t.id); setSelectedIds([]); }}
              className={`flex flex-col items-center gap-1 text-xs font-bold transition-all ${activeTab === t.id ? 'text-white' : 'text-blue-200 hover:text-white'}`}>
              <div className={`w-3 h-3 rounded-full ${t.dot} ${activeTab === t.id ? 'ring-2 ring-white ring-offset-1 ring-offset-[#1e3a5f]' : 'opacity-50'}`} />
              <span className="uppercase tracking-wide text-[11px]">{t.label}</span>
              {t.statusMatch.length > 0 && (
                <span className="text-[10px] text-blue-300">{countFor(t.statusMatch)}</span>
              )}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            {selectedIds.length > 0 && activeTab === 'em_aberto' && (
              <button onClick={() => setBaixaLoteOpen(true)}
                className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors">
                <ArrowDownToLine className="w-3.5 h-3.5" />
                Baixar Lote ({selectedIds.length})
              </button>
            )}
            <button onClick={openNew}
              className="bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Nova OS
            </button>
          </div>
        </div>

        {/* Filtros */}
        {activeTab !== 'abrir' && (
          <div className="flex gap-3 flex-wrap">
            <input type="date" value={filtroInicio} onChange={e => setFiltroInicio(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-400" placeholder="Data início" />
            <input type="date" value={filtroFim} onChange={e => setFiltroFim(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-400" placeholder="Data fim" />
            <input type="text" value={filtroEquip} onChange={e => setFiltroEquip(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-400" placeholder="Equipamento..." />
            <input type="text" value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-400" placeholder="Empresa..." />
          </div>
        )}

        {/* Tabela */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-auto">
          {activeTab === 'abrir' ? (
            <div className="p-8 text-center text-slate-400 italic text-sm">
              Use o botão <strong>+ Nova OS</strong> para abrir uma ordem de serviço.
            </div>
          ) : (
            <table className="w-full text-sm min-w-max">
              <thead>
                <tr className="bg-[#1e3a5f]">
                  {activeTab === 'em_aberto' && (
                    <th className={thCls + ' w-10'}>
                      <input type="checkbox" className="w-3.5 h-3.5 rounded accent-blue-400"
                        checked={filtered.length > 0 && selectedIds.length === filtered.length}
                        onChange={e => setSelectedIds(e.target.checked ? filtered.map(o => o.id) : [])} />
                    </th>
                  )}
                  <th className={thCls}>Ações</th>
                  <th className={thCls}>Código</th>
                  <th className={thCls}>Cliente</th>
                  <th className={thCls}>Contato</th>
                  <th className={thCls}>Equipamento</th>
                  <th className={thCls}>Data</th>
                  <th className={thCls}>Hora</th>
                  <th className={thCls}>Tipo Cobrança</th>
                  {activeTab === 'canceladas' && <th className={thCls}>Motivo Cancelamento</th>}
                  <th className={thCls}>Observações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={12} className="py-10 text-center text-slate-400 italic text-xs">Nenhuma OS encontrada.</td></tr>
                ) : filtered.map((os: any) => {
                  const tipoLabel = ['', 'Hora', 'Diária', 'Frete', 'Fechada'][os.tipoCobranca] ?? '—';
                  return (
                    <tr key={os.id} className="hover:bg-slate-50 transition-colors group">
                      {activeTab === 'em_aberto' && (
                        <td className={tdCls}>
                          <input type="checkbox" className="w-3.5 h-3.5 rounded accent-blue-600"
                            checked={selectedIds.includes(os.id)}
                            onChange={e => setSelectedIds(p => e.target.checked ? [...p, os.id] : p.filter(id => id !== os.id))} />
                        </td>
                      )}
                      <td className={tdCls}>
                        <div className="flex items-center gap-1">
                          {activeTab !== 'canceladas' && (
                            <>
                              <button onClick={() => openEdit(os)} title="Editar"
                                className="p-1.5 rounded border border-slate-200 hover:bg-blue-50 hover:border-blue-300 transition-colors">
                                <ChevronRight className="w-3.5 h-3.5 text-blue-500" />
                              </button>
                              {activeTab === 'em_aberto' && (
                                <>
                                  <button onClick={() => openEdit(os)} title="Baixar OS"
                                    className="p-1.5 rounded border border-slate-200 hover:bg-red-50 hover:border-red-300 transition-colors">
                                    <ArrowDownToLine className="w-3.5 h-3.5 text-red-500" />
                                  </button>
                                  <button onClick={() => handleCancel(os)} title="Cancelar"
                                    className="p-1.5 rounded border border-slate-200 hover:bg-red-50 hover:border-red-300 transition-colors">
                                    <X className="w-3.5 h-3.5 text-red-500" />
                                  </button>
                                </>
                              )}
                            </>
                          )}
                          {os.urlArquivo && (
                            <button onClick={() => window.open(os.urlArquivo, '_blank')} title="Ver PDF"
                              className="p-1.5 rounded border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 transition-colors">
                              <Printer className="w-3.5 h-3.5 text-emerald-600" />
                            </button>
                          )}
                          {activeTab === 'executadas' && (
                            <button onClick={() => openView(os)} title="Ver OS"
                              className="p-1.5 rounded border border-slate-200 hover:bg-slate-100 transition-colors">
                              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className={`${tdCls} font-bold text-slate-800`}>{os.codigo ?? `OS-${os.id}`}{os.numero ? `/${os.numero}` : ''}</td>
                      <td className={tdCls}>{os.cliente?.nome ?? os.clienteId ?? '—'}</td>
                      <td className={tdCls}>{os.contato?.nome ?? os.contatoId ?? '—'}</td>
                      <td className={tdCls}>{os.equipamento?.nome ?? os.equipamentoId ?? '—'}</td>
                      <td className={tdCls}>{os.dataInicial ? new Date(os.dataInicial).toLocaleDateString('pt-BR') : '—'}</td>
                      <td className={tdCls}>{os.horaInicial ?? '—'}</td>
                      <td className={tdCls}>{tipoLabel}</td>
                      {activeTab === 'canceladas' && <td className={`${tdCls} text-red-600`}>{os.motivoCancelamento ?? '—'}</td>}
                      <td className={`${tdCls} max-w-[200px] truncate`}>{os.observacoes ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ModalCadastroOrdem
        modal={modalOpen}
        data={modalData}
        handleClose={() => setModalOpen(false)}
        save={handleSave}
        veiculos={veiculos}
        funcionarios={funcionarios}
        escalas={escalas}
        empresas={empresas}
        onlyView={onlyView}
      />

      <ModalBaixarOrdem
        modal={baixaLoteOpen}
        handleClose={() => setBaixaLoteOpen(false)}
        save={handleBaixaLote}
      />
    </>
  );
}
