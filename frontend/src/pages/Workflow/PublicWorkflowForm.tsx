import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import { Loader2, CheckCircle2, AlertCircle, FileText, Send } from 'lucide-react';

export default function PublicWorkflowForm() {
    const { workflowId } = useParams();
    const [workflow, setWorkflow] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<Record<string, any>>({});

    useEffect(() => {
        const fetchPublicFields = async () => {
            try {
                // Rota pública sem auth
                const res = await api.get(`/workflows/public/${workflowId}`);
                setWorkflow(res.data);
                
                // Initialize form with name/title if it's recruitment
                setFormData({ titulo: '' });
            } catch (err: any) {
                setError('Não foi possível carregar o formulário. Verifique o link ou contate o RH.');
            } finally {
                setLoading(false);
            }
        };
        fetchPublicFields();
    }, [workflowId]);

    const handleInputChange = (fieldId: string, value: any) => {
        setFormData(prev => ({ ...prev, [fieldId]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            // Se for recrutamento, o título do card costuma ser o nome do candidato
            const tituloField = workflow.fields.find((f: any) => f.label.toLowerCase().includes('nome'));
            const titulo = formData[tituloField?.id] || formData.titulo || 'Nova Inscrição';

            await api.post('/workflows/public/apply', {
                workflowId,
                titulo,
                dados: formData
            });
            setSubmitted(true);
        } catch (err: any) {
            setError('Erro ao enviar sua inscrição. Tente novamente mais tarde.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Carregando formulário...</p>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center space-y-4">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-800">Inscrição Enviada!</h1>
                    <p className="text-slate-500">
                        Obrigado por seu interesse. Recebemos seus dados e nossa equipe entrará em contato em breve se houver aderência ao perfil.
                    </p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all"
                    >
                        Enviar outra resposta
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 flex flex-col items-center">
            {/* Logo Placeholder / Header */}
            <div className="max-w-2xl w-full text-center mb-8">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
                    {workflow?.nome || 'Inscrição Nacional Hidro'}
                </h1>
                <p className="text-slate-500 font-medium">
                    Preencha os campos abaixo para participar do nosso processo de seleção.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="max-w-2xl w-full bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden">
                <div className="bg-blue-600 px-8 py-4">
                    <div className="flex items-center gap-2 text-white/90">
                        <FileText className="w-5 h-5" />
                        <span className="text-sm font-bold uppercase tracking-widest">Formulário de Candidatura</span>
                    </div>
                </div>

                <div className="p-8 space-y-6">
                    {error && (
                        <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex items-center gap-3 text-rose-700 text-sm">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <p className="font-medium">{error}</p>
                        </div>
                    )}

                    {workflow?.fields.map((field: any) => (
                        <div key={field.id} className="space-y-1.5">
                            <label className="text-sm font-black text-slate-700 block">
                                {field.label} {field.obrigatorio && <span className="text-rose-500">*</span>}
                            </label>
                            {field.descricao && (
                                <p className="text-[11px] text-slate-400 mb-2 italic">{field.descricao}</p>
                            )}

                            {field.tipo === 'TEXTAREA' ? (
                                <textarea
                                    required={field.obrigatorio}
                                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                                    placeholder="Digite aqui..."
                                    className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none min-h-[100px]"
                                />
                            ) : field.tipo === 'SELECT' ? (
                                <select
                                    required={field.obrigatorio}
                                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none bg-slate-50"
                                >
                                    <option value="">Selecione uma opção</option>
                                    {Array.isArray(field.opcoes) && field.opcoes.map((opt: string) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type={field.tipo === 'NUMBER' ? 'number' : field.tipo === 'DATE' ? 'date' : 'text'}
                                    required={field.obrigatorio}
                                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                                    placeholder="Digite aqui..."
                                    className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                                />
                            )}
                        </div>
                    ))}

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-200 disabled:opacity-50"
                        >
                            {submitting ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <>
                                    <Send className="w-5 h-5" />
                                    Enviar Candidatura
                                </>
                            )}
                        </button>
                        <p className="text-center text-[10px] text-slate-400 mt-4 font-bold uppercase tracking-widest">
                            Seus dados estão protegidos pela LGPD • Nacional Hidro
                        </p>
                    </div>
                </div>
            </form>
        </div>
    );
}
