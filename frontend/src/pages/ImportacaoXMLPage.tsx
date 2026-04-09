import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import {
    Loader2, Upload, FileText, CheckCircle2, AlertTriangle, X,
    Package, Truck, DollarSign, Building2, FileUp, History
} from 'lucide-react';

type Tab = 'importar' | 'historico';

export default function ImportacaoXMLPage() {
    const [tab, setTab] = useState<Tab>('importar');
    const [loading, setLoading] = useState(false);
    const [nfe, setNfe] = useState<any>(null);
    const [historico, setHistorico] = useState<any[]>([]);
    const [loadingHist, setLoadingHist] = useState(false);
    const [importResult, setImportResult] = useState<any>(null);
    const [error, setError] = useState('');

    // Classification selects
    const [planoContasList, setPlanoContasList] = useState<any[]>([]);
    const [contasBancarias, setContasBancarias] = useState<any[]>([]);
    const [planoContasId, setPlanoContasId] = useState('');
    const [contaBancariaId, setContaBancariaId] = useState('');
    const [centroCusto, setCentroCusto] = useState('');
    const [categoria, setCategoria] = useState('MATERIAL');

    useEffect(() => {
        Promise.all([
            api.get('/plano-contas/flat').catch(() => ({ data: [] })),
            api.get('/contas-bancarias').catch(() => ({ data: [] })),
        ]).then(([pc, cb]) => {
            setPlanoContasList(pc.data.filter((p: any) => p.tipo === 'ANALITICA'));
            setContasBancarias(cb.data);
        });
    }, []);

    const fetchHistorico = useCallback(async () => {
        try {
            setLoadingHist(true);
            const res = await api.get('/importacao-xml/historico');
            setHistorico(res.data);
        } catch (err) { console.error(err); }
        finally { setLoadingHist(false); }
    }, []);

    useEffect(() => { if (tab === 'historico') fetchHistorico(); }, [tab, fetchHistorico]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.xml')) {
            setError('Selecione um arquivo XML válido');
            return;
        }

        setLoading(true);
        setError('');
        setNfe(null);
        setImportResult(null);

        const formData = new FormData();
        formData.append('xml', file);

        try {
            const res = await api.post('/importacao-xml/parse', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setNfe(res.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao processar XML');
        }
        finally { setLoading(false); }
    };

    const handleImportar = async () => {
        if (!nfe) return;
        setLoading(true);
        setError('');

        try {
            const res = await api.post('/importacao-xml/importar', {
                nfe,
                planoContasId: planoContasId || undefined,
                contaBancariaId: contaBancariaId || undefined,
                centroCusto: centroCusto || undefined,
                categoria,
            });
            setImportResult(res.data);
            setNfe(null);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao importar');
        }
        finally { setLoading(false); }
    };

    const fmt = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
    const fmtQtd = (v: number) => v % 1 === 0 ? v.toString() : v.toFixed(3);

    return (
        <div className="h-full flex flex-col space-y-4 overflow-hidden">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Importação XML NF-e</h1>
                    <p className="text-sm text-slate-500">Upload de notas fiscais eletrônicas de fornecedores</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
                <button onClick={() => setTab('importar')} className={`px-4 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 ${tab === 'importar' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>
                    <FileUp className="w-3.5 h-3.5" /> Importar XML
                </button>
                <button onClick={() => setTab('historico')} className={`px-4 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 ${tab === 'historico' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>
                    <History className="w-3.5 h-3.5" /> Histórico
                </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
                {tab === 'importar' && (
                    <>
                        {/* Upload Area */}
                        {!nfe && !importResult && (
                            <div className="bg-white rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 transition-colors">
                                <label className="flex flex-col items-center justify-center py-16 cursor-pointer">
                                    <input type="file" accept=".xml" onChange={handleFileUpload} className="hidden" />
                                    {loading ? (
                                        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                                    ) : (
                                        <>
                                            <Upload className="w-12 h-12 text-slate-300 mb-3" />
                                            <p className="text-sm font-bold text-slate-600">Clique para selecionar o XML da NF-e</p>
                                            <p className="text-xs text-slate-400 mt-1">ou arraste o arquivo aqui</p>
                                        </>
                                    )}
                                </label>
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-red-700">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                {error}
                                <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
                            </div>
                        )}

                        {/* Import Result */}
                        {importResult && (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                    <div>
                                        <p className="text-lg font-bold text-emerald-700">{importResult.message}</p>
                                        <p className="text-xs text-emerald-600">{importResult.contasCriadas} título(s) criado(s) no Contas a Pagar</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => { setImportResult(null); setNfe(null); }} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold">
                                        Importar Outro XML
                                    </button>
                                    <a href="/financeiro" className="bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-bold">
                                        Ver Contas a Pagar
                                    </a>
                                </div>
                            </div>
                        )}

                        {/* NF-e Preview */}
                        {nfe && (
                            <div className="space-y-4">
                                {/* Already imported warning */}
                                {nfe.jaImportada && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-amber-700">
                                        <AlertTriangle className="w-4 h-4" />
                                        <span className="font-bold">Esta NF-e já foi importada anteriormente!</span>
                                    </div>
                                )}

                                {/* Header + Emitente */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <FileText className="w-5 h-5 text-blue-500" />
                                            <h2 className="text-sm font-black text-slate-700 uppercase">Dados da NF-e</h2>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div><span className="text-slate-400 block text-[10px]">Número</span><span className="font-bold text-slate-700">{nfe.numero}</span></div>
                                            <div><span className="text-slate-400 block text-[10px]">Série</span><span className="font-bold text-slate-700">{nfe.serie}</span></div>
                                            <div><span className="text-slate-400 block text-[10px]">Emissão</span><span className="font-bold text-slate-700">{fmtDate(nfe.dataEmissao)}</span></div>
                                            <div><span className="text-slate-400 block text-[10px]">Valor Total</span><span className="font-bold text-emerald-600 text-base">{fmt(nfe.totais.valorNF)}</span></div>
                                        </div>
                                        {nfe.chaveAcesso && (
                                            <div className="mt-2 pt-2 border-t border-slate-100">
                                                <span className="text-[9px] text-slate-400 block">Chave</span>
                                                <span className="text-[9px] font-mono text-slate-500 break-all">{nfe.chaveAcesso}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Building2 className="w-5 h-5 text-amber-500" />
                                            <h2 className="text-sm font-black text-slate-700 uppercase">Emitente (Fornecedor)</h2>
                                        </div>
                                        <div className="space-y-1 text-xs">
                                            <p className="font-bold text-slate-700">{nfe.emitente.razaoSocial}</p>
                                            {nfe.emitente.nomeFantasia && <p className="text-slate-500">{nfe.emitente.nomeFantasia}</p>}
                                            <p className="text-slate-400 font-mono">CNPJ: {nfe.emitente.cnpj?.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')}</p>
                                            {nfe.emitente.endereco && <p className="text-slate-400">{nfe.emitente.endereco} — {nfe.emitente.cidade}/{nfe.emitente.uf}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Totais */}
                                <div className="bg-white rounded-xl border border-slate-200 p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <DollarSign className="w-5 h-5 text-emerald-500" />
                                        <h2 className="text-sm font-black text-slate-700 uppercase">Totais</h2>
                                    </div>
                                    <div className="grid grid-cols-5 gap-2">
                                        {[
                                            { label: 'Produtos', value: nfe.totais.valorProdutos, color: 'text-slate-700' },
                                            { label: 'ICMS', value: nfe.totais.valorICMS, color: 'text-amber-600' },
                                            { label: 'IPI', value: nfe.totais.valorIPI, color: 'text-amber-600' },
                                            { label: 'Frete', value: nfe.totais.valorFrete, color: 'text-blue-600' },
                                            { label: 'Total NF', value: nfe.totais.valorNF, color: 'text-emerald-700' },
                                        ].map(t => (
                                            <div key={t.label} className="bg-slate-50 rounded-lg p-2 text-center">
                                                <p className="text-[9px] font-black text-slate-400 uppercase">{t.label}</p>
                                                <p className={`text-sm font-black ${t.color}`}>{fmt(t.value)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Itens */}
                                {nfe.itens.length > 0 && (
                                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                        <div className="flex items-center gap-2 p-4 pb-2">
                                            <Package className="w-5 h-5 text-blue-500" />
                                            <h2 className="text-sm font-black text-slate-700 uppercase">Itens ({nfe.itens.length})</h2>
                                        </div>
                                        <table className="w-full text-[10px]">
                                            <thead>
                                                <tr className="bg-slate-50 text-left">
                                                    <th className="p-2 font-black text-slate-400 uppercase">#</th>
                                                    <th className="p-2 font-black text-slate-400 uppercase">Descrição</th>
                                                    <th className="p-2 font-black text-slate-400 uppercase">NCM</th>
                                                    <th className="p-2 font-black text-slate-400 uppercase">CFOP</th>
                                                    <th className="p-2 font-black text-slate-400 uppercase text-right">Qtd</th>
                                                    <th className="p-2 font-black text-slate-400 uppercase text-right">Unit.</th>
                                                    <th className="p-2 font-black text-slate-400 uppercase text-right">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {nfe.itens.map((item: any, i: number) => (
                                                    <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                                                        <td className="p-2 text-slate-400">{item.numero}</td>
                                                        <td className="p-2 text-slate-700 font-bold max-w-xs truncate">{item.descricao}</td>
                                                        <td className="p-2 text-slate-400 font-mono">{item.ncm}</td>
                                                        <td className="p-2 text-slate-400 font-mono">{item.cfop}</td>
                                                        <td className="p-2 text-right text-slate-600">{fmtQtd(item.quantidade)} {item.unidade}</td>
                                                        <td className="p-2 text-right text-slate-600">{fmt(item.valorUnitario)}</td>
                                                        <td className="p-2 text-right font-bold text-slate-700">{fmt(item.valorTotal)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* Duplicatas (Parcelas) */}
                                {nfe.duplicatas.length > 0 && (
                                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                                        <h2 className="text-sm font-black text-slate-700 uppercase mb-3">Parcelas / Duplicatas ({nfe.duplicatas.length})</h2>
                                        <div className="grid grid-cols-3 gap-2">
                                            {nfe.duplicatas.map((dup: any, i: number) => (
                                                <div key={i} className="bg-slate-50 rounded-lg p-2 flex justify-between items-center">
                                                    <div>
                                                        <span className="text-[9px] text-slate-400 block">Parcela {dup.numero || i + 1}</span>
                                                        <span className="text-xs text-slate-600">{fmtDate(dup.vencimento)}</span>
                                                    </div>
                                                    <span className="text-xs font-black text-slate-700">{fmt(dup.valor)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Transporte */}
                                {nfe.frete.transportadora && (
                                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Truck className="w-5 h-5 text-slate-500" />
                                            <h2 className="text-sm font-black text-slate-700 uppercase">Transporte</h2>
                                        </div>
                                        <div className="text-xs text-slate-600">
                                            <span>{nfe.frete.transportadora}</span>
                                            {nfe.frete.placa && <span className="ml-3 font-mono text-slate-400">Placa: {nfe.frete.placa}</span>}
                                        </div>
                                    </div>
                                )}

                                {/* Classification */}
                                <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 space-y-3">
                                    <h2 className="text-sm font-black text-blue-700 uppercase">Classificação (opcional)</h2>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Plano de Contas</label>
                                            <select value={planoContasId} onChange={e => setPlanoContasId(e.target.value)}
                                                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white">
                                                <option value="">Selecionar...</option>
                                                {planoContasList.map((pc: any) => <option key={pc.id} value={pc.id}>{pc.codigo} - {pc.descricao}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Conta Bancária</label>
                                            <select value={contaBancariaId} onChange={e => setContaBancariaId(e.target.value)}
                                                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white">
                                                <option value="">Selecionar...</option>
                                                {contasBancarias.map((cb: any) => <option key={cb.id} value={cb.id}>{cb.nome} {cb.banco ? `(${cb.banco})` : ''}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Centro de Custo</label>
                                            <input value={centroCusto} onChange={e => setCentroCusto(e.target.value)} placeholder="Ex: Equipamento XYZ"
                                                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Categoria</label>
                                            <select value={categoria} onChange={e => setCategoria(e.target.value)}
                                                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white">
                                                <option value="MATERIAL">Material</option>
                                                <option value="COMBUSTIVEL">Combustível</option>
                                                <option value="MANUTENCAO">Manutenção</option>
                                                <option value="OUTROS">Outros</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Action buttons */}
                                <div className="flex gap-3">
                                    <button onClick={handleImportar} disabled={loading || nfe.jaImportada}
                                        className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-emerald-700 transition-colors">
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                        Importar NF-e → Contas a Pagar
                                    </button>
                                    <button onClick={() => { setNfe(null); setError(''); }}
                                        className="bg-slate-200 text-slate-600 px-6 py-3 rounded-xl font-bold text-sm hover:bg-slate-300 transition-colors">
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {tab === 'historico' && (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        {loadingHist ? (
                            <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
                        ) : historico.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                <FileText className="w-12 h-12 mb-3 opacity-30" />
                                <p className="text-sm font-bold">Nenhuma NF-e importada ainda</p>
                            </div>
                        ) : (
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-slate-50 text-left">
                                        <th className="p-3 font-black text-slate-400 uppercase text-[10px]">NF</th>
                                        <th className="p-3 font-black text-slate-400 uppercase text-[10px]">Fornecedor</th>
                                        <th className="p-3 font-black text-slate-400 uppercase text-[10px]">CNPJ</th>
                                        <th className="p-3 font-black text-slate-400 uppercase text-[10px]">Vencimento</th>
                                        <th className="p-3 font-black text-slate-400 uppercase text-[10px] text-right">Valor</th>
                                        <th className="p-3 font-black text-slate-400 uppercase text-[10px]">Status</th>
                                        <th className="p-3 font-black text-slate-400 uppercase text-[10px]">Importada em</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historico.map((nf: any) => (
                                        <tr key={nf.id} className="border-t border-slate-100 hover:bg-slate-50">
                                            <td className="p-3 font-mono font-bold text-slate-600">{nf.notaFiscal} / {nf.serieNF}</td>
                                            <td className="p-3 text-slate-700">{nf.fornecedor?.nome || '—'}</td>
                                            <td className="p-3 text-slate-400 font-mono text-[10px]">{nf.fornecedor?.cnpj || '—'}</td>
                                            <td className="p-3 text-slate-500">{fmtDate(nf.dataVencimento)}</td>
                                            <td className="p-3 text-right font-bold text-slate-700">{fmt(Number(nf.valorOriginal))}</td>
                                            <td className="p-3">
                                                <span className={`text-[9px] font-black px-2 py-1 rounded-full ${nf.status === 'PAGO' ? 'bg-red-50 text-red-700' : nf.status === 'ABERTO' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                    {nf.status}
                                                </span>
                                            </td>
                                            <td className="p-3 text-slate-400 text-[10px]">{fmtDate(nf.createdAt)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
