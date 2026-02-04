const { Client } = require('pg');
// Load env vars manually or assume they are set. 
// Since we are running with dotenv, we can use it.
const dotenv = require('dotenv');
dotenv.config();

console.log("Testing connection to:", process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':***@')); 

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function test() {
  try {
    console.log('Connecting...');
    await client.connect();
    console.log('Connected successfully');
    const res = await client.query('SELECT NOW()');
    console.log('Time:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('Connection error:', err);
  }
}

test();
