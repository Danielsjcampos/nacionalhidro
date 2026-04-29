import React, { useState, useEffect } from 'react';
import { X, Shield, Receipt } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';

interface ModalFaturamentoMedicaoProps {
    medicao: any;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ModalFaturamentoMedicao({ medicao, onClose, onSuccess }: ModalFaturamentoMedicaoProps) {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [clientes, setClientes] = useState<any[]>([]);
    const [tetoFiscal, setTetoFiscal] = useState<any[]>([]);
    const [dispararEmail, setDispararEmail] = useState(true);
    
    const [form, setForm] = useState({
        clienteId: medicao?.clienteId || '', 
        valorTotal: medicao?.valorTotal || '', 
        centroCusto: 'MAO_DE_OBRA_SERVICO', 
        cnpjFaturamento: '', 
        pedidoCompras: '', 
        dataVencimento: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0], 
        medicaoId: medicao?.id || '', 
        osId: '', 
        percentualRL: '90'
    });

    useEffect(() => {
        const fetchDependencies = async () => {
            try {
                const [cliRes, tetoRes] = await Promise.all([
                    api.get('/clientes'),
                    api.get('/dashboard/teto-fiscal').catch(() => ({ data: [] }))
                ]);
                setClientes(cliRes.data);
                setTetoFiscal(Array.isArray(tetoRes.data) ? tetoRes.data : []);
            } catch (err) {
                console.error(err);
            }
        };
        fetchDependencies();
    }, []);

    const [statusStep, setStatusStep] = useState('');

    const handleGerar = async (overrideTeto = false) => {
        setLoading(true);
        setStatusStep('Calculando valores e criando faturas...');
        try {
            const res = await api.post(`/faturamento/gerar-rl${overrideTeto ? '?overrideTeto=true' : ''}`, form);
            
            if (res.data.nfse?.id) {
                setStatusStep('Solicitando emissão fiscal na Focus NFe...');
                // O backend já dispara em background, mas vamos consultar o status se quiseremos ser precisos
                // Para manter paridade com o legado, vamos esperar um pouco ou informar que foi enviado
                showToast('Solicitação enviada para Focus NFe!', 'info');
            }

            if (dispararEmail) {
                setStatusStep('Enviando e-mail para o cliente...');
                if (res.data.rl?.id) {
                    await api.post(`/faturamento/${res.data.rl.id}/enviar`).catch(e => console.error(e));
                }
                if (res.data.nfse?.id) {
                    await api.post(`/faturamento/${res.data.nfse.id}/enviar`).catch(e => console.error(e));
                }
                showToast('Faturamento gerado e e-mail disparado!', 'success');
            } else {
                showToast('Faturamento gerado com sucesso!', 'success');
            }
            
            onSuccess();
            onClose();
        } catch (err: any) {
            if (err.response?.data?.error === 'TETO_FISCAL_EXCEDIDO') {
                if (window.confirm(err.response.data.message + '\n\nDeseja emitir mesmo assim?')) {
                    handleGerar(true);
                }
            } else {
                showToast(err.response?.data?.error || 'Erro ao gerar faturamento', 'error');
            }
        } finally {
            setLoading(false);
            setStatusStep('');
        }
    };

    const fmt = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const tipoDoc = medicao?.tipoDocumento === 'ND' ? 'ND' : 'RL';

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-[#1e3a5f] px-6 py-4 flex items-center justify-between text-white">
                    <div className="flex items-center gap-3">
                        <Receipt className="w-5 h-5 text-emerald-400" />
                        <div>
                            <h2 className="font-black uppercase tracking-widest text-sm">Gerar Faturamento</h2>
                            <p className="text-[10px] text-white/60 font-bold uppercase tracking-tight">{tipoDoc} + NFS-e (Split)</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Medição Vinculada</label>
                        <input value={medicao?.codigo + ' - ' + medicao?.cliente?.nome} disabled className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-slate-50 font-bold text-slate-500" />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase">CNPJ de Faturamento</label>
                        <select value={form.cnpjFaturamento} onChange={e => setForm({ ...form, cnpjFaturamento: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm">
                            <option value="">(Nenhum / Padrão)</option>
                            {tetoFiscal.map((t: any) => <option key={t.cnpj} value={t.cnpj}>{t.nome} — {t.cnpj}</option>)}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Valor Total</label>
                        <div className="relative">
                            <input type="number" step="0.01" value={form.valorTotal} onChange={e => setForm({ ...form, valorTotal: e.target.value })}
                                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm font-bold bg-slate-50" disabled />
                            <div className="absolute right-3 top-3 text-blue-500" title="Valor travado pela Medição"><Shield className="w-4 h-4" /></div>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Split {tipoDoc} / NFS-e (%)</label>
                        <div className="flex items-center gap-3">
                            <input type="range" min="50" max="100" step="5" value={form.percentualRL}
                                onChange={e => setForm({ ...form, percentualRL: e.target.value })}
                                className="flex-1 accent-blue-600" />
                            <span className="text-sm font-black text-slate-700 min-w-[70px] text-right">
                                {form.percentualRL}% / {100 - Number(form.percentualRL)}%
                            </span>
                        </div>
                    </div>

                    {form.valorTotal && (
                        <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 text-xs space-y-2">
                            <p className="flex justify-between font-bold text-slate-600">
                                <span>📄 {tipoDoc} ({form.percentualRL}%):</span> 
                                <span className="text-blue-600">{fmt(Number(form.valorTotal) * Number(form.percentualRL) / 100)}</span>
                            </p>
                            <div className="h-px bg-slate-200 w-full" />
                            <p className="flex justify-between font-bold text-slate-600">
                                <span>🏛️ NFS-e ({100 - Number(form.percentualRL)}%):</span> 
                                <span className="text-emerald-600">{fmt(Number(form.valorTotal) * (100 - Number(form.percentualRL)) / 100)}</span>
                            </p>
                            <p className="text-right text-[9px] text-slate-400 font-bold uppercase">(INSS 3.5%: {fmt(Number(form.valorTotal) * (100 - Number(form.percentualRL)) / 100 * 0.035)})</p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase">Centro de Custo</label>
                            <select value={form.centroCusto} onChange={e => setForm({ ...form, centroCusto: e.target.value })}
                                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm">
                                <option value="EQUIPAMENTO_COMBINADO">Equip. Combinado</option>
                                <option value="ALTO_VACUO_SUCCAO">Alto Vácuo</option>
                                <option value="ALTA_PRESSAO_SAP">Alta Pressão</option>
                                <option value="HIDROJATO">Hidrojato</option>
                                <option value="MAO_DE_OBRA_SERVICO">Mão de Obra</option>
                                <option value="OUTROS">Outros</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase">Vencimento</label>
                            <input type="date" value={form.dataVencimento} onChange={e => setForm({ ...form, dataVencimento: e.target.value })}
                                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm font-bold" />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                        <input 
                            type="checkbox" 
                            id="dispararEmail" 
                            checked={dispararEmail} 
                            onChange={(e) => setDispararEmail(e.target.checked)}
                            className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                        />
                        <label htmlFor="dispararEmail" className="text-xs font-bold text-slate-600 cursor-pointer">
                            Disparar e-mail automaticamente para o cliente
                        </label>
                    </div>

                    <button onClick={() => handleGerar()} disabled={loading}
                        className="w-full bg-[#1e3a5f] hover:bg-slate-800 text-white py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all mt-4 flex items-center justify-center gap-2">
                        {loading ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                {statusStep || 'Processando...'}
                            </>
                        ) : 'Confirmar Faturamento'}
                    </button>
                </div>
            </div>
        </div>
    );
}
