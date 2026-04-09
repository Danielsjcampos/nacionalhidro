import prisma from '../lib/prisma';

export class SequenceService {
  /**
   * Obtém o próximo número disponível para uma entidade, ignorando prefixos e sufixos.
   * Analisa strings como "OS-LEGADO-23946", "PROP-2024-001", etc.
   */
  static async getNextNumber(modelName: 'ordemServico' | 'proposta' | 'medicao' | 'faturamento'): Promise<number> {
    try {
      // Acesso dinâmico ao modelo prisma com cast para 'any' para evitar erro de build (TSC)
      const model = (prisma as any)[modelName];

      // Se for proposta, podemos usar o campo 'numero' que é autoincrement
      if (modelName === 'proposta') {
        const lastRecord = await prisma.proposta.findFirst({
          orderBy: { numero: 'desc' },
          select: { numero: true }
        });
        if (lastRecord) return lastRecord.numero + 1;
      }

      // Identifica qual campo de código/número usar (Faturamento usa 'numero', outros usam 'codigo')
      const fieldName = modelName === 'faturamento' ? 'numero' : 'codigo';

      // Para outros modelos ou fallback, pegamos os 100 mais recentes apenas
      const records = await model.findMany({
        select: { [fieldName]: true },
        where: { [fieldName]: { not: '' } },
        orderBy: { createdAt: 'desc' },
        take: 100
      });

      let maxNumber = 0;

      for (const record of records) {
        const val = record[fieldName];
        if (!val) continue;
        const matches = val.match(/\d+/g);
        if (matches) {
          const lastNum = parseInt(matches[matches.length - 1], 10);
          if (!isNaN(lastNum) && lastNum > maxNumber) {
            maxNumber = lastNum;
          }
        }
      }

      // Se não achou nada nos 100 recentes, tenta um scan geral de códigos mas apenas se maxNumber for 0
      // No entanto, para evitar hang, vamos apenas retornar maxNumber + 1 ou 1.
      return maxNumber > 0 ? maxNumber + 1 : 1;
    } catch (error) {
      console.error(`Erro ao gerar sequência para ${modelName}:`, error);
      return 1;
    }
  }

  /**
   * Gera o código formatado padrão.
   * Ex: OS-2026-23947
   */
  static async generateCode(modelName: 'ordemServico' | 'proposta' | 'medicao' | 'faturamento', prefix: string): Promise<string> {
    const nextNum = await this.getNextNumber(modelName);
    const year = new Date().getFullYear();
    
    // Mantém o padrão de 4 dígitos para números pequenos, mas respeita os grandes da migração
    const padded = nextNum < 1000 ? String(nextNum).padStart(4, '0') : String(nextNum);
    
    return `${prefix}-${year}-${padded}`;
  }
}
