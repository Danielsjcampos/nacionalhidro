import axios from 'axios';
import prisma from '../lib/prisma';

export const aiEscalaService = {
    /**
     * Analisa as disponibilidades no banco e sugere a melhor equipe para uma Ordem de Serviço ou nova escala
     */
    sugerirEquipe: async (dataStr: string, clienteId?: string, equipamentoDesejado?: string) => {
        try {
            const apiKey = process.env.GEMINI_API_KEY;
            
            if (!apiKey) {
                return {
                    success: false,
                    error: "GEMINI_API_KEY não está configurada no .env",
                    sugestao: null
                };
            }

            const targetDate = new Date(dataStr);
            const nextDay = new Date(targetDate);
            nextDay.setDate(nextDay.getDate() + 1);

            // 1. Buscar veículos ocupados no dia
            const escalasNoDia = await prisma.escala.findMany({
                where: {
                    OR: [
                        { data: { gte: targetDate, lt: nextDay } },
                        { data: { lte: targetDate }, dataFim: { gte: targetDate } },
                    ],
                    status: { not: 'CANCELADO' }
                },
                select: { veiculoId: true, funcionarios: true }
            });

            const veiculosOcupadosIds = escalasNoDia
                .map(e => e.veiculoId)
                .filter(Boolean) as string[];

            // 2. Extrair funcionários já ocupados nessas escalas
            let funcionariosOcupadosIds: string[] = [];
            for (const esc of escalasNoDia) {
                if (esc.funcionarios && Array.isArray(esc.funcionarios)) {
                    funcionariosOcupadosIds.push(...(esc.funcionarios as string[]));
                }
            }

            // 3. Buscar veículos disponíveis (não em manutenção e não escalados)
            const veiculosDisponiveis = await prisma.veiculo.findMany({
                where: {
                    status: { not: 'MANUTENCAO' },
                    id: { notIn: veiculosOcupadosIds }
                },
                select: { id: true, placa: true, modelo: true, tipoEquipamento: true }
            });

            // 4. Buscar funcionários disponíveis (status ATIVO e não escalados)
            const funcionariosDisponiveis = await prisma.funcionario.findMany({
                where: {
                    status: 'ATIVO',
                    id: { notIn: funcionariosOcupadosIds }
                },
                select: { id: true, nome: true, cargo: true }
            });

            // 5. Contexto adicional de integrações caso haja cliente definido
            let requisitosCliente = "Sem restrições específicas de cliente (nenhum cliente fornecido).";
            if (clienteId) {
                const cliente = await prisma.cliente.findUnique({ where: { id: clienteId }, select: { nome: true, integracoesExigidas: true } });
                if (cliente) {
                    requisitosCliente = `Cliente: ${cliente.nome}. Integrações que este cliente eventualmente exige: ${JSON.stringify(cliente.integracoesExigidas || [])}`;
                }
            }

            // 6. Montar o prompt estruturado para o Gemini
            const promptContext = `
Você é um especialista em logística e escala inteligente.
Sua missão é analisar a lista de veículos e de funcionários disponíveis para montar uma equipe ideal (1 veículo + 1 a 3 funcionários) para uma Ordem de Serviço no dia ${dataStr}.

FATORES DE DECISÃO:
- Equipamento desejado pelo usuário: ${equipamentoDesejado || 'Indefinido (sugira o mais adequado)'}
- ${requisitosCliente}

RELAÇÃO DE VEÍCULOS DISPONÍVEIS:
${JSON.stringify(veiculosDisponiveis, null, 2)}

RELAÇÃO DE FUNCIONÁRIOS DISPONÍVEIS:
${JSON.stringify(funcionariosDisponiveis, null, 2)}

RESPONDA ESTRITAMENTE EM FORMATO JSON, de acordo com o seguinte schema:
{
  "sucesso": boolean,
  "justificativa": "string (Explicação da sua escolha ou alertas/conflitos que encontrou)",
  "veiculoSugerido": {
      "id": "string",
      "placa": "string",
      "modelo": "string"
  },
  "funcionariosSugeridos": [
      {
          "id": "string",
          "nome": "string",
          "cargo": "string",
          "motivoDaEscolha": "string"
      }
  ],
  "scoreConfianca": number (de 0 a 100 sobre o quão ideal é essa escala)
}
            `.trim();

            const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
                {
                    contents: [{ parts: [{ text: promptContext }] }],
                    generationConfig: {
                        responseMimeType: "application/json",
                        temperature: 0.2
                    }
                }
            );

            // Tentar extrair de texto puro JSON caso a API retorne encapsulado
            const unparsed = response.data.candidates[0].content.parts[0].text;
            const jsonText = unparsed.replace(/```json/g, '').replace(/```/g, '').trim();
            const result = JSON.parse(jsonText);

            return {
                success: true,
                sugestao: result
            };

        } catch (error: any) {
            console.error('Erro no aiEscalaService:', error?.response?.data || error.message);
            return {
                success: false,
                error: 'Falha ao processar sugestão via IA. Verifique os logs.',
                sugestao: null
            };
        }
    }
};
