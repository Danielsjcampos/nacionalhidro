import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { registrarLog } from '../lib/auditLog';
import { gerarPdfOrdemServico } from '../services/legacyPdf.service';

export const listOS = async (req: AuthRequest, res: Response) => {
  try {
    const { status, clienteId, search, limit = '100', offset = '0' } = req.query;
    const where: any = {};

    if (status) where.status = status as string;
    if (clienteId) where.clienteId = clienteId as string;
    if (search) {
      where.OR = [
        { codigo: { contains: search as string, mode: 'insensitive' as any } },
        { cliente: { nome: { contains: search as string, mode: 'insensitive' as any } } },
      ];
    }

    const list = await prisma.ordemServico.findMany({
      where,
      include: {
        cliente: true,
        servicos: true,
        proposta: { select: { id: true, codigo: true, status: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });
    res.json(list);
  } catch (error) {
    console.error('List OS error:', error);
    res.status(500).json({ error: 'Failed to fetch service orders' });
  }
};

export const getOS = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const os = await prisma.ordemServico.findUnique({
      where: { id },
      include: {
        cliente: true,
        proposta: true,
        servicos: true,
        manutencao: true,
        logistica: true,
        itensCobranca: { orderBy: { createdAt: 'asc' } }
      }
    });

    if (!os) return res.status(404).json({ error: 'OS not found' });
    res.json(os);
  } catch (error) {
    console.error('Get OS error:', error);
    res.status(500).json({ error: 'Failed to fetch OS details' });
  }
};

// ─── BUG FIX #5: Numeração sem gaps usando MAX do último código ──
async function gerarCodigoOS(): Promise<string> {
  const ano = new Date().getFullYear();
  const prefix = `OS-${ano}-`;

  // Find the highest existing code for this year
  const lastOS = await prisma.ordemServico.findFirst({
    where: { codigo: { startsWith: prefix } },
    orderBy: { codigo: 'desc' },
    select: { codigo: true }
  });

  let nextNumber = 1;
  if (lastOS?.codigo) {
    const parts = lastOS.codigo.split('-');
    const lastNum = parseInt(parts[parts.length - 1]);
    if (!isNaN(lastNum)) nextNumber = lastNum + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
}

// ─── BUG FIX #1: Persistência confiável com transaction ──────────
// ─── BUG FIX #11: Validação de proposta antes de criar OS ────────
export const createOS = async (req: AuthRequest, res: Response) => {
  try {
    const {
      servicos, dataInicial, entrada, saida, almoco, propostaId, escala, ...rest
    } = req.body;

    // NOVA REGRA: Toda O.S. deve ser gerada a partir de uma Proposta Aprovada
    if (!propostaId) {
      return res.status(400).json({ error: 'A emissão de O.S. requer vínculo obrigatório com uma Proposta.' });
    }

    const proposta = await prisma.proposta.findUnique({
      where: { id: propostaId },
      select: { id: true, status: true, clienteId: true }
    });

    if (!proposta) {
      return res.status(400).json({ error: 'Proposta vinculada não encontrada.' });
    }

    const STATUS_VALIDOS = ['APROVADA', 'ACEITA', 'VIGENTE'];
    if (!STATUS_VALIDOS.includes(proposta.status)) {
      return res.status(400).json({
        error: `Proposta não está aprovada (status atual: ${proposta.status}). Apenas propostas aprovadas/aceitas podem gerar OS.`
      });
    }

    // Validate client match
    if (rest.clienteId && proposta.clienteId !== rest.clienteId) {
      return res.status(400).json({
        error: 'O cliente da OS não corresponde ao cliente da proposta selecionada.'
      });
    }

    // BUG FIX #5: Generate sequential code without gaps
    const codigo = rest.codigo || await gerarCodigoOS();

    // BUG FIX #1: Use transaction for reliable persistence
    const os = await prisma.$transaction(async (tx) => {
      const createdOs = await tx.ordemServico.create({
        data: {
          ...rest,
          codigo,
          propostaId: propostaId || undefined,
          dataInicial: dataInicial ? new Date(dataInicial) : new Date(),
          entrada: entrada ? new Date(entrada) : undefined,
          saida: saida ? new Date(saida) : undefined,
          almoco: almoco ? new Date(almoco) : undefined,
          servicos: {
            create: servicos?.map((s: any) => ({
              equipamento: s.equipamento,
              descricao: s.descricao
            }))
          }
        },
        include: {
          servicos: true,
          cliente: true,
          proposta: { select: { id: true, codigo: true } }
        }
      });

      // T09: Validate ASO and Integração before Escala
      if (Array.isArray(escala) && escala.length > 0) {
        // Fetch employee details to save in JSON format as required by the Escala model
        const funcs = await tx.funcionario.findMany({
          where: { id: { in: escala } },
          select: { id: true, nome: true, cargo: true }
        });

        // Check ASO status for each employee
        const hoje = new Date();
        const avisos: string[] = [];

        for (const func of funcs) {
          // Check latest ASO
          const ultimoASO = await tx.aSOControle.findFirst({
            where: { funcionarioId: func.id },
            orderBy: { dataVencimento: 'desc' },
            select: { dataVencimento: true, resultado: true }
          });

          if (!ultimoASO) {
            avisos.push(`⚠️ ${func.nome}: Sem ASO cadastrado`);
          } else if (ultimoASO.resultado === 'INAPTO') {
            avisos.push(`🚫 ${func.nome}: ASO INAPTO`);
          } else if (ultimoASO.dataVencimento && ultimoASO.dataVencimento < hoje) {
            avisos.push(`⚠️ ${func.nome}: ASO vencido em ${ultimoASO.dataVencimento.toLocaleDateString('pt-BR')}`);
          }

          // Check integração
          const integracao = await tx.integracaoCliente.findFirst({
            where: { funcionarioId: func.id },
            orderBy: { dataEmissao: 'desc' },
            select: { dataEmissao: true }
          });

          if (!integracao) {
            avisos.push(`⚠️ ${func.nome}: Sem integração registrada`);
          }
        }

        // Store warnings but don't block creation
        if (avisos.length > 0) {
          (createdOs as any).avisosEscala = avisos;
        }

        await tx.escala.create({
          data: {
            codigoOS: codigo,
            data: dataInicial ? new Date(dataInicial) : new Date(),
            clienteId: rest.clienteId || undefined,
            empresa: rest.empresa || "NACIONAL HIDROSANEAMENTO EIRELI EPP",
            status: "AGENDADO",
            tipoAgendamento: "CONFIRMADO",
            funcionarios: funcs as any
          }
        });
      }

      return createdOs;
    });

    // Audit log
    await registrarLog({
      entidade: 'OS',
      entidadeId: os.id,
      acao: 'CRIAR',
      descricao: `OS ${os.codigo} criada para ${(os as any).cliente?.nome || 'cliente'}`,
      usuarioId: req.user?.userId,
      usuarioNome: req.user?.userId,
    });

    res.status(201).json(os);
  } catch (error: any) {
    console.error('Create OS Error:', error);
    res.status(500).json({ error: 'Failed to create service order', details: error.message });
  }
};

// ─── BUG FIX #7: Isolação de edição individual na transaction ────
export const updateOS = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const {
      servicos, dataInicial, entrada, saida, almoco, escala, justificativaCancelamento,
      materiaisUtilizados, // [{ produtoId, quantidade, darBaixaEstoque? }]
      ...rest
    } = req.body;

    // Capture before state for audit
    const before = await prisma.ordemServico.findUnique({ where: { id } });
    if (!before) return res.status(404).json({ error: 'OS not found' });

    const result = await prisma.$transaction(async (tx) => {
      // Clear existing services to sync
      if (servicos) {
        await tx.servicoOS.deleteMany({ where: { osId: id } });
      }

      const updatedOs = await tx.ordemServico.update({
        where: { id },
        data: {
          ...rest,
          justificativaCancelamento: justificativaCancelamento || undefined,
          dataInicial: dataInicial ? new Date(dataInicial) : undefined,
          entrada: (entrada && entrada !== '') ? new Date(entrada) : null,
          saida: (saida && saida !== '') ? new Date(saida) : null,
          almoco: (almoco && almoco !== '') ? new Date(almoco) : null,
          servicos: servicos ? {
            create: servicos?.map((s: any) => ({
              equipamento: s.equipamento,
              descricao: s.descricao
            }))
          } : undefined
        },
        include: {
          servicos: true,
          cliente: true
        }
      });

      // ── Baixa de Estoque: ao efetuar baixa da OS, registrar materiais utilizados ──
      if (rest.status === 'BAIXADA' && Array.isArray(materiaisUtilizados) && materiaisUtilizados.length > 0) {
        for (const item of materiaisUtilizados) {
          const produto = await tx.produto.findUnique({ where: { id: item.produtoId } });
          if (!produto) continue;

          const qtd = Number(item.quantidade) || 0;
          if (qtd <= 0) continue;

          // Criar registro de MaterialOS
          await (tx as any).materialOS.create({
            data: {
              osId: id,
              produtoId: item.produtoId,
              descricao: produto.nome,
              quantidade: qtd,
              unidade: produto.unidadeMedida || 'UN',
              darBaixaEstoque: item.darBaixaEstoque !== false,
            }
          });

          // Baixar estoque se flag ativa
          if (item.darBaixaEstoque !== false) {
            const novaQtd = produto.estoqueAtual - qtd;
            await tx.produto.update({
              where: { id: item.produtoId },
              data: { estoqueAtual: novaQtd }
            });

            await tx.movimentacaoEstoque.create({
              data: {
                produtoId: item.produtoId,
                quantidade: qtd,
                tipo: 'SAIDA',
                motivo: `USO_EM_OS - ${updatedOs.codigo}`
              }
            });

            if (novaQtd < 0) {
              console.warn(`⚠️ Estoque negativo para ${produto.nome}: ${novaQtd} (OS ${updatedOs.codigo})`);
            }
          }
        }
        console.log(`📦 Baixa de estoque: ${materiaisUtilizados.length} itens para OS ${updatedOs.codigo}`);
      }

      // Sync Escala record if `escala` array is provided from frontend
      if (Array.isArray(escala)) {
        // Delete any existing scale tied to this OS
        await tx.escala.deleteMany({ where: { codigoOS: updatedOs.codigo } });

        if (escala.length > 0) {
          const funcs = await tx.funcionario.findMany({
            where: { id: { in: escala } },
            select: { id: true, nome: true, cargo: true }
          });

          await tx.escala.create({
            data: {
              codigoOS: updatedOs.codigo,
              data: updatedOs.dataInicial,
              clienteId: updatedOs.clienteId || undefined,
              empresa: updatedOs.empresa || "NACIONAL HIDROSANEAMENTO EIRELI EPP",
              status: "AGENDADO",
              tipoAgendamento: "CONFIRMADO",
              funcionarios: funcs
            }
          });
        }
      }

      return updatedOs;
    });

    // Audit log with changes
    const changedFields: string[] = [];
    if (rest.status && rest.status !== before.status) changedFields.push('status');
    if (rest.clienteId && rest.clienteId !== before.clienteId) changedFields.push('clienteId');

    await registrarLog({
      entidade: 'OS',
      entidadeId: id,
      acao: rest.status && rest.status !== before.status ? 'STATUS_CHANGE' : 'ATUALIZAR',
      campo: changedFields.join(', ') || undefined,
      valorAnterior: rest.status !== before.status ? before.status : undefined,
      valorNovo: rest.status !== before.status ? rest.status : undefined,
      descricao: `OS ${before.codigo} atualizada${rest.status ? ` (status: ${before.status} → ${rest.status})` : ''}`,
      usuarioId: req.user?.userId,
      usuarioNome: req.user?.userId,
    });

    // T11: WhatsApp automático ao mudar status da OS
    if (rest.status && rest.status !== before.status) {
      const statusLabels: Record<string, string> = {
        'ABERTA': '📋 Aberta',
        'EM_ANDAMENTO': '🔧 Em Andamento',
        'EM_EXECUCAO': '🚜 Em Execução / Iniciada',
        'BAIXADA': '✅ Baixada (Concluída)',
        'CONCLUIDA': '✅ Concluída',
        'FINALIZADA': '🏁 Finalizada',
        'CANCELADA': '❌ Cancelada',
        'AGUARDANDO': '⏳ Aguardando',
        'PAUSADA': '⏸️ Pausada',
      };
      
      const statusLabel = statusLabels[rest.status] || rest.status;
      const osCodigo = (result as any).codigo || before.codigo;

      import('../services/whatsapp.service').then(async ({ enviarMensagemWhatsApp }) => {
        // 1. Notificar Cliente (sempre que mudar p/ status relevante)
        if ((result as any).cliente?.telefone) {
          const msgCliente = `Olá! A Ordem de Serviço *${osCodigo}* da Nacional Hidro teve seu status atualizado para: *${statusLabel}*.\n\nMais detalhes em nosso portal.`;
          enviarMensagemWhatsApp((result as any).cliente.telefone, msgCliente).catch(e => console.error('[T11] Erro WhatsApp Cliente:', e));
        }

        // 2. Notificar Equipe/Motorista (quando entrar em Execução)
        if (rest.status === 'EM_EXECUCAO') {
          const escala = await prisma.escala.findFirst({ 
            where: { codigoOS: osCodigo },
            orderBy: { createdAt: 'desc' }
          });
          
          if (escala && Array.isArray(escala.funcionarios)) {
             const motorista = (escala.funcionarios as any[])[0];
             if (motorista?.id) {
               const motoristaDb = await prisma.funcionario.findUnique({ where: { id: motorista.id }, select: { telefone: true } });
               if (motoristaDb?.telefone) {
                 const msgMotorista = `📢 *NACIONAL HIDRO - NOVA OS EM EXECUÇÃO*\n\nEquipe, a OS *${osCodigo}* foi iniciada.\n\n*Cliente:* ${(result as any).cliente?.nome}\n*Status:* ${statusLabel}`;
                 enviarMensagemWhatsApp(motoristaDb.telefone, msgMotorista).catch(e => console.error('[T11] Erro WhatsApp Motorista:', e));
               }
             }
          }
        }
      });
    }

    res.json(result);
  } catch (error: any) {
    console.error('Update OS Error:', error);
    res.status(500).json({ error: 'Failed to update OS', details: error.message });
  }
};

