import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { SequenceService } from '../services/sequence.service';
import { gerarPdfMedicao } from '../services/legacyPdf.service';
import { sendEmail } from '../services/email.service';

const CC_FINANCEIRO = 'financeiro@nacionalhidro.com.br';
const CC_DIRETORIA  = 'bruno@nacionalhidro.com.br';

// ─── LIST MEDICOES (KANBAN + LISTA) ────────────────────────────
export const listMedicoes = async (req: AuthRequest, res: Response) => {
    try {
        const { clienteId, status, search, dataInicio, dataFim, view } = req.query;
        const where: any = {};

        if (clienteId) where.clienteId = clienteId as string;
        if (status)    where.status    = status as string;
        if (search) {
            where.OR = [
                { codigo: { contains: search as string, mode: 'insensitive' as any } },
                { cliente: { nome: { contains: search as string, mode: 'insensitive' as any } } },
            ];
        }
        if (dataInicio || dataFim) {
            where.createdAt = {};
            if (dataInicio) where.createdAt.gte = new Date(dataInicio as string);
            if (dataFim)    where.createdAt.lte = new Date(dataFim as string);
        }

        const list = await prisma.medicao.findMany({
            where,
            include: {
                cliente: { select: { id: true, nome: true, razaoSocial: true, email: true, telefone: true } },
                ordensServico: {
                    select: { id: true, codigo: true, valorPrecificado: true, status: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Kanban grouping
        const kanban = {
            EM_ABERTO:            list.filter((m: any) => m.status === 'EM_ABERTO'),
            EM_CONFERENCIA:       list.filter((m: any) => m.status === 'EM_CONFERENCIA'),
            AGUARDANDO_APROVACAO: list.filter((m: any) => m.status === 'AGUARDANDO_APROVACAO'),
            APROVADA:             list.filter((m: any) => m.status === 'APROVADA' || m.status === 'APROVADA_PARCIAL'),
            CONTESTADA:           list.filter((m: any) => m.status === 'CONTESTADA'),
            FINALIZADA:           list.filter((m: any) => m.status === 'FINALIZADA'),
        };

        res.json({ kanban, list, total: list.length });
    } catch (error) {
        console.error('List medicoes error:', error);
        res.status(500).json({ error: 'Failed to fetch measurements' });
    }
};

// ─── GET MEDICAO ────────────────────────────────────────────────
export const getMedicao = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const medicao = await prisma.medicao.findUnique({
            where: { id },
            include: {
                cliente: true,
                ordensServico: {
                    include: {
                        itensCobranca: true,
                        servicos: true,
                    }
                }
            }
        });
        if (!medicao) return res.status(404).json({ error: 'Medicao not found' });
        res.json(medicao);
    } catch (error) {
        console.error('Get medicao error:', error);
        res.status(500).json({ error: 'Failed to fetch measurement' });
    }
};

// ─── GET HISTORICO EMAILS ───────────────────────────────────────
export const getMedicaoEmailHistory = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const history = await prisma.cobrancaEmail.findMany({
            where: { medicaoId: id },
            orderBy: { dataEnvio: 'desc' },
            take: 50
        });
        res.json(history);
    } catch (error) {
        console.error('Get email history error:', error);
        res.status(500).json({ error: 'Failed to fetch email history' });
    }
};

// ─── CREATE MEDICAO ─────────────────────────────────────────────
export const createMedicao = async (req: AuthRequest, res: Response) => {
    try {
        const {
            clienteId, osIds, periodo, observacoes, subitens,
            totalServico, totalHora, adicional, desconto,
            cte, solicitante, vendedorId, porcentagemRL: overridePct
        } = req.body;

        if (!osIds || osIds.length === 0) {
            return res.status(400).json({ error: 'Selecione pelo menos uma OS precificada' });
        }

        const osList = await prisma.ordemServico.findMany({
            where: { id: { in: osIds }, clienteId, status: 'PRECIFICADA' }
        });

        if (osList.length !== osIds.length) {
            return res.status(400).json({ error: 'Todas as OS devem pertencer ao mesmo cliente e estar precificadas' });
        }

        // Cálculo do valor total (manual tem prioridade sobre automático)
        let valorTotal = 0;
        if (totalServico !== undefined || totalHora !== undefined || adicional !== undefined) {
            valorTotal = Number(totalServico || 0) + Number(totalHora || 0) + Number(adicional || 0) - Number(desconto || 0);
        } else {
            valorTotal = osList.reduce((sum: number, os: any) => {
                return sum + (os.valorPrecificado ? parseFloat(os.valorPrecificado.toString()) : 0);
            }, 0);
            if (subitens && Array.isArray(subitens)) {
                const extraSum = subitens.reduce((sum: number, sub: any) => sum + Number(sub.valor || 0), 0);
                valorTotal += extraSum;
            }
        }

        // Rateio RL / NF
        let valorRL = 0;
        let valorNFSe = 0;
        if (cte) {
            valorRL = 0;
            valorNFSe = valorTotal;
        } else {
            const cliente: any = await prisma.cliente.findUnique({ where: { id: clienteId } });
            const pctRL = overridePct !== undefined ? Number(overridePct) : (cliente?.porcentagemRL ? parseFloat(cliente.porcentagemRL.toString()) : 90);
            valorRL   = valorTotal * (pctRL / 100);
            valorNFSe = valorTotal - valorRL;
        }

        const codigo = await SequenceService.generateCode('medicao', 'MED');

        const medicao = await prisma.medicao.create({
            data: {
                codigo,
                clienteId,
                vendedorId,
                solicitante,
                periodo,
                valorTotal,
                valorRL,
                valorNFSe,
                totalServico: totalServico ? Number(totalServico) : null,
                totalHora:    totalHora    ? Number(totalHora)    : null,
                adicional:    adicional    ? Number(adicional)    : null,
                desconto:     desconto     ? Number(desconto)     : null,
                porcentagemRL: overridePct !== undefined ? Number(overridePct) : null,
                cte: !!cte,
                revisao: 0,
                status: 'EM_ABERTO',
                observacoes,
                subitens: subitens || [],
                ordensServico: { connect: osIds.map((id: string) => ({ id })) }
            },
            include: {
                cliente: { select: { id: true, nome: true } },
                ordensServico: { select: { id: true, codigo: true, valorPrecificado: true } }
            }
        });

        await prisma.ordemServico.updateMany({
            where: { id: { in: osIds } },
            data: { status: 'EM_MEDICAO' }
        });

        res.status(201).json(medicao);
    } catch (error: any) {
        console.error('Create medicao error:', error);
        res.status(500).json({ error: 'Failed to create measurement', details: error.message });
    }
};

// ─── UPDATE MEDICAO (campos gerais — só em EM_ABERTO) ───────────
export const updateMedicao = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const {
            periodo, observacoes, subitens,
            totalServico, totalHora, adicional, desconto,
            cte, solicitante, vendedorId, porcentagemRL: overridePct,
            osIds // OS a adicionar/remover
        } = req.body;

        const current = await prisma.medicao.findUnique({
            where: { id },
            include: { ordensServico: true }
        });
        if (!current) return res.status(404).json({ error: 'Medição não encontrada' });
        if (current.status !== 'EM_ABERTO') {
            return res.status(400).json({ error: `Só é possível editar medições em status EM_ABERTO. Status atual: ${current.status}` });
        }

        // Recalcula valores se fornecidos
        let valorTotal = Number(current.valorTotal);
        if (totalServico !== undefined || totalHora !== undefined || adicional !== undefined || desconto !== undefined) {
            valorTotal = Number(totalServico ?? current.totalServico ?? 0)
                       + Number(totalHora    ?? current.totalHora    ?? 0)
                       + Number(adicional    ?? current.adicional    ?? 0)
                       - Number(desconto     ?? current.desconto     ?? 0);
        }

        const pctRL = overridePct !== undefined ? Number(overridePct) : (current.porcentagemRL ? Number(current.porcentagemRL) : 90);
        const isCte = cte !== undefined ? !!cte : current.cte;
        const valorRL   = isCte ? 0 : valorTotal * (pctRL / 100);
        const valorNFSe = isCte ? valorTotal : valorTotal - valorRL;

        const updateData: any = {
            periodo:      periodo      ?? current.periodo,
            observacoes:  observacoes  ?? current.observacoes,
            subitens:     subitens     ?? current.subitens,
            solicitante:  solicitante  ?? current.solicitante,
            vendedorId:   vendedorId   ?? current.vendedorId,
            cte: isCte,
            valorTotal,
            valorRL,
            valorNFSe,
            porcentagemRL: pctRL,
        };
        if (totalServico  !== undefined) updateData.totalServico = Number(totalServico);
        if (totalHora     !== undefined) updateData.totalHora    = Number(totalHora);
        if (adicional     !== undefined) updateData.adicional    = Number(adicional);
        if (desconto      !== undefined) updateData.desconto     = Number(desconto);

        // Atualiza OS se fornecidas
        if (osIds && Array.isArray(osIds)) {
            const currentOsIds = current.ordensServico.map((os: any) => os.id);
            const removedOs = currentOsIds.filter((id: string) => !osIds.includes(id));
            if (removedOs.length > 0) {
                await prisma.ordemServico.updateMany({ where: { id: { in: removedOs } }, data: { status: 'PRECIFICADA' } });
            }
            updateData.ordensServico = {
                disconnect: removedOs.map((id: string) => ({ id })),
                connect: osIds.filter((id: string) => !currentOsIds.includes(id)).map((id: string) => ({ id }))
            };
        }

        const medicao = await prisma.medicao.update({
            where: { id },
            data: updateData,
            include: {
                cliente: { select: { id: true, nome: true } },
                ordensServico: { select: { id: true, codigo: true, valorPrecificado: true } }
            }
        });

        res.json(medicao);
    } catch (error: any) {
        console.error('Update medicao error:', error);
        res.status(500).json({ error: 'Failed to update measurement', details: error.message });
    }
};

