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
  
  console.log("--- Atualizando Clientes ---");
  const clientesNew = await prisma.cliente.findMany();
  let clientesAtualizados = 0;

  for (const rec of getRecords(entityContent, 'clientes')) {
    const f = splitFields(rec);
    if(f.length < 37) continue;

    const cnpj = f[17]?.replace(/\D/g, '');
    const cpf = f[34]?.replace(/\D/g, '');
    const nome = f[36]?.toUpperCase().trim();
    const cep = f[19] === 'NULL' ? null : f[19];
    const endereco = f[20] === 'NULL' ? null : f[20];
    const numero = f[21] === 'NULL' ? null : f[21];
    const complemento = f[22] === 'NULL' ? null : f[22];
    const bairro = f[23] === 'NULL' ? null : f[23];
    const municipio = f[24] === 'NULL' ? null : f[24];
    const estado = f[25] === 'NULL' ? null : f[25];
    const ddi = f[32] === 'NULL' ? null : f[32];
    const telefone = f[33] === 'NULL' ? null : f[33];

    const targetCliente = clientesNew.find(c => 
      (cnpj && c.cnpj && c.cnpj.replace(/\D/g, '') === cnpj) || 
      (cpf && c.cpf && c.cpf.replace(/\D/g, '') === cpf) || 
      (nome && c.razaoSocial && c.razaoSocial.toUpperCase().trim() === nome)
    );

    if (targetCliente) {
      await prisma.cliente.update({
        where: { id: targetCliente.id },
        data: {
          cep: targetCliente.cep || cep,
          endereco: targetCliente.endereco || (endereco ? `${endereco}, ${numero || ''} ${complemento || ''}`.trim() : null),
          bairro: targetCliente.bairro || bairro,
          cidade: targetCliente.cidade || municipio,
          estado: targetCliente.estado || estado,
          telefone: targetCliente.telefone || (telefone ? `+${ddi || '55'} ${telefone}` : null),
        }
      });
      clientesAtualizados++;
    }
  }

  console.log(`Clientes atualizados com formatação rica do legado: ${clientesAtualizados}`);

  console.log("--- Atualizando Fornecedores ---");
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
          segmento: targetFornecedor.segmento || segmento,
          endereco: targetFornecedor.endereco || (endereco ? `${endereco}, ${numero || ''} ${complemento || ''} - ${bairro || ''}`.trim() : null),
          cidade: targetFornecedor.cidade || cidade,
          estado: targetFornecedor.estado || estado,
          cep: targetFornecedor.cep || cep,
          contato: targetFornecedor.contato || contato,
          email: targetFornecedor.email || email,
          telefone: targetFornecedor.telefone || telefone,
          observacoes: targetFornecedor.observacoes || observacoes,
          banco: targetFornecedor.banco || nomeBanco,
          agencia: targetFornecedor.agencia || agenciaBanco,
          conta: targetFornecedor.conta || contaBanco,
          chavePix: targetFornecedor.chavePix || chavePix,
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
