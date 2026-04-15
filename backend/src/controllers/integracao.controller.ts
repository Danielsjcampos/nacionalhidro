import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// ----------------------------------------------------------------------
// GESTÃO DE INTEGRAÇÕES (VISÃO GLOBAL / DASHBOARD)
// ----------------------------------------------------------------------

export const getAllIntegracoes = async (req: AuthRequest, res: Response) => {
  try {
    const { clienteId, status, busca } = req.query;

    const where: any = {};
    if (clienteId) where.clienteId = clienteId as string;
    if (status) where.status = status as string;
    if (busca) {
      where.funcionario = {
        nome: { contains: busca as string, mode: 'insensitive' }
      };
    }

    const integracoes = await prisma.integracaoCliente.findMany({
      where,
      include: {
        cliente: { select: { id: true, nome: true, prazoIntegracao: true } },
        funcionario: { select: { id: true, nome: true, cpf: true, cargo: true } }
      },
      orderBy: { dataVencimento: 'asc' }
    });

    res.json(integracoes);
  } catch (error) {
    console.error('Error fetching all integracoes:', error);
    res.status(500).json({ error: 'Erro ao buscar painel de integrações' });
  }
};

export const getIntegracoesAlertas = async (req: AuthRequest, res: Response) => {
  try {
    const hoje = new Date();
    const trintaDiasDepois = new Date();
    trintaDiasDepois.setDate(hoje.getDate() + 30);

    const alertas = await prisma.integracaoCliente.findMany({
      where: {
        OR: [
          { dataVencimento: { lte: trintaDiasDepois, gte: hoje } }, // Vencendo em 30 dias
          { status: 'VENCIDO' },
          { dataVencimento: { lt: hoje } }
        ]
      },
      include: {
        cliente: { select: { id: true, nome: true } },
        funcionario: { select: { id: true, nome: true, cargo: true } }
      },
      orderBy: { dataVencimento: 'asc' }
    });

    res.json(alertas);
  } catch (error) {
    console.error('Error fetching integracao alerts:', error);
    res.status(500).json({ error: 'Erro ao buscar alertas de integração' });
  }
};

// ----------------------------------------------------------------------
// GESTÃO DE INTEGRAÇÕES DO FUNCIONÁRIO (CRUD)
// ----------------------------------------------------------------------

export const getIntegracoesByFuncionario = async (req: AuthRequest, res: Response) => {
  try {
    const funcionarioId = req.params.funcionarioId as string;
    
    const integracoes = await prisma.integracaoCliente.findMany({
      where: { funcionarioId },
      include: {
        cliente: { select: { id: true, nome: true, razaoSocial: true, documento: true, prazoIntegracao: true } }
      },
      orderBy: { dataVencimento: 'desc' }
    });
    
    res.json(integracoes);
  } catch (error) {
    console.error('Error fetching integracoes:', error);
    res.status(500).json({ error: 'Erro ao buscar integrações do funcionário' });
  }
};

export const createIntegracao = async (req: AuthRequest, res: Response) => {
  try {
    const { funcionarioId, clienteId, nome, dataEmissao, dataVencimento, observacoes, arquivoUrl, status } = req.body;

    // Se não informou validade, pega do cliente
    let vencimentoFinal = dataVencimento ? new Date(dataVencimento) : null;
    
    if (!vencimentoFinal) {
      const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
      const diasValidade = cliente?.prazoIntegracao || 365;
      vencimentoFinal = new Date(dataEmissao);
      vencimentoFinal.setDate(vencimentoFinal.getDate() + diasValidade);
    }

    const novaIntegracao = await prisma.integracaoCliente.create({
      data: {
        funcionarioId,
        clienteId,
        nome: nome || 'Integração',
        dataEmissao: new Date(dataEmissao),
        dataVencimento: vencimentoFinal,
        status: status || 'VALIDO',
        observacoes,
        arquivoUrl
      },
      include: {
        cliente: { select: { id: true, nome: true } }
      }
    });

    res.status(201).json(novaIntegracao);
  } catch (error) {
    console.error('Error creating integracao:', error);
    res.status(500).json({ error: 'Erro ao criar integração' });
  }
};

export const confirmarPresenca = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    
    // Buscar a integração atual para saber quem é o cliente
    const integracao = await prisma.integracaoCliente.findUnique({
      where: { id },
      include: { cliente: true }
    });

    if (!integracao) {
      return res.status(404).json({ error: 'Integração não encontrada' });
    }

    const dataEmissao = new Date();
    const diasValidade = integracao.cliente?.prazoIntegracao || 365;
    const dataVencimento = new Date();
    dataVencimento.setDate(dataVencimento.getDate() + diasValidade);

    const integracaoConfirmada = await prisma.integracaoCliente.update({
      where: { id },
      data: {
        status: 'VALIDO',
        dataEmissao,
        dataVencimento,
        observacoes: `${integracao.observacoes || ''}\n[Sistema] Presença confirmada em ${dataEmissao.toLocaleString('pt-BR')}`.trim()
      }
    });

    res.json(integracaoConfirmada);
  } catch (error) {
    console.error('Error confirming presence:', error);
    res.status(500).json({ error: 'Erro ao confirmar presença na integração' });
  }
};

export const updateIntegracao = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { nome, dataEmissao, dataVencimento, status, observacoes, arquivoUrl, clienteId } = req.body;

    const dataToUpdate: any = {
      ...(nome && { nome }),
      ...(dataEmissao && { dataEmissao: new Date(dataEmissao) }),
      ...(dataVencimento && { dataVencimento: new Date(dataVencimento) }),
      ...(status && { status }),
      observacoes,
      arquivoUrl
    };

    if (clienteId) dataToUpdate.clienteId = clienteId;

    const integracaoAtualizada = await prisma.integracaoCliente.update({
      where: { id },
      data: dataToUpdate,
      include: {
        cliente: { select: { id: true, nome: true } }
      }
    });

    res.json(integracaoAtualizada);
  } catch (error) {
    console.error('Error updating integracao:', error);
    res.status(500).json({ error: 'Erro ao atualizar integração' });
  }
};

