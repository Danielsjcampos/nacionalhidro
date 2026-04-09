import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// ─── HELPER: Auto-criar Conta a Pagar para Manutenção concluída ─────
async function autoCreateContaPagarManutencao(manutencao: any): Promise<void> {
    const valorTotal = Number(manutencao.valorTotal || 0);
    if (valorTotal <= 0) return;

    // Buscar placa do veículo para a descrição
    let placaVeiculo = 'Equipamento';
    if (manutencao.veiculoId) {
        try {
            const veiculo = await prisma.veiculo.findUnique({
                where: { id: manutencao.veiculoId },
                select: { placa: true, modelo: true }
            });
            if (veiculo) placaVeiculo = `${veiculo.placa || ''} ${veiculo.modelo || ''}`.trim();
        } catch (_) { /* ignore */ }
    }

    // Verificar se já existe ContaPagar para esta manutenção (evitar duplicatas)
    const existing = await (prisma as any).contaPagar.findFirst({
        where: {
            observacoes: { contains: manutencao.id },
            categoria: 'MANUTENCAO'
        }
    });
    if (existing) return;

    // Buscar planoContas para manutenção
    let planoContasId: string | undefined;
    try {
        const planoConta = await (prisma as any).planoContas.findFirst({
            where: { OR: [{ nome: { contains: 'Manutenção' } }, { nome: { contains: 'Manutencao' } }, { codigo: '2.1.04' }] }
        });
        if (planoConta) planoContasId = planoConta.id;
    } catch (_) { /* ignore */ }

    await (prisma as any).contaPagar.create({
        data: {
            descricao: `Manutenção ${manutencao.tipo || 'Geral'} - ${placaVeiculo} - ${manutencao.descricao || ''}`.trim(),
            categoria: 'MANUTENCAO',
            valorOriginal: valorTotal,
            saldoDevedor: valorTotal,
            dataVencimento: new Date(new Date().setDate(new Date().getDate() + 30)),
            centroCusto: placaVeiculo,
            planoContasId: planoContasId || undefined,
            status: 'ABERTO',
            observacoes: `Gerado automaticamente - Manutenção ID: ${manutencao.id}`,
        },
    });
}

