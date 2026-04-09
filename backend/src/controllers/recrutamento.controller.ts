import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { enviarMensagemWhatsApp } from '../services/whatsapp.service';
import { GoogleGenAI } from '@google/genai';
import {
    sendREC01_CandidaturaRecebida,
    sendREC02_FeedbackPositivo,
    sendREC03_ConviteEntrevista,
    sendREC04_EnvioProposta,
    sendREC05_Incompativel,
} from '../services/email.service';

// Instância do Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const listVagas = async (req: AuthRequest, res: Response) => {
    try {
        const { status } = req.query;
        const where: any = {};
        if (status) where.status = status as string;

        const vagas = await (prisma as any).vaga.findMany({
            where,
            include: { candidatos: { select: { id: true, etapa: true } } },
            orderBy: { createdAt: 'desc' }
        });

        // Enrich with candidate counts per stage
        const enriched = vagas.map((v: any) => {
            const counts: Record<string, number> = {};
            v.candidatos?.forEach((c: any) => {
                counts[c.etapa] = (counts[c.etapa] || 0) + 1;
            });
            return { ...v, totalCandidatos: v.candidatos?.length || 0, countPorEtapa: counts };
        });

        res.json(enriched);
    } catch (error) {
        console.error('List vagas error:', error);
        res.status(500).json({ error: 'Failed to fetch vagas' });
    }
};

export const createVaga = async (req: AuthRequest, res: Response) => {
    try {
        const { prazo, ...rest } = req.body;
        const vaga = await (prisma as any).vaga.create({
            data: {
                ...rest,
                prazo: prazo ? new Date(prazo) : undefined
            }
        });
        res.status(201).json(vaga);
    } catch (error: any) {
        console.error('Create vaga error:', error);
        res.status(500).json({ error: 'Failed to create vaga', details: error.message });
    }
};

export const updateVaga = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const { prazo, ...rest } = req.body;
        const vaga = await (prisma as any).vaga.update({
            where: { id },
            data: { ...rest, prazo: prazo ? new Date(prazo) : undefined }
        });
        res.json(vaga);
    } catch (error: any) {
        console.error('Update vaga error:', error);
        res.status(500).json({ error: 'Failed to update vaga', details: error.message });
    }
};

// ─── CANDIDATOS ─────────────────────────────────────────────────

