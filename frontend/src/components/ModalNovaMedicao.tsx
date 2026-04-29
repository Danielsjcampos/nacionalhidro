import React, { useState, useEffect, useCallback } from 'react';
import { 
    X, Search, Filter, CheckCircle2, ChevronRight, ChevronLeft, 
    Calculator, Mail, Info, Plus, Trash2, FileText, AlertTriangle, 
    Package 
} from 'lucide-react';
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
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // --- DATA ---
    const [clientes, setClientes] = useState<any[]>([]);
    const [vendedores, setVendedores] = useState<any[]>([]);
    const [centrosCusto, setCentrosCusto] = useState<any[]>([]);
    const [propostas, setPropostas] = useState<any[]>([]);
    const [osProntas, setOsProntas] = useState<any[]>([]);

    // --- FORM STATE ---
    const [selectedClienteId, setSelectedClienteId] = useState('');
    const [searchDataInicio, setSearchDataInicio] = useState('');
    const [searchDataFim, setSearchDataFim] = useState('');
    const [propostaId, setPropostaId] = useState('');
    
    const [selectedOsIds, setSelectedOsIds] = useState<string[]>([]);
    const [empresaId, setEmpresaId] = useState('NACIONAL HIDROSANEAMENTO EIRELI EPP');
    const [contatoId, setContatoId] = useState('');
    const [vendedorId, setVendedorId] = useState('');
    const [solicitante, setSolicitante] = useState('');
    const [acompanhante, setAcompanhante] = useState('');
    const [emailCC, setEmailCC] = useState('');
    const [cte, setCte] = useState(false);
    const [porcentagemRL, setPorcentagemRL] = useState(90);
    const [periodo, setPeriodo] = useState('');
    const [cnpjFaturamento, setCnpjFaturamento] = useState('');
    const [tipoDocumento, setTipoDocumento] = useState('RL');
    const [subitens, setSubitens] = useState<any[]>([]);

    // --- INITIAL FETCH ---
    useEffect(() => {
        if (isOpen) {
            const fetchInitial = async () => {
                try {
                    const [cRes, uRes, ccRes] = await Promise.all([
                        api.get('/clientes'),
                        api.get('/equipe/vendedores'),
                        api.get('/centros-custo')
                    ]);
                    setClientes(cRes.data);
                    setVendedores(uRes.data);
                    setCentrosCusto(ccRes.data || []);
                } catch (err) {
                    showToast('Erro ao carregar dados iniciais', 'error');
                }
            };
            fetchInitial();
            resetForm();
        }
    }, [isOpen]);

    const resetForm = () => {
        setStep(1);
        setSelectedClienteId('');
        setSelectedOsIds([]);
        setSearchDataInicio('');
        setSearchDataFim('');
        setPropostaId('');
        setSolicitante('');
        setAcompanhante('');
        setEmailCC('');
        setCte(false);
        setPorcentagemRL(90);
        setSubitens([]);
        setPeriodo('');
        setVendedorId('');
    };

    // --- FETCH OS DISPONÍVEIS ---
    const fetchFilteredOS = async () => {
        if (!selectedClienteId) return;
        setLoading(true);
        try {
            const params: any = { clienteId: selectedClienteId };
            if (searchDataInicio) params.dataInicio = searchDataInicio;
            if (searchDataFim)    params.dataFim    = searchDataFim;
            if (propostaId)       params.propostaId  = propostaId;

            const [osRes, propRes] = await Promise.all([
                api.get('/medicoes/os-disponiveis', { params }),
                api.get('/propostas', { params: { clienteId: selectedClienteId, status: 'ACEITA' } }).catch(() => ({ data: { data: [] } }))
            ]);
            setOsProntas(osRes.data);
            setPropostas(propRes.data?.data || propRes.data || []);
            setStep(2);
        } catch (err) {
            showToast('Erro ao buscar OS disponíveis', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAllOS = (checked: boolean) => {
        if (checked) {
            const pricedIds = osProntas.filter(os => os.status === 'PRECIFICADA').map(os => os.id);
            setSelectedOsIds(pricedIds);
        } else {
            setSelectedOsIds([]);
        }
    };

    const toggleOS = (id: string, status: string) => {
        if (status !== 'PRECIFICADA') {
            showToast('Apenas OS precificadas podem ser incluídas na medição', 'warning');
            return;
        }
        setSelectedOsIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleAddSubitem = () => {
        setSubitens([...subitens, { id: Math.random().toString(36).substring(2, 9), descricao: '', valor: 0, centroCustoId: '' }]);
    };

    const removeSubitem = (id: string) => {
        setSubitens(subitens.filter(s => s.id !== id));
    };

    const updateSubitem = (id: string, field: string, value: any) => {
        setSubitens(subitens.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    // --- CALCULATIONS ---
    const calculateTotals = () => {
        const selectedOSObjects = osProntas.filter(os => selectedOsIds.includes(os.id));
        const osTotal = selectedOSObjects.reduce((acc, os) => acc + Number(os.valorPrecificado || 0), 0);
        const subtotalSubitens = subitens.reduce((acc, item) => acc + Number(item.valor || 0), 0);
        const total = osTotal + subtotalSubitens;

        let valorRL = 0;
        let valorNF = 0;

        if (cte) {
            valorRL = 0;
            valorNF = total;
        } else {
            valorRL = total * (porcentagemRL / 100);
            valorNF = total - valorRL;
        }

        return { osTotal, subtotalSubitens, total, valorRL, valorNF };
    };

    const totals = calculateTotals();

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
                periodo,
                solicitante,
                acompanhante,
                vendedorId,
                subitens,
                tipoDocumento,
                empresa: empresaId,
                emailCobrancaCC: emailCC,
                contatoId,
                propostaId,
                cnpjFaturamento,
                cte,
                porcentagemRL
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#f8fafc] w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-white/20 animate-in zoom-in-95 duration-200">
                
                {/* HEADER */}
                <div className="bg-[#1e3a5f] p-6 text-white flex items-center justify-between border-b border-white/10 relative">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-white/10 shadow-inner">
                            <FileText className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tighter">Criar Nova Medição</h2>
                            <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest mt-0.5">Wizard de Faturamento e Rateio</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="hover:bg-white/10 p-2 rounded-xl transition-all active:scale-95"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    
                    {/* PROGRESS BAR */}
                    <div className="absolute bottom-0 left-0 h-1 bg-blue-500 transition-all duration-500" style={{ width: `${(step / 4) * 100}%` }}></div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    
                    {/* STEP 1: CONTEXTO */}
                    {step === 1 && (
                        <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-300">
                            <div className="text-center space-y-2">
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Qual o contexto da medição?</h3>
                                <p className="text-slate-400 text-sm font-medium">Selecione o cliente e o período das ordens de serviço.</p>
                            </div>

                            <div className="grid gap-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest transition-colors group-focus-within:text-blue-500">Cliente</label>
                                    <select 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                                        value={selectedClienteId}
                                        onChange={(e) => {
                                            const cId = e.target.value;
                                            setSelectedClienteId(cId);
                                            const client = clientes.find(c => c.id === cId);
                                            if (client?.porcentagemRL) setPorcentagemRL(Number(client.porcentagemRL));
                                        }}
                                    >
                                        <option value="">Selecione o Cliente</option>
                                        {clientes.map(c => <option key={c.id} value={c.id}>{c.nome || c.razaoSocial}</option>)}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Início</label>
                                        <input 
                                            type="date" 
                                            value={searchDataInicio}
                                            onChange={e => setSearchDataInicio(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-blue-500 transition-all" 
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Fim</label>
                                        <input 
                                            type="date" 
                                            value={searchDataFim}
                                            onChange={e => setSearchDataFim(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-blue-500 transition-all" 
                                        />
                                    </div>
                                </div>

                                <button 
                                    onClick={fetchFilteredOS}
                                    disabled={!selectedClienteId || loading}
                                    className="w-full bg-[#1e3a5f] hover:bg-slate-700 disabled:bg-slate-300 text-white p-4 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-blue-900/10 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                                >
                                    {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search className="w-5 h-5" />}
                                    Buscar Ordens de Serviço
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: SELEÇÃO DE OS */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                                        <Filter className="w-5 h-5 text-blue-500" />
                                        Selecione as Ordens de Serviço
                                    </h3>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-0.5">{clienteSelecionado?.nome}</p>
                                </div>
                                <div className="flex bg-slate-100 p-1 rounded-xl">
                                    <button 
                                        onClick={() => handleSelectAllOS(true)}
                                        className="px-4 py-2 text-[10px] font-black uppercase hover:bg-white rounded-lg transition-all"
                                    >
                                        Selecionar Tudo
                                    </button>
                                    <button 
                                        onClick={() => handleSelectAllOS(false)}
                                        className="px-4 py-2 text-[10px] font-black uppercase hover:bg-white rounded-lg transition-all"
                                    >
                                        Desmarcar
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {osProntas.length === 0 ? (
                                    <div className="bg-white p-10 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center text-slate-400 italic font-medium">
                                        Nenhuma OS disponível para faturamento neste período.
                                    </div>
                                ) : osProntas.map(os => (
                                    <div 
                                        key={os.id}
                                        onClick={() => toggleOS(os.id, os.status)}
                                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer group flex items-center gap-4 ${
                                            selectedOsIds.includes(os.id) 
                                            ? 'border-blue-500 bg-blue-50/50' 
                                            : os.status === 'PRECIFICADA' ? 'border-white bg-white hover:border-slate-200' : 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
                                        }`}
                                    >
                                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all ${
                                            selectedOsIds.includes(os.id) ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white border-slate-200'
                                        }`}>
                                            {selectedOsIds.includes(os.id) && <CheckCircle2 className="w-4 h-4" />}
                                        </div>
                                        <div className="flex-1 grid grid-cols-5 gap-4 items-center">
                                            <div className="col-span-1">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Código</span>
                                                <span className="text-sm font-black text-slate-700">{os.codigo}</span>
                                            </div>
                                            <div className="col-span-1">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Data</span>
                                                <span className="text-sm font-bold text-slate-600">{fmtDate(os.dataInicial)}</span>
                                            </div>
                                            <div className="col-span-2">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Equipamento</span>
                                                <span className="text-sm font-bold text-slate-600 truncate block">{os.equipamento?.nome || 'Manual'}</span>
                                            </div>
                                            <div className="col-span-1 text-right">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Valor</span>
                                                <span className={`text-sm font-black ${os.status === 'PRECIFICADA' ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                    {os.status === 'PRECIFICADA' ? fmt(os.valorPrecificado) : 'Não Precificada'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* STEP 3: DETALHES DE FATURAMENTO */}
                    {step === 3 && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-blue-600 shadow-sm">
                                    <Info className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-blue-900 uppercase">Configurações de Faturamento</h4>
                                    <p className="text-blue-700/70 text-xs font-bold leading-relaxed mt-1">Defina a filial, o contato responsável e como os valores serão divididos entre Recibo de Locação e Nota de Serviço.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8 bg-white p-8 rounded-3xl border border-slate-200">
                                <div className="space-y-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filial / Empresa</label>
                                        <select 
                                            value={empresaId}
                                            onChange={e => setEmpresaId(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-blue-500 transition-all"
                                        >
                                            <option value="NACIONAL HIDROSANEAMENTO EIRELI EPP">NACIONAL HIDROSANEAMENTO EIRELI EPP</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contato de Medição</label>
                                        <select 
                                            value={contatoId}
                                            onChange={e => setContatoId(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-blue-500 transition-all"
                                        >
                                            <option value="">Nenhum / Selecione</option>
                                            {clienteSelecionado?.contatosList?.map((c: any) => (
                                                <option key={c.id} value={c.id}>{c.nome} - {c.email || 'S/E'}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Solicitante</label>
                                        <input 
                                            type="text" 
                                            value={solicitante}
                                            onChange={e => setSolicitante(e.target.value)}
                                            placeholder="Ex: João da Silva"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-blue-500 transition-all" 
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendedor</label>
                                        <select 
                                            value={vendedorId}
                                            onChange={e => setVendedorId(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-blue-500 transition-all"
                                        >
                                            <option value="">Selecione o Vendedor</option>
                                            {vendedores.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${cte ? 'bg-blue-600 text-white' : 'bg-white text-slate-300'}`}>
                                                <FileText className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h5 className="text-xs font-black uppercase text-slate-700 tracking-tight">Utilizar CTe</h5>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">Faturamento 100% via Transporte</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setCte(!cte)}
                                            className={`w-12 h-6 rounded-full relative transition-all duration-300 ${cte ? 'bg-blue-600' : 'bg-slate-300'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${cte ? 'left-7' : 'left-1'}`}></div>
                                        </button>
                                    </div>

                                    {!cte && (
                                        <div className="space-y-4 p-6 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center justify-between">
                                                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Doc. Não-Fiscal</h5>
                                                    <span className="text-sm font-black text-emerald-600">{porcentagemRL}%</span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                                                        <input type="radio" value="RL" checked={tipoDocumento === 'RL'} onChange={() => setTipoDocumento('RL')} className="accent-emerald-600" />
                                                        Recibo de Locação (RL)
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                                                        <input type="radio" value="ND" checked={tipoDocumento === 'ND'} onChange={() => setTipoDocumento('ND')} className="accent-emerald-600" />
                                                        Nota de Débito (ND)
                                                    </label>
                                                </div>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="0" max="100" step="1"
                                                value={porcentagemRL}
                                                onChange={e => setPorcentagemRL(Number(e.target.value))}
                                                className="w-full accent-emerald-500 h-1.5 bg-emerald-200 rounded-lg appearance-none cursor-pointer"
                                            />
                                            <div className="flex justify-between text-[9px] font-black text-emerald-600/50 uppercase">
                                                <span>NF Serviço</span>
                                                <span>Recibo Locação</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">E-mails em Cópia (CC)</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                            <input 
                                                type="text" 
                                                value={emailCC}
                                                onChange={e => setEmailCC(e.target.value)}
                                                placeholder="email1@ex.com; email2@ex.com"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-10 text-xs font-bold outline-none focus:border-blue-500 transition-all placeholder:text-slate-300" 
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: SUBITENS & RESUMO */}
                    {step === 4 && (
                        <div className="grid grid-cols-3 gap-8 animate-in fade-in duration-300 h-full">
                            
                            {/* SUBITENS PANEL */}
                            <div className="col-span-2 flex flex-col gap-6">
                                <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                    <div>
                                        <h3 className="text-lg font-black text-slate-800 tracking-tight">Itens Adicionais</h3>
                                        <p className="text-slate-400 text-xs font-bold uppercase mt-0.5">Custos extras ou taxas manuais</p>
                                    </div>
                                    <button 
                                        onClick={handleAddSubitem}
                                        className="bg-blue-600 hover:bg-blue-700 text-white p-2 px-6 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all active:scale-95"
                                    >
                                        <Plus className="w-4 h-4" /> Adicionar Item
                                    </button>
                                </div>

                                <div className="flex-1 space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {subitens.length === 0 ? (
                                        <div className="p-10 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center gap-3 text-slate-300 italic font-medium">
                                            <Package className="w-8 h-8 opacity-20" />
                                            Nenhum item adicional nesta medição.
                                        </div>
                                    ) : subitens.map(sub => (
                                        <div key={sub.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-12 gap-4 items-center group transition-all hover:border-blue-200">
                                            <div className="col-span-6 space-y-1">
                                                <label className="text-[9px] font-black text-slate-400 uppercase">Descrição</label>
                                                <input 
                                                    type="text" 
                                                    value={sub.descricao}
                                                    onChange={e => updateSubitem(sub.id, 'descricao', e.target.value)}
                                                    className="w-full bg-slate-50 p-2 text-xs font-bold rounded-lg outline-none border border-transparent focus:border-blue-500 transition-all"
                                                />
                                            </div>
                                            <div className="col-span-3 space-y-1">
                                                <label className="text-[9px] font-black text-slate-400 uppercase">Valor</label>
                                                <input 
                                                    type="number" 
                                                    value={sub.valor}
                                                    onChange={e => updateSubitem(sub.id, 'valor', e.target.value)}
                                                    className="w-full bg-slate-50 p-2 text-xs font-bold rounded-lg outline-none border border-transparent focus:border-blue-500 transition-all"
                                                />
                                            </div>
                                            <div className="col-span-2 space-y-1">
                                                <label className="text-[9px] font-black text-slate-400 uppercase">C. Custo</label>
                                                <select 
                                                    value={sub.centroCustoId}
                                                    onChange={e => updateSubitem(sub.id, 'centroCustoId', e.target.value)}
                                                    className="w-full bg-slate-50 p-2 text-[10px] font-bold rounded-lg outline-none border border-transparent focus:border-blue-500 transition-all"
                                                >
                                                    <option value="">Selecione</option>
                                                    {centrosCusto.map(cc => <option key={cc.id} value={cc.id}>{cc.nome}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-span-1 flex justify-end pt-5">
                                                <button 
                                                    onClick={() => removeSubitem(sub.id)}
                                                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* SUMMARY SIDEBAR */}
                            <div className="col-span-1 space-y-6">
                                <div className="bg-[#1e3a5f] rounded-3xl p-6 text-white shadow-xl shadow-blue-900/20 flex flex-col gap-6 relative overflow-hidden">
                                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-white/50 border-b border-white/10 pb-4">Resumo do Rateio</h4>
                                    
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-white/60">Total OS ({selectedOsIds.length})</span>
                                            <span className="text-sm font-black">{fmt(totals.osTotal)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-white/60">Itens Adicionais</span>
                                            <span className="text-sm font-black">{fmt(totals.subtotalSubitens)}</span>
                                        </div>
                                        <div className="pt-4 mt-4 border-t border-white/10 flex justify-between items-center">
                                            <span className="text-sm font-black uppercase">Valor Total</span>
                                            <span className="text-2xl font-black text-blue-400">{fmt(totals.total)}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 mt-4">
                                        <div className={`p-4 rounded-2xl flex flex-col gap-1 transition-all ${cte ? 'bg-white/10 opacity-50' : 'bg-emerald-500/20 border border-emerald-500/30'}`}>
                                            <span className="text-[9px] font-black uppercase text-emerald-400">Recibo Locação (RL)</span>
                                            <span className="text-lg font-black text-emerald-100">{fmt(totals.valorRL)}</span>
                                            <span className="text-[8px] font-bold text-white/40 italic">{porcentagemRL}% do faturamento bruto</span>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex flex-col gap-1">
                                            <span className="text-[9px] font-black uppercase text-blue-400">Nota Fiscal Serviço (NFS-e)</span>
                                            <span className="text-lg font-black text-blue-100">{fmt(totals.valorNF)}</span>
                                            
                                            {totals.valorNF > 0 && (
                                                <div className="mt-2 space-y-1 border-t border-blue-500/20 pt-2">
                                                    <div className="flex justify-between text-[9px] font-bold text-white/50">
                                                        <span>PIS/COF/CSLL/IR (5.65%)</span>
                                                        <span>- {fmt(totals.valorNF * 0.0565)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-[9px] font-bold text-white/50">
                                                        <span>INSS (3.5%)</span>
                                                        <span>- {fmt(totals.valorNF * 0.035)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-[9px] font-bold text-white/50">
                                                        <span>ISS (2%)</span>
                                                        <span>- {fmt(totals.valorNF * 0.02)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-[9px] font-black text-blue-300 mt-1 border-t border-blue-500/10 pt-1">
                                                        <span>ESTIMADO LÍQUIDO</span>
                                                        <span>{fmt(totals.valorNF * (1 - 0.0565 - 0.035 - 0.02))}</span>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            <span className="text-[8px] font-bold text-white/40 italic mt-1">{cte ? 'Faturamento via CTe habilitado' : `${100 - porcentagemRL}% do faturamento bruto`}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100 flex gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-orange-600 shadow-sm shrink-0">
                                        <AlertTriangle className="w-5 h-5" />
                                    </div>
                                    <p className="text-[10px] font-bold text-orange-900/70 leading-relaxed">
                                        Ao finalizar, a medição entrará em status <span className="font-black text-orange-950">EM_ABERTO</span> e os faturamentos de rateio serão bloqueados para edição até que a medição seja validada.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div className="p-8 bg-white border-t border-slate-200 flex items-center justify-between">
                    <div className="flex gap-3">
                        {step > 1 && (
                            <button 
                                onClick={() => setStep(step - 1)}
                                className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-2"
                            >
                                <ChevronLeft className="w-4 h-4" /> Voltar
                            </button>
                        )}
                        <button 
                            onClick={onClose}
                            className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all"
                        >
                            Cancelar
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        {step < 4 ? (
                            <button 
                                onClick={() => {
                                    if (step === 1 && !selectedClienteId) return showToast('Selecione um cliente', 'warning');
                                    if (step === 2 && selectedOsIds.length === 0) return showToast('Selecione pelo menos uma OS', 'warning');
                                    setStep(step + 1);
                                }}
                                className="px-10 py-4 bg-[#1e3a5f] hover:bg-slate-700 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-blue-900/10 flex items-center gap-2 transition-all active:scale-[0.98]"
                            >
                                Continuar <ChevronRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button 
                                onClick={handleSave}
                                disabled={submitting}
                                className="px-10 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-blue-900/10 flex items-center gap-2 transition-all active:scale-[0.98]"
                            >
                                {submitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Calculator className="w-5 h-5" />}
                                Finalizar Medição
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

