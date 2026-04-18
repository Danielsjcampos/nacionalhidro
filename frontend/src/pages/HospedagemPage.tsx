import { useEffect, useState } from 'react';
import api from '../services/api';
import {
    Loader2, X, Bed, MapPin, Calendar, Plane,
    CheckCircle2, Bus, Car
} from 'lucide-react';

const TIPO_PASSAGEM: Record<string, { label: string; icon: any; color: string }> = {
    AEREA: { label: 'Aérea', icon: Plane, color: 'bg-blue-100 text-blue-700' },
    RODOVIARIA: { label: 'Rodoviária', icon: Bus, color: 'bg-amber-100 text-amber-700' },
    TRANSLADO: { label: 'Translado', icon: Car, color: 'bg-slate-100 text-slate-600' },
};

const STATUS_PASSAGEM: Record<string, string> = {
    RESERVADA: 'bg-amber-100 text-amber-700',
    EMITIDA: 'bg-blue-100 text-blue-700',
    UTILIZADA: 'bg-emerald-100 text-emerald-700',
    CANCELADA: 'bg-red-100 text-red-600',
};

const STATUS_HOSP: Record<string, string> = {
    RESERVADO: 'bg-amber-100 text-amber-700',
    HOSPEDADO: 'bg-blue-100 text-blue-700',
    CHECKOUT: 'bg-emerald-100 text-emerald-700',
    CANCELADO: 'bg-red-100 text-red-600',
};