export const listManutencoes = async (req: AuthRequest, res: Response) => {
  try {
    const list = await prisma.manutencao.findMany({
      include: {
        veiculo: true,
        os: { include: { cliente: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch maintenance records' });
  }
};

export const createManutencao = async (req: AuthRequest, res: Response) => {
  try {
    const { ultimaRevisao, proximaRevisao, ...rest } = req.body;
    
    // Se estiver vinculando a um veículo, atualiza o status do veículo para MANUTENCAO
    if (rest.veiculoId) {
      await prisma.veiculo.update({
        where: { id: rest.veiculoId },
        data: { status: 'MANUTENCAO' }
      });
    }

    const manutencao = await prisma.manutencao.create({
      data: {
        ...rest,
        ultimaRevisao: ultimaRevisao ? new Date(ultimaRevisao) : undefined,
        proximaRevisao: proximaRevisao ? new Date(proximaRevisao) : undefined
      }
    });

    res.status(201).json(manutencao);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create maintenance record' });
  }
};

export const updateManutencao = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const {
      ultimaRevisao, proximaRevisao, status, custoPecas, custoMaoObra,
      pecasUtilizadas, // [{ produtoId, quantidade, valorUnitario }]
      ...rest
    } = req.body;
    
    // Auto-calcular custoPecas se peças foram informadas
    let custoPecasFinal = Number(custoPecas) || 0;
    if (Array.isArray(pecasUtilizadas) && pecasUtilizadas.length > 0) {
      custoPecasFinal = pecasUtilizadas.reduce((sum: number, p: any) => {
        return sum + (Number(p.quantidade) || 0) * (Number(p.valorUnitario) || 0);
      }, 0);
    }

    const valorTotal = custoPecasFinal + (Number(custoMaoObra) || 0);

    const manutencao = await prisma.manutencao.update({
      where: { id },
      data: {
        ...rest,
        status,
        custoPecas: custoPecasFinal,
        custoMaoObra: custoMaoObra !== undefined ? Number(custoMaoObra) : undefined,
        valorTotal,
        ultimaRevisao: ultimaRevisao ? new Date(ultimaRevisao) : undefined,
        proximaRevisao: proximaRevisao ? new Date(proximaRevisao) : undefined
      }
    });

    // Se a manutenção for concluída e tiver valor, gera transação financeira + conta a pagar
    if (status === 'CONCLUIDA' && valorTotal > 0) {
      await prisma.transacaoFinanceira.create({
        data: {
          tipo: 'DESPESA',
          categoria: 'MANUTENCAO',
          valor: valorTotal,
          descricao: `Manutencao veiculo ID: ${manutencao.veiculoId || 'Equip'}`,
          data: new Date(),
          status: 'PENDENTE'
        }
      });

      // ── Auto-criar Conta a Pagar vinculada à manutenção ──
      try {
        await autoCreateContaPagarManutencao(manutencao);
      } catch (cpErr) {
        console.error('Auto-create ContaPagar for manutencao error:', cpErr);
      }

      // ── Baixa de Estoque: registrar peças utilizadas ──
      if (Array.isArray(pecasUtilizadas) && pecasUtilizadas.length > 0) {
        for (const peca of pecasUtilizadas) {
          const produto = await prisma.produto.findUnique({ where: { id: peca.produtoId } });
          if (!produto) continue;

          const qtd = Number(peca.quantidade) || 0;
          if (qtd <= 0) continue;

          // Criar registro de PecaManutencao
          await (prisma as any).pecaManutencao.create({
            data: {
              manutencaoId: id,
              produtoId: peca.produtoId,
              descricao: produto.nome,
              quantidade: qtd,
              valorUnitario: Number(peca.valorUnitario) || Number(produto.precoCusto),
              valorTotal: qtd * (Number(peca.valorUnitario) || Number(produto.precoCusto)),
              unidade: produto.unidadeMedida || 'UN',
            }
          });

          // Decrementar estoque
          const novaQtd = produto.estoqueAtual - qtd;
          await prisma.produto.update({
            where: { id: peca.produtoId },
            data: { estoqueAtual: novaQtd }
          });

          await prisma.movimentacaoEstoque.create({
            data: {
              produtoId: peca.produtoId,
              quantidade: qtd,
              tipo: 'SAIDA',
              motivo: `USO_EM_MANUTENCAO - ${manutencao.id}`
            }
          });

          if (novaQtd < 0) {
            console.warn(`⚠️ Estoque negativo para ${produto.nome}: ${novaQtd} (Manutenção ${id})`);
          }
        }
        console.log(`🔧 Baixa de estoque: ${pecasUtilizadas.length} peças para Manutenção ${id}`);
      }

      // Libera o veículo automaticamente se for conclusão
      if (manutencao.veiculoId) {
        await prisma.veiculo.update({
          where: { id: manutencao.veiculoId },
          data: { status: 'DISPONIVEL' }
        });
      }
    }

    res.json(manutencao);
  } catch (error) {
    console.error('Update manutencao error:', error);
    res.status(500).json({ error: 'Failed to update maintenance record' });
  }
};

export const liberarVeiculo = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const manutencao = await prisma.manutencao.findUnique({ where: { id } });

    if (manutencao?.veiculoId) {
      await prisma.veiculo.update({
        where: { id: manutencao.veiculoId },
        data: { status: 'DISPONIVEL' }
      });
      
      const updated = await prisma.manutencao.update({
        where: { id },
        data: { status: 'CONCLUIDA' }
      });

      // ── Auto-criar Conta a Pagar ao liberar veículo ──
      try {
        await autoCreateContaPagarManutencao(updated);
      } catch (cpErr) {
        console.error('Auto-create ContaPagar on liberarVeiculo error:', cpErr);
      }
    }

    res.json({ message: 'Vehicle released to fleet' });
  } catch (error) {
    console.error('Liberar veiculo error:', error);
    res.status(500).json({ error: 'Failed to release vehicle' });
  }
};

export const deleteManutencao = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.manutencao.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete maintenance record' });
  }
};
