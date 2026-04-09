import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import nodemailer from 'nodemailer';
import { SequenceService } from '../services/sequence.service';
import { enviarMensagemWhatsApp } from '../services/whatsapp.service';
import { sendEmail } from '../services/email.service';

// ─── LIST ───────────────────────────────────────────────────────
export const listPropostas = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20; // Default limit increased to 20
    const skip = (page - 1) * limit;

    const { search, tipo, vigente } = req.query;

    const where: any = {};

    // Search filter
    if (search) {
      where.OR = [
        { codigo: { contains: search as string, mode: 'insensitive' as any } },
        { cliente: { nome: { contains: search as string, mode: 'insensitive' as any } } }
      ];
    }

    // Type filter (INDIVIDUAL, GLOBAL)
    if (tipo) {
      where.tipo = tipo as string;
    }

    // Vigente filter
    if (vigente !== undefined) {
      where.vigente = vigente === 'true';
    }

    // Don't show child proposals (unidades) in main list — they appear nested
    where.propostaGlobalId = null;

    // Execute count and list in parallel for efficiency
    const [propostas, total] = await Promise.all([
      prisma.proposta.findMany({
        where,
        skip,
        take: limit,
        include: {
          cliente: true,
          unidades: {
            include: {
              ordensServico: { select: { id: true, codigo: true, status: true } }
            }
          },
          ordensServico: { select: { id: true, codigo: true, status: true } },
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.proposta.count({ where })
    ]);

    // Enrich with expiration info
    const now = new Date();
    const enriched = propostas.map((p: any) => ({
      ...p,
      // Proteção contra dataValidade nula
      expirada: p.dataValidade ? (new Date(p.dataValidade) < now && p.status !== 'ACEITA') : false,
      totalUnidades: p.unidades?.length || 0,
    }));

    res.json({
      data: enriched,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error: any) {
    console.error('List proposals error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch proposals', 
      details: error.message,
      code: error.code 
    });
  }
};

// ─── GET DETAIL ─────────────────────────────────────────────────
export const getProposta = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const proposta = await prisma.proposta.findUnique({
      where: { id },
      include: {
        cliente: true,
        itens: true,
        acessorios: true,
        responsabilidades: true,
        equipe: true,
        unidades: {
          include: {
            ordensServico: { select: { id: true, codigo: true, status: true } }
          }
        },
        ordensServico: { select: { id: true, codigo: true, status: true } },
        propostaGlobal: { select: { id: true, codigo: true, cliente: { select: { nome: true } } } },
      }
    });

    if (!proposta) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    res.json(proposta);
  } catch (error) {
    console.error('Get proposal error:', error);
    res.status(500).json({ error: 'Failed to fetch proposal details' });
  }
};

