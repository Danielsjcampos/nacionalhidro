import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  const entitiesDumpPath = path.join(__dirname, '../../../entities_dump.sql');

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
  console.log("--- Atualizando Fornecedores (Fix) ---");
  const fornecedoresNew = await prisma.fornecedor.findMany();
  let fornecedoresAtualizados = 0;

  for (const rec of getRecords(entityContent, 'fornecedores')) {
    const f = splitFields(rec);
    if(f.length < 24) continue;

    const nome = f[1]?.toUpperCase().trim();
    const cnpj = f[3]?.replace(/\D/g, '');
    const cpf = f[4]?.replace(/\D/g, '');
    const segmento = f[2] === 'NULL' ? null : f[2];
    const endereco = f[6] === 'NULL' ? null : f[6];
    const numero = f[7] === 'NULL' ? null : f[7];
    const complemento = f[8] === 'NULL' ? null : f[8];
    const bairro = f[9] === 'NULL' ? null : f[9];
    const cidade = f[10] === 'NULL' ? null : f[10];
    const estado = f[11] === 'NULL' ? null : f[11];
    const cep = f[12] === 'NULL' ? null : f[12];
    const contato = f[13] === 'NULL' ? null : f[13];
    const email = f[14] === 'NULL' ? null : f[14];
    const telefone = f[15] === 'NULL' ? null : f[15];
    const observacoes = f[16] === 'NULL' ? null : f[16];
    
    // Dados Bancarios
    const nomeBanco = f[17] === 'NULL' ? null : f[17];
    const agenciaBanco = f[18] === 'NULL' ? null : f[18];
    const contaBanco = f[19] === 'NULL' ? null : f[19];
    const chavePix = f[21] === 'NULL' ? null : f[21];
    const bloqueado = f[23] === '1';

    const targetFornecedor = fornecedoresNew.find(forn => 
      (cnpj && forn.documento && forn.documento.replace(/\D/g, '') === cnpj) || 
      (cpf && forn.documento && forn.documento.replace(/\D/g, '') === cpf) || 
      (nome && forn.nome.toUpperCase().trim() === nome)
    );

    if (targetFornecedor) {
      await prisma.fornecedor.update({
        where: { id: targetFornecedor.id },
        data: {
          segmento: segmento || targetFornecedor.segmento,
          endereco: (endereco ? `${endereco}, ${numero || ''} ${complemento || ''} - ${bairro || ''}`.trim() : targetFornecedor.endereco),
          cidade: cidade || targetFornecedor.cidade,
          estado: estado || targetFornecedor.estado,
          cep: cep || targetFornecedor.cep,
          contato: contato || targetFornecedor.contato,
          email: email || targetFornecedor.email,
          telefone: telefone || targetFornecedor.telefone,
          observacoes: observacoes || targetFornecedor.observacoes,
          banco: nomeBanco || targetFornecedor.banco,
          agencia: agenciaBanco || targetFornecedor.agencia,
          conta: contaBanco || targetFornecedor.conta,
          chavePix: chavePix || targetFornecedor.chavePix,
          bloqueado: targetFornecedor.bloqueado !== undefined ? targetFornecedor.bloqueado : bloqueado
        }
      });
      fornecedoresAtualizados++;
    }
  }

  console.log(`Fornecedores atualizados com formatação rica do legado: ${fornecedoresAtualizados}`);

}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
