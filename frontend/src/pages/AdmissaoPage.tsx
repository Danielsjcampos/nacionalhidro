import { useToast } from '../contexts/ToastContext';
import { useEffect, useState } from 'react';
import api from '../services/api';
import {
    Loader2, Plus, X, User, FileCheck, Stethoscope,
    Building2, FileSignature, CheckCircle2, XCircle, Search, Mail, MessageCircle, Copy, ExternalLink,
    FileText, Printer
} from 'lucide-react';

const ETAPAS = [
    { key: 'ENVIO_DOCUMENTACAO', label: 'Envio Docs', icon: FileCheck, color: 'bg-blue-300' },
    { key: 'CONFERENCIA', label: 'Conferência', icon: FileCheck, color: 'bg-sky-500' },
    { key: 'EXAME_ASO', label: 'Exame ASO', icon: Stethoscope, color: 'bg-blue-600' },
    { key: 'CONTABILIDADE', label: 'Contabilidade', icon: Building2, color: 'bg-indigo-500' },
    { key: 'ASSINATURA_CONTRATO', label: 'Assinatura', icon: FileSignature, color: 'bg-emerald-500' },
    { key: 'CONTRATADO', label: 'Contratado', icon: CheckCircle2, color: 'bg-emerald-700' },
    { key: 'BANCO_TALENTOS', label: 'Banco Talentos', icon: User, color: 'bg-slate-500' },
    { key: 'CANCELADO', label: 'Cancelado', icon: XCircle, color: 'bg-blue-900' },
];

const EMPTY_FORM = {
    nome: '', cargo: '', departamento: '', cpf: '',
    telefone: '', email: '', dataAdmissaoPrevista: ''
};

const CHECKLIST_DOCS = [
    { key: 'rg_cnh', label: 'RG / CNH' },
    { key: 'cpf', label: 'CPF' },
    { key: 'ctps', label: 'CTPS (Frente Verso e Qual. )' },
    { key: 'pis', label: 'PIS / Cartão ou Extrato' },
    { key: 'endereco', label: 'Comprovante de Endereço' },
    { key: 'foto', label: '01 Foto 3x4 recente' },
    { key: 'titulo_eleitor', label: 'Título de Eleitor' },
    { key: 'certidao_civil', label: 'Certidão Nascimento ou Casamento' },
    { key: 'reservista', label: 'Certificado de Reservista' },
    { key: 'escolaridade', label: 'Comprovante de Escolaridade' },
    { key: 'banco', label: 'Comp. de Inclusão Bancária' },
    { key: 'nasc_filhos', label: 'Certidão dos filhos < 14 anos' },
    { key: 'vacina_filhos', label: 'Carteira Vacina Filhos < 7 anos' },
    { key: 'escola_filhos', label: 'Frequência Escolar Filhos 7-14 anos' },
    { key: 'irpf', label: 'Declaração de IR' },
];

