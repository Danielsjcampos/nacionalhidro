import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const getDashboardRH = async (req: AuthRequest, res: Response) => {
    try {
        const now = new Date();
        const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        // 1. Total de Colaboradores Ativos
        const colaboradoresAtivos = await (prisma as any).funcionario.count({
            where: { ativo: true, status: 'ATIVO' }
        });

        // 2. Total de Vagas Abertas (recrutamento em andamento)
        const vagasAbertas = await (prisma as any).vaga.count({
            where: { status: 'ABERTA' } // Assumindo que o status seja ABERTA ou ATIVA
        });

        // 3. Admissões no Funil 
        const admissoesData = await (prisma as any).admissao.groupBy({
            by: ['etapa'],
            _count: true,
        });
        
        let emProcessoAdmissao = 0;
        let contratadosAdmissao = 0;
        admissoesData.forEach((a: any) => {
            if (['CONTRATADO', 'CANCELADO', 'BANCO_TALENTOS'].includes(a.etapa)) {
                if (a.etapa === 'CONTRATADO') contratadosAdmissao += a._count;
            } else {
                emProcessoAdmissao += a._count;
            }
        });

        // 4. Recrutamento no Funil
        const recrutamentoData = await (prisma as any).candidato.groupBy({
            by: ['etapa'],
            _count: true,
        });

        let emRecrutamento = 0;
        let aprovadosRecrutamento = 0;
        recrutamentoData.forEach((c: any) => {
            if (['APROVADO'].includes(c.etapa)) {
                aprovadosRecrutamento += c._count;
            } else if (!['REPROVADO', 'ADMITIDO', 'BANCO_TALENTOS', 'INCOMPATIVEL'].includes(c.etapa)) {
                emRecrutamento += c._count;
            }
        });

        // 5. Próximos Vencimentos de ASO (30 dias)
        const asoVencendo = await (prisma as any).aSOControle.count({
            where: {
                dataVencimento: { lte: next30Days, gte: now }
            }
        });

        // 6. Próximos Vencimentos de CNH (30 dias)
        const cnhVencendo = await (prisma as any).funcionario.count({
            where: {
                ativo: true,
                dataVencimentoCNH: { lte: next30Days, gte: now }
            }
        });

        // 7. Próximos Vencimentos de Férias (30 dias)
        const feriasVencendo = await (prisma as any).controleFerias.count({
            where: {
                status: 'A_VENCER',
                dataVencimento: { lte: next30Days, gte: now }
            }
        });

        // 8. Próximos Vencimentos de Treinamentos (30 dias)
        const treinamentoVencendo = await (prisma as any).treinamentoRealizado.count({
            where: {
                dataVencimento: { lte: next30Days, gte: now }
            }
        });

        // 9. Quem faltou hoje (Ponto com status FALTA)
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const faltasHoje = await (prisma as any).pontoEletronico.count({
            where: {
                data: { gte: startOfDay },
                status: 'FALTA'
            }
        });

        // 10. Controle de Experiência (45 e 90 dias)
        const date45DaysAgo = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);
        const date90DaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        // Funcionários que completam 45 dias de casa na próxima semana
        const experiencia45 = await (prisma as any).funcionario.count({
            where: {
                ativo: true,
                dataAdmissao: {
                    lte: new Date(now.getTime() - (45 - 7) * 24 * 60 * 60 * 1000),
                    gte: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000)
                }
            }
        });

        // Funcionários que completam 90 dias de casa na próxima semana
        const experiencia90 = await (prisma as any).funcionario.count({
            where: {
                ativo: true,
                dataAdmissao: {
                    lte: new Date(now.getTime() - (90 - 7) * 24 * 60 * 60 * 1000),
                    gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
                }
            }
        });

        // 11. Demissões / Desligamentos recentes (últimos 30 dias)
        const desligamentos30d = await (prisma as any).funcionario.count({
            where: {
                status: 'DESLIGADO',
                dataDesligamento: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }
            }
        });

        // Consolidação dos alertas (Soma para um badge rápido)
        const alertasPendentes = asoVencendo + cnhVencendo + feriasVencendo + treinamentoVencendo;

        res.json({
            colaboradoresAtivos,
            vagasAbertas,
            emRecrutamento,
            aprovadosRecrutamento,
            emProcessoAdmissao,
            contratadosAdmissao,
            alertasPendentes,
            faltasHoje,
            experiencia45,
            experiencia90,
            desligamentos30d,
            detalhesAlertas: {
                asoVencendo,
                cnhVencendo,
                feriasVencendo,
                treinamentoVencendo
            }
        });

    } catch (error: any) {
        console.error('getDashboardRH error:', error);
        res.status(500).json({ error: 'Failed to fetch HR dashboard stats', details: error.message });
    }
};

export const getAlertasDetalhados = async (req: AuthRequest, res: Response) => {
    try {
        const { tipo } = req.query;
        const now = new Date();
        const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        let data: any[] = [];

        switch (tipo) {
            case 'ASO':
                data = await (prisma as any).aSOControle.findMany({
                    where: { dataVencimento: { lte: next30Days, gte: now } },
                    include: { funcionario: { select: { nome: true, cargo: true, departamento: true } } },
                    orderBy: { dataVencimento: 'asc' }
                });
                break;

            case 'CNH':
                data = await (prisma as any).funcionario.findMany({
                    where: { ativo: true, dataVencimentoCNH: { lte: next30Days, gte: now } },
                    select: { nome: true, cargo: true, departamento: true, dataVencimentoCNH: true },
                    orderBy: { dataVencimentoCNH: 'asc' }
                });
                break;

            case 'FERIAS':
                data = await (prisma as any).controleFerias.findMany({
                    where: { status: 'A_VENCER', dataVencimento: { lte: next30Days, gte: now } },
                    include: { funcionario: { select: { nome: true, cargo: true, departamento: true } } },
                    orderBy: { dataVencimento: 'asc' }
                });
                break;

            case 'EXPERIENCIA_45':
                const employees45 = await (prisma as any).funcionario.findMany({
                    where: {
                        ativo: true,
                        dataAdmissao: {
                            lte: new Date(now.getTime() - (45 - 7) * 24 * 60 * 60 * 1000),
                            gte: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000)
                        }
                    },
                    select: { nome: true, cargo: true, departamento: true, dataAdmissao: true },
                    orderBy: { dataAdmissao: 'asc' }
                });
                data = employees45.map((emp: any) => ({
                    ...emp,
                    dataVencimento: new Date(new Date(emp.dataAdmissao).getTime() + 45 * 24 * 60 * 60 * 1000)
                }));
                break;

            case 'EXPERIENCIA_90':
                const employees90 = await (prisma as any).funcionario.findMany({
                    where: {
                        ativo: true,
                        dataAdmissao: {
                            lte: new Date(now.getTime() - (90 - 7) * 24 * 60 * 60 * 1000),
                            gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
                        }
                    },
                    select: { nome: true, cargo: true, departamento: true, dataAdmissao: true },
                    orderBy: { dataAdmissao: 'asc' }
                });
                data = employees90.map((emp: any) => ({
                    ...emp,
                    dataVencimento: new Date(new Date(emp.dataAdmissao).getTime() + 90 * 24 * 60 * 60 * 1000)
                }));
                break;

            default:
                return res.status(400).json({ error: 'Tipo de alerta inválido' });
        }

        res.json(data);
    } catch (error: any) {
        console.error('getAlertasDetalhados error:', error);
        res.status(500).json({ error: 'Failed to fetch detailed alerts', details: error.message });
    }
};