// ─── UPDATE STATUS ──────────────────────────────────────────────
export const updateMedicaoStatus = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const {
            status, observacoes, valorAprovado, percentualAprovado,
            aprovadaPor, motivoContestacao, justificativaCancelamento,
            emailVendedor
        } = req.body;

        const validStatuses = [
            'EM_ABERTO', 'EM_CONFERENCIA', 'AGUARDANDO_APROVACAO',
            'APROVADA', 'APROVADA_PARCIAL', 'CONTESTADA', 'REPROVADA', 'FINALIZADA', 'CANCELADA'
        ];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Status inválido' });
        }

        const currentMedicao = await prisma.medicao.findUnique({
            where: { id },
            include: {
                cliente: true,
                ordensServico: { include: { itensCobranca: true, servicos: true } }
            }
        });
        if (!currentMedicao) return res.status(404).json({ error: 'Medição não encontrada' });

        const empresa = await prisma.configuracao.findFirst() || {} as any;

        // ─── REVISÃO: REPROVADA cria nova medição ───────────────
        if (status === 'REPROVADA') {
            const novaRevisao = await prisma.medicao.create({
                data: {
                    codigo: currentMedicao.codigo,
                    revisao: currentMedicao.revisao + 1,
                    clienteId:    currentMedicao.clienteId,
                    vendedorId:   currentMedicao.vendedorId,
                    solicitante:  currentMedicao.solicitante,
                    periodo:      currentMedicao.periodo,
                    valorTotal:   currentMedicao.valorTotal,
                    valorRL:      currentMedicao.valorRL,
                    valorNFSe:    currentMedicao.valorNFSe,
                    totalServico: currentMedicao.totalServico,
                    totalHora:    currentMedicao.totalHora,
                    adicional:    currentMedicao.adicional,
                    desconto:     currentMedicao.desconto,
                    porcentagemRL: currentMedicao.porcentagemRL,
                    cte:     currentMedicao.cte,
                    status:  'EM_ABERTO',
                    observacoes: `Revisão gerada a partir da contestação: ${motivoContestacao || ''}`,
                    subitens: (currentMedicao.subitens || {}) as any,
                    ordensServico: {
                        connect: currentMedicao.ordensServico.map(os => ({ id: os.id }))
                    }
                }
            });

            await prisma.medicao.update({
                where: { id },
                data: {
                    status: 'CONTESTADA',
                    motivoContestacao: motivoContestacao || 'Reprovada pelo cliente',
                    contestadaEm: new Date(),
                    medicaoContestadaId: novaRevisao.id
                }
            });

            return res.json({ message: 'Nova revisão criada com sucesso', medicao: novaRevisao });
        }

        const updateData: any = { status };
        if (observacoes !== undefined) updateData.observacoes = observacoes;

        // ─── CONFERÊNCIA: gera PDF e envia ao vendedor ──────────
        if (status === 'EM_CONFERENCIA') {
            const pdfBuffer = await gerarPdfMedicao(
                currentMedicao, empresa, currentMedicao.cliente,
                currentMedicao.ordensServico
            );

            let toEmail = emailVendedor;
            if (!toEmail && currentMedicao.vendedorId) {
                const vendedor = await prisma.user.findUnique({ where: { id: currentMedicao.vendedorId } });
                toEmail = vendedor?.email;
            }
            if (!toEmail) toEmail = CC_FINANCEIRO;

            const htmlVendedor = `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#333;">
                <p style="font-size:12pt;">Prezado Vendedor,</p><br/>
                <p style="font-size:12pt;">Anexamos medição <strong>${currentMedicao.codigo}${currentMedicao.revisao > 0 ? `/R${currentMedicao.revisao}` : ''}</strong> para sua conferência, gentileza retornar se precisa de ajuste ou se está validada para que possamos sequenciar o envio ao cliente.</p><br/>
                <p style="font-size:12pt;"><i>Este é um e-mail automático, em caso de dúvidas permanecemos a disposição no e-mail ${CC_FINANCEIRO}</i></p><br/>
                <p style="font-size:12pt;">Atenciosamente,<br/><strong>Nacional Hidro</strong></p>
            </div>`;

            try {
                await sendEmail({
                    to: toEmail,
                    cc: [CC_FINANCEIRO, CC_DIRETORIA],
                    subject: `Nacional Hidro - Conferência da Medição ${currentMedicao.codigo}`,
                    html: htmlVendedor,
                    attachments: [
                        {
                            filename: `medicao_${currentMedicao.cliente.nome?.toLowerCase().replace(/\s+/g, '_')}.pdf`,
                            content: pdfBuffer,
                            contentType: 'application/pdf'
                        }
                    ]
                });

                // Registra no histórico
                await prisma.cobrancaEmail.create({
                    data: {
                        medicaoId: id,
                        destinatario: toEmail,
                        assunto: `[CONFERÊNCIA] Medição ${currentMedicao.codigo} enviada ao vendedor`,
                        corpo: htmlVendedor,
                        statusEnvio: 'ENVIADO'
                    }
                });
            } catch (emailErr: any) {
                console.error('[Email Conferência] Falha:', emailErr.message);
                await prisma.cobrancaEmail.create({
                    data: {
                        medicaoId: id,
                        destinatario: toEmail,
                        assunto: `[CONFERÊNCIA FALHA] Medição ${currentMedicao.codigo}`,
                        corpo: 'Falha ao enviar e-mail de conferência.',
                        statusEnvio: 'FALHA',
                        erro: emailErr.message
                    }
                });
            }
        }

        // ─── APROVAÇÃO ─────────────────────────────────────────
        if (status === 'APROVADA' || status === 'APROVADA_PARCIAL') {
            updateData.aprovadaEm  = new Date();
            updateData.aprovadaPor = aprovadaPor || req.user?.userId;

            if (status === 'APROVADA_PARCIAL') {
                updateData.valorAprovado = Number(valorAprovado || 0);
                const total = Number(currentMedicao.valorTotal);
                updateData.percentualAprovado = total > 0 ? (Number(updateData.valorAprovado) / total) * 100 : 0;
            } else {
                updateData.valorAprovado     = currentMedicao.valorTotal;
                updateData.percentualAprovado = 100;
            }

            const valorTotalFinal = Number(updateData.valorAprovado);

            // ─── GERAÇÃO DE FATURAMENTOS ──────────────────────
            if (currentMedicao.cte) {
                await prisma.faturamento.create({
                    data: {
                        medicaoId: currentMedicao.id,
                        clienteId: currentMedicao.clienteId,
                        tipo: 'CTE',
                        valorBruto: valorTotalFinal,
                        valorLiquido: valorTotalFinal,
                        status: 'EM_ABERTO',
                        observacoes: `Medição ${currentMedicao.codigo} (100% CTE)`
                    }
                });
            } else {
                const pctRL = currentMedicao.porcentagemRL
                    ? Number(currentMedicao.porcentagemRL)
                    : ((currentMedicao.cliente as any)?.porcentagemRL ? Number((currentMedicao.cliente as any).porcentagemRL) : 90);
                const valorLocacaoCalc = valorTotalFinal * (pctRL / 100);
                const valorNFSeCalc    = valorTotalFinal - valorLocacaoCalc;

                if (valorLocacaoCalc > 0) {
                    await prisma.faturamento.create({
                        data: {
                            medicaoId: currentMedicao.id,
                            clienteId: currentMedicao.clienteId,
                            tipo: 'RL',
                            valorBruto: valorLocacaoCalc,
                            valorLiquido: valorLocacaoCalc,
                            status: 'EM_ABERTO',
                            observacoes: `Medição ${currentMedicao.codigo} — Rateio Locação ${pctRL}%`
                        }
                    });
                }
                if (valorNFSeCalc > 0) {
                    await prisma.faturamento.create({
                        data: {
                            medicaoId: currentMedicao.id,
                            clienteId: currentMedicao.clienteId,
                            tipo: 'NFSE',
                            valorBruto: valorNFSeCalc,
                            valorLiquido: valorNFSeCalc,
                            status: 'EM_ABERTO',
                            observacoes: `Medição ${currentMedicao.codigo} — Rateio Serviço ${100 - pctRL}%`
                        }
                    });
                }
            }
        }
        else if (status === 'CONTESTADA') {
            updateData.motivoContestacao = motivoContestacao;
            updateData.contestadaEm = new Date();
        }
        else if (status === 'CANCELADA') {
            updateData.justificativaCancelamento = justificativaCancelamento;
        }

        const medicao = await prisma.medicao.update({
            where: { id },
            data: updateData,
            include: {
                cliente: { select: { id: true, nome: true } },
                ordensServico: { select: { id: true, codigo: true } }
            }
        });

        // Atualiza status das OS
        if (status === 'FINALIZADA' || status === 'APROVADA') {
            const osIds = medicao.ordensServico.map((os: any) => os.id);
            await prisma.ordemServico.updateMany({ where: { id: { in: osIds } }, data: { status: 'FATURADA' } });
        }
        if (status === 'CANCELADA') {
            const osIds = medicao.ordensServico.map((os: any) => os.id);
            await prisma.ordemServico.updateMany({ where: { id: { in: osIds } }, data: { status: 'PRECIFICADA' } });
        }

        res.json(medicao);
    } catch (error: any) {
        console.error('Update medicao status error:', error);
        res.status(500).json({ error: 'Failed to update measurement status', details: error.message });
    }
};

