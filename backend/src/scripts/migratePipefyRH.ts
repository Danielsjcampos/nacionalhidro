import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Paths to Pipefy JSON files
const BASE_DIR = path.resolve(__dirname, '../../../../');
const FILES = {
  RECRUTAMENTO: path.join(BASE_DIR, 'pipefy_export__rh__recrutamento_e_sele__o_2026-03-04.json'),
  ADMISSAO: path.join(BASE_DIR, 'pipefy_export__rh__admiss_o_de_colaboradores_2026-03-04.json'),
  GESTAO: path.join(BASE_DIR, 'pipefy_export__dp__gest_o_de_colaboradores_2026-03-04.json'),
  FERIAS: path.join(BASE_DIR, 'pipefy_export__dp__controle_de_f_rias_2026-03-04.json'),
  DESLIGAMENTO: path.join(BASE_DIR, 'pipefy_export__dp__desligamento_de_colaboradores_2026-03-04.json'),
};

// Helper: Read and parse JSON if file exists
function loadJson(filePath: string): any {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('❌ Error reading file ' + filePath + ':', error);
  }
  return null;
}

// Helper: Get value from Pipefy fields array by field ID or partial name
function getFieldValue(fields: any[], fieldIdMatches: string[]): string | undefined {
  for (const field of fields) {
    if (field.field?.id && fieldIdMatches.some((match) => field.field.id.toLowerCase().includes(match))) {
      return field.value;
    }
  }
  return undefined;
}

// Ensure string value
function secureStr(val: any): string {
  if (!val) return '';
  if (Array.isArray(val)) return val[0] || '';
  return String(val).trim();
}

