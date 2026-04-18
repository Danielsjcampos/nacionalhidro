import axios from 'axios';
import prisma from '../lib/prisma';

// A Focus NFe tem dois ambientes: Homologação e Produção
const FOCUS_HOMOLOGACAO_URL = 'https://homologacao.focusnfe.com.br/v2';
const FOCUS_PRODUCAO_URL = 'https://api.focusnfe.com.br/v2';

/**
 * Cria uma instância do axios com o token específico da empresa.
 */
function getApiClient(token: string) {
    const ambient = process.env.FOCUS_NFE_AMBIENTE === 'PRODUCAO' ? FOCUS_PRODUCAO_URL : FOCUS_HOMOLOGACAO_URL;
    return axios.create({
        baseURL: ambient,
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
                    cnpj: empresa.cnpj.replace(/\D/g, ''),
                    inscricao_municipal: empresa.inscricaoMunicipal?.replace(/\D/g, '') || '',
                    codigo_municipio: empresa.codigoMunicipio
                },
                tomador: {
                    cnpj_cpf: faturamento.cliente.cnpj.replace(/\D/g, ''),
                    razao_social: faturamento.cliente.razaoSocial || faturamento.cliente.nome,
                    email: faturamento.cliente.email || "",
                    telefone: faturamento.cliente.telefone?.replace(/\D/g, '') || "",
                    endereco: {
                        logradouro: faturamento.cliente.rua || "",
                        numero: faturamento.cliente.numero || "S/N",
                        bairro: faturamento.cliente.bairro || "",
                        cep: faturamento.cliente.cep?.replace(/\D/g, '') || "",
                        uf: faturamento.cliente.estado || "SP",
                        codigo_municipio: faturamento.cliente.codigoMunicipio
                    }
                },
                servico: {
                    aliquota: 2.0, // Default para Campinas no sistema
                    iss_retido: faturamento.cliente.codigoMunicipio === empresa.codigoMunicipio ? 1 : 2,
                    item_lista_servico: '0710',
                    codigo_cnae: empresa.cnae || '8129000',
                    valor_servicos: Number(faturamento.valorBruto),
                    valor_pis: Number(faturamento.valorPIS || 0),
                    valor_cofins: Number(faturamento.valorCOFINS || 0),
                    valor_inss: Number(faturamento.valorINSS || 0),
                    valor_ir: Number(faturamento.valorIR || 0),
                    valor_csll: Number(faturamento.valorCSLL || 0),
                    discriminacao: `${faturamento.observacoes || 'Serviços Prestados'}.\nVENCIMENTO: ${faturamento.dataVencimento ? new Date(faturamento.dataVencimento).toLocaleDateString('pt-BR') : ''}`
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
                tipo_documento: "0", // Normal
                regime_tributario_emitente: "1", // Simples Nacional
                modal: "01", // Rodoviário
                tipo_servico: "0", // Normal
                cfop: "5351", // Operação de transporte
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
