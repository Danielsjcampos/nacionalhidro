import React, { useEffect, useState } from 'react';
import { X, ArrowDownToLine, Clock } from 'lucide-react';
import { calcularTempoTotal, TIPO_COBRANCA } from '../utils/logistica';

interface ModalBaixarOrdemProps {
  modal: boolean;
  handleClose: () => void;
  save: (ordem: any) => void;
  tipoCobranca?: number;
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">{label}</label>
    {children}
  </div>
);

const timeInput = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-blue-500 transition-colors bg-white";
const timeInputDisabled = `${timeInput} bg-slate-50 text-slate-400 cursor-not-allowed`;

export default function ModalBaixarOrdem({ modal, handleClose, save, tipoCobranca }: ModalBaixarOrdemProps) {
  const [ordem, setOrdem] = useState<any>({});

  useEffect(() => {
    if (modal) setOrdem({});
  }, [modal]);

  const set = (field: string, value: any) => setOrdem((p: any) => ({ ...p, [field]: value }));

  const calcular = () => {
    if (!ordem.HoraEntrada && !ordem.HoraSaida) return;
    const result = calcularTempoTotal({
      horaPadrao: ordem.HoraPadrao || '',
      horaEntrada: ordem.HoraEntrada || '',
      horaSaida: ordem.HoraSaida || '',
      horaAlmoco: ordem.HoraAlmoco || '',
      horaTolerancia: ordem.HoraTolerancia || '',
      descontarAlmoco: false,
    });
    setOrdem((p: any) => ({ ...p, HoraTotal: result.horaTotal, HoraAdicional: result.horaAdicional }));
  };

  const tipoLabel = TIPO_COBRANCA.find(t => t.value === tipoCobranca)?.label;

  if (!modal) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-red-600 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <ArrowDownToLine className="w-5 h-5" />
            <div>
              <h2 className="font-black uppercase tracking-tight text-base leading-none">Baixa em Lote</h2>
              {tipoLabel && <p className="text-[10px] text-red-200 mt-0.5">{tipoLabel}</p>}
            </div>
          </div>
          <button onClick={handleClose} className="p-1 hover:bg-red-700 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label={tipoCobranca === 3 ? 'Tolerância' : 'Mínimo de Horas'}>
              <input type="time" className={timeInput} value={ordem.HoraPadrao || ''} onChange={e => set('HoraPadrao', e.target.value)} onBlur={calcular} />
            </Field>
            <Field label="Tolerância">
              <input type="time" className={timeInput} value={ordem.HoraTolerancia || ''} onChange={e => set('HoraTolerancia', e.target.value)} onBlur={calcular} />
            </Field>
            <Field label="Hora Entrada">
              <input type="time" className={timeInput} value={ordem.HoraEntrada || ''} onChange={e => set('HoraEntrada', e.target.value)} onBlur={calcular} />
            </Field>
            <Field label="Hora Saída">
              <input type="time" className={timeInput} value={ordem.HoraSaida || ''} onChange={e => set('HoraSaida', e.target.value)} onBlur={calcular} />
            </Field>
            <Field label="Hora Almoço">
              <input type="time" className={timeInput} value={ordem.HoraAlmoco || ''} onChange={e => set('HoraAlmoco', e.target.value)} onBlur={calcular} />
            </Field>
          </div>

          {/* Totais */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <Field label="Hora Total">
              <div className={`${timeInputDisabled} flex items-center gap-2`}>
                <Clock className="w-4 h-4 text-slate-400" />
                <span>{ordem.HoraTotal || '--:--'}</span>
              </div>
            </Field>
            <Field label="Hora Adicional">
              <div className={`${timeInputDisabled} flex items-center gap-2`}>
                <Clock className="w-4 h-4 text-slate-400" />
                <span>{ordem.HoraAdicional || '--:--'}</span>
              </div>
            </Field>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
          <button onClick={handleClose} className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors uppercase tracking-wide">
            Cancelar
          </button>
          <button
            onClick={() => save(ordem)}
            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wide rounded-xl flex items-center gap-2 transition-colors shadow-lg"
          >
            <ArrowDownToLine className="w-4 h-4" />
            Baixar Ordens
          </button>
        </div>
      </div>
    </div>
  );
}
