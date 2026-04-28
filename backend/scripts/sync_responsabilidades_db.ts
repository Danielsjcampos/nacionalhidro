import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function run() {
  console.log('Reading JSON map...');
  const data = JSON.parse(fs.readFileSync('/tmp/equip_resps_map.json', 'utf-8'));
  
  console.log('Clearing existing responsabilidades links...');
  await prisma.equipamentoResponsabilidade.deleteMany({});
  
  const dbEquips = await prisma.equipamento.findMany();
  
  let addedLinks = 0;
  
  for (const [eqNome, resps] of Object.entries(data)) {
    const eq = dbEquips.find(e => e.nome.trim().toLowerCase() === eqNome.trim().toLowerCase());
    
    if (!eq) {
      console.log(`Equipment not found in DB: ${eqNome}`);
      continue;
    }
    
    for (const r of (resps as any[])) {
      const { desc, tipo, importante } = r;
      
      await prisma.equipamentoResponsabilidade.create({
        data: {
          equipamentoId: eq.id,
          descricao: desc,
          tipo,
          importante
        }
      });
      
      addedLinks++;
    }
  }
  
  console.log(`Done! Recreated ${addedLinks} equipment responsibilities.`);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
