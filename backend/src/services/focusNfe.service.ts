import axios from 'axios';
import prisma from '../lib/prisma';

// A Focus NFe tem dois ambientes: Homologação e Produção
// Homologação: https://homologacao.focusnfe.com.br/v2/
// Produção: https://api.focusnfe.com.br/v2/

const FOCUS_API_URL = process.env.FOCUS_NFE_AMBIENTE === 'PRODUCAO' 
    ? 'https://api.focusnfe.com.br/v2' 
    : 'https://homologacao.focusnfe.com.br/v2';

const FOCUS_API_TOKEN = process.env.FOCUS_NFE_TOKEN || '';

const api = axios.create({
    baseURL: FOCUS_API_URL,
    auth: {
        username: FOCUS_API_TOKEN,
        password: ''
    }
});

export const focusNfeService = {
    /**
     * Emite uma NFS-e na API da Focus NFe.
     * @param faturamentoId O ID do faturamento de tipo NFSE no banco de dados.
     * @returns A referência criada na Focus NFe.
     */
    emitirNFSe: async (faturamentoId: string) => {
        try {
            if (!FOCUS_API_TOKEN) {
                throw new Error('FOCUS_NFE_TOKEN não está configurado nas variáveis de ambiente.');
            }

            const faturamento = await (prisma as any).faturamento.findUnique({
                where: { id: faturamentoId },
                include: { cliente: true }
            });

            if (!faturamento) {
                throw new Error('Faturamento não encontrado.');
            }

            if (faturamento.tipo !== 'NFSE') {
                throw new Error('Este faturamento não é do tipo NFS-e.');
            }

            // O ref deve ser único por nota gerada.
            // Para não haver duplicidade caso a gente tente reenviar, usamos o próprio ID do faturamento (ou um sufixo de tentativa).
            const ref = faturamento.numero ? `FAT-${faturamento.numero}` : `FAT-${faturamento.id}`;

            // Configuração base da nota
            // Isso precisa ser validado com os dados reais do seu CNPJ e município.
            const payload = {
                data_emissao: new Date().toISOString(),
                prestador: {
                    cnpj: faturamento.cnpjFaturamento?.replace(/\D/g, '') || "00000000000000",
                    inscricao_municipal: process.env.INSCRICAO_MUNICIPAL || "00000"
                },
                tomador: {
                    cnpj_cpf: faturamento.cliente.documento.replace(/\D/g, ''),
                    razao_social: faturamento.cliente.razaoSocial || faturamento.cliente.nome,
                    email: faturamento.cliente.email || "",
                    endereco: {
                        logradouro: faturamento.cliente.endereco || "Não informado",
                        numero: faturamento.cliente.numero || "S/N",
                        bairro: faturamento.cliente.bairro || "Não informado",
                        codigo_municipio: "3550308", // Exemplo IBGE São Paulo, DEVE SER AJUSTADO
                        uf: faturamento.cliente.estado || "SP",
                        cep: faturamento.cliente.cep?.replace(/\D/g, '') || "00000000"
                    }
                },
                servico: {
                    aliquota: 2.0, // Configurar conforme a empresa
                    iss_retido: false,
                    item_lista_servico: "14.01", // Código do serviço conforme LC 116/2003
                    codigo_tributario_municipio: "14.01",
                    valor_servicos: faturamento.valorBruto,
                    valor_inss: faturamento.valorINSS || 0,
                    valor_ir: faturamento.valorIR || 0,
                    valor_csll: faturamento.valorCSLL || 0,
                    valor_pis: faturamento.valorPIS || 0,
                    valor_cofins: faturamento.valorCOFINS || 0,
                    discriminacao: `Referente a prestação de serviços de ${faturamento.centroCusto || 'Manutenção'}.`
                }
            };

            const response = await api.post(`/nfse?ref=${ref}`, payload);

            // Atualizamos o banco com o ref da Focus para consultas futuras
            await (prisma as any).faturamento.update({
                where: { id: faturamentoId },
                data: {
                    focusRef: ref,
                    focusStatus: 'PROCESSANDO' // A Focus retorna a nota em processamento inicialmente
                }
            });

            return { success: true, ref, data: response.data };

        } catch (error: any) {
            console.error('Erro ao emitir NFS-e Focus NFe:', error?.response?.data || error.message);
            throw new Error(`Falha ao emitir NFSe: ${JSON.stringify(error?.response?.data || error.message)}`);
        }
    },

    consultarStatusNFSe: async (ref: string) => {
        try {
            const response = await api.get(`/nfse/${ref}`);
            return response.data;
        } catch (error: any) {
             console.error('Erro ao consultar NFSe Focus NFe:', error?.response?.data || error.message);
             throw new Error('Falha ao consultar NFSe');
        }
    },

    /**
     * Cancela uma NFS-e na API da Focus NFe.
     */
    cancelarNFSe: async (ref: string, justificativa: string = "Cancelamento solicitado pelo cliente") => {
        try {
            const response = await api.delete(`/nfse/${ref}`, {
                data: { justificativa }
            });
            return response.data;
        } catch (error: any) {
            console.error('Erro ao cancelar NFSe Focus NFe:', error?.response?.data || error.message);
            throw new Error(`Falha ao cancelar NFSe: ${JSON.stringify(error?.response?.data || error.message)}`);
        }
    },

    /**
     * Carta de Correção Eletrônica (CC-e)
     */
    cartaCorrecao: async (ref: string, correcao: string) => {
        try {
            // Nota: CC-e é mais comum em NFe/CTe, mas deixamos o endpoint genérico preparado
            const response = await api.post(`/nfe/${ref}/carta_correcao`, {
                correcao
            });
            return response.data;
        } catch (error: any) {
            console.error('Erro ao emitir Carta de Correção Focus NFe:', error?.response?.data || error.message);
            throw new Error(`Falha ao emitir CC-e: ${JSON.stringify(error?.response?.data || error.message)}`);
        }
    }
};
