import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const getDashboardLogistica = async (req: AuthRequest, res: Response) => {
    try {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today.getTime() + 86400000);
        const in7days = new Date(today.getTime() + 7 * 86400000);
        const in30days = new Date(today.getTime() + 30 * 86400000);

        // 1. Serviços em execução (OS com status EM_EXECUCAO e não legadas)
        const emExecucao = await prisma.ordemServico.findMany({
            where: { 
                status: 'EM_EXECUCAO',
                NOT: {
                    codigo: { contains: '/LEGADO' }
                }
            },
            include: { cliente: { select: { nome: true } } },
            orderBy: { dataInicial: 'desc' }
        });

        // 2. Próximos serviços agendados (escalas futuras)
        const proximosServicos = await prisma.escala.findMany({
            where: { data: { gte: today, lte: in7days } },
            include: {
                cliente: { select: { nome: true } },
                veiculo: { select: { placa: true, tipo: true } }
            },
            orderBy: { data: 'asc' },
            take: 10
        });

        // 3. Caminhões em manutenção
        const veiculosManutencao = await prisma.veiculo.findMany({
            where: { status: 'MANUTENCAO' }
        });

        // 4. Veículos disponíveis
        const veiculosTotal = await prisma.veiculo.count();
        const veiculosDisponiveis = await prisma.veiculo.count({ where: { status: 'DISPONIVEL' } });
        const veiculosEmUso = await prisma.veiculo.count({ where: { status: 'EM_USO' } });

        // 5. Funcionários
        const funcTotal = await prisma.funcionario.count();
        const funcAtivos = await prisma.funcionario.count({ where: { status: 'ATIVO' } });
        const funcFerias = await prisma.funcionario.count({ where: { status: 'FERIAS' } });
        const funcAfastados = await prisma.funcionario.count({ where: { status: { in: ['ATESTADO', 'AFASTADO'] } } });

        // 6. Docs vencendo em 30 dias
        const docsVencendo = await (prisma.integracaoCliente as any).findMany({
            where: {
                dataVencimento: { gte: today, lte: in30days }
            },
            include: { cliente: { select: { nome: true } } },
            orderBy: { dataVencimento: 'asc' },
            take: 10
        });

        // 7. OS counts by status
        const osAberta = await prisma.ordemServico.count({ where: { status: 'ABERTA' } });
        const osBaixada = await prisma.ordemServico.count({ where: { status: 'BAIXADA' } });
        const osPrecificada = await prisma.ordemServico.count({ where: { status: 'PRECIFICADA' } });
        const osFaturada = await prisma.ordemServico.count({ where: { status: 'FATURADA' } });

        // 8. Escalas de hoje
        const escalasHoje = await prisma.escala.findMany({
            where: { data: { gte: today, lt: tomorrow } },
            include: {
                cliente: { select: { nome: true } },
                veiculo: { select: { placa: true, tipo: true } }
            }
        });

        // 9. Manutenções pendentes
        const manutencoesPendentes = await prisma.manutencao.count({
            where: { status: 'PENDENTE' }
        });

        res.json({
            servicosEmExecucao: emExecucao,
            proximosServicos,
            escalasHoje,
            veiculos: {
                total: veiculosTotal,
                disponiveis: veiculosDisponiveis,
                emUso: veiculosEmUso,
                emManutencao: veiculosManutencao.length,
                listaManutencao: veiculosManutencao
            },
            funcionarios: {
                total: funcTotal,
                ativos: funcAtivos,
                ferias: funcFerias,
                afastados: funcAfastados,
                disponiveis: funcAtivos - funcFerias - funcAfastados
            },
            docsVencendo,
            osPipeline: {
                aberta: osAberta,
                emExecucao: emExecucao.length,
                baixada: osBaixada,
                precificada: osPrecificada,
                faturada: osFaturada
            },
            manutencoesPendentes
        });
    } catch (error) {
        console.error('Dashboard logistica error:', error);
        res.status(500).json({ error: 'Failed to fetch logistics dashboard' });
    }
};
