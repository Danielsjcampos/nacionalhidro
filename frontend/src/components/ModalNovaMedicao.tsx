import React, { useState, useEffect, useMemo } from 'react';
import { X, Search } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';

interface ModalNovaMedicaoProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const fmt = (v: any) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);

const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('pt-BR') : '-';

export default function ModalNovaMedicao({ isOpen, onClose, onSuccess }: ModalNovaMedicaoProps) {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // --- DATA ---
    const [clientes, setClientes] = useState<any[]>([]);
    const [propostas, setPropostas] = useState<any[]>([]);
    const [osDisponiveis, setOsDisponiveis] = useState<any[]>([]); // all OSs (precificadas and not)

    // --- FORM STATE ---
    const [selectedClienteId, setSelectedClienteId] = useState('');
    const [searchDataInicio, setSearchDataInicio] = useState('');
    const [searchDataFim, setSearchDataFim] = useState('');
    const [propostaId, setPropostaId] = useState('');
    
    const [selectedOsIds, setSelectedOsIds] = useState<string[]>([]);
    const [empresaId, setEmpresaId] = useState('NACIONAL HIDROSANEAMENTO EIRELI EPP');
    const [contatoId, setContatoId] = useState('');
    const [solicitante, setSolicitante] = useState('');
    const [emailCC, setEmailCC] = useState('');
    const [cte, setCte] = useState(false);
    const [porcentagemRL, setPorcentagemRL] = useState(90);

    const [totalServicoOverride, setTotalServicoOverride] = useState<string>('');
    const [totalHora, setTotalHora] = useState<string>('');
    const [adicional, setAdicional] = useState<string>('');
    const [desconto, setDesconto] = useState<string>('');

    // --- INITIAL FETCH ---
    useEffect(() => {
        if (isOpen) {
            const fetchInitial = async () => {
                try {
                    const cRes = await api.get('/clientes');
                    setClientes(cRes.data);
                } catch (err) {
                    showToast('Erro ao carregar clientes', 'error');
                }
            };
            fetchInitial();
            resetForm();
        }
    }, [isOpen]);

    const resetForm = () => {
        setSelectedClienteId('');
        setSelectedOsIds([]);
        setSearchDataInicio('');
        setSearchDataFim('');
        setPropostaId('');
        setSolicitante('');
        setEmailCC('');
        setCte(false);
        setPorcentagemRL(90);
        setTotalServicoOverride('');
        setTotalHora('');
        setAdicional('');
        setDesconto('');
        setOsDisponiveis([]);
        setPropostas([]);
    };

    // --- FETCH PROPOSTAS ---
    useEffect(() => {
        if (selectedClienteId) {
            api.get('/propostas', { params: { clienteId: selectedClienteId, status: 'ACEITA' } })
               .then(res => setPropostas(res.data?.data || res.data || []))
               .catch(() => setPropostas([]));
            
            const client = clientes.find(c => c.id === selectedClienteId);
            if (client?.porcentagemRL) setPorcentagemRL(Number(client.porcentagemRL));
        } else {
            setPropostas([]);
        }
    }, [selectedClienteId]);

    // --- FETCH OS DISPONÍVEIS ---
    const fetchFilteredOS = async () => {
        if (!selectedClienteId) return;
        setLoading(true);
        try {
            const params: any = { clienteId: selectedClienteId };
            if (searchDataInicio) params.dataInicio = searchDataInicio;
            if (searchDataFim)    params.dataFim    = searchDataFim;
            if (propostaId)       params.propostaId  = propostaId;

            const osRes = await api.get('/medicoes/os-disponiveis', { params });
            // The endpoint returns only status: 'PRECIFICADA' usually, 
            // but we might need non-precificadas as well if the backend was updated.
            // Let's assume it returns what is available.
            setOsDisponiveis(osRes.data);
            setSelectedOsIds([]);
        } catch (err) {
            showToast('Erro ao buscar OS disponíveis', 'error');
        } finally {
            setLoading(false);
        }
    };

    const osPrecificadas = osDisponiveis.filter(os => os.status === 'PRECIFICADA');
    const osNaoPrecificadas = osDisponiveis.filter(os => os.status !== 'PRECIFICADA');

    const handleSelectAllOS = (checked: boolean) => {
        if (checked) {
            setSelectedOsIds(osPrecificadas.map(os => os.id));
        } else {
            setSelectedOsIds([]);
        }
    };

    const toggleOS = (id: string) => {
        setSelectedOsIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    // --- CALCULATIONS ---
    const sumOs = selectedOsIds.reduce((acc, id) => {
        const os = osPrecificadas.find(o => o.id === id);
        return acc + Number(os?.valorPrecificado || 0);
    }, 0);

    const baseServico = totalServicoOverride !== '' ? Number(totalServicoOverride) : sumOs;
    const finalHora = Number(totalHora || 0);
    const finalAdic = Number(adicional || 0);
    const finalDesc = Number(desconto || 0);
    
    const valorTotalCobranca = baseServico + finalHora + finalAdic - finalDesc;

    let valorRL = 0;
    let valorNF = 0;

    if (cte) {
        valorRL = 0;
        valorNF = valorTotalCobranca;
    } else {
        valorRL = valorTotalCobranca * (porcentagemRL / 100);
        valorNF = valorTotalCobranca - valorRL;
    }

    // --- SUBMIT ---
    const handleSave = async () => {
        if (selectedOsIds.length === 0) {
            showToast('Selecione pelo menos uma OS', 'error');
            return;
        }

        setSubmitting(true);
        try {
            await api.post('/medicoes', {
                clienteId: selectedClienteId,
                osIds: selectedOsIds,
                solicitante,
                cte,
                porcentagemRL,
                empresa: empresaId,
                emailCobrancaCC: emailCC,
                contatoId: contatoId || undefined,
                totalServico: totalServicoOverride !== '' ? Number(totalServicoOverride) : undefined,
                totalHora: totalHora !== '' ? Number(totalHora) : undefined,
                adicional: adicional !== '' ? Number(adicional) : undefined,
                desconto: desconto !== '' ? Number(desconto) : undefined,
                tipoDocumento: 'RL'
            });
            showToast('Medição criada com sucesso!', 'success');
            onSuccess();
            onClose();
        } catch (err: any) {
            showToast(err.response?.data?.error || 'Erro ao criar medição', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const clienteSelecionado = clientes.find(c => c.id === selectedClienteId);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-100 w-full max-w-[1400px] h-[90vh] rounded shadow-2xl overflow-hidden flex flex-col">
                
                {/* HEADER */}
                <div className="bg-[#1e3a5f] px-6 py-4 flex items-center justify-between text-white">
                    <h2 className="text-xl font-bold">Criar Nova Medição</h2>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                    
                    {/* FILTERS SECTION */}
                    <div className="flex gap-4 items-end">
                        <div className="flex flex-col gap-1 w-64">
                            <label className="text-xs font-bold text-slate-700">Data</label>
                            <div className="flex items-center gap-2 bg-white border border-slate-300 rounded px-2 py-1.5 shadow-sm">
                                <input type="date" value={searchDataInicio} onChange={e => setSearchDataInicio(e.target.value)} className="text-xs outline-none bg-transparent w-full" />
                                <span className="text-xs text-slate-400">até</span>
                                <input type="date" value={searchDataFim} onChange={e => setSearchDataFim(e.target.value)} className="text-xs outline-none bg-transparent w-full" />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1 flex-1">
                            <label className="text-xs font-bold text-slate-700">Cliente</label>
                            <select 
                                value={selectedClienteId}
                                onChange={e => setSelectedClienteId(e.target.value)}
                                className="bg-white border border-slate-300 rounded px-3 py-2 text-sm outline-none shadow-sm"
                            >
                                <option value="">Selecione...</option>
                                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome || c.razaoSocial}</option>)}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1 flex-1">
                            <label className="text-xs font-bold text-slate-700">Propostas</label>
                            <select 
                                value={propostaId}
                                onChange={e => setPropostaId(e.target.value)}
                                className="bg-white border border-slate-300 rounded px-3 py-2 text-sm outline-none shadow-sm"
                            >
                                <option value="">Selecione...</option>
                                {propostas.map(p => <option key={p.id} value={p.id}>{p.codigo || 'S/C'}</option>)}
                            </select>
                        </div>

                        <button 
                            onClick={fetchFilteredOS}
                            disabled={!selectedClienteId || loading}
                            className="bg-[#1e3a5f] hover:bg-blue-900 text-white px-6 py-2 rounded text-sm font-bold shadow flex items-center gap-2 disabled:opacity-50"
                        >
                            {loading ? <Search className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                            Buscar OS's
                        </button>
                    </div>

                    {/* OS LISTS SECTION */}
                    <div className="grid grid-cols-2 gap-6 min-h-[250px]">
                        {/* PRECIFICADAS */}
                        <div className="bg-white border border-slate-200 rounded shadow-sm p-4 flex flex-col">
                            <h3 className="text-sm font-bold text-emerald-600 mb-2">- OS's Precificadas {clienteSelecionado?.nome && `| ${clienteSelecionado.nome}`}</h3>
                            
                            <div className="flex items-center gap-2 mb-3 px-2">
                                <input 
                                    type="checkbox" 
                                    checked={osPrecificadas.length > 0 && selectedOsIds.length === osPrecificadas.length}
                                    onChange={(e) => handleSelectAllOS(e.target.checked)}
                                    className="w-4 h-4 cursor-pointer"
                                />
                                <span className="text-xs font-bold text-slate-600">Selecionar tudo</span>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-2">
                                {osPrecificadas.length === 0 ? (
                                    <div className="text-xs text-slate-400 italic py-4">Nenhuma OS precificada encontrada.</div>
                                ) : osPrecificadas.map(os => (
                                    <div key={os.id} className="flex items-start gap-3 p-2 hover:bg-slate-50 rounded border-b border-slate-100 last:border-0">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedOsIds.includes(os.id)}
                                            onChange={() => toggleOS(os.id)}
                                            className="w-4 h-4 mt-1 cursor-pointer"
                                        />
                                        <div className="flex-1 grid grid-cols-6 gap-2 text-[10px]">
                                            <div className="flex flex-col"><span className="text-slate-500 font-bold">Código</span><span className="font-bold text-slate-800">{os.codigo}</span></div>
                                            <div className="flex flex-col col-span-2"><span className="text-slate-500 font-bold">Cliente</span><span className="truncate">{os.cliente?.nome || '-'}</span></div>
                                            <div className="flex flex-col"><span className="text-slate-500 font-bold">Contato</span><span className="truncate">{os.contato || '-'}</span></div>
                                            <div className="flex flex-col"><span className="text-slate-500 font-bold">Equipamento</span><span className="truncate">{os.equipamento?.nome || 'Manual'}</span></div>
                                            <div className="flex flex-col"><span className="text-slate-500 font-bold">Data</span><span>{fmtDate(os.dataInicial)}</span></div>
                                        </div>
                                        <div className="flex flex-col text-right">
                                            <span className="text-[10px] text-slate-500 font-bold">Valor Total</span>
                                            <span className="text-xs font-bold text-slate-800">{fmt(os.valorPrecificado)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* NÃO PRECIFICADAS */}
                        <div className="bg-white border border-slate-200 rounded shadow-sm p-4 flex flex-col opacity-60">
                            <h3 className="text-sm font-bold text-red-500 mb-2">+ OS's não Precificadas {clienteSelecionado?.nome && `| ${clienteSelecionado.nome}`}</h3>
                            <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-2">
                                {osNaoPrecificadas.length === 0 ? (
                                    <div className="text-xs text-slate-400 italic py-4">Nenhuma OS pendente encontrada.</div>
                                ) : osNaoPrecificadas.map(os => (
                                    <div key={os.id} className="flex items-start gap-3 p-2 rounded border-b border-slate-100 last:border-0">
                                        <div className="flex-1 grid grid-cols-6 gap-2 text-[10px]">
                                            <div className="flex flex-col"><span className="text-slate-500 font-bold">Código</span><span className="font-bold text-slate-800">{os.codigo}</span></div>
                                            <div className="flex flex-col col-span-2"><span className="text-slate-500 font-bold">Cliente</span><span className="truncate">{os.cliente?.nome || '-'}</span></div>
                                            <div className="flex flex-col"><span className="text-slate-500 font-bold">Contato</span><span className="truncate">{os.contato || '-'}</span></div>
                                            <div className="flex flex-col"><span className="text-slate-500 font-bold">Equipamento</span><span className="truncate">{os.equipamento?.nome || '-'}</span></div>
                                            <div className="flex flex-col"><span className="text-slate-500 font-bold">Data</span><span>{fmtDate(os.dataInicial)}</span></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* DETAILS AND VALUES SECTION */}
                    <div className="grid grid-cols-2 gap-6 mt-4">
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-slate-700">Empresa</label>
                                <select 
                                    value={empresaId}
                                    onChange={e => setEmpresaId(e.target.value)}
                                    className="bg-white border border-slate-300 rounded px-3 py-2 text-sm outline-none shadow-sm"
                                >
                                    <option value="NACIONAL HIDROSANEAMENTO EIRELI EPP">NACIONAL HIDROSANEAMENTO EIRELI EPP</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-slate-700">Contato de Medição</label>
                                <select 
                                    value={contatoId}
                                    onChange={e => setContatoId(e.target.value)}
                                    className="bg-white border border-slate-300 rounded px-3 py-2 text-sm outline-none shadow-sm"
                                >
                                    <option value="">Selecione...</option>
                                    {clienteSelecionado?.contatosList?.map((c: any) => (
                                        <option key={c.id} value={c.id}>{c.nome} - {c.email || 'S/E'}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex flex-col gap-1 flex-1">
                                    <label className="text-xs font-bold text-slate-700">Solicitante (Nome - Email)</label>
                                    <input 
                                        type="text" 
                                        value={solicitante}
                                        onChange={e => setSolicitante(e.target.value)}
                                        className="bg-blue-50 border border-slate-300 rounded px-3 py-2 text-sm outline-none shadow-sm"
                                    />
                                </div>
                                <div className="flex flex-col gap-1 flex-1">
                                    <label className="text-xs font-bold text-slate-700">CC (Separar e-mails com ;)</label>
                                    <input 
                                        type="text" 
                                        value={emailCC}
                                        onChange={e => setEmailCC(e.target.value)}
                                        className="bg-blue-50 border border-slate-300 rounded px-3 py-2 text-sm outline-none shadow-sm"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-slate-700">CTe</label>
                                <select 
                                    value={cte ? 'Sim' : 'Não'}
                                    onChange={e => setCte(e.target.value === 'Sim')}
                                    className="bg-white border border-slate-300 rounded px-3 py-2 text-sm outline-none shadow-sm w-32"
                                >
                                    <option value="Não">Não</option>
                                    <option value="Sim">Sim</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-slate-700">Valor por locação de equipamento</label>
                                <div className="bg-slate-100 border border-slate-200 rounded px-3 py-2 text-sm font-bold text-slate-700">
                                    {fmt(valorRL)}
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex flex-col gap-1 w-48">
                                    <label className="text-xs font-bold text-slate-700">Porcentagem de recibo de locação (%)</label>
                                    <input 
                                        type="number" 
                                        value={porcentagemRL}
                                        onChange={e => setPorcentagemRL(Number(e.target.value))}
                                        className="bg-white border border-slate-300 rounded px-3 py-2 text-sm outline-none shadow-sm"
                                        disabled={cte}
                                    />
                                </div>
                                <div className="flex flex-col gap-1 flex-1">
                                    <label className="text-xs font-bold text-slate-700">Valor por serviço</label>
                                    <div className="bg-slate-100 border border-slate-200 rounded px-3 py-2 text-sm font-bold text-slate-700">
                                        {fmt(valorNF)}
                                    </div>
                                </div>
                            </div>

                            {/* TOTALS SUMMARY */}
                            <div className="bg-white border border-slate-200 rounded shadow-sm p-6 w-80 mt-2 flex flex-col gap-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-600">Total por serviço</span>
                                    <input 
                                        type="number" 
                                        placeholder={sumOs.toString()}
                                        value={totalServicoOverride}
                                        onChange={e => setTotalServicoOverride(e.target.value)}
                                        className="w-24 text-right text-xs font-bold border-b border-slate-300 outline-none focus:border-blue-500 p-1"
                                    />
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-600">Total por hora</span>
                                    <input 
                                        type="number" 
                                        value={totalHora}
                                        onChange={e => setTotalHora(e.target.value)}
                                        className="w-24 text-right text-xs font-bold border-b border-slate-300 outline-none focus:border-blue-500 p-1"
                                    />
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-600">Adicional extra</span>
                                    <input 
                                        type="number" 
                                        value={adicional}
                                        onChange={e => setAdicional(e.target.value)}
                                        className="w-24 text-right text-xs font-bold border-b border-slate-300 outline-none focus:border-blue-500 p-1"
                                    />
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-600">Descontos</span>
                                    <input 
                                        type="number" 
                                        value={desconto}
                                        onChange={e => setDesconto(e.target.value)}
                                        className="w-24 text-right text-xs font-bold border-b border-slate-300 outline-none focus:border-blue-500 p-1"
                                    />
                                </div>
                                
                                <div className="border-t border-slate-200 pt-3 flex justify-between items-center mt-2">
                                    <span className="text-sm font-black text-slate-800">Valor Total da Cobrança</span>
                                    <span className="text-sm font-black text-slate-800">{fmt(valorTotalCobranca)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* FOOTER */}
                <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-end gap-3">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-400 hover:bg-slate-500 text-white rounded text-sm font-bold transition-all"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={submitting}
                        className="px-6 py-2 bg-[#1e3a5f] hover:bg-blue-900 text-white rounded text-sm font-bold shadow transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                        Criar Medição
                    </button>
                </div>
            </div>
        </div>
    );
}
