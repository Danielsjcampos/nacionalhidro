import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { enviarMensagemWhatsApp } from '../services/whatsapp.service';
import { gerarFichaAdmissao, gerarGuiaASO } from '../services/admissionDoc.service';

import {
    sendADM01_BoasVindas,
    sendADM02_SeguroVida,
    sendADM03_Contabilidade,
    sendADM04_DPIntegracao,
    sendADM05_LiberacaoTreinamento,
    sendADM06_AvisoSTDoc,
    sendADM07_Psicossocial,
} from '../services/email.service';
import { googleDriveService } from '../services/googleDrive.service';

// ─── ETAPAS DO PIPELINE ─────────────────────────────────────────
const ETAPAS_ADMISSAO = [
    'ENVIO_DOCUMENTACAO',
    'CONFERENCIA',
    'EXAME_ASO',
    'CONTABILIDADE',
    'ASSINATURA_CONTRATO',
    'CONTRATADO',
    'CANCELADO',
    'BANCO_TALENTOS',
] as const;

// ─── PORTAL PÚBLICO DO CANDIDATO ────────────────────────────────

export const getAdmissaoPortal = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const admissao = await (prisma as any).admissao.findUnique({
            where: { id },
            select: {
                id: true,
                nome: true,
                cargo: true,
                departamento: true,
                etapa: true
            }
        });

        if (!admissao) {
            return res.status(404).json({ error: 'Admissão não encontrada' });
        }

        // Se já não estiver na etapa de ENVIO_DOCUMENTACAO, idealmente bloqueia a re-submissão
        if (admissao.etapa !== 'ENVIO_DOCUMENTACAO') {
            return res.status(403).json({ error: 'Este link de admissão não está mais ativo para envio de documentos.' });
        }

        res.json(admissao);
    } catch (error) {
        console.error('Get admissao portal error:', error);
        res.status(500).json({ error: 'Failed to fetch portal data' });
    }
};

export const submitAdmissaoPortal = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        
        // Dados do formulário
        const {
            nomeMae, nomePai, estadoCivil, grauInstrucao,
            racaCor, genero, nacionalidade, dataNascimento,
            enderecoCompleto, cep,
            rg, rgDataEmissao, rgOrgaoEmissor,
            cpf, pisPasep, tituloEleitor,
            telefone, email
        } = req.body;

        // Arquivos originais que vieram (via Multer)
        const files = req.files as Express.Multer.File[];

        const admissaoAtual = await (prisma as any).admissao.findUnique({ where: { id } });
        if (!admissaoAtual) {
            return res.status(404).json({ error: 'Admissão não encontrada' });
        }

        // Processar os arquivos para o layout final { nome, url }
        const novosDocumentos = (files || []).map(file => ({
            nome: file.originalname,
            url: `/uploads/admissoes/${file.filename}`, // Acesso público/servido
            dataUpload: new Date()
        }));

        let docsSalvos = Array.isArray(admissaoAtual.documentosEnviados) ? admissaoAtual.documentosEnviados : [];
        docsSalvos = [...docsSalvos, ...novosDocumentos];

        // Atualizar no banco e avançar a etapa para CONFERENCIA
        const admissaoAtualizada = await (prisma as any).admissao.update({
            where: { id },
            data: {
                nomeMae,
                nomePai,
                estadoCivil,
                grauInstrucao,
                racaCor,
                genero,
                nacionalidade,
                dataNascimento: dataNascimento ? new Date(dataNascimento) : undefined,
                enderecoCompleto,
                cep,
                rg,
                rgDataEmissao: rgDataEmissao ? new Date(rgDataEmissao) : undefined,
                rgOrgaoEmissor,
                cpf,
                pisPasep,
                tituloEleitor,
                telefone,
                email,
                documentosEnviados: docsSalvos,
                etapa: 'CONFERENCIA',
                observacoes: admissaoAtual.observacoes 
                             ? admissaoAtual.observacoes + `\n[Sistema] Documentos e formulário enviados pelo candidato via Portal Público.` 
                             : `[Sistema] Documentos e formulário enviados pelo candidato via Portal Público.`
            }
        });

        res.json({ success: true, admissao: admissaoAtualizada });
    } catch (error: any) {
        console.error('Submit admissao portal error:', error);
        res.status(500).json({ error: 'Failed to submit admission documents', details: error.message });
    }
};

// ─── LIST ADMISSÕES ─────────────────────────────────────────────

