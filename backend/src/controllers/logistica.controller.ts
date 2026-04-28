import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { registrarLog } from '../lib/auditLog';
import { checkEmployeeAvailability } from '../services/rh.service';
import { getQuadroFuncionarios, getQuadroVeiculos, validarOSPorCodigo } from '../services/quadro.service';

// ─── ESCALAS ────────────────────────────────────────────────────

export const listEscalas = async (req: AuthRequest, res: Response) => {
  try {
    const { clienteId, veiculoId, dataInicio, dataFim } = req.query;
    const where: any = {};

    if (clienteId) where.clienteId = clienteId as string;
    if (veiculoId) where.veiculoId = veiculoId as string;
    if (dataInicio || dataFim) {
      where.data = {};
      if (dataInicio) where.data.gte = new Date(dataInicio as string);
      if (dataFim) where.data.lte = new Date(dataFim as string);
    }

    const list = await prisma.escala.findMany({
      where,
      include: {
        cliente: true,
        veiculo: true
      },
      orderBy: { data: 'desc' }
    });
    res.json(list);
  } catch (error) {
    console.error('List escalas error:', error);
    res.status(500).json({ error: 'Failed to fetch scales' });
  }
};

// ─── BUG FIX #12: Conflict validation on create ─────────────────
// ─── BUG FIX #9: Check employee availability (férias) ───────────
export const createEscala = async (req: AuthRequest, res: Response) => {
  try {
    const { data, funcionarios, veiculoId, ...rest } = req.body;
    const dataEscala = new Date(data);

    // BUG FIX #12: Check vehicle conflict on same date
    if (veiculoId) {
      // ── Gap Analysis 2.2: Trava hard — veículo em manutenção NÃO pode ser escalado ──
      const veiculo = await prisma.veiculo.findUnique({ where: { id: veiculoId }, select: { status: true, placa: true } });
      if (veiculo?.status === 'MANUTENCAO') {
        const manutencaoAberta = await prisma.manutencao.findFirst({
          where: { veiculoId, status: { in: ['PENDENTE', 'EM_ANDAMENTO'] } },
          select: { descricao: true }
        });
        return res.status(409).json({
          error: `Veículo ${veiculo.placa} está em MANUTENÇÃO e não pode ser escalado. ${manutencaoAberta?.descricao ? `Motivo: ${manutencaoAberta.descricao}` : 'Aguarde liberação da equipe de manutenção.'}`,
          bloqueio: 'MANUTENCAO'
        });
      }

      const vehicleConflict = await (prisma.escala as any).findFirst({
        where: {
          data: dataEscala,
          veiculoId: veiculoId
        },
        include: { cliente: true }
      });

      if (vehicleConflict) {
        return res.status(409).json({
          error: `Conflito: veículo já escalado para ${vehicleConflict.cliente?.nome || 'outro cliente'} nesta data.`,
          conflito: vehicleConflict
        });
      }

      // ── Gap Analysis 2.7: Trava Hard — Veículo em OS Ativa (Lock until Baixa) ──
      const escalasAtivas = await prisma.escala.findMany({
        where: {
          veiculoId,
          status: { notIn: ['CANCELADO', 'CANCELADA'] },
          codigoOS: { not: null }
        },
        select: { codigoOS: true }
      });
      
      if (escalasAtivas.length > 0) {
        const activeOSs = await prisma.ordemServico.findMany({
          where: {
            codigo: { in: escalasAtivas.map(e => e.codigoOS).filter(Boolean) as string[] },
            status: { in: ['EM_EXECUCAO', 'EM_ANDAMENTO'] }
          }
        });
        
        if (activeOSs.length > 0) {
          return res.status(409).json({
            error: `Veículo já está em campo na OS ${activeOSs[0].codigo}. Aguarde a Baixa para liberar o veículo.`,
            bloqueio: 'OS_ATIVA'
          });
        }
      }
    }

    // BUG FIX #9: Check employee availability (férias/atestado/ASO/Integracao)
    const { force } = req.body;
    if (funcionarios && Array.isArray(funcionarios)) {
      for (const funcParam of funcionarios) {
        let funcId = typeof funcParam === 'object' && funcParam.id ? funcParam.id : null;
        
        if (!funcId && typeof funcParam === 'string') {
           const func = await (prisma.funcionario as any).findFirst({
             where: { nome: { contains: funcParam, mode: 'insensitive' } }
           });
           if (func) funcId = func.id;
        }

        if (funcId) {
          const availability = await checkEmployeeAvailability(funcId, dataEscala, rest.clienteId, veiculoId);
          if (!availability.disponivel) {
             // T09: Soft Block logic - Only block if NOT forced AND it's a documentation issue
             const isCritical = availability.motivoIndisponibilidade?.includes('status impeditivo') || 
                                availability.motivoIndisponibilidade?.includes('afastamento') ||
                                availability.motivoIndisponibilidade?.includes('férias');

             if (!force || isCritical) {
                return res.status(409).json({
                  error: availability.motivoIndisponibilidade || `O funcionário não está disponível para escalar.`,
                  critico: isCritical
                });
             }
             console.log(`[T09] Escalação forçada para funcionário ${funcId} apesar do aviso: ${availability.motivoIndisponibilidade}`);
          }
        }
      }
    }

    const escala = await prisma.escala.create({
      data: {
        ...rest,
        funcionarios: funcionarios || undefined,
        veiculoId: veiculoId || undefined,
        data: dataEscala
      },
      include: { cliente: true, veiculo: true }
    });

    await registrarLog({
      entidade: 'ESCALA',
      entidadeId: escala.id,
      acao: 'CRIAR',
      descricao: `Escala criada em ${dataEscala.toLocaleDateString('pt-BR')}`,
      usuarioId: req.user?.userId,
      usuarioNome: req.user?.userId,
    });

    res.status(201).json(escala);
  } catch (error: any) {
    console.error('Create escala error:', error);
    res.status(500).json({ error: 'Failed to create scale', details: error.message });
  }
};

