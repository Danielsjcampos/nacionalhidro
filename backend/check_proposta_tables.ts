import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();
async function main() {
  const db = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: Number(process.env.MYSQL_PORT) || 3306,
  });
  const [rows] = await db.query("SHOW TABLES LIKE '%proposta%'");
  console.log(rows);
  db.end();
}
main();
