import cron from 'node-cron';
import prisma from '../lib/prisma';
import { enviarMensagemWhatsApp } from '../services/whatsapp.service';

// Job roda todos os dias às 09:00 AM
export const startCobrancaMensagensJob = () => {
    console.log('[CRON] Iniciando agendador de Cobrança Preventiva/Reativa (WhatsApp)...');

    cron.schedule('0 9 * * *', async () => {
        console.log('[CRON] Verificando Contas a Receber para réguas de cobrança WhatsApp...');
        try {
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            const amanha = new Date(hoje);
            amanha.setDate(amanha.getDate() + 1);

            const tresDiasAtras = new Date(hoje);
            tresDiasAtras.setDate(tresDiasAtras.getDate() - 3);

            // Buscar contas que vencem AMANHÃ (Preventiva) ou venceram HÁ 3 DIAS (Reativa)
            const pendentes = await prisma.contaReceber.findMany({
                where: {
                    status: { in: ['PENDENTE', 'PARCIAL', 'VENCIDO'] }
                },
                include: {
                    cliente: true
                }
            });

            for (const conta of pendentes) {
                const vencimento = new Date(conta.dataVencimento);
                vencimento.setHours(0, 0, 0, 0);

                const difDias = Math.round((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
                const saldo = Number(conta.saldoDevedor || conta.valorOriginal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                
                let tipoMsg: 'PREVENTIVA' | 'REATIVA' | null = null;
                let mensagem = '';

                if (difDias === 1) {
                    tipoMsg = 'PREVENTIVA';
                    mensagem = `Olá, somos da Nacional Hidrosaneamento/Locação. Este é um lembrete amigável de que o título "${conta.descricao}" no valor de ${saldo} vence amanhã (${vencimento.toLocaleDateString('pt-BR')}). Se houver dúvidas, estamos à disposição.`;
                } else if (difDias === -3) {
                    tipoMsg = 'REATIVA';
                    mensagem = `Olá! Notamos que o pagamento do título "${conta.descricao}" no valor de ${saldo}, vencido em ${vencimento.toLocaleDateString('pt-BR')}, ainda consta em aberto em nosso sistema. Se já efetuou o pagamento, por favor, desconsidere este aviso. Caso precise da via atualizada ou auxílio, responda esta mensagem.`;
                }

                if (tipoMsg && conta.cliente?.telefone) {
                    // Check if we already sent this type recently to avoid flooding
                    const sentLogs = await prisma.historicoCobranca.findMany({
                        where: {
                            contaReceberId: conta.id,
                            mensagem: { contains: tipoMsg === 'PREVENTIVA' ? 'vence amanhã' : 'consta em aberto' },
                            enviadoEm: { gte: hoje } // Only care if we sent it today already
                        }
                    });

                    if (sentLogs.length === 0) {
                        console.log(`[CRON] Enviando WhatsApp ${tipoMsg} para ${conta.cliente.telefone} ref. Conta ${conta.id}`);
                        
                        const result = await enviarMensagemWhatsApp(conta.cliente.telefone, mensagem);
                        
                        if (result.success) {
                            await prisma.historicoCobranca.create({
                                data: {
                                    contaReceberId: conta.id,
                                    tipo: 'SISTEMA',
                                    mensagem: `[AUTOMAÇÃO ${tipoMsg} WPP]: ${mensagem}`,
                                    destinatario: conta.cliente.telefone,
                                    enviadoPor: 'Sistema'
                                }
                            });
                            
                            // Atraso intencional para não bloquear a API nem causar rate-limit
                            await new Promise((resolve) => setTimeout(resolve, 5000));
                        }
                    }
                }
            }

        } catch (error) {
            console.error('[CRON] Erro no job de Cobrança WhatsApp:', error);
        }
    }, {
        timezone: "America/Sao_Paulo"
    });
};
