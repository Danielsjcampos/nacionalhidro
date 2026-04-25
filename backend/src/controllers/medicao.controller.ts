import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { SequenceService } from '../services/sequence.service';
import { gerarPdfMedicao } from '../services/legacyPdf.service';
import { sendEmail } from '../services/email.service';
import { focusNfeService } from '../services/focusNfe.service';
import { PricingService } from '../services/pricing.service';
import { TaxService } from '../services/taxData.service';
import axios from 'axios';
import mustache from 'mustache';

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
                cliente: { select: { id: true, nome: true, codigo: true, razaoSocial: true, email: true, telefone: true } },
                ordensServico: {
                    select: { id: true, codigo: true, valorPrecificado: true, status: true, tipoCobranca: true }
                },
                cobrancasEmail: { orderBy: { dataEnvio: 'desc' as any }, take: 5 }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Enrich with vendedor name
        const vendedorIds = [...new Set(list.filter(m => m.vendedorId).map(m => m.vendedorId!))];
        const vendedores = vendedorIds.length > 0
            ? await prisma.user.findMany({ where: { id: { in: vendedorIds } }, select: { id: true, name: true } })
            : [];
        const vendedorMap = Object.fromEntries(vendedores.map(v => [v.id, v]));
        const enrichedList = list.map(m => ({ ...m, vendedor: m.vendedorId ? vendedorMap[m.vendedorId] || null : null }));

        const kanban = {
            EM_ABERTO:            enrichedList.filter((m: any) => m.status === 'EM_ABERTO'),
            EM_CONFERENCIA:       enrichedList.filter((m: any) => m.status === 'EM_CONFERENCIA'),
            AGUARDANDO_APROVACAO: enrichedList.filter((m: any) => m.status === 'AGUARDANDO_APROVACAO'),
            APROVADA:             enrichedList.filter((m: any) => m.status === 'APROVADA' || m.status === 'APROVADA_PARCIAL'),
            CONTESTADA:           enrichedList.filter((m: any) => m.status === 'CONTESTADA'),
            FINALIZADA:           enrichedList.filter((m: any) => m.status === 'FINALIZADA'),
        };

        res.json({ kanban, list: enrichedList, total: enrichedList.length });
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
                        itensCobranca: { include: { centroCusto: true } },
                        servicos: true,
                        proposta: true,
                    }
                },
                faturamentos: {
                    orderBy: { createdAt: 'desc' as any },
                    include: { cliente: { select: { id: true, nome: true } } }
                },
                cobrancasEmail: { orderBy: { dataEnvio: 'desc' as any }, take: 20 }
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
            clienteId, osIds, subitens, periodo, observacoes,
            totalServico, totalHora, adicional, desconto,
            cte, solicitante, vendedorId, porcentagemRL: overridePct,
            tipoDocumento, empresa, emailCobrancaCC, cnpjFaturamento
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
                tipoDocumento: tipoDocumento || 'RL',
                empresa,
                emailCobrancaCC,
                cnpjFaturamento,
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
            totalServico, totalHora, adicional, desconto,
            cte, solicitante, vendedorId, porcentagemRL: overridePct,
            osIds, tipoDocumento, periodo, observacoes, subitens, // OS a adicionar/remover
            empresa, emailCobrancaCC, cnpjFaturamento
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
            tipoDocumento: tipoDocumento ?? current.tipoDocumento,
            empresa:       empresa       ?? current.empresa,
            emailCobrancaCC: emailCobrancaCC ?? current.emailCobrancaCC,
            cnpjFaturamento: cnpjFaturamento ?? current.cnpjFaturamento,
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
                ordensServico: { include: { itensCobranca: true, servicos: true, proposta: true } }
            }
        });
        if (!currentMedicao) return res.status(404).json({ error: 'Medição não encontrada' });

        const empresa = await prisma.configuracao.findFirst() || {} as any;

        // ─── REPROVADA: reabrir para edição (sem clonar) ─────────
        if (status === 'REPROVADA') {
            const medicaoReaberta = await prisma.medicao.update({
                where: { id },
                data: {
                    status: 'EM_ABERTO',
                    motivoReprovacao: motivoContestacao || justificativaCancelamento || 'Reprovada pelo cliente',
                    reprovadaEm: new Date(),
                    aprovadaEm: null,
                    aprovadaPor: null,
                    valorAprovado: null,
                    percentualAprovado: null,
                },
                include: {
                    cliente: { select: { id: true, nome: true } },
                    ordensServico: { select: { id: true, codigo: true } }
                }
            });

            // Reverter as OS para PRECIFICADA (disponíveis para edição)
            const osIds = medicaoReaberta.ordensServico.map((os: any) => os.id);
            if (osIds.length > 0) {
                await prisma.ordemServico.updateMany({
                    where: { id: { in: osIds } },
                    data: { status: 'PRECIFICADA' }
                });
            }

            return res.json({ message: 'Medição reaberta para edição', medicao: medicaoReaberta });
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
            const cnpjMedicao = currentMedicao.cnpjFaturamento || empresa.cnpj; // Fallback para config se não houver na medição
            const empresaFiscal = await prisma.empresaCNPJ.findUnique({ where: { cnpj: cnpjMedicao } });
            const configGeneral = await (prisma as any).configuracao.findFirst();

            if (currentMedicao.cte) {
                // Cálculo de impostos para CTE (Geralmente 100% serviço, mas sem retenções se for Simples)
                const taxesCTE = TaxService.calculateTaxes(
                    valorTotalFinal,
                    empresaFiscal?.regimeTributario || 1,
                    Number(configGeneral?.aliquotaIss || 0),
                    0 // CTE raramente retém INSS neste fluxo
                );

                await (prisma as any).faturamento.create({
                    data: {
                        medicaoId: currentMedicao.id,
                        clienteId: currentMedicao.clienteId,
                        tipo: 'CTE',
                        valorBruto: valorTotalFinal,
                        valorLiquido: taxesCTE.valorLiquido,
                        valorPIS: taxesCTE.valorPIS,
                        valorCOFINS: taxesCTE.valorCOFINS,
                        valorCSLL: taxesCTE.valorCSLL,
                        valorIR: taxesCTE.valorIR,
                        valorISS: taxesCTE.valorISS,
                        valorINSS: taxesCTE.valorINSS,
                        cnpjFaturamento: cnpjMedicao,
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
                    await (prisma as any).faturamento.create({
                        data: {
                            medicaoId: currentMedicao.id,
                            clienteId: currentMedicao.clienteId,
                            tipo: 'RL',
                            valorBruto: valorLocacaoCalc,
                            valorLiquido: valorLocacaoCalc,
                            cnpjFaturamento: cnpjMedicao,
                            status: 'EM_ABERTO',
                            observacoes: `Medição ${currentMedicao.codigo} — Rateio Locação ${pctRL}%`
                        }
                    });
                }
                if (valorNFSeCalc > 0) {
                    const taxesNFSe = TaxService.calculateTaxes(
                        valorNFSeCalc,
                        empresaFiscal?.regimeTributario || 1,
                        Number(configGeneral?.aliquotaIss || 2),
                        3.5 // INSS padrão 3.5%
                    );

                    await (prisma as any).faturamento.create({
                        data: {
                            medicaoId: currentMedicao.id,
                            clienteId: currentMedicao.clienteId,
                            tipo: 'NFSE',
                            valorBruto: valorNFSeCalc,
                            valorLiquido: taxesNFSe.valorLiquido,
                            valorPIS: taxesNFSe.valorPIS,
                            valorCOFINS: taxesNFSe.valorCOFINS,
                            valorCSLL: taxesNFSe.valorCSLL,
                            valorIR: taxesNFSe.valorIR,
                            valorISS: taxesNFSe.valorISS,
                            valorINSS: taxesNFSe.valorINSS,
                            percentualINSS: taxesNFSe.aliquotaINSS,
                            cnpjFaturamento: cnpjMedicao,
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
            updateData.dataCancelamento = new Date();
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

            // Automação Fiscal: Se FINALIZADA, tenta emitir NFS-e/CTE automaticamente
            if (status === 'FINALIZADA') {
                (async () => {
                    try {
                        const faturamentos = await prisma.faturamento.findMany({
                            where: { medicaoId: id, tipo: { in: ['NFSE', 'CTE'] }, focusStatus: null }
                        });
                        for (const fat of faturamentos) {
                            if (fat.tipo === 'NFSE') await focusNfeService.emitirNFSe(fat.id);
                            else if (fat.tipo === 'CTE') await focusNfeService.emitirCTE(fat.id);
                        }
                    } catch (err: any) {
                        console.error('[Automação Fiscal Medicao] Falha ao emitir:', err.message);
                    }
                })();
            }
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
                ordensServico: { include: { itensCobranca: true, servicos: true, proposta: true } }
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
                dataCobranca: new Date(),
                dataAprovacaoInterna: currentMedicao.dataAprovacaoInterna || new Date(), // Set if not exist
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
                ordensServico: { include: { itensCobranca: true, servicos: true, proposta: true } }
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
        let diasFimSemana = 0, valorFimSemanaAdd = 0;
        
        const addFimSemana = Number(prop.adicionalFimSemana || 50) / 100;

        rdos.forEach((r: any) => {
            const he  = Number(r.horasExtras   || 0);
            const not = Number(r.horasNoturnas || 0);
            
            // Verifica se é fim de semana (Sábado=6, Domingo=0)
            const d = new Date(r.data);
            const isWeekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;

            totalExtras   += he;
            totalNoturnas += not;
            
            valorExtrasHE   += he  * valorHoraBase * (1 + addHE);
            valorNoturnoAdd += not * valorHoraBase * addNoturno;

            if (isWeekend) {
                diasFimSemana++;
                // O adicional de fim de semana geralmente incide sobre a diária/base do dia
                valorFimSemanaAdd += (franquia * valorHoraBase) * addFimSemana;
            }
        });

        const subitens = [
            { id: 'BASE',    descricao: `Valor Base (OS ${os.codigo})`,           valor: valorBaseOS },
            { id: 'HE',      descricao: `Horas Extras (${totalExtras.toFixed(2)}h)`, valor: valorExtrasHE },
            { id: 'NOTURNO', descricao: `Adicional Noturno (${totalNoturnas.toFixed(2)}h)`, valor: valorNoturnoAdd }
        ];

        if (diasFimSemana > 0) {
            subitens.push({
                id: 'FIM_SEMANA',
                descricao: `Adicional Fim de Semana (${diasFimSemana} dias)`,
                valor: valorFimSemanaAdd
            });
        }

        const valorTotal = valorBaseOS + valorExtrasHE + valorNoturnoAdd + valorFimSemanaAdd;
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

// ─── ENVIAR DOCUMENTAÇÃO FINAL (MEDICAO + NOTAS) ────────────────
export const enviarDocumentacaoFinal = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const medicao = await prisma.medicao.findUnique({
            where: { id },
            include: {
                cliente: true,
                ordensServico: { include: { itensCobranca: true, servicos: true, proposta: true } }
            }
        });

        if (!medicao) return res.status(404).json({ error: 'Medição não encontrada' });
        if (!medicao.cliente.email) return res.status(400).json({ error: 'Cliente sem e-mail cadastrado.' });

        const empresa = await prisma.configuracao.findFirst() || {} as any;
        
        // 1. Gera PDF da Medição
        const pdfMedicao = await gerarPdfMedicao(medicao, empresa, medicao.cliente, medicao.ordensServico);

        // 2. Busca Faturamentos Autorizados (NFS-e / CT-e)
        const faturamentosValidos = await prisma.faturamento.findMany({
            where: { medicaoId: id, tipo: { in: ['NFSE', 'CTE'] }, status: 'EMITIDO', urlArquivoNota: { not: null } }
        });

        const attachments: any[] = [
            {
                filename: `Medicao_${medicao.codigo}.pdf`,
                content: pdfMedicao,
                contentType: 'application/pdf'
            }
        ];

        // 3. Baixa PDFs e XMLs das Notas Fiscais
        for (const fat of faturamentosValidos) {
            try {
                // PDF da Nota
                if (fat.urlArquivoNota) {
                    const response = await axios.get(fat.urlArquivoNota, { responseType: 'arraybuffer' });
                    attachments.push({
                        filename: `${fat.tipo}_${fat.numero || fat.id.slice(0,8)}.pdf`,
                        content: Buffer.from(response.data),
                        contentType: 'application/pdf'
                    });
                }
                // XML da Nota
                if (fat.urlArquivoXml) {
                    const responseXml = await axios.get(fat.urlArquivoXml, { responseType: 'arraybuffer' });
                    attachments.push({
                        filename: `${fat.tipo}_${fat.numero || fat.id.slice(0,8)}.xml`,
                        content: Buffer.from(responseXml.data),
                        contentType: 'application/xml'
                    });
                }
            } catch (err: any) {
                console.error(`[Email Final] Erro ao baixar arquivos da nota ${fat.id}:`, err.message);
            }
        }

        const isND = medicao.tipoDocumento === 'ND';
        const docLabel = isND ? 'Nota de Débito' : 'Recibo de Locação';
        const docListLabel = isND ? 'Nota de Débito' : 'Recibo de Locação';

        // 4. Renderiza Template Premium
        const templateHtml = await fs.promises.readFile(path.resolve(__dirname, '../templates/email_medicao_finalizada.html'), 'utf8');
        const mustache = require('mustache');
        const htmlRendered = mustache.render(templateHtml, {
            clienteNome: medicao.cliente.nome,
            medicaoCodigo: medicao.codigo,
            periodo: medicao.periodo || 'N/A',
            valorTotal: Number(medicao.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
            empresaLogo: empresa.logo || '',
            hasNotaFiscal: faturamentosValidos.length > 0,
            docLabel
        });

        // 5. Envia E-mail
        const resp = await sendEmail({
            to: medicao.cliente.email,
            cc: [CC_FINANCEIRO],
            subject: `Documentação: Medição ${medicao.codigo} (${docLabel}) - Nacional Hidro`,
            html: htmlRendered,
            attachments
        });

        if (!resp.success) throw new Error('Falha no envio do e-mail via SMTP');

        // 6. Registra Histórico
        await prisma.cobrancaEmail.create({
            data: {
                medicaoId: id,
                destinatario: medicao.cliente.email,
                assunto: `[FINAL] Documentação Medição ${medicao.codigo} enviada ao cliente`,
                corpo: htmlRendered,
                statusEnvio: 'ENVIADO'
            }
        });

        res.json({ success: true, message: 'Documentação enviada com sucesso!' });
    } catch (error: any) {
        console.error('Enviar documentação final error:', error);
        res.status(500).json({ error: 'Falha no envio da documentação', details: error.message });
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

// ─── RECALCULAR TODAS AS OS DA MEDIÇÃO ──────────────────────────
export const recalcularMedicao = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const configParams = req.body; 

        const medicao = await prisma.medicao.findUnique({
            where: { id },
            include: { ordensServico: true }
        });

        if (!medicao) return res.status(404).json({ error: 'Medição não encontrada' });
        if (medicao.status !== 'EM_ABERTO') {
            return res.status(400).json({ error: 'Apenas medições em aberto podem ser recalculadas' });
        }

        const results = [];
        for (const os of medicao.ordensServico) {
            const result = await PricingService.autoCalcularItens(os.id, configParams);
            results.push(result);
        }

        const total = results.reduce((sum, r) => sum + r.totalCalculado, 0);
        const pctRL = medicao.porcentagemRL ? Number(medicao.porcentagemRL) : 90;
        const valorRL = medicao.cte ? 0 : total * (pctRL / 100);
        const valorNFSe = medicao.cte ? total : total - valorRL;

        await prisma.medicao.update({
            where: { id },
            data: { 
                valorTotal: total,
                valorRL,
                valorNFSe
            }
        });

        res.json({ message: 'Medição recalculada com sucesso', total, results });
    } catch (error: any) {
        console.error('Recalcular medição error:', error);
        res.status(500).json({ error: 'Erro ao recalcular', details: error.message });
    }
};
