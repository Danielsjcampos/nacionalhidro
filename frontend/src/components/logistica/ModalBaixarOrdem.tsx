// ─── Módulo 5 — Logística: Modal Baixa em Lote ───────────────────────────────

import React, { useEffect, useState } from 'react';
import { X, ArrowDownToLine, Clock } from 'lucide-react';
import { calcularTempoTotal } from '../../utils/logistica';

interface Props {
  modal: boolean;
  handleClose: () => void;
  save: (estado: any) => void;
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">{label}</label>
    {children}
  </div>
);

const inp     = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-blue-500 transition-colors bg-white';
const inpDis  = `${inp} bg-slate-50 text-slate-400 cursor-not-allowed`;

// ─── Component ────────────────────────────────────────────────────────────────
export default function ModalBaixarOrdem({ modal, handleClose, save }: Props) {
  const [estado, setEstado] = useState<any>({});

  // Resetar ao abrir
  useEffect(() => {
    if (modal) setEstado({});
  }, [modal]);

  const set = (field: string, value: any) =>
    setEstado((p: any) => ({ ...p, [field]: value }));

  const calcular = () => {
    if (!estado.HoraEntrada && !estado.HoraSaida) return;
    const result = calcularTempoTotal({
      horaPadrao:     estado.HoraPadrao     || '',
      horaEntrada:    estado.HoraEntrada    || '',
      horaSaida:      estado.HoraSaida      || '',
      horaAlmoco:     estado.HoraAlmoco     || '',
      horaTolerancia: estado.HoraTolerancia || '',
      descontarAlmoco: false,
    });
    setEstado((p: any) => ({ ...p, HoraTotal: result.horaTotal, HoraAdicional: result.horaAdicional }));
  };

  if (!modal) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-red-600 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <ArrowDownToLine className="w-5 h-5" />
            <h2 className="font-black uppercase tracking-tight text-base leading-none">Baixa em Lote</h2>
          </div>
          <button onClick={handleClose} className="p-1 hover:bg-red-700 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Mínimo de Horas">
              <input
                type="time"
                className={inp}
                value={estado.HoraPadrao || ''}
                onChange={e => set('HoraPadrao', e.target.value)}
                onBlur={calcular}
              />
            </Field>
            <Field label="Tolerância">
              <input
                type="time"
                className={inp}
                value={estado.HoraTolerancia || ''}
                onChange={e => set('HoraTolerancia', e.target.value)}
                onBlur={calcular}
              />
            </Field>
            <Field label="Hora Entrada">
              <input
                type="time"
                className={inp}
                value={estado.HoraEntrada || ''}
                onChange={e => set('HoraEntrada', e.target.value)}
                onBlur={calcular}
              />
            </Field>
            <Field label="Hora Saída">
              <input
                type="time"
                className={inp}
                value={estado.HoraSaida || ''}
                onChange={e => set('HoraSaida', e.target.value)}
                onBlur={calcular}
              />
            </Field>
            <Field label="Hora Almoço">
              <input
                type="time"
                className={inp}
                value={estado.HoraAlmoco || ''}
                onChange={e => set('HoraAlmoco', e.target.value)}
                onBlur={calcular}
              />
            </Field>
          </div>

          {/* Totais */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <Field label="Hora Total">
              <div className={`${inpDis} flex items-center gap-2`}>
                <Clock className="w-4 h-4 text-slate-400" />
                <span>{estado.HoraTotal || '--:--'}</span>
              </div>
            </Field>
            <Field label="Hora Adicional">
              <div className={`${inpDis} flex items-center gap-2`}>
                <Clock className="w-4 h-4 text-slate-400" />
                <span>{estado.HoraAdicional || '--:--'}</span>
              </div>
            </Field>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors uppercase tracking-wide"
          >
            Cancelar
          </button>
          <button
            onClick={() => save(estado)}
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
