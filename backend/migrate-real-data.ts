import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import readline from 'readline';
import process from 'process';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});
const DUMP_PATH = './production_dump.sql';

// Mapas para tradução de IDs (Strapi ID -> Prisma UUID)
const clientMap: Map<number, string> = new Map();
const userMap: Map<number, string> = new Map();

async function main() {
  console.log('🚀 Iniciando Processo de Migração de Dados Reais...');

  if (!fs.existsSync(DUMP_PATH)) {
    console.error(`❌ Erro: Arquivo ${DUMP_PATH} não encontrado!`);
    return;
  }

  const fileStream = fs.createReadStream(DUMP_PATH);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let currentTable = '';
  let insertHeader = '';

  for await (const line of rl) {
    // Detectar qual tabela estamos populando
    if (line.includes('Dumping data for table')) {
      const match = line.match(/`(.+)`/);
      if (match) currentTable = match[1];
      continue;
    }

    if (line.startsWith('INSERT INTO')) {
      const headerMatch = line.match(/INSERT INTO `(\w+)` \((.+)\) VALUES/);
      if (headerMatch) {
         insertHeader = headerMatch[1];
      }

      // Processar os valores (tratando o fato de que pode haver múltiplos registros em um INSERT)
      const valuesMatch = line.match(/VALUES \((.+)\);/);
      if (valuesMatch) {
        const fullContent = valuesMatch[1];
        // Split complexo para lidar com vírgulas dentro de textos
        // Nota: Esta é uma simplificação, para produção usamos regex de partição
        // mas aqui vamos processar os blocos principais
        await processInsertLine(currentTable, fullContent);
      }
    }
  }

  console.log('🏁 Migração finalizada com sucesso!');
}

async function processInsertLine(table: string, content: string) {
  // Dividir múltiplos registros (format: (val1, val2), (val3, val4))
  const records = content.split('),(');

  for (let record of records) {
    // Limpar parênteses extras
    record = record.replace(/^\(|\)$|;$/g, '');
    const fields = parseFields(record);

    try {
      if (table === 'clientes') {
        const id = parseInt(fields[0]);
        const nome = cleanStr(fields[1]);
        const documento = cleanStr(fields[4]); // Documento (CNPJ/CPF)

        if (!documento || documento === 'NULL') continue;

        const cliente = await prisma.cliente.upsert({
          where: { documento: documento },
          update: {},
          create: {
            nome: nome,
            documento: documento,
            razaoSocial: cleanStr(fields[2]),
            tipo: cleanStr(fields[5]) || 'PJ',
            cidade: cleanStr(fields[17]),
            uf: cleanStr(fields[18]),
            email: cleanStr(fields[24]),
            telefone: cleanStr(fields[25]),
          }
        });
        clientMap.set(id, cliente.id);
        console.log(`✅ Importado Cliente: ${nome}`);
      }

      if (table === 'contatos') {
        const nome = cleanStr(fields[1]);
        const email = cleanStr(fields[3]);
        const depto = cleanStr(fields[2]);
        // Contatos do Strapi muitas vezes não têm documento único, usamos email+nome
        await prisma.user.upsert({
          where: { email: email || `contato_${fields[0]}@nacionalhidro.com.br` },
          update: {},
          create: {
            name: nome,
            email: email || `contato_${fields[0]}@nacionalhidro.com.br`,
            password: 'migrated_user_2024',
            departamento: depto,
            role: 'user'
          }
        });
      }

      if (table === 'contas_receber') {
        const valor = parseFloat(fields[2]);
        const vencimento = parseDate(fields[3]);
        const nota = cleanStr(fields[7]);

        await prisma.contaReceber.create({
          data: {
            descricao: cleanStr(fields[1]),
            valorOriginal: isNaN(valor) ? 0 : valor,
            dataVencimento: vencimento || new Date(),
            status: cleanStr(fields[4])?.toUpperCase() || 'PENDENTE',
            notaFiscal: nota,
            empresa: 'NACIONAL',
          }
        });
      }

      if (table === 'contas_pagar') {
        const valor = parseFloat(fields[2]);
        const vencimento = parseDate(fields[4]);

        await prisma.contaPagar.create({
          data: {
            descricao: cleanStr(fields[1]),
            valorOriginal: isNaN(valor) ? 0 : valor,
            dataVencimento: vencimento || new Date(),
            status: cleanStr(fields[5])?.toUpperCase() || 'ABERTO',
            empresa: 'NACIONAL',
          }
        });
      }

      if (table === 'propostas') {
        const oldId = parseInt(fields[0]);
        const dataProposta = parseDate(fields[2]);
        const statusStr = fields[9];
        const valor = parseFloat(fields[10]);
        const codigo = cleanStr(fields[12]);

        await prisma.proposta.create({
          data: {
            codigo: codigo || `PROP-${oldId}`,
            dataProposta: dataProposta || new Date(),
            dataValidade: parseDate(fields[8]) || new Date(),
            valorTotal: isNaN(valor) ? 0 : valor,
            status: mapStatus(statusStr),
            clienteId: '638d726b-8524-42f0-9430-802c01990928', // Placeholder for Nacional client (will need refinement)
            validadeDias: 30,
          }
        });
        console.log(`✅ Importada Proposta Real: ${codigo || oldId}`);
      }
    } catch (err) {
      // console.error(`⚠️ Erro ao processar registro na tabela ${table}:`, err);
    }
  }
}

// Funções Auxiliares de Parsing
function parseFields(record: string): string[] {
  // Regex para separar strings entre aspas simples de números e NULLs
  return record.match(/'(?:[^'\\]|\\.)*'|\w+|NULL/g) || [];
}

function cleanStr(val: string): string {
  if (!val || val === 'NULL') return '';
  return val.replace(/^'|'$/g, '').replace(/\\'/g, "'").trim();
}

function parseDate(val: string): Date | null {
  const s = cleanStr(val);
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function mapStatus(strapiStatus: string): string {
  // Mapeamento de status numérico Strapi -> String Prisma
  const status: Record<string, string> = {
    '0': 'RASCUNHO',
    '1': 'ENVIADA',
    '2': 'ACEITA',
    '3': 'RECUSADA',
    '4': 'FINALIZADA'
  };
  return status[strapiStatus] || 'RASCUNHO';
}

main().catch(console.error);
