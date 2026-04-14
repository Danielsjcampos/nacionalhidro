import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

async function main() {
  try {
    const config = await prisma.configuracao.findUnique({ where: { id: 'default' } });
    const clientId = config?.pipefyClientId;
    const clientSecret = config?.pipefyClientSecret;

    console.log('Using Client ID:', clientId?.substring(0, 5) + '...');

    const oauthRes = await axios.post('https://app.pipefy.com/oauth/token', {
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret
    });

    const token = oauthRes.data.access_token;
    console.log('Token obtained:', token.substring(0, 10) + '...');

    const query = '{ me { name id } }';
    const res = await axios.post('https://api.pipefy.com/graphql', { query }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    console.log('Status:', res.status);
    console.log('Data:', JSON.stringify(res.data, null, 2));

  } catch (error: any) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Body:', error.response.data.substring(0, 500));
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