export const deleteOS = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const os = await prisma.ordemServico.findUnique({ where: { id }, select: { codigo: true } });

    await prisma.$transaction(async (tx) => {
      await tx.itemCobranca.deleteMany({ where: { osId: id } });
      await tx.servicoOS.deleteMany({ where: { osId: id } });
      await tx.ordemServico.delete({ where: { id } });
    });

    await registrarLog({
      entidade: 'OS',
      entidadeId: id,
      acao: 'DELETAR',
      descricao: `OS ${os?.codigo || id} excluída`,
      usuarioId: req.user?.userId,
      usuarioNome: req.user?.userId,
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete OS error:', error);
    res.status(500).json({ error: 'Failed to delete OS' });
  }
};

// ─── BUG FIX #2/#3/#4: Impressão em lote ─────────────────────────
export const printOS = async (req: AuthRequest, res: Response) => {
  try {
    const { ids } = req.body; // Array of OS IDs

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Informe os IDs das OS para impressão' });
    }

    const osList = await prisma.ordemServico.findMany({
      where: { id: { in: ids } },
      include: {
        cliente: true,
        servicos: true,
        proposta: { select: { codigo: true } },
        itensCobranca: true,
      },
      orderBy: { dataInicial: 'asc' } // BUG FIX #2: Ordered by date
    });

    // Return structured data for printing (no blank pages)
    res.json({
      osList,
      total: osList.length,
      printedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Print OS error:', error);
    res.status(500).json({ error: 'Failed to prepare OS for printing' });
  }
};

export const downloadPdfOS = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const os = await prisma.ordemServico.findUnique({
      where: { id },
      include: {
        cliente: true,
        servicos: true
      }
    });

    if (!os) return res.status(404).json({ error: 'Ordem de Serviço não encontrada' });

    const pdfBuffer = await gerarPdfOrdemServico(os, os.cliente, os.servicos);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=OS_${os.codigo}.pdf`);
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('Download OS PDF error:', error);
    res.status(500).json({ error: 'Falha ao gerar PDF da OS', details: error.message });
  }
};

// ─── ITEM COBRANÇA (Subitens de OS) ──────────────────────────────

export const listItensCobranca = async (req: AuthRequest, res: Response) => {
  try {
    const osId = req.params.osId as string;
    const itens = await prisma.itemCobranca.findMany({
      where: { osId: osId },
      orderBy: { createdAt: 'asc' },
    });
    res.json(itens);
  } catch (error) {
    console.error('List itens cobrança error:', error);
    res.status(500).json({ error: 'Falha ao buscar itens de cobrança' });
  }
};

export const createItemCobranca = async (req: AuthRequest, res: Response) => {
  try {
    const osId = req.params.osId as string;
    const { descricao, quantidade, valorUnitario, percentualAdicional } = req.body;

    if (!descricao || !quantidade || !valorUnitario) {
      return res.status(400).json({ error: 'Campos obrigatórios: descricao, quantidade, valorUnitario' });
    }

    const qtd = parseFloat(String(quantidade));
    const vu = parseFloat(String(valorUnitario));
    const perc = percentualAdicional ? parseFloat(String(percentualAdicional)) : 0;
    const valorTotal = qtd * vu * (1 + perc / 100);

    const item = await prisma.itemCobranca.create({
      data: {
        osId: osId,
        descricao,
        quantidade: qtd,
        valorUnitario: vu,
        percentualAdicional: perc || undefined,
        valorTotal,
      },
    });

    await registrarLog({
      entidade: 'OS',
      entidadeId: osId as string,
      acao: 'ITEM_COBRANCA_CRIAR',
      descricao: `Item "${descricao}" (R$ ${valorTotal.toFixed(2)}) adicionado à OS`,
      usuarioId: req.user?.userId,
      usuarioNome: req.user?.userId,
    });

    res.status(201).json(item);
  } catch (error: any) {
    console.error('Create item cobrança error:', error);
    res.status(500).json({ error: 'Falha ao criar item de cobrança', details: error.message });
  }
};

export const updateItemCobranca = async (req: AuthRequest, res: Response) => {
  try {
    const itemId = req.params.itemId as string;
    const { descricao, quantidade, valorUnitario, percentualAdicional } = req.body;

    const qtd = parseFloat(String(quantidade));
    const vu = parseFloat(String(valorUnitario));
    const perc = percentualAdicional ? parseFloat(String(percentualAdicional)) : 0;
    const valorTotal = qtd * vu * (1 + perc / 100);

    const item = await prisma.itemCobranca.update({
      where: { id: itemId as string },
      data: {
        descricao,
        quantidade: qtd,
        valorUnitario: vu,
        percentualAdicional: perc || undefined,
        valorTotal,
      },
    });
    res.json(item);
  } catch (error: any) {
    console.error('Update item cobrança error:', error);
    res.status(500).json({ error: 'Falha ao atualizar item de cobrança', details: error.message });
  }
};

export const deleteItemCobranca = async (req: AuthRequest, res: Response) => {
  try {
    const itemId = req.params.itemId as string;
    await prisma.itemCobranca.delete({ where: { id: itemId } });
    res.status(204).send();
  } catch (error) {
    console.error('Delete item cobrança error:', error);
    res.status(500).json({ error: 'Falha ao excluir item de cobrança' });
  }
};

export const duplicateOS = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const original = await prisma.ordemServico.findUnique({
      where: { id: id },
      include: { servicos: true, itensCobranca: true },
    });
    if (!original) return res.status(404).json({ error: 'OS não encontrada' });

    const codigo = await gerarCodigoOS();

    const nova = await prisma.$transaction(async (tx) => {
      const novaOS = await tx.ordemServico.create({
        data: {
          codigo,
          clienteId: original.clienteId,
          propostaId: original.propostaId,
          tipoCobranca: original.tipoCobranca,
          empresa: original.empresa,
          diasSemana: original.diasSemana,
          quantidadeDia: original.quantidadeDia,
          contato: original.contato,
          acompanhante: original.acompanhante,
          minimoHoras: original.minimoHoras,
          observacoes: `[Duplicada de ${original.codigo}] ${original.observacoes || ''}`.trim(),
          dataInicial: new Date(),
          status: 'ABERTA',
          servicos: {
            create: original.servicos.map(s => ({
              equipamento: s.equipamento,
              descricao: s.descricao,
            })),
          },
        },
        include: { servicos: true, cliente: true },
      });
      return novaOS;
    });

    await registrarLog({
      entidade: 'OS',
      entidadeId: nova.id,
      acao: 'DUPLICAR',
      descricao: `OS ${nova.codigo} duplicada de ${original.codigo}`,
      usuarioId: req.user?.userId,
      usuarioNome: req.user?.userId,
    });

    res.status(201).json(nova);
  } catch (error: any) {
    console.error('Duplicate OS error:', error);
    res.status(500).json({ error: 'Falha ao duplicar OS', details: error.message });
  }
};
