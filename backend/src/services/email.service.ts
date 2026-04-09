import nodemailer from 'nodemailer';
import Bottleneck from 'bottleneck';
import prisma from '../lib/prisma';

// ═══════════════════════════════════════════════════════════════
// Rate Limiter & Transporter
// ═══════════════════════════════════════════════════════════════

const limiter = new Bottleneck({ minTime: 500, maxConcurrent: 1 });

const getTransporter = () => {
    const port = Number(process.env.SMTP_PORT) || 587;
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port,
        secure,
        auth: {
            user: process.env.SMTP_USER || 'contato@nacionalhidro.com.br',
            pass: process.env.SMTP_PASS || ''
        }
    });
};

// ═══════════════════════════════════════════════════════════════
// Core sendEmail (com suporte a CC/BCC)
// ═══════════════════════════════════════════════════════════════

interface EmailOptions {
    to: string | string[];
    subject: string;
    html: string;
    from?: string;
    fromName?: string;
    cc?: string | string[];
    bcc?: string | string[];
    replyTo?: string;
    attachments?: Array<{ filename: string; content: Buffer | string; contentType?: string }>;
}

export const sendEmail = async (options: EmailOptions) => {
    const { to, subject, html, from, fromName, cc, bcc, replyTo } = options;
    const senderEmail = from || process.env.SMTP_USER || 'contato@nacionalhidro.com.br';
    const senderName = fromName || 'RH Nacional Hidro';

    try {
        await limiter.schedule(async () => {
            const transporter = getTransporter();
            await transporter.sendMail({
                from: `"${senderName}" <${senderEmail}>`,
                to: Array.isArray(to) ? to.join(', ') : to,
                cc: cc ? (Array.isArray(cc) ? cc.join(', ') : cc) : undefined,
                bcc: bcc ? (Array.isArray(bcc) ? bcc.join(', ') : bcc) : undefined,
                replyTo: replyTo || undefined,
                subject,
                html,
                attachments: options.attachments
            });
        });
        console.log(`[Email] ✅ Sent to ${to}: ${subject}`);
        return { success: true };
    } catch (error) {
        console.error(`[Email] ❌ Failed to ${to}:`, error);
        return { success: false, error };
    }
};

// ═══════════════════════════════════════════════════════════════
// Helper: Registrar log de notificação
// ═══════════════════════════════════════════════════════════════

const logNotification = async (
    destinatario: string, assunto: string, conteudo: string,
    success: boolean, referencia: string
) => {
    try {
        await (prisma as any).notificacaoLog.create({
            data: {
                canal: 'EMAIL',
                destinatario,
                mensagem: `${assunto}: ${conteudo}`.substring(0, 500),
                status: success ? 'ENVIADO' : 'FALHA',
            }
        });
    } catch (e) {
        console.error('[Email Log] Failed to create log:', e);
    }
};

// ═══════════════════════════════════════════════════════════════
// Helper: formatDate
// ═══════════════════════════════════════════════════════════════

const formatDate = (d: Date | string | null | undefined): string => {
    if (!d) return 'N/A';
    const date = new Date(d);
    return date.toLocaleDateString('pt-BR');
};

// ═══════════════════════════════════════════════════════════════
// HTML Wrapper
// ═══════════════════════════════════════════════════════════════

const wrapHtml = (body: string): string => `
<div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; color: #333; line-height: 1.6;">
    ${body}
</div>`;

// ═══════════════════════════════════════════════════════════════
// E-mail addresses (CC fixos da Nacional Hidro)
// ═══════════════════════════════════════════════════════════════

const EMAILS = {
    RH_ADM: 'rh.adm@nacionalhidro.com.br',
    RH: 'rh@nacionalhidro.com.br',
    GESTAO: 'gestao@nacionalhidro.com.br',
    DP: 'dp@nacionalhidro.com.br',
    CONTATO: 'contato@nacionalhidro.com.br',
    SEGTRABALHO: 'segtrabalho@nacionalhidro.com.br',
    TST1: 'tst1@nacionalhidro.com.br',
    TST2: 'tst2@nacionalhidro.com.br',
    DOC: 'doc@nacionalhidro.com.br',
    LOGISTICA: 'logistica@nacionalhidro.com.br',
    FERNANDA: 'fernanda@nacionalhidro.com.br',
    BRUNO: 'bruno@nacionalhidro.com.br',
    MEIRE: 'meire@nacionalhidro.com.br',
    OPERACIONAL: 'operacional@nacionalhidro.com.br',
    SUPERVISAO1: 'supervisao1@nacionalhidro.com.br',
    SUPERVISAO2: 'supervisao2@nacionalhidro.com.br',
    PATIO: 'patio@nacionalhidro.com.br',
    CONTASAPAGAR: 'contasapagar@nacionalhidro.com.br',
    COMPRAS: 'compras@nacionalhidro.com.br',
    CONTROLE_ADM: 'controle.adm@nacionalhidro.com.br',
    FROTA: 'frota@nacionalhidro.com.br',
    // Externos
    SEGURADORA_1: 'paulo.costa@agifseguros.com.br',
    SEGURADORA_2: 'agif@agifseguros.com.br',
    CONTABILIDADE_1: 'renata@uniconconsultoria.com.br',
    CONTABILIDADE_2: 'elaine@uniconconsultoria.com.br',
    JURIDICO_1: 'julia@torresbandeira.com.br',
    JURIDICO_2: 'william@torresbandeira.com.br',
    JURIDICO_3: 'fabio@torresbandeira.com.br',
};


// ═══════════════════════════════════════════════════════════════
//  1. ADMISSÃO — 7 automações
// ═══════════════════════════════════════════════════════════════

