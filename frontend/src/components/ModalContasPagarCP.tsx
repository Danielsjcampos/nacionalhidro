import { useState } from 'react';
import { X, Banknote, AlertCircle } from 'lucide-react';

interface Props {
  conta: any;
  open: boolean;
  onClose: () => void;
  onPagar: (contaId: string, payload: any) => void;
  contasBancarias: any[];
}

const inputCls = "w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400";
const labelCls = "text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block";

const FORMA_PAG: Record<number, string> = {
  1: 'Boleto', 2: 'Cheque', 3: 'Pix', 4: 'Transferência', 5: 'Dinheiro', 6: 'Débito Automático',
};

export default function ModalContasPagarCP({ conta, open, onClose, onPagar, contasBancarias }: Props) {
  const [parcelaId, setParcelaId] = useState('');
  const [form, setForm] = useState({
    valor: '', formaPagamento: '3', empresaBancoId: '',
    numeroCheque: '', codigoBarras: '', observacao: '', dataVencimentoReal: new Date().toISOString().slice(0, 10),
  });

  if (!open || !conta) return null;

  const parcelas = conta.pagamentoCP?.parcelas || [];
  const pendentes = parcelas.filter((p: any) => p.statusPagamento !== 1);
  const selectedParcela = parcelas.find((p: any) => p.id === parcelaId);
  const valorAPagar = selectedParcela ? Number(selectedParcela.valorAPagar) : 0;

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

  const handlePagar = () => {
    if (!parcelaId || !form.valor) return;
    onPagar(conta.id, {
      parcelaId,
      valor: Number(form.valor),
      formaPagamento: form.formaPagamento,
      empresaBancoId: form.empresaBancoId || undefined,
      numeroCheque: form.numeroCheque || undefined,
      codigoBarras: form.codigoBarras || undefined,
      observacao: form.observacao || undefined,
      dataVencimentoReal: form.dataVencimentoReal,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b bg-emerald-600 text-white rounded-t-2xl">
          <div>
            <h2 className="text-lg font-black flex items-center gap-2"><Banknote className="w-5 h-5" /> Efetuar Pagamento</h2>
            <p className="text-sm text-emerald-100">{conta.fornecedor?.nome || '—'} · NF {conta.notaFiscal || 'S/N'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-emerald-500 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          {/* Parcelas */}
          <div>
            <label className={labelCls}>Selecione a Parcela</label>
            {pendentes.length === 0 ? (
              <p className="text-sm text-slate-500 italic">Todas as parcelas já foram pagas.</p>
            ) : (
              <div className="space-y-2">
                {pendentes.map((p: any) => (
                  <button key={p.id} onClick={() => { setParcelaId(p.id); setForm({ ...form, valor: String(Number(p.valorAPagar)) }); }}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all ${parcelaId === p.id ? 'border-emerald-500 bg-emerald-50 shadow-md' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-700">Parcela {p.numeroParcela}/{parcelas.length}</span>
                      <span className="font-black text-emerald-700">{fmt(Number(p.valorAPagar))}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                      <span>Vencimento: {fmtDate(p.dataVencimento)}</span>
                      {p.statusPagamento === 2 && <span className="text-amber-600 font-bold">Parcial — Pago: {fmt(Number(p.valorPago))}</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {parcelaId && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Valor a Pagar (R$) *</label>
                  <input type="number" step="0.01" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} className={inputCls} />
                  {Number(form.valor) > valorAPagar && <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Valor maior que o saldo!</p>}
                </div>
                <div><label className={labelCls}>Forma de Pagamento</label>
                  <select value={form.formaPagamento} onChange={e => setForm({ ...form, formaPagamento: e.target.value })} className={inputCls}>
                    {Object.entries(FORMA_PAG).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Banco/Conta de Saída</label>
                  <select value={form.empresaBancoId} onChange={e => setForm({ ...form, empresaBancoId: e.target.value })} className={inputCls}>
                    <option value="">Selecione</option>
                    {contasBancarias.filter((b: any) => b.ativa !== false).map((b: any) => (
                      <option key={b.id} value={b.id}>{b.nome}{b.empresa ? ` (${b.empresa})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div><label className={labelCls}>Data Pagamento</label>
                  <input type="date" value={form.dataVencimentoReal} onChange={e => setForm({ ...form, dataVencimentoReal: e.target.value })} className={inputCls} />
                </div>
              </div>

              {form.formaPagamento === '2' && (
                <div><label className={labelCls}>Nº Cheque</label>
                  <input value={form.numeroCheque} onChange={e => setForm({ ...form, numeroCheque: e.target.value })} className={inputCls} /></div>
              )}
              {form.formaPagamento === '1' && (
                <div><label className={labelCls}>Código de Barras</label>
                  <input value={form.codigoBarras} onChange={e => setForm({ ...form, codigoBarras: e.target.value })} className={inputCls} /></div>
              )}
              <div><label className={labelCls}>Observação</label>
                <textarea value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })} className={inputCls + ' min-h-[50px]'} /></div>
            </>
          )}
        </div>

        <div className="p-5 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-slate-600 font-bold text-sm bg-slate-100 hover:bg-slate-200">Cancelar</button>
          <button onClick={handlePagar} disabled={!parcelaId || !form.valor} className="px-5 py-2.5 rounded-lg text-white font-bold text-sm bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 shadow-lg shadow-emerald-500/20">
            Confirmar Pagamento
          </button>
        </div>
      </div>
    </div>
  );
}