export const listAdmissoes = async (req: AuthRequest, res: Response) => {
    try {
        const { etapa, search } = req.query;
        const where: any = {};
        if (etapa) where.etapa = etapa as string;
        if (search) {
            where.OR = [
                { nome: { contains: search as string, mode: 'insensitive' } },
                { cargo: { contains: search as string, mode: 'insensitive' } },
                { cpf: { contains: search as string, mode: 'insensitive' } },
            ];
        }

        const admissoes = await (prisma as any).admissao.findMany({
            where,
            include: {
                candidato: { select: { id: true, nome: true, vaga: { select: { cargo: true } } } },
                funcionario: { select: { id: true, nome: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json(admissoes);
    } catch (error) {
        console.error('List admissões error:', error);
        res.status(500).json({ error: 'Failed to fetch admissões' });
    }
};

// ─── GET ADMISSÃO ───────────────────────────────────────────────

export const getAdmissao = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const admissao = await (prisma as any).admissao.findUnique({
            where: { id },
            include: { candidato: true, funcionario: true },
        });

        if (!admissao) {
            return res.status(404).json({ error: 'Admissão não encontrada' });
        }

        res.json(admissao);
    } catch (error) {
        console.error('Get admissão error:', error);
        res.status(500).json({ error: 'Failed to fetch admissão' });
    }
};

// ─── CREATE ADMISSÃO ────────────────────────────────────────────

export const createAdmissao = async (req: AuthRequest, res: Response) => {
    try {
        const { 
            dataAdmissaoPrevista, 
            dataExameASO, 
            dataAssinatura,
            dataAgendamentoExame,
            validadeAso,
            dataAdmissaoRegistrada,
            prazoRetornoContabilidade,
            salarioBase,
            ...rest 
        } = req.body;

        if (!rest.nome) {
            return res.status(400).json({ error: 'Nome é obrigatório' });
        }

        const admissao = await (prisma as any).admissao.create({
            data: {
                ...rest,
                dataAdmissaoPrevista: dataAdmissaoPrevista ? new Date(dataAdmissaoPrevista) : undefined,
                dataExameASO: dataExameASO ? new Date(dataExameASO) : undefined,
                dataAssinatura: dataAssinatura ? new Date(dataAssinatura) : undefined,
                dataAgendamentoExame: dataAgendamentoExame ? new Date(dataAgendamentoExame) : undefined,
                validadeAso: validadeAso ? new Date(validadeAso) : undefined,
                dataAdmissaoRegistrada: dataAdmissaoRegistrada ? new Date(dataAdmissaoRegistrada) : undefined,
                prazoRetornoContabilidade: prazoRetornoContabilidade ? new Date(prazoRetornoContabilidade) : undefined,
                salarioBase: salarioBase !== undefined && salarioBase !== null ? parseFloat(salarioBase) : undefined,
            },
            include: { candidato: true },
        });

        res.status(201).json(admissao);
    } catch (error: any) {
        console.error('Create admissão error:', error);
        res.status(500).json({ error: 'Failed to create admissão', details: error.message });
    }
};

// ─── UPDATE ADMISSÃO ────────────────────────────────────────────

export const updateAdmissao = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const { 
            dataAdmissaoPrevista, 
            dataExameASO, 
            dataAssinatura,
            dataAgendamentoExame,
            validadeAso,
            dataAdmissaoRegistrada,
            prazoRetornoContabilidade,
            dataVencimentoCnh,
            dataVencimentoMopp,
            dataHoraAssinatura,
            salarioBase,
            candidato,
            funcionario,
            id: _id,
            createdAt,
            updatedAt,
            ...rest 
        } = req.body;

        const admissao = await (prisma as any).admissao.update({
            where: { id },
            data: {
                ...rest,
                dataAdmissaoPrevista: dataAdmissaoPrevista ? new Date(dataAdmissaoPrevista) : undefined,
                dataExameASO: dataExameASO ? new Date(dataExameASO) : undefined,
                dataAssinatura: dataAssinatura ? new Date(dataAssinatura) : undefined,
                dataAgendamentoExame: dataAgendamentoExame ? new Date(dataAgendamentoExame) : undefined,
                validadeAso: validadeAso ? new Date(validadeAso) : undefined,
                dataAdmissaoRegistrada: dataAdmissaoRegistrada ? new Date(dataAdmissaoRegistrada) : undefined,
                prazoRetornoContabilidade: prazoRetornoContabilidade ? new Date(prazoRetornoContabilidade) : undefined,
                dataVencimentoCnh: dataVencimentoCnh ? new Date(dataVencimentoCnh) : undefined,
                dataVencimentoMopp: dataVencimentoMopp ? new Date(dataVencimentoMopp) : undefined,
                dataHoraAssinatura: dataHoraAssinatura ? new Date(dataHoraAssinatura) : undefined,
                salarioBase: salarioBase !== undefined && salarioBase !== null ? parseFloat(salarioBase) : undefined,
            },
            include: { candidato: true },
        });

        res.json(admissao);
    } catch (error: any) {
        console.error('Update admissão error:', error);
        res.status(500).json({ error: 'Failed to update admissão', details: error.message });
    }
};

// ─── MOVER ETAPA ────────────────────────────────────────────────

export const moverEtapaAdmissao = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const { etapa, motivoCancelamento, observacoes } = req.body;

        if (!ETAPAS_ADMISSAO.includes(etapa)) {
            return res.status(400).json({ error: `Etapa inválida: ${etapa}` });
        }

        if (etapa === 'CANCELADO' && !motivoCancelamento) {
            return res.status(400).json({ error: 'Motivo de cancelamento é obrigatório' });
        }

        // Fetch full admissão data for auto-create
        const admissaoAtual = await (prisma as any).admissao.findUnique({ where: { id } });
        if (!admissaoAtual) {
            return res.status(404).json({ error: 'Admissão não encontrada' });
        }

        const data: any = { etapa };
        if (motivoCancelamento) data.motivoCancelamento = motivoCancelamento;
        if (observacoes) data.observacoes = observacoes;

        // ─── AUTO-CREATE FUNCIONÁRIO ao mover para CONTRATADO ────
        if (etapa === 'CONTRATADO' && !admissaoAtual.funcionarioId) {
            let funcionarioId: string | null = null;

            // Check if CPF already exists
            if (admissaoAtual.cpf) {
                const existing = await (prisma as any).funcionario.findUnique({
                    where: { cpf: admissaoAtual.cpf }
                });
                if (existing) {
                    funcionarioId = existing.id;
                }
            }

            if (!funcionarioId) {
                const novoFuncionario = await (prisma as any).funcionario.create({
                    data: {
                        nome: admissaoAtual.nome,
                        cargo: admissaoAtual.cargo || 'A definir',
                        departamento: admissaoAtual.departamento || 'Operacional',
                        cpf: admissaoAtual.cpf || `TEMP-${Date.now()}`,
                        email: admissaoAtual.email,
                        telefone: admissaoAtual.telefone,
                        salario: admissaoAtual.salarioBase || 0,
                        dataAdmissao: admissaoAtual.dataAdmissaoPrevista || new Date(),
                        tipoContrato: 'CLT',
                        ativo: true,
                        status: 'ATIVO',
                        // Dados bancários (vindos do portal do candidato)
                        banco: admissaoAtual.banco || undefined,
                        agencia: admissaoAtual.agencia || undefined,
                        conta: admissaoAtual.conta || undefined,
                        chavePix: admissaoAtual.chavePix || undefined,
                        // Dados pessoais (vindos do portal e-Social)
                        rg: admissaoAtual.rg || undefined,
                        dataNascimento: admissaoAtual.dataNascimento || undefined,
                        estadoCivil: admissaoAtual.estadoCivil || undefined,
                        nomeMae: admissaoAtual.nomeMae || undefined,
                        nomePai: admissaoAtual.nomePai || undefined,
                        pis: admissaoAtual.pisPasep || undefined,
                        nacionalidade: admissaoAtual.nacionalidade || 'Brasileira',
                        // Endereço
                        cep: admissaoAtual.cep || undefined,
                        endereco: admissaoAtual.enderecoCompleto || undefined,
                    }
                });
                funcionarioId = novoFuncionario.id;
            }

            data.funcionarioId = funcionarioId;
        }

        // ─── GERAÇÃO AUTOMÁTICA DE FICHA (CONTABILIDADE) ─────────
        if (etapa === 'CONTABILIDADE') {
            try {
                const ficha = await gerarFichaAdmissao(admissaoAtual);
                const docsAtuais = Array.isArray(admissaoAtual.documentosEnviados) 
                    ? admissaoAtual.documentosEnviados 
                    : [];
                
                // Evitar duplicados
                if (!docsAtuais.some((d: any) => d.nome === ficha.nome)) {
                    data.documentosEnviados = [...docsAtuais, ficha];
                }
            } catch (e) {
                console.error('[Ficha Auto] Failed:', e);
            }
        }

        const admissao = await (prisma as any).admissao.update({
            where: { id },
            data,
            include: { candidato: true, funcionario: true },
        });

        // ─── GAP 2: AUTO-CREATE ASO ADMISSIONAL ─────────────────
        if (etapa === 'CONTRATADO' && admissao.funcionarioId) {
            try {
                const asoData: any = {
                    funcionarioId: admissao.funcionarioId,
                    tipo: 'ADMISSIONAL',
                    dataExame: admissaoAtual.dataAso ? new Date(admissaoAtual.dataAso) : null,
                    dataVencimento: admissaoAtual.dataValidadeAso ? new Date(admissaoAtual.dataValidadeAso) : null,
                    resultado: admissaoAtual.foiAprovadoExame === true ? 'APTO'
                        : admissaoAtual.foiAprovadoExame === false ? 'INAPTO'
                        : null,
                    clinica: admissaoAtual.clinicaASO || null,
                    observacoes: `Criado automaticamente via Admissão #${id}`,
                };
                const aso = await (prisma as any).aSOControle.create({ data: asoData });
                console.log(`[ADMISSAO] ASO Admissional criado: ${aso.id} para funcionário ${admissao.funcionarioId}`);
            } catch (asoErr: any) {
                console.error(`[ADMISSAO] Falha ao criar ASO para funcionário ${admissao.funcionarioId}:`, asoErr?.code || asoErr?.message || asoErr);
                // Non-blocking: ASO creation failure (e.g. FK constraint) should not break admission flow
            }
        }

        // ─── WHATSAPP AUTO-NOTIFICATION ──────────────────────────
        // Fire-and-forget: never blocks the main flow
        if (admissaoAtual.telefone && etapa !== admissaoAtual.etapa) {
            const MENSAGENS: Record<string, string> = {
                'CONFERENCIA': `Olá ${admissaoAtual.nome}! 📋 Seus documentos estão em conferência. Em breve entraremos em contato.`,
                'EXAME_ASO': `Olá ${admissaoAtual.nome}! 🏥 Seu exame admissional foi agendado. Aguarde instruções sobre data e local.`,
                'CONTABILIDADE': `Olá ${admissaoAtual.nome}! 📊 Seus dados foram enviados para a contabilidade. Estamos quase lá!`,
                'ASSINATURA_CONTRATO': `Olá ${admissaoAtual.nome}! ✍️ Seu contrato está pronto para assinatura digital. Você receberá o link em breve.`,
                'CONTRATADO': `Parabéns ${admissaoAtual.nome}! 🎉 Sua admissão foi concluída! Bem-vindo à equipe Nacional Hidro!`,
            };

            const mensagem = MENSAGENS[etapa];
            if (mensagem) {
                try {
                    const result = await enviarMensagemWhatsApp(admissaoAtual.telefone, mensagem, 'RH_Oficial');

                    await (prisma as any).notificacaoLog.create({
                        data: {
                            tipo: 'WHATSAPP',
                            destinatario: admissaoAtual.telefone,
                            assunto: `Admissão: ${etapa}`,
                            conteudo: mensagem,
                            status: result.success ? 'ENVIADO' : 'FALHA',
                            referencia: `admissao:${id}`,
                        }
                    });
                } catch (e) {
                    console.error('[WhatsApp Auto] Failed:', e);
                }
            }
        }
        
        // ═══════════════════════════════════════════════════════════
        // 📧 AUTOMAÇÕES PIPEFY — E-MAILS POR ETAPA (fire-and-forget)
        // ═══════════════════════════════════════════════════════════
        if (etapa !== admissaoAtual.etapa) {
            try {
                // ─── EXAME_ASO: ADM-06 (ST+Doc) + ADM-07 (Psicossocial) ──
                if (etapa === 'EXAME_ASO') {
                    console.log(`[Pipefy Email] EXAME_ASO → ADM-06, ADM-07 para ${admissaoAtual.nome}`);
                    await sendADM06_AvisoSTDoc(admissaoAtual);
                    await sendADM07_Psicossocial(admissaoAtual);
                }

                // ─── CONTABILIDADE: ADM-03 (Envio para Contabilidade) ────
                if (etapa === 'CONTABILIDADE') {
                    console.log(`[Pipefy Email] CONTABILIDADE → ADM-03 para ${admissaoAtual.nome}`);
                    await sendADM03_Contabilidade(admissaoAtual);
                }

                // ─── ASSINATURA_CONTRATO: ADM-04 (DP/Integração/Logística) ──
                if (etapa === 'ASSINATURA_CONTRATO') {
                    console.log(`[Pipefy Email] ASSINATURA_CONTRATO → ADM-04 para ${admissaoAtual.nome}`);
                    await sendADM04_DPIntegracao(admissaoAtual);
                }

                // ─── CONTRATADO: ADM-01 (Boas-vindas) + ADM-02 (Seguro) + ADM-05 (ST) ──
                if (etapa === 'CONTRATADO') {
                    console.log(`[Pipefy Email] CONTRATADO → ADM-01, ADM-02, ADM-05 para ${admissaoAtual.nome}`);
                    
                    // ADM-01: Boas-vindas ao colaborador
                    if (admissaoAtual.email) {
                        await sendADM01_BoasVindas(admissaoAtual);
                    }

                    // ADM-02: Inclusão no Seguro de Vida
                    await sendADM02_SeguroVida(admissaoAtual);

                    // ADM-05: Liberação para Treinamentos ST
                    await sendADM05_LiberacaoTreinamento(admissaoAtual);

                    // Exportação Google Drive
                    try {
                        await googleDriveService.exportAdmissionDocuments(admissao);
                    } catch (e) {
                        console.error('[Google Drive Export] Failed:', e);
                    }
                }
            } catch (e) {
                console.error('[Pipefy Email Automation] Failed:', e);
            }
        }

        res.json(admissao);
    } catch (error: any) {
        console.error('Mover etapa admissão error:', error);
        res.status(500).json({ error: 'Failed to move admissão', details: error.message });
    }
};

