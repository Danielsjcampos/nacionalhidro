import { useEffect, useState, useMemo } from 'react';
import { Loader2, Plus, ChevronRight, X, Eye } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';
import ModalCadastroEscalaLogistica from '../components/ModalCadastroEscalaLogistica';
import ModalCadastroOrdem from '../components/ModalCadastroOrdem';

type EscalaTab = 'abertas' | 'executadas' | 'canceladas';

const TABS: { id: EscalaTab; label: string; dot: string; statusMatch: number[] }[] = [
  { id: 'abertas',    label: 'Abertas',    dot: 'bg-[#0083ff]', statusMatch: [1] },
  { id: 'executadas', label: 'Executadas', dot: 'bg-[#06ad17]', statusMatch: [2] },
  { id: 'canceladas', label: 'Canceladas', dot: 'bg-[#E90000]', statusMatch: [0] },
];

const thCls = 'px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-white';
const tdCls = 'px-4 py-3 text-xs text-slate-700';

export default function EscalaLogistica() {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [escalas, setEscalas] = useState<any[]>([]);
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [veiculos, setVeiculos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [equipamentos, setEquipamentos] = useState<any[]>([]);
  const [ordens, setOrdens] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState<EscalaTab>('abertas');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<any>(null);

  // Ver OS em onlyView
  const [osModalOpen, setOsModalOpen] = useState(false);
  const [osData, setOsData] = useState<any>(null);

  const [filtroInicio, setFiltroInicio] = useState('');
  const [filtroFim, setFiltroFim] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [escRes, funcRes, veicRes, cliRes, equiRes, ordRes, empRes] = await Promise.all([
        api.get('/escala-logistica').catch(() => ({ data: [] })),
        api.get('/funcionarios').catch(() => ({ data: [] })),
        api.get('/logistica/veiculos').catch(() => ({ data: [] })),
        api.get('/clientes').catch(() => ({ data: [] })),
        api.get('/equipamentos').catch(() => ({ data: [] })),
        api.get('/os-logistica').catch(() => ({ data: [] })),
        api.get('/empresas').catch(() => ({ data: [] })),
      ]);
      setEscalas(Array.isArray(escRes.data) ? escRes.data : []);
      setFuncionarios(Array.isArray(funcRes.data) ? funcRes.data : []);
      setVeiculos(Array.isArray(veicRes.data) ? veicRes.data : []);
      setClientes(Array.isArray(cliRes.data) ? cliRes.data : (cliRes.data?.data ?? []));
      setEquipamentos(Array.isArray(equiRes.data) ? equiRes.data : []);
      setOrdens(Array.isArray(ordRes.data) ? ordRes.data : []);
      setEmpresas(Array.isArray(empRes.data) ? empRes.data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    const tab = TABS.find(t => t.id === activeTab);
    if (!tab) return [];
    return escalas.filter(e => {
      if (!tab.statusMatch.includes(e.status)) return false;
      if (filtroInicio && e.data && e.data < filtroInicio) return false;
      if (filtroFim && e.data && e.data > filtroFim) return false;
      return true;
    });
  }, [escalas, activeTab, filtroInicio, filtroFim]);

  const countFor = (ids: number[]) => escalas.filter(e => ids.includes(e.status)).length;

  const openNew = () => { setModalData(null); setModalOpen(true); };
  const openEdit = (e: any) => { setModalData(e); setModalOpen(true); };

  const handleSave = async (escala: any) => {
    try {
      if (escala.id) {
        await api.patch(`/escala-logistica/${escala.id}`, escala);
      } else {
        await api.post('/escala-logistica', escala);
      }
      showToast('Escala salva com sucesso!', 'success');
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Erro ao salvar escala.');
    }
  };

  const handleCancel = async (escala: any) => {
    const motivo = window.prompt('Motivo do cancelamento (obrigatório):');
    if (!motivo?.trim()) return;
    try {
      await api.patch(`/escala-logistica/${escala.id}`, { status: 0, motivoCancelamento: motivo });
      showToast('Escala cancelada.', 'success');
      fetchData();
    } catch { showToast('Erro ao cancelar escala.'); }
  };

  const verOS = (escala: any) => {
    const os = ordens.find(o => o.id === escala.ordemId || o.id === escala.OrdemId);
    if (os) { setOsData(os); setOsModalOpen(true); }
    else showToast('OS não encontrada.');
  };

  const nomeFunc = (id: string) => funcionarios.find((f: any) => f.id === id)?.nome ?? id;
  const placaVeic = (id: string) => veiculos.find((v: any) => v.id === id)?.placa ?? id;
  const nomeCliente = (id: string) => clientes.find((c: any) => c.id === id)?.razaoSocial ?? clientes.find((c: any) => c.id === id)?.nome ?? id;
  const nomeEquip = (id: string) => equipamentos.find((e: any) => e.id === id)?.nome ?? id;

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <>
      <div className="h-full flex flex-col gap-4">
        {/* Pipeline */}
        <div className="bg-[#1e3a5f] rounded-xl px-6 py-3 flex items-center gap-8">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex flex-col items-center gap-1 text-xs font-bold transition-all ${activeTab === t.id ? 'text-white' : 'text-blue-200 hover:text-white'}`}>
              <div className={`w-3 h-3 rounded-full ${t.dot} ${activeTab === t.id ? 'ring-2 ring-white ring-offset-1 ring-offset-[#1e3a5f]' : 'opacity-50'}`} />
              <span className="uppercase tracking-wide text-[11px]">{t.label}</span>
              <span className="text-[10px] text-blue-300">{countFor(t.statusMatch)}</span>
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <button onClick={openNew}
              className="bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Nova Escala
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-3 flex-wrap">
          <input type="date" value={filtroInicio} onChange={e => setFiltroInicio(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-400" />
          <input type="date" value={filtroFim} onChange={e => setFiltroFim(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-400" />
        </div>

        {/* Tabela */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-auto">
          <table className="w-full text-sm min-w-max">
            <thead>
              <tr className="bg-[#1e3a5f]">
                <th className={thCls}>Ações</th>
                <th className={thCls}>Data</th>
                <th className={thCls}>Hora</th>
                <th className={thCls}>Cliente</th>
                <th className={thCls}>Equipamento</th>
                <th className={thCls}>Empresa</th>
                <th className={thCls}>Veículos</th>
                <th className={thCls}>Funcionários</th>
                <th className={thCls}>Observações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="py-10 text-center text-slate-400 italic text-xs">Nenhuma escala encontrada.</td></tr>
              ) : filtered.map((esc: any) => {
                const funcs = (esc.funcionarios ?? esc.EscalaFuncionarios ?? [])
                  .map((f: any) => nomeFunc(f.funcionarioId ?? f.id)).join(', ') || '—';
                const veics = (esc.veiculos ?? esc.EscalaVeiculos ?? [])
                  .map((v: any) => placaVeic(v.veiculoId ?? v.id)).join(', ') || '—';

                return (
                  <tr key={esc.id} className="hover:bg-slate-50 transition-colors">
                    <td className={tdCls}>
                      <div className="flex items-center gap-1">
                        {activeTab === 'abertas' && (
                          <>
                            <button onClick={() => openEdit(esc)} title="Editar"
                              className="p-1.5 rounded border border-slate-200 hover:bg-blue-50 hover:border-blue-300 transition-colors">
                              <ChevronRight className="w-3.5 h-3.5 text-blue-500" />
                            </button>
                            <button onClick={() => handleCancel(esc)} title="Cancelar"
                              className="p-1.5 rounded border border-slate-200 hover:bg-red-50 hover:border-red-300 transition-colors">
                              <X className="w-3.5 h-3.5 text-red-500" />
                            </button>
                          </>
                        )}
                        {(esc.ordemId || esc.OrdemId) && (
                          <button onClick={() => verOS(esc)} title="Ver OS"
                            className="p-1.5 rounded border border-slate-200 hover:bg-slate-100 transition-colors">
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className={tdCls}>{esc.data ? new Date(esc.data).toLocaleDateString('pt-BR') : '—'}</td>
                    <td className={tdCls}>{esc.hora ?? '—'}</td>
                    <td className={tdCls}>{nomeCliente(esc.clienteId ?? esc.ClienteId)}</td>
                    <td className={tdCls}>{nomeEquip(esc.equipamentoId ?? esc.EquipamentoId)}</td>
                    <td className={tdCls}>{esc.empresaId ?? esc.EmpresaId ?? '—'}</td>
                    <td className={`${tdCls} max-w-[160px] truncate`}>{veics}</td>
                    <td className={`${tdCls} max-w-[200px] truncate`}>{funcs}</td>
                    <td className={`${tdCls} max-w-[160px] truncate`}>{esc.observacoes ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ModalCadastroEscalaLogistica
        modal={modalOpen}
        data={modalData}
        handleClose={() => setModalOpen(false)}
        save={handleSave}
        funcionarios={funcionarios}
        veiculos={veiculos}
        clientes={clientes}
        equipamentos={equipamentos}
        ordens={ordens}
        escalas={escalas}
        empresas={empresas}
      />

      {osModalOpen && (
        <ModalCadastroOrdem
          modal={osModalOpen}
          data={osData}
          handleClose={() => setOsModalOpen(false)}
          save={() => {}}
          onlyView={true}
          funcionarios={funcionarios}
          veiculos={veiculos}
          escalas={escalas}
        />
      )}
    </>
  );
}