// ─── BUG FIX #7: Isolated employee edit ──────────────────────────
export const updateEscala = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { data, ...rest } = req.body;

    const before = await prisma.escala.findUnique({ where: { id } });
    if (!before) return res.status(404).json({ error: 'Escala not found' });

    const escala = await prisma.escala.update({
      where: { id },
      data: {
        ...rest,
        data: data ? new Date(data) : undefined
      },
      include: { cliente: true, veiculo: true }
    });

    await registrarLog({
      entidade: 'ESCALA',
      entidadeId: id,
      acao: 'ATUALIZAR',
      descricao: `Escala atualizada`,
      valorAnterior: JSON.stringify(before.funcionarios),
      valorNovo: rest.funcionarios ? JSON.stringify(rest.funcionarios) : undefined,
      usuarioId: req.user?.userId,
      usuarioNome: req.user?.userId,
    });

    res.json(escala);
  } catch (error: any) {
    console.error('Update escala error:', error);
    res.status(500).json({ error: 'Failed to update scale', details: error.message });
  }
};

// ─── VERIFICACAO DE FUNCIONARIO (T13, T14) ───────────────────────
export const verificarFuncionario = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const clienteId = req.params.clienteId as string;

    // 1. Verificar Integração com o Cliente
    let integracao: any = null;
    if (clienteId && clienteId !== 'undefined' && clienteId !== 'null') {
      integracao = await prisma.integracaoCliente.findFirst({
        where: {
          funcionarioId: id,
          clienteId: clienteId
        },
        orderBy: { dataVencimento: 'desc' }
      });
    }

    // 2. Verificar ASO (Atestado de Saúde Ocupacional)
    const aso = await prisma.aSOControle.findFirst({
      where: {
        funcionarioId: id
      },
      orderBy: { dataVencimento: 'desc' }
    });

    const now = new Date();
    
    // Status helpers
    const checkStatus = (vencimento: Date | null | undefined) => {
      if (!vencimento) return 'INEXISTENTE';
      const diff = Math.floor((vencimento.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diff < 0) return 'VENCIDO';
      if (diff <= 30) return 'VENCENDO';
      return 'OK';
    };

    const asoStatus = checkStatus(aso?.dataVencimento);
    const intStatus = checkStatus(integracao?.dataVencimento);

    let status = 'OK';
    let mensagem = '';

    if (asoStatus === 'VENCIDO') {
      status = 'VENCIDO';
      mensagem = 'ASO Vencido. Realizar novo exame.';
    } else if (asoStatus === 'INEXISTENTE') {
      status = 'INEXISTENTE';
      mensagem = 'Colaborador sem ASO cadastrado.';
    } else if (intStatus === 'VENCIDO') {
      status = 'VENCIDO';
      mensagem = 'Integração com este cliente vencida.';
    } else if (intStatus === 'INEXISTENTE') {
      status = 'INEXISTENTE';
      mensagem = 'Colaborador sem Integração para este cliente.';
    } else if (asoStatus === 'VENCENDO' || intStatus === 'VENCENDO') {
      status = 'VENCENDO';
      mensagem = 'Documentação próxima do vencimento.';
    }

    res.json({
      integracao: {
        existe: !!integracao,
        vencimento: integracao?.dataVencimento,
        status: intStatus
      },
      aso: {
        existe: !!aso,
        tipo: aso?.tipo,
        vencimento: aso?.dataVencimento,
        status: asoStatus
      },
      status, 
      mensagem
    });

  } catch (error) {
    console.error('Verify funcionario error:', error);
    res.status(500).json({ error: 'Failed to verify employee status' });
  }
};