// ─── DELETE ADMISSÃO ────────────────────────────────────────────

export const deleteAdmissao = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        await (prisma as any).admissao.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        console.error('Delete admissão error:', error);
        res.status(500).json({ error: 'Failed to delete admissão' });
    }
};

// ─── ASSINATURA DE CONTRATO ─────────────────────────────────────

export const assinarContrato = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const ip_address = req.ip || req.connection.remoteAddress;

        const admissao = await (prisma as any).admissao.update({
            where: { id },
            data: {
                assinaturaDigital: true,
                dataAssinatura: new Date(),
                observacoes: `Contrato assinado digitalmente. IP: ${ip_address}`
            }
        });

        res.json({ message: 'Contrato assinado com sucesso', admissao });
    } catch (error: any) {
        console.error('Assinar contrato error:', error);
        res.status(500).json({ error: 'Failed to sign contract', details: error.message });
    }
};

// ─── STATS ──────────────────────────────────────────────────────

export const getAdmissaoStats = async (req: AuthRequest, res: Response) => {
    try {
        const total = await (prisma as any).admissao.count();
        const porEtapa = await (prisma as any).admissao.groupBy({
            by: ['etapa'],
            _count: true,
        });

        const counts: Record<string, number> = {};
        porEtapa.forEach((g: any) => { counts[g.etapa] = g._count; });

        const emAndamento = total - (counts['CONTRATADO'] || 0) - (counts['CANCELADO'] || 0);

        res.json({ total, emAndamento, counts });
    } catch (error) {
        console.error('Admissão stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
};

export const generateFormPDF = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const admissao = await (prisma as any).admissao.findUnique({ where: { id } });
        if (!admissao) return res.status(404).json({ error: 'Admissão não encontrada' });

        const ficha = await gerarFichaAdmissao(admissao);
        
        // Update documents list
        const docsAtuais = Array.isArray(admissao.documentosEnviados) ? admissao.documentosEnviados : [];
        if (!docsAtuais.some((d: any) => d.nome === ficha.nome)) {
            await (prisma as any).admissao.update({
                where: { id },
                data: { documentosEnviados: [...docsAtuais, ficha] }
            });
        }

        res.json(ficha);
    } catch (error: any) {
        console.error('Generate Form PDF error:', error);
        res.status(500).json({ error: 'Failed to generate form PDF', details: error.message });
    }
};

export const generateAsoPDF = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const admissao = await (prisma as any).admissao.findUnique({ where: { id } });
        if (!admissao) return res.status(404).json({ error: 'Admissão não encontrada' });

        const guia = await gerarGuiaASO(admissao);

        // Update documents list
        const docsAtuais = Array.isArray(admissao.documentosEnviados) ? admissao.documentosEnviados : [];
        if (!docsAtuais.some((d: any) => d.nome === guia.nome)) {
            await (prisma as any).admissao.update({
                where: { id },
                data: { documentosEnviados: [...docsAtuais, guia] }
            });
        }

        res.json(guia);
    } catch (error: any) {
        console.error('Generate ASO PDF error:', error);
        res.status(500).json({ error: 'Failed to generate ASO PDF', details: error.message });
    }
};

