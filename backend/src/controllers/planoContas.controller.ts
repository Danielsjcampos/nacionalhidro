import { Response } from 'express';
import prismaClient from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// Cast to any to support new models/fields added to schema
const prisma = prismaClient as any;

// ─── LISTAR PLANO DE CONTAS (TREE) ──────────────────────────────
export const listPlanoContas = async (req: AuthRequest, res: Response) => {
    try {
        const { empresa } = req.query;
        const where: any = {};
        if (empresa) where.empresa = { in: [empresa, 'AMBAS'] };

        const contas = await prisma.planoContas.findMany({
            where,
            orderBy: { codigo: 'asc' },
        });

        // Montar árvore
        const map = new Map<string, any>();
        contas.forEach(c => map.set(c.id, { ...c, children: [] }));

        const tree: any[] = [];
        contas.forEach(c => {
            const node = map.get(c.id)!;
            if (c.parentId && map.has(c.parentId)) {
                map.get(c.parentId)!.children.push(node);
            } else {
                tree.push(node);
            }
        });

        res.json(tree);
    } catch (error) {
        console.error('List plano contas error:', error);
        res.status(500).json({ error: 'Falha ao buscar plano de contas' });
    }
};

// ─── LISTAR FLAT (para select) ──────────────────────────────────
export const listPlanoContasFlat = async (req: AuthRequest, res: Response) => {
    try {
        const { tipo, natureza } = req.query;
        const where: any = {};
        if (tipo) where.tipo = tipo;
        if (natureza) where.natureza = natureza;

        const contas = await prisma.planoContas.findMany({
            where,
            orderBy: { codigo: 'asc' },
        });
        res.json(contas);
    } catch (error) {
        console.error('List flat error:', error);
        res.status(500).json({ error: 'Falha ao buscar contas' });
    }
};

// ─── CRIAR CONTA ────────────────────────────────────────────────
export const createPlanoConta = async (req: AuthRequest, res: Response) => {
    try {
        const { codigo, descricao, tipo, natureza, nivel, parentId, empresa } = req.body;
        if (!codigo || !descricao) {
            return res.status(400).json({ error: 'Código e descrição são obrigatórios' });
        }

        const exists = await prisma.planoContas.findFirst({ where: { codigo } });
        if (exists) return res.status(400).json({ error: `Código ${codigo} já existe` });

        const conta = await prisma.planoContas.create({
            data: { codigo, descricao, tipo, natureza, nivel, parentId, empresa }
        });
        res.status(201).json(conta);
    } catch (error: any) {
        console.error('Create plano conta error:', error);
        res.status(500).json({ error: 'Falha ao criar conta', details: error.message });
    }
};

// ─── ATUALIZAR CONTA ────────────────────────────────────────────
export const updatePlanoConta = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const updated = await prisma.planoContas.update({
            where: { id },
            data: req.body,
        });
        res.json(updated);
    } catch (error: any) {
        console.error('Update plano conta error:', error);
        res.status(500).json({ error: 'Falha ao atualizar', details: error.message });
    }
};

// ─── DELETAR CONTA ──────────────────────────────────────────────
export const deletePlanoConta = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        // Verificar se há filhos
        const filhos = await prisma.planoContas.count({ where: { parentId: id } });
        if (filhos > 0) return res.status(400).json({ error: 'Não é possível excluir: possui subcontas' });

        await prisma.planoContas.delete({ where: { id } });
        res.status(204).send();
    } catch (error: any) {
        console.error('Delete plano conta error:', error);
        res.status(500).json({ error: 'Falha ao excluir' });
    }
};

