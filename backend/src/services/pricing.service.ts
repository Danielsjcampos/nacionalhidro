import prisma from '../lib/prisma';

export interface AutoCalcParams {
    valorDiaria?: number | null;
    valorHora?: number | null;
    toleranciaHoras?: number | null;
    entrada?: string | null;
    saida?: string | null;
    almoco?: string | null;
    franquia?: string | null;
    valorHoraExtra?: number | null;
    aplicarMinimoHE?: boolean;
}

function timeToDecimal(timeStr: string): number {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) + (m || 0) / 60;
}

function calcularHorasTrabalhadas(entrada: Date, saida: Date, almocoDecimal: number): number {
    let diffMs = saida.getTime() - entrada.getTime();
    return Math.max(0, (diffMs / (1000 * 60 * 60)) - almocoDecimal);
}

function isNoturno(entrada: Date, saida: Date): { isNoturno: boolean; horasNoturnas: number } {
    const startMs = entrada.getTime();
    const endMs = saida.getTime();
    let horasNoturnas = 0;

    for (let t = startMs; t < endMs; t += 3600000) {
        const h = new Date(t).getHours();
        if (h >= 22 || h < 5) {
            horasNoturnas += 1;
        }
    }
    return { isNoturno: horasNoturnas > 0, horasNoturnas: Math.min(horasNoturnas, (endMs - startMs) / 3600000) };
}

function isFDS(data: Date): boolean {
    const dia = data.getDay();
    return dia === 0 || dia === 6; // Sunday or Saturday
}

export const PricingService = {
    autoCalcularItens: async (osId: string, params: AutoCalcParams) => {
        const {
            valorDiaria, valorHora, toleranciaHoras, entrada, saida, almoco,
            franquia, valorHoraExtra, aplicarMinimoHE = true
        } = params;

        let os = await prisma.ordemServico.findUnique({
            where: { id: osId },
            include: { itensCobranca: true, proposta: true }
        });

        if (!os) throw new Error('OS não encontrada');

        if (entrada || saida) {
            os = await prisma.ordemServico.update({
                where: { id: osId },
                data: {
                    entrada: entrada ? new Date(entrada) : os.entrada,
                    saida: saida ? new Date(saida) : os.saida,
                },
                include: { itensCobranca: true, proposta: true }
            });
        }

        if (!os.entrada || !os.saida) {
            throw new Error('OS precisa ter horários de entrada e saída');
        }

        await prisma.itemCobranca.deleteMany({ where: { osId } });

        const entradaDate = new Date(os.entrada);
        const saidaDate = new Date(os.saida);
        const almocoDec = timeToDecimal(almoco || '01:00');

        const prop = os.proposta;
        const franquiaVal = franquia || (prop?.franquiaHoras?.toString()) || '08:00';
        const franquiaDec = timeToDecimal(franquiaVal);

        const horasTrabalhadas = calcularHorasTrabalhadas(entradaDate, saidaDate, almocoDec);
        const tolerancia = toleranciaHoras ? Number(toleranciaHoras) : 0;
        const vDiaria = valorDiaria ? Number(valorDiaria) : 0;
        const vHora = valorHora ? Number(valorHora) : 0;

        const pctHe = prop?.adicionalHoraExtra ? Number(prop.adicionalHoraExtra) : 50;
        const vHoraExtra = valorHoraExtra ? Number(valorHoraExtra) : (vHora * (1 + pctHe / 100));

        const itemsToCreate: any[] = [];

        if (vDiaria > 0) {
            itemsToCreate.push({
                osId,
                descricao: 'Diária',
                quantidade: 1,
                valorUnitario: vDiaria,
                valorTotal: vDiaria
            });
        } else if (vHora > 0) {
            const horasBase = Math.min(horasTrabalhadas, franquiaDec);
            itemsToCreate.push({
                osId,
                descricao: `Horas Normais (Franquia ${franquia || '08:00'}h)`,
                quantidade: parseFloat(horasBase.toFixed(2)),
                valorUnitario: vHora,
                valorTotal: parseFloat((horasBase * vHora).toFixed(2))
            });
        }

        const horasExcedentes = Math.max(0, horasTrabalhadas - franquiaDec - tolerancia);

        if (horasExcedentes > 0) {
            let qtyHE = parseFloat(horasExcedentes.toFixed(2));

            if (aplicarMinimoHE && qtyHE < 2.0) {
                qtyHE = 2.0;
            }

            itemsToCreate.push({
                osId,
                descricao: qtyHE > parseFloat(horasExcedentes.toFixed(2))
                    ? `Hora Extra (Mínimo 2h - Real: ${horasExcedentes.toFixed(2)}h)`
                    : 'Hora Extra',
                quantidade: qtyHE,
                valorUnitario: vHoraExtra,
                valorTotal: parseFloat((qtyHE * vHoraExtra).toFixed(2))
            });
        }

        const noturnoInfo = isNoturno(entradaDate, saidaDate);
        if (noturnoInfo.isNoturno && noturnoInfo.horasNoturnas > 0 && vHora > 0) {
            const pctNoturno = prop?.adicionalNoturno ? Number(prop.adicionalNoturno) : 35;
            itemsToCreate.push({
                osId,
                descricao: `Adicional Noturno (${pctNoturno}%)`,
                quantidade: parseFloat(noturnoInfo.horasNoturnas.toFixed(2)),
                valorUnitario: vHora,
                percentualAdicional: pctNoturno,
                valorTotal: parseFloat((noturnoInfo.horasNoturnas * vHora * (pctNoturno / 100)).toFixed(2))
            });
        }

        if (isFDS(entradaDate) && vHora > 0) {
            const pctFds = prop?.adicionalFimSemana ? Number(prop.adicionalFimSemana) : 100;
            itemsToCreate.push({
                osId,
                descricao: `Adicional Fim de Semana (${pctFds}%)`,
                quantidade: parseFloat(horasTrabalhadas.toFixed(2)),
                valorUnitario: vHora,
                percentualAdicional: pctFds,
                valorTotal: parseFloat((horasTrabalhadas * vHora * (pctFds / 100)).toFixed(2))
            });
        }

        for (const item of itemsToCreate) {
            await prisma.itemCobranca.create({ data: item });
        }

        const total = itemsToCreate.reduce((sum, i) => sum + i.valorTotal, 0);
        await prisma.ordemServico.update({
            where: { id: osId },
            data: {
                valorPrecificado: parseFloat(total.toFixed(2)),
                horasTotais: parseFloat(horasTrabalhadas.toFixed(2)),
                horasAdicionais: parseFloat(horasExcedentes.toFixed(2))
            }
        });

        return {
            osId,
            totalCalculado: parseFloat(total.toFixed(2)),
            detalhes: {
                horasTrabalhadas: parseFloat(horasTrabalhadas.toFixed(2)),
                horasExcedentes: parseFloat(horasExcedentes.toFixed(2)),
                horasNoturnas: noturnoInfo.horasNoturnas,
                isFDS: isFDS(entradaDate)
            }
        };
    }
};
