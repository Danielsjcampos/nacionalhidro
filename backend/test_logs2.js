const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "postgresql://neondb_owner:npg_fRoHJYqn1jk5@ep-ancient-union-acm8qdvg-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
        }
    }
});

async function main() {
  const settings = await prisma.configuracao.findUnique({ where: { id: 'default' } });
  console.log("Configurações do banco:");
  console.log("API URL:", settings?.whatsappUrl);
  console.log("Instancia:", settings?.whatsappInstanceName);
  
  // also print group ID if stored anywhere
  console.log("Grupo Leads:", process.env.WHATSAPP_GROUP_LEADS_ID);
}

main().finally(() => prisma.$disconnect());