export const deleteEscala = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    await prisma.escala.delete({ where: { id } });

    await registrarLog({
      entidade: 'ESCALA',
      entidadeId: id,
      acao: 'DELETAR',
      descricao: `Escala excluída`,
      usuarioId: req.user?.userId,
      usuarioNome: req.user?.userId,
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete escala error:', error);
    res.status(500).json({ error: 'Failed to delete scale' });
  }
};

// ─── VEICULOS (FROTA) ───────────────────────────────────────────

export const listVeiculos = async (req: AuthRequest, res: Response) => {
  try {
    const list = await prisma.veiculo.findMany({
      orderBy: { placa: 'asc' }
    });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
};

export const createVeiculo = async (req: AuthRequest, res: Response) => {
  try {
    const data = { ...req.body };
    if (data.crlvVencimento) data.crlvVencimento = new Date(data.crlvVencimento);
    if (data.anttVencimento) data.anttVencimento = new Date(data.anttVencimento);
    if (data.tacografoVencimento) data.tacografoVencimento = new Date(data.tacografoVencimento);
    if (data.seguroVencimento) data.seguroVencimento = new Date(data.seguroVencimento);
    if (data.certificacaoLiquidosVencimento) data.certificacaoLiquidosVencimento = new Date(data.certificacaoLiquidosVencimento);

    const veiculo = await prisma.veiculo.create({ data });
    res.status(201).json(veiculo);
  } catch (error) {
    console.error('Create veiculo error:', error);
    res.status(500).json({ error: 'Failed to create vehicle' });
  }
};

export const updateVeiculo = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { nivelCombustivel, ...rest } = req.body;

    if (rest.crlvVencimento) rest.crlvVencimento = new Date(rest.crlvVencimento);
    if (rest.anttVencimento) rest.anttVencimento = new Date(rest.anttVencimento);
    if (rest.tacografoVencimento) rest.tacografoVencimento = new Date(rest.tacografoVencimento);
    if (rest.seguroVencimento) rest.seguroVencimento = new Date(rest.seguroVencimento);
    if (rest.certificacaoLiquidosVencimento) rest.certificacaoLiquidosVencimento = new Date(rest.certificacaoLiquidosVencimento);

    const veiculo = await prisma.veiculo.update({
      where: { id },
      data: {
        ...rest,
        nivelCombustivel: nivelCombustivel !== undefined ? Number(nivelCombustivel) : undefined
      }
    });
    res.json(veiculo);
  } catch (error) {
    console.error('Update veiculo error:', error);
    res.status(500).json({ error: 'Failed to update vehicle' });
  }
};

export const sendToMaintenance = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { descricao, prioridade } = req.body;

    await prisma.veiculo.update({
      where: { id },
      data: { status: 'MANUTENCAO' }
    });

    const manutencao = await prisma.manutencao.create({
      data: {
        veiculoId: id,
        descricao: descricao || 'Enviado da Logística',
        prioridade: prioridade || 'MEDIA',
        status: 'PENDENTE'
      }
    });

    res.status(201).json(manutencao);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send vehicle to maintenance' });
  }
};

export const deleteVeiculo = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.veiculo.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete vehicle' });
  }
};

// ─── T17: Integração GPS (Receber posição e listar frota) ───────

