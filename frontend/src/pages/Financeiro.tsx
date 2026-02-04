import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { DollarSign, TrendingUp, TrendingDown, Calendar, Search, Filter, Plus, FileSpreadsheet } from 'lucide-react';
import { Loader2 } from 'lucide-react';

export default function Financeiro() {
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFinanceiro = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:3000/financeiro', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTransacoes(response.data);
      } catch (err) {
        console.error('Failed to fetch finance', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFinanceiro();
  }, []);

  const totalReceita = transacoes.filter(t => t.tipo === 'RECEITA').reduce((acc, curr) => acc + Number(curr.valor), 0);
  const totalDespesa = transacoes.filter(t => t.tipo === 'DESPESA').reduce((acc, curr) => acc + Number(curr.valor), 0);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Financeiro</h1>
        <div className="flex items-center gap-3">
          <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium border border-slate-200">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Exportar
          </button>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20 text-sm font-medium">
            <Plus className="w-4 h-4" />
            Nova Transação
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total de Receitas</p>
              <h3 className="text-2xl font-bold text-emerald-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalReceita)}
              </h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total de Despesas</p>
              <h3 className="text-2xl font-bold text-red-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalDespesa)}
              </h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Saldo Líquido</p>
              <h3 className={`text-2xl font-bold ${totalReceita - totalDespesa >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalReceita - totalDespesa)}
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Buscar por descrição ou categoria..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors">
            <Filter className="w-4 h-4" />
            Filtros
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Descrição / Categoria</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Valor</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transacoes.map((trans) => (
                <tr key={trans.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(trans.data).toLocaleDateString('pt-BR')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-800">{trans.descricao}</p>
                    <p className="text-xs text-slate-500 font-medium uppercase">{trans.categoria}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${trans.tipo === 'RECEITA' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {trans.tipo === 'RECEITA' ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                      {trans.tipo}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className={`font-bold ${trans.tipo === 'RECEITA' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(trans.valor)}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${trans.status === 'PAGO' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                      {trans.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button className="text-slate-400 hover:text-slate-600 transition-colors">
                      <Plus className="w-4 h-4 rotate-45" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
