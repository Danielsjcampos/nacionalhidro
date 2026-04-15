import * as fs from 'fs';
import * as path from 'path';

/**
 * Script para extrair dados de INSERT do SQL dump do SIM Antigo
 * Suporta múltiplas tabelas: clientes, contatos, cliente_contatos_links
 */

const SQL_FILE = path.join(__dirname, '../../prisma/NacionalHidro_entrega_dump.sql');
const OUTPUT_FILE = path.join(__dirname, '../../prisma/old_clients.json');

const TABLES: Record<string, string[]> = {
  clientes: [
    'id', 'dia_base_quinzenal_inicio', 'cliente_codigo', 'aniversario_reajuste',
    'link_portal', 'usuario_portal', 'senha_portal', 'tipo_faturamento',
    'responsavel_comercial', 'dia_base_quinzenal_final', 'dia_base_mensal',
    'dia_base_semanal', 'cte', 'porcentagem_rl', 'dias_vencimento',
    'tipo_pessoa', 'ie', 'cnpj', 'rg', 'endereco', 'numero', 'complemento',
    'bairro', 'cep', 'estado_sigla', 'cidade', 'ponto_referencia',
    'telefone', 'celular', 'fax', 'email', 'observacao_cobranca',
    'observacao', 'nome_fantasia', 'cpf', 'bloqueado', 'razao_social',
    'data_desbloqueio', 'created_at', 'updated_at', 'created_by_id',
    'updated_by_id', 'segmento', 'codigo_municipio', 'inscricao_municipal'
  ],
  contatos: [
    'id', 'nome', 'cargo', 'email', 'telefone', 'celular', 'departamento',
    'created_at', 'updated_at', 'created_by_id', 'updated_by_id'
  ],
  clientes_contatos_links: [
    'id', 'cliente_id', 'contato_id', 'contato_order'
  ]
};

function parseTuples(content: string, tableName: string): any[] {
  const columnNames = TABLES[tableName];
  if (!columnNames) return [];

  const results: any[] = [];
  // Split tuples (v1, v2), (v3, v4)
  // Simplified logic: tuples are usually separated by "),(" or "),\n("
  const tuples = content.split(/\),\s*\(/);

  for (let tuple of tuples) {
    tuple = tuple.replace(/^\(/, '').replace(/\);?$/, '');
    
    // Very basic MySQL field parser (handle strings with quotes and NULL)
    const fields: string[] = [];
    let currentField = '';
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < tuple.length; i++) {
        const char = tuple[i];
        if (char === "'" && tuple[i-1] !== "\\") {
            if (!inString) {
                inString = true;
                stringChar = "'";
            } else if (stringChar === "'") {
                inString = false;
            } else {
                currentField += char;
            }
        } else if (char === "," && !inString) {
            fields.push(currentField.trim());
            currentField = '';
        } else {
            currentField += char;
        }
    }
    fields.push(currentField.trim());

    if (fields.length >= columnNames.length) {
        const obj: any = {};
        columnNames.forEach((name, idx) => {
            let val = fields[idx];
            if (val === 'NULL') val = null;
            else if (val.startsWith("'") && val.endsWith("'")) val = val.substring(1, val.length - 1);
            obj[name] = val;
        });
        results.push(obj);
    }
  }
  return results;
}

async function run() {
  console.log('🚀 Iniciando extração aprimorada de dados SQL...');
  if (!fs.existsSync(SQL_FILE)) {
      console.error(`❌ SQL file not found: ${SQL_FILE}`);
      return;
  }
  const fileContent = fs.readFileSync(SQL_FILE, 'utf8');
  const lines = fileContent.split('\n');
  
  const results: Record<string, any[]> = {
    clientes: [],
    contatos: [],
    links: []
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    for (const tableName of Object.keys(TABLES)) {
        if (line.includes(`INSERT INTO \`${tableName}\` VALUES`)) {
            const parsed = parseTuples(line.substring(line.indexOf("VALUES") + 7), tableName);
            results[tableName === 'clientes_contatos_links' ? 'links' : tableName].push(...parsed);
            
            // Handle multi-line inserts (if any)
            let nextLine = i + 1;
            while (nextLine < lines.length && lines[nextLine].trim().startsWith('(')) {
                const parsedMore = parseTuples(lines[nextLine], tableName);
                results[tableName === 'clientes_contatos_links' ? 'links' : tableName].push(...parsedMore);
                i = nextLine;
                nextLine++;
            }
        }
    }
  }

  console.log('✅ Extração concluída:');
  console.log(`- Clientes: ${results.clientes.length}`);
  console.log(`- Contatos: ${results.contatos.length}`);
  console.log(`- Links: ${results.links.length}`);
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
  console.log(`📂 Dados unificados salvos em: ${OUTPUT_FILE}`);
}

run().catch(console.error);
