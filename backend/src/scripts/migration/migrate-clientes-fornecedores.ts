import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  const entitiesDumpPath = path.join(__dirname, '../../../entities_dump.sql');

  if (!fs.existsSync(entitiesDumpPath)) {
    console.error('Arquivo entities_dump.sql não encontrado.');
    return;
  }

  // Função de Splitter Robusto
  function splitFields(rec: string): string[] {
    const fields: string[] = [];
    let currentField = '';
    let inString = false;
    for (let i = 0; i < rec.length; i++) {
      const c = rec[i];
      if (c === "'" && rec[i - 1] !== '\\') inString = !inString;
      if (c === ',' && !inString) {
        fields.push(currentField.trim());
        currentField = '';
      } else {
        currentField += c;
      }
    }
    fields.push(currentField.trim());
    return fields.map(f => f.replace(/^'|'$/g, '').replace(/\\'/g, "'"));
  }

  function getRecords(content: string, tableName: string): string[] {
    const regex = new RegExp(`INSERT INTO \\\`${tableName}\\\` VALUES (.*);`, 's');
    const match = content.match(regex);
    if (!match) return [];
    
    const valuesStr = match[1];
    const records: string[] = [];
    let current = '';
    let inString = false;
    let depth = 0;

    for (let i = 0; i < valuesStr.length; i++) {
      const char = valuesStr[i];
      if (char === "'" && valuesStr[i-1] !== '\\') inString = !inString;
      if (!inString) {
        if (char === '(') depth++;
        if (char === ')') depth--;
      }
      current += char;
      if (!inString && depth === 0 && (char === ',' || i === valuesStr.length - 1)) {
        let rec = current.trim();
        if (rec.startsWith(',')) rec = rec.slice(1).trim();
        if (rec.endsWith(',')) rec = rec.slice(0, -1).trim();
        if (rec.startsWith('(') && rec.endsWith(')')) records.push(rec.slice(1, -1));
        current = '';
      }
    }
    return records;
  }

  const entityContent = fs.readFileSync(entitiesDumpPath, 'utf-8');
  
  // Como as contas financeiras (que dependem de clientes/fornecedores) já foram migradas
  // e estão vinculadas por ID, deletar todos os clientes e fornecedores agora causaria
  // erro de ForeignKey (Cascata).
  
  // Vamos primeiro verificar se a formatação atual deles já atende a lógica do sistema antigo.
  // Se sim, pulamos a limpeza e reinserção (como sugerido no áudio "se já tiver formatação correta pode anular tudo que eu falei").

  console.log("Avaliando se precisamos refazer Clientes e Fornecedores...");
  const firstCliente = await prisma.cliente.findFirst();
  const firstFornecedor = await prisma.fornecedor.findFirst();
  
  console.log("Amostra Cliente Novo Sistema:", JSON.stringify(firstCliente, null, 2));
  console.log("Amostra Fornecedor Novo Sistema:", JSON.stringify(firstFornecedor, null, 2));

}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