// ─── CREATE ─────────────────────────────────────────────────────
export const createProposta = async (req: AuthRequest, res: Response) => {
  try {
    const {
      clienteId, itens, acessorios, responsabilidades, equipe,
      unidadesData, // Array de {unidadeNome, unidadeCNPJ, unidadeEndereco, unidadeContato}
      dataProposta, dataValidade, ...rest
    } = req.body;

    const proposta = await prisma.$transaction(async (tx) => {
      // Automatic code generation if not provided
      const codigo = rest.codigo || await SequenceService.generateCode('proposta', 'PROP');

      // Create the main proposal
      const novaProposta = await tx.proposta.create({
        data: {
          ...rest,
          codigo,
          introducao: rest.introducao || '',
          objetivo: rest.objetivo || '',
          descricaoGarantia: rest.descricaoGarantia || '',
          condicoesPagamento: rest.condicoesPagamento || '',
          dataProposta: dataProposta ? new Date(dataProposta) : new Date(),
          dataValidade: dataValidade ? new Date(dataValidade) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          cliente: { connect: { id: clienteId } },
          itens: {
            create: itens?.map((i: any) => ({
              equipamento: i.equipamento,
              quantidade: i.quantidade,
              area: i.area,
              tipoCobranca: i.tipoCobranca,
              valorAcobrar: i.valorAcobrar,
              horasPorDia: i.horasPorDia,
              usoPrevisto: i.usoPrevisto,
              mobilizacao: i.mobilizacao,
              valorTotal: i.valorTotal
            }))
          },
          acessorios: {
            create: acessorios?.map((a: any) => ({
              acessorio: a.acessorio,
              quantidade: a.quantidade,
              valor: a.valor
            }))
          },
          responsabilidades: {
            create: responsabilidades?.map((r: any) => ({
              tipo: r.tipo,
              descricao: r.descricao
            }))
          },
          equipe: {
            create: equipe?.map((e: any) => ({
              funcao: e.funcao,
              equipamento: e.equipamento,
              quantidade: e.quantidade || 1,
              nome: e.nome,
              cargo: e.cargo
            }))
          }
        },
        include: {
          cliente: true,
          itens: true
        }
      });

      // If GLOBAL, create child proposals (unidades)
      if (rest.tipo === 'GLOBAL' && unidadesData?.length) {
        for (let i = 0; i < unidadesData.length; i++) {
          const u = unidadesData[i];
          await tx.proposta.create({
            data: {
              codigo: `${novaProposta.codigo}-U${i + 1}`,
              tipo: 'INDIVIDUAL',
              propostaGlobalId: novaProposta.id,
              clienteId,
              unidadeNome: u.unidadeNome,
              unidadeCNPJ: u.unidadeCNPJ,
              unidadeEndereco: u.unidadeEndereco,
              unidadeContato: u.unidadeContato,
              dataProposta: novaProposta.dataProposta,
              dataValidade: novaProposta.dataValidade,
              valorTotal: u.valorTotal || novaProposta.valorTotal,
              status: novaProposta.status,
              vendedor: novaProposta.vendedor,
              empresa: novaProposta.empresa,
              introducao: novaProposta.introducao,
              objetivo: novaProposta.objetivo,
              descricaoGarantia: novaProposta.descricaoGarantia,
              condicoesPagamento: novaProposta.condicoesPagamento,
            }
          });
        }
      }

      return novaProposta;
    });

    // Reload with unidades
    const full = await prisma.proposta.findUnique({
      where: { id: proposta.id },
      include: { cliente: true, itens: true, unidades: true }
    });

    res.status(201).json(full);
  } catch (error: any) {
    console.error('Create Proposal Error:', error);
    res.status(500).json({ error: 'Failed to create proposal', details: error.message });
  }
};

// ─── UPDATE STATUS (with vigente auto-management) ───────────────
export const updatePropostaStatus = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status, motivoCancelamento, motivoReprovacao } = req.body;

    const proposta = await prisma.$transaction(async (tx) => {
      const updateData: any = { 
        status,
        ...(status === 'ACEITA' ? { dataAprovacao: new Date() } : {}),
        ...(status === 'CANCELADA' && motivoCancelamento ? { motivoCancelamento, dataCancelamento: new Date() } : {}),
        ...(status === 'RECUSADA' && motivoReprovacao ? { motivoReprovacao } : {})
      };
      const updated = await tx.proposta.update({
        where: { id },
        data: updateData,
        include: { unidades: true }
      });

      // When accepting a proposal, mark previous proposals for the same client as not vigente
      if (status === 'ACEITA') {
        await tx.proposta.updateMany({
          where: {
            clienteId: updated.clienteId,
            id: { not: updated.id },
            status: 'ACEITA',
            vigente: true,
            propostaGlobalId: null, // Only top-level proposals
          },
          data: { vigente: false }
        });

        // Also propagate status to child unidades
        if (updated.unidades.length > 0) {
          await tx.proposta.updateMany({
            where: { propostaGlobalId: updated.id },
            data: { status: 'ACEITA', dataAprovacao: new Date() }
          });
        }

        // T10: Auto-create Contrato from Proposta aceita
        const ano = new Date().getFullYear();
        const contratoCount = await tx.contrato.count({
          where: { codigo: { startsWith: `CTR-${ano}-` } }
        });
        const codigoContrato = `CTR-${ano}-${String(contratoCount + 1).padStart(3, '0')}`;

        const dataInicio = new Date();
        const dataVencimento = new Date();
        dataVencimento.setFullYear(dataVencimento.getFullYear() + 1); // 1 year default

        await tx.contrato.create({
          data: {
            codigo: codigoContrato,
            clienteId: updated.clienteId,
            status: 'ATIVO',
            objeto: `Contrato referente à proposta ${updated.codigo}`,
            valorMensal: updated.valorTotal || 0,
            valorTotal: updated.valorTotal ? Number(updated.valorTotal) * 12 : 0,
            dataInicio,
            dataVencimento,
            renovacaoAutomatica: false,
            diaVencimentoFatura: 10,
            observacoes: `Gerado automaticamente a partir da proposta ${updated.codigo}`
          }
        });

        console.log(`[T10] Contrato ${codigoContrato} criado automaticamente para proposta ${updated.codigo}`);
      }

      return updated;
    });

    res.json(proposta);
  } catch (error) {
    console.error('Update proposal status error:', error);
    res.status(500).json({ error: 'Failed to update proposal status' });
  }
};

