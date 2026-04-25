import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Loader2, AlertTriangle, ArrowRight } from 'lucide-react';
import api from '../services/api';

const STATUS_AGENDA = [
  { value:1, label:'Agendado',   color:'#ffb82b' },
  { value:2, label:'Confirmado', color:'#29C770' },
  { value:3, label:'Viagem',     color:'#3174ad' },
  { value:4, label:'Manutenção', color:'#EA5556' },
  { value:5, label:'Pré-Reserva',color:'#F97316' },
];

interface Props {
  isOpen: boolean;
  onClose: ()=>void;
  onSaved: ()=>void;
  initialData?: any;
  slotDate?: Date;
  equipamentoId?: string;
  options: { propostas:any[]; equipamentos:any[]; veiculos:any[]; };
}

const inp = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none';
const lbl = 'text-[10px] font-black text-slate-500 uppercase mb-1 block';

export default function ModalCadastroAgenda({ isOpen, onClose, onSaved, initialData, slotDate, equipamentoId, options }: Props) {
  const [form, setForm] = useState<any>({
    propostaId:'', dataInicio:'', dataFim:'', hora:'08:00',
    clienteId:'', clienteNome:'', equipamentoId: equipamentoId||'',
    veiculoId:'', statusInt:1, gerarEscala:false,
    nomeProspecto:'', telefoneProspecto:'', observacoes:'',
  });
  const [saving, setSaving]   = useState(false);
  const [deleting,setDeleting]= useState(false);
  const [veiculoAlerta, setVeiculoAlerta] = useState('');

  const isEdit = !!initialData?.id;

  useEffect(()=>{
    if (!isOpen) return;
    if (initialData) {
      setForm({
        propostaId:     initialData.propostaId||'',
        dataInicio:     initialData.dataInicio ? initialData.dataInicio.split('T')[0] : '',
        dataFim:        initialData.dataFim    ? initialData.dataFim.split('T')[0]    : '',
        hora:           initialData.hora||'08:00',
        clienteId:      initialData.clienteId||'',
        clienteNome:    initialData.cliente?.nome||'',
        equipamentoId:  initialData.equipamentoId||equipamentoId||'',
        veiculoId:      initialData.veiculoId||'',
        statusInt:      initialData.statusInt||1,
        gerarEscala:    initialData.gerarEscala||false,
        nomeProspecto:  initialData.nomeProspecto||'',
        telefoneProspecto: initialData.telefoneProspecto||'',
        observacoes:    initialData.observacoes||'',
      });
    } else {
      const d = slotDate ? slotDate.toISOString().split('T')[0] : '';
      setForm((p:any)=>({...p, dataInicio:d, dataFim:d, equipamentoId:equipamentoId||'', propostaId:'', veiculoId:'', statusInt:1, gerarEscala:false, nomeProspecto:'', telefoneProspecto:'', observacoes:'', hora:'08:00'}));
    }
    setVeiculoAlerta('');
  },[initialData, isOpen, slotDate, equipamentoId]);

  const handlePropostaChange = (pid: string) => {
    const prop = options.propostas.find((p:any)=>p.id===pid);
    setForm((f:any)=>({...f, propostaId:pid, clienteId:prop?.clienteId||'', clienteNome:prop?.cliente?.nome||''}));
  };

  const handleVeiculoChange = async (vid: string) => {
    setForm((f:any)=>({...f, veiculoId:vid}));
    if (!vid) { setVeiculoAlerta(''); return; }
    try {
      const res = await api.get(`/veiculos/${vid}/disponibilidade`, { params:{ data: form.dataInicio } }).catch(()=>null);
      if (res?.data?.disponivel === false) {
        setVeiculoAlerta(`⚠️ Veículo indisponível em ${form.dataInicio} — ${res.data.motivo||'já agendado'}`);
      } else { setVeiculoAlerta(''); }
    } catch { setVeiculoAlerta(''); }
  };

  const handleSave = async () => {
    if (!form.equipamentoId) { alert('Selecione o equipamento.'); return; }
    if (!form.dataInicio)    { alert('Informe a data.'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        dataInicio: new Date(`${form.dataInicio}T${form.hora||'08:00'}:00`).toISOString(),
        dataFim:    new Date(`${form.dataFim||form.dataInicio}T${form.hora||'08:00'}:00`).toISOString(),
      };
      if (isEdit) {
        await api.patch(`/agendamentos/${initialData.id}`, payload);
      } else {
        // For range: create one per day
        if (form.dataFim && form.dataFim !== form.dataInicio) {
          const start = new Date(form.dataInicio); const end = new Date(form.dataFim);
          for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
            const ds = d.toISOString().split('T')[0];
            await api.post('/agendamentos', {...payload, dataInicio: new Date(`${ds}T${form.hora}:00`).toISOString(), dataFim: new Date(`${ds}T${form.hora}:00`).toISOString() });
          }
        } else {
          await api.post('/agendamentos', payload);
        }
      }
      onSaved();
      onClose();
    } catch(e:any) { alert('Erro: '+(e.response?.data?.error||e.message)); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Confirma exclusão deste agendamento?')) return;
    setDeleting(true);
    try {
      await api.delete(`/agendamentos/${initialData.id}`);
      onSaved(); onClose();
    } catch(e:any) { alert('Erro ao excluir'); }
    finally { setDeleting(false); }
  };

  const handleConverterProposta = async () => {
    if (!window.confirm('Converter pré-reserva em proposta?')) return;
    try {
      const res = await api.post(`/agendamentos/${initialData.id}/converter-proposta`, {});
      alert('Proposta criada: ' + (res.data.codigo||''));
      onSaved(); onClose();
    } catch(e:any) { alert('Erro: '+(e.response?.data?.error||e.message)); }
  };

  if (!isOpen) return null;
  const isPreReserva = form.statusInt === 5;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b bg-slate-50 rounded-t-2xl">
          <h2 className="text-base font-black text-slate-800 uppercase tracking-tight">
            {isEdit ? 'Editar Agendamento' : 'Novo Agendamento'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-full"><X className="w-4 h-4 text-slate-400"/></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Proposta */}
          <div>
            <label className={lbl}>Proposta</label>
            <select value={form.propostaId} onChange={e=>handlePropostaChange(e.target.value)} disabled={isEdit} className={inp}>
              <option value="">Selecione...</option>
              {options.propostas.map((p:any)=><option key={p.id} value={p.id}>{p.codigo} — {p.cliente?.nome}</option>)}
            </select>
          </div>

          {/* Data(s) + Hora */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className={lbl}>{isEdit?'Data':'Data Início'}</label>
              <input type="date" value={form.dataInicio} onChange={e=>setForm((f:any)=>({...f,dataInicio:e.target.value,dataFim:e.target.value}))} className={inp}/>
            </div>
            {!isEdit && (
              <div className="col-span-1">
                <label className={lbl}>Data Fim</label>
                <input type="date" value={form.dataFim} onChange={e=>setForm((f:any)=>({...f,dataFim:e.target.value}))} min={form.dataInicio} className={inp}/>
              </div>
            )}
            <div className="col-span-1">
              <label className={lbl}>Hora</label>
              <input type="time" value={form.hora} onChange={e=>setForm((f:any)=>({...f,hora:e.target.value}))} className={inp}/>
            </div>
          </div>

          {/* Cliente */}
          <div>
            <label className={lbl}>Cliente</label>
            <input value={form.clienteNome||form.clienteId} readOnly disabled={isEdit || !!form.propostaId} placeholder="Preenchido pela proposta" className={`${inp} bg-slate-50 text-slate-500`}/>
          </div>

          {/* Equipamento */}
          <div>
            <label className={lbl}>Equipamento</label>
            <select value={form.equipamentoId} onChange={e=>setForm((f:any)=>({...f,equipamentoId:e.target.value}))} disabled className={`${inp} bg-slate-50`}>
              <option value="">Selecione...</option>
              {options.equipamentos.map((e:any)=><option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>

          {/* Veículo */}
          <div>
            <label className={lbl}>Veículo (Placa)</label>
            <select value={form.veiculoId} onChange={e=>handleVeiculoChange(e.target.value)} disabled={isEdit} className={inp}>
              <option value="">Sem veículo</option>
              {options.veiculos.map((v:any)=><option key={v.id} value={v.id}>{v.placa} — {v.modelo}</option>)}
            </select>
            {veiculoAlerta && (
              <div className="flex items-center gap-1.5 mt-1 text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                <AlertTriangle className="w-3 h-3 shrink-0"/>{veiculoAlerta}
              </div>
            )}
          </div>

          {/* Status */}
          <div>
            <label className={lbl}>Status</label>
            <div className="flex flex-wrap gap-2">
              {STATUS_AGENDA.map(s=>(
                <button key={s.value} type="button" onClick={()=>setForm((f:any)=>({...f,statusInt:s.value}))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${form.statusInt===s.value?'shadow-md scale-105':'opacity-50 hover:opacity-70'}`}
                  style={{ borderColor:s.color, background:form.statusInt===s.value?s.color+'22':'transparent', color:s.color }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Gerar Escala - só se Confirmado */}
          {form.statusInt === 2 && (
            <div className="flex items-center gap-3">
              <label className={lbl + ' mb-0'}>Gerar Escala</label>
              <button type="button" onClick={()=>setForm((f:any)=>({...f,gerarEscala:!f.gerarEscala}))}
                className={`w-12 h-6 rounded-full transition-colors ${form.gerarEscala?'bg-emerald-500':'bg-slate-200'}`}>
                <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${form.gerarEscala?'translate-x-6':''}`}/>
              </button>
            </div>
          )}

          {/* Pré-Reserva fields */}
          {isPreReserva && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-orange-50 border border-orange-200 rounded-xl">
              <div>
                <label className={lbl}>Nome Prospecto</label>
                <input value={form.nomeProspecto} onChange={e=>setForm((f:any)=>({...f,nomeProspecto:e.target.value}))} className={inp} placeholder="Nome..."/>
              </div>
              <div>
                <label className={lbl}>Telefone</label>
                <input value={form.telefoneProspecto} onChange={e=>setForm((f:any)=>({...f,telefoneProspecto:e.target.value}))} className={inp} placeholder="(11) 9..."/>
              </div>
            </div>
          )}

          {/* Observações */}
          <div>
            <label className={lbl}>Observações</label>
            <textarea value={form.observacoes} onChange={e=>setForm((f:any)=>({...f,observacoes:e.target.value}))} rows={3} className={`${inp} resize-none`} placeholder="Notas operacionais..."/>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-slate-50 rounded-b-2xl space-y-2">
          {isEdit && isPreReserva && (
            <button onClick={handleConverterProposta} className="w-full flex items-center justify-center gap-2 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-sm transition-all">
              <ArrowRight className="w-4 h-4"/> Converter em Proposta
            </button>
          )}
          <div className="flex gap-3">
            <button onClick={handleDelete} disabled={!isEdit||deleting}
              className="px-4 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-30 text-white font-bold text-sm rounded-xl transition-all flex items-center gap-1.5">
              {deleting?<Loader2 className="w-4 h-4 animate-spin"/>:<Trash2 className="w-4 h-4"/>} Deletar
            </button>
            <button onClick={onClose} className="px-4 py-2.5 border border-slate-200 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-50 transition-all">Cancelar</button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-sm rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2">
              {saving?<Loader2 className="w-4 h-4 animate-spin"/>:<Save className="w-4 h-4"/>} Salvar Agenda
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
