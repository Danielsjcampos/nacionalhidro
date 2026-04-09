const axios = require('axios');

async function main() {
    const apiUrl = 'https://api.nacionalhidro.com.br';
    const apiKey = '193b71661726cb38ec4c2d422ead2854';
    const instanceName = 'Bruno';

    console.log(`Buscando histórico do grupo na Evolution API...`);
    try {
        const response = await axios.get(
            `${apiUrl}/chat/findMessages/${encodeURIComponent(instanceName)}`,
            { 
               headers: { 'apikey': apiKey },
               data: { where: { remoteJid: '120363405638860459@g.us' } }
            }
        );
        console.log('Mensagens:', response.data);
    } catch (e) {
        console.error('Erro:', e.response?.data || e.message);
    }
}

main();
