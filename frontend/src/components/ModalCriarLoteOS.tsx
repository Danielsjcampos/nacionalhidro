import React, { useState } from 'react';
import { X, Copy, Calendar, Loader2 } from 'lucide-react';
import { DIAS_SEMANA_OPTIONS } from '../utils/logistica';

interface Props {
  modal: boolean;
  handleClose: () => void;
  save: (payload: any) => Promise<void>;
  ordemBase: any; // OS template data inherited from the main modal
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">{label}</label>
    {children}
  </div>
);

const inp = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors bg-white';

export default function ModalCriarLoteOS({ modal, handleClose, save, ordemBase }: Props) {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [diasSemana, setDiasSemana] = useState<number[]>([1, 2, 3, 4, 5]); // Seg-Sex default
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  const toggleDia = (dia: number) => {
    setDiasSemana(prev =>
      prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia].sort()
    );
  };

  // Calculate preview count
  const previewCount = (() => {
    if (!dataInicio || !dataFim) return 0;
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    if (fim < inicio) return 0;
    let count = 0;
    for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
      if (diasSemana.length === 0 || diasSemana.includes(d.getDay())) count++;
    }
    return count;
  })();

  const handleSave = async () => {
    if (!dataInicio || !dataFim || previewCount === 0) return;
    setLoading(true);
    setResultado(null);
    try {
      await save({
        ...ordemBase,
        dataInicio,
        dataFim,
        diasSemana: diasSemana.length > 0 ? diasSemana : undefined,
      });
      setResultado({ success: true, count: previewCount });
    } catch (e: any) {
      setResultado({ success: false, error: e.response?.data?.error || e.message });
    } finally {
      setLoading(false);
    }
  };

  if (!modal) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[55] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-[#1e3a5f] px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <Copy className="w-5 h-5" />
            <div>
              <h2 className="font-black uppercase tracking-tight text-base leading-none">Criar OS em Lote</h2>
              <p className="text-[10px] text-blue-300 mt-0.5">
                Proposta: {ordemBase?.Codigo || ordemBase?.codigo || '—'}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Date range */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Data Início *">
              <input type="date" className={inp} value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
            </Field>
            <Field label="Data Fim *">
              <input type="date" className={inp} value={dataFim} onChange={e => setDataFim(e.target.value)} />
            </Field>
          </div>

          {/* Dias da semana chips */}
          <Field label="Dias da Semana">
            <div className="flex flex-wrap gap-2 mt-1">
              {DIAS_SEMANA_OPTIONS.map(d => (
                <button
                  key={d.value}
                  onClick={() => toggleDia(d.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                    diasSemana.includes(d.value)
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'
                  }`}
                >
                  {d.label.substring(0, 3)}
                </button>
              ))}
            </div>
          </Field>

          {/* Preview */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <Calendar className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-sm font-black text-slate-700">
                {previewCount > 0 ? `${previewCount} OS serão criadas` : 'Selecione as datas'}
              </p>
              <p className="text-[10px] text-slate-400">
                {diasSemana.length > 0
                  ? `Dias: ${diasSemana.map(d => DIAS_SEMANA_OPTIONS[d]?.label.substring(0, 3)).join(', ')}`
                  : 'Todos os dias'}
              </p>
            </div>
          </div>

          {/* Result */}
          {resultado && (
            <div className={`p-3 rounded-lg text-xs font-bold ${
              resultado.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {resultado.success
                ? `✅ ${resultado.count} OS criadas com sucesso!`
                : `❌ Erro: ${resultado.error}`}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
          <button onClick={handleClose} className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors uppercase tracking-wide">
            {resultado?.success ? 'Fechar' : 'Cancelar'}
          </button>
          {!resultado?.success && (
            <button
              onClick={handleSave}
              disabled={loading || previewCount === 0}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-black uppercase tracking-wide rounded-xl flex items-center gap-2 transition-colors shadow-lg"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
              Criar {previewCount} OS
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