export const listCandidatos = async (req: AuthRequest, res: Response) => {
    try {
        const { vagaId, etapa } = req.query;
        const where: any = {};
        if (vagaId) where.vagaId = vagaId as string;
        if (etapa) where.etapa = etapa as string;

        const candidatos = await (prisma as any).candidato.findMany({
            where,
            include: { vaga: { select: { id: true, cargo: true, departamento: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(candidatos);
    } catch (error) {
        console.error('List candidatos error:', error);
        res.status(500).json({ error: 'Failed to fetch candidatos' });
    }
};

export const createCandidato = async (req: AuthRequest, res: Response) => {
    try {
        const { dataEntrevista, ...rest } = req.body;
        const candidato = await (prisma as any).candidato.create({
            data: {
                ...rest,
                dataEntrevista: dataEntrevista ? new Date(dataEntrevista) : undefined
            },
            include: { vaga: { select: { id: true, cargo: true } } }
        });
        // 📧 REC-01: E-mail de candidatura recebida
        if (candidato.email) {
            try {
                const cargo = candidato.vaga?.cargo || rest.cargo || 'N/A';
                await sendREC01_CandidaturaRecebida({ nome: candidato.nome, email: candidato.email, cargo });
                console.log(`[Pipefy Email] REC-01 Candidatura Recebida → ${candidato.nome}`);
            } catch (e) {
                console.error('[Pipefy Email - REC-01] Failed:', e);
            }
        }

        res.status(201).json(candidato);
    } catch (error: any) {
        console.error('Create candidato error:', error);
        res.status(500).json({ error: 'Failed to create candidato', details: error.message });
    }
};

export const updateCandidato = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const { dataEntrevista, ...rest } = req.body;

        // Validate: motivo obrigatório when moving to REPROVADO
        if (rest.etapa === 'REPROVADO' && !rest.motivoReprovacao) {
            return res.status(400).json({ error: 'Motivo de reprovação é obrigatório' });
        }

        const candidatoAtual = await (prisma as any).candidato.findUnique({
            where: { id },
            include: { vaga: { select: { id: true, cargo: true, departamento: true } } }
        });

        if (!candidatoAtual) {
           return res.status(404).json({ error: 'Candidato não encontrado' });
        }

        const candidato = await (prisma as any).candidato.update({
            where: { id },
            data: {
                ...rest,
                dataEntrevista: dataEntrevista ? new Date(dataEntrevista) : undefined,
                dataSegundaEntrevista: rest.dataSegundaEntrevista ? new Date(rest.dataSegundaEntrevista) : undefined,
                dataAplicacaoTeste: rest.dataAplicacaoTeste ? new Date(rest.dataAplicacaoTeste) : undefined,
                previsaoRetornoCandidato: rest.previsaoRetornoCandidato ? new Date(rest.previsaoRetornoCandidato) : undefined,
            },
            include: { vaga: { select: { id: true, cargo: true, departamento: true } } }
        });

        // ─── AUTO-CREATE ADMISSAO ao mover para ADMITIDO ────
        if (rest.etapa === 'ADMITIDO' && candidatoAtual.etapa !== 'ADMITIDO') {
            const existingAdmissao = await (prisma as any).admissao.findUnique({
               where: { candidatoId: id }
            });

            if (!existingAdmissao) {
               await (prisma as any).admissao.create({
                  data: {
                     candidatoId: id,
                     nome: candidato.nome,
                     cargo: candidato.vaga?.cargo || 'A definir',
                     departamento: candidato.vaga?.departamento || 'Operacional',
                     telefone: candidato.whatsapp || candidato.telefone,
                     email: candidato.email,
                     etapa: 'ENVIO_DOCUMENTACAO',
                     // Pre-fill initial fields if available
                     salarioBase: candidato.salarioPretendido || null,
                     jornadaTrabalho: candidato.jornada || null
                  }
               });
               console.log(`[Auto-Trigger] Admissão criada para Candidato: ${candidato.nome}`);
            }
        }

        res.json(candidato);
    } catch (error: any) {
        console.error('Update candidato error:', error);
        res.status(500).json({ error: 'Failed to update candidato', details: error.message });
    }
};

export const moverEtapa = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const { etapa, motivoReprovacao, observacoes } = req.body;

        if (etapa === 'REPROVADO' && !motivoReprovacao) {
            return res.status(400).json({ error: 'Motivo de reprovação é obrigatório' });
        }

        const candidatoAtual = await (prisma as any).candidato.findUnique({
            where: { id },
            include: { vaga: { select: { id: true, cargo: true, departamento: true } } }
        });

        if (!candidatoAtual) {
           return res.status(404).json({ error: 'Candidato não encontrado' });
        }

        const data: any = { ...req.body, etapa };
        // Remover campos processados ou inválidos para espalhar (se já estiverem em rest ou data)
        delete data.id;
        
        if (req.body.dataSegundaEntrevista) data.dataSegundaEntrevista = new Date(req.body.dataSegundaEntrevista);
        if (req.body.dataAplicacaoTeste) data.dataAplicacaoTeste = new Date(req.body.dataAplicacaoTeste);
        if (req.body.previsaoRetornoCandidato) data.previsaoRetornoCandidato = new Date(req.body.previsaoRetornoCandidato);
        if (req.body.dataEntrevistaRH) data.dataEntrevistaRH = new Date(req.body.dataEntrevistaRH);
        if (motivoReprovacao) data.motivoReprovacao = motivoReprovacao;
        if (observacoes) data.observacoes = observacoes;

        const candidato = await (prisma as any).candidato.update({
            where: { id },
            data,
            include: { vaga: { select: { id: true, cargo: true, departamento: true } } }
        });

        // ─── AUTO-CREATE ADMISSAO ao mover para ADMITIDO ────
        if (etapa === 'ADMITIDO' && candidatoAtual.etapa !== 'ADMITIDO') {
            const existingAdmissao = await (prisma as any).admissao.findUnique({
               where: { candidatoId: id }
            });

            if (!existingAdmissao) {
               await (prisma as any).admissao.create({
                  data: {
                     candidatoId: id,
                     nome: candidato.nome,
                     cargo: candidato.vaga?.cargo || 'A definir',
                     departamento: candidato.vaga?.departamento || 'Operacional',
                     telefone: candidato.whatsapp || candidato.telefone,
                     email: candidato.email,
                     etapa: 'ENVIO_DOCUMENTACAO',
                     // Fill initial fields automatically
                     salarioBase: candidato.salarioPretendido || null,
                     jornadaTrabalho: candidato.jornada || null
                  }
               });
               console.log(`[Auto-Trigger] Admissão gerada no kanban para Candidato: ${candidato.nome}`);
            }
        }

        // ═══════════════════════════════════════════════════════════
        // 📧 AUTOMAÇÕES PIPEFY — E-MAILS RECRUTAMENTO (fire-and-forget)
        // ═══════════════════════════════════════════════════════════
        if (etapa !== candidatoAtual.etapa && candidato.email) {
            const cargo = candidato.vaga?.cargo || 'N/A';
            try {
                // REC-02: Feedback Positivo (PRE_CONSULTA)
                if (etapa === 'PRE_CONSULTA') {
                    console.log(`[Pipefy Email] PRE_CONSULTA → REC-02 para ${candidato.nome}`);
                    await sendREC02_FeedbackPositivo({ nome: candidato.nome, email: candidato.email, cargo });
                }

                // REC-03: Convite para Entrevista (ENTREVISTA)
                if (etapa === 'ENTREVISTA') {
                    console.log(`[Pipefy Email] ENTREVISTA → REC-03 para ${candidato.nome}`);
                    await sendREC03_ConviteEntrevista({
                        nome: candidato.nome,
                        email: candidato.email,
                        cargo,
                        dataEntrevista: candidato.dataEntrevista?.toISOString(),
                    });
                }

                // REC-04: Envio da Proposta (ADMITIDO)
                if (etapa === 'ADMITIDO') {
                    console.log(`[Pipefy Email] ADMITIDO → REC-04 para ${candidato.nome}`);
                    await sendREC04_EnvioProposta({ nome: candidato.nome, email: candidato.email, cargo });
                }

                // REC-05: Candidato Incompatível (REPROVADO)
                if (etapa === 'REPROVADO') {
                    console.log(`[Pipefy Email] REPROVADO → REC-05 para ${candidato.nome}`);
                    await sendREC05_Incompativel({ nome: candidato.nome, email: candidato.email, cargo });
                }
            } catch (e) {
                console.error('[Pipefy Email Automation - Recrutamento] Failed:', e);
            }
        }

        res.json(candidato);
    } catch (error: any) {
        console.error('Mover etapa error:', error);
        res.status(500).json({ error: 'Failed to move candidato', details: error.message });
    }
};

export const deleteCandidato = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        await (prisma as any).candidato.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        console.error('Delete candidato error:', error);
        res.status(500).json({ error: 'Failed to delete candidato' });
    }
};

