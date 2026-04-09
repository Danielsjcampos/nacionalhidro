const axios = require('axios');

async function main() {
    // These were found in the user's latest message and screenshot
    const apiUrl = 'https://api.nacionalhidro.com.br';
    const apiKey = '193b71661726cb38ec4c2d422ead2854';
    const instanceName = 'Bruno'; // As seen in the screenshot
    const groupId = '120363405638860459@g.us';

    const mensagem = `💬 Veio pelo *botão de WhatsApp* do site!\n*NOVO LEAD* 📢\n\n*Nome:* wesley santos\n*Email:* wesley.santos@sannor.com.br\n*Empresa:* Sannor Engenharia\n*Whatsapp:* https://wa.me/5511996965036\n*Mensagem:* preciso de limpeza `;
    
    console.log(`Enviando mensagem para o grupo ${groupId} usando a instância: ${instanceName}...`);
    try {
        const msgResponse = await axios.post(
            `${apiUrl}/message/sendText/${encodeURIComponent(instanceName)}`,
            { number: groupId, text: mensagem },
            { headers: { 'apikey': apiKey, 'Content-Type': 'application/json' } }
        );
        console.log('Sucesso no envio:', msgResponse.data);
    } catch (e) {
        console.error('Erro na API Evolution:', e.response?.data || e.message);
    }
}

main();
