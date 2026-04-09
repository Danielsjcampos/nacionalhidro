import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function testConnection() {
  console.log('🔗 Tentando conexão direta com a URL:', process.env.DATABASE_URL?.replace(/:([^@]+)@/, ':****@'));
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ CONEXÃO ESTABELECIDA COM SUCESSO AO POSTGRES!');
    const res = await client.query('SELECT current_database(), session_user;');
    console.log('📊 Dados da Sessão:', res.rows[0]);
    await client.end();
  } catch (err: any) {
    console.error('❌ ERRO DE CONEXÃO DIRETA:', err.message);
    if (err.message.includes('authentication failed')) {
      console.log('👉 Diagnóstico: A SENHA OU USUÁRIO ESTÃO INCORRETOS.');
    } else if (err.message.includes('timeout') || err.message.includes('ENOTFOUND')) {
      console.log('👉 Diagnóstico: PROBLEMA DE REDE OU IP BLOQUEADO NO NEON.');
    }
  }
}

testConnection();
