import { useToast } from '../contexts/ToastContext';
import { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import {
  Plus, Loader2, ChevronRight, X, Clock, Copy, Printer,
  CheckCircle2, AlertCircle, PlayCircle, FolderOpen, ChevronLeft, ChevronDown,
  Package, Users, ArrowDownToLine, RotateCcw, Eye
} from 'lucide-react';
import { ImprimirOS } from '../components/ImprimirOS';
import ModalBaixaLoteOS, { BaixaLoteData } from '../components/ModalBaixaLoteOS';
import ModalQuadroFuncionarios from '../components/ModalQuadroFuncionarios';
import ModalQuadroVeiculos from '../components/ModalQuadroVeiculos';

const EQUIPAMENTOS = [
  'Combinado', 'Alto Vácuo / Sucção', 'Alta Pressão (AP)',
  'Super Alta Pressão (SAP)', 'Hidrojato', 'Mão de Obra / Serviço Manual',
];

const EMPRESAS = [
  'NACIONAL HIDROSANEAMENTO EIRELI EPP',
  'NACIONAL HIDRO LOCAÇÃO DE EQUIPAMENTOS EIRELI',
];

const TIPOS_COBRANCA = ['Hora', 'Diária', 'Frete', 'Fechada'];

const DIAS_SEMANA_OPTIONS = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];

type OsTab = 'abrir' | 'em_aberto' | 'em_execucao' | 'executadas' | 'canceladas';

function calcHorasTotais(entrada: string, saida: string, almoco: string, descontarAlmoco: boolean, minimoHorasStr: string): { total: string, adicional: string, diffRaw: number, adicRaw: number } {
  if (!entrada || !saida) return { total: '---', adicional: '---', diffRaw: 0, adicRaw: 0 };
  const e = new Date(entrada).getTime();
  const s = new Date(saida).getTime();
  if (isNaN(e) || isNaN(s) || s <= e) return { total: '---', adicional: '---', diffRaw: 0, adicRaw: 0 };
  
  let diff = (s - e) / 3600000;
  if (descontarAlmoco && almoco) diff -= 1;
  const h = Math.floor(diff);
  const m = Math.round((diff - h) * 60);
  const totalStr = `${h}h${m > 0 ? m + 'm' : ''}`;

  let adicionalStr = '---';
  let adicRaw = 0;
  const minHoras = Number(minimoHorasStr);
  if (!isNaN(minHoras) && minHoras > 0) {
    if (diff > minHoras) {
      adicRaw = diff - minHoras;
      const ha = Math.floor(adicRaw);
      const ma = Math.round((adicRaw - ha) * 60);
      adicionalStr = `${ha}h${ma > 0 ? ma + 'm' : ''}`;
    } else {
      adicionalStr = '0h';
    }
  }

  return { total: totalStr, adicional: adicionalStr, diffRaw: diff, adicRaw };
}

