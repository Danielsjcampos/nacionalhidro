import * as XLSX from 'xlsx';
import * as path from 'path';

const filePath = '/Users/viniciussaldanharosario/Downloads/nacionalhidro-main/Viviane Integração Documentos/INTEGRAÇÕES 1 SEMESTRE 2025.xlsx';

try {
  const workbook = XLSX.readFile(filePath);
  const sheetNames = workbook.SheetNames;
  console.log('Abas encontradas:', sheetNames);

  sheetNames.forEach(name => {
    const sheet = workbook.Sheets[name];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    console.log(`\n--- Aba: ${name} ---`);
    console.log('Cabeçalhos:', data[0]);
    console.log('Exemplo Linha 1:', data[1]);
  });
} catch (error) {
  console.error('Erro ao ler Excel:', error.message);
}