/** ADM-01: Email de Boas-vindas ao Colaborador */
export const sendADM01_BoasVindas = async (data: any) => {
    const html = wrapHtml(`
        <h2 style="color: #2563eb;">Seja bem-vindo(a) à Nacional Hidro!</h2>
        <p>Olá, <strong>${data.nome}</strong>,</p>
        <p>Bem-vindo a <strong>Nacional Hidro</strong>. Estamos muito feliz em ter você se juntando ao nosso time.</p>
        <p>Meu nome é <strong>Equipe de RH</strong>, e sou responsável pelo seu onboarding.</p>
        ${data.linkPastaColaborador ? `<p>Segue o seu cronograma de onboarding: <a href="${data.linkPastaColaborador}">Clique aqui</a></p>` : ''}
        <br/>
        <p>Atenciosamente,</p>
        <p><strong>Equipe de RH</strong><br/>Nacional Hidro</p>
    `);

    const res = await sendEmail({
        to: data.email,
        subject: `Seja bem-vindo(a) a Nacional Hidro`,
        html,
        fromName: 'Equipe de RH | Nacional Hidro',
        from: EMAILS.RH_ADM,
        bcc: [EMAILS.RH_ADM],
    });
    await logNotification(data.email, 'ADM-01 Boas-vindas', data.nome, res.success, `admissao:${data.id}`);
    return res;
};

/** ADM-02: Inclusão no SEGURO DE VIDA */
export const sendADM02_SeguroVida = async (data: any) => {
    const html = wrapHtml(`
        <p>Prezados,</p>
        <p>Informo que o(a) colaborador(a) abaixo foi admitido(a), gentileza seguir com a <strong>inclusão</strong> na relação de ativos do <strong>Seguro de Vida</strong>.</p>
        <table style="border-collapse: collapse; width: 100%; margin: 15px 0;">
            <tr style="background: #2563eb; color: white;">
                <th style="padding: 8px; border: 1px solid #ddd;">Nome completo</th>
                <th style="padding: 8px; border: 1px solid #ddd;">CPF</th>
                <th style="padding: 8px; border: 1px solid #ddd;">Data de Admissão</th>
                <th style="padding: 8px; border: 1px solid #ddd;">Data de Nascimento</th>
            </tr>
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">${data.nome}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${data.cpf || 'N/A'}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${formatDate(data.dataAdmissaoRegistrada || data.dataAdmissaoPrevista)}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${formatDate(data.dataNascimento)}</td>
            </tr>
        </table>
        <p><strong>Empresa contratante:</strong> ${data.razaoSocial || 'Nacional Hidro'}</p>
        <p><strong>Nome do Colaborador:</strong> ${data.nome}</p>
        <p><strong>CPF:</strong> ${data.cpf || 'N/A'}</p>
        <p><strong>Cidade:</strong> ${data.cidadeMoradia || 'N/A'}</p>
    `);

    const res = await sendEmail({
        to: [EMAILS.SEGURADORA_1, EMAILS.SEGURADORA_2],
        subject: `Inclusão no SEGURO DE VIDA - Novo colaborador ${data.nome}`,
        html,
        fromName: 'Luanna Cunha',
        from: EMAILS.RH_ADM,
        cc: [EMAILS.GESTAO, EMAILS.RH_ADM, EMAILS.RH],
    });
    await logNotification(EMAILS.SEGURADORA_1, 'ADM-02 Seguro Vida', data.nome, res.success, `admissao:${data.id}`);
    return res;
};

/** ADM-03: Envio para Contabilidade */
export const sendADM03_Contabilidade = async (data: any) => {
    const html = wrapHtml(`
        <p>Prezada,</p>
        <p>Encaminho abaixo o link da pasta com os documentos para <strong>admissão</strong> do colaborador:</p>
        ${data.linkPastaColaborador ? `<p><a href="${data.linkPastaColaborador}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">📁 Link da pasta do colaborador</a></p>` : '<p><em>(Link da pasta não disponível)</em></p>'}
        <br/>
        <p><strong>Empresa:</strong> ${data.razaoSocial || 'Nacional Hidro'}</p>
        <p><strong>Nome do colaborador:</strong> ${data.nome}</p>
        <p><strong>Cargo:</strong> ${data.cargo || 'N/A'}</p>
        <p><strong>Data de admissão e envio da documentação:</strong> ${formatDate(data.dataAdmissaoRegistrada || data.dataAdmissaoPrevista)}</p>
        <br/>
        <p>Fique à vontade para entrar em contato caso necessite de informações adicionais.</p>
        <p>Atenciosamente,</p>
        <p><strong>Recursos Humanos</strong></p>
    `);

    const res = await sendEmail({
        to: [EMAILS.CONTABILIDADE_1, EMAILS.CONTABILIDADE_2],
        subject: `Documentos de Nova Admissão - Nacional Hidro`,
        html,
        fromName: 'Luanna Cunha',
        from: EMAILS.RH_ADM,
        cc: [EMAILS.GESTAO, EMAILS.RH_ADM],
    });
    await logNotification(EMAILS.CONTABILIDADE_1, 'ADM-03 Contabilidade', data.nome, res.success, `admissao:${data.id}`);
    return res;
};

