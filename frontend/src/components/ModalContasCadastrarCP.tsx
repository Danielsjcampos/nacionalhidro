import { useState, useEffect } from 'react';
import { X, Plus, Trash2, AlertCircle, CheckCircle2, Package, Building2, Calculator, CreditCard } from 'lucide-react';
import api from '../services/api';

interface Props {
  data?: any;
  open: boolean;
  onClose: () => void;
  onSave: (conta: any) => void;
  empresas: any[];
  clientes: any[];
  listas: { fornecedores: any[]; centroscusto: any[]; naturezascontabeis: any[] };
}

const inputCls = "w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all";
const inputErr = "w-full border border-red-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500/20 bg-red-50/30";
const labelCls = "text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block";

export default function ModalContasCadastrarCP({ data, open, onClose, onSave, empresas, clientes, listas }: Props) {
  const [conta, setConta] = useState<any>({});
  const [produtos, setProdutos] = useState<any[]>([{ descricao: '', quantidade: 1, valorUnitario: 0 }]);
  const [centros, setCentros] = useState<any[]>([{ centroCustoId: '', valor: 0 }]);
  const [naturezas, setNaturezas] = useState<any[]>([{ naturezaContabilId: '', valor: 0 }]);
  const [parcelas, setParcelas] = useState<any[]>([]);
  const [notaIsValid, setNotaIsValid] = useState<{ data: boolean } | null>(null);
  const [savedNF, setSavedNF] = useState('');
  const [savedFornId, setSavedFornId] = useState('');

  useEffect(() => {
    if (!open) return;
    if (data) {
      setConta({
        id: data.id, fornecedorId: data.fornecedorId || '', empresa: data.empresa || '',
        numeroNF: data.notaFiscal || '', dataEmissaoNF: data.dataEmissao ? new Date(data.dataEmissao).toISOString().slice(0, 10) : '',
        observacoes: data.observacoes || '', clienteId: data.clienteId || '',
        tipoParcela: data.tipoParcela || '', diaPagamento: data.diaPagamento || '',
        intervaloPeriodo: data.intervaloPeriodo || '', qtdParcela: data.totalParcelas || 1,
      });
      setProdutos(data.produtos?.length ? data.produtos.map((p: any) => ({ descricao: p.descricao, quantidade: p.quantidade, valorUnitario: Number(p.valorUnitario) })) : [{ descricao: '', quantidade: 1, valorUnitario: 0 }]);
      setCentros(data.centrosCustoCP?.length ? data.centrosCustoCP.map((c: any) => ({ centroCustoId: c.centroCustoId || '', valor: Number(c.valor) })) : [{ centroCustoId: '', valor: 0 }]);
      setNaturezas(data.naturezasCP?.length ? data.naturezasCP.map((n: any) => ({ naturezaContabilId: n.naturezaContabilId || '', valor: Number(n.valor) })) : [{ naturezaContabilId: '', valor: 0 }]);
      const existingParcelas = data.pagamentoCP?.parcelas || [];
      setParcelas(existingParcelas.map((p: any) => ({
        numeroParcela: p.numeroParcela, valorParcela: Number(p.valorParcela),
        dataVencimento: p.dataVencimento ? new Date(p.dataVencimento).toISOString().slice(0, 10) : '',
        statusPagamento: p.statusPagamento || 0,
      })));
      setSavedNF(data.notaFiscal || '');
      setSavedFornId(data.fornecedorId || '');
      setNotaIsValid(null);
    } else {
      setConta({ fornecedorId: '', empresa: '', numeroNF: '', dataEmissaoNF: '', observacoes: '', clienteId: '', tipoParcela: '', diaPagamento: '', intervaloPeriodo: '', qtdParcela: 1 });
      setProdutos([{ descricao: '', quantidade: 1, valorUnitario: 0 }]);
      setCentros([{ centroCustoId: '', valor: 0 }]);
      setNaturezas([{ naturezaContabilId: '', valor: 0 }]);
      setParcelas([]);
      setSavedNF(''); setSavedFornId('');
      setNotaIsValid(null);
    }
  }, [open, data]);

  const valorTotal = produtos.reduce((s, p) => s + (Number(p.quantidade) || 0) * (Number(p.valorUnitario) || 0), 0);
  const centroSum = centros.reduce((s, c) => s + (Number(c.valor) || 0), 0);
  const naturezaSum = naturezas.reduce((s, n) => s + (Number(n.valor) || 0), 0);
  const parcelaSum = parcelas.reduce((s, p) => s + (Number(p.valorParcela) || 0), 0);
  const centroIsValid = centros.length === 0 || !centros[0].centroCustoId || Math.abs(centroSum - valorTotal) < 0.02;
  const naturezaIsValid = naturezas.length === 0 || !naturezas[0].naturezaContabilId || Math.abs(naturezaSum - valorTotal) < 0.02;
  const parcelaIsValid = parcelas.length === 0 || Math.abs(parcelaSum - valorTotal) < 0.02;

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const validarNF = async () => {
    if (conta.numeroNF === savedNF && conta.fornecedorId === savedFornId) {
      setNotaIsValid({ data: true }); return;
    }
    try {
      const res = await api.get('/contas-pagar/validar-nf', { params: { nota: conta.numeroNF, fornecedorId: conta.fornecedorId } });
      setNotaIsValid(res.data);
    } catch { setNotaIsValid({ data: true }); }
  };

  const nfChanged = conta.numeroNF !== savedNF || conta.fornecedorId !== savedFornId;

  const gerarParcelas = () => {
    const qtd = Number(conta.qtdParcela) || 1;
    const vp = Math.round((valorTotal / qtd) * 100) / 100;
    const novas: any[] = [];
    for (let i = 0; i < qtd; i++) {
      let dt = new Date();
      if (conta.tipoParcela === 'Periodo') {
        dt.setDate(dt.getDate() + (Number(conta.intervaloPeriodo) || 30) * (i + 1));
      } else {
        dt.setMonth(dt.getMonth() + i + 1);
        const dia = Number(conta.diaPagamento) || 10;
        const lastDay = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
        dt.setDate(Math.min(dia, lastDay));
      }
      novas.push({ numeroParcela: i + 1, valorParcela: vp, dataVencimento: dt.toISOString().slice(0, 10), statusPagamento: 0 });
    }
    setParcelas(novas);
  };

  const canGerarParcelas = Number(conta.qtdParcela) > 0 && conta.tipoParcela && produtos.some(p => p.descricao) &&
    (conta.tipoParcela === 'Periodo' ? Number(conta.intervaloPeriodo) > 0 : Number(conta.diaPagamento) > 0 && Number(conta.diaPagamento) <= 31) &&
    !parcelas.some(p => p.statusPagamento !== 0);

  const isValid = conta.fornecedorId && conta.empresa && (!conta.numeroNF || notaIsValid?.data !== false) && parcelaIsValid && parcelas.length > 0;

  const handleSave = () => {
    if (conta.numeroNF && !notaIsValid && !data) {
      validarNF().then(() => {
        if (notaIsValid?.data !== false) doSave();
      });
      return;
    }
    doSave();
  };

  const doSave = () => {
    onSave({
      id: conta.id, fornecedorId: conta.fornecedorId, empresa: conta.empresa,
      notaFiscal: conta.numeroNF, dataEmissao: conta.dataEmissaoNF,
      observacoes: conta.observacoes, clienteId: conta.clienteId || null,
      tipoParcela: conta.tipoParcela, diaPagamento: conta.diaPagamento ? Number(conta.diaPagamento) : null,
      intervaloPeriodo: conta.intervaloPeriodo ? Number(conta.intervaloPeriodo) : null,
      produtos: produtos.filter(p => p.descricao),
      centrosCusto: centros.filter(c => c.centroCustoId),
      naturezas: naturezas.filter(n => n.naturezaContabilId),
      parcelas,
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-4">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-black text-slate-800">{data ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}</h2>
            <p className="text-xs text-slate-400">Preencha produtos, centros de custo, naturezas e gere as parcelas</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Cabeçalho */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div><label className={labelCls}>Fornecedor *</label>
              <select value={conta.fornecedorId} onChange={e => { setConta({ ...conta, fornecedorId: e.target.value }); setNotaIsValid(null); }} className={!conta.fornecedorId ? inputErr : inputCls}>
                <option value="">Selecione</option>
                {listas.fornecedores.map((f: any) => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>Empresa Pagadora *</label>
              <select value={conta.empresa} onChange={e => setConta({ ...conta, empresa: e.target.value })} className={!conta.empresa ? inputErr : inputCls}>
                <option value="">Selecione</option>
                {empresas.map((e: any) => <option key={e.id || e.cnpj} value={e.nome || e.empresa}>{e.nome || e.empresa}</option>)}
                <option value="NACIONAL">NACIONAL HIDRO</option>
                <option value="HIDRO">HIDRO LOCAÇÕES</option>
              </select>
            </div>
            <div><label className={labelCls}>Nº Nota Fiscal</label>
              <div className="flex gap-2">
                <input value={conta.numeroNF} onChange={e => { setConta({ ...conta, numeroNF: e.target.value }); setNotaIsValid(null); }} className={inputCls} placeholder="000.000" />
                {nfChanged && conta.numeroNF && conta.fornecedorId && (
                  <button onClick={validarNF} className="bg-blue-600 text-white px-3 rounded-lg text-[10px] font-bold whitespace-nowrap hover:bg-blue-700">Validar</button>
                )}
              </div>
              {notaIsValid?.data === false && <p className="text-[10px] text-red-600 font-bold mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Nota já inclusa no sistema!</p>}
              {notaIsValid?.data === true && conta.numeroNF && <p className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Nota válida!</p>}
            </div>
            <div><label className={labelCls}>Emissão NF</label>
              <input type="date" value={conta.dataEmissaoNF} onChange={e => setConta({ ...conta, dataEmissaoNF: e.target.value })} className={inputCls} />
            </div>
            <div className="col-span-2"><label className={labelCls}>Observações</label>
              <textarea value={conta.observacoes} onChange={e => setConta({ ...conta, observacoes: e.target.value })} onBlur={e => setConta({ ...conta, observacoes: e.target.value.toUpperCase() })} className={inputCls + ' min-h-[60px]'} />
            </div>
          </div>

          {/* Produtos */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h3 className="text-sm font-black text-slate-700 flex items-center gap-2 mb-3"><Package className="w-4 h-4 text-blue-600" /> Produtos</h3>
            {produtos.map((p, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 mb-2 items-end">
                <div className="col-span-6"><label className={labelCls}>Descrição *</label>
                  <input value={p.descricao} onChange={e => { const n = [...produtos]; n[i].descricao = e.target.value; setProdutos(n); }} onBlur={e => { const n = [...produtos]; n[i].descricao = e.target.value.toUpperCase(); setProdutos(n); }} className={!p.descricao ? inputErr : inputCls} />
                </div>
                <div className="col-span-2"><label className={labelCls}>Qtd *</label>
                  <input type="number" min="1" value={p.quantidade} onChange={e => { const n = [...produtos]; n[i].quantidade = Number(e.target.value); setProdutos(n); }} className={inputCls} />
                </div>
                <div className="col-span-3"><label className={labelCls}>Valor Unit. (R$)</label>
                  <input type="number" step="0.01" value={p.valorUnitario} onChange={e => { const n = [...produtos]; n[i].valorUnitario = Number(e.target.value); setProdutos(n); }} className={inputCls} />
                </div>
                <div className="col-span-1 flex justify-center">
                  {produtos.length > 1 && <button onClick={() => setProdutos(produtos.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>}
                </div>
              </div>
            ))}
            <button onClick={() => setProdutos([...produtos, { descricao: '', quantidade: 1, valorUnitario: 0 }])} className="text-blue-600 text-xs font-bold hover:underline flex items-center gap-1 mt-1"><Plus className="w-3 h-3" /> Adicionar Produto</button>
          </div>

          {/* Custo Direto Cliente */}
          <div><label className={labelCls}><Building2 className="w-3 h-3 inline mr-1" />Custo Direto Cliente (Razão Social)</label>
            <select value={conta.clienteId || ''} onChange={e => setConta({ ...conta, clienteId: e.target.value })} className={inputCls}>
              <option value="">Nenhum (sem vínculo)</option>
              {clientes.map((c: any) => <option key={c.id} value={c.id}>{c.razaoSocial || c.nome} - {c.cnpj || ''}</option>)}
            </select>
          </div>

          {/* Centros de Custo */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h3 className="text-sm font-black text-slate-700 mb-3">Centros de Custos {!centroIsValid && <span className="text-red-500 text-[10px] ml-2">⚠ Soma ({fmt(centroSum)}) ≠ Total ({fmt(valorTotal)})</span>}</h3>
            {centros.map((c, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 mb-2 items-end">
                <div className="col-span-7"><select value={c.centroCustoId} onChange={e => { const n = [...centros]; n[i].centroCustoId = e.target.value; setCentros(n); }} className={inputCls}>
                  <option value="">Selecione</option>
                  {listas.centroscusto.map((cc: any) => <option key={cc.id} value={cc.id}>{cc.nome}</option>)}
                </select></div>
                <div className="col-span-4"><input type="number" step="0.01" value={c.valor} onChange={e => { const n = [...centros]; n[i].valor = Number(e.target.value); setCentros(n); }} className={inputCls} placeholder="Valor R$" /></div>
                <div className="col-span-1 flex justify-center">{centros.length > 1 && <button onClick={() => setCentros(centros.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>}</div>
              </div>
            ))}
            <button onClick={() => setCentros([...centros, { centroCustoId: '', valor: 0 }])} className="text-blue-600 text-xs font-bold hover:underline flex items-center gap-1 mt-1"><Plus className="w-3 h-3" /> Adicionar Centro de Custo</button>
          </div>

          {/* Naturezas Contábeis */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h3 className="text-sm font-black text-slate-700 mb-3">Naturezas Contábeis {!naturezaIsValid && <span className="text-red-500 text-[10px] ml-2">⚠ Soma ({fmt(naturezaSum)}) ≠ Total ({fmt(valorTotal)})</span>}</h3>
            {naturezas.map((n, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 mb-2 items-end">
                <div className="col-span-7"><select value={n.naturezaContabilId} onChange={e => { const nn = [...naturezas]; nn[i].naturezaContabilId = e.target.value; setNaturezas(nn); }} className={inputCls}>
                  <option value="">Selecione</option>
                  {listas.naturezascontabeis.map((nc: any) => <option key={nc.id} value={nc.id}>{nc.nome || nc.descricao}</option>)}
                </select></div>
                <div className="col-span-4"><input type="number" step="0.01" value={n.valor} onChange={e => { const nn = [...naturezas]; nn[i].valor = Number(e.target.value); setNaturezas(nn); }} className={inputCls} placeholder="Valor R$" /></div>
                <div className="col-span-1 flex justify-center">{naturezas.length > 1 && <button onClick={() => setNaturezas(naturezas.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>}</div>
              </div>
            ))}
            <button onClick={() => setNaturezas([...naturezas, { naturezaContabilId: '', valor: 0 }])} className="text-blue-600 text-xs font-bold hover:underline flex items-center gap-1 mt-1"><Plus className="w-3 h-3" /> Adicionar Natureza</button>
          </div>

          {/* Pagamento */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <h3 className="text-sm font-black text-slate-700 flex items-center gap-2 mb-3">
              <CreditCard className="w-4 h-4 text-blue-600" /> Pagamento
              <span className="ml-auto text-base font-black text-blue-700">Valor Total: {fmt(valorTotal)}</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div><label className={labelCls}>Qtd Parcelas</label>
                <input type="number" min="1" value={conta.qtdParcela} onChange={e => setConta({ ...conta, qtdParcela: e.target.value })} className={inputCls} /></div>
              <div><label className={labelCls}>Tipo Parcela</label>
                <select value={conta.tipoParcela} onChange={e => setConta({ ...conta, tipoParcela: e.target.value })} className={inputCls}>
                  <option value="">Selecione</option><option value="Fixo">Fixo</option><option value="Periodo">Período</option>
                </select></div>
              {conta.tipoParcela === 'Periodo' && <div><label className={labelCls}>Intervalo (dias)</label>
                <input type="number" min="1" value={conta.intervaloPeriodo} onChange={e => setConta({ ...conta, intervaloPeriodo: e.target.value })} className={inputCls} /></div>}
              {conta.tipoParcela === 'Fixo' && <div><label className={labelCls}>Dia Pagamento (1-31)</label>
                <input type="number" min="1" max="31" value={conta.diaPagamento} onChange={e => setConta({ ...conta, diaPagamento: e.target.value })} className={inputCls} /></div>}
              <div className="flex items-end">
                <button onClick={gerarParcelas} disabled={!canGerarParcelas} className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-xs font-bold disabled:opacity-40 hover:bg-blue-700 transition-colors">
                  <Calculator className="w-3.5 h-3.5 inline mr-1" /> Gerar Parcelas
                </button>
              </div>
            </div>

            {parcelas.length > 0 && (
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <table className="w-full text-xs">
                  <thead><tr className="bg-slate-50 text-left">
                    <th className="p-2.5 font-bold text-slate-500">Nº</th>
                    <th className="p-2.5 font-bold text-slate-500">Valor Parcela (R$)</th>
                    <th className="p-2.5 font-bold text-slate-500">Vencimento</th>
                  </tr></thead>
                  <tbody>{parcelas.map((p, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="p-2.5 font-bold text-slate-600">{p.numeroParcela}</td>
                      <td className="p-2.5"><input type="number" step="0.01" value={p.valorParcela} disabled={p.statusPagamento !== 0}
                        onChange={e => { const n = [...parcelas]; n[i].valorParcela = Number(e.target.value); setParcelas(n); }}
                        className={`w-32 ${p.statusPagamento !== 0 ? 'bg-slate-100 text-slate-400' : ''} ${!p.valorParcela ? 'border-red-300' : 'border-slate-200'} border rounded-lg p-1.5 text-sm`} /></td>
                      <td className="p-2.5"><input type="date" value={p.dataVencimento} disabled={p.statusPagamento !== 0}
                        onChange={e => { const n = [...parcelas]; n[i].dataVencimento = e.target.value; setParcelas(n); }}
                        className={`${p.statusPagamento !== 0 ? 'bg-slate-100 text-slate-400' : ''} border border-slate-200 rounded-lg p-1.5 text-sm`} /></td>
                    </tr>
                  ))}</tbody>
                </table>
                {!parcelaIsValid && <p className="text-[10px] text-red-600 font-bold p-2 bg-red-50">⚠ Soma das parcelas ({fmt(parcelaSum)}) ≠ Valor Total ({fmt(valorTotal)})</p>}
              </div>
            )}
          </div>
        </div>

        <div className="p-5 border-t border-slate-100 flex items-center justify-between">
          <div>{conta.numeroNF && !notaIsValid && <p className="text-[10px] text-amber-600 font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Favor validar o nº da nota!</p>}</div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-slate-600 font-bold text-sm bg-slate-100 hover:bg-slate-200">Cancelar</button>
            <button onClick={handleSave} disabled={!isValid} className="px-5 py-2.5 rounded-lg text-white font-bold text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-40 shadow-lg shadow-blue-500/20">
              {data ? 'Salvar' : 'Cadastrar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
