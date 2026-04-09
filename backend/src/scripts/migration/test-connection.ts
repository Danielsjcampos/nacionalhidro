
import mysql from 'mysql2/promise';

async function test() {
  const config = {
    host: '187.77.62.222',
    port: 3306,
    user: 'nhidro',
    password: 'nhidropassword',
    database: 'nhidro'
  };

  try {
    console.log('Tentando conectar ao MySQL Legado...');
    const connection = await mysql.createConnection(config);
    console.log('Conexão bem-sucedida!');
    const [rows]: any = await connection.query('SELECT COUNT(*) as count FROM empresas');
    console.log('Total de empresas encontradas:', rows[0].count);
    await connection.end();
  } catch (err: any) {
    console.error('Erro na conexão:', err.message);
  }
}

test();
