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

    const config = await prisma.configuracao.findUnique({ where: { id: 'default' } });
    
    const clientId = config?.pipefyClientId || process.env.PIPEFY_CLIENT_ID;
    const clientSecret = config?.pipefyClientSecret || process.env.PIPEFY_CLIENT_SECRET;
    const oauthUrl = process.env.PIPEFY_OAUTH_URL || 'https://app.pipefy.com/oauth/token';

    if (process.env.PIPEFY_API_TOKEN) {
      this.apiToken = process.env.PIPEFY_API_TOKEN;
      return this.apiToken;
    }

    if (!clientId || !clientSecret) {
      throw new Error('Pipefy Client ID ou Secret não configurado (Verifique Configurações do Sistema)');
    }

    try {
      const response = await axios.post(oauthUrl, {
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret
      });

      this.apiToken = response.data.access_token;
      console.log('[DEBUG] Token obtained (prefix):', this.apiToken?.substring(0, 10));
      return this.apiToken!;
    } catch (error: any) {
      console.error('[PipefyBridge] OAuth Error:', error.response?.data || error.message);
      if (error.response?.data && typeof error.response.data === 'string' && error.response.data.includes('Sign in')) {
        console.error('[PipefyBridge] OAuth returned Login Page HTML instead of JSON!');
      }
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
            'Accept': 'application/json'
          },
        }
      );

      if (response.data.errors) {
        console.error('[PipefyBridge] API Errors:', JSON.stringify(response.data.errors, null, 2));
        throw new Error(`Pipefy API Error: ${JSON.stringify(response.data.errors)}`);
      }

      const pipeData = response.data?.data?.pipe;
      
      if (!pipeData) {
        console.warn(`[PipefyBridge] Direct pipe lookup returned null for ID ${pipeId}. Searching through organizations...`);
        
        // Fallback: Buscar nas organizações se o ID direto falhar (comum em Contas de Serviço)
        const searchQuery = `
          {
            organizations {
              pipes {
                id
                name
                phases {
                  id
                  name
                }
                start_form_fields {
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
        
        const orgResponse = await axios.post(
          'https://api.pipefy.com/graphql',
          { query: searchQuery },
          { 
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            } 
          }
        );
        
        if (orgResponse.data.errors) {
          console.error('[PipefyBridge] Fallback Query Errors:', JSON.stringify(orgResponse.data.errors, null, 2));
          throw new Error(`Erro na busca por organizações: ${orgResponse.data.errors[0].message}`);
        }

        const data = orgResponse.data?.data;
        if (!data?.organizations) {
          console.error('[PipefyBridge] Fallback Data missing organizations:', JSON.stringify(orgResponse.data, null, 2));
          throw new Error('Não foi possível listar organizações no fallback');
        }

        const allPipes = data.organizations.flatMap((o: any) => o.pipes || []);
        const foundPipe = allPipes.find((p: any) => p.id === pipeId);
        
        if (!foundPipe) {
          throw new Error(`Pipe ${pipeId} não encontrado nas organizações acessíveis`);
        }
        
        console.log(`✅ Pipe ${pipeId} ("${foundPipe.name}") encontrado via busca em organizações.`);
        return foundPipe;
      }

      return pipeData;
    } catch (error: any) {
      console.error('[PipefyBridge] Error fetching metadata:', error.message);
      if (error.response?.data) {
        console.error('[PipefyBridge] API Error Data:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  async bootstrapWorkflowFromPipe(pipeId: string): Promise<string> {
    const metadata = await this.fetchPipeMetadata(pipeId);

    // 1. Criar ou atualizar o Workflow
    const workflow = await prisma.workflow.upsert({
      where: { id: metadata.id },
      update: { nome: metadata.name },
      create: {
        id: metadata.id,
        nome: metadata.name,
        setor: 'RH',
      },
    });

    // 2. Importar Templates de E-mail
    await this.importEmailTemplates(workflow.id, pipeId);

    // 3. Criar as fases (Stages)
    for (let i = 0; i < metadata.phases.length; i++) {
      const phase = metadata.phases[i];
      const stage = await prisma.workflowStage.upsert({
        where: { id: phase.id },
        update: { nome: phase.name, ordem: i },
        create: {
          id: phase.id,
          nome: phase.name,
          ordem: i,
          workflow: { connect: { id: workflow.id } }
        },
      });

      // 4. Importar Automações para esta fase
      await this.importAutomationsForStage(workflow.id, stage.id, pipeId);

      // 5. Criar os campos (Fields)
      for (let j = 0; j < phase.fields.length; j++) {
        const field = phase.fields[j];
        await prisma.workflowField.upsert({
          where: { id: field.id },
          update: { 
            nome: field.id, 
            label: field.label, 
            tipo: this.mapType(field.type), 
            obrigatorio: field.required || false,
            opcoes: field.options as any,
            ordem: j 
          },
          create: {
            id: field.id,
            nome: field.id,
            label: field.label,
            tipo: this.mapType(field.type),
            obrigatorio: field.required || false,
            opcoes: field.options as any,
            ordem: j,
            workflow: { connect: { id: workflow.id } },
            stage: { connect: { id: stage.id } }
          },
        });
      }
    }

    // 6. Importar Cards (Dados)
    await this.importCards(workflow.id, pipeId);

    return workflow.id;
  }

  private async importEmailTemplates(workflowId: string, pipeId: string) {
    const query = `
      query GetTemplates($pipeId: ID!) {
        emailTemplates(repoId: $pipeId) {
          edges {
            node {
              id
              name
              subject
              body
            }
          }
        }
      }
    `;

    try {
      const token = await this.getAccessToken();
      const response = await axios.post(PIPEFY_API_URL, { query, variables: { pipeId } }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      const templates = response.data?.data?.emailTemplates?.edges || [];
      for (const edge of templates) {
        const t = edge.node;
        await prisma.workflowEmailTemplate.upsert({
          where: { id: t.id },
          update: { nome: t.name, assunto: t.subject, corpo: t.body },
          create: {
            id: t.id,
            workflowId,
            nome: t.name,
            assunto: t.subject,
            corpo: t.body
          }
        });
      }
      console.log(`[PipefyBridge] Importados ${templates.length} templates de e-mail para o pipe ${pipeId}.`);
    } catch (error) {
      console.warn('[PipefyBridge] Falha ao importar templates:', error);
    }
  }

  private async importAutomationsForStage(workflowId: string, stageId: string, pipeId: string) {
    // Nota: Pipefy API de automações é complexa e muitas vezes inacessível via Service Account comum.
    // Implementamos um placeholder que o usuário pode expandir.
  }

  private async importCards(workflowId: string, pipeId: string) {
    let hasNextPage = true;
    let after = null;

    console.log(`[PipefyBridge] Iniciando importação de cards para pipe ${pipeId}...`);

    while (hasNextPage) {
      const query = `
        query GetCards($pipeId: ID!, $after: String) {
          allCards(pipeId: $pipeId, first: 50, after: $after) {
            pageInfo { hasNextPage endCursor }
            edges {
              node {
                id
                title
                current_phase { id }
                fields {
                  field { id }
                  value
                }
              }
            }
          }
        }
      `;

      try {
        const token = await this.getAccessToken();
        const response = await axios.post(PIPEFY_API_URL, 
          { query, variables: { pipeId, after } }, 
          { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
        );

        const data = response.data?.data?.allCards;
        if (!data) break;

        for (const edge of data.edges) {
          const card = edge.node;
          const stageId = card.current_phase?.id;
          
          if (!stageId) continue;

          const dados: Record<string, any> = {};
          card.fields.forEach((f: any) => {
            dados[f.field.id] = f.value;
          });

          await prisma.workflowCard.upsert({
            where: { id: card.id },
            update: { 
              titulo: card.title,
              stageId,
              dados
            },
            create: {
              id: card.id,
              workflowId,
              stageId,
              titulo: card.title,
              dados
            }
          });
        }

        hasNextPage = data.pageInfo.hasNextPage;
        after = data.pageInfo.endCursor;
      } catch (error) {
        console.error('[PipefyBridge] Erro ao importar cards:', error);
        hasNextPage = false;
      }
    }
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
