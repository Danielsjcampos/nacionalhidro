import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  const financeDumpPath = path.join(__dirname, '../../../finance_all_dump.sql');
  const entitiesDumpPath = path.join(__dirname, '../../../entities_dump.sql');

  if (!fs.existsSync(financeDumpPath) || !fs.existsSync(entitiesDumpPath)) {
    console.error('Arquivos de dump não encontrados.');
    return;
  }

  console.log('--- Limpando Dados Financeiros Atuais ---');
  await prisma.contaPagarHistorico.deleteMany({});
  await prisma.contaReceberHistorico.deleteMany({});
  await prisma.contaPagarPagamento.deleteMany({});
  await prisma.contaReceberRecebimento.deleteMany({});
  await prisma.contaPagarProduto.deleteMany({});
  await prisma.contaPagarCentroCusto.deleteMany({});
  await prisma.contaPagarNatureza.deleteMany({});
  await prisma.contaReceberCentroCusto.deleteMany({});
  await prisma.contaReceberNatureza.deleteMany({});
  await prisma.contaPagar.deleteMany({});
  await prisma.contaReceber.deleteMany({});
  // Limpando contas bancárias duplicadas criadas por scripts anteriores
  const contasBancarias = await prisma.contaBancaria.findMany();
  if(contasBancarias.length > 5) {
      await prisma.contaBancaria.deleteMany({});
  }
  console.log('Financeiro limpo.');

  console.log('--- Mapeando Entidades Existentes (Sistema Novo) ---');
  const clientesNew = await prisma.cliente.findMany({ select: { id: true, razaoSocial: true, cnpj: true, cpf: true } });
  const fornecedoresNew = await prisma.fornecedor.findMany({ select: { id: true, nome: true, documento: true } });
  const empresasNew = await prisma.empresaCNPJ.findMany({ select: { id: true, nome: true, cnpj: true } });

  const clienteMap = new Map<string, string>(); // CNPJ/CPF/Nome -> UUID
  const fornecedorMap = new Map<string, string>(); // CNPJ/Documento/Nome -> UUID
  const empresaMap = new Map<string, string>(); // CNPJ/Nome -> UUID

  clientesNew.forEach(c => {
    if (c.cnpj) clienteMap.set(c.cnpj.replace(/\D/g, ''), c.id);
    if (c.cpf) clienteMap.set(c.cpf.replace(/\D/g, ''), c.id);
    if (c.razaoSocial) clienteMap.set(c.razaoSocial.toUpperCase().trim(), c.id);
  });

  fornecedoresNew.forEach(f => {
    if (f.documento) fornecedorMap.set(f.documento.replace(/\D/g, ''), f.id);
    fornecedorMap.set(f.nome.toUpperCase().trim(), f.id);
  });

  empresasNew.forEach(e => {
    if (e.cnpj) empresaMap.set(e.cnpj.replace(/\D/g, ''), e.id);
    empresaMap.set(e.nome.toUpperCase().trim(), e.id);
  });

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
  const financeContent = fs.readFileSync(financeDumpPath, 'utf-8');

  const legacyToNewCliente = new Map<number, string>();
  const legacyToNewFornecedor = new Map<number, string>();
  const legacyToNewEmpresa = new Map<number, string>();

  getRecords(entityContent, 'clientes').forEach(rec => {
    const f = splitFields(rec);
    const id = parseInt(f[0]);
    const cnpj = f[17]?.replace(/\D/g, '');
    const cpf = f[34]?.replace(/\D/g, '');
    const nome = f[36]?.toUpperCase().trim();
    const newId = (cnpj && clienteMap.get(cnpj)) || (cpf && clienteMap.get(cpf)) || (nome && clienteMap.get(nome));
    if (newId) legacyToNewCliente.set(id, newId);
  });

  getRecords(entityContent, 'fornecedores').forEach(rec => {
    const f = splitFields(rec);
    const id = parseInt(f[0]);
    const cnpj = f[3]?.replace(/\D/g, '');
    const cpf = f[4]?.replace(/\D/g, '');
    const nome = f[1]?.toUpperCase().trim();
    const newId = (cnpj && fornecedorMap.get(cnpj)) || (cpf && fornecedorMap.get(cpf)) || (nome && fornecedorMap.get(nome));
    if (newId) legacyToNewFornecedor.set(id, newId);
  });

  getRecords(entityContent, 'empresas').forEach(rec => {
    const f = splitFields(rec);
    const id = parseInt(f[0]);
    const cnpj = f[2]?.replace(/\D/g, '');
    const nome = f[1]?.toUpperCase().trim();
    const newId = (cnpj && empresaMap.get(cnpj)) || (nome && empresaMap.get(nome));
    if (newId) legacyToNewEmpresa.set(id, newId);
  });

  const cpFornecedorLink = new Map<number, number>();
  const cpEmpresaLink = new Map<number, number>();
  const crClienteLink = new Map<number, number>();
  const crEmpresaLink = new Map<number, number>();

  getRecords(financeContent, 'contas_fornecedor_links').forEach(rec => {
    const f = rec.split(',').map(x => parseInt(x.trim()));
    cpFornecedorLink.set(f[0], f[1]);
  });
  getRecords(financeContent, 'contas_empresa_links').forEach(rec => {
    const f = rec.split(',').map(x => parseInt(x.trim()));
    cpEmpresaLink.set(f[0], f[1]);
  });
  getRecords(financeContent, 'contas_receber_cliente_links').forEach(rec => {
    const f = rec.split(',').map(x => parseInt(x.trim()));
    crClienteLink.set(f[0], f[1]);
  });
  getRecords(financeContent, 'contas_receber_empresa_links').forEach(rec => {
    const f = rec.split(',').map(x => parseInt(x.trim()));
    crEmpresaLink.set(f[0], f[1]);
  });

  console.log('--- Migrando Contas a Pagar (Apenas Em Aberto) ---');
  let cpCount = 0;
  let cpSkip = 0;
  for (const rec of getRecords(financeContent, 'contas')) {
    try {
      const f = splitFields(rec);
      if (f.length < 5) continue;
      
      // Legacy schema: 0:id, 1:status, 2:valor_total, 3:numero_nf, 4:data_emissao_nf, 5:observacoes, 6:created_at
      const id = parseInt(f[0]);
      const statusInt = parseInt(f[1]);
      
      // Filtra APENAS status=1 (Em Aberto/Criado)
      if (statusInt !== 1) {
        cpSkip++;
        continue;
      }
      
      const valorTotal = parseFloat(f[2]);
      const numeroNF = f[3] === 'NULL' ? null : f[3];
      const dataEmissao = f[4] === 'NULL' ? new Date() : new Date(f[4]);
      const observacoes = f[5] === 'NULL' ? null : f[5];
      const createdAt = f[6] === 'NULL' ? new Date() : new Date(f[6]);

      const oldFornecedorId = cpFornecedorLink.get(id);
      const oldEmpresaId = cpEmpresaLink.get(id);
      const fornecedorId = oldFornecedorId ? legacyToNewFornecedor.get(oldFornecedorId) : null;
      const empresaId = oldEmpresaId ? legacyToNewEmpresa.get(oldEmpresaId) : null;
      const empresaNome = empresaId ? (empresasNew.find(e => e.id === empresaId)?.nome || 'NACIONAL') : 'NACIONAL';

      await prisma.contaPagar.create({
        data: {
          descricao: `MIGRADO [ID ${id}] ${numeroNF ? 'NF ' + numeroNF : ''}`,
          fornecedorId,
          valorOriginal: isNaN(valorTotal) ? 0 : valorTotal,
          valorPago: 0,
          dataVencimento: dataEmissao,
          status: 'ABERTO',
          observacoes,
          notaFiscal: numeroNF,
          dataEmissao,
          empresa: empresaNome,
          createdAt
        }
      });
      cpCount++;
      if (cpCount % 500 === 0) console.log(`${cpCount} contas a pagar em aberto migradas...`);
    } catch (e: any) {}
  }

  console.log(`Pularam ${cpSkip} Contas a Pagar finalizadas.`);

  console.log('--- Migrando Contas a Receber (Apenas Em Aberto) ---');
  let crCount = 0;
  let crSkip = 0;
  for (const rec of getRecords(financeContent, 'contas_receber')) {
    try {
      const f = splitFields(rec);
      if (f.length < 12) continue;
      
      // Legacy schema: 0:id, 1:insercao_manual, 2:nota, 3:tipo_fatura, 4:data_emissao, 5:valor_total, 6:observacoes, 7:status, ... 11:data_vencimento, ... 17:created_at
      const id = parseInt(f[0]);
      const statusInt = parseInt(f[7]);
      
      // Filtra APENAS [1, 2, 3, 5] (EmAberto, Pendente, Parcial, EmCorrecao). 4 = Recebido, 0 = Cancelado.
      if (![1, 2, 3, 5].includes(statusInt)) {
        crSkip++;
        continue;
      }
      
      const insercaoManual = f[1] === '1';
      const nota = f[2] === 'NULL' ? null : f[2];
      const tipoFatura = f[3] === 'NULL' ? null : f[3];
      const dataEmissao = f[4] === 'NULL' ? new Date() : new Date(f[4]);
      const valorTotal = parseFloat(f[5]);
      const observacoes = f[6] === 'NULL' ? null : f[6];
      
      const dataVencimento = f[11] === 'NULL' ? new Date() : new Date(f[11]);
      const createdAt = f[17] === 'NULL' ? new Date() : new Date(f[17]);

      const oldClienteId = crClienteLink.get(id);
      const oldEmpresaId = crEmpresaLink.get(id);
      const clienteId = oldClienteId ? legacyToNewCliente.get(oldClienteId) : null;
      const empresaId = oldEmpresaId ? legacyToNewEmpresa.get(oldEmpresaId) : null;
      const empresaNome = empresaId ? (empresasNew.find(e => e.id === empresaId)?.nome || 'NACIONAL') : 'NACIONAL';

      await prisma.contaReceber.create({
        data: {
          descricao: `MIGRADO [ID ${id}] ${nota ? 'NF ' + nota : ''}`,
          clienteId,
          valorOriginal: isNaN(valorTotal) ? 0 : valorTotal,
          valorRecebido: 0,
          dataVencimento,
          status: 'PENDENTE',
          observacoes,
          dataEmissao,
          empresa: empresaNome,
          tipoFatura,
          notaFiscal: nota,
          insercaoManual,
          createdAt
        }
      });
      crCount++;
      if (crCount % 500 === 0) console.log(`${crCount} contas a receber em aberto migradas...`);
    } catch (e: any) {}
  }
  
  console.log(`Pularam ${crSkip} Contas a Receber finalizadas.`);
  console.log(`\n✅ Sucesso! Migradas apenas ${cpCount} Contas a Pagar e ${crCount} Contas a Receber em aberto.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
