// ─── Módulo 5 — Logística: Quadro de Veículos ────────────────────────────────

import React, { useMemo, useState } from 'react';
import { X, Truck, Search } from 'lucide-react';

// ─── Status ───────────────────────────────────────────────────────────────────
const STATUS_FILTER_OPTIONS = ['Todos', 'Manutenção', 'Disponível', 'Em uso'];

const STATUS_COLORS: Record<string, string> = {
  Manutencao: 'bg-red-500',
  Disponivel: 'bg-emerald-500',
  EmUso:      'bg-slate-400',
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface Props {
  /** data.Cliente, data.Data, data.EscalaVeiculos */
  data: { Cliente?: any; Data?: string; EscalaVeiculos?: any[] };
  modal: boolean;
  handleClose: () => void;
  veiculos: any[];
  escalas: any[];
  updateVeiculos: (selecionados: any[], context?: any) => void;
}

// ─── Status logic ─────────────────────────────────────────────────────────────
function calcularStatusVeiculos(veiculos: any[], escalas: any[], data: string) {
  return veiculos.map((v: any) => {
    const emManutencao = v.status === 'MANUTENCAO' || v.manutencao === true;

    const emUso = !emManutencao && (escalas || []).some((e: any) => {
      const dataEscala = (e.data ?? e.Data ?? '').split('T')[0];
      const dataAtualStr = (data ?? '').split('T')[0];
      if (!dataEscala || !dataAtualStr || dataEscala !== dataAtualStr) return false;
      return (e.veiculos ?? e.EscalaVeiculos ?? []).some(
        (ev: any) => (ev.veiculoId ?? ev.id) === v.id
      );
    });

    return {
      ...v,
      _status: emManutencao ? 'Manutencao' : emUso ? 'EmUso' : 'Disponivel',
      _selecionado: false,
      _manutencao: false,
    };
  });
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ModalVeiculos({
  data, modal, handleClose, veiculos, escalas, updateVeiculos,
}: Props) {
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('Todos');
  const [lista, setLista] = useState<any[]>([]);
  const [iniciado, setIniciado] = useState(false);

  React.useEffect(() => {
    if (!modal) { setIniciado(false); return; }
    const dataAtual = data?.Data ?? '';
    setLista(calcularStatusVeiculos(veiculos, escalas, dataAtual));
    setIniciado(true);
    setBusca('');
    setFiltroStatus('Todos');
  }, [modal, veiculos, escalas, data]);

  const filtrados = useMemo(() => {
    return lista.filter(v => {
      const desc = (v.descricao ?? v.Descricao ?? v.modelo ?? '').toLowerCase();
      const placa = (v.placa ?? v.Placa ?? '').toLowerCase();
      const buscaOk = !busca || desc.includes(busca.toLowerCase()) || placa.includes(busca.toLowerCase());
      const statusMap: Record<string, string> = {
        Manutenção: 'Manutencao', Disponível: 'Disponivel', 'Em uso': 'EmUso',
      };
      const filtroOk = filtroStatus === 'Todos' || v._status === (statusMap[filtroStatus] ?? filtroStatus);
      return buscaOk && filtroOk;
    });
  }, [lista, busca, filtroStatus]);

  const disponiveis   = filtrados.filter(v => v._status === 'Disponivel');
  const indisponiveis = filtrados.filter(v => v._status !== 'Disponivel');

  const toggleSelect = (id: string) =>
    setLista(prev => prev.map(v => v.id === id ? { ...v, _selecionado: !v._selecionado } : v));

  const updateManutencao = (id: string, val: boolean) =>
    setLista(prev => prev.map(v => v.id === id ? { ...v, _manutencao: val } : v));

  const handleConfirm = () => {
    const selecionados = lista.filter(v => v._selecionado);
    updateVeiculos(selecionados, data);
    handleClose();
  };

  const clienteNome = data?.Cliente?.RazaoSocial ?? data?.Cliente?.razaoSocial ?? '';
  const dataFormatada = data?.Data ? new Date(data.Data).toLocaleDateString('pt-BR') : '';

  const VeicCard = ({ v }: { v: any }) => (
    <div
      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
        v._selecionado ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
      onClick={() => toggleSelect(v.id)}
    >
      <input
        type="checkbox"
        checked={!!v._selecionado}
        onChange={() => toggleSelect(v.id)}
        className="w-3.5 h-3.5 accent-blue-600 cursor-pointer flex-shrink-0"
        onClick={e => e.stopPropagation()}
      />
      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_COLORS[v._status] ?? 'bg-slate-300'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-800 truncate">
          {v.descricao ?? v.Descricao ?? v.modelo} — {v.placa ?? v.Placa}
        </p>
        <p className="text-[10px] text-slate-400">{v.tipo ?? v.Tipo ?? ''}</p>
      </div>
      <select
        className="text-[10px] border border-slate-200 rounded px-1 py-0.5 outline-none flex-shrink-0"
        value={v._manutencao ? 'sim' : 'nao'}
        onClick={e => e.stopPropagation()}
        onChange={e => updateManutencao(v.id, e.target.value === 'sim')}
      >
        <option value="nao">Normal</option>
        <option value="sim">Manutenção</option>
      </select>
    </div>
  );

  if (!modal || !iniciado) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#1e3a5f] px-6 py-4 flex items-center justify-between text-white rounded-t-2xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <Truck className="w-5 h-5" />
            <div>
              <h2 className="font-black uppercase tracking-tight text-sm">Quadro de Veículos</h2>
              {(clienteNome || dataFormatada) && (
                <p className="text-[10px] text-blue-300 mt-0.5">
                  {clienteNome}{clienteNome && dataFormatada ? ': ' : ''}{dataFormatada}
                </p>
              )}
            </div>
          </div>
          <button onClick={handleClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filtros */}
        <div className="px-6 py-3 border-b border-slate-200 flex gap-3 items-center flex-shrink-0">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por descrição ou placa..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500"
            />
          </div>
          <select
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
            value={filtroStatus}
            onChange={e => setFiltroStatus(e.target.value)}
          >
            {STATUS_FILTER_OPTIONS.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>

        {/* Legenda */}
        <div className="px-6 py-2 flex gap-4 border-b border-slate-100 flex-shrink-0">
          {[
            { label: 'Manutenção', color: 'bg-red-500' },
            { label: 'Disponível', color: 'bg-emerald-500' },
            { label: 'Em uso',     color: 'bg-slate-400' },
          ].map(({ label, color }) => (
            <span key={label} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wide">
              <span className={`w-2 h-2 rounded-full ${color}`} />{label}
            </span>
          ))}
        </div>

        {/* Colunas */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-2">
                Disponíveis ({disponiveis.length})
              </p>
              {disponiveis.length === 0
                ? <p className="text-xs text-slate-400 italic">Nenhum disponível</p>
                : disponiveis.map(v => <VeicCard key={v.id} v={v} />)
              }
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-black text-red-700 uppercase tracking-widest mb-2">
                Em Uso / Manutenção ({indisponiveis.length})
              </p>
              {indisponiveis.length === 0
                ? <p className="text-xs text-slate-400 italic">Nenhum</p>
                : indisponiveis.map(v => <VeicCard key={v.id} v={v} />)
              }
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between rounded-b-2xl flex-shrink-0">
          <span className="text-xs text-slate-500 font-bold">
            {lista.filter(v => v._selecionado).length} selecionado(s)
          </span>
          <div className="flex gap-3">
            <button onClick={handleClose} className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 uppercase tracking-wide transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wide rounded-xl flex items-center gap-2 transition-colors shadow-md"
            >
              <Truck className="w-4 h-4" />
              Definir Veículos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
