import cron from 'node-cron';
import prisma from '../lib/prisma';
import { enviarLembreteVencimentoEmail } from '../services/cobrancaEmail.service';

/**
 * Job de Cobrança de Títulos Vencidos
 * Roda todos os dias às 09:00 AM
 */
export const startCobrancaOverdueJob = () => {
    console.log('[CRON] Iniciando agendador de Cobrança de Títulos Vencidos...');

    cron.schedule('0 9 * * *', async () => {
        console.log('[CRON] Rodando verificação de títulos vencidos para cobrança automática...');

        try {
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            // Busca contas a receber vencidas que não estão liquidadas
            const contasVencidas = await prisma.contaReceber.findMany({
                where: {
                    status: { in: ['PENDENTE', 'VENCIDO', 'PARCIAL'] },
                    dataVencimento: { lt: hoje },
                },
                include: {
                    cliente: true
                }
            });

            console.log(`[CRON] Encontrados ${contasVencidas.length} títulos vencidos.`);

            for (const conta of contasVencidas) {
                const vencimento = new Date(conta.dataVencimento);
                vencimento.setHours(0,0,0,0);
                
                const diffTime = Math.abs(hoje.getTime() - vencimento.getTime());
                const diasAtraso = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                // Régua de cobrança automática: 3, 10 e 20 dias de atraso
                // (Evita spam diário, foca em marcos importantes)
                const marcosCobranca = [3, 10, 20];
                
                if (marcosCobranca.includes(diasAtraso)) {
                    console.log(`[CRON] Disparando cobrança automática para Conta ${conta.id} (${diasAtraso} dias de atraso)`);
                    
                    await enviarLembreteVencimentoEmail(conta, diasAtraso);

                    // Delay de 2s entre disparos para segurança do SMTP
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }

        } catch (error) {
            console.error('[CRON] Erro no job de cobrança de títulos vencidos:', error);
        }
    }, {
        timezone: 'America/Sao_Paulo'
    });
};
