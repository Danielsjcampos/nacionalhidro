import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { Building2, Save, Globe, Key, FileBadge, Upload, Eye, EyeOff, CheckCircle2, MessageSquare, Receipt, MapPin, Phone, Mail } from 'lucide-react';

const ConfigForm = () => {
    const { register, handleSubmit, setValue, watch } = useForm();
    const [loading, setLoading] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [activeTab, setActiveTab] = useState<'empresa' | 'fiscal' | 'whatsapp' | 'nfe'>('empresa');

    useEffect(() => {
        const fetchConfig = async () => {
             try {
                 const res = await axios.get('http://localhost:3000/configuracoes');
                 const data = res.data;
                 if(data) {
                     Object.keys(data).forEach(key => setValue(key, data[key]));
                 }
             } catch(e) { console.error(e); }
             finally { setLoading(false); }
        };
        fetchConfig();
    }, [setValue]);

    const onSubmit = async (data: any) => {
         try {
             await axios.post('http://localhost:3000/configuracoes', data);
             alert('Configurações salvas com sucesso!');
         } catch(e) {
             console.error(e);
             alert('Erro ao salvar');
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
            <Icon className="w-4 h-4"/> {label}
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
                    <Save className="w-5 h-5"/>
                    Salvar Alterações
                </button>
             </div>

             {/* Tabs */}
             <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-wrap">
                 <TabButton id="empresa" label="Dados da Empresa" icon={Building2} colorClass="text-blue-600" />
                 <TabButton id="fiscal" label="Dados Fiscais" icon={Receipt} colorClass="text-emerald-600" />
                 <TabButton id="whatsapp" label="WhatsApp API" icon={MessageSquare} colorClass="text-green-600" />
                 <TabButton id="nfe" label="NF-e & Webhooks" icon={Globe} colorClass="text-purple-600" />
             </div>

             <form className="bg-white border border-slate-200 rounded-xl shadow-sm p-8" onSubmit={handleSubmit(onSubmit)}>
                
                {activeTab === 'empresa' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
                        {/* Identificação */}
                        <div>
                            <h3 className={sectionTitleClass}><Building2 className="w-5 h-5 text-blue-500"/> Identificação</h3>
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
                            <h3 className={sectionTitleClass}><MapPin className="w-5 h-5 text-red-500"/> Endereço</h3>
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
                            <h3 className={sectionTitleClass}><Phone className="w-5 h-5 text-green-500"/> Contato</h3>
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
                            <h3 className={sectionTitleClass}><FileBadge className="w-5 h-5 text-amber-600"/> Dados Fiscais e Tributários</h3>
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
                                <MessageSquare className="w-5 h-5 text-green-600"/>
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
                                            {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>Nome da Instância</label>
                                    <input {...register('whatsappInstanceName')} className={inputClass} placeholder="Ex: atendimento" />
                                </div>
                            </div>
                            
                            <div className="mt-6 flex items-center gap-2 text-xs text-green-800 bg-green-100 p-3 rounded border border-green-200">
                                <CheckCircle2 className="w-4 h-4"/>
                                <span>Certifique-se que a instância já está criada e conectada no painel da Evolution API.</span>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'nfe' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                        {/* Certificado Digital */}
                        <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
                            <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                                <Key className="w-5 h-5 text-amber-500"/>
                                Certificado Digital A1
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Arquivo .PFX</label>
                                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center hover:bg-white hover:border-blue-400 transition-colors cursor-pointer text-center group">
                                        <Upload className="w-8 h-8 text-slate-400 mb-2 group-hover:text-blue-500"/>
                                        <span className="text-sm text-slate-500">Clique para selecionar o certificado</span>
                                        <input type="file" className="hidden" accept=".pfx" onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if(file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => setValue('certificadoA1', reader.result);
                                                reader.readAsDataURL(file);
                                            }
                                        }}/>
                                    </div>
                                    {watch('certificadoA1') && (
                                        <div className="mt-2 flex items-center gap-2 text-emerald-600 text-sm font-bold bg-emerald-50 p-2 rounded">
                                            <CheckCircle2 className="w-4 h-4"/> Certificado Carregado
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
                                                {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
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
                                <Globe className="w-5 h-5 text-blue-500"/>
                                Integração API Web
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className={labelClass}>Webhook URL (Callback)</label>
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

             </form>
        </div>
    );
}

export default ConfigForm;
