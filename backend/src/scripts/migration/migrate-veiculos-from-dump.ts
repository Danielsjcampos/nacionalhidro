
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const TIPO_MAP: Record<number, string> = {
  1: 'CARRO',
  2: 'CAMINHAO TOCO',
  3: 'CAMINHAO TRUCK',
  4: 'CAVALO MECANICO',
  5: 'CARRETA'
};

async function main() {
  const dumpPath = path.join(__dirname, '../../../veiculos_dump.sql');
  if (!fs.existsSync(dumpPath)) {
    console.error('Arquivo veiculos_dump.sql não encontrado!');
    return;
  }

  const content = fs.readFileSync(dumpPath, 'utf-8');
  // Encontrar a parte dos VALUES (lidando com múltiplas linhas se necessário)
  const match = content.match(/INSERT INTO `veiculos` VALUES (.*);/s);
  if (!match) {
    console.error('Não foi possível encontrar os dados no dump.');
    return;
  }

  const valuesStr = match[1];
  
  // Regex para capturar cada registro (ID, 'Desc', 'Placa', Tipo, ...)
  // Ex: (1,'CAMINHAO','GEL',2,...)
  // Nota: Isso é simplificado para este dump específico
  const recordRegex = /\(([^)]+)\)/g;
  let recordMatch;
  const records = [];

  while ((recordMatch = recordRegex.exec(valuesStr)) !== null) {
    const rawFields = recordMatch[1];
    // Split por vírgula mas ignorando vírgulas dentro de strings
    const fields = rawFields.split(/,(?=(?:(?:[^']*'){2})*[^']*$)/).map(f => f.trim());
    
    if (fields.length >= 7) {
      const id = fields[0];
      const descricao = fields[1].replace(/'/g, '');
      const placa = fields[2].replace(/'/g, '').trim();
      const tipoInt = parseInt(fields[3]);
      const manutencao = fields[6] === '1';

      records.push({
        placa,
        modelo: descricao,
        tipo: TIPO_MAP[tipoInt] || 'OUTRO',
        status: manutencao ? 'MANUTENCAO' : 'DISPONIVEL',
        kmAtual: parseInt(fields[5]) || 0, // No dump a coluna 6 é manutencao, mas no schema que vi a coluna 5 era data_criacao. 
        // Vamos usar os índices baseados no CREATE TABLE que extraímos.
      });
    }
  }

  /* 
  CREATE TABLE `veiculos` (
    0: `id` int
    1: `descricao` varchar(255)
    2: `placa` varchar(255)
    3: `tipo` int
    4: `data_alteracao` datetime
    5: `data_criacao` datetime
    6: `manutencao` tinyint(1)
    ...
  )
  */

  console.log('Iniciando limpeza total de veículos e registros relacionados...');
  await prisma.escala.deleteMany({});
  await prisma.manutencao.deleteMany({});
  await prisma.veiculo.deleteMany({});
  console.log('Limpeza concluída.');

  const finalVehicles = [];
  const allMatches = valuesStr.matchAll(/\(([^)]+)\)/g);
  for (const m of allMatches) {
      const fields = m[1].split(/,(?=(?:(?:[^']*'){2})*[^']*$)/).map(f => f.trim());
      if (fields.length >= 7) {
          const descricao = fields[1].replace(/'/g, '').trim();
          const placa = fields[2].replace(/'/g, '').trim();
          const tipoInt = parseInt(fields[3]);
          const manutencao = fields[6] === '1';

          if (placa && placa !== 'NULL') {
            finalVehicles.push({
                placa,
                modelo: descricao,
                tipo: TIPO_MAP[tipoInt] || 'OUTRO',
                status: manutencao ? 'MANUTENCAO' : 'DISPONIVEL',
                kmAtual: 0,
                nivelCombustivel: 100
            });
          }
      }
  }

  // Remover duplicatas de placa no dump (se houver)
  const uniqueVehicles = [];
  const seenPlacas = new Set();
  for (const v of finalVehicles) {
    if (!seenPlacas.has(v.placa)) {
      uniqueVehicles.push(v);
      seenPlacas.add(v.placa);
    }
  }

  console.log(`Encontrados ${uniqueVehicles.length} veículos únicos no legado.`);

  await prisma.veiculo.createMany({
    data: uniqueVehicles
  });

  console.log('Migração de veículos (Clean Install) concluída!');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
