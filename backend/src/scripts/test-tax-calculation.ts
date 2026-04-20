import { TaxService } from '../services/taxData.service';

function test() {
    console.log('--- TESTE DE CÁLCULO DE IMPOSTOS (NACIONAL HIDRO) ---');

    console.log('\nCenário 1: Regime Normal (Lucro Presumido) - Valor R$ 10.000,00');
    const resNormal = TaxService.calculateTaxes(10000, 2, 2, 3.5);
    console.log(JSON.stringify(resNormal, null, 2));
    
    // Verificações baseadas no legado:
    // PIS: 10000 * 0.0065 = 65
    // COFINS: 10000 * 0.03 = 300
    // CSLL: 10000 * 0.01 = 100
    // IR: 10000 * 0.01 = 100
    // INSS: 10000 * 0.035 = 350
    // ISS: 10000 * 0.02 = 200
    // Total Retencoes: 65+300+100+100+350+200 = 1115
    // Valor Liquido: 10000 - 1115 = 8885
    
    if (resNormal.valorLiquido === 8885) {
        console.log('✅ Cenário 1: SUCESSO');
    } else {
        console.log(`❌ Cenário 1: FALHA (Esperado 8885, obtido ${resNormal.valorLiquido})`);
    }

    console.log('\nCenário 2: Simples Nacional - Valor R$ 10.000,00');
    const resSimples = TaxService.calculateTaxes(10000, 1, 2, 0);
    console.log(JSON.stringify(resSimples, null, 2));
    
    // Verificações baseadas no legado (Simples não retém federais):
    // PIS/COFINS/CSLL/IR: 0
    // ISS: 10000 * 0.02 = 200
    // Valor Liquido: 10000 - 200 = 9800
    
    if (resSimples.valorLiquido === 9800 && resSimples.valorPIS === 0) {
        console.log('✅ Cenário 2: SUCESSO');
    } else {
        console.log(`❌ Cenário 2: FALHA (Esperado 9800 e PIS 0, obtido ${resSimples.valorLiquido} e PIS ${resSimples.valorPIS})`);
    }
}

test();
