import { useState, useEffect } from 'react';
import { X, Plus, Trash2, AlertCircle, CheckCircle2, Calculator, Receipt } from 'lucide-react';
import api from '../services/api';

interface Props {
  data?: any;
  open: boolean;
  onClose: () => void;
  onSave: (conta: any) => void;
  clientes: any[];
  listas: { centroscusto: any[]; naturezascontabeis: any[] };
}

const inputCls = "w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all";
const inputErr = "w-full border border-red-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500/20 bg-red-50/30";
const labelCls = "text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block";

const TIPO_FATURA = ['RL', 'NF', 'CTE'];

export default function ModalContasCadastrarCR({ data, open, onClose, onSave, clientes, listas }: Props) {
  const [conta, setConta] = useState<any>({});
  const [centros, setCentros] = useState<any[]>([{ centroCustoId: '', valor: 0 }]);
  const [naturezas, setNaturezas] = useState<any[]>([{ naturezaContabilId: '', valor: 0 }]);
  const [parcelas, setParcelas] = useState<any[]>([]);
  const [notaValid, setNotaValid] = useState<{ data: boolean } | null>(null);

  useEffect(() => {
    if (!open) return;
    if (data) {
      setConta({
        id: data.id, empresa: data.empresa || '', clienteId: data.clienteId || '',
        notaFiscal: data.notaFiscal || '', tipoFatura: data.tipoFatura || '',
        dataEmissao: data.dataEmissao ? new Date(data.dataEmissao).toISOString().slice(0, 10) : '',
        valorBruto: Number(data.valorOriginal) || 0, observacoes: data.observacoes || '',
        tipoParcela: data.tipoParcela || '', diaPagamento: data.diaPagamento || '',
        intervaloPeriodo: data.intervaloPeriodo || '', qtdParcela: data.totalParcelas || 1,
        insercaoManual: data.insercaoManual || false,
        valorIss: Number(data.valorIss) || 0, valorInss: Number(data.valorInss) || 0,
        valorPis: Number(data.valorPis) || 0, valorCofins: Number(data.valorCofins) || 0,
        valorIr: Number(data.valorIr) || 0, valorCsll: Number(data.valorCsll) || 0,
        valorIcms: Number(data.valorIcms) || 0,
      });
      setCentros(data.centrosCustoCR?.length ? data.centrosCustoCR.map((c: any) => ({ centroCustoId: c.centroCustoId || '', valor: Number(c.valor) })) : [{ centroCustoId: '', valor: 0 }]);
      setNaturezas(data.naturezasCR?.length ? data.naturezasCR.map((n: any) => ({ naturezaContabilId: n.naturezaContabilId || '', valor: Number(n.valor) })) : [{ naturezaContabilId: '', valor: 0 }]);
      const ep = data.recebimentoCR?.parcelas || [];
      setParcelas(ep.map((p: any) => ({
        numeroParcela: p.numeroParcela, valorParcela: Number(p.valorParcela),
        dataVencimento: p.dataVencimento ? new Date(p.dataVencimento).toISOString().slice(0, 10) : '',
        statusRecebimento: p.statusRecebimento || 0,
      })));
    } else {
      setConta({ empresa: '', clienteId: '', notaFiscal: '', tipoFatura: '', dataEmissao: '', valorBruto: 0, observacoes: '', tipoParcela: '', diaPagamento: '', intervaloPeriodo: '', qtdParcela: 1, insercaoManual: true, valorIss: 0, valorInss: 0, valorPis: 0, valorCofins: 0, valorIr: 0, valorCsll: 0, valorIcms: 0 });
      setCentros([{ centroCustoId: '', valor: 0 }]);
      setNaturezas([{ naturezaContabilId: '', valor: 0 }]);
      setParcelas([]); setNotaValid(null);
    }
  }, [open, data]);

  const totalImpostos = (Number(conta.valorIss) || 0) + (Number(conta.valorInss) || 0) + (Number(conta.valorPis) || 0) + (Number(conta.valorCofins) || 0) + (Number(conta.valorIr) || 0) + (Number(conta.valorCsll) || 0) + (Number(conta.valorIcms) || 0);
  const valorLiquido = (Number(conta.valorBruto) || 0) - totalImpostos;
  const parcelaSum = parcelas.reduce((s, p) => s + (Number(p.valorParcela) || 0), 0);
  const parcelaValid = parcelas.length === 0 || Math.abs(parcelaSum - valorLiquido) < 0.02;

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const validarNota = async () => {
    try {
      const res = await api.get('/contas-receber/validar-nota', { params: { nota: conta.notaFiscal, empresaId: conta.empresa, tipoFatura: conta.tipoFatura } });
      setNotaValid(res.data);
    } catch { setNotaValid({ data: true }); }
  };

  const gerarParcelas = () => {
    const qtd = Number(conta.qtdParcela) || 1;
    const vp = Math.round((valorLiquido / qtd) * 100) / 100;
    const novas: any[] = [];
    for (let i = 0; i < qtd; i++) {
      let dt = new Date();
      if (conta.tipoParcela === 'Periodo') {
        dt.setDate(dt.getDate() + (Number(conta.intervaloPeriodo) || 30) * (i + 1));
      } else {
        dt.setMonth(dt.getMonth() + i + 1);
        const dia = Number(conta.diaPagamento) || 10;
        dt.setDate(Math.min(dia, new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate()));
      }
      novas.push({ numeroParcela: i + 1, valorParcela: vp, dataVencimento: dt.toISOString().slice(0, 10), statusRecebimento: 0 });
    }
    setParcelas(novas);
  };

  const canGerar = Number(conta.qtdParcela) > 0 && conta.tipoParcela && valorLiquido > 0 &&
    (conta.tipoParcela === 'Periodo' ? Number(conta.intervaloPeriodo) > 0 : Number(conta.diaPagamento) > 0);
  const isValid = conta.empresa && conta.clienteId && valorLiquido > 0 && parcelas.length > 0 && parcelaValid && notaValid?.data !== false;

  const handleSave = () => {
    onSave({
      id: conta.id, empresa: conta.empresa, clienteId: conta.clienteId,
      notaFiscal: conta.notaFiscal, tipoFatura: conta.tipoFatura,
      dataEmissao: conta.dataEmissao, valorBruto: conta.valorBruto,
      valorTotal: valorLiquido, insercaoManual: conta.insercaoManual,
      observacoes: conta.observacoes,
      valorIss: conta.valorIss, valorInss: conta.valorInss,
      valorPis: conta.valorPis, valorCofins: conta.valorCofins,
      valorIr: conta.valorIr, valorCsll: conta.valorCsll, valorIcms: conta.valorIcms,
      tipoParcela: conta.tipoParcela, diaPagamento: conta.diaPagamento ? Number(conta.diaPagamento) : null,
      intervaloPeriodo: conta.intervaloPeriodo ? Number(conta.intervaloPeriodo) : null,
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
            <h2 className="text-lg font-black text-slate-800">{data ? 'Editar Conta a Receber' : 'Nova Conta a Receber'}</h2>
            <p className="text-xs text-slate-400">Informe dados fiscais, impostos e parcelas de recebimento</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Header */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div><label className={labelCls}>Empresa *</label>
              <select value={conta.empresa} onChange={e => setConta({ ...conta, empresa: e.target.value })} className={!conta.empresa ? inputErr : inputCls}>
                <option value="">Selecione</option>
                <option value="NACIONAL">NACIONAL HIDRO</option>
                <option value="HIDRO">HIDRO LOCAÇÕES</option>
              </select>
            </div>
            <div><label className={labelCls}>Cliente *</label>
              <select value={conta.clienteId} onChange={e => setConta({ ...conta, clienteId: e.target.value })} className={!conta.clienteId ? inputErr : inputCls}>
                <option value="">Selecione</option>
                {clientes.map((c: any) => <option key={c.id} value={c.id}>{c.razaoSocial || c.nome}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>Tipo Fatura</label>
              <select value={conta.tipoFatura} onChange={e => setConta({ ...conta, tipoFatura: e.target.value })} className={inputCls}>
                <option value="">Selecione</option>
                {TIPO_FATURA.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>Nº Nota / Documento</label>
              <div className="flex gap-2">
                <input value={conta.notaFiscal} onChange={e => { setConta({ ...conta, notaFiscal: e.target.value }); setNotaValid(null); }} className={inputCls} placeholder="000.000" />
                {conta.notaFiscal && <button onClick={validarNota} className="bg-teal-600 text-white px-3 rounded-lg text-[10px] font-bold whitespace-nowrap hover:bg-teal-700">Validar</button>}
              </div>
              {notaValid?.data === false && <p className="text-[10px] text-red-600 font-bold mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Nota duplicada!</p>}
              {notaValid?.data === true && <p className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> OK</p>}
            </div>
            <div><label className={labelCls}>Emissão</label>
              <input type="date" value={conta.dataEmissao} onChange={e => setConta({ ...conta, dataEmissao: e.target.value })} className={inputCls} />
            </div>
            <div><label className={labelCls}>Valor Bruto (R$) *</label>
              <input type="number" step="0.01" value={conta.valorBruto} onChange={e => setConta({ ...conta, valorBruto: Number(e.target.value) })} className={inputCls} />
            </div>
          </div>

          {/* Impostos */}
          <div className="bg-teal-50 rounded-xl p-4 border border-teal-200">
            <h3 className="text-sm font-black text-slate-700 flex items-center gap-2 mb-3"><Receipt className="w-4 h-4 text-teal-600" /> Impostos Retidos</h3>
            <div className="grid grid-cols-3 md:grid-cols-7 gap-3">
              {[['ISS', 'valorIss'], ['INSS', 'valorInss'], ['PIS', 'valorPis'], ['COFINS', 'valorCofins'], ['IR', 'valorIr'], ['CSLL', 'valorCsll'], ['ICMS', 'valorIcms']].map(([label, key]) => (
                <div key={key}><label className={labelCls}>{label} (R$)</label>
                  <input type="number" step="0.01" value={(conta as any)[key] || 0} onChange={e => setConta({ ...conta, [key]: Number(e.target.value) })} className="w-full border border-teal-200 rounded-lg p-2 text-xs bg-white outline-none focus:border-teal-400" />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-teal-200">
              <span className="text-xs font-bold text-slate-500">Total Impostos: <span className="text-red-600">{fmt(totalImpostos)}</span></span>
              <span className="text-sm font-black text-teal-700">Valor Líquido: {fmt(valorLiquido)}</span>
            </div>
          </div>

          {/* Centros de Custo */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h3 className="text-sm font-black text-slate-700 mb-3">Centros de Custos</h3>
            {centros.map((c, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 mb-2">
                <div className="col-span-7"><select value={c.centroCustoId} onChange={e => { const n = [...centros]; n[i].centroCustoId = e.target.value; setCentros(n); }} className={inputCls}>
                  <option value="">Selecione</option>
                  {listas.centroscusto.map((cc: any) => <option key={cc.id} value={cc.id}>{cc.nome}</option>)}
                </select></div>
                <div className="col-span-4"><input type="number" step="0.01" value={c.valor} onChange={e => { const n = [...centros]; n[i].valor = Number(e.target.value); setCentros(n); }} className={inputCls} /></div>
                <div className="col-span-1 flex justify-center">{centros.length > 1 && <button onClick={() => setCentros(centros.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>}</div>
              </div>
            ))}
            <button onClick={() => setCentros([...centros, { centroCustoId: '', valor: 0 }])} className="text-teal-600 text-xs font-bold hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Adicionar</button>
          </div>

          {/* Naturezas */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h3 className="text-sm font-black text-slate-700 mb-3">Naturezas Contábeis</h3>
            {naturezas.map((n, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 mb-2">
                <div className="col-span-7"><select value={n.naturezaContabilId} onChange={e => { const nn = [...naturezas]; nn[i].naturezaContabilId = e.target.value; setNaturezas(nn); }} className={inputCls}>
                  <option value="">Selecione</option>
                  {listas.naturezascontabeis.map((nc: any) => <option key={nc.id} value={nc.id}>{nc.nome || nc.descricao}</option>)}
                </select></div>
                <div className="col-span-4"><input type="number" step="0.01" value={n.valor} onChange={e => { const nn = [...naturezas]; nn[i].valor = Number(e.target.value); setNaturezas(nn); }} className={inputCls} /></div>
                <div className="col-span-1 flex justify-center">{naturezas.length > 1 && <button onClick={() => setNaturezas(naturezas.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>}</div>
              </div>
            ))}
            <button onClick={() => setNaturezas([...naturezas, { naturezaContabilId: '', valor: 0 }])} className="text-teal-600 text-xs font-bold hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Adicionar</button>
          </div>

          {/* Parcelas */}
          <div className="bg-teal-50 rounded-xl p-4 border border-teal-200">
            <h3 className="text-sm font-black text-slate-700 flex items-center gap-2 mb-3">
              <Calculator className="w-4 h-4 text-teal-600" /> Parcelas de Recebimento
              <span className="ml-auto text-base font-black text-teal-700">Líquido: {fmt(valorLiquido)}</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div><label className={labelCls}>Qtd Parcelas</label>
                <input type="number" min="1" value={conta.qtdParcela} onChange={e => setConta({ ...conta, qtdParcela: e.target.value })} className={inputCls} /></div>
              <div><label className={labelCls}>Tipo</label>
                <select value={conta.tipoParcela} onChange={e => setConta({ ...conta, tipoParcela: e.target.value })} className={inputCls}>
                  <option value="">Selecione</option><option value="Fixo">Fixo</option><option value="Periodo">Período</option>
                </select></div>
              {conta.tipoParcela === 'Periodo' && <div><label className={labelCls}>Intervalo (dias)</label>
                <input type="number" min="1" value={conta.intervaloPeriodo} onChange={e => setConta({ ...conta, intervaloPeriodo: e.target.value })} className={inputCls} /></div>}
              {conta.tipoParcela === 'Fixo' && <div><label className={labelCls}>Dia (1-31)</label>
                <input type="number" min="1" max="31" value={conta.diaPagamento} onChange={e => setConta({ ...conta, diaPagamento: e.target.value })} className={inputCls} /></div>}
              <div className="flex items-end">
                <button onClick={gerarParcelas} disabled={!canGerar} className="w-full bg-teal-600 text-white py-2.5 rounded-lg text-xs font-bold disabled:opacity-40 hover:bg-teal-700">Gerar Parcelas</button>
              </div>
            </div>
            {parcelas.length > 0 && (
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <table className="w-full text-xs">
                  <thead><tr className="bg-slate-50 text-left">
                    <th className="p-2.5 font-bold text-slate-500">Nº</th>
                    <th className="p-2.5 font-bold text-slate-500">Valor (R$)</th>
                    <th className="p-2.5 font-bold text-slate-500">Vencimento</th>
                  </tr></thead>
                  <tbody>{parcelas.map((p, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="p-2.5 font-bold text-slate-600">{p.numeroParcela}</td>
                      <td className="p-2.5"><input type="number" step="0.01" value={p.valorParcela} disabled={p.statusRecebimento > 0}
                        onChange={e => { const n = [...parcelas]; n[i].valorParcela = Number(e.target.value); setParcelas(n); }}
                        className="w-32 border border-slate-200 rounded-lg p-1.5 text-sm" /></td>
                      <td className="p-2.5"><input type="date" value={p.dataVencimento} disabled={p.statusRecebimento > 0}
                        onChange={e => { const n = [...parcelas]; n[i].dataVencimento = e.target.value; setParcelas(n); }}
                        className="border border-slate-200 rounded-lg p-1.5 text-sm" /></td>
                    </tr>
                  ))}</tbody>
                </table>
                {!parcelaValid && <p className="text-[10px] text-red-600 font-bold p-2 bg-red-50">⚠ Soma ({fmt(parcelaSum)}) ≠ Líquido ({fmt(valorLiquido)})</p>}
              </div>
            )}
          </div>

          <div className="col-span-2"><label className={labelCls}>Observações</label>
            <textarea value={conta.observacoes} onChange={e => setConta({ ...conta, observacoes: e.target.value })} className={inputCls + ' min-h-[50px]'} />
          </div>
        </div>

        <div className="p-5 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-slate-600 font-bold text-sm bg-slate-100 hover:bg-slate-200">Cancelar</button>
          <button onClick={handleSave} disabled={!isValid} className="px-5 py-2.5 rounded-lg text-white font-bold text-sm bg-teal-600 hover:bg-teal-700 disabled:opacity-40 shadow-lg shadow-teal-500/20">
            {data ? 'Salvar' : 'Cadastrar'}
          </button>
        </div>
      </div>
    </div>
  );
}
