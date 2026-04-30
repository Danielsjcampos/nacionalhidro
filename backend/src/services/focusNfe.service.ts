import axios from 'axios';
import prisma from '../lib/prisma';
import { sendEmail } from './email.service';

// ATENÇÃO: sem a variável FOCUS_NFE_AMBIENTE, emissões vão para HOMOLOGAÇÃO
const ambiente = process.env.FOCUS_NFE_AMBIENTE === 'PRODUCAO'
    ? 'api.focusnfe.com.br'
    : 'homologacao.focusnfe.com.br';

const EMAILS = {
    CONTASAPAGAR: 'contasapagar@nacionalhidro.com.br',
};

/**
 * Cria uma instância do axios com o token específico da empresa.
 * Timeout de 30s para evitar travamento em chamadas à API.
 */
function getApiClient(token: string) {
    return axios.create({
        timeout: 30000, // 30s
        baseURL: `https://${ambiente}/v2`,
        auth: {
            username: token,
            password: ''
        }
    });
}

export const focusNfeService = {
    /**
     * Emite uma NFS-e na API da Focus NFe.
     */
    emitirNFSe: async (faturamentoId: string) => {
        try {
            const faturamento = await (prisma as any).faturamento.findUnique({
                where: { id: faturamentoId },
                include: { cliente: true }
            });

            if (!faturamento) throw new Error('Faturamento não encontrado.');
            if (faturamento.tipo !== 'NFSE') throw new Error('Tipo de faturamento inválido para NFS-e.');

            // Busca empresa para obter o token e dados cadastrais
            const empresa = await (prisma as any).empresaCNPJ.findUnique({
                where: { cnpj: faturamento.cnpjFaturamento }
            });

            if (!empresa?.focusToken) {
                throw new Error(`Token Focus NFe não encontrado para a empresa ${faturamento.cnpjFaturamento}`);
            }

            const api = getApiClient(empresa.focusToken);
            const ref = faturamento.focusRef || `fat_nfse_${faturamentoId}_${Date.now()}`;

            // Mapeamento de Payload (Baseado no Legado Strapi)
            const payload: any = {
                data_emissao: faturamento.dataEmissao.toISOString(),
                natureza_operacao: faturamento.cliente.codigoMunicipio === empresa.codigoMunicipio ? '1' : '2',
                prestador: {
                    cnpj: (empresa.cnpj || '').replace(/\D/g, ''),
                    inscricao_municipal: (empresa.inscricaoMunicipal || '').replace(/\D/g, ''),
                    codigo_municipio: empresa.codigoMunicipio
                },
                tomador: {
                    cnpj_cpf: (faturamento.cliente.cnpj || faturamento.cliente.documento || '').replace(/\D/g, ''),
                    razao_social: faturamento.cliente.razaoSocial || faturamento.cliente.nome,
                    email: faturamento.cliente.email || "",
                    telefone: (faturamento.cliente.telefone || '').replace(/\D/g, ''),
                    endereco: {
                        logradouro: faturamento.cliente.rua || "",
                        numero: faturamento.cliente.numero || "S/N",
                        bairro: faturamento.cliente.bairro || "",
                        cep: (faturamento.cliente.cep || '').replace(/\D/g, ''),
                        uf: faturamento.cliente.estado || "SP",
                        codigo_municipio: faturamento.cliente.codigoMunicipio
                    }
                },
                servico: {
                    aliquota: Number(empresa.aliquotaIss || 2.0),
                    iss_retido: faturamento.cliente.codigoMunicipio === empresa.codigoMunicipio ? 1 : 2,
                    item_lista_servico: empresa.itemListaServico || '0710',
                    codigo_cnae: empresa.cnae || '8129000',
                    valor_servicos: Number(faturamento.valorBruto),
                    valor_pis: Number(faturamento.valorPIS || 0),
                    valor_cofins: Number(faturamento.valorCOFINS || 0),
                    valor_inss: Number(faturamento.valorINSS || 0),
                    valor_ir: Number(faturamento.valorIR || 0),
                    valor_csll: Number(faturamento.valorCSLL || 0),
                    valor_iss: Number(faturamento.valorISS || 0),
                    discriminacao: `${faturamento.observacoes || 'Serviços Prestados'}.\nVENCIMENTO: ${faturamento.dataVencimento ? new Date(faturamento.dataVencimento).toLocaleDateString('pt-BR') : ''}.\nDADOS BANCÁRIOS: Banco: ${empresa.banco || ''} Ag: ${empresa.agencia || ''} C/C: ${empresa.conta || ''}`
                }
            };

            // Natureza de Operação e ISS Retido (Sync com Legado)
            payload.natureza_operacao = faturamento.cliente.codigoMunicipio === empresa.codigoMunicipio ? '1' : '2';
            payload.servico.iss_retido = 1; // Sempre 1 (Sim) no nível do serviço para o layout Focus
            payload.iss_retido = faturamento.cliente.codigoMunicipio === empresa.codigoMunicipio ? 1 : 2;

            const response = await api.post(`/nfse?ref=${ref}`, payload);

            // Geração de link XML conforme legado (substituindo extensão e caminhos)
            // NFSe: .replace('.pdf', '-nfse.xml').replace('DANFSEs/NFSe', 'XMLsNFSe/')
            const urlPdf = response.data.url || "";
            const urlXml = urlPdf.replace('.pdf', '-nfse.xml').replace('DANFSEs/NFSe', 'XMLsNFSe/');

            await (prisma as any).faturamento.update({
                where: { id: faturamentoId },
                data: {
                    focusRef: ref,
                    focusStatus: 'PROCESSANDO',
                    dadosFaturamento: payload,
                    urlArquivoXml: urlXml
                }
            });

            return { success: true, ref, data: response.data };
        } catch (error: any) {
            console.error('Erro Focus NFSe:', error?.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Emite um CTE na API da Focus NFe.
     */
    emitirCTE: async (faturamentoId: string) => {
        try {
            const faturamento = await (prisma as any).faturamento.findUnique({
                where: { id: faturamentoId },
                include: { cliente: true }
            });

            if (!faturamento) throw new Error('Faturamento não encontrado.');

            const empresa = await (prisma as any).empresaCNPJ.findUnique({
                where: { cnpj: faturamento.cnpjFaturamento }
            });

            if (!empresa?.focusToken) {
                throw new Error(`Token Focus NFe não encontrado para a empresa ${faturamento.cnpjFaturamento}`);
            }

            const api = getApiClient(empresa.focusToken);
            const ref = faturamento.focusRef || `fat_cte_${faturamentoId}_${Date.now()}`;

            // Mapeamento CTE (Baseado em ModalEdicaoFaturamento.js legado)
            const payload: any = {
                data_emissao: faturamento.dataEmissao.toISOString(),
                tipo_documento: empresa.cteTipoDoc || "0", // Normal
                regime_tributario_emitente: "1", // Simples Nacional
                modal: empresa.cteModal || "01", // Rodoviário
                tipo_servico: "0", // Normal
                cfop: empresa.cteCfop || "5351", // Operação de transporte
                natureza_operacao: "PRESTACAO DE SERVICO DE TRANSPORTE",
                valor_total: Number(faturamento.valorBruto),
                valor_receber: Number(faturamento.valorBruto),
                icms_situacao_tributaria: "90_simples_nacional",
                icms_indicador_simples_nacional: "1",
                icms_base_calculo: Number(faturamento.valorBruto),
                modal_rodoviario: {
                    rntrc: empresa.rntrc || ""
                },
                emitente: {
                    cnpj: empresa.cnpj.replace(/\D/g, ''),
                    inscricao_estadual: empresa.inscricaoEstadual?.replace(/\D/g, '') || '',
                    nome: empresa.nome,
                    logradouro: empresa.logradouro,
                    numero: empresa.numero,
                    bairro: empresa.bairro,
                    codigo_municipio: empresa.codigoMunicipio,
                    uf: empresa.uf,
                    cep: empresa.cep?.replace(/\D/g, '')
                },
                tomador: {
                    cnpj: faturamento.cliente.cnpj.replace(/\D/g, ''),
                    nome: faturamento.cliente.razaoSocial || faturamento.cliente.nome,
                    inscricao_estadual: (faturamento.cliente.inscricaoEstadual || "ISENTO").replace(/\D/g, '') || "ISENTO",
                    logradouro: faturamento.cliente.rua || faturamento.cliente.endereco || "",
                    numero: faturamento.cliente.numero || "S/N",
                    bairro: faturamento.cliente.bairro || "",
                    codigo_municipio: faturamento.cliente.codigoMunicipio,
                    uf: faturamento.cliente.estado || faturamento.cliente.uf || "SP",
                    cep: faturamento.cliente.cep?.replace(/\D/g, '')
                },
                remetente: {
                    cnpj: faturamento.cliente.cnpj.replace(/\D/g, ''),
                    nome: faturamento.cliente.razaoSocial || faturamento.cliente.nome,
                    inscricao_estadual: (faturamento.cliente.inscricaoEstadual || "ISENTO").replace(/\D/g, '') || "ISENTO",
                    logradouro: faturamento.cliente.rua || faturamento.cliente.endereco || "",
                    numero: faturamento.cliente.numero || "S/N",
                    bairro: faturamento.cliente.bairro || "",
                    codigo_municipio: faturamento.cliente.codigoMunicipio,
                    uf: faturamento.cliente.estado || faturamento.cliente.uf || "SP",
                    cep: faturamento.cliente.cep?.replace(/\D/g, '')
                },
                informacoes_adicionais: `${faturamento.observacoes || 'Transporte de Cargas'}. DADOS DE PAGAMENTO Banco: ${empresa.banco || ''} Ag: ${empresa.agencia || ''} C/C: ${empresa.conta || ''}`
            };

            // No CTE da Nacional Hidro, o tomador geralmente é o Remetente e o Destinatário
            payload.destinatario = { ...payload.remetente };

            const response = await api.post(`/cte?ref=${ref}`, payload);

            // Geração de link XML conforme legado (substituindo extensão e caminhos)
            // CTE: .replace('DACTEs/', 'XMLs/CTe').replace('.pdf', '-cte.xml')
            const urlPdf = response.data.url || response.data.caminho_dacte || "";
            const urlXml = urlPdf.replace('DACTEs/', 'XMLs/CTe').replace('.pdf', '-cte.xml');

            return { success: true, ref, data: response.data };
        } catch (error: any) {
            console.error('Erro Focus CTE:', error?.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Emite uma NF-e (Produtos) na API da Focus NFe.
     */
    emitirNFe: async (faturamentoId: string) => {
        try {
            const faturamento = await (prisma as any).faturamento.findUnique({
                where: { id: faturamentoId },
                include: { cliente: true }
            });

            if (!faturamento) throw new Error('Faturamento não encontrado.');

            const empresa = await (prisma as any).empresaCNPJ.findUnique({
                where: { cnpj: faturamento.cnpjFaturamento }
            });

            if (!empresa?.focusToken) {
                throw new Error(`Token Focus NFe não encontrado para a empresa ${faturamento.cnpjFaturamento}`);
            }

            const api = getApiClient(empresa.focusToken);
            const ref = faturamento.focusRef || `fat_nfe_${faturamentoId}_${Date.now()}`;

            // Mapeamento NFe (Repurposed for Remessa de Locação/Equipamento)
            const payload: any = {
                data_emissao: faturamento.dataEmissao.toISOString(),
                natureza_operacao: "REMESSA DE LOCACAO OU PRESTACAO DE SERVICO",
                tipo_documento: "1", // Saída
                finalidade_emissao: "1", // Normal
                presenca_comprador: "1", // Operação presencial
                icms_valor_total: 0,
                valor_total: Number(faturamento.valorBruto),
                valor_produtos: Number(faturamento.valorBruto),
                emitente: {
                    cnpj: empresa.cnpj.replace(/\D/g, ''),
                    inscricao_estadual: empresa.inscricaoEstadual?.replace(/\D/g, '') || '',
                    nome: empresa.nome,
                    logradouro: empresa.logradouro,
                    numero: empresa.numero,
                    bairro: empresa.bairro,
                    codigo_municipio: empresa.codigoMunicipio,
                    uf: empresa.uf,
                    cep: empresa.cep?.replace(/\D/g, '')
                },
                destinatario: {
                    cnpj: faturamento.cliente.cnpj.replace(/\D/g, ''),
                    razao_social: faturamento.cliente.razaoSocial || faturamento.cliente.nome,
                    inscricao_estadual: (faturamento.cliente.inscricaoEstadual || "ISENTO").replace(/\D/g, '') || "ISENTO",
                    logradouro: faturamento.cliente.rua,
                    numero: faturamento.cliente.numero,
                    bairro: faturamento.cliente.bairro,
                    codigo_municipio: faturamento.cliente.codigoMunicipio,
                    uf: faturamento.cliente.estado,
                    cep: faturamento.cliente.cep?.replace(/\D/g, '')
                },
                items: [
                    {
                        numero_item: "1",
                        codigo_produto: "001",
                        descricao: faturamento.observacoes || "EQUIPAMENTO EM REGIME DE LOCACAO / REMESSA",
                        cfop: faturamento.cliente.estado === empresa.uf ? "5949" : "6949",
                        unidade_comercial: "UN",
                        quantidade_comercial: "1.00",
                        valor_unitario_comercial: Number(faturamento.valorBruto).toFixed(2),
                        valor_bruto: Number(faturamento.valorBruto).toFixed(2),
                        icms_situacao_tributaria: "400", // Simples Nacional - Não tributada
                        icms_origem: "0",
                        pis_situacao_tributaria: "08", // Operação sem incidência
                        cofins_situacao_tributaria: "08" // Operação sem incidência
                    }
                ]
            };

            const response = await api.post(`/nfe?ref=${ref}`, payload);

            const urlPdf = response.data.url || "";
            const urlXml = urlPdf.replace('DANFEs/', 'XMLs/NFe').replace('.pdf', '-nfe.xml');

            await (prisma as any).faturamento.update({
                where: { id: faturamentoId },
                data: {
                    focusRef: ref,
                    focusStatus: 'PROCESSANDO',
                    dadosFaturamento: payload,
                    urlArquivoXml: urlXml
                }
            });

            return { success: true, ref, data: response.data };
        } catch (error: any) {
            console.error('Erro Focus NFe:', error?.response?.data || error.message);
            throw error;
        }
    },

    consultarStatus: async (faturamentoId: string) => {
        const fat = await (prisma as any).faturamento.findUnique({
            where: { id: faturamentoId }
        });
        if (!fat?.focusRef || !fat.cnpjFaturamento) return null;

        const empresa = await (prisma as any).empresaCNPJ.findUnique({
            where: { cnpj: fat.cnpjFaturamento }
        });
        if (!empresa?.focusToken) return null;

        const api = getApiClient(empresa.focusToken);
        
        let prefix = 'nfse';
        if (fat.tipo === 'CTE') prefix = 'cte';
        if (fat.tipo === 'NFE') prefix = 'nfe';

        const endpoint = `/${prefix}/${fat.focusRef}`;
        
        const response = await api.get(endpoint);
        
        // Atualiza status e nota se autorizado
        if (response.data.status === 'autorizado') {
            const urlPdf = response.data.url || response.data.caminho_dacte || "";
            let urlXml = "";
            if (fat.tipo === 'NFSE') urlXml = urlPdf.replace('.pdf', '-nfse.xml').replace('DANFSEs/NFSe', 'XMLsNFSe/');
            if (fat.tipo === 'CTE') urlXml = urlPdf.replace('DACTEs/', 'XMLs/CTe').replace('.pdf', '-cte.xml');
            if (fat.tipo === 'NFE') urlXml = urlPdf.replace('DANFEs/', 'XMLs/NFe').replace('.pdf', '-nfe.xml');

            await (prisma as any).faturamento.update({
                where: { id: faturamentoId },
                data: {
                    numero: String(response.data.numero),
                    focusStatus: 'AUTORIZADO',
                    status: 'EMITIDA',
                    urlArquivoNota: urlPdf,
                    urlArquivoXml: urlXml,
                    dadosWebHook: response.data
                }
            });
        } else if (response.data.status === 'erro_autorizacao') {
             await (prisma as any).faturamento.update({
                where: { id: faturamentoId },
                data: {
                    focusStatus: 'FALHA',
                    observacoes: ((fat.observacoes || '') + `; Erro Focus: ${response.data.erros?.[0]?.mensagem || 'Desconhecido'}`).substring(0, 1000)
                }
            });
        }

        return response.data;
    },

    cancelar: async (faturamentoId: string, justificativa: string) => {
        const fat = await (prisma as any).faturamento.findUnique({
            where: { id: faturamentoId }
        });
        if (!fat?.focusRef || !fat.cnpjFaturamento) throw new Error('Faturamento sem referência Focus.');

        const empresa = await (prisma as any).empresaCNPJ.findUnique({
            where: { cnpj: fat.cnpjFaturamento }
        });
        if (!empresa?.focusToken) throw new Error('Token Focus não encontrado.');

        const api = getApiClient(empresa.focusToken);
        
        let prefix = 'nfse';
        if (fat.tipo === 'CTE') prefix = 'cte';
        if (fat.tipo === 'NFE') prefix = 'nfe';

        const endpoint = `/${prefix}/${fat.focusRef}`;
        
        // CTe requires POST to /cte/ref/cancelar, NFE /nfe/ref. JSON com justificativa.
        // NFSe is usually DELETE /nfse/ref
        let response;
        try {
            if (fat.tipo === 'NFSE') {
                response = await api.delete(endpoint, { data: { justificativa } });
            } else {
                response = await api.post(`${endpoint}/cancelar`, { justificativa });
            }
        } catch (cancelError: any) {
            // RISCO 6: Notificar Contas a Pagar sobre falha no cancelamento
            const errMsg = cancelError?.response?.data?.mensagem || cancelError?.message || 'Erro desconhecido';
            console.error(`[FocusNFe] Falha no cancelamento do faturamento ${faturamentoId}:`, errMsg);

            await sendEmail({
                to: EMAILS.CONTASAPAGAR,
                subject: `⚠️ FALHA no cancelamento fiscal — Fat. ${fat.numero || fat.focusRef}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #dc2626;">Falha no Cancelamento Fiscal</h2>
                        <p>Não foi possível cancelar o documento fiscal abaixo via Focus NFe.</p>
                        <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
                            <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Faturamento</td><td style="padding: 8px; border: 1px solid #ddd;">${fat.numero || fat.focusRef}</td></tr>
                            <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Tipo</td><td style="padding: 8px; border: 1px solid #ddd;">${fat.tipo}</td></tr>
                            <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">CNPJ</td><td style="padding: 8px; border: 1px solid #ddd;">${fat.cnpjFaturamento}</td></tr>
                            <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Justificativa</td><td style="padding: 8px; border: 1px solid #ddd;">${justificativa}</td></tr>
                            <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #dc2626;">Erro</td><td style="padding: 8px; border: 1px solid #ddd;">${errMsg}</td></tr>
                        </table>
                        <p style="color: #666;">É necessário cancelar manualmente no painel da Focus NFe ou junto à prefeitura.</p>
                    </div>
                `,
                fromName: 'Sistema Nacional Hidro',
            }).catch(emailErr => console.error('[FocusNFe] Falha ao enviar email de cancelamento:', emailErr));

            throw cancelError;
        }

        if (response.data.status === 'cancelado' || response.data.status === 'sucesso') {
             await (prisma as any).faturamento.update({
                where: { id: faturamentoId },
                data: {
                    status: 'CANCELADA',
                    focusStatus: 'CANCELADO'
                }
            });
        }

        return response.data;
    },

    corrigir: async (faturamentoId: string, texto: string) => {
        const fat = await (prisma as any).faturamento.findUnique({
            where: { id: faturamentoId }
        });
        if (!fat?.focusRef || !fat.cnpjFaturamento) throw new Error('Faturamento sem referência Focus.');

        const empresa = await (prisma as any).empresaCNPJ.findUnique({
            where: { cnpj: fat.cnpjFaturamento }
        });
        if (!empresa?.focusToken) throw new Error('Token Focus não encontrado.');

        const api = getApiClient(empresa.focusToken);
        
        let prefix = 'nfe'; // CC-e is more common for NFe/CTe
        if (fat.tipo === 'CTE') prefix = 'cte';

        const endpoint = `/${prefix}/${fat.focusRef}/carta_correcao`;

        const response = await api.post(endpoint, { correcao: texto });
        return response.data;
    }
};
