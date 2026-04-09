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
    const instanceName = config?.whatsappInstanceName || process.env.EVOLUTION_INSTANCE || 'Nacional Hidro';

    const inviteCode = 'Cpd3uZzfruR31cs9QtakoI';
    console.log(`Fazendo o bot '${instanceName}' entrar no grupo com convite ${inviteCode}...`);
    
    try {
        const joinResponse = await axios.post(
            `${apiUrl}/group/inviteAccept/${encodeURIComponent(instanceName)}`,
            { inviteCode },
            { headers: { 'apikey': apiKey, 'Content-Type': 'application/json' } }
        );
        console.log('Result of joining group:', joinResponse.data);
        
        let groupId = '120363405638860459@g.us'; // From previous resolution
        if (joinResponse.data && joinResponse.data.id) {
             groupId = joinResponse.data.id;
        }

        // Send the message to this group ID
        const mensagem = `🤖 *Status:* Instância do Bot Reconectada ao Grupo!\n\n💬 Veio pelo *botão de WhatsApp* do site!\n*NOVO LEAD* 📢\n\n*Nome:* wesley santos\n*Email:* wesley.santos@sannor.com.br\n*Empresa:* Sannor Engenharia\n*Whatsapp:* https://wa.me/5511996965036\n*Mensagem:* preciso de limpeza `;
        
        console.log(`Enviando mensagem para o grupo ${groupId}...`);
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
