/**
 * MIGRATION SCRIPT — Fase 3
 * 1. Migra Cliente.contatos (Json) → ClienteContato (relacional)
 * 2. Vincula Faturamento.empresaCnpjId via cnpjFaturamento → EmpresaCNPJ.cnpj
 * 3. Remove duplicatas de ClienteContato (mesmo clienteId + nome)
 *
 * Idempotente: pode ser executado várias vezes sem duplicar dados.
 * Uso: npx ts-node prisma/migrate-contatos-fk.ts
 */

import prisma from '../src/lib/prisma';

async function migrateContatos() {
  console.log('━━━ 1/3 — Migrando Cliente.contatos (Json) → ClienteContato ━━━');

  const clientes = await prisma.cliente.findMany({
    where: { contatos: { not: null } },
    select: { id: true, nome: true, contatos: true },
  });

  let migrated = 0;
  let skipped = 0;

  for (const cli of clientes) {
    let arr: any[] = [];
    try {
      if (typeof cli.contatos === 'string') {
        arr = JSON.parse(cli.contatos);
      } else if (Array.isArray(cli.contatos)) {
        arr = cli.contatos as any[];
      }
    } catch {
      console.warn(`  ⚠ Cliente "${cli.nome}" (${cli.id}): contatos Json inválido, pulando.`);
      continue;
    }

    if (!Array.isArray(arr) || arr.length === 0) continue;

    for (const c of arr) {
      const nome = (c.nome || c.name || '').trim();
      if (!nome) continue;

      // Check if already exists (idempotente)
      const existing = await prisma.clienteContato.findFirst({
        where: { clienteId: cli.id, nome },
      });
      if (existing) {
        skipped++;
        continue;
      }

      await prisma.clienteContato.create({
        data: {
          clienteId: cli.id,
          nome,
          setor: c.setor || c.departamento || null,
          email: c.email || null,
          telefone: c.telefone || c.phone || null,
          celular: c.celular || c.whatsapp || null,
          ramal: c.ramal || null,
          tipo: c.tipo || c.cargo || null,
          emailMedicao: !!c.emailMedicao,
          emailProposta: !!c.emailProposta,
        },
      });
      migrated++;
    }
  }
  console.log(`  ✅ ${migrated} contatos migrados, ${skipped} já existiam (skip).`);
}

async function linkFaturamentoEmpresaCnpj() {
  console.log('━━━ 2/3 — Vinculando Faturamento.empresaCnpjId ━━━');

  // Build lookup CNPJ → EmpresaCNPJ.id
  const empresas = await prisma.empresaCNPJ.findMany({
    select: { id: true, cnpj: true },
  });
  const cnpjMap = new Map<string, string>();
  for (const e of empresas) {
    cnpjMap.set(e.cnpj.trim(), e.id);
  }

  // Find faturamentos with cnpjFaturamento but no empresaCnpjId
  const fats = await (prisma as any).faturamento.findMany({
    where: {
      cnpjFaturamento: { not: null },
      empresaCnpjId: null,
    },
    select: { id: true, cnpjFaturamento: true },
  });

  let linked = 0;
  for (const fat of fats) {
    const cnpj = (fat.cnpjFaturamento || '').trim();
    const empresaId = cnpjMap.get(cnpj);
    if (empresaId) {
      await (prisma as any).faturamento.update({
        where: { id: fat.id },
        data: { empresaCnpjId: empresaId },
      });
      linked++;
    }
  }
  console.log(`  ✅ ${linked}/${fats.length} faturamentos vinculados a EmpresaCNPJ.`);
}

async function deduplicateContatos() {
  console.log('━━━ 3/3 — Removendo duplicatas de ClienteContato ━━━');

  // Find duplicates: same clienteId + nome (case-insensitive)
  const allContatos = await prisma.clienteContato.findMany({
    orderBy: { createdAt: 'asc' },
  });

  const seen = new Map<string, string>(); // key → first id (keep)
  const toDelete: string[] = [];

  for (const c of allContatos) {
    const key = `${c.clienteId}::${c.nome.toLowerCase().trim()}`;
    if (seen.has(key)) {
      toDelete.push(c.id);
    } else {
      seen.set(key, c.id);
    }
  }

  if (toDelete.length > 0) {
    await prisma.clienteContato.deleteMany({
      where: { id: { in: toDelete } },
    });
    console.log(`  ✅ ${toDelete.length} duplicatas removidas.`);
  } else {
    console.log(`  ✅ Nenhuma duplicata encontrada.`);
  }
}

async function main() {
  console.log('\n🔧 MIGRATION — Fase 3: Campos FK + Migração de Contatos\n');

  await migrateContatos();
  await linkFaturamentoEmpresaCnpj();
  await deduplicateContatos();

  console.log('\n✅ Migração concluída.\n');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('❌ Migration error:', e);
  prisma.$disconnect();
  process.exit(1);
});
