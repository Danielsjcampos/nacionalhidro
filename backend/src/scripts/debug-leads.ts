
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkLeads() {
  console.log('--- VERIFICANDO WEBHOOK LOGS RECENTES ---');
  const internalPrisma = prisma as any;
  const webhookLogs = await internalPrisma.webhookLog.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' }
  });

  webhookLogs.forEach((log: any) => {
    console.log(`ID: ${log.id}`);
    console.log(`Data: ${log.createdAt}`);
    console.log(`Provider: ${log.provider}`);
    console.log(`Status: ${log.status}`);
    console.log(`Payload Nome: ${log.payload?.nome || log.payload?.nome_cliente}`);
    console.log(`Erro/Resposta: ${JSON.stringify(log.response)}`);
    console.log('-----------------------------------');
  });

  console.log('\n--- VERIFICANDO LEADS RECENTES NO CRM ---');
  const leads = await prisma.lead.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' }
  });

  leads.forEach((l: any) => {
    console.log(`Lead: ${l.nome} | Status: ${l.status} | Origem: ${l.origem} | Data: ${l.createdAt}`);
    console.log(`Detalhes: ${JSON.stringify(l)}`);
    console.log('---');
  });

  await prisma.$disconnect();
}

checkLeads().catch(err => {
  console.error(err);
  process.exit(1);
});