// ─── UPDATE ─────────────────────────────────────────────────────
export const updateProposta = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const {
      clienteId, itens, acessorios, responsabilidades, equipe,
      unidadesData,
      dataProposta, dataValidade, ...rest
    } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Delete associated records to "sync" (re-create them)
      await tx.propostaItem.deleteMany({ where: { propostaId: id } });
      await tx.propostaAcessorio.deleteMany({ where: { propostaId: id } });
      await tx.propostaResponsabilidade.deleteMany({ where: { propostaId: id } });
      await tx.propostaEquipe.deleteMany({ where: { propostaId: id } });

      // 2. Update Main Proposal
      const updated = await tx.proposta.update({
        where: { id },
        data: {
          ...rest,
          introducao: rest.introducao,
          objetivo: rest.objetivo,
          descricaoGarantia: rest.descricaoGarantia,
          condicoesPagamento: rest.condicoesPagamento,
          dataProposta: dataProposta ? new Date(dataProposta) : undefined,
          dataValidade: dataValidade ? new Date(dataValidade) : undefined,
          cliente: clienteId ? { connect: { id: clienteId } } : undefined,
          itens: {
            create: itens?.map((i: any) => ({
              equipamento: i.equipamento,
              quantidade: i.quantidade,
              area: i.area,
              tipoCobranca: i.tipoCobranca,
              valorAcobrar: i.valorAcobrar,
              horasPorDia: i.horasPorDia,
              usoPrevisto: i.usoPrevisto,
              mobilizacao: i.mobilizacao,
              valorTotal: i.valorTotal
            }))
          },
          acessorios: {
            create: acessorios?.map((a: any) => ({
              acessorio: a.acessorio,
              quantidade: a.quantidade,
              valor: a.valor
            }))
          },
          responsabilidades: {
            create: responsabilidades?.map((r: any) => ({
              tipo: r.tipo,
              descricao: r.descricao
            }))
          },
          equipe: {
            create: equipe?.map((e: any) => ({
              funcao: e.funcao,
              equipamento: e.equipamento,
              quantidade: e.quantidade || 1,
              nome: e.nome,
              cargo: e.cargo
            }))
          }
        },
        include: {
          cliente: true,
          itens: true,
          acessorios: true,
          responsabilidades: true,
          equipe: true,
          unidades: true
        }
      });

      // 3. Sync unidades if GLOBAL
      if (rest.tipo === 'GLOBAL' && unidadesData) {
        // Delete old child proposals
        await tx.proposta.deleteMany({ where: { propostaGlobalId: id } });

        // Create new ones
        for (let i = 0; i < unidadesData.length; i++) {
          const u = unidadesData[i];
          await tx.proposta.create({
            data: {
              codigo: `${updated.codigo}-U${i + 1}`,
              tipo: 'INDIVIDUAL',
              propostaGlobalId: updated.id,
              clienteId: updated.clienteId,
              unidadeNome: u.unidadeNome,
              unidadeCNPJ: u.unidadeCNPJ,
              unidadeEndereco: u.unidadeEndereco,
              unidadeContato: u.unidadeContato,
              dataProposta: updated.dataProposta,
              dataValidade: updated.dataValidade,
              valorTotal: u.valorTotal || updated.valorTotal,
              status: updated.status,
              vendedor: updated.vendedor,
              empresa: updated.empresa,
              introducao: updated.introducao,
              objetivo: updated.objetivo,
              descricaoGarantia: updated.descricaoGarantia,
              condicoesPagamento: updated.condicoesPagamento,
            }
          });
        }
      }

      return updated;
    });

    // Reload full
    const full = await prisma.proposta.findUnique({
      where: { id },
      include: {
        cliente: true, itens: true, acessorios: true,
        responsabilidades: true, equipe: true, unidades: true
      }
    });

    res.json(full);
  } catch (error: any) {
    console.error('Update Proposal Error:', error);
    res.status(500).json({ error: 'Failed to update proposal', details: error.message });
  }
};

