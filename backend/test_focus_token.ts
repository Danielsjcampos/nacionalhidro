import axios from 'axios';

const tokens = [
  { cnpj: '04.315.038/0001-04', nome: 'NACIONAL HIDROSANEAMENTO', token: '7NSFiEC3NV2NO5CwUSoG2Vjhvk0p0zZn' },
  { cnpj: '24.840.094/0001-75', nome: 'NACIONALHIDRO LOCAÇÃO', token: 'zfMkVK6cZPAuFo0qRaJkCQH3OPcijlMN' },
];

async function testToken(empresa: typeof tokens[0], ambiente: string) {
  const baseURL = `https://${ambiente}/v2`;
  try {
    // Consulta uma ref inexistente - se 401 = token errado, se 404 = token OK
    const res = await axios.get(`${baseURL}/nfse/test_ref_naoexiste`, {
      auth: { username: empresa.token, password: '' },
      timeout: 10000,
    });
    console.log(`✅ ${empresa.nome} | ${ambiente} | Status: ${res.status}`);
  } catch (err: any) {
    const status = err.response?.status;
    if (status === 404) {
      console.log(`✅ ${empresa.nome} | ${ambiente} | Token VÁLIDO (404 = ref não existe, auth OK)`);
    } else if (status === 401 || status === 403) {
      console.log(`❌ ${empresa.nome} | ${ambiente} | Token INVÁLIDO (${status})`);
    } else {
      console.log(`⚠️  ${empresa.nome} | ${ambiente} | Status: ${status} | ${err.response?.data?.mensagem || err.message}`);
    }
  }
}

async function main() {
  console.log('=== TESTANDO TOKENS DA FOCUS NFE ===\n');
  
  for (const emp of tokens) {
    console.log(`--- ${emp.nome} (${emp.cnpj}) ---`);
    await testToken(emp, 'api.focusnfe.com.br');
    await testToken(emp, 'homologacao.focusnfe.com.br');
    console.log('');
  }
}

main();
