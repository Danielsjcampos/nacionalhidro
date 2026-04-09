const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

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

    console.log(`Buscando grupos na instancia ${instanceName} usando URL ${apiUrl}...`);
    
    try {
        const response = await axios.get(
            `${apiUrl}/group/fetchAllGroups/${encodeURIComponent(instanceName)}?getParticipants=false`,
            { headers: { 'apikey': apiKey, 'Content-Type': 'application/json' } }
        );
        const groups = response.data || [];
        console.log(`Encontrados ${groups.length} grupos:`);
        for (const g of groups) {
             const subject = g.subject ? g.subject.toLowerCase() : '';
             if (subject.includes('lead') || subject.includes('nacional') || subject.includes('hidro') || subject.includes('venda')) {
                 console.log(`- [${g.subject}] -> ${g.id}`);
             }
        }
    } catch (e) {
        console.error('Erro na API Evolution:', e.response?.data || e.message);
    }
}

main().finally(() => prisma.$disconnect());