/** ADM-04: Envio para DP, Integração Andréa e Logística */
export const sendADM04_DPIntegracao = async (data: any) => {
    const html = wrapHtml(`
        <p>Prezados Elton e Andréa,</p>
        <p>Informo que está agendado para <strong>${formatDate(data.dataAssinatura || data.dataAdmissaoPrevista)}</strong> a <strong>integração RH</strong> do novo colaborador abaixo:</p>
        <div style="background: #f8fafc; padding: 15px; border-left: 4px solid #2563eb; margin: 15px 0;">
            <p><strong>Empresa contratante:</strong> ${data.razaoSocial || 'Nacional Hidro'}</p>
            <p><strong>Nome do colaborador:</strong> ${data.nome}</p>
            <p><strong>CPF:</strong> ${data.cpf || 'N/A'}</p>
            <p><strong>Celular:</strong> ${data.telefone || 'N/A'}</p>
            <p><strong>E-mail:</strong> ${data.email || 'N/A'}</p>
            <p><strong>Data de Admissão:</strong> ${formatDate(data.dataAdmissaoRegistrada || data.dataAdmissaoPrevista)}</p>
            <p><strong>Cargo:</strong> ${data.cargo || 'N/A'}</p>
            <p><strong>Jornada de Trabalho:</strong> ${data.jornadaTrabalho || 'N/A'}</p>
        </div>
        <p><strong>Tainara,</strong></p>
        <p>A partir desta data, incluir o colaborador na escala (treinamento) e grupos de comunicação (whatsapp).</p>
    `);

    const res = await sendEmail({
        to: [EMAILS.DP, EMAILS.CONTATO],
        subject: `Integração de Novo Colaborador - Nacional Hidro`,
        html,
        fromName: 'Edilamar Oliveira',
        from: EMAILS.RH_ADM,
        cc: [EMAILS.GESTAO, EMAILS.RH_ADM],
    });
    await logNotification(EMAILS.DP, 'ADM-04 DP/Integração', data.nome, res.success, `admissao:${data.id}`);
    return res;
};

/** ADM-05: Liberação para Treinamentos ST */
export const sendADM05_LiberacaoTreinamento = async (data: any) => {
    const html = wrapHtml(`
        <p>Prezada Laís,</p>
        <p>Informo que o novo colaborador abaixo já passou pela integração RH e está liberado para treinamento a partir de <strong>amanhã</strong>.</p>
        <div style="background: #f8fafc; padding: 15px; border-left: 4px solid #2563eb; margin: 15px 0;">
            <p><strong>Nome completo:</strong> ${data.nome}</p>
            <p><strong>Cargo:</strong> ${data.cargo || 'N/A'}</p>
            <p><strong>Celular:</strong> ${data.telefone || 'N/A'}</p>
            <p><strong>E-mail:</strong> ${data.email || 'N/A'}</p>
        </div>
        <p>Atenciosamente,</p>
        <p><strong>Recursos Humanos</strong></p>
    `);

    const res = await sendEmail({
        to: [EMAILS.SEGTRABALHO, EMAILS.TST1, EMAILS.TST2],
        subject: `Liberação de Novo Colaborador para Treinamento - Nacional Hidro`,
        html,
        fromName: 'Luanna Cunha',
        from: EMAILS.RH_ADM,
        cc: [EMAILS.GESTAO, EMAILS.RH_ADM],
    });
    await logNotification(EMAILS.SEGTRABALHO, 'ADM-05 Liberação ST', data.nome, res.success, `admissao:${data.id}`);
    return res;
};

/** ADM-06: Aviso nova admissão para ST e Integração Doc */
export const sendADM06_AvisoSTDoc = async (data: any) => {
    const html = wrapHtml(`
        <p>Prezados Viviani e Laís,</p>
        <p>Para fins de alinhamento e planejamento em seus respectivos setores, comunicamos o <strong>início do processo de contratação</strong> do novo colaborador:</p>
        <div style="background: #f8fafc; padding: 15px; border-left: 4px solid #2563eb; margin: 15px 0;">
            <p><strong>Nome do colaborador:</strong> ${data.nome}</p>
            <p><strong>CPF:</strong> ${data.cpf || 'N/A'}</p>
            <p><strong>Cargo:</strong> ${data.cargo || 'N/A'}</p>
            <p><strong>Celular:</strong> ${data.telefone || 'N/A'}</p>
            <p><strong>Tamanho da Camiseta:</strong> ${data.tamanhoCamiseta || 'N/A'}</p>
            <p><strong>Tamanho da Calça:</strong> ${data.tamanhoCalca || 'N/A'}</p>
            <p><strong>Tamanho do Calçado:</strong> ${data.tamanhoCalcado || 'N/A'}</p>
            <p><strong>Data de Admissão:</strong> ${formatDate(data.dataAdmissaoRegistrada || data.dataAdmissaoPrevista)}</p>
        </div>
        <p><strong>Laís,</strong></p>
        <p>Informar a data de início dos treinamentos para alinhamento com o colaborador.</p>
        <br/>
        <p>Fiquem à vontade para entrar em contato caso necessitem de informações adicionais.</p>
        <p>Atenciosamente,</p>
        <p><strong>Recursos Humanos</strong></p>
    `);

    const res = await sendEmail({
        to: [EMAILS.SEGTRABALHO, EMAILS.DOC, EMAILS.TST1, EMAILS.TST2],
        subject: `Aviso Admissão de Novo Colaborador - Nacional Hidro`,
        html,
        fromName: 'Luanna',
        from: EMAILS.RH_ADM,
        cc: [EMAILS.GESTAO, EMAILS.RH_ADM],
    });
    await logNotification(EMAILS.SEGTRABALHO, 'ADM-06 ST+Doc', data.nome, res.success, `admissao:${data.id}`);
    return res;
};

/** ADM-07: Solicitação de Avaliação Psicossocial */
export const sendADM07_Psicossocial = async (data: any) => {
    const html = wrapHtml(`
        <p>Prezada Fernanda,</p>
        <p>Solicito a emissão da <strong>Avaliação Psicossocial</strong> do novo colaborador abaixo:</p>
        <div style="background: #f8fafc; padding: 15px; border-left: 4px solid #2563eb; margin: 15px 0;">
            <p><strong>Empresa contratante:</strong> ${data.razaoSocial || 'Nacional Hidro'}</p>
            <p><strong>Nome completo:</strong> ${data.nome}</p>
            <p><strong>Data de Nascimento:</strong> ${formatDate(data.dataNascimento)}</p>
            <p><strong>Escolaridade:</strong> ${data.grauInstrucao || 'N/A'}</p>
            <p><strong>Cargo:</strong> ${data.cargo || 'N/A'}</p>
            <p><strong>Data do ASO:</strong> ${formatDate(data.dataExameASO)}</p>
        </div>
        <p>Fique à vontade para entrar em contato caso necessite de alguma informação adicional.</p>
        <p>Atenciosamente,</p>
        <p><strong>Recursos Humanos</strong></p>
    `);

    const res = await sendEmail({
        to: EMAILS.FERNANDA,
        subject: `Solicitação de Avaliação Psicossocial - Novo Colaborador`,
        html,
        fromName: 'Luanna',
        from: EMAILS.RH_ADM,
        cc: [EMAILS.GESTAO, EMAILS.RH_ADM],
    });
    await logNotification(EMAILS.FERNANDA, 'ADM-07 Psicossocial', data.nome, res.success, `admissao:${data.id}`);
    return res;
};


