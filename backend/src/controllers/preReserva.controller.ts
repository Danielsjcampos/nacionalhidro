import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// ─── LISTAR PRÉ-RESERVAS ────────────────────────────────────────
export const listPreReservas = async (req: AuthRequest, res: Response) => {
  try {
    const { status, clienteId, dataInicio, dataFim } = req.query;
    const where: any = {
      tipoAgendamento: 'PRE_AGENDADO',
    };

    if (status === 'pendentes') {
      where.status = { in: ['AGENDADO'] };
    } else if (status === 'confirmadas') {
      where.tipoAgendamento = 'CONFIRMADO';
    } else if (status === 'canceladas') {
      where.status = 'CANCELADO';
    }

    if (clienteId) where.clienteId = clienteId;

    if (dataInicio || dataFim) {
      where.data = {};
      if (dataInicio) where.data.gte = new Date(dataInicio as string);
      if (dataFim) where.data.lte = new Date(dataFim as string);
    }

    const reservas = await prisma.escala.findMany({
      where,
      include: {
        cliente: { select: { id: true, nome: true, razaoSocial: true } },
        veiculo: { select: { id: true, placa: true, modelo: true, tipoEquipamento: true, status: true } },
      },
      orderBy: { data: 'asc' },
    });

    // Enrich with days until the reservation
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const enriched = reservas.map(r => {
      const dataReserva = new Date(r.data);
      dataReserva.setHours(0, 0, 0, 0);
      const diasAte = Math.ceil((dataReserva.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      return { ...r, diasAte };
    });

    res.json(enriched);
  } catch (error) {
    console.error('List pre-reservas error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Falha ao buscar pré-reservas' } });
  }
};

// ─── CRIAR PRÉ-RESERVA ──────────────────────────────────────────
export const createPreReserva = async (req: AuthRequest, res: Response) => {
  try {
    const { veiculoId, clienteId, data, dataFim, hora, equipamento,
      solicitanteNome, solicitanteTelefone, qtdBicos, turnos, qtdPessoas, observacoes } = req.body;

    if (!data) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Data é obrigatória' } });
    }
    if (!veiculoId && !equipamento) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Veículo ou Equipamento é obrigatório' } });
    }

    // Check availability if veiculoId given
    if (veiculoId) {
      const targetDate = new Date(data);
      const targetEnd = dataFim ? new Date(dataFim) : targetDate;

      const conflict = await prisma.escala.findFirst({
        where: {
          veiculoId,
          status: { not: 'CANCELADO' },
          OR: [
            { data: { gte: targetDate, lte: targetEnd } },
            { dataFim: { gte: targetDate, lte: targetEnd } },
            { data: { lte: targetDate }, dataFim: { gte: targetEnd } },
          ],
        },
      });

      if (conflict) {
        return res.status(409).json({
          error: {
            code: 'CONFLICT',
            message: 'Veículo já possui agendamento nesta data',
            conflictId: conflict.id,
          },
        });
      }
    }

    const escala = await prisma.escala.create({
      data: {
        veiculoId: veiculoId || undefined,
        clienteId: clienteId || undefined,
        data: new Date(data),
        dataFim: dataFim ? new Date(dataFim) : undefined,
        hora: hora || undefined,
        equipamento: equipamento || undefined,
        tipoAgendamento: 'PRE_AGENDADO',
        status: 'AGENDADO',
        solicitanteNome: solicitanteNome || undefined,
        solicitanteTelefone: solicitanteTelefone || undefined,
        qtdBicos: qtdBicos || 1,
        turnos: turnos || 'DIURNO',
        qtdPessoas: qtdPessoas || undefined,
        observacoes: observacoes || undefined,
      },
      include: {
        cliente: { select: { nome: true } },
        veiculo: { select: { placa: true, modelo: true } },
      },
    });

    res.status(201).json(escala);
  } catch (error: any) {
    console.error('Create pre-reserva error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Falha ao criar pré-reserva', details: error.message } });
  }
};

