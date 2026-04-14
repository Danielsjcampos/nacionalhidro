import { PrismaClient } from '@prisma/client';
import { PipefyBridgeService } from '../src/services/pipefyBridge.service';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();
const pipefyBridge = new PipefyBridgeService();

async function main() {
  const pipeId = '305769026'; // ID fornecido pelo usuário para RH
  console.log(`🚀 Iniciando bootstrap do Pipe RH (${pipeId})...`);
  
  try {
    // Forçar uso das credenciais do banco
    const config = await prisma.configuracao.findUnique({ where: { id: 'default' } });
    if (config?.pipefyClientId) {
      console.log('📝 Usando credenciais do banco de dados...');
    }

    const workflowId = await pipefyBridge.bootstrapWorkflowFromPipe(pipeId);
    console.log(`✅ Sucesso! Workflow criado/atualizado com ID: ${workflowId}`);
    
    const stages = await (prisma as any).workflowStage.findMany({
      where: { workflowId },
      orderBy: { ordem: 'asc' }
    });
    
    console.log('\nFases importadas:');
    stages.forEach((s: any) => console.log(` - ${s.nome}`));
    
  } catch (error: any) {
    console.error('❌ Erro no bootstrap:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