// ═══════════════════════════════════════════════════════════════
//  2. DESLIGAMENTO — 3 automações
// ═══════════════════════════════════════════════════════════════

/** DESL-01: Envio notificação ao setor jurídico */
export const sendDESL01_Juridico = async (data: any) => {
    const html = wrapHtml(`
        <p>Prezada Dra Júlia,</p>
        <p>Segue link da pasta com a <strong>notificação recebida</strong> na data <strong>${formatDate(data.dataRecebimentoNotificacao || data.dataDesligamento)}</strong> do colaborador: <strong>${data.nome}</strong> - CPF <strong>${data.cpf || 'N/A'}</strong>.</p>
        ${data.linkPastaDocumentos ? `<p><strong>Link:</strong> <a href="${data.linkPastaDocumentos}" style="background: #2563eb; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px;">📁 Pasta do processo</a></p>` : ''}
        <p>Atenciosamente,</p>
        <p><strong>Recursos Humanos</strong></p>
    `);

    const res = await sendEmail({
        to: [EMAILS.JURIDICO_1, EMAILS.JURIDICO_2, EMAILS.JURIDICO_3],
        subject: `Recebimento Notificação Trabalhista - ${data.nome}`,
        html,
        fromName: 'Juliana Guilardi',
        from: EMAILS.RH,
        cc: [EMAILS.GESTAO, EMAILS.FERNANDA, EMAILS.MEIRE, EMAILS.RH],
    });
    await logNotification(EMAILS.JURIDICO_1, 'DESL-01 Jurídico', data.nome, res.success, `desligamento:${data.id}`);
    return res;
};

/** DESL-02: Envio para Contabilidade (Rescisão) */
export const sendDESL02_Contabilidade = async (data: any) => {
    const html = wrapHtml(`
        <p>Encaminho abaixo o link da pasta com os documentos para <strong>desligamento</strong> do(a) colaborador(a):</p>
        ${data.linkPastaDocumentos ? `<p><a href="${data.linkPastaDocumentos}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">📁 Pasta de RESCISÃO</a></p>` : ''}
        <div style="background: #f8fafc; padding: 15px; border-left: 4px solid #dc2626; margin: 15px 0;">
            <p><strong>Nome do colaborador:</strong> ${data.nome}</p>
            <p><strong>CPF:</strong> ${data.cpf || 'N/A'}</p>
            <p><strong>Data de desligamento:</strong> ${formatDate(data.dataDesligamento)}</p>
            <p><strong>Há algum desconto a ser realizado na rescisão?</strong> ${data.descontosRescisao ? 'Sim' : 'Não'}</p>
            ${data.descontosRescisao ? `<p><strong>Descrição dos Descontos:</strong> ${data.descontosRescisao}</p>` : ''}
        </div>
        <p>Fique à vontade para entrar em contato caso necessite de informações adicionais.</p>
        <p>Atenciosamente,</p>
        <p><strong>Recursos Humanos</strong></p>
    `);

    const res = await sendEmail({
        to: EMAILS.CONTABILIDADE_2,
        subject: `RESCISÃO - ${data.tipoDesligamento || 'Desligamento'} - ${data.nome}`,
        html,
        fromName: 'Juliana Guilardi',
        from: EMAILS.RH,
        cc: [EMAILS.GESTAO, EMAILS.RH],
    });
    await logNotification(EMAILS.CONTABILIDADE_2, 'DESL-02 Contabilidade', data.nome, res.success, `desligamento:${data.id}`);
    return res;
};

/** DESL-03: Rescisão para pagamento */
export const sendDESL03_RescisaoPagamento = async (data: any) => {
    const html = wrapHtml(`
        <p>Prezada Meire,</p>
        <p>Segue link da pasta com os documentos do(a) colaborador(a) abaixo para <strong>pagamento da rescisão</strong> com vencimento <strong>${formatDate(data.dataVencimentoRescisao || data.dataLimitePagamento)}</strong>.</p>
        ${data.linkPastaDocumentos ? `<p><a href="${data.linkPastaDocumentos}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">📁 Pasta de RESCISÃO</a></p>` : ''}
        <ul>
            <li><strong>Nome do Colaborador:</strong> ${data.nome}</li>
            <li><strong>CPF:</strong> ${data.cpf || 'N/A'}</li>
            <li><strong>Data do Desligamento:</strong> ${formatDate(data.dataDesligamento)}</li>
        </ul>
        <p>Me coloco à disposição para qualquer esclarecimento adicional.</p>
        <p>Atenciosamente,</p>
        <p><strong>Recursos Humanos</strong></p>
    `);

    const res = await sendEmail({
        to: EMAILS.MEIRE,
        subject: `Rescisão para Pagamento - ${data.nome}`,
        html,
        fromName: 'Juliana Guilardi',
        from: EMAILS.RH,
        cc: [EMAILS.CONTASAPAGAR, EMAILS.FERNANDA, EMAILS.GESTAO, EMAILS.RH],
    });
    await logNotification(EMAILS.MEIRE, 'DESL-03 Rescisão Pagamento', data.nome, res.success, `desligamento:${data.id}`);
    return res;
};


// ═══════════════════════════════════════════════════════════════
//  3. GESTÃO DE COLABORADORES — 8 automações
// ═══════════════════════════════════════════════════════════════

