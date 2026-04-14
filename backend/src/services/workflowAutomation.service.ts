import prisma from '../lib/prisma';
import { enviarMensagemWhatsApp } from './whatsapp.service';
import nodemailer from 'nodemailer';

/**
 * Motor de automação para o Workflow Engine.
 * Executa ações baseadas em gatilhos (ex: entrada em fase).
 */
export class WorkflowAutomationService {
  /**
   * Processa automações disparadas pela movimentação de um card para uma nova fase.
   * @param cardId ID do card movido
   * @param targetStageId ID da fase de destino
   */
  async processMove(cardId: string, targetStageId: string) {
    console.log(`[WorkflowAutomation] Processando card ${cardId} na fase ${targetStageId}`);

    try {
      // 1. Buscar automações configuradas para esta fase
      const automations = await prisma.workflowAutomation.findMany({
        where: { stageId: targetStageId, ativo: true }
      });

      if (automations.length === 0) return;

      // 2. Buscar dados do card para variáveis dinâmicas
      const card = await prisma.workflowCard.findUnique({
        where: { id: cardId },
        include: { workflow: true }
      });

      if (!card) return;

      const dados = card.dados as Record<string, any>;

      for (const auto of automations) {
        if (auto.tipo === 'WHATSAPP') {
          await this.handleWhatsApp(auto, dados);
        } else if (auto.tipo === 'EMAIL') {
          await this.handleEmail(auto, dados);
        }
      }
    } catch (error) {
      console.error('[WorkflowAutomation] Erro ao processar automação:', error);
    }
  }

  private async handleWhatsApp(auto: any, dados: any) {
    const config = auto.config as any;
    const telefoneBruto = config.telefone || dados[config.campoTelefone] || '';
    const mensagemHeader = `*${auto.workflow?.nome || 'Processo'}*\n\n`;
    const mensagemBase = config.mensagem || '';
    
    // Substituir variáveis {{campo}}
    const mensagemFinal = this.replaceVariables(mensagemHeader + mensagemBase, dados);
    
    const telefone = telefoneBruto.replace(/\D/g, '');
    if (telefone.length >= 10) {
      console.log(`[WorkflowAutomation] Enviando WhatsApp para ${telefone}`);
      await enviarMensagemWhatsApp(telefone, mensagemFinal);
    }
  }

  private async handleEmail(auto: any, dados: any) {
    // Integração com email.service ou similar
    console.log('[WorkflowAutomation] Automação de Email ainda não implementada detalhadamente.');
  }

  private replaceVariables(text: string, dados: any): string {
    return text.replace(/\{\{(.*?)\}\}/g, (match, key) => {
      return dados[key.trim()] || match;
    });
  }
}

export default new WorkflowAutomationService();
