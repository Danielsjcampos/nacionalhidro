import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Loader2, CheckCircle2, AlertTriangle, Paperclip } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function InscricaoPublica() {
    const { vagaId } = useParams<{ vagaId: string }>();
    const [vaga, setVaga] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    
    // Todos os campos do Pipefy
    const [form, setForm] = useState({
        aceitouTermos: false,
        nome: '',
        sexo: '',
        endereco: '',
        telefone: '',
        email: '',
        rg: '',
        cpf: '',
        dataNascimento: '',
        idade: '',
        estadoCivil: '',
        dependentes: '',
        grauInstrucao: '',
        indicacao: '',
        quemIndicou: '',
        fonte: '',
        veiculoProprio: ''
    });

    useEffect(() => {
        const fetchVaga = async () => {
            try {
                const res = await axios.get(`${API_URL}/recrutamento/vagas/${vagaId}/publica`);
                setVaga(res.data);
            } catch (err: any) {
                setError(err.response?.data?.error || 'Vaga não encontrada');
            } finally {
                setLoading(false);
            }
        };
        if (vagaId) fetchVaga();
    }, [vagaId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.aceitouTermos) {
            alert('Você precisa aceitar os termos para prosseguir.');
            return;
        }
        if (!form.nome.trim()) return;
        setSubmitting(true);
        setError('');
        
        try {
            // Conversão de booleans
            const payload = {
                ...form,
                vagaId,
                indicacao: form.indicacao === 'Sim',
                veiculoProprio: form.veiculoProprio === 'Sim',
            };

            await axios.post(`${API_URL}/recrutamento/inscricao-publica`, payload);
            setSuccess(true);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao enviar inscrição');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center space-y-4">
                    <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
                    <h1 className="text-2xl font-bold text-slate-800">Inscrição Enviada!</h1>
                    <p className="text-slate-500">
                        Obrigado por se candidatar à vaga de <strong>{vaga?.cargo}</strong>.
                        Entraremos em contato em breve.
                    </p>
                </div>
            </div>
        );
    }

    if (error && !vaga) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center space-y-4">
                    <AlertTriangle className="w-16 h-16 text-red-500 mx-auto" />
                    <h1 className="text-2xl font-bold text-slate-800">Vaga Indisponível</h1>
                    <p className="text-slate-500">{error}</p>
                </div>
            </div>
        );
    }

    // Componente auxiliar de Input padrão Pipefy
    const InputLabel = ({ label, required, sublabel }: { label: string, required?: boolean, sublabel?: string }) => (
        <div className="mb-2">
            <label className="text-sm font-bold text-slate-800">
                {required && <span className="text-red-500 mr-1">*</span>}
                {label}
            </label>
            {sublabel && <p className="text-[11px] text-slate-500 mt-0.5">{sublabel}</p>}
        </div>
    );

    return (
        <div className="min-h-screen w-full bg-slate-900 flex items-center justify-center p-4 relative font-sans">
            {/* Imagem de Fundo (Aesthetic Corporate/Business) */}
            <div 
                className="absolute inset-0 z-0 opacity-40 mix-blend-overlay bg-cover bg-center"
                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1497215728101-856f4ea42174?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')" }}
            />

            <div className="relative z-10 w-full max-w-5xl h-[90vh] flex flex-col md:flex-row shadow-2xl rounded-lg overflow-hidden bg-transparent gap-4">
                
                {/* Coluna Esquerda: Side Card (Somente visível em telas médias/grandes) */}
                <div className="hidden md:flex flex-col w-[320px] bg-white rounded-lg p-8 shadow-lg self-center flex-shrink-0 h-auto">
                    {/* Placeholder para uma ilustração/logo de RH (usando um mock legal) */}
                    <div className="w-full bg-[#f4ebd0] rounded-lg p-4 mb-6 relative overflow-hidden h-40 flex items-center justify-center">
                         <div className="absolute inset-0 opacity-50 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                         <div className="relative z-10 flex flex-col items-center">
                             <div className="bg-slate-800 text-white p-3 rounded-xl shadow-lg mb-2">
                                <span className="font-black text-xl leading-none">CV</span>
                             </div>
                             <div className="h-1 w-12 bg-blue-600 rounded-full"></div>
                         </div>
                    </div>

                    <h2 className="text-xl font-black text-slate-800 mb-4 leading-tight">
                        Formulário de Candidatura
                    </h2>
                    <p className="text-sm text-slate-600 leading-relaxed mb-6">
                        Preencha o formulário de inscrição ao lado para candidatar-se a uma vaga. 
                        Entraremos em contato em breve.
                    </p>
                    
                    <div className="mt-auto flex items-center justify-center">
                        <span className="font-black text-blue-900 border-2 border-blue-900 px-4 py-1.5 rounded-full">Nacional Hidro</span>
                    </div>
                </div>

                {/* Coluna Direita: O Formulário Principal scrollable */}
                <div className="flex-1 bg-white rounded-lg shadow-lg flex flex-col h-full overflow-hidden">
                    {/* Header Topo Form */}
                    <div className="border-b border-slate-100 p-6 bg-white shrink-0">
                        <h1 className="text-xl font-black text-slate-800">Nova candidatura</h1>
                        <p className="text-xs text-slate-500 mt-1 uppercase font-bold tracking-wider">
                            Vaga: <span className="text-blue-600">{vaga?.cargo}</span>
                        </p>
                    </div>

                    {/* Formulário Scrollable */}
                    <div className="flex-1 overflow-y-auto p-6 bg-white">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 text-sm font-medium">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-8 pb-10">
                            
                            {/* Termo de Aceite LGPD */}
                            <div className="flex items-start gap-3">
                                <div className="mt-1">
                                    <input 
                                        type="checkbox" 
                                        required
                                        checked={form.aceitouTermos}
                                        onChange={e => setForm({...form, aceitouTermos: e.target.checked})}
                                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" 
                                    />
                                </div>
                                <div>
                                    <InputLabel 
                                        label="Tenho ciência de que estou em processo de seleção e em caso de confirmação de contratação, informo que entendi as regras acima, estou de acordo com todas e tenho a disponibilidade necessária, e tenho interesse no preenchimento da vaga disponível." 
                                        required 
                                        sublabel="Ao preencher as informações por meio do link enviado pela empresa, o(a) candidato(a) declara estar ciente de que seus dados serão armazenados em banco de dados seguro e utilizados exclusivamente para fins de recrutamento e seleção, em conformidade com a Lei Geral de Proteção de Dados (LGPD)."
                                    />
                                </div>
                            </div>

                            {/* Nome Completo */}
                            <div>
                                <InputLabel label="Nome completo:" required />
                                <input 
                                    required value={form.nome}
                                    onChange={e => setForm({...form, nome: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-sm outline-none focus:border-blue-400 focus:bg-white transition-colors"
                                    placeholder="Digite aqui..."
                                />
                            </div>

                            {/* Sexo (Radios) */}
                            <div>
                                <InputLabel label="Sexo:" required />
                                <div className="flex gap-6 mt-2">
                                    <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                                        <input type="radio" name="sexo" value="Masculino" required onChange={e => setForm({...form, sexo: e.target.value})} className="text-blue-600" /> Masculino
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                                        <input type="radio" name="sexo" value="Feminino" required onChange={e => setForm({...form, sexo: e.target.value})} className="text-blue-600" /> Feminino
                                    </label>
                                </div>
                            </div>

                            {/* Endereço */}
                            <div>
                                <InputLabel label="Endereço:" required sublabel="Rua, número, bairro, cidade e estado" />
                                <input 
                                    required value={form.endereco}
                                    onChange={e => setForm({...form, endereco: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-sm outline-none focus:border-blue-400 focus:bg-white transition-colors"
                                    placeholder="Digite aqui..."
                                />
                            </div>

                            {/* Celular / Email */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <InputLabel label="Celular:" required />
                                    <div className="flex">
                                        <div className="bg-slate-50 border border-slate-200 border-r-0 rounded-l p-2.5 flex items-center justify-center">
                                            🇧🇷
                                        </div>
                                        <input 
                                            required value={form.telefone}
                                            onChange={e => setForm({...form, telefone: e.target.value})}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-r p-2.5 text-sm outline-none focus:border-blue-400 focus:bg-white transition-colors"
                                            placeholder="(99) 99999-9999"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <InputLabel label="E-mail:" required />
                                    <input 
                                        type="email" required value={form.email}
                                        onChange={e => setForm({...form, email: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-sm outline-none focus:border-blue-400 focus:bg-white transition-colors"
                                        placeholder="email@email.com"
                                    />
                                </div>
                            </div>

                            {/* RG / CPF */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <InputLabel label="RG:" />
                                    <input 
                                        value={form.rg}
                                        onChange={e => setForm({...form, rg: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-sm outline-none focus:border-blue-400 focus:bg-white transition-colors"
                                        placeholder="Digite aqui..."
                                    />
                                </div>
                                <div>
                                    <InputLabel label="CPF:" required />
                                    <input 
                                        required value={form.cpf}
                                        onChange={e => setForm({...form, cpf: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-sm outline-none focus:border-blue-400 focus:bg-white transition-colors"
                                        placeholder="999.999.999-99"
                                    />
                                </div>
                            </div>

                            {/* Nascimento / Idade */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <InputLabel label="Data de Nascimento:" required />
                                    <input 
                                        type="date" required value={form.dataNascimento}
                                        onChange={e => setForm({...form, dataNascimento: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-sm outline-none focus:border-blue-400 focus:bg-white transition-colors text-slate-600"
                                    />
                                </div>
                                <div>
                                    <InputLabel label="Idade:" required />
                                    <input 
                                        type="number" required value={form.idade}
                                        onChange={e => setForm({...form, idade: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-sm outline-none focus:border-blue-400 focus:bg-white transition-colors"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            {/* Estado Civil */}
                            <div>
                                <InputLabel label="Estado Civil:" required />
                                <div className="flex flex-wrap gap-4 mt-2">
                                    {['Solteiro', 'Casado', 'Divorciado', 'União Estável', 'Viúvo'].map(opt => (
                                        <label key={opt} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                                            <input type="radio" name="estadoCivil" value={opt} required onChange={e => setForm({...form, estadoCivil: e.target.value})} className="text-blue-600" /> {opt}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Número de Dependentes */}
                            <div>
                                <InputLabel label="Número de Dependentes:" required sublabel="Até 21 anos" />
                                <div className="flex flex-wrap gap-4 mt-2">
                                    {['Nenhum', '1', '2', '3', '4 ou mais'].map(opt => (
                                        <label key={opt} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                                            <input type="radio" name="dependentes" value={opt} required onChange={e => setForm({...form, dependentes: e.target.value})} className="text-blue-600" /> {opt}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Grau de Instrução */}
                            <div>
                                <InputLabel label="Grau de Instrução:" required />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                    {[
                                        'Analfabeto', 'Ensino Fundamental Incompleto', 
                                        'Ensino Fundamental Completo', 'Ensino Médio Incompleto',
                                        'Ensino Médio Completo', 'Ensino Superior Incompleto',
                                        'Ensino Superior Completo'
                                    ].map(opt => (
                                        <label key={opt} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                                            <input type="radio" name="grauInstrucao" value={opt} required onChange={e => setForm({...form, grauInstrucao: e.target.value})} className="text-blue-600" /> {opt}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Vaga Desejada (Readonly) */}
                            <div>
                                <InputLabel label="Vaga desejada:" required />
                                <div className="w-full bg-slate-100 border border-slate-200 rounded p-2.5 text-sm text-slate-600 cursor-not-allowed">
                                    {vaga?.cargo}
                                </div>
                            </div>

                            {/* Indicação */}
                            <div className="border border-blue-200 border-dashed rounded-lg p-4 bg-blue-50/50">
                                <div>
                                    <InputLabel label="Você foi indicado para essa vaga?" required />
                                    <div className="flex gap-6 mt-2">
                                        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                                            <input type="radio" name="indicacao" value="Sim" required onChange={e => setForm({...form, indicacao: e.target.value})} className="text-blue-600" /> Sim
                                        </label>
                                        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                                            <input type="radio" name="indicacao" value="Não" required onChange={e => setForm({...form, indicacao: e.target.value})} className="text-blue-600" /> Não
                                        </label>
                                    </div>
                                </div>

                                {form.indicacao === 'Sim' && (
                                    <div className="mt-4">
                                        <InputLabel label="Quem indicou você?" required sublabel="Nome completo do funcionário ou funcionária." />
                                        <input 
                                            required={form.indicacao === 'Sim'}
                                            value={form.quemIndicou}
                                            onChange={e => setForm({...form, quemIndicou: e.target.value})}
                                            className="w-full bg-white border border-slate-200 rounded p-2.5 text-sm outline-none focus:border-blue-400 transition-colors"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Como soube */}
                            <div>
                                <InputLabel label="Como ficou sabendo desta oportunidade?" required />
                                <select 
                                    required value={form.fonte}
                                    onChange={e => setForm({...form, fonte: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-sm outline-none focus:border-blue-400 focus:bg-white transition-colors"
                                >
                                    <option value="">Selecione...</option>
                                    <option value="LinkedIn">LinkedIn</option>
                                    <option value="Indeed">Indeed</option>
                                    <option value="Instagram/Facebook">Instagram/Facebook</option>
                                    <option value="Indicação">Indicação</option>
                                    <option value="Site">Site da Nacional Hidro</option>
                                    <option value="Outro">Outro</option>
                                </select>
                            </div>

                            {/* Currículo (Fake upload para match visual) */}
                            <div>
                                <InputLabel label="Anexar currículo" />
                                <button type="button" className="mt-2 text-blue-600 text-sm font-bold flex items-center gap-2 hover:bg-blue-50 px-3 py-1.5 rounded transition-colors">
                                    <Paperclip className="w-4 h-4" /> + Upload file
                                </button>
                                <p className="text-[10px] text-slate-400 mt-1 italic">(Opcional nesta fase inicial)</p>
                            </div>

                            {/* Condução Própria */}
                            <div>
                                <InputLabel label="Possui condução própria?" required sublabel="Moto ou carro" />
                                <div className="flex gap-6 mt-2">
                                    <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                                        <input type="radio" name="veiculoProprio" value="Sim" required onChange={e => setForm({...form, veiculoProprio: e.target.value})} className="text-blue-600" /> Sim
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                                        <input type="radio" name="veiculoProprio" value="Não" required onChange={e => setForm({...form, veiculoProprio: e.target.value})} className="text-blue-600" /> Não
                                    </label>
                                </div>
                            </div>

                            {/* Submit */}
                            <div className="pt-6">
                                <button 
                                    type="submit" 
                                    disabled={submitting}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-lg shadow-md transition-all flex justify-center items-center gap-2 disabled:opacity-50"
                                >
                                    {submitting ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Enviar Candidatura'}
                                </button>
                            </div>

                            <p className="text-center text-slate-300 text-xs mt-4">
                                Powered by Nacional Hidro
                            </p>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
