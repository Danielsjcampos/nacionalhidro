import { useState } from 'react';
import { X, UploadCloud, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import api from '../services/api';

interface Props { open: boolean; onClose: () => void; onImported: () => void; }

export default function ModalImportarContasCP({ open, onClose, onImported }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [parsed, setParsed] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const fmt = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = Array.from(e.target.files || []);
    setFiles(fileList);
    setParsed([]);
    setError('');
    setLoading(true);

    try {
      const results: any[] = [];
      for (const file of fileList) {
        const formData = new FormData();
        formData.append('xml', file);
        const res = await api.post('/importacao-xml/parse', formData);
        results.push({ ...res.data, _file: file.name, _selected: true });
      }
      setParsed(results);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao processar XML(s)');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (idx: number) => {
    const n = [...parsed];
    n[idx]._selected = !n[idx]._selected;
    setParsed(n);
  };

  const selectedItems = parsed.filter(p => p._selected && !p.jaImportada);
  const totalSelected = selectedItems.reduce((s, p) => s + Number(p.totais?.valorNF || 0), 0);

  const handleImportar = async () => {
    setImporting(true);
    setError('');
    try {
      const contas = selectedItems.map(nfe => ({
        fornecedorId: undefined, // Will be resolved by backend
        empresa: 'NACIONAL',
        numeroNF: nfe.numero,
        dataEmissaoNF: nfe.dataEmissao,
        dataVencimento: nfe.vencimentos?.[0]?.data || nfe.dataEmissao,
        produtos: (nfe.itens || []).map((it: any) => ({
          descricao: it.descricao || it.nome,
          quantidade: Number(it.quantidade) || 1,
          valorUnitario: Number(it.valorUnitario) || 0,
        })),
      }));

      await api.post('/contas-pagar/importar', { contas });
      onImported();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao importar');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b bg-amber-500 text-white rounded-t-2xl">
          <div>
            <h2 className="text-lg font-black flex items-center gap-2"><UploadCloud className="w-5 h-5" /> Importar XML</h2>
            <p className="text-sm text-amber-100">Selecione um ou mais arquivos XML de NF-e</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-amber-400 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer relative">
            <input type="file" accept=".xml" multiple onChange={handleFiles} className="absolute inset-0 opacity-0 cursor-pointer" />
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-500">Arraste ou clique para selecionar XML(s)</p>
            <p className="text-[10px] text-slate-400 mt-1">Aceita múltiplos arquivos simultaneamente</p>
          </div>

          {loading && <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /><span className="ml-2 text-sm text-slate-500">Processando...</span></div>}
          {error && <p className="text-sm text-red-600 font-bold flex items-center gap-2 bg-red-50 p-3 rounded-lg"><AlertCircle className="w-4 h-4" /> {error}</p>}

          {parsed.length > 0 && (
            <div className="space-y-2">
              {parsed.map((nfe, idx) => (
                <div key={idx} className={`border rounded-xl p-4 transition-all ${nfe.jaImportada ? 'border-red-200 bg-red-50/50 opacity-60' : nfe._selected ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200'}`}>
                  <div className="flex items-center gap-3">
                    {!nfe.jaImportada && (
                      <input type="checkbox" checked={nfe._selected} onChange={() => toggleSelect(idx)} className="w-4 h-4 rounded border-slate-300 text-blue-600" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-700 text-sm">NF {nfe.numero} — {nfe.emitente?.razaoSocial || '?'}</p>
                          <p className="text-[10px] text-slate-400">{nfe._file} · {nfe.itens?.length || 0} itens</p>
                        </div>
                        <span className="font-black text-blue-700">{fmt(Number(nfe.totais?.valorNF || 0))}</span>
                      </div>
                    </div>
                    {nfe.jaImportada && <span className="text-[10px] font-bold text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Já importada</span>}
                    {!nfe.jaImportada && nfe._selected && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-slate-100 flex items-center justify-between">
          <span className="text-sm font-bold text-slate-500">{selectedItems.length} selecionada(s) · Total: <span className="text-blue-700">{fmt(totalSelected)}</span></span>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-slate-600 font-bold text-sm bg-slate-100 hover:bg-slate-200">Cancelar</button>
            <button onClick={handleImportar} disabled={selectedItems.length === 0 || importing} className="px-5 py-2.5 rounded-lg text-white font-bold text-sm bg-amber-500 hover:bg-amber-600 disabled:opacity-40 shadow-lg shadow-amber-500/20 flex items-center gap-2">
              {importing && <Loader2 className="w-4 h-4 animate-spin" />}
              Importar ({selectedItems.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
