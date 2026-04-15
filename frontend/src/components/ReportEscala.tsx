import { useState, useEffect, useMemo } from 'react';
import { X, Printer, Calendar, Truck, Users } from 'lucide-react';
import api from '../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  startDate: string; // ISO
  endDate: string;   // ISO
}

export default function ReportEscala({ isOpen, onClose, startDate, endDate }: Props) {
  const [escalas, setEscalas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    api.get('/instograma', { params: { startDate, endDate } })
      .then(r => setEscalas(r.data.escalas || []))
      .catch(err => console.error('Report escala fetch error:', err))
      .finally(() => setLoading(false));
  }, [isOpen, startDate, endDate]);

  // Group by equipment type
  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    const activeEscalas = escalas.filter(e => e.status !== 'CANCELADO' && e.status !== 'CANCELADA');

    for (const esc of activeEscalas) {
      const equip = esc.equipamento || esc.veiculo?.tipoEquipamento || 'Outros';
      if (!map.has(equip)) map.set(equip, []);
      map.get(equip)!.push(esc);
    }

    // Sort each group by date
    for (const [, list] of map) {
      list.sort((a: any, b: any) => new Date(a.data).getTime() - new Date(b.data).getTime());
    }

    return map;
  }, [escalas]);

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm print:bg-white print:backdrop-blur-none print:static">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col mx-4 print:shadow-none print:rounded-none print:max-h-none print:max-w-none">
        {/* Header — hidden on print */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Relatorio de Escalas</h2>
              <p className="text-sm text-slate-500">
                {new Date(startDate).toLocaleDateString('pt-BR')} a {new Date(endDate).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-5 py-2.5 text-sm text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition font-medium flex items-center gap-2"
            >
              <Printer className="w-4 h-4" /> Imprimir
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Print Header */}
        <div className="hidden print:block px-8 pt-8 pb-4 border-b-2 border-slate-800">
          <h1 className="text-xl font-black uppercase tracking-tight text-slate-800">
            Nacional Hidro — Relatorio de Escalas
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Periodo: {new Date(startDate).toLocaleDateString('pt-BR')} a {new Date(endDate).toLocaleDateString('pt-BR')}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Gerado em: {new Date().toLocaleString('pt-BR')}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 print:overflow-visible print:px-8">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full" />
            </div>
          ) : grouped.size === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>Nenhuma escala encontrada no periodo</p>
            </div>
          ) : (
            Array.from(grouped.entries()).map(([equipamento, escalasGrupo]) => (
              <div key={equipamento} className="mb-8 print:break-inside-avoid">
                {/* Equipment Header */}
                <div className="flex items-center gap-3 mb-3 pb-2 border-b-2 border-slate-200">
                  <Truck className="w-5 h-5 text-blue-600 print:text-slate-800" />
                  <h3 className="text-base font-bold text-slate-800 uppercase tracking-wide">
                    {equipamento}
                  </h3>
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    {escalasGrupo.length} escala(s)
                  </span>
                </div>

                {/* Table */}
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 print:bg-slate-100">
                      <th className="text-left px-3 py-2 font-bold text-slate-600 border border-slate-200 w-24">Data</th>
                      <th className="text-left px-3 py-2 font-bold text-slate-600 border border-slate-200 w-16">Hora</th>
                      <th className="text-left px-3 py-2 font-bold text-slate-600 border border-slate-200">Cliente</th>
                      <th className="text-left px-3 py-2 font-bold text-slate-600 border border-slate-200">Equipe</th>
                      <th className="text-left px-3 py-2 font-bold text-slate-600 border border-slate-200 w-24">Veiculo</th>
                      <th className="text-left px-3 py-2 font-bold text-slate-600 border border-slate-200 w-16">OS</th>
                      <th className="text-left px-3 py-2 font-bold text-slate-600 border border-slate-200">Obs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {escalasGrupo.map((esc: any, idx: number) => (
                      <tr key={esc.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="px-3 py-2 border border-slate-200 font-medium">
                          {new Date(esc.data).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-3 py-2 border border-slate-200">
                          {esc.hora || '-'}
                        </td>
                        <td className="px-3 py-2 border border-slate-200 font-medium">
                          {esc.cliente?.nome || '-'}
                        </td>
                        <td className="px-3 py-2 border border-slate-200">
                          {Array.isArray(esc.funcionarios)
                            ? esc.funcionarios.map((f: any) =>
                              typeof f === 'object' ? f.nome : f
                            ).join(', ')
                            : '-'
                          }
                        </td>
                        <td className="px-3 py-2 border border-slate-200">
                          {esc.veiculo?.placa || '-'}
                        </td>
                        <td className="px-3 py-2 border border-slate-200 font-mono">
                          {esc.codigoOS || '-'}
                        </td>
                        <td className="px-3 py-2 border border-slate-200 text-slate-500 max-w-[150px] truncate" title={esc.observacoes}>
                          {esc.observacoes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
          )}
        </div>

        {/* Footer — hidden on print */}
        <div className="flex items-center justify-between p-5 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl print:hidden">
          <span className="text-sm text-slate-500">
            {escalas.filter(e => e.status !== 'CANCELADO' && e.status !== 'CANCELADA').length} escala(s) ativa(s)
          </span>
          <button onClick={onClose} className="px-5 py-2.5 text-sm text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
