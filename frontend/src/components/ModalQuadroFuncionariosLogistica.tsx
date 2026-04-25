import React, { useMemo, useState } from 'react';
import { X, Users, Search } from 'lucide-react';

// ─── Status bullet colors ────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  Afastado: 'bg-red-500',
  Escalado: 'bg-slate-400',
  Disponivel: 'bg-emerald-500',
  Integrado: 'bg-yellow-400',
  Vencido: 'bg-sky-400',
};

const STATUS_FILTER_OPTIONS = ['Todos', 'Afastado', 'Escalado', 'Disponível', 'Integrado', 'Int. Vencida'];

const STATUS_OPERACIONAL = [
  { value: 0, label: 'Nenhum' },
  { value: 1, label: 'Férias' },
  { value: 2, label: 'Atestado' },
  { value: 3, label: 'Pátio' },
  { value: 4, label: 'Banco de Horas' },
];

// ─── Types ───────────────────────────────────────────────────────────────────
interface Props {
  modal: boolean;
  handleClose: () => void;
  funcionarios: any[];
  escalas: any[];
  cliente: any;
  data: string; // ISO date
  updateFuncionarios: (integrados: any[], naoIntegrados: any[], escala?: any) => void;
  escala?: any;
}

// ─── Lógica de status ────────────────────────────────────────────────────────
function statusFuncionarios(funcionarios: any[], escalas: any[], cliente: any, dataAtual: string) {
  const hoje = new Date();
  const dataOS = dataAtual ? new Date(dataAtual) : hoje;

  return funcionarios.map((func: any) => {
    const result = {
      ...func,
      _status: 'Disponivel' as string,
      _motivo: '',
      _statusOperacao: 0,
      _selecionado: false,
    };

    // 1. Afastado
    if (func.motivoAfastamento && func.motivoAfastamento > 0) {
      const fimAfastamento = func.fimAfastamento ? new Date(func.fimAfastamento) : null;
      if (!fimAfastamento || fimAfastamento > hoje) {
        const labels = ['', 'Férias', 'Atestado', 'Pátio', 'Banco de Horas'];
        result._status = 'Afastado';
        result._motivo = labels[func.motivoAfastamento] ?? 'Afastado';
        result._statusOperacao = func.motivoAfastamento;
        return result;
      }
    }

    // 2. Escalado em outra escala na mesma data
    const escaladoEmOutro = (escalas || []).some((e: any) => {
      if (!e.data || !dataAtual) return false;
      const mesmaData = e.data.split('T')[0] === dataAtual.split('T')[0];
      const temFunc = (e.funcionarios || []).some(
        (f: any) => (f.funcionarioId ?? f.id) === func.id
      );
      return mesmaData && temFunc;
    });
    if (escaladoEmOutro) {
      result._status = 'Escalado';
      return result;
    }

    // 3. Integrado ou integração vencida
    const integracoes: any[] = cliente?.integracoes ?? cliente?.Integracoes ?? [];
    const integracao = integracoes.find((i: any) => {
      const fId = i.funcionarioId ?? i.FuncionarioId;
      return fId === func.id;
    });
    if (integracao) {
      const validade = new Date(integracao.dataVencimento ?? integracao.ValidadeIntegracao ?? 0);
      result._status = validade >= dataOS ? 'Integrado' : 'Vencido';
    }

    return result;
  });
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function ModalQuadroFuncionariosLogistica({
  modal, handleClose, funcionarios, escalas, cliente, data, updateFuncionarios, escala,
}: Props) {
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('Todos');
  const [lista, setLista] = useState<any[]>([]);
  const [iniciado, setIniciado] = useState(false);

  // Rebuild list when modal opens
  React.useEffect(() => {
    if (!modal) { setIniciado(false); return; }
    const processados = statusFuncionarios(funcionarios, escalas, cliente, data);
    setLista(processados.map(f => ({ ...f, _selecionado: false })));
    setIniciado(true);
    setBusca('');
    setFiltroStatus('Todos');
  }, [modal, funcionarios, escalas, cliente, data]);

  const filtrados = useMemo(() => {
    return lista.filter(f => {
      const nome = (f.nome ?? '').toLowerCase();
      const cargo = (f.cargo ?? '').toLowerCase();
      const buscaOk = !busca || nome.includes(busca.toLowerCase()) || cargo.includes(busca.toLowerCase());

      const statusMap: Record<string, string> = {
        'Afastado': 'Afastado', 'Escalado': 'Escalado', 'Disponível': 'Disponivel',
        'Integrado': 'Integrado', 'Int. Vencida': 'Vencido',
      };
      const filtroOk = filtroStatus === 'Todos' || f._status === (statusMap[filtroStatus] ?? filtroStatus);
      return buscaOk && filtroOk;
    });
  }, [lista, busca, filtroStatus]);

  const disponiveis = filtrados.filter(f => f._status === 'Disponivel' || f._status === 'Integrado' || f._status === 'Vencido');
  const indisponiveis = filtrados.filter(f => f._status === 'Afastado' || f._status === 'Escalado');

  const toggleSelect = (id: string) => {
    setLista(prev => prev.map(f => f.id === id ? { ...f, _selecionado: !f._selecionado } : f));
  };

  const updateStatus = (id: string, val: number) => {
    setLista(prev => prev.map(f => f.id === id ? { ...f, _statusOperacao: val } : f));
  };

  const handleConfirm = () => {
    const selecionados = lista.filter(f => f._selecionado);
    const integrados = selecionados.filter(f => f._status === 'Integrado');
    const naoIntegrados = selecionados.filter(f => f._status !== 'Integrado');
    updateFuncionarios(integrados, naoIntegrados, escala);
    handleClose();
  };

  const FuncCard = ({ func }: { func: any }) => (
    <div
      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
        func._selecionado ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
      onClick={() => toggleSelect(func.id)}
    >
      <input
        type="checkbox"
        checked={!!func._selecionado}
        onChange={() => toggleSelect(func.id)}
        className="w-3.5 h-3.5 accent-blue-600 cursor-pointer flex-shrink-0"
        onClick={e => e.stopPropagation()}
      />
      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_COLORS[func._status] ?? 'bg-slate-300'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-800 truncate">
          {func.nome}{func._motivo ? ` (${func._motivo})` : ''}
        </p>
        <p className="text-[10px] text-slate-500 truncate">{func.cargo}</p>
      </div>
      <select
        className="text-[10px] border border-slate-200 rounded px-1 py-0.5 outline-none flex-shrink-0"
        value={func._statusOperacao ?? 0}
        onClick={e => e.stopPropagation()}
        onChange={e => updateStatus(func.id, Number(e.target.value))}
      >
        {STATUS_OPERACIONAL.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
    </div>
  );

  if (!modal || !iniciado) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#1e3a5f] px-6 py-4 flex items-center justify-between text-white rounded-t-2xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5" />
            <div>
              <h2 className="font-black uppercase tracking-tight text-sm">Quadro de Funcionários</h2>
              {cliente && (
                <p className="text-[10px] text-blue-300 mt-0.5">
                  {cliente.razaoSocial ?? cliente.nome}
                  {data && ` — ${new Date(data).toLocaleDateString('pt-BR')}`}
                </p>
              )}
            </div>
          </div>
          <button onClick={handleClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filtros */}
        <div className="px-6 py-3 border-b border-slate-200 flex flex-wrap gap-3 items-center flex-shrink-0">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome ou cargo..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500"
              value={busca}
              onChange={e => setBusca(e.target.value)}
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
        <div className="px-6 py-2 flex gap-4 flex-wrap border-b border-slate-100 flex-shrink-0">
          {Object.entries(STATUS_COLORS).map(([label, color]) => (
            <span key={label} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wide">
              <span className={`w-2 h-2 rounded-full ${color}`} />
              {label === 'Vencido' ? 'Int. Vencida' : label}
            </span>
          ))}
        </div>

        {/* Colunas */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Disponíveis */}
            <div className="space-y-2">
              <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-2">
                Disponíveis ({disponiveis.length})
              </p>
              {disponiveis.length === 0
                ? <p className="text-xs text-slate-400 italic">Nenhum disponível</p>
                : disponiveis.map(f => <FuncCard key={f.id} func={f} />)
              }
            </div>
            {/* Indisponíveis */}
            <div className="space-y-2">
              <p className="text-[10px] font-black text-red-700 uppercase tracking-widest mb-2">
                Indisponíveis / Escalados ({indisponiveis.length})
              </p>
              {indisponiveis.length === 0
                ? <p className="text-xs text-slate-400 italic">Nenhum indisponível</p>
                : indisponiveis.map(f => <FuncCard key={f.id} func={f} />)
              }
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between rounded-b-2xl flex-shrink-0">
          <span className="text-xs text-slate-500 font-bold">
            {lista.filter(f => f._selecionado).length} selecionado(s)
          </span>
          <div className="flex gap-3">
            <button onClick={handleClose} className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 uppercase tracking-wide transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wide rounded-xl flex items-center gap-2 transition-colors shadow-md"
            >
              <Users className="w-4 h-4" />
              Definir Funcionários
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
