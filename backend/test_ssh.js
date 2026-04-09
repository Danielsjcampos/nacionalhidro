const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 33060,
    user: 'nhidro',
    password: 'nhidropassword',
    database: 'nhidro'
  });
  const [rows] = await conn.query('SELECT COUNT(*) as count FROM clientes');
  console.log('Legacy Clientes: ' + rows[0].count);
  await conn.end();
}
main().catch(console.error);