// ─── ENVIAR MEDIÇÃO PARA O CLIENTE ──────────────────────────────
export const enviarAoCliente = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const currentMedicao = await prisma.medicao.findUnique({
            where: { id },
            include: {
                cliente: true,
                ordensServico: { include: { itensCobranca: true, servicos: true } }
            }
        });

        if (!currentMedicao) return res.status(404).json({ error: 'Medição não encontrada' });

        const empresa = await prisma.configuracao.findFirst() || {} as any;
        const pdfBuffer = await gerarPdfMedicao(
            currentMedicao, empresa, currentMedicao.cliente,
            currentMedicao.ordensServico
        );

        const destinatario = currentMedicao.cliente.email;
        if (!destinatario) return res.status(400).json({ error: 'Cliente sem e-mail cadastrado.' });

        const htmlText = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#333;">
            <p>Prezado(a) ${currentMedicao.cliente.nome},</p><br/>
            <p>Segue em anexo a Medição de Serviços código <strong>${currentMedicao.codigo}${currentMedicao.revisao > 0 ? `/R${currentMedicao.revisao}` : ''}</strong>.</p>
            <p>Por favor, retorne respondendo a este e-mail com o seu <strong>De Acordo</strong> em até 2 dias úteis.</p><br/>
            <p><i>"Prezado Cliente, aguardamos a aprovação da medição num prazo de até 2 dias corridos a contar do seu recebimento; sujeito a cobranças de multa e juros conforme previsto em proposta."</i></p><br/>
            <p>Atenciosamente,<br/><strong>Nacional Hidro</strong></p>
        </div>`;

        const resp = await sendEmail({
            to: destinatario,
            cc: [CC_FINANCEIRO],
            subject: `Aprovação de Medição - Nacional Hidro - ${currentMedicao.codigo}`,
            html: htmlText,
            attachments: [
                {
                    filename: `Medicao_${currentMedicao.codigo}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                }
            ]
        });

        if (!resp.success) throw new Error('Falha no disparo SMTP');

        // Registra no histórico e marca dataCobranca
        await prisma.cobrancaEmail.create({
            data: {
                medicaoId: id,
                destinatario,
                assunto: `Medição ${currentMedicao.codigo} enviada ao cliente`,
                corpo: htmlText,
                statusEnvio: 'ENVIADO'
            }
        });

        const updatedMedicao = await prisma.medicao.update({
            where: { id },
            data: {
                status: 'AGUARDANDO_APROVACAO',
                dataCobranca: new Date()
            }
        });

        res.json({ message: 'Enviado com sucesso', medicao: updatedMedicao });
    } catch (error: any) {
        console.error('Enviar medicao error:', error);
        res.status(500).json({ error: 'Falha no envio da medição', details: error.message });
    }
};