// ─── SEED PLANO DE CONTAS ───────────────────────────────────────
export const seedPlanoContas = async (req: AuthRequest, res: Response) => {
    try {
        const existing = await prisma.planoContas.count();
        if (existing > 0) return res.status(400).json({ error: 'Plano de contas já possui registros. Limpe antes de importar.' });

        const contas = [
            // ─── RECEITAS ─────────────────────────────
            { codigo: '1', descricao: 'RECEITAS', tipo: 'SINTETICA', natureza: 'RECEITA', nivel: 1, empresa: 'AMBAS' },
            { codigo: '1.1', descricao: 'Receita Operacional', tipo: 'SINTETICA', natureza: 'RECEITA', nivel: 2, empresa: 'AMBAS' },
            { codigo: '1.1.01', descricao: 'Faturamento de Serviços', tipo: 'ANALITICA', natureza: 'RECEITA', nivel: 3, empresa: 'HIDRO' },
            { codigo: '1.1.02', descricao: 'Locação de Equipamentos', tipo: 'ANALITICA', natureza: 'RECEITA', nivel: 3, empresa: 'LOCACAO' },
            { codigo: '1.1.03', descricao: 'Venda de Materiais', tipo: 'ANALITICA', natureza: 'RECEITA', nivel: 3, empresa: 'AMBAS' },
            { codigo: '1.1.04', descricao: 'Medições de Contratos', tipo: 'ANALITICA', natureza: 'RECEITA', nivel: 3, empresa: 'HIDRO' },
            { codigo: '1.2', descricao: 'Receitas Financeiras', tipo: 'SINTETICA', natureza: 'RECEITA', nivel: 2, empresa: 'AMBAS' },
            { codigo: '1.2.01', descricao: 'Juros Recebidos', tipo: 'ANALITICA', natureza: 'RECEITA', nivel: 3, empresa: 'AMBAS' },
            { codigo: '1.2.02', descricao: 'Rendimentos de Aplicação', tipo: 'ANALITICA', natureza: 'RECEITA', nivel: 3, empresa: 'AMBAS' },
            { codigo: '1.3', descricao: 'Outras Receitas', tipo: 'SINTETICA', natureza: 'RECEITA', nivel: 2, empresa: 'AMBAS' },
            { codigo: '1.3.01', descricao: 'Descontos Obtidos', tipo: 'ANALITICA', natureza: 'RECEITA', nivel: 3, empresa: 'AMBAS' },

            // ─── DESPESAS ─────────────────────────────
            { codigo: '2', descricao: 'DESPESAS', tipo: 'SINTETICA', natureza: 'DESPESA', nivel: 1, empresa: 'AMBAS' },

            // Pessoal
            { codigo: '2.1', descricao: 'Despesas com Pessoal', tipo: 'SINTETICA', natureza: 'DESPESA', nivel: 2, empresa: 'AMBAS' },
            { codigo: '2.1.01', descricao: 'Salários e Ordenados', tipo: 'ANALITICA', natureza: 'DESPESA', nivel: 3, empresa: 'AMBAS' },
            { codigo: '2.1.02', descricao: 'INSS Patronal', tipo: 'ANALITICA', natureza: 'DESPESA', nivel: 3, empresa: 'AMBAS' },
            { codigo: '2.1.03', descricao: 'FGTS', tipo: 'ANALITICA', natureza: 'DESPESA', nivel: 3, empresa: 'AMBAS' },
            { codigo: '2.1.04', descricao: 'Vale Transporte', tipo: 'ANALITICA', natureza: 'DESPESA', nivel: 3, empresa: 'AMBAS' },
            { codigo: '2.1.05', descricao: 'Vale Refeição/Alimentação', tipo: 'ANALITICA', natureza: 'DESPESA', nivel: 3, empresa: 'AMBAS' },
            { codigo: '2.1.06', descricao: 'Férias + 1/3', tipo: 'ANALITICA', natureza: 'DESPESA', nivel: 3, empresa: 'AMBAS' },
            { codigo: '2.1.07', descricao: '13° Salário', tipo: 'ANALITICA', natureza: 'DESPESA', nivel: 3, empresa: 'AMBAS' },
            { codigo: '2.1.08', descricao: 'Rescisões Trabalhistas', tipo: 'ANALITICA', natureza: 'DESPESA', nivel: 3, empresa: 'AMBAS' },
            { codigo: '2.1.09', descricao: 'Hospedagens / Diárias', tipo: 'ANALITICA', natureza: 'DESPESA', nivel: 3, empresa: 'AMBAS' },
            { codigo: '2.1.10', descricao: 'EPIs e Uniformes', tipo: 'ANALITICA', natureza: 'DESPESA', nivel: 3, empresa: 'AMBAS' },

            // Operacional
            { codigo: '2.2', descricao: 'Despesas Operacionais', tipo: 'SINTETICA', natureza: 'DESPESA', nivel: 2, empresa: 'AMBAS' },
            { codigo: '2.2.01', descricao: 'Combustível', tipo: 'ANALITICA', natureza: 'DESPESA', nivel: 3, empresa: 'AMBAS' },
            { codigo: '2.2.02', descricao: 'Manutenção de Veículos', tipo: 'ANALITICA', natureza: 'DESPESA', nivel: 3, empresa: 'AMBAS' },
            { codigo: '2.2.03', descricao: 'Manutenção de Equipamentos', tipo: 'ANALITICA', natureza: 'DESPESA', nivel: 3, empresa: 'AMBAS' },
            { codigo: '2.2.04', descricao: 'Peças e Acessórios', tipo: 'ANALITICA', natureza: 'DESPESA', nivel: 3, empresa: 'AMBAS' },
            { codigo: '2.2.05', descricao: 'Material de Consumo', tipo: 'ANALITICA', natureza: 'DESPESA', nivel: 3, empresa: 'AMBAS' },
            { codigo: '2.2.06', descricao: 'Locação de Equipamentos/Veículos', tipo: 'ANALITICA', natureza: 'DESPESA', nivel: 3, empresa: 'HIDRO' },
            { codigo: '2.2.07', descricao: 'Pedágios e Estacionamentos', tipo: 'ANALITICA', natureza: 'DESPESA', nivel: 3, empresa: 'AMBAS' },

            // Administrativa
            { codigo: '2.3', descricao: 'Despesas Administrativas', tipo: 'SINTETICA', natureza: 'DESPESA', nivel: 2, empresa: 'AMBAS' },
            { codigo: '2.3.01', descricao: 'Aluguel', tipo: 'ANALITICA', natureza: 'DESPESA', nivel: 3, empresa: 'AMBAS' },
            { codigo: '2.3.02', descricao: 'Energia Elétrica', tipo: 'ANALITICA', natureza: 'DESPESA', nivel: 3, empresa: 'AMBAS' },
            { codigo: '2.3.03', descricao: 'Telefone e Internet', tipo: 'ANALITICA', natureza: 'DESPESA', nivel: 3, empresa: 'AMBAS' },
            { codigo: '2.3.04', descricao: 'Material de Escritório', tipo: 'ANALITICA', natureza: 'DESPESA', nivel: 3, empresa: 'AMBAS' },
            { codigo: '2.3.05', descricao: 'Contabilidade e Assessoria', tipo: 'ANALITICA', natureza: 'DESPESA', nivel: 3, empresa: 'AMBAS' },
            { codigo: '2.3.06', descricao: 'Seguros', tipo: 'ANALITICA', natureza: 'DESPESA', nivel: 3, empresa: 'AMBAS' },
            { codigo: '2.3.07', descricao: 'Sistemas e Software', tipo: 'ANALITICA', natureza: 'DESPESA', nivel: 3, empresa: 'AMBAS' },

            // Tributária
            { codigo: '2.4', descricao: 'Despesas Tributárias', tipo: 'SINTETICA', natureza: 'DESPESA', nivel: 2, empresa: 'AMBAS' },
            { codigo: '2.4.01', descricao: 'Simples Nacional / DAS', tipo: 'ANALITICA', natureza: 'DESPESA', nivel: 3, empresa: 'AMBAS' },
            { codigo: '2.4.02', descricao: 'ISS', tipo: 'ANALITICA', natureza: 'DESPESA', nivel: 3, empresa: 'HIDRO' },
            { codigo: '2.4.03', descricao: 'ICMS', tipo: 'ANALITICA', natureza: 'DESPESA', nivel: 3, empresa: 'LOCACAO' },
            { codigo: '2.4.04', descricao: 'Taxas e Licenças', tipo: 'ANALITICA', natureza: 'DESPESA', nivel: 3, empresa: 'AMBAS' },

            // Financeira
            { codigo: '2.5', descricao: 'Despesas Financeiras', tipo: 'SINTETICA', natureza: 'DESPESA', nivel: 2, empresa: 'AMBAS' },
            { codigo: '2.5.01', descricao: 'Juros Pagos', tipo: 'ANALITICA', natureza: 'DESPESA', nivel: 3, empresa: 'AMBAS' },
            { codigo: '2.5.02', descricao: 'Tarifas Bancárias', tipo: 'ANALITICA', natureza: 'DESPESA', nivel: 3, empresa: 'AMBAS' },
            { codigo: '2.5.03', descricao: 'IOF', tipo: 'ANALITICA', natureza: 'DESPESA', nivel: 3, empresa: 'AMBAS' },
            { codigo: '2.5.04', descricao: 'Multas e Juros Mora', tipo: 'ANALITICA', natureza: 'DESPESA', nivel: 3, empresa: 'AMBAS' },
        ];

        // Insert hierarchically
        const idMap = new Map<string, string>();

        for (const c of contas) {
            let parentId: string | undefined;
            const parts = c.codigo.split('.');
            if (parts.length > 1) {
                const parentCode = parts.slice(0, -1).join('.');
                parentId = idMap.get(parentCode);
            }

            const created = await prisma.planoContas.create({
                data: { ...c, parentId: parentId || null }
            });
            idMap.set(c.codigo, created.id);
        }

        res.status(201).json({ message: `${contas.length} contas importadas com sucesso`, total: contas.length });
    } catch (error: any) {
        console.error('Seed plano contas error:', error);
        res.status(500).json({ error: 'Falha ao importar plano de contas', details: error.message });
    }
};
