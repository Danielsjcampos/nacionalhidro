import React, { useState, useEffect } from 'react';
import { X, Loader2, Send, Megaphone, CheckCircle, Info } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';
import moment from 'moment';

interface ModalDisparoEquipeProps {
  proposta: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ModalDisparoEquipe({ proposta, onClose, onSuccess }: ModalDisparoEquipeProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Fields for the dispatch message
  const [acesso, setAcesso] = useState(moment().format('YYYY-MM-DD'));
  const [inicio, setInicio] = useState(moment().format('YYYY-MM-DD'));
  const [termino, setTermino] = useState(moment().add(7, 'days').format('YYYY-MM-DD'));
  const [horario, setHorario] = useState('07:00');
  
  const [turnos, setTurnos] = useState('1');
  const [qtdPessoas, setQtdPessoas] = useState('');
  const [oQueVaiFazer, setOQueVaiFazer] = useState(proposta.objetivo || '');
  const [algoDiferente, setAlgoDiferente] = useState('');
  
  // Custom tasks per area (pre-filled with the user's template)
  const [tarefas, setTarefas] = useState([
    { area: 'Hospedagem e Passagens', tarefa: 'Separar Hotel' },
    { area: 'Integração', tarefa: 'Documentos e integração' },
    { area: 'Segurança do Trabalho', tarefa: 'Conferir EPIs e documentação da equipe e buscar procedimentos de atendimento' },
    { area: 'Supervisão', tarefa: 'Separar os nomes da equipe que vai para o atendimento, conferir caminhão' },
    { area: 'Logística', tarefa: 'Enviar placa no e-mail para liberação e gerar ordem de serviço' },
    { area: 'Montagem', tarefa: 'Montar equipamentos' },
    { area: 'Operacional', tarefa: 'Conferir os itens da equipe operacional' },
  ]);

  const handleUpdateTarefa = (index: number, value: string) => {
    const newTarefas = [...tarefas];
    newTarefas[index].tarefa = value;
    setTarefas(newTarefas);
  };

  const handleSend = async () => {
    try {
      setLoading(true);
      
      const payload = {
        acesso,
        inicio,
        termino,
        horario,
        turnos,
        qtdPessoas,
        oQueVaiFazer,
        algoDiferente,
        tarefas,
        contatoId: proposta.contato // Mandar o ID se for UUID
      };

      await api.post(`/propostas/${proposta.id}/disparar-equipe`, payload);
      
      showToast('Equipe notificada com sucesso!');
      onSuccess();
    } catch (error: any) {
      showToast('Erro ao disparar: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-slate-900 px-8 py-6 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-amber-400 p-2.5 rounded-xl">
              <Megaphone className="w-6 h-6 text-slate-900" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white leading-none">Disparo Operacional</h2>
              <p className="text-slate-400 text-sm mt-1.5 font-medium">Proposta: {proposta.codigo} - {proposta.cliente?.nome || proposta.cliente?.razaoSocial}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Column: Dates & Teams */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  Datas e Cronograma
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Acesso</label>
                    <input type="date" value={acesso} onChange={e => setAcesso(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Início</label>
                    <input type="date" value={inicio} onChange={e => setInicio(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Término</label>
                    <input type="date" value={termino} onChange={e => setTermino(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Horário Início</label>
                    <input type="time" value={horario} onChange={e => setHorario(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  Equipe e Dimensionamento
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Quantidade Pessoas</label>
                    <input type="text" value={qtdPessoas} onChange={e => setQtdPessoas(e.target.value)} placeholder="Ex: 01 Sup, 02 Mot..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Turnos</label>
                    <input type="text" value={turnos} onChange={e => setTurnos(e.target.value)} placeholder="Ex: 01 Turno 10h"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm" />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Escopo / O que vai fazer</label>
                  <textarea value={oQueVaiFazer} onChange={e => setOQueVaiFazer(e.target.value)} rows={4}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm resize-none" />
                </div>
              </div>
            </div>

            {/* Right Column: Tarefas por Área */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                  Tarefas por Área (WhatsApp/E-mail)
                </h3>
                <div className="space-y-4 flex-1">
                  {tarefas.map((t, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between items-center px-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">{t.area}</label>
                      </div>
                      <input type="text" value={t.tarefa} onChange={e => handleUpdateTarefa(idx, e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all" />
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Observações Extras</label>
                  <textarea value={algoDiferente} onChange={e => setAlgoDiferente(e.target.value)} rows={3} placeholder="Instruções adicionais..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm resize-none" />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="bg-white px-8 py-6 border-t border-slate-200 flex justify-end items-center gap-4 shrink-0">
          <button onClick={onClose} className="px-6 py-2.5 text-slate-600 font-semibold hover:bg-slate-50 rounded-xl transition-all">
            Cancelar
          </button>
          <button onClick={handleSend} disabled={loading}
            className="px-8 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-slate-900/20">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            Realizar Disparo
          </button>
        </div>

      </div>
    </div>
  );
}
