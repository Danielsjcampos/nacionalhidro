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

    console.log(`Buscando status da instancia ${instanceName}...`);
    try {
        const response = await axios.get(
            `${apiUrl}/instance/connectionState/${encodeURIComponent(instanceName)}`,
            { headers: { 'apikey': apiKey } }
        );
        console.log('Status da Instância:', JSON.stringify(response.data, null, 2));
    } catch (e) {
        console.error('Erro na API Evolution:', e.response?.data || e.message);
    }
}

main().finally(() => prisma.$disconnect());
