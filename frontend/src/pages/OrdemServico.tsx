import { useEffect, useState, useMemo } from 'react';
import { Loader2, Plus, ChevronRight, X, Printer, ArrowDownToLine, FolderPlus, Eye, Edit2, AlertCircle, Copy, DollarSign } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';
import ModalCadastroOrdem from '../components/ModalCadastroOrdem';
import ModalBaixarOrdem from '../components/ModalBaixarOrdem';
import ModalCriarLoteOS from '../components/ModalCriarLoteOS';
import ModalPrecificarOS from '../components/ModalPrecificarOS';

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
  const [propostas, setPropostas] = useState<any[]>([]);
  const [propostaLoading, setPropostaLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<OsTab>('em_aberto');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<any>(null);
  const [onlyView, setOnlyView] = useState(false);
  const [baixaLoteOpen, setBaixaLoteOpen] = useState(false);
  const [loteOpen, setLoteOpen] = useState(false);
  const [loteOrdemBase, setLoteOrdemBase] = useState<any>(null);
  const [precificarOpen, setPrecificarOpen] = useState(false);
  const [precificarOS, setPrecificarOS] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Filtros
  const [filtroEquip, setFiltroEquip] = useState('');
  const [filtroEmpresa, setFiltroEmpresa] = useState('');
  const [filtroInicio, setFiltroInicio] = useState('');
  const [filtroFim, setFiltroFim] = useState('');
  const [filtroProposta, setFiltroProposta] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordRes, funcRes, veicRes, escRes, empRes] = await Promise.all([
        api.get('/os-logistica').catch(() => ({ data: [] })),
        api.get('/rh').catch(() => ({ data: [] })),
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

  // P0-1: Buscar propostas aprovadas para a tab "Abrir"
  const fetchPropostas = async () => {
    setPropostaLoading(true);
    try {
      const res = await api.get('/propostas', {
        params: { limit: 200 }
      });
      const data = res.data?.data ?? res.data ?? [];
      // Filtrar somente propostas aprovadas/aceitas/vigentes
      const aprovadas = (Array.isArray(data) ? data : []).filter((p: any) =>
        ['APROVADA', 'ACEITA', 'VIGENTE'].includes(p.status)
      );
      setPropostas(aprovadas);
    } catch {
      setPropostas([]);
    } finally {
      setPropostaLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    if (activeTab === 'abrir') fetchPropostas();
  }, [activeTab]);

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const tab = TABS.find(t => t.id === activeTab);
    if (!tab || !tab.statusMatch.length) return [];
    return ordens.filter(o => {
      if (!tab.statusMatch.includes(o.status)) return false;
      if (filtroEquip && !(o.equipamentoId ?? '').toString().toLowerCase().includes(filtroEquip.toLowerCase())) return false;
      if (filtroEmpresa && !(o.empresaId ?? '').toString().toLowerCase().includes(filtroEmpresa.toLowerCase())) return false;
      if (filtroInicio && o.dataInicial && o.dataInicial < filtroInicio) return false;
      if (filtroFim && o.dataInicial && o.dataInicial > filtroFim) return false;
      return true;
    });
  }, [ordens, activeTab, filtroEquip, filtroEmpresa, filtroInicio, filtroFim]);

  // P0-1: Filtro de propostas
  const filteredPropostas = useMemo(() => {
    if (!filtroProposta) return propostas;
    const lower = filtroProposta.toLowerCase();
    return propostas.filter((p: any) =>
      (p.codigo ?? '').toLowerCase().includes(lower) ||
      (p.cliente?.nome ?? '').toLowerCase().includes(lower) ||
      (p.vendedorNome ?? p.vendedor ?? '').toLowerCase().includes(lower)
    );
  }, [propostas, filtroProposta]);

  const countFor = (ids: number[]) => ordens.filter(o => ids.includes(o.status)).length;

  // ── P0-1: Abrir OS a partir de proposta ────────────────────────────────────
  const openFromProposta = async (proposta: any) => {
    if (!proposta.cliente?.cnpj && !proposta.clienteId) {
      showToast('Favor completar o cadastro do cliente antes de prosseguir.');
      return;
    }

    // Buscar último número da OS para esta proposta
    const existentes = ordens.filter(o => o.codigo === proposta.codigo);
    const maxNumero = existentes.reduce((max: number, o: any) => Math.max(max, o.numero ?? 0), 0);

    const osBase = {
      Codigo: proposta.codigo,
      Numero: maxNumero + 1,
      Status: 1,
      Proposta: proposta,
      propostaId: proposta.id,
      DataInicial: new Date().toISOString().split('T')[0],
      Empresa: proposta.empresa,
      empresaId: proposta.empresaId,
      Cliente: proposta.cliente,
      clienteId: proposta.clienteId,
      Contato: proposta.contato,
      contatoId: proposta.contatoId,
      // P0-2: Herdar itens (equipamentos) da proposta
      _propostaItens: proposta.itens ?? [],
      _propostaEquipe: proposta.equipe ?? [],
    };

    setModalData(osBase);
    setOnlyView(false);
    setModalOpen(true);
  };

  // ── Actions ─────────────────────────────────────────────────────────────────
  const openNew = () => { setModalData(null); setOnlyView(false); setModalOpen(true); };
  const openEdit = (os: any) => { setModalData(os); setOnlyView(false); setModalOpen(true); };
  const openView = (os: any) => { setModalData(os); setOnlyView(true); setModalOpen(true); };

  const handleSave = async (ordem: any, baixar = false) => {
    try {
      const payload = {
        ...ordem,
        status: baixar ? 2 : 1,
        codigo: ordem.Codigo ?? ordem.codigo,
        numero: ordem.Numero ?? ordem.numero,
        propostaId: ordem.propostaId,
        clienteId: ordem.clienteId ?? ordem.Cliente?.id,
        contatoId: ordem.contatoId ?? ordem.ContatoId,
        equipamentoId: ordem.equipamentoId ?? ordem.EquipamentoId,
        empresaId: ordem.empresaId ?? ordem.EmpresaId,
        tipoCobranca: ordem.TipoCobranca ?? ordem.tipoCobranca,
        dataInicial: ordem.DataInicial ?? ordem.dataInicial,
        horaInicial: ordem.HoraInicial ?? ordem.horaInicial,
        diasSemana: ordem.DiasSemana ?? ordem.diasSemana,
        quantidadeDia: ordem.QuantidadeDia ?? ordem.quantidadeDia,
        acompanhante: ordem.Acompanhante ?? ordem.acompanhante,
        horaPadrao: ordem.HoraPadrao ?? ordem.horaPadrao,
        horaEntrada: ordem.HoraEntrada ?? ordem.horaEntrada,
        horaSaida: ordem.HoraSaida ?? ordem.horaSaida,
        horaAlmoco: ordem.HoraAlmoco ?? ordem.horaAlmoco,
        horaTolerancia: ordem.HoraTolerancia ?? ordem.horaTolerancia,
        horaTotal: ordem.HoraTotal ?? ordem.horaTotal,
        horaAdicional: ordem.HoraAdicional ?? ordem.horaAdicional,
        descontarAlmoco: ordem.DescontarAlmoco ?? ordem.descontarAlmoco,
        observacoes: ordem.Observacoes ?? ordem.observacoes,
        Servicos: ordem.Servicos,
        EscalaFuncionarios: ordem.EscalaFuncionarios,
        EscalaVeiculos: ordem.EscalaVeiculos,
      };
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

  // P1: Criar em lote
  const handleCriarLote = async (payload: any) => {
    await api.post('/os-logistica/lote', payload);
    showToast('Lote criado com sucesso!', 'success');
    setLoteOpen(false);
    fetchData();
  };

  // P1: Imprimir em lote (abre nova janela)
  const handlePrintLote = async () => {
    if (!selectedIds.length) return;
    try {
      const res = await api.get(`/os-logistica/imprimir-lote?ids=${selectedIds.join(',')}`);
      const osList = res.data?.osList ?? [];
      const w = window.open('', '_blank');
      if (!w) return showToast('Popup bloqueado pelo navegador.');
      w.document.write(`<html><head><title>Impressão OS em Lote</title><style>
        body{font-family:Arial,sans-serif;font-size:12px;margin:20px}
        .os{page-break-after:always;border:1px solid #ccc;padding:16px;margin-bottom:20px;border-radius:8px}
        .os:last-child{page-break-after:auto}
        h2{margin:0 0 8px;font-size:16px;color:#1e3a5f}
        table{width:100%;border-collapse:collapse;margin-top:8px}
        td,th{padding:4px 8px;border:1px solid #ddd;text-align:left;font-size:11px}
        th{background:#f0f4f8;font-weight:bold}
        @media print{body{margin:0}.os{border:none;padding:10px}}
      </style></head><body>`);
      osList.forEach((os: any) => {
        const tipoLabel = ['','Hora','Diária','Frete','Fechada'][os.tipoCobranca] ?? '—';
        w.document.write(`<div class="os">
          <h2>OS #${os.id} — ${os.codigo || ''}${os.numero ? '/' + os.numero : ''}</h2>
          <table><tr><th>Data</th><td>${os.dataInicial ? new Date(os.dataInicial).toLocaleDateString('pt-BR') : '—'}</td>
          <th>Hora</th><td>${os.horaInicial || '—'}</td>
          <th>Tipo Cobrança</th><td>${tipoLabel}</td></tr>
          <tr><th>Hora Padrão</th><td>${os.horaPadrao || '—'}</td>
          <th>Entrada</th><td>${os.horaEntrada || '—'}</td>
          <th>Saída</th><td>${os.horaSaida || '—'}</td></tr>
          <tr><th>Hora Total</th><td>${os.horaTotal || '—'}</td>
          <th>Adicional</th><td>${os.horaAdicional || '—'}</td>
          <th>Almoço</th><td>${os.horaAlmoco || '—'}</td></tr></table>
          ${os.servicos?.length ? '<h3 style="margin-top:12px">Serviços</h3><ul>' + os.servicos.map((s: any) => `<li>${s.discriminacao}</li>`).join('') + '</ul>' : ''}
          ${os.observacoes ? '<p><b>Obs:</b> ' + os.observacoes + '</p>' : ''}
        </div>`);
      });
      w.document.write('</body></html>');
      w.document.close();
      setTimeout(() => w.print(), 500);
    } catch { showToast('Erro ao preparar impressão.'); }
  };

  // P2: Precificar
  const handlePrecificar = async (id: number, payload: any) => {
    await api.patch(`/os-logistica/${id}/precificar`, payload);
    showToast('OS precificada com sucesso!', 'success');
    fetchData();
  };

  // P0-4: Indicador de atraso
  const isAtrasada = (os: any) => {
    if (!os.dataInicial) return false;
    const dataOS = new Date(os.dataInicial);
    dataOS.setDate(dataOS.getDate() + 1);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return dataOS < hoje;
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
              <>
                <button onClick={handlePrintLote}
                  className="bg-slate-600 hover:bg-slate-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors">
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir ({selectedIds.length})
                </button>
                <button onClick={() => setBaixaLoteOpen(true)}
                  className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors">
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  Baixar Lote ({selectedIds.length})
                </button>
              </>
            )}
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
            {activeTab === 'em_aberto' && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="flex items-center gap-1 text-[10px] text-slate-500 font-bold"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Baixa em atraso</span>
              </div>
            )}
          </div>
        )}

        {/* ── Tab Abrir: Lista de Propostas Aprovadas ── */}
        {activeTab === 'abrir' && (
          <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-auto">
            <div className="px-6 py-4 flex items-center gap-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-700">Propostas Aprovadas</h3>
              <input
                type="text"
                placeholder="Buscar por código, cliente ou vendedor..."
                value={filtroProposta}
                onChange={e => setFiltroProposta(e.target.value)}
                className="ml-4 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-400 flex-1 max-w-xs"
              />
            </div>
            {propostaLoading ? (
              <div className="py-10 text-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" /></div>
            ) : (
              <table className="w-full text-sm min-w-max">
                <thead>
                  <tr className="bg-[#1e3a5f]">
                    <th className={thCls + ' w-20'}>Ação</th>
                    <th className={thCls}>Proposta</th>
                    <th className={thCls}>Revisão</th>
                    <th className={thCls}>Empresa</th>
                    <th className={thCls}>Cliente</th>
                    <th className={thCls}>Vendedor</th>
                    <th className={thCls}>Data Geração</th>
                    <th className={thCls}>Validade</th>
                    <th className={thCls}>Aprovação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPropostas.length === 0 ? (
                    <tr><td colSpan={9} className="py-10 text-center text-slate-400 italic text-xs">Nenhuma proposta aprovada encontrada.</td></tr>
                  ) : filteredPropostas.map((p: any) => (
                    <tr key={p.id} className="hover:bg-blue-50/50 transition-colors group cursor-pointer">
                      <td className={tdCls}>
                        <button
                          onClick={() => openFromProposta(p)}
                          title="Abrir OS a partir desta proposta"
                          className="p-1.5 rounded border border-slate-200 hover:bg-blue-100 hover:border-blue-300 transition-colors"
                        >
                          <FolderPlus className="w-4 h-4 text-blue-600" />
                        </button>
                      </td>
                      <td className={`${tdCls} font-bold text-slate-800`}>{p.codigo}</td>
                      <td className={tdCls}>{p.revisao && p.revisao > 0 ? p.revisao : 'Não Revisado'}</td>
                      <td className={tdCls}>{p.empresa ?? '—'}</td>
                      <td className={tdCls}>{p.cliente?.nome ?? '—'}</td>
                      <td className={tdCls}>{p.vendedorNome ?? p.vendedor ?? '—'}</td>
                      <td className={tdCls}>{p.dataProposta ? new Date(p.dataProposta).toLocaleDateString('pt-BR') : '—'}</td>
                      <td className={tdCls}>{p.dataValidade ? new Date(p.dataValidade).toLocaleDateString('pt-BR') : '—'}</td>
                      <td className={tdCls}>{p.dataAprovacao ? new Date(p.dataAprovacao).toLocaleDateString('pt-BR') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Tabela OS (Em Aberto / Executadas / Canceladas) ── */}
        {activeTab !== 'abrir' && (
          <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-auto">
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
                  {activeTab === 'em_aberto' && <th className={thCls + ' w-12'}>Status</th>}
                  <th className={thCls}>Ações</th>
                  <th className={thCls}>Proposta</th>
                  <th className={thCls}>Código</th>
                  <th className={thCls}>Empresa</th>
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
                  <tr><td colSpan={14} className="py-10 text-center text-slate-400 italic text-xs">Nenhuma OS encontrada.</td></tr>
                ) : filtered.map((os: any) => {
                  const tipoLabel = ['', 'Hora', 'Diária', 'Frete', 'Fechada'][os.tipoCobranca] ?? '—';
                  const atrasada = activeTab === 'em_aberto' && isAtrasada(os);
                  return (
                    <tr key={os.id} className={`hover:bg-slate-50 transition-colors group ${atrasada ? 'bg-red-50/30' : ''}`}>
                      {activeTab === 'em_aberto' && (
                        <td className={tdCls}>
                          <input type="checkbox" className="w-3.5 h-3.5 rounded accent-blue-600"
                            checked={selectedIds.includes(os.id)}
                            onChange={e => setSelectedIds(p => e.target.checked ? [...p, os.id] : p.filter(id => id !== os.id))} />
                        </td>
                      )}
                      {activeTab === 'em_aberto' && (
                        <td className={tdCls}>
                          {atrasada && <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" title="Baixa em atraso" />}
                        </td>
                      )}
                      <td className={tdCls}>
                        <div className="flex items-center gap-1">
                          {activeTab !== 'canceladas' && (
                            <>
                              <button onClick={() => openEdit(os)} title="Editar"
                                className="p-1.5 rounded border border-slate-200 hover:bg-blue-50 hover:border-blue-300 transition-colors">
                                <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                              </button>
                              {activeTab === 'em_aberto' && (
                                <button onClick={() => handleCancel(os)} title="Cancelar"
                                  className="p-1.5 rounded border border-slate-200 hover:bg-red-50 hover:border-red-300 transition-colors">
                                  <X className="w-3.5 h-3.5 text-red-500" />
                                </button>
                              )}
                            </>
                          )}
                          {activeTab === 'executadas' && (
                            <>
                              <button onClick={() => openView(os)} title="Ver OS"
                                className="p-1.5 rounded border border-slate-200 hover:bg-slate-100 transition-colors">
                                <Eye className="w-3.5 h-3.5 text-slate-500" />
                              </button>
                              <button onClick={() => { setPrecificarOS(os); setPrecificarOpen(true); }} title="Precificar"
                                className={`p-1.5 rounded border transition-colors ${os.statusPrecificacao === 'PRECIFICADO' ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:bg-emerald-50 hover:border-emerald-300'}`}>
                                <DollarSign className={`w-3.5 h-3.5 ${os.statusPrecificacao === 'PRECIFICADO' ? 'text-emerald-600' : 'text-slate-400'}`} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                      <td className={tdCls}>{os.codigo ?? '—'}</td>
                      <td className={`${tdCls} font-bold text-slate-800`}>{os.codigo ?? `OS-${os.id}`}{os.numero ? `/${os.numero}` : ''}</td>
                      <td className={tdCls}>{os.empresaId ?? '—'}</td>
                      <td className={tdCls}>{os.clienteId ?? '—'}</td>
                      <td className={tdCls}>{os.contatoId ?? '—'}</td>
                      <td className={tdCls}>{os.equipamentoId ?? '—'}</td>
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
          </div>
        )}
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
        onOpenLote={(ordemBase) => {
          setLoteOrdemBase(ordemBase);
          setLoteOpen(true);
        }}
      />

      <ModalBaixarOrdem
        modal={baixaLoteOpen}
        handleClose={() => setBaixaLoteOpen(false)}
        save={handleBaixaLote}
      />

      <ModalCriarLoteOS
        modal={loteOpen}
        handleClose={() => setLoteOpen(false)}
        save={handleCriarLote}
        ordemBase={loteOrdemBase}
      />

      <ModalPrecificarOS
        modal={precificarOpen}
        handleClose={() => setPrecificarOpen(false)}
        os={precificarOS}
        save={handlePrecificar}
      />
    </>
  );
}
