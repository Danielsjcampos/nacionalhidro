import React, { useState, useEffect } from 'react';
import { X, FileText, Send, ThumbsUp, ThumbsDown, Save, Printer, Ban, CheckCircle2, AlertTriangle, DollarSign, Clock, Mail } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';

interface Props {
  isOpen: boolean;
  medicaoId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

const fmt = (v: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('pt-BR') : '-';

type Tab = 'detalhes' | 'ordens' | 'faturamentos' | 'historico';

export default function ModalEdicaoMedicao({ isOpen, medicaoId, onClose, onSuccess }: Props) {
  const { showToast } = useToast();
  const [med, setMed] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>('detalhes');

  // Editable fields (only when EM_ABERTO)
  const [periodo, setPeriodo] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [porcentagemRL, setPorcentagemRL] = useState(90);
  const [cte, setCte] = useState(false);

  // Status change
  const [showStatusModal, setShowStatusModal] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');
  const [valorAprovado, setValorAprovado] = useState('');

  useEffect(() => {
    if (isOpen && medicaoId) fetchMedicao();
  }, [isOpen, medicaoId]);

  const fetchMedicao = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/medicoes/${medicaoId}`);
      setMed(data);
      setPeriodo(data.periodo || '');
      setObservacoes(data.observacoes || '');
      setPorcentagemRL(Number(data.porcentagemRL || 90));
      setCte(!!data.cte);
    } catch { showToast('Erro ao carregar medição', 'error'); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/medicoes/${medicaoId}`, { periodo, observacoes, porcentagemRL, cte });
      showToast('Medição atualizada', 'success');
      fetchMedicao();
      onSuccess();
    } catch (e: any) { showToast(e.response?.data?.error || 'Erro ao salvar', 'error'); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (newStatus: string) => {
    setSaving(true);
    try {
      const body: any = { status: newStatus };
      if (newStatus === 'REPROVADA' || newStatus === 'CONTESTADA') body.motivoContestacao = motivo;
      if (newStatus === 'CANCELADA') body.justificativaCancelamento = motivo;
      if (newStatus === 'APROVADA_PARCIAL') body.valorAprovado = Number(valorAprovado);
      await api.patch(`/medicoes/${medicaoId}/status`, body);
      showToast(`Status alterado para ${newStatus}`, 'success');
      setShowStatusModal(null);
      setMotivo('');
      fetchMedicao();
      onSuccess();
    } catch (e: any) { showToast(e.response?.data?.error || 'Erro', 'error'); }
    finally { setSaving(false); }
  };

  const handleEnviarCliente = async () => {
    setSaving(true);
    try {
      await api.post(`/medicoes/${medicaoId}/enviar`);
      showToast('Medição enviada ao cliente!', 'success');
      fetchMedicao();
      onSuccess();
    } catch (e: any) { showToast(e.response?.data?.error || 'Erro ao enviar', 'error'); }
    finally { setSaving(false); }
  };

  const handleGerarPdf = () => {
    window.open(`${api.defaults.baseURL}/medicoes/${medicaoId}/pdf`, '_blank');
  };

  if (!isOpen || !medicaoId) return null;

  const isEditable = med?.status === 'EM_ABERTO';
  const canSendToClient = med?.status === 'EM_CONFERENCIA';
  const canApprove = med?.status === 'AGUARDANDO_APROVACAO';

  const tabs: { key: Tab; label: string }[] = [
    { key: 'detalhes', label: 'Detalhes' },
    { key: 'ordens', label: `OS (${med?.ordensServico?.length || 0})` },
    { key: 'faturamentos', label: `Faturamentos (${med?.faturamentos?.length || 0})` },
    { key: 'historico', label: 'Histórico' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#f8fafc] w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-white/20">
        {/* HEADER */}
        <div className="bg-[#1e3a5f] p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-white/10">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight">
                {med?.codigo || 'Carregando...'}{med?.revisao > 0 ? `/R${med.revisao}` : ''}
              </h2>
              <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest">
                {med?.cliente?.nome || ''} • {med?.status?.replace(/_/g, ' ') || ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Action buttons */}
            {isEditable && (
              <button onClick={() => setShowStatusModal('EM_CONFERENCIA')} className="px-3 py-2 bg-fuchsia-500/20 hover:bg-fuchsia-500/30 text-fuchsia-300 rounded-lg text-[10px] font-black uppercase transition-all">
                <Send className="w-3.5 h-3.5 inline mr-1" />Conferência
              </button>
            )}
            {canSendToClient && (
              <button onClick={handleEnviarCliente} disabled={saving} className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg text-[10px] font-black uppercase transition-all">
                <Mail className="w-3.5 h-3.5 inline mr-1" />Enviar ao Cliente
              </button>
            )}
            {canApprove && (
              <>
                <button onClick={() => setShowStatusModal('APROVADA')} className="px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg text-[10px] font-black uppercase transition-all">
                  <ThumbsUp className="w-3.5 h-3.5 inline mr-1" />Aprovar
                </button>
                <button onClick={() => setShowStatusModal('APROVADA_PARCIAL')} className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-[10px] font-black uppercase transition-all">
                  <DollarSign className="w-3.5 h-3.5 inline mr-1" />Parcial
                </button>
                <button onClick={() => setShowStatusModal('REPROVADA')} className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-[10px] font-black uppercase transition-all">
                  <ThumbsDown className="w-3.5 h-3.5 inline mr-1" />Reprovar
                </button>
              </>
            )}
            <button onClick={handleGerarPdf} className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-black uppercase transition-all">
              <Printer className="w-3.5 h-3.5 inline mr-1" />PDF
            </button>
            {med?.status !== 'CANCELADA' && med?.status !== 'FINALIZADA' && (
              <button onClick={() => setShowStatusModal('CANCELADA')} className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded-lg text-[10px] font-black uppercase transition-all">
                <Ban className="w-3.5 h-3.5" />
              </button>
            )}
            <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-xl transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="flex border-b border-slate-200 bg-white px-6">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-5 py-3 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${tab === t.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-40"><div className="w-8 h-8 border-3 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" /></div>
          ) : !med ? (
            <p className="text-center text-slate-400 py-10">Medição não encontrada</p>
          ) : (
            <>
              {/* TAB: DETALHES */}
              {tab === 'detalhes' && (
                <div className="grid grid-cols-3 gap-6">
                  {/* Summary cards */}
                  <div className="col-span-2 space-y-6">
                    {med.motivoReprovacao && (
                      <div className="bg-red-50 p-4 rounded-2xl border border-red-200 flex gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-black text-red-800 uppercase">Motivo da Reprovação</p>
                          <p className="text-sm text-red-700 mt-1">{med.motivoReprovacao}</p>
                          {med.reprovadaEm && <p className="text-[10px] text-red-500 mt-1">Em {fmtDate(med.reprovadaEm)}</p>}
                        </div>
                      </div>
                    )}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Informações Gerais</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase">Período</label>
                          {isEditable ? (
                            <input value={periodo} onChange={e => setPeriodo(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm font-bold outline-none focus:border-blue-500" />
                          ) : <p className="text-sm font-bold text-slate-700">{med.periodo || '-'}</p>}
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase">Tipo Documento</label>
                          <p className="text-sm font-bold text-slate-700">{med.tipoDocumento || 'RL'}</p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase">Vendedor</label>
                          <p className="text-sm font-bold text-slate-700">{med.vendedor?.name || '-'}</p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase">Solicitante</label>
                          <p className="text-sm font-bold text-slate-700">{med.solicitante || '-'}</p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Observações</label>
                        {isEditable ? (
                          <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm font-bold outline-none focus:border-blue-500 resize-none" />
                        ) : <p className="text-sm text-slate-600">{med.observacoes || '-'}</p>}
                      </div>
                      {isEditable && (
                        <div className="flex items-center gap-4 pt-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase">CTe</span>
                            <button onClick={() => setCte(!cte)} className={`w-10 h-5 rounded-full relative transition-all ${cte ? 'bg-blue-600' : 'bg-slate-300'}`}>
                              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${cte ? 'left-5' : 'left-0.5'}`} />
                            </button>
                          </div>
                          {!cte && (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-slate-400 uppercase">RL %</span>
                              <input type="number" min={0} max={100} value={porcentagemRL} onChange={e => setPorcentagemRL(Number(e.target.value))} className="w-16 bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-sm font-bold text-center outline-none focus:border-blue-500" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {isEditable && (
                      <button onClick={handleSave} disabled={saving} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all flex items-center gap-2">
                        {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                        Salvar Alterações
                      </button>
                    )}
                  </div>
                  {/* Sidebar values */}
                  <div className="space-y-4">
                    <div className="bg-[#1e3a5f] rounded-2xl p-5 text-white space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-white/50 border-b border-white/10 pb-3">Resumo Financeiro</h4>
                      <div className="flex justify-between"><span className="text-xs text-white/60">Total Bruto</span><span className="text-lg font-black text-blue-400">{fmt(med.valorTotal)}</span></div>
                      <div className="flex justify-between"><span className="text-xs text-white/60">RL ({med.porcentagemRL || 90}%)</span><span className="font-bold text-emerald-300">{fmt(med.valorRL)}</span></div>
                      <div className="flex justify-between"><span className="text-xs text-white/60">NFS-e</span><span className="font-bold text-blue-300">{fmt(med.valorNFSe)}</span></div>
                      {med.valorAprovado && med.status !== 'EM_ABERTO' && (
                        <div className="flex justify-between border-t border-white/10 pt-3"><span className="text-xs text-white/60">Aprovado</span><span className="font-black text-amber-300">{fmt(med.valorAprovado)} ({Number(med.percentualAprovado || 0).toFixed(0)}%)</span></div>
                      )}
                    </div>
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-3">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Timeline</h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between"><span className="text-slate-400">Criada</span><span className="font-bold">{fmtDate(med.createdAt)}</span></div>
                        {med.dataAprovacaoInterna && <div className="flex justify-between"><span className="text-slate-400">Conferida</span><span className="font-bold">{fmtDate(med.dataAprovacaoInterna)}</span></div>}
                        {med.dataCobranca && <div className="flex justify-between"><span className="text-slate-400">Enviada</span><span className="font-bold">{fmtDate(med.dataCobranca)}</span></div>}
                        {med.aprovadaEm && <div className="flex justify-between"><span className="text-slate-400">Aprovada</span><span className="font-bold text-emerald-600">{fmtDate(med.aprovadaEm)}</span></div>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: ORDENS */}
              {tab === 'ordens' && (
                <div className="space-y-3">
                  {med.ordensServico?.length === 0 ? (
                    <p className="text-center text-slate-400 py-10 italic">Nenhuma OS vinculada</p>
                  ) : med.ordensServico?.map((os: any) => (
                    <div key={os.id} className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center"><FileText className="w-5 h-5 text-slate-400" /></div>
                        <div>
                          <p className="text-sm font-black text-slate-700">{os.codigo}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{os.status} • {os.tipoCobranca || '-'}</p>
                        </div>
                      </div>
                      <span className="text-sm font-black text-emerald-600">{fmt(os.valorPrecificado)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB: FATURAMENTOS */}
              {tab === 'faturamentos' && (
                <div className="space-y-3">
                  {(!med.faturamentos || med.faturamentos.length === 0) ? (
                    <p className="text-center text-slate-400 py-10 italic">Nenhum faturamento gerado ainda</p>
                  ) : med.faturamentos?.map((fat: any) => (
                    <div key={fat.id} className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${fat.tipo === 'RL' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                          <DollarSign className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-700">{fat.tipo} {fat.numero ? `#${fat.numero}` : ''}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{fat.status} • {fat.focusStatus || 'Pendente'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-700">{fmt(fat.valorBruto)}</p>
                        <p className="text-[10px] font-bold text-slate-400">Líq: {fmt(fat.valorLiquido)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB: HISTORICO */}
              {tab === 'historico' && (
                <div className="space-y-3">
                  {(!med.cobrancasEmail || med.cobrancasEmail.length === 0) ? (
                    <p className="text-center text-slate-400 py-10 italic">Nenhum registro de e-mail</p>
                  ) : med.cobrancasEmail?.map((email: any) => (
                    <div key={email.id} className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${email.statusEnvio === 'ENVIADO' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                        <Mail className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-slate-700 truncate">{email.assunto}</p>
                        <p className="text-[10px] text-slate-400">{email.destinatario} • {fmtDate(email.dataEnvio)}</p>
                      </div>
                      <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${email.statusEnvio === 'ENVIADO' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {email.statusEnvio}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* STATUS CHANGE MODAL */}
        {showStatusModal && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
              <h3 className="text-lg font-black text-slate-800">
                {showStatusModal === 'APROVADA' && 'Aprovar Medição'}
                {showStatusModal === 'APROVADA_PARCIAL' && 'Aprovação Parcial'}
                {showStatusModal === 'REPROVADA' && 'Reprovar Medição'}
                {showStatusModal === 'CANCELADA' && 'Cancelar Medição'}
                {showStatusModal === 'EM_CONFERENCIA' && 'Enviar para Conferência'}
              </h3>
              {(showStatusModal === 'REPROVADA' || showStatusModal === 'CANCELADA' || showStatusModal === 'CONTESTADA') && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Motivo / Justificativa *</label>
                  <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-blue-500 resize-none" placeholder="Descreva o motivo..." />
                </div>
              )}
              {showStatusModal === 'APROVADA_PARCIAL' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Valor Aprovado (R$)</label>
                  <input type="number" value={valorAprovado} onChange={e => setValorAprovado(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-blue-500" placeholder="0.00" />
                  <p className="text-[10px] text-slate-400">Total da medição: {fmt(med?.valorTotal)}</p>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => { setShowStatusModal(null); setMotivo(''); }} className="px-5 py-2.5 text-[10px] font-black uppercase text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
                  Cancelar
                </button>
                <button onClick={() => handleStatusChange(showStatusModal)} disabled={saving || ((showStatusModal === 'REPROVADA' || showStatusModal === 'CANCELADA') && !motivo)}
                  className="px-5 py-2.5 text-[10px] font-black uppercase text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 rounded-xl transition-all flex items-center gap-2">
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
