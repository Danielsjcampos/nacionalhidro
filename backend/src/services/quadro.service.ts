import prisma from '../lib/prisma';

// ─── Interfaces ─────────────────────────────────────────────────
interface FuncionarioQuadro {
  id: string;
  nome: string;
  cargo: string;
  status: 'DISPONIVEL' | 'ESCALADO' | 'AFASTADO' | 'FERIAS' | 'MANUTENCAO_DOC';
  escaladoPara?: string; // Nome do cliente onde já está escalado
  motivoIndisponibilidade?: string;
  // ── Gap Analysis 2.3: Categoria detalhada de indisponibilidade ──
  categoriaIndisponibilidade?: 'FERIAS' | 'ATESTADO' | 'AFASTAMENTO_INSS' | 'FOLGA' | 'TREINAMENTO' | 'FALTA_INJUSTIFICADA' | 'LICENCA' | null;
  integracaoStatus?: 'OK' | 'VENCENDO' | 'VENCIDO' | 'INEXISTENTE';
  asoStatus?: 'OK' | 'VENCENDO' | 'VENCIDO' | 'INEXISTENTE';
  categoriaCNH?: string | null;
  mopp?: boolean;
}

interface VeiculoQuadro {
  id: string;
  placa: string;
  modelo: string;
  marca?: string | null;
  tipo: string;
  tipoEquipamento?: string | null;
  status: 'DISPONIVEL' | 'ESCALADO' | 'MANUTENCAO';
  escaladoPara?: string;
  kmAtual: number;
  nivelCombustivel: number;
}

