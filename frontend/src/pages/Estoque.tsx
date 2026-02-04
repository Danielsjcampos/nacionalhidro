import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Box, Plus, Search, ArrowUpCircle, ArrowDownCircle, AlertTriangle, MoreHorizontal } from 'lucide-react';
import { Loader2 } from 'lucide-react';

export default function Estoque() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEstoque = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:3000/estoque', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setList(response.data);
      } catch (err) {
        console.error('Failed to fetch stock', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEstoque();
  }, []);

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
        <h1 className="text-2xl font-bold text-slate-800">Controle de Estoque</h1>
        <div className="flex items-center gap-3">
          <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium border border-slate-200">
            <ArrowUpCircle className="w-4 h-4 text-emerald-600" />
            Entrada
          </button>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20 text-sm font-medium">
            <Plus className="w-4 h-4" />
            Novo Produto
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">Total de Itens</p>
          <h3 className="text-2xl font-bold text-slate-800">{list.reduce((acc, curr) => acc + curr.estoqueAtual, 0)}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">Abaixo do Mínimo</p>
          <h3 className="text-2xl font-bold text-red-600">{list.filter(p => p.estoqueAtual <= p.estoqueMinimo).length}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">Valor em Estoque</p>
          <h3 className="text-2xl font-bold text-slate-800">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
              list.reduce((acc, curr) => acc + (curr.estoqueAtual * curr.precoCusto), 0)
            )}
          </h3>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Buscar SKU ou nome do produto..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">Produto / SKU</th>
                <th className="px-6 py-4">Estoque Atual</th>
                <th className="px-6 py-4">Preço (Venda)</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-slate-800">{item.nome}</p>
                      <p className="text-xs font-mono text-slate-400 uppercase tracking-tighter">{item.sku || 'SEM SKU'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${item.estoqueAtual <= item.estoqueMinimo ? 'text-red-600' : 'text-slate-800'}`}>
                        {item.estoqueAtual}
                      </span>
                      <span className="text-xs text-slate-400 capitalize">{item.unidadeMedida.toLowerCase()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-600">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.precoVenda)}
                  </td>
                  <td className="px-6 py-4">
                    {item.estoqueAtual <= item.estoqueMinimo ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 uppercase">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        Repor Estoque
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase">
                        Em Dia
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-1 hover:bg-slate-100 rounded text-slate-400">
                      <MoreHorizontal className="w-4 h-4" />
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
