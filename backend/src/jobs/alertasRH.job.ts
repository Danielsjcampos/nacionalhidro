import cron from 'node-cron';
import prisma from '../lib/prisma';
import {
    sendGEST06_Avaliacao1Periodo,
    sendGEST07_Avaliacao2Periodo,
    sendEmail,
} from '../services/email.service';
import { enviarMensagemWhatsApp } from '../services/whatsapp.service';

// ─── T07: Cron de Alertas RH (ASO, Férias, Experiência) ────────────
// Roda diariamente às 07:00 AM — verifica vencimentos e gera alertas

export const startAlertasRHJob = () => {
    console.log('[CRON] Iniciando agendador de Alertas RH...');

    cron.schedule('0 7 * * *', async () => {
        console.log('[CRON-RH] Verificando alertas de RH...');
        try {
            const alertas = await verificarAlertasRH();
            console.log(`[CRON-RH] ${alertas.total} alertas encontrados: ${alertas.asoVencendo.length} ASO, ${alertas.feriasVencendo.length} Férias, ${alertas.experienciaVencendo.length} Experiência`);

            // Buscar telefone do RH nas configurações para notificar o gestor
            const config = await prisma.configuracao.findUnique({ where: { id: 'default' } });
            const telefoneGestor = config?.telefone;

            // ═══════════════════════════════════════════════════════
            // 📧 PIPEFY / WHATSAPP: Alertas de Experiência
            // ═══════════════════════════════════════════════════════
            for (const alerta of alertas.experienciaVencendo) {
                // Notificar quando faltam exatamente 5 dias
                if (alerta.diasRestantes === 5) {
                    try {
                        const dataFim = new Date(alerta.dataVencimento).toLocaleDateString('pt-BR');
                        
                        // 1. Notificação por E-mail (Pipefy Flow)
                        const emailData = {
                            nome: alerta.nome,
                            cargo: alerta.cargo || 'N/A',
                            dataFinalizacao: dataFim,
                        };

                        if (alerta.tipoAlerta === '45_DIAS') {
                            await sendGEST06_Avaliacao1Periodo(emailData);
                        } else if (alerta.tipoAlerta === '90_DIAS') {
                            await sendGEST07_Avaliacao2Periodo(emailData);
                        }

                        // 2. Notificação por WhatsApp para o GESTOR (Novo pedido do usuário)
                        if (telefoneGestor) {
                            const msgGestor = `🚨 *ALERTA RH: VENCIMENTO DE EXPERIÊNCIA*\n\n` +
                                `O colaborador *${alerta.nome}* (${alerta.cargo}) completa seu período de *${alerta.tipoAlerta === '45_DIAS' ? '45 dias' : '90 dias'}* em: *${dataFim}*.\n\n` +
                                `Por favor, realize a avaliação de desempenho no sistema.`;
                            
                            await enviarMensagemWhatsApp(telefoneGestor, msgGestor, 'RH_Oficial');
                        }
                    } catch (e) {
                        console.error(`[Alerta RH] Failed for ${alerta.nome}:`, e);
                    }
                }
            }

            // ═══════════════════════════════════════════════════════
            // 📧 WHATSAPP: Alertas de ASO (Vencendo <= 30 dias)
            // ═══════════════════════════════════════════════════════
            for (const aso of alertas.asoVencendo) {
                if (telefoneGestor && (aso.urgencia === 'CRITICO' || aso.urgencia === 'VENCIDO' || aso.diasRestantes === 30 || aso.diasRestantes === 15)) {
                    try {
                        const dataVenc = new Date(aso.dataVencimento).toLocaleDateString('pt-BR');
                        const statusText = aso.urgencia === 'VENCIDO' ? '*VENCEU*' : `Vence em ${aso.diasRestantes} dias`;
                        const prefix = aso.urgencia === 'VENCIDO' ? '🚨 *ALERTA VERMELHO: ASO VENCIDO!*' : '⚠️ *AVISO: ASO VENCENDO*';
                        
                        const msgASO = `${prefix}\n\n` +
                            `O ASO do colaborador *${aso.funcionario?.nome}* (${aso.funcionario?.cargo}) ${statusText} (${dataVenc}).\n` +
                            `Status: ${aso.urgencia}. ` + 
                            (aso.urgencia === 'VENCIDO' ? 'O colaborador não deve ser escalado até a regularização!' : 'Por favor, agende o exame o quanto antes.');
                        
                        await enviarMensagemWhatsApp(telefoneGestor, msgASO, 'RH_Oficial');

                        if (aso.urgencia === 'VENCIDO') {
                            await prisma.funcionario.update({
                                where: { id: aso.funcionarioId },
                                data: { statusAsoDemissional: 'VENCIDO' }
                            });
                        }
                    } catch (e) {
                        console.error(`[Alerta RH] ASO Notification failed`, e);
                    }
                }
            }

            // ═══════════════════════════════════════════════════════
            // 📧 WHATSAPP: Alertas de Férias (Vencendo <= 30 dias)
            // ═══════════════════════════════════════════════════════
            for (const ferias of alertas.feriasVencendo) {
                if (telefoneGestor && (ferias.urgencia === 'CRITICO' || ferias.urgencia === 'VENCIDO' || ferias.diasRestantes === 30 || ferias.diasRestantes === 15)) {
                    try {
                        const dataVenc = new Date(ferias.dataVencimento).toLocaleDateString('pt-BR');
                        const statusText = ferias.urgencia === 'VENCIDO' ? '*VENCEU*' : `Vence em ${ferias.diasRestantes} dias`;
                        const prefix = ferias.urgencia === 'VENCIDO' ? '🚨 *ALERTA VERMELHO: FÉRIAS VENCIDAS!*' : '🏖️ *AVISO: FÉRIAS A VENCER*';
                        
                        const msgFerias = `${prefix}\n\n` +
                            `As férias do colaborador *${ferias.funcionario?.nome}* (${ferias.funcionario?.cargo}) ${statusText} (${dataVenc}).\n` +
                            `Status: ${ferias.urgencia}. ` + 
                            `Por favor, realize a programação de férias para evitar multas trabalhistas.`;
                        
                        await enviarMensagemWhatsApp(telefoneGestor, msgFerias, 'RH_Oficial');
                    } catch (e) {
                        console.error(`[Alerta RH] Férias Notification failed`, e);
                    }
                }
            }

            // ═══════════════════════════════════════════════════════
            // 📧 EMAIL: Alertas de Vencimentos (ASO, Treinamento, CNH, MOPP)
            // ═══════════════════════════════════════════════════════
            await enviarEmailsVencimentos();

        } catch (error) {
            console.error('[CRON-RH] Erro ao verificar alertas RH:', error);
        }
    }, {
        timezone: "America/Sao_Paulo"
    });
};

