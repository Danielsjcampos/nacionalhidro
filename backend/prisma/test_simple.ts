import { PipefyBridgeService } from '../src/services/pipefyBridge.service';
import * as dotenv from 'dotenv';
import * as path from 'path';
import axios from 'axios';

dotenv.config({ path: path.join(__dirname, '../.env') });

const pipefyBridge = new PipefyBridgeService();

async function main() {
  try {
    const token = await pipefyBridge.getAccessToken();
    console.log('✅ Token obtido.');

    const query = '{ me { name id } }';

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

    console.log('HTTP Status:', response.status);
    console.log('Response Body:', JSON.stringify(response.data, null, 2));

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
       console.error('Response Status:', error.response.status);
       console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

main();
