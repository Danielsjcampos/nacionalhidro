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

  // 2. Buscar escalas do dia OU escalas de OSs ainda ativas (Trava Hard)
  const startOfDay = new Date(data);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(data);
  endOfDay.setHours(23, 59, 59, 999);

  // Buscar escalas que:
  // a) São para o dia solicitado
  // b) Ou estão vinculadas a uma OS que ainda não foi finalizada/cancelada (Lock until Baixa)
  const escalasConflitantes = await prisma.escala.findMany({
    where: {
      status: { notIn: ['CANCELADO', 'CANCELADA'] },
      OR: [
        { data: { gte: startOfDay, lte: endOfDay } },
        { 
          codigoOS: { not: null },
          // Note: Since we don't have a direct relation, we'll filter OS status in memory or via subquery if possible.
          // For now, let's get all non-cancelled escalas and filter by OS status below.
        }
      ]
    },
    include: { cliente: { select: { nome: true } } }
  });

  // Fetch statuses of relevant OSs
  const codigosOS = escalasConflitantes.map(e => e.codigoOS).filter(Boolean) as string[];
  const activeOSs = await prisma.ordemServico.findMany({
    where: {
      codigo: { in: codigosOS },
      status: { in: ['ABERTA', 'EM_EXECUCAO', 'EM_ANDAMENTO'] }
    },
    select: { codigo: true, status: true, dataInicial: true }
  });
  const activeOSMap = new Map(activeOSs.map(os => [os.codigo, os]));

  // Map: funcionarioId -> cliente/motivo indisponibilidade
  const funcionariosEscalados = new Map<string, { cliente: string; motivo?: string }>();
  
  for (const esc of escalasConflitantes) {
    const osAtiva = esc.codigoOS ? activeOSMap.get(esc.codigoOS) : null;
    
    // Bloqueia se:
    // 1. É uma escala para o próprio dia
    // 2. É uma OS em execução (Trava Hard até a Baixa)
    const isToday = esc.data >= startOfDay && esc.data <= endOfDay;
    const isRunning = osAtiva?.status === 'EM_EXECUCAO' || osAtiva?.status === 'EM_ANDAMENTO';

    if (isToday || isRunning) {
      if (Array.isArray(esc.funcionarios)) {
        for (const f of esc.funcionarios as any[]) {
          const fId = typeof f === 'object' ? f.id : null;
          if (fId) {
            const motivo = isRunning ? `Ocupado em OS em Execução (${esc.codigoOS})` : undefined;
            funcionariosEscalados.set(fId, { 
              cliente: esc.cliente?.nome || 'Outro cliente',
              motivo 
            });
          }
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

  // 6. Build result
  const seenIds = new Set<string>();
  const result: FuncionarioQuadro[] = [];

  for (const func of funcionarios) {
    if (seenIds.has(func.id)) continue;
    seenIds.add(func.id);

    const asoVenc = asoMap.get(func.id) ?? null;
    const intVenc = integracaoMap.get(func.id) ?? null;
    const asoSt = checkStatus(asoVenc);
    const intSt = clienteId ? checkStatus(intVenc) : 'OK';
    const afastado = afastamentoMap.get(func.id);
    const escalado = funcionariosEscalados.get(func.id);

    let status: FuncionarioQuadro['status'] = 'DISPONIVEL';
    let motivo: string | undefined;
    let escaladoPara: string | undefined;
    let categoriaIndisponibilidade: FuncionarioQuadro['categoriaIndisponibilidade'] = null;

    if (['FERIAS', 'ATESTADO', 'AFASTADO', 'DESLIGADO'].includes(func.status)) {
      status = func.status === 'FERIAS' ? 'FERIAS' : 'AFASTADO';
      motivo = String(func.motivoAfastamento || func.status);
    } else if (afastado) {
      status = 'AFASTADO';
      motivo = afastado;
    } else if (escalado) {
      status = 'ESCALADO';
      escaladoPara = escalado.cliente;
      motivo = escalado.motivo;
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
  const veiculos = await prisma.veiculo.findMany({
    where: { exibirNoHistograma: true },
    orderBy: { placa: 'asc' }
  });

  const startOfDay = new Date(data);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(data);
  endOfDay.setHours(23, 59, 59, 999);

  const escalasConflitantes = await prisma.escala.findMany({
    where: {
      status: { notIn: ['CANCELADO', 'CANCELADA'] },
      veiculoId: { not: null }
    },
    include: { cliente: { select: { nome: true } } }
  });

  // Fetch statuses of relevant OSs
  const codigosOS = escalasConflitantes.map(e => e.codigoOS).filter(Boolean) as string[];
  const activeOSs = await prisma.ordemServico.findMany({
    where: {
      codigo: { in: codigosOS },
      status: { in: ['ABERTA', 'EM_EXECUCAO', 'EM_ANDAMENTO'] }
    },
    select: { codigo: true, status: true }
  });
  const activeOSMap = new Map(activeOSs.map(os => [os.codigo, os]));

  const veiculosEscalados = new Map<string, { cliente: string; motivo?: string }>();
  for (const esc of escalasConflitantes) {
    if (!esc.veiculoId) continue;

    const osAtiva = esc.codigoOS ? activeOSMap.get(esc.codigoOS) : null;
    const isToday = esc.data >= startOfDay && esc.data <= endOfDay;
    const isRunning = osAtiva?.status === 'EM_EXECUCAO' || osAtiva?.status === 'EM_ANDAMENTO';

    if (isToday || isRunning) {
      const motivo = isRunning ? `Ocupado em OS em Execução (${esc.codigoOS})` : undefined;
      veiculosEscalados.set(esc.veiculoId, { 
        cliente: esc.cliente?.nome || 'Outro cliente',
        motivo 
      });
    }
  }

  const manutencoesPendentes = await prisma.manutencao.findMany({
    where: {
      status: { in: ['PENDENTE', 'EM_ANDAMENTO'] },
      veiculoId: { not: null }
    },
    select: { veiculoId: true }
  });
  const veiculosEmManutencao = new Set(manutencoesPendentes.map(m => m.veiculoId).filter(Boolean));

  return veiculos.map(v => {
    let status: VeiculoQuadro['status'] = 'DISPONIVEL';
    let escaladoPara: string | undefined;

    if (v.status === 'MANUTENCAO' || veiculosEmManutencao.has(v.id)) {
      status = 'MANUTENCAO';
    } else if (veiculosEscalados.has(v.id)) {
      status = 'ESCALADO';
      escaladoPara = veiculosEscalados.get(v.id).cliente;
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
