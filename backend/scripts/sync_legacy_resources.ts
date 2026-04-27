import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const MAPPING_PATH = '/Users/viniciussaldanharosario/.gemini/antigravity/brain/1652fc94-5719-4013-a81c-d38e10fea00c/scratch/legacy_mapping.json';

async function main() {
  const mapping = JSON.parse(fs.readFileSync(MAPPING_PATH, 'utf-8'));
  const equipmentNames = Object.keys(mapping);

  console.log(`🚀 Iniciando sincronização completa de ${equipmentNames.length} equipamentos...`);

  // Pre-fetch global resources to avoid repeated queries
  const allResps = await prisma.responsabilidadePadrao.findMany();
  const allAcs = await prisma.acessorio.findMany();
  const allVeics = await prisma.veiculo.findMany();

  for (const eqName of equipmentNames) {
    const legacy = mapping[eqName];
    
    // Find equipment in new DB (match by name, case insensitive)
    const eq = await prisma.equipamento.findFirst({
      where: { nome: { equals: eqName, mode: 'insensitive' } }
    });

    if (!eq) {
      console.log(`⚠️ Equipamento não encontrado no novo sistema: "${eqName}" - Pulando.`);
      continue;
    }

    console.log(`\n📦 Processando: ${eq.nome} (${eq.id})`);

    // ── 1. RESPONSABILIDADES ──
    console.log(`   🛠️ Sincronizando ${legacy.responsabilidades.length} responsabilidades...`);
    // Clear existing links for this equipment
    await prisma.equipamentoResponsabilidade.deleteMany({ where: { equipamentoId: eq.id } });
    
    for (const r of legacy.responsabilidades) {
      const tipo = r.resp === '2' ? 'CONTRATANTE' : 'CONTRATADA';
      
      // Ensure the global description exists in ResponsabilidadePadrao with correct type
      let globalResp = allResps.find(gr => gr.descricao.toLowerCase() === r.desc.toLowerCase());
      if (!globalResp) {
        globalResp = await prisma.responsabilidadePadrao.create({
          data: {
            descricao: r.desc,
            tipo: tipo === 'CONTRATANTE' ? 'CONTRATANTE (CLIENTE)' : 'CONTRATADA'
          }
        });
        allResps.push(globalResp);
      } else if (globalResp.tipo !== (tipo === 'CONTRATANTE' ? 'CONTRATANTE (CLIENTE)' : 'CONTRATADA')) {
        // Update global type if mismatch
        await prisma.responsabilidadePadrao.update({
          where: { id: globalResp.id },
          data: { tipo: tipo === 'CONTRATANTE' ? 'CONTRATANTE (CLIENTE)' : 'CONTRATADA' }
        });
      }

      // Create link
      await prisma.equipamentoResponsabilidade.create({
        data: {
          equipamentoId: eq.id,
          descricao: r.desc,
          tipo: tipo,
          importante: false
        }
      });
    }

    // ── 2. ACESSÓRIOS ──
    console.log(`   🛠️ Sincronizando ${legacy.acessorios.length} acessórios...`);
    await prisma.equipamentoAcessorio.deleteMany({ where: { equipamentoId: eq.id } });
    
    for (const acName of legacy.acessorios) {
      let globalAc = allAcs.find(ga => ga.nome.toLowerCase() === acName.toLowerCase());
      if (!globalAc) {
        globalAc = await prisma.acessorio.create({ data: { nome: acName } });
        allAcs.push(globalAc);
      }
      
      await prisma.equipamentoAcessorio.create({
        data: { equipamentoId: eq.id, acessorioId: globalAc.id }
      });
    }

    // ── 3. VEÍCULOS ──
    console.log(`   🛠️ Sincronizando ${legacy.veiculos.length} veículos...`);
    const veicIds: string[] = [];
    for (const v of legacy.veiculos) {
      const globalV = allVeics.find(gv => 
        gv.placa.replace(/[^A-Z0-9]/gi, '').toLowerCase() === v.placa.replace(/[^A-Z0-9]/gi, '').toLowerCase()
      );
      if (globalV) {
        veicIds.push(globalV.id);
      }
    }
    
    await prisma.equipamento.update({
      where: { id: eq.id },
      data: { veiculos: veicIds }
    });
    console.log(`   ✅ Sincronização concluída para ${eq.nome}`);
  }

  console.log('\n✨ Sincronização geral concluída com sucesso!');
}

main()
  .catch(e => {
    console.error('❌ Erro na sincronização:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
