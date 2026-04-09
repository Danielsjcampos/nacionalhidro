import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// ─── MIGRAÇÃO DE DADOS ──────────────────────────────────────────
// T28: SIM Antigo - T29: Pipefy
// This controller provides endpoints to import data from external sources

export const getMigracaoStatus = async (req: AuthRequest, res: Response) => {
    try {
        const [
            totalClientes,
            totalFuncionarios,
            totalVeiculos,
            totalOS,
            totalPropostas,
            totalFornecedores,
        ] = await Promise.all([
            prisma.cliente.count(),
            prisma.funcionario.count(),
            prisma.veiculo.count(),
            prisma.ordemServico.count(),
            prisma.proposta.count(),
            (prisma as any).fornecedor.count(),
        ]);

        res.json({
            totalRegistros: totalClientes + totalFuncionarios + totalVeiculos + totalOS + totalPropostas + totalFornecedores,
            detalhes: {
                clientes: totalClientes,
                funcionarios: totalFuncionarios,
                veiculos: totalVeiculos,
                ordensServico: totalOS,
                propostas: totalPropostas,
                fornecedores: totalFornecedores,
            },
            migracoes: [
                { fonte: 'SIM Antigo', status: 'PRONTO', descricao: 'Pronto para importação via CSV/planilha' },
                { fonte: 'Pipefy', status: 'PRONTO', descricao: 'Pronto para importação via API ou CSV' },
            ]
        });
    } catch (error) {
        console.error('Migracao status error:', error);
        res.status(500).json({ error: 'Failed to get migration status' });
    }
};

export const importarDados = async (req: AuthRequest, res: Response) => {
    try {
        const { tipo, dados } = req.body;
        // tipo: 'clientes' | 'funcionarios' | 'veiculos' | 'fornecedores'
        // dados: array of objects matching the model

        if (!tipo || !dados || !Array.isArray(dados)) {
            return res.status(400).json({ error: 'Tipo e dados são obrigatórios' });
        }

        let importados = 0;
        let erros = 0;

        for (const item of dados) {
            try {
                switch (tipo) {
                    case 'clientes':
                        await (prisma as any).cliente.create({ data: { nome: item.nome, email: item.email, telefone: item.telefone, cnpj: item.cnpj, endereco: item.endereco } });
                        break;
                    case 'funcionarios':
                        await (prisma as any).funcionario.create({ data: { nome: item.nome, cpf: item.cpf, cargo: item.cargo, email: item.email, telefone: item.telefone } });
                        break;
                    case 'veiculos':
                        await prisma.veiculo.create({ data: { placa: item.placa, modelo: item.modelo, tipo: item.tipo || 'CAMINHAO', status: 'DISPONIVEL' } });
                        break;
                    case 'fornecedores':
                        await (prisma as any).fornecedor.create({ data: { nome: item.nome, cnpj: item.cnpj, email: item.email, telefone: item.telefone, endereco: item.endereco } });
                        break;
                    default:
                        return res.status(400).json({ error: `Tipo '${tipo}' não suportado` });
                }
                importados++;
            } catch (e) {
                erros++;
            }
        }

        res.json({ importados, erros, total: dados.length });
    } catch (error: any) {
        console.error('Importar dados error:', error);
        res.status(500).json({ error: 'Failed to import data', details: error.message });
    }
};
