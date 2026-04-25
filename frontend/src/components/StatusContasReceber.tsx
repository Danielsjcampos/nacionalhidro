const PIPELINE = [
  { key: 'CADASTRO', label: 'Cadastro', color: '#FC986B' },
  { key: 'RECEBER', label: 'Receber', color: '#FFFB84' },
  { key: 'RECEBIDOS', label: 'Recebidos', color: '#10FF50' },
  { key: 'CANCELADOS', label: 'Cancelados', color: '#E90000' },
];

interface Props {
  activeStep: string;
  onChange: (step: string) => void;
  counts?: Record<string, number>;
}

export default function StatusContasReceber({ activeStep, onChange, counts }: Props) {
  return (
    <div className="flex items-center gap-3">
      {PIPELINE.map((step, idx) => {
        const isActive = activeStep === step.key;
        const count = counts?.[step.key] ?? 0;

        return (
          <div key={step.key} className="flex items-center gap-3">
            {idx > 0 && (
              <div className="w-8 h-0.5 bg-slate-200 rounded-full" />
            )}
            <button
              onClick={() => onChange(step.key)}
              className={`flex flex-col items-center gap-1.5 transition-all duration-200 group ${
                isActive ? 'scale-105' : 'opacity-70 hover:opacity-100'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-black shadow-lg transition-all duration-200 ${
                  isActive ? 'ring-4 ring-offset-2' : 'hover:ring-2 hover:ring-offset-1'
                }`}
                style={{
                  backgroundColor: step.color,
                  color: step.color === '#FFFB84' || step.color === '#10FF50' ? '#333' : '#fff',
                }}
              >
                {count}
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wide ${
                isActive ? 'text-slate-800' : 'text-slate-400'
              }`}>
                {step.label}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
