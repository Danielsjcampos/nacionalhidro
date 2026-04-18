import { useState, useEffect } from 'react';
import { X, Minus, Plus, Truck, FileText, Calculator, Package, FolderOpen } from 'lucide-react';

// ─── ESTADOS IBGE (simplificado) ───
const UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

const ICMS_OPTIONS = [
    { value: '00', label: 'Tributada integralmente' },
    { value: '20', label: 'Com redução de base de cálculo' },
    { value: '40', label: 'Isenta' },
    { value: '41', label: 'Não tributada' },
    { value: '51', label: 'Diferimento' },
    { value: '60', label: 'Cobrado ant. por substituição' },
    { value: '90', label: 'Outros (Regime Normal)' },
    { value: '90_outra_uf', label: 'Outros (UF diferente)' },
    { value: '90_simples_nacional', label: 'Outros (Simples Nacional)' },
];

const TOMADOR_ROLES = [
    { value: '0', label: 'Remetente' },
    { value: '1', label: 'Expedidor' },
    { value: '2', label: 'Recebedor' },
    { value: '3', label: 'Destinatário' },
];

const IE_INDICADOR = [
    { value: '1', label: 'Contribuinte ICMS' },
    { value: '2', label: 'Contribuinte isento' },
    { value: '9', label: 'Não Contribuinte' },
];

const UNIDADE_MEDIDA = [
    { value: '00', label: 'M3' },
    { value: '01', label: 'KG' },
    { value: '02', label: 'TON' },
    { value: '03', label: 'UNIDADE' },
    { value: '04', label: 'LITROS' },
];

interface Props {
    faturamento: any;
    onClose: () => void;
    onSave: (data: any) => void;
    onEmitir: (data: any) => void;
}

