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

export class TaxService {
    /**
     * Calcula os impostos retidos baseados na lógica legada da Nacional Hidro.
     * Alíquotas: PIS 0.65%, COFINS 3%, CSLL 1%, IR 1%.
     * Se Simples Nacional (regime === 1), retira PIS, COFINS, CSLL e IR.
     */
    static calculateTaxes(
        valorBruto: number,
        regimeTributario: number = 1, // Default para Simples Nacional se não informado
        aliquotaIss: number = 2,      // Default para Campinas
        aliquotaInss: number = 0      // Default sem retenção
    ): TaxCalculationResult {
        const bruto = Number(valorBruto);
        
        // Alíquotas Fixas (conforme legado)
        let aPIS = 0.0065;
        let aCOFINS = 0.03;
        let aCSLL = 0.01;
        let aIR = 0.01;
        let aINSS = Number(aliquotaInss) / 100;
        let aISS = Number(aliquotaIss) / 100;

        // Se Simples Nacional, os federais são zero (conforme legado ModalEdicaoFaturamento.js)
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
