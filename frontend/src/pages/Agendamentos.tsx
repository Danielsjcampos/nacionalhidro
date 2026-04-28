import { useToast } from '../contexts/ToastContext';
import { useEffect, useState, useCallback, useMemo } from 'react';
import api from '../services/api';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { Loader2, RefreshCw } from 'lucide-react';
import ModalCadastroAgenda from '../components/ModalCadastroAgenda';

moment.locale('pt-BR');
const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop(Calendar as any);

const STATUS_COLORS: Record<number,string> = {
  1:'#ffb82b', 2:'#29C770', 3:'#3174ad', 4:'#EA5556', 5:'#F97316',
};
const STATUS_LABEL: Record<number,string> = {
  1:'Agendado', 2:'Confirmado', 3:'Viagem', 4:'Manutenção', 5:'Pré-Reserva',
};

const anoAtual = new Date().getFullYear();
const ANOS = Array.from({length:6},(_,i)=>anoAtual-2+i);

const MSGS = {
  today:'Hoje', previous:'‹', next:'›', month:'Mês', week:'Semana',
  day:'Dia', agenda:'Agenda', date:'Data', time:'Hora', event:'Evento',
  noEventsInRange:'Nenhum agendamento neste período.',
  showMore:(n:number)=>`+${n} mais`,
};

export default function Agendamentos() {
  const { showToast } = useToast();
  const [events,     setEvents]     = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [anoFiltro,  setAnoFiltro]  = useState(anoAtual);
  const [equipFiltro,setEquipFiltro]= useState('');
  const [veicFiltro, setVeicFiltro] = useState('');
  const [view,       setView]       = useState<any>(Views.MONTH);
  const [date,       setDate]       = useState(new Date());

  // Modal state
  const [modalOpen,     setModalOpen]     = useState(false);
  const [selectedEvt,   setSelectedEvt]   = useState<any>(null);
  const [slotDate,      setSlotDate]      = useState<Date|undefined>();

  // Options
  const [propostas,    setPropostas]    = useState<any[]>([]);
  const [equipamentos, setEquipamentos] = useState<any[]>([]);
  const [veiculos,     setVeiculos]     = useState<any[]>([]);

  const fetchOptions = async () => {
    const safe = async (p:Promise<any>, fb:any[]=[]) => { try{const r=await p; return r.data||fb;}catch{return fb;} };
    const [pr,eq,ve] = await Promise.all([
      safe(api.get('/propostas?limit=200&status=ACEITA')),
      safe(api.get('/equipamentos')),
      safe(api.get('/logistica/veiculos')),
    ]);
    setPropostas(Array.isArray(pr)?pr:pr.data||[]);
    setEquipamentos(eq);
    setVeiculos(ve);
  };

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { ano: anoFiltro };
      if (equipFiltro) params.equipamentoId = equipFiltro;
      if (veicFiltro)  params.veiculoId     = veicFiltro;
      const res = await api.get('/agendamentos', { params });
      const raw: any[] = res.data?.data || res.data || [];
      setEvents(raw.map(ag => {
        const start = new Date(ag.dataInicio||ag.dataViagem||ag.createdAt);
        const end   = ag.dataFim ? new Date(ag.dataFim) : new Date(start.getTime()+3600000);
        const placa = ag.veiculo?.placa || '';
        const nomeCliente = ag.cliente?.razaoSocial || ag.cliente?.nome || ag.clienteNome || '';
        let title = '';
        if (ag.statusInt===3) title = `${placa} - VIAGEM`;
        else if (ag.statusInt===4) title = `${placa} - MANUTENÇÃO`;
        else title = `${placa}${placa?'  - ':''}${nomeCliente}`;
        return { id:ag.id, title:title||'Agendamento', start, end, resource:ag,
          color: STATUS_COLORS[ag.statusInt||1]||'#94a3b8' };
      }));
    } catch(e:any) {
      showToast('Erro ao carregar agendamentos');
    } finally { setLoading(false); }
  }, [anoFiltro, equipFiltro, veicFiltro]);

  useEffect(()=>{ fetchOptions(); }, []);
  useEffect(()=>{ fetchEvents(); }, [fetchEvents]);

  const handleEventDrop = async ({ event, start }: any) => {
    try {
      await api.patch(`/agendamentos/${event.id}`, {
        dataInicio: new Date(start).toISOString(),
        dataFim:    new Date(start.getTime()+(event.end-event.start)).toISOString(),
      });
      fetchEvents();
    } catch { showToast('Erro ao mover agendamento'); }
  };

  const handleSelectEvent = (evt: any) => {
    setSelectedEvt(evt.resource);
    setSlotDate(undefined);
    setModalOpen(true);
  };

  const handleSelectSlot = ({ start }: any) => {
    if (!equipFiltro) { showToast('Selecione um equipamento antes de criar um agendamento.'); return; }
    setSelectedEvt(null);
    setSlotDate(start);
    setModalOpen(true);
  };

  const eventStyleGetter = (event: any) => ({
    style: { background:event.color, borderRadius:'6px', border:'none',
      color:'#fff', fontSize:'11px', fontWeight:700, padding:'2px 6px' }
  });

  const legendItems = useMemo(()=>Object.entries(STATUS_LABEL).map(([k,v])=>({
    value:+k, label:v, color:STATUS_COLORS[+k]
  })),[]);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-400">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Agendamentos</h1>
          <p className="text-sm text-slate-500">Calendário de operações e equipamentos</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-end gap-4">
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block">Ano</label>
          <select value={anoFiltro} onChange={e=>setAnoFiltro(+e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20">
            {ANOS.map(a=><option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-40">
          <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block">Equipamento</label>
          <select value={equipFiltro} onChange={e=>setEquipFiltro(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value="">TODOS</option>
            {equipamentos.map((e:any)=><option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-40">
          <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block">Veículo (Placa)</label>
          <select value={veicFiltro} onChange={e=>setVeicFiltro(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value="">Todos</option>
            {veiculos.map((v:any)=><option key={v.id} value={v.id}>{v.placa}</option>)}
          </select>
        </div>
        <button onClick={fetchEvents} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition-all shadow-sm">
          <RefreshCw className="w-4 h-4"/> Atualizar
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {legendItems.map(l=>(
          <div key={l.value} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{background:l.color}}/>
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">{l.label}</span>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" style={{minHeight:580}}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600"/>
          </div>
        )}
        <div className="p-2" style={{height:600}}>
          <DnDCalendar
            localizer={localizer}
            events={events}
            view={view}
            date={date}
            onView={setView}
            onNavigate={setDate}
            onEventDrop={handleEventDrop}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            selectable
            resizable={false}
            eventPropGetter={eventStyleGetter}
            messages={MSGS as any}
            popup
            style={{height:'100%'}}
          />
        </div>
      </div>

      {/* Modal */}
      <ModalCadastroAgenda
        isOpen={modalOpen}
        onClose={()=>{ setModalOpen(false); setSelectedEvt(null); }}
        onSaved={fetchEvents}
        initialData={selectedEvt}
        slotDate={slotDate}
        equipamentoId={equipFiltro||undefined}
        options={{ propostas, equipamentos, veiculos }}
      />
    </div>
  );
}