// ─── Quadro de Funcionários ─────────────────────────────────────
export const getQuadroFuncionarios = async (
  data: Date,
  clienteId?: string
): Promise<FuncionarioQuadro[]> => {
  // 1. Buscar TODOS os funcionarios ativos
  const funcionarios = await prisma.funcionario.findMany({
    where: { ativo: true },
    select: {
      id: true,
      nome: true,
      cargo: true,
      status: true,
      motivoAfastamento: true,
      feriasInicio: true,
      feriasFim: true,
      categoriaCNH: true,
      mopp: true,
    },
    orderBy: { nome: 'asc' }
  });

  // 2. Buscar escalas do dia para saber quem já está escalado
  const startOfDay = new Date(data);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(data);
  endOfDay.setHours(23, 59, 59, 999);

  const escalasDoDia = await prisma.escala.findMany({
    where: {
      data: { gte: startOfDay, lte: endOfDay },
      status: { notIn: ['CANCELADO', 'CANCELADA'] }
    },
    include: { cliente: { select: { nome: true } } }
  });

  // Map: funcionarioId -> cliente escalado
  const funcionariosEscalados = new Map<string, string>();
  for (const esc of escalasDoDia) {
    if (Array.isArray(esc.funcionarios)) {
      for (const f of esc.funcionarios as any[]) {
        const fId = typeof f === 'object' ? f.id : null;
        if (fId) {
          funcionariosEscalados.set(fId, esc.cliente?.nome || 'Outro cliente');
        }
      }
    }
  }

  // 3. Buscar afastamentos ativos na data
  const afastamentos = await (prisma as any).afastamento.findMany({
    where: {
      dataInicio: { lte: data },
      dataFim: { gte: data }
    },
    select: { funcionarioId: true, tipo: true }
  });
  const afastamentoMap = new Map<string, string>();
  for (const a of afastamentos) {
    afastamentoMap.set(a.funcionarioId, a.tipo);
  }

  // 4. Buscar ASO mais recente de cada funcionário
  const now = new Date();
  const checkStatus = (vencimento: Date | null | undefined): 'OK' | 'VENCENDO' | 'VENCIDO' | 'INEXISTENTE' => {
    if (!vencimento) return 'INEXISTENTE';
    const diff = Math.floor((vencimento.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'VENCIDO';
    if (diff <= 30) return 'VENCENDO';
    return 'OK';
  };

  // Batch ASO query
  const asoList = await prisma.aSOControle.findMany({
    where: { funcionarioId: { in: funcionarios.map(f => f.id) } },
    orderBy: { dataVencimento: 'desc' },
  });
  const asoMap = new Map<string, Date>();
  for (const aso of asoList) {
    if (!asoMap.has(aso.funcionarioId)) {
      asoMap.set(aso.funcionarioId, aso.dataVencimento);
    }
  }

  // 5. Batch integração query (if clienteId provided)
  const integracaoMap = new Map<string, Date>();
  if (clienteId) {
    const integracoes = await prisma.integracaoCliente.findMany({
      where: {
        funcionarioId: { in: funcionarios.map(f => f.id) },
        clienteId
      },
      orderBy: { dataVencimento: 'desc' },
    });
    for (const int of integracoes) {
      if (!integracaoMap.has(int.funcionarioId)) {
        integracaoMap.set(int.funcionarioId, int.dataVencimento);
      }
    }
  }

  // 6. Build result — DEDUPLICATED (M05 fix)
  const seenIds = new Set<string>();
  const result: FuncionarioQuadro[] = [];

  for (const func of funcionarios) {
    if (seenIds.has(func.id)) continue;
    seenIds.add(func.id);

    // Status priorities: AFASTADO > FERIAS > ESCALADO > DOC_PROBLEM > DISPONIVEL
    const statusCriticos = ['FERIAS', 'ATESTADO', 'AFASTADO', 'DESLIGADO'];
    const asoVenc = asoMap.get(func.id) ?? null;
    const intVenc = integracaoMap.get(func.id) ?? null;
    const asoSt = checkStatus(asoVenc);
    const intSt = clienteId ? checkStatus(intVenc) : 'OK';
    const afastado = afastamentoMap.get(func.id);

    let status: FuncionarioQuadro['status'] = 'DISPONIVEL';
    let motivo: string | undefined;
    let escaladoPara: string | undefined;
    let categoriaIndisponibilidade: FuncionarioQuadro['categoriaIndisponibilidade'] = null;

    if (statusCriticos.includes(func.status)) {
      status = func.status === 'FERIAS' ? 'FERIAS' : 'AFASTADO';
      motivo = String(func.motivoAfastamento || func.status);
      // Map to detailed category
      const tipoMap: Record<string, FuncionarioQuadro['categoriaIndisponibilidade']> = {
        'FERIAS': 'FERIAS',
        'ATESTADO': 'ATESTADO',
        'AFASTADO': 'AFASTAMENTO_INSS',
        'DESLIGADO': null,
      };
      categoriaIndisponibilidade = tipoMap[func.status] || null;
    } else if (afastado) {
      status = 'AFASTADO';
      motivo = afastado;
      // Map afastamento tipo to category
      const afastTipoMap: Record<string, FuncionarioQuadro['categoriaIndisponibilidade']> = {
        'FERIAS': 'FERIAS',
        'ATESTADO': 'ATESTADO',
        'ATESTADO_MEDICO': 'ATESTADO',
        'AFASTAMENTO_INSS': 'AFASTAMENTO_INSS',
        'INSS': 'AFASTAMENTO_INSS',
        'FOLGA': 'FOLGA',
        'TREINAMENTO': 'TREINAMENTO',
        'FALTA_INJUSTIFICADA': 'FALTA_INJUSTIFICADA',
        'LICENCA': 'LICENCA',
        'LICENCA_MATERNIDADE': 'LICENCA',
        'LICENCA_PATERNIDADE': 'LICENCA',
      };
      categoriaIndisponibilidade = afastTipoMap[afastado.toUpperCase()] || 'ATESTADO';
    } else if (funcionariosEscalados.has(func.id)) {
      status = 'ESCALADO';
      escaladoPara = funcionariosEscalados.get(func.id);
    } else if (asoSt === 'VENCIDO' || asoSt === 'INEXISTENTE' || intSt === 'VENCIDO' || intSt === 'INEXISTENTE') {
      status = 'MANUTENCAO_DOC';
      motivo = asoSt !== 'OK' ? `ASO ${asoSt}` : `Integração ${intSt}`;
    }

    result.push({
      id: func.id,
      nome: func.nome,
      cargo: func.cargo,
      status,
      escaladoPara,
      motivoIndisponibilidade: motivo,
      categoriaIndisponibilidade,
      integracaoStatus: intSt as any,
      asoStatus: asoSt,
      categoriaCNH: func.categoriaCNH,
      mopp: func.mopp,
    });
  }

  return result;
};

// ─── Quadro de Veículos ─────────────────────────────────────────
export const getQuadroVeiculos = async (data: Date): Promise<VeiculoQuadro[]> => {
  // 1. Buscar todos veículos exibidos no histograma
  const veiculos = await prisma.veiculo.findMany({
    where: { exibirNoHistograma: true },
    orderBy: { placa: 'asc' }
  });

  // 2. Escalas do dia
  const startOfDay = new Date(data);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(data);
  endOfDay.setHours(23, 59, 59, 999);

  const escalasDoDia = await prisma.escala.findMany({
    where: {
      data: { gte: startOfDay, lte: endOfDay },
      veiculoId: { not: null },
      status: { notIn: ['CANCELADO', 'CANCELADA'] }
    },
    include: { cliente: { select: { nome: true } } }
  });

  const veiculosEscalados = new Map<string, string>();
  for (const esc of escalasDoDia) {
    if (esc.veiculoId) {
      veiculosEscalados.set(esc.veiculoId, esc.cliente?.nome || 'Outro');
    }
  }

  // 3. Manutenções pendentes
  const manutencoesPendentes = await prisma.manutencao.findMany({
    where: {
      status: { in: ['PENDENTE', 'EM_ANDAMENTO'] },
      veiculoId: { not: null }
    },
    select: { veiculoId: true }
  });
  const veiculosEmManutencao = new Set(manutencoesPendentes.map(m => m.veiculoId).filter(Boolean));

  // 4. Build result
  return veiculos.map(v => {
    let status: VeiculoQuadro['status'] = 'DISPONIVEL';
    let escaladoPara: string | undefined;

    if (v.status === 'MANUTENCAO' || veiculosEmManutencao.has(v.id)) {
      status = 'MANUTENCAO';
    } else if (veiculosEscalados.has(v.id)) {
      status = 'ESCALADO';
      escaladoPara = veiculosEscalados.get(v.id);
    }

    return {
      id: v.id,
      placa: v.placa,
      modelo: v.modelo,
      marca: v.marca,
      tipo: v.tipo,
      tipoEquipamento: v.tipoEquipamento,
      status,
      escaladoPara,
      kmAtual: v.kmAtual,
      nivelCombustivel: Number(v.nivelCombustivel),
    };
  });
};

// ─── Validar OS por código ──────────────────────────────────────
export const validarOSPorCodigo = async (codigo: string) => {
  const os = await prisma.ordemServico.findFirst({
    where: {
      codigo: { equals: codigo, mode: 'insensitive' }
    },
    include: {
      cliente: { select: { id: true, nome: true } },
      proposta: { select: { id: true, codigo: true } }
    }
  });

  if (!os) return { valida: false, error: 'Código de OS não encontrado.' };

  // Check if OS already has an escala linked
  const escalasVinculadas = await prisma.escala.findMany({
    where: { codigoOS: os.codigo }
  });

  return {
    valida: true,
    os: {
      id: os.id,
      codigo: os.codigo,
      status: os.status,
      clienteId: os.clienteId,
      clienteNome: os.cliente?.nome,
      propostaId: os.propostaId,
      propostaCodigo: os.proposta?.codigo,
      tipoCobranca: os.tipoCobranca,
      horaInicial: os.horaInicial,
    },
    jaVinculada: escalasVinculadas.length > 0,
    escalasVinculadas: escalasVinculadas.length
  };
};
