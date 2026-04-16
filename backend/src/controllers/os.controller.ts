import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { registrarLog } from '../lib/auditLog';
import { gerarPdfOrdemServico, gerarPdfLoteOrdemServico } from '../services/legacyPdf.service';

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
      select: { id: true, status: true, clienteId: true, franquiaHoras: true }
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
          minimoHoras: proposta.franquiaHoras ? Number(proposta.franquiaHoras) : undefined,
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
            const novaQtd = Number(produto.estoqueAtual) - qtd;
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

export const printLoteOSPdf = async (req: AuthRequest, res: Response) => {
  try {
    const { ids } = req.query; // Expecting comma separated ids: ?ids=id1,id2,id3
    if (!ids || typeof ids !== 'string') {
      return res.status(400).json({ error: 'Faltando parâmetro ids' });
    }
    const osIds = ids.split(',').map(id => id.trim());

    const ordens = await prisma.ordemServico.findMany({
      where: { id: { in: osIds } },
      include: {
        cliente: true,
        servicos: true
      },
      // Preserve selection order if needed, but here we just order by createdAt
      orderBy: { createdAt: 'asc' }
    });

    if (ordens.length === 0) {
      return res.status(404).json({ error: 'Nenhuma Ordem de Serviço encontrada' });
    }

    const pdfBuffer = await gerarPdfLoteOrdemServico(ordens);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=OS_Lote_${Date.now()}.pdf`);
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('Lote OS PDF error:', error);
    res.status(500).json({ error: 'Falha ao gerar PDF do lote de OS', details: error.message });
  }
};

// ─── CRIAÇÃO DE OS EM LOTE (intervalo de datas) ─────────────────
export const createOSLote = async (req: AuthRequest, res: Response) => {
  try {
    const { dataInicio, dataFim, ...osData } = req.body;

    if (!dataInicio || !dataFim) {
      return res.status(400).json({ error: 'dataInicio e dataFim são obrigatórios para criação em lote.' });
    }

    if (!osData.propostaId) {
      return res.status(400).json({ error: 'propostaId é obrigatório.' });
    }

    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);

    if (fim < inicio) {
      return res.status(400).json({ error: 'dataFim deve ser maior ou igual a dataInicio.' });
    }

    // Limit to 31 days max
    const diffDays = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > 31) {
      return res.status(400).json({ error: 'Intervalo máximo de 31 dias para criação em lote.' });
    }

    const createdOSs: any[] = [];
    const errors: string[] = [];

    for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
      try {
        const ano = d.getFullYear();
        const prefix = `OS-${ano}-`;
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
        const codigo = `${prefix}${nextNumber.toString().padStart(4, '0')}`;

        const { servicos, escala, ...rest } = osData;

        const os = await prisma.$transaction(async (tx) => {
          const created = await tx.ordemServico.create({
            data: {
              ...rest,
              codigo,
              dataInicial: new Date(d),
              servicos: servicos ? {
                create: servicos.map((s: any) => ({
                  equipamento: s.equipamento,
                  descricao: s.descricao
                }))
              } : undefined
            },
            include: { servicos: true, cliente: true }
          });

          // Create escala for this day if crew provided
          if (Array.isArray(escala) && escala.length > 0) {
            const funcs = await tx.funcionario.findMany({
              where: { id: { in: escala } },
              select: { id: true, nome: true, cargo: true }
            });

            await tx.escala.create({
              data: {
                codigoOS: codigo,
                data: new Date(d),
                clienteId: rest.clienteId || undefined,
                empresa: rest.empresa || "NACIONAL HIDROSANEAMENTO EIRELI EPP",
                status: "AGENDADO",
                tipoAgendamento: "CONFIRMADO",
                funcionarios: funcs
              }
            });
          }

          return created;
        });

        createdOSs.push(os);
      } catch (err: any) {
        errors.push(`${d.toLocaleDateString('pt-BR')}: ${err.message}`);
      }
    }

    await registrarLog({
      entidade: 'OS',
      entidadeId: createdOSs[0]?.id || 'lote',
      acao: 'CRIAR_LOTE',
      descricao: `Lote de ${createdOSs.length} OS criadas (${inicio.toLocaleDateString('pt-BR')} a ${fim.toLocaleDateString('pt-BR')})`,
      usuarioId: req.user?.userId,
      usuarioNome: req.user?.userId,
    });

    res.status(201).json({
      criadas: createdOSs.length,
      erros: errors.length,
      ordensServico: createdOSs,
      detalhesErros: errors
    });
  } catch (error: any) {
    console.error('Create OS Lote error:', error);
    res.status(500).json({ error: 'Falha ao criar OS em lote', details: error.message });
  }
};

// ─── BAIXA DE OS EM LOTE (com cálculo de horas) ─────────────────

// Helper: porta lógica calcularTempoTotal do legacy (ModalCadastroOrdem.js:204-238)
const horaParaMinuto = (hora: string | null | undefined): number => {
  if (!hora) return 0;
  const parts = hora.split(':');
  return (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
};

const minutoParaHora = (minutos: number): string => {
  const h = Math.floor(Math.abs(minutos) / 60);
  const m = Math.abs(minutos) % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export const baixarOSLote = async (req: AuthRequest, res: Response) => {
  try {
    const { ids, horaPadrao, horaEntrada, horaSaida, horaTolerancia, horaAlmoco, descontarAlmoco } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Informe os IDs das OS para baixa em lote.' });
    }

    // Calculate hours (ported from legacy)
    const hpMin = horaParaMinuto(horaPadrao);
    let entradaMin = horaParaMinuto(horaEntrada);
    let saidaMin = horaParaMinuto(horaSaida);
    const tolMin = horaParaMinuto(horaTolerancia);
    const almMin = descontarAlmoco ? horaParaMinuto(horaAlmoco) : 0;

    if (saidaMin < entradaMin) {
      saidaMin += 12 * 60;
      entradaMin -= 12 * 60;
    }

    const calculoTotal = (saidaMin - entradaMin) - (almMin + tolMin);
    let horasTotais = Math.max(calculoTotal, hpMin);
    let horasAdicionais = calculoTotal > hpMin ? calculoTotal - hpMin : 0;

    const now = new Date();
    const updatedOSs: any[] = [];
    const errors: string[] = [];

    for (const osId of ids) {
      try {
        const os = await prisma.ordemServico.update({
          where: { id: osId },
          data: {
            status: 'BAIXADA',
            entrada: horaEntrada ? new Date(`1970-01-01T${horaEntrada}:00Z`) : undefined,
            saida: horaSaida ? new Date(`1970-01-01T${horaSaida}:00Z`) : undefined,
            almoco: horaAlmoco ? new Date(`1970-01-01T${horaAlmoco}:00Z`) : undefined,
            horasTotais: horasTotais / 60,
            horasAdicionais: horasAdicionais / 60,
            dataBaixa: now,
          },
          include: { cliente: true }
        });
        updatedOSs.push(os);
      } catch (err: any) {
        errors.push(`${osId}: ${err.message}`);
      }
    }

    await registrarLog({
      entidade: 'OS',
      entidadeId: updatedOSs[0]?.id || 'lote',
      acao: 'BAIXAR_LOTE',
      descricao: `Baixa em lote: ${updatedOSs.length} OS baixadas. Horas: ${minutoParaHora(horasTotais)} + ${minutoParaHora(horasAdicionais)} adic.`,
      usuarioId: req.user?.userId,
      usuarioNome: req.user?.userId,
    });

    res.json({
      baixadas: updatedOSs.length,
      erros: errors.length,
      horasTotais: minutoParaHora(horasTotais),
      horasAdicionais: minutoParaHora(horasAdicionais),
      ordensServico: updatedOSs,
      detalhesErros: errors
    });
  } catch (error: any) {
    console.error('Baixar OS Lote error:', error);
    res.status(500).json({ error: 'Falha ao baixar OS em lote', details: error.message });
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