export default function OS() {
    const { showToast } = useToast();
  const [osList, setOsList] = useState<any[]>([]);
  const [propostas, setPropostas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<OsTab>('abrir');
  const [showModal, setShowModal] = useState(false);
  const [selectedOS, setSelectedOS] = useState<any>(null);
  const [modalTab, setModalTab] = useState<'servicos' | 'escala'>('servicos');
  const [saving, setSaving] = useState(false);
  const [disponibilidades, setDisponibilidades] = useState<any[]>([]);
  const [printOs, setPrintOs] = useState<any>(null);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [materiaisUtilizados, setMateriaisUtilizados] = useState<any[]>([]);
  const [veiculos, setVeiculos] = useState<any[]>([]);
  const [clienteContatos, setClienteContatos] = useState<any[]>([]);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelJustification, setCancelJustification] = useState('');

  // ── Lote Selection ──
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [printingLote, setPrintingLote] = useState(false);
  const [baixaLoteOpen, setBaixaLoteOpen] = useState(false);
  const [quadroFuncOpen, setQuadroFuncOpen] = useState(false);
  const [quadroVeicOpen, setQuadroVeicOpen] = useState(false);

  // ── Equipe Sugerida (from Proposta.equipe → OS) ──
  const [equipeSugerida, setEquipeSugerida] = useState<any[]>([]);

  useEffect(() => {
    if (printOs) {
      setTimeout(() => {
        window.print();
        setTimeout(() => setPrintOs(null), 500); // clear after print dialog closes
      }, 100);
    }
  }, [printOs]);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // Date filter for propostas tab
  const [dataFiltro, setDataFiltro] = useState(
    `09-11-2025 até 09-07-${new Date().getFullYear()}`
  );
  const [codigoFiltro, setCodigoFiltro] = useState('');

  // Form state
  const [form, setForm] = useState<any>({
    propostaId: '',
    codigo: '',
    dataInicial: new Date().toISOString().split('T')[0],
    horaInicial: '',
    tipoCobranca: 'Fechada',
    empresa: EMPRESAS[0],
    diasSemana: [] as string[],
    quantidadeDia: '',
    clienteNome: '',
    contato: '',
    acompanhante: '',
    servicos: [{ equipamento: '', descricao: '' }],
    escala: [], // Keep backward compatible, although we'll use a new structure for the linear table. Wait, we should migrate escala array.
    veiculosEscala: [] as { veiculoId: string; manutencao: boolean }[],
    observacoes: '',
    observacoesEscala: '',
    minimoHoras: '',
    entrada: '',
    saida: '',
    almoco: '',
    descontarAlmoco: false,
    qtdBicos: 1,
    turnos: 'DIURNO',
    qtdPessoas: 3,
  });

  const equipamentosFiltrados = useMemo(() => {
    if (!form.propostaId) return [];
    const prop = propostas.find(p => p.id === form.propostaId);
    if (!prop || !Array.isArray(prop.itens)) return [];
    const equips = prop.itens.map((i: any) => i.equipamento).filter(Boolean);
    return Array.from(new Set(equips)) as string[];
  }, [form.propostaId, propostas]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [osRes, propsRes, prodRes, veicRes] = await Promise.all([
        api.get('/os').catch(() => ({ data: [] })),
        api.get('/propostas').catch(() => ({ data: [] })),
        api.get('/estoque').catch(() => ({ data: [] })),
        api.get('/logistica/veiculos').catch(() => ({ data: [] })),
      ]);

      setOsList(Array.isArray(osRes.data) ? osRes.data : []);
      let fetchedPropostas = Array.isArray(propsRes.data) ? propsRes.data : (propsRes.data?.data || []);
      
      // M03: Esconder propostas supersedidas. Mostrar apenas a revisão mais alta de cada código.
      const mapP = new Map<string, any>();
      fetchedPropostas.forEach((p: any) => {
          if (!p.codigo) {
              mapP.set(p.id, p); // Se não tem código, mantém
              return;
          }
          const current = mapP.get(p.codigo);
          if (!current || (p.revisao > current.revisao)) {
              mapP.set(p.codigo, p);
          }
      });
      setPropostas(Array.from(mapP.values()));
      setProdutos(Array.isArray(prodRes.data) ? prodRes.data : []);
      setVeiculos(Array.isArray(veicRes.data) ? veicRes.data : []);
    } catch (err) {
      console.error('Erro ao buscar dados da OS', err);
      setOsList([]);
      setPropostas([]);
    } finally {
      setLoading(false);
    }
  };

  const STATUS_OPERACIONAL = [
    { value: 'NORMAL', label: 'Normal' },
    { value: 'FERIAS', label: 'Férias' },
    { value: 'ATESTADO', label: 'Atestado' },
    { value: 'LICENCA', label: 'Licença' },
    { value: 'INSS', label: 'INSS' },
    { value: 'FOLGA', label: 'Folga' },
  ];

  const updateFuncionarioField = (index: number, field: string, value: any) => {
    setForm((prev: any) => {
      const funcs = [...(prev.escala || [])];
      if (funcs[index]) {
        const item = typeof funcs[index] === 'object' ? { ...funcs[index] } : { nome: funcs[index], statusOperacional: 'NORMAL', ausente: false };
        (item as any)[field] = value;
        
        // Automation: If selecting name, find status
        if (field === 'nome') {
          const ta = (disponibilidades || []).find(d => d.nome === value);
          if (ta) {
            item.statusOperacional = ta.status === 'DISPONIVEL' ? 'NORMAL' : ta.status;
          }
        }
        
        funcs[index] = item;
      }
      return { ...prev, escala: funcs };
    });
  };

  const removeFuncionario = (index: number) => {
    setForm((prev: any) => {
      const funcs = [...(prev.escala || [])];
      return { ...prev, escala: funcs.filter((_: any, i: number) => i !== index) };
    });
  };

  const addFuncionarioRow = () => {
    setForm((prev: any) => {
      const funcs = [...(prev.escala || [])];
      return { ...prev, escala: [...funcs, { nome: '', statusOperacional: 'NORMAL', ausente: false }] };
    });
  };

  const handleUpdateStatus = async (id: string, newStatus: string, justification?: string) => {
    try {
      setSaving(true);
      if (newStatus === 'FINALIZADA') {
        const just = window.prompt('Deseja inserir alguma observação/justificativa para a finalização? (opcional)');
        await api.patch(`/os/${id}/finalizar`, { justificativa: just });
      } else {
        await api.patch(`/os/${id}`, { status: newStatus, justificativaCancelamento: justification });
      }
      showToast(`OS ${newStatus === 'CANCELADA' ? 'cancelada' : 'finalizada'} com sucesso!`);
      setShowCancelModal(false);
      setCancelJustification('');
      fetchData();
      setShowModal(false);
    } catch (error) {
      console.error('Update status error:', error);
      showToast('Erro ao atualizar status da OS');
    } finally {
      setSaving(false);
    }
  };

  const handleVerPDF = (os: any) => {
    const token = localStorage.getItem('accessToken');
    const url = `${api.defaults.baseURL}/os/${os.id}/pdf?token=${token}`;
    window.open(url, '_blank');
  };

  const handleReverterCancelamento = async (id: string) => {
    const justificativa = window.prompt('Justificativa para reverter o cancelamento:');
    if (!justificativa || justificativa.trim().length < 3) {
      showToast('Justificativa é obrigatória (mínimo 3 caracteres).');
      return;
    }
    try {
      setSaving(true);
      await api.patch(`/os/${id}/reverter-cancelamento`, { justificativa });
      showToast('Cancelamento revertido com sucesso!', 'success');
      fetchData();
      setShowModal(false);
    } catch (error: any) {
      console.error('Reverter cancelamento error:', error);
      showToast(error.response?.data?.error || 'Erro ao reverter cancelamento.');
    } finally {
      setSaving(false);
    }
  };

  const handlePrintLote = async () => {
    if (selectedIds.length === 0) return;
    try {
      setPrintingLote(true);
      const token = localStorage.getItem('accessToken');
      const url = `${api.defaults.baseURL}/os/exportar/lote-pdf?ids=${selectedIds.join(',')}&token=${token}`;
      window.open(url, '_blank');
      setSelectedIds([]); // clear selection after print
    } catch (err) {
      console.error('Erro ao imprimir lote', err);
      showToast('Falha ao gerar PDF das OSs selecionadas.');
    } finally {
      setPrintingLote(false);
    }
  };

  const handleBaixaLote = async (data: BaixaLoteData) => {
    if (selectedIds.length === 0) return;
    try {
      setSaving(true);
      const res = await api.patch('/os/baixar-lote', {
        ids: selectedIds,
        ...data,
      });
      showToast(`${res.data.baixadas} OS(s) baixada(s) com sucesso! Horas: ${res.data.horasTotais}`, 'success');
      if (res.data.erros > 0) {
        showToast(`${res.data.erros} erro(s) durante a baixa em lote.`);
      }
      setSelectedIds([]);
      fetchData();
    } catch (err: any) {
      console.error('Baixa lote error:', err);
      showToast(err.response?.data?.error || 'Falha ao baixar OS em lote.');
    } finally {
      setSaving(false);
    }
  };

  const handleQuadroFuncConfirm = (selected: any[]) => {
    const funcs = selected.map((f: any) => ({
      id: f.id,
      nome: f.nome,
      statusOperacional: f.status === 'DISPONIVEL' ? 'NORMAL' : (f.status || 'NORMAL'),
      ausente: false
    }));
    setForm((prev: any) => ({ ...prev, escala: funcs }));
  };

  useEffect(() => { fetchData(); }, []);

  // Auto-open modal from external navigation (e.g. Escala → Gerar OS)
  useEffect(() => {
    if (loading) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('autoOpen') === 'true') {
      const clienteNome = params.get('clienteNome') || '';
      const data = params.get('data') || new Date().toISOString().split('T')[0];
      const propostaId = params.get('propostaId') || '';

      // If a propostaId is provided, find the proposal and pre-fill from it
      if (propostaId) {
        const prop = propostas.find((p: any) => p.id === propostaId);
        if (prop) {
          openNewModal(prop);
          // Override date
          setForm((prev: any) => ({ ...prev, dataInicial: data }));
          // Clean URL
          window.history.replaceState({}, '', '/os');
          return;
        }
      }

      // Otherwise, open with the data we have
      openNewModal();
      setForm((prev: any) => ({
        ...prev,
        clienteNome,
        dataInicial: data,
      }));
      // Clean URL
      window.history.replaceState({}, '', '/os');
    }
  }, [loading, propostas]);

  // Fetch Disponibilidade whenever dates or client changes
  useEffect(() => {
    if (!showModal) return;

    // Find the client object to pass the exact ID to API (for integration check)
    const client = propostas.find((c: any) => c.cliente?.nome === form.clienteNome)?.cliente;

    api.get('/rh/disponibilidade', {
      params: {
        data: form.dataInicial,
        dataFim: form.dataInicial, // for now OS has only one date, could be expanded later
        clienteId: client?.id || ''
      }
    })
      .then(res => setDisponibilidades(Array.isArray(res.data) ? res.data : []))
      .catch(err => console.error("Error fetching disponibilidade", err));
  }, [form.dataInicial, form.clienteNome, showModal]);

  // ── Filtered lists ──────────────────────────────────────────────
  // Proposals marked as accepted/approved (used for highlighting in the list)

  const OS_STATUS_GROUPS = {
    ABERTA: ['ABERTA'],
    EM_EXECUCAO: ['EM_EXECUCAO', 'EM_ANDAMENTO'],
    CONCLUIDA: ['CONCLUIDA', 'BAIXADA', 'FINALIZADA'],
    CANCELADA: ['CANCELADA'],
  };

  const osFiltered = useMemo(() => {
    if (activeTab === 'abrir') return [];
    
    let statuses: string[] = [];
    if (activeTab === 'em_aberto') statuses = OS_STATUS_GROUPS.ABERTA;
    else if (activeTab === 'em_execucao') statuses = OS_STATUS_GROUPS.EM_EXECUCAO;
    else if (activeTab === 'executadas') statuses = OS_STATUS_GROUPS.CONCLUIDA;
    else if (activeTab === 'canceladas') statuses = OS_STATUS_GROUPS.CANCELADA;

    let list = (osList || []).filter(o => statuses.includes(o.status));

    // Filtro por Código
    if (codigoFiltro) {
      const search = codigoFiltro.toLowerCase();
      list = list.filter((o: any) => 
        (o.codigo && o.codigo.toLowerCase().includes(search)) ||
        (o.proposta?.codigo && o.proposta.codigo.toLowerCase().includes(search))
      );
    }

    // Filtro por Data Inicial da OS
    if (dataFiltro) {
      const parts = dataFiltro.split(' até ');
      if (parts.length === 2) {
        const parseData = (str: string) => {
          const [d, m, y] = str.split('-');
          return new Date(Number(y), Number(m) - 1, Number(d)).getTime();
        };
        const inicio = parseData(parts[0]);
        const fim = parseData(parts[1]);

        list = list.filter((o: any) => {
          if (!o.dataInicial) return true;
          const osTime = new Date(o.dataInicial).getTime();
          return osTime >= inicio && osTime <= fim;
        });
      }
    }

    return list;
  }, [osList, activeTab, codigoFiltro, dataFiltro]);

  // Helper to check if a proposal + equipment already has an active OS
  const getExistingOS = (propostaId: string, equipamento: string) => {
    return osList.find(o => 
      o.propostaId === propostaId && 
      o.servicos?.some((s: any) => s.equipamento === equipamento) &&
      !['CANCELADA', 'FINALIZADA', 'CONCLUIDA', 'BAIXADA'].includes(o.status)
    );
  };

  const propostasFiltroData = useMemo(() => {
    let list = propostas || [];

    // M03: Esconder propostas supersedidas — mostrar apenas a última revisão de cada código-base
    // Ex: PROP-2026-0001, PROP-2026-0001-R1, PROP-2026-0001-R2 → mostra apenas R2
    const latestMap = new Map<string, any>();
    for (const p of list) {
      if (!p.codigo) continue;
      // Extract base code (remove -R1, -R2 suffixes)
      const baseCodigo = p.codigo.replace(/-R\d+$/i, '');
      const existing = latestMap.get(baseCodigo);
      if (!existing) {
        latestMap.set(baseCodigo, p);
      } else {
        // Compare: higher revision number wins, or more recent date
        const getRevision = (cod: string) => {
          const m = cod.match(/-R(\d+)$/i);
          return m ? parseInt(m[1]) : 0;
        };
        if (getRevision(p.codigo) > getRevision(existing.codigo)) {
          latestMap.set(baseCodigo, p);
        }
      }
    }
    list = Array.from(latestMap.values());

    // Filter only approved/accepted propostas (valid for OS creation)
    const STATUS_VALIDOS_PROPOSTA = ['APROVADA', 'ACEITA', 'VIGENTE'];
    list = list.filter((p: any) => STATUS_VALIDOS_PROPOSTA.includes(p.status));

    // Filter by Code
    if (codigoFiltro) {
      const search = codigoFiltro.toLowerCase();
      list = list.filter((p: any) => p.codigo && p.codigo.toLowerCase().includes(search));
    }

    // Date filter
    if (!dataFiltro) return list;
    const parts = dataFiltro.split(' até ');
    if (parts.length !== 2) return list;
    
    // string format: DD-MM-YYYY
    const parseData = (str: string) => {
      const [d, m, y] = str.split('-');
      return new Date(Number(y), Number(m) - 1, Number(d)).getTime();
    };

    const inicio = parseData(parts[0]);
    const fim = parseData(parts[1]);

    return list.filter((p: any) => {
      if (!p.dataProposta) return true;
      const propTime = new Date(p.dataProposta).getTime();
      return propTime >= inicio && propTime <= fim;
    });
  }, [propostas, dataFiltro, codigoFiltro]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    const source = activeTab === 'abrir' ? propostasFiltroData : osFiltered;
    return (source || []).slice(start, start + pageSize);
  }, [propostasFiltroData, osFiltered, page, pageSize, activeTab]);

  const totalPages = useMemo(() => {
    const source = activeTab === 'abrir' ? propostasFiltroData : osFiltered;
    return Math.ceil((source || []).length / pageSize) || 1;
  }, [propostasFiltroData, osFiltered, pageSize, activeTab]);

  // ── Modal helpers ───────────────────────────────────────────────
  const openNewModal = (prop?: any) => {
    const base: any = {
      propostaId: prop?.id || '',
      codigo: '',
      dataInicial: new Date().toISOString().split('T')[0],
      horaInicial: '',
      tipoCobranca: 'Fechada',
      empresa: prop?.empresa || EMPRESAS[0],
      diasSemana: [] as string[],
      quantidadeDia: '',
      clienteNome: prop?.cliente?.nome || '',
      contato: prop?.contato || '',
      acompanhante: '',
      servicos: prop?.itens?.length
        ? prop.itens.map((i: any) => ({ equipamento: i.equipamento || '', descricao: i.descricao || '' }))
        : [{ equipamento: '', descricao: '' }],
      observacoes: '',
      observacoesEscala: '',
      veiculosEscala: [],
      minimoHoras: '',
      entrada: '',
      saida: '',
      almoco: '',
      descontarAlmoco: false,
    };
    setForm(base);
    setSelectedOS(null);
    setModalTab('servicos');
    setMateriaisUtilizados([]);
    // FIX 5: Extrair equipe sugerida da proposta
    if (prop?.equipe?.length) {
      const sugerida = prop.equipe.map((e: any) => ({
        cargo: e.cargoRef?.nome || e.cargo || e.funcao || 'N/A',
        cargoId: e.cargoId,
        equipamento: e.equipamento,
        equipamentoId: e.equipamentoId,
        quantidade: e.quantidade || 1,
      }));
      setEquipeSugerida(sugerida);
      // Auto-set qtdPessoas from total equipe
      const totalPessoas = sugerida.reduce((sum: number, e: any) => sum + (e.quantidade || 1), 0);
      setForm((prev: any) => ({ ...prev, qtdPessoas: totalPessoas }));
    } else {
      setEquipeSugerida([]);
    }
    setShowModal(true);
  };

  const openEditModal = async (os: any) => {
    try {
      const res = await api.get(`/os/${os.id}`);
      const d = res.data;
      setSelectedOS(d);
      setForm({
        ...d,
        dataInicial: d.dataInicial ? new Date(d.dataInicial).toISOString().split('T')[0] : '',
        entrada: d.entrada ? new Date(d.entrada).toISOString().slice(0, 16) : '',
        saida: d.saida ? new Date(d.saida).toISOString().slice(0, 16) : '',
        almoco: d.almoco ? new Date(d.almoco).toISOString().slice(0, 16) : '',
        servicos: d.servicos?.length ? d.servicos : [{ equipamento: '', descricao: '' }],
        clienteNome: d.cliente?.nome || '',
        diasSemana: d.diasSemana ? (typeof d.diasSemana === 'string' ? d.diasSemana.split(',').filter(Boolean) : d.diasSemana) : [],
        veiculosEscala: d.veiculosEscala || [],
        observacoesEscala: d.observacoesEscala || '',
      });
      setModalTab('servicos');
      setMateriaisUtilizados([]);
      setShowModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  const onProposalChange = (propId: string) => {
    const prop = propostas.find(p => p.id === propId);
    if (prop) {
      // Legacy parity: auto-fill initially with first equipment if available
      const firstItem = prop.itens?.[0] || {};
      
      setForm((f: any) => ({
        ...f,
        propostaId: prop.id,
        clienteNome: prop.cliente?.nome || '',
        contato: prop.contato || '',
        empresa: prop.empresa || f.empresa,
        servicos: [{ equipamento: firstItem.equipamento || '', descricao: firstItem.descricao || '' }],
        tipoCobranca: firstItem.tipoCobranca || prop.tipoCobranca || 'Fechada',
        minimoHoras: firstItem.horasPorDia || prop.franquiaHoras || 0,
        quantidadeDia: firstItem.quantidade ? String(firstItem.quantidade) : '',
        diasSemana: prop.diasSemana ? (typeof prop.diasSemana === 'string' ? prop.diasSemana.split(',') : prop.diasSemana) : [],
      }));
      // Load client contacts
      if (prop.clienteId) {
        api.get(`/clientes/${prop.clienteId}`).then(res => {
          const c = res.data;
          const contatos = c.contatosList || (Array.isArray(c.contatos) ? c.contatos : []);
          setClienteContatos(contatos);
          
          // Se o contato da proposta for um ID, vamos buscar o nome
          if (prop.contato) {
              const matched = contatos.find((ct: any) => ct.id === prop.contato || ct.nome === prop.contato);
              if (matched) {
                  setForm((f: any) => ({ ...f, contato: matched.nome }));
              }
          }
        }).catch(() => setClienteContatos([]));
      }
      // FIX 5: Populate equipe sugerida
      if (prop.equipe?.length) {
        const sugerida = prop.equipe.map((e: any) => ({
          cargo: e.cargoRef?.nome || e.cargo || e.funcao || 'N/A',
          cargoId: e.cargoId,
          quantidade: e.quantidade || 1,
          equipamento: e.equipamento || ''
        }));
        setEquipeSugerida(sugerida);
      } else {
        setEquipeSugerida([]);
      }
    } else {
      setForm((f: any) => ({ ...f, propostaId: '' }));
      setClienteContatos([]);
      setEquipeSugerida([]);
    }
  };

  const addServico = () =>
    setForm((f: any) => ({ ...f, servicos: [...f.servicos, { equipamento: '', descricao: '' }] }));

  const removeServico = (idx: number) =>
    setForm((f: any) => ({ ...f, servicos: f.servicos.filter((_: any, i: number) => i !== idx) }));

  const updateServico = (idx: number, field: string, value: string) =>
    setForm((f: any) => {
      const s = [...f.servicos];
      s[idx] = { ...s[idx], [field]: value };
      const updated: any = { ...f, servicos: s };

      // Legacy parity: auto-fill TipoCobranca, HoraPadrao (minimoHoras) e quantidadeDia ao selecionar equipamento
      if (field === 'equipamento' && idx === 0 && f.propostaId) {
        const prop = propostas.find((p: any) => p.id === f.propostaId);
        if (prop?.itens) {
          const item = prop.itens.find((i: any) => i.equipamento === value);
          if (item) {
            if (item.tipoCobranca) updated.tipoCobranca = item.tipoCobranca;
            if (item.horasPorDia) updated.minimoHoras = item.horasPorDia;
            if (item.quantidade) updated.quantidadeDia = String(item.quantidade);
          }
        }
      }

      return updated;
    });

  const handleSave = async (action: 'ABRIR' | 'BAIXAR' | 'BAIXAR_ESTOQUE' | 'SALVAR') => {
    try {
      setSaving(true);
      let status = 'ABERTA';
      if (action === 'BAIXAR') status = 'CONCLUIDA';
      if (action === 'BAIXAR_ESTOQUE') status = 'BAIXADA';
      if (action === 'SALVAR' && selectedOS) status = selectedOS.status;

      // Verificação de duplicidade ao abrir
      if (action === 'ABRIR' && form.propostaId && form.servicos?.[0]?.equipamento) {
        const existing = getExistingOS(form.propostaId, form.servicos[0].equipamento);
        if (existing) {
          if (!window.confirm(`⚠️ Já existe uma OS (${existing.codigo}) aberta para este equipamento nesta proposta. Deseja criar outra mesmo assim?`)) {
            setSaving(false);
            return;
          }
        }
      }
      
      const payload: any = { 
        ...form, 
        status,
        diasSemana: Array.isArray(form.diasSemana) ? form.diasSemana.join(',') : (form.diasSemana || ''),
        horasTotais: horas.diffRaw > 0 ? Number(horas.diffRaw.toFixed(2)) : undefined,
        horasAdicionais: horas.adicRaw > 0 ? Number(horas.adicRaw.toFixed(2)) : undefined,
        veiculosEscala: form.veiculosEscala?.length > 0 ? form.veiculosEscala : undefined,
        observacoesEscala: form.observacoesEscala || undefined,
      };
      // Incluir materiais utilizados se estiver baixando com estoque
      if (action === 'BAIXAR_ESTOQUE' && materiaisUtilizados.length > 0) {
        payload.materiaisUtilizados = materiaisUtilizados.filter((m: any) => m.produtoId && m.quantidade > 0);
      }
      if (selectedOS) {
        await api.patch(`/os/${selectedOS.id}`, payload);
      } else {
        await api.post('/os', payload);
      }
      setShowModal(false);
      setMateriaisUtilizados([]);
      fetchData();
    } catch (err) {
      console.error('Error saving OS', err);
      showToast('Erro ao salvar OS. Verifique os campos obrigatórios.');
    } finally {
      setSaving(false);
    }
  };

  // ── Material helpers ──
  const addMaterial = () => setMateriaisUtilizados(prev => [...prev, { produtoId: '', quantidade: 1, darBaixaEstoque: true }]);
  const removeMaterial = (idx: number) => setMateriaisUtilizados(prev => prev.filter((_, i) => i !== idx));
  const updateMaterial = (idx: number, field: string, value: any) => {
    setMateriaisUtilizados(prev => {
      const arr = [...prev];
      arr[idx] = { ...arr[idx], [field]: value };
      return arr;
    });
  };

  const handleDuplicate = async (os: any) => {
    try {
      await api.post('/os', {
        propostaId: os.propostaId,
        clienteNome: os.cliente?.nome,
        contato: os.contato,
        empresa: os.empresa,
        tipoCobranca: os.tipoCobranca,
        servicos: os.servicos || [],
        status: 'ABERTA',
        dataInicial: new Date().toISOString().split('T')[0],
        observacoes: `[Duplicada de OS ${os.codigo}] ${os.observacoes || ''}`,
      });
      fetchData();
    } catch (err) {
      console.error('Error duplicating OS', err);
    }
  };

  const horas = calcHorasTotais(form.entrada, form.saida, form.almoco, form.descontarAlmoco, form.minimoHoras);

  // ── Tab config ──────────────────────────────────────────────────
  const tabs: { id: OsTab; label: string; color: string; dotColor: string; count: number }[] = [
    { id: 'abrir', label: 'Abrir', color: 'text-blue-600', dotColor: 'bg-blue-500', count: propostasFiltroData.length },
    { id: 'em_aberto', label: 'Abertas', color: 'text-blue-500', dotColor: 'bg-blue-400', count: (osList || []).filter(o => OS_STATUS_GROUPS.ABERTA.includes(o.status)).length },
    { id: 'em_execucao', label: 'Em Execução', color: 'text-amber-500', dotColor: 'bg-amber-400', count: (osList || []).filter(o => OS_STATUS_GROUPS.EM_EXECUCAO.includes(o.status)).length },
    { id: 'executadas', label: 'Executadas', color: 'text-emerald-600', dotColor: 'bg-emerald-500', count: (osList || []).filter(o => OS_STATUS_GROUPS.CONCLUIDA.includes(o.status)).length },
    { id: 'canceladas', label: 'Canceladas', color: 'text-slate-500', dotColor: 'bg-slate-800', count: (osList || []).filter(o => OS_STATUS_GROUPS.CANCELADA.includes(o.status)).length },
  ];

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <>
      <div className={`h-full flex flex-col ${printOs ? 'print:hidden' : ''}`}>
        {/* ═══ TABS HEADER ═══ */}
        <div className="bg-[#1e3a5f] rounded-xl mb-4 px-6 py-3 flex items-center gap-10">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => { setActiveTab(t.id); setPage(1); }}
              className={`flex flex-col items-center gap-1 text-xs font-bold transition-all ${activeTab === t.id ? 'text-white' : 'text-blue-200 hover:text-white'}`}
            >
              <div className={`w-3 h-3 rounded-full ${t.dotColor} ${activeTab === t.id ? 'ring-2 ring-white ring-offset-1 ring-offset-[#1e3a5f]' : 'opacity-60'}`} />
              <span className="uppercase tracking-wide text-[11px]">{t.label}</span>
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            {selectedIds.length > 0 && activeTab !== 'abrir' && (
              <>
                <button
                  onClick={handlePrintLote}
                  disabled={printingLote}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {printingLote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                  Imprimir ({selectedIds.length})
                </button>
                {activeTab === 'em_aberto' && (
                  <button
                    onClick={() => setBaixaLoteOpen(true)}
                    className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                    Baixar Lote ({selectedIds.length})
                  </button>
                )}
              </>
            )}
            <button
              onClick={() => openNewModal()}
              className="bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Nova OS
            </button>
          </div>
        </div>

        {/* ═══ FILTER BAR (All Tabs) ═══ */}
        <div className="mb-3 px-1 flex gap-4">
          <div>
            <p className="text-xs font-bold text-slate-500 mb-1">
              {activeTab === 'abrir' ? 'Filtrar data proposta' : 'Filtrar data inicial (OS)'}
            </p>
            <input
              type="text"
              value={dataFiltro}
              onChange={e => setDataFiltro(e.target.value)}
              className="border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-600 w-56 outline-none focus:ring-1 focus:ring-blue-400"
              placeholder="DD-MM-YYYY até DD-MM-YYYY"
            />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 mb-1">Código Proposta / OS</p>
            <input
              type="text"
              value={codigoFiltro}
              onChange={e => setCodigoFiltro(e.target.value)}
              className="border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-600 w-56 outline-none focus:ring-1 focus:ring-blue-400"
              placeholder="Ex: PROP-2026-..."
            />
          </div>
        </div>

        {/* ═══ TABLE ═══ */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm min-w-max">
              <thead>
                <tr className="bg-[#1e3a5f] text-white">
                  {activeTab === 'abrir' ? (
                    <>
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide">Ações</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide">Proposta</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide">Revisão</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide">Empresa</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide">Cliente</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide">Vendedor</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide">Data de Geração</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide">Validade</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide">Data de Aprovação</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3 text-left w-10">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 w-3.5 h-3.5 text-blue-600 cursor-pointer"
                          checked={paginated.length > 0 && selectedIds.length === paginated.length}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedIds(paginated.map(o => o.id));
                            else setSelectedIds([]);
                          }}
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide">Ações</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide">Código OS</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide">Proposta</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide">Cliente</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide">Empresa</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide">Data Inicial</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide">Status</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeTab === 'abrir' ? (
                  paginated.map((prop: any) => {
                    // Check if ANY equipment from this proposal already has an active OS
                    const hasOpenOS = prop.itens?.some((i: any) => getExistingOS(prop.id, i.equipamento));
                    
                    return (
                      <tr key={prop.id} className={`hover:bg-blue-50/40 transition-colors group ${hasOpenOS ? 'opacity-70 bg-slate-50' : ''}`}>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => openNewModal(prop)}
                            title={hasOpenOS ? "Já existe OS aberta para esta proposta" : "Abrir OS a partir desta proposta"}
                            className={`p-1.5 rounded-lg border transition-colors ${hasOpenOS 
                              ? 'border-amber-200 bg-amber-50 text-amber-600' 
                              : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50 group-hover:border-blue-300'}`}
                          >
                            {hasOpenOS ? <AlertCircle className="w-4 h-4" /> : <FolderOpen className="w-4 h-4 text-slate-500 group-hover:text-blue-600" />}
                          </button>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-800">
                          {prop.codigo}
                          {hasOpenOS && <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-black">JÁ ABERTA</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {prop.revisao ?? <span className="text-slate-400 italic">Não revisado</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs max-w-[180px] truncate">
                          {prop.empresa || prop.cnpjFaturamento || '—'}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800 max-w-[180px] truncate">
                          {prop.cliente?.nome || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs">
                          {prop.vendedorNome || prop.vendedor || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {prop.createdAt ? new Date(prop.createdAt).toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {prop.dataValidade ? new Date(prop.dataValidade).toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {prop.dataAprovacao ? (
                            <span className="text-emerald-700 font-bold">{new Date(prop.dataAprovacao).toLocaleDateString('pt-BR')}</span>
                          ) : prop.status === 'ACEITA' ? (
                            <span className="text-emerald-700 font-bold">{prop.updatedAt ? new Date(prop.updatedAt).toLocaleDateString('pt-BR') : '—'}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  paginated.map((os: any) => (
                    <tr key={os.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => openEditModal(os)}>
                      <td className="px-4 py-3 text-left" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 w-3.5 h-3.5 text-blue-600 cursor-pointer"
                          checked={selectedIds.includes(os.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedIds(p => [...p, os.id]);
                            else setSelectedIds(p => p.filter(id => id !== os.id));
                          }}
                        />
                      </td>
                      <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); openEditModal(os); }}
                            title="Editar OS"
                            className="p-1.5 rounded border border-slate-200 hover:bg-blue-50 hover:border-blue-300"
                          >
                            <ChevronRight className="w-3.5 h-3.5 text-blue-500" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleVerPDF(os); }}
                            title="Visualizar PDF"
                            className="p-1.5 rounded border border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-600" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setPrintOs(os); }}
                            title="Imprimir OS"
                            className="p-1.5 rounded border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300"
                          >
                            <Printer className="w-3.5 h-3.5 text-emerald-600" />
                          </button>
                          {activeTab === 'canceladas' && (
                            <button
                               onClick={() => handleDuplicate(os)}
                               title="Duplicar OS"
                               className="p-1.5 rounded border border-slate-200 hover:bg-blue-50 hover:border-blue-300"
                            >
                               <Copy className="w-3.5 h-3.5 text-blue-600" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold text-blue-700">{os.codigo || '—'}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{os.proposta?.codigo || os.propostaCodigo || '—'}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{os.cliente?.nome || '—'}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 max-w-[180px] truncate">{os.empresa || '—'}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {os.dataInicial ? new Date(os.dataInicial).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={os.status} />
                      </td>
                    </tr>
                  ))
                )}
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-slate-400 text-sm italic">
                      {activeTab === 'abrir' ? 'Nenhuma proposta encontrada' : 'Nenhuma OS nesta categoria'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── PAGINATION ── */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 disabled:opacity-30 flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Anterior
            </button>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>Página</span>
              <span className="font-bold text-slate-800">{page}</span>
              <span>de {totalPages}</span>
              <span className="text-slate-300">|</span>
              <span className="font-bold">{activeTab === 'abrir' ? propostas.length : osFiltered.length} itens</span>
            </div>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 disabled:opacity-30 flex items-center gap-1"
            >
              Próximo <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ═══ OS OPENING MODAL ═══ */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden">

              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 bg-[#1e3a5f] text-white rounded-t-2xl">
                <h2 className="font-bold text-base tracking-wide">
                  {selectedOS ? `OS ${selectedOS.codigo}` : 'Abertura de OS'}
                </h2>
                <button onClick={() => setShowModal(false)} className="hover:text-blue-200 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">

                {/* Row 1 */}
                <div className="grid grid-cols-6 gap-3">
                  <FormField label="N° Proposta">
                    <select
                      value={form.propostaId}
                      onChange={e => onProposalChange(e.target.value)}
                      disabled={!!selectedOS}
                      className="w-full border border-slate-300 rounded px-2 py-2 text-xs outline-none focus:border-blue-400 bg-white disabled:bg-slate-100 disabled:text-slate-500"
                    >
                      <option value="">Selecione...</option>
                      {(propostas || []).map(p => (
                        <option key={p.id} value={p.id}>{p.codigo}</option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Código OS">
                    <input
                      type="text"
                      value={form.codigo}
                      onChange={e => setForm((f: any) => ({ ...f, codigo: e.target.value }))}
                      placeholder="Auto"
                      readOnly
                      className="w-full border border-slate-300 rounded px-2 py-2 text-xs outline-none bg-slate-100 text-slate-500 cursor-not-allowed font-bold"
                    />
                  </FormField>

                  <FormField label="Data Inicial">
                    <input
                      type="date"
                      value={form.dataInicial}
                      onChange={e => setForm((f: any) => ({ ...f, dataInicial: e.target.value }))}
                      className="w-full border border-slate-300 rounded px-2 py-2 text-xs outline-none focus:border-blue-400"
                    />
                  </FormField>

                  <FormField label="Hora Inicial">
                    <div className="relative">
                      <input
                        type="time"
                        value={form.horaInicial}
                        onChange={e => setForm((f: any) => ({ ...f, horaInicial: e.target.value }))}
                        className="w-full border border-slate-300 rounded px-2 py-2 text-xs outline-none focus:border-blue-400"
                      />
                      <Clock className="absolute right-2 top-2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </FormField>

                  <FormField label="Tipo de Cobrança">
                    <div className="relative">
                      <select
                        value={form.tipoCobranca}
                        onChange={e => setForm((f: any) => ({ ...f, tipoCobranca: e.target.value }))}
                        className="w-full border border-slate-300 rounded px-2 py-2 text-xs outline-none focus:border-blue-400 appearance-none"
                      >
                        {TIPOS_COBRANCA.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <ChevronDown className="absolute right-2 top-2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </FormField>

                  <FormField label="Empresa">
                    <div className="relative">
                      <select
                        value={form.empresa}
                        onChange={e => setForm((f: any) => ({ ...f, empresa: e.target.value }))}
                        className="w-full border border-slate-300 rounded px-2 py-2 text-xs outline-none focus:border-blue-400 appearance-none"
                      >
                        {EMPRESAS.map(em => <option key={em} value={em}>{em}</option>)}
                      </select>
                      <ChevronDown className="absolute right-2 top-2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </FormField>
                </div>

                {/* Row 2: Dias da Semana (chips) | Quantidade p/ dia */}
                <div className="grid grid-cols-[2fr_1fr] gap-3">
                  <FormField label="Dias da Semana">
                    <div className="flex items-center gap-1.5 flex-wrap min-h-[34px] border border-slate-300 rounded px-2 py-1.5 bg-white">
                      {(form.diasSemana || []).map((d: string) => (
                        <span key={d} className="inline-flex items-center gap-1 bg-[#1e3a5f] text-white text-[10px] font-bold px-2 py-0.5 rounded">
                          {d}
                          <button type="button" onClick={() => setForm((f: any) => ({ ...f, diasSemana: (f.diasSemana || []).filter((x: string) => x !== d) }))} className="hover:text-red-300 transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      {(form.diasSemana || []).length > 0 && (
                        <button type="button" onClick={() => setForm((f: any) => ({ ...f, diasSemana: [] }))} className="p-0.5 text-slate-400 hover:text-red-500 ml-auto flex items-center justify-center bg-slate-100 rounded hover:bg-red-50">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <div className="relative ml-1">
                        <select
                          value=""
                          onChange={e => {
                            const val = e.target.value;
                            if (val && !(form.diasSemana || []).includes(val)) {
                              setForm((f: any) => ({ ...f, diasSemana: [...(f.diasSemana || []), val] }));
                            }
                          }}
                          className="text-[10px] text-slate-500 font-medium border-none outline-none bg-transparent cursor-pointer appearance-none pr-4"
                        >
                          <option value="">Dias</option>
                          {DIAS_SEMANA_OPTIONS.filter(d => !(form.diasSemana || []).includes(d)).map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-0 top-0.5 w-3 h-3 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </FormField>
                  <FormField label="Quantidade p/ dia">
                    <input
                      type="text"
                      value={form.quantidadeDia}
                      onChange={e => setForm((f: any) => ({ ...f, quantidadeDia: e.target.value }))}
                      placeholder="Quantidade p/ dia"
                      className="w-full border border-slate-300 rounded px-2 py-2 text-xs outline-none focus:border-blue-400"
                    />
                  </FormField>
                </div>

                {/* Row 3: Cliente | Contato | Acompanhante */}
                <div className="grid grid-cols-[2fr_1fr_1fr] gap-3">
                  <FormField label="Cliente">
                    <input
                      type="text"
                      readOnly
                      value={form.clienteNome}
                      className="w-full border border-slate-200 rounded px-2 py-2 text-xs bg-slate-100 font-bold uppercase text-slate-700 cursor-not-allowed"
                      placeholder="Selecione a proposta..."
                    />
                  </FormField>
                  <FormField label="Contato">
                    <div className="relative">
                      <select
                        value={form.contato}
                        onChange={e => setForm((f: any) => ({ ...f, contato: e.target.value }))}
                        className="w-full border border-slate-300 rounded px-2 py-2 text-xs outline-none focus:border-blue-400 appearance-none bg-white"
                      >
                        <option value="">Selecione...</option>
                        {clienteContatos.map((c: any, i: number) => (
                          <option key={c.id || i} value={c.nome}>{c.nome}{c.setor ? ` — ${c.setor}` : ''}</option>
                        ))}
                        {form.contato && !clienteContatos.find((c: any) => c.nome === form.contato) && (
                          <option value={form.contato}>{form.contato}</option>
                        )}
                      </select>
                      <ChevronDown className="absolute right-2 top-2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </FormField>
                  <FormField label="Acompanhante">
                    <input
                      type="text"
                      value={form.acompanhante}
                      onChange={e => setForm((f: any) => ({ ...f, acompanhante: e.target.value }))}
                      placeholder="Acompanhante"
                      className="w-full border border-slate-300 rounded px-2 py-2 text-xs outline-none focus:border-blue-400"
                    />
                  </FormField>
                </div>

                {/* ── TABS: Serviços / Escala ── */}
                <div className="mt-4">
                  <div className="flex gap-1 border-b border-slate-200">
                    {(['servicos', 'escala'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setModalTab(t)}
                        className={`px-5 py-2 text-xs font-bold capitalize transition-colors border-b-2 ${modalTab === t
                          ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                          : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                          }`}
                      >
                        {t === 'servicos' ? 'Serviços' : 'Escala'}
                      </button>
                    ))}
                  </div>

                  <div className="border border-t-0 border-slate-200 rounded-b-xl p-5 bg-white min-h-[300px]">
                    {modalTab === 'servicos' && (
                      <div className="space-y-5">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-2">
                            <ChevronDown className="w-3 h-3 text-slate-400" /> Serviços
                          </p>
                          {form.servicos.map((s: any, idx: number) => (
                            <div key={idx} className="grid grid-cols-[1fr_2fr_auto] gap-3 items-end mb-3">
                              <FormField label="Equipamentos">
                                <div className="relative">
                                  <select
                                    value={s.equipamento}
                                    onChange={e => updateServico(idx, 'equipamento', e.target.value)}
                                    className="w-full border border-slate-300 rounded px-2 py-2 text-xs outline-none focus:border-blue-400 appearance-none text-red-600"
                                  >
                                    <option value="">Equipamentos</option>
                                    {equipamentosFiltrados.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                                    {equipamentosFiltrados.length === 0 && <option value="" disabled>Nenhuma proposta vinculada</option>}
                                  </select>
                                  <ChevronDown className="absolute right-2 top-2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                </div>
                              </FormField>
                              <FormField label="Descrição do Serviço">
                                <input
                                  type="text"
                                  value={s.descricao}
                                  onChange={e => updateServico(idx, 'descricao', e.target.value)}
                                  placeholder="Discriminação"
                                  className="w-full border border-slate-300 rounded px-2 py-2 text-xs outline-none focus:border-blue-400 text-red-600 placeholder-red-300"
                                />
                              </FormField>
                              <button
                                onClick={() => removeServico(idx)}
                                className="p-2 text-red-400 hover:text-red-600 transition-colors mb-0.5"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={addServico}
                            className="text-blue-600 text-xs font-bold hover:underline flex items-center gap-1 mt-1"
                          >
                            <Plus className="w-3 h-3" /> Adicionar Serviço
                          </button>
                        </div>

                        {/* ── Observações da OS ── */}
                        <div className="pt-2">
                          <FormField label="Observações">
                            <textarea
                              value={form.observacoes}
                              onChange={e => setForm((f: any) => ({ ...f, observacoes: e.target.value }))}
                              rows={3}
                              placeholder="Observações..."
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-400 resize-none bg-slate-50"
                            />
                          </FormField>
                        </div>

                        {/* ── Efetuar Baixa ── */}
                        <div className="pt-4 mt-2 border-t border-slate-200">
                          <p className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-2">
                            Efetuar Baixa
                          </p>
                          <div className="grid grid-cols-6 gap-3 items-end">
                            <FormField label="Mínimo de Horas">
                              <div className="relative">
                                <input
                                  type="number"
                                  min={0}
                                  value={form.minimoHoras}
                                  onChange={e => setForm((f: any) => ({ ...f, minimoHoras: e.target.value }))}
                                  className="w-full border border-slate-300 rounded px-2 py-2 text-xs outline-none"
                                />
                                <Clock className="absolute right-2 top-2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                              </div>
                            </FormField>
                            <FormField label="Entrada">
                              <div className="relative">
                                <input
                                  type="time"
                                  value={form.entrada ? new Date(form.entrada).toTimeString().slice(0, 5) : ''}
                                  onChange={e => {
                                    const time = e.target.value;
                                    if (time) {
                                      const d = new Date(form.dataInicial);
                                      const [h, m] = time.split(':');
                                      d.setHours(Number(h), Number(m));
                                      setForm((f: any) => ({ ...f, entrada: d.toISOString() }));
                                    } else {
                                      setForm((f: any) => ({ ...f, entrada: '' }));
                                    }
                                  }}
                                  className="w-full border border-slate-300 rounded px-2 py-2 text-xs outline-none"
                                />
                                <Clock className="absolute right-2 top-2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                              </div>
                            </FormField>
                            <FormField label="Saída">
                              <div className="relative">
                                <input
                                  type="time"
                                  value={form.saida ? new Date(form.saida).toTimeString().slice(0, 5) : ''}
                                  onChange={e => {
                                    const time = e.target.value;
                                    if (time) {
                                      const d = new Date(form.dataInicial);
                                      const [h, m] = time.split(':');
                                      d.setHours(Number(h), Number(m));
                                      setForm((f: any) => ({ ...f, saida: d.toISOString() }));
                                    } else {
                                      setForm((f: any) => ({ ...f, saida: '' }));
                                    }
                                  }}
                                  className="w-full border border-slate-300 rounded px-2 py-2 text-xs outline-none"
                                />
                                <Clock className="absolute right-2 top-2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                              </div>
                            </FormField>
                            <FormField label="Almoço">
                              <div className="relative">
                                <input
                                  type="time"
                                  value={form.almoco ? new Date(form.almoco).toTimeString().slice(0, 5) : ''}
                                  onChange={e => {
                                    const time = e.target.value;
                                    if (time) {
                                      const d = new Date(form.dataInicial);
                                      const [h, m] = time.split(':');
                                      d.setHours(Number(h), Number(m));
                                      setForm((f: any) => ({ ...f, almoco: d.toISOString() }));
                                    } else {
                                      setForm((f: any) => ({ ...f, almoco: '' }));
                                    }
                                  }}
                                  className="w-full border border-slate-300 rounded px-2 py-2 text-xs outline-none"
                                />
                                <Clock className="absolute right-2 top-2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                              </div>
                            </FormField>
                            <FormField label="Horas Totais">
                              <input
                                readOnly
                                value={horas.total}
                                className="w-full border border-slate-200 rounded px-2 py-2 text-xs bg-slate-100 font-bold text-center text-slate-600"
                              />
                            </FormField>
                            <FormField label="Hora Adicional">
                              <input
                                readOnly
                                value={horas.adicional}
                                className="w-full border border-slate-200 rounded px-2 py-2 text-xs bg-slate-100 font-bold text-center text-slate-600"
                              />
                            </FormField>
                          </div>
                          <div className="mt-3 flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Descontar Almoço?</span>
                            <button
                              type="button"
                              onClick={() => setForm((f: any) => ({ ...f, descontarAlmoco: !f.descontarAlmoco }))}
                              className={`relative w-9 h-5 rounded-full transition-colors ${form.descontarAlmoco ? 'bg-blue-500' : 'bg-slate-300'}`}
                            >
                              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.descontarAlmoco ? 'left-4' : 'left-0.5'}`} />
                            </button>
                          </div>
                        </div>

                        {/* ── Materiais Utilizados (Baixa de Estoque) ── */}
                        {selectedOS && (
                          <div className="pt-4 mt-2 border-t border-slate-200">
                            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                              <Package className="w-3.5 h-3.5 text-amber-600" />
                              Materiais Utilizados (Baixa de Estoque)
                            </p>
                            {materiaisUtilizados.map((m: any, idx: number) => {
                              const prod = (produtos || []).find((p: any) => p.id === m.produtoId);
                              return (
                                <div key={idx} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2 mb-2 items-end">
                                  <FormField label={idx === 0 ? 'Produto' : ''}>
                                    <select
                                      value={m.produtoId}
                                      onChange={e => updateMaterial(idx, 'produtoId', e.target.value)}
                                      className="w-full border border-slate-300 rounded px-2 py-2 text-xs outline-none focus:border-amber-400"
                                    >
                                      <option value="">Selecione...</option>
                                      {(produtos || []).map((p: any) => (
                                        <option key={p.id} value={p.id}>{p.nome} (Estoque: {p.estoqueAtual} {p.unidadeMedida})</option>
                                      ))}
                                    </select>
                                  </FormField>
                                  <FormField label={idx === 0 ? 'Quantidade' : ''}>
                                    <input
                                      type="number"
                                      min={0.01}
                                      step={0.01}
                                      value={m.quantidade}
                                      onChange={e => updateMaterial(idx, 'quantidade', Number(e.target.value))}
                                      className="w-full border border-slate-300 rounded px-2 py-2 text-xs outline-none focus:border-amber-400"
                                    />
                                  </FormField>
                                  <FormField label={idx === 0 ? 'Unidade' : ''}>
                                    <input
                                      readOnly
                                      value={prod?.unidadeMedida || 'UN'}
                                      className="w-full border border-slate-200 rounded px-2 py-2 text-xs bg-slate-100"
                                    />
                                  </FormField>
                                  <button onClick={() => removeMaterial(idx)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              );
                            })}
                            <button
                              type="button"
                              onClick={addMaterial}
                              className="text-[11px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 mt-1"
                            >
                              <Plus className="w-3.5 h-3.5" /> Adicionar Material
                            </button>
                            {materiaisUtilizados.length > 0 && (
                              <p className="text-[10px] text-slate-400 mt-2 italic">⚠️ Os materiais serão descontados do estoque ao baixar a OS.</p>
                            )}
                          </div>
                        )}

                      </div>
                    )}

                    {modalTab === 'escala' && (
                      <div className="space-y-4">
                        {/* ── Equipamento (igual sistema antigo) ── */}
                        <div>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                            <ChevronDown className="w-3 h-3 text-slate-400" /> Escala
                          </p>
                          <FormField label="Equipamento">
                            <div className="flex items-center gap-2">
                              <select
                                value={form.equipamentoEscala || ''}
                                onChange={e => setForm((f: any) => ({ ...f, equipamentoEscala: e.target.value }))}
                                className="flex-1 border border-slate-300 rounded px-2 py-2 text-xs outline-none focus:border-blue-400 appearance-none"
                              >
                                <option value="">Selecione...</option>
                                {equipamentosFiltrados.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                                {EQUIPAMENTOS.filter(e => !equipamentosFiltrados.includes(e)).map(eq => <option key={eq} value={eq}>{eq}</option>)}
                              </select>
                              {form.equipamentoEscala && (
                                <button type="button" onClick={() => setForm((f: any) => ({ ...f, equipamentoEscala: '' }))} className="p-1 text-slate-400 hover:text-red-500 bg-slate-100 rounded">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none -ml-9" />
                            </div>
                          </FormField>
                        </div>

                        {/* ── FIX 5: Equipe Sugerida (from Proposta) ── */}
                        {equipeSugerida.length > 0 && (
                          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-blue-600" />
                              <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">
                                Equipe Sugerida (da Proposta)
                              </span>
                              <span className="ml-auto text-[10px] font-bold text-blue-500 bg-blue-100 rounded-full px-2 py-0.5">
                                {equipeSugerida.reduce((sum: number, e: any) => sum + (e.quantidade || 1), 0)} pessoa(s)
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {equipeSugerida.map((e: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between bg-white border border-blue-100 rounded-lg px-3 py-2">
                                  <div>
                                    <span className="text-xs font-bold text-slate-700">{e.cargo}</span>
                                    {e.equipamento && (
                                      <span className="ml-1.5 text-[10px] text-slate-400">({e.equipamento})</span>
                                    )}
                                  </div>
                                  <span className="text-xs font-black text-blue-600 bg-blue-50 rounded-full px-2 py-0.5">
                                    ×{e.quantidade}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <p className="text-[9px] text-blue-500 italic">
                              Selecione funcionários abaixo de acordo com os cargos sugeridos.
                            </p>
                          </div>
                        )}

                        {/* ── Veículos (igual sistema antigo) ── */}
                        <div className="pt-2">
                          <p className="text-xs font-bold text-slate-500 mb-1">Veículos</p>
                          <div className="space-y-1">
                            <button type="button" onClick={() => setQuadroVeicOpen(true)} className="text-blue-600 text-[11px] font-bold hover:underline mb-1">
                              Ver Quadro de Veículos
                            </button>
                            <br />
                            <button type="button" onClick={() => setForm((f: any) => ({ ...f, veiculosEscala: [...(f.veiculosEscala || []), { veiculoId: '', manutencao: false }] }))} className="text-blue-600 text-[11px] hover:underline">
                              Adicionar veículo
                            </button>
                          </div>
                        </div>

                        {/* Veículos adicionados */}
                        {(form.veiculosEscala || []).length > 0 && (
                          <div className="space-y-2 mt-2">
                            {(form.veiculosEscala || []).map((v: any, idx: number) => (
                              <div key={idx} className="grid grid-cols-[2fr_1fr_auto] gap-2 items-end">
                                <FormField label={idx === 0 ? 'Placa / Veículo' : ''}>
                                  <select
                                    value={v.veiculoId || ''}
                                    onChange={e => setForm((f: any) => {
                                      const arr = [...(f.veiculosEscala || [])];
                                      const selectedV = veiculos.find(vv => vv.id === e.target.value);
                                      arr[idx] = { 
                                        ...arr[idx], 
                                        veiculoId: e.target.value,
                                        manutencao: selectedV?.status === 'MANUTENCAO' || selectedV?.emManutencao === true
                                      };
                                      return { ...f, veiculosEscala: arr };
                                    })}
                                    className="w-full border border-slate-300 rounded px-2 py-2 text-xs outline-none focus:border-blue-400"
                                  >
                                    <option value="">Selecione...</option>
                                    {veiculos.map((vc: any) => (
                                      <option key={vc.id} value={vc.id}>
                                        {vc.placa} — {vc.modelo} {vc.status === 'MANUTENCAO' ? '🔧' : ''}
                                      </option>
                                    ))}
                                  </select>
                                </FormField>
                                <FormField label={idx === 0 ? 'Manutenção' : ''}>
                                  <select
                                    value={String(v.manutencao || false)}
                                    onChange={e => setForm((f: any) => {
                                      const arr = [...(f.veiculosEscala || [])];
                                      arr[idx] = { ...arr[idx], manutencao: e.target.value === 'true' };
                                      return { ...f, veiculosEscala: arr };
                                    })}
                                    className={`w-full border rounded px-2 py-2 text-xs outline-none focus:border-blue-400 font-bold ${v.manutencao ? 'border-red-400 bg-red-50 text-red-700' : 'border-emerald-300 bg-emerald-50 text-emerald-700'}`}
                                  >
                                    <option value="false">Não</option>
                                    <option value="true">Sim</option>
                                  </select>
                                </FormField>
                                <button
                                  onClick={() => setForm((f: any) => ({ ...f, veiculosEscala: f.veiculosEscala.filter((_: any, i: number) => i !== idx) }))}
                                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* ── Funcionários (igual sistema antigo) ── */}
                        <div className="pt-2">
                          <p className="text-xs font-bold text-slate-500 mb-1">Funcionários</p>
                          <div className="space-y-1">
                            <button type="button" onClick={() => setQuadroFuncOpen(true)} className="text-blue-600 text-[11px] font-bold hover:underline mb-1">
                              Ver Quadro de Funcionários
                            </button>
                            <br />
                            <button type="button" onClick={addFuncionarioRow} className="text-blue-600 text-[11px] hover:underline">
                              Adicionar funcionário
                            </button>
                          </div>
                        </div>

                        {Array.isArray(form.escala) && form.escala.length > 0 ? (
                          <table className="w-full text-xs border border-slate-200 rounded-xl overflow-hidden mt-2">
                            <thead className="bg-slate-100">
                              <tr>
                                <th className="px-3 py-2 text-left text-[9px] font-black text-slate-500 uppercase w-[40%]">Funcionário</th>
                                <th className="px-3 py-2 text-left text-[9px] font-black text-slate-500 uppercase w-[30%]">Status Operacional</th>
                                <th className="px-3 py-2 text-center text-[9px] font-black text-slate-500 uppercase w-[15%]">Não Compareceu</th>
                                <th className="px-3 py-2 text-center text-[9px] font-black text-slate-500 uppercase w-[15%]">Ação</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {form.escala.map((f: any, idx: number) => {
                                const nome = typeof f === 'object' ? f.nome : f;
                                const status = typeof f === 'object' ? (f.statusOperacional || 'NORMAL') : 'NORMAL';
                                const ausente = typeof f === 'object' ? !!f.ausente : false;
                                return (
                                  <tr key={idx} className={`hover:bg-blue-50/30 ${ausente ? 'bg-red-50/50' : ''}`}>
                                    <td className="px-3 py-2">
                                      <select
                                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:border-blue-500 appearance-none"
                                        value={nome}
                                        onChange={(e) => updateFuncionarioField(idx, 'nome', e.target.value)}
                                      >
                                        <option value="">Selecione...</option>
                                        {(disponibilidades || []).map(ta => (
                                          <option key={ta.id} value={ta.nome}>{ta.nome} — {ta.cargo || 'Funcionário'}</option>
                                        ))}
                                      </select>
                                    </td>
                                    <td className="px-3 py-2">
                                      <select
                                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:border-blue-500 appearance-none"
                                        value={status}
                                        onChange={(e) => updateFuncionarioField(idx, 'statusOperacional', e.target.value)}
                                      >
                                        {STATUS_OPERACIONAL.map(s => (
                                          <option key={s.value} value={s.value}>{s.label}</option>
                                        ))}
                                      </select>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <input
                                        type="checkbox"
                                        checked={ausente}
                                        onChange={(e) => updateFuncionarioField(idx, 'ausente', e.target.checked)}
                                        className="w-4 h-4 accent-red-600 cursor-pointer"
                                      />
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <button type="button" onClick={() => removeFuncionario(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors">
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        ) : (
                          <div className="col-span-full py-8 text-center text-slate-400 text-xs italic border border-dashed border-slate-200 rounded-xl bg-slate-50 mt-2">
                            Nenhum funcionário adicionado. Clique em "+ Adicionar".
                          </div>
                        )}

                        {/* ── Observações da Escala ── */}
                        <div className="pt-4 mt-2">
                          <FormField label="Observações">
                            <textarea
                              value={form.observacoesEscala || ''}
                              onChange={e => setForm((f: any) => ({ ...f, observacoesEscala: e.target.value }))}
                              rows={3}
                              placeholder="Observações..."
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-400 resize-none bg-slate-50"
                            />
                          </FormField>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Modal Footer */}

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                <button
                  onClick={() => setShowModal(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 font-bold px-4 py-2 rounded-lg border border-slate-200 hover:bg-white transition-colors"
                >
                  Fechar
                </button>

                {selectedOS && selectedOS.status !== 'CANCELADA' && selectedOS.status !== 'FINALIZADA' && (
                  <>
                    <button
                      onClick={() => setShowCancelModal(true)}
                      disabled={saving}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 text-xs font-bold px-5 py-2 rounded-lg transition-colors disabled:opacity-60"
                    >
                      Cancelar OS
                    </button>
                    {(selectedOS.status === 'CONCLUIDA' || selectedOS.status === 'BAIXADA') && (
                      <button
                        onClick={() => handleUpdateStatus(selectedOS.id, 'FINALIZADA')}
                        disabled={saving}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60"
                      >
                        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Finalizar OS
                      </button>
                    )}
                  </>
                )}

                {/* Gap Analysis 2.6: Reverter Cancelamento */}
                {selectedOS && selectedOS.status === 'CANCELADA' && (
                  <button
                    onClick={() => handleReverterCancelamento(selectedOS.id)}
                    disabled={saving}
                    className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-5 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60"
                  >
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reverter Cancelamento
                  </button>
                )}

                <button
                  onClick={() => handleSave('BAIXAR_ESTOQUE')}
                  disabled={saving}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-5 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <Package className="w-3.5 h-3.5" />
                  Baixar c/ Estoque
                </button>
                <button
                  onClick={() => handleSave('BAIXAR')}
                  disabled={saving}
                  className="bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold px-5 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Baixar Ordem
                </button>
                <button
                  onClick={() => handleSave(selectedOS ? 'SALVAR' : 'ABRIR')}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {selectedOS ? 'Salvar Edição' : 'Abrir Ordem'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <ImprimirOS os={printOs} />

      {/* Cancel Justification Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70] p-4 text-left">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-100">
              <h3 className="text-slate-800 font-bold flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-900" /> Justificativa de Cancelamento
              </h3>
              <button onClick={() => setShowCancelModal(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-xs text-slate-500 mb-4">
                Por favor, informe obrigatoriamente o motivo do cancelamento da Ordem de Serviço <strong>{selectedOS?.codigo}</strong>.
              </p>
              <textarea
                value={cancelJustification}
                onChange={e => setCancelJustification(e.target.value)}
                rows={4}
                placeholder="Motivo do cancelamento..."
                className="w-full border border-slate-200 rounded-lg p-3 text-sm outline-none focus:border-blue-400 resize-none shadow-inner"
              />
            </div>
            <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                Voltar
              </button>
              <button
                disabled={!cancelJustification.trim() || saving}
                onClick={() => handleUpdateStatus(selectedOS.id, 'CANCELADA', cancelJustification)}
                className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Baixa em Lote Modal */}
      <ModalBaixaLoteOS
        isOpen={baixaLoteOpen}
        onClose={() => setBaixaLoteOpen(false)}
        onConfirm={handleBaixaLote}
        osCount={selectedIds.length}
      />

      {/* Quadro Funcionarios Modal (for Escala tab in OS creation) */}
      <ModalQuadroFuncionarios
        isOpen={quadroFuncOpen}
        onClose={() => setQuadroFuncOpen(false)}
        onConfirm={handleQuadroFuncConfirm}
        data={form.dataInicial || new Date().toISOString().split('T')[0]}
        clienteId={form.clienteId}
        selectedIds={form.escala || []}
      />

      {/* Quadro Veiculos Modal (for Escala tab in OS creation) */}
      <ModalQuadroVeiculos
        isOpen={quadroVeicOpen}
        onClose={() => setQuadroVeicOpen(false)}
        onConfirm={(selected) => {
          const veicIds = selected.map((v: any) => ({ veiculoId: v.id, manutencao: v.status === 'MANUTENCAO' }));
          setForm((prev: any) => ({ ...prev, veiculosEscala: veicIds }));
        }}
        data={form.dataInicial || new Date().toISOString().split('T')[0]}
        selectedIds={(form.veiculosEscala || []).map((v: any) => v.veiculoId)}
      />
    </>
  );
}

// ── Shared helpers ──────────────────────────────────────────────────────────

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { cls: string; icon: React.ElementType; label: string }> = {
    ABERTA: { cls: 'bg-blue-50 text-blue-700 border-blue-200', icon: FolderOpen, label: 'Aberta' },
    EM_EXECUCAO: { cls: 'bg-blue-900 text-white border-blue-900', icon: PlayCircle, label: 'Em Execução' },
    CONCLUIDA: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2, label: 'Concluída' },
    FINALIZADA: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2, label: 'Finalizada' },
    CANCELADA: { cls: 'bg-slate-800 text-white border-slate-800', icon: AlertCircle, label: 'Cancelada' },
  };
  const c = config[status] || { cls: 'bg-slate-50 text-slate-600 border-slate-200', icon: AlertCircle, label: status };
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase ${c.cls}`}>
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  );
}