// ─── GERAR OS DE UNIDADE ────────────────────────────────────────
export const gerarOSdeUnidade = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { dataInicial, tipoCobranca, contato } = req.body;

    const proposta: any = await prisma.proposta.findUnique({
      where: { id },
      include: { cliente: true, itens: true }
    });

    if (!proposta) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    if (proposta.status !== 'ACEITA') {
      return res.status(400).json({ error: 'Proposta precisa estar ACEITA para gerar OS' });
    }

    // Generate OS code using centralized service
    const osCodigo = await SequenceService.generateCode('ordemServico', 'OS');

    const result = await prisma.$transaction(async (tx) => {
      const os = await tx.ordemServico.create({
        data: {
          codigo: osCodigo,
          clienteId: proposta.clienteId,
          propostaId: proposta.id,
          dataInicial: dataInicial ? new Date(dataInicial) : new Date(),
          tipoCobranca: tipoCobranca || proposta.itens?.[0]?.tipoCobranca || 'EMPREITADA',
          contato: contato || proposta.unidadeContato || proposta.contato,
          status: 'ABERTA',
          prioridade: 'MEDIA',
          servicos: {
            create: (proposta.itens || []).map((item: any) => ({
              equipamento: item.equipamento,
              descricao: `${item.equipamento} - ${item.area || 'N/A'}`
            }))
          }
        },
        include: { servicos: true, cliente: true }
      });

      // Cascata Automática: Criar o Agendamento logístico pendente
      await tx.agendamento.create({
        data: {
          propostaId: proposta.id,
          ordemServicoId: os.id,
          clienteId: proposta.clienteId,
          cidadeServico: proposta.cliente?.cidade || 'Não informada',
          dataInicio: os.dataInicial || new Date(),
          tipoAtividade: proposta.itens?.map((i: any) => i.equipamento).join(', ') || 'Serviços não especificados',
          status: 'PENDENTE'
        }
      });

      return os;
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error('Generate OS error:', error);
    res.status(500).json({ error: 'Failed to generate OS', details: error.message });
  }
};

// ─── DELETE ─────────────────────────────────────────────────────
export const deleteProposta = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    await prisma.$transaction(async (tx) => {
      // Delete child proposals (unidades) first
      const children = await tx.proposta.findMany({ where: { propostaGlobalId: id } });
      for (const child of children) {
        await tx.propostaItem.deleteMany({ where: { propostaId: child.id } });
        await tx.propostaAcessorio.deleteMany({ where: { propostaId: child.id } });
        await tx.propostaResponsabilidade.deleteMany({ where: { propostaId: child.id } });
        await tx.propostaEquipe.deleteMany({ where: { propostaId: child.id } });
      }
      await tx.proposta.deleteMany({ where: { propostaGlobalId: id } });

      // Delete main proposal relations
      await tx.propostaItem.deleteMany({ where: { propostaId: id } });
      await tx.propostaAcessorio.deleteMany({ where: { propostaId: id } });
      await tx.propostaResponsabilidade.deleteMany({ where: { propostaId: id } });
      await tx.propostaEquipe.deleteMany({ where: { propostaId: id } });

      await tx.proposta.delete({ where: { id } });
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete proposal error:', error);
    res.status(500).json({ error: 'Failed to delete proposal' });
  }
};

