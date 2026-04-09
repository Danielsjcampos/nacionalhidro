import axios from 'axios';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const RH_INSTANCE_NAME = process.env.RH_INSTANCE_NAME || 'RH_Oficial'; // Importante separar a instancia do RH

export const evolutionRhService = {
  /**
   * Envia uma mensagem de WhatsApp via Flow Manual do RH
   * @param phone Numero do candidato
   * @param message Texto a ser enviado
   */
  async sendMessage(phone: string, message: string) {
    try {
      // Limpar o numero para o formato da API
      const fone = phone.replace(/\D/g, '');
      const numberFormat = fone.length === 11 ? `55${fone}` : fone;

      const response = await axios.post(
        `${EVOLUTION_API_URL}/message/sendText/${RH_INSTANCE_NAME}`,
        {
          number: numberFormat,
          options: {
            delay: 1200,
            presence: 'composing',
          },
          textMessage: {
            text: message,
          },
        },
        {
          headers: {
            'apikey': EVOLUTION_API_KEY,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Erro ao enviar mensagem RH via Evolution API:', error.response?.data || error.message);
      throw error;
    }
  }
};