// POST /logistica/gps — Recebe posição de rastreador
export const receberPosicaoGPS = async (req: AuthRequest, res: Response) => {
  try {
    const { veiculoId, placa, latitude, longitude, velocidade, ignicao, timestamp } = req.body;

    // Find vehicle by ID or placa
    let veiculo;
    if (veiculoId) {
      veiculo = await prisma.veiculo.findUnique({ where: { id: veiculoId } });
    } else if (placa) {
      veiculo = await prisma.veiculo.findUnique({ where: { placa: placa.toUpperCase() } });
    }

    if (!veiculo) {
      return res.status(404).json({ error: 'Veículo não encontrado' });
    }

    // Update vehicle with latest position (stored in JSON field or separate model)
    // For now, using status field and kmAtual as lightweight tracking
    const updateData: any = {};
    if (velocidade !== undefined && velocidade > 0) {
      updateData.status = 'EM_USO';
    }

    // Store last position as metadata (future: dedicated GPS model)
    await prisma.veiculo.update({
      where: { id: veiculo.id },
      data: {
        ...updateData,
        updatedAt: new Date()
      }
    });

    // Log GPS event (using audit log for traceability)
    await registrarLog({
      entidade: 'VEICULO',
      entidadeId: veiculo.id,
      acao: 'GPS_UPDATE',
      descricao: `GPS: lat=${latitude}, lng=${longitude}, vel=${velocidade}km/h, ignicao=${ignicao ? 'ON' : 'OFF'}`,
    });

    res.json({
      veiculoId: veiculo.id,
      placa: veiculo.placa,
      posicao: { latitude, longitude, velocidade, ignicao },
      timestamp: timestamp || new Date().toISOString(),
      status: 'received'
    });
  } catch (error: any) {
    console.error('GPS update error:', error);
    res.status(500).json({ error: 'Falha ao registrar posição GPS', details: error.message });
  }
};

// GET /logistica/gps — Listar posições atuais da frota
export const listarPosicoesFrota = async (req: AuthRequest, res: Response) => {
  try {
    const veiculos = await prisma.veiculo.findMany({
      select: {
        id: true,
        placa: true,
        modelo: true,
        marca: true,
        tipo: true,
        tipoEquipamento: true,
        status: true,
        kmAtual: true,
        nivelCombustivel: true,
        updatedAt: true,
      },
      orderBy: { placa: 'asc' }
    });

    res.json({
      total: veiculos.length,
      emUso: veiculos.filter(v => v.status === 'EM_USO').length,
      disponiveis: veiculos.filter(v => v.status === 'DISPONIVEL').length,
      manutencao: veiculos.filter(v => v.status === 'MANUTENCAO').length,
      veiculos,
      atualizadoEm: new Date().toISOString()
    });
  } catch (error) {
    console.error('Listar frota GPS error:', error);
    res.status(500).json({ error: 'Falha ao listar posições da frota' });
  }
};

// ─── DUPLICAR ESCALA ─────────────────────────────────────────────

export const duplicarEscala = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const original = await prisma.escala.findUnique({
      where: { id },
      include: { cliente: true, veiculo: true }
    });

    if (!original) return res.status(404).json({ error: 'Escala não encontrada' });

    // Copy to next day, removing OS link
    const nextDay = new Date(original.data);
    nextDay.setDate(nextDay.getDate() + 1);

    const nova = await prisma.escala.create({
      data: {
        data: nextDay,
        hora: original.hora,
        empresa: original.empresa,
        clienteId: original.clienteId || undefined,
        veiculoId: original.veiculoId || undefined,
        equipamento: original.equipamento,
        funcionarios: original.funcionarios || undefined,
        status: 'AGENDADO',
        tipoAgendamento: original.tipoAgendamento,
        cor: original.cor,
        qtdBicos: original.qtdBicos,
        qtdPessoas: original.qtdPessoas,
        solicitanteNome: original.solicitanteNome,
        solicitanteTelefone: original.solicitanteTelefone,
        turnos: original.turnos,
        observacoes: original.observacoes ? `[Duplicada] ${original.observacoes}` : '[Duplicada]',
        // codigoOS intentionally null — new escala needs new OS
      },
      include: { cliente: true, veiculo: true }
    });

    await registrarLog({
      entidade: 'ESCALA',
      entidadeId: nova.id,
      acao: 'DUPLICAR',
      descricao: `Escala duplicada de ${id} para ${nextDay.toLocaleDateString('pt-BR')}`,
      usuarioId: req.user?.userId,
      usuarioNome: req.user?.userId,
    });

    res.status(201).json(nova);
  } catch (error: any) {
    console.error('Duplicar escala error:', error);
    res.status(500).json({ error: 'Falha ao duplicar escala', details: error.message });
  }
};