// ─── CONFIRMAR PRÉ-RESERVA → CONFIRMADO ─────────────────────────
export const confirmarPreReserva = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { clienteId, veiculoId, codigoOS } = req.body;

    const escala = await prisma.escala.findUnique({ where: { id } });
    if (!escala) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Pré-reserva não encontrada' } });
    if (escala.tipoAgendamento === 'CONFIRMADO') {
      return res.status(400).json({ error: { code: 'ALREADY_CONFIRMED', message: 'Já confirmado' } });
    }

    const updated = await prisma.escala.update({
      where: { id },
      data: {
        tipoAgendamento: 'CONFIRMADO',
        clienteId: clienteId || escala.clienteId,
        veiculoId: veiculoId || escala.veiculoId,
        codigoOS: codigoOS || escala.codigoOS,
      },
      include: {
        cliente: { select: { nome: true } },
        veiculo: { select: { placa: true, modelo: true } },
      },
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Confirmar pre-reserva error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Falha ao confirmar', details: error.message } });
  }
};

// ─── CANCELAR PRÉ-RESERVA ───────────────────────────────────────
export const cancelarPreReserva = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { motivo } = req.body;

    const updated = await prisma.escala.update({
      where: { id },
      data: {
        status: 'CANCELADO',
        observacoes: motivo ? `CANCELADO: ${motivo}` : 'Pré-reserva cancelada',
      },
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Cancelar pre-reserva error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Falha ao cancelar', details: error.message } });
  }
};

// ─── CHECK DISPONIBILIDADE ──────────────────────────────────────
export const checkDisponibilidade = async (req: AuthRequest, res: Response) => {
  try {
    const { data, dataFim, equipamentoTipo } = req.query;

    if (!data) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Data é obrigatória' } });
    }

    const targetDate = new Date(data as string);
    const targetEnd = dataFim ? new Date(dataFim as string) : targetDate;

    // Vehicles already booked
    const escalasNoPeriodo = await prisma.escala.findMany({
      where: {
        status: { not: 'CANCELADO' },
        OR: [
          { data: { gte: targetDate, lte: targetEnd } },
          { dataFim: { gte: targetDate, lte: targetEnd } },
          { data: { lte: targetDate }, dataFim: { gte: targetEnd } },
        ],
      },
      select: { veiculoId: true, tipoAgendamento: true, cliente: { select: { nome: true } } },
    });

    const veiculosOcupados = new Set(escalasNoPeriodo.map(e => e.veiculoId).filter(Boolean));

    // All active vehicles
    const whereVeiculo: any = {
      status: { not: 'MANUTENCAO' },
    };
    if (equipamentoTipo) {
      whereVeiculo.tipoEquipamento = equipamentoTipo as string;
    }

    const todosVeiculos = await prisma.veiculo.findMany({
      where: whereVeiculo,
      orderBy: { placa: 'asc' },
      select: {
        id: true, placa: true, modelo: true, marca: true, tipoEquipamento: true, status: true,
      },
    });

    const disponiveis = todosVeiculos.filter(v => !veiculosOcupados.has(v.id));
    const ocupados = todosVeiculos.filter(v => veiculosOcupados.has(v.id));

    // Manutenções
    const emManutencao = await prisma.veiculo.findMany({
      where: { status: 'MANUTENCAO' },
      select: { id: true, placa: true, modelo: true, tipoEquipamento: true },
    });

    res.json({
      data: targetDate.toISOString(),
      disponiveis,
      ocupados,
      emManutencao,
      resumo: {
        totalDisponiveis: disponiveis.length,
        totalOcupados: ocupados.length,
        totalManutencao: emManutencao.length,
      },
    });
  } catch (error) {
    console.error('Check disponibilidade error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Falha ao verificar disponibilidade' } });
  }
};
