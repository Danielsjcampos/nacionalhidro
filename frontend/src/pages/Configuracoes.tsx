import { useEffect, useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';
import { useForm } from 'react-hook-form';
import { Building2, Save, Globe, Key, FileBadge, Upload, Eye, EyeOff, CheckCircle2, MessageSquare, Receipt, MapPin, Phone, Palette, Image as ImageIcon, Loader2, RefreshCw, LogOut, Zap, AlertTriangle } from 'lucide-react';

const ConfigForm = () => {
    const { showToast } = useToast();
    const { register, handleSubmit, setValue, watch } = useForm();
    const [loading, setLoading] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [activeTab, setActiveTab] = useState<'empresa' | 'fiscal' | 'whatsapp' | 'nfe' | 'integracoes' | 'sistema'>('empresa');
    const [whatsappStatus, setWhatsappStatus] = useState<any>(null);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [statusLoading, setStatusLoading] = useState(false);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await api.get('/configuracoes');
                const data = res.data;
                if (data) {
                    Object.keys(data).forEach(key => setValue(key, data[key]));
                }
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        fetchConfig();
    }, [setValue]);

    const onSubmit = async (data: any) => {
        try {
            await api.post('/configuracoes', data);
            showToast('Configurações salvas com sucesso!', 'success');
            // Reload to apply changes (like favicon/logo)
            window.location.reload();
        } catch (e) {
            console.error(e);
            showToast('Erro ao salvar', 'error');
        }
    };

    const checkStatus = async () => {
        try {
            setStatusLoading(true);
            const res = await api.get('/whatsapp/status');
            setWhatsappStatus(res.data);
            if (res.data.connected) setQrCode(null);
        } catch (e) {
            console.error(e);
            setWhatsappStatus({ connected: false });
        } finally {
            setStatusLoading(false);
        }
    };

    const generateQR = async () => {
        try {
            setStatusLoading(true);
            const res = await api.get('/whatsapp/qrcode');
            if (res.data.qrcode) {
                setQrCode(res.data.qrcode);
            } else {
                showToast('Não foi possível gerar o QR Code. Verifique se a instância está aguardando conexão.', 'error');
            }
        } catch (e: any) {
            showToast('Erro ao gerar QR Code: ' + (e.response?.data?.error || e.message), 'error');
        } finally {
            setStatusLoading(false);
        }
    };

    const logoutInstance = async () => {
        if (!window.confirm('Deseja realmente desconectar esta instância do WhatsApp?')) return;
        try {
            setStatusLoading(true);
            await api.post('/whatsapp/desconectar');
            setWhatsappStatus({ connected: false });
            setQrCode(null);
            showToast('Instância desconectada com sucesso.', 'success');
        } catch (e: any) {
            showToast('Erro ao desconectar: ' + (e.response?.data?.error || e.message), 'error');
        } finally {
            setStatusLoading(false);
        }
    };

    if (loading) return <div className="p-8">Carregando...</div>;

    const inputClass = "w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all";
    const labelClass = "block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wide";
    const sectionTitleClass = "font-bold text-slate-800 text-lg mb-4 flex items-center gap-2 border-b pb-2";

    const TabButton = ({ id, label, icon: Icon, colorClass }: any) => (
        <button
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors border-b-2 ${activeTab === id ? `bg-slate-50 ${colorClass} border-current` : 'text-slate-500 border-transparent hover:bg-slate-50/50'}`}
        >
            <Icon className="w-4 h-4" /> {label}
        </button>
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Configurações do Sistema</h1>
                    <p className="text-slate-500 mt-1">Gerencie os dados da empresa, fiscais e integrações</p>
                </div>
                <button onClick={handleSubmit(onSubmit)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all active:scale-95 fixed bottom-6 right-6 z-50 md:static md:z-0">
                    <Save className="w-5 h-5" />
                    Salvar Alterações
                </button>
            </div>

            {/* Tabs */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-wrap">
                <TabButton id="empresa" label="Dados da Empresa" icon={Building2} colorClass="text-blue-600" />
                <TabButton id="fiscal" label="Dados Fiscais" icon={Receipt} colorClass="text-emerald-600" />
                <TabButton id="whatsapp" label="WhatsApp API" icon={MessageSquare} colorClass="text-green-600" />
                <TabButton id="nfe" label="NF-e & Webhooks" icon={Globe} colorClass="text-indigo-600" />
                <TabButton id="integracoes" label="Integrações" icon={RefreshCw} colorClass="text-orange-600" />
                <TabButton id="sistema" label="Ajustes do Sistema" icon={Palette} colorClass="text-slate-600" />
            </div>

            <form className="bg-white border border-slate-200 rounded-xl shadow-sm p-8" onSubmit={handleSubmit(onSubmit)}>

                {activeTab === 'empresa' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
                        {/* Identificação */}
                        <div>
                            <h3 className={sectionTitleClass}><Building2 className="w-5 h-5 text-blue-500" /> Identificação</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className={labelClass}>Razão Social</label>
                                    <input {...register('razaoSocial')} className={inputClass} placeholder="Razão Social Completa Ltda" />
                                </div>
                                <div>
                                    <label className={labelClass}>Nome Fantasia</label>
                                    <input {...register('nomeFantasia')} className={inputClass} placeholder="Nome Comercial" />
                                </div>
                                <div>
                                    <label className={labelClass}>CNPJ</label>
                                    <input {...register('cnpj')} className={inputClass} placeholder="00.000.000/0000-00" />
                                </div>
                                <div>
                                    <label className={labelClass}>Inscrição Estadual</label>
                                    <input {...register('inscricaoEstadual')} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Inscrição Municipal</label>
                                    <input {...register('inscricaoMunicipal')} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Data de Abertura</label>
                                    <input {...register('dataAbertura')} type="date" className={inputClass} />
                                </div>
                            </div>
                        </div>

                        {/* Endereço */}
                        <div>
                            <h3 className={sectionTitleClass}><MapPin className="w-5 h-5 text-slate-500" /> Endereço</h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label className={labelClass}>CEP</label>
                                    <input {...register('cep')} className={inputClass} placeholder="00000-000" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className={labelClass}>Logradouro (Rua, Av...)</label>
                                    <input {...register('logradouro')} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Número</label>
                                    <input {...register('numero')} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Complemento</label>
                                    <input {...register('complemento')} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Bairro</label>
                                    <input {...register('bairro')} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Cidade</label>
                                    <input {...register('cidade')} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>UF</label>
                                    <input {...register('estado')} className={inputClass} maxLength={2} />
                                </div>
                            </div>
                        </div>

                        {/* Contato */}
                        <div>
                            <h3 className={sectionTitleClass}><Phone className="w-5 h-5 text-green-500" /> Contato</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Email Comercial</label>
                                    <input {...register('emailComercial')} className={inputClass} type="email" />
                                </div>
                                <div>
                                    <label className={labelClass}>Telefone / WhatsApp</label>
                                    <input {...register('telefone')} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Email Fiscal</label>
                                    <input {...register('emailFiscal')} className={inputClass} type="email" />
                                </div>
                                <div>
                                    <label className={labelClass}>Email Financeiro</label>
                                    <input {...register('emailFinanceiro')} className={inputClass} type="email" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'fiscal' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div>
                            <h3 className={sectionTitleClass}><FileBadge className="w-5 h-5 text-blue-600" /> Dados Fiscais e Tributários</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Regime Tributário</label>
                                    <select {...register('regimeTributario')} className={inputClass}>
                                        <option value="SIMPLES">Simples Nacional</option>
                                        <option value="LUCRO_PRESUMIDO">Lucro Presumido</option>
                                        <option value="LUCRO_REAL">Lucro Real</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>CNAE Principal</label>
                                    <input {...register('cnaePrincipal')} className={inputClass} placeholder="Código CNAE" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className={labelClass}>Lista de Serviços (LC 116)</label>
                                    <input {...register('listaServicos')} className={inputClass} placeholder="Código do serviço" />
                                </div>
                                <div>
                                    <label className={labelClass}>Alíquota de ISS (%)</label>
                                    <input {...register('aliquotaIss')} type="number" step="0.01" className={inputClass} placeholder="Ex: 2.00" />
                                </div>
                                <div>
                                    <label className={labelClass}>Natureza da Operação</label>
                                    <input {...register('naturezaOperacao')} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Responsável Tributário</label>
                                    <select {...register('responsavelTributario')} className={inputClass}>
                                        <option value="PRESTADOR">Prestador</option>
                                        <option value="TOMADOR">Tomador</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>Tributação no Município</label>
                                    <select {...register('tributacaoMunicipio')} className={inputClass}>
                                        <option value="TRIBUTAVEL">Tributável</option>
                                        <option value="FORA_MUNICIPIO">Fora do Município</option>
                                        <option value="ISENTO">Isento</option>
                                        <option value="IMUNE">Imune</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-4 mt-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" {...register('incentivadorCultural')} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                        <span className="text-sm font-medium text-slate-700">Incentivador Cultural</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" {...register('optanteSimples')} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                        <span className="text-sm font-medium text-slate-700">Optante pelo Simples</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'whatsapp' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="p-6 bg-green-50 rounded-xl border border-green-200">
                            <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-green-600" />
                                WhatsApp Evolution API
                            </h3>
                            <p className="text-sm text-slate-600 mb-6">Configure a conexão com a Evolution API para envio de mensagens automáticas.</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className={labelClass}>API URL (Base URL)</label>
                                    <input {...register('whatsappUrl')} className={inputClass} placeholder="https://evolution.seu-servidor.com" />
                                </div>
                                <div>
                                    <label className={labelClass}>API Global Key (Token)</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            {...register('whatsappApiKey')}
                                            className={inputClass}
                                            placeholder="Token de autenticação"
                                        />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>Nome da Instância</label>
                                    <input {...register('whatsappInstanceName')} className={inputClass} placeholder="Ex: atendimento" />
                                </div>
                            </div>

                            <div className="mt-6 flex items-center gap-2 text-xs text-green-800 bg-green-100 p-3 rounded border border-green-200">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Certifique-se que a instância já está criada e conectada no painel da Evolution API.</span>
                            </div>

                            <div className="mt-8 pt-8 border-t border-green-200">
                                <h4 className="font-bold text-slate-700 text-sm mb-4 uppercase tracking-wider flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-green-500" />
                                    Status da Conexão
                                </h4>

                                <div className="bg-white border border-green-100 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${whatsappStatus?.connected ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                                            <MessageSquare className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2.5 h-2.5 rounded-full ${whatsappStatus?.connected ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                                                <span className="font-bold text-slate-800">
                                                    {whatsappStatus?.connected ? 'CONECTADO' : 'DESCONECTADO'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {whatsappStatus?.connected 
                                                    ? `Instância: ${whatsappStatus.name || 'Ativa'} | Número: ${whatsappStatus.number || 'N/A'}`
                                                    : 'Aguardando configuração ou escaneamento do QR Code'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <button 
                                            type="button"
                                            onClick={checkStatus}
                                            disabled={statusLoading}
                                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-2"
                                        >
                                            {statusLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                            Verificar Status
                                        </button>
                                        
                                        {!whatsappStatus?.connected && (
                                            <button 
                                                type="button"
                                                onClick={generateQR}
                                                disabled={statusLoading}
                                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-green-500/20 flex items-center gap-2"
                                            >
                                                {statusLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                                                Gerar QR Code
                                            </button>
                                        )}

                                        {whatsappStatus?.connected && (
                                            <button 
                                                type="button"
                                                onClick={logoutInstance}
                                                disabled={statusLoading}
                                                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-bold transition-all flex items-center gap-2"
                                            >
                                                <LogOut className="w-3.5 h-3.5" />
                                                Desconectar
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {qrCode && (
                                    <div className="mt-6 flex flex-col items-center p-8 bg-white border-2 border-dashed border-green-200 rounded-2xl animate-in zoom-in-95 duration-300">
                                        <h5 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                                            Escaneie o QR Code no seu WhatsApp
                                        </h5>
                                        <div className="bg-white p-4 rounded-xl shadow-xl border border-slate-100">
                                            <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64" />
                                        </div>
                                        <p className="text-xs text-slate-500 mt-6 text-center max-w-sm">
                                            Abra o WhatsApp no seu celular, vá em <span className="font-bold">Aparelhos Conectados</span> e toque em <span className="font-bold">Conectar um Aparelho</span>.
                                        </p>
                                        <button 
                                            type="button"
                                            onClick={() => setQrCode(null)}
                                            className="mt-4 text-slate-400 hover:text-slate-600 text-xs font-bold uppercase tracking-wider"
                                        >
                                            Fechar QR Code
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'nfe' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                        {/* Certificado Digital */}
                        <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
                            <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                                <Key className="w-5 h-5 text-blue-600" />
                                Certificado Digital A1
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Arquivo .PFX</label>
                                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center hover:bg-white hover:border-blue-400 transition-colors cursor-pointer text-center group relative">
                                        <Upload className="w-8 h-8 text-slate-400 mb-2 group-hover:text-blue-500" />
                                        <span className="text-sm text-slate-500">Clique para selecionar o certificado</span>
                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept=".pfx" onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => setValue('certificadoA1', reader.result);
                                                reader.readAsDataURL(file);
                                            }
                                        }} />
                                    </div>
                                    {watch('certificadoA1') && (
                                        <div className="mt-2 flex items-center gap-2 text-emerald-600 text-sm font-bold bg-emerald-50 p-2 rounded">
                                            <CheckCircle2 className="w-4 h-4" /> Certificado Carregado
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className={labelClass}>Senha do Certificado</label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                {...register('senhaCertificado')}
                                                className={inputClass}
                                            />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Ambiente NF-e</label>
                                        <select {...register('ambienteNFe')} className={inputClass}>
                                            <option value="HOMOLOGACAO">Homologação (Testes)</option>
                                            <option value="PRODUCAO">Produção (Validade Jurídica)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Web API */}
                        <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
                            <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                                <Globe className="w-5 h-5 text-blue-500" />
                                Integração API Web
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className={labelClass}>URL de Recebimento de Leads (Para WordPress / n8n)</label>
                                    <div className="flex gap-2">
                                        <input
                                            value={`${api.defaults.baseURL || window.location.origin}/webhooks/lead`}
                                            className={`${inputClass} bg-slate-200 font-mono text-xs cursor-text text-slate-600`}
                                            readOnly
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigator.clipboard.writeText(`${api.defaults.baseURL || window.location.origin}/webhooks/lead`);
                                                showToast('URL copiada para a área de transferência!', 'success');
                                            }}
                                            className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md text-xs font-bold transition-colors whitespace-nowrap"
                                        >
                                            Copiar URL
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-1">
                                        Envie requisições POST para esta URL contendo: nome, email, telefone (obrigatório), e mensagem.
                                    </p>
                                </div>
                                <div className="border-t col-span-2 my-2 border-slate-200" />
                                <div>
                                    <label className={labelClass}>Webhook URL (Callback de Retorno)</label>
                                    <input {...register('webhookUrl')} className={inputClass} placeholder="https://seu-sistema.com/webhook" />
                                </div>
                                <div>
                                    <label className={labelClass}>API Key (Identificador)</label>
                                    <div className="flex gap-2">
                                        <input {...register('apiKey')} className={inputClass} readOnly />
                                        <button type="button" onClick={() => setValue('apiKey', 'sk_' + Math.random().toString(36).substring(2))} className="px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded text-xs font-bold uppercase transition-colors">
                                            Gerar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                )}

                {activeTab === 'integracoes' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                        {/* Pipefy OAuth */}
                        <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                            <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                                <Database className="w-5 h-5 text-blue-600" />
                                Integração Pipefy (Workflow Nativo)
                            </h3>
                            <p className="text-sm text-slate-600 mb-8 leading-relaxed">
                                Configure as credenciais do seu **Service Account** do Pipefy para permitir a sincronização automática de pipes, campos e automações.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className={labelClass}>Client ID</label>
                                    <input 
                                        {...register('pipefyClientId')} 
                                        className={inputClass} 
                                        placeholder="Ex: ctMajuCvilt0_A9QyL0t7BZJ8K0fL4Hi7..." 
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className={labelClass}>Client Secret</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            {...register('pipefyClientSecret')}
                                            className={inputClass}
                                            placeholder="Ex: U5FnlghqEVeGAiX9DLQKlY2EcqMTKG..."
                                        />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex items-start gap-3 bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                                <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
                                <div className="space-y-1">
                                    <p className="text-xs text-blue-900 font-bold">Instruções de Configuração:</p>
                                    <p className="text-[11px] text-blue-700 leading-relaxed">
                                        1. No Pipefy, vá em **Recursos de Organização** &gt; **Service Accounts**.<br />
                                        2. Crie ou selecione uma conta e gere as credenciais **OAuth 2.0**.<br />
                                        3. Insira o Client ID e Secret acima e clique em **Salvar Alterações**.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'sistema' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                                <Palette className="w-5 h-5 text-blue-600" />
                                Ajustes de Aparência e Marca
                            </h3>
                            <p className="text-sm text-slate-600 mb-8">Personalize a identidade visual do sistema com o logotipo e favicon da sua empresa.</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Logo Upload */}
                                <div>
                                    <label className={labelClass}>Logotipo do Sistema</label>
                                    <span className="text-[10px] text-slate-400 mb-4 block">Recomendado: SVG ou PNG Transparente (Alt: 40px)</span>

                                    <div className="flex items-center gap-6">
                                        <div className="w-24 h-24 bg-white border border-slate-200 rounded-xl flex items-center justify-center overflow-hidden shadow-inner">
                                            {watch('logo') ? (
                                                <img src={watch('logo')} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                                            ) : (
                                                <ImageIcon className="w-8 h-8 text-slate-200" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="relative">
                                                <button type="button" className="bg-white border border-slate-300 hover:border-blue-500 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2">
                                                    <Upload className="w-4 h-4" /> Alterar Logo
                                                </button>
                                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => setValue('logo', reader.result);
                                                        reader.readAsDataURL(file);
                                                    }
                                                }} />
                                            </div>
                                            {watch('logo') && (
                                                <button type="button" onClick={() => setValue('logo', null)} className="text-slate-500 text-xs mt-2 font-bold hover:underline">Remover</button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Favicon Upload */}
                                <div>
                                    <label className={labelClass}>Favicon (Ícone de Aba)</label>
                                    <span className="text-[10px] text-slate-400 mb-4 block">Recomendado: ICO ou PNG (32x32px)</span>

                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 bg-white border border-slate-200 rounded-xl flex items-center justify-center overflow-hidden shadow-inner">
                                            {watch('favicon') ? (
                                                <img src={watch('favicon')} alt="Favicon Preview" className="w-8 h-8 object-contain" />
                                            ) : (
                                                <Globe className="w-6 h-6 text-slate-200" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="relative">
                                                <button type="button" className="bg-white border border-slate-300 hover:border-blue-500 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2">
                                                    <Upload className="w-4 h-4" /> Alterar Favicon
                                                </button>
                                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => setValue('favicon', reader.result);
                                                        reader.readAsDataURL(file);
                                                    }
                                                }} />
                                            </div>
                                            {watch('favicon') && (
                                                <button type="button" onClick={() => setValue('favicon', null)} className="text-slate-500 text-xs mt-2 font-bold hover:underline">Remover</button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-200 flex items-start gap-3 bg-slate-100/50 p-4 rounded-lg">
                                <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
                                <p className="text-xs text-slate-900 leading-relaxed italic">
                                    Ao salvar, o sistema atualizará automaticamente a identidade visual em todas as telas, incluindo o menu lateral e a aba do navegador.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

            </form>
        </div>
    );
}

export default ConfigForm;
