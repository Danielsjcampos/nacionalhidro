import { useState, useEffect } from 'react';
import api from '../services/api';
import { X, Loader2, Truck, FileText, Calendar } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface Props {
  data?: any;
  onClose: () => void;
  onSaved: () => void;
}

export default function ModalVeiculo({ data, onClose, onSaved }: Props) {
  const isEdit = !!data?.id;
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const [form, setForm] = useState({
    placa: data?.placa || '',
    modelo: data?.modelo || '',
    marca: data?.marca || '',
    ano: data?.ano || '',
    tipo: data?.tipo || 'CAMINHAO',
    tipoEquipamento: data?.tipoEquipamento || '',
    kmAtual: data?.kmAtual || 0,
    nivelCombustivel: data?.nivelCombustivel || 100,
    crlvVencimento: data?.crlvVencimento ? data.crlvVencimento.substring(0, 10) : '',
    anttVencimento: data?.anttVencimento ? data.anttVencimento.substring(0, 10) : '',
    tacografoVencimento: data?.tacografoVencimento ? data.tacografoVencimento.substring(0, 10) : '',
    seguroVencimento: data?.seguroVencimento ? data.seguroVencimento.substring(0, 10) : '',
    certificacaoLiquidosVencimento: data?.certificacaoLiquidosVencimento ? data.certificacaoLiquidosVencimento.substring(0, 10) : '',
    visivelEstograma: data?.visivelEstograma ?? true,
    bicos: data?.bicos || 1,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setForm(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.placa.trim() || !form.modelo.trim()) {
      showToast('Preencha os campos obrigatórios (Placa e Modelo).');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        placa: form.placa.toUpperCase(),
        ano: form.ano ? Number(form.ano) : null,
      };

      if (isEdit) {
        await api.patch(`/logistica/veiculos/${data.id}`, payload);
      } else {
        await api.post('/logistica/veiculos', payload);
      }
      showToast(`Veículo ${isEdit ? 'atualizado' : 'cadastrado'} com sucesso!`);
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar veículo.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all italic shadow-sm";
  const labelClass = "block text-[10px] font-black text-slate-400 uppercase italic mb-1 tracking-widest ml-1";

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        <div className="p-6 bg-indigo-600 border-b border-indigo-700 flex justify-between items-center italic">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-sm font-black text-white uppercase tracking-widest">
              {isEdit ? 'Editar Veículo da Frota' : 'Novo Registro de Veículo'}
            </h2>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-2 hover:bg-white/10 rounded-full text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-8 space-y-8 max-h-[85vh] overflow-y-auto custom-scrollbar bg-slate-50/30">
          {/* Informações Básicas */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 bg-indigo-500 rounded-full" />
              <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest italic">Dados de Identificação</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="col-span-1">
                <label className={labelClass}>Placa *</label>
                <input 
                  name="placa" 
                  value={form.placa} 
                  onChange={handleChange} 
                  className={inputClass} 
                  placeholder="ABC-1234" 
                  required 
                />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Modelo / Versão *</label>
                <input 
                  name="modelo" 
                  value={form.modelo} 
                  onChange={handleChange} 
                  className={inputClass} 
                  placeholder="Scania P360" 
                  required 
                />
              </div>
              <div>
                <label className={labelClass}>Marca</label>
                <input 
                  name="marca" 
                  value={form.marca} 
                  onChange={handleChange} 
                  className={inputClass} 
                />
              </div>
              <div>
                <label className={labelClass}>Ano</label>
                <input 
                  type="number" 
                  name="ano" 
                  value={form.ano} 
                  onChange={handleChange} 
                  className={inputClass} 
                />
              </div>
              <div>
                <label className={labelClass}>Tipo</label>
                <select 
                  name="tipo" 
                  value={form.tipo} 
                  onChange={handleChange} 
                  className={inputClass}
                >
                  <option value="CAMINHAO">Caminhão</option>
                  <option value="UTILITARIO">Utilitário</option>
                  <option value="CARRO">Carro Comum</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Equipamento Acoplado</label>
                <input 
                  name="tipoEquipamento" 
                  value={form.tipoEquipamento} 
                  onChange={handleChange} 
                  className={inputClass} 
                  placeholder="ex: HIDROJATO, CARRETA" 
                />
              </div>
            </div>
          </section>

          {/* Vencimentos e Documentação */}
          <section className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-indigo-600" />
              <h3 className="text-[10px] font-black text-indigo-800 uppercase tracking-widest italic">Vencimentos e Compliance</h3>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className={labelClass}>Venc. CRLV</label>
                <input type="date" name="crlvVencimento" value={form.crlvVencimento} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Venc. Seguro</label>
                <input type="date" name="seguroVencimento" value={form.seguroVencimento} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Venc. ANTT</label>
                <input type="date" name="anttVencimento" value={form.anttVencimento} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Venc. Tacógrafo</label>
                <input type="date" name="tacografoVencimento" value={form.tacografoVencimento} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Certif. Líquidos</label>
                <input type="date" name="certificacaoLiquidosVencimento" value={form.certificacaoLiquidosVencimento} onChange={handleChange} className={inputClass} />
              </div>
            </div>
          </section>

          {/* Operacional */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-slate-400" />
              <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest italic">Status Operacional</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <label className={labelClass}>Hodômetro Atual (Km)</label>
                <input type="number" name="kmAtual" value={form.kmAtual} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Nível do Tanque (%)</label>
                <input type="number" name="nivelCombustivel" value={form.nivelCombustivel} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Nº de Bicos</label>
                <select name="bicos" value={form.bicos} onChange={handleChange} className={inputClass}>
                  <option value={1}>1 Bico</option>
                  <option value={2}>2 Bicos</option>
                </select>
              </div>
              <div className="flex flex-col justify-end pb-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={form.visivelEstograma} 
                    onChange={e => setForm(p => ({ ...p, visivelEstograma: e.target.checked }))}
                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">Visível no Histograma</span>
                </label>
              </div>
            </div>
          </section>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-3.5 rounded-2xl bg-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-slate-300 transition-all italic"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-10 py-3.5 rounded-2xl bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20 italic flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Salvar Registro'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
