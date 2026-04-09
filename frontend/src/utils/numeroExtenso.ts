/**
 * Converts a numeric value (BRL) to its written form in Portuguese.
 * Ported from legacy nhidro.front/src/utility/number/index.js
 *
 * Example: 1250.50 → "um mil duzentos e cinquenta reais e cinquenta centavos"
 */
export function numeroExtenso(vlr: number | string): string {
  const Num = parseFloat(String(vlr));
  if (isNaN(Num) || Num === 0) return 'zero reais';

  const inteiro = Math.floor(Math.abs(Num));
  if (inteiro >= 1000000000000000) return String(Num);

  let resto = Math.round((Math.abs(Num) - inteiro) * 100);
  const vlrS = inteiro.toString();
  const cont = vlrS.length;
  let extenso = '';

  const unidade = [
    '', 'um', 'dois', 'três', 'quatro', 'cinco',
    'seis', 'sete', 'oito', 'nove', 'dez', 'onze',
    'doze', 'treze', 'quatorze', 'quinze', 'dezesseis',
    'dezessete', 'dezoito', 'dezenove',
  ];

  const centena = [
    '', 'cem', 'duzentos', 'trezentos',
    'quatrocentos', 'quinhentos', 'seiscentos',
    'setecentos', 'oitocentos', 'novecentos',
  ];

  const dezena = [
    '', '', 'vinte', 'trinta', 'quarenta', 'cinquenta',
    'sessenta', 'setenta', 'oitenta', 'noventa',
  ];

  const qualificaS = ['reais', 'mil', 'milhão', 'bilhão', 'trilhão', 'real'];
  const qualificaP = ['reais', 'mil', 'milhões', 'bilhões', 'trilhões'];

  for (let i = cont; i > 0; i--) {
    let verifica1 = '';
    let verifica2 = 0;
    let verifica3 = 0;
    let auxnumero2 = '';
    let auxnumero = 0;
    auxnumero2 = vlrS.substr(cont - i, 1);
    auxnumero = parseInt(auxnumero2, 10);

    if (i === 14 || i === 11 || i === 8 || i === 5 || i === 2) {
      auxnumero2 = vlrS.substr(cont - i, 2);
      auxnumero = parseInt(auxnumero2, 10);
    }

    if (i === 15 || i === 12 || i === 9 || i === 6 || i === 3) {
      extenso = extenso + centena[auxnumero];
      const auxnumero2Check = vlrS.substr(cont - i + 1, 1);
      const auxnumero3Check = vlrS.substr(cont - i + 2, 1);
      if (auxnumero2Check !== '0' || auxnumero3Check !== '0') extenso += ' e ';
    } else if (auxnumero > 19) {
      auxnumero2 = vlrS.substr(cont - i, 1);
      auxnumero = parseInt(auxnumero2, 10);
      extenso = extenso + dezena[auxnumero];
      const auxnumero3Check = vlrS.substr(cont - i + 1, 1);
      if (auxnumero3Check !== '0' && auxnumero2 !== '1') extenso += ' e ';
    } else if (auxnumero <= 19 && auxnumero > 9 && (i === 14 || i === 11 || i === 8 || i === 5 || i === 2)) {
      extenso = extenso + unidade[auxnumero];
    } else if (auxnumero < 10 && (i === 13 || i === 10 || i === 7 || i === 4 || i === 1)) {
      const auxnumero3Check = vlrS.substr(cont - i - 1, 1);
      if (auxnumero3Check !== '') extenso = extenso + unidade[auxnumero];
    }

    if (i % 3 === 1) {
      verifica3 = cont - i;
      if (verifica3 === 0) verifica1 = vlrS.substr(cont - i, 1);
      if (verifica3 === 1) verifica1 = vlrS.substr(cont - i - 1, 2);
      if (verifica3 > 1) verifica1 = vlrS.substr(cont - i - 2, 3);

      verifica2 = parseInt(verifica1, 10);

      if (i === 13) {
        if (verifica2 === 1) extenso = `${extenso} ${qualificaS[4]} `;
        else if (verifica2 !== 0) extenso = `${extenso} ${qualificaP[4]} `;
      }
      if (i === 10) {
        if (verifica2 === 1) extenso = `${extenso} ${qualificaS[3]} `;
        else if (verifica2 !== 0) extenso = `${extenso} ${qualificaP[3]} `;
      }
      if (i === 7) {
        if (verifica2 === 1) extenso = `${extenso} ${qualificaS[2]} `;
        else if (verifica2 !== 0) extenso = `${extenso} ${qualificaP[2]} `;
      }
      if (i === 4) {
        if (verifica2 === 1) extenso = `${extenso} ${qualificaS[1]} `;
        else if (verifica2 !== 0) extenso = `${extenso} ${qualificaP[1]} `;
      }
      if (i === 1) {
        if (verifica2 === 1) extenso = `${extenso} ${qualificaS[5]} `;
        else extenso = `${extenso} ${qualificaP[0]} `;
      }
    }
  }

  if (resto > 0 && resto <= 19) {
    extenso += ` e ${unidade[resto]} centavos`;
  } else if (resto > 19) {
    const aexCent = Math.floor(resto / 10);
    extenso += ` e ${dezena[aexCent]}`;
    resto = resto - aexCent * 10;
    if (resto !== 0) extenso += ` e ${unidade[resto]} centavos`;
    else extenso += ' centavos';
  }

  return extenso.replace(/\s+/g, ' ').trim();
}
