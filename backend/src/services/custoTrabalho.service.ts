import prisma from '../lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

export class CustoTrabalhoService {
    /**
     * Calcula o custo de mão de obra alocado por Centro de Custo em um período
     */
    static async calcularAlocacaoCusto(dataInicio: string, dataFim: string) {
        const start = new Date(dataInicio);
        const end = new Date(dataFim);
        end.setHours(23, 59, 59, 999);

        // 1. Buscar todos os pontos no período
        const pontos = await (prisma as any).pontoEletronico.findMany({
            where: {
                data: { gte: start, lte: end }
            },
            include: {
                // Infelizmente o schema não tem relação direta, usaremos o ID do funcionário para buscar depois
            }
        });

        // 2. Buscar Escalas no período para mapear Funcionario -> OS -> CentroCusto
        const escalas = await prisma.escala.findMany({
            where: {
                data: { gte: start, lte: end }
            }
        });

        // 3. Buscar Funcionários para obter salários
        const funcionarios = await prisma.funcionario.findMany({
            select: { id: true, nome: true, salario: true }
        });
        const funcMap = new Map(funcionarios.map(f => [f.id, f]));

        // 4. Mapear Escalas: Date -> FuncionarioId -> OS (Centro Custo)
        const alocacaoMap = new Map<string, string>(); // "yyyy-mm-dd_funcId" -> osCodigo
        escalas.forEach(escala => {
            const dateStr = escala.data.toISOString().split('T')[0];
            if (Array.isArray(escala.funcionarios)) {
                (escala.funcionarios as any[]).forEach(f => {
                    alocacaoMap.set(`${dateStr}_${f.id}`, (escala as any).codigoOS);
                });
            }
        });

        // 5. Agregar Custos
        const custoPorCentro = new Map<string, number>();
        let custoNaoAlocado = 0;

        for (const ponto of pontos) {
            const dateStr = new Date(ponto.data).toISOString().split('T')[0];
            const func = funcMap.get(ponto.funcionarioId);
            if (!func) continue;

            const horas = Number(ponto.horasTrabalhadas || 0) + Number(ponto.horasExtras || 0);
            if (horas <= 0) continue;

            // Cálculo simplificado: Salário / 220h
            const valorHora = Number(func.salario || 0) / 220;
            const custoDia = horas * valorHora;

            const osCodigo = alocacaoMap.get(`${dateStr}_${ponto.funcionarioId}`);

            if (osCodigo) {
                const current = custoPorCentro.get(osCodigo) || 0;
                custoPorCentro.set(osCodigo, current + custoDia);
            } else {
                custoNaoAlocado += custoDia;
            }
        }

        return {
            periodo: { start, end },
            porOS: Object.fromEntries(custoPorCentro),
            naoAlocado: Math.round(custoNaoAlocado * 100) / 100,
            total: Math.round((Array.from(custoPorCentro.values()).reduce((a, b) => a + b, 0) + custoNaoAlocado) * 100) / 100
        };
    }
}
