
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const equipDumpPath = path.join(__dirname, '../../../equipamentos_dump.sql');
  const relDumpPath = path.join(__dirname, '../../../relational_dump.sql');
  const linkDumpPath = path.join(__dirname, '../../../links_dump.sql');

  if (!fs.existsSync(equipDumpPath) || !fs.existsSync(relDumpPath) || !fs.existsSync(linkDumpPath)) {
    console.error('Arquivos de dump não encontrados!');
    return;
  }

  // 1. Carregar Acessórios e Responsabilidades
  const acessoriosMap = new Map<number, string>();
  const responsabilidadesMap = new Map<number, { descricao: string; tipo: string }>();

  const relContent = fs.readFileSync(relDumpPath, 'utf-8');
  
  // Parse Acessórios
  const acessorioMatches = relContent.match(/INSERT INTO `acessorios` VALUES (.*);/m);
  if (acessorioMatches) {
    const records = acessorioMatches[1].matchAll(/\(([^)]+)\)/g);
    for (const m of records) {
      try {
        const fields = m[1].split(/,(?=(?:(?:[^']*'){2})*[^']*$)/).map(f => f.trim());
        if (fields.length >= 2) {
          const id = parseInt(fields[0]);
          const nome = fields[1].replace(/'/g, '').trim();
          acessoriosMap.set(id, nome);
        }
      } catch (e) {
        console.warn('Erro ao processar acessório:', m[1]);
      }
    }
  }

  // Parse Responsabilidades
  const responsabilidadeMatches = relContent.match(/INSERT INTO `responsabilidades` VALUES (.*);/m);
  if (responsabilidadeMatches) {
    const records = responsabilidadeMatches[1].matchAll(/\(([^)]+)\)/g);
    for (const m of records) {
      try {
        const fields = m[1].split(/,(?=(?:(?:[^']*'){2})*[^']*$)/).map(f => f.trim());
        if (fields.length >= 4) {
          const id = parseInt(fields[0]);
          const descricao = fields[1].replace(/'/g, '').trim();
          const tipoInt = parseInt(fields[3]);
          const tipo = tipoInt === 2 ? 'CONTRATANTE' : 'CONTRATADA';
          responsabilidadesMap.set(id, { descricao, tipo });
        }
      } catch (e) {
        console.warn('Erro ao processar responsabilidade:', m[1]);
      }
    }
  }

  // 2. Carregar Links
  const linkContent = fs.readFileSync(linkDumpPath, 'utf-8');
  const equipAcessorios = new Map<number, number[]>();
  const equipResponsabilidades = new Map<number, number[]>();

  const acLinkMatches = linkContent.match(/INSERT INTO `equipamentos_equipamento_acessorios_links` VALUES (.*);/m);
  if (acLinkMatches) {
    const records = acLinkMatches[1].matchAll(/\(([^)]+)\)/g);
    for (const m of records) {
      const fields = m[1].split(',').map(f => parseInt(f.trim()));
      if (fields.length >= 2) {
        const equipId = fields[0];
        const acId = fields[1];
        if (!equipAcessorios.has(equipId)) equipAcessorios.set(equipId, []);
        equipAcessorios.get(equipId)?.push(acId);
      }
    }
  }

  const respLinkMatches = linkContent.match(/INSERT INTO `equipamentos_equipamento_responsabilidades_links` VALUES (.*);/m);
  if (respLinkMatches) {
    const records = respLinkMatches[1].matchAll(/\(([^)]+)\)/g);
    for (const m of records) {
      const fields = m[1].split(',').map(f => parseInt(f.trim()));
      if (fields.length >= 2) {
        const equipId = fields[0];
        const respId = fields[1];
        if (!equipResponsabilidades.has(equipId)) equipResponsabilidades.set(equipId, []);
        equipResponsabilidades.get(equipId)?.push(respId);
      }
    }
  }

  // 3. Processar Equipamentos
  console.log('Iniciando limpeza total de equipamentos...');
  await prisma.equipamentoAcessorio.deleteMany({});
  await prisma.equipamentoResponsabilidade.deleteMany({});
  await prisma.equipamento.deleteMany({});
  console.log('Limpeza concluída.');

  const equipContent = fs.readFileSync(equipDumpPath, 'utf-8');
  const equipMatches = equipContent.match(/INSERT INTO `equipamentos` VALUES (.*);/s);
  if (!equipMatches) {
    console.error('Dados de equipamentos não encontrados.');
    return;
  }

  const valuesStr = equipMatches[1];
  
  // Parser de registros robusto
  const records: string[] = [];
  let current = '';
  let inString = false;
  let depth = 0;

  for (let i = 0; i < valuesStr.length; i++) {
    const char = valuesStr[i];
    if (char === "'" && valuesStr[i-1] !== '\\') {
      inString = !inString;
    }
    
    if (!inString) {
      if (char === '(') depth++;
      if (char === ')') depth--;
    }

    current += char;

    if (!inString && depth === 0 && (char === ',' || i === valuesStr.length - 1)) {
      let rec = current.trim();
      if (rec.startsWith(',')) rec = rec.slice(1).trim();
      if (rec.endsWith(',')) rec = rec.slice(0, -1).trim();
      if (rec.startsWith('(') && rec.endsWith(')')) {
        records.push(rec.slice(1, -1));
      }
      current = '';
    }
  }

  console.log(`Parser encontrou ${records.length} registros brutos.`);

  let count = 0;
  for (const rec of records) {
    try {
      // Splitter de campos robusto que respeita quotes e escapes
      const fields: string[] = [];
      let currentField = '';
      let inFString = false;
      for (let i = 0; i < rec.length; i++) {
        const c = rec[i];
        if (c === "'" && rec[i-1] !== '\\') {
          inFString = !inFString;
        }
        if (c === ',' && !inFString) {
          fields.push(currentField.trim());
          currentField = '';
        } else {
          currentField += c;
        }
      }
      fields.push(currentField.trim());

      if (fields.length >= 2) {
        const oldId = parseInt(fields[0]);
        const nome = fields[1].replace(/^'|'$/g, '').replace(/\\'/g, "'").trim();
        const descricao = fields[2] ? fields[2].replace(/^'|'$/g, '').replace(/\\'/g, "'").replace(/\\n/g, '\n').trim() : null;
        const ativo = fields[3] === '1';
        const imagem = (!fields[4] || fields[4] === 'NULL') ? null : fields[4].replace(/^'|'$/g, '').replace(/\\'/g, "'");

        if (count < 5 || nome.includes('COMBINADO')) {
           console.log(`Processando [${oldId}]: ${nome.substring(0, 50)}`);
        }

        // Coletar acessórios vinculados
        const acs = (equipAcessorios.get(oldId) || [])
          .map(id => acessoriosMap.get(id))
          .filter(n => !!n) as string[];

        // Coletar responsabilidades vinculadas
        const resps = (equipResponsabilidades.get(oldId) || [])
          .map(id => responsabilidadesMap.get(id))
          .filter(r => !!r)
          .map(r => ({ descricao: r!.descricao, responsavel: r!.tipo }));

        await prisma.equipamento.create({
          data: {
            nome: nome.length > 255 ? nome.substring(0, 255) : nome,
            descricao: (descricao === 'NULL' || !descricao) ? null : descricao,
            ativo,
            imagem,
            acessorios: acs,
            responsabilidades: resps,
            veiculos: []
          }
        });
        count++;
      }
    } catch (e: any) {
      console.warn('Erro ao processar equipamento:', rec.substring(0, 50), e.message);
    }
  }

  console.log(`Migração de ${count} equipamentos concluída!`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
