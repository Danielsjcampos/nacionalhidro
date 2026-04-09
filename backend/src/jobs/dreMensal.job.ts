import cron from 'node-cron';
import prisma from '../lib/prisma';
import nodemailer from 'nodemailer';

// ─── T15: DRE Mensal por Email ──────────────────────────────────
// Roda no dia 5 de cada mês às 06:00 AM — envia DRE do mês anterior

export const startDREMensalJob = () => {
    console.log('[CRON] Iniciando agendador de DRE Mensal por Email...');

    cron.schedule('0 6 5 * *', async () => {
        console.log('[CRON-DRE] Gerando e enviando DRE mensal...');
        try {
            await gerarEEnviarDRE();
        } catch (error) {
            console.error('[CRON-DRE] Erro ao gerar/enviar DRE:', error);
        }
    }, {
        timezone: "America/Sao_Paulo"
    });
};

export async function gerarEEnviarDRE() {
    const hoje = new Date();
    // Mês anterior
    const mesAnterior = hoje.getMonth() === 0 ? 11 : hoje.getMonth() - 1;
    const anoRef = hoje.getMonth() === 0 ? hoje.getFullYear() - 1 : hoje.getFullYear();

    const inicio = new Date(anoRef, mesAnterior, 1);
    const fim = new Date(anoRef, mesAnterior + 1, 1);

    const toNum = (v: any): number => Number(v) || 0;

    // Buscar dados financeiros
    const contasPagar = await prisma.contaPagar.findMany({
        where: { status: 'PAGO', dataPagamento: { gte: inicio, lt: fim } },
    });

    const contasReceber = await prisma.contaReceber.findMany({
        where: { status: 'RECEBIDO', dataRecebimento: { gte: inicio, lt: fim } },
    });

    const faturamentos = await (prisma as any).faturamento.findMany({
        where: { dataEmissao: { gte: inicio, lt: fim }, status: { not: 'CANCELADA' } },
    });

    // Cálculos
    const totalReceitas = faturamentos.reduce((s: number, f: any) => s + toNum(f.valorBruto), 0);
    const totalDespesas = contasPagar.reduce((s: number, c: any) => s + toNum(c.valorPago || c.valorOriginal), 0);
    const totalRecebido = contasReceber.reduce((s: number, c: any) => s + toNum(c.valorRecebido || c.valorOriginal), 0);
    const resultado = totalRecebido - totalDespesas;

    const mesNome = inicio.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Montar HTML do email
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2 style="color: #1a365d; border-bottom: 2px solid #2b6cb0; padding-bottom: 8px;">
            📊 DRE Mensal — ${mesNome}
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;" cellpadding="8">
            <tr style="background: #ebf8ff;">
                <td><strong>(+) Receita Bruta (Faturamento)</strong></td>
                <td style="text-align: right; color: #2b6cb0;"><strong>${fmt(totalReceitas)}</strong></td>
            </tr>
            <tr>
                <td>(+) Total Recebido</td>
                <td style="text-align: right; color: #38a169;">${fmt(totalRecebido)}</td>
            </tr>
            <tr style="background: #fff5f5;">
                <td>(-) Total Despesas Pagas</td>
                <td style="text-align: right; color: #e53e3e;">${fmt(totalDespesas)}</td>
            </tr>
            <tr style="background: ${resultado >= 0 ? '#f0fff4' : '#fff5f5'}; border-top: 2px solid #333;">
                <td><strong>(=) Resultado Líquido</strong></td>
                <td style="text-align: right; color: ${resultado >= 0 ? '#38a169' : '#e53e3e'};"><strong>${fmt(resultado)}</strong></td>
            </tr>
        </table>
        <p style="font-size: 12px; color: #666; margin-top: 16px;">
            Qtd Faturamentos: ${faturamentos.length} | Qtd Despesas Pagas: ${contasPagar.length} | Qtd Recebimentos: ${contasReceber.length}
        </p>
        <hr style="border: 1px solid #eee; margin: 16px 0;">
        <p style="font-size: 11px; color: #999;">
            Gerado automaticamente pelo sistema Nacional Hidro em ${hoje.toLocaleString('pt-BR')}.<br>
            Para a DRE detalhada, acesse o sistema → Financeiro → DRE.
        </p>
    </div>`;

    // Enviar email
    const config = await (prisma as any).configuracao.findUnique({ where: { id: 'default' } }).catch(() => null);

    const transporter = nodemailer.createTransport({
        host: config?.smtpHost || process.env.SMTP_HOST || 'smtp.ethereal.email',
        port: Number(config?.smtpPort || process.env.SMTP_PORT) || 587,
        auth: {
            user: (config?.smtpUser || process.env.SMTP_USER) as string,
            pass: (config?.smtpPass || process.env.SMTP_PASS) as string,
        }
    });

    const destinatarios = config?.emailDRE || process.env.DRE_EMAIL || 'financeiro@nacionalhidro.com';

    await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Nacional Hidro" <sistema@nacionalhidro.com>',
        to: destinatarios,
        subject: `📊 DRE Mensal — ${mesNome}`,
        html,
    });

    console.log(`[CRON-DRE] ✅ DRE de ${mesNome} enviada para ${destinatarios}`);
    return { mesNome, totalReceitas, totalDespesas, totalRecebido, resultado };
}
