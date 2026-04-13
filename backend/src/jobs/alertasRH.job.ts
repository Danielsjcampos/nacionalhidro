import cron from 'node-cron';
import prisma from '../lib/prisma';
import {
    sendGEST06_Avaliacao1Periodo,
    sendGEST07_Avaliacao2Periodo,
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
