import { Request, Response } from 'express';
import { LeadProcessorService } from '../services/lead-processor.service';
import prisma from '../lib/prisma';

export class WebhookController {

    /**
     * Universal lead webhook handler.
     * Supports: Google Ads Lead Forms, Fluent Forms (WordPress), TwoTime Chat.
     *
     * Google Ads requires a fast 200 response, so we:
     *   - Return 200 immediately for test payloads (is_test: true)
     *   - Process real leads and respond synchronously but with robust error handling
     */
    async handleLeadWebhook(req: Request, res: Response) {
        const startTime = Date.now();
        let logId: string | undefined;

        try {
            const body = req.body;

            // ── 0. Detect Google Ads test payload and short-circuit ──
            if (body.is_test === true || body.is_test === 'true') {
                console.log('[WebhookController] Google Ads TEST payload received — responding 200 immediately.');
                // Log it but mark as TEST
                try {
                    await (prisma as any).webhookLog.create({
                        data: {
                            provider: 'Google Ads (TEST)',
                            url: req.originalUrl,
                            method: req.method,
                            payload: body,
                            status: 'SUCESSO',
                            statusCode: 200,
                            duration: Date.now() - startTime,
                            response: { success: true, message: 'Test payload accepted' },
                        }
                    });
                } catch (err: any) {
                    console.error('[WebhookController] Erro ao logar teste:', err.message);
                }
                return res.status(200).json({ success: true, message: 'Test payload accepted' });
            }

            // ── 1. Log to WebhookLog table ──
            try {
                const isFluentForms = !!body['__submission[form_id]'] || !!(body.__submission && body.__submission.form_id);
                const provider = body.user_column_data ? 'Google Ads'
                    : body.origem || (isFluentForms ? 'Site (FluentForms)' : 'WhatsApp (TwoTime)');
                const logEntry = await (prisma as any).webhookLog.create({
                    data: {
                        provider,
                        url: req.originalUrl,
                        method: req.method,
                        payload: body,
                        status: 'PENDENTE',
                    }
                });
                logId = logEntry.id;
            } catch (err: any) {
                console.error('[WebhookController] Erro ao criar WebhookLog:', err.message);
            }

            // ── 2. Identify payload source and map fields ──
            let nome: string = 'Lead sem nome';
            let email: string | undefined;
            let telefone: string | undefined;
            let empresa: string | undefined;
            let servico_necessitado: string | undefined;
            let origem: string | undefined;
            let url: string | undefined;

            // 2a) Google Ads Lead Form Webhook (uses user_column_data array)
            if (body.user_column_data && Array.isArray(body.user_column_data)) {
                origem = 'Google Ads';
                url = `google-ads-lead-form (campaign: ${body.campaign_id || '?'})`;

                body.user_column_data.forEach((col: any) => {
                    const id = col.column_id;
                    const val = col.string_value;
                    if (id === 'FULL_NAME' || id === 'FIRST_NAME') nome = val;
                    if (id === 'PHONE_NUMBER') telefone = val;
                    if (id === 'EMAIL') email = val;
                    if (id === 'COMPANY_NAME') empresa = val;
                });
            } else {
                // 2b) Fluent Forms or TwoTime Chat Format
                nome = body.nome_cliente || body.nome || body['qual_seu_nome?'] || body.qual_seu_nome || 'Lead sem nome';
                email = body.email || body.email_empresarial;
                telefone = body.whatsapp || body.telefone || body.phone;
                empresa = body.empresa || body.nome_da_sua_empresa || body.nome_da_empresa;
                servico_necessitado = body.mensagem || body.servico_necessitado || body.servico || body['qual_o_servico_necessitado?'] || body.qual_o_servico_necessitado || body.qual_servico_necessitado;

                url = body['__submission[source_url]'] || body.url || body.source_url;
                const isFluentForms = !!body['__submission[form_id]'] || !!(body.__submission && body.__submission.form_id);
                origem = body.origem || (isFluentForms ? 'Site (FluentForms)' : 'WhatsApp (TwoTime)');
            }

            // ── 3. Validate required field ──
            if (!telefone) {
                if (logId) {
                    await (prisma as any).webhookLog.update({
                        where: { id: logId },
                        data: {
                            status: 'ERRO',
                            response: { success: false, error: 'Telefone/WhatsApp é obrigatório' },
                            duration: Date.now() - startTime,
                        }
                    });
                }
                return res.status(400).json({ success: false, error: 'Telefone/WhatsApp é obrigatório' });
            }

            // ── 4. Process the lead ──
            const payload = {
                nome,
                email,
                telefone,
                empresa,
                servico_necessitado,
                origem,
                url
            };

            const result = await LeadProcessorService.processNewLead(payload);

            if (logId) {
                await (prisma as any).webhookLog.update({
                    where: { id: logId },
                    data: {
                        status: 'SUCESSO',
                        response: result,
                        statusCode: 200,
                        duration: Date.now() - startTime,
                    }
                });
            }

            return res.status(200).json(result);
        } catch (error: any) {
            console.error('[WebhookController] Erro:', error);
            if (logId) {
                try {
                    await (prisma as any).webhookLog.update({
                        where: { id: logId },
                        data: {
                            status: 'ERRO',
                            response: { success: false, error: error.message },
                            statusCode: 500,
                            duration: Date.now() - startTime,
                        }
                    });
                } catch (logErr: any) {
                    console.error('[WebhookController] Erro ao atualizar WebhookLog:', logErr.message);
                }
            }
            return res.status(500).json({ success: false, error: error.message });
        }
    }

}

export default new WebhookController();
