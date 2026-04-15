import { useToast } from '../contexts/ToastContext';
import { useEffect, useState } from 'react';
import api from '../services/api';
import {
  Plus, Search, Filter, ChevronRight, X,
  Calendar, Loader2,
  Mail, AlertTriangle, Globe, MapPin,
  CheckCircle2, XCircle, ChevronDown, Zap, Eye, RefreshCw, FolderOpen,
  Copy, Ban
} from 'lucide-react';
import { numeroExtenso } from '../utils/numeroExtenso';



export default function Propostas() {
    const { showToast } = useToast();
  const [propostas, setPropostas] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedProposta, setSelectedProposta] = useState<any>(null);
  const [filterTipo, setFilterTipo] = useState('');
  const [filterVigente, setFilterVigente] = useState('true');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedUnidades, setExpandedUnidades] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'EQUIPAMENTOS' | 'ACESSORIOS' | 'RESPONSABILIDADES' | 'EQUIPES'>('EQUIPAMENTOS');
  const [selectedTipo, setSelectedTipo] = useState<'Em Aberto' | 'Aprovadas' | 'Reprovadas' | 'Canceladas'>('Em Aberto');
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [dispatchData, setDispatchData] = useState({
    propostaId: '',
    turnos: '1',
    qtdPessoas: '2',
    diaSaida: '',
    oQueVaiFazer: '',
    algoDiferente: '',
    descricaoAdicional: ''
  });
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Auto-fill constants based on requirements
  const DEFAULT_INTRODUCAO = "Submetemos a apreciação de V.Sas., nossa proposta, visando o atendimento de sua solicitação conforme condições técnicas e comercias abaixo descriminada, a saber:";
  const DEFAULT_CONDICAO_PAGAMENTO = `Faturamento para 20 (VINTE) dias após execução dos serviços.

Após execução, será enviado relatório de prestação de serviço e depois de aceite, emitido a Nota Fiscal Eletrônica e boleto bancário, será enviado ao email da Contratante Cadastrada.

Nota: Prazo para verificação e aceite dos serviços de no Maximo 02 (dois) dias, caso não tenhamos o aceite a nota será emitida automaticamente.

Dimensionamento em Nota Fiscal:

O total dos serviços será emitido em nota de serviço.`;



  // Contacts Sync State
  const [showContactModal, setShowContactModal] = useState(false);
  const [newContact, setNewContact] = useState({ nome: '', email: '', telefone: '' });

  const handleSaveContact = async () => {
    if(!newContact.nome) return showToast('Nome do contato é obrigatório!');
    const cliente = clientes.find((c: any) => c.id === formData.clienteId);
    if(!cliente) return;
    try {
      const existing = typeof cliente.contatos === 'string' ? JSON.parse(cliente.contatos) : (cliente.contatos || []);
      const updated = [...existing, { id: Math.random().toString(36).substring(2,9), ...newContact }];
      await api.put(`/clientes/${cliente.id}`, { contatos: updated });
      setClientes(clientes.map((c: any) => c.id === cliente.id ? { ...c, contatos: updated } : c));
      let currentEmails = formData.cc || '';
      if(newContact.email && !currentEmails.includes(newContact.email)) {
        currentEmails = currentEmails ? currentEmails + ';' + newContact.email : newContact.email;
      }
      setFormData({ ...formData, contato: newContact.nome, cc: currentEmails });
      setShowContactModal(false);
      setNewContact({ nome: '', email: '', telefone: '' });
    } catch(e) {
      console.error(e);
      showToast('Erro ao sincronizar contato no cliente.');
    }
  };

  // Form State
  const [formData, setFormData] = useState<any>({
    tipo: 'INDIVIDUAL',
    itens: [],
    acessorios: [],
    responsabilidades: [],
    equipe: [],
    status: 'RASCUNHO',
    valorTotal: 0,
    unidadesData: [],
    introducao: '',
    condicoesPagamento: '',
    descricaoGarantia: ''
  });

  const [equipamentosOptions, setEquipamentosOptions] = useState<any[]>([]);
  const [funcionariosOptions, setFuncionariosOptions] = useState<any[]>([]);
  const [vendedoresOptions, setVendedoresOptions] = useState<any[]>([]);
  const [acessoriosOptions, setAcessoriosOptions] = useState<any[]>([]);
  const [cargosData, setCargosData] = useState<any[]>([]);

  const fetchData = async (page = currentPage) => {
    try {
      setLoading(true);
      const params: any = { 
        search: searchTerm,
        page,
        limit: 20
      };
      if (filterTipo) params.tipo = filterTipo;
      if (filterVigente) params.vigente = filterVigente;

      // Chama as APIs independentemente para não quebrar a tela inteira se uma falhar
      try {
        const propsRes = await api.get(`/propostas`, { params });
        // New structure: { data, total, page, totalPages }
        setPropostas(propsRes.data.data || propsRes.data || []);
        setTotalPages(propsRes.data.totalPages || 1);
        setTotalItems(propsRes.data.total || 0);
      } catch (e: any) { 
        console.error('Failed to fetch propostas', e); 
        showToast('Erro ao carregar propostas: ' + (e.response?.data?.details || e.response?.data?.error || e.message));
      }

      try {
        const clientsRes = await api.get(`/clientes`);
        setClientes(clientsRes.data);
      } catch (e) { console.error('Failed to fetch clientes', e); }

      try {
        const equipRes = await api.get(`/equipamentos`);
        setEquipamentosOptions(equipRes.data);
      } catch (e) { console.error('Failed to fetch equipamentos', e); }

      try {
        const funcRes = await api.get(`/rh`);
        setFuncionariosOptions(funcRes.data.data || funcRes.data || []);
      } catch (e) { console.error('Failed to fetch funcionarios', e); }

      try {
        const vendRes = await api.get(`/equipe/members`);
        setVendedoresOptions(vendRes.data || []);
      } catch (e) { console.error('Failed to fetch vendedores', e); }

      try {
        const acessRes = await api.get(`/acessorios`);
        setAcessoriosOptions(acessRes.data || []);
      } catch (e) { console.error('Failed to fetch acessorios', e); }

      try {
        const cargosRes = await api.get(`/cargos`);
        setCargosData(cargosRes.data || []);
      } catch (e) { console.error('Failed to fetch cargosData', e); }

    } catch (err) {
      console.error('Failed to execute fetch routines', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchData(1);
  }, [searchTerm, filterTipo, filterVigente]);

  useEffect(() => {
    fetchData(currentPage);
  }, [currentPage]);

  const handleCreateNew = () => {
    setSelectedProposta({ novo: true });
    setFormData({
      codigo: `PROP-${new Date().getFullYear()}-000`,
      tipo: 'INDIVIDUAL',
      dataProposta: new Date().toISOString().split('T')[0],
      dataValidade: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'RASCUNHO',
      itens: [],
      acessorios: [],
      responsabilidades: [],
      equipe: [],
      valorTotal: 0,
      unidadesData: [],
      introducao: DEFAULT_INTRODUCAO,
      condicoesPagamento: DEFAULT_CONDICAO_PAGAMENTO,
      descricaoGarantia: '',
      cTe: 'Não',
      pagamentoAntecipado: 'Não',
      pRL: '90',
      tipoProposta: 'COMERCIAL',
      escopoTecnico: '',
      dimensionamentoEquipe: '',
      qtdEquipamentos: '',
      diasTrabalho: ''
    });
    setIsEditing(true);
  };

  const addItem = () => {
    setFormData({
      ...formData,
      itens: [...formData.itens, { equipamento: '', quantidade: 1, valorAcobrar: 0, horaAdicional: null, valorTotal: 0 }]
    });
  };

  const removeItem = (index: number) => {
    const newItems = [...formData.itens];
    newItems.splice(index, 1);
    setFormData({ ...formData, itens: newItems });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.itens];
    newItems[index] = { ...newItems[index], [field]: value };

    if (['quantidade', 'valorAcobrar', 'usoPrevisto', 'mobilizacao'].includes(field)) {
      const q = field === 'quantidade' ? (parseFloat(value) || 0) : (parseFloat(newItems[index].quantidade) || 0);
      const v = field === 'valorAcobrar' ? (parseFloat(value) || 0) : (parseFloat(newItems[index].valorAcobrar) || 0);
      const uso = field === 'usoPrevisto' ? (parseFloat(value) || 1) : (parseFloat(newItems[index].usoPrevisto) || 1);
      const mob = field === 'mobilizacao' ? (parseFloat(value) || 0) : (parseFloat(newItems[index].mobilizacao) || 0);
      newItems[index].valorTotal = (q * v * uso) + mob;
    }

    let newFormData = { ...formData, itens: newItems };

    if (field === 'equipamento') {
      const selectedEquip = equipamentosOptions.find(e => e.nome === value);
      if (selectedEquip && selectedEquip.responsabilidades && selectedEquip.responsabilidades.length > 0) {
        const existingResps = newFormData.responsabilidades || [];
        const newResps = selectedEquip.responsabilidades.map((r: any) => {
          // DB stores as { descricao, responsavel } where responsavel = 'CONTRATANTE (CLIENTE)' or 'CONTRATADA (HIDRO)'
          const rawTipo = r.responsavel || r.tipo || 'CONTRATADA';
          // Normalize to our form's tipo convention
          let tipo = 'CONTRATADA';
          if (rawTipo.toUpperCase().includes('CONTRATANTE')) {
            tipo = 'CONTRATANTE';
          } else if (rawTipo.toUpperCase().includes('CONTRATADA') || rawTipo.toUpperCase().includes('HIDRO')) {
            tipo = 'CONTRATADA';
          }
          return {
            tipo,
            descricao: r.responsabilidade || r.descricao || ''
          };
        });
        // Avoid duplicates by checking exact description
        const filteredNewResps = newResps.filter((nr: any) => !existingResps.some((er: any) => er.descricao === nr.descricao));
        newFormData.responsabilidades = [...existingResps, ...filteredNewResps];
      }
    }

    if (field === 'tipoCobranca') {
      // Logic moved to a global useEffect that reacts to formData.itens
    }

    setFormData(newFormData);
  };

  // Efeito reativo para calcular condicoes de pagamento com base nos totais, CTe e Pagamento Antecipado
  useEffect(() => {
    if (!isEditing) return;

    const valTotal = formData.itens ? formData.itens.reduce((acc: number, item: any) => acc + (parseFloat(item.valorTotal) || 0) + (parseFloat(item.mobilizacao) || 0), 0) : 0;
    const isAntecipado = formData.pagamentoAntecipado === 'Sim';
    const isCTe = formData.cTe === 'Sim';
    // Se CTe for sim, porcentagem RL irrelevante, mas mantemos o fallback p/ visualizacao
    const prlVal = parseFloat(formData.pRL) || 90;

    const vLocacao = valTotal * (prlVal / 100);
    const vServico = valTotal * ((100 - prlVal) / 100);

    const header = isAntecipado
      ? "Pagamento antecipado\n\n"
      : "Faturamento para 20 (VINTE) dias após execução dos serviços.\n\n";

    const middle = `Após execução, será enviado relatório de prestação de serviço e depois de aceite, emitido a Nota Fiscal Eletrônica e boleto bancário, será enviado ao email da Contratante Cadastrada.\n\nNota: Prazo para verificação e aceite dos serviços de no Maximo 02 (dois) dias, caso não tenhamos o aceite a nota será emitida automaticamente.\n\nDimensionamento em Nota Fiscal:\n\n`;

    const footerCTe = "O total dos serviços será emitido em CTe.";

    const footerNaoCTe = `O total dos serviços será emitido em 02 notas, sendo:\n${prlVal}% do valor, referente ao recibo de locação. (R$ ${vLocacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})\n${100 - prlVal}% do valor, referente a manuseio do equipamento, nota fiscal de serviço. (R$ ${vServico.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})\n\nOBS: Para atividades de locação de BENS MOVEIS, por força de veto Presidencial, foi retirado do campo de incidência o ISS. Conforme disposições do RISS consubstanciadas no decreto municipal 44.540/2004, A empresa não poderá emitir nota fiscal para atividades de locação de bens móveis tendo que emitir recibos para documentar a mesma.`;

    const generatedCondicoes = header + middle + (isCTe ? footerCTe : footerNaoCTe);

    setFormData((prev: any) => ({ ...prev, condicoesPagamento: generatedCondicoes }));

  }, [formData.pagamentoAntecipado, formData.cTe, formData.pRL, formData.itens, isEditing]);

  // Efeito reativo para gerar Descrição de Valores automaticamente a partir dos itens (com número por extenso)
  useEffect(() => {
    if (!isEditing) return;
    if (!formData.itens || formData.itens.length === 0) return;

    const tipoCobrancaLabel: Record<string, string> = {
      'DIARIA': 'Valor diária por',
      'HORA': 'Valor hora por',
      'FRETE': 'Valor frete por',
      'FECHADA': 'Valor fechado por',
    };

    const lines = formData.itens
      .filter((item: any) => item.equipamento)
      .map((item: any) => {
        const tipo = tipoCobrancaLabel[item.tipoCobranca] || `Valor ${item.tipoCobranca || 'diária'} por`;
        const qty = parseInt(item.quantidade) || 1;
        const valor = parseFloat(item.valorAcobrar) || 0;
        const area = item.area ? ` para área ${item.area},` : '';
        const valorFormatted = valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        const valorExtenso = numeroExtenso(valor);

        let line = `     * ${tipo} ${qty} ${item.equipamento},${area} horário comercial\nR$ ${valorFormatted}  (${valorExtenso})`;

        const mob = parseFloat(item.mobilizacao) || 0;
        if (mob > 0) {
          const mobFormatted = mob.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
          const mobExtenso = numeroExtenso(mob);
          line += `\nValor por mobilização e desmobilização ${item.equipamento}, horário comercial:\nR$ ${mobFormatted} (${mobExtenso})`;
        }

        return line;
      });

    if (lines.length > 0) {
      setFormData((prev: any) => ({ ...prev, descricaoValores: lines.join('\n\n') }));
    }
  }, [formData.itens, isEditing]);

  // Efeito reativo para gerar Descrição da Garantia automaticamente a partir dos itens e seus tipos de cobrança
  useEffect(() => {
    if (!isEditing) return;
    if (!formData.itens || formData.itens.length === 0) return;

    const partials = formData.itens.map((item: any) => {
      if (!item.tipoCobranca) return '';
      const equipName = item.equipamento || '';
      const equipText = equipName ? ` no Equipamento ${equipName},` : '';

      if (item.tipoCobranca === 'FRETE') {
        return `Para modalidade Frete,${equipText} considerar sempre a capacidade do caminhão, independente se carregamento foi menor devido a quantidade disponível a ser succionado.
Prazo de carregamento e descarte em 01 hora, o que passar, devido a liberações ou interferências na coleta, será cobrado hora adicional na importância de R$ 190,00 ( Cento e noventa reais)
Valores de FRETES orçados para atendimento em horário comercial, sendo:
Seg a sex das 8h às 17h
Atendimento fora horário comercial:
Feriados e Domingos: Considerar adicional em 50% no valor hora orçado.
Sábados e Noturno: Considerar adicional em 35% no valor hora orçado.
As Horas passam a ser consideradas na apresentação da Equipe / Equipamento na portaria do contratante e finalizará até que seja feito o fechamento e assinatura da ordem de serviço.
Não poderá ser feito qualquer tipo de abatimento de horas que não seja por indisponibilidade do equipamento.
Horas à Disposição – Considerar 100% do valor hora / trabalhados ou a disposição.
Consideramos como hora a disposição tempo para alimentação da equipe, abertura e fechamento dos equipamentos, liberação dos serviços, integração da equipe,
comissionamento dos equipamentos, protocolo COVID, abastecimento dos equipamentos dentro ou fora da contratante, liberação de crachás, greve ou qualquer outra ocasião que fuja a nossa responsabilidade.`;
      } else if (item.tipoCobranca === 'HORA') {
        return `Para modalidade Hora,${equipText} considerar Faturamento mínimo de 10 horas por chamado, sendo 10h por diária, trabalhadas ou a disposição.
Valores de horas orçados para atendimento em horário comercial, sendo:
Seg a sex das 8h às 17h
Atendimento fora do horário comercial:
Feriados e Domingos: Considerar adicional em 50% no valor hora orçado.
Sábado e Noturno: Considerar adicional em 35% no valor hora orçado.
As horas passam a ser consideradas na apresentação da Equipe/Equipamento na portaria do contratante e finalizará até que seja feito o fechamento e assinatura da ordem de serviço.
Não poderá ser feito qualquer tipo de abatimento de horas que não seja por indisponibilidade do equipamento.
Horas à Disposição – Considerar 100% do valor hora / trabalhados ou a disposição.
Consideramos como hora a disposição tempo para alimentação da equipe, abertura e fechamento dos equipamentos, liberação dos serviços, integração da equipe,
comissionamento dos equipamentos, protocolo COVID, abastecimento dos equipamentos dentro ou fora da contratante, liberação de crachás, greve ou qualquer outra ocasião que fuja a nossa responsabilidade.`;
      } else if (item.tipoCobranca === 'DIARIA') {
        return `Para modalidade Diária,${equipText} considerar Faturamento mínimo de 01 diária por chamado.
Valores de diárias orçados para atendimento em horário comercial, sendo:
Seg a sex das 8h às 17h
Atendimento fora do horário comercial:
Feriados e Domingos: Considerar adicional em 50% no valor da diária orçada.
Sábado e Noturno: Considerar adicional em 35% no valor da diária orçada.
As diárias passam a ser consideradas na apresentação da Equipe/Equipamento na portaria do contratante e finalizará até que seja feito o fechamento e assinatura da ordem de serviço.
Não poderá ser feito qualquer tipo de abatimento de diárias que não seja por indisponibilidade do equipamento.
Diárias à Disposição – Considerar 100% do valor diária / trabalhados ou a disposição.
Consideramos como hora a disposição tempo para alimentação da equipe, abertura e fechamento dos equipamentos, liberação dos serviços, integração da equipe,
comissionamento dos equipamentos, protocolo COVID, abastecimento dos equipamentos dentro ou fora da contratante, liberação de crachás, greve ou qualquer outra ocasião que fuja a nossa responsabilidade.`;
      } else if (item.tipoCobranca === 'FECHADA') {
        return `Para modalidade Fechada,${equipText} o valor total já contempla toda a operação descrita no escopo de trabalho.
O serviço será executado integralmente conforme descrito na proposta, sem cobranças adicionais, exceto em casos de:
- Alteração do escopo de trabalho solicitada pelo contratante;
- Paralisações por motivos alheios à contratada;
- Necessidade de retorno por falta de liberação do local.
Valores orçados para atendimento em horário comercial, sendo:
Seg a sex das 8h às 17h
Atendimento fora do horário comercial:
Feriados e Domingos: Considerar adicional em 50% no valor orçado.
Sábado e Noturno: Considerar adicional em 35% no valor orçado.`;
      }
      return '';
    }).filter(Boolean);

    // Join multiple guarantees with double breaklines if multiple items exist, removing perfect duplicates if exact same equip/tipo
    const uniquePartials = Array.from(new Set(partials));

    if (uniquePartials.length > 0) {
      setFormData((prev: any) => ({ ...prev, descricaoGarantia: uniquePartials.join('\n\n') }));
    }
  }, [formData.itens, isEditing]);

  // ─── Unidades (Global) ────────────────────────────────────
  const addUnidade = () => {
    setFormData({
      ...formData,
      unidadesData: [...formData.unidadesData, { unidadeNome: '', unidadeCNPJ: '', unidadeEndereco: '', unidadeContato: '' }]
    });
  };

  const removeUnidade = (index: number) => {
    const newU = [...formData.unidadesData];
    newU.splice(index, 1);
    setFormData({ ...formData, unidadesData: newU });
  };

  const updateUnidade = (index: number, field: string, value: string) => {
    const newU = [...formData.unidadesData];
    newU[index] = { ...newU[index], [field]: value };
    setFormData({ ...formData, unidadesData: newU });
  };

  const handleEdit = async (prop: any) => {
    try {
      setLoading(true);
      const res = await api.get(`/propostas/${prop.id}`);

      const p = res.data;
      setSelectedProposta(p);
      setFormData({
        ...p,
        dataProposta: new Date(p.dataProposta).toISOString().split('T')[0],
        dataValidade: new Date(p.dataValidade).toISOString().split('T')[0],
        tipoProposta: p.tipoProposta || 'COMERCIAL',
        escopoTecnico: p.escopoTecnico || '',
        dimensionamentoEquipe: p.dimensionamentoEquipe || '',
        qtdEquipamentos: p.qtdEquipamentos || '',
        diasTrabalho: p.diasTrabalho || '',
        // New RDO Billing Fields
        franquiaHoras: p.franquiaHoras || 8.0,
        adicionalHoraExtra: p.adicionalHoraExtra || 35.0,
        adicionalNoturno: p.adicionalNoturno || 35.0,
        adicionalFimSemana: p.adicionalFimSemana || 50.0,
        minimoHorasChamado: p.minimoHorasChamado || 0,
        itens: p.itens || [],
        acessorios: p.acessorios || [],
        responsabilidades: p.responsabilidades || [],
        equipe: p.equipe || [],
        unidadesData: p.unidades?.map((u: any) => ({
          id: u.id,
          unidadeNome: u.unidadeNome || '',
          unidadeCNPJ: u.unidadeCNPJ || '',
          unidadeEndereco: u.unidadeEndereco || '',
          unidadeContato: u.unidadeContato || '',
          valorTotal: u.valorTotal,
          ordensServico: u.ordensServico || []
        })) || []
      });
      setIsEditing(true);
    } catch (err) {
      console.error('Error fetching proposal details', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const total = formData.itens.reduce((acc: number, item: any) => acc + (parseFloat(item.valorTotal) || 0), 0);
      const dataToSave = { ...formData, valorTotal: total };

      if (selectedProposta.novo) {
        await api.post('/propostas', dataToSave);
      } else {
        await api.patch(`/propostas/${selectedProposta.id}`, dataToSave);
      }
      setIsEditing(false);
      fetchData();
    } catch (err: any) {
      console.error('Error saving proposal', err);
      showToast('Erro ao salvar proposta: ' + (err.response?.data?.error || err.response?.data?.details || err.message));
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      let payload: any = { status };

      if (status === 'CANCELADA') {
        const motivo = window.prompt('Motivo do cancelamento (obrigatório):');
        if (!motivo || motivo.trim() === '') { showToast('O motivo é obrigatório para cancelar.'); return; }
        payload.motivoCancelamento = motivo.toUpperCase();
      }

      if (status === 'RECUSADA') {
        const motivo = window.prompt('Motivo da reprovação (obrigatório):');
        if (!motivo || motivo.trim() === '') { showToast('O motivo é obrigatório para recusar.'); return; }
        payload.motivoReprovacao = motivo.toUpperCase();
      }

      await api.patch(`/propostas/${id}/status`, payload);
      fetchData();
    } catch (err) {
      console.error('Error changing status', err);
    }
  };

  const handleGerarRevisao = async (id: string) => {
    if (!window.confirm('Deseja criar uma nova revisão desta proposta? A atual deixará de ser vigente.')) return;
    try {
      await api.post(`/propostas/${id}/revisao`);
      fetchData();
    } catch (err: any) {
      console.error('Erro ao gerar revisão', err);
      showToast(err.response?.data?.error || 'Falha ao logar revisão.');
    }
  };

  const handleGerarOS = async (propostaId: string) => {
    try {
      const res = await api.post(`/propostas/${propostaId}/gerar-os`, {});
      showToast(`OS ${res.data.codigo} criada com sucesso!`);
      fetchData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Erro ao gerar OS');
    }
  };

  // ─── Acessórios CRUD ────────────────────────────
  const addAcessorio = () => {
    setFormData((prev: any) => ({
      ...prev,
      acessorios: [...(prev.acessorios || []), { acessorio: '', quantidade: 1, valor: '' }]
    }));
  };

  const updateAcessorio = (idx: number, field: string, value: any) => {
    const newAcessorios = [...(formData.acessorios || [])];
    newAcessorios[idx] = { ...newAcessorios[idx], [field]: value };
    setFormData((prev: any) => ({ ...prev, acessorios: newAcessorios }));
  };

  const removeAcessorio = (idx: number) => {
    const newAcessorios = (formData.acessorios || []).filter((_: any, i: number) => i !== idx);
    setFormData((prev: any) => ({ ...prev, acessorios: newAcessorios }));
  };

  // ─── Copiar Proposta ────────────────────────────
  const handleCopiarProposta = async (prop: any) => {
    try {
      setLoading(true);
      const res = await api.get(`/propostas/${prop.id}`);
      const p = res.data;

      // Reset selected proposal for new entry
      setSelectedProposta({ novo: true });
      
      // Deep clone all relevant fields for a pre-filled new draft
      setFormData({
        ...p,
        id: undefined,
        codigo: `PROP-${new Date().getFullYear()}-000`, // Will be sequenced on backend
        dataProposta: new Date().toISOString().split('T')[0],
        dataValidade: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'RASCUNHO',
        revisao: 0,
        
        // Ensure all arrays are deep cloned WITHOUT original IDs
        itens: (p.itens || []).map((i: any) => ({ ...i, id: undefined, propostaId: undefined })),
        acessorios: (p.acessorios || []).map((a: any) => ({ ...a, id: undefined, propostaId: undefined })),
        responsabilidades: (p.responsabilidades || []).map((r: any) => ({ ...r, id: undefined, propostaId: undefined })),
        equipe: (p.equipe || []).map((e: any) => ({ ...e, id: undefined, propostaId: undefined })),
        
        // Handle units mapping
        unidadesData: (p.unidades || []).map((u: any) => ({
          unidadeNome: u.unidadeNome || '', 
          unidadeCNPJ: u.unidadeCNPJ || '',
          unidadeEndereco: u.unidadeEndereco || '', 
          unidadeContato: u.unidadeContato || ''
        }))
      });
      
      setIsEditing(true);
      // Scroll to top of form
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Erro ao copiar proposta', err);
      showToast('Erro ao copiar proposta.');
    } finally {
      setLoading(false);
    }
  };

  const addResponsabilidade = () => {
    setFormData((prev: any) => ({
      ...prev,
      responsabilidades: [
        ...(prev.responsabilidades || []),
        { tipo: 'CONTRATADA', descricao: '' }
      ]
    }));
  };

  const updateResponsabilidade = (idx: number, field: string, value: any) => {
    const newResps = [...(formData.responsabilidades || [])];
    newResps[idx] = { ...newResps[idx], [field]: value };
    setFormData((prev: any) => ({ ...prev, responsabilidades: newResps }));
  };

  const removeResponsabilidade = (idx: number) => {
    const newResps = (formData.responsabilidades || []).filter((_: any, i: number) => i !== idx);
    setFormData((prev: any) => ({ ...prev, responsabilidades: newResps }));
  };

  const addEquipe = () => {
    setFormData((prev: any) => ({
      ...prev,
      equipe: [
        ...(prev.equipe || []),
        { nome: '', funcao: '', equipamento: '', quantidade: 1 }
      ]
    }));
  };

  const updateEquipe = (idx: number, field: string, value: any) => {
    const newEquipe = [...(formData.equipe || [])];
    newEquipe[idx] = { ...newEquipe[idx], [field]: value };
    setFormData((prev: any) => ({ ...prev, equipe: newEquipe }));
  };

  const removeEquipe = (idx: number) => {
    const newEquipe = (formData.equipe || []).filter((_: any, i: number) => i !== idx);
    setFormData((prev: any) => ({ ...prev, equipe: newEquipe }));
  };

  const toggleExpandUnidade = (propId: string) => {
    setExpandedUnidades(prev =>
      prev.includes(propId) ? prev.filter(id => id !== propId) : [...prev, propId]
    );
  };

  const handleOpenDispatch = (prop: any) => {
    setDispatchData({
      ...dispatchData,
      propostaId: prop.id,
      oQueVaiFazer: `Equipamento: ${prop.itens?.[0]?.equipamento || 'Serviço'}\nCliente: ${prop.cliente?.nome || 'Não informado'}`,
    });
    setIsDispatchModalOpen(true);
  };

  const handleConfirmDispatch = async () => {
    try {
      setLoading(true);
      const msg = `🚀 *NOVA CHAMADA DE SERVIÇO*\n\n` +
        `*ID:* ${dispatchData.propostaId}\n` +
        `*Turnos:* ${dispatchData.turnos}\n` +
        `*Pessoas:* ${dispatchData.qtdPessoas}\n` +
        `*Saída:* ${dispatchData.diaSaida}\n` +
        `*Atividade:* ${dispatchData.oQueVaiFazer}\n` +
        `*Diferencial:* ${dispatchData.algoDiferente}`;

      // Envia para o grupo operacional (exemplo - deve ser configurado no backend futuramente)
      await api.post('/whatsapp/enviar-teste', {
        telefone: '5519996587421@g.us', // JID de teste ou real do grupo NH Operacional
        mensagem: msg
      });

      showToast('Chamada de Equipe enviada com sucesso via WhatsApp!');
      setIsDispatchModalOpen(false);
    } catch (err: any) {
      showToast('Erro ao disparar WhatsApp: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };


  const handleViewPDF = async (prop: any) => {
    try {
      setLoading(true);
      const res = await api.get(`/propostas/${prop.id}/gerar-pdf`, { responseType: 'blob' });
      const pdfUrl = URL.createObjectURL(res.data);
      window.open(pdfUrl, '_blank');
    } catch (err: any) {
      console.error('Failed to view PDF', err);
      showToast('Erro ao visualizar PDF gerado pelo servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnviarEmail = async (prop: any) => {
    // Verificação de segurança: não enviar se marcado
    if (prop.naoEnviarAoCliente) {
      showToast('⚠️ Esta proposta está marcada como "Não enviar ao cliente". Desmarque a opção antes de enviar.');
      return;
    }

    const dest = prop.contatoEmail || prop.cliente?.email || 'email do cliente';
    if (!confirm(`📧 Enviar proposta ${prop.codigo} por e-mail?\n\nDestinatário: ${dest}${prop.cc ? `\nCC: ${prop.cc}` : ''}\n\nDeseja continuar?`)) return;

    try {
      setLoading(true);
      const res = await api.post(`/propostas/${prop.id}/enviar-email`, {});

      showToast(`✅ ${res.data.message || 'E-mail enviado com sucesso!'}`);
      fetchData();
    } catch (err: any) {
      console.error('Erro ao enviar e-mail:', err);
      showToast(`❌ ${err.response?.data?.error || 'Erro ao enviar e-mail da proposta.'}`);
    } finally {
      setLoading(false);
    }
  };

  // ─── Badges / Helpers ────────────────────────────────────
  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      'ACEITA': 'bg-emerald-50 text-emerald-600 border-emerald-100',
      'ENVIADA': 'bg-blue-50 text-blue-600 border-blue-100',
      'RECUSADA': 'bg-red-50 text-red-600 border-red-100',
      'CANCELADA': 'bg-rose-100 text-rose-700 border-rose-200',
      'RASCUNHO': 'bg-slate-50 text-slate-500 border-slate-200',
    };
    return map[status] || map['RASCUNHO'];
  };

  const getVigenteBadge = (prop: any) => {
    if (!prop.vigente && prop.status === 'ACEITA') {
      return (
        <span className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-400 border border-slate-200 shadow-sm opacity-70">
           <RefreshCw className="w-3 h-3" /> Substituída
        </span>
      );
    }
    if (prop.expirada) {
      return (
        <span className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-200 shadow-sm shadow-amber-500/5">
           <AlertTriangle className="w-3 h-3" /> Expirada
        </span>
      );
    }
    if (prop.vigente && prop.status === 'ACEITA') {
      return (
        <span className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-300 shadow-md shadow-emerald-500/10 animate-pulse">
           <CheckCircle2 className="w-3 h-3" /> Vigente
        </span>
      );
    }
    return null;
  };

  if (loading && !propostas.length) return (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <>
    <div className="h-full flex flex-col space-y-6">
      {!isEditing ? (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Propostas Comerciais</h1>
              <p className="text-sm text-slate-500">Gestão e acompanhamento do ciclo de vendas</p>
            </div>
            <button
              onClick={handleCreateNew}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 text-sm font-bold uppercase"
            >
              <Plus className="w-4 h-4" /> Nova Proposta
            </button>
          </div>

          {/* Legacy-style Tabs */}
          <div className="flex border-b border-slate-200">
            {['Em Aberto', 'Aprovadas', 'Reprovadas', 'Canceladas'].map(tab => (
              <button
                key={tab}
                onClick={() => setSelectedTipo(tab as any)}
                className={`py-3 px-6 font-bold text-sm border-b-2 transition-all ${
                  selectedTipo === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search + Filters */}
          <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por código ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-lg py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors border text-sm font-bold uppercase ${showFilters ? 'bg-blue-50 text-blue-600 border-blue-200' : 'text-slate-600 hover:bg-slate-50 border-slate-100'
                }`}
            >
              <Filter className="w-4 h-4" /> Filtros
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="flex items-center gap-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">Tipo</label>
                <select
                  value={filterTipo}
                  onChange={(e) => setFilterTipo(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none font-bold appearance-none"
                >
                  <option value="">Todos</option>
                  <option value="INDIVIDUAL">Individual</option>
                  <option value="GLOBAL">Global/Corporativa</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">Vigência</label>
                <select
                  value={filterVigente}
                  onChange={(e) => setFilterVigente(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none font-bold appearance-none"
                >
                  <option value="">Todos</option>
                  <option value="true">Vigentes</option>
                  <option value="false">Substituídas</option>
                </select>
              </div>
              <button
                onClick={() => { setFilterTipo(''); setFilterVigente(''); }}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold uppercase mt-4"
              >
                Limpar
              </button>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-3 font-bold text-slate-700">Ações</th>
                    <th className="px-3 py-3 font-bold text-slate-700">Código</th>
                    <th className="px-3 py-3 font-bold text-slate-700 max-w-[200px]">Cliente</th>
                    <th className="px-3 py-3 font-bold text-slate-700">Tipo</th>
                    <th className="px-3 py-3 font-bold text-slate-700">Vendedor</th>
                    <th className="px-3 py-3 font-bold text-slate-700">Data/Valid.</th>
                    <th className="px-3 py-3 font-bold text-slate-700">Total</th>
                    <th className="px-3 py-3 font-bold text-slate-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {propostas.filter(p => {
                    if (selectedTipo === 'Em Aberto') return ['RASCUNHO', 'ENVIADA', 'PENDENTE'].includes(p.status);
                    if (selectedTipo === 'Aprovadas') return p.status === 'ACEITA';
                    if (selectedTipo === 'Reprovadas') return p.status === 'RECUSADA';
                    if (selectedTipo === 'Canceladas') return p.status === 'CANCELADA';
                    return true;
                  }).map((prop) => (
                    <tr key={prop.id}>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap items-center gap-1 min-w-[120px]">
                          <button onClick={() => handleEdit(prop)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md" title="Editar"><ChevronRight className="w-4 h-4" /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleCopiarProposta(prop); }} className="p-1 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-md" title="Copiar Proposta"><Copy className="w-4 h-4" /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleViewPDF(prop); }} className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md" title="Visualizar PDF Oficial"><Eye className="w-4 h-4" /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleEnviarEmail(prop); }} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md" title="Enviar PDF por E-mail"><Mail className="w-4 h-4" /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleGerarRevisao(prop.id); }} className="p-1 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-md" title="Gerar Revisão"><RefreshCw className="w-4 h-4" /></button>
                          {prop.status === 'ACEITA' && prop.tipo === 'INDIVIDUAL' && (
                            <>
                              <button onClick={() => handleGerarOS(prop.id)} className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md" title="Gerar OS"><Zap className="w-4 h-4" /></button>
                              <button onClick={() => handleOpenDispatch(prop)} className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md" title="Disparar p/ Equipe"><Globe className="w-4 h-4" /></button>
                            </>
                          )}
                          {prop.status === 'RASCUNHO' && (
                            <button onClick={() => handleStatusChange(prop.id, 'ENVIADA')} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md" title="Marcar como Enviada">
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          {prop.status === 'ENVIADA' && (
                            <>
                              <button onClick={() => handleStatusChange(prop.id, 'ACEITA')} className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md" title="Aceitar"><CheckCircle2 className="w-4 h-4" /></button>
                              <button onClick={() => handleStatusChange(prop.id, 'RECUSADA')} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md" title="Recusar"><XCircle className="w-4 h-4" /></button>
                            </>
                          )}
                          {!['CANCELADA', 'ACEITA'].includes(prop.status) && (
                            <button onClick={() => handleStatusChange(prop.id, 'CANCELADA')} className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md" title="Cancelar Proposta"><Ban className="w-4 h-4" /></button>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 cursor-pointer" onClick={() => handleEdit(prop)}>
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-blue-600 text-xs">{prop.codigo}</span>
                          {prop.tipo === 'GLOBAL' && (
                            <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-black uppercase bg-indigo-50 text-indigo-600 border border-indigo-200">
                              <Globe className="w-3 h-3" /> Glo
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 cursor-pointer max-w-[200px]" onClick={() => handleEdit(prop)}>
                        <div className="flex flex-col truncate">
                          <span className="font-bold text-slate-800 text-xs truncate" title={prop.cliente?.nome}>{prop.cliente?.nome}</span>
                          <span className="text-[9px] text-slate-400 uppercase tracking-wider">{prop.cliente?.documento}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-1">
                          {getVigenteBadge(prop)}
                          {prop.totalUnidades > 0 && (
                            <button
                              onClick={() => toggleExpandUnidade(prop.id)}
                              className="flex items-center gap-1 text-[9px] text-indigo-500 font-bold hover:text-indigo-700"
                            >
                              <ChevronDown className={`w-3 h-3 transition-transform ${expandedUnidades.includes(prop.id) ? 'rotate-180' : ''}`} />
                              {prop.totalUnidades} unids
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-slate-600 font-medium text-xs cursor-pointer" onClick={() => handleEdit(prop)}>
                        <div className="max-w-[100px] truncate" title={prop.vendedor}>{prop.vendedor || '---'}</div>
                      </td>
                      <td className="px-3 py-3 cursor-pointer" onClick={() => handleEdit(prop)}>
                        <div className="flex flex-col gap-0.5 text-xs">
                          <div className="flex items-center gap-1 text-slate-500">
                            <Calendar className="w-3 h-3" /> {new Date(prop.dataProposta).toLocaleDateString('pt-BR')}
                          </div>
                          <div className={`flex items-center gap-1 font-bold text-[9px] ${prop.expirada ? 'text-red-500' : 'text-orange-500'}`}>
                            <AlertTriangle className="w-3 h-3" /> {new Date(prop.dataValidade).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-bold text-slate-800 text-xs cursor-pointer" onClick={() => handleEdit(prop)}>
                        R$ {parseFloat(prop.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${getStatusBadge(prop.status)}`}>
                          {prop.status}
                        </span>
                      </td>

                    </tr>
                  ))}

                  {/* Empty State */}
                  {!loading && propostas.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                        <FolderOpen className="w-12 h-12 mx-auto mb-4 text-slate-300 opacity-50" />
                        Nenhuma proposta encontrada.
                      </td>
                    </tr>
                  )}

                  {/* Expanded Unidades Rows */}
                  {propostas.filter(p => expandedUnidades.includes(p.id) && p.unidades?.length).map(prop =>
                    prop.unidades.map((u: any) => (
                      <tr key={u.id} className="bg-indigo-50/30">
                        <td className="px-6 py-3 pl-12">
                          <span className="text-xs text-indigo-500 font-bold">{u.codigo || '—'}</span>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-700">{u.unidadeNome}</span>
                              <span className="text-[10px] text-slate-400">{u.unidadeCNPJ}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-xs text-slate-500">{u.unidadeEndereco || '—'}</td>
                        <td className="px-6 py-3 text-xs text-slate-500">{u.unidadeContato || '—'}</td>
                        <td colSpan={2} className="px-6 py-3">
                          {u.ordensServico?.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {u.ordensServico.map((os: any) => (
                                <span key={os.id} className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-100 text-emerald-700">{os.codigo}</span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Sem OS</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-right">
                          {prop.status === 'ACEITA' && (
                            <button
                              onClick={() => handleGerarOS(u.id)}
                              className="px-2 py-1 text-[10px] font-black uppercase bg-emerald-500 text-white rounded hover:bg-emerald-600 transition-colors"
                            >
                              Gerar OS
                            </button>
                          )}
                        </td>
                        <td></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination UI */}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <div className="text-xs text-slate-500 font-medium tracking-tight">
                  Mostrando <span className="font-bold text-slate-800">{propostas.length}</span> de <span className="font-bold text-slate-800">{totalItems}</span> propostas
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="p-1.5 rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronDown className="w-4 h-4 rotate-90" />
                  </button>
                  
                  {[...Array(totalPages)].map((_, i) => {
                    const pageNum = i + 1;
                    if (
                      pageNum === 1 || 
                      pageNum === totalPages || 
                      (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`min-w-[32px] h-8 text-xs font-bold rounded-md border transition-all ${
                            currentPage === pageNum 
                              ? 'bg-blue-600 border-blue-600 text-white shadow-sm' 
                              : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                    if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                      return <span key={pageNum} className="px-1 text-slate-400">...</span>;
                    }
                    return null;
                  })}

                  <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="p-1.5 rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronDown className="w-4 h-4 -rotate-90" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col h-full bg-white border border-slate-300 rounded overflow-hidden">
          {/* Form Header */}
          <div className="bg-blue-50/50 border-b border-slate-200 p-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700 ml-2">Cadastro proposta</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 text-[10px] uppercase font-bold text-red-600 hover:bg-red-50 rounded transition-colors border border-transparent hover:border-red-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="bg-[#5c7a99] hover:bg-[#4a637c] text-white px-4 py-1.5 rounded text-[10px] font-bold uppercase transition-colors"
              >
                Salvar Proposta
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

            {/* ROW 1: Código, Datas, Vendedor, Situação */}
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-2 space-y-1">
                <label htmlFor="codigo" className="text-[9px] font-bold text-slate-600 uppercase">Código</label>
                <input
                  id="codigo"
                  type="text" disabled value={formData.codigo || ''}
                  className="w-full bg-slate-100 border border-slate-300 rounded px-2 py-1.5 text-xs text-slate-500 font-medium outline-none"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <label htmlFor="tipoProposta" className="text-[9px] font-bold text-slate-600 uppercase">Classificação</label>
                <select
                  id="tipoProposta"
                  value={formData.tipoProposta || 'COMERCIAL'}
                  onChange={(e) => setFormData({ ...formData, tipoProposta: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-400"
                >
                  <option value="COMERCIAL">COMERCIAL</option>
                  <option value="TECNICA">TÉCNICA</option>
                </select>
              </div>
              <div className="col-span-2 space-y-1">
                <label htmlFor="dataProposta" className="text-[9px] font-bold text-slate-600 uppercase">Data da Proposta</label>
                <input
                  id="dataProposta"
                  type="date" value={formData.dataProposta || ''}
                  onChange={(e) => setFormData({ ...formData, dataProposta: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-400"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <label htmlFor="dataValidade" className="text-[9px] font-bold text-slate-600 uppercase">Data de Validade</label>
                <input
                  id="dataValidade"
                  type="date" value={formData.dataValidade || ''}
                  onChange={(e) => setFormData({ ...formData, dataValidade: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-400"
                />
              </div>
              <div className="col-span-3 space-y-1">
                <label htmlFor="vendedor" className="text-[9px] font-bold text-slate-600 uppercase">Vendedor</label>
                <select
                  id="vendedor"
                  value={formData.vendedor || ''}
                  onChange={(e) => setFormData({ ...formData, vendedor: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-400"
                >
                  <option value="">Selecione...</option>
                  {vendedoresOptions.map((v: any) => <option key={v.id} value={v.name}>{v.name?.toUpperCase()}</option>)}
                </select>
              </div>
              <div className="col-span-3 space-y-1">
                <label htmlFor="status" className="text-[9px] font-bold text-slate-600 uppercase">Situação</label>
                <select
                  id="status"
                  value={formData.status || 'RASCUNHO'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-white border border-red-300 rounded px-2 py-1.5 text-xs text-red-600 font-medium outline-none focus:border-red-400"
                >
                  <option value="RASCUNHO">Rascunho</option>
                  <option value="ENVIADA">Enviada P/ Cliente</option>
                  <option value="ACEITA">Aceita</option>
                  <option value="RECUSADA">Recusada</option>
                  <option value="CANCELADA">Cancelada</option>
                </select>
              </div>
            </div>

            {/* ROW 2: Cliente, Contato, Email, Não enviar p/ cliente */}
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-5 space-y-1">
                <label htmlFor="clienteId" className="text-[9px] font-bold text-slate-600 uppercase">Cliente</label>
                <select
                  id="clienteId"
                  value={formData.clienteId || ''}
                  onChange={(e) => {
                    const id = e.target.value;
                    const cliente = clientes.find(c => c.id === id);
                    setFormData({
                      ...formData,
                      clienteId: id,
                      contato: cliente ? (formData.contato || cliente.telefone || '') : formData.contato,
                      cc: cliente ? (formData.cc || cliente.email || '') : formData.cc
                    });
                  }}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-400"
                >
                  <option value="">Selecione o Cliente...</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome} ({c.documento})</option>)}
                </select>
              </div>
              <div className="col-span-3 space-y-1 relative">
                <div className="flex justify-between items-center">
                  <label htmlFor="contato" className="text-[9px] font-bold text-slate-600 uppercase">Contato (A/C)</label>
                  {formData.clienteId && (
                     <button type="button" onClick={() => setShowContactModal(!showContactModal)} className="text-[9px] font-bold text-blue-600 hover:text-blue-800 transition-colors">
                       {showContactModal ? 'CANCELAR' : '+ VINCULAR NOVO'}
                     </button>
                  )}
                </div>
                {!showContactModal ? (
                  <>
                    <input
                      id="contato"
                      list="contatos-list"
                      type="text" value={formData.contato || ''}
                      onChange={(e) => setFormData({ ...formData, contato: e.target.value })}
                      placeholder=""
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-400"
                    />
                    <datalist id="contatos-list">
                      {formData.clienteId && (
                        (() => {
                          const cl = clientes.find((c: any) => c.id === formData.clienteId);
                          const arr = cl?.contatos ? (typeof cl.contatos === 'string' ? JSON.parse(cl.contatos) : cl.contatos) : [];
                          return arr.map((ct: any) => <option key={ct.id} value={ct.nome} />);
                        })()
                      )}
                    </datalist>
                    {/* Auto-fill Helper */}
                    {formData.contato && formData.clienteId && (() => {
                      const cl = clientes.find((c: any) => c.id === formData.clienteId);
                      const arr = cl?.contatos ? (typeof cl.contatos === 'string' ? JSON.parse(cl.contatos) : cl.contatos) : [];
                      const ct = arr.find((x: any) => x.nome === formData.contato);
                      if (ct && ct.email && !(formData.cc || '').includes(ct.email)) {
                        return (
                          <div className="absolute top-[85%] left-0 z-10 w-full p-2 bg-blue-50/95 backdrop-blur-sm border border-blue-200 rounded shadow-md text-[10px] animate-in fade-in">
                            <p className="text-slate-600 mb-1">Puxar e-mail: <b>{ct.email}</b>?</p>
                            <button type="button" onClick={() => setFormData({...formData, cc: formData.cc ? formData.cc + ';' + ct.email : ct.email})} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold px-2 py-1.5 rounded transition-colors duration-200">Preencher Automático</button>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </>
                ) : (
                  <div className="absolute top-[85%] left-0 z-20 w-[280px] p-4 bg-white border border-blue-200 rounded-lg shadow-xl text-xs space-y-3 animate-in fade-in">
                     <p className="font-bold text-blue-800 text-[10px] uppercase border-b border-blue-100 pb-1">Vincular Novo Contato</p>
                     <div className="space-y-2">
                       <div><label className="text-[9px] text-slate-500 uppercase font-medium">Nome *</label><input type="text" value={newContact.nome} onChange={e=>setNewContact({...newContact, nome: e.target.value})} className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 focus:border-blue-400 outline-none" autoFocus /></div>
                       <div><label className="text-[9px] text-slate-500 uppercase font-medium">E-mail</label><input type="email" value={newContact.email} onChange={e=>setNewContact({...newContact, email: e.target.value})} className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 focus:border-blue-400 outline-none" /></div>
                       <div><label className="text-[9px] text-slate-500 uppercase font-medium">Telefone</label><input type="text" value={newContact.telefone} onChange={e=>setNewContact({...newContact, telefone: e.target.value})} className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 focus:border-blue-400 outline-none" /></div>
                     </div>
                     <button type="button" onClick={handleSaveContact} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded transition-colors mt-2 uppercase tracking-wide text-[10px]">Salvar na Base de Dados</button>
                  </div>
                )}
              </div>
              <div className="col-span-3 space-y-1">
                <label className="text-[9px] font-bold text-slate-600 uppercase">E-mails do cliente (com ;)</label>
                <input
                  type="text" value={formData.cc || ''}
                  onChange={(e) => setFormData({ ...formData, cc: e.target.value })}
                  className="w-full bg-blue-50/30 border border-blue-200 rounded px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-400"
                />
              </div>
              <div className="col-span-1 flex items-end pb-1.5">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <span className="text-[9px] font-bold text-slate-600 uppercase">Não enviar p/ cliente</span>
                  <input
                    type="checkbox"
                    checked={formData.naoEnviarAoCliente || false}
                    onChange={(e) => setFormData({ ...formData, naoEnviarAoCliente: e.target.checked })}
                    className="rounded"
                  />
                </label>
              </div>
            </div>

            {/* If Global, Unidades block */}
            {formData.tipo === 'GLOBAL' && (
              <div className="border border-indigo-200 rounded p-3 bg-indigo-50/30 mt-2">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-[10px] font-bold text-indigo-700 uppercase">Unidades (Global)</h4>
                  <button onClick={addUnidade} className="text-[9px] bg-indigo-600 text-white px-2 py-1 rounded"> + Adicionar Unidade</button>
                </div>
                {formData.unidadesData?.length === 0 ? (
                  <div className="text-[10px] text-slate-500 italic">Nenhuma unidade adicionada.</div>
                ) : (
                  formData.unidadesData.map((u: any, idx: number) => (
                    <div key={idx} className="flex gap-2 mb-2 items-center">
                      <input type="text" placeholder="Nome Unidade" value={u.unidadeNome} onChange={e => updateUnidade(idx, 'unidadeNome', e.target.value)} className="flex-1 border border-slate-300 rounded px-2 py-1 text-[10px]" />
                      <input type="text" placeholder="CNPJ" value={u.unidadeCNPJ} onChange={e => updateUnidade(idx, 'unidadeCNPJ', e.target.value)} className="flex-1 border border-slate-300 rounded px-2 py-1 text-[10px]" />
                      <button onClick={() => removeUnidade(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded"><X className="w-3 h-3" /></button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ROW 3: Intro & Objective / Técnicos */}
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="space-y-1">
                <label htmlFor="introducao" className="text-[9px] font-bold text-slate-600 uppercase">Introdução</label>
                <textarea
                  id="introducao"
                  value={formData.introducao || ''}
                  onChange={(e) => setFormData({ ...formData, introducao: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-400 min-h-[50px] resize-none"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="objetivo" className="text-[9px] font-bold text-slate-600 uppercase">Objetivo / Escopo</label>
                <textarea
                  id="objetivo"
                  value={formData.objetivo || ''}
                  onChange={(e) => setFormData({ ...formData, objetivo: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-400 min-h-[50px] resize-none"
                />
              </div>
            </div>

            {/* ─── ROW: Franquia de Horas e Adicionais ─── */}
            <div className="border border-blue-200 bg-blue-50/40 rounded p-3 mt-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[9px] font-black text-blue-700 uppercase tracking-wider">⏱ Condições de Franquia e Adicionais (Alimenta o RDO automaticamente)</span>
              </div>
              <div className="grid grid-cols-5 gap-3">
                <div className="space-y-1">
                  <label htmlFor="franquiaHoras" className="text-[9px] font-bold text-slate-600 uppercase">Franquia de Horas / dia</label>
                  <div className="flex items-center gap-1">
                    <input
                      id="franquiaHoras"
                      type="number"
                      min="1"
                      max="24"
                      step="0.5"
                      value={formData.franquiaHoras || ''}
                      onChange={(e) => setFormData({ ...formData, franquiaHoras: e.target.value })}
                      placeholder="8"
                      className="w-full bg-white border border-blue-200 rounded px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-500 font-bold text-center"
                    />
                    <span className="text-[10px] text-slate-400 font-bold">h</span>
                  </div>
                  <p className="text-[9px] text-slate-400 italic">Horas incluídas sem adicional</p>
                </div>
                <div className="space-y-1">
                  <label htmlFor="adicionalHoraExtra" className="text-[9px] font-bold text-slate-600 uppercase">Adicional H. Extra (%)</label>
                  <div className="flex items-center gap-1">
                    <input
                      id="adicionalHoraExtra"
                      type="number"
                      min="0"
                      max="200"
                      step="5"
                      value={formData.adicionalHoraExtra || ''}
                      onChange={(e) => setFormData({ ...formData, adicionalHoraExtra: e.target.value })}
                      placeholder="35"
                      className="w-full bg-white border border-blue-200 rounded px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-500 font-bold text-center"
                    />
                    <span className="text-[10px] text-slate-400 font-bold">%</span>
                  </div>
                  <p className="text-[9px] text-slate-400 italic">Após franquia</p>
                </div>
                <div className="space-y-1">
                  <label htmlFor="adicionalNoturno" className="text-[9px] font-bold text-slate-600 uppercase">Adicional Noturno (%)</label>
                  <div className="flex items-center gap-1">
                    <input
                      id="adicionalNoturno"
                      type="number"
                      min="0"
                      max="200"
                      step="5"
                      value={formData.adicionalNoturno || ''}
                      onChange={(e) => setFormData({ ...formData, adicionalNoturno: e.target.value })}
                      placeholder="35"
                      className="w-full bg-white border border-indigo-200 rounded px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-500 font-bold text-center"
                    />
                    <span className="text-[10px] text-slate-400 font-bold">%</span>
                  </div>
                  <p className="text-[9px] text-slate-400 italic">22h–05h</p>
                </div>
                <div className="space-y-1">
                  <label htmlFor="adicionalFimSemana" className="text-[9px] font-bold text-slate-600 uppercase">Adicional Fim de Semana (%)</label>
                  <div className="flex items-center gap-1">
                    <input
                      id="adicionalFimSemana"
                      type="number"
                      min="0"
                      max="200"
                      step="5"
                      value={formData.adicionalFimSemana || ''}
                      onChange={(e) => setFormData({ ...formData, adicionalFimSemana: e.target.value })}
                      placeholder="50"
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-slate-400 font-bold text-center"
                    />
                    <span className="text-[10px] text-slate-400 font-bold">%</span>
                  </div>
                  <p className="text-[9px] text-slate-400 italic">Sáb, Dom e Feriados</p>
                </div>
                <div className="space-y-1">
                  <label htmlFor="minimoHorasChamado" className="text-[9px] font-bold text-slate-600 uppercase">Min. Cobrável / chamado</label>
                  <div className="flex items-center gap-1">
                    <input
                      id="minimoHorasChamado"
                      type="number"
                      min="0"
                      max="24"
                      step="0.5"
                      value={formData.minimoHorasChamado || ''}
                      onChange={(e) => setFormData({ ...formData, minimoHorasChamado: e.target.value })}
                      placeholder="10"
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-slate-400 font-bold text-center"
                    />
                    <span className="text-[10px] text-slate-400 font-bold">h</span>
                  </div>
                  <p className="text-[9px] text-slate-400 italic">Mínimo por acionamento</p>
                </div>
              </div>
            </div>

            {formData.tipoProposta === 'TECNICA' && (
              <div className="grid grid-cols-3 gap-3 mt-2 bg-slate-50 border border-slate-200 p-3 rounded">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-600 uppercase">Dimensionamento da Equipe</label>
                  <textarea
                    value={formData.dimensionamentoEquipe || ''}
                    onChange={(e) => setFormData({ ...formData, dimensionamentoEquipe: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-400 min-h-[50px] resize-none"
                    placeholder="Ex: 1 Encarregado, 2 Operadores..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-600 uppercase">Qtd de Equipamentos</label>
                  <textarea
                    value={formData.qtdEquipamentos || ''}
                    onChange={(e) => setFormData({ ...formData, qtdEquipamentos: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-400 min-h-[50px] resize-none"
                    placeholder="Ex: 1 Caminhão Vácuo, 1 Caminhão Jato..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-600 uppercase">Dias de Trabalho</label>
                  <textarea
                    value={formData.diasTrabalho || ''}
                    onChange={(e) => setFormData({ ...formData, diasTrabalho: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-400 min-h-[50px] resize-none"
                    placeholder="Ex: 5 Dias úteis..."
                  />
                </div>
              </div>
            )}

            {/* TABS IMPLEMENTATION */}
            <div className="border border-slate-300 rounded mt-3 text-xs bg-slate-50/50 min-h-[250px] flex flex-col">
              <div className="flex items-center gap-1 border-b border-slate-300 px-1 pt-1 bg-gradient-to-b from-white to-slate-200">
                <button
                  onClick={() => setActiveTab('EQUIPAMENTOS')}
                  className={`px-5 py-1.5 font-bold rounded-t -mb-[1px] relative shadow-sm transition-colors ${activeTab === 'EQUIPAMENTOS' ? 'text-blue-800 bg-white border-x border-t border-slate-300 z-10' : 'text-slate-500 cursor-pointer border border-transparent hover:text-blue-600'}`}
                >
                  Equipamentos
                </button>
                <button
                  onClick={() => setActiveTab('ACESSORIOS')}
                  className={`px-5 py-1.5 font-bold rounded-t -mb-[1px] relative shadow-sm transition-colors ${activeTab === 'ACESSORIOS' ? 'text-blue-800 bg-white border-x border-t border-slate-300 z-10' : 'text-slate-500 cursor-pointer border border-transparent hover:text-blue-600'}`}
                >
                  Acessórios
                </button>
                <button
                  onClick={() => setActiveTab('RESPONSABILIDADES')}
                  className={`px-5 py-1.5 font-bold rounded-t -mb-[1px] relative shadow-sm transition-colors ${activeTab === 'RESPONSABILIDADES' ? 'text-blue-800 bg-white border-x border-t border-slate-300 z-10' : 'text-slate-500 cursor-pointer border border-transparent hover:text-blue-600'}`}
                >
                  Responsabilidades
                </button>
                <button
                  onClick={() => setActiveTab('EQUIPES')}
                  className={`px-5 py-1.5 font-bold rounded-t -mb-[1px] relative shadow-sm transition-colors ${activeTab === 'EQUIPES' ? 'text-blue-800 bg-white border-x border-t border-slate-300 z-10' : 'text-slate-500 cursor-pointer border border-transparent hover:text-blue-600'}`}
                >
                  Equipes
                </button>
              </div>

              <div className="p-3 bg-white flex-1 relative">
                {activeTab === 'EQUIPAMENTOS' && (
                  <div className="overflow-x-auto animate-in fade-in duration-200">
                    <table className="w-full text-left whitespace-nowrap table-fixed">
                      <thead className="bg-[#f0f2f5] text-[9px] text-[#4a637c] uppercase font-bold">
                        <tr>
                          <th className="px-2 py-1.5 w-[25%] border border-slate-200 rounded-tl">Equipamento</th>
                          <th className="px-2 py-1.5 w-16 border border-slate-200 text-center">Quantidade</th>
                          <th className="px-2 py-1.5 border border-slate-200">Área</th>
                          <th className="px-2 py-1.5 border border-slate-200">Tipo de Cobrança</th>
                          {formData.tipoProposta !== 'TECNICA' && <th className="px-2 py-1.5 border border-slate-200">Valor Unit.</th>}
                          <th className="px-2 py-1.5 border border-slate-200">Horas por Dia</th>
                          {formData.tipoProposta !== 'TECNICA' && <th className="px-2 py-1.5 border border-slate-200 text-amber-700 bg-amber-50">Hora Extra (R$)</th>}
                          <th className="px-2 py-1.5 border border-slate-200">Uso Previsto</th>
                          {formData.tipoProposta !== 'TECNICA' && <th className="px-2 py-1.5 border border-slate-200">Mobilização</th>}
                          {formData.tipoProposta !== 'TECNICA' && <th className="px-2 py-1.5 border border-slate-200 rounded-tr">Valor Total (R$)</th>}
                          <th className="px-1 py-1 w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.itens.length === 0 ? (
                          <tr><td colSpan={10} className="px-2 py-6 text-center text-[10px] text-slate-400 border border-slate-200">Nenhum equipamento listado.</td></tr>
                        ) : formData.itens.map((item: any, idx: number) => (
                          <tr key={idx} className="border-b text-xs border-slate-100 hover:bg-blue-50/30">
                            <td className="px-1 py-1 border-x border-slate-200">
                              <select value={item.equipamento} onChange={(e) => updateItem(idx, 'equipamento', e.target.value)} className="w-full px-1.5 py-1 bg-white border border-slate-300 rounded outline-none appearance-none text-[10px]">
                                <option value="">Selecione...</option>
                                {equipamentosOptions.map(eq => <option key={eq.id} value={eq.nome}>{eq.nome}</option>)}
                              </select>
                            </td>
                            <td className="px-1 py-1 border-x border-slate-200 text-center">
                              <input type="number" value={item.quantidade} onChange={(e) => updateItem(idx, 'quantidade', parseInt(e.target.value))} className="w-full text-center px-1.5 py-1 bg-white border border-slate-300 rounded outline-none text-[10px]" />
                            </td>
                            <td className="px-1 py-1 border-x border-slate-200">
                              <input type="text" value={item.area || ''} onChange={(e) => updateItem(idx, 'area', e.target.value)} className="w-full px-1.5 py-1 bg-white border border-slate-300 rounded outline-none text-[10px]" />
                            </td>
                            <td className="px-1 py-1 border-x border-slate-200">
                              <select value={item.tipoCobranca || ''} onChange={(e) => updateItem(idx, 'tipoCobranca', e.target.value)} className="w-full px-1.5 py-1 bg-white border border-slate-300 rounded outline-none text-[10px]">
                                <option value="DIARIA">DIÁRIA</option>
                                <option value="HORA">HORA</option>
                                <option value="FRETE">FRETE</option>
                                <option value="FECHADA">FECHADA</option>

                              </select>
                            </td>
                            {formData.tipoProposta !== 'TECNICA' && (
                              <td className="px-1 py-1 border-x border-slate-200">
                                <input type="number" step="0.01" value={item.valorAcobrar} onChange={(e) => updateItem(idx, 'valorAcobrar', parseFloat(e.target.value))} className="w-full px-1.5 py-1 bg-white border border-slate-300 rounded outline-none text-[10px]" />
                              </td>
                            )}
                            <td className="px-1 py-1 border-x border-slate-200">
                              <input type="number" value={item.horasPorDia || ''} onChange={(e) => updateItem(idx, 'horasPorDia', parseInt(e.target.value))} className="w-full px-1.5 py-1 bg-white border border-slate-300 rounded outline-none text-[10px]" />
                            </td>
                            {formData.tipoProposta !== 'TECNICA' && (
                              <td className="px-1 py-1 border-x border-slate-200 bg-amber-50/20">
                                <input type="number" step="0.01" value={item.horaAdicional || ''} onChange={(e) => updateItem(idx, 'horaAdicional', parseFloat(e.target.value))} className="w-full px-1.5 py-1 bg-white border border-amber-300 rounded outline-none text-[10px]" />
                              </td>
                            )}
                            <td className="px-1 py-1 border-x border-slate-200">
                              <input type="text" value={item.usoPrevisto || ''} onChange={(e) => updateItem(idx, 'usoPrevisto', e.target.value)} className="w-full px-1.5 py-1 bg-white border border-slate-300 rounded outline-none text-[10px]" />
                            </td>
                            {formData.tipoProposta !== 'TECNICA' && (
                              <td className="px-1 py-1 border-x border-slate-200">
                                <input type="number" step="0.01" value={item.mobilizacao || ''} onChange={(e) => updateItem(idx, 'mobilizacao', parseFloat(e.target.value))} className="w-full px-1.5 py-1 bg-white border border-slate-300 rounded outline-none text-[10px]" />
                              </td>
                            )}
                            {formData.tipoProposta !== 'TECNICA' && (
                              <td className="px-2 py-1 border-x border-slate-200 text-slate-500 bg-slate-50 text-[10px]">
                                {item.valorTotal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                            )}
                            <td className="px-1 py-1 text-center">
                              <button onClick={() => removeItem(idx)} className="text-red-600 hover:bg-red-50 p-0.5 rounded"><X className="w-3.5 h-3.5" /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <button onClick={addItem} className="text-[#3b82f6] text-[10px] uppercase font-bold mt-2 hover:underline tracking-tight">+ Adicionar Equipamento</button>
                  </div>
                )}

                {activeTab === 'ACESSORIOS' && (
                  <div className="animate-in fade-in duration-200 space-y-3">
                    <div className="grid grid-cols-12 gap-3 mb-2 font-bold text-[9px] text-slate-500 uppercase border-b border-slate-200 pb-1">
                      <div className="col-span-6">Acessório</div>
                      <div className="col-span-2 text-center">Quantidade</div>
                      <div className="col-span-3">Valor (R$)</div>
                      <div className="col-span-1 text-center">Ação</div>
                    </div>
                    {(!formData.acessorios || formData.acessorios.length === 0) ? (
                      <div className="text-center py-6 text-[10px] text-slate-400 border border-slate-200 border-dashed rounded bg-slate-50">
                        Nenhum acessório adicionado.
                      </div>
                    ) : (
                      formData.acessorios.map((ac: any, idx: number) => (
                        <div key={idx} className="grid grid-cols-12 gap-3 items-center group">
                          <div className="col-span-6">
                            <select
                              value={ac.acessorio || ''}
                              onChange={(e) => updateAcessorio(idx, 'acessorio', e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-[10px] outline-none text-slate-700 focus:border-blue-400"
                            >
                              <option value="">Selecione...</option>
                              {acessoriosOptions.map((a: any) => <option key={a.id} value={a.nome}>{a.nome}</option>)}
                            </select>
                          </div>
                          <div className="col-span-2">
                            <input
                              type="number" min="1"
                              value={ac.quantidade || 1}
                              onChange={(e) => updateAcessorio(idx, 'quantidade', parseInt(e.target.value) || 1)}
                              className="w-full text-center bg-white border border-slate-300 rounded px-2 py-1 text-[10px] outline-none focus:border-blue-400"
                            />
                          </div>
                          <div className="col-span-3">
                            <input
                              type="number" step="0.01"
                              value={ac.valor || ''}
                              onChange={(e) => updateAcessorio(idx, 'valor', e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-[10px] outline-none focus:border-blue-400"
                              placeholder="0.00"
                            />
                          </div>
                          <div className="col-span-1 flex justify-center">
                            <button onClick={() => removeAcessorio(idx)} className="text-red-600 hover:bg-red-50 p-1 rounded"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      ))
                    )}
                    <button onClick={addAcessorio} className="text-[#3b82f6] text-[10px] uppercase font-bold mt-2 hover:underline tracking-tight">+ Adicionar Acessório</button>
                  </div>
                )}

                {activeTab === 'RESPONSABILIDADES' && (
                  <div className="animate-in fade-in duration-200 space-y-3">
                    <div className="grid grid-cols-12 gap-3 mb-2 font-bold text-[9px] text-slate-500 uppercase border-b border-slate-200 pb-1">
                      <div className="col-span-3">Tipo</div>
                      <div className="col-span-8">Descrição</div>
                      <div className="col-span-1 text-center">Ação</div>
                    </div>
                    {formData.responsabilidades?.length === 0 ? (
                      <div className="text-center py-6 text-[10px] text-slate-400 border border-slate-200 border-dashed rounded bg-slate-50">
                        Nenhuma responsabilidade manual adicionada.
                      </div>
                    ) : (
                      formData.responsabilidades?.map((resp: any, idx: number) => (
                        <div key={idx} className="grid grid-cols-12 gap-3 items-start group">
                          <div className="col-span-3">
                            <select
                              value={resp.tipo}
                              onChange={(e) => updateResponsabilidade(idx, 'tipo', e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-[10px] font-bold outline-none text-slate-700 focus:border-blue-400"
                            >
                              <option value="CONTRATADA">CONTRATADA (HIDRO)</option>
                              <option value="CONTRATANTE">CONTRATANTE (CLIENTE)</option>
                            </select>
                          </div>
                          <div className="col-span-8">
                            <textarea
                              value={resp.descricao}
                              onChange={(e) => updateResponsabilidade(idx, 'descricao', e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-[10px] outline-none text-slate-700 min-h-[40px] resize-none focus:border-blue-400"
                              placeholder="Descreva a responsabilidade..."
                            />
                          </div>
                          <div className="col-span-1 flex justify-center pt-1.5">
                            <button
                              onClick={() => removeResponsabilidade(idx)}
                              className="text-red-600 hover:bg-red-50 p-1 rounded transition-colors"
                              title="Remover"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                    <button onClick={addResponsabilidade} className="text-[#3b82f6] text-[10px] uppercase font-bold mt-2 hover:underline tracking-tight">+ Adicionar Responsabilidade</button>
                  </div>
                )}

                {activeTab === 'EQUIPES' && (
                  <div className="animate-in fade-in duration-200 space-y-3">
                    <div className="grid grid-cols-12 gap-3 mb-2 font-bold text-[9px] text-slate-500 uppercase border-b border-slate-200 pb-1">
                      <div className="col-span-3">Colaborador / RH</div>
                      <div className="col-span-2">Função / Cargo</div>
                      <div className="col-span-1 text-center">Todos Equip.</div>
                      <div className="col-span-3">Equipamento</div>
                      <div className="col-span-2 text-center">Qtde</div>
                      <div className="col-span-1 text-center">Ação</div>
                    </div>
                    {formData.equipe?.length === 0 ? (
                      <div className="text-center py-6 text-[10px] text-slate-400 border border-slate-200 border-dashed rounded bg-slate-50">
                        Nenhuma equipe listada para esta proposta.
                      </div>
                    ) : (
                      formData.equipe?.map((membro: any, idx: number) => (
                        <div key={idx} className="grid grid-cols-12 gap-3 items-center group">
                          <div className="col-span-3">
                            <select
                              value={membro.nome || ''}
                              onChange={(e) => {
                                const selected = funcionariosOptions.find(f => f.nome_completo === e.target.value);
                                const newEquipe = [...(formData.equipe || [])];
                                newEquipe[idx] = { ...newEquipe[idx], nome: e.target.value };
                                if (selected && selected.cargo) {
                                  newEquipe[idx].funcao = selected.cargo;
                                  
                                  // Auto-detect UnicoEquipamento based on Cargo model
                                  const cargoModel = cargosData.find(c => c.nome.toLowerCase() === selected.cargo.toLowerCase());
                                  if (cargoModel?.unicoEquipamento) {
                                    newEquipe[idx].unicoEquipamento = true;
                                    newEquipe[idx].equipamento = '';
                                  }
                                }
                                setFormData({ ...formData, equipe: newEquipe });
                              }}
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-[10px] outline-none text-slate-700 focus:border-blue-400"
                            >
                              <option value="">A Definir / Avulso</option>
                              {funcionariosOptions.map((f: any) => (
                                <option key={f.id} value={f.nome_completo}>{f.nome_completo}</option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-2">
                            <input
                              type="text"
                              value={membro.funcao || ''}
                              onChange={(e) => updateEquipe(idx, 'funcao', e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-[10px] outline-none text-slate-700 focus:border-blue-400"
                              placeholder="Ex: Motorista..."
                            />
                          </div>
                          <div className="col-span-1 flex justify-center">
                            <input
                              type="checkbox"
                              checked={!!membro.unicoEquipamento}
                              onChange={(e) => {
                                const newEquipe = [...(formData.equipe || [])];
                                newEquipe[idx] = { ...newEquipe[idx], unicoEquipamento: e.target.checked, equipamento: e.target.checked ? '' : newEquipe[idx].equipamento };
                                setFormData({ ...formData, equipe: newEquipe });
                              }}
                              className="w-4 h-4 accent-blue-600 cursor-pointer"
                              title="Marque se este cargo se aplica a todos os equipamentos (ex: Motorista, Ajudante)"
                            />
                          </div>
                          <div className="col-span-3">
                            {membro.unicoEquipamento ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 italic px-2 py-1.5">
                                <Globe className="w-3 h-3" /> Todos os equipamentos
                              </span>
                            ) : (
                              <select
                                value={membro.equipamento || ''}
                                onChange={(e) => updateEquipe(idx, 'equipamento', e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-[10px] outline-none text-slate-700 focus:border-blue-400 appearance-none bg-transparent"
                              >
                                <option value="">Selecione...</option>
                                {Array.from(new Set(formData.itens?.filter((i: any) => !!i.equipamento).map((i: any) => i.equipamento))).map((equipNome: any, i: number) => (
                                  <option key={i} value={equipNome}>{equipNome}</option>
                                ))}
                              </select>
                            )}
                          </div>
                          <div className="col-span-2">
                            <input
                              type="number"
                              min="1"
                              value={membro.quantidade}
                              onChange={(e) => updateEquipe(idx, 'quantidade', parseInt(e.target.value) || 1)}
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-[10px] outline-none text-center text-slate-700 focus:border-blue-400"
                            />
                          </div>
                          <div className="col-span-1 flex justify-center">
                            <button
                              onClick={() => removeEquipe(idx)}
                              className="text-red-600 hover:bg-red-50 p-1 rounded transition-colors"
                              title="Remover"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                    <button onClick={addEquipe} className="text-[#3b82f6] text-[10px] uppercase font-bold mt-2 hover:underline tracking-tight">+ Adicionar Membro da Equipe</button>
                  </div>
                )}
              </div>
            </div>

            {/* Descrição Valores */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-600 uppercase">Descrição de Valores</label>
              <textarea
                value={formData.descricaoValores || ''}
                onChange={(e) => setFormData({ ...formData, descricaoValores: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-400 min-h-[40px] resize-none"
              />
            </div>

            {/* Garantia / Descrição do Serviço (Automático) - Red tinted block */}
            <div className="space-y-1 bg-red-50/50 p-2 border border-red-100/50 rounded">
              <label className="text-[9px] font-bold text-red-500 uppercase">Descrição do Serviço / Garantia Técnica</label>
              <textarea
                value={formData.descricaoGarantia || ''}
                onChange={(e) => setFormData({ ...formData, descricaoGarantia: e.target.value })}
                className="w-full bg-white border border-red-200 rounded px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-red-400 min-h-[100px] resize-none"
              />
            </div>

            {/* Condições e Totaiss block (only for Comercial) */}
            {formData.tipoProposta !== 'TECNICA' && (
              <div className="grid grid-cols-12 gap-6 items-end mt-4">
                <div className="col-span-8 space-y-1">
                  <label className="text-[9px] font-bold text-slate-600 uppercase">Condições de Pagamento</label>
                  <textarea
                    value={formData.condicoesPagamento || ''}
                    onChange={(e) => setFormData({ ...formData, condicoesPagamento: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-400 min-h-[140px] resize-none"
                  />
                </div>
                <div className="col-span-4 bg-slate-50 border border-slate-200 rounded p-4 h-full flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center bg-white px-2 py-1.5 rounded border border-slate-200">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Porcentagem Reter (%)</label>
                      <input type="number" step="0.01" value={formData.pRL || ''} onChange={(e) => setFormData({ ...formData, pRL: e.target.value })} className="w-16 text-right border-b border-slate-300 text-xs text-slate-700 outline-none focus:border-blue-400 font-bold" />
                    </div>
                    <div className="flex justify-between items-center bg-white px-2 py-1.5 rounded border border-slate-200">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">CTe Incluso</label>
                      <select value={formData.cTe || 'Não'} onChange={(e) => setFormData({ ...formData, cTe: e.target.value })} className="border-b border-slate-300 text-xs text-slate-700 outline-none focus:border-blue-400 appearance-none bg-transparent">
                        <option value="Não">Não</option><option value="Sim">Sim</option>
                      </select>
                    </div>
                    <div className="flex justify-between items-center bg-white px-2 py-1.5 rounded border border-slate-200">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Pgto Antecipado</label>
                      <select value={formData.pagamentoAntecipado || 'Não'} onChange={(e) => setFormData({ ...formData, pagamentoAntecipado: e.target.value })} className="border-b border-slate-300 text-xs text-slate-700 outline-none focus:border-blue-400 appearance-none bg-transparent">
                        <option value="Não">Não</option><option value="Sim">Sim</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-6 border-t border-slate-300 pt-3">
                    <label className="text-[10px] font-black text-slate-700 uppercase block mb-1">Valor Total Proposta (R$)</label>
                    <input
                      type="text" readOnly
                      value={formData.itens.reduce((acc: number, i: any) => acc + (parseFloat(i.valorTotal) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      className="w-full bg-slate-200 border border-slate-300 rounded px-2 py-1.5 text-base font-black text-slate-800 outline-none text-right"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Validade */}
            <div className="space-y-1 pb-6 mt-4">
              <label className="text-[9px] font-bold text-slate-600 uppercase">Validade da Proposta</label>
              <textarea
                value={formData.dataValidade ? `Essa proposta possui validade até o dia: ${new Date(formData.dataValidade + 'T12:00:00').toLocaleDateString('pt-BR')}` : ''}
                readOnly
                className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-700 outline-none min-h-[40px] resize-none"
              />
            </div>

          </div>
        </div>
      )}
    </div>

      {/* MODAL DISPARO EQUIPE */}
      {isDispatchModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Chamada de Serviço</h3>
                <p className="text-xs text-slate-500 uppercase font-black">Disparo Automático p/ Equipe</p>
              </div>
              <button 
                onClick={() => setIsDispatchModalOpen(false)}
                className="p-2 hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Turnos</label>
                  <select 
                    value={dispatchData.turnos}
                    onChange={e => setDispatchData({...dispatchData, turnos: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="1">1 Turno</option>
                    <option value="2">2 Turnos</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Qtd Pessoas</label>
                  <input 
                    type="number"
                    value={dispatchData.qtdPessoas}
                    onChange={e => setDispatchData({...dispatchData, qtdPessoas: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">Dia de Saída / Viagem</label>
                <input 
                  type="text"
                  placeholder="Ex: Terça-feira, dia 12..."
                  value={dispatchData.diaSaida}
                  onChange={e => setDispatchData({...dispatchData, diaSaida: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">O que vai fazer?</label>
                <textarea 
                  rows={2}
                  value={dispatchData.oQueVaiFazer}
                  onChange={e => setDispatchData({...dispatchData, oQueVaiFazer: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">Algo diferente / Diferencial?</label>
                <textarea 
                  rows={2}
                  value={dispatchData.algoDiferente}
                  onChange={e => setDispatchData({...dispatchData, algoDiferente: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                />
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button 
                onClick={() => setIsDispatchModalOpen(false)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-white transition-all uppercase"
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirmDispatch}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-500/20 transition-all uppercase flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Confirmar Chamada
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
