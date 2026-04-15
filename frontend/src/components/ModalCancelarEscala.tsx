import { useState } from 'react';
import { X, Ban } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (motivo: string) => void;
  escalaInfo?: string;
}

export default function ModalCancelarEscala({ isOpen, onClose, onConfirm, escalaInfo }: Props) {
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!motivo || motivo.trim().length < 3) {
      setError('Informe o motivo do cancelamento (minimo 3 caracteres).');
      return;
    }
    onConfirm(motivo.trim());
    setMotivo('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-50">
              <Ban className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Cancelar Escala</h2>
              {escalaInfo && <p className="text-sm text-slate-500">{escalaInfo}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
            <p className="text-sm text-amber-700">
              <strong>Atenção:</strong> Esta acao nao pode ser desfeita. A escala sera marcada como cancelada e o motivo ficara registrado no historico.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Motivo do Cancelamento <span className="text-red-500">*</span>
            </label>
            <textarea
              value={motivo}
              onChange={e => { setMotivo(e.target.value); setError(''); }}
              rows={3}
              placeholder="Ex: Cliente solicitou reagendamento, falta de equipamento..."
              className={`w-full px-4 py-3 rounded-xl border text-sm resize-none focus:outline-none focus:ring-2 ${
                error ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-teal-200 focus:border-teal-300'
              }`}
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>

          {/* Quick select */}
          <div className="flex flex-wrap gap-2">
            {['Chuva/Clima', 'Cliente cancelou', 'Falta de equipe', 'Veiculo em manutencao', 'Reagendamento'].map(opt => (
              <button
                key={opt}
                onClick={() => { setMotivo(opt); setError(''); }}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
          <button onClick={onClose} className="px-5 py-2.5 text-sm text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition">
            Voltar
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2.5 text-sm text-white bg-red-600 rounded-xl hover:bg-red-700 transition font-medium"
          >
            Confirmar Cancelamento
          </button>
        </div>
      </div>
    </div>
  );
}
