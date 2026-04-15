import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient();

/**
 * Script para migração em massa de clientes
 * Uso: npx ts-node src/scripts/migrate_clients.ts <caminho_do_arquivo>
 */

async function main() {
  // Use o arquivo extraído do SQL dump
  const OUTPUT_FILE = path.join(__dirname, '../../prisma/old_clients.json');
  console.log(`📂 Lendo dados extraídos: ${OUTPUT_FILE}`);

  if (!fs.existsSync(OUTPUT_FILE)) {
    console.error('❌ Arquivo old_clients.json não encontrado. Execute extract_sql_data.ts primeiro.');
    process.exit(1);
  }

  const rawData = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
  const { clientes, contatos, links } = rawData;
  console.log(`📊 Clientes: ${clientes.length}, Contatos: ${contatos.length}, Links: ${links.length}`);

  // Build Contact Lookup
  const contactMap: Record<string, any> = {};
  contatos.forEach((c: any) => { contactMap[c.id] = c; });

  // Build Client-Contact Mapping
  const clientContacts: Record<string, any[]> = {};
  links.forEach((l: any) => {
    if (!clientContacts[l.cliente_id]) clientContacts[l.cliente_id] = [];
    const contact = contactMap[l.contato_id];
    if (contact) {
      clientContacts[l.cliente_id].push({
        nome: contact.nome,
        cargo: contact.cargo || null,
        email: contact.email || null,
        telefone: contact.telefone || contact.celular || null,
        departamento: contact.departamento || null
      });
    }
  });

  let sucessos = 0;
  let falhas = 0;

  for (const row of clientes) {
    try {
      // MAPEAMENTO DE CAMPOS - SQL Legacy -> Prisma New
      const documento = String(row.cnpj || row.cpf || '').replace(/\D/g, '');
      
      if (!row.razao_social || !documento) {
        console.warn(`⚠️  Pulando registro incompleto: ID ${row.id} - ${row.razao_social}`);
        falhas++;
        continue;
      }

      const clienteData: any = {
        nome:               row.razao_social,
        nomeFantasia:       row.nome_fantasia || null,
        documento:          documento,
        codigo:             row.cliente_codigo ? String(row.cliente_codigo) : null,
        inscricaoEstadual:  row.ie || null,
        inscricaoMunicipal: row.inscricao_municipal || null,
        tipo:               row.tipo_pessoa === '2' ? 'PJ' : 'PF',
        
        // Portal
        linkPortal:         row.link_portal || null,
        usuarioPortal:      row.usuario_portal || null,
        senhaPortal:        row.senha_portal || null,
        
        // Comercial / Financeiro
        vendedorResponsavel:row.responsavel_comercial || null,
        aceitaCTe:          row.cte === '1',
        porcentagemRL:      (() => {
          const val = row.porcentagem_rl ? parseFloat(row.porcentagem_rl) : 0;
          if (val > 999.99) {
            console.warn(`⚠️  Valor inválido para porcentagemRL (ID ${row.id}): ${val}. Zerando.`);
            return 0;
          }
          return val;
        })(),
        diasVencimentoRL:   row.dias_vencimento ? parseInt(row.dias_vencimento) : 0,
        bloquearCliente:    row.bloqueado === '1',
        tipoFaturamento:    row.tipo_faturamento ? String(row.tipo_faturamento) : 'PADRAO',
        
        // Endereço
        endereco:           row.endereco || null,
        numero:             row.numero || null,
        complemento:        row.complemento || null,
        bairro:             row.bairro || null,
        cidade:             row.cidade || null,
        uf:                 row.estado_sigla || null,
        cep:                String(row.cep || '').replace(/\D/g, ''),
        pontoReferencia:    row.ponto_referencia || null,
        
        // Contatos (JSON Array)
        contatos:           clientContacts[row.id] || [],
        
        // Contato Principal (fallback se não houver vínculos)
        email:              row.email || null,
        telefone:           row.telefone || null,
        celular:            row.celular || null,
        fax:                row.fax || null,
        
        // Outros
        segmento:           row.segmento || null,
        observacoesGerais:  row.observacao || null,
        aniversarioReajuste:row.aniversario_reajuste ? new Date(row.aniversario_reajuste) : null,
      };

      await prisma.cliente.upsert({
        where: { documento: documento },
        update: clienteData,
        create: clienteData,
      });

      sucessos++;
      if (sucessos % 100 === 0) console.log(`🚀 Processados ${sucessos}...`);
    } catch (error: any) {
      console.error(`❌ Erro ao importar cliente ID ${row.id}:`, error.message);
      falhas++;
    }
  }

  console.log('\n✨ Migração concluída!');
  console.log(`✅ Sucessos: ${sucessos}`);
  console.log(`❌ Falhas: ${falhas}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