/** GEST-01: ASO demissional e PPP */
export const sendGEST01_ASODemissional = async (data: any) => {
    const html = wrapHtml(`
        <p>Prezada Edilamar,</p>
        <p>Informo que o(a) colaborador(a) abaixo foi desligado(a) e solicito, por gentileza, confirmar se será necessária a realização do <strong>exame demissional</strong> e emissão do <strong>PPP</strong> (Perfil Profissiográfico Previdenciário) no prazo de até 10 dias, conforme exigido pela legislação vigente.</p>
        <div style="background: #f8fafc; padding: 15px; border-left: 4px solid #f59e0b; margin: 15px 0;">
            <p><strong>Empresa:</strong> ${data.razaoSocial || 'Nacional Hidro'}</p>
            <p><strong>Nome do Colaborador:</strong> ${data.nome}</p>
            <p><strong>Data de Desligamento:</strong> ${formatDate(data.dataDesligamento)}</p>
        </div>
        <p>Atenciosamente,</p>
        <p><strong>Recursos Humanos</strong></p>
    `);

    const res = await sendEmail({
        to: EMAILS.RH_ADM,
        subject: `Agendamento de ASO Demissional e/ou PPP - ${data.nome}`,
        html,
        fromName: 'Juliana Guilardi',
        from: EMAILS.RH,
        cc: [EMAILS.GESTAO, EMAILS.RH],
    });
    await logNotification(EMAILS.RH_ADM, 'GEST-01 ASO/PPP', data.nome, res.success, `desligamento:${data.id}`);
    return res;
};

/** GEST-02: Aviso atualização de ASO */
export const sendGEST02_AtualizacaoASO = async (data: { nomeColaborador: string; empresaContratante?: string; dataVencimentoASO: Date | string }) => {
    const html = wrapHtml(`
        <p>Prezada Viviani,</p>
        <p>Informo a <strong>atualização do vencimento do ASO</strong> do(a) colaborador(a) abaixo:</p>
        <div style="background: #f8fafc; padding: 15px; border-left: 4px solid #2563eb; margin: 15px 0;">
            <p><strong>Empresa contratante:</strong> ${data.empresaContratante || 'Nacional Hidro'}</p>
            <p><strong>Nome do colaborador:</strong> ${data.nomeColaborador}</p>
            <p><strong>Data de vencimento ASO:</strong> ${formatDate(data.dataVencimentoASO)}</p>
        </div>
        <p>Atenciosamente,</p>
        <p><strong>Recursos Humanos</strong></p>
    `);

    const res = await sendEmail({
        to: EMAILS.DOC,
        subject: `Atualização de Vencimento ASO - ${data.nomeColaborador}`,
        html,
        fromName: 'Edilamar Oliveira',
        from: EMAILS.RH_ADM,
        cc: [EMAILS.GESTAO, EMAILS.RH_ADM],
    });
    await logNotification(EMAILS.DOC, 'GEST-02 Atualização ASO', data.nomeColaborador, res.success, `aso`);
    return res;
};

/** GEST-03: Aviso desligamento Logística e Integração */
export const sendGEST03_DesligamentoLogistica = async (data: any) => {
    const html = wrapHtml(`
        <p>Prezadas,</p>
        <p>Informo que o(a) colaborador(a) abaixo foi <strong>desligado(a)</strong> dia <strong>${formatDate(data.dataDesligamento)}</strong>.</p>
        <br/>
        <p><strong>Tainara,</strong></p>
        <p>Retirar o colaborador da escala, por gentileza.</p>
        <br/>
        <p><strong>Viviani,</strong></p>
        <p>Retirar o colaborador na relação de integração.</p>
        <br/>
        <p>Atenciosamente,</p>
        <p><strong>Recursos Humanos</strong></p>
    `);

    const res = await sendEmail({
        to: [EMAILS.LOGISTICA, EMAILS.DOC],
        subject: `Colaborador desligado - ${data.nome}`,
        html,
        fromName: 'Juliana Guilardi',
        from: EMAILS.RH,
        cc: [EMAILS.GESTAO, EMAILS.RH],
    });
    await logNotification(EMAILS.LOGISTICA, 'GEST-03 Deslig. Logística', data.nome, res.success, `desligamento:${data.id}`);
    return res;
};

/** GEST-04: Espelho de ponto para rescisão */
export const sendGEST04_EspelhoPonto = async (data: any) => {
    const html = wrapHtml(`
        <p>Prezado Elton,</p>
        <p>Informo que o(a) colaborador(a) abaixo foi <strong>desligado(a)</strong>, gentileza providenciar o envio do espelho de ponto para fins de cálculo rescisório.</p>
        <div style="background: #f8fafc; padding: 15px; border-left: 4px solid #dc2626; margin: 15px 0;">
            <p><strong>Nome do Colaborador:</strong> ${data.nome}</p>
            <p><strong>Cargo:</strong> ${data.cargo || 'N/A'}</p>
            <p><strong>Data do Desligamento:</strong> ${formatDate(data.dataDesligamento)}</p>
            <p><strong>Comunicado:</strong> ${data.comunicadoOficial || 'N/A'}</p>
            <p><strong>Tipo de Desligamento:</strong> ${data.tipoDesligamento || 'N/A'}</p>
            <p><strong>Tipo de Aviso:</strong> ${data.tipoAviso || 'N/A'}</p>
        </div>
        <p>Atenciosamente,</p>
        <p><strong>Recursos Humanos</strong></p>
    `);

    const res = await sendEmail({
        to: EMAILS.DP,
        subject: `Fechamento do ponto - Colaborador desligado ${data.nome}`,
        html,
        fromName: 'Juliana Guilardi',
        from: EMAILS.RH,
        cc: [EMAILS.GESTAO, EMAILS.RH],
    });
    await logNotification(EMAILS.DP, 'GEST-04 Espelho Ponto', data.nome, res.success, `desligamento:${data.id}`);
    return res;
};

