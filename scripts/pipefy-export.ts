/**
 * Pipefy Data Export Script
 * Exports all recruitment pipeline data via OAuth2 + GraphQL API
 * 
 * Usage: npx ts-node scripts/pipefy-export.ts
 */

const PIPEFY_CLIENT_ID = 'ctMajuCvilt0_A9QyL0t7BZJ8K0fL4Hi7qzDDM45gPg';
const PIPEFY_CLIENT_SECRET = 'U5FnlghqEVeGAiX9DLQKlY2EcqMTKGXvz3h43VtHHkU';
const PIPEFY_TOKEN_URL = 'https://app.pipefy.com/oauth/token';
const PIPEFY_GRAPHQL_URL = 'https://api.pipefy.com/graphql';

interface OAuthToken {
    access_token: string;
    token_type: string;
    expires_in: number;
}

// ─── Step 1: Get OAuth2 Access Token ────────────────────────
async function getAccessToken(): Promise<string> {
    console.log('🔑 Autenticando com Pipefy OAuth2...');

    const response = await fetch(PIPEFY_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: PIPEFY_CLIENT_ID,
            client_secret: PIPEFY_CLIENT_SECRET,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OAuth2 falhou (${response.status}): ${errorText}`);
    }

    const data: OAuthToken = await response.json();
    console.log(`✅ Token obtido (expira em ${data.expires_in}s)`);
    return data.access_token;
}

// ─── Step 2: GraphQL Helper ─────────────────────────────────
async function graphql(token: string, query: string, variables?: Record<string, any>): Promise<any> {
    const response = await fetch(PIPEFY_GRAPHQL_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GraphQL falhou (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    if (result.errors) {
        console.error('⚠️ GraphQL Errors:', JSON.stringify(result.errors, null, 2));
    }
    return result.data;
}

// ─── Step 3: List Organization & Pipes ──────────────────────
async function listOrganizationAndPipes(token: string) {
    console.log('\n📋 Buscando informações do usuário...');

    // Service accounts use 'me' query but without organizations
    const meData = await graphql(token, `
    {
      me {
        id
        name
        email
      }
    }
  `);

    console.log(`\n👤 Usuário: ${meData?.me?.name || 'Service Account'} (${meData?.me?.email || 'N/A'})`);

    // Try to list organization pipes directly  
    // First, let's try to get the organization
    console.log('\n🔍 Buscando organização...');
    const orgData = await graphql(token, `
    {
      organizations {
        id
        name
        pipes {
          id
          name
          phases {
            id
            name
            cards_count
          }
        }
      }
    }
  `);

    if (orgData?.organizations && orgData.organizations.length > 0) {
        return { orgs: orgData.organizations, me: meData?.me };
    }

    // If organizations query doesn't work, the service account needs to be assigned to pipes
    console.log('⚠️ Nenhuma organização retornada pela query principal.');
    console.log('   Tentando buscar pipes por ID diretamente...');

    return { orgs: null, me: meData?.me };
}

// ─── Step 4: Get All Cards from a Pipe ──────────────────────
async function getAllCards(token: string, pipeId: string) {
    console.log(`\n📦 Exportando cards do Pipe ${pipeId}...`);

    let allCards: any[] = [];
    let cursor: string | null = null;
    let hasMore = true;
    let page = 1;

    while (hasMore) {
        console.log(`  → Página ${page}...`);

        const data = await graphql(token, `
      query ($pipeId: ID!, $after: String) {
        allCards(pipeId: $pipeId, first: 50, after: $after) {
          edges {
            node {
              id
              title
              current_phase {
                id
                name
              }
              createdAt
              updated_at
              done
              assignees {
                id
                name
                email
              }
              fields {
                name
                value
                field {
                  id
                  label
                  type
                }
              }
              comments {
                text
                author_name
                created_at
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `, { pipeId, after: cursor });

        const edges = data?.allCards?.edges || [];
        const pageInfo = data?.allCards?.pageInfo;

        for (const edge of edges) {
            allCards.push(edge.node);
        }

        hasMore = pageInfo?.hasNextPage || false;
        cursor = pageInfo?.endCursor || null;
        page++;
    }

    console.log(`✅ Total de cards exportados: ${allCards.length}`);
    return allCards;
}

// ─── Step 5: Get Pipe Phases Details ────────────────────────
async function getPipeDetails(token: string, pipeId: string) {
    const data = await graphql(token, `
    query ($pipeId: ID!) {
      pipe(id: $pipeId) {
        id
        name
        phases {
          id
          name
          cards_count
          fields {
            id
            label
            type
            required
            options
          }
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
  `, { pipeId });

    return data?.pipe;
}

// ─── Main ───────────────────────────────────────────────────
async function main() {
    console.log('═══════════════════════════════════════════');
    console.log('  🚀 Pipefy Export - Nacional Hidro');
    console.log('═══════════════════════════════════════════\n');

    try {
        // 1. Authenticate
        const token = await getAccessToken();

        // 2. Discover organization and pipes
        const result = await listOrganizationAndPipes(token);

        if (!result.orgs || result.orgs.length === 0) {
            console.log('\n⚠️  Nenhum pipe encontrado.');
            console.log('');
            console.log('   📌 PASSO NECESSÁRIO:');
            console.log('   A Service Account precisa ser adicionada ao pipe de Recrutamento.');
            console.log('');
            console.log('   No Pipefy:');
            console.log('   1. Vá em Configurações da Empresa → Contas de Serviço');
            console.log('   2. Clique na conta "antigraviti"');
            console.log('   3. Clique na aba "Pipes (0)"');
            console.log('   4. Clique em "Adicionar pipe"');
            console.log('   5. Selecione o pipe de Recrutamento');
            console.log('   6. Rode este script novamente!\n');
            return;
        }

        const fs = require('fs');
        const path = require('path');

        for (const org of result.orgs) {
            console.log(`\n🏢 Organização: ${org.name} (ID: ${org.id})`);

            if (!org.pipes || org.pipes.length === 0) {
                console.log('   ⚠️ Nenhum pipe acessível nesta organização.');
                continue;
            }

            for (const pipe of org.pipes) {
                console.log(`\n  📌 Pipe: ${pipe.name} (ID: ${pipe.id})`);

                if (pipe.phases) {
                    console.log('     Fases:');
                    for (const phase of pipe.phases) {
                        console.log(`       - ${phase.name}: ${phase.cards_count} cards`);
                    }
                }

                // Get full pipe details
                const pipeDetails = await getPipeDetails(token, pipe.id);

                // Export all cards
                const cards = await getAllCards(token, pipe.id);

                // Group by phase
                const byPhase: Record<string, any[]> = {};
                for (const card of cards) {
                    const phaseName = card.current_phase?.name || 'Sem Fase';
                    if (!byPhase[phaseName]) byPhase[phaseName] = [];
                    byPhase[phaseName].push(card);
                }

                // Save to JSON
                const exportData = {
                    exportDate: new Date().toISOString(),
                    pipe: {
                        id: pipe.id,
                        name: pipe.name,
                        phases: pipeDetails?.phases || pipe.phases,
                        startFormFields: pipeDetails?.start_form_fields || [],
                    },
                    totalCards: cards.length,
                    cardsByPhase: byPhase,
                    allCards: cards,
                };

                const safeName = pipe.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
                const dateStr = new Date().toISOString().split('T')[0];
                const filename = `pipefy_export_${safeName}_${dateStr}.json`;
                const filepath = path.join(process.cwd(), filename);

                fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2), 'utf-8');
                console.log(`\n💾 Dados salvos em: ${filepath}`);

                // Print summary
                console.log(`\n📊 Resumo:`);
                for (const [phase, phaseCards] of Object.entries(byPhase)) {
                    console.log(`   ${phase}: ${(phaseCards as any[]).length} candidatos`);
                }
            }
        }

        console.log('\n═══════════════════════════════════════════');
        console.log('  ✅ Exportação concluída!');
        console.log('═══════════════════════════════════════════');

    } catch (error: any) {
        console.error('\n❌ Erro:', error.message);

        if (error.message.includes('401') || error.message.includes('403')) {
            console.log('\n💡 Dica: Verifique se:');
            console.log('   1. O Client ID e Secret estão corretos');
            console.log('   2. A Service Account foi adicionada aos pipes');
            console.log('   3. No Pipefy: Conta de Serviço → aba "Pipes" → Adicionar pipe');
        }
    }
}

main();

