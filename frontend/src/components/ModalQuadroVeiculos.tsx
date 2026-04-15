import { useState, useEffect, useMemo } from 'react';
import { X, Search, Truck, Check, AlertTriangle, Wrench, Fuel } from 'lucide-react';
import api from '../services/api';

interface VeiculoQuadro {
  id: string;
  placa: string;
  modelo: string;
  marca?: string | null;
  tipo: string;
  tipoEquipamento?: string | null;
  status: 'DISPONIVEL' | 'ESCALADO' | 'MANUTENCAO';
  escaladoPara?: string;
  kmAtual: number;
  nivelCombustivel: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selected: VeiculoQuadro[]) => void;
  data: string;
  selectedIds?: string[];
}

const STATUS_COLORS: Record<string, { bg: string; text: string; icon: any; label: string }> = {
  DISPONIVEL: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', icon: Check, label: 'Disponivel' },
  ESCALADO: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', icon: Truck, label: 'Escalado' },
  MANUTENCAO: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', icon: Wrench, label: 'Manutencao' },
};

export default function ModalQuadroVeiculos({ isOpen, onClose, onConfirm, data, selectedIds = [] }: Props) {
  const [veiculos, setVeiculos] = useState<VeiculoQuadro[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedIds));
  const [filterStatus, setFilterStatus] = useState<string>('TODOS');

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    api.get('/logistica/quadro-veiculos', { params: { data } })
      .then(r => setVeiculos(r.data.veiculos || []))
      .catch(err => console.error('Quadro veiculos error:', err))
      .finally(() => setLoading(false));
  }, [isOpen, data]);

  useEffect(() => {
    setSelected(new Set(selectedIds));
  }, [selectedIds]);

  const filtered = useMemo(() => {
    let list = veiculos;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(v => v.placa.toLowerCase().includes(s) || v.modelo.toLowerCase().includes(s));
    }
    if (filterStatus !== 'TODOS') {
      list = list.filter(v => v.status === filterStatus);
    }
    return list;
  }, [veiculos, search, filterStatus]);

  const summary = useMemo(() => ({
    total: veiculos.length,
    disponiveis: veiculos.filter(v => v.status === 'DISPONIVEL').length,
    escalados: veiculos.filter(v => v.status === 'ESCALADO').length,
    manutencao: veiculos.filter(v => v.status === 'MANUTENCAO').length,
  }), [veiculos]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    const selectedVeics = veiculos.filter(v => selected.has(v.id));
    const emManut = selectedVeics.filter(v => v.status === 'MANUTENCAO');
    if (emManut.length > 0) {
      if (!window.confirm(`Atenção: ${emManut.length} veículo(s) em MANUTENÇÃO selecionado(s):\n\n${emManut.map(v => v.placa).join(', ')}\n\nDeseja prosseguir?`)) {
        return;
      }
    }
    onConfirm(selectedVeics);
    onClose();
  };

  if (!isOpen) return null;

  const fuelColor = (level: number) => {
    if (level >= 60) return 'text-emerald-500';
    if (level >= 30) return 'text-amber-500';
    return 'text-red-500';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50">
              <Truck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Quadro de Veiculos</h2>
              <p className="text-sm text-slate-500">
                {new Date(data).toLocaleDateString('pt-BR')} - {selected.size} selecionado(s)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-4 gap-3 px-5 py-3 border-b border-slate-50">
          {[
            { label: 'Total', value: summary.total, color: 'text-slate-600', filter: 'TODOS' },
            { label: 'Disponiveis', value: summary.disponiveis, color: 'text-emerald-600', filter: 'DISPONIVEL' },
            { label: 'Escalados', value: summary.escalados, color: 'text-amber-600', filter: 'ESCALADO' },
            { label: 'Manutencao', value: summary.manutencao, color: 'text-red-600', filter: 'MANUTENCAO' },
          ].map(c => (
            <button
              key={c.label}
              onClick={() => setFilterStatus(c.filter)}
              className={`p-3 rounded-xl text-center transition hover:bg-slate-50 ${filterStatus === c.filter ? 'ring-2 ring-blue-300 bg-blue-50/50' : ''}`}
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
              placeholder="Buscar por placa ou modelo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Truck className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>Nenhum veiculo encontrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filtered.map(v => {
                const config = STATUS_COLORS[v.status] || STATUS_COLORS.DISPONIVEL;
                const Icon = config.icon;
                const isSelected = selected.has(v.id);

                return (
                  <div
                    key={v.id}
                    onClick={() => toggleSelect(v.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-400 bg-blue-50/60 ring-1 ring-blue-200 shadow-sm'
                        : `${config.bg} hover:shadow-sm`
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-bold text-slate-800 text-base tracking-wider">{v.placa}</div>
                        <div className="text-xs text-slate-500">{v.modelo}</div>
                      </div>
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                        isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-300'
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      <Icon className={`w-3.5 h-3.5 ${config.text}`} />
                      <span className={`text-xs font-medium ${config.text}`}>{config.label}</span>
                    </div>

                    {v.escaladoPara && (
                      <div className="text-[11px] text-amber-600 mt-1 truncate">
                        → {v.escaladoPara}
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-3 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <span>{(v.kmAtual || 0).toLocaleString()} km</span>
                      </div>
                      <div className={`flex items-center gap-1 text-xs ${fuelColor(v.nivelCombustivel)}`}>
                        <Fuel className="w-3 h-3" />
                        <span>{v.nivelCombustivel}%</span>
                      </div>
                      {v.tipoEquipamento && (
                        <span className="text-[10px] text-slate-400 ml-auto">{v.tipoEquipamento}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
          <span className="text-sm text-slate-500">{selected.size} veiculo(s) selecionado(s)</span>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2.5 text-sm text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition">
              Cancelar
            </button>
            <button onClick={handleConfirm} className="px-5 py-2.5 text-sm text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition font-medium">
              Confirmar Selecao
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
