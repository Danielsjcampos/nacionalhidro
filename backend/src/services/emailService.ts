import nodemailer from 'nodemailer';

const logger = console;

// ──────────────────────────────────────────────────────────
// SMTP Configuration (falls back to console logging if not configured)
// ──────────────────────────────────────────────────────────

const SMTP_CONFIGURED = !!(process.env.SMTP_HOST && process.env.SMTP_USER);
const smtpPort = parseInt(process.env.SMTP_PORT || '587');

const transporter = SMTP_CONFIGURED
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

const FROM_EMAIL = process.env.SMTP_FROM || 'rh@nacionalhidro.com.br';
const SEGURADORA_EMAIL = process.env.SEGURADORA_EMAIL || '';
const TST_EMAIL = process.env.TST_EMAIL || '';
const DOC_EMAIL = process.env.DOC_EMAIL || '';

// ──────────────────────────────────────────────────────────
// Helper: Send Email (logs to console if SMTP not configured)
// ──────────────────────────────────────────────────────────

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  cc?: string;
}

async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const { to, subject, html, cc } = payload;

  if (!to) {
    console.warn('[EmailService] Destinatário não informado, e-mail ignorado:', subject);
    return false;
  }

  if (!SMTP_CONFIGURED || !transporter) {
    console.log('[EmailService] SMTP não configurado. E-mail logado no console:');
    console.log(`  Para: ${to}`);
    console.log(`  CC: ${cc || '—'}`);
    console.log(`  Assunto: ${subject}`);
    console.log(`  Corpo (HTML): ${html.substring(0, 200)}...`);
    return true; // returns true so the flow continues
  }

  try {
    await transporter.sendMail({
      from: FROM_EMAIL,
      to,
      cc,
      subject,
      html,
    });
    console.log(`[EmailService] E-mail enviado com sucesso para ${to}: ${subject}`);
    return true;
  } catch (error: any) {
    console.error('[EmailService] Erro ao enviar e-mail:', {
      to,
      subject,
      error: error.message,
      stack: error.stack,
    });
    return false;
  }
}

// ──────────────────────────────────────────────────────────
// Templates
// ──────────────────────────────────────────────────────────

const headerHtml = `
  <div style="background: linear-gradient(135deg, #1e40af 0%, #1e3a5f 100%); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
    <h2 style="color: #fff; margin: 0; font-family: 'Segoe UI', sans-serif; font-size: 20px;">Nacional Hidrosaneamento</h2>
    <p style="color: rgba(255,255,255,0.7); margin: 4px 0 0; font-size: 12px;">Sistema de Gestão de RH</p>
  </div>
`;

const footerHtml = `
  <div style="padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
    <p style="margin: 0;">Este é um e-mail automático do sistema Nacional Hidro. Não responda.</p>
  </div>
`;

