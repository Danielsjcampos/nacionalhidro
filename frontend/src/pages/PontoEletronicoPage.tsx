import { useEffect, useState } from 'react';
import api from '../services/api';
import { Loader2, Plus, X, Clock, User, Calendar, Upload, FileSpreadsheet, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function PontoEletronicoPage() {
    const [pontos, setPontos] = useState<any[]>([]);
    const [funcionarios, setFuncionarios] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingTiquetaque, setLoadingTiquetaque] = useState(false);
    const [tqDashboard, setTqDashboard] = useState<any>(null);
    const [showForm, setShowForm] = useState(false);
    const [dataFiltro, setDataFiltro] = useState(new Date().toISOString().split('T')[0]);
    const [form, setForm] = useState({ funcionarioId: '', data: '', entrada1: '', saida1: '', entrada2: '', saida2: '', observacoes: '' });

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [p, f] = await Promise.all([
                api.get('/ponto', { params: { data: dataFiltro } }),
                api.get('/rh')
            ]);
            
            // Agora o banco de dados é a fonte oficial da tabela
            // Os dados do TiqueTaque estarão em p.data após Sincronizar
            setPontos(p.data.sort((a: any, b: any) => a.funcionarioNome.localeCompare(b.funcionarioNome)));

            setLoadingTiquetaque(true);
            try {
                // Mantém apenas o Dashboard diário Live
                const tqDash = await api.get('/gestao-colaboradores/tiquetaque/dashboard-hoje');
                
                const todayStr = new Date().toISOString().split('T')[0];
                if (dataFiltro === todayStr) {
                    setTqDashboard(tqDash.data);
                } else {
                    setTqDashboard(null);
                }
            } catch (err) {
                 console.error('Tiquetaque fetch error:', err);
            } finally {
                 setLoadingTiquetaque(false);
            }

            setFuncionarios(f.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };
    
    useEffect(() => { fetchAll(); }, [dataFiltro]);

    const handleCreate = async () => {
        await api.post('/ponto', form);
        setShowForm(false);
        setForm({ funcionarioId: '', data: '', entrada1: '', saida1: '', entrada2: '', saida2: '', observacoes: '' });
        fetchAll();
    };

    const statusColor: any = {
        NORMAL: 'bg-emerald-100 text-emerald-700',
        INCOMPLETO: 'bg-blue-100 text-blue-700',
        HORA_EXTRA: 'bg-indigo-100 text-indigo-700',
        FALTA: 'bg-slate-100 text-slate-700'
    };

    // TicTac Import
    const [showImport, setShowImport] = useState(false);
    const [csvData, setCsvData] = useState('');
    const [importResult, setImportResult] = useState<any>(null);
    const [importing, setImporting] = useState(false);

    const [syncingTiquetaque, setSyncingTiquetaque] = useState(false);
    const [syncResult, setSyncResult] = useState<any>(null);

    const handleSyncTiquetaque = async () => {
        setSyncingTiquetaque(true);
        setSyncResult(null);
        try {
            // Se o usuário quiser puxar só da dataFiltro:
            const start = new Date(dataFiltro);
            const end = new Date(dataFiltro);
            // Fetch for the selected day in filter
            const res = await api.post('/ponto/sincronizar-tiquetaque', { 
                dataInicio: start.toISOString().split('T')[0], 
                dataFim: end.toISOString().split('T')[0] 
            });
            setSyncResult(res.data);
            fetchAll();
            setTimeout(() => setSyncResult(null), 7000);
        } catch (err: any) {
            setSyncResult({ error: err.response?.data?.error || 'Erro ao sincronizar' });
            setTimeout(() => setSyncResult(null), 7000);
        } finally {
            setSyncingTiquetaque(false);
        }
    };

    const handleImportTicTac = async () => {
        if (!csvData.trim()) return;
        setImporting(true);
        setImportResult(null);
        try {
            const res = await api.post('/ponto/importar-tictac', { dados: csvData });
            setImportResult(res.data);
            fetchAll();
        } catch (err: any) {
            setImportResult({ error: err.response?.data?.error || 'Erro ao importar' });
        } finally {
            setImporting(false);
        }
    };

    const formatHours = (decimal: number) => {
        if (!decimal) return '0h';
        const hrs = Math.floor(decimal);
        const mins = Math.round((decimal - hrs) * 60);
        if (mins === 0) return `${hrs}h`;
        return `${hrs}h${mins}m`;
    };

    if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

    return (
        <div className="h-full flex flex-col space-y-4 overflow-hidden">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Clock className="w-6 h-6 text-blue-500" /> Ponto Eletrônico</h1>
                    <p className="text-sm text-slate-500">Registro e controle de ponto dos funcionários</p>
                    <div className="flex items-center gap-2 mt-3">
                        <span className="text-xs font-bold text-slate-500 uppercase">Data Referência:</span>
                        <input 
                           type="date" 
                           value={dataFiltro} 
                           onChange={e => setDataFiltro(e.target.value)}
                           className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 font-bold focus:outline-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                        {loadingTiquetaque && <span className="flex items-center gap-1 text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded"><Loader2 className="w-3 h-3 animate-spin"/> Atualizando...</span>}
                        {syncResult && !syncResult.error && <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded"><CheckCircle2 className="w-3 h-3"/> {syncResult.synced} sincronizados</span>}
                        {syncResult?.error && <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded"><AlertTriangle className="w-3 h-3"/> {syncResult.error}</span>}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleSyncTiquetaque} disabled={syncingTiquetaque} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-emerald-700 transition-colors disabled:opacity-50">
                        {syncingTiquetaque ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                        Sincronizar TiqueTaque
                    </button>
                    <button onClick={() => setShowImport(!showImport)} className="bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-900 transition-colors">
                        <Upload className="w-4 h-4" /> Importar TicTac
                    </button>
                    <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Registrar Ponto
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
                {['NORMAL', 'HORA_EXTRA', 'INCOMPLETO', 'FALTA'].map(s => (
                    <div key={s} className={`rounded-xl p-3 ${statusColor[s]}`}>
                        <p className="text-xl font-black">{pontos.filter(p => p.status === s).length}</p>
                        <p className="text-[10px] font-black uppercase">{s.replace('_', ' ')}</p>
                    </div>
                ))}
            </div>

            {/* TicTac Import Panel */}
            {showImport && (
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-sm">
                    <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                        <h3 className="text-sm font-bold text-slate-700">Importar Relatório TicTac (CSV)</h3>
                    </div>
                    <p className="text-[10px] text-slate-400">Formato: <code>NOME;DATA(AAAA-MM-DD);ENTRADA1;SAÍDA1;ENTRADA2;SAÍDA2</code></p>
                    <textarea
                        value={csvData}
                        onChange={e => setCsvData(e.target.value)}
                        placeholder={`João Silva;2026-03-04;07:30;11:30;12:30;17:30\nMaria Santos;2026-03-04;08:00;12:00;13:00;18:00`}
                        rows={5}
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-xs font-mono"
                    />
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleImportTicTac}
                            disabled={importing || !csvData.trim()}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-50 flex items-center gap-2"
                        >
                            {importing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                            Importar
                        </button>
                        {importResult && !importResult.error && (
                            <div className="text-xs space-x-3">
                                <span className="text-emerald-600 font-bold">✓ {importResult.imported} importados</span>
                                {importResult.skipped > 0 && <span className="text-slate-500 font-bold">⚠ {importResult.skipped} ignorados</span>}
                            </div>
                        )}
                        {importResult?.error && <span className="text-xs text-slate-600 font-bold">{importResult.error}</span>}
                    </div>
                    {importResult?.errors?.length > 0 && (
                        <div className="text-[10px] text-slate-400 space-y-0.5 max-h-20 overflow-y-auto font-medium">
                            {importResult.errors.map((e: string, i: number) => <p key={i}>• {e}</p>)}
                        </div>
                    )}
                </div>
            )}

            {/* TiqueTaque Dashboard */}
            {tqDashboard && (
              <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mb-4 shrink-0">
                <div className="flex items-center gap-3 mb-4">
                  <Clock className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Painel de Ponto Diário (TiqueTaque)</h2>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-4">
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex flex-col justify-center">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Ativos</p>
                    <p className="text-xl font-black text-slate-800">{tqDashboard?.ativos ?? 0}</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex flex-col justify-center">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase">Presentes Hoje</p>
                    <p className="text-xl font-black text-emerald-700">{tqDashboard?.presentes ?? 0}</p>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 p-3 rounded-xl flex flex-col justify-center">
                    <p className="text-[10px] font-bold text-orange-600 uppercase">Atrasados</p>
                    <p className="text-xl font-black text-orange-700">{tqDashboard?.atrasados ?? 0}</p>
                  </div>
                  <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex flex-col justify-center">
                    <p className="text-[10px] font-bold text-rose-600 uppercase">Saída Antecipada</p>
                    <p className="text-xl font-black text-rose-700">{tqDashboard?.saida_antecipada ?? 0}</p>
                  </div>
                  <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex flex-col justify-center">
                    <p className="text-[10px] font-bold text-rose-600 uppercase">Faltas Hoje</p>
                    <p className="text-xl font-black text-rose-700">{tqDashboard?.faltas ?? 0}</p>
                  </div>
                  <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-xl flex flex-col justify-center">
                    <p className="text-[10px] font-bold text-indigo-600 uppercase">Horas Extras</p>
                    <p className="text-xl font-black text-indigo-700 flex items-baseline gap-1">
                      {formatHours(tqDashboard?.hora_extra_horas)} 
                      <span className="text-[10px] font-medium opacity-70">({tqDashboard?.hora_extra_count ?? 0} pes.)</span>
                    </p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex flex-col justify-center">
                    <p className="text-[10px] font-bold text-amber-600 uppercase">Intervalo &lt; 1h</p>
                    <p className="text-xl font-black text-amber-700">{tqDashboard?.intervalo_irregular ?? 0}</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex flex-col justify-center">
                    <p className="text-[10px] font-bold text-amber-600 uppercase">Sem Int. (&gt;6h)</p>
                    <p className="text-xl font-black text-amber-700">{tqDashboard?.sem_intervalo_mais_6h ?? 0}</p>
                  </div>
                </div>

                {tqDashboard?.lista_faltas?.length > 0 && (
                  <div className="bg-rose-50/50 rounded-xl p-3 border border-rose-100">
                    <p className="text-xs font-bold text-rose-800 flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-3.5 h-3.5" /> Quem Faltou Hoje:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {tqDashboard.lista_faltas.map((f: any) => (
                        <span key={f.id} className="bg-white text-rose-700 text-[10px] font-black px-2 py-1 border border-rose-200 rounded-md">
                          {f.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {tqDashboard && tqDashboard.lista_faltas?.length === 0 && (
                   <p className="text-xs font-medium text-slate-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500"/> Nenhuma falta registrada hoje!</p>
                )}
              </section>
            )}

            {/* Table */}
            <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-slate-200">
                <table className="w-full text-xs">
                    <thead><tr className="bg-slate-50 text-left">
                        <th className="p-3 font-black text-[10px] text-slate-400 uppercase">Funcionário</th>
                        <th className="p-3 font-black text-[10px] text-slate-400 uppercase">Data</th>
                        <th className="p-3 font-black text-[10px] text-slate-400 uppercase">1ª Entrada</th>
                        <th className="p-3 font-black text-[10px] text-slate-400 uppercase">1ª Saída</th>
                        <th className="p-3 font-black text-[10px] text-slate-400 uppercase">2ª Entrada</th>
                        <th className="p-3 font-black text-[10px] text-slate-400 uppercase">2ª Saída</th>
                        <th className="p-3 font-black text-[10px] text-slate-400 uppercase">Horas</th>
                        <th className="p-3 font-black text-[10px] text-slate-400 uppercase">Extras</th>
                        <th className="p-3 font-black text-[10px] text-slate-400 uppercase">Status</th>
                    </tr></thead>
                    <tbody>
                        {pontos.map(p => (
                            <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                                <td className="p-3 font-bold text-slate-700 flex items-center gap-1"><User className="w-3 h-3 text-slate-400" /> {p.funcionarioNome}</td>
                                <td className="p-3 text-slate-500"><Calendar className="w-3 h-3 inline" /> {new Date(p.data).toLocaleDateString('pt-BR')}</td>
                                <td className="p-3 text-slate-600">{p.entrada1 || '—'}</td>
                                <td className="p-3 text-slate-600">{p.saida1 || '—'}</td>
                                <td className="p-3 text-slate-600">{p.entrada2 || '—'}</td>
                                <td className="p-3 text-slate-600">{p.saida2 || '—'}</td>
                                <td className="p-3 font-bold text-slate-700">{Number(p.horasTrabalhadas || 0).toFixed(1)}h</td>
                                <td className="p-3 font-bold text-blue-600">{Number(p.horasExtras || 0).toFixed(1)}h</td>
                                <td className="p-3"><span className={`text-[10px] font-black px-2 py-1 rounded ${statusColor[p.status] || ''}`}>{p.status}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800">Registrar Ponto</h2>
                            <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <select value={form.funcionarioId} onChange={e => setForm({ ...form, funcionarioId: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm">
                            <option value="">Funcionário *</option>
                            {funcionarios.map((f: any) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                        </select>
                        <input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-[10px] text-slate-400 uppercase font-bold">1ª Entrada</label>
                                <input type="time" value={form.entrada1} onChange={e => setForm({ ...form, entrada1: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" /></div>
                            <div><label className="text-[10px] text-slate-400 uppercase font-bold">1ª Saída</label>
                                <input type="time" value={form.saida1} onChange={e => setForm({ ...form, saida1: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-[10px] text-slate-400 uppercase font-bold">2ª Entrada</label>
                                <input type="time" value={form.entrada2} onChange={e => setForm({ ...form, entrada2: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" /></div>
                            <div><label className="text-[10px] text-slate-400 uppercase font-bold">2ª Saída</label>
                                <input type="time" value={form.saida2} onChange={e => setForm({ ...form, saida2: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" /></div>
                        </div>
                        <textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })}
                            placeholder="Observações" rows={2} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
                        <button onClick={handleCreate} disabled={!form.funcionarioId || !form.data}
                            className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-bold text-sm disabled:opacity-50">Salvar Ponto</button>
                    </div>
                </div>
            )}
        </div>
    );
}