export const notificarCandidato = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const { mensagem } = req.body;

        const candidato = await (prisma as any).candidato.findUnique({ where: { id } });
        if (!candidato || (!candidato.whatsapp && !candidato.telefone)) {
            return res.status(400).json({ error: 'Candidato não possui número de WhatsApp ou telefone válido.' });
        }

        const phone = candidato.whatsapp || candidato.telefone!;
        // Forçando uso da instância de RH
        const result = await enviarMensagemWhatsApp(phone, mensagem, 'RH_Oficial');

        if (result.success) {
            res.json({ message: 'Mensagem enviada com sucesso.', result });
        } else {
            res.status(500).json({ error: 'Falha ao enviar mensagem', details: result.error });
        }
    } catch (error: any) {
        console.error('Notificar candidato error:', error);
        res.status(500).json({ error: 'Erro ao notificar candidato', details: error.message });
    }
};

export const avaliarCandidatoIA = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        
        const candidato = await (prisma as any).candidato.findUnique({ 
            where: { id },
            include: { vaga: true }
        });

        if (!candidato || !candidato.vaga) {
            return res.status(404).json({ error: 'Candidato ou Vaga não encontrado' });
        }

        const prompt = `Você é um avaliador de RH especialista da empresa Nacional Hidro. Sua missão é avaliar se o candidato se adequa à vaga especificada. Responda ESTRITAMENTE em formato JSON, com as seguintes chaves: "score" (de 0 a 100), "parecer" (texto resumindo pontos fortes e gaps baseados nos requisitos) e "aprovado" (boolean, true se score > 65).
Vaga: ${candidato.vaga.cargo} no departamento ${candidato.vaga.departamento}.
Requisitos da Vaga: ${candidato.vaga.requisitos || 'Nenhum listado'}
Descrição: ${candidato.vaga.descricao || 'Nenhuma'}

Dados Candidato:
Nome: ${candidato.nome}
Cidade: ${candidato.cidade || 'N/A'}
CNH: ${candidato.cnh || 'N/A'}
Possui MOPP: ${candidato.possuiMOPP ? 'SIM' : 'NÃO/N/A'}
Jornada: ${candidato.jornada || 'N/A'}`;

        const aiResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        if (!aiResponse.text) {
             throw new Error("Erro ao gerar conteúdo com a IA");
        }
        
        const result = JSON.parse(aiResponse.text);

        const atualizado = await (prisma as any).candidato.update({
            where: { id },
            data: {
                avaliacaoIA: result.parecer,
                scoreIA: result.score,
                etapa: result.aprovado ? 'PRE_CONSULTA' : 'TRIAGEM'
            }
        });

        res.json({ message: 'Triagem com IA concluída com sucesso!', result: atualizado });
    } catch (error: any) {
        console.error('Avaliar IA error:', error);
        res.status(500).json({ error: 'Erro na triagem com IA', details: error.message });
    }
};

