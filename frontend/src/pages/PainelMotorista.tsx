import { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import SignatureCanvas from 'react-signature-canvas';
import {
    Loader2, MapPin, Truck, ChevronRight, Navigation,
    User, Calendar, Gauge, CheckCircle2, XCircle
} from 'lucide-react';

export default function PainelMotorista() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [km, setKm] = useState('');

    // Modals state
    const [showSignature, setShowSignature] = useState<any>(null); // holds OS object
    const [showFailure, setShowFailure] = useState<any>(null); // holds OS object
    const [justificativa, setJustificativa] = useState('');
    const [rdoForm, setRdoForm] = useState({ horasTrabalhadas: '', horasExtras: '', horasNoturnas: '', atividadesRealizadas: '' });
    const sigPad = useRef<SignatureCanvas>(null);

    const fetchData = () => {
        setLoading(true);
        api.get('/painel-motorista').then(r => {
            const resData = r.data || {};
            setData(resData);
            if (resData.veiculoInfo?.kmAtual) setKm(resData.veiculoInfo.kmAtual.toString());
            setLoading(false);
        }).catch(() => {
            setData({});
            setLoading(false);
        });
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleKmUpdate = async () => {
        if (!km || !data?.veiculoInfo) return;
        await api.post('/painel-motorista/km', { veiculoId: data.veiculoInfo.id, km: Number(km) });
    };

    const handleFinalizar = async () => {
        if (!showSignature) return;
        if (sigPad.current?.isEmpty()) {
            alert('Por favor, colete a assinatura do responsável.');
            return;
        }

        const assinaturaBase64 = sigPad.current?.getTrimmedCanvas().toDataURL('image/png');
        try {
            await api.post('/painel-motorista/finalizar', {
                osId: showSignature.id,
                assinatura: assinaturaBase64,
                ...rdoForm
            });
            setShowSignature(null);
            setRdoForm({ horasTrabalhadas: '', horasExtras: '', horasNoturnas: '', atividadesRealizadas: '' });
            fetchData();
        } catch (error) {
            console.error(error);
            alert('Erro ao finalizar OS.');
        }
    };

    const handleFalha = async () => {
        if (!showFailure || !justificativa.trim()) return;

        try {
            await api.post('/painel-motorista/falha', {
                osId: showFailure.id,
                justificativa
            });
            setShowFailure(null);
            setJustificativa('');
            fetchData();
        } catch (error) {
            console.error(error);
            alert('Erro ao reportar falha da OS.');
        }
    };

    const handleCheckpoint = async (osId: string, checkpoint: string) => {
        try {
            await api.post('/painel-motorista/checkpoint', { osId, checkpoint });
            fetchData();
        } catch (error) {
            console.error(error);
            alert('Erro ao registrar progresso.');
        }
    };

    const fmtDate = (d: string) => d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

    if (loading && !data) return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

    return (
        <div className="h-full flex flex-col space-y-4 overflow-y-auto relative pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Painel do Motorista</h1>
                    <p className="text-sm text-slate-500">Visão do motorista / tablet de campo</p>
                </div>
                {data?.veiculoInfo && (
                    <div className="bg-slate-100 rounded-xl px-4 py-2 flex items-center gap-2">
                        <Truck className="w-5 h-5 text-blue-600" />
                        <div>
                            <p className="text-sm font-bold text-slate-700">{data.veiculoInfo.placa}</p>
                            <p className="text-[10px] text-slate-400">{data.veiculoInfo.modelo}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white hover:scale-[1.02] transition-transform">
                    <p className="text-[10px] font-black uppercase opacity-70">OS Ativas</p>
                    <p className="text-3xl font-black">{data?.osAtivas?.length || 0}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-4 text-white hover:scale-[1.02] transition-transform">
                    <p className="text-[10px] font-black uppercase opacity-70">Escalas Hoje</p>
                    <p className="text-3xl font-black">{data?.escalasHoje?.length || 0}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white hover:scale-[1.02] transition-transform">
                    <p className="text-[10px] font-black uppercase opacity-70">Próximas</p>
                    <p className="text-3xl font-black">{data?.proximasOS?.length || 0}</p>
                </div>
            </div>

            {/* OS Ativas */}
            <section>
                <h2 className="text-xs font-black text-slate-400 uppercase mb-2 flex items-center gap-1">
                    <Navigation className="w-3.5 h-3.5" /> Ordens de Serviço Ativas
                </h2>
                <div className="space-y-3">
                    {data?.osAtivas?.map((os: any) => (
                        <div key={os.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <p className="text-lg font-black text-slate-800">{os.numero || `OS-${os.id.slice(0, 8)}`}</p>
                                    <p className="text-sm font-bold text-slate-600 flex items-center gap-1 mt-1"><User className="w-4 h-4" /> {os.cliente?.nome || '—'}</p>
                                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><MapPin className="w-4 h-4" /> {os.cliente?.endereco || '—'}</p>
                                </div>
                                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 flex items-center gap-1">
                                    <Loader2 className="w-3 h-3 animate-spin" /> EM EXECUÇÃO
                                </span>
                            </div>

                            {/* Dynamic Checkpoints */}
                            {(() => {
                                const cps = os.checkpoints ? (typeof os.checkpoints === 'string' ? JSON.parse(os.checkpoints) : os.checkpoints) : {};
                                
                                if (!cps.CHEGOU_CLIENTE) {
                                    return (
                                        <button onClick={() => handleCheckpoint(os.id, 'CHEGOU_CLIENTE')}
                                            className="w-full mt-4 bg-indigo-600 text-white font-bold py-3 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-sm transition-all active:scale-95">
                                            <Navigation className="w-4 h-4" /> Cheguei no Cliente
                                        </button>
                                    );
                                }
                                if (!cps.INICIOU_SERVICO) {
                                    return (
                                        <button onClick={() => handleCheckpoint(os.id, 'INICIOU_SERVICO')}
                                            className="w-full mt-4 bg-amber-500 text-white font-bold py-3 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-amber-600 shadow-sm transition-all active:scale-95">
                                            <Gauge className="w-4 h-4" /> Iniciar Serviço
                                        </button>
                                    );
                                }
                                
                                // Se já iniciou o serviço, mostra os botões de Finalizar/Falha
                                return (
                                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 gap-3">
                                        <button
                                            onClick={() => setShowSignature(os)}
                                            className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-emerald-700 active:scale-95 transition-all shadow-sm">
                                            <CheckCircle2 className="w-4 h-4" /> Finalizar OS
                                        </button>
                                        <button
                                            onClick={() => setShowFailure(os)}
                                            className="flex-1 bg-red-50 text-red-600 font-bold py-3 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-red-100 active:scale-95 transition-all outline-none">
                                            <XCircle className="w-4 h-4" /> Reportar Falha
                                        </button>
                                    </div>
                                );
                            })()}
                        </div>
                    ))}
                    {(!data?.osAtivas || data.osAtivas.length === 0) && (
                        <div className="bg-slate-50 rounded-xl p-8 text-center border border-slate-200 border-dashed">
                            <p className="text-sm font-bold text-slate-400">Nenhuma OS em execução no momento.</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Escalas de Hoje */}
            <section>
                <h2 className="text-xs font-black text-slate-400 uppercase mb-2 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Suas Escalas de Hoje
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {data?.escalasHoje?.map((e: any) => (
                        <div key={e.id} className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                            <p className="text-sm font-bold text-slate-800 flex items-center justify-between">
                                {e.funcionario?.nome || 'Escala'}
                                <span className="text-[10px] text-slate-400 font-normal">{fmtDate(e.dataInicio)}</span>
                            </p>
                            <p className="text-xs text-blue-600 font-bold mt-1 bg-blue-50 px-2 py-1 rounded w-fit">{e.veiculo?.placa || 'Sem veículo'}</p>
                        </div>
                    ))}
                    {(!data?.escalasHoje || data.escalasHoje.length === 0) && (
                        <p className="text-xs text-slate-400 italic col-span-full">Sem escalas atreladas para hoje.</p>
                    )}
                </div>
            </section>

            {/* Próximas OS */}
            <section>
                <h2 className="text-xs font-black text-slate-400 uppercase mb-2">Próximos Destinos</h2>
                <div className="space-y-2">
                    {data?.proximasOS?.map((os: any) => (
                        <div key={os.id} className="flex flex-col gap-2 bg-white rounded-lg border border-slate-200 p-3 shadow-sm hover:border-blue-300 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-sm font-bold text-slate-800 truncate">{os.cliente?.nome}</p>
                                    <p className="text-xs text-slate-500 truncate">{os.cliente?.endereco}</p>
                                </div>
                                <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded">{fmtDate(os.dataInicial)}</span>
                            </div>
                            <button onClick={() => handleCheckpoint(os.id, 'SAIU_BASE')}
                                className="w-full bg-blue-50 text-blue-600 font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors">
                                <Truck className="w-3.5 h-3.5" /> Iniciar Deslocamento
                            </button>
                        </div>
                    ))}
                    {(!data?.proximasOS || data.proximasOS.length === 0) && (
                        <p className="text-xs text-slate-400 italic">Nada agendado para o futuro próximo.</p>
                    )}
                </div>
            </section>

            {/* KM Update */}
            {data?.veiculoInfo && (
                <section className="bg-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
                    <div className="absolute -right-4 -bottom-4 opacity-10">
                        <Gauge className="w-32 h-32 text-white" />
                    </div>
                    <h2 className="text-xs font-black text-slate-300 uppercase mb-3 flex items-center gap-1 relative z-10">
                        <Gauge className="w-4 h-4" /> Qual a quilometragem atual?
                    </h2>
                    <div className="flex gap-2 relative z-10">
                        <input type="number" value={km} onChange={e => setKm(e.target.value)}
                            placeholder="KM atual (Painel)" className="flex-1 border-none focus:ring-2 focus:ring-blue-500 rounded-lg p-3 text-sm font-bold bg-white/10 text-white placeholder-slate-400" />
                        <button onClick={handleKmUpdate} className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg text-sm font-bold shadow-md transition-colors active:scale-95">
                            Salvar
                        </button>
                    </div>
                </section>
            )}

            {/* Modal de Assinatura (Finalizar OS) */}
            {showSignature && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col justify-end sm:justify-center p-4 sm:p-0">
                    <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md sm:mx-auto p-6 shadow-2xl flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Finalizar OS
                            </h3>
                            <button onClick={() => setShowSignature(null)} className="text-slate-400 hover:text-slate-600 p-1">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                        <p className="text-sm text-slate-600 mb-4">
                            Você está finalizando a <strong className="text-slate-800">{showSignature.numero || `OS-${showSignature.id.slice(0, 8)}`}</strong>. Por favor, preencha o RDO e solicite a assinatura do cliente responsável no campo abaixo.
                        </p>

                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 space-y-3">
                            <h4 className="text-xs font-black text-slate-500 uppercase flex items-center gap-1">
                                <Gauge className="w-3.5 h-3.5" /> Apontamento de Horas (RDO)
                            </h4>
                            <div className="flex gap-2">
                                <input type="number" placeholder="Horas Trab. (ex: 8)" 
                                    className="flex-1 outline-none focus:ring-2 focus:ring-blue-500 border border-slate-200 rounded-lg p-2 text-xs" 
                                    value={rdoForm.horasTrabalhadas} onChange={e => setRdoForm({...rdoForm, horasTrabalhadas: e.target.value})} />
                                <input type="number" placeholder="Horas Extra (ex: 2)" 
                                    className="flex-1 outline-none focus:ring-2 focus:ring-blue-500 border border-slate-200 rounded-lg p-2 text-xs" 
                                    value={rdoForm.horasExtras} onChange={e => setRdoForm({...rdoForm, horasExtras: e.target.value})} />
                                <input type="number" placeholder="H. Noturna" 
                                    className="flex-1 outline-none focus:ring-2 focus:ring-blue-500 border border-slate-200 rounded-lg p-2 text-xs" 
                                    value={rdoForm.horasNoturnas} onChange={e => setRdoForm({...rdoForm, horasNoturnas: e.target.value})} />
                            </div>
                            <textarea placeholder="Atividades Realizadas / Observações..." 
                                className="w-full outline-none focus:ring-2 focus:ring-blue-500 border border-slate-200 rounded-lg p-2 text-xs resize-none" rows={2}
                                value={rdoForm.atividadesRealizadas} onChange={e => setRdoForm({...rdoForm, atividadesRealizadas: e.target.value})} />
                        </div>

                        <div className="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 mb-4 overflow-hidden touch-none" style={{ height: 200 }}>
                            <SignatureCanvas
                                ref={sigPad}
                                penColor="blue"
                                canvasProps={{ className: 'w-full h-full cursor-crosshair' }}
                            />
                        </div>

                        <div className="flex gap-3 mt-auto">
                            <button
                                onClick={() => sigPad.current?.clear()}
                                className="px-4 py-3 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 focus:outline-none">
                                Limpar
                            </button>
                            <button
                                onClick={handleFinalizar}
                                className="flex-1 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 py-3">
                                Confirmar Assinatura e Baixar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Falha (Reportar Problema) */}
            {showFailure && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col justify-end sm:justify-center p-4 sm:p-0">
                    <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md sm:mx-auto p-6 shadow-2xl flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-black text-red-600 flex items-center gap-2">
                                <XCircle className="w-5 h-5" /> Reportar Falha na OS
                            </h3>
                            <button onClick={() => { setShowFailure(null); setJustificativa(''); }} className="text-slate-400 hover:text-slate-600 p-1">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                        <p className="text-sm text-slate-600 mb-4">
                            Houve algum problema para executar a <strong className="text-slate-800">{showFailure.numero || `OS-${showFailure.id.slice(0, 8)}`}</strong>? Justifique o motivo detalhadamente.
                        </p>

                        <textarea
                            value={justificativa}
                            onChange={e => setJustificativa(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm resize-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all outline-none"
                            rows={5}
                            placeholder="Descreva o motivo da não realização do serviço (ex: cliente não estava no local, equipamento quebrou, etc)..."
                        />

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => { setShowFailure(null); setJustificativa(''); }}
                                className="flex-1 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 py-3">
                                Voltar
                            </button>
                            <button
                                onClick={handleFalha}
                                disabled={!justificativa.trim()}
                                className="flex-1 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 shadow-lg shadow-red-600/20 disabled:opacity-50 disabled:shadow-none py-3">
                                Confirmar Falha
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