// ─── CANCELAR ESCALA COM MOTIVO ──────────────────────────────────

export const cancelarEscala = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { motivoCancelamento } = req.body;

    if (!motivoCancelamento || motivoCancelamento.trim().length < 3) {
      return res.status(400).json({ error: 'Motivo de cancelamento é obrigatório (mínimo 3 caracteres).' });
    }

    const before = await prisma.escala.findUnique({ where: { id } });
    if (!before) return res.status(404).json({ error: 'Escala não encontrada' });

    const escala = await prisma.escala.update({
      where: { id },
      data: {
        status: 'CANCELADA',
        observacoes: before.observacoes
          ? `${before.observacoes} | CANCELADO: ${motivoCancelamento}`
          : `CANCELADO: ${motivoCancelamento}`
      },
      include: { cliente: true, veiculo: true }
    });

    await registrarLog({
      entidade: 'ESCALA',
      entidadeId: id,
      acao: 'CANCELAR',
      descricao: `Escala cancelada. Motivo: ${motivoCancelamento}`,
      valorAnterior: before.status,
      valorNovo: 'CANCELADA',
      usuarioId: req.user?.userId,
      usuarioNome: req.user?.userId,
    });

    res.json(escala);
  } catch (error: any) {
    console.error('Cancelar escala error:', error);
    res.status(500).json({ error: 'Falha ao cancelar escala', details: error.message });
  }
};

// ─── VALIDAR OS POR CÓDIGO (M01) ────────────────────────────────

export const validarOS = async (req: AuthRequest, res: Response) => {
  try {
    const codigo = req.params.codigo as string;
    const result = await validarOSPorCodigo(codigo);
    res.json(result);
  } catch (error) {
    console.error('Validar OS error:', error);
    res.status(500).json({ error: 'Falha ao validar OS' });
  }
};

// ─── QUADRO DE FUNCIONÁRIOS (M02/M05) ───────────────────────────

export const quadroFuncionarios = async (req: AuthRequest, res: Response) => {
  try {
    const { data, clienteId } = req.query;
    const dataRef = data ? new Date(data as string) : new Date();
    const result = await getQuadroFuncionarios(dataRef, clienteId as string | undefined);

    const summary = {
      total: result.length,
      disponiveis: result.filter(f => f.status === 'DISPONIVEL').length,
      escalados: result.filter(f => f.status === 'ESCALADO').length,
      afastados: result.filter(f => f.status === 'AFASTADO' || f.status === 'FERIAS').length,
      pendenciaDoc: result.filter(f => f.status === 'MANUTENCAO_DOC').length,
    };

    res.json({ summary, funcionarios: result });
  } catch (error) {
    console.error('Quadro funcionários error:', error);
    res.status(500).json({ error: 'Falha ao buscar quadro de funcionários' });
  }
};

// ─── QUADRO DE VEÍCULOS (M08) ───────────────────────────────────

export const quadroVeiculos = async (req: AuthRequest, res: Response) => {
  try {
    const { data } = req.query;
    const dataRef = data ? new Date(data as string) : new Date();
    const result = await getQuadroVeiculos(dataRef);

    const summary = {
      total: result.length,
      disponiveis: result.filter(v => v.status === 'DISPONIVEL').length,
      escalados: result.filter(v => v.status === 'ESCALADO').length,
      manutencao: result.filter(v => v.status === 'MANUTENCAO').length,
    };

    res.json({ summary, veiculos: result });
  } catch (error) {
    console.error('Quadro veículos error:', error);
    res.status(500).json({ error: 'Falha ao buscar quadro de veículos' });
  }
};

// ── Gap Analysis 2.4: Registrar "Não Compareceu" com sinalização ao RH ──

