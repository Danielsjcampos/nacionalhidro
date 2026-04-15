import { useState } from 'react';
import { X, Clock, Calculator, CheckCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: BaixaLoteData) => void;
  osCount: number;
}

export interface BaixaLoteData {
  horaPadrao: string;
  horaEntrada: string;
  horaSaida: string;
  horaTolerancia: string;
  horaAlmoco: string;
  descontarAlmoco: boolean;
}

// Ported from legacy ModalCadastroOrdem.js:204-238
function calcularTempoTotal(data: BaixaLoteData) {
  const timeToMin = (t: string): number => {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const hpMin = timeToMin(data.horaPadrao);
  let entradaMin = timeToMin(data.horaEntrada);
  let saidaMin = timeToMin(data.horaSaida);
  const tolMin = timeToMin(data.horaTolerancia);
  const almMin = data.descontarAlmoco ? timeToMin(data.horaAlmoco) : 0;

  if (saidaMin < entradaMin) {
    saidaMin += 12 * 60;
    entradaMin -= 12 * 60;
  }

  const total = (saidaMin - entradaMin) - (almMin + tolMin);
  const horasTotais = Math.max(total, hpMin);
  const horasAdicionais = total > hpMin ? total - hpMin : 0;

  const minToStr = (mins: number) => {
    const h = Math.floor(Math.abs(mins) / 60);
    const m = Math.abs(mins) % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  return {
    horasTotais: minToStr(horasTotais),
    horasAdicionais: minToStr(horasAdicionais),
    totalMinutos: horasTotais,
    adicionalMinutos: horasAdicionais,
  };
}

export default function ModalBaixaLoteOS({ isOpen, onClose, onConfirm, osCount }: Props) {
  const [form, setForm] = useState<BaixaLoteData>({
    horaPadrao: '08:00',
    horaEntrada: '',
    horaSaida: '',
    horaTolerancia: '00:00',
    horaAlmoco: '01:00',
    descontarAlmoco: true,
  });

  const calculo = calcularTempoTotal(form);
  const isValid = form.horaEntrada && form.horaSaida;

  const handleSubmit = () => {
    if (!isValid) return;
    onConfirm(form);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-50">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Baixa em Lote</h2>
              <p className="text-sm text-slate-500">{osCount} ordem(ns) de servico selecionada(s)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-5">
          {/* Hora Padrao */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Hora Padrao (Contratual)</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="time"
                  value={form.horaPadrao}
                  onChange={e => setForm({ ...form, horaPadrao: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Tolerancia</label>
              <input
                type="time"
                value={form.horaTolerancia}
                onChange={e => setForm({ ...form, horaTolerancia: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200"
              />
            </div>
          </div>

          {/* Entrada / Saida */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Hora Entrada <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={form.horaEntrada}
                onChange={e => setForm({ ...form, horaEntrada: e.target.value })}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 ${
                  !form.horaEntrada ? 'border-red-200 focus:ring-red-200' : 'border-slate-200 focus:ring-teal-200'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Hora Saida <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={form.horaSaida}
                onChange={e => setForm({ ...form, horaSaida: e.target.value })}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 ${
                  !form.horaSaida ? 'border-red-200 focus:ring-red-200' : 'border-slate-200 focus:ring-teal-200'
                }`}
              />
            </div>
          </div>

          {/* Almoco */}
          <div className="grid grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Almoco</label>
              <input
                type="time"
                value={form.horaAlmoco}
                onChange={e => setForm({ ...form, horaAlmoco: e.target.value })}
                disabled={!form.descontarAlmoco}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200 disabled:opacity-50"
              />
            </div>
            <div className="flex items-center gap-3 pb-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.descontarAlmoco}
                  onChange={e => setForm({ ...form, descontarAlmoco: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-teal-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500"></div>
              </label>
              <span className="text-sm text-slate-600">Descontar almoco</span>
            </div>
          </div>

          {/* Resultado do Calculo */}
          {isValid && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-100">
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="w-4 h-4 text-teal-600" />
                <span className="text-sm font-semibold text-teal-700">Calculo Automatico</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-teal-600 mb-1">Horas Totais</div>
                  <div className="text-2xl font-bold text-teal-800">{calculo.horasTotais}</div>
                </div>
                <div>
                  <div className="text-xs text-teal-600 mb-1">Hora Adicional</div>
                  <div className={`text-2xl font-bold ${calculo.adicionalMinutos > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                    {calculo.horasAdicionais}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
          <span className="text-sm text-slate-500">
            Sera aplicado para <strong>{osCount}</strong> OS(s)
          </span>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2.5 text-sm text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition">
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isValid}
              className="px-5 py-2.5 text-sm text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Baixar {osCount} Ordem(ns)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
