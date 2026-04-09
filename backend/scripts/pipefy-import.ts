/**
 * Pipefy Data Import Script
 * Imports all 1,251 exported cards into Prisma database
 *
 * Usage: npx tsx scripts/pipefy-import.ts
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const ROOT = path.resolve(process.cwd(), '..');

// ─── Helpers ────────────────────────────────────────────────────

function getField(fields: any[], name: string): string | null {
    const f = fields.find((fld: any) =>
        fld.name?.toLowerCase().includes(name.toLowerCase())
    );
    return f?.value || null;
}

function getFieldExact(fields: any[], name: string): string | null {
    const f = fields.find((fld: any) =>
        fld.name?.toLowerCase().trim() === name.toLowerCase().trim()
    );
    return f?.value || null;
}

function parseDate(val: string | null): Date | null {
    if (!val) return null;
    // Handle "dd/mm/yyyy" format
    const parts = val.split('/');
    if (parts.length === 3) {
        const [day, month, year] = parts;
        const d = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00Z`);
        if (!isNaN(d.getTime())) return d;
    }
    // Handle "dd/mm/yyyy HH:mm" format
    const dateTimeParts = val.split(' ');
    if (dateTimeParts.length >= 1) {
        const dp = dateTimeParts[0].split('/');
        if (dp.length === 3) {
            const d = new Date(`${dp[2]}-${dp[1].padStart(2, '0')}-${dp[0].padStart(2, '0')}T00:00:00Z`);
            if (!isNaN(d.getTime())) return d;
        }
    }
    // Try ISO
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
}

function cleanPhone(phone: string | null): string | null {
    if (!phone) return null;
    return phone.replace(/[^\d+]/g, '');
}

function cleanCPF(cpf: string | null): string | null {
    if (!cpf) return null;
    return cpf.replace(/[^\d]/g, '');
}

// ─── Phase Mappers ──────────────────────────────────────────────

const RECRUTAMENTO_PHASE_MAP: Record<string, string> = {
    'Triagem': 'TRIAGEM',
    'Entrevista - RH': 'ENTREVISTA_RH',
    'Entrevista - Gestor': 'ENTREVISTA_GESTOR',
    'Teste Prático': 'TESTE_PRATICO',
    'Aguardando aceite da proposta': 'APROVADO',
    'Proposta aceita/Admissão': 'ADMITIDO',
    'Proposta recusada': 'REPROVADO',
    'Incompatível': 'INCOMPATIVEL',
    'Banco de Talentos': 'BANCO_TALENTOS',
};

const ADMISSAO_PHASE_MAP: Record<string, string> = {
    'Envio da Documentação': 'ENVIO_DOCUMENTACAO',
    'Conferência de Documentação': 'CONFERENCIA',
    'Exame Admissional': 'EXAME_ASO',
    'Envio para Contabilidade': 'CONTABILIDADE',
    'Assinatura de Contrato': 'ASSINATURA_CONTRATO',
    'Contratado/Treinamento': 'CONTRATADO',
    'Cancelado': 'CANCELADO',
    'Banco de Talentos': 'CANCELADO',
};

const FERIAS_PHASE_MAP: Record<string, string> = {
    'À vencer 2026': 'A_VENCER',
    'À vencer 2025': 'A_VENCER',
    'Programadas': 'PROGRAMADA',
    'Enviado para Contabilidade': 'ENVIADO_CONTABILIDADE',
    'Em férias': 'EM_FERIAS',
    'Férias gozadas': 'GOZADA',
    'Desligados': 'DESLIGADO',
};

const GESTAO_PHASE_MAP: Record<string, string> = {
    'Novo colaborador': 'ATIVO',
    'Experiência 40 dias': 'ATIVO',
    'Experiência 90 dias': 'ATIVO',
    'Efetivo': 'ATIVO',
    'Afastamentos +15 dias': 'AFASTADO',
    'Desligamento': 'DESLIGADO',
};

// ─── Import Functions ───────────────────────────────────────────

async function importRecrutamento() {
    const filePath = findFile('recrutamento');
    if (!filePath) { console.log('⚠️  Arquivo de recrutamento não encontrado'); return; }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const cards = data.allCards || [];
    console.log(`\n📌 Importando Recrutamento: ${cards.length} cards...`);

    // Create a default vaga for all imported candidates
    let vaga = await (prisma as any).vaga.findFirst({ where: { cargo: 'IMPORTAÇÃO PIPEFY' } });
    if (!vaga) {
        vaga = await (prisma as any).vaga.create({
            data: {
                cargo: 'IMPORTAÇÃO PIPEFY',
                departamento: 'RH',
                area: 'Diversas',
                solicitanteNome: 'Migração Pipefy',
                descricao: 'Vaga criada automaticamente para vincular candidatos importados do Pipefy',
                status: 'EM_ANDAMENTO',
            }
        });
    }

    let imported = 0, skipped = 0;
    for (const card of cards) {
        try {
            const fields = card.fields || [];
            const phase = card.current_phase?.name || 'Triagem';
            const nome = getField(fields, 'nome completo') || card.title || '';
            const cpfRaw = getField(fields, 'cpf');
            const cpf = cleanCPF(cpfRaw);

            // Skip if no name
            if (!nome || nome.length < 2) { skipped++; continue; }

            // Check for duplicate by pipefyCardId
            const existing = await (prisma as any).candidato.findFirst({ where: { pipefyCardId: card.id } });
            if (existing) { skipped++; continue; }

            await (prisma as any).candidato.create({
                data: {
                    nome: nome.trim(),
                    email: getField(fields, 'e-mail') || undefined,
                    telefone: cleanPhone(getField(fields, 'celular')) || undefined,
                    whatsapp: cleanPhone(getField(fields, 'celular')) || undefined,
                    vagaId: vaga.id,
                    etapa: RECRUTAMENTO_PHASE_MAP[phase] || 'TRIAGEM',
                    cidade: getField(fields, 'endereço') || undefined,
                    fonte: getField(fields, 'como ficou sabendo') || undefined,
                    pipefyCardId: card.id,
                    observacoes: `Importado do Pipefy em ${new Date().toLocaleDateString('pt-BR')}. Vaga desejada: ${getField(fields, 'vaga desejada') || '—'}`,
                }
            });
            imported++;
        } catch (err: any) {
            console.error(`  ✗ Erro ao importar "${card.title}": ${err.message}`);
            skipped++;
        }
    }
    console.log(`  ✅ ${imported} importados, ${skipped} pulados`);
}

async function importAdmissao() {
    const filePath = findFile('admiss');
    if (!filePath) { console.log('⚠️  Arquivo de admissão não encontrado'); return; }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const cards = data.allCards || [];
    console.log(`\n📌 Importando Admissão: ${cards.length} cards...`);

    let imported = 0, skipped = 0;
    for (const card of cards) {
        try {
            const fields = card.fields || [];
            const phase = card.current_phase?.name || 'Envio da Documentação';
            const nome = getField(fields, 'nome completo') || card.title || '';

            if (!nome || nome.length < 2) { skipped++; continue; }

            const existing = await (prisma as any).admissao.findFirst({ where: { pipefyCardId: card.id } });
            if (existing) { skipped++; continue; }

            const clinica = getField(fields, 'clínica médica');
            const tipoASO = getField(fields, 'tipo de aso');

            await (prisma as any).admissao.create({
                data: {
                    nome: nome.trim(),
                    cargo: getField(fields, 'cargo') || undefined,
                    departamento: getFieldExact(fields, 'razão social (hidro ou locação):') ? 'Operações' : undefined,
                    cpf: cleanCPF(getField(fields, 'cpf')) || undefined,
                    telefone: cleanPhone(getField(fields, 'celular')) || undefined,
                    email: getField(fields, 'e-mail') || undefined,
                    etapa: ADMISSAO_PHASE_MAP[phase] || 'ENVIO_DOCUMENTACAO',
                    clinicaASO: clinica ? clinica.replace(/[\[\]"]/g, '') : undefined,
                    dataExameASO: parseDate(getField(fields, 'data de agendamento')) || undefined,
                    pipefyCardId: card.id,
                    observacoes: `Importado do Pipefy. Jornada: ${getField(fields, 'jornada de trabalho') || '—'}`,
                }
            });
            imported++;
        } catch (err: any) {
            console.error(`  ✗ Erro ao importar "${card.title}": ${err.message}`);
            skipped++;
        }
    }
    console.log(`  ✅ ${imported} importados, ${skipped} pulados`);
}

async function importGestaoColaboradores() {
    const filePath = findFile('gest');
    if (!filePath) { console.log('⚠️  Arquivo de gestão não encontrado'); return; }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const cards = data.allCards || [];
    console.log(`\n📌 Importando Gestão de Colaboradores: ${cards.length} cards...`);

    let imported = 0, skipped = 0, updated = 0;
    for (const card of cards) {
        try {
            const fields = card.fields || [];
            const phase = card.current_phase?.name || 'Efetivo';
            const nome = getField(fields, 'nome do colaborador') || card.title || '';
            const cpf = cleanCPF(getField(fields, 'cpf'));

            if (!nome || nome.length < 2) { skipped++; continue; }

            // Check if employee already exists by CPF
            let existing = null;
            if (cpf && cpf.length >= 11) {
                existing = await (prisma as any).funcionario.findFirst({ where: { cpf } });
            }

            const status = GESTAO_PHASE_MAP[phase] || 'ATIVO';
            const dataAdmissao = parseDate(getField(fields, 'data de admissão'));
            const cargo = getField(fields, 'cargo') || '';

            const funcionarioData: any = {
                nome: nome.trim(),
                cargo: cargo.replace(/:$/, '').trim() || 'Não informado',
                departamento: 'Operações',
                salario: 0,
                dataAdmissao: dataAdmissao || new Date(),
                cpf: cpf || `TEMP_${card.id}`,
                email: getField(fields, 'e-mail') || undefined,
                ativo: status !== 'DESLIGADO',
                status,
                dataNascimento: parseDate(getField(fields, 'data de nascimento')) || undefined,
                estadoCivil: getField(fields, 'estado civil') || undefined,
                tipoContrato: extractContractType(getField(fields, 'tipo de contrato')),
                cep: undefined,
                endereco: getField(fields, 'endereço') || undefined,
                cidade: getField(fields, 'cidade de moradia') || undefined,
                banco: 'ITAU',
                conta: getField(fields, 'informar nº da conta itaú') || undefined,
                chavePix: getField(fields, 'pix') || undefined,
                observacoes: `Importado do Pipefy. Jornada: ${getField(fields, 'jornada de trabalho') || '—'}. eSocial: ${getField(fields, 'cód esocial') || '—'}`,
            };

            if (existing) {
                await (prisma as any).funcionario.update({
                    where: { id: existing.id },
                    data: {
                        ...funcionarioData,
                        cpf: existing.cpf, // Keep original CPF
                    }
                });
                updated++;
            } else {
                const created = await (prisma as any).funcionario.create({
                    data: funcionarioData
                });

                // Create ASO record if we have ASO data
                const asoVencimento = parseDate(getField(fields, 'data de vencimento aso'));
                if (asoVencimento) {
                    await (prisma as any).aSOControle.create({
                        data: {
                            funcionarioId: created.id,
                            tipo: 'PERIODICO',
                            dataVencimento: asoVencimento,
                            observacoes: 'Importado do Pipefy',
                        }
                    });
                }

                imported++;
            }
        } catch (err: any) {
            console.error(`  ✗ Erro ao importar "${card.title}": ${err.message}`);
            skipped++;
        }
    }
    console.log(`  ✅ ${imported} criados, ${updated} atualizados, ${skipped} pulados`);
}

async function importFerias() {
    const filePath = findFile('f_rias');
    if (!filePath) { console.log('⚠️  Arquivo de férias não encontrado'); return; }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const cards = data.allCards || [];
    console.log(`\n📌 Importando Férias: ${cards.length} cards...`);

    let imported = 0, skipped = 0;
    for (const card of cards) {
        try {
            const fields = card.fields || [];
            const phase = card.current_phase?.name || 'À vencer 2026';
            const nome = getField(fields, 'nome do colaborador') || card.title || '';
            const dias = parseInt(getField(fields, 'quantidade de dias') || '30') || 30;
            const dataVencimento = parseDate(getField(fields, 'data limite'));

            if (!nome || nome.length < 2) { skipped++; continue; }

            // Try to find matching employee
            const funcionario = await (prisma as any).funcionario.findFirst({
                where: {
                    OR: [
                        { nome: { equals: nome.trim(), mode: 'insensitive' } },
                        { nome: { contains: nome.trim().split(' ')[0], mode: 'insensitive' } },
                    ]
                }
            });

            if (!funcionario) {
                console.log(`  ⚠ Funcionário "${nome}" não encontrado — pulando férias`);
                skipped++;
                continue;
            }

            // Check duplicate by pipefyCardId
            const existing = await (prisma as any).controleFerias.findFirst({ where: { pipefyCardId: card.id } });
            if (existing) { skipped++; continue; }

            await (prisma as any).controleFerias.create({
                data: {
                    funcionarioId: funcionario.id,
                    periodoAquisitivo: phase.includes('2026') ? '2025/2026' : phase.includes('2025') ? '2024/2025' : undefined,
                    diasDireito: dias,
                    status: FERIAS_PHASE_MAP[phase] || 'A_VENCER',
                    dataVencimento: dataVencimento || undefined,
                    pipefyCardId: card.id,
                }
            });
            imported++;
        } catch (err: any) {
            console.error(`  ✗ Erro ao importar férias "${card.title}": ${err.message}`);
            skipped++;
        }
    }
    console.log(`  ✅ ${imported} importados, ${skipped} pulados`);
}

async function importDesligamentos() {
    const filePath = findFile('desligamento');
    if (!filePath) { console.log('⚠️  Arquivo de desligamento não encontrado'); return; }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const cards = data.allCards || [];
    console.log(`\n📌 Importando Desligamentos: ${cards.length} cards...`);

    let imported = 0, skipped = 0;
    for (const card of cards) {
        try {
            const fields = card.fields || [];
            const nome = getField(fields, 'nome do colaborador') || card.title || '';
            const cpf = cleanCPF(getField(fields, 'cpf'));
            const dataDesligamento = parseDate(getField(fields, 'data do desligamento'));
            const tipoDesligamento = getField(fields, 'tipo de desligamento');

            if (!nome || nome.length < 2) { skipped++; continue; }

            // Try to find and update employee
            let funcionario = null;
            if (cpf && cpf.length >= 11) {
                funcionario = await (prisma as any).funcionario.findFirst({ where: { cpf } });
            }
            if (!funcionario) {
                funcionario = await (prisma as any).funcionario.findFirst({
                    where: { nome: { equals: nome.trim(), mode: 'insensitive' } }
                });
            }

            if (funcionario) {
                await (prisma as any).funcionario.update({
                    where: { id: funcionario.id },
                    data: {
                        ativo: false,
                        status: 'DESLIGADO',
                        dataDesligamento: dataDesligamento || new Date(),
                        observacoes: [
                            funcionario.observacoes || '',
                            `Tipo desligamento: ${tipoDesligamento || '—'}. Importado do Pipefy.`
                        ].filter(Boolean).join(' | '),
                    }
                });
                imported++;
            } else {
                console.log(`  ⚠ Funcionário "${nome}" não encontrado — desligamento pulado`);
                skipped++;
            }
        } catch (err: any) {
            console.error(`  ✗ Erro desligamento "${card.title}": ${err.message}`);
            skipped++;
        }
    }
    console.log(`  ✅ ${imported} desligamentos aplicados, ${skipped} pulados`);
}

// ─── Utility ────────────────────────────────────────────────────

function findFile(keyword: string): string | null {
    const files = fs.readdirSync(ROOT).filter((f: string) => f.startsWith('pipefy_export_') && f.endsWith('.json'));
    return files.find((f: string) => f.toLowerCase().includes(keyword)) ? path.join(ROOT, files.find((f: string) => f.toLowerCase().includes(keyword))!) : null;
}

function extractContractType(val: string | null): string {
    if (!val) return 'CLT';
    const v = val.toUpperCase();
    if (v.includes('PJ')) return 'PJ';
    if (v.includes('ESTAGIO') || v.includes('ESTÁGIO')) return 'ESTAGIO';
    if (v.includes('TEMPORARIO') || v.includes('TEMPORÁRIO')) return 'TEMPORARIO';
    return 'CLT';
}

// ─── Main ───────────────────────────────────────────────────────

async function main() {
    console.log('═══════════════════════════════════════════');
    console.log('  📥 Pipefy Import - Nacional Hidro');
    console.log('═══════════════════════════════════════════');

    try {
        // IMPORTANT: Import order matters!
        // 1. Gestão first (creates Funcionario records)
        // 2. Desligamentos (updates Funcionario status)
        // 3. Recrutamento (creates Candidato records)
        // 4. Admissão (creates Admissao records)
        // 5. Férias (creates ControleFerias, needs Funcionario IDs)

        console.log('\n🔗 Conectando ao banco...');
        await prisma.$connect();
        console.log('✅ Conectado!\n');

        console.log('════ FASE 1: Gestão de Colaboradores ══════');
        await importGestaoColaboradores();

        console.log('\n════ FASE 2: Desligamentos ═════════════════');
        await importDesligamentos();

        console.log('\n════ FASE 3: Recrutamento ══════════════════');
        await importRecrutamento();

        console.log('\n════ FASE 4: Admissão ══════════════════════');
        await importAdmissao();

        console.log('\n════ FASE 5: Férias ════════════════════════');
        await importFerias();

        // Final stats
        console.log('\n');
        console.log('═══════════════════════════════════════════');
        console.log('  📊 Resumo Final');
        console.log('═══════════════════════════════════════════');

        const totalFuncionarios = await (prisma as any).funcionario.count();
        const totalCandidatos = await (prisma as any).candidato.count();
        const totalAdmissoes = await (prisma as any).admissao.count();
        const totalFerias = await (prisma as any).controleFerias.count();
        const totalASO = await (prisma as any).aSOControle.count();

        console.log(`  👷 Funcionários:    ${totalFuncionarios}`);
        console.log(`  🎯 Candidatos:      ${totalCandidatos}`);
        console.log(`  📋 Admissões:       ${totalAdmissoes}`);
        console.log(`  🏖️  Férias:          ${totalFerias}`);
        console.log(`  🏥 ASOs:            ${totalASO}`);

        console.log('\n═══════════════════════════════════════════');
        console.log('  ✅ Importação concluída!');
        console.log('═══════════════════════════════════════════');

    } catch (error: any) {
        console.error('\n❌ Erro fatal:', error.message);
        console.error(error.stack);
    } finally {
        await prisma.$disconnect();
    }
}

main();
