import { useState, useEffect, useMemo } from 'react';
import { X, Search, Users, AlertTriangle, Check, Clock, UserX } from 'lucide-react';
import api from '../services/api';

interface FuncionarioQuadro {
  id: string;
  nome: string;
  cargo: string;
  status: 'DISPONIVEL' | 'ESCALADO' | 'AFASTADO' | 'FERIAS' | 'MANUTENCAO_DOC';
  escaladoPara?: string;
  motivoIndisponibilidade?: string;
  integracaoStatus?: string;
  asoStatus?: string;
  categoriaCNH?: string | null;
  mopp?: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selected: FuncionarioQuadro[]) => void;
  data: string; // ISO date
  clienteId?: string;
  selectedIds?: string[];
}

const STATUS_COLORS: Record<string, { bg: string; text: string; icon: any; label: string }> = {
  DISPONIVEL: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', icon: Check, label: 'Disponivel' },
  ESCALADO: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', icon: Clock, label: 'Em outra escala' },
  AFASTADO: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', icon: UserX, label: 'Afastado' },
  FERIAS: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', icon: UserX, label: 'Ferias' },
  MANUTENCAO_DOC: { bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700', icon: AlertTriangle, label: 'Pendencia Doc.' },
};

export default function ModalQuadroFuncionarios({ isOpen, onClose, onConfirm, data, clienteId, selectedIds = [] }: Props) {
  const [funcionarios, setFuncionarios] = useState<FuncionarioQuadro[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set(Array.isArray(selectedIds) ? selectedIds : []));
  const [filterStatus, setFilterStatus] = useState<string>('TODOS');

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    const params: any = { data };
    if (clienteId) params.clienteId = clienteId;

    api.get('/logistica/quadro-funcionarios', { params })
      .then(r => {
        setFuncionarios(r.data.funcionarios || []);
      })
      .catch(err => console.error('Quadro funcionarios error:', err))
      .finally(() => setLoading(false));
  }, [isOpen, data, clienteId]);

  useEffect(() => {
    setSelected(new Set(Array.isArray(selectedIds) ? selectedIds : []));
  }, [selectedIds]);

  const filtered = useMemo(() => {
    let list = funcionarios;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(f => f.nome.toLowerCase().includes(s) || f.cargo.toLowerCase().includes(s));
    }
    if (filterStatus !== 'TODOS') {
      list = list.filter(f => f.status === filterStatus);
    }
    return list;
  }, [funcionarios, search, filterStatus]);

  const summary = useMemo(() => ({
    total: funcionarios.length,
    disponiveis: funcionarios.filter(f => f.status === 'DISPONIVEL').length,
    escalados: funcionarios.filter(f => f.status === 'ESCALADO').length,
    indisponiveis: funcionarios.filter(f => ['AFASTADO', 'FERIAS', 'MANUTENCAO_DOC'].includes(f.status)).length,
  }), [funcionarios]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    const selectedFuncs = funcionarios.filter(f => selected.has(f.id));
    // Warn about unavailable ones
    const unavailable = selectedFuncs.filter(f => f.status !== 'DISPONIVEL');
    if (unavailable.length > 0) {
      const names = unavailable.map(f => `${f.nome} (${STATUS_COLORS[f.status]?.label})`).join(', ');
      if (!window.confirm(`Atenção: Os seguintes funcionários não estão totalmente disponíveis:\n\n${names}\n\nDeseja prosseguir mesmo assim?`)) {
        return;
      }
    }
    onConfirm(selectedFuncs);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-50">
              <Users className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Quadro de Funcionarios</h2>
              <p className="text-sm text-slate-500">
                {new Date(data).toLocaleDateString('pt-BR')} - {selected.size} selecionado(s)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-3 px-5 py-3 border-b border-slate-50">
          {[
            { label: 'Total', value: summary.total, color: 'text-slate-600', filter: 'TODOS' },
            { label: 'Disponiveis', value: summary.disponiveis, color: 'text-emerald-600', filter: 'DISPONIVEL' },
            { label: 'Escalados', value: summary.escalados, color: 'text-amber-600', filter: 'ESCALADO' },
            { label: 'Indisponiveis', value: summary.indisponiveis, color: 'text-red-600', filter: 'INDISPONIVEIS' },
          ].map(c => (
            <button
              key={c.label}
              onClick={() => setFilterStatus(c.filter === 'INDISPONIVEIS' ? 'AFASTADO' : c.filter)}
              className={`p-3 rounded-xl text-center transition hover:bg-slate-50 ${filterStatus === c.filter ? 'ring-2 ring-teal-300 bg-teal-50/50' : ''}`}
            >
              <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
              <div className="text-xs text-slate-500">{c.label}</div>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-slate-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou cargo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-300"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin w-8 h-8 border-2 border-teal-200 border-t-teal-600 rounded-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>Nenhum funcionario encontrado</p>
            </div>
          ) : (
            filtered.map(func => {
              const config = STATUS_COLORS[func.status] || STATUS_COLORS.DISPONIVEL;
              const Icon = config.icon;
              const isSelected = selected.has(func.id);

              return (
                <div
                  key={func.id}
                  onClick={() => toggleSelect(func.id)}
                  className={`flex items-center gap-4 p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-teal-300 bg-teal-50/60 ring-1 ring-teal-200'
                      : `${config.bg} hover:shadow-sm`
                  }`}
                >
                  {/* Checkbox */}
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition ${
                    isSelected ? 'bg-teal-500 border-teal-500' : 'border-slate-300'
                  }`}>
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800 text-sm truncate">{func.nome}</span>
                      {func.mopp && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-600 rounded">MOPP</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500">{func.cargo}</span>
                      {func.categoriaCNH && (
                        <span className="text-xs text-slate-400">CNH {func.categoriaCNH}</span>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Icon className={`w-4 h-4 ${config.text}`} />
                    <span className={`text-xs font-medium ${config.text}`}>{config.label}</span>
                  </div>

                  {/* Extra info */}
                  {func.escaladoPara && (
                    <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-1 rounded-lg shrink-0 max-w-[120px] truncate">
                      {func.escaladoPara}
                    </span>
                  )}
                  {func.motivoIndisponibilidade && func.status !== 'ESCALADO' && (
                    <span className="text-[11px] text-red-600 bg-red-50 px-2 py-1 rounded-lg shrink-0 max-w-[150px] truncate" title={func.motivoIndisponibilidade}>
                      {func.motivoIndisponibilidade}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
          <span className="text-sm text-slate-500">
            {selected.size} funcionario(s) selecionado(s)
          </span>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="px-5 py-2.5 text-sm text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition font-medium"
            >
              Confirmar Selecao
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
