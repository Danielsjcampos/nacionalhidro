import prisma from '../lib/prisma';
import { enviarMensagemWhatsApp } from './whatsapp.service';

// Default tasks template
const TAREFAS_PADRAO = [
  { area: 'SUPRIMENTOS', responsavel: 'Josi', descricao: 'Separar Hotel' },
  { area: 'SUPRIMENTOS', responsavel: 'Josi', descricao: 'Alimentação e Lavanderia' },
  { area: 'RH', responsavel: 'Vivi', descricao: 'Documentos e integração' },
  { area: 'SEGURANCA', responsavel: null, descricao: 'Conferir EPIs e documentação da equipe' },
  { area: 'SEGURANCA', responsavel: null, descricao: 'Buscar procedimentos de atendimento do cliente' },
  { area: 'SUPERVISAO', responsavel: null, descricao: 'Separar nomes da equipe para o atendimento' },
  { area: 'SUPERVISAO', responsavel: null, descricao: 'Conferir caminhão' },
  { area: 'LOGISTICA', responsavel: null, descricao: 'Enviar placa no e-mail para liberação' },
  { area: 'LOGISTICA', responsavel: null, descricao: 'Gerar Ordem de Serviço' },
  { area: 'OPERACIONAL', responsavel: 'Adriano', descricao: 'Montar equipamentos' },
  { area: 'OPERACIONAL', responsavel: 'Harada', descricao: 'Conferir itens da equipe operacional' },
];

export function getTarefasPadrao(propostaCodigo?: string) {
  return TAREFAS_PADRAO.map(t => ({
    ...t,
    descricao: t.descricao === 'Gerar Ordem de Serviço' && propostaCodigo
      ? `Gerar Ordem de Serviço ref. Proposta ${propostaCodigo}`
      : t.descricao
  }));
}

function fmtData(d: Date | string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}

export function gerarMensagemAgendamento(agendamento: any, isReagendamento = false): string {
  const tag = isReagendamento ? '🔄 REAGENDAMENTO' : '🚩🚩🚩🚩🚩 AGENDAMENTO SERVIÇOS';

  const contatos = (() => {
    try {
      const arr = JSON.parse(agendamento.contatosExtras || '[]');
      return arr.map((c: any) => `${c.nome}${c.depto ? ' (' + c.depto + ')' : ''} - ${c.tel}`).join('\n');
    } catch { return agendamento.contatosExtras || ''; }
  })();

  const tarefasText = (agendamento.tarefas || [])
    .map((t: any) => `☐ *${t.responsavel || t.area}* → ${t.descricao}`)
    .join('\n');

  const integracaoMap: Record<string, string> = {
    'NO_DIA': 'Será realizado no dia de início das atividades',
    'ANTES': 'Antes do início — enviar documentação com antecedência',
    'JA_ATIVA': 'Integração já ativa',
    'NAO_NECESSARIA': 'Não necessária',
  };

  return `${tag}

✅ *DADOS CLIENTE*
*NOME:* ${agendamento.cliente?.nome || '—'}

✅ *CIDADE*
${agendamento.cidadeServico}

✅ *DATA INÍCIO*
${fmtData(agendamento.dataInicio)}${agendamento.duracaoDias ? `\nDuração de ${String(agendamento.duracaoDias).padStart(2, '0')} dias` : ''}${agendamento.dataTermino ? `\nTérmino: ${fmtData(agendamento.dataTermino)}` : ''}

${agendamento.equipeSummary || ''}

${agendamento.tipoAtividade || ''}

✅ *DATA VIAGEM*
${fmtData(agendamento.dataViagem)}

✅ *CONTATO:*
${contatos || agendamento.cliente?.telefone || '—'}

✅ *E-mail*
${agendamento.cliente?.email || '—'}

✅ *TIPO ATIVIDADE:*
${agendamento.tipoAtividade || '—'}
${agendamento.turno ? `Turno: ${agendamento.turno}` : ''}

✅ *Equipe:*
${agendamento.equipeSummary || '—'}

✅ *INTEGRAÇÃO*
${integracaoMap[agendamento.tipoIntegracao] || agendamento.tipoIntegracao || '—'}

✅ *FORNECIMENTOS NH.*
${agendamento.fornecimentosNH || '—'}

✅ *FORNEC. CLIENTE.*
${agendamento.fornecimentosCliente || '—'}
${agendamento.observacoes ? `\n✅ *OBSERVAÇÕES*\n${agendamento.observacoes}` : ''}

━━━━━━━━━━━━━━━━━━━━━
✅ *EQUIPE NH — TAREFAS POR ÁREA:*

${tarefasText}
━━━━━━━━━━━━━━━━━━━━━`.trim();
}

export async function dispararAgendamento(agendamentoId: string, groupId?: string) {
  const agendamento = await prisma.agendamento.findUnique({
    where: { id: agendamentoId },
    include: { cliente: true, proposta: true, tarefas: true }
  });

  if (!agendamento) throw new Error('Agendamento não encontrado');

  const isReagendamento = agendamento.status === 'EM_REVISAO';
  const mensagem = gerarMensagemAgendamento(agendamento, isReagendamento);

  // WhatsApp dispatch
  const whatsappGroupId = groupId || process.env.WHATSAPP_GROUP_AGENDAMENTO_ID;
  let whatsappOk = false;
  if (whatsappGroupId) {
    try {
      await enviarMensagemWhatsApp(whatsappGroupId, mensagem);
      whatsappOk = true;
    } catch (e) {
      console.error('[Agendamento] Erro ao enviar WhatsApp:', e);
    }
  }

  // Update status
  await prisma.agendamento.update({
    where: { id: agendamentoId },
    data: {
      status: 'DISPARADO',
      disparadoWhatsapp: whatsappOk,
      disparadoEm: new Date(),
    }
  });

  return { mensagem, whatsappOk };
}
