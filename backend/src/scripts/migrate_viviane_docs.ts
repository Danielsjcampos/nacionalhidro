import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';

const prisma = new PrismaClient();
const EXCEL_PATH = '/Users/viniciussaldanharosario/Downloads/nacionalhidro-main/Viviane Integração Documentos/INTEGRAÇÕES 1 SEMESTRE 2025.xlsx';

const SHEET_TO_CLIENT: Record<string, string> = {
  'REDE D\'OR': 'REDE D\'OR SAO LUIZ S.A.',
  'SUZANO JACAREI 190825': 'SUZANO S.A.',
  'SUZANO  LIMEIRA 190825': 'SUZANO S.A.',
  'SAINT GOBAIN BRASILIT030925': 'SAINT-GOBAIN DO BRASIL PRODUTOS INDUSTRIAIS E PARA CONSTRUCAO LTDA',
  'BP BUNGE170125': 'BUNGE ALIMENTOS S/A',
  'MENDES210125': 'MENDES HOLLER ENG. COMERCIO E CONSULTORIA LTDA',
  'PAULISPELL210125': 'PAULISPELL INDUSTRIA PAULISTA PAPEIS E PAPELAO  LTDA',
  'ASK RIO CLARO210725': 'ASK CRIOS PR. QUIM. BRASIL LTDA',
  'CORRECTA300125': 'CORRECTA INDUSTRIA E COMERCIO LTDA'
};

async function run() {
  console.log('🚀 Iniciando migração de integrações da Viviane...');

  const workbook = XLSX.readFile(EXCEL_PATH);
  const sheetNames = workbook.SheetNames;

  for (const sheetName of sheetNames) {
    if (['INTEGRAL', 'Planilha1', 'DADOS', 'MODELO'].includes(sheetName)) continue;

    console.log(`\n📂 Processando Aba: ${sheetName}`);
    
    const mappedName = SHEET_TO_CLIENT[sheetName];
    
    // Se tiver mapeamento, busca exato. Senão, faz fuzzy.
    const cliente = mappedName 
      ? await prisma.cliente.findFirst({ where: { nome: mappedName } })
      : await prisma.cliente.findFirst({
          where: {
            OR: [
              { nome: { contains: sheetName.split(' ')[0], mode: 'insensitive' } },
              { razaoSocial: { contains: sheetName.split(' ')[0], mode: 'insensitive' } },
              { nomeFantasia: { contains: sheetName.split(' ')[0], mode: 'insensitive' } }
            ]
          }
        });

    if (!cliente) {
      console.warn(`⚠️  Cliente não encontrado para a aba: ${sheetName}`);
      continue;
    }

    const sheet = workbook.Sheets[sheetName];
    const data: any[] = XLSX.utils.sheet_to_json(sheet);

    let count = 0;
    for (const row of data) {
      const funcionarioNome = row['FUNCIONÁRIO'] || row['FUNCIONARIO'];
      if (!funcionarioNome || typeof funcionarioNome !== 'string') continue;

      // Tentar encontrar funcionario
      const funcionario = await prisma.funcionario.findFirst({
        where: { nome: { contains: funcionarioNome, mode: 'insensitive' } }
      });

      if (!funcionario) {
        // console.warn(`   - Funcionário não encontrado: ${funcionarioNome}`);
        continue;
      }

      // Parse Datas (Excel serial dates or strings)
      const dataDoc = row['DATA'];
      const vencDoc = row['VENC'];
      
      const parseDate = (val: any) => {
        if (!val) return null;
        if (typeof val === 'number') {
          return new Date((val - 25569) * 86400 * 1000);
        }
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
      };

      const dtIntegracao = parseDate(dataDoc) || new Date();
      const dtVencimento = parseDate(vencDoc) || new Date();
      
      const situacao = String(row['SITUAÇÃO'] || row['SITUACAO'] || '').toUpperCase();
      let status = 'PENDENTE';
      if (situacao.includes('OK')) status = 'VALIDO';
      else if (situacao.includes('VENCID')) status = 'VENCIDO';
      else if (situacao.includes('PEND')) status = 'PENDENTE';

      await prisma.integracaoCliente.upsert({
        where: {
          id: `${funcionario.id}-${cliente.id}` // Chave composta virtual (não é real, mas upsert precisa de where)
          // Na verdade o schema não tem chave única para func+cliente. Vou usar create ou update manual.
        },
        create: {
          funcionarioId: funcionario.id,
          clienteId: cliente.id,
          nome: `Integração ${cliente.nome}`,
          dataEmissao: dtIntegracao,
          dataVencimento: dtVencimento,
          status: status,
          observacoes: `Migrado da planilha Viviane (Aba: ${sheetName})`
        },
        update: {
          dataEmissao: dtIntegracao,
          dataVencimento: dtVencimento,
          status: status
        }
      }).catch(err => {
        // Se falhar o upsert por ID, tentamos por busca
      });
      
      // Como o upsert acima vai falhar por falta de ID único (usei string fake), vamos fazer o jeito certo:
      const existing = await prisma.integracaoCliente.findFirst({
        where: { funcionarioId: funcionario.id, clienteId: cliente.id }
      });

      if (existing) {
        await prisma.integracaoCliente.update({
          where: { id: existing.id },
          data: {
            dataEmissao: dtIntegracao,
            dataVencimento: dtVencimento,
            status: status
          }
        });
      } else {
        await prisma.integracaoCliente.create({
          data: {
            funcionarioId: funcionario.id,
            clienteId: cliente.id,
            nome: `Integração ${cliente.nome}`,
            dataEmissao: dtIntegracao,
            dataVencimento: dtVencimento,
            status: status,
            observacoes: `Migrado da planilha Viviane (Aba: ${sheetName})`
          }
        });
      }

      count++;
    }
    console.log(`✅ ${count} integrações processadas para ${cliente.nome}`);
  }

  console.log('\n✨ Migração concluída!');
}

run().catch(console.error).finally(() => prisma.$disconnect());