// ─── GERAR PROPOSTA TÉCNICA (CLONE SEM VALORES) ─────────────────
export const gerarPropostaTecnica = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { escopoTecnico, dimensionamentoEquipe, qtdEquipamentos, diasTrabalho } = req.body;

    const original = await prisma.proposta.findUnique({
      where: { id },
      include: { itens: true, equipe: true, responsabilidades: true }
    });

    if (!original) return res.status(404).json({ error: 'Proposta not found' });

    // Create technical proposta (cast to any to avoid checked/unchecked type conflict)
    const tecnica = await (prisma.proposta as any).create({
      data: {
        codigo: `${original.codigo}-TEC`,
        tipoProposta: 'TECNICA',
        propostaComercialId: original.id,
        clienteId: original.clienteId,
        tipo: original.tipo,
        vendedor: original.vendedor,
        empresa: original.empresa,
        contato: original.contato,
        dataProposta: original.dataProposta,
        dataValidade: original.dataValidade,
        validadeDias: original.validadeDias,
        introducao: original.introducao,
        objetivo: original.objetivo,
        valorTotal: 0,
        status: 'RASCUNHO',
        escopoTecnico: escopoTecnico || original.objetivo || '',
        dimensionamentoEquipe: dimensionamentoEquipe || '',
        qtdEquipamentos: qtdEquipamentos || '',
        diasTrabalho: diasTrabalho || '',
      },
      include: { cliente: true }
    });

    // Clone items (sem valores)
    if (original.itens?.length) {
      for (const item of original.itens) {
        await prisma.propostaItem.create({
          data: {
            propostaId: tecnica.id,
            equipamento: item.equipamento,
            quantidade: item.quantidade,
            area: item.area,
            tipoCobranca: item.tipoCobranca,
            horasPorDia: item.horasPorDia,
            usoPrevisto: item.usoPrevisto,
            mobilizacao: item.mobilizacao,
            valorAcobrar: 0,
            valorTotal: 0
          }
        });
      }
    }

    // Clone equipe
    if (original.equipe?.length) {
      for (const e of original.equipe) {
        await prisma.propostaEquipe.create({
          data: { propostaId: tecnica.id, nome: e.nome, cargo: e.cargo }
        });
      }
    }

    // Clone responsabilidades
    if (original.responsabilidades?.length) {
      for (const r of original.responsabilidades) {
        await prisma.propostaResponsabilidade.create({
          data: { propostaId: tecnica.id, tipo: r.tipo, descricao: r.descricao }
        });
      }
    }

    // Reload full
    const full = await prisma.proposta.findUnique({
      where: { id: tecnica.id },
      include: { cliente: true, itens: true, equipe: true, responsabilidades: true }
    });

    res.status(201).json(full);
  } catch (error: any) {
    console.error('Gerar proposta técnica error:', error);
    res.status(500).json({ error: 'Failed to generate technical proposal', details: error.message });
  }
};

import { gerarPdfProposta } from '../services/legacyPdf.service';
import { sendPropostaComercial } from '../services/email.service';

