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
  clienteId?: string,
  veiculoId?: string
): Promise<AvailabilityResult> => {
  const func = await prisma.funcionario.findUnique({
    where: { id: funcionarioId }
  });

  if (!func) {
    return { disponivel: false, motivoIndisponibilidade: 'Funcionário não encontrado.' };
  }

  // 1. Validar Status do RH (Férias, Atestado, Desligado)
  const statusCriticos = ['FERIAS', 'ATESTADO', 'AFASTADO', 'DESLIGADO'];
  if (statusCriticos.includes(func.status) || !func.ativo) {
    return { 
      disponivel: false, 
      motivoIndisponibilidade: `Funcionário com status impeditivo no RH: ${func.status || 'INATIVO'}` 
    };
  }

  // 2. Verificar CNH para Motoristas/Operadores
  const isMotorista = func.cargo.toLowerCase().includes('motorista') || func.cargo.toLowerCase().includes('operador');
  if (isMotorista) {
    if (!func.dataVencimentoCNH) {
      return { disponivel: false, motivoIndisponibilidade: 'Motorista sem data de vencimento de CNH cadastrada.' };
    }
    if (new Date(func.dataVencimentoCNH) < new Date()) {
      return { disponivel: false, motivoIndisponibilidade: `CNH Vencida em ${new Date(func.dataVencimentoCNH).toLocaleDateString('pt-BR')}.` };
    }

    // Verificar MOPP se o veículo for um caminhão ou similar
    if (veiculoId) {
        const veiculo = await prisma.veiculo.findUnique({ where: { id: veiculoId } });
        if (veiculo && (veiculo.tipo === 'CAMINHAO' || veiculo.tipoEquipamento?.includes('VACUO'))) {
            if (!func.mopp) {
                return { disponivel: false, motivoIndisponibilidade: 'Este veículo exige motorista com certificado MOPP ativo.' };
            }
        }
    }
  }

  // 3. Se uma data específica for passada, verificar os afastamentos detalhados
  if (dataString) {
    const checkDate = new Date(dataString);
    const afastamento = await (prisma as any).afastamento.findFirst({
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

  // 4. Verificar ASO
  const aso = await prisma.aSOControle.findFirst({
    where: { funcionarioId },
    orderBy: { dataVencimento: 'desc' }
  });

  result.aso = {
    existe: !!aso,
    status: checkStatus(aso?.dataVencimento),
    vencimento: aso?.dataVencimento || undefined
  };

  if (result.aso.status === 'VENCIDO' || result.aso.status === 'INEXISTENTE') {
    return { 
      disponivel: false, 
      motivoIndisponibilidade: `ASO (Atestado Saúde Ocupacional) ${result.aso.status === 'VENCIDO' ? 'Vencido' : 'Pendente'}.` 
    };
  }

  // 5. Verificar Integração com Cliente
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