/** GEST-05: Exclusão do SEGURO DE VIDA */
export const sendGEST05_ExclusaoSeguro = async (data: any) => {
    const html = wrapHtml(`
        <p>Prezados,</p>
        <p>Informo que o(a) colaborador(a) abaixo foi desligado(a), gentileza seguir com a <strong>exclusão</strong> na relação de ativos do <strong>Seguro de Vida</strong>.</p>
        <div style="background: #f8fafc; padding: 15px; border-left: 4px solid #dc2626; margin: 15px 0;">
            <p><strong>Empresa contratante:</strong> ${data.razaoSocial || 'Nacional Hidro'}</p>
            <p><strong>Nome do Colaborador:</strong> ${data.nome}</p>
            <p><strong>CPF:</strong> ${data.cpf || 'N/A'}</p>
            <p><strong>Data de Desligamento:</strong> ${formatDate(data.dataDesligamento)}</p>
        </div>
        <p>Atenciosamente,</p>
        <p><strong>Recursos Humanos</strong></p>
    `);

    const res = await sendEmail({
        to: [EMAILS.SEGURADORA_2, EMAILS.SEGURADORA_1],
        subject: `Exclusão do Seguro de Vida - Colaborador desligado ${data.nome}`,
        html,
        fromName: 'Edilamar Oliveira',
        from: EMAILS.RH_ADM,
        cc: [EMAILS.GESTAO, EMAILS.RH, EMAILS.RH_ADM],
    });
    await logNotification(EMAILS.SEGURADORA_1, 'GEST-05 Exclusão Seguro', data.nome, res.success, `desligamento:${data.id}`);
    return res;
};

/** GEST-06: Avaliação de Desempenho — 1º Período (45 dias) */
export const sendGEST06_Avaliacao1Periodo = async (data: { nome: string; cargo: string; dataFinalizacao: string }) => {
    const html = wrapHtml(`
        <p>Prezados,</p>
        <p>Conforme registro em nosso sistema, o <strong>primeiro período</strong> do contrato de experiência do(a) colaborador(a) <strong>${data.nome}</strong> - <strong>${data.cargo}</strong> está previsto para vencer no dia <strong>${data.dataFinalizacao}</strong>.</p>
        <p>Nesse sentido, solicitamos:</p>
        <ol>
            <li><strong>Feedback</strong> sobre o desempenho do(a) colaborador(a) no período;</li>
            <li><strong>Posicionamento</strong> quanto à prorrogação para o segundo período de experiência.</li>
        </ol>
        <p><strong>Prazo para resposta: 24 horas</strong></p>
        <p><strong>Instruções:</strong></p>
        <ul>
            <li><strong>Caso aprovado:</strong> Confirmar a prorrogação por meio deste e-mail;</li>
            <li><strong>Caso não aprovado:</strong> Informar os motivos da não renovação.</li>
        </ul>
        <p>Agradecemos pela atenção e ficamos à disposição para quaisquer esclarecimentos adicionais.</p>
        <p>Atenciosamente,</p>
        <p><strong>Recursos Humanos</strong></p>
    `);

    const res = await sendEmail({
        to: [EMAILS.OPERACIONAL, EMAILS.SUPERVISAO1, EMAILS.SUPERVISAO2, EMAILS.SEGTRABALHO, EMAILS.PATIO, EMAILS.LOGISTICA],
        subject: `Avaliação de Desempenho - 1º Período de Experiência`,
        html,
        fromName: 'Juliana Guilardi',
        from: EMAILS.RH,
        cc: [EMAILS.FERNANDA, EMAILS.BRUNO, EMAILS.MEIRE, EMAILS.GESTAO, EMAILS.RH_ADM, EMAILS.DP, EMAILS.RH],
    });
    await logNotification(EMAILS.OPERACIONAL, 'GEST-06 Avaliação 1º Período', data.nome, res.success, `experiencia`);
    return res;
};

/** GEST-07: Avaliação de Desempenho — 2º Período (90 dias) */
export const sendGEST07_Avaliacao2Periodo = async (data: { nome: string; cargo: string; dataFinalizacao: string }) => {
    const html = wrapHtml(`
        <p>Prezados,</p>
        <p>Conforme registro em nosso sistema, o <strong>segundo período</strong> do contrato de experiência do(a) colaborador(a) <strong>${data.nome}</strong> - <strong>${data.cargo}</strong> está previsto para vencer no dia <strong>${data.dataFinalizacao}</strong>.</p>
        <p>Nesse sentido, solicitamos:</p>
        <ol>
            <li><strong>Feedback</strong> sobre o desempenho do(a) colaborador(a) no período;</li>
            <li><strong>Posicionamento</strong> quanto à <strong>efetivação do contrato</strong>.</li>
        </ol>
        <p><strong>Prazo para resposta: 24 horas</strong></p>
        <p><strong>Instruções:</strong></p>
        <ul>
            <li><strong>Caso aprovado:</strong> Confirmar a efetivação por meio deste e-mail;</li>
            <li><strong>Caso não aprovado:</strong> Informar os motivos da não renovação.</li>
        </ul>
        <p>Agradecemos pela atenção e ficamos à disposição para quaisquer esclarecimentos adicionais.</p>
        <p>Atenciosamente,</p>
        <p><strong>Recursos Humanos</strong></p>
    `);

    const res = await sendEmail({
        to: [EMAILS.OPERACIONAL, EMAILS.SUPERVISAO1, EMAILS.SUPERVISAO2, EMAILS.SEGTRABALHO, EMAILS.PATIO, EMAILS.LOGISTICA],
        subject: `Avaliação de Desempenho - 2º Período de Experiência`,
        html,
        fromName: 'Juliana Guilardi',
        from: EMAILS.RH,
        cc: [EMAILS.FERNANDA, EMAILS.BRUNO, EMAILS.MEIRE, EMAILS.GESTAO, EMAILS.RH_ADM, EMAILS.DP, EMAILS.RH],
    });
    await logNotification(EMAILS.OPERACIONAL, 'GEST-07 Avaliação 2º Período', data.nome, res.success, `experiencia`);
    return res;
};

