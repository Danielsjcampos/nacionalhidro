import { PipefyBridgeService } from '../src/services/pipefyBridge.service';
import * as dotenv from 'dotenv';
import * as path from 'path';
import axios from 'axios';

dotenv.config({ path: path.join(__dirname, '../.env') });

const pipefyBridge = new PipefyBridgeService();

async function main() {
  try {
    const token = await pipefyBridge.getAccessToken();
    console.log('✅ Token obtido com sucesso.');

    const query = `
      {
        me {
          name
          email
          id
        }
        organizations {
          id
          name
          pipes {
            id
            name
          }
        }
      }
    `;

    const response = await axios.post(
      'https://api.pipefy.com/graphql',
      { query },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('[DEBUG] Raw Response Status:', response.status);
    console.log('[DEBUG] Raw Response Data:', JSON.stringify(response.data, null, 2));

    if (response.data.errors) {
      console.error('❌ Erro na API:', JSON.stringify(response.data.errors, null, 2));
      return;
    }

    console.log('\n👤 Usuário Autorizado:', response.data.data.me);
    console.log('\n🏢 Organizações e Pipes Disponíveis:');
    
    response.data.data.organizations.forEach((org: any) => {
      console.log(`\n📦 Org: ${org.name} (ID: ${org.id})`);
      org.pipes.forEach((pipe: any) => {
        console.log(`  - ${pipe.name} (ID: ${pipe.id})`);
      });
    });

  } catch (error: any) {
    console.error('❌ Erro de conexão:', error.response?.data || error.message);
  }
}

main();
