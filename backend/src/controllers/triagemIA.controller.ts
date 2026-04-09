import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// ─── IA TRIAGEM RH ──────────────────────────────────────────────
// Score candidatos com base em critérios configuráveis
export const triarCandidatos = async (req: AuthRequest, res: Response) => {
    try {
        // Get all admissions not yet completed or cancelled
        const admissoes = await (prisma as any).admissao.findMany({
            where: {
                etapa: { notIn: ['CONTRATADO', 'CANCELADO'] }
            },
            orderBy: { createdAt: 'desc' },
            include: {
                candidato: true,
            }
        });

        // Score based on completeness of data
        const scored = admissoes.map((a: any) => {
            let score = 0;
            const criterios: string[] = [];

            // Nome completo
            if (a.nome && a.nome.split(' ').length >= 2) { score += 15; criterios.push('Nome completo'); }
            // CPF preenchido
            if (a.cpf) { score += 15; criterios.push('CPF informado'); }
            // Email preenchido
            if (a.email) { score += 10; criterios.push('E-mail informado'); }
            // Telefone
            if (a.telefone) { score += 10; criterios.push('Telefone informado'); }
            // Cargo definido
            if (a.cargo) { score += 15; criterios.push('Cargo definido'); }
            // Departamento definido
            if (a.departamento) { score += 10; criterios.push('Departamento definido'); }
            // Data de admissão definida
            if (a.dataAdmissaoPrevista) { score += 15; criterios.push('Data admissão definida'); }
            // Documentos enviados
            if (a.documentosEnviados && Array.isArray(a.documentosEnviados) && a.documentosEnviados.length > 0) {
                score += 10; criterios.push('Documentos enviados');
            }

            const classificacao = score >= 80 ? 'APROVADO' : score >= 50 ? 'PENDENTE' : 'INCOMPLETO';

            return {
                id: a.id,
                nome: a.nome,
                cargo: a.cargo,
                departamento: a.departamento,
                cpf: a.cpf,
                telefone: a.telefone,
                email: a.email,
                etapa: a.etapa,
                dataAdmissaoPrevista: a.dataAdmissaoPrevista,
                createdAt: a.createdAt,
                score,
                classificacao,
                criteriosAtendidos: criterios,
                criteriosPendentes: [
                    !a.nome || a.nome.split(' ').length < 2 ? 'Nome completo' : null,
                    !a.cpf ? 'CPF' : null,
                    !a.email ? 'E-mail' : null,
                    !a.telefone ? 'Telefone' : null,
                    !a.cargo ? 'Cargo' : null,
                    !a.departamento ? 'Departamento' : null,
                    !a.dataAdmissaoPrevista ? 'Data de admissão' : null,
                    !(a.documentosEnviados && Array.isArray(a.documentosEnviados) && a.documentosEnviados.length > 0) ? 'Documentos' : null,
                ].filter(Boolean)
            };
        });

        // Sort by score descending
        scored.sort((a: any, b: any) => b.score - a.score);

        const stats = {
            total: scored.length,
            aprovados: scored.filter((s: any) => s.classificacao === 'APROVADO').length,
            pendentes: scored.filter((s: any) => s.classificacao === 'PENDENTE').length,
            incompletos: scored.filter((s: any) => s.classificacao === 'INCOMPLETO').length,
            mediaScore: scored.length > 0 ? Math.round(scored.reduce((s: number, c: any) => s + c.score, 0) / scored.length) : 0,
        };

        res.json({ candidatos: scored, stats });
    } catch (error) {
        console.error('Triagem IA error:', error);
        res.status(500).json({ error: 'Failed to analyze candidates' });
    }
};

