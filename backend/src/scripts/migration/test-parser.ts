import fs from 'fs';
import path from 'path';

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

const financeContent = fs.readFileSync(path.join(__dirname, '../../../finance_all_dump.sql'), 'utf-8');
const contas = getRecords(financeContent, 'contas');
let cpOpen = 0;
for(const rec of contas) {
  const f = splitFields(rec);
  if(parseInt(f[1]) === 1) cpOpen++; // 1 is Criado / Aberto
}
const cr = getRecords(financeContent, 'contas_receber');
let crOpen = 0;
for(const rec of cr) {
  const f = splitFields(rec);
  const status = parseInt(f[7]); // 7 is status in contas_receber
  if([1, 2, 3, 5].includes(status)) crOpen++;
}

console.log({cpTotal: contas.length, cpOpen, crTotal: cr.length, crOpen});