// ─── STATS ──────────────────────────────────────────────────────

export const getRecrutamentoStats = async (req: AuthRequest, res: Response) => {
    try {
        const vagasAbertas = await (prisma as any).vaga.count({ where: { status: 'ABERTA' } });
        const vagasEmAndamento = await (prisma as any).vaga.count({ where: { status: 'EM_ANDAMENTO' } });
        const totalCandidatos = await (prisma as any).candidato.count();

        const porEtapa = await (prisma as any).candidato.groupBy({
            by: ['etapa'],
            _count: true
        });

        const funnel: Record<string, number> = {};
        porEtapa.forEach((g: any) => { funnel[g.etapa] = g._count; });

        const admitidos = funnel['ADMITIDO'] || 0;
        const reprovados = funnel['REPROVADO'] || 0;
        const taxaAprovacao = totalCandidatos > 0
            ? Math.round((admitidos / (admitidos + reprovados || 1)) * 100)
            : 0;

        // Tempo médio: calcular dias entre criação e última atualização dos admitidos
        let tempoMedio = 0;
        try {
            const admitidosList = await (prisma as any).candidato.findMany({
                where: { etapa: 'ADMITIDO' },
                select: { createdAt: true, updatedAt: true }
            });
            if (admitidosList.length > 0) {
                const totalDias = admitidosList.reduce((sum: number, c: any) => {
                    const dias = Math.ceil((new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                    return sum + Math.max(dias, 1);
                }, 0);
                tempoMedio = Math.round(totalDias / admitidosList.length);
            }
        } catch { /* ignore if updatedAt doesn't exist */ }

        res.json({ vagasAbertas, vagasEmAndamento, totalCandidatos, funnel, taxaAprovacao, tempoMedio });
    } catch (error) {
        console.error('Recrutamento stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
};

// ─── T16: Funil de Conversão Detalhado ──────────────────────────
export const getFunilConversao = async (req: AuthRequest, res: Response) => {
    try {
        const { vagaId, periodo } = req.query;
        const where: any = {};
        if (vagaId) where.vagaId = vagaId as string;

        // Período filter
        if (periodo) {
            const dias = parseInt(periodo as string) || 30;
            where.createdAt = { gte: new Date(Date.now() - dias * 24 * 60 * 60 * 1000) };
        }

        const candidatos = await (prisma as any).candidato.findMany({
            where,
            include: { vaga: { select: { id: true, cargo: true, departamento: true } } },
            orderBy: { createdAt: 'asc' }
        });

        // Etapas do funil (em ordem)
        const etapas = [
            'TRIAGEM', 'PRE_CONSULTA', 'ENTREVISTA', 'TESTE_PRATICO',
            'EXAME_MEDICO', 'ADMITIDO', 'REPROVADO'
        ];

        // Contagem por etapa
        const porEtapa: Record<string, number> = {};
        etapas.forEach(e => { porEtapa[e] = 0; });
        candidatos.forEach((c: any) => {
            porEtapa[c.etapa] = (porEtapa[c.etapa] || 0) + 1;
        });

        // Taxa de conversão entre etapas consecutivas
        const total = candidatos.length;
        const etapasAtivas = etapas.filter(e => e !== 'REPROVADO');
        const conversoes = etapasAtivas.map((etapa, i) => {
            const count = porEtapa[etapa] || 0;
            const taxaDoTotal = total > 0 ? Math.round((count / total) * 100) : 0;
            return { etapa, count, taxaDoTotal };
        });

        // Por fonte (origem)
        const porFonte: Record<string, { total: number; admitidos: number }> = {};
        candidatos.forEach((c: any) => {
            const fonte = c.fonte || 'Desconhecida';
            if (!porFonte[fonte]) porFonte[fonte] = { total: 0, admitidos: 0 };
            porFonte[fonte].total++;
            if (c.etapa === 'ADMITIDO') porFonte[fonte].admitidos++;
        });

        const fontes = Object.entries(porFonte).map(([fonte, dados]) => ({
            fonte,
            total: dados.total,
            admitidos: dados.admitidos,
            taxaConversao: dados.total > 0 ? Math.round((dados.admitidos / dados.total) * 100) : 0
        })).sort((a, b) => b.taxaConversao - a.taxaConversao);

        // Por departamento
        const porDepto: Record<string, { total: number; admitidos: number }> = {};
        candidatos.forEach((c: any) => {
            const depto = c.vaga?.departamento || 'Outros';
            if (!porDepto[depto]) porDepto[depto] = { total: 0, admitidos: 0 };
            porDepto[depto].total++;
            if (c.etapa === 'ADMITIDO') porDepto[depto].admitidos++;
        });

        // Tempo médio por etapa (dos admitidos)
        const admitidos = candidatos.filter((c: any) => c.etapa === 'ADMITIDO');
        let tempoMedioContratacao = 0;
        if (admitidos.length > 0) {
            const totalDias = admitidos.reduce((sum: number, c: any) => {
                return sum + Math.max(1, Math.ceil(
                    (new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24)
                ));
            }, 0);
            tempoMedioContratacao = Math.round(totalDias / admitidos.length);
        }

        res.json({
            totalCandidatos: total,
            totalAdmitidos: porEtapa['ADMITIDO'] || 0,
            totalReprovados: porEtapa['REPROVADO'] || 0,
            taxaGeralAprovacao: total > 0 ? Math.round(((porEtapa['ADMITIDO'] || 0) / total) * 100) : 0,
            tempoMedioContratacao,
            funil: conversoes,
            porFonte: fontes,
            porDepartamento: Object.entries(porDepto).map(([depto, d]) => ({ departamento: depto, ...d })),
            detalhePorEtapa: porEtapa,
        });
    } catch (error) {
        console.error('Funil conversão error:', error);
        res.status(500).json({ error: 'Failed to generate conversion funnel' });
    }
};

// ─── PUBLIC ENDPOINTS (sem auth) ────────────────────────────────

export const getVagaPublica = async (req: any, res: Response) => {
    try {
        const id = req.params.id as string;
        const vaga = await (prisma as any).vaga.findUnique({
            where: { id },
            select: { id: true, cargo: true, departamento: true, area: true, descricao: true, requisitos: true, status: true }
        });
        if (!vaga) return res.status(404).json({ error: 'Vaga não encontrada' });
        if (vaga.status === 'FECHADA' || vaga.status === 'CANCELADA') {
            return res.status(400).json({ error: 'Esta vaga não está mais disponível' });
        }
        res.json(vaga);
    } catch (error) {
        console.error('Get vaga publica error:', error);
        res.status(500).json({ error: 'Failed to fetch vaga' });
    }
};

export const inscricaoPublica = async (req: any, res: Response) => {
    try {
        const {
            vagaId, nome, email, telefone, whatsapp, cidade, cnh, possuiMOPP, jornada, fonte,
            sexo, endereco, rg, cpf, dataNascimento, idade, estadoCivil, dependentes, grauInstrucao,
            indicacao, quemIndicou, veiculoProprio, aceitouTermos
        } = req.body;

        if (!vagaId || !nome || !aceitouTermos) {
            return res.status(400).json({ error: 'Vaga, nome e aceite dos termos são obrigatórios' });
        }

        // Verify vaga exists and is open
        const vaga = await (prisma as any).vaga.findUnique({ where: { id: vagaId } });
        if (!vaga) return res.status(404).json({ error: 'Vaga não encontrada' });

        const candidato = await (prisma as any).candidato.create({
            data: {
                nome: nome.trim(),
                email: email || undefined,
                telefone: telefone || undefined,
                whatsapp: whatsapp || telefone || undefined,
                vagaId,
                etapa: 'TRIAGEM',
                cidade: cidade || undefined,
                cnh: cnh || undefined,
                possuiMOPP: possuiMOPP === true || possuiMOPP === 'true' ? true : possuiMOPP === false || possuiMOPP === 'false' ? false : undefined,
                jornada: jornada || undefined,
                fonte: fonte || 'Formulário Online',
                
                // Novos campos do Pipefy
                sexo: sexo || undefined,
                endereco: endereco || undefined,
                rg: rg || undefined,
                cpf: cpf || undefined,
                dataNascimento: dataNascimento ? new Date(dataNascimento) : undefined,
                idade: idade ? parseInt(idade) : undefined,
                estadoCivil: estadoCivil || undefined,
                dependentes: dependentes || undefined,
                grauInstrucao: grauInstrucao || undefined,
                indicacao: indicacao === true || indicacao === 'true' ? true : indicacao === false || indicacao === 'false' ? false : undefined,
                quemIndicou: quemIndicou || undefined,
                veiculoProprio: veiculoProprio === true || veiculoProprio === 'true' ? true : veiculoProprio === false || veiculoProprio === 'false' ? false : undefined,
                aceitouTermos: aceitouTermos === true || aceitouTermos === 'true',
            },
        });

        // 📧 REC-01: E-mail de candidatura recebida (inscrição pública)
        if (email) {
            try {
                const cargoVaga = vaga.cargo || 'N/A';
                await sendREC01_CandidaturaRecebida({ nome: nome.trim(), email, cargo: cargoVaga });
                console.log(`[Pipefy Email] REC-01 Candidatura Recebida (público) → ${nome}`);
            } catch (e) {
                console.error('[Pipefy Email - REC-01 Público] Failed:', e);
            }
        }

        res.status(201).json({ message: 'Inscrição realizada com sucesso!', id: candidato.id });
    } catch (error: any) {
        console.error('Inscrição pública error:', error);
        res.status(500).json({ error: 'Falha ao processar inscrição', details: error.message });
    }
};
