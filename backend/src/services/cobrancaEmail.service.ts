import nodemailer from 'nodemailer';
import prisma from '../lib/prisma';
import Bottleneck from 'bottleneck';

// Rate limiter (max 2 envios por segundo para não cair no spam/limite do provedor)
const limiter = new Bottleneck({
    minTime: 500,
    maxConcurrent: 1
});

// Configuração do transporter
const getTransporter = () => {
    const port = Number(process.env.SMTP_PORT) || 587;
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port,
        secure: port === 465,
        auth: {
            user: process.env.SMTP_USER || 'contato@nacionalhidro.com.br',
            pass: process.env.SMTP_PASS || 'sua_senha_aqui'
        }
    });
};

export const enviarCobrancaEmail = async (medicao: any, diasAtraso: number) => {
    try {
        const destinatario = medicao.cliente?.email || 'contato@cliente.com.br'; // Fallback
        
        // Assunto amigável
        const assunto = `Nacional Hidro — Lembrete de Medição Pendente (OS ${medicao.codigo})`;
        
        // Corpo do e-mail em HTML
        const corpoHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #2563eb;">Olá, equipe ${medicao.cliente?.nome || 'Cliente'}!</h2>
                <p>Esperamos que este e-mail os encontre bem.</p>
                <p>Consta em nosso sistema a medição <strong>${medicao.codigo}</strong>, referente ao período <em>${medicao.periodo || ''}</em>, que encontra-se aguardando aprovação há <strong>${diasAtraso} dias</strong>.</p>
                
                <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #3b82f6; margin: 20px 0;">
                    <p style="margin: 0;"><strong>Valor Total:</strong> R$ ${Number(medicao.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                
                <p>Por gentileza, verifiquem a possibilidade de aprovação para que possamos seguir com o faturamento (emissão de RL e NFS-e). Caso precisem de algum esclarecimento sobre os valores ou relatórios, estamos à disposição.</p>
                
                <p>Atenciosamente,</p>
                <p><strong>Equipe Financeira</strong><br/>Nacional Hidro</p>
            </div>
        `;

        // Executa o envio pelo limiter
        await limiter.schedule(async () => {
            const transporter = getTransporter();
            await transporter.sendMail({
                from: `"Nacional Hidro" <${process.env.SMTP_USER || 'contato@nacionalhidro.com.br'}>`,
                to: destinatario,
                cc: 'financeiro@nacionalhidro.com.br',
                subject: assunto,
                html: corpoHtml
            });
        });

        // Registra sucesso
        await prisma.cobrancaEmail.create({
            data: {
                medicaoId: medicao.id,
                destinatario,
                assunto,
                corpo: corpoHtml,
                statusEnvio: 'ENVIADO'
            }
        });

        console.log(`[E-mail Enviado] Cobrança da medição ${medicao.codigo} enviada para ${destinatario}`);

    } catch (error: any) {
        console.error(`[E-mail Falhou] Erro ao enviar cobrança da medição ${medicao.codigo}:`, error);

        // Registra falha
        await prisma.cobrancaEmail.create({
            data: {
                medicaoId: medicao.id,
                destinatario: medicao.cliente?.email || 'Desconhecido',
                assunto: `[FALHA] Cobrança Medição ${medicao.codigo}`,
                corpo: 'Erro interno ao disparar e-mail.',
                statusEnvio: 'FALHA',
                erro: error.message
            }
        });
    }
};