export const enviarEmailProposta = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { to, subject, body } = req.body;
    const file = (req as any).file;
    
    const proposta = await prisma.proposta.findUnique({
      where: { id },
      include: { 
        cliente: true, 
        itens: true,
        responsabilidades: true,
        acessorios: true,
        equipe: true
      }
    }) as any;

    if (!proposta) {
      return res.status(404).json({ error: 'Proposta não encontrada' });
    }

    // Buscar imagens dos equipamentos
    const itemNames = (proposta.itens || []).map((i: any) => i.equipamento).filter(Boolean);
    const equipData = await prisma.equipamento.findMany({
      where: { nome: { in: itemNames } },
      select: { nome: true, imagem: true }
    });

    const itensComImagem = (proposta.itens || []).map((i: any) => {
      const eq = equipData.find(e => e.nome === i.equipamento);
      return { ...i, imagem: eq?.imagem };
    });

    // Respeitar flag "Não enviar para o cliente"
    if (proposta.naoEnviarAoCliente) {
      return res.status(400).json({ error: 'Esta proposta está marcada como "Não Enviar ao Cliente". Desmarque a opção antes de enviar.' });
    }

    let pdfBuffer: Buffer;

    if (file) {
      pdfBuffer = file.buffer;
    } else {
      // Buscar configuração da empresa
      const config = await prisma.configuracao.findUnique({ where: { id: 'default' } });
      const empresa = config || { razaoSocial: 'NACIONAL HIDROSANEAMENTO EIRELI EPP', cnpj: '00.000.000/0000-00' };

      // Auto gera o PDF com todos os dados via novo serviço consolidated
      pdfBuffer = await gerarPdfProposta(
        proposta, 
        proposta.cliente, 
        itensComImagem,
        empresa
      );
    }

    // Prioridade: to manual > contatoEmail > email do cliente > usuário logado
    let emailDestino = to || (proposta as any).contatoEmail || proposta.cliente?.email;
    
    // Se ainda vazio, tenta extrair do campo 'contato' se parecer um e-mail
    if (!emailDestino && proposta.contato && proposta.contato.includes('@')) {
      const emailMatch = proposta.contato.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) emailDestino = emailMatch[0];
    }

    if (!emailDestino && proposta.cc) {
      const firstValidCc = proposta.cc.split(/[;,]/).map((e: string) => e.trim()).find((e: string) => e.includes('@'));
      if (firstValidCc) emailDestino = firstValidCc;
    }

    if (!emailDestino) {
        // Fallback para o usuário logado para evitar erro 400 bloqueante se ele quiser testar
        const currentUser = req.user?.userId ? await prisma.user.findUnique({ where: { id: req.user.userId } }) : null;
        if (currentUser?.email) {
          emailDestino = currentUser.email;
          console.log(`[Email] Cliente sem e-mail. Usando e-mail do usuário logado: ${emailDestino}`);
        } else {
          return res.status(400).json({ 
            error: 'E-mail do destinatário não encontrado.',
            details: 'O cliente não possui e-mail cadastrado e não há e-mail de contato na proposta.' 
          });
        }
    }

    // Parse CC: campo `cc` armazena emails por ";"
    const ccEmails: string[] = [];
    if (proposta.cc) {

      const parsed = proposta.cc.split(';').map((e: string) => e.trim()).filter(Boolean);
      ccEmails.push(...parsed);
    }

    const nomeCliente = proposta.contato || proposta.cliente?.nome || proposta.cliente?.razaoSocial || 'Cliente';

    const result = await sendPropostaComercial({
      to: emailDestino,
      nomeCliente,
      codigoProposta: proposta.codigo,
      pdfBuffer,
      ccEmails
    });

    if (result.success) {
      // Atualiza status para ENVIADA se estiver como RASCUNHO
      if (proposta.status === 'RASCUNHO') {
        await prisma.proposta.update({
          where: { id },
          data: { status: 'ENVIADA' }
        });
      }
      res.json({ message: `E-mail enviado com sucesso para ${emailDestino}!`, result });
    } else {
      res.status(500).json({ error: 'Falha ao enviar e-mail', details: result.error });
    }

  } catch (error: any) {
    console.error('Erro ao enviar email de proposta:', error);
    res.status(500).json({ error: 'Falha interna ao disparar e-mail', details: error.message });
  }
};

export const gerarPDFPropostaWeb = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    
    const proposta = await prisma.proposta.findUnique({
      where: { id },
      include: { 
        cliente: true, 
        itens: true,
        responsabilidades: true,
        acessorios: true,
        equipe: true
      }
    }) as any;

    if (!proposta) {
      return res.status(404).json({ error: 'Proposta não encontrada' });
    }

    const itemNames = (proposta.itens || []).map((i: any) => i.equipamento).filter(Boolean);
    const equipData = await prisma.equipamento.findMany({
      where: { nome: { in: itemNames } },
      select: { nome: true, imagem: true }
    });

    const itensComImagem = (proposta.itens || []).map((i: any) => {
      const eq = equipData.find(e => e.nome === i.equipamento);
      return { ...i, imagem: eq?.imagem };
    });

    const config = await prisma.configuracao.findUnique({ where: { id: 'default' } });
    const empresa = config || { razaoSocial: 'NACIONAL HIDROSANEAMENTO EIRELI EPP', cnpj: '00.000.000/0000-00' };

    const pdfBuffer = await gerarPdfProposta(
      proposta, 
      proposta.cliente, 
      itensComImagem,
      empresa
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Proposta_${proposta.codigo}.pdf"`,
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('Erro ao gerar PDF da proposta:', error);
    res.status(500).json({ error: 'Falha ao processar arquivo PDF', details: error.message });
  }
};