export const deleteIntegracao = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.integracaoCliente.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting integracao:', error);
    res.status(500).json({ error: 'Erro ao deletar integração' });
  }
};

// ----------------------------------------------------------------------
// GESTÃO DAS INTEGRAÇÕES EXIGIDAS NO CADASTRO DE CLIENTES
// ----------------------------------------------------------------------

export const getOpcoesIntegracaoCliente = async (req: AuthRequest, res: Response) => {
  try {
    const clienteId = req.params.clienteId as string;
    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
      select: { integracoesExigidas: true, categoriasExigidas: true, prazoIntegracao: true }
    });

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    res.json(cliente);
  } catch (error) {
    console.error('Error fetching opcoes integracao:', error);
    res.status(500).json({ error: 'Erro ao buscar opções de integração do cliente' });
  }
};

export const updateOpcoesIntegracaoCliente = async (req: AuthRequest, res: Response) => {
  try {
    const clienteId = req.params.clienteId as string;
    const { integracoesExigidas, categoriasExigidas, prazoIntegracao } = req.body; 

    const clienteAtualizado = await prisma.cliente.update({
      where: { id: clienteId },
      data: { 
        integracoesExigidas,
        categoriasExigidas,
        prazoIntegracao: prazoIntegracao ? parseInt(prazoIntegracao) : undefined
      }
    });

    res.json(clienteAtualizado);
  } catch (error) {
    console.error('Error updating opcoes integracao:', error);
    res.status(500).json({ error: 'Erro ao atualizar opções de integração do cliente' });
  }
};
export const getIntegracoesPendentes = async (req: AuthRequest, res: Response) => {
  try {
    // 1. Buscar todos os clientes que têm exigências configuradas
    const clientesExigentes = await prisma.cliente.findMany({
      where: {
        OR: [
          { integracoesExigidas: { not: null } },
          { categoriasExigidas: { not: null } }
        ]
      },
      select: { id: true, nome: true, integracoesExigidas: true, categoriasExigidas: true }
    });

    // 2. Buscar todos os funcionários ativos (e sua categoria)
    const funcionariosAtivos = await prisma.funcionario.findMany({
      where: { status: 'ATIVO' },
      select: { id: true, nome: true, categoria: true, cargo: true }
    });

    // 3. Buscar todas as integrações atuais do sistema para cruzamento rápido
    const integracoesExistentes = await prisma.integracaoCliente.findMany({
      where: { status: 'VALIDO', dataVencimento: { gt: new Date() } },
      select: { funcionarioId: true, clienteId: true, nome: true }
    });

    // 4. Buscar ASOS recentes para verificação de saúde ocupacional
    const asosRecentes = await prisma.aSOControle.findMany({
      where: { dataVencimento: { gt: new Date() } },
      select: { funcionarioId: true, dataVencimento: true, tipo: true }
    });

    const pendencias: any[] = [];

    for (const cliente of clientesExigentes) {
      const integraExigidas = Array.isArray(cliente.integracoesExigidas) ? (cliente.integracoesExigidas as string[]) : [];
      const catsExigidas = Array.isArray(cliente.categoriasExigidas) ? (cliente.categoriasExigidas as string[]) : [];

      if (integraExigidas.length === 0 && catsExigidas.length === 0) continue;

      // Filtrar funcionários que pertencem às categorias exigidas deste cliente ou se não houver filtro de categoria, todos alvos
      const funcionariosAlvo = funcionariosAtivos.filter(f => 
        (catsExigidas.length === 0) || (f.categoria && catsExigidas.includes(f.categoria))
      );

      for (const funcionario of funcionariosAlvo) {
        // Checar ASO (Sempre obrigatório para qualquer categoria em campo)
        const temAsoValido = asosRecentes.some(a => a.funcionarioId === funcionario.id);
        if (!temAsoValido) {
          pendencias.push({
            funcionarioId: funcionario.id,
            funcionarioNome: funcionario.nome,
            funcionarioCargo: funcionario.cargo,
            funcionarioCategoria: funcionario.categoria,
            clienteId: cliente.id,
            clienteNome: cliente.nome,
            documentoFaltante: 'ASO (Atestado Saúde Ocupacional)',
            motivo: '⚠ Saúde Ocupacional Vencida ou Ausente. Bloqueio obrigatório por Segurança do Trabalho.'
          });
        }

        for (const exigencia of integraExigidas) {
          // Verificar se o funcionário tem essa integração para este cliente
          const possui = integracoesExistentes.find(i => 
            i.funcionarioId === funcionario.id && 
            i.clienteId === cliente.id && 
            i.nome.toLowerCase() === exigencia.toLowerCase()
          );

          if (!possui) {
            pendencias.push({
              funcionarioId: funcionario.id,
              funcionarioNome: funcionario.nome,
              funcionarioCargo: funcionario.cargo,
              funcionarioCategoria: funcionario.categoria,
              clienteId: cliente.id,
              clienteNome: cliente.nome,
              documentoFaltante: exigencia,
              motivo: `Categoria ${funcionario.categoria} exige ${exigencia} para este cliente.`
            });
          }
        }
      }
    }

    res.json(pendencias);
  } catch (error) {
    console.error('Error fetching integration gaps:', error);
    res.status(500).json({ error: 'Erro ao calcular pendências de conformidade' });
  }
};
