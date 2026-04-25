import { X, History, Banknote, CalendarClock } from 'lucide-react';

interface Props { conta: any; open: boolean; onClose: () => void; }

const FORMA_PAG: Record<number, string> = {
  1: 'Boleto', 2: 'Cheque', 3: 'Pix', 4: 'Transferência', 5: 'Dinheiro', 6: 'Débito Automático',
};

export default function ModalHistoricoCP({ conta, open, onClose }: Props) {
  if (!open || !conta) return null;

  const historicos = conta.historicosCP || [];
  const parcelas = conta.pagamentoCP?.parcelas || [];
  const fmt = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
  const fmtDateTime = (d: string) => d ? new Date(d).toLocaleString('pt-BR') : '—';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b bg-slate-700 text-white rounded-t-2xl">
          <div>
            <h2 className="text-lg font-black flex items-center gap-2"><History className="w-5 h-5" /> Histórico de Pagamento</h2>
            <p className="text-sm text-slate-300">{conta.fornecedor?.nome || '—'} · NF {conta.notaFiscal || 'S/N'} · {fmt(Number(conta.valorOriginal))}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-600 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto space-y-6">
          {/* Parcelas Timeline */}
          <div>
            <h3 className="text-sm font-black text-slate-700 mb-3 flex items-center gap-2"><CalendarClock className="w-4 h-4 text-blue-600" /> Parcelas</h3>
            <div className="space-y-2">
              {parcelas.map((p: any) => {
                const statusColor = p.statusPagamento === 1 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                  p.statusPagamento === 2 ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200';
                const statusLabel = p.statusPagamento === 1 ? 'Pago' : p.statusPagamento === 2 ? 'Parcial' : 'Pendente';
                return (
                  <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl border ${statusColor}`}>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-lg">{p.numeroParcela}</span>
                      <div>
                        <p className="text-xs font-bold">Venc.: {fmtDate(p.dataVencimento)}</p>
                        {p.dataVencimentoReal && <p className="text-[10px]">Pagto: {fmtDate(p.dataVencimentoReal)}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black">{fmt(Number(p.valorAPagar))}</p>
                      {p.statusPagamento > 0 && <p className="text-[10px]">Pago: {fmt(Number(p.valorPago))}</p>}
                      <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-white/50">{statusLabel}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Histórico de Baixas */}
          <div>
            <h3 className="text-sm font-black text-slate-700 mb-3 flex items-center gap-2"><Banknote className="w-4 h-4 text-emerald-600" /> Registros de Baixa ({historicos.length})</h3>
            {historicos.length === 0 ? (
              <p className="text-sm text-slate-400 italic text-center py-4">Nenhum pagamento registrado.</p>
            ) : (
              <div className="relative border-l-2 border-slate-200 pl-5 space-y-4 ml-2">
                {historicos.map((h: any, i: number) => (
                  <div key={h.id || i} className="relative">
                    <div className="absolute -left-[1.65rem] top-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow" />
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-black text-emerald-700">{fmt(Number(h.valor))}</p>
                          <p className="text-[10px] text-slate-400">{FORMA_PAG[h.formaPagamento] || '—'} · {fmtDateTime(h.dataPagamento)}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold">{h.usuarioBaixa || '—'}</span>
                      </div>
                      {h.observacao && <p className="text-xs text-slate-500 mt-1 italic">{h.observacao}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-5 border-t border-slate-100 flex justify-end">
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-slate-600 font-bold text-sm bg-slate-100 hover:bg-slate-200">Fechar</button>
        </div>
      </div>
    </div>
  );
}
