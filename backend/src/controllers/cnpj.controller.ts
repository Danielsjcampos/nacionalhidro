import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// ─── LIST EMPRESAS/CNPJ ─────────────────────────────────────────
export const listEmpresas = async (req: AuthRequest, res: Response) => {
    try {
        const empresas = await (prisma as any).empresaCNPJ.findMany({
            where: { ativa: true },
            orderBy: { nome: 'asc' }
        });
        res.json(empresas);
    } catch (error) {
        console.error('List empresas error:', error);
        res.status(500).json({ error: 'Failed to fetch companies' });
    }
};

// ─── GET INDICADOR DE FATURAMENTO POR CNPJ ──────────────────────
export const getIndicadorFaturamento = async (req: AuthRequest, res: Response) => {
    try {
        const now = new Date();
        const mesAtual = now.getMonth();
        const anoAtual = now.getFullYear();
        const inicioMes = new Date(anoAtual, mesAtual, 1);
        const fimMes = new Date(anoAtual, mesAtual + 1, 1);

        const empresas = await (prisma as any).empresaCNPJ.findMany({
            where: { ativa: true }
        });

        const faturas = await (prisma as any).faturamento.findMany({
            where: {
                dataEmissao: { gte: inicioMes, lt: fimMes },
                status: { not: 'CANCELADA' }
            }
        });

        const indicadores = empresas.map((emp: any) => {
            const faturasEmpresa = faturas.filter((f: any) =>
                f.cnpjFaturamento === emp.cnpj || f.cnpjFaturamento === emp.nome
            );
            const totalFaturado = faturasEmpresa.reduce((sum: number, f: any) =>
                sum + Number(f.valorBruto || 0), 0
            );
            const limite = Number(emp.limiteMenusal || 500000);
            const percentualUsado = limite > 0 ? (totalFaturado / limite) * 100 : 0;
            const alertaPercentual = Number(emp.alertaPercentual || 80);

            return {
                id: emp.id,
                nome: emp.nome,
                cnpj: emp.cnpj,
                limite,
                totalFaturado: Math.round(totalFaturado * 100) / 100,
                percentualUsado: Math.round(percentualUsado * 100) / 100,
                alertaPercentual,
                status: percentualUsado >= 100 ? 'ESTOURADO' :
                    percentualUsado >= alertaPercentual ? 'ALERTA' : 'NORMAL',
                qtdFaturas: faturasEmpresa.length,
                mesReferencia: `${String(mesAtual + 1).padStart(2, '0')}/${anoAtual}`,
                nfseAtiva: emp.nfseAtiva,
                nfseAmbient: emp.nfseAmbient,
                nfseCertificate: emp.nfseCertificate,
                nfsePrivateKey: emp.nfsePrivateKey,
                nfsePassphrase: emp.nfsePassphrase
            };
        });

        res.json(indicadores);
    } catch (error) {
        console.error('Indicador faturamento error:', error);
        res.status(500).json({ error: 'Failed to get billing indicator' });
    }
};

// ─── UPDATE EMPRESA ─────────────────────────────────────────────
export const updateEmpresa = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const { limiteMenusal, alertaPercentual, ...rest } = req.body;
        const emp = await (prisma as any).empresaCNPJ.update({
            where: { id },
            data: {
                ...rest,
                limiteMenusal: limiteMenusal !== undefined ? Number(limiteMenusal) : undefined,
                alertaPercentual: alertaPercentual !== undefined ? Number(alertaPercentual) : undefined,
            }
        });
        res.json(emp);
    } catch (error: any) {
        console.error('Update empresa error:', error);
        res.status(500).json({ error: 'Failed to update company', details: error.message });
    }
};

// ─── CREATE EMPRESA ─────────────────────────────────────────────
export const createEmpresa = async (req: AuthRequest, res: Response) => {
    try {
        const { nome, cnpj, limiteMenusal, alertaPercentual } = req.body;
        
        if (!nome || !cnpj) {
            return res.status(400).json({ error: 'Nome e CNPJ são obrigatórios' });
        }

        const empresa = await (prisma as any).empresaCNPJ.create({
            data: {
                nome,
                cnpj,
                limiteMenusal: limiteMenusal ? Number(limiteMenusal) : 500000,
                alertaPercentual: alertaPercentual ? Number(alertaPercentual) : 80,
                ativa: true
            }
        });

        res.status(201).json(empresa);
    } catch (error: any) {
        console.error('Create empresa error:', error);
        res.status(500).json({ error: 'Failed to create company', details: error.message });
    }
};

// ─── DELETE EMPRESA (SOFT DELETE) ───────────────────────────────
export const deleteEmpresa = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        
        // Soft delete: apenas desativa o CNPJ
        await (prisma as any).empresaCNPJ.update({
            where: { id },
            data: { ativa: false }
        });

        res.json({ message: 'Company deactivated successfully' });
    } catch (error: any) {
        console.error('Delete empresa error:', error);
        res.status(500).json({ error: 'Failed to delete company', details: error.message });
    }
};

// ─── SEED AUTOMÁTICO: Empresas históricas da Nacional Hidro ──────
export async function seedEmpresasHistoricas() {
    const empresas = [
        {
            nome:              'NACIONAL HIDROSSANEAMENTO EIRELI EPP',
            cnpj:              '04.315.038/0001-04',
            razaoSocial:       'NACIONAL HIDROSSANEAMENTO EIRELI EPP',
            logradouro:        'R. DIACONISA ALICE A. DA SILVA',
            numero:            '279',
            bairro:            'PARQUE MARIA HELENA',
            municipio:         'CAMPINAS',
            uf:                'SP',
            cep:               '13.067-841',
            telefone:          '(19) 3203-3301',
            inscricaoEstadual: '244.796.656.112',
            regimeTributario:  5,
            naturezaOperacao:  'Remessa',
            limiteMenusal:     500000,
            alertaPercentual:  80,
            ativa:             true,
        },
        {
            nome:              'NACIONALHIDRO LOCACAO DE EQUIPAMENTOS EIRELI',
            cnpj:              '24.840.094/0001-75',
            razaoSocial:       'NACIONALHIDRO LOCACAO DE EQUIPAMENTOS EIRELI',
            logradouro:        'R. DIACONISA ALICE A. DA SILVA',
            numero:            '259',
            bairro:            'PARQUE MARIA HELENA',
            municipio:         'CAMPINAS',
            uf:                'SP',
            cep:               '13.067-841',
            telefone:          '(19) 3203-3301',
            inscricaoEstadual: '795.785.647.112',
            regimeTributario:  5,
            naturezaOperacao:  'Locação de Bens Móveis',
            limiteMenusal:     500000,
            alertaPercentual:  80,
            ativa:             true,
        },
    ];

    for (const empresa of empresas) {
        try {
            const exists = await (prisma as any).empresaCNPJ.findFirst({ where: { cnpj: empresa.cnpj } });
            if (!exists) {
                await (prisma as any).empresaCNPJ.create({ data: empresa });
                console.log(`[Bootstrap] ✅ Empresa inserida: ${empresa.nome}`);
            }
        } catch (e) {
            console.error(`[Bootstrap] Erro ao inserir empresa ${empresa.cnpj}:`, e);
        }
    }
}

