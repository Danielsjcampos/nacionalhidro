import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const sql = fs.readFileSync('/tmp/responsabilidades.sql', 'utf-8');

  const valuesStrMatch = sql.match(/INSERT INTO `responsabilidades` VALUES (.*);/i);
  if (!valuesStrMatch) {
    console.error('No values found in SQL file');
    return;
  }
  
  const valuesStr = valuesStrMatch[1];
  
  let inString = false;
  let escapeNext = false;
  let currentVal = '';
  const rows: any[][] = [];
  let currentRow: any[] = [];
  
  for (let i = 0; i < valuesStr.length; i++) {
    const char = valuesStr[i];
    
    if (escapeNext) {
      currentVal += char;
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (char === "'") {
      inString = !inString;
      continue;
    }
    
    if (!inString) {
      if (char === '(' && currentVal.trim() === '') {
        continue;
      }
      
      if (char === ',') {
        currentRow.push(currentVal);
        currentVal = '';
        continue;
      }
      
      if (char === ')') {
        currentRow.push(currentVal);
        rows.push(currentRow);
        currentRow = [];
        currentVal = '';
        continue;
      }
    }
    
    currentVal += char;
  }
  
  console.log(`Parsed ${rows.length} rows.`);
  
  const dbResps = await prisma.responsabilidadePadrao.findMany();
  let updatedCount = 0;
  
  for (const row of rows) {
    if (row.length < 5) continue;
    
    let descricao = row[1].trim();
    if (descricao.startsWith("'")) descricao = descricao.slice(1);
    if (descricao.endsWith("'")) descricao = descricao.slice(0, -1);
    
    const responsavel = parseInt(row[3]); // 1 = CONTRATADA, 2 = CONTRATANTE
    const tipo = responsavel === 2 ? 'CONTRATANTE' : 'CONTRATADA';
    
    // Find matching by lowercase removing extra spaces
    const descLower = descricao.toLowerCase().trim().replace(/\s+/g, ' ');
    
    const matches = dbResps.filter(r => r.descricao.toLowerCase().trim().replace(/\s+/g, ' ') === descLower);
    
    for (const match of matches) {
      if (match.tipo !== tipo) {
        await prisma.responsabilidadePadrao.update({
          where: { id: match.id },
          data: { tipo }
        });
        updatedCount++;
        console.log(`Updated: "${descricao}" from ${match.tipo} to ${tipo}`);
      }
    }
  }
  
  console.log(`Updated ${updatedCount} responsabilidades to correct tipo (CONTRATANTE/CONTRATADA).`);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
