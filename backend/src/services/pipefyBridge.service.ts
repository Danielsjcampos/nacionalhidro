import axios from 'axios';
import prisma from '../lib/prisma';

const PIPEFY_API_URL = 'https://api.pipefy.com/graphql';

export interface PipefyField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
}

export interface PipefyPhase {
  id: string;
  name: string;
  fields: PipefyField[];
}

export interface PipefyPipeMetadata {
  id: string;
  name: string;
  phases: PipefyPhase[];
}

export class PipefyBridgeService {
  private apiToken: string | null = null;

  async getAccessToken(): Promise<string> {
    if (this.apiToken) return this.apiToken;

    const clientId = process.env.PIPEFY_CLIENT_ID;
    const clientSecret = process.env.PIPEFY_CLIENT_SECRET;
    const oauthUrl = process.env.PIPEFY_OAUTH_URL || 'https://app.pipefy.com/oauth/token';

    if (process.env.PIPEFY_API_TOKEN) {
      this.apiToken = process.env.PIPEFY_API_TOKEN;
      return this.apiToken;
    }

    if (!clientId || !clientSecret) {
      throw new Error('Pipefy Client ID or Secret not configured in .env');
    }

    try {
      const response = await axios.post(oauthUrl, {
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret
      });

      this.apiToken = response.data.access_token;
      return this.apiToken!;
    } catch (error: any) {
      console.error('[PipefyBridge] OAuth Error:', error.response?.data || error.message);
      throw new Error('Falha na autenticação com Pipefy (OAuth)');
    }
  }

  async fetchPipeMetadata(pipeId: string): Promise<PipefyPipeMetadata> {
    const query = `
      query GetPipeMetadata($id: ID!) {
        pipe(id: $id) {
          id
          name
          phases {
            id
            name
            fields {
              id
              label
              type
              required
              options
            }
          }
        }
      }
    `;

    try {
      const token = await this.getAccessToken();
      const response = await axios.post(
        PIPEFY_API_URL || 'https://api.pipefy.com/graphql',
        { query, variables: { id: pipeId } },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.errors) {
        throw new Error(`Pipefy API Error: ${JSON.stringify(response.data.errors)}`);
      }

      return response.data.data.pipe;
    } catch (error: any) {
      console.error('[PipefyBridge] Error fetching metadata:', error.message);
      throw error;
    }
  }

  async bootstrapWorkflowFromPipe(pipeId: string): Promise<string> {
    const metadata = await this.fetchPipeMetadata(pipeId);

    // 1. Criar ou atualizar o Workflow
    const workflow = await (prisma as any).workflow.upsert({
      where: { id: metadata.id },
      update: { nome: metadata.name },
      create: {
        id: metadata.id,
        nome: metadata.name,
        setor: 'RH', // Default
      },
    });

    // 2. Criar as fases (Stages)
    for (let i = 0; i < metadata.phases.length; i++) {
      const phase = metadata.phases[i];
      const stage = await (prisma as any).workflowStage.upsert({
        where: { id: phase.id },
        update: { nome: phase.name, ordem: i },
        create: {
          id: phase.id,
          workflowId: workflow.id,
          nome: phase.name,
          ordem: i,
        },
      });

      // 3. Criar os campos (Fields)
      for (let j = 0; j < phase.fields.length; j++) {
        const field = phase.fields[j];
        await (prisma as any).workflowField.upsert({
          where: { id: field.id },
          update: { 
            nome: field.id, 
            label: field.label, 
            tipo: this.mapType(field.type), 
            obrigatorio: field.required,
            opcoes: field.options,
            ordem: j 
          },
          create: {
            id: field.id,
            workflowId: workflow.id,
            stageId: stage.id,
            nome: field.id,
            label: field.label,
            tipo: this.mapType(field.type),
            obrigatorio: field.required,
            opcoes: field.options,
            ordem: j,
          },
        });
      }
    }

    return workflow.id;
  }

  private mapType(pipefyType: string): string {
    const mapping: Record<string, string> = {
      'short_text': 'TEXT',
      'long_text': 'TEXTAREA',
      'number': 'NUMBER',
      'select': 'SELECT',
      'radio_vertical': 'SELECT',
      'radio_horizontal': 'SELECT',
      'checkbox': 'CHECKBOX',
      'date': 'DATE',
      'datetime': 'DATETIME',
      'attachment': 'FILE',
      'email': 'EMAIL',
      'phone': 'PHONE',
      'cpf': 'CPF',
      'cnpj': 'CNPJ',
    };
    return mapping[pipefyType] || 'TEXT';
  }
}

export const pipefyBridgeService = new PipefyBridgeService();
