import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

console.log('📍 Diretório Atual (CWD):', process.cwd());
const envPath = path.resolve(process.cwd(), '.env');
console.log('🔎 Procurando .env em:', envPath);

if (fs.existsSync(envPath)) {
  console.log('✅ Arquivo .env encontrado!');
  const result = dotenv.config();
  if (result.error) {
    console.error('❌ Erro ao carregar .env:', result.error);
  } else {
    console.log('📊 Variáveis carregadas:', Object.keys(result.parsed || {}));
    if (result.parsed && result.parsed.DATABASE_URL) {
      console.log('🔗 DATABASE_URL está presente no .env');
    } else {
      console.log('⚠️ DATABASE_URL NÃO encontrada no arquivo');
    }
  }
} else {
  console.log('❌ Arquivo .env NÃO encontrado no diretório atual!');
}
