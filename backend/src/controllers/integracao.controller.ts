import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// ----------------------------------------------------------------------
// GESTÃO DE INTEGRAÇÕES DO FUNCIONÁRIO
// ----------------------------------------------------------------------

export const getIntegracoesByFuncionario = async (req: AuthRequest, res: Response) => {
  try {
    const funcionarioId = req.params.funcionarioId as string;
    
    const integracoes = await prisma.integracaoCliente.findMany({
      where: { funcionarioId },
      include: {
        cliente: {
          select: { id: true, nome: true, razaoSocial: true, documento: true }
        }
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
    const { funcionarioId, clienteId, nome, dataEmissao, dataVencimento, observacoes, arquivoUrl } = req.body;

    const novaIntegracao = await prisma.integracaoCliente.create({
      data: {
        funcionarioId,
        clienteId,
        nome,
        dataEmissao: new Date(dataEmissao),
        dataVencimento: new Date(dataVencimento),
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

export const updateIntegracao = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { nome, dataEmissao, dataVencimento, observacoes, arquivoUrl, clienteId } = req.body;

    const dataToUpdate: any = {
      ...(nome && { nome }),
      ...(dataEmissao && { dataEmissao: new Date(dataEmissao) }),
      ...(dataVencimento && { dataVencimento: new Date(dataVencimento) }),
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
      select: { integracoesExigidas: true }
    });

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    res.json(cliente.integracoesExigidas || []);
  } catch (error) {
    console.error('Error fetching opcoes integracao:', error);
    res.status(500).json({ error: 'Erro ao buscar opções de integração do cliente' });
  }
};

export const updateOpcoesIntegracaoCliente = async (req: AuthRequest, res: Response) => {
  try {
    const clienteId = req.params.clienteId as string;
    const { integracoesExigidas } = req.body; 
    // integracoesExigidas deve ser um array de strings. Ex: ["NR-35", "Integração Ambev"]

    const clienteAtualizado = await prisma.cliente.update({
      where: { id: clienteId },
      data: { integracoesExigidas }
    });

    res.json(clienteAtualizado.integracoesExigidas);
  } catch (error) {
    console.error('Error updating opcoes integracao:', error);
    res.status(500).json({ error: 'Erro ao atualizar opções de integração do cliente' });
  }
};
