import prisma from '../lib/prisma';

interface AvailabilityResult {
  disponivel: boolean;
  motivoIndisponibilidade?: string;
  integracao?: {
    existe: boolean;
    status: 'OK' | 'VENCENDO' | 'VENCIDO' | 'INEXISTENTE';
    vencimento?: Date;
  };
  aso?: {
    existe: boolean;
    status: 'OK' | 'VENCENDO' | 'VENCIDO' | 'INEXISTENTE';
    vencimento?: Date;
  };
}

export const checkEmployeeAvailability = async (
  funcionarioId: string,
  dataString?: string | Date,
  clienteId?: string
): Promise<AvailabilityResult> => {
  const func = await prisma.funcionario.findUnique({
    where: { id: funcionarioId }
  });

  if (!func) {
    return { disponivel: false, motivoIndisponibilidade: 'Funcionário não encontrado.' };
  }

  // 1. Validar Status do RH (Férias, Atestado, Desligado)
  const statusCriticos = ['FERIAS', 'ATESTADO', 'AFASTADO', 'DESLIGADO'];
  if (statusCriticos.includes(func.status)) {
    return { 
      disponivel: false, 
      motivoIndisponibilidade: `Funcionário com status impeditivo no RH: ${func.status}` 
    };
  }

  // Se uma data específica for passada, verificar os afastamentos detalhados (ex: período de férias agendado)
  if (dataString) {
    const checkDate = new Date(dataString);
    const afastamento = await prisma.afastamento.findFirst({
      where: {
        funcionarioId,
        dataInicio: { lte: checkDate },
        dataFim: { gte: checkDate }
      }
    });

    if (afastamento) {
      return { 
        disponivel: false, 
        motivoIndisponibilidade: `Funcionário em ${afastamento.tipo} no período solicitado.` 
      };
    }
  }

  const now = new Date();
  const checkStatus = (vencimento: Date | null | undefined) => {
    if (!vencimento) return 'INEXISTENTE';
    const diff = Math.floor((vencimento.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'VENCIDO';
    if (diff <= 30) return 'VENCENDO';
    return 'OK';
  };

  const result: AvailabilityResult = {
    disponivel: true,
  };

  // 2. Verificar ASO
  const aso = await prisma.aSOControle.findFirst({
    where: { funcionarioId },
    orderBy: { dataVencimento: 'desc' }
  });

  result.aso = {
    existe: !!aso,
    status: checkStatus(aso?.dataVencimento),
    vencimento: aso?.dataVencimento || undefined
  };

  if (result.aso.status === 'VENCIDO') {
    return { 
      disponivel: false, 
      motivoIndisponibilidade: 'Atestado de Saúde Ocupacional (ASO) Vencido.' 
    };
  }

  // 3. Verificar Integração com Cliente (se o cliente final foi fornecido)
  if (clienteId && clienteId !== 'undefined' && clienteId !== 'null') {
    const integracao = await prisma.integracaoCliente.findFirst({
      where: {
        funcionarioId,
        clienteId
      },
      orderBy: { dataVencimento: 'desc' }
    });

    result.integracao = {
      existe: !!integracao,
      status: checkStatus(integracao?.dataVencimento),
      vencimento: integracao?.dataVencimento || undefined
    };

    if (result.integracao.status === 'VENCIDO' || result.integracao.status === 'INEXISTENTE') {
      return { 
        disponivel: false, 
        motivoIndisponibilidade: `Integração de Segurança para o cliente pendente ou vencida.` 
      };
    }
  }

  return result;
};