// ─── GERAR / BAIXAR PDF (sob demanda) ──────────────────────────
export const gerarPdfMedicaoBaixar = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const medicao = await prisma.medicao.findUnique({
            where: { id },
            include: {
                cliente: true,
                ordensServico: { include: { itensCobranca: true, servicos: true } }
            }
        });
        if (!medicao) return res.status(404).json({ error: 'Medição não encontrada' });

        const empresa = await prisma.configuracao.findFirst() || {} as any;
        const pdfBuffer = await gerarPdfMedicao(medicao, empresa, medicao.cliente, medicao.ordensServico);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="Medicao_${medicao.codigo}_R${medicao.revisao}.pdf"`,
            'Content-Length': pdfBuffer.length
        });
        res.end(pdfBuffer);
    } catch (error: any) {
        console.error('Gerar PDF medicao error:', error);
        res.status(500).json({ error: 'Falha ao gerar PDF', details: error.message });
    }
};

// ─── FECHAR MEDIÇÃO POR RDO ─────────────────────────────────────
export const fecharPorRDO = async (req: AuthRequest, res: Response) => {
    try {
        const { osId, observacoes } = req.body;
        if (!osId) return res.status(400).json({ error: 'osId is required' });

        const os: any = await prisma.ordemServico.findUnique({
            where: { id: osId },
            include: { cliente: true, proposta: true, rdos: true }
        });
        if (!os)          return res.status(404).json({ error: 'OS not found' });
        if (!os.proposta) return res.status(400).json({ error: 'OS has no linked proposal for billing rules' });

        const prop   = os.proposta;
        const rdos   = os.rdos || [];
        const franquia  = Number(prop.franquiaHoras || 8);
        const addHE     = Number(prop.adicionalHoraExtra || 35) / 100;
        const addNoturno = Number(prop.adicionalNoturno || 35) / 100;

        const valorBaseOS  = Number(os.valorPrecificado || 0);
        const totalRDOs    = rdos.length || 1;
        const valorHoraBase = valorBaseOS / (totalRDOs * franquia);

        let totalExtras = 0, totalNoturnas = 0, valorExtrasHE = 0, valorNoturnoAdd = 0;
        rdos.forEach((r: any) => {
            const he  = Number(r.horasExtras   || 0);
            const not = Number(r.horasNoturnas || 0);
            totalExtras   += he;
            totalNoturnas += not;
            valorExtrasHE   += he  * valorHoraBase * (1 + addHE);
            valorNoturnoAdd += not * valorHoraBase * addNoturno;
        });

        const subitens = [
            { id: 'BASE',    descricao: `Valor Base (OS ${os.codigo})`,           valor: valorBaseOS },
            { id: 'HE',      descricao: `Horas Extras (${totalExtras}h)`,          valor: valorExtrasHE },
            { id: 'NOTURNO', descricao: `Adicional Noturno (${totalNoturnas}h)`,   valor: valorNoturnoAdd }
        ];

        const valorTotal = valorBaseOS + valorExtrasHE + valorNoturnoAdd;
        const pctRL      = os.cliente?.porcentagemRL ? Number(os.cliente.porcentagemRL) : 90;
        const valorRL    = valorTotal * (pctRL / 100);
        const valorNFSe  = valorTotal - valorRL;

        const codigo = await SequenceService.generateCode('medicao', 'MED');
        const medicao = await prisma.medicao.create({
            data: {
                codigo,
                clienteId:    os.clienteId,
                vendedorId:   os.vendedorId,
                periodo:      `Referente OS ${os.codigo}`,
                valorTotal, valorRL, valorNFSe,
                totalServico: valorBaseOS,
                totalHora:    valorExtrasHE + valorNoturnoAdd,
                adicional: 0, desconto: 0,
                porcentagemRL: pctRL,
                cte: false, revisao: 0,
                observacoes: observacoes || 'Gerado via fechamento de RDO',
                subitens: subitens as any,
                ordensServico: { connect: { id: osId } },
                status: 'EM_ABERTO'
            }
        });

        await prisma.ordemServico.update({
            where: { id: osId },
            data: { status: 'EM_MEDICAO' }
        });

        res.status(201).json(medicao);
    } catch (error: any) {
        console.error('Fechar por RDO error:', error);
        res.status(500).json({ error: 'Failed to close measurement from RDO', details: error.message });
    }
};

// ─── LIST OS PRECIFICADAS DISPONÍVEIS ──────────────────────────
export const listOSDisponiveis = async (req: AuthRequest, res: Response) => {
    try {
        const { clienteId } = req.query;
        const where: any = { status: 'PRECIFICADA', medicaoId: null };
        if (clienteId) where.clienteId = clienteId as string;

        const list = await prisma.ordemServico.findMany({
            where,
            include: {
                cliente: { select: { id: true, nome: true } },
                itensCobranca: true
            },
            orderBy: { dataBaixa: 'desc' as any }
        });

        res.json(list);
    } catch (error) {
        console.error('List OS disponiveis error:', error);
        res.status(500).json({ error: 'Failed to fetch available OS' });
    }
};
