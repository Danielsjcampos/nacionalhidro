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

        // Registra sucesso em CobrancaEmail
        await prisma.cobrancaEmail.create({
            data: {
                medicaoId: medicao.id,
                destinatario,
                assunto,
                corpo: corpoHtml,
                statusEnvio: 'ENVIADO'
            }
        });

        // --- LOG UNIFICADO: Histórico de Cobrança ---
        try {
            const contaReceber = await (prisma as any).contaReceber.findFirst({
                where: { medicaoId: medicao.id }
            });
            
            if (contaReceber) {
                await (prisma as any).historicoCobranca.create({
                    data: {
                        contaReceberId: contaReceber.id,
                        tipo: 'EMAIL',
                        canal: 'EMAIL',
                        mensagem: `Lembrete de aprovação de medição enviado automaticamente (${diasAtraso} dias pendente).`,
                        destinatario,
                        enviadoPor: 'Sistema (Cron)',
                        sucesso: true
                    }
                });
            }
        } catch (logErr) {
            console.error('[Email] Falha ao registrar HistoricoCobranca:', logErr);
        }

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

/**
 * Envia e-mail de lembrete de cobrança para títulos já vencidos (ContaReceber)
 */
export const enviarLembreteVencimentoEmail = async (conta: any, diasAtraso: number) => {
    try {
        const destinatario = conta.cliente?.email;
        if (!destinatario) throw new Error('Cliente sem e-mail registrado');

        const assunto = `Nacional Hidro — Lembrete de Pagamento Pendente (Vencido há ${diasAtraso} dias)`;
        
        const corpoHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #dc2626;">Olá, ${conta.cliente?.nome || 'Cliente'}!</h2>
                <p>Este é um lembrete automático sobre o título <strong>${conta.descricao}</strong> que conta como pendente em nosso sistema.</p>
                
                <div style="background-color: #fef2f2; padding: 15px; border-left: 4px solid #ef4444; margin: 20px 0;">
                    <p style="margin: 0;"><strong>Vencimento Original:</strong> ${conta.dataVencimento ? new Date(conta.dataVencimento).toLocaleDateString('pt-BR') : '—'}</p>
                    <p style="margin: 5px 0 0 0;"><strong>Valor em Aberto:</strong> R$ ${Number(conta.saldoDevedor || conta.valorOriginal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p style="margin: 5px 0 0 0;"><strong>Atraso:</strong> ${diasAtraso} dias</p>
                </div>
                
                <p>Caso o pagamento já tenha sido efetuado ontem ou hoje, por favor desconsidere este aviso. Caso contrário, pedimos a gentileza de regularizar a situação ou entrar em contato para combinarmos o pagamento.</p>
                
                ${conta.linkPagamento ? `
                <p style="text-align: center; margin: 30px 0;">
                    <a href="${conta.linkPagamento}" style="background-color: #2563eb; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Efetuar Pagamento / Ver Boleto</a>
                 </p>` : ''}

                <p>Atenciosamente,</p>
                <p><strong>Departamento de Cobrança</strong><br/>Nacional Hidro</p>
            </div>
        `;

        await limiter.schedule(async () => {
            const transporter = getTransporter();
            await transporter.sendMail({
                from: `"Cobrança Nacional Hidro" <${process.env.SMTP_USER || 'contato@nacionalhidro.com.br'}>`,
                to: destinatario,
                cc: 'financeiro@nacionalhidro.com.br',
                subject: assunto,
                html: corpoHtml
            });
        });

        // Log no Histórico de Cobrança
        await (prisma as any).historicoCobranca.create({
            data: {
                contaReceberId: conta.id,
                tipo: 'EMAIL',
                canal: 'EMAIL',
                mensagem: `Lembrete de vencimento enviado automaticamente (${diasAtraso} dias de atraso).`,
                destinatario,
                enviadoPor: 'Sistema (Cron Vencidos)',
                sucesso: true
            }
        });

        // Atualizar contadores na conta
        await (prisma as any).contaReceber.update({
            where: { id: conta.id },
            data: {
                ultimaCobranca: new Date(),
                totalCobrancas: { increment: 1 },
            }
        });

        console.log(`[E-mail Cobrança] Lembrete de vencimento enviado para ${destinatario} (Conta: ${conta.id})`);

    } catch (error: any) {
        console.error(`[E-mail Cobrança Falhou] Erro ao enviar lembrete de vencimento (Conta: ${conta.id}):`, error);
        
        try {
            await (prisma as any).historicoCobranca.create({
                data: {
                    contaReceberId: conta.id,
                    tipo: 'EMAIL',
                    canal: 'EMAIL',
                    mensagem: `FALHA ao enviar lembrete automático: ${error.message}`,
                    enviadoPor: 'Sistema (Cron Vencidos)',
                    sucesso: false,
                    erro: error.message
                }
            });
        } catch (_) {}
    }
};
