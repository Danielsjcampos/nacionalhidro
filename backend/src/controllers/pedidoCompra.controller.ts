import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const listPedidos = async (req: Request, res: Response) => {
  try {
    const pedidos = await prisma.pedidoCompra.findMany({
      include: {
        solicitante: { select: { id: true, name: true, email: true } },
        fornecedor: { select: { id: true, nome: true, razaoSocial: true } },
        itens: true,
        contaPagar: { select: { id: true, status: true } },
      },
      orderBy: { dataEmissao: 'desc' },
    });
    res.json(pedidos);
  } catch (error) {
    console.error('Erro ao listar pedidos de compra:', error);
    res.status(500).json({ error: 'Erro ao listar pedidos' });
  }
};

export const createPedido = async (req: Request, res: Response) => {
  try {
    // req.user from JWT auth middleware usually holds the logged-in user details
    const solicitanteId = (req as any).user?.id || req.body.solicitanteId; 
    const { fornecedorId, observacoes, dataVencimentoPrevisto, itens } = req.body;

    if (!solicitanteId || !fornecedorId || !itens || !itens.length) {
      return res.status(400).json({ error: 'Dados obrigatórios faltando (Solicitante, Fornecedor ou Itens)' });
    }

    const valorTotal = itens.reduce((acc: number, item: any) => acc + (Number(item.quantidade) * Number(item.valorUnitario)), 0);

    const pedido = await prisma.pedidoCompra.create({
      data: {
        solicitanteId,
        fornecedorId,
        observacoes,
        dataVencimentoPrevisto: dataVencimentoPrevisto ? new Date(dataVencimentoPrevisto) : undefined,
        valorTotal,
        itens: {
          create: itens.map((item: any) => ({
            descricao: item.descricao,
            quantidade: parseInt(item.quantidade),
            valorUnitario: parseFloat(item.valorUnitario),
            valorTotal: parseInt(item.quantidade) * parseFloat(item.valorUnitario),
          })),
        },
      },
      include: { itens: true, solicitante: true, fornecedor: true },
    });

    res.status(201).json(pedido);
  } catch (error) {
    console.error('Erro ao criar pedido de compra:', error);
    res.status(500).json({ error: 'Erro ao criar pedido' });
  }
};

export const approvePedido = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { status } = req.body; // PENDENTE, APROVADO, REPROVADO

    const pedido = await prisma.pedidoCompra.findUnique({
      where: { id },
      include: { fornecedor: true }
    });

    if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado' });

    // Atualiza o status
    const updatedPedido = await prisma.pedidoCompra.update({
      where: { id },
      data: { status }
    });

    // Se APROVADO, criar registro na tabela Contas a Pagar
    if (status === 'APROVADO' && !pedido.contaPagarId) {
      const novaContaPagar = await prisma.contaPagar.create({
        data: {
          descricao: `Pedido de Compra #${pedido.numero}`,
          fornecedorId: pedido.fornecedorId,
          categoria: 'MATERIAL', // Ou 'OUTROS'
          valorOriginal: pedido.valorTotal,
          valorTotal: pedido.valorTotal,
          dataVencimento: pedido.dataVencimentoPrevisto || new Date(),
          status: 'PENDENTE'
        }
      });

      // Vincular a nova conta a pagar ao pedido
      await prisma.pedidoCompra.update({
        where: { id },
        data: { contaPagarId: novaContaPagar.id }
      });
    }

    // Retorna pedido atualizado (o include contaPagar é pego numa busca final para atualizar a interface)
    const finalPedido = await prisma.pedidoCompra.findUnique({
      where: { id },
      include: { contaPagar: true }
    });

    res.json(finalPedido);
  } catch (error) {
    console.error('Erro ao atualizar pedido:', error);
    res.status(500).json({ error: 'Erro ao atualizar pedido' });
  }
};

export const deletePedido = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const pedido = await prisma.pedidoCompra.findUnique({ where: { id } });
    
    if (pedido?.contaPagarId) {
      // Deleta a conta a pagar associada primeiro
      await prisma.contaPagar.delete({ where: { id: pedido.contaPagarId } });
    }

    await prisma.pedidoCompra.delete({ where: { id } });
    res.json({ message: 'Pedido de compra removido com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar pedido:', error);
    res.status(500).json({ error: 'Erro ao deletar pedido' });
  }
};
