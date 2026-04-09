/**
 * Converte um valor numérico para sua representação por extenso em reais.
 * Portado do sistema legatário Nacional Hidro.
 */
export const numeroExtenso = (vlr: number | string): string => {
  const Num = typeof vlr === 'string' ? parseFloat(vlr) : vlr;
  
  if (isNaN(Num) || Num === 0) {
    return 'zero reais';
  }

  const inteiro = Math.floor(Num);
  if (inteiro >= 1000000000000000) {
    return 'valor muito alto';
  }

  let resto = parseFloat((Num - inteiro).toFixed(2)) * 100;
  const vlrS = inteiro.toString();
  const cont = vlrS.length;
  
  let extenso = "";

  const unidade = [
    "", "um", "dois", "três", "quatro", "cinco",
    "seis", "sete", "oito", "nove", "dez", "onze",
    "doze", "treze", "quatorze", "quinze", "dezesseis",
    "dezessete", "dezoito", "dezenove"
  ];

  const centena = [
    "", "cem", "duzentos", "trezentos",
    "quatrocentos", "quinhentos", "seiscentos",
    "setecentos", "oitocentos", "novecentos"
  ];

  const dezena = [
    "", "", "vinte", "trinta", "quarenta", "cinquenta",
    "sessenta", "setenta", "oitenta", "noventa"
  ];

  const qualificaS = ["reais", "mil", "milhão", "bilhão", "trilhão", "real"];
  const qualificaP = ["reais", "mil", "milhões", "bilhões", "trilhões"];

  for (let i = cont; i > 0; i--) {
    let auxnumero = 0;
    let auxnumero2 = "";
    let auxnumero3 = "";

    if ((i === 14) || (i === 11) || (i === 8) || (i === 5) || (i === 2)) {
      auxnumero2 = vlrS.substr(cont - i, 2);
      auxnumero = parseInt(auxnumero2);
    } else {
      auxnumero2 = vlrS.substr(cont - i, 1);
      auxnumero = parseInt(auxnumero2);
    }

    if ((i === 15) || (i === 12) || (i === 9) || (i === 6) || (i === 3)) {
      extenso = extenso + centena[auxnumero];
      auxnumero2 = vlrS.substr(cont - i + 1, 1);
      auxnumero3 = vlrS.substr(cont - i + 2, 1);

      if ((auxnumero2 !== "0") || (auxnumero3 !== "0")) extenso += " e ";
    } else if (auxnumero > 19) {
      auxnumero2 = vlrS.substr(cont - i, 1);
      auxnumero = parseInt(auxnumero2);
      extenso = extenso + dezena[auxnumero];
      auxnumero3 = vlrS.substr(cont - i + 1, 1);

      if ((auxnumero3 !== "0") && (auxnumero2 !== "0")) extenso += " e ";
    } else if ((auxnumero <= 19) && (auxnumero > 9) && ((i === 14) || (i === 11) || (i === 8) || (i === 5) || (i === 2))) {
      extenso = extenso + unidade[auxnumero];
    } else if ((auxnumero < 10) && ((i === 13) || (i === 10) || (i === 7) || (i === 4) || (i === 1))) {
      auxnumero3 = vlrS.substr(cont - i - 1, 1);
      if (auxnumero !== 0) {
          extenso = extenso + unidade[auxnumero];
      }
    }

    if (i % 3 === 1) {
      let verifica1 = "";
      const verifica3 = cont - i;
      if (verifica3 === 0) verifica1 = vlrS.substr(cont - i, 1);
      else if (verifica3 === 1) verifica1 = vlrS.substr(cont - i - 1, 2);
      else if (verifica3 > 1) verifica1 = vlrS.substr(cont - i - 2, 3);

      const verifica2 = parseInt(verifica1);

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
        if (verifica2 === 1 && cont === 1) extenso = `${extenso} ${qualificaS[5]} `;
        else extenso = `${extenso} ${qualificaP[0]} `;
      }
    }
  }

  // Centavos logic
  const cent = Math.round(resto);
  if (cent > 0) {
      if (extenso !== "") extenso += " e ";
      
      if (cent <= 19) {
          extenso += `${unidade[cent]} centavos`;
      } else {
          const aexCent = Math.floor(cent / 10);
          const restCent = cent % 10;
          extenso += `${dezena[aexCent]}`;
          if (restCent !== 0) {
              extenso += ` e ${unidade[restCent]} centavos`;
          } else {
              extenso += " centavos";
          }
      }
  }

  return extenso.trim().replace(/\s+/g, ' ');
};
