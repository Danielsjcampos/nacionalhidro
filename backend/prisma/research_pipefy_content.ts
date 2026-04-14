import { PipefyBridgeService } from '../src/services/pipefyBridge.service';
import axios from 'axios';

async function research() {
  const b = new PipefyBridgeService();
  const token = await b.getAccessToken();
  const pipeId = '305769026';

  const query = `
    {
      pipe(id: "${pipeId}") {
        name
        email_templates {
          id
          name
          subject
          body
        }
      }
    }
  `;

  try {
    const res = await axios.post('https://api.pipefy.com/graphql', { query }, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
    });
    console.log('Email Templates:', JSON.stringify(res.data.data.pipe.email_templates, null, 2));

    // Research Automations
    const autoQuery = `
      {
        pipe(id: "${pipeId}") {
          automations {
            id
            name
            active
          }
        }
      }
    `;
    const autoRes = await axios.post('https://api.pipefy.com/graphql', { query: autoQuery }, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
    });
    console.log('Automations:', JSON.stringify(autoRes.data.data.pipe.automations, null, 2));

  } catch (e: any) {
    console.error('Error:', e.message);
  }
}

research();