async function runMigration() {
  console.log('🚀 Iniciando Migração do Pipefy para o Neon DB (Prisma)...\n');

  // =========================================================================
  // 1. RECRUTAMENTO E SELEÇÃO -> CANDIDATO
  // =========================================================================
  const recData = loadJson(FILES.RECRUTAMENTO);
  if (recData && recData.cardsByPhase) {
    console.log('📦 Processando Recrutamento... (' + recData.totalCards + ' cards)');
    let count = 0;
    
    for (const phase of Object.keys(recData.cardsByPhase)) {
      const cards = recData.cardsByPhase[phase];
      for (const card of cards) {
        const fields = card.fields || [];
        
        let nome = secureStr(getFieldValue(fields, ['nome_completo', 'nome']));
        if (!nome) nome = card.title; // Fallback to card title
        
        const email = secureStr(getFieldValue(fields, ['e_mail', 'email']));
        const telefone = secureStr(getFieldValue(fields, ['celular', 'telefone']));
        const cpf = secureStr(getFieldValue(fields, ['cpf']));
        const rg = secureStr(getFieldValue(fields, ['rg']));
        const genero = secureStr(getFieldValue(fields, ['sexo', 'genero']));
        const endereco = secureStr(getFieldValue(fields, ['endere_o', 'endereco']));
        const curriculoStr = secureStr(getFieldValue(fields, ['anexar_curr_culo']));
        const cargo = secureStr(getFieldValue(fields, ['vaga_desejada', 'sele_o_de_lista', 'vaga_pleiteada']));
        const dataNascimentoStr = secureStr(getFieldValue(fields, ['data_de_nascimento']));
        
        let dataNascimento: Date | null = null;
        if (dataNascimentoStr && dataNascimentoStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
            const parts = dataNascimentoStr.split('/');
            const dia = parts[0];
            const mes = parts[1];
            const ano = parts[2];
            dataNascimento = new Date(ano + '-' + mes + '-' + dia + 'T00:00:00Z');
        }

        // Map phases to DB status/etapa
        let etapa = phase.toUpperCase();
        let status = 'ATIVO';

        if (phase.includes('Incompatível') || phase.includes('Proposta recusada')) {
            status = 'DESCLASSIFICADO';
        } else if (phase.includes('Proposta aceita') || phase.includes('Admissão')) {
            status = 'CONTRATADO';
            etapa = 'CONTRATADO';
        }

        try {
          // If cpf is available, use upsert. Otherwise, just create if email doesn't exist
          if (cpf && cpf.replace(/\D/g, '').length === 11) {
            await (prisma as any).candidato.upsert({
              where: { cpf },
              update: { nome, email, telefone, whatsapp: telefone, cargo, endereco, genero, etapa, status },
              create: { nome, email, cpf, telefone, whatsapp: telefone, cargo, endereco, genero, dataNascimento, curriculo: curriculoStr, etapa, status }
            });
          } else if (email) {
             const existing = await (prisma as any).candidato.findFirst({ where: { email } });
             if (!existing) {
                 await (prisma as any).candidato.create({
                     data: { nome, email, telefone, whatsapp: telefone, cargo, endereco, genero, dataNascimento, curriculo: curriculoStr, etapa, status }
                 });
             }
          } else {
             await (prisma as any).candidato.create({
                data: { nome, telefone, whatsapp: telefone, cargo, endereco, genero, etapa, status }
             });
          }
          count++;
        } catch (e: any) {
          console.error('  [!] Erro candidato ' + nome + ': ' + e.message);
        }
      }
    }
    console.log('✅ ' + count + ' Candidatos migrados.\n');
  }

  // =========================================================================
  // 2. ADMISSÃO -> ADMISSAO E FUNCIONARIO
  // =========================================================================
  const admData = loadJson(FILES.ADMISSAO);
  if (admData && admData.cardsByPhase) {
    console.log('📦 Processando Admissões... (' + admData.totalCards + ' cards)');
    let count = 0;
    
    for (const phase of Object.keys(admData.cardsByPhase)) {
      const cards = admData.cardsByPhase[phase];
      for (const card of cards) {
        const fields = card.fields || [];
        
        let nome = secureStr(getFieldValue(fields, ['nome_completo', 'nome'])) || card.title;
        const email = secureStr(getFieldValue(fields, ['e_mail', 'email']));
        const telefone = secureStr(getFieldValue(fields, ['celular', 'telefone']));
        const cpf = secureStr(getFieldValue(fields, ['cpf']));
        const cargo = secureStr(getFieldValue(fields, ['cargo']));
        const departamento = secureStr(getFieldValue(fields, ['departamento']));
        const salarioStr = secureStr(getFieldValue(fields, ['salario', 'sal_rio']));
        
        let salario = parseFloat(salarioStr.replace(/[R$\s.]/g, '').replace(',', '.'));
        if (isNaN(salario)) salario = 0;

        let etapa = 'DOCUMENTACAO';
        let status = 'EM_ANDAMENTO';

        if (phase.includes('Exame Admissional')) etapa = 'EXAME_ASO';
        else if (phase.includes('Contabilidade')) etapa = 'CONTABILIDADE';
        else if (phase.includes('Assinatura')) etapa = 'CONTRATO';
        else if (phase.includes('Contratado') || phase.includes('Treinamento')) {
            etapa = 'CONCLUIDA';
            status = 'CONCLUIDA';
        } else if (phase.includes('Cancelado')) {
            status = 'CANCELADA';
        }

        try {
            // Find existing adms by CPF to prevent dupes
            let existingAdm = null;
            if (cpf) {
                existingAdm = await (prisma as any).admissao.findFirst({ where: { cpf } });
            }

            if (!existingAdm) {
                await (prisma as any).admissao.create({
                    data: {
                        candidatoId: 'PIPEFY_MIGRATION', // Placeholder
                        nome, email, telefone, cpf, cargo, departamento, salario, etapa, status
                    }
                });
                count++;
            }

            // Se for contratado, garantir que existe na tabela funcionario
            if (status === 'CONCLUIDA') {
                const isEmpregado = await prisma.funcionario.findFirst({ where: { cpf } });
                if (!isEmpregado && cpf) {
                    await prisma.funcionario.create({
                        data: {
                            nome, cpf, email, telefone, cargo, departamento, salario,
                            dataAdmissao: new Date(card.createdAt),
                            status: 'ATIVO'
                        }
                    });
                }
            }
        } catch (e: any) {
             console.error('  [!] Erro admissão ' + nome + ': ' + e.message);
        }
      }
    }
    console.log('✅ ' + count + ' Admissões migradas.\n');
  }

  // =========================================================================
  // 3. DESLIGAMENTOS -> DESLIGAMENTO E FUNCIONARIO
  // =========================================================================
  const desligData = loadJson(FILES.DESLIGAMENTO);
  if (desligData && desligData.cardsByPhase) {
    console.log('📦 Processando Desligamentos... (' + desligData.totalCards + ' cards)');
    let count = 0;

    for (const phase of Object.keys(desligData.cardsByPhase)) {
        const cards = desligData.cardsByPhase[phase];
        for (const card of cards) {
            const fields = card.fields || [];
            let nome = card.title;
            const cpf = secureStr(getFieldValue(fields, ['cpf']));
            const motivo = secureStr(getFieldValue(fields, ['motivo_do_desligamento', 'motivo']));
            const dataDesligamentoStr = secureStr(getFieldValue(fields, ['data_do_desligamento', 'aviso_pr_vio']));
            
            let dataDesligamento = new Date(card.createdAt);
            if (dataDesligamentoStr && dataDesligamentoStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                const parts = dataDesligamentoStr.split('/');
                const dia = parts[0];
                const mes = parts[1];
                const ano = parts[2];
                dataDesligamento = new Date(ano + '-' + mes + '-' + dia + 'T00:00:00Z');
            }

            try {
                // Ensure employee exists and mark as desligado
                let funcId: string | null = null;
                if (cpf) {
                    const f = await prisma.funcionario.findFirst({ where: { cpf } });
                    if (f) {
                        funcId = f.id;
                        await prisma.funcionario.update({
                            where: { id: f.id },
                            data: { status: 'DESLIGADO', dataDesligamento }
                        });
                    }
                }

                if (funcId) {
                    const existingDeslig = await (prisma as any).desligamento.findFirst({ where: { funcionarioId: funcId } });
                    if (!existingDeslig) {
                        await (prisma as any).desligamento.create({
                            data: {
                                funcionarioId: funcId,
                                dataDesligamento,
                                motivo: motivo || 'Não especificado (Migração Pipefy)',
                                status: phase.includes('concluídos') ? 'CONCLUIDO' : 'EM_ANDAMENTO',
                                observacoes: 'Fase no Pipefy: ' + phase
                            }
                        });
                        count++;
                    }
                }
            } catch (e: any) {
                console.error('  [!] Erro desligamento ' + nome + ': ' + e.message);
            }
        }
    }
    console.log('✅ ' + count + ' Desligamentos migrados.\n');
  }

  console.log('🎉 Migração concluída com sucesso!');
}

runMigration().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
