import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, Save, User, MapPin, Briefcase, DollarSign, FileText, Truck, Gift, Shield } from 'lucide-react';

interface FuncionarioFormProps {
  initialData?: any;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

export default function FuncionarioForm({ initialData, onClose, onSave }: FuncionarioFormProps) {
  const { register, handleSubmit, reset } = useForm({
    defaultValues: initialData || {
      ativo: true,
      nacionalidade: 'Brasileira',
      tipoContrato: 'CLT',
      tipoConta: 'CORRENTE'
    }
  });

  const [activeTab, setActiveTab] = useState('pessoal');

  useEffect(() => {
    if (initialData) {
      // Format dates for input
      const formatted = { ...initialData };
      if (formatted.dataNascimento) formatted.dataNascimento = formatted.dataNascimento.split('T')[0];
      if (formatted.dataAdmissao) formatted.dataAdmissao = formatted.dataAdmissao.split('T')[0];
      reset(formatted);
    }
  }, [initialData, reset]);

  const tabs = [
    { id: 'pessoal', label: 'Dados Pessoais', icon: User },
    { id: 'operacional', label: 'Operacional', icon: Truck },
    { id: 'contrato', label: 'Contrato & Cargo', icon: Briefcase },
    { id: 'endereco', label: 'Endereço', icon: MapPin },
    { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
    { id: 'beneficios', label: 'Benefícios', icon: Gift },
    { id: 'integracoes', label: 'Integrações CIAs', icon: Shield },
    { id: 'docs', label: 'Documentos', icon: FileText },
  ];


  const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300";
  const labelClass = "block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5";

  return (
    <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              {initialData ? <Briefcase className="w-5 h-5 text-blue-600" /> : <User className="w-5 h-5 text-blue-600" />}
              {initialData ? 'Editar Colaborador' : 'Novo Colaborador'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">Dados cadastrais para gestão de RH e Folha.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-6 bg-white sticky top-0 z-10">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-4 text-sm font-bold border-b-2 transition-all ${activeTab === tab.id
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit(onSave)} className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white">

          {/* PESSOAL */}
          <div className={activeTab === 'pessoal' ? 'block space-y-6 animate-in slide-in-from-right-4 duration-300' : 'hidden'}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className={labelClass}>Nome Completo *</label>
                <input {...register('nome', { required: true })} className={inputClass} placeholder="Ex: João da Silva" />
              </div>

              <div>
                <label className={labelClass}>CPF *</label>
                <input {...register('cpf', { required: true })} className={inputClass} placeholder="000.000.000-00" />
              </div>

              <div>
                <label className={labelClass}>RG</label>
                <input {...register('rg')} className={inputClass} placeholder="00.000.000-0" />
              </div>

              <div>
                <label className={labelClass}>Data de Nascimento</label>
                <input type="date" {...register('dataNascimento')} className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Estado Civil</label>
                <select {...register('estadoCivil')} className={inputClass}>
                  <option value="">Selecione...</option>
                  <option value="SOLTEIRO">Solteiro(a)</option>
                  <option value="CASADO">Casado(a)</option>
                  <option value="DIVORCIADO">Divorciado(a)</option>
                  <option value="VIUVO">Viúvo(a)</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Nome da Mãe</label>
                <input {...register('nomeMae')} className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Nome do Pai</label>
                <input {...register('nomePai')} className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Telefone / WhatsApp</label>
                <input {...register('telefone')} className={inputClass} placeholder="(00) 00000-0000" />
              </div>

              <div>
                <label className={labelClass}>E-mail</label>
                <input {...register('email')} className={inputClass} placeholder="email@exemplo.com" />
              </div>
            </div>
          </div>

          {/* OPERACIONAL */}
          <div className={activeTab === 'operacional' ? 'block space-y-6 animate-in slide-in-from-right-4 duration-300' : 'hidden'}>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4">
              <p className="text-sm text-blue-700 font-bold">⚙️ Categorização Operacional</p>
              <p className="text-xs text-blue-500 mt-1">Define o tipo do colaborador para vinculação com Ordens de Serviço e escalas.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className={labelClass}>Categoria do Funcionário *</label>
                <select {...register('categoria')} className={inputClass}>
                  <option value="">Selecione a categoria...</option>
                  <option value="MOTORISTA">🚛 Motorista</option>
                  <option value="OPERADOR">⚙️ Operador</option>
                  <option value="AJUDANTE">🤝 Ajudante</option>
                  <option value="JATISTA">💧 Jatista</option>
                  <option value="LIDER">👑 Líder / Encarregado</option>
                  <option value="ADMINISTRATIVO">🏢 Administrativo</option>
                  <option value="MECANICO">🔧 Mecânico</option>
                  <option value="SEGURANCA_TRABALHO">🦺 Segurança do Trabalho</option>
                </select>
              </div>

              <div className="col-span-2 border-t border-slate-200 pt-4">
                <p className="text-sm font-bold text-slate-700 mb-4">📋 Habilitação (CNH)</p>
              </div>

              <div>
                <label className={labelClass}>Número da CNH</label>
                <input {...register('cnh')} className={inputClass} placeholder="Número do registro" />
              </div>

              <div>
                <label className={labelClass}>Categoria CNH</label>
                <select {...register('categoriaCNH')} className={inputClass}>
                  <option value="">N/A</option>
                  <option value="A">A (Moto)</option>
                  <option value="B">B (Carro)</option>
                  <option value="C">C (Caminhão)</option>
                  <option value="D">D (Ônibus)</option>
                  <option value="E">E (Carreta)</option>
                  <option value="AB">AB</option>
                  <option value="AD">AD</option>
                  <option value="AE">AE</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Vencimento da CNH</label>
                <input type="date" {...register('dataVencimentoCNH')} className={inputClass} />
              </div>

              <div className="col-span-2 border-t border-slate-200 pt-4">
                <p className="text-sm font-bold text-slate-700 mb-4">☢️ MOPP (Produtos Perigosos)</p>
              </div>

              <div className="flex items-center gap-3">
                <input type="checkbox" {...register('mopp')} id="mopp" className="w-5 h-5 rounded border-slate-300 text-blue-600" />
                <label htmlFor="mopp" className="text-sm font-bold text-slate-700">Possui MOPP</label>
              </div>

              <div>
                <label className={labelClass}>Vencimento MOPP</label>
                <input type="date" {...register('dataVencimentoMOPP')} className={inputClass} />
              </div>
            </div>
          </div>

          {/* CONTRATO */}
          <div className={activeTab === 'contrato' ? 'block space-y-6 animate-in slide-in-from-right-4 duration-300' : 'hidden'}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>Cargo *</label>
                <input {...register('cargo', { required: true })} className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Departamento *</label>
                <select {...register('departamento', { required: true })} className={inputClass}>
                  <option value="">Selecione...</option>
                  <option value="Administrativo">Administrativo</option>
                  <option value="Comercial">Comercial</option>
                  <option value="Operacional">Operacional</option>
                  <option value="Financeiro">Financeiro</option>
                  <option value="TI">TI</option>
                  <option value="RH">RH</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Tipo de Contrato</label>
                <select {...register('tipoContrato')} className={inputClass}>
                  <option value="CLT">CLT (Efetivo)</option>
                  <option value="PJ">PJ (Prestador)</option>
                  <option value="ESTAGIO">Estágio</option>
                  <option value="TEMPORARIO">Temporário</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Data de Admissão *</label>
                <input type="date" {...register('dataAdmissao', { required: true })} className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Salário Base (R$)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">R$</span>
                  <input type="number" step="0.01" {...register('salario')} className={`${inputClass} pl-10`} placeholder="0,00" />
                </div>
              </div>

              <div>
                <label className={labelClass}>Matrícula</label>
                <input {...register('matricula')} className={inputClass} />
              </div>

              <div className="col-span-2 grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className={labelClass}>CTPS</label>
                  <input {...register('ctps')} className={inputClass} placeholder="Número da Carteira" />
                </div>
                <div>
                  <label className={labelClass}>Série</label>
                  <input {...register('serieCtps')} className={inputClass} placeholder="Série" />
                </div>
              </div>

              <div>
                <label className={labelClass}>PIS/PASEP</label>
                <input {...register('pis')} className={inputClass} />
              </div>
            </div>
          </div>

          {/* ENDEREÇO */}
          <div className={activeTab === 'endereco' ? 'block space-y-6 animate-in slide-in-from-right-4 duration-300' : 'hidden'}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className={labelClass}>CEP</label>
                <input {...register('cep')} className={inputClass} />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Logradouro</label>
                <input {...register('endereco')} className={inputClass} />
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
                <label className={labelClass}>Estado</label>
                <input {...register('estado')} className={inputClass} maxLength={2} placeholder="UF" />
              </div>
            </div>
          </div>

          {/* FINANCEIRO */}
          <div className={activeTab === 'financeiro' ? 'block space-y-6 animate-in slide-in-from-right-4 duration-300' : 'hidden'}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>Banco</label>
                <input {...register('banco')} className={inputClass} placeholder="Ex: Nubank, Itaú..." />
              </div>
              <div>
                <label className={labelClass}>Tipo de Conta</label>
                <select {...register('tipoConta')} className={inputClass}>
                  <option value="CORRENTE">Conta Corrente</option>
                  <option value="POUPANCA">Poupança</option>
                  <option value="SALARIO">Conta Salário</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Agência</label>
                <input {...register('agencia')} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Conta + Dígito</label>
                <input {...register('conta')} className={inputClass} />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Chave PIX (Opcional)</label>
                <input {...register('chavePix')} className={inputClass} placeholder="CPF, Email ou Aleatória" />
              </div>
            </div>
          </div>

          {/* BENEFÍCIOS */}
          <div className={activeTab === 'beneficios' ? 'block space-y-6 animate-in slide-in-from-right-4 duration-300' : 'hidden'}>
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 mb-4">
              <p className="text-sm text-emerald-700 font-bold">🎫 Benefícios do Colaborador</p>
              <p className="text-xs text-emerald-500 mt-1">Dados para gerar relatórios de benefícios (Caju, VT, etc.)</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-2 border border-slate-200 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <input type="checkbox" {...register('temRefeicao')} id="temRefeicao" className="w-5 h-5 rounded border-slate-300 text-emerald-600" />
                  <label htmlFor="temRefeicao" className="text-sm font-bold text-slate-700">🍽️ Refeição</label>
                </div>
                <div className="ml-8">
                  <label className={labelClass}>Tipo de Refeição</label>
                  <select {...register('tipoRefeicao')} className={inputClass}>
                    <option value="">Não se aplica</option>
                    <option value="ALMOCO">Almoço</option>
                    <option value="JANTA">Janta</option>
                    <option value="ALMOCO_JANTA">Almoço + Janta</option>
                  </select>
                </div>
              </div>

              <div className="col-span-2 border border-slate-200 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <input type="checkbox" {...register('temValeTransporte')} id="temVT" className="w-5 h-5 rounded border-slate-300 text-blue-600" />
                  <label htmlFor="temVT" className="text-sm font-bold text-slate-700">🚌 Vale Transporte</label>
                </div>
                <div className="ml-8">
                  <label className={labelClass}>Valor VT (R$)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">R$</span>
                    <input type="number" step="0.01" {...register('valorValeTransporte')} className={`${inputClass} pl-10`} placeholder="0,00" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* DOCS */}
          <div className={activeTab === 'docs' ? 'block space-y-6 animate-in slide-in-from-right-4 duration-300' : 'hidden'}>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors cursor-pointer group">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                <FileText className="w-8 h-8 text-blue-500" />
              </div>
              <p className="font-bold text-slate-700 text-lg">Clique para anexar documentos</p>
              <p className="text-sm text-slate-400 mt-2">RG, CPF, Comprovante de Residência, Certidão de Casamento...</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3 border border-blue-100">
              <div className="bg-blue-100 p-2 rounded-lg text-blue-600 mt-0.5">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-blue-800">Prontuário Digital Seguro</h4>
                <p className="text-sm text-blue-600 mt-1">Os documentos anexados serão criptografados e salvos no prontuário digital do colaborador. O acesso é restrito ao departamento de RH.</p>
              </div>
            </div>
          </div>

          {/* INTEGRAÇÕES */}
          <div className={activeTab === 'integracoes' ? 'block space-y-6 animate-in slide-in-from-right-4 duration-300' : 'hidden'}>
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 mb-4 flex items-start gap-3">
              <Shield className="w-5 h-5 text-emerald-600 mt-0.5" />
              <div>
                <h4 className="font-bold text-emerald-800 text-sm">Controle de Integrações (Clientes)</h4>
                <p className="text-xs text-emerald-600 mt-1">Gerencie os treinamentos, permissões e aptidões exigidas pelas empresas/clientes para liberar acesso do profissional.</p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
               {/* As integrações exigem estar atreladas ao BD real, para simplificar nesta versão de UI, listamos um placeholder e deixamos pro modulo especifico ou componente de Cliente-Funcionario, ou podemos exibir as integrações do `initialData.integracoesCliente` */}
               <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                 <span className="font-bold text-slate-700 text-sm uppercase tracking-wider">Integrações Lançadas</span>
               </div>
               
               <div className="p-4 space-y-3">
                 {initialData?.integracoesCliente?.length > 0 ? (
                    initialData.integracoesCliente.map((intg: any) => (
                      <div key={intg.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-white">
                         <div>
                           <p className="font-bold text-sm text-slate-800">{intg.clienteId} - {intg.tipoIntegracao}</p>
                           <p className="text-xs text-slate-500">Validade: {new Date(intg.dataValidade).toLocaleDateString('pt-BR')}</p>
                         </div>
                         <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${new Date(intg.dataValidade) >= new Date() ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                           {new Date(intg.dataValidade) >= new Date() ? 'Válida' : 'Vencida'}
                         </span>
                      </div>
                    ))
                 ) : (
                    <div className="text-center p-8 bg-slate-50 rounded-lg">
                      <p className="text-slate-500 text-sm">O funcionário ainda não possui integrações lançadas.</p>
                    </div>
                 )}
               </div>

               <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                   <button type="button" onClick={() => alert('Para adicionar integrações, salve o cadastro primeiro e use o Painel Operacional ou RH > Ficha de Integrações (em breve)')} className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition">
                     + Lançar Integração
                   </button>
               </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 bg-white z-10">
            <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" className="px-6 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all flex items-center gap-2">
              <Save className="w-4 h-4" />
              Salvar Colaborador
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