export const gerarRevisao = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const old = await prisma.proposta.findUnique({
      where: { id },
      include: {
        itens: true,
        acessorios: true,
        responsabilidades: true,
        equipe: true,
        unidades: true
      }
    });

    if (!old) return res.status(404).json({ error: 'Proposta não encontrada' });

    await prisma.proposta.update({
      where: { id },
      data: { vigente: false, revisada: true }
    });

    let newCodigo = old.codigo || `PROP-${new Date().getFullYear()}-${old.numero || 0}`;
    const rxMatch = newCodigo.match(/-R(\d+)$/);
    if (rxMatch) {
      const v = parseInt(rxMatch[1]) + 1;
      newCodigo = newCodigo.replace(/-R\d+$/, `-R${v}`);
    } else {
      newCodigo = `${newCodigo}-R1`;
    }

    const nova = await prisma.proposta.create({
      data: {
        codigo: newCodigo,
        clienteId: old.clienteId,
        vendedor: old.vendedor,
        contato: old.contato,
        cc: old.cc,
        naoEnviarAoCliente: old.naoEnviarAoCliente,
        dataProposta: new Date(),
        dataValidade: old.dataValidade,
        introducao: old.introducao,
        objetivo: old.objetivo,
        descricaoValores: old.descricaoValores,
        descricaoGarantia: old.descricaoGarantia,
        condicoesPagamento: old.condicoesPagamento,
        pRL: old.pRL,
        cTe: old.cTe,
        pagamentoAntecipado: old.pagamentoAntecipado,
        valorTotal: old.valorTotal,
        tipo: old.tipo,
        status: 'RASCUNHO',
        tipoProposta: old.tipoProposta,
        escopoTecnico: old.escopoTecnico,
        dimensionamentoEquipe: old.dimensionamentoEquipe,
        qtdEquipamentos: old.qtdEquipamentos,
        diasTrabalho: old.diasTrabalho,
        propostaComercialId: old.propostaComercialId,
        vigente: true,
        revisada: false,

        itens: {
          create: old.itens.map(i => ({
            equipamento: i.equipamento,
            quantidade: i.quantidade,
            area: i.area,
            tipoCobranca: i.tipoCobranca,
            valorAcobrar: i.valorAcobrar,
            horasPorDia: i.horasPorDia,
            usoPrevisto: i.usoPrevisto,
            mobilizacao: i.mobilizacao,
            valorTotal: i.valorTotal
          }))
        },
        acessorios: {
          create: old.acessorios.map(a => ({
            acessorio: a.acessorio,
            quantidade: a.quantidade
          }))
        },
        responsabilidades: {
          create: old.responsabilidades.map(r => ({
            tipo: r.tipo,
            descricao: r.descricao
          }))
        },
        equipe: {
          create: old.equipe.map((e: any) => ({
            funcao: e.funcao,
            equipamento: e.equipamento,
            quantidade: e.quantidade,
            nome: e.nome || ''
          }))
        },
        unidades: {
          create: old.unidades.map((u: any) => ({
            codigo: `${u.codigo}-R${parseInt(old.codigo?.match(/-R(\d+)$/)?.[1] || '0', 10) + 1}`,
            unidadeNome: u.unidadeNome,
            unidadeCNPJ: u.unidadeCNPJ,
            unidadeEndereco: u.unidadeEndereco,
            unidadeContato: u.unidadeContato,
            valorTotal: u.valorTotal,
            dataValidade: old.dataValidade,
            clienteId: old.clienteId
          }))
        }
      }
    });

    res.status(201).json(nova);
  } catch (err: any) {
    console.error('Erro ao gerar revisao:', err);
    res.status(500).json({ error: 'Falha ao gerar revisão', details: err.message });
  }
};