// ─── APROVAR E CRIAR FUNCIONÁRIO ────────────────────────────────
// Moves admissão to CONTRATADO and creates a Funcionario record
export const aprovarAdmissao = async (req: AuthRequest, res: Response) => {
    try {
        const { admissaoId } = req.params;

        const admissao = await (prisma as any).admissao.findUnique({
            where: { id: admissaoId }
        });

        if (!admissao) {
            return res.status(404).json({ error: 'Admissão não encontrada' });
        }

        if (admissao.etapa === 'CONTRATADO') {
            return res.status(400).json({ error: 'Admissão já foi contratada' });
        }

        // Check if CPF already exists as Funcionario
        if (admissao.cpf) {
            const existing = await (prisma as any).funcionario.findUnique({
                where: { cpf: admissao.cpf }
            });
            if (existing) {
                // Link existing employee and update admissão
                await (prisma as any).admissao.update({
                    where: { id: admissaoId },
                    data: { etapa: 'CONTRATADO', funcionarioId: existing.id }
                });
                return res.json({ message: 'Funcionário já existente vinculado', funcionario: existing });
            }
        }

        // Create new Funcionario from admissão data
        const funcionario = await (prisma as any).funcionario.create({
            data: {
                nome: admissao.nome,
                cargo: admissao.cargo || 'A definir',
                departamento: admissao.departamento || 'Operacional',
                cpf: admissao.cpf || `TEMP-${Date.now()}`,
                email: admissao.email,
                telefone: admissao.telefone,
                salario: 0,
                dataAdmissao: admissao.dataAdmissaoPrevista || new Date(),
                tipoContrato: 'CLT',
                ativo: true,
                status: 'ATIVO',
            }
        });

        // Update admissão: mark as CONTRATADO and link to new Funcionario
        await (prisma as any).admissao.update({
            where: { id: admissaoId },
            data: { etapa: 'CONTRATADO', funcionarioId: funcionario.id }
        });

        res.status(201).json({ message: 'Funcionário criado com sucesso', funcionario });
    } catch (error) {
        console.error('Aprovar admissão error:', error);
        res.status(500).json({ error: 'Falha ao aprovar admissão' });
    }
};

// ─── APROVAR TODOS APROVADOS ────────────────────────────────────
// Bulk approve all admissions that score >= 80
export const aprovarTodos = async (req: AuthRequest, res: Response) => {
    try {
        const admissoes = await (prisma as any).admissao.findMany({
            where: {
                etapa: { notIn: ['CONTRATADO', 'CANCELADO'] }
            }
        });

        const results: any[] = [];

        for (const a of admissoes) {
            // Calculate score
            let score = 0;
            if (a.nome && a.nome.split(' ').length >= 2) score += 15;
            if (a.cpf) score += 15;
            if (a.email) score += 10;
            if (a.telefone) score += 10;
            if (a.cargo) score += 15;
            if (a.departamento) score += 10;
            if (a.dataAdmissaoPrevista) score += 15;
            if (a.documentosEnviados && Array.isArray(a.documentosEnviados) && a.documentosEnviados.length > 0) score += 10;

            if (score < 80) continue; // Skip non-approved

            // Check if CPF already exists
            if (a.cpf) {
                const existing = await (prisma as any).funcionario.findUnique({ where: { cpf: a.cpf } });
                if (existing) {
                    await (prisma as any).admissao.update({
                        where: { id: a.id },
                        data: { etapa: 'CONTRATADO', funcionarioId: existing.id }
                    });
                    results.push({ id: a.id, nome: a.nome, status: 'vinculado_existente' });
                    continue;
                }
            }

            const funcionario = await (prisma as any).funcionario.create({
                data: {
                    nome: a.nome,
                    cargo: a.cargo || 'A definir',
                    departamento: a.departamento || 'Operacional',
                    cpf: a.cpf || `TEMP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    email: a.email,
                    telefone: a.telefone,
                    salario: 0,
                    dataAdmissao: a.dataAdmissaoPrevista || new Date(),
                    tipoContrato: 'CLT',
                    ativo: true,
                    status: 'ATIVO',
                }
            });

            await (prisma as any).admissao.update({
                where: { id: a.id },
                data: { etapa: 'CONTRATADO', funcionarioId: funcionario.id }
            });

            results.push({ id: a.id, nome: a.nome, status: 'criado', funcionarioId: funcionario.id });
        }

        res.json({
            message: `${results.length} admissões aprovadas`,
            total: results.length,
            results
        });
    } catch (error) {
        console.error('Aprovar todos error:', error);
        res.status(500).json({ error: 'Falha ao aprovar admissões em lote' });
    }
};
