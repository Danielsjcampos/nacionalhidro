import prisma from './prisma';

interface LogParams {
    entidade: string;
    entidadeId: string;
    acao: string;
    campo?: string;
    valorAnterior?: any;
    valorNovo?: any;
    descricao?: string;
    usuarioId?: string;
    usuarioNome?: string;
    ip?: string;
}

export async function registrarLog(params: LogParams): Promise<void> {
    try {
        await (prisma as any).logAlteracao.create({
            data: {
                entidade: params.entidade,
                entidadeId: params.entidadeId,
                acao: params.acao,
                campo: params.campo || null,
                valorAnterior: params.valorAnterior ? JSON.stringify(params.valorAnterior) : null,
                valorNovo: params.valorNovo ? JSON.stringify(params.valorNovo) : null,
                descricao: params.descricao || null,
                usuarioId: params.usuarioId || null,
                usuarioNome: params.usuarioNome || null,
                ip: params.ip || null,
            }
        });
    } catch (error) {
        console.error('Failed to register audit log:', error);
        // Don't throw — logging should never break the main operation
    }
}

export function detectChanges(before: any, after: any, fields: string[]): { campo: string; anterior: any; novo: any }[] {
    const changes: { campo: string; anterior: any; novo: any }[] = [];
    for (const field of fields) {
        const oldVal = before?.[field];
        const newVal = after?.[field];
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
            changes.push({ campo: field, anterior: oldVal, novo: newVal });
        }
    }
    return changes;
}
