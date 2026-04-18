import { Request, Response } from 'express';
import prisma from '../lib/prisma';

class FiscalWebhookController {
    /**
     * Webhook para processar retornos de NFS-e da Focus NFe.
     */
    async handleNFSeWebhook(req: Request, res: Response) {
        try {
            const data = req.body;
            console.log(`[FiscalWebhook] NFS-e callback recebido - Ref: ${data.ref}, Status: ${data.status}`);

            if (data.status === 'processando_autorizacao') {
                return res.status(200).send('Processando...');
            }

            const faturamento = await (prisma as any).faturamento.findFirst({
                where: { focusRef: data.ref }
            });

            if (!faturamento) {
                console.warn(`[FiscalWebhook] Faturamento não encontrado para ref: ${data.ref}`);
                return res.status(404).send('Faturamento não encontrado');
            }

            // Mapeamento de status Focus -> Sistema
            let novoStatus = faturamento.status;
            if (data.status === 'autorizado') {
                novoStatus = 'EMITIDO';
            } else if (['erro', 'cancelado', 'denegado', 'autorizado_com_erros'].includes(data.status)) {
                novoStatus = 'FALHA';
            }

            // Geração de URL XML conforme legado
            let urlXml = data.url_xml || faturamento.urlArquivoXml;
            if (data.status === 'autorizado' && data.url) {
                urlXml = data.url.replace('.pdf', '-nfse.xml').replace('DANFSEs/NFSe', 'XMLsNFSe/');
            }

            await (prisma as any).faturamento.update({
                where: { id: faturamento.id },
                data: {
                    focusStatus: data.status.toUpperCase(),
                    status: novoStatus,
                    nota: data.numero || faturamento.nota,
                    urlArquivoNota: data.url || faturamento.urlArquivoNota,
                    urlArquivoXml: urlXml,
                    dadosWebHook: data,
                    observacoes: data.erros ? `${faturamento.observacoes || ''}; Erro Focus: ${data.erros[0]?.mensagem || ''}` : faturamento.observacoes
                }
            });

            return res.status(200).send('OK');
        } catch (error: any) {
            console.error('[FiscalWebhook] Erro no processamento do webhook NFS-e:', error.message);
            return res.status(500).send('Internal Server Error');
        }
    }

    /**
     * Webhook para processar retornos de CTE da Focus NFe.
     */
    async handleCTEWebhook(req: Request, res: Response) {
        try {
            const data = req.body;
            console.log(`[FiscalWebhook] CTE callback recebido - Ref: ${data.ref}, Status: ${data.status}`);

            if (data.status === 'processando_autorizacao') {
                return res.status(200).send('Processando...');
            }

            let faturamento = await (prisma as any).faturamento.findFirst({
                where: { focusRef: data.ref }
            });

            // Retry logic (legado strapi aguarda 8s caso não encontre de primeira)
            if (!faturamento) {
                console.warn(`[FiscalWebhook] CTE não encontrado na 1ª tentativa, aguardando 8s: ${data.ref}`);
                await new Promise(r => setTimeout(r, 8000));
                faturamento = await (prisma as any).faturamento.findFirst({
                    where: { focusRef: data.ref }
                });
            }

            if (!faturamento) {
                console.warn(`[FiscalWebhook] Faturamento (CTE) não encontrado após retry: ${data.ref}`);
                return res.status(404).send('Faturamento não encontrado');
            }

            let novoStatus = faturamento.status;
            if (data.status === 'autorizado') {
                novoStatus = 'EMITIDO';
            } else if (['erro', 'cancelado', 'denegado', 'autorizado_com_erros'].includes(data.status)) {
                novoStatus = 'FALHA';
            }

            // Geração de URL XML conforme legado
            let urlXml = data.caminho_xml_nota_fiscal || faturamento.urlArquivoXml;
            if (data.status === 'autorizado' && data.caminho_dacte) {
                urlXml = data.caminho_dacte.replace('DACTEs/', 'XMLs/CTe').replace('.pdf', '-cte.xml');
            }

            await (prisma as any).faturamento.update({
                where: { id: faturamento.id },
                data: {
                    focusStatus: data.status.toUpperCase(),
                    status: novoStatus,
                    nota: data.numero || faturamento.nota,
                    urlArquivoNota: data.caminho_dacte || faturamento.urlArquivoNota,
                    urlArquivoXml: urlXml,
                    dadosWebHook: data,
                    observacoes: data.mensagem_sefaz ? `${faturamento.observacoes || ''}; Sefaz: ${data.mensagem_sefaz}` : faturamento.observacoes
                }
            });

            return res.status(200).send('OK');
        } catch (error: any) {
            console.error('[FiscalWebhook] Erro no processamento do webhook CTE:', error.message);
            return res.status(500).send('Internal Server Error');
        }
    }

    /**
     * Webhook para processar retornos de NF-e (Produtos) da Focus NFe.
     */
    async handleNFEWebhook(req: Request, res: Response) {
        try {
            const data = req.body;
            console.log(`[FiscalWebhook] NF-e callback recebido - Ref: ${data.ref}, Status: ${data.status}`);

            if (data.status === 'processando_autorizacao') {
                return res.status(200).send('Processando...');
            }

            const faturamento = await (prisma as any).faturamento.findFirst({
                where: { focusRef: data.ref }
            });

            if (!faturamento) {
                console.warn(`[FiscalWebhook] Faturamento (NF-e) não encontrado para ref: ${data.ref}`);
                return res.status(404).send('Faturamento não encontrado');
            }

            let novoStatus = faturamento.status;
            if (data.status === 'autorizado') {
                novoStatus = 'EMITIDO';
            } else if (['erro', 'cancelado', 'denegado'].includes(data.status)) {
                novoStatus = 'FALHA';
            }

            // Geração de URL XML conforme legado
            let urlXml = data.url_xml || faturamento.urlArquivoXml;
            if (data.status === 'autorizado' && data.url) {
                // NFe: .replace('DANFEs/', 'XMLs/NFe').replace('.pdf', '-nfe.xml')
                urlXml = data.url.replace('DANFEs/', 'XMLs/NFe').replace('.pdf', '-nfe.xml');
            }

            await (prisma as any).faturamento.update({
                where: { id: faturamento.id },
                data: {
                    focusStatus: data.status.toUpperCase(),
                    status: novoStatus,
                    nota: data.numero || faturamento.nota,
                    urlArquivoNota: data.url || faturamento.urlArquivoNota,
                    urlArquivoXml: urlXml,
                    dadosWebHook: data,
                    observacoes: data.mensagem_sefaz ? `${faturamento.observacoes || ''}; Sefaz: ${data.mensagem_sefaz}` : faturamento.observacoes
                }
            });

            return res.status(200).send('OK');
        } catch (error: any) {
            console.error('[FiscalWebhook] Erro no processamento do webhook NF-e:', error.message);
            return res.status(500).send('Internal Server Error');
        }
    }
}

export default new FiscalWebhookController();
