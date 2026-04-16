import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { verificarAlertasRH } from '../jobs/alertasRH.job';

// ─── T07: Endpoint de Alertas RH (on-demand) ───
export const getAlertasRH = async (req: AuthRequest, res: Response) => {
  try {
    const alertas = await verificarAlertasRH();
    res.json(alertas);
  } catch (error) {
    console.error('Alertas RH error:', error);
    res.status(500).json({ error: 'Falha ao buscar alertas de RH' });
  }
};

// ─── T08: Alertas de Documentos Veiculares ───
export const getAlertasVeiculos = async (req: AuthRequest, res: Response) => {
  try {
    const hoje = new Date();
    const em30dias = new Date(hoje);
    em30dias.setDate(em30dias.getDate() + 30);

    // Buscar todos os veículos com datas de vencimento
    const veiculos = await prisma.veiculo.findMany({
      select: {
        id: true,
        placa: true,
        modelo: true,
        tipo: true,
        crlvVencimento: true,
        anttVencimento: true,
        tacografoVencimento: true,
        seguroVencimento: true,
      }
    });

    const alertas: any[] = [];

    const docTypes = [
      { field: 'crlvVencimento', label: 'CRLV' },
      { field: 'anttVencimento', label: 'ANTT' },
      { field: 'tacografoVencimento', label: 'Tacógrafo' },
      { field: 'seguroVencimento', label: 'Seguro' },
    ];

    for (const v of veiculos) {
      for (const doc of docTypes) {
        const dataVenc = (v as any)[doc.field] as Date | null;
        if (!dataVenc) continue;

        const diffMs = dataVenc.getTime() - hoje.getTime();
        const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        // Alerta se vencido ou vencendo em 30 dias
        if (diasRestantes <= 30) {
          let urgencia: string;
          if (diasRestantes <= 0) urgencia = 'VENCIDO';
          else if (diasRestantes <= 7) urgencia = 'CRITICO';
          else if (diasRestantes <= 15) urgencia = 'ALERTA';
          else urgencia = 'AVISO';

          alertas.push({
            veiculoId: v.id,
            placa: v.placa,
            modelo: v.modelo,
            tipo: v.tipo,
            documento: doc.label,
            dataVencimento: dataVenc.toISOString(),
            diasRestantes,
            urgencia,
          });
        }
      }
    }

    // Ordenar por urgência: VENCIDO > CRITICO > ALERTA > AVISO
    const prioridade: Record<string, number> = { VENCIDO: 0, CRITICO: 1, ALERTA: 2, AVISO: 3 };
    alertas.sort((a, b) => prioridade[a.urgencia] - prioridade[b.urgencia]);

    res.json({
      alertas,
      total: alertas.length,
      verificadoEm: hoje.toISOString()
    });
  } catch (error) {
    console.error('Alertas veículos error:', error);
    res.status(500).json({ error: 'Falha ao buscar alertas de veículos' });
  }
};

// ─── Dashboard unificado de alertas ───
export const getAlertasGerais = async (req: AuthRequest, res: Response) => {
  try {
    const [rh, estoqueResponse] = await Promise.all([
      verificarAlertasRH(),
      prisma.produto.findMany({ where: { estoqueMinimo: { gt: 0 } } })
    ]);

    // Estoque
    const estoqueBaixo = estoqueResponse
      .filter(p => Number(p.estoqueAtual) <= Number(p.estoqueMinimo))
      .map(p => ({
        ...p,
        status: Number(p.estoqueAtual) <= 0 ? 'ESGOTADO' : Number(p.estoqueAtual) <= Number(p.estoqueMinimo) * 0.5 ? 'CRITICO' : 'BAIXO',
      }));

    // Veículos
    const hoje = new Date();
    const em30dias = new Date(hoje);
    em30dias.setDate(em30dias.getDate() + 30);

    const veiculos = await prisma.veiculo.findMany({
      select: {
        id: true, placa: true, modelo: true,
        crlvVencimento: true, anttVencimento: true,
        tacografoVencimento: true, seguroVencimento: true,
      }
    });

    const veiculoAlertas: any[] = [];
    const docTypes = [
      { field: 'crlvVencimento', label: 'CRLV' },
      { field: 'anttVencimento', label: 'ANTT' },
      { field: 'tacografoVencimento', label: 'Tacógrafo' },
      { field: 'seguroVencimento', label: 'Seguro' },
    ];

    for (const v of veiculos) {
      for (const doc of docTypes) {
        const dataVenc = (v as any)[doc.field] as Date | null;
        if (!dataVenc) continue;
        const dias = Math.ceil((dataVenc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        if (dias <= 30) {
          veiculoAlertas.push({
            placa: v.placa, modelo: v.modelo,
            documento: doc.label, diasRestantes: dias,
            urgencia: dias <= 0 ? 'VENCIDO' : dias <= 7 ? 'CRITICO' : dias <= 15 ? 'ALERTA' : 'AVISO',
          });
        }
      }
    }

    res.json({
      rh: {
        asoVencendo: rh.asoVencendo.length,
        feriasVencendo: rh.feriasVencendo.length,
        experienciaVencendo: rh.experienciaVencendo.length,
        total: rh.total,
        detalhes: rh
      },
      veiculos: {
        total: veiculoAlertas.length,
        alertas: veiculoAlertas
      },
      estoque: {
        total: estoqueBaixo.length,
        produtos: estoqueBaixo
      },
      totalGeral: rh.total + veiculoAlertas.length + estoqueBaixo.length,
      verificadoEm: hoje.toISOString()
    });
  } catch (error) {
    console.error('Alertas gerais error:', error);
    res.status(500).json({ error: 'Falha ao buscar alertas gerais' });
  }
};
