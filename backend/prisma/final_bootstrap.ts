import { PrismaClient } from '@prisma/client';
import { PipefyBridgeService } from '../src/services/pipefyBridge.service';
import * as dotenv from 'dotenv';
import * as path from 'path';
import axios from 'axios';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();
const pipefyBridge = new PipefyBridgeService();

async function main() {
  const pipeId = '305769026';
  
  try {
    console.log('📦 Atualizando chaves no banco de dados...');
    await prisma.configuracao.upsert({
      where: { id: 'default' },
      update: {
        pipefyClientId: 'sDspbmbXa4WWAHvLrdZ9Ho5rPERIioFgs1jEpO1CYD8',
        pipefyClientSecret: 'lC1taypQlR1QdQylqcq_re9n6i2BerGHOSrciXLPbqE'
      },
      create: {
        id: 'default',
        pipefyClientId: 'sDspbmbXa4WWAHvLrdZ9Ho5rPERIioFgs1jEpO1CYD8',
        pipefyClientSecret: 'lC1taypQlR1QdQylqcq_re9n6i2BerGHOSrciXLPbqE'
      }
    });

    console.log('✅ Chaves atualizadas. Obtendo token...');
    const token = await pipefyBridge.getAccessToken();
    console.log('✅ Token obtido.');

    console.log('🔍 Buscando Pipe diretamente...');
    const query = `
      {
        pipe(id: "${pipeId}") {
          id
          name
          phases { id name }
          start_form_fields { id label type required options }
        }
      }
    `;

    const response = await axios.post(
      'https://api.pipefy.com/graphql',
      { query },
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    if (response.data.data?.pipe) {
      console.log('✅ Pipe encontrado diretamente.');
      // Continuar bootstrap...
    } else {
      console.warn('⚠️ Pipe não encontrado diretamente. Buscando via Organizações...');
      const orgQuery = '{ organizations { pipes { id name } } }';
      const orgRes = await axios.post(
        'https://api.pipefy.com/graphql',
        { query: orgQuery },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      console.log('Data structure:', JSON.stringify(orgRes.data, null, 2));
    }

    // Finalmente, rodar o bootstrap padrão que agora tem o fallback
    const workflowId = await pipefyBridge.bootstrapWorkflowFromPipe(pipeId);
    console.log('🎉 SUCESSO TOTAL! Workflow ID:', workflowId);

  } catch (error: any) {
    console.error('❌ FATAL:', error.message);
    if (error.response) console.error('Data:', JSON.stringify(error.response.data, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main();