/** GEST-08: Desconto para Rescisão */
export const sendGEST08_DescontoRescisao = async (data: any) => {
    const html = wrapHtml(`
        <p>Prezados,</p>
        <p>Solicitamos a gentileza de verificar se há <strong>descontos</strong> a serem aplicados no processo rescisório do seguinte colaborador, cujo contrato se encerrou em <strong>${formatDate(data.dataDesligamento)}</strong>:</p>
        <ul>
            <li><strong>Nome completo:</strong> ${data.nome}</li>
            <li><strong>Cargo:</strong> ${data.cargo || 'N/A'}</li>
            <li><strong>Empresa contratante:</strong> ${data.razaoSocial || 'Nacional Hidro'}</li>
        </ul>
        <p><strong>Prazo para retorno: 24 horas</strong></p>
        <p><strong>Ações complementares:</strong></p>
        <ul>
            <li><strong>@Laís:</strong> Recolher os crachás e EPIs (se houver);</li>
        </ul>
        <p>Agradecemos pela atenção e ficamos à disposição para eventuais dúvidas.</p>
        <p>Atenciosamente,</p>
        <p><strong>Recursos Humanos</strong></p>
    `);

    const allDestinatarios = [
        EMAILS.CONTASAPAGAR, EMAILS.OPERACIONAL, EMAILS.GESTAO, EMAILS.COMPRAS,
        EMAILS.PATIO, EMAILS.SUPERVISAO1, EMAILS.SUPERVISAO2, EMAILS.CONTROLE_ADM,
        EMAILS.DP, EMAILS.RH_ADM, EMAILS.SEGTRABALHO, EMAILS.FROTA
    ];

    const res = await sendEmail({
        to: allDestinatarios,
        subject: `Descontos na Rescisão - Colaborador desligado ${data.nome}`,
        html,
        fromName: 'Juliana Guilardi',
        from: EMAILS.RH,
        cc: [EMAILS.FERNANDA, EMAILS.MEIRE, EMAILS.RH],
    });
    await logNotification(EMAILS.CONTASAPAGAR, 'GEST-08 Desconto Rescisão', data.nome, res.success, `desligamento:${data.id}`);
    return res;
};


// ═══════════════════════════════════════════════════════════════
//  4. RECRUTAMENTO E SELEÇÃO — 5 automações
// ═══════════════════════════════════════════════════════════════

/** REC-01: Candidatura Recebida (Triagem) */
export const sendREC01_CandidaturaRecebida = async (data: { nome: string; email: string; cargo: string }) => {
    const html = wrapHtml(`
        <p>Olá, <strong>${data.nome}</strong>. Como vai?</p>
        <p>Muito obrigado por se candidatar à vaga <strong>${data.cargo}</strong>! Você deu o primeiro passo em busca deste novo desafio e nós estamos muito felizes em saber que cada vez mais pessoas querem fazer parte de nossa equipe.</p>
        <p>Recebemos sua inscrição e agora iremos analisar todas as candidaturas recebidas. Se você estiver entre os perfis selecionados, enviaremos novos e-mails ou o contato de uma pessoa do nosso time de seleção com mais detalhes das próximas etapas.</p>
        <p>De qualquer modo, vamos mantê-lo(a) informado sobre o status da sua inscrição.</p>
        <p>Boa sorte!</p>
        <p><strong>Nacional Hidro</strong></p>
    `);

    if (!data.email) return { success: false, error: 'Email não informado' };

    const res = await sendEmail({
        to: data.email,
        subject: `Parabéns! Sua candidatura para a vaga ${data.cargo} foi recebida com sucesso!`,
        html,
        fromName: 'RH - Nacional Hidro',
    });
    await logNotification(data.email, 'REC-01 Candidatura', data.nome, res.success, `candidato`);
    return res;
};

/** REC-02: Feedback Positivo (Triagem → Pré-consulta) */
export const sendREC02_FeedbackPositivo = async (data: { nome: string; email: string; cargo: string }) => {
    const html = wrapHtml(`
        <p>Olá, <strong>${data.nome}</strong>. Tudo bem?</p>
        <p>Sou da área de recrutamento aqui da <strong>Nacional Hidro</strong>.</p>
        <p>Primeiramente, gostaria de agradecer pelo seu interesse em fazer parte do nosso time!</p>
        <p>Recebemos muitas candidaturas e, após analisá-las cuidadosamente, gostamos muito do seu perfil. Assim, quero te parabenizar por ter sido selecionado para a próxima etapa do processo seletivo da vaga <strong>${data.cargo}</strong>!</p>
        <p>Agora, o próximo passo é bater um papo comigo e com o time de RH! Em caso de dúvidas, basta entrar em contato conosco.</p>
        <p>Grande abraço!</p>
        <p><strong>Nacional Hidro</strong></p>
    `);

    if (!data.email) return { success: false, error: 'Email não informado' };

    const res = await sendEmail({
        to: data.email,
        subject: `Nova etapa do processo seletivo - Nacional Hidro`,
        html,
        fromName: 'RH - Nacional Hidro',
    });
    await logNotification(data.email, 'REC-02 Feedback+', data.nome, res.success, `candidato`);
    return res;
};

/** REC-03: Convite para Entrevista RH */
export const sendREC03_ConviteEntrevista = async (data: { nome: string; email: string; cargo: string; dataEntrevista?: string }) => {
    const html = wrapHtml(`
        <p>Olá, <strong>${data.nome}</strong>. Tudo bem?</p>
        <p>Muito obrigado pela dedicação e tempo investidos na sua candidatura para a vaga <strong>${data.cargo}</strong> na <strong>Nacional Hidro</strong>.</p>
        <p>Gostamos muito do seu perfil e gostaríamos de marcar uma entrevista para te conhecer melhor e saber mais sobre a sua trajetória profissional.</p>
        ${data.dataEntrevista ? `<p>Você estaria disponível no dia <strong>${formatDate(data.dataEntrevista)}</strong>?</p>` : '<p>Em breve entraremos em contato para agendar uma data.</p>'}
        <p>Até breve!</p>
        <p><strong>Equipe de RH</strong></p>
    `);

    if (!data.email) return { success: false, error: 'Email não informado' };

    const res = await sendEmail({
        to: data.email,
        subject: `Entrevista com RH - Nacional Hidro`,
        html,
        fromName: 'RH - Nacional Hidro',
    });
    await logNotification(data.email, 'REC-03 Convite', data.nome, res.success, `candidato`);
    return res;
};

