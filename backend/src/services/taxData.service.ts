import { Prisma } from '@prisma/client';

export interface TaxCalculationResult {
    valorBruto: number;
    valorPIS: number;
    valorCOFINS: number;
    valorCSLL: number;
    valorIR: number;
    valorINSS: number;
    valorISS: number;
    valorLiquido: number;
    aliquotaPIS: number;
    aliquotaCOFINS: number;
    aliquotaCSLL: number;
    aliquotaIR: number;
    aliquotaINSS: number;
    aliquotaISS: number;
}

/**
 * Regimes Tributários:
 *   1 = Simples Nacional → PIS/COFINS/IR/CSLL = 0 (só ISS e INSS manual)
 *   2 = Lucro Presumido  → PIS 0.65%, COFINS 3%, IR 1.5%, CSLL 1%
 *   3 = Lucro Real        → PIS 0.65%, COFINS 3%, IR 1.5%, CSLL 1%
 *
 * INSS: sempre manual (preenchido pelo usuário)
 * ISS:  alíquota configurável por município (preenchida pelo usuário)
 */
export class TaxService {
    static calculateTaxes(
        valorBruto: number,
        regimeTributario: number = 1,
        aliquotaIss: number = 2,
        aliquotaInss: number = 0
    ): TaxCalculationResult {
        const bruto = Number(valorBruto);

        // Alíquotas federais por regime (Lucro Presumido/Real)
        let aPIS = 0.0065;    // 0.65%
        let aCOFINS = 0.03;   // 3%
        let aCSLL = 0.01;     // 1%
        let aIR = 0.015;      // 1.5%
        let aINSS = Number(aliquotaInss) / 100;
        let aISS = Number(aliquotaIss) / 100;

        // Simples Nacional: zera impostos federais retidos
        if (regimeTributario === 1) {
            aPIS = 0;
            aCOFINS = 0;
            aCSLL = 0;
            aIR = 0;
        }

        const valorPIS = bruto * aPIS;
        const valorCOFINS = bruto * aCOFINS;
        const valorCSLL = bruto * aCSLL;
        const valorIR = bruto * aIR;
        const valorINSS = bruto * aINSS;
        const valorISS = bruto * aISS;

        const totalRetencoes = valorPIS + valorCOFINS + valorCSLL + valorIR + valorINSS + valorISS;
        const valorLiquido = bruto - totalRetencoes;

        return {
            valorBruto: bruto,
            valorPIS: Number(valorPIS.toFixed(2)),
            valorCOFINS: Number(valorCOFINS.toFixed(2)),
            valorCSLL: Number(valorCSLL.toFixed(2)),
            valorIR: Number(valorIR.toFixed(2)),
            valorINSS: Number(valorINSS.toFixed(2)),
            valorISS: Number(valorISS.toFixed(2)),
            valorLiquido: Number(valorLiquido.toFixed(2)),
            aliquotaPIS: aPIS * 100,
            aliquotaCOFINS: aCOFINS * 100,
            aliquotaCSLL: aCSLL * 100,
            aliquotaIR: aIR * 100,
            aliquotaINSS: aINSS * 100,
            aliquotaISS: aISS * 100
        };
    }
}