function wrapTemplate(content: string): string {
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
      ${headerHtml}
      <div style="padding: 24px;">
        ${content}
      </div>
      ${footerHtml}
    </div>
  `;
}

// ──────────────────────────────────────────────────────────
// 1. Inclusão no Seguro de Vida (ao admitir)
// ──────────────────────────────────────────────────────────

interface ColaboradorData {
  nome: string;
  cargo?: string;
  cpf?: string;
  dataAdmissao?: string;
  email?: string;
  departamento?: string;
}

export async function sendInclusaoSeguroVida(colaborador: ColaboradorData): Promise<boolean> {
  if (!SEGURADORA_EMAIL) {
    console.warn('[EmailService] SEGURADORA_EMAIL não configurado. Inclusão de seguro não enviada.');
    return false;
  }

  const html = wrapTemplate(`
    <h3 style="color: #1e293b; margin-top: 0;">📋 Solicitação de Inclusão — Seguro de Vida</h3>
    <p style="color: #475569; font-size: 14px;">Solicitamos a <strong>inclusão</strong> do colaborador abaixo no seguro de vida da empresa:</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px 12px; background: #f1f5f9; font-weight: bold; font-size: 13px; width: 40%;">Nome</td><td style="padding: 8px 12px; font-size: 13px;">${colaborador.nome}</td></tr>
      <tr><td style="padding: 8px 12px; background: #f1f5f9; font-weight: bold; font-size: 13px;">Cargo</td><td style="padding: 8px 12px; font-size: 13px;">${colaborador.cargo || '—'}</td></tr>
      <tr><td style="padding: 8px 12px; background: #f1f5f9; font-weight: bold; font-size: 13px;">CPF</td><td style="padding: 8px 12px; font-size: 13px;">${colaborador.cpf || '—'}</td></tr>
      <tr><td style="padding: 8px 12px; background: #f1f5f9; font-weight: bold; font-size: 13px;">Data de Admissão</td><td style="padding: 8px 12px; font-size: 13px;">${colaborador.dataAdmissao || '—'}</td></tr>
    </table>
    <p style="color: #64748b; font-size: 12px;">Em caso de dúvidas, entre em contato com o setor de RH.</p>
  `);

  return sendEmail({
    to: SEGURADORA_EMAIL,
    subject: `[Nacional Hidro] Inclusão Seguro de Vida — ${colaborador.nome}`,
    html,
  });
}

// ──────────────────────────────────────────────────────────
// 2. Exclusão do Seguro de Vida (ao desligar)
// ──────────────────────────────────────────────────────────

export async function sendExclusaoSeguroVida(colaborador: ColaboradorData): Promise<boolean> {
  if (!SEGURADORA_EMAIL) {
    console.warn('[EmailService] SEGURADORA_EMAIL não configurado. Exclusão de seguro não enviada.');
    return false;
  }

  const html = wrapTemplate(`
    <h3 style="color: #1e293b; margin-top: 0;">🔴 Solicitação de Exclusão — Seguro de Vida</h3>
    <p style="color: #475569; font-size: 14px;">Solicitamos a <strong>exclusão</strong> do colaborador abaixo do seguro de vida:</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px 12px; background: #f1f5f9; font-weight: bold; font-size: 13px; width: 40%;">Nome</td><td style="padding: 8px 12px; font-size: 13px;">${colaborador.nome}</td></tr>
      <tr><td style="padding: 8px 12px; background: #f1f5f9; font-weight: bold; font-size: 13px;">CPF</td><td style="padding: 8px 12px; font-size: 13px;">${colaborador.cpf || '—'}</td></tr>
      <tr><td style="padding: 8px 12px; background: #f1f5f9; font-weight: bold; font-size: 13px;">Cargo</td><td style="padding: 8px 12px; font-size: 13px;">${colaborador.cargo || '—'}</td></tr>
    </table>
    <p style="color: #64748b; font-size: 12px;">Em caso de dúvidas, entre em contato com o setor de RH.</p>
  `);

  return sendEmail({
    to: SEGURADORA_EMAIL,
    subject: `[Nacional Hidro] Exclusão Seguro de Vida — ${colaborador.nome}`,
    html,
  });
}

// ──────────────────────────────────────────────────────────
// 3. Aviso TST + Documentação (ao admitir)
// ──────────────────────────────────────────────────────────

export async function sendAvisoTST(colaborador: ColaboradorData): Promise<boolean> {
  const to = TST_EMAIL || DOC_EMAIL;
  if (!to) {
    console.warn('[EmailService] TST_EMAIL/DOC_EMAIL não configurados. Aviso TST não enviado.');
    return false;
  }

  const html = wrapTemplate(`
    <h3 style="color: #1e293b; margin-top: 0;">🛡️ Novo Colaborador em Processo de Admissão</h3>
    <p style="color: #475569; font-size: 14px;">Informamos que o colaborador abaixo está em processo de admissão. Favor providenciar:</p>
    <ul style="color: #475569; font-size: 14px;">
      <li>Preparação de EPIs</li>
      <li>Agendamento de treinamentos obrigatórios</li>
      <li>Integração de segurança do trabalho</li>
    </ul>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px 12px; background: #f1f5f9; font-weight: bold; font-size: 13px; width: 40%;">Nome</td><td style="padding: 8px 12px; font-size: 13px;">${colaborador.nome}</td></tr>
      <tr><td style="padding: 8px 12px; background: #f1f5f9; font-weight: bold; font-size: 13px;">Cargo</td><td style="padding: 8px 12px; font-size: 13px;">${colaborador.cargo || '—'}</td></tr>
      <tr><td style="padding: 8px 12px; background: #f1f5f9; font-weight: bold; font-size: 13px;">Departamento</td><td style="padding: 8px 12px; font-size: 13px;">${colaborador.departamento || '—'}</td></tr>
      <tr><td style="padding: 8px 12px; background: #f1f5f9; font-weight: bold; font-size: 13px;">Data de Admissão</td><td style="padding: 8px 12px; font-size: 13px;">${colaborador.dataAdmissao || '—'}</td></tr>
    </table>
  `);

  return sendEmail({
    to,
    cc: TST_EMAIL && DOC_EMAIL && TST_EMAIL !== to ? DOC_EMAIL : undefined,
    subject: `[Nacional Hidro] Novo Colaborador — ${colaborador.nome} — Preparar EPIs e Treinamentos`,
    html,
  });
}

// ──────────────────────────────────────────────────────────
// 4. Boas-vindas ao Colaborador
// ──────────────────────────────────────────────────────────

export async function sendBoasVindas(colaborador: ColaboradorData): Promise<boolean> {
  if (!colaborador.email) {
    console.warn('[EmailService] Colaborador sem e-mail. Boas-vindas não enviada:', colaborador.nome);
    return false;
  }

  const html = wrapTemplate(`
    <h3 style="color: #1e293b; margin-top: 0;">🎉 Bem-vindo(a) à Nacional Hidro!</h3>
    <p style="color: #475569; font-size: 14px;">
      Olá <strong>${colaborador.nome}</strong>,
    </p>
    <p style="color: #475569; font-size: 14px;">
      É com grande satisfação que informamos sua contratação na <strong>Nacional Hidrosaneamento</strong>. 
      Estamos muito felizes em tê-lo(a) como parte da nossa equipe!
    </p>
    <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
      <p style="color: #1e40af; font-size: 14px; margin: 0;">
        <strong>Cargo:</strong> ${colaborador.cargo || '—'}<br/>
        <strong>Departamento:</strong> ${colaborador.departamento || '—'}
      </p>
    </div>
    <p style="color: #475569; font-size: 14px;">
      Qualquer dúvida, entre em contato com o setor de RH. Desejamos muito sucesso na sua jornada conosco!
    </p>
    <p style="color: #1e40af; font-weight: bold; font-size: 14px;">— Equipe RH Nacional Hidro</p>
  `);

  return sendEmail({
    to: colaborador.email,
    subject: `Bem-vindo(a) à Nacional Hidro, ${colaborador.nome}! 🎉`,
    html,
  });
}

// ──────────────────────────────────────────────────────────
// 5. Feedback de Experiência 45/90 dias
// ──────────────────────────────────────────────────────────

export async function sendFeedbackExperiencia(
  colaborador: ColaboradorData,
  gestorEmail: string,
  tipo: '45' | '90',
  diasRestantes: number
): Promise<boolean> {
  if (!gestorEmail) {
    console.warn('[EmailService] Gestor sem e-mail. Feedback não enviado:', colaborador.nome);
    return false;
  }

  const html = wrapTemplate(`
    <h3 style="color: #1e293b; margin-top: 0;">⏰ Avaliação de Experiência — ${tipo} dias</h3>
    <p style="color: #475569; font-size: 14px;">
      O colaborador abaixo está com <strong>${diasRestantes} dias restantes</strong> para o término do período de experiência de <strong>${tipo} dias</strong>.
    </p>
    <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
      <p style="color: #92400e; font-size: 14px; margin: 0;">
        <strong>Ação necessária:</strong> Favor avaliar o desempenho do colaborador e registrar o feedback no sistema.
      </p>
    </div>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px 12px; background: #f1f5f9; font-weight: bold; font-size: 13px; width: 40%;">Nome</td><td style="padding: 8px 12px; font-size: 13px;">${colaborador.nome}</td></tr>
      <tr><td style="padding: 8px 12px; background: #f1f5f9; font-weight: bold; font-size: 13px;">Cargo</td><td style="padding: 8px 12px; font-size: 13px;">${colaborador.cargo || '—'}</td></tr>
      <tr><td style="padding: 8px 12px; background: #f1f5f9; font-weight: bold; font-size: 13px;">Dias Restantes</td><td style="padding: 8px 12px; font-size: 13px; font-weight: bold; color: #dc2626;">${diasRestantes} dias</td></tr>
    </table>
    <p style="color: #64748b; font-size: 12px;">Acesse o sistema para registrar a avaliação: Aprovado, Em Observação, ou Reprovado.</p>
  `);

  return sendEmail({
    to: gestorEmail,
    subject: `[Ação Necessária] Avaliação de Experiência ${tipo}d — ${colaborador.nome}`,
    html,
  });
}

// ──────────────────────────────────────────────────────────
// 6. Alerta genérico de vencimentos
// ──────────────────────────────────────────────────────────

interface VencimentoItem {
  nome: string;
  tipo: string; // ASO, CNH, MOPP, TREINAMENTO
  dataVencimento: string;
  diasRestantes: number;
}

export async function sendAlertaVencimentos(
  destinatario: string,
  items: VencimentoItem[]
): Promise<boolean> {
  if (!destinatario || items.length === 0) return false;

  const rows = items.map(item => `
    <tr>
      <td style="padding: 8px 12px; font-size: 13px; border-bottom: 1px solid #e2e8f0;">${item.nome}</td>
      <td style="padding: 8px 12px; font-size: 13px; border-bottom: 1px solid #e2e8f0;">${item.tipo}</td>
      <td style="padding: 8px 12px; font-size: 13px; border-bottom: 1px solid #e2e8f0;">${item.dataVencimento}</td>
      <td style="padding: 8px 12px; font-size: 13px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: ${item.diasRestantes <= 0 ? '#dc2626' : item.diasRestantes <= 7 ? '#f59e0b' : '#3b82f6'};">${item.diasRestantes <= 0 ? 'VENCIDO' : `${item.diasRestantes}d`}</td>
    </tr>
  `).join('');

  const html = wrapTemplate(`
    <h3 style="color: #1e293b; margin-top: 0;">⚠️ Alerta de Vencimentos — ${items.length} itens</h3>
    <p style="color: #475569; font-size: 14px;">Os seguintes itens requerem atenção:</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr style="background: #f1f5f9;">
        <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b;">Colaborador</th>
        <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b;">Tipo</th>
        <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b;">Vencimento</th>
        <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b;">Prazo</th>
      </tr>
      ${rows}
    </table>
    <p style="color: #64748b; font-size: 12px;">Acesse o sistema para tomar as providências necessárias.</p>
  `);

  return sendEmail({
    to: destinatario,
    subject: `[Nacional Hidro] ⚠️ ${items.length} Vencimentos Próximos`,
    html,
  });
}