export default function AdmissaoPage() {
    const { showToast } = useToast();
    const [admissoes, setAdmissoes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [search, setSearch] = useState('');
    
    // Modals de Ação
    const [showCancelModal, setShowCancelModal] = useState<string | null>(null);
    const [motivoCancelamento, setMotivoCancelamento] = useState('');

    const [showDetail, setShowDetail] = useState<any>(null);
    const [drawerForm, setDrawerForm] = useState<any>({});
    const [checklist, setChecklist] = useState<Record<string, boolean>>({});


    const [candidatosAprovados, setCandidatosAprovados] = useState<any[]>([]);

    const fetchCandidatosAprovados = async () => {
        try {
            const res = await api.get('/recrutamento/candidatos', { params: { etapa: 'ADMITIDO' } });
            // filter out ones that already have an admissao linked
            const admRes = await api.get('/admissoes');
            const admCandidatoIds = new Set(admRes.data.filter((a: any) => a.candidatoId).map((a: any) => a.candidatoId));
            setCandidatosAprovados(res.data.filter((c: any) => !admCandidatoIds.has(c.id)));
        } catch (err) {
            console.error('Failed to fetch candidatos aprovados:', err);
        }
    };

    const fetchAll = async () => {
        try {
            const res = await api.get('/admissoes', { params: search ? { search } : {} });
            setAdmissoes(res.data);
        } catch (err) {
            console.error('Failed to fetch admissoes:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    const handleCreate = async () => {
        try {
            await api.post('/admissoes', form);
            setShowForm(false);
            setForm({ ...EMPTY_FORM });
            fetchAll();
        } catch (err) {
            console.error('Create error:', err);
        }
    };

    const handleMoverEtapaDireto = async (adm: any, novaEtapa: string) => {
        if (adm.etapa === novaEtapa) return;
        
        try {
            await api.patch(`/admissoes/${adm.id}/mover`, { etapa: novaEtapa });
            fetchAll();
            showToast('Etapa atualizada com sucesso', 'success');
        } catch (err) {
            console.error('Move error:', err);
            showToast('Erro ao mover etapa', 'error');
        }
    };

    const handleGeneratePDF = async (id: string, type: 'ficha' | 'aso') => {
        try {
            showToast(`Gerando ${type === 'ficha' ? 'Ficha' : 'Guia ASO'}...`, 'info');
            const endpoint = type === 'ficha' ? 'pdf-ficha' : 'pdf-aso';
            const res = await api.post(`/admissoes/${id}/${endpoint}`);
            
            // Abrir o PDF em nova aba se retornar a URL
            if (res.data.url) {
                const fullUrl = import.meta.env.VITE_API_URL 
                    ? `${import.meta.env.VITE_API_URL.replace('/api', '')}${res.data.url}` 
                    : `http://localhost:3000${res.data.url}`;
                window.open(fullUrl, '_blank');
            }
            
            // Refresh detail to show new doc in list
            const updated = await api.get(`/admissoes/${id}`);
            setShowDetail(updated.data);
            showToast('PDF gerado com sucesso', 'success');
        } catch (err) {
            console.error('PDF Generation error:', err);
            showToast('Erro ao gerar PDF', 'error');
        }
    };

    const handleOpenDrawer = (adm: any) => {
        setChecklist(adm.checklistDocumentos || {});
        setDrawerForm({
            razaoSocial: adm.razaoSocial || '',
            tipoAso: adm.tipoAso || 'Admissional',
            clinicaASO: adm.clinicaASO || '',
            dataAgendamentoExame: adm.dataAgendamentoExame ? adm.dataAgendamentoExame.split('T')[0] : '',
            dataExameASO: adm.dataExameASO ? adm.dataExameASO.split('T')[0] : '',
            foiAprovadoExame: adm.foiAprovadoExame || false,
            validadeAso: adm.validadeAso ? adm.validadeAso.split('T')[0] : '',
            resultadoASO: adm.resultadoASO || 'APTO',
            encaminhamentoExameEnviado: adm.encaminhamentoExameEnviado || false,
            exameToxicologicoAprovado: adm.exameToxicologicoAprovado || 'N/A',
            avaliacaoPsicossocial: adm.avaliacaoPsicossocial || false,
            retornoPsicossocial: adm.retornoPsicossocial || 'N/A',
            dataAdmissaoRegistrada: adm.dataAdmissaoRegistrada ? adm.dataAdmissaoRegistrada.split('T')[0] : '',
            optanteAdiantamentoSalarial: adm.optanteAdiantamentoSalarial || false,
            tipoPagamento: adm.tipoPagamento || 'Mensalista',
            salarioBase: adm.salarioBase || '',
            jornadaTrabalho: adm.jornadaTrabalho || '44 horas',
            numeroRegistroCBO: adm.numeroRegistroCBO || '',
            adicionalInsalubridade: adm.adicionalInsalubridade || 'N/A',
            adicionalAjudaCusto: adm.adicionalAjudaCusto || 'N/A',
            adicionalDuplaFuncao: adm.adicionalDuplaFuncao || 'N/A',
            adicionalAuxilioMoradia: adm.adicionalAuxilioMoradia || 'N/A',
            cidadeMoradia: adm.cidadeMoradia || '',
            optanteValeTransporte: adm.optanteValeTransporte || 'N/A',
            linkPastaColaborador: adm.linkPastaColaborador || '',
            prazoRetornoContabilidade: adm.prazoRetornoContabilidade ? adm.prazoRetornoContabilidade.split('T')[0] : '',
            numeroConta: adm.numeroConta || '',
            inclusoSIN: adm.inclusoSIN || false,
            inclusoGrupoWhatsapp: adm.inclusoGrupoWhatsapp || false,
            eSocialGerado: adm.eSocialGerado || false,
            codigoESocial: adm.codigoESocial || '',
            dataHoraAssinatura: adm.dataHoraAssinatura ? adm.dataHoraAssinatura.substring(0, 16) : '',
            emailNovoFuncionarioDP: adm.emailNovoFuncionarioDP || false,
            emailNovoFuncionarioST: adm.emailNovoFuncionarioST || '',
            emailSeguroVida: adm.emailSeguroVida || false,
            cpf: adm.cpf || '',
            rg: adm.rg || '',
            rgDataEmissao: adm.rgDataEmissao ? adm.rgDataEmissao.substring(0,10) : '',
            rgOrgaoEmissor: adm.rgOrgaoEmissor || '',
            pisPasep: adm.pisPasep || '',
            tituloEleitor: adm.tituloEleitor || '',
            dataNascimento: adm.dataNascimento || '',
            estadoCivil: adm.estadoCivil || '',
            nomeMae: adm.nomeMae || '',
            enderecoCompleto: adm.enderecoCompleto || '',
            cep: adm.cep || '',
            nacionalidade: adm.nacionalidade || '',
            telefone: adm.telefone || '',
            email: adm.email || '',
        });
        setShowDetail(adm);
    };

    const handleAdvance = (adm: any) => {
        const nextActive = ETAPAS.filter(e => e.key !== 'CANCELADO');
        const activeIdx = nextActive.findIndex(e => e.key === adm.etapa);
        if (activeIdx < nextActive.length - 1) {
            const next = nextActive[activeIdx + 1].key;
            handleMoverEtapaDireto(adm, next);
        }
    };

    const handleSaveDrawerProgress = async () => {
        if(!showDetail) return;
        try {
            await api.patch(`/admissoes/${showDetail.id}`, { ...drawerForm, checklistDocumentos: checklist });
            setShowDetail(null);
            fetchAll();
        } catch (err) { console.error('Save error:', err); }
    };

    const handleSaveDrawerAndAdvance = async (nextEtapa: string) => {
        if(!showDetail) return;
        try {
            await api.patch(`/admissoes/${showDetail.id}`, { ...drawerForm, checklistDocumentos: checklist });
            await api.patch(`/admissoes/${showDetail.id}/mover`, { etapa: nextEtapa });
            setShowDetail(null);
            fetchAll();
        } catch (err) {
            console.error('Save and advance error:', err);
        }
    };

    const handleCancel = async () => {
        if (!showCancelModal || !motivoCancelamento) return;
        try {
            await api.patch(`/admissoes/${showCancelModal}/mover`, {
                etapa: 'CANCELADO',
                motivoCancelamento,
            });
            setShowCancelModal(null);
            setMotivoCancelamento('');
            fetchAll();
        } catch (err) {
            console.error('Cancel error:', err);
        }
    };

    const onDragStart = (e: React.DragEvent, admStr: string) => {
        e.dataTransfer.setData('admStr', admStr);
    };

    const onDrop = (e: React.DragEvent, novaEtapa: string) => {
        e.preventDefault();
        const admStr = e.dataTransfer.getData('admStr');
        if (admStr) {
            handleMoverEtapaDireto(JSON.parse(admStr), novaEtapa);
        }
    };

    const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="h-full w-full flex flex-col overflow-hidden gap-4 bg-slate-50">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-white border-b border-slate-200 shadow-sm rounded-xl flex-shrink-0">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Pipeline de Admissão</h1>
                    <p className="text-xs font-medium text-slate-500">
                        {admissoes.length} registros • {admissoes.filter(a => !['CONTRATADO', 'CANCELADO', 'BANCO_TALENTOS'].includes(a.etapa)).length} em andamento
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && fetchAll()}
                            placeholder="Buscar candidato..."
                            className="pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs w-64 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all shadow-sm"
                        />
                    </div>
                    <button
                        onClick={() => { setShowForm(true); fetchCandidatosAprovados(); }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-blue-700 hover:shadow-md transition-all active:scale-95"
                    >
                        <Plus className="w-4 h-4" /> Nova Admissão
                    </button>
                </div>
            </div>

            {/* Kanban Board Container */}
            <div className="flex-1 overflow-x-auto min-h-0 pb-2 custom-scrollbar">
                <div className="flex gap-4 h-full min-w-max p-1">
                    {ETAPAS.map(s => {
                        const items = admissoes.filter(a => a.etapa === s.key);
                        const Icon = s.icon;
                        return (
                            <div 
                                key={s.key} 
                                className="w-[300px] flex flex-col bg-slate-100 rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                                onDragOver={e => e.preventDefault()}
                                onDrop={(e) => onDrop(e, s.key)}
                            >
                                <div className={`${s.color} text-white p-3 flex items-center justify-between shadow-sm z-10`}>
                                    <div className="flex items-center gap-2">
                                        <Icon className="w-4 h-4" />
                                        <span className="text-xs font-black uppercase tracking-wide">{s.label}</span>
                                    </div>
                                    <div className="text-xs font-black bg-black/20 px-2 py-0.5 rounded-full">{items.length}</div>
                                </div>
                                <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                                    {items.map(a => (
                                        <div 
                                            key={a.id} 
                                            draggable
                                            onDragStart={(e) => onDragStart(e, JSON.stringify(a))}
                                            className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-400 cursor-grab active:cursor-grabbing hover:-translate-y-0.5 transition-all relative group"
                                            onClick={() => handleOpenDrawer(a)}
                                        >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-bold text-slate-800 truncate" title={a.nome}>
                                                            {a.nome}
                                                        </p>
                                                        <p className="text-[10px] uppercase font-bold text-blue-600 mt-1 truncate bg-blue-50 px-1 inline-block rounded">
                                                            {a.cargo || 'CARGO N/A'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {a.telefone && (
                                                    <div className="flex items-center gap-2 mt-3">
                                                        <a
                                                            href={`https://wa.me/55${a.telefone.replace(/\D/g, '')}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="bg-emerald-100 hover:bg-emerald-500 text-emerald-600 hover:text-white p-1.5 rounded-lg transition-colors group/wa"
                                                            onClick={(e) => e.stopPropagation()}
                                                            title="WhatsApp do Candidato"
                                                        >
                                                            <MessageCircle className="w-4 h-4" />
                                                        </a>
                                                        <a
                                                           href={`mailto:${a.email}`}
                                                           className="bg-slate-100 hover:bg-slate-800 text-slate-500 hover:text-white p-1.5 rounded-lg transition-colors group/mail"
                                                           onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <Mail className="w-4 h-4" />
                                                        </a>
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-2 gap-2 mt-3 border-t border-slate-100 pt-3">
                                                    <div>
                                                        <p className="text-[8px] font-bold text-slate-400 uppercase">CPF</p>
                                                        <p className="text-[10px] font-semibold text-slate-700">{a.cpf || '—'}</p>
                                                    </div>
                                                    {a.salarioBase ? (
                                                         <div>
                                                             <p className="text-[8px] font-bold text-slate-400 uppercase">Salário Base</p>
                                                             <p className="text-[10px] font-black text-emerald-600">R$ {Number(a.salarioBase).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                                         </div>
                                                    ) : (
                                                        <div>
                                                            <p className="text-[8px] font-bold text-slate-400 uppercase">Previsão Adm.</p>
                                                            <p className="text-[10px] font-semibold text-slate-700">{fmtDate(a.dataAdmissaoPrevista)}</p>
                                                        </div>
                                                    )}
                                                </div>

                                                {s.key === 'ENVIO_DOCUMENTACAO' && (
                                                    <div className="mt-2 text-center">
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const url = `${window.location.origin}/admissao-portal/${a.id}`;
                                                                try {
                                                                    if (navigator.clipboard && window.isSecureContext) {
                                                                        navigator.clipboard.writeText(url);
                                                                    } else {
                                                                        const textArea = document.createElement("textarea");
                                                                        textArea.value = url;
                                                                        document.body.appendChild(textArea);
                                                                        textArea.select();
                                                                        document.execCommand('copy');
                                                                        textArea.remove();
                                                                    }
                                                                    showToast('Link do portal copiado!');
                                                                } catch (err) {
                                                                    window.prompt('Copie o link abaixo:', url);
                                                                }
                                                            }}
                                                            className="text-[10px] w-full bg-blue-100 text-blue-700 py-1.5 rounded-lg font-bold hover:bg-blue-200 transition-colors flex items-center justify-center gap-1"
                                                        >
                                                            <Copy className="w-3 h-3" /> Copiar Link do Portal
                                                        </button>
                                                    </div>
                                                )}

                                                {s.key === 'EXAME_ASO' && (
                                                    <div className="mt-2 bg-slate-50 border border-slate-100 p-1.5 rounded-lg flex items-center justify-between">
                                                        <span className="text-[9px] font-bold text-slate-500">ASO: {a.resultadoASO || 'Pendente'}</span>
                                                        <span className="text-[9px] font-black text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded uppercase">Editar</span>
                                                    </div>
                                                )}
                                                
                                                {s.key === 'CONTABILIDADE' && (
                                                    <div className="mt-2 bg-slate-50 border border-slate-100 p-1.5 rounded-lg flex items-center justify-between">
                                                        <span className="text-[9px] font-bold text-slate-500">Folha</span>
                                                        <span className="text-[9px] font-black text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded uppercase">Revisar</span>
                                                    </div>
                                                )}

                                            <div className="flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {s.key !== 'CONTRATADO' && s.key !== 'CANCELADO' && s.key !== 'BANCO_TALENTOS' && (
                                                    <>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleAdvance(a); }}
                                                            className="flex-1 text-[10px] font-black uppercase text-blue-600 bg-blue-50 py-1.5 rounded-lg hover:bg-blue-600 hover:text-white transition-colors"
                                                        >
                                                            Avançar
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setShowCancelModal(a.id); }}
                                                            className="flex-none px-2 text-[10px] font-black text-blue-800 bg-blue-50 py-1.5 rounded-lg hover:bg-blue-900 hover:text-white transition-colors"
                                                            title="Cancelar"
                                                        >
                                                            <X className="w-3 h-3 mx-auto" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {items.length === 0 && (
                                        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-xl">
                                            <p className="text-xs text-slate-400 font-medium text-center">Solte cards aqui</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

                        {/* Drawer */}
            {showDetail && (
                <div className="fixed inset-0 bg-black/60 z-50 flex justify-end transition-opacity">
                    <div className="w-[850px] max-w-[95vw] bg-white h-full shadow-2xl flex flex-col animate-slide-in-right overflow-hidden relative">
                        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-white shadow-sm flex-shrink-0 z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-black text-xl">
                                    {showDetail.nome.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-800">{showDetail.nome}</h2>
                                    <p className="text-sm font-bold text-blue-600 uppercase tracking-widest">{showDetail.cargo || 'CARGO N/A'} • {showDetail.departamento || 'DEPTO N/A'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => handleGeneratePDF(showDetail.id, 'aso')}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-all"
                                >
                                    <Stethoscope className="w-4 h-4" /> Gerar Guia ASO
                                </button>
                                <button 
                                    onClick={() => handleGeneratePDF(showDetail.id, 'ficha')}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-all"
                                >
                                    <FileText className="w-4 h-4" /> Gerar Ficha Registro
                                </button>
                                <div className="w-px h-6 bg-slate-200 mx-1"></div>
                                <button onClick={() => setShowDetail(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                                    <X className="w-6 h-6 text-slate-400" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto bg-slate-50 p-6 space-y-6 custom-scrollbar">

                            {/* Section: Conferência */}
                            {['CONFERENCIA', 'EXAME_ASO', 'CONTABILIDADE'].includes(showDetail.etapa) && (
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                    <h3 className="text-sm font-black text-slate-800 border-b pb-2 flex items-center gap-2"><FileCheck className="w-4 h-4 text-sky-600" /> Detalhes da Conferência</h3>
                                    
                                    <h4 className="text-xs font-bold text-slate-600 mt-3 pt-2">📂 Documentos Enviados</h4>
                                    {showDetail.documentosEnviados && showDetail.documentosEnviados.length > 0 ? (
                                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                            {showDetail.documentosEnviados.map((doc: any, i: number) => (
                                                <a key={i} href={import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL.replace('/api', '')}${doc.url}` : `http://localhost:3000${doc.url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-slate-50 rounded border border-slate-200 hover:bg-sky-50 transition-colors">
                                                    <ExternalLink className="w-4 h-4 text-sky-500 flex-shrink-0" />
                                                    <span className="text-xs font-bold text-slate-700 truncate">{doc.nome}</span>
                                                </a>
                                            ))}
                                        </div>
                                    ) : <p className="text-xs text-slate-500 italic">Nenhum documento anexado.</p>}
                                    
                                    {showDetail.etapa === 'CONFERENCIA' && (
                                        <>
                                            <h4 className="text-xs font-bold text-slate-600 mt-4 border-t pt-3">📋 Checklist Documentação</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {CHECKLIST_DOCS.map(doc => (
                                                    <label key={doc.key} className="flex items-start gap-2 cursor-pointer p-2 rounded hover:bg-slate-50 border border-transparent hover:border-slate-200">
                                                        <input type="checkbox" className="w-4 h-4 text-sky-600 rounded" checked={!!checklist[doc.key]} onChange={(e) => setChecklist({ ...checklist, [doc.key]: e.target.checked })} />
                                                        <span className="text-xs font-semibold text-slate-700 leading-tight">{doc.label}</span>
                                                    </label>
                                                ))}
                                            </div>

                                            <h4 className="text-xs font-bold text-slate-600 mt-4 border-t pt-3">👤 Dados Pessoais / e-Social</h4>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div><label className="text-[10px] font-bold text-slate-500 uppercase">CPF</label><input className="w-full mt-1 border border-slate-200 rounded p-2 text-sm" value={drawerForm.cpf} onChange={e => setDrawerForm({...drawerForm, cpf: e.target.value})} /></div>
                                                <div><label className="text-[10px] font-bold text-slate-500 uppercase">RG</label><input className="w-full mt-1 border border-slate-200 rounded p-2 text-sm" value={drawerForm.rg} onChange={e => setDrawerForm({...drawerForm, rg: e.target.value})} /></div>
                                                <div><label className="text-[10px] font-bold text-slate-500 uppercase">Emissão RG</label><input type="date" className="w-full mt-1 border border-slate-200 rounded p-2 text-sm" value={drawerForm.rgDataEmissao} onChange={e => setDrawerForm({...drawerForm, rgDataEmissao: e.target.value})} /></div>
                                                <div><label className="text-[10px] font-bold text-slate-500 uppercase">Órgão Emissor</label><input className="w-full mt-1 border border-slate-200 rounded p-2 text-sm" value={drawerForm.rgOrgaoEmissor} onChange={e => setDrawerForm({...drawerForm, rgOrgaoEmissor: e.target.value})} /></div>
                                                <div><label className="text-[10px] font-bold text-slate-500 uppercase">PIS/PASEP</label><input className="w-full mt-1 border border-slate-200 rounded p-2 text-sm" value={drawerForm.pisPasep} onChange={e => setDrawerForm({...drawerForm, pisPasep: e.target.value})} /></div>
                                                <div><label className="text-[10px] font-bold text-slate-500 uppercase">Título de Eleitor</label><input className="w-full mt-1 border border-slate-200 rounded p-2 text-sm" value={drawerForm.tituloEleitor} onChange={e => setDrawerForm({...drawerForm, tituloEleitor: e.target.value})} /></div>
                                                <div><label className="text-[10px] font-bold text-slate-500 uppercase">Data Nasc.</label><input type="date" className="w-full mt-1 border border-slate-200 rounded p-2 text-sm" value={drawerForm.dataNascimento} onChange={e => setDrawerForm({...drawerForm, dataNascimento: e.target.value})} /></div>
                                                <div><label className="text-[10px] font-bold text-slate-500 uppercase">Estado Civil</label><input className="w-full mt-1 border border-slate-200 rounded p-2 text-sm" value={drawerForm.estadoCivil} onChange={e => setDrawerForm({...drawerForm, estadoCivil: e.target.value})} /></div>
                                            </div>

                                            <h4 className="text-xs font-bold text-slate-600 mt-4 border-t pt-3">📍 Contato</h4>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="col-span-2"><label className="text-[10px] font-bold text-slate-500 uppercase">Endereço Completo</label><input className="w-full mt-1 border border-slate-200 rounded p-2 text-sm" value={drawerForm.enderecoCompleto} onChange={e => setDrawerForm({...drawerForm, enderecoCompleto: e.target.value})} /></div>
                                                <div><label className="text-[10px] font-bold text-slate-500 uppercase">CEP</label><input className="w-full mt-1 border border-slate-200 rounded p-2 text-sm" value={drawerForm.cep} onChange={e => setDrawerForm({...drawerForm, cep: e.target.value})} /></div>
                                                <div><label className="text-[10px] font-bold text-slate-500 uppercase">Telefone</label><input className="w-full mt-1 border border-slate-200 rounded p-2 text-sm" value={drawerForm.telefone} onChange={e => setDrawerForm({...drawerForm, telefone: e.target.value})} /></div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Section: Exame */}
                            {['EXAME_ASO', 'CONTABILIDADE'].includes(showDetail.etapa) && (
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                    <h3 className="text-sm font-black text-slate-800 border-b pb-2 flex items-center gap-2"><Stethoscope className="w-4 h-4 text-blue-600" /> Exame Admissional (ASO)</h3>
                                    {showDetail.etapa === 'EXAME_ASO' ? (
                                        <>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Razão Social</label>
                                                    <select className="w-full mt-1 border border-slate-200 rounded p-2 text-sm" value={drawerForm.razaoSocial} onChange={e => setDrawerForm({...drawerForm, razaoSocial: e.target.value})}>
                                                        <option value="">Selecione...</option><option value="Nacional Hidrojateamento">Nacional Hidrojateamento</option><option value="Nacional Locação">Nacional Locação</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Tipo de ASO</label>
                                                    <select className="w-full mt-1 border border-slate-200 rounded p-2 text-sm" value={drawerForm.tipoAso} onChange={e => setDrawerForm({...drawerForm, tipoAso: e.target.value})}>
                                                        <option value="Admissional">Admissional</option><option value="Admissional - Toxicológico">Admissional - Toxicológico</option>
                                                    </select>
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Clínica</label>
                                                    <input className="w-full mt-1 border border-slate-200 rounded p-2 text-sm" value={drawerForm.clinicaASO} onChange={e => setDrawerForm({...drawerForm, clinicaASO: e.target.value})} placeholder="Ex: Vida Saúde Integrada"/>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 mt-3">
                                                <div><label className="text-[10px] font-bold text-slate-500 uppercase">Agendamento</label><input type="date" className="w-full mt-1 border border-slate-200 rounded p-2 text-sm" value={drawerForm.dataAgendamentoExame} onChange={e => setDrawerForm({...drawerForm, dataAgendamentoExame: e.target.value})} /></div>
                                                <div><label className="text-[10px] font-bold text-slate-500 uppercase">Realizado</label><input type="date" className="w-full mt-1 border border-slate-200 rounded p-2 text-sm" value={drawerForm.dataExameASO} onChange={e => setDrawerForm({...drawerForm, dataExameASO: e.target.value})} /></div>
                                            </div>
                                            <div className="bg-slate-50 p-4 rounded border border-slate-200 mt-3">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase">Resultado</label>
                                                <select className="w-full mt-1 border border-slate-200 rounded p-2 text-sm font-bold text-emerald-700" value={drawerForm.resultadoASO} onChange={e => setDrawerForm({...drawerForm, resultadoASO: e.target.value})}>
                                                    <option value="APTO">Apto</option><option value="INAPTO">Inapto</option><option value="PENDENTE">Pendente</option>
                                                </select>
                                            </div>
                                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div className="bg-blue-50 p-3 rounded border border-blue-100">
                                                    <label className="text-[10px] font-bold text-blue-700 uppercase">Exame Toxicológico</label>
                                                    <select className="w-full mt-1 p-2 text-sm rounded bg-white" value={drawerForm.exameToxicologicoAprovado} onChange={e => setDrawerForm({...drawerForm, exameToxicologicoAprovado: e.target.value})}>
                                                        <option value="N/A">N/A</option><option value="APTO">Apto</option><option value="NAO_APTO">Não Apto</option>
                                                    </select>
                                                </div>
                                                <div className="bg-emerald-50 p-3 rounded border border-emerald-100">
                                                    <label className="text-[10px] font-bold text-emerald-700 uppercase">Avaliação Psico</label>
                                                    <select className="w-full mt-1 p-2 text-sm rounded bg-white" value={drawerForm.retornoPsicossocial} onChange={e => setDrawerForm({...drawerForm, retornoPsicossocial: e.target.value})}>
                                                        <option value="N/A">N/A</option><option value="APTO">Apto</option><option value="NAO_APTO">Não Apto</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-sm">Resultado: <strong className={showDetail.resultadoASO === 'INAPTO' ? 'text-red-500' : 'text-emerald-600'}>{showDetail.resultadoASO || 'PENDENTE'}</strong></div>
                                    )}
                                </div>
                            )}

                            {/* Section: Contabilidade */}
                            {['CONTABILIDADE', 'ASSINATURA_CONTRATO'].includes(showDetail.etapa) && (
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                    <h3 className="text-sm font-black text-slate-800 border-b pb-2 flex items-center gap-2"><Building2 className="w-4 h-4 text-indigo-600" /> Contabilidade e Benefícios</h3>
                                    {showDetail.etapa === 'CONTABILIDADE' ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-3">
                                                <div><label className="text-[10px] font-bold text-slate-500 uppercase">Data Admissão</label><input type="date" className="w-full mt-1 border border-slate-200 rounded p-2 text-sm" value={drawerForm.dataAdmissaoRegistrada} onChange={e => setDrawerForm({...drawerForm, dataAdmissaoRegistrada: e.target.value})} /></div>
                                                <div><label className="text-[10px] font-bold text-slate-500 uppercase">Salário Base (R$)</label><input type="number" className="w-full mt-1 border border-slate-200 rounded p-2 text-sm font-black text-emerald-600" value={drawerForm.salarioBase} onChange={e => setDrawerForm({...drawerForm, salarioBase: e.target.value})} placeholder="Ex: 3000.00" /></div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Jornada</label>
                                                    <select className="w-full mt-1 border border-slate-200 rounded p-2 text-sm" value={drawerForm.jornadaTrabalho} onChange={e => setDrawerForm({...drawerForm, jornadaTrabalho: e.target.value})}><option value="44 horas">44 horas Padrão</option><option value="OPERACIONAL (SEG a QUI 07:00-17:00 / SEX 07:00-16:00)">Operacional</option></select>
                                                </div>
                                                <div><label className="text-[10px] font-bold text-slate-500 uppercase">Insalubridade</label><select className="w-full mt-1 border border-slate-200 rounded p-2 text-sm" value={drawerForm.adicionalInsalubridade} onChange={e => setDrawerForm({...drawerForm, adicionalInsalubridade: e.target.value})}><option value="N/A">N/A</option><option value="10%">10%</option><option value="20%">20%</option><option value="40%">40%</option></select></div>
                                            </div>
                                            <div className="space-y-3">
                                                <div><label className="text-[10px] font-bold text-slate-500 uppercase">Tipo Pgto</label><select className="w-full mt-1 border border-slate-200 rounded p-2 text-sm" value={drawerForm.tipoPagamento} onChange={e => setDrawerForm({...drawerForm, tipoPagamento: e.target.value})}><option value="Mensalista">Mensalista</option><option value="Horista">Horista</option></select></div>
                                                <div><label className="text-[10px] font-bold text-slate-500 uppercase">Ajuda de Custo</label><select className="w-full mt-1 border border-slate-200 rounded p-2 text-sm" value={drawerForm.adicionalAjudaCusto} onChange={e => setDrawerForm({...drawerForm, adicionalAjudaCusto: e.target.value})}><option value="N/A">N/A</option><option value="R$ 270,00 Hortolândia">R$ 270,00 (Hortolândia)</option><option value="R$ 300,00 Paulínia">R$ 300,00 (Paulínia)</option></select></div>
                                                <div><label className="text-[10px] font-bold text-slate-500 uppercase">Auxílio Moradia</label><select className="w-full mt-1 border border-slate-200 rounded p-2 text-sm" value={drawerForm.adicionalAuxilioMoradia} onChange={e => setDrawerForm({...drawerForm, adicionalAuxilioMoradia: e.target.value})}><option value="N/A">N/A</option><option value="R$ 400,00">R$ 400,00</option></select></div>
                                                <div><label className="text-[10px] font-bold text-slate-500 uppercase">Vale Transporte (Custo Colab)</label><select className="w-full mt-1 border border-slate-200 rounded p-2 text-sm" value={drawerForm.optanteValeTransporte} onChange={e => setDrawerForm({...drawerForm, optanteValeTransporte: e.target.value})}><option value="N/A">Não</option><option value="R$ 12,40 Campinas">R$ 12,40 Campinas</option><option value="R$ 12,80 Hort/Sumaré">R$ 12,80 Hort/Sumaré</option><option value="R$ 27,20 Paulínia">R$ 27,20 Paulínia</option></select></div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-sm">Folha: <strong>R$ {showDetail.salarioBase}</strong> / {showDetail.tipoPagamento}</div>
                                    )}
                                </div>
                            )}

                            {/* Section: Assinatura */}
                            {['ASSINATURA_CONTRATO'].includes(showDetail.etapa) && (
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                    <h3 className="text-sm font-black text-slate-800 border-b pb-2 flex items-center gap-2"><FileSignature className="w-4 h-4 text-emerald-600" /> Assinatura</h3>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">* Data/hora agendada para assinatura do colaborador</label>
                                            <input type="datetime-local" className="w-full mt-1 border border-slate-200 rounded p-2 text-sm" value={drawerForm.dataHoraAssinatura} onChange={e => setDrawerForm({...drawerForm, dataHoraAssinatura: e.target.value})} />
                                        </div>

                                        <div className="pt-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">* E-mail de sinalização de novo funcionário enviado para o Departamento Pessoal?</label>
                                            <p className="text-[10px] text-slate-400 mb-1">Importante para cadastramento nos benefícios e ponto eletrônico</p>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" className="w-5 h-5 text-emerald-600 rounded" checked={drawerForm.emailNovoFuncionarioDP} onChange={e => setDrawerForm({...drawerForm, emailNovoFuncionarioDP: e.target.checked})} />
                                                <span className="text-sm">Feito</span>
                                            </label>
                                        </div>

                                        <div className="pt-2 border-t pt-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">* Informar nº da conta</label>
                                            <p className="text-[10px] text-slate-400 mb-1">Banco/Agência/Conta corrente com dígito, se houver</p>
                                            <input className="w-full border border-slate-200 rounded p-2 text-sm" value={drawerForm.numeroConta} onChange={e => setDrawerForm({...drawerForm, numeroConta: e.target.value})} placeholder="Agência 7160 conta corrente 98736-3" />
                                        </div>

                                        <div className="pt-2 border-t pt-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">* Colaborador incluso no SIN?</label>
                                            <label className="flex items-center gap-2 cursor-pointer mt-1">
                                                <input type="checkbox" className="w-5 h-5 text-emerald-600 rounded" checked={drawerForm.inclusoSIN} onChange={e => setDrawerForm({...drawerForm, inclusoSIN: e.target.checked})} />
                                                <span className="text-sm">Feito</span>
                                            </label>
                                        </div>

                                        <div className="pt-2 border-t pt-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">* Colaborador incluso no grupo whatsapp da Escala/Supervisão?</label>
                                            <label className="flex items-center gap-2 cursor-pointer mt-1">
                                                <input type="checkbox" className="w-5 h-5 text-emerald-600 rounded" checked={drawerForm.inclusoGrupoWhatsapp} onChange={e => setDrawerForm({...drawerForm, inclusoGrupoWhatsapp: e.target.checked})} />
                                                <span className="text-sm">Feito</span>
                                            </label>
                                        </div>
                                        
                                        <div className="pt-2 border-t pt-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">* E-mail de sinalização de novo funcionário enviado para a Segurança do Trabalho?</label>
                                            <p className="text-[10px] text-slate-400 mb-1">Importante para programação dos treinamentos</p>
                                            <div className="flex gap-4 mt-1">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="radio" name="emailST" className="w-4 h-4 text-emerald-600" checked={drawerForm.emailNovoFuncionarioST === 'Feito'} onChange={() => setDrawerForm({...drawerForm, emailNovoFuncionarioST: 'Feito'})} />
                                                    <span className="text-sm">Feito</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="radio" name="emailST" className="w-4 h-4 text-emerald-600" checked={drawerForm.emailNovoFuncionarioST === 'N/A (ADM)'} onChange={() => setDrawerForm({...drawerForm, emailNovoFuncionarioST: 'N/A (ADM)'})} />
                                                    <span className="text-sm">N/A (ADM)</span>
                                                </label>
                                            </div>
                                        </div>

                                        <div className="pt-2 border-t pt-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">* E-social gerado?</label>
                                            <p className="text-[10px] text-slate-400 mb-1">Verificar se consta o registro da Nacional</p>
                                            <label className="flex items-center gap-2 cursor-pointer mt-1">
                                                <input type="checkbox" className="w-5 h-5 text-emerald-600 rounded" checked={drawerForm.eSocialGerado} onChange={e => setDrawerForm({...drawerForm, eSocialGerado: e.target.checked})} />
                                                <span className="text-sm">Feito</span>
                                            </label>
                                            {drawerForm.eSocialGerado && (
                                                <div className="mt-2 pl-7">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase">* Cód eSocial:</label>
                                                    <input className="w-full mt-1 border border-slate-200 rounded p-2 text-sm" value={drawerForm.codigoESocial} onChange={e => setDrawerForm({...drawerForm, codigoESocial: e.target.value})} placeholder="Digite aqui..." />
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-2 border-t pt-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">* E-mail enviado para inclusão no SEGURO DE VIDA?</label>
                                            <label className="flex items-center gap-2 cursor-pointer mt-1 mb-2">
                                                <input type="checkbox" className="w-5 h-5 text-emerald-600 rounded" checked={drawerForm.emailSeguroVida} onChange={e => setDrawerForm({...drawerForm, emailSeguroVida: e.target.checked})} />
                                                <span className="text-sm">Feito</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                        <div className="p-5 border-t border-slate-100 bg-white flex justify-end gap-3 flex-shrink-0 z-10 shadow-[0_-4px_15px_-3px_rgba(0,0,0,0.05)]">
                            <button onClick={handleSaveDrawerProgress} className="bg-white border border-slate-300 text-slate-700 px-6 py-2.5 rounded-xl font-bold uppercase text-xs tracking-wider hover:bg-slate-50 active:scale-95 transition-all">Salvar Progresso</button>
                            {showDetail.etapa === 'CONFERENCIA' && <button onClick={() => handleSaveDrawerAndAdvance('EXAME_ASO')} className="bg-sky-600 text-white px-8 py-2.5 rounded-xl font-black uppercase text-xs tracking-wider hover:bg-sky-700 active:scale-95 transition-all shadow-md shadow-sky-500/20">Validar & Avançar</button>}
                            {showDetail.etapa === 'EXAME_ASO' && <button onClick={() => handleSaveDrawerAndAdvance('CONTABILIDADE')} className="bg-blue-600 text-white px-8 py-2.5 rounded-xl font-black uppercase text-xs tracking-wider hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-500/20">Avançar p/ Contab.</button>}
                            {showDetail.etapa === 'CONTABILIDADE' && <button onClick={() => handleSaveDrawerAndAdvance('ASSINATURA_CONTRATO')} className="bg-indigo-600 text-white px-8 py-2.5 rounded-xl font-black uppercase text-xs tracking-wider hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-500/20">Avançar p/ Assinatura</button>}
                            {showDetail.etapa === 'ASSINATURA_CONTRATO' && <button onClick={() => handleSaveDrawerAndAdvance('CONTRATADO')} className="bg-emerald-600 text-white px-8 py-2.5 rounded-xl font-black uppercase text-xs tracking-wider hover:bg-emerald-700 active:scale-95 transition-all shadow-md shadow-emerald-500/20">Finalizar (Contratado)</button>}
                        </div>
                    </div>
                </div>
            )}

            {/* Create Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800">Nova Admissão</h2>
                            <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>

                        {/* Candidatos Aprovados Selector */}
                        {candidatosAprovados.length > 0 && (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
                                <p className="text-xs font-black text-emerald-800 uppercase">📋 Candidatos Aprovados no Recrutamento</p>
                                <div className="max-h-32 overflow-y-auto space-y-1">
                                    {candidatosAprovados.map((c: any) => (
                                        <button
                                            key={c.id}
                                            onClick={() => setForm({
                                                nome: c.nome,
                                                cpf: c.cpf || '',
                                                telefone: c.whatsapp || c.telefone || '',
                                                email: c.email || '',
                                                cargo: c.vaga?.cargo || '',
                                                departamento: c.vaga?.departamento || '',
                                                dataAdmissaoPrevista: '',
                                            })}
                                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-emerald-100 transition-colors flex items-center justify-between group"
                                        >
                                            <span className="text-sm font-bold text-slate-700">{c.nome}</span>
                                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full group-hover:bg-emerald-200">{c.vaga?.cargo || 'N/A'}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {candidatosAprovados.length === 0 && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                                <p className="text-xs font-bold text-amber-700">⚠️ Nenhum candidato ADMITIDO pendente no Recrutamento</p>
                                <p className="text-[10px] text-amber-600 mt-1">Preencha manualmente (ex: recontratação ou indicação direta)</p>
                            </div>
                        )}

                        <div className="border-t border-slate-100 pt-3">
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Dados da Admissão</p>
                        </div>
                        <input
                            value={form.nome}
                            onChange={e => setForm({ ...form, nome: e.target.value })}
                            placeholder="Nome do Candidato *"
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                value={form.cpf}
                                onChange={e => setForm({ ...form, cpf: e.target.value })}
                                placeholder="CPF"
                                className="border border-slate-200 rounded-lg p-2.5 text-sm"
                            />
                            <input
                                value={form.telefone}
                                onChange={e => setForm({ ...form, telefone: e.target.value })}
                                placeholder="Telefone"
                                className="border border-slate-200 rounded-lg p-2.5 text-sm"
                            />
                        </div>
                        <input
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                            placeholder="E-mail"
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                value={form.cargo}
                                onChange={e => setForm({ ...form, cargo: e.target.value })}
                                placeholder="Cargo"
                                className="border border-slate-200 rounded-lg p-2.5 text-sm"
                            />
                            <input
                                value={form.departamento}
                                onChange={e => setForm({ ...form, departamento: e.target.value })}
                                placeholder="Departamento"
                                className="border border-slate-200 rounded-lg p-2.5 text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Data Admissão Prevista</label>
                            <input
                                type="date"
                                value={form.dataAdmissaoPrevista}
                                onChange={e => setForm({ ...form, dataAdmissaoPrevista: e.target.value })}
                                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                            />
                        </div>
                        <button
                            onClick={handleCreate}
                            disabled={!form.nome}
                            className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-bold text-sm disabled:opacity-50 hover:bg-blue-700 transition-colors"
                        >
                            Iniciar Admissão
                        </button>
                    </div>
                </div>
            )}

            {/* Cancel Modal */}
            {showCancelModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-3">
                        <h2 className="text-lg font-bold text-blue-900">Cancelar Admissão</h2>
                        <p className="text-sm text-slate-500">Informe o motivo do cancelamento:</p>
                        <textarea
                            value={motivoCancelamento}
                            onChange={e => setMotivoCancelamento(e.target.value)}
                            placeholder="Motivo do cancelamento *"
                            rows={3}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowCancelModal(null); setMotivoCancelamento(''); }}
                                className="flex-1 border border-slate-200 py-2 rounded-xl text-sm font-bold"
                            >
                                Voltar
                            </button>
                            <button
                                onClick={handleCancel}
                                disabled={!motivoCancelamento}
                                className="flex-1 bg-blue-900 text-white py-2 rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-blue-950 transition-all font-black"
                            >
                                Confirmar Cancelamento
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
