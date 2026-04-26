import React, { useEffect, useState } from 'react';
import { X, DollarSign, Loader2 } from 'lucide-react';

interface Props {
  modal: boolean;
  handleClose: () => void;
  os: any;
  save: (id: number, payload: any) => Promise<void>;
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">{label}</label>
    {children}
  </div>
);

const inp = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors bg-white font-mono';
const inpDis = `${inp} bg-slate-50 text-slate-400 cursor-not-allowed`;

export default function ModalPrecificarOS({ modal, handleClose, os, save }: Props) {
  const [totalServico, setTotalServico] = useState(0);
  const [totalHora, setTotalHora] = useState(0);
  const [valorExtra, setValorExtra] = useState(0);
  const [desconto, setDesconto] = useState(0);
  const [observacao, setObservacao] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!modal || !os) return;
    setTotalServico(os.precificacaoTotalServico ?? 0);
    setTotalHora(os.precificacaoTotalHora ?? 0);
    setValorExtra(os.precificacaoValorExtra ?? 0);
    setDesconto(os.precificacaoDesconto ?? 0);
    setObservacao(os.precificacaoObservacao ?? '');
  }, [modal, os]);

  const valorTotal = totalServico + totalHora + valorExtra - desconto;

  const handleSave = async () => {
    setLoading(true);
    try {
      await save(os.id, {
        precificacaoTotalServico: totalServico,
        precificacaoTotalHora: totalHora,
        precificacaoValorExtra: valorExtra,
        precificacaoDesconto: desconto,
        precificacaoObservacao: observacao,
      });
      handleClose();
    } finally {
      setLoading(false);
    }
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (!modal || !os) return null;

  const tipoLabel = ['', 'Hora', 'Diária', 'Frete', 'Fechada'][os.tipoCobranca] ?? '—';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[55] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-emerald-700 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <DollarSign className="w-5 h-5" />
            <div>
              <h2 className="font-black uppercase tracking-tight text-base leading-none">Precificar OS</h2>
              <p className="text-[10px] text-emerald-200 mt-0.5">
                {os.codigo}/{os.numero} — {tipoLabel} — {os.dataInicial ? new Date(os.dataInicial).toLocaleDateString('pt-BR') : ''}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Info badges */}
          <div className="flex gap-2 flex-wrap">
            <span className="px-2.5 py-1 bg-slate-100 rounded-md text-[10px] font-bold text-slate-600">
              Hora Total: {os.horaTotal || '—'}
            </span>
            <span className="px-2.5 py-1 bg-slate-100 rounded-md text-[10px] font-bold text-slate-600">
              Adicional: {os.horaAdicional || '—'}
            </span>
            {os.statusPrecificacao === 'PRECIFICADO' && (
              <span className="px-2.5 py-1 bg-emerald-100 rounded-md text-[10px] font-bold text-emerald-700">
                ✅ Já precificada
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Total Serviço (R$)">
              <input type="number" step="0.01" className={inp} value={totalServico}
                onChange={e => setTotalServico(Number(e.target.value))} />
            </Field>
            <Field label="Total Hora (R$)">
              <input type="number" step="0.01" className={inp} value={totalHora}
                onChange={e => setTotalHora(Number(e.target.value))} />
            </Field>
            <Field label="Valor Extra (R$)">
              <input type="number" step="0.01" className={inp} value={valorExtra}
                onChange={e => setValorExtra(Number(e.target.value))} />
            </Field>
            <Field label="Desconto (R$)">
              <input type="number" step="0.01" className={inp} value={desconto}
                onChange={e => setDesconto(Number(e.target.value))} />
            </Field>
          </div>

          {/* Total */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
            <span className="text-sm font-black text-emerald-800 uppercase tracking-wide">Valor Total</span>
            <span className={`text-xl font-black ${valorTotal >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {fmt(valorTotal)}
            </span>
          </div>

          <Field label="Observação">
            <textarea
              rows={2}
              className={`${inp} resize-none`}
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              placeholder="Observação da precificação..."
            />
          </Field>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
          <button onClick={handleClose} className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors uppercase tracking-wide">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-black uppercase tracking-wide rounded-xl flex items-center gap-2 transition-colors shadow-lg"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
            Salvar Precificação
          </button>
        </div>
      </div>
    </div>
  );
}
