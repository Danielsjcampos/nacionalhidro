import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, ArrowRight, ArrowLeft } from 'lucide-react';
import { numeroExtenso } from '../utils/numeroExtenso';
import moment from 'moment';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: any;
  options: {
    clientes: any[];
    vendedores: any[];
    empresas: any[];
    equipamentos: any[];
    acessorios: any[];
    responsabilidades: any[];
    cargos: any[];
    configuracoes: any[];
  };
}

export default function ModalCadastroProposta({ isOpen, onClose, onSave, initialData, options }: Props) {
  const [aba, setAba] = useState(1);
  const [formData, setFormData] = useState<any>({
    codigo: '',
    revisao: 0,
    dataProposta: moment().format('YYYY-MM-DD'),
    dataValidade: moment().add(30, 'days').format('YYYY-MM-DD'),
    usuarioId: '',
    empresaId: '',
    clienteId: '',
    contatoId: '',
    cc: '',
    introducao: 'Submetemos a apreciação de V.Sas., nossa proposta, visando o atendimento de sua solicitação conforme condições técnicas e comercias abaixo descriminada, a saber:',
    objetivo: '',
    itens: [],
    acessorios: [],
    responsabilidades: [],
    equipe: [],
    descricaoValores: '',
    descricaoGarantia: '',
    condicaoPagamento: '',
    validadeProposta: '',
    porcentagemRL: 90,
    cte: false,
    pagamentoAntecipado: false,
    valorTotal: 0,
    tipoProposta: 'COMERCIAL'
  });

  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...formData,
        ...initialData,
        dataProposta: initialData.dataProposta ? moment(initialData.dataProposta).format('YYYY-MM-DD') : formData.dataProposta,
        dataValidade: initialData.dataValidade ? moment(initialData.dataValidade).format('YYYY-MM-DD') : formData.dataValidade,
        itens: (initialData.itens && initialData.itens.length > 0) ? initialData.itens : [],
        acessorios: (initialData.acessorios && initialData.acessorios.length > 0) ? initialData.acessorios : [],
        responsabilidades: (initialData.responsabilidades && initialData.responsabilidades.length > 0) ? initialData.responsabilidades : [],
        equipe: (initialData.equipe && initialData.equipe.length > 0) ? initialData.equipe : [],
      });
    }
  }, [initialData]);

  // Logic: Text Generators
  const gerarDescricaoValores = (data: any) => {
    let text = '';
    data.itens.forEach((it: any) => {
      const tipo = it.tipoCobranca === 'HORA' ? 'valor hora' : it.tipoCobranca === 'DIARIA' ? 'valor diária' : it.tipoCobranca === 'FRETE' ? 'valor frete' : 'valor fechado';
      const valorStr = (Number(it.valorAcobrar) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      const extenso = numeroExtenso(it.valorAcobrar || 0);
      
      text += `* ${tipo} ${it.quantidade || 1} ${it.equipamento || 'Equipamento'},${it.area ? ' para área ' + it.area + ',' : ''} horário comercial\n`;
      text += `R$ ${valorStr} (${extenso})\n`;
      
      if (it.mobilizacao > 0) {
        const mobStr = (Number(it.mobilizacao) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        const mobExtenso = numeroExtenso(it.mobilizacao);
        text += `Valor por mobilização e desmobilização ${it.equipamento}, horário comercial:\nR$ ${mobStr} (${mobExtenso})\n\n`;
      } else {
        text += '\n';
      }
    });
    return text;
  };

  const gerarDescricaoGarantia = (data: any) => {
    let text = '';
    const config = (key: string) => options.configuracoes.find(c => c.key === key)?.valor || '';

    data.itens.forEach((it: any) => {
      let template = '';
      if (it.tipoCobranca === 'HORA') template = config('ModalidadeHora') || 'Garantia de faturamento de {{HorasDiaria}} horas diárias para o equipamento {{Equipamento}}.';
      else if (it.tipoCobranca === 'DIARIA') template = config('ModalidadeDiaria') || 'Garantia de faturamento de {{HorasDiaria}} horas diárias para o equipamento {{Equipamento}}.';
      else if (it.tipoCobranca === 'FECHADA') template = config('ModalidadeFechado') || 'Garantia de faturamento conforme valor fechado para o equipamento {{Equipamento}}.';

      if (template) {
        text += template.replace('{{HorasDiaria}}', String(it.horasPorDia || 10)).replace('{{Equipamento}}', it.equipamento || '') + '\n';
      }
    });

    if (data.itens.some((it: any) => it.tipoCobranca === 'HORA')) text += (config('DescricaoGarantiaHora') || '') + '\n\n';
    if (data.itens.some((it: any) => it.tipoCobranca === 'DIARIA')) text += (config('DescricaoGarantiaDiaria') || '') + '\n\n';
    if (data.itens.some((it: any) => it.tipoCobranca === 'FRETE')) text += (config('DescricaoGarantiaFrete') || '') + '\n\n';

    return text;
  };

  const gerarCondicaoPagamento = (data: any) => {
    const textPagamento = data.pagamentoAntecipado ? 'Pagamento antecipado' : 'Faturamento para 20 (VINTE) dias após execução dos serviços.';
    const textExecucao = 'Após execução, será enviado relatório de prestação de serviço e depois de aceite, emitido a Nota Fiscal Eletrônica e boleto bancário, será enviado ao email da Contratante Cadastrada.';
    const textAceite = 'Nota: Prazo para verificação e aceite dos serviços de no Maximo 02 (dois) dias, caso não tenhamos o aceite a nota será emitida automaticamente.';
    
    let textNf = '';
    if (!data.cte && !data.porcentagemRL) {
      textNf = 'O total dos serviços será emitido em nota de serviço.';
    } else if (data.cte) {
      textNf = 'O total dos serviços será emitido em CTe.';
    } else {
      const vLoc = (Number(data.valorTotal) * (data.porcentagemRL / 100)).toFixed(2);
      const vServ = (Number(data.valorTotal) * ((100 - data.porcentagemRL) / 100)).toFixed(2);
      textNf = `O total dos serviços será emitido em 02 notas, sendo:\n${data.porcentagemRL}% do valor, referente ao recibo de locação. (R$ ${vLoc})\n${100 - data.porcentagemRL}% do valor, referente a manuseio do equipamento, nota fiscal de serviço. (R$ ${vServ})`;
    }

    const obsRL = (data.porcentagemRL > 0 && !data.cte) ? '\n\nOBS: Para atividades de locação de BENS MOVEIS, por força de veto Presidencial, foi retirado do campo de incidência o ISS. Conforme disposições do RISS consubstanciadas no decreto municipal 44.540/2004, A empresa não poderá emitir nota fiscal para atividades de locação de bens móveis tendo que emitir recibos para documentar a mesma.' : '';

    return `${textPagamento}\n\n${textExecucao}\n\n${textAceite}\n\nDimensionamento em Nota Fiscal:\n\n${textNf}${obsRL}`;
  };

  const updateCalculations = (currentData: any) => {
    const total = currentData.itens.reduce((acc: number, it: any) => acc + (Number(it.valorTotal) || 0), 0);
    const newData = {
      ...currentData,
      valorTotal: total,
      descricaoValores: gerarDescricaoValores(currentData),
      descricaoGarantia: gerarDescricaoGarantia(currentData),
      condicaoPagamento: gerarCondicaoPagamento({ ...currentData, valorTotal: total }),
      validadeProposta: `Essa proposta possui validade até o dia: ${moment(currentData.dataValidade).format('DD/MM/YYYY')}`
    };
    setFormData(newData);
  };

  // Handlers
  const addItem = () => {
    const newItems = [...formData.itens, { id: crypto.randomUUID(), quantidade: 1, tipoCobranca: 'DIARIA', valorAcobrar: 0, mobilizacao: 0, horasPorDia: 10, valorTotal: 0 }];
    updateCalculations({ ...formData, itens: newItems });
  };

  const removeItem = (id: string) => {
    const newItems = formData.itens.filter((it: any) => it.id !== id);
    updateCalculations({ ...formData, itens: newItems });
  };

  const updateItem = (id: string, field: string, value: any) => {
    const newItems = formData.itens.map((it: any) => {
      if (it.id === id) {
        const updated = { ...it, [field]: value };
        // Recalculate item total if values changed
        if (['quantidade', 'valorAcobrar', 'mobilizacao'].includes(field)) {
          updated.valorTotal = (Number(updated.quantidade) * Number(updated.valorAcobrar)) + Number(updated.mobilizacao);
        }
        if (field === 'equipamentoId') {
          const eq = options.equipamentos.find(e => e.id === value);
          updated.equipamento = eq?.nome || '';
          
          // Automation: Pull standard accessories and responsibilities
          if (eq) {
            const stdAcs = Array.isArray(eq.acessorios) ? eq.acessorios : [];
            const stdResps = Array.isArray(eq.responsabilidades) ? eq.responsabilidades : [];
            
            // Add unique accessories
            const currentAcs = [...formData.acessorios];
            stdAcs.forEach((sac: any) => {
              if (!currentAcs.some(ca => ca.id === sac.id)) {
                const foundAc = options.acessorios.find(oa => oa.id === sac.id || oa.id === sac);
                if (foundAc) currentAcs.push({ id: foundAc.id, acessorio: foundAc.nome });
                else if (sac.acessorio) currentAcs.push({ id: 'custom', acessorio: sac.acessorio });
              }
            });

            // Add unique responsibilities
            const currentResps = [...formData.responsabilidades];
            stdResps.forEach((sr: any) => {
               if (!currentResps.some(cr => cr.descricao === (sr.descricao || sr.Responsabilidade?.Responsabilidade))) {
                 currentResps.push({ 
                   id: crypto.randomUUID(), 
                   descricao: sr.descricao || sr.Responsabilidade?.Responsabilidade || sr.Responsabilidade || '', 
                   tipo: sr.tipo === 1 ? 'CONTRATANTE' : 'CONTRATADA' 
                 });
               }
            });

            // Update parent state with automated additions
            setTimeout(() => {
                setFormData(prev => ({
                    ...prev,
                    acessorios: currentAcs,
                    responsabilidades: currentResps
                }));
            }, 0);
          }
        }
        return updated;
      }
      return it;
    });
    updateCalculations({ ...formData, itens: newItems });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl my-auto flex flex-col h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-slate-50 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Cadastro de Proposta</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Row 1: Basic Info */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-2">
              <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block">Código</label>
              <input type="text" value={formData.codigo} disabled className="w-full bg-slate-100 border border-slate-200 rounded px-3 py-2 text-sm text-slate-500 font-bold" placeholder="Automático" />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block">Data Proposta</label>
              <input type="date" value={formData.dataProposta} onChange={e => setFormData({...formData, dataProposta: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none" />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block">Validade</label>
              <input type="date" value={formData.dataValidade} onChange={e => {
                const newData = {...formData, dataValidade: e.target.value};
                updateCalculations(newData);
              }} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none" />
            </div>
            <div className="col-span-3">
              <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block">Vendedor</label>
              <select value={formData.usuarioId} onChange={e => setFormData({...formData, usuarioId: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none">
                <option value="">Selecione...</option>
                {options.vendedores.map(v => <option key={v.id} value={v.id}>{v.username || v.nome}</option>)}
              </select>
            </div>
            <div className="col-span-3">
              <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block">Empresa</label>
              <select value={formData.empresaId} onChange={e => setFormData({...formData, empresaId: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none">
                <option value="">Selecione...</option>
                {options.empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.nome || emp.razaoSocial}</option>)}
              </select>
            </div>
          </div>

          {/* Row 2: Client & Contact */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-4">
              <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block">Cliente</label>
              <select value={formData.clienteId} onChange={e => setFormData({...formData, clienteId: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none">
                <option value="">Selecione o Cliente...</option>
                {options.clientes.map(c => <option key={c.id} value={c.id}>{c.nome} ({c.documento})</option>)}
              </select>
            </div>
            <div className="col-span-4">
              <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block">Contato (A/C)</label>
              <input type="text" value={formData.contato} onChange={e => setFormData({...formData, contato: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none" />
            </div>
            <div className="col-span-4">
              <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block">CC (Cópia E-mail)</label>
              <input type="text" value={formData.cc} onChange={e => setFormData({...formData, cc: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none" placeholder="separar com ';'" />
            </div>
          </div>

          {/* Row 3: Intro & Scope */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block">Introdução</label>
              <textarea value={formData.introducao} onChange={e => setFormData({...formData, introducao: e.target.value})} rows={3} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none resize-none" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block">Objetivo / Escopo</label>
              <textarea value={formData.objetivo} onChange={e => setFormData({...formData, objetivo: e.target.value})} rows={3} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none resize-none" />
            </div>
          </div>

          {/* TABS SECTION */}
          <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col min-h-[400px]">
             {/* Tab Buttons */}
             <div className="flex bg-slate-50 border-b border-slate-200">
               {['EQUIPAMENTOS', 'ACESSÓRIOS', 'RESPONSABILIDADES', 'EQUIPE'].map((tab, idx) => (
                 <button
                  key={tab}
                  onClick={() => setAba(idx + 1)}
                  className={`px-6 py-3 text-xs font-black uppercase tracking-widest transition-all ${aba === idx + 1 ? 'bg-white text-blue-600 border-x border-slate-200 shadow-[0_-2px_0_0_#2563eb_inset]' : 'text-slate-400 hover:text-slate-600'}`}
                 >
                   {tab}
                 </button>
               ))}
             </div>

             {/* Tab Content */}
             <div className="p-4 flex-1">
                {aba === 1 && (
                  <div className="space-y-4">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2">Equipamento</th>
                          <th className="px-3 py-2 w-20 text-center">Qtd</th>
                          <th className="px-3 py-2">Área</th>
                          <th className="px-3 py-2 w-32">Cobrança</th>
                          <th className="px-3 py-2 w-28">Valor Unit.</th>
                          <th className="px-3 py-2 w-20">Horas/Dia</th>
                          <th className="px-3 py-2 w-28">Mobilização</th>
                          <th className="px-3 py-2 w-28">Total</th>
                          <th className="px-3 py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.itens.map((it: any) => (
                          <tr key={it.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                            <td className="px-2 py-1.5">
                              <select value={it.equipamentoId} onChange={e => updateItem(it.id, 'equipamentoId', e.target.value)} className="w-full border border-slate-200 rounded px-1.5 py-1 outline-none">
                                <option value="">Selecione...</option>
                                {options.equipamentos.map(eq => <option key={eq.id} value={eq.id}>{eq.nome}</option>)}
                              </select>
                            </td>
                            <td className="px-2 py-1.5">
                              <input type="number" value={it.quantidade} onChange={e => updateItem(it.id, 'quantidade', e.target.value)} className="w-full border border-slate-200 rounded px-1.5 py-1 text-center" />
                            </td>
                            <td className="px-2 py-1.5">
                              <input type="text" value={it.area} onChange={e => updateItem(it.id, 'area', e.target.value)} className="w-full border border-slate-200 rounded px-1.5 py-1" />
                            </td>
                            <td className="px-2 py-1.5">
                              <select value={it.tipoCobranca} onChange={e => updateItem(it.id, 'tipoCobranca', e.target.value)} className="w-full border border-slate-200 rounded px-1.5 py-1">
                                <option value="HORA">HORA</option>
                                <option value="DIARIA">DIÁRIA</option>
                                <option value="FRETE">FRETE</option>
                                <option value="FECHADA">FECHADA</option>
                              </select>
                            </td>
                            <td className="px-2 py-1.5">
                              <input type="number" value={it.valorAcobrar} onChange={e => updateItem(it.id, 'valorAcobrar', e.target.value)} className="w-full border border-slate-200 rounded px-1.5 py-1" />
                            </td>
                            <td className="px-2 py-1.5">
                              <input type="number" value={it.horasPorDia} onChange={e => updateItem(it.id, 'horasPorDia', e.target.value)} className="w-full border border-slate-200 rounded px-1.5 py-1" />
                            </td>
                            <td className="px-2 py-1.5">
                              <input type="number" value={it.mobilizacao} onChange={e => updateItem(it.id, 'mobilizacao', e.target.value)} className="w-full border border-slate-200 rounded px-1.5 py-1" />
                            </td>
                            <td className="px-3 py-1.5 font-bold text-slate-700">
                              R$ {(it.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              <button onClick={() => removeItem(it.id)} className="text-red-500 p-1 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <button onClick={addItem} className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-wider hover:text-blue-700 transition-colors">
                      <Plus className="w-4 h-4" /> Adicionar Equipamento
                    </button>
                  </div>
                )}
                
                {aba === 2 && (
                  <div className="space-y-4">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2">Acessório</th>
                          <th className="px-3 py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.acessorios.map((ac: any, idx: number) => (
                          <tr key={idx} className="border-b border-slate-100">
                            <td className="px-2 py-1.5">
                              {ac.id === 'custom' ? (
                                <input 
                                  type="text" 
                                  value={ac.acessorio} 
                                  onChange={e => {
                                    const newAcs = [...formData.acessorios];
                                    newAcs[idx].acessorio = e.target.value;
                                    setFormData({...formData, acessorios: newAcs});
                                  }}
                                  className="w-full border border-slate-200 rounded px-1.5 py-1 outline-none"
                                  placeholder="Digite o nome do acessório..."
                                />
                              ) : (
                                <select 
                                  value={ac.id} 
                                  onChange={e => {
                                    const eq = options.acessorios.find(a => a.id === e.target.value);
                                    const newAcs = [...formData.acessorios];
                                    newAcs[idx] = { id: e.target.value, acessorio: eq?.nome || '' };
                                    setFormData({...formData, acessorios: newAcs});
                                  }} 
                                  className="w-full border border-slate-200 rounded px-1.5 py-1 outline-none"
                                >
                                  <option value="">Selecione...</option>
                                  {options.acessorios.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                                </select>
                              )}
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              <button onClick={() => {
                                const newAcs = formData.acessorios.filter((_: any, i: number) => i !== idx);
                                setFormData({...formData, acessorios: newAcs});
                              }} className="text-red-500 p-1 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="flex gap-4">
                      <button onClick={() => setFormData({...formData, acessorios: [...formData.acessorios, { id: '', acessorio: '' }]})} className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-wider hover:text-blue-700">
                        <Plus className="w-4 h-4" /> Adicionar Acessório
                      </button>
                      <button onClick={() => setFormData({...formData, acessorios: [...formData.acessorios, { id: 'custom', acessorio: '' }]})} className="flex items-center gap-2 text-slate-600 font-black text-[10px] uppercase tracking-wider hover:text-slate-700">
                        <Plus className="w-4 h-4" /> Cadastrar Acessório Avulso
                      </button>
                    </div>
                  </div>
                )}

                {aba === 3 && (
                  <div className="grid grid-cols-2 gap-8">
                    {/* Contratante */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Contratante (Cliente)</h4>
                      <div className="space-y-2 min-h-[200px] bg-slate-50/50 rounded-lg p-2">
                        {formData.responsabilidades.filter((r: any) => r.tipo === 'CONTRATANTE').map((r: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded border border-slate-200 group shadow-sm">
                            <span className="flex-1 text-xs text-slate-600">{r.descricao}</span>
                            <button onClick={() => {
                              const newResps = formData.responsabilidades.map((resp: any) => resp === r ? { ...resp, tipo: 'CONTRATADA' } : resp);
                              setFormData({...formData, responsabilidades: newResps});
                            }} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-blue-50 text-blue-500 rounded transition-all">
                              <ArrowRight className="w-4 h-4" />
                            </button>
                            <button onClick={() => {
                               setFormData({...formData, responsabilidades: formData.responsabilidades.filter((resp: any) => resp !== r)});
                            }} className="p-1 hover:bg-red-50 text-red-400 rounded"><X className="w-3 h-3" /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Contratada */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Contratada (Nacional Hidro)</h4>
                      <div className="space-y-2 min-h-[200px] bg-slate-50/50 rounded-lg p-2">
                        {formData.responsabilidades.filter((r: any) => r.tipo !== 'CONTRATANTE').map((r: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded border border-slate-200 group shadow-sm">
                            <button onClick={() => {
                              const newResps = formData.responsabilidades.map((resp: any) => resp === r ? { ...resp, tipo: 'CONTRATANTE' } : resp);
                              setFormData({...formData, responsabilidades: newResps});
                            }} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-blue-50 text-blue-500 rounded transition-all">
                              <ArrowLeft className="w-4 h-4" />
                            </button>
                            <span className="flex-1 text-xs text-slate-600">{r.descricao}</span>
                            <button onClick={() => {
                               setFormData({...formData, responsabilidades: formData.responsabilidades.filter((resp: any) => resp !== r)});
                            }} className="p-1 hover:bg-red-50 text-red-400 rounded"><X className="w-3 h-3" /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <button onClick={() => {
                        const desc = window.prompt('Digite a responsabilidade:');
                        if (desc) {
                          setFormData({...formData, responsabilidades: [...formData.responsabilidades, { id: crypto.randomUUID(), descricao: desc, tipo: 'CONTRATADA' }]});
                        }
                      }} className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-wider">
                        <Plus className="w-4 h-4" /> Adicionar Responsabilidade Avulsa
                      </button>
                    </div>
                  </div>
                )}

                {aba === 4 && (
                  <div className="space-y-4">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2">Cargo</th>
                          <th className="px-3 py-2">Equipamento</th>
                          <th className="px-3 py-2 w-24 text-center">Quantidade</th>
                          <th className="px-3 py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.equipe.map((e: any, idx: number) => {
                          const selectedCargo = options.cargos.find(c => c.id === e.cargoId);
                          return (
                            <tr key={idx} className="border-b border-slate-100">
                              <td className="px-2 py-1.5">
                                <select 
                                  value={e.cargoId} 
                                  onChange={ev => {
                                    const cargo = options.cargos.find(c => c.id === ev.target.value);
                                    const newEquipe = [...formData.equipe];
                                    newEquipe[idx] = { ...newEquipe[idx], cargoId: ev.target.value, cargo: cargo?.nome || cargo?.descricao || '' };
                                    setFormData({...formData, equipe: newEquipe});
                                  }}
                                  className="w-full border border-slate-200 rounded px-1.5 py-1 outline-none"
                                >
                                  <option value="">Selecione o Cargo...</option>
                                  {options.cargos.map(c => <option key={c.id} value={c.id}>{c.nome || c.descricao}</option>)}
                                </select>
                              </td>
                              <td className="px-2 py-1.5">
                                {!selectedCargo?.unicoEquipamento && (
                                  <select 
                                    value={e.equipamento} 
                                    onChange={ev => {
                                      const newEquipe = [...formData.equipe];
                                      newEquipe[idx].equipamento = ev.target.value;
                                      setFormData({...formData, equipe: newEquipe});
                                    }}
                                    className="w-full border border-slate-200 rounded px-1.5 py-1 outline-none"
                                  >
                                    <option value="">Selecione o Equipamento...</option>
                                    {formData.itens.map((it: any) => (
                                      <option key={it.id} value={it.equipamento}>{it.equipamento}</option>
                                    ))}
                                    <option value="VARIOS">VÁRIOS</option>
                                  </select>
                                )}
                              </td>
                              <td className="px-2 py-1.5">
                                <input 
                                  type="number" 
                                  value={e.quantidade} 
                                  onChange={ev => {
                                    const newEquipe = [...formData.equipe];
                                    newEquipe[idx].quantidade = Number(ev.target.value);
                                    setFormData({...formData, equipe: newEquipe});
                                  }}
                                  className="w-full border border-slate-200 rounded px-1.5 py-1 text-center outline-none"
                                />
                              </td>
                              <td className="px-2 py-1.5 text-center">
                                <button onClick={() => {
                                  const newEquipe = formData.equipe.filter((_: any, i: number) => i !== idx);
                                  setFormData({...formData, equipe: newEquipe});
                                }} className="text-red-500 p-1 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <button onClick={() => setFormData({...formData, equipe: [...formData.equipe, { cargoId: '', cargoName: '', equipamentoName: '', quantidade: 1 }]})} className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-wider hover:text-blue-700">
                      <Plus className="w-4 h-4" /> Adicionar à Equipe
                    </button>
                  </div>
                )}
             </div>
          </div>

          {/* FOOTER TEXT AREAS (Auto-generated) */}
          <div className="grid grid-cols-2 gap-6">
             <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block">Descrição dos Valores</label>
                  <textarea value={formData.descricaoValores} onChange={e => setFormData({...formData, descricaoValores: e.target.value})} rows={6} className="w-full border border-slate-300 rounded px-3 py-2 text-xs focus:border-blue-500 outline-none resize-none bg-slate-50/30" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block">Descrição da Garantia</label>
                  <textarea value={formData.descricaoGarantia} onChange={e => setFormData({...formData, descricaoGarantia: e.target.value})} rows={6} className="w-full border border-slate-300 rounded px-3 py-2 text-xs focus:border-blue-500 outline-none resize-none bg-slate-50/30" />
                </div>
             </div>
             <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase block">Condições de Pagamento</label>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1 text-[9px] font-bold text-slate-600">
                        RL (%) 
                        <input type="number" value={formData.porcentagemRL} onChange={e => {
                          const newData = {...formData, porcentagemRL: Number(e.target.value)};
                          updateCalculations(newData);
                        }} className="w-10 border border-slate-300 rounded px-1 transition-all" />
                      </label>
                      <label className="flex items-center gap-1 text-[9px] font-bold text-slate-600">
                        CTE
                        <input type="checkbox" checked={formData.cte} onChange={e => {
                          const newData = {...formData, cte: e.target.checked};
                          updateCalculations(newData);
                        }} className="rounded" />
                      </label>
                    </div>
                  </div>
                  <textarea value={formData.condicaoPagamento} onChange={e => setFormData({...formData, condicaoPagamento: e.target.value})} rows={6} className="w-full border border-slate-300 rounded px-3 py-2 text-xs focus:border-blue-500 outline-none resize-none bg-slate-50/30" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block">Validade Proposta</label>
                  <textarea value={formData.validadeProposta} onChange={e => setFormData({...formData, validadeProposta: e.target.value})} rows={2} className="w-full border border-slate-300 rounded px-3 py-2 text-xs focus:border-blue-500 outline-none resize-none bg-slate-50/30" />
                </div>
                {/* Total Visualizer */}
                <div className="bg-slate-900 rounded-xl p-4 flex items-center justify-between shadow-lg">
                   <div className="text-white/50 text-[10px] font-black uppercase tracking-wider">Valor Total da Proposta</div>
                   <div className="text-2xl font-black text-white">
                     R$ {(formData.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t bg-slate-50 rounded-b-xl flex justify-end gap-3 px-6">
          <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-all">Cancelar</button>
          <button onClick={() => onSave(formData)} className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm uppercase tracking-widest rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center gap-2">
            <Save className="w-4 h-4" /> Salvar Proposta
          </button>
        </div>
      </div>
    </div>
  );
}
