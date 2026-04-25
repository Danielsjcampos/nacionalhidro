import { X, History, CalendarClock, Banknote } from 'lucide-react';

interface Props { conta: any; open: boolean; onClose: () => void; }

const FORMA_PAG: Record<number, string> = {
  1: 'Boleto', 2: 'Cheque', 3: 'Pix', 4: 'Transferência', 5: 'Dinheiro', 6: 'Débito Automático',
};

export default function ModalHistoricoCR({ conta, open, onClose }: Props) {
  if (!open || !conta) return null;

  const parcelas = conta.recebimentoCR?.parcelas || [];
  const fmt = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
  const fmtDateTime = (d: string) => d ? new Date(d).toLocaleString('pt-BR') : '—';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b bg-slate-700 text-white rounded-t-2xl">
          <div>
            <h2 className="text-lg font-black flex items-center gap-2"><History className="w-5 h-5" /> Histórico de Recebimento</h2>
            <p className="text-sm text-slate-300">{conta.cliente?.nome || '—'} · {conta.tipoFatura || ''} {conta.notaFiscal || 'S/N'} · {fmt(Number(conta.valorTotal || conta.valorOriginal))}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-600 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto space-y-6">
          {/* Impostos */}
          {(Number(conta.valorIss) > 0 || Number(conta.valorInss) > 0) && (
            <div className="bg-teal-50 rounded-xl p-3 border border-teal-200">
              <h4 className="text-xs font-black text-slate-600 mb-2">Impostos Retidos</h4>
              <div className="grid grid-cols-4 gap-2 text-[10px]">
                {[['ISS', conta.valorIss], ['INSS', conta.valorInss], ['PIS', conta.valorPis], ['COFINS', conta.valorCofins], ['IR', conta.valorIr], ['CSLL', conta.valorCsll], ['ICMS', conta.valorIcms]].filter(([, v]) => Number(v) > 0).map(([label, v]) => (
                  <div key={label as string} className="bg-white p-2 rounded border border-teal-200">
                    <span className="text-slate-400 font-bold block">{label}</span>
                    <span className="font-black text-red-600">{fmt(Number(v))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Parcelas */}
          <div>
            <h3 className="text-sm font-black text-slate-700 mb-3 flex items-center gap-2"><CalendarClock className="w-4 h-4 text-teal-600" /> Parcelas</h3>
            <div className="space-y-2">
              {parcelas.map((p: any) => {
                const stColor = p.statusRecebimento === 2 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                  p.statusRecebimento === 1 ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200';
                const stLabel = p.statusRecebimento === 2 ? 'Recebido' : p.statusRecebimento === 1 ? 'Parcial' : 'Pendente';
                return (
                  <div key={p.id}>
                    <div className={`flex items-center justify-between p-3 rounded-xl border ${stColor}`}>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-lg">{p.numeroParcela}</span>
                        <div>
                          <p className="text-xs font-bold">Venc.: {fmtDate(p.dataVencimento)}</p>
                          {p.dataVencimentoReal && <p className="text-[10px]">Recebido: {fmtDate(p.dataVencimentoReal)}</p>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black">{fmt(Number(p.valorAReceber || p.valorParcela))}</p>
                        <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-white/50">{stLabel}</span>
                      </div>
                    </div>

                    {/* Sub-registros de recebimento */}
                    {p.recebimentos?.length > 0 && (
                      <div className="ml-6 mt-1 border-l-2 border-slate-200 pl-4 space-y-1">
                        {p.recebimentos.map((r: any, ri: number) => (
                          <div key={r.id || ri} className="bg-slate-50 p-2 rounded-lg border border-slate-200 text-[10px]">
                            <div className="flex justify-between">
                              <span className="font-bold text-teal-700">{fmt(Number(r.valor))}</span>
                              <span className="text-slate-400">{fmtDateTime(r.dataRecebimento)}</span>
                            </div>
                            <div className="flex justify-between mt-0.5">
                              <span className="text-slate-400">{FORMA_PAG[r.formaPagamento] || '—'}{r.antecipar ? ' · Antecipado' : ''}</span>
                              <span className="text-slate-400">{r.usuarioBaixa || '—'}</span>
                            </div>
                            {r.observacao && <p className="text-slate-500 italic mt-0.5">{r.observacao}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-slate-100 flex justify-end">
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-slate-600 font-bold text-sm bg-slate-100 hover:bg-slate-200">Fechar</button>
        </div>
      </div>
    </div>
  );
}
