import cron from 'node-cron';
import prisma from '../lib/prisma';
import { enviarCobrancaEmail } from '../services/cobrancaEmail.service';

// Job roda todos os dias às 08:00 AM (horário de Brasília)
export const startCobrancaAutomaticaJob = () => {
    console.log('[CRON] Iniciando agendador de Cobrança Automática...');

    cron.schedule('0 8 * * *', async () => {
        console.log('[CRON] Rodando verificação de medições pendentes para cobrança...');

        try {
            const hoje = new Date();

            // Exatamente como o legado: busca AGUARDANDO_APROVACAO cujo dataCobranca < 3 dias atrás
            // (ou nunca foi cobrada)
            const limiteReenvio = new Date(hoje);
            limiteReenvio.setDate(limiteReenvio.getDate() - 3);

            const medicoesAtrasadas = await prisma.medicao.findMany({
                where: {
                    status: 'AGUARDANDO_APROVACAO',
                    OR: [
                        { dataCobranca: null },          // nunca cobrada
                        { dataCobranca: { lte: limiteReenvio } } // última cobrança há mais de 3 dias
                    ]
                },
                include: {
                    cliente: true,
                    cobrancasEmail: {
                        orderBy: { dataEnvio: 'desc' },
                        take: 1
                    }
                }
            });

            console.log(`[CRON] ${medicoesAtrasadas.length} medições pendentes para cobrança.`);

            for (const medicao of medicoesAtrasadas) {
                // Dias desde o envio original ao cliente
                const refDate = (medicao as any).dataCobranca || medicao.createdAt;
                const diasAtraso = Math.ceil(
                    Math.abs(hoje.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24)
                );

                await enviarCobrancaEmail(medicao, diasAtraso);

                // Atualiza dataCobranca = hoje (exatamente como o legado)
                await prisma.medicao.update({
                    where: { id: medicao.id },
                    data: { dataCobranca: hoje }
                });

                // Delay de 1.5s entre emails para evitar bloqueio SMTP (igual ao legado)
                await new Promise(resolve => setTimeout(resolve, 1500));
            }

        } catch (error) {
            console.error('[CRON] Erro no job de cobrança automática:', error);
        }
    }, {
        timezone: 'America/Sao_Paulo'
    });
};