// ─── DISPARAR PARA EQUIPE (Lógica de Disparo) ───────────────────
export const dispararEquipe = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { turnos, qtdPessoas, diaSaida, descricaoAdicional, oQueVaiFazer, algoDiferente } = req.body;

    const proposta = await prisma.proposta.findUnique({
      where: { id },
      include: {
        cliente: true,
        itens: true,
        equipe: true,
      }
    }) as any;

    if (!proposta) return res.status(404).json({ error: 'Proposta não encontrada' });

    const cliente = proposta.cliente || {};
    const itensNomes = proposta.itens?.map((i: any) => i.equipamento).filter(Boolean).join(', ') || 'Não especificado';
    
    // Formatação da mensagem estilo legacy
    const msg = `🚀 *NOVA CHAMADA DE SERVIÇO - ${proposta.codigo}*

*CLIENTE:* ${cliente.nome || cliente.razaoSocial || 'N/A'}
*CONTATO:* ${proposta.contato || 'N/A'}
*CIDADE:* ${cliente.cidade || 'N/A'} - ${cliente.estado || ''}
*TRABALHO:* ${itensNomes}
*QUANTIDADE DE PESSOAS:* ${qtdPessoas || 'A definir'}
*TURNOS:* ${turnos || '1'}
*O QUE VAI FAZER:* ${oQueVaiFazer || proposta.objetivo || 'Conforme proposta'}
*DIFERENCIAL:* ${algoDiferente || 'Nenhum'}
*DIA DE SAÍDA/VIAGEM:* ${diaSaida || 'A definir'}

------------------------------------------
*ORIENTAÇÕES PARA EQUIPE:*

*LOGÍSTICA:* Fazer a Ordem de Serviço de acordo com a Proposta ${proposta.codigo}.
*RH:* Verificar questão da documentação, segurança do trabalho e APR.
*SUPRIMENTOS (JOSÉ):* Separar hospedagem, alimentação e lavanderia.

------------------------------------------
_Mensagem gerada automaticamente pelo Sistema Nacional Hidro_`;

    // 1. Disparo WhatsApp (Grupo se disponível, se não usa fallback)
    const groupJid = process.env.WHATSAPP_GROUP_JID || ''; // Idealmente viria de uma config global
    if (groupJid) {
       await enviarMensagemWhatsApp(groupJid, msg);
    }

    // 2. Disparo E-mail para os setores
    const emailsSetores = [
      'rh@nacionalhidro.com.br',
      'logistica@nacionalhidro.com.br',
      'patio@nacionalhidro.com.br', // Jose / Suprimentos
      'segtrabalho@nacionalhidro.com.br'
    ];

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background: #1a365d; color: white; padding: 20px; text-align: center;">
          <h2 style="margin: 0;">CHAMADA DE SERVIÇO</h2>
          <p style="margin: 5px 0 0; opacity: 0.8;">Proposta: ${proposta.codigo}</p>
        </div>
        <div style="padding: 20px; color: #334155;">
          <p><strong>Cliente:</strong> ${cliente.nome || 'N/A'}</p>
          <p><strong>Cidade:</strong> ${cliente.cidade || 'N/A'}</p>
          <p><strong>Trabalho:</strong> ${itensNomes}</p>
          <p><strong>Turnos:</strong> ${turnos || '1'}</p>
          <p><strong>Qtd Pessoas:</strong> ${qtdPessoas || 'A definir'}</p>
          <p><strong>Saída:</strong> ${diaSaida || 'A definir'}</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p><strong>Descrição do Trabalho:</strong><br/>${oQueVaiFazer || proposta.objetivo || 'N/A'}</p>
          ${descricaoAdicional ? `<p><strong>Observações Extras:</strong><br/>${descricaoAdicional}</p>` : ''}
        </div>
        <div style="background: #f8fafc; padding: 15px; font-size: 11px; color: #64748b; text-align: center;">
          Este é um disparo automático do sistema operacional.
        </div>
      </div>
    `;

    await sendEmail({
      to: emailsSetores,
      subject: `[CHAMADA] ${proposta.codigo} - ${cliente.nome || 'Serviço'}`,
      html: emailHtml,
      fromName: 'Nacional Hidro Operacional'
    });

    res.json({ success: true, message: 'Disparo realizado com sucesso para WhatsApp e Setores.' });

  } catch (error: any) {
    console.error('Erro ao disparar para equipe:', error);
    res.status(500).json({ error: 'Falha ao realizar disparo', details: error.message });
  }
};