export default function HospedagemPage() {
    const [tab, setTab] = useState<'hospedagem' | 'passagens'>('hospedagem');
    const [osList, setOsList] = useState<any[]>([]);
    const [filterOS, setFilterOS] = useState('');

    // Hospedagem
    const [hospedagens, setHospedagens] = useState<any[]>([]);
    const [loadingH, setLoadingH] = useState(true);
    const [showFormH, setShowFormH] = useState(false);
    const [formH, setFormH] = useState({
        hotel: '', cidade: '', dataCheckin: '', dataCheckout: '', diarias: '1',
        valorDiaria: '', funcionarioId: '', osId: '', observacoes: '',
        tipoAcomodacao: 'INDIVIDUAL', cafeDaManha: true, almoco: false, lavanderia: false, fornecedorId: ''
    });
    
    // Fornecedores
    const [fornecedores, setFornecedores] = useState<any[]>([]);

    // Funcionarios for selection
    const [funcionarios, setFuncionarios] = useState<any[]>([]);
    const [complianceData, setComplianceData] = useState<any>(null);
    const [checkingCompliance, setCheckingCompliance] = useState(false);

    // Passagens
    const [passagens, setPassagens] = useState<any[]>([]);
    const [loadingP, setLoadingP] = useState(true);
    const [showFormP, setShowFormP] = useState(false);
    const [formP, setFormP] = useState({
        tipo: 'AEREA', origem: '', destino: '', dataIda: '', dataVolta: '',
        companhia: '', localizador: '', valor: '', funcionarioId: '', osId: '', observacoes: ''
    });

    // Resumo
    const [resumo, setResumo] = useState<any>(null);

    useEffect(() => {
        api.get('/os').then(r => setOsList(r.data || [])).catch(() => setOsList([]));
        api.get('/fornecedores').then(r => setFornecedores(r.data || [])).catch(() => setFornecedores([]));
        api.get('/rh').then(r => setFuncionarios(r.data || [])).catch(() => setFuncionarios([]));
    }, []);

    const fetchHospedagens = () => {
        const params: any = {};
        if (filterOS) params.osId = filterOS;
        api.get('/hospedagens', { params }).then(r => { setHospedagens(r.data || []); setLoadingH(false); }).catch(() => setLoadingH(false));
    };

    const fetchPassagens = () => {
        const params: any = {};
        if (filterOS) params.osId = filterOS;
        api.get('/hospedagens/passagens', { params }).then(r => { setPassagens(r.data || []); setLoadingP(false); }).catch(() => setLoadingP(false));
    };

    const fetchResumo = () => {
        if (!filterOS) { setResumo(null); return; }
        api.get(`/hospedagens/resumo/${filterOS}`).then(r => setResumo(r.data.resumo)).catch(() => { });
    };

    useEffect(() => { fetchHospedagens(); fetchPassagens(); fetchResumo(); }, [filterOS]);

    const handleCreateH = async () => {
        await api.post('/hospedagens', formH);
        setShowFormH(false);
        setFormH({ hotel: '', cidade: '', dataCheckin: '', dataCheckout: '', diarias: '1', valorDiaria: '', funcionarioId: '', osId: '', observacoes: '', tipoAcomodacao: 'INDIVIDUAL', cafeDaManha: true, almoco: false, lavanderia: false, fornecedorId: '' });
        fetchHospedagens(); fetchResumo();
    };

    const handleDeleteH = async (id: string) => {
        if (!confirm('Excluir hospedagem?')) return;
        await api.delete(`/hospedagens/${id}`);
        fetchHospedagens(); fetchResumo();
    };

    const handleCheckout = async (id: string) => {
        await api.patch(`/hospedagens/${id}`, { status: 'CHECKOUT', dataCheckout: new Date().toISOString() });
        fetchHospedagens();
    };

    const handleCreateP = async () => {
        await api.post('/hospedagens/passagens', formP);
        setShowFormP(false);
        setFormP({ tipo: 'AEREA', origem: '', destino: '', dataIda: '', dataVolta: '', companhia: '', localizador: '', valor: '', funcionarioId: '', osId: '', observacoes: '' });
        fetchPassagens(); fetchResumo();
    };

    const handleDeleteP = async (id: string) => {
        if (!confirm('Excluir passagem?')) return;
        await api.delete(`/hospedagens/passagens/${id}`);
        fetchPassagens(); fetchResumo();
    };

    const handleStatusP = async (id: string, status: string) => {
        await api.patch(`/hospedagens/passagens/${id}`, { status });
        fetchPassagens();
    };

    const checkCompliance = async (funcId: string, osId?: string) => {
        if (!funcId) { setComplianceData(null); return; }
        try {
            setCheckingCompliance(true);
            const res = await api.get(`/rh/${funcId}/compliance-check`, { params: { osId } });
            setComplianceData(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setCheckingCompliance(false);
        }
    };

    const fmt = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

    const loading = tab === 'hospedagem' ? loadingH : loadingP;
    if (loading && !hospedagens.length && !passagens.length) return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

    return (
        <div className="h-full flex flex-col space-y-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Hospedagem & Viagens</h1>
                    <p className="text-sm text-slate-500">Controle de hospedagem e passagens vinculadas às OS</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => { setFormH({ ...formH, osId: filterOS }); setShowFormH(true); }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                        <Bed className="w-4 h-4" /> Nova Hospedagem
                    </button>
                    <button onClick={() => { setFormP({ ...formP, osId: filterOS }); setShowFormP(true); }}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                        <Plane className="w-4 h-4" /> Nova Passagem
                    </button>
                </div>
            </div>

            {/* OS Filter + Tabs */}
            <div className="flex items-center gap-4">
                <select value={filterOS} onChange={e => setFilterOS(e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold min-w-[250px] appearance-none">
                    <option value="">Todas as OS</option>
                    {osList.map((os: any) => (
                        <option key={os.id} value={os.id}>OS {os.codigo} — {os.cliente?.nome || '—'}</option>
                    ))}
                </select>
                <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
                    <button onClick={() => setTab('hospedagem')}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${tab === 'hospedagem' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>
                        <Bed className="w-3.5 h-3.5 inline mr-1" /> Hospedagem
                    </button>
                    <button onClick={() => setTab('passagens')}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${tab === 'passagens' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>
                        <Plane className="w-3.5 h-3.5 inline mr-1" /> Passagens
                    </button>
                </div>
            </div>

            {/* Resumo per OS */}
            {resumo && (
                <div className="grid grid-cols-5 gap-3">
                    <div className="bg-white rounded-xl border border-slate-200 p-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Hospedagens</p>
                        <p className="text-lg font-black text-slate-800">{resumo.qtdHospedagens}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Total Hosp.</p>
                        <p className="text-lg font-black text-blue-600">{fmt(resumo.totalHospedagem)}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Passagens</p>
                        <p className="text-lg font-black text-slate-800">{resumo.qtdPassagens}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Total Pass.</p>
                        <p className="text-lg font-black text-indigo-600">{fmt(resumo.totalPassagens)}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-emerald-200 p-3">
                        <p className="text-[10px] font-black text-emerald-500 uppercase">Total Geral</p>
                        <p className="text-lg font-black text-emerald-600">{fmt(resumo.totalGeral)}</p>
                    </div>
                </div>
            )}

            {/* TAB: HOSPEDAGEM */}
            {tab === 'hospedagem' && (
                <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-slate-200">
                    <table className="w-full text-xs">
                        <thead><tr className="bg-slate-50 text-left">
                            <th className="p-3 font-black text-[10px] text-slate-400 uppercase">Hotel</th>
                            <th className="p-3 font-black text-[10px] text-slate-400 uppercase">Cidade</th>
                            <th className="p-3 font-black text-[10px] text-slate-400 uppercase">OS</th>
                            <th className="p-3 font-black text-[10px] text-slate-400 uppercase">Check-in</th>
                            <th className="p-3 font-black text-[10px] text-slate-400 uppercase">Diárias</th>
                            <th className="p-3 font-black text-[10px] text-slate-400 uppercase text-right">Total</th>
                            <th className="p-3 font-black text-[10px] text-slate-400 uppercase">Status</th>
                            <th className="p-3 font-black text-[10px] text-slate-400 uppercase">Ações</th>
                        </tr></thead>
                        <tbody>
                            {hospedagens.map(h => {
                                const osMatch = osList.find(o => o.id === h.osId);
                                return (
                                    <tr key={h.id} className="border-t border-slate-100 hover:bg-slate-50">
                                        <td className="p-3 font-bold text-slate-700"><Bed className="w-3 h-3 inline text-slate-400 mr-1" />{h.hotel}</td>
                                        <td className="p-3 text-slate-500"><MapPin className="w-3 h-3 inline" /> {h.cidade || '—'}</td>
                                        <td className="p-3">{osMatch ? <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">OS {osMatch.codigo}</span> : <span className="text-slate-300">—</span>}</td>
                                        <td className="p-3 text-slate-500"><Calendar className="w-3 h-3 inline" /> {fmtDate(h.dataCheckin)}</td>
                                        <td className="p-3 text-slate-500">{h.diarias || 1}</td>
                                        <td className="p-3 text-right font-bold text-slate-700">{fmt(Number(h.valorTotal))}</td>
                                        <td className="p-3"><span className={`text-[10px] font-black px-2 py-1 rounded ${STATUS_HOSP[h.status] || ''}`}>{h.status}</span></td>
                                        <td className="p-3 flex gap-1">
                                            {h.status === 'RESERVADO' && (
                                                <button onClick={() => handleCheckout(h.id)} className="text-[10px] text-emerald-600 font-bold hover:underline">Check-out</button>
                                            )}
                                            <button onClick={() => handleDeleteH(h.id)} className="text-[10px] text-red-500 font-bold hover:underline">×</button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {hospedagens.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-slate-400">Nenhuma hospedagem encontrada</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {/* TAB: PASSAGENS */}
            {tab === 'passagens' && (
                <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-slate-200">
                    <table className="w-full text-xs">
                        <thead><tr className="bg-slate-50 text-left">
                            <th className="p-3 font-black text-[10px] text-slate-400 uppercase">Tipo</th>
                            <th className="p-3 font-black text-[10px] text-slate-400 uppercase">Trecho</th>
                            <th className="p-3 font-black text-[10px] text-slate-400 uppercase">OS</th>
                            <th className="p-3 font-black text-[10px] text-slate-400 uppercase">Ida</th>
                            <th className="p-3 font-black text-[10px] text-slate-400 uppercase">Volta</th>
                            <th className="p-3 font-black text-[10px] text-slate-400 uppercase">Cia / Loc.</th>
                            <th className="p-3 font-black text-[10px] text-slate-400 uppercase text-right">Valor</th>
                            <th className="p-3 font-black text-[10px] text-slate-400 uppercase">Status</th>
                            <th className="p-3 font-black text-[10px] text-slate-400 uppercase">Ações</th>
                        </tr></thead>
                        <tbody>
                            {passagens.map(p => {
                                const osMatch = osList.find(o => o.id === p.osId);
                                const tipoInfo = TIPO_PASSAGEM[p.tipo] || TIPO_PASSAGEM.AEREA;
                                const TipoIcon = tipoInfo.icon;
                                return (
                                    <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                                        <td className="p-3"><span className={`text-[9px] font-black px-1.5 py-0.5 rounded inline-flex items-center gap-1 ${tipoInfo.color}`}><TipoIcon className="w-3 h-3" />{tipoInfo.label}</span></td>
                                        <td className="p-3 font-bold text-slate-700">{p.origem} → {p.destino}</td>
                                        <td className="p-3">{osMatch ? <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">OS {osMatch.codigo}</span> : <span className="text-slate-300">—</span>}</td>
                                        <td className="p-3 text-slate-500">{fmtDate(p.dataIda)}</td>
                                        <td className="p-3 text-slate-500">{fmtDate(p.dataVolta)}</td>
                                        <td className="p-3 text-slate-500">
                                            {p.companhia && <span className="font-bold">{p.companhia}</span>}
                                            {p.localizador && <span className="text-[10px] ml-1 text-slate-400">({p.localizador})</span>}
                                        </td>
                                        <td className="p-3 text-right font-bold text-slate-700">{fmt(Number(p.valor || 0))}</td>
                                        <td className="p-3"><span className={`text-[10px] font-black px-2 py-1 rounded ${STATUS_PASSAGEM[p.status] || ''}`}>{p.status}</span></td>
                                        <td className="p-3">
                                            <div className="flex gap-1">
                                                {p.status === 'RESERVADA' && (
                                                    <button onClick={() => handleStatusP(p.id, 'EMITIDA')} className="text-[10px] text-blue-600 font-bold hover:underline">Emitir</button>
                                                )}
                                                {p.status === 'EMITIDA' && (
                                                    <button onClick={() => handleStatusP(p.id, 'UTILIZADA')} className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" />Usar</button>
                                                )}
                                                <button onClick={() => handleDeleteP(p.id)} className="text-[10px] text-red-500 font-bold hover:underline">×</button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {passagens.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-slate-400">Nenhuma passagem encontrada</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal Nova Hospedagem */}
            {showFormH && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800">Nova Hospedagem</h2>
                            <button onClick={() => setShowFormH(false)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <select value={formH.osId} onChange={e => setFormH({ ...formH, osId: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm font-bold appearance-none">
                            <option value="">Vincular a uma OS (opcional)</option>
                            {osList.map((os: any) => <option key={os.id} value={os.id}>OS {os.codigo} — {os.cliente?.nome || ''}</option>)}
                        </select>
                        <select value={formH.fornecedorId} onChange={e => setFormH({ ...formH, fornecedorId: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm font-bold appearance-none">
                            <option value="">Vincular a um Fornecedor (Hotel/Pousada)</option>
                            {fornecedores.map((f: any) => <option key={f.id} value={f.id}>{f.nomeFantasia || f.razaoSocial}</option>)}
                        </select>
                        <select 
                            value={formH.funcionarioId} 
                            onChange={e => { 
                                setFormH({ ...formH, funcionarioId: e.target.value });
                                checkCompliance(e.target.value, formH.osId);
                            }}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm font-bold appearance-none"
                        >
                            <option value="">Selecione o Funcionário *</option>
                            {funcionarios.map((f: any) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                        </select>

                        {complianceData && (
                            <div className={`p-3 rounded-lg border flex gap-3 ${complianceData.compliant ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                                <div className={`p-1.5 rounded-full ${complianceData.compliant ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                    {complianceData.compliant ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                                </div>
                                <div className="flex-1">
                                    <p className={`text-[10px] font-black uppercase ${complianceData.compliant ? 'text-emerald-700' : 'text-red-700'}`}>
                                        Status de Compliance: {complianceData.compliant ? 'REGULAR' : 'BLOQUEADO'}
                                    </p>
                                    {!complianceData.compliant && complianceData.errors.map((err: string, i: number) => (
                                        <p key={i} className="text-[10px] text-red-600 font-bold">• {err}</p>
                                    ))}
                                    {complianceData.warnings.map((warn: string, i: number) => (
                                        <p key={i} className="text-[10px] text-amber-600 font-bold">• {warn}</p>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                            <input value={formH.hotel} onChange={e => setFormH({ ...formH, hotel: e.target.value })}
                                placeholder="Nome do Hotel *" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                            <select value={formH.tipoAcomodacao} onChange={e => setFormH({ ...formH, tipoAcomodacao: e.target.value })}
                                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm">
                                <option value="INDIVIDUAL">Individual</option>
                                <option value="DUPLO">Duplo</option>
                                <option value="TRIPLO">Triplo</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600 bg-slate-50 p-2 rounded-lg">
                            <label className="flex items-center gap-1 cursor-pointer">
                                <input type="checkbox" checked={formH.cafeDaManha} onChange={e => setFormH({ ...formH, cafeDaManha: e.target.checked })} />
                                Café da Manhã
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer">
                                <input type="checkbox" checked={formH.almoco} onChange={e => setFormH({ ...formH, almoco: e.target.checked })} />
                                Almoço/Janta
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer">
                                <input type="checkbox" checked={formH.lavanderia} onChange={e => setFormH({ ...formH, lavanderia: e.target.checked })} />
                                Lavanderia
                            </label>
                        </div>
                        <input value={formH.cidade} onChange={e => setFormH({ ...formH, cidade: e.target.value })}
                            placeholder="Cidade" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-[10px] text-slate-400 uppercase font-bold">Check-in</label>
                                <input type="date" value={formH.dataCheckin} onChange={e => setFormH({ ...formH, dataCheckin: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" /></div>
                            <div><label className="text-[10px] text-slate-400 uppercase font-bold">Check-out</label>
                                <input type="date" value={formH.dataCheckout} onChange={e => setFormH({ ...formH, dataCheckout: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <input type="number" value={formH.diarias} onChange={e => setFormH({ ...formH, diarias: e.target.value })}
                                placeholder="Qtd Diárias" className="border border-slate-200 rounded-lg p-2.5 text-sm" />
                            <input type="number" step="0.01" value={formH.valorDiaria} onChange={e => setFormH({ ...formH, valorDiaria: e.target.value })}
                                placeholder="Valor Diária (R$)" className="border border-slate-200 rounded-lg p-2.5 text-sm" />
                        </div>
                        {formH.diarias && formH.valorDiaria && (
                            <p className="text-right text-sm font-bold text-emerald-600">
                                Total: {fmt(Number(formH.diarias) * Number(formH.valorDiaria))}
                            </p>
                        )}
                        <textarea value={formH.observacoes} onChange={e => setFormH({ ...formH, observacoes: e.target.value })}
                            placeholder="Observações" rows={2} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                        <button onClick={handleCreateH} disabled={!formH.hotel || !formH.dataCheckin || !formH.funcionarioId || (complianceData && !complianceData.compliant)}
                            className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-bold text-sm disabled:opacity-50">
                            {checkingCompliance ? 'Verificando Compliance...' : 'Registrar Hospedagem'}
                        </button>
                    </div>
                </div>
            )}

            {/* Modal Nova Passagem */}
            {showFormP && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-indigo-700">Nova Passagem</h2>
                            <button onClick={() => setShowFormP(false)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <select value={formP.osId} onChange={e => setFormP({ ...formP, osId: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm font-bold appearance-none">
                            <option value="">Vincular a uma OS (opcional)</option>
                            {osList.map((os: any) => <option key={os.id} value={os.id}>OS {os.codigo} — {os.cliente?.nome || ''}</option>)}
                        </select>
                        <select 
                            value={formP.funcionarioId} 
                            onChange={e => { 
                                setFormP({ ...formP, funcionarioId: e.target.value });
                                checkCompliance(e.target.value, formP.osId);
                            }}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm font-bold appearance-none"
                        >
                            <option value="">Selecione o Funcionário *</option>
                            {funcionarios.map((f: any) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                        </select>

                        {complianceData && (
                            <div className={`p-3 rounded-lg border flex gap-3 ${complianceData.compliant ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                                <div className={`p-1.5 rounded-full ${complianceData.compliant ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                    {complianceData.compliant ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                                </div>
                                <div className="flex-1">
                                    <p className={`text-[10px] font-black uppercase ${complianceData.compliant ? 'text-emerald-700' : 'text-red-700'}`}>
                                        Status de Compliance: {complianceData.compliant ? 'REGULAR' : 'BLOQUEADO'}
                                    </p>
                                    {!complianceData.compliant && complianceData.errors.map((err: string, i: number) => (
                                        <p key={i} className="text-[10px] text-red-600 font-bold">• {err}</p>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="grid grid-cols-3 gap-3">
                            <select value={formP.tipo} onChange={e => setFormP({ ...formP, tipo: e.target.value })}
                                className="border border-slate-200 rounded-lg p-2.5 text-sm font-bold">
                                <option value="AEREA">✈️ Aérea</option>
                                <option value="RODOVIARIA">🚌 Rodoviária</option>
                                <option value="TRANSLADO">🚗 Translado</option>
                            </select>
                            <input value={formP.origem} onChange={e => setFormP({ ...formP, origem: e.target.value })}
                                placeholder="Origem *" className="border border-slate-200 rounded-lg p-2.5 text-sm" />
                            <input value={formP.destino} onChange={e => setFormP({ ...formP, destino: e.target.value })}
                                placeholder="Destino *" className="border border-slate-200 rounded-lg p-2.5 text-sm" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-[10px] text-slate-400 uppercase font-bold">Ida</label>
                                <input type="date" value={formP.dataIda} onChange={e => setFormP({ ...formP, dataIda: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" /></div>
                            <div><label className="text-[10px] text-slate-400 uppercase font-bold">Volta</label>
                                <input type="date" value={formP.dataVolta} onChange={e => setFormP({ ...formP, dataVolta: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" /></div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <input value={formP.companhia} onChange={e => setFormP({ ...formP, companhia: e.target.value })}
                                placeholder="Cia Aérea" className="border border-slate-200 rounded-lg p-2.5 text-sm" />
                            <input value={formP.localizador} onChange={e => setFormP({ ...formP, localizador: e.target.value })}
                                placeholder="Localizador" className="border border-slate-200 rounded-lg p-2.5 text-sm" />
                            <input type="number" step="0.01" value={formP.valor} onChange={e => setFormP({ ...formP, valor: e.target.value })}
                                placeholder="Valor (R$)" className="border border-slate-200 rounded-lg p-2.5 text-sm" />
                        </div>
                        <textarea value={formP.observacoes} onChange={e => setFormP({ ...formP, observacoes: e.target.value })}
                            placeholder="Observações" rows={2} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                        <button onClick={handleCreateP} disabled={!formP.origem || !formP.destino || !formP.dataIda || !formP.funcionarioId || (complianceData && !complianceData.compliant)}
                            className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-bold text-sm disabled:opacity-50">
                            {checkingCompliance ? 'Verificando Compliance...' : 'Registrar Passagem'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
