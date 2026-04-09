import { useEffect, useState } from 'react';
import api from '../services/api';
import { Loader2, Database, Upload, CheckCircle2, AlertCircle } from 'lucide-react';

export default function MigracaoPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [tipo, setTipo] = useState('clientes');
    const [jsonInput, setJsonInput] = useState('');

    useEffect(() => {
        api.get('/migracao/status').then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    const handleImport = async () => {
        try {
            setImporting(true);
            const dados = JSON.parse(jsonInput);
            const r = await api.post('/migracao/importar', { tipo, dados });
            setResult(r.data);
            setJsonInput('');
            // Refresh status
            const s = await api.get('/migracao/status');
            setData(s.data);
        } catch (err: any) {
            setResult({ error: err.message || 'Erro ao importar' });
        } finally { setImporting(false); }
    };

    if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
    if (!data) return null;

    return (
        <div className="h-full flex flex-col space-y-4 overflow-y-auto">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Database className="w-6 h-6 text-blue-500" /> Migração de Dados</h1>
                <p className="text-sm text-slate-500">Importar dados do SIM Antigo e Pipefy</p>
            </div>

            {/* Current status */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h2 className="text-xs font-black text-slate-400 uppercase mb-3">Registros Atuais no Sistema</h2>
                <div className="grid grid-cols-3 gap-3">
                    {Object.entries(data.detalhes).map(([key, val]) => (
                        <div key={key} className="bg-slate-50 rounded-lg p-3 text-center">
                            <p className="text-xl font-black text-slate-700">{val as number}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase">{key}</p>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-slate-500 mt-3">Total: <span className="font-bold">{data.totalRegistros}</span> registros</p>
            </div>

            {/* Migration sources */}
            <div className="grid grid-cols-2 gap-3">
                {data.migracoes.map((m: any) => (
                    <div key={m.fonte} className="bg-white rounded-xl border border-slate-200 p-4">
                        <p className="text-sm font-bold text-slate-800">{m.fonte}</p>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded mt-1 inline-block ${m.status === 'PRONTO' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{m.status}</span>
                        <p className="text-[10px] text-slate-400 mt-1">{m.descricao}</p>
                    </div>
                ))}
            </div>

            {/* Import tool */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                <h2 className="text-xs font-black text-slate-400 uppercase flex items-center gap-1"><Upload className="w-3.5 h-3.5" /> Importar Dados (JSON)</h2>
                <select value={tipo} onChange={e => setTipo(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm">
                    <option value="clientes">Clientes</option>
                    <option value="funcionarios">Funcionários</option>
                    <option value="veiculos">Veículos</option>
                    <option value="fornecedores">Fornecedores</option>
                </select>
                <textarea value={jsonInput} onChange={e => setJsonInput(e.target.value)}
                    placeholder={'[\n  { "nome": "...", "email": "..." },\n  { "nome": "...", "cnpj": "..." }\n]'}
                    rows={6} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm font-mono" />
                <button onClick={handleImport} disabled={!jsonInput || importing}
                    className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 disabled:opacity-50">
                    {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {importing ? 'Importando...' : 'Importar Dados'}
                </button>
                {result && (
                    <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${result.error ? 'bg-slate-50 text-slate-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {result.error ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                        {result.error ? result.error : `Importados: ${result.importados} | Erros: ${result.erros} | Total: ${result.total}`}
                    </div>
                )}
            </div>
        </div>
    );
}
