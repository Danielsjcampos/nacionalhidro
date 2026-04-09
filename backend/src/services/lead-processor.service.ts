import { enviarMensagemWhatsApp } from './whatsapp.service';
import prisma from '../lib/prisma';

// Internal Group for Lead Alerts Replace with env variable if needed in the future
const GROUP_LEADS_ID = process.env.WHATSAPP_GROUP_LEADS_ID || '120363405638860459@g.us';

export interface LeadPayload {
    nome: string;
    email?: string;
    telefone: string;
    empresa?: string;
    servico_necessitado?: string;
    mensagem?: string;
    origem?: string;
    url?: string;
}

export class LeadProcessorService {
    /**
     * Process a new lead from a webhook.
     * 1. Saves to Database.
     * 2. Sends WhatsApp Alert to the internal Group.
     * 3. Sends Auto-Reply to the Lead.
     */
    static async processNewLead(payload: LeadPayload) {
        try {
            console.log('[LeadProcessor] Iniciando processamento de novo lead:', payload.nome);

            // 1. Normalização do Telefone
            const telefoneNumerico = payload.telefone.replace(/\D/g, '');

            // 2. Salvar no Banco de Dados (Prisma)
            const novoLead = await prisma.lead.create({
                data: {
                    nome: payload.nome,
                    email: payload.email,
                    telefone: telefoneNumerico,
                    empresa: payload.empresa,
                    origem: payload.origem || 'Website Form',
                    paginaOrigem: payload.url,
                    status: 'NOVO_LEAD',
                    observacoes: payload.servico_necessitado ? `Serviço Necessitado: ${payload.servico_necessitado}` : undefined,
                },
            });

            console.log(`[LeadProcessor] Lead salvo no banco de dados com ID: ${novoLead.id}`);

            // 3. Enviar Alerta para o Grupo Interno
            // Título personalizado de acordo com a origem do lead
            let tituloOrigem: string;
            let originDetails: string;

            if (payload.origem === 'Google Ads') {
                tituloOrigem = '📣 Veio pelo formulário nativo do *Google Ads*!';
                originDetails = `*Empresa:* ${payload.empresa || 'Não informado'}`;
            } else if (payload.origem === 'TwoTime Chat') {
                tituloOrigem = '💬 Veio pelo *botão de WhatsApp* do site!';
                originDetails = `*Mensagem:* ${payload.servico_necessitado || payload.mensagem || 'Não informado'}`;
            } else {
                tituloOrigem = '📝 Veio pelo *formulário do site*!';
                originDetails = `*Serviço Necessitado:* ${payload.servico_necessitado || 'Não informado'}`;
            }

            const alertMessage = `${tituloOrigem}\n*NOVO LEAD* 📢\n\n*Nome:* ${payload.nome}\n*Email:* ${payload.email || 'Não informado'}\n*Empresa:* ${payload.empresa || 'Não informado'}\n*Whatsapp:* https://wa.me/55${telefoneNumerico}\n${originDetails}`;

            // 4. Enviar Mensagem de Boas-vindas para o Lead
            const greetingMessage = `Olá, ${payload.nome} !\n\nVi que você nos contatou pelo site da Nacional Hidro.\nSou o Bruno, e vou continuar seu atendimento!`;

            // Usa Promise.allSettled + await para OBRIGAR a finalizar o envio antes de encerrar
            await Promise.allSettled([
                this.enviarParaGrupoAsync(alertMessage),
                this.enviarParaLeadAsync(telefoneNumerico, greetingMessage)
            ]);

            return { success: true, lead: novoLead };

        } catch (error: any) {
            console.error('[LeadProcessor] Erro processando lead:', error);
            throw error;
        }
    }

    /**
     * Método Auxiliar Async para não bloquear o response da requisição HTTP
     */
    private static async enviarParaGrupoAsync(mensagem: string) {
        try {
            const result = await enviarMensagemWhatsApp(GROUP_LEADS_ID, mensagem);
            if (!result.success) {
                console.warn(`[LeadProcessor] Aviso: Falha ao enviar alerta para grupo. Error: ${result.error}`);
            }
        } catch (error) {
            console.error('[LeadProcessor] Erro ao disparar mensagem para o grupo:', error);
        }
    }

    /**
     * Método Auxiliar Async para não bloquear o response da requisição HTTP
     */
    private static async enviarParaLeadAsync(telefone: string, mensagem: string) {
        try {
            const result = await enviarMensagemWhatsApp(telefone, mensagem);
            if (!result.success) {
                console.warn(`[LeadProcessor] Aviso: Falha ao enviar boas-vindas para o lead. Error: ${result.error}`);
            }
        } catch (error) {
            console.error('[LeadProcessor] Erro ao disparar mensagem para o lead:', error);
        }
    }
}