// ─── COMPONENTE FIELD ───
const Field = ({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) => (
    <div className={`space-y-1 ${className}`}>
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
        {children}
    </div>
);

const inputCls = "w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all";
const inputErr = "w-full bg-white border border-red-300 rounded-lg p-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-red-500/20 transition-all";

export default function ModalEdicaoFaturamento({ faturamento, onClose, onSave, onEmitir }: Props) {
    const [activeTab, setActiveTab] = useState(0);
    const [model, setModel] = useState<any>({});
    const [dados, setDados] = useState<any>({});

    // ─── INIT ───
    useEffect(() => {
        if (!faturamento) return;
        const f = { ...faturamento };
        f.dataEmissao = f.dataEmissao ? new Date(f.dataEmissao).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
        f.dataVencimento = f.dataVencimento ? new Date(f.dataVencimento).toISOString().slice(0, 10) : '';
        setModel(f);

        if (f.tipo === 'CTE') {
            setDados(f.dadosFaturamento || {
                nfes: [], outros_documentos: [], quantidades: [{}],
                valor_receber: f.valorBruto, valor_total: f.valorBruto,
                modal: '01', tipo_servico: 0, cfop: '5353',
                indicador_inscricao_estadual_tomador: '9',
                icms_situacao_tributaria: '90_simples_nacional',
                icms_indicador_simples_nacional: '1',
                icms_base_calculo: f.valorBruto,
                natureza_operacao: 'PRESTACAO DE SERVICO DE TRANSPORTE',
            });
        } else if (f.tipo === 'NFSE') {
            setDados(f.dadosFaturamento || {
                servico: {
                    iss_retido: 1, aliquota: 2,
                    aliquota_pis: 0.65, aliquota_cofins: 3,
                    aliquota_ir: 1, aliquota_csll: 1,
                    aliquota_inss: 3.5,
                    base_calculo: f.valorBruto,
                    item_lista_servico: '0710',
                    discriminacao_aux: 'SERVIÇOS PRESTADOS',
                },
                itens: [{ discriminacao: 'SERVIÇOS PRESTADOS', quantidade: 1, valor_unitario: f.valorBruto, valor_total: f.valorBruto, tributavel: true }],
                natureza_operacao: '1',
                optante_simples_nacional: true,
            });
        } else {
            setDados(f.dadosFaturamento || {});
        }
        setActiveTab(0);
    }, [faturamento]);

    const upDados = (key: string, val: any) => setDados((p: any) => ({ ...p, [key]: val }));
    const upServico = (key: string, val: any) => setDados((p: any) => ({
        ...p, servico: { ...(p.servico || {}), [key]: val }
    }));

    // ─── SALVAR/EMITIR ───
    const buildPayload = () => {
        const payload: any = {
            dataEmissao: model.dataEmissao,
            dataVencimento: model.dataVencimento,
            dadosFaturamento: dados,
            observacoes: model.observacoes,
        };

        if (model.tipo === 'NFSE' && dados.servico) {
            const bruto = Number(model.valorBruto || 0);
            payload.valorISS = bruto * (Number(dados.servico.aliquota || 0) / 100);
            payload.valorINSS = bruto * (Number(dados.servico.aliquota_inss || 0) / 100);
            payload.valorIR = bruto * (Number(dados.servico.aliquota_ir || 0) / 100);
            payload.valorPIS = bruto * (Number(dados.servico.aliquota_pis || 0) / 100);
            payload.valorCOFINS = bruto * (Number(dados.servico.aliquota_cofins || 0) / 100);
            payload.valorCSLL = bruto * (Number(dados.servico.aliquota_csll || 0) / 100);
            payload.valorLiquido = bruto - (payload.valorISS || 0) - (payload.valorINSS || 0) - (payload.valorIR || 0) - (payload.valorPIS || 0) - (payload.valorCOFINS || 0) - (payload.valorCSLL || 0);
        } else if (model.tipo === 'CTE') {
            const bruto = Number(model.valorBruto || 0);
            payload.valorLiquido = bruto - (bruto * (Number(dados.icms_aliquota || 0) / 100));
        }
        return payload;
    };

    const handleSave = () => onSave({ id: model.id, ...buildPayload() });
    const handleEmitir = () => onEmitir({ id: model.id, ...buildPayload() });

    const fmt = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // ─── TABS CONFIG ───
    const CTE_TABS = [
        { icon: FileText, label: 'Geral' },
        { icon: Truck, label: 'Tomador' },
        { icon: Calculator, label: 'Tributação' },
        { icon: Package, label: 'Carga' },
        { icon: FolderOpen, label: 'Documentos' },
    ];

    const NF_TABS = [
        { icon: FileText, label: 'Geral' },
        { icon: FolderOpen, label: 'Itens' },
    ];

    const tabs = model.tipo === 'CTE' ? CTE_TABS : model.tipo === 'NFSE' ? NF_TABS : [];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-4">
                {/* ─── HEADER ─── */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                    <div>
                        <h2 className="text-lg font-black text-slate-800">
                            Emissão de Fatura — {model.tipo}
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Medição: {model.medicao?.codigo || '—'} • Cliente: {model.cliente?.nome || '—'} • Valor: {fmt(Number(model.valorBruto))}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <div className="flex">
                    {/* ─── LEFT: CONTEÚDO PRINCIPAL ─── */}
                    <div className="flex-1 p-5 border-r border-slate-100 max-h-[75vh] overflow-y-auto">

                        {/* OS da Medição */}
                        {model.medicao?.ordensServico?.length > 0 && (
                            <div className="bg-slate-50 rounded-xl p-3 mb-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">OS vinculadas à medição</p>
                                <div className="space-y-1">
                                    {model.medicao.ordensServico.map((os: any) => (
                                        <div key={os.id} className="flex items-center justify-between text-xs">
                                            <span className="font-bold text-slate-700">{os.codigo}</span>
                                            <span className="font-black text-emerald-600">{fmt(Number(os.valorPrecificado || 0))}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* TABS */}
                        {tabs.length > 0 && (
                            <div className="flex gap-1 mb-4 bg-slate-50 p-1 rounded-xl">
                                {tabs.map((t, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setActiveTab(i)}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[10px] font-black uppercase transition-all ${
                                            activeTab === i ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                    >
                                        <t.icon className="w-3.5 h-3.5" />
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* ═══════ CTE TABS ═══════ */}
                        {model.tipo === 'CTE' && (
                            <>
                                {/* TAB 0: GERAL */}
                                {activeTab === 0 && (
                                    <div className="grid grid-cols-3 gap-4 animate-in fade-in duration-200">
                                        <Field label="CFOP">
                                            <input type="number" value={dados.cfop || ''} onChange={e => upDados('cfop', e.target.value)} className={inputCls} />
                                        </Field>
                                        <Field label="Natureza Operação">
                                            <input value={dados.natureza_operacao || ''} onChange={e => upDados('natureza_operacao', e.target.value)} className={inputCls} />
                                        </Field>
                                        <Field label="UF Envio">
                                            <select value={dados.uf_envio || ''} onChange={e => upDados('uf_envio', e.target.value)} className={inputCls}>
                                                <option value="">—</option>
                                                {UFS.map(u => <option key={u}>{u}</option>)}
                                            </select>
                                        </Field>
                                        <Field label="Município Envio">
                                            <input value={dados.municipio_envio || ''} onChange={e => upDados('municipio_envio', e.target.value)} className={inputCls} />
                                        </Field>
                                        <Field label="UF Início">
                                            <select value={dados.uf_inicio || ''} onChange={e => upDados('uf_inicio', e.target.value)} className={inputCls}>
                                                <option value="">—</option>
                                                {UFS.map(u => <option key={u}>{u}</option>)}
                                            </select>
                                        </Field>
                                        <Field label="Município Início">
                                            <input value={dados.municipio_inicio || ''} onChange={e => upDados('municipio_inicio', e.target.value)} className={inputCls} />
                                        </Field>
                                        <Field label="UF Fim">
                                            <select value={dados.uf_fim || ''} onChange={e => upDados('uf_fim', e.target.value)} className={inputCls}>
                                                <option value="">—</option>
                                                {UFS.map(u => <option key={u}>{u}</option>)}
                                            </select>
                                        </Field>
                                        <Field label="Município Fim">
                                            <input value={dados.municipio_fim || ''} onChange={e => upDados('municipio_fim', e.target.value)} className={inputCls} />
                                        </Field>
                                        <Field label="CTe Globalizado">
                                            <select value={dados.indicador_globalizado || ''} onChange={e => upDados('indicador_globalizado', e.target.value)} className={inputCls}>
                                                <option value="">—</option>
                                                <option value="1">Sim</option>
                                                <option value="0">Não</option>
                                            </select>
                                        </Field>
                                        <Field label="Indicador IE Tomador">
                                            <select value={dados.indicador_inscricao_estadual_tomador || ''} onChange={e => upDados('indicador_inscricao_estadual_tomador', e.target.value)} className={inputCls}>
                                                <option value="">—</option>
                                                {IE_INDICADOR.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                            </select>
                                        </Field>
                                        <Field label="Tomador de Serviço">
                                            <select value={dados.tomador || ''} onChange={e => upDados('tomador', e.target.value)} className={inputCls}>
                                                <option value="">—</option>
                                                {TOMADOR_ROLES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                            </select>
                                        </Field>
                                        <Field label="Remetente">
                                            <select value={dados.remetente || ''} onChange={e => upDados('remetente', e.target.value)} className={inputCls}>
                                                <option value="">—</option>
                                                <option>Tomador</option>
                                                <option>Cliente do Tomador</option>
                                            </select>
                                        </Field>
                                        <Field label="Destinatário">
                                            <select value={dados.destinatario || ''} onChange={e => upDados('destinatario', e.target.value)} className={inputCls}>
                                                <option value="">—</option>
                                                <option>Tomador</option>
                                                <option>Cliente do Tomador</option>
                                            </select>
                                        </Field>
                                        <Field label="Expedidor">
                                            <select value={dados.expedidor || ''} onChange={e => upDados('expedidor', e.target.value)} className={inputCls}>
                                                <option value="">—</option>
                                                <option>Tomador</option>
                                                <option>Cliente do Tomador</option>
                                            </select>
                                        </Field>
                                        <Field label="Recebedor">
                                            <select value={dados.recebedor || ''} onChange={e => upDados('recebedor', e.target.value)} className={inputCls}>
                                                <option value="">—</option>
                                                <option>Tomador</option>
                                                <option>Cliente do Tomador</option>
                                            </select>
                                        </Field>
                                        <Field label="Valor Total">
                                            <input type="number" step="0.01" value={dados.valor_total || ''} onChange={e => upDados('valor_total', e.target.value)} className={inputCls} />
                                        </Field>
                                        <Field label="Valor Receber">
                                            <input type="number" step="0.01" value={dados.valor_receber || ''} onChange={e => upDados('valor_receber', e.target.value)} className={inputCls} />
                                        </Field>
                                        <Field label="Observações" className="col-span-3">
                                            <textarea value={dados.observacao || ''} onChange={e => upDados('observacao', e.target.value)} rows={3} className={inputCls} />
                                        </Field>
                                    </div>
                                )}

                                {/* TAB 1: CLIENTE TOMADOR */}
                                {activeTab === 1 && (
                                    <div className="grid grid-cols-3 gap-4 animate-in fade-in duration-200">
                                        <Field label="CNPJ">
                                            <input value={dados.cnpj_cliente || ''} onChange={e => upDados('cnpj_cliente', e.target.value)} className={inputCls} />
                                        </Field>
                                        <Field label="Inscrição Estadual">
                                            <input value={dados.inscricao_estadual_cliente || ''} onChange={e => upDados('inscricao_estadual_cliente', e.target.value)} className={inputCls} />
                                        </Field>
                                        <Field label="IE Subst. Tributário">
                                            <input value={dados.inscricao_estadual_st_cliente || ''} onChange={e => upDados('inscricao_estadual_st_cliente', e.target.value)} className={inputCls} />
                                        </Field>
                                        <Field label="Razão Social">
                                            <input value={dados.nome_cliente || ''} onChange={e => upDados('nome_cliente', e.target.value)} className={inputCls} />
                                        </Field>
                                        <Field label="Nome Fantasia">
                                            <input value={dados.nome_fantasia_cliente || ''} onChange={e => upDados('nome_fantasia_cliente', e.target.value)} className={inputCls} />
                                        </Field>
                                        <Field label="Telefone">
                                            <input value={dados.telefone_cliente || ''} onChange={e => upDados('telefone_cliente', e.target.value)} className={inputCls} />
                                        </Field>
                                        <Field label="Logradouro">
                                            <input value={dados.logradouro_cliente || ''} onChange={e => upDados('logradouro_cliente', e.target.value)} className={inputCls} />
                                        </Field>
                                        <Field label="Número">
                                            <input value={dados.numero_cliente || ''} onChange={e => upDados('numero_cliente', e.target.value)} className={inputCls} />
                                        </Field>
                                        <Field label="Complemento">
                                            <input value={dados.complemento_cliente || ''} onChange={e => upDados('complemento_cliente', e.target.value)} className={inputCls} />
                                        </Field>
                                        <Field label="Bairro">
                                            <input value={dados.bairro_cliente || ''} onChange={e => upDados('bairro_cliente', e.target.value)} className={inputCls} />
                                        </Field>
                                        <Field label="CEP">
                                            <input value={dados.cep_cliente || ''} onChange={e => upDados('cep_cliente', e.target.value)} className={inputCls} />
                                        </Field>
                                        <Field label="UF">
                                            <select value={dados.uf_cliente || ''} onChange={e => upDados('uf_cliente', e.target.value)} className={inputCls}>
                                                <option value="">—</option>
                                                {UFS.map(u => <option key={u}>{u}</option>)}
                                            </select>
                                        </Field>
                                        <Field label="Município">
                                            <input value={dados.municipio_cliente || ''} onChange={e => upDados('municipio_cliente', e.target.value)} className={inputCls} />
                                        </Field>
                                    </div>
                                )}

                                {/* TAB 2: TRIBUTAÇÃO */}
                                {activeTab === 2 && (
                                    <div className="grid grid-cols-3 gap-4 animate-in fade-in duration-200">
                                        <Field label="ICMS Sit. Tributária" className="col-span-2">
                                            <select value={dados.icms_situacao_tributaria || ''} onChange={e => upDados('icms_situacao_tributaria', e.target.value)} className={inputCls}>
                                                <option value="">—</option>
                                                {ICMS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                            </select>
                                        </Field>
                                        <Field label="ICMS Red. Base Cálc. (%)">
                                            <input type="number" step="0.01" value={dados.icms_reducao_base_calculo || ''} onChange={e => upDados('icms_reducao_base_calculo', e.target.value)} className={inputCls} />
                                        </Field>
                                        <Field label="ICMS Base de Cálculo">
                                            <input type="number" step="0.01" value={dados.icms_base_calculo || ''} onChange={e => upDados('icms_base_calculo', e.target.value)} className={inputCls} />
                                        </Field>
                                        <Field label="ICMS Alíquota (%)">
                                            <input type="number" step="0.01" value={dados.icms_aliquota || ''} onChange={e => upDados('icms_aliquota', e.target.value)} className={inputCls} />
                                        </Field>
                                        <Field label="ICMS Valor">
                                            <input type="number" step="0.01" value={dados.icms_valor || ''} onChange={e => upDados('icms_valor', e.target.value)} className={inputCls} />
                                        </Field>
                                        <Field label="ICMS Créd. Outorgado">
                                            <input type="number" step="0.01" value={dados.icms_valor_credito_presumido || ''} onChange={e => upDados('icms_valor_credito_presumido', e.target.value)} className={inputCls} />
                                        </Field>
                                        <Field label="Alíq. Interna UF Fim">
                                            <input type="number" step="0.01" value={dados.icms_aliquota_interna_uf_fim || ''} onChange={e => upDados('icms_aliquota_interna_uf_fim', e.target.value)} className={inputCls} />
                                        </Field>
                                    </div>
                                )}

                                {/* TAB 3: CARGA */}
                                {activeTab === 3 && (
                                    <div className="grid grid-cols-3 gap-4 animate-in fade-in duration-200">
                                        <Field label="Valor Total Carga">
                                            <input type="number" step="0.01" value={dados.valor_total_carga || ''} onChange={e => upDados('valor_total_carga', e.target.value)} className={inputCls} />
                                        </Field>
                                        <Field label="Produto Predominante">
                                            <input value={dados.produto_predominante || ''} onChange={e => upDados('produto_predominante', e.target.value)} className={inputCls} />
                                        </Field>
                                        <Field label="Outras Caract. Carga">
                                            <input value={dados.outras_caracteristicas_carga || ''} onChange={e => upDados('outras_caracteristicas_carga', e.target.value)} className={inputCls} />
                                        </Field>
                                        <Field label="Unidade Medida">
                                            <select value={dados.quantidades?.[0]?.codigo_unidade_medida || ''} onChange={e => {
                                                const q = [...(dados.quantidades || [{}])];
                                                q[0] = { ...q[0], codigo_unidade_medida: e.target.value };
                                                upDados('quantidades', q);
                                            }} className={inputCls}>
                                                <option value="">—</option>
                                                {UNIDADE_MEDIDA.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                                            </select>
                                        </Field>
                                        <Field label="Tipo Medida">
                                            <input value={dados.quantidades?.[0]?.tipo_medida || ''} onChange={e => {
                                                const q = [...(dados.quantidades || [{}])];
                                                q[0] = { ...q[0], tipo_medida: e.target.value };
                                                upDados('quantidades', q);
                                            }} className={inputCls} />
                                        </Field>
                                        <Field label="Quantidade">
                                            <input type="number" value={dados.quantidades?.[0]?.quantidade || ''} onChange={e => {
                                                const q = [...(dados.quantidades || [{}])];
                                                q[0] = { ...q[0], quantidade: e.target.value };
                                                upDados('quantidades', q);
                                            }} className={inputCls} />
                                        </Field>
                                    </div>
                                )}

                                {/* TAB 4: DOCUMENTOS */}
                                {activeTab === 4 && (
                                    <div className="space-y-4 animate-in fade-in duration-200">
                                        {/* Sub-tabs: NF-e | Outros */}
                                        <div className="flex gap-2">
                                            <button onClick={() => upDados('_docTab', 'nfe')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${(!dados._docTab || dados._docTab === 'nfe') ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>NF-e</button>
                                            <button onClick={() => upDados('_docTab', 'outros')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${dados._docTab === 'outros' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>Outros</button>
                                        </div>

                                        {(!dados._docTab || dados._docTab === 'nfe') && (
                                            <div className="space-y-2">
                                                {(dados.nfes || []).map((nfe: any, i: number) => (
                                                    <div key={i} className="flex items-center gap-2">
                                                        <input value={nfe.chave_nfe || ''} onChange={e => {
                                                            const arr = [...dados.nfes]; arr[i] = { ...arr[i], chave_nfe: e.target.value };
                                                            upDados('nfes', arr);
                                                        }} placeholder="Chave NF-e (44 dígitos)" className={`flex-1 ${inputCls}`} />
                                                        <button onClick={() => { const arr = [...dados.nfes]; arr.splice(i, 1); upDados('nfes', arr); }} className="p-2 text-red-400 hover:text-red-600"><Minus className="w-4 h-4" /></button>
                                                    </div>
                                                ))}
                                                <button onClick={() => upDados('nfes', [...(dados.nfes || []), {}])} className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Adicionar NF-e</button>
                                            </div>
                                        )}

                                        {dados._docTab === 'outros' && (
                                            <div className="space-y-2">
                                                {(dados.outros_documentos || []).map((doc: any, i: number) => (
                                                    <div key={i} className="flex items-center gap-2">
                                                        <select value={doc.tipo_documento || ''} onChange={e => {
                                                            const arr = [...dados.outros_documentos]; arr[i] = { ...arr[i], tipo_documento: e.target.value };
                                                            upDados('outros_documentos', arr);
                                                        }} className={`w-32 ${inputCls}`}>
                                                            <option value="">Tipo</option>
                                                            <option value="00">Declaração</option>
                                                            <option value="99">Outros</option>
                                                        </select>
                                                        <input value={doc.numero || ''} onChange={e => {
                                                            const arr = [...dados.outros_documentos]; arr[i] = { ...arr[i], numero: e.target.value };
                                                            upDados('outros_documentos', arr);
                                                        }} placeholder="Número" className={`flex-1 ${inputCls}`} />
                                                        <button onClick={() => { const arr = [...dados.outros_documentos]; arr.splice(i, 1); upDados('outros_documentos', arr); }} className="p-2 text-red-400 hover:text-red-600"><Minus className="w-4 h-4" /></button>
                                                    </div>
                                                ))}
                                                <button onClick={() => upDados('outros_documentos', [...(dados.outros_documentos || []), {}])} className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Adicionar documento</button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        {/* ═══════ NF TABS ═══════ */}
                        {model.tipo === 'NFSE' && (
                            <>
                                {activeTab === 0 && (
                                    <div className="grid grid-cols-3 gap-4 animate-in fade-in duration-200">
                                        <Field label="Optante Simples Nacional">
                                            <select value={String(dados.optante_simples_nacional || '')} onChange={e => upDados('optante_simples_nacional', e.target.value === 'true')} className={inputCls}>
                                                <option value="">—</option>
                                                <option value="true">Sim</option>
                                                <option value="false">Não</option>
                                            </select>
                                        </Field>
                                        <Field label="ISS Retido">
                                            <select value={String(dados.servico?.iss_retido || '')} onChange={e => upServico('iss_retido', Number(e.target.value))} className={inputCls}>
                                                <option value="">—</option>
                                                <option value="1">Sim</option>
                                                <option value="2">Não</option>
                                            </select>
                                        </Field>
                                        <Field label="Alíquota ISS (%)">
                                            <input type="number" step="0.01" value={dados.servico?.aliquota || ''} onChange={e => upServico('aliquota', e.target.value)} className={inputCls} />
                                        </Field>
                                        <Field label="PIS (%)">
                                            <input type="number" step="0.01" value={dados.servico?.aliquota_pis || ''} onChange={e => upServico('aliquota_pis', e.target.value)} className={inputCls} />
                                        </Field>
                                        <Field label="COFINS (%)">
                                            <input type="number" step="0.01" value={dados.servico?.aliquota_cofins || ''} onChange={e => upServico('aliquota_cofins', e.target.value)} className={inputCls} />
                                        </Field>
                                        <Field label="INSS (%)">
                                            <input type="number" step="0.01" value={dados.servico?.aliquota_inss || ''} onChange={e => upServico('aliquota_inss', e.target.value)} className={inputCls} />
                                        </Field>
                                        <Field label="IR (%)">
                                            <input type="number" step="0.01" value={dados.servico?.aliquota_ir || ''} onChange={e => upServico('aliquota_ir', e.target.value)} className={inputCls} />
                                        </Field>
                                        <Field label="CSLL (%)">
                                            <input type="number" step="0.01" value={dados.servico?.aliquota_csll || ''} onChange={e => upServico('aliquota_csll', e.target.value)} className={inputCls} />
                                        </Field>
                                        <Field label="Base Cálculo ISS (R$)">
                                            <input type="number" step="0.01" value={dados.servico?.base_calculo || ''} onChange={e => upServico('base_calculo', e.target.value)} className={inputCls} />
                                        </Field>
                                        <Field label="Discriminação do Serviço" className="col-span-3">
                                            <textarea value={dados.servico?.discriminacao_aux || ''} onChange={e => upServico('discriminacao_aux', e.target.value)} rows={3} className={inputCls} />
                                        </Field>
                                    </div>
                                )}
                                {activeTab === 1 && (
                                    <div className="space-y-3 animate-in fade-in duration-200">
                                        {(dados.itens || []).map((item: any, i: number) => (
                                            <div key={i} className="grid grid-cols-12 gap-2 items-end bg-slate-50 rounded-xl p-3">
                                                <Field label="Discriminação" className="col-span-4">
                                                    <input value={item.discriminacao || ''} onChange={e => {
                                                        const arr = [...dados.itens]; arr[i] = { ...arr[i], discriminacao: e.target.value };
                                                        setDados({ ...dados, itens: arr });
                                                    }} className={inputCls} />
                                                </Field>
                                                <Field label="Qtd" className="col-span-2">
                                                    <input type="number" value={item.quantidade || ''} onChange={e => {
                                                        const arr = [...dados.itens]; arr[i] = { ...arr[i], quantidade: e.target.value, valor_total: Number(e.target.value) * Number(arr[i].valor_unitario || 0) };
                                                        setDados({ ...dados, itens: arr });
                                                    }} className={inputCls} />
                                                </Field>
                                                <Field label="Vlr Unit." className="col-span-2">
                                                    <input type="number" step="0.01" value={item.valor_unitario || ''} onChange={e => {
                                                        const arr = [...dados.itens]; arr[i] = { ...arr[i], valor_unitario: e.target.value, valor_total: Number(arr[i].quantidade || 0) * Number(e.target.value) };
                                                        setDados({ ...dados, itens: arr });
                                                    }} className={inputCls} />
                                                </Field>
                                                <Field label="Vlr Total" className="col-span-2">
                                                    <input type="number" step="0.01" value={item.valor_total || ''} onChange={e => {
                                                        const arr = [...dados.itens]; arr[i] = { ...arr[i], valor_total: e.target.value };
                                                        setDados({ ...dados, itens: arr });
                                                    }} className={inputCls} />
                                                </Field>
                                                <Field label="Trib." className="col-span-1">
                                                    <select value={String(item.tributavel ?? '')} onChange={e => {
                                                        const arr = [...dados.itens]; arr[i] = { ...arr[i], tributavel: e.target.value === 'true' };
                                                        setDados({ ...dados, itens: arr });
                                                    }} className={inputCls}>
                                                        <option value="true">Sim</option>
                                                        <option value="false">Não</option>
                                                    </select>
                                                </Field>
                                                <div className="col-span-1 flex items-end pb-1">
                                                    <button onClick={() => { const arr = [...dados.itens]; arr.splice(i, 1); setDados({ ...dados, itens: arr }); }} className="p-2 text-red-400 hover:text-red-600"><Minus className="w-4 h-4" /></button>
                                                </div>
                                            </div>
                                        ))}
                                        <button onClick={() => setDados({ ...dados, itens: [...(dados.itens || []), { discriminacao: '', quantidade: 1, valor_unitario: 0, valor_total: 0, tributavel: true }] })} className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Adicionar item</button>
                                    </div>
                                )}
                            </>
                        )}

                        {/* ═══════ RL (SEM TABS — apenas descrição e pedido) ═══════ */}
                        {model.tipo === 'RL' && (
                            <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-200">
                                <Field label="Descrição" className="col-span-2">
                                    <textarea value={model.observacoes || ''} onChange={e => setModel({ ...model, observacoes: e.target.value })} rows={4} className={inputCls} />
                                </Field>
                                <Field label="Dados Complementares" className="col-span-2">
                                    <input value={model.pedidoCompras || ''} onChange={e => setModel({ ...model, pedidoCompras: e.target.value })} placeholder="Nº Pedido de Compras" className={inputCls} />
                                </Field>
                            </div>
                        )}

                        {/* Observação Faturamento (universal) */}
                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <Field label="Observação Faturamento">
                                <textarea value={model.observacoes || ''} disabled rows={3} className={`${inputCls} bg-slate-50 text-slate-500`} />
                            </Field>
                        </div>
                    </div>

                    {/* ─── RIGHT: SIDEBAR (Datas + Valores + Botões) ─── */}
                    <div className="w-72 p-5 space-y-4 flex flex-col">
                        <Field label="Data de Emissão">
                            <input type="date" value={model.dataEmissao || ''} onChange={e => setModel({ ...model, dataEmissao: e.target.value })} className={inputCls} />
                        </Field>
                        <Field label="Data de Vencimento">
                            <input type="date" value={model.dataVencimento || ''} onChange={e => setModel({ ...model, dataVencimento: e.target.value })} className={inputCls} />
                        </Field>

                        <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase">Valor aprovado</p>
                            <p className="text-lg font-black text-slate-800">{fmt(Number(model.valorBruto || 0))}</p>
                        </div>

                        {model.tipo === 'NFSE' && dados.servico && (
                            <div className="bg-blue-50 rounded-xl p-3 space-y-1 text-xs">
                                <p className="text-[10px] font-black text-blue-400 uppercase mb-1">Retenções Calculadas</p>
                                {(['ISS', 'INSS', 'IR', 'PIS', 'COFINS', 'CSLL'] as const).map(tax => {
                                    const key = tax === 'ISS' ? 'aliquota' : `aliquota_${tax.toLowerCase()}`;
                                    const pct = Number(dados.servico?.[key] || 0);
                                    const val = Number(model.valorBruto || 0) * pct / 100;
                                    return val > 0 ? (
                                        <div key={tax} className="flex justify-between">
                                            <span className="text-slate-500">{tax} ({pct}%)</span>
                                            <span className="font-bold text-slate-700">{fmt(val)}</span>
                                        </div>
                                    ) : null;
                                })}
                                <div className="border-t border-blue-200 pt-1 mt-1 flex justify-between">
                                    <span className="font-black text-blue-600">Líquido</span>
                                    <span className="font-black text-blue-600">{(() => {
                                        const b = Number(model.valorBruto || 0);
                                        const s = dados.servico || {};
                                        const total = b - b * (Number(s.aliquota || 0) + Number(s.aliquota_inss || 0) + Number(s.aliquota_ir || 0) + Number(s.aliquota_pis || 0) + Number(s.aliquota_cofins || 0) + Number(s.aliquota_csll || 0)) / 100;
                                        return fmt(total);
                                    })()}</span>
                                </div>
                            </div>
                        )}

                        <Field label="Empresa">
                            <input disabled value="Nacional Hidro" className={`${inputCls} bg-slate-50`} />
                        </Field>

                        <div className="flex-1" />

                        {/* Botões */}
                        <div className="space-y-2 pt-4 border-t border-slate-100">
                            <button onClick={handleSave} className="w-full bg-slate-100 text-slate-700 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all">
                                Salvar Rascunho
                            </button>
                            <button onClick={handleEmitir} className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
                                Gerar Fatura
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