/** REC-04: Envio da Proposta (Aprovado) */
export const sendREC04_EnvioProposta = async (data: { nome: string; email: string; cargo: string }) => {
    const html = wrapHtml(`
        <p>Olá, <strong>${data.nome}</strong>!</p>
        <p>Gostaríamos de te parabenizar, você foi <strong>aprovado(a)</strong> para a vaga <strong>${data.cargo}</strong>!</p>
        <p>Sua candidatura se destacou entre os perfis que avaliamos e temos certeza que você tem muito a agregar nos desafios que temos na <strong>Nacional Hidro</strong>.</p>
        <p>Em breve entraremos em contato com os detalhes da proposta.</p>
        <p>Seja bem-vindo(a) a nossa equipe!</p>
        <p>Grande abraço,</p>
        <p><strong>Equipe de RH</strong></p>
    `);

    if (!data.email) return { success: false, error: 'Email não informado' };

    const res = await sendEmail({
        to: data.email,
        subject: `${data.cargo} - Nacional Hidro | Proposta`,
        html,
        fromName: 'RH - Nacional Hidro',
    });
    await logNotification(data.email, 'REC-04 Proposta', data.nome, res.success, `candidato`);
    return res;
};

/** REC-05: Candidato Incompatível */
export const sendREC05_Incompativel = async (data: { nome: string; email: string; cargo: string }) => {
    const html = wrapHtml(`
        <p>Olá, <strong>${data.nome}</strong>! Tudo bem?</p>
        <p>Agradecemos muito pelo seu interesse em fazer parte da equipe da <strong>Nacional Hidro</strong>.</p>
        <p>Infelizmente, após análise dos perfis que recebemos para esta vaga, optamos por não evoluir com sua candidatura. Sabemos que se inscrever para uma vaga requer investimento de tempo e energia, por isso agradecemos por sua dedicação e interesse.</p>
        <p>Mesmo que não seja desta vez que vamos trabalhar juntos, saiba que temos sempre oportunidades abertas na empresa.</p>
        <p>Desejamos sucesso em sua trajetória profissional!</p>
        <p>Um abraço,</p>
        <p><strong>Nacional Hidro</strong></p>
    `);

    if (!data.email) return { success: false, error: 'Email não informado' };

    const res = await sendEmail({
        to: data.email,
        subject: `Processo seletivo - ${data.cargo} - Nacional Hidro`,
        html,
        fromName: 'RH - Nacional Hidro',
    });
    await logNotification(data.email, 'REC-05 Incompatível', data.nome, res.success, `candidato`);
    return res;
};


// ═══════════════════════════════════════════════════════════════
// LEGACY EXPORTS (manter retrocompatibilidade)
// ═══════════════════════════════════════════════════════════════

export const sendBoasVindasEmail = async (nome: string, email: string) => {
    return sendADM01_BoasVindas({ nome, email, id: 'legacy' });
};

export const sendSeguroVidaEmail = async (nome: string, cpf: string, cargo: string) => {
    return sendADM02_SeguroVida({ nome, cpf, cargo, id: 'legacy' });
};

export const sendAlertaTecSeguranca = async (nome: string, cargo: string) => {
    return sendADM06_AvisoSTDoc({ nome, cargo, id: 'legacy' });
};

// ═══════════════════════════════════════════════════════════════
// COMERCIAL E OPERACIONAL
// ═══════════════════════════════════════════════════════════════

export const sendPropostaComercial = async (data: {
    to: string;
    nomeCliente: string;
    codigoProposta: string;
    pdfBuffer: Buffer;
    ccEmails?: string[];
}) => {
    const html = wrapHtml(`
        <h2 style="color: #1a365d;">Proposta Comercial - Nacional Hidro</h2>
        <p>Prezado(a) <strong>${data.nomeCliente}</strong>,</p>
        <p>Agradecemos a excelente oportunidade de apresentar nossa proposta comercial visando atender as necessidades de sua empresa.</p>
        <p>Em anexo, enviamos nossa Proposta <strong>${data.codigoProposta}</strong> detalhada em PDF para sua apreciação.</p>
        <p>Desde já agradecemos sua atenção e nos colocamos à inteira disposição para qualquer esclarecimento que se fizer necessário.</p>
        <br/>
        <p>Conte com nosso apoio!</p>
        <p>Atenciosamente,</p>
        <p><strong>Depto. Comercial</strong><br/>Nacional Hidrosaneamento</p>
    `);

    const ccList = Array.isArray(data.ccEmails) ? [...data.ccEmails] : (data.ccEmails ? [data.ccEmails] : []);
    if (!ccList.includes(EMAILS.BRUNO)) {
        ccList.push(EMAILS.BRUNO);
    }

    const res = await sendEmail({
        to: data.to,
        subject: `Proposta Comercial ${data.codigoProposta} - Nacional Hidro`,
        html,
        fromName: 'Comercial Nacional Hidro',
        from: EMAILS.CONTATO,
        cc: ccList,
        attachments: [
            {
                filename: `Proposta_${data.codigoProposta}.pdf`,
                content: data.pdfBuffer,
                contentType: 'application/pdf',
            }
        ]
    });
    
    await logNotification(data.to, 'Envio Proposta', data.codigoProposta, res.success, `proposta:${data.codigoProposta}`);
    return res;
};
