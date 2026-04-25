// ─── Módulo 5 — Logística: Funções Utilitárias ───────────────────────────────

/**
 * Converte string de hora ("HH:mm" ou "HH:mm:ss.SSS") em minutos totais.
 */
export function horaParaMinutos(hora: string | null | undefined): number {
  if (!hora) return 0;
  const parts = hora.split(':');
  if (parts.length < 2) return 0;
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

/**
 * Converte minutos totais em string "HH:mm".
 */
export function minutosParaHora(minutos: number): string {
  if (isNaN(minutos) || minutos < 0) minutos = 0;
  const h = Math.floor(minutos / 60);
  const m = Math.round(minutos % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Converte número de horas (ex: 10) em string "HH:mm".
 */
export function formatarHoraParaTime(horas: number | null | undefined): string {
  if (horas == null || isNaN(horas)) return '';
  const h = Math.floor(horas);
  const m = Math.round((horas - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Agrupa array de objetos pelo campo `chave`.
 */
export function groupByEquipamento(
  equipes: any[],
  chave: string
): Record<string, any[]> {
  return equipes.reduce<Record<string, any[]>>((acc, item) => {
    const key = item[chave] ?? 'Sem Equipamento';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

/**
 * Gera texto "Equipamento X: Cargo A (Qtd), Cargo B (Qtd)"
 * a partir de grupos gerados por groupByEquipamento.
 */
export function gerarTextoEquipes(grupos: Record<string, any[]>): string {
  return Object.entries(grupos)
    .map(([equip, membros]) => {
      // Agrupa por cargo dentro do equipamento
      const cargos = membros.reduce<Record<string, number>>((acc, m) => {
        const cargo = m.cargo ?? m.Cargo?.Descricao ?? 'Sem Cargo';
        acc[cargo] = (acc[cargo] ?? 0) + (m.quantidade ?? 1);
        return acc;
      }, {});

      const cargosStr = Object.entries(cargos)
        .map(([cargo, qty]) => `${cargo} (${qty})`)
        .join(', ');

      return `${equip}: ${cargosStr}`;
    })
    .join(' | ');
}

// ─── Enums (Módulo 5) ────────────────────────────────────────────────────────

export const STATUS_OS = {
  Cancelada: 0,
  Aberta: 1,
  Executada: 2,
} as const;

export const STATUS_ESCALA = {
  Cancelada: 0,
  Aberta: 1,
  Executada: 2,
} as const;

export const TIPO_COBRANCA = [
  { value: 1, label: 'Hora' },
  { value: 2, label: 'Diária' },
  { value: 3, label: 'Frete' },
  { value: 4, label: 'Fechada' },
] as const;

export const STATUS_OPERACIONAL = [
  { value: 0, label: 'Nenhum' },
  { value: 1, label: 'Férias' },
  { value: 2, label: 'Atestado' },
  { value: 3, label: 'Pátio' },
  { value: 4, label: 'Banco de Horas' },
] as const;

export const DIAS_SEMANA_OPTIONS = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
] as const;

// ─── Cálculo de Tempo Total ──────────────────────────────────────────────────

export interface CalcTempoResult {
  horaTotal: string;    // "HH:mm"
  horaAdicional: string; // "HH:mm"
}

/**
 * Calcula HoraTotal e HoraAdicional conforme regras do Módulo 5.
 *
 * Lógica:
 *  calculoTotal = (saida − entrada) − (almoco + tolerancia)
 *  se calculoTotal < horaPadrao: totalHora = horaPadrao, adicional = 0
 *  senão: totalHora = horaPadrao, adicional = calculoTotal − horaPadrao
 */
export function calcularTempoTotal(params: {
  horaPadrao: string;
  horaEntrada: string;
  horaSaida: string;
  horaAlmoco: string;
  horaTolerancia: string;
  descontarAlmoco: boolean;
}): CalcTempoResult {
  const {
    horaPadrao,
    horaEntrada,
    horaSaida,
    horaAlmoco,
    horaTolerancia,
    descontarAlmoco,
  } = params;

  const padrao = horaParaMinutos(horaPadrao);
  let entrada = horaParaMinutos(horaEntrada);
  let saida = horaParaMinutos(horaSaida);
  const tolerancia = horaParaMinutos(horaTolerancia) || 0;
  const almoco = descontarAlmoco ? horaParaMinutos(horaAlmoco) : 0;

  if (!entrada && !saida) {
    return {
      horaTotal: padrao > 0 ? minutosParaHora(padrao) : '',
      horaAdicional: '00:00',
    };
  }

  // Ajuste para jornada que atravessa meia-noite
  if (saida < entrada) {
    saida += 720;
    entrada -= 720;
  }

  const calculoTotal = saida - entrada - almoco - tolerancia;
  const total = Math.max(calculoTotal < padrao ? padrao : padrao, padrao);
  const adicional = calculoTotal > padrao ? calculoTotal - padrao : 0;

  return {
    horaTotal: minutosParaHora(total),
    horaAdicional: minutosParaHora(adicional),
  };
}
