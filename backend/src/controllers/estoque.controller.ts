import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const listProdutos = async (req: AuthRequest, res: Response) => {
  try {
    const { search, categoria, fabricante } = req.query;
    const where: any = {};

    if (search) {
      where.OR = [
        { nome: { contains: search as string, mode: 'insensitive' } },
        { sku: { contains: search as string, mode: 'insensitive' } },
        { fabricante: { contains: search as string, mode: 'insensitive' } },
        { localizacao: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    if (categoria) where.categoria = categoria;
    if (fabricante) where.fabricante = { contains: fabricante as string, mode: 'insensitive' };

    const list = await prisma.produto.findMany({
      where,
      orderBy: { nome: 'asc' }
    });
    res.json(list);
  } catch (error) {
    console.error('List produtos error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

export const createProduto = async (req: AuthRequest, res: Response) => {
  try {
    const { precoCusto, precoVenda, estoqueAtual, estoqueMinimo, ...rest } = req.body;
    const produto = await prisma.produto.create({
      data: {
        ...rest,
        precoCusto: Number(precoCusto) || 0,
        precoVenda: Number(precoVenda) || 0,
        estoqueAtual: Number(estoqueAtual) || 0,
        estoqueMinimo: Number(estoqueMinimo) || 0,
      }
    });
    res.status(201).json(produto);
  } catch (error: any) {
    console.error('Create produto error:', error);
    res.status(500).json({ error: 'Failed to create product', details: error.message });
  }
};

export const updateProduto = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { precoCusto, precoVenda, estoqueAtual, estoqueMinimo, ...rest } = req.body;
    const data: any = { ...rest };
    if (precoCusto !== undefined) data.precoCusto = Number(precoCusto);
    if (precoVenda !== undefined) data.precoVenda = Number(precoVenda);
    if (estoqueAtual !== undefined) data.estoqueAtual = Number(estoqueAtual);
    if (estoqueMinimo !== undefined) data.estoqueMinimo = Number(estoqueMinimo);

    const produto = await prisma.produto.update({ where: { id }, data });
    res.json(produto);
  } catch (error: any) {
    console.error('Update produto error:', error);
    res.status(500).json({ error: 'Failed to update product', details: error.message });
  }
};

export const deleteProduto = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.$transaction(async (tx) => {
      await tx.movimentacaoEstoque.deleteMany({ where: { produtoId: id } });
      await tx.produto.delete({ where: { id } });
    });
    res.status(204).send();
  } catch (error: any) {
    console.error('Delete produto error:', error);
    res.status(500).json({ error: 'Failed to delete product', details: error.message });
  }
};

export const updateEstoque = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { quantidade, tipo, motivo } = req.body; // tipo: ENTRADA ou SAIDA
    const qtd = Number(quantidade) || 0;
    
    const mov = await prisma.$transaction(async (tx) => {
      const produto = await tx.produto.findUnique({ where: { id } });
      if (!produto) throw new Error('Product not found');

      const current = Number(produto.estoqueAtual);
      const novaQtd = tipo === 'ENTRADA' 
        ? current + qtd 
        : current - qtd;

      await tx.produto.update({
        where: { id },
        data: { estoqueAtual: novaQtd }
      });

      return tx.movimentacaoEstoque.create({
        data: {
          produtoId: id,
          quantidade: qtd,
          tipo,
          motivo,
          usuarioId: req.user?.userId || null
        }
      });
    });

    res.json(mov);
  } catch (error) {
    console.error('Update estoque error:', error);
    res.status(500).json({ error: 'Failed to update stock' });
  }
};

// ─── T05: Consumo de materiais por OS (baixa de estoque em lote) ───
export const consumoOS = async (req: AuthRequest, res: Response) => {
  try {
    const { osId, itens } = req.body;
    // itens: [{ produtoId, quantidade }]

    if (!osId || !Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ error: 'Informe osId e ao menos um item para consumo' });
    }

    // Buscar código da OS para referência
    const os = await prisma.ordemServico.findUnique({
      where: { id: osId },
      select: { codigo: true }
    });
    if (!os) return res.status(404).json({ error: 'OS não encontrada' });

    const movimentacoes = await prisma.$transaction(async (tx) => {
      const results: any[] = [];

      for (const item of itens) {
        const produto = await tx.produto.findUnique({ where: { id: item.produtoId } });
        if (!produto) throw new Error(`Produto ${item.produtoId} não encontrado`);

        const qtd = Number(item.quantidade) || 0;
        if (qtd <= 0) throw new Error(`Quantidade inválida para ${produto.nome}`);

        const current = Number(produto.estoqueAtual);
        const novaQtd = current - qtd;
        // Permitir negativo mas logar warning
        if (novaQtd < 0) {
          console.warn(`⚠️ Estoque negativo para ${produto.nome}: ${novaQtd}`);
        }

        await tx.produto.update({
          where: { id: item.produtoId },
          data: { estoqueAtual: novaQtd }
        });

        const mov = await tx.movimentacaoEstoque.create({
          data: {
            produtoId: item.produtoId,
            quantidade: qtd,
            tipo: 'SAIDA',
            motivo: `USO_EM_OS - ${os.codigo}`,
            usuarioId: req.user?.userId || null
          }
        });
        results.push({ ...mov, produtoNome: produto.nome, estoqueAnterior: current, estoqueNovo: novaQtd });
      }

      return results;
    });

    res.status(201).json({
      osId,
      osCodigo: os.codigo,
      movimentacoes,
      totalItens: movimentacoes.length
    });
  } catch (error: any) {
    console.error('Consumo OS error:', error);
    res.status(500).json({ error: 'Falha ao registrar consumo de materiais', details: error.message });
  }
};

// ─── T06: Alertas de estoque mínimo ───
export const getAlertasEstoque = async (req: AuthRequest, res: Response) => {
  try {
    const allProducts = await prisma.produto.findMany({
      where: { estoqueMinimo: { gt: 0 } },
      orderBy: { estoqueAtual: 'asc' }
    });

    const produtosEmAlerta = allProducts.filter(p => Number(p.estoqueAtual) <= Number(p.estoqueMinimo));

    const result = produtosEmAlerta.map(p => {
      const atual = Number(p.estoqueAtual);
      const minimo = Number(p.estoqueMinimo);
      const percentual = minimo > 0 ? (atual / minimo) * 100 : 0;
      return {
        ...p,
        percentualEstoque: Math.round(percentual),
        status: atual <= 0 ? 'ESGOTADO' : atual <= minimo * 0.5 ? 'CRITICO' : 'BAIXO',
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Alertas estoque error:', error);
    res.status(500).json({ error: 'Falha ao buscar alertas de estoque' });
  }
};

// ─── Histórico de movimentações ───
export const getMovimentacoes = async (req: AuthRequest, res: Response) => {
  try {
    const produtoId = req.params.id as string;
    const movs = await prisma.movimentacaoEstoque.findMany({
      where: { produtoId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(movs);
  } catch (error) {
    console.error('Get movimentacoes error:', error);
    res.status(500).json({ error: 'Failed to fetch movements' });
  }
};
