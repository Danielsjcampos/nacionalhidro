const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_QzkomiupH0Z1@ep-calm-breeze-aciek47r-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
});

async function run() {
  await client.connect();
  const leads = await client.query('SELECT count(*) FROM "Lead"');
  console.log('Total Leads:', leads.rows[0]);
  
  const frotas = await client.query('SELECT count(*) FROM "Veiculo"');
  console.log('Total Veiculos (Frota):', frotas.rows[0]);
  
  await client.end();
}

run().catch(console.error);
