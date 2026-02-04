import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { UserPlus, Search, Briefcase, Building2, Mail, Calendar, MoreHorizontal, BadgeCheck, ShieldAlert } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import FuncionarioForm from './FuncionarioForm';

export default function RH() {
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedFunc, setSelectedFunc] = useState<any>(null);

  const fetchRH = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/rh', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFuncionarios(response.data);
    } catch (err) {
      console.error('Failed to fetch HR data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRH();
  }, []);

  const handleEdit = (func: any) => {
    setSelectedFunc(func);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setSelectedFunc(null);
    setIsFormOpen(true);
  };

  const handleSave = async (data: any) => {
    try {
      const token = localStorage.getItem('token');
      if (selectedFunc?.id) {
        await axios.put(`http://localhost:3000/rh/${selectedFunc.id}`, data, {
            headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post('http://localhost:3000/rh', data, {
            headers: { Authorization: `Bearer ${token}` }
        });
      }
      setIsFormOpen(false);
      fetchRH();
    } catch (err) {
      console.error('Failed to save employee', err);
      alert('Erro ao salvar funcionário. Verifique os dados.');
    }
  };

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
        <h1 className="text-2xl font-bold text-slate-800">Recursos Humanos</h1>
        <button 
          onClick={handleCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20 text-sm font-medium"
        >
          <UserPlus className="w-4 h-4" />
          Novo Colaborador
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Buscar por nome, cargo ou departamento..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">Colaborador</th>
                <th className="px-6 py-4">Cargo / Depto</th>
                <th className="px-6 py-4">Status & Admissão</th>
                <th className="px-6 py-4">Salário</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {funcionarios.length === 0 && (
                 <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-400">
                       Nenhum colaborador cadastrado ainda.
                    </td>
                 </tr>
              )}
              {funcionarios.map((func) => (
                <tr 
                   key={func.id} 
                   className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                   onClick={() => handleEdit(func)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold uppercase">
                        {func.nome ? func.nome.slice(0, 2) : '??'}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{func.nome}</p>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Mail className="w-3 h-3" />
                          {func.email || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Briefcase className="w-3.5 h-3.5" />
                        <span className="font-medium">{func.cargo}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Building2 className="w-3.5 h-3.5" />
                        <span className="text-xs">{func.departamento}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${func.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {func.ativo ? <BadgeCheck className="w-2.5 h-2.5" /> : <ShieldAlert className="w-2.5 h-2.5" />}
                        {func.ativo ? 'Ativo' : 'Afastado'}
                      </span>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                        <Calendar className="w-3 h-3" />
                        ADM: {func.dataAdmissao ? new Date(func.dataAdmissao).toLocaleDateString('pt-BR') : 'N/A'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-800">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(func.salario || 0)}
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

      {isFormOpen && (
        <FuncionarioForm 
          initialData={selectedFunc} 
          onClose={() => setIsFormOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
