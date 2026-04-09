import { PrismaClient } from '@prisma/client';
// We are importing from local json files we just generated
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function seedPlanoContas() {
    console.log("Starting Plano de Contas Seed...");

    const processFile = async (filePath: string) => {
        if (!fs.existsSync(filePath)) {
            console.log(`File not found: ${filePath}`);
            return;
        }
        
        const raw = fs.readFileSync(filePath, 'utf-8');
        const records = JSON.parse(raw);
        
        console.log(`Loaded ${records.length} records from ${filePath}`);
        
        // Clear all previously seeded records for this company (Locacao or Hidro) 
        // Or we can just seed without clearing if it's identical
        
        const empresa = records[0]?.empresa || "AMBAS";
        
        // Clean the description because PDF extraction left some prefix
        for (const r of records) {
            let desc = r.descricao;
            if (desc.startsWith("S ")) desc = desc.substring(2).trim();
            if (desc.startsWith(r.codigo + " ")) desc = desc.substring(r.codigo.length + 1).trim();
            r.descricao = desc.trim();
            
            // Fix tipo
            if (r.tipo === "ANALITICA" && r.descricao.toUpperCase().includes("SINTETICA")) {
                 // some generic heuristic
            }
        }

        // We need to insert them in order of level or ensure parentIds are resolvable.
        // It's easier to insert them all, then map parentId by 'codigo' + 'empresa'.
        
        // 1. Insert or Update all accounts without parent relation
        const createdMap = new Map<string, string>(); // codigo -> db_id
        
        for (const r of records) {
            const existing = await prisma.planoContas.findFirst({
                where: { codigo: r.codigo, empresa: r.empresa }
            });
            
            let storedId;
            if (existing) {
                await prisma.planoContas.update({
                    where: { id: existing.id },
                    data: {
                        descricao: r.descricao,
                        tipo: r.tipo,
                        natureza: r.natureza,
                        nivel: r.nivel
                    }
                });
                storedId = existing.id;
            } else {
                const created = await prisma.planoContas.create({
                    data: {
                        codigo: r.codigo,
                        descricao: r.descricao,
                        tipo: r.tipo,
                        natureza: r.natureza,
                        nivel: r.nivel,
                        empresa: r.empresa,
                        ativo: true
                    }
                });
                storedId = created.id;
            }
            createdMap.set(r.codigo, storedId);
        }
        
        // 2. Resolve parent associations
        let parentLinks = 0;
        for (const r of records) {
            if (r.parentCodigo) {
                const childId = createdMap.get(r.codigo);
                const parentId = createdMap.get(r.parentCodigo);
                if (childId && parentId) {
                    await prisma.planoContas.update({
                        where: { id: childId },
                        data: { parentId: parentId }
                    });
                    parentLinks++;
                }
            }
        }
        console.log(`Successfully mapped ${parentLinks} parent associations for ${empresa}.`);
    };

    await processFile(path.join(__dirname, 'hidrosaneamento.json'));
    await processFile(path.join(__dirname, 'locacao.json'));

    console.log("Seeding complete!");
}

seedPlanoContas()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
