import prisma from '../lib/prisma';
import { enviarMensagemWhatsApp } from './whatsapp.service';
import { sendEmail } from './email.service';
import mustache from 'mustache';

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
        where: { stageId: targetStageId, ativo: true },
        include: { emailTemplate: true }
      });

      if (automations.length === 0) return;

      // 2. Buscar dados do card para variáveis dinâmicas
      const card = await prisma.workflowCard.findUnique({
        where: { id: cardId },
        include: { workflow: true }
      });

      if (!card) return;

      const dados = card.dados as Record<string, any>;
      // Adicionar metadados básicos aos dados para uso em templates
      const templateData = {
        ...dados,
        cardTitle: card.titulo,
        workflowName: card.workflow.nome,
        currentDate: new Date().toLocaleDateString('pt-BR')
      };

      for (const auto of automations) {
        if (auto.tipo === 'WHATSAPP') {
          await this.handleWhatsApp(auto, templateData);
        } else if (auto.tipo === 'EMAIL') {
          await this.handleEmail(auto, templateData);
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
    
    // Substituir variáveis
    const mensagemFinal = this.replaceVariables(mensagemHeader + mensagemBase, dados);
    
    const telefone = telefoneBruto.replace(/\D/g, '');
    if (telefone.length >= 10) {
      console.log(`[WorkflowAutomation] Enviando WhatsApp para ${telefone}`);
      await enviarMensagemWhatsApp(telefone, mensagemFinal);
    }
  }

  private async handleEmail(auto: any, dados: any) {
    const template = auto.emailTemplate;
    if (!template) {
      console.warn(`[WorkflowAutomation] Automação ${auto.id} não possui template de e-mail vinculado.`);
      return;
    }

    const config = auto.config as any;
    const destinatario = config.destinatario || dados[config.campoEmail] || dados['email'] || '';

    if (!destinatario) {
      console.warn(`[WorkflowAutomation] Destinatário não identificado para o card.`);
      return;
    }

    console.log(`[WorkflowAutomation] Preparando e-mail para ${destinatario}...`);

    const assunto = this.replaceVariables(template.assunto, dados);
    const corpo = this.replaceVariables(template.corpo, dados);

    await sendEmail({
      to: destinatario,
      subject: assunto,
      html: corpo.replace(/\n/g, '<br/>'), // Converter quebras de linha básicas se for texto puro do Pipefy
      fromName: 'Nacional Hidro | Workflow'
    });
  }

  private replaceVariables(text: string, dados: any): string {
    if (!text) return '';
    try {
      // Usar Mustache para renderização robusta
      return mustache.render(text, dados);
    } catch (error) {
      console.error('[WorkflowAutomation] Erro ao processar template Mustache:', error);
      // Fallback para regex simples se o mustache falhar
      return text.replace(/\{\{(.*?)\}\}/g, (match, key) => {
        return dados[key.trim()] || match;
      });
    }
  }
}

export default new WorkflowAutomationService();
