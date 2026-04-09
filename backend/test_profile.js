const axios = require('axios');

async function main() {
    const apiUrl = 'https://api.nacionalhidro.com.br';
    const apiKey = '193b71661726cb38ec4c2d422ead2854';
    const instanceName = 'Bruno';

    console.log(`Buscando telefone do bot na Evolution API...`);
    try {
        const response = await axios.get(
            `${apiUrl}/instance/connectionState/${encodeURIComponent(instanceName)}`,
            { headers: { 'apikey': apiKey } }
        );
        console.log('Dados da Conexão (Para saber o Numero):', JSON.stringify(response.data, null, 2));
    } catch (e) {
        console.error('Erro:', e.response?.data || e.message);
    }
}

main();
