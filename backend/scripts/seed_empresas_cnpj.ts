#!/usr/bin/env ts-node
/**
 * Seed: Duas empresas historicas da Nacional Hidro
 * 
 * Para executar na VPS:
 *   cd /app && npx ts-node scripts/seed_empresas_cnpj.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🏢 Inserindo empresas históricas da Nacional Hidro...\n');

  const empresas = [
    {
      // --- Empresa 1: Serviços ---
      nome:               'NACIONAL HIDROSSANEAMENTO EIRELI EPP',
      cnpj:               '04.315.038/0001-04',
      razaoSocial:        'NACIONAL HIDROSSANEAMENTO EIRELI EPP',
      limiteMenusal:      500000,
      alertaPercentual:   80,
      ativa:              true,
      logradouro:         'R. DIACONISA ALICE A. DA SILVA',
      numero:             '279',
      bairro:             'PARQUE MARIA HELENA',
      municipio:          'CAMPINAS',
      uf:                 'SP',
      cep:                '13.067-841',
      telefone:           '(19) 3203-3301',
      inscricaoEstadual:  '244.796.656.112',
      regimeTributario:   5,
      naturezaOperacao:   'Remessa',
    },
    {
      // --- Empresa 2: Locação ---
      nome:               'NACIONALHIDRO LOCACAO DE EQUIPAMENTOS EIRELI',
      cnpj:               '24.840.094/0001-75',
      razaoSocial:        'NACIONALHIDRO LOCACAO DE EQUIPAMENTOS EIRELI',
      limiteMenusal:      500000,
      alertaPercentual:   80,
      ativa:              true,
      logradouro:         'R. DIACONISA ALICE A. DA SILVA',
      numero:             '259',
      bairro:             'PARQUE MARIA HELENA',
      municipio:          'CAMPINAS',
      uf:                 'SP',
      cep:                '13.067-841',
      telefone:           '(19) 3203-3301',
      inscricaoEstadual:  '795.785.647.112',
      regimeTributario:   5,
      naturezaOperacao:   'Locação de Bens Móveis',
    },
  ];

  for (const empresa of empresas) {
    const exists = await (prisma as any).empresaCNPJ.findFirst({
      where: { cnpj: empresa.cnpj }
    });

    if (exists) {
      console.log(`⏭️  Já existe: ${empresa.nome} (${empresa.cnpj})`);
      continue;
    }

    const criada = await (prisma as any).empresaCNPJ.create({ data: empresa });
    console.log(`✅ Criada: ${criada.nome} | CNPJ: ${criada.cnpj}`);
  }

  console.log('\n✅ Seed concluído com sucesso!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