// Função reutilizável (usada pelo cron E pelo endpoint da API)
export async function verificarAlertasRH() {
    const hoje = new Date();
    const em30dias = new Date(hoje);
    em30dias.setDate(em30dias.getDate() + 30);
    const em15dias = new Date(hoje);
    em15dias.setDate(em15dias.getDate() + 15);
    const em45dias = new Date(hoje);
    em45dias.setDate(em45dias.getDate() + 45);

    // ─── 1. ASOs vencendo nos próximos 30 dias ───
    const asoVencendo = await prisma.aSOControle.findMany({
        where: {
            dataVencimento: {
                lte: em30dias,
                gte: hoje
            }
        },
        include: {
            funcionario: { select: { id: true, nome: true, cargo: true } }
        },
        orderBy: { dataVencimento: 'asc' }
    });

    // ASOs já vencidos
    const asoVencidos = await prisma.aSOControle.findMany({
        where: {
            dataVencimento: { lt: hoje },
            resultado: { not: 'INAPTO' }
        },
        include: {
            funcionario: { select: { id: true, nome: true, cargo: true } }
        },
        orderBy: { dataVencimento: 'asc' }
    });

    // ─── 2. Férias vencendo (dataVencimento <= 30 dias) ───
    const feriasVencendo = await prisma.controleFerias.findMany({
        where: {
            status: { in: ['A_VENCER', 'PROGRAMADA'] },
            dataVencimento: {
                lte: em30dias,
                gte: hoje
            }
        },
        include: {
            funcionario: { select: { id: true, nome: true, cargo: true } }
        },
        orderBy: { dataVencimento: 'asc' }
    });

    // Férias já vencidas (sem gozo)
    const feriasVencidas = await prisma.controleFerias.findMany({
        where: {
            status: 'A_VENCER',
            dataVencimento: { lt: hoje }
        },
        include: {
            funcionario: { select: { id: true, nome: true, cargo: true } }
        },
        orderBy: { dataVencimento: 'asc' }
    });

    // ─── 3. Período de experiência (45 e 90 dias) ───
    const experienciaVencendo: any[] = [];
    const admissoes = await prisma.admissao.findMany({
        where: {
            etapa: 'CONTRATADO',
            dataAdmissaoPrevista: { not: null }
        },
        select: { id: true, nome: true, cargo: true, dataAdmissaoPrevista: true }
    });

    for (const adm of admissoes) {
        if (!adm.dataAdmissaoPrevista) continue;
        const dataAdm = new Date(adm.dataAdmissaoPrevista);

        // 45 dias de experiência
        const exp45 = new Date(dataAdm);
        exp45.setDate(exp45.getDate() + 45);
        const diff45 = Math.ceil((exp45.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

        // 90 dias de experiência
        const exp90 = new Date(dataAdm);
        exp90.setDate(exp90.getDate() + 90);
        const diff90 = Math.ceil((exp90.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

        if (diff45 >= 0 && diff45 <= 15) {
            experienciaVencendo.push({
                ...adm,
                tipoAlerta: '45_DIAS',
                dataVencimento: exp45,
                diasRestantes: diff45,
                urgencia: diff45 <= 5 ? 'CRITICO' : 'ALERTA'
            });
        }

        if (diff90 >= 0 && diff90 <= 15) {
            experienciaVencendo.push({
                ...adm,
                tipoAlerta: '90_DIAS',
                dataVencimento: exp90,
                diasRestantes: diff90,
                urgencia: diff90 <= 5 ? 'CRITICO' : 'ALERTA'
            });
        }
    }

    // Classificar ASOs com urgência
    const asoClassificados = [
        ...asoVencidos.map(a => ({
            ...a,
            urgencia: 'VENCIDO' as const,
            diasRestantes: Math.ceil((hoje.getTime() - (a.dataVencimento?.getTime() || hoje.getTime())) / (1000 * 60 * 60 * 24)) * -1
        })),
        ...asoVencendo.map(a => {
            const dias = Math.ceil(((a.dataVencimento?.getTime() || hoje.getTime()) - hoje.getTime()) / (1000 * 60 * 60 * 24));
            return {
                ...a,
                urgencia: (dias <= 7 ? 'CRITICO' : dias <= 15 ? 'ALERTA' : 'AVISO') as string,
                diasRestantes: dias
            };
        })
    ];

    // Classificar férias com urgência
    const feriasClassificados = [
        ...feriasVencidas.map(f => ({
            ...f,
            urgencia: 'VENCIDO' as const,
            diasRestantes: Math.ceil((hoje.getTime() - (f.dataVencimento?.getTime() || hoje.getTime())) / (1000 * 60 * 60 * 24)) * -1
        })),
        ...feriasVencendo.map(f => {
            const dias = Math.ceil(((f.dataVencimento?.getTime() || hoje.getTime()) - hoje.getTime()) / (1000 * 60 * 60 * 24));
            return {
                ...f,
                urgencia: (dias <= 7 ? 'CRITICO' : dias <= 15 ? 'ALERTA' : 'AVISO') as string,
                diasRestantes: dias
            };
        })
    ];

    return {
        asoVencendo: asoClassificados,
        feriasVencendo: feriasClassificados,
        experienciaVencendo,
        total: asoClassificados.length + feriasClassificados.length + experienciaVencendo.length,
        verificadoEm: hoje.toISOString()
    };
}

// ═══════════════════════════════════════════════════════════════
// GAP 3: Alertas de Vencimentos por Email
// ═══════════════════════════════════════════════════════════════

const EMAILS_DEST = {
    SEGTRABALHO: 'segtrabalho@nacionalhidro.com.br',
    DOC: 'doc@nacionalhidro.com.br',
    RH: 'rh@nacionalhidro.com.br',
    LOGISTICA: 'logistica@nacionalhidro.com.br',
};

const formatDateBR = (d: Date | null) => d ? new Date(d).toLocaleDateString('pt-BR') : 'N/A';

const diffDays = (d: Date | null): number => {
    if (!d) return 999;
    return Math.ceil((new Date(d).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
};

async function enviarEmailsVencimentos() {
    const hoje = new Date();
    const em30dias = new Date(hoje); em30dias.setDate(em30dias.getDate() + 30);
    const em60dias = new Date(hoje); em60dias.setDate(em60dias.getDate() + 60);

    let totalEnviados = 0;

    // ── 1. ASO vencendo em 30 dias ──
    try {
        const asos = await prisma.aSOControle.findMany({
            where: {
                dataVencimento: { lte: em30dias, gte: hoje },
                funcionario: { ativo: true },
            },
            include: { funcionario: { select: { nome: true, cargo: true } } },
        });

        for (const aso of asos) {
            const dias = diffDays(aso.dataVencimento);
            // Enviar apenas nos marcos: 30, 15, 7, 3, 1 dias
            if (![30, 15, 7, 3, 1].includes(dias)) continue;

            await sendEmail({
                to: [EMAILS_DEST.SEGTRABALHO, EMAILS_DEST.DOC],
                subject: `⚠️ ASO vencendo — ${aso.funcionario.nome} — ${dias} dias`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h3 style="color: #d97706;">⚠️ Alerta de Vencimento de ASO</h3>
                        <table style="width: 100%; border-collapse: collapse; margin: 12px 0;">
                            <tr><td style="padding: 6px 12px; background: #f1f5f9; font-weight: bold;">Colaborador</td><td style="padding: 6px 12px;">${aso.funcionario.nome}</td></tr>
                            <tr><td style="padding: 6px 12px; background: #f1f5f9; font-weight: bold;">Cargo</td><td style="padding: 6px 12px;">${aso.funcionario.cargo || 'N/A'}</td></tr>
                            <tr><td style="padding: 6px 12px; background: #f1f5f9; font-weight: bold;">Tipo ASO</td><td style="padding: 6px 12px;">${aso.tipo || 'N/A'}</td></tr>
                            <tr><td style="padding: 6px 12px; background: #f1f5f9; font-weight: bold;">Clínica</td><td style="padding: 6px 12px;">${aso.clinica || 'N/A'}</td></tr>
                            <tr><td style="padding: 6px 12px; background: #f1f5f9; font-weight: bold;">Vencimento</td><td style="padding: 6px 12px; color: ${dias <= 7 ? '#dc2626' : '#d97706'}; font-weight: bold;">${formatDateBR(aso.dataVencimento)} (${dias} dias)</td></tr>
                        </table>
                        <p style="color: #64748b; font-size: 12px;">Providencie o agendamento do exame o mais breve possível.</p>
                    </div>
                `,
                fromName: 'Sistema Nacional Hidro',
            });
            totalEnviados++;
        }
    } catch (e) {
        console.error('[CRON-RH] Erro ao enviar alertas de ASO:', e);
    }

    // ── 2. Treinamentos vencendo em 30 dias ──
    try {
        const treinamentos = await prisma.treinamentoRealizado.findMany({
            where: {
                dataVencimento: { lte: em30dias, gte: hoje },
                funcionario: { ativo: true },
            },
            include: {
                funcionario: { select: { nome: true, cargo: true } },
                treinamento: { select: { nome: true } },
            },
        });

        for (const t of treinamentos) {
            const dias = diffDays(t.dataVencimento);
            if (![30, 15, 7, 3, 1].includes(dias)) continue;

            await sendEmail({
                to: EMAILS_DEST.SEGTRABALHO,
                subject: `⚠️ Treinamento vencendo — ${t.funcionario.nome} — ${t.treinamento.nome}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h3 style="color: #d97706;">⚠️ Alerta de Vencimento de Treinamento</h3>
                        <table style="width: 100%; border-collapse: collapse; margin: 12px 0;">
                            <tr><td style="padding: 6px 12px; background: #f1f5f9; font-weight: bold;">Colaborador</td><td style="padding: 6px 12px;">${t.funcionario.nome}</td></tr>
                            <tr><td style="padding: 6px 12px; background: #f1f5f9; font-weight: bold;">Treinamento</td><td style="padding: 6px 12px;">${t.treinamento.nome}</td></tr>
                            <tr><td style="padding: 6px 12px; background: #f1f5f9; font-weight: bold;">Vencimento</td><td style="padding: 6px 12px; color: ${dias <= 7 ? '#dc2626' : '#d97706'}; font-weight: bold;">${formatDateBR(t.dataVencimento)} (${dias} dias)</td></tr>
                        </table>
                        <p style="color: #64748b; font-size: 12px;">Agende a reciclagem do treinamento.</p>
                    </div>
                `,
                fromName: 'Sistema Nacional Hidro',
            });
            totalEnviados++;
        }
    } catch (e) {
        console.error('[CRON-RH] Erro ao enviar alertas de Treinamento:', e);
    }

    // ── 3. CNH vencendo em 60 dias ──
    try {
        const funcsCNH = await prisma.funcionario.findMany({
            where: {
                ativo: true,
                dataVencimentoCNH: { lte: em60dias, gte: hoje },
            },
            select: { id: true, nome: true, cargo: true, categoriaCNH: true, dataVencimentoCNH: true },
        });

        for (const f of funcsCNH) {
            const dias = diffDays(f.dataVencimentoCNH);
            if (![60, 30, 15, 7, 3, 1].includes(dias)) continue;

            await sendEmail({
                to: [EMAILS_DEST.RH, EMAILS_DEST.LOGISTICA],
                subject: `⚠️ CNH vencendo — ${f.nome} — ${f.categoriaCNH || 'N/A'}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h3 style="color: #d97706;">⚠️ Alerta de Vencimento de CNH</h3>
                        <table style="width: 100%; border-collapse: collapse; margin: 12px 0;">
                            <tr><td style="padding: 6px 12px; background: #f1f5f9; font-weight: bold;">Colaborador</td><td style="padding: 6px 12px;">${f.nome}</td></tr>
                            <tr><td style="padding: 6px 12px; background: #f1f5f9; font-weight: bold;">Cargo</td><td style="padding: 6px 12px;">${f.cargo || 'N/A'}</td></tr>
                            <tr><td style="padding: 6px 12px; background: #f1f5f9; font-weight: bold;">Categoria CNH</td><td style="padding: 6px 12px;">${f.categoriaCNH || 'N/A'}</td></tr>
                            <tr><td style="padding: 6px 12px; background: #f1f5f9; font-weight: bold;">Vencimento</td><td style="padding: 6px 12px; color: ${dias <= 15 ? '#dc2626' : '#d97706'}; font-weight: bold;">${formatDateBR(f.dataVencimentoCNH)} (${dias} dias)</td></tr>
                        </table>
                        <p style="color: #64748b; font-size: 12px;">Colaborador deve providenciar renovação da CNH.</p>
                    </div>
                `,
                fromName: 'Sistema Nacional Hidro',
            });
            totalEnviados++;
        }
    } catch (e) {
        console.error('[CRON-RH] Erro ao enviar alertas de CNH:', e);
    }

    // ── 4. MOPP vencendo em 60 dias ──
    try {
        const funcsMOPP = await prisma.funcionario.findMany({
            where: {
                ativo: true,
                dataVencimentoMOPP: { lte: em60dias, gte: hoje },
            },
            select: { id: true, nome: true, cargo: true, dataVencimentoMOPP: true },
        });

        for (const f of funcsMOPP) {
            const dias = diffDays(f.dataVencimentoMOPP);
            if (![60, 30, 15, 7, 3, 1].includes(dias)) continue;

            await sendEmail({
                to: [EMAILS_DEST.RH, EMAILS_DEST.LOGISTICA],
                subject: `⚠️ MOPP vencendo — ${f.nome}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h3 style="color: #d97706;">⚠️ Alerta de Vencimento de MOPP</h3>
                        <table style="width: 100%; border-collapse: collapse; margin: 12px 0;">
                            <tr><td style="padding: 6px 12px; background: #f1f5f9; font-weight: bold;">Colaborador</td><td style="padding: 6px 12px;">${f.nome}</td></tr>
                            <tr><td style="padding: 6px 12px; background: #f1f5f9; font-weight: bold;">Cargo</td><td style="padding: 6px 12px;">${f.cargo || 'N/A'}</td></tr>
                            <tr><td style="padding: 6px 12px; background: #f1f5f9; font-weight: bold;">Vencimento</td><td style="padding: 6px 12px; color: ${dias <= 15 ? '#dc2626' : '#d97706'}; font-weight: bold;">${formatDateBR(f.dataVencimentoMOPP)} (${dias} dias)</td></tr>
                        </table>
                        <p style="color: #64748b; font-size: 12px;">Colaborador deve providenciar renovação do MOPP.</p>
                    </div>
                `,
                fromName: 'Sistema Nacional Hidro',
            });
            totalEnviados++;
        }
    } catch (e) {
        console.error('[CRON-RH] Erro ao enviar alertas de MOPP:', e);
    }

    if (totalEnviados > 0) {
        console.log(`[CRON-RH] 📧 ${totalEnviados} emails de vencimentos enviados.`);
    }
}
