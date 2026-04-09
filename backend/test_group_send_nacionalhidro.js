const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "postgresql://neondb_owner:npg_fRoHJYqn1jk5@ep-ancient-union-acm8qdvg-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
        }
    }
});

async function main() {
    let config = null;
    try {
        config = await prisma.configuracao.findUnique({ where: { id: 'default' } });
    } catch (e) {
        console.error('Config Error:', e.message);
    }
    const apiUrl = config?.whatsappUrl || process.env.EVOLUTION_API_URL || 'https://api.2b.app.br';
    const apiKey = config?.whatsappApiKey || process.env.EVOLUTION_API_KEY || '';

    // Override the instance name specifically for the group
    const instanceName = 'Nacional Hidro';
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

main().finally(() => prisma.$disconnect());