export const registrarNaoCompareceu = async (req: AuthRequest, res: Response) => {
  try {
    const escalaId = req.params.id as string;
    const { funcionarioId, funcionarioNome, substitutoId } = req.body;

    if (!funcionarioId || !funcionarioNome) {
      return res.status(400).json({ error: 'funcionarioId e funcionarioNome são obrigatórios.' });
    }

    const escala = await prisma.escala.findUnique({ where: { id: escalaId } });
    if (!escala) return res.status(404).json({ error: 'Escala não encontrada' });

    // Add to naoCompareceu array
    const naoCompareceuList = Array.isArray(escala.naoCompareceu) ? [...(escala.naoCompareceu as any[])] : [];
    naoCompareceuList.push({
      funcionarioId,
      nome: funcionarioNome,
      registradoEm: new Date().toISOString(),
      sinalizadoRH: true,
    });

    // Add substitute to funcionarios if provided
    let funcionarios = Array.isArray(escala.funcionarios) ? [...(escala.funcionarios as any[])] : [];
    if (substitutoId) {
      const substituto = await prisma.funcionario.findUnique({
        where: { id: substitutoId },
        select: { id: true, nome: true, cargo: true }
      });
      if (substituto && !funcionarios.some((f: any) => f.id === substitutoId)) {
        funcionarios.push({ id: substituto.id, nome: substituto.nome, cargo: substituto.cargo, substituto: true });
      }
    }

    await prisma.escala.update({
      where: { id: escalaId },
      data: {
        naoCompareceu: naoCompareceuList,
        funcionarios: funcionarios.length > 0 ? funcionarios : undefined,
      }
    });

    // Signal to RH: Create an afastamento record for unjustified absence
    try {
      await (prisma as any).afastamento.create({
        data: {
          funcionarioId,
          tipo: 'FALTA_INJUSTIFICADA',
          dataInicio: escala.data,
          dataFim: escala.data,
          motivo: `Não compareceu na escala ${escala.codigoOS || escalaId} em ${escala.data.toLocaleDateString('pt-BR')}`,
        }
      });
    } catch (rhErr) {
      console.error('[2.4] Erro ao sinalizar RH:', rhErr);
    }

    await registrarLog({
      entidade: 'ESCALA',
      entidadeId: escalaId,
      acao: 'NAO_COMPARECEU',
      descricao: `${funcionarioNome} não compareceu. ${substitutoId ? 'Substituto adicionado.' : 'Sem substituto.'}`,
      usuarioId: req.user?.userId,
      usuarioNome: req.user?.userId,
    });

    res.json({ success: true, naoCompareceu: naoCompareceuList });
  } catch (error: any) {
    console.error('Registrar não compareceu error:', error);
    res.status(500).json({ error: 'Falha ao registrar não comparecimento', details: error.message });
  }
};

// ── Gap Analysis 2.6: Reverter Cancelamento de Escala ──

export const reverterCancelamentoEscala = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { justificativa } = req.body;

    if (!justificativa || justificativa.trim().length < 3) {
      return res.status(400).json({ error: 'Justificativa para reversão é obrigatória (mínimo 3 caracteres).' });
    }

    const escala = await prisma.escala.findUnique({ where: { id } });
    if (!escala) return res.status(404).json({ error: 'Escala não encontrada' });

    if (escala.status !== 'CANCELADA' && escala.status !== 'CANCELADO') {
      return res.status(400).json({ error: 'Somente escalas canceladas podem ser revertidas.' });
    }

    const updated = await prisma.escala.update({
      where: { id },
      data: {
        status: 'AGENDADO',
        observacoes: escala.observacoes
          ? `${escala.observacoes} | REVERTIDO: ${justificativa}`
          : `REVERTIDO: ${justificativa}`,
      },
      include: { cliente: true, veiculo: true }
    });

    await registrarLog({
      entidade: 'ESCALA',
      entidadeId: id,
      acao: 'REVERTER_CANCELAMENTO',
      descricao: `Escala revertida de CANCELADA para AGENDADO. Justificativa: ${justificativa}`,
      valorAnterior: 'CANCELADA',
      valorNovo: 'AGENDADO',
      usuarioId: req.user?.userId,
      usuarioNome: req.user?.userId,
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Reverter cancelamento escala error:', error);
    res.status(500).json({ error: 'Falha ao reverter cancelamento', details: error.message });
  }
};
