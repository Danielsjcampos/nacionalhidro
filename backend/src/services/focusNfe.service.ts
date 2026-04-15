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
                    discriminacao: `${faturamento.observacoes || 'Serviços Prestados'}.\nVENCIMENTO: ${faturamento.dataVencimento ? faturamento.dataVencimento.toLocaleDateString('pt-BR') : ''}`
                }
            };

            const response = await api.post(`/nfse?ref=${ref}`, payload);

            await (prisma as any).faturamento.update({
                where: { id: faturamentoId },
                data: {
                    focusRef: ref,
                    focusStatus: 'PROCESSANDO',
                    dadosFaturamento: payload
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
                    inscricao_estadual: faturamento.cliente.inscricaoEstadual || "ISENTO",
                    logradouro: faturamento.cliente.rua,
                    numero: faturamento.cliente.numero,
                    bairro: faturamento.cliente.bairro,
                    codigo_municipio: faturamento.cliente.codigoMunicipio,
                    uf: faturamento.cliente.estado,
                    cep: faturamento.cliente.cep?.replace(/\D/g, '')
                }
            };

            // No CTE da Nacional Hidro, geralmente o tomador é o Remetente/Destinatário também
            payload.remetente = { ...payload.tomador };
            payload.destinatario = { ...payload.tomador };

            const response = await api.post(`/cte?ref=${ref}`, payload);

            await (prisma as any).faturamento.update({
                where: { id: faturamentoId },
                data: {
                    focusRef: ref,
                    focusStatus: 'PROCESSANDO',
                    dadosFaturamento: payload
                }
            });

            return { success: true, ref, data: response.data };
        } catch (error: any) {
            console.error('Erro Focus CTE:', error?.response?.data || error.message);
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
        const endpoint = fat.tipo === 'CTE' ? `/cte/${fat.focusRef}` : `/nfse/${fat.focusRef}`;
        
        const response = await api.get(endpoint);
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
        const endpoint = fat.tipo === 'CTE' ? `/cte/${fat.focusRef}` : `/nfse/${fat.focusRef}`;

        const response = await api.delete(endpoint, { data: { justificativa } });
        return response.data;
    }
};
error.message)}`);
        }
    }
};
