import { useState, useEffect } from 'react';
import { HardHat, Trash2, Plus, X, FileText, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import api from '../services/api';

interface EPI { id: string; nome: string; descricao: string; ca: string; validadeDias: number; }
interface EPIEntregue { id: string; funcionarioId: string; funcionario: { nome: string }; epiId: string; epi: EPI; dataEntrega: string; quantidade: number; tamanho: string; devolvido: boolean; dataDevolucao: string; }
interface Treinamento { id: string; nome: string; descricao: string; validadeMeses: number; obrigatorio: boolean; }
interface TreinamentoRealizado { id: string; funcionarioId: string; funcionario: { nome: string }; treinamentoId: string; treinamento: Treinamento; dataRealizacao: string; dataVencimento: string; certificadoUrl: string; }
interface Funcionario { id: string; nome: string; }

export default function SegurancaTrabalhoPage() {
    const [tab, setTab] = useState<'epi-entregas' | 'epi-catalogo' | 'treinamento-realizados' | 'treinamento-catalogo'>('epi-entregas');
    const [loading, setLoading] = useState(false);
    
    const [epis, setEpis] = useState<EPI[]>([]);
    const [entregas, setEntregas] = useState<EPIEntregue[]>([]);
    const [treinamentos, setTreinamentos] = useState<Treinamento[]>([]);
    const [realizados, setRealizados] = useState<TreinamentoRealizado[]>([]);
    const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);

    const [showEpiModal, setShowEpiModal] = useState(false);
    const [showEntregaModal, setShowEntregaModal] = useState(false);
    const [showTreinamentoModal, setShowTreinamentoModal] = useState(false);
    const [showRealizacaoModal, setShowRealizacaoModal] = useState(false);

    const [epiForm, setEpiForm] = useState({ nome: '', ca: '', validadeDias: '' });
    const [entregaForm, setEntregaForm] = useState({ funcionarioId: '', epiId: '', dataEntrega: new Date().toISOString().substring(0, 10), quantidade: 1, tamanho: '' });
    const [treinamentoForm, setTreinamentoForm] = useState({ nome: '', validadeMeses: '', obrigatorio: false });
    const [realizacaoForm, setRealizacaoForm] = useState({ funcionarioId: '', treinamentoId: '', dataRealizacao: new Date().toISOString().substring(0, 10), certificadoUrl: '' });

    const [complianceData, setComplianceData] = useState<{compliant: boolean, errors: string[], warnings: string[]} | null>(null);
    const [checkingCompliance, setCheckingCompliance] = useState(false);

    useEffect(() => { loadData(); }, [tab]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [resEpis, resT, resFunc] = await Promise.all([
                api.get('/epis'),
                api.get('/treinamentos'),
                api.get('/rh')
            ]);
            setEpis(resEpis.data);
            setTreinamentos(resT.data);
            setFuncionarios(resFunc.data);

            if (tab === 'epi-entregas') {
                const res = await api.get('/epis/entregas/lista');
                setEntregas(res.data);
            } else if (tab === 'treinamento-realizados') {
                const res = await api.get('/treinamentos/realizados/lista');
                setRealizados(res.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // --- EPI Handlers ---
    const handleAddEpi = async () => {
        await api.post('/epis', { ...epiForm, validadeDias: Number(epiForm.validadeDias) || null });
        setShowEpiModal(false);
        setEpiForm({ nome: '', ca: '', validadeDias: '' });
        loadData();
    };

    const handleDeleteEpi = async (id: string) => {
        if (!confirm('Excluir EPI do catálogo?')) return;
        await api.delete(`/epis/${id}`);
        loadData();
    };

    const handleEntregaEpi = async () => {
        try {
            await api.post('/epis/entregas', entregaForm);
            setShowEntregaModal(false);
            setEntregaForm({ funcionarioId: '', epiId: '', dataEntrega: new Date().toISOString().substring(0, 10), quantidade: 1, tamanho: '' });
            setComplianceData(null);
            loadData();
        } catch (error: any) {
            if (error.response?.status === 403) {
                alert(error.response.data.error || 'BLOQUEIO DE COMPLIANCE: Funcionário irregular.');
            } else {
                console.error(error);
                alert('Erro ao registrar entrega. Verifique os dados.');
            }
        }
    };

    const checkCompliance = async (funcId: string) => {
        if (!funcId) { setComplianceData(null); return; }
        try {
            setCheckingCompliance(true);
            const res = await api.get(`/rh/${funcId}/compliance-check`);
            setComplianceData(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setCheckingCompliance(false);
        }
    };

    const handleDevolver = async (id: string) => {
        if (!confirm('Marcar EPI como devolvido?')) return;
        await api.patch(`/epis/entregas/${id}/devolver`);
        loadData();
    };

    // --- Treinamento Handlers ---
    const handleAddTreinamento = async () => {
        await api.post('/treinamentos', { ...treinamentoForm, validadeMeses: Number(treinamentoForm.validadeMeses) || null });
        setShowTreinamentoModal(false);
        setTreinamentoForm({ nome: '', validadeMeses: '', obrigatorio: false });
        loadData();
    };

    const handleRealizarTreinamento = async () => {
        await api.post('/treinamentos/realizados', realizacaoForm);
        setShowRealizacaoModal(false);
        setRealizacaoForm({ funcionarioId: '', treinamentoId: '', dataRealizacao: new Date().toISOString().substring(0, 10), certificadoUrl: '' });
        loadData();
    };

    return (
        <div className="h-full flex flex-col space-y-4 overflow-hidden animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        <HardHat className="w-8 h-8 text-blue-500" />
                        Técnico de Segurança
                    </h1>
                    <p className="text-sm text-slate-500 font-medium">Controle de EPIs, NRs e Certificações</p>
                </div>
                <div className="flex gap-2">
                    {tab === 'epi-entregas' && (
                        <button onClick={() => setShowEntregaModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20">
                            <Plus className="w-4 h-4" /> Registrar Entrega
                        </button>
                    )}
                    {tab === 'treinamento-realizados' && (
                        <button onClick={() => setShowRealizacaoModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20">
                            <Plus className="w-4 h-4" /> Registrar Treinamento
                        </button>
                    )}
                    {tab === 'epi-catalogo' && (
                        <button onClick={() => setShowEpiModal(true)} className="bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Novo EPI
                        </button>
                    )}
                    {tab === 'treinamento-catalogo' && (
                        <button onClick={() => setShowTreinamentoModal(true)} className="bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Novo Treinamento
                        </button>
                    )}
                    <a href="/integracoes" className="bg-indigo-50 text-indigo-600 border border-indigo-200 px-4 py-2 rounded-xl text-sm font-black uppercase tracking-tighter flex items-center gap-2 hover:bg-indigo-100 transition-all">
                        <ShieldCheck className="w-4 h-4" /> Gestão de Integrações
                    </a>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-6 border-b border-slate-200">
                <button onClick={() => setTab('epi-entregas')} className={`pb-3 text-sm font-bold border-b-2 transition-all ${tab === 'epi-entregas' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Entregas de EPIs</button>
                <button onClick={() => setTab('epi-catalogo')} className={`pb-3 text-sm font-bold border-b-2 transition-all ${tab === 'epi-catalogo' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Catálogo de EPIs</button>
                <button onClick={() => setTab('treinamento-realizados')} className={`pb-3 text-sm font-bold border-b-2 transition-all ${tab === 'treinamento-realizados' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Treinamentos Realizados</button>
                <button onClick={() => setTab('treinamento-catalogo')} className={`pb-3 text-sm font-bold border-b-2 transition-all ${tab === 'treinamento-catalogo' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Catálogo NRs</button>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    {loading ? (
                        <div className="py-20 text-center"><p className="text-slate-400 animate-pulse">Carregando dados...</p></div>
                    ) : (
                        <div className="p-4">
                            {tab === 'epi-entregas' && (
                                <table className="w-full text-left text-sm">
                                    <thead className="text-[10px] uppercase font-black text-slate-400 border-b border-slate-100">
                                        <tr>
                                            <th className="px-4 py-3">Funcionário</th>
                                            <th className="px-4 py-3">EPI / CA</th>
                                            <th className="px-4 py-3">Data Entrega</th>
                                            <th className="px-4 py-3 text-center">Tamanho</th>
                                            <th className="px-4 py-3">Situação</th>
                                            <th className="px-4 py-3 text-right">Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {entregas.map(e => (
                                            <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-4 py-3 font-bold text-slate-700">{e.funcionario?.nome}</td>
                                                <td className="px-4 py-3">
                                                    <p className="font-medium">{e.epi?.nome}</p>
                                                    <p className="text-[10px] text-slate-400">CA: {e.epi?.ca || 'N/A'}</p>
                                                </td>
                                                <td className="px-4 py-3 text-slate-500">{new Date(e.dataEntrega).toLocaleDateString()}</td>
                                                <td className="px-4 py-3 text-center font-bold text-slate-600">{e.tamanho || 'U'}</td>
                                                <td className="px-4 py-3">
                                                    {e.devolvido ? (
                                                        <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-black uppercase">Devolvido</span>
                                                    ) : (
                                                        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-black uppercase">Em Uso</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {!e.devolvido && <button onClick={() => handleDevolver(e.id)} className="text-blue-600 hover:text-blue-800 text-[10px] font-black uppercase underline">Baixar</button>}
                                                </td>
                                            </tr>
                                        ))}
                                        {entregas.length === 0 && <tr><td colSpan={6} className="py-20 text-center text-slate-400">Nenhuma entrega de EPI cadastrada.</td></tr>}
                                    </tbody>
                                </table>
                            )}

                            {tab === 'epi-catalogo' && (
                                <table className="w-full text-left text-sm">
                                    <thead className="text-[10px] uppercase font-black text-slate-400 border-b border-slate-100">
                                        <tr>
                                            <th className="px-4 py-3">Equipamento (EPI)</th>
                                            <th className="px-4 py-3">CA (Certificado)</th>
                                            <th className="px-4 py-3 text-center">Troca Sugerida</th>
                                            <th className="px-4 py-3 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {epis.map(e => (
                                            <tr key={e.id} className="hover:bg-slate-50">
                                                <td className="px-4 py-3 font-bold text-slate-700">{e.nome}</td>
                                                <td className="px-4 py-3 font-medium text-slate-500">{e.ca || '—'}</td>
                                                <td className="px-4 py-3 text-center font-bold text-slate-600">{e.validadeDias ? `${e.validadeDias} dias` : '—'}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <button onClick={() => handleDeleteEpi(e.id)} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {tab === 'treinamento-realizados' && (
                                <table className="w-full text-left text-sm">
                                    <thead className="text-[10px] uppercase font-black text-slate-400 border-b border-slate-100">
                                        <tr>
                                            <th className="px-4 py-3">Funcionário</th>
                                            <th className="px-4 py-3">Treinamento (NR)</th>
                                            <th className="px-4 py-3">Data</th>
                                            <th className="px-4 py-3">Vencimento</th>
                                            <th className="px-4 py-3 text-right">Certificado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {realizados.map(r => {
                                            const isVencido = new Date(r.dataVencimento) < new Date();
                                            return (
                                                <tr key={r.id} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3 font-bold text-slate-700">{r.funcionario?.nome}</td>
                                                    <td className="px-4 py-3 font-medium">{r.treinamento?.nome}</td>
                                                    <td className="px-4 py-3 text-slate-500">{new Date(r.dataRealizacao).toLocaleDateString()}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center gap-1 w-fit
                                                            ${isVencido ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                            {isVencido && <AlertTriangle className="w-3 h-3" />}
                                                            {r.dataVencimento ? new Date(r.dataVencimento).toLocaleDateString() : 'Sem Validade'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        {r.certificadoUrl ? (
                                                            <a href={r.certificadoUrl} target="_blank" className="text-blue-600 flex items-center justify-end gap-1 hover:underline">
                                                                <FileText className="w-3.5 h-3.5" /> <span className="text-[10px] font-bold uppercase">Ver</span>
                                                            </a>
                                                        ) : <span className="text-slate-300">—</span>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {realizados.length === 0 && <tr><td colSpan={5} className="py-20 text-center text-slate-400">Nenhum treinamento registrado.</td></tr>}
                                    </tbody>
                                </table>
                            )}

                            {tab === 'treinamento-catalogo' && (
                                <table className="w-full text-left text-sm">
                                    <thead className="text-[10px] uppercase font-black text-slate-400 border-b border-slate-100">
                                        <tr>
                                            <th className="px-4 py-3">Nome do Treinamento</th>
                                            <th className="px-4 py-3 text-center">Reciclagem</th>
                                            <th className="px-4 py-3 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {treinamentos.map(t => (
                                            <tr key={t.id} className="hover:bg-slate-50">
                                                <td className="px-4 py-3 font-bold text-slate-700 text-base">{t.nome}</td>
                                                <td className="px-4 py-3 text-center font-bold text-slate-500">{t.validadeMeses ? `${t.validadeMeses} meses` : 'Indeterminado'}</td>
                                                <td className="px-4 py-3 text-center">
                                                    {t.obrigatorio ? (
                                                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-black uppercase">Obrigatório</span>
                                                    ) : (
                                                        <span className="bg-slate-100 text-slate-400 px-2 py-0.5 rounded text-[10px] font-black uppercase">Opcional</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* --- MODALS --- */}
            
            {/* Novo EPI Modal */}
            {showEpiModal && (
                <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-800">Novo EPI</h2>
                            <button onClick={() => setShowEpiModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <div className="space-y-3">
                            <input value={epiForm.nome} onChange={e => setEpiForm({ ...epiForm, nome: e.target.value })} 
                                placeholder="Nome do Equipamento *" className="w-full border border-slate-200 rounded-lg p-3 text-sm" />
                            <input value={epiForm.ca} onChange={e => setEpiForm({ ...epiForm, ca: e.target.value })} 
                                placeholder="CA (Certificado de Aprovação)" className="w-full border border-slate-200 rounded-lg p-3 text-sm" />
                            <input type="number" value={epiForm.validadeDias} onChange={e => setEpiForm({ ...epiForm, validadeDias: e.target.value })} 
                                placeholder="Dias para troca sugerida (ex: 30)" className="w-full border border-slate-200 rounded-lg p-3 text-sm" />
                        </div>
                        <button onClick={handleAddEpi} disabled={!epiForm.nome} 
                            className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50">Cadastrar EPI</button>
                    </div>
                </div>
            )}

            {/* Entrega EPI Modal */}
            {showEntregaModal && (
                <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-800">Registrar Entrega</h2>
                            <button onClick={() => setShowEntregaModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <div className="space-y-3">
                             <select 
                                value={entregaForm.funcionarioId} 
                                onChange={e => {
                                    setEntregaForm({ ...entregaForm, funcionarioId: e.target.value });
                                    checkCompliance(e.target.value);
                                }}
                                className="w-full border border-slate-200 rounded-lg p-3 text-sm font-bold"
                            >
                                <option value="">Selecionar Funcionário *</option>
                                {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                            </select>

                            {complianceData && (
                                <div className={`p-3 rounded-xl border flex gap-3 ${complianceData.compliant ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                                    <div className={`p-1.5 rounded-full ${complianceData.compliant ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                        {complianceData.compliant ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
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
                            <select value={entregaForm.epiId} onChange={e => setEntregaForm({ ...entregaForm, epiId: e.target.value })}
                                className="w-full border border-slate-200 rounded-lg p-3 text-sm">
                                <option value="">Selecionar EPI *</option>
                                {epis.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                            </select>
                            <div className="grid grid-cols-2 gap-3">
                                <input type="number" value={entregaForm.quantidade} onChange={e => setEntregaForm({ ...entregaForm, quantidade: Number(e.target.value) })}
                                    placeholder="Qtd" className="border border-slate-200 rounded-lg p-3 text-sm" />
                                <input value={entregaForm.tamanho} onChange={e => setEntregaForm({ ...entregaForm, tamanho: e.target.value })}
                                    placeholder="Tam (ex: G, 42)" className="border border-slate-200 rounded-lg p-3 text-sm" />
                            </div>
                            <input type="date" value={entregaForm.dataEntrega} onChange={e => setEntregaForm({ ...entregaForm, dataEntrega: e.target.value })}
                                className="w-full border border-slate-200 rounded-lg p-3 text-sm" />
                        </div>
                         <button onClick={handleEntregaEpi} disabled={!entregaForm.funcionarioId || !entregaForm.epiId || (complianceData && !complianceData.compliant)} 
                             className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:bg-blue-700 shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50">
                             {checkingCompliance ? 'Verificando...' : <><CheckCircle className="w-4 h-4" /> Finalizar Entrega</>}
                         </button>
                    </div>
                </div>
            )}

            {/* Novo Treinamento Modal */}
            {showTreinamentoModal && (
                <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-800">Novo Treinamento</h2>
                            <button onClick={() => setShowTreinamentoModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <div className="space-y-3">
                            <input value={treinamentoForm.nome} onChange={e => setTreinamentoForm({ ...treinamentoForm, nome: e.target.value })} 
                                placeholder="Identificação (Ex: NR-35 - Altura) *" className="w-full border border-slate-200 rounded-lg p-3 text-sm" />
                            <input type="number" value={treinamentoForm.validadeMeses} onChange={e => setTreinamentoForm({ ...treinamentoForm, validadeMeses: e.target.value })} 
                                placeholder="Validade em Meses (ex: 24)" className="w-full border border-slate-200 rounded-lg p-3 text-sm" />
                            <label className="flex items-center gap-2 cursor-pointer p-1">
                                <input type="checkbox" checked={treinamentoForm.obrigatorio} onChange={e => setTreinamentoForm({ ...treinamentoForm, obrigatorio: e.target.checked })} />
                                <span className="text-sm font-medium text-slate-600">Treinamento Obrigatório?</span>
                            </label>
                        </div>
                        <button onClick={handleAddTreinamento} disabled={!treinamentoForm.nome} 
                            className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold">Cadastrar NR</button>
                    </div>
                </div>
            )}

            {/* Registrar Realização Modal */}
            {showRealizacaoModal && (
                <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-800">Lançar Certificado</h2>
                            <button onClick={() => setShowRealizacaoModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <div className="space-y-3">
                            <select value={realizacaoForm.funcionarioId} onChange={e => setRealizacaoForm({ ...realizacaoForm, funcionarioId: e.target.value })}
                                className="w-full border border-slate-200 rounded-lg p-3 text-sm">
                                <option value="">Selecionar Funcionário *</option>
                                {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                            </select>
                            <select value={realizacaoForm.treinamentoId} onChange={e => setRealizacaoForm({ ...realizacaoForm, treinamentoId: e.target.value })}
                                className="w-full border border-slate-200 rounded-lg p-3 text-sm">
                                <option value="">Selecionar Treinamento *</option>
                                {treinamentos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                            </select>
                            <input type="date" value={realizacaoForm.dataRealizacao} onChange={e => setRealizacaoForm({ ...realizacaoForm, dataRealizacao: e.target.value })}
                                className="w-full border border-slate-200 rounded-lg p-3 text-sm" />
                            <input value={realizacaoForm.certificadoUrl} onChange={e => setRealizacaoForm({ ...realizacaoForm, certificadoUrl: e.target.value })}
                                placeholder="URL ou Link do Certificado/PDF" className="w-full border border-slate-200 rounded-lg p-3 text-sm" />
                        </div>
                        <button onClick={handleRealizarTreinamento} disabled={!realizacaoForm.funcionarioId || !realizacaoForm.treinamentoId} 
                            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">Registrar Certificado</button>
                    </div>
                </div>
            )}

        </div>
    );
}
