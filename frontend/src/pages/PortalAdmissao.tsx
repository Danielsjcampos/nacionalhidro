import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, Upload, FileText, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface AdmissaoData {
  id: string;
  nome: string;
  cargo: string;
  departamento: string;
}

export default function PortalAdmissao() {
  const { id } = useParams<{ id: string }>();
  const [admissao, setAdmissao] = useState<AdmissaoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Data Fields
  const [formData, setFormData] = useState({
    nomeMae: '',
    nomePai: '',
    estadoCivil: '',
    grauInstrucao: '',
    racaCor: '',
    genero: '',
    nacionalidade: 'Brasileiro(a)',
    dataNascimento: '',
    enderecoCompleto: '',
    cep: '',
    rg: '',
    rgDataEmissao: '',
    rgOrgaoEmissor: '',
    cpf: '',
    pisPasep: '',
    tituloEleitor: '',
    telefone: '',
    email: '',
  });

  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    const fetchAdmissao = async () => {
      try {
        const response = await axios.get(`${API_URL}/admissoes/${id}/portal`);
        setAdmissao(response.data);
      } catch (err: any) {
        if (err.response?.status === 403) {
          setError(err.response.data.error || 'Este link de admissão já foi preenchido ou expirou.');
        } else {
          setError('Não foi possível carregar os dados. Verifique o link e tente novamente.');
        }
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchAdmissao();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    
    if (files.length === 0) {
      setError('Por favor, anexe ao menos um documento de identificação.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const submitData = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        submitData.append(key, value);
      });

      files.forEach((file) => {
        submitData.append('documentos', file);
      });

      await axios.post(`${API_URL}/admissoes/${id}/portal`, submitData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ocorreu um erro ao enviar seus documentos. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
          <p className="text-slate-600 font-medium">Carregando seu portal de admissão...</p>
        </div>
      </div>
    );
  }

  if (error && !admissao) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full text-center border-t-4 border-red-500">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto w-full mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Acesso Indisponível</h2>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-10 rounded-2xl shadow-xl max-w-lg w-full text-center border-t-4 border-emerald-500">
          <div className="bg-emerald-100 p-4 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-12 w-12 text-emerald-600" />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-4">Tudo Certo!</h2>
          <p className="text-slate-600 text-lg">
            Seus dados e documentos foram enviados com sucesso para o nosso Departamento de Recursos Humanos.
          </p>
          <div className="mt-8 p-4 bg-slate-50 rounded-lg text-sm text-slate-500">
            A equipe realizará a conferência em breve. Fique atento ao seu WhatsApp ou E-mail para os próximos passos da sua integração.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          
          {/* Header */}
          <div className="bg-blue-700 pb-10 pt-12 px-8 text-center text-white relative">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
            <h1 className="text-4xl font-extrabold tracking-tight relative z-10">Portal de Admissão</h1>
            <p className="mt-3 text-xl text-blue-100 font-medium relative z-10">Seja bem-vindo(a) à Nacional Hidro</p>
          </div>

          <div className="px-8 py-10">
            {admissao && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8 text-center">
                <p className="text-blue-900 font-semibold text-lg">Olá, {admissao.nome}!</p>
                <p className="text-blue-700 mt-1">Sua admissão para o cargo de <strong className="font-bold">{admissao.cargo}</strong> ({admissao.departamento}) está em andamento. Preencha os dados abaixo com precisão, as informações serão utilizadas para o e-Social.</p>
              </div>
            )}

            {error && (
              <div className="mb-8 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-md flex items-start">
                <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-10 border-t border-slate-200 pt-8">
              
              {/* Seção 1: Dados Pessoais */}
              <div>
                <h3 className="text-xl font-semibold text-slate-800 mb-6 flex items-center">
                  <span className="bg-blue-100 text-blue-700 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">1</span>
                  Dados Pessoais
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">CPF</label>
                    <input required type="text" name="cpf" value={formData.cpf} onChange={handleChange} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" placeholder="000.000.000-00" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Data de Nascimento</label>
                    <input required type="date" name="dataNascimento" value={formData.dataNascimento} onChange={handleChange} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Estado Civil</label>
                    <select required name="estadoCivil" value={formData.estadoCivil} onChange={handleChange} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                      <option value="">Selecione...</option>
                      <option value="SOLTEIRO">Solteiro(a)</option>
                      <option value="CASADO">Casado(a)</option>
                      <option value="DIVORCIADO">Divorciado(a)</option>
                      <option value="VIUVO">Viúvo(a)</option>
                      <option value="UNIAO_ESTAVEL">União Estável</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Gênero</label>
                    <select required name="genero" value={formData.genero} onChange={handleChange} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                      <option value="">Selecione...</option>
                      <option value="MASCULINO">Masculino</option>
                      <option value="FEMININO">Feminino</option>
                      <option value="OUTRO">Outro / Prefiro não informar</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Raça/Cor</label>
                    <select required name="racaCor" value={formData.racaCor} onChange={handleChange} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                      <option value="">Selecione...</option>
                      <option value="BRANCA">Branca</option>
                      <option value="PRETA">Preta</option>
                      <option value="PARDA">Parda</option>
                      <option value="AMARELA">Amarela</option>
                      <option value="INDIGENA">Indígena</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Grau de Instrução</label>
                    <select required name="grauInstrucao" value={formData.grauInstrucao} onChange={handleChange} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                      <option value="">Selecione...</option>
                      <option value="FUNDAMENTAL_INCOMPLETO">Ensino Fundamental Incompleto</option>
                      <option value="FUNDAMENTAL">Ensino Fundamental Completo</option>
                      <option value="MEDIO_INCOMPLETO">Ensino Médio Incompleto</option>
                      <option value="MEDIO">Ensino Médio Completo</option>
                      <option value="SUPERIOR_INCOMPLETO">Ensino Superior Incompleto</option>
                      <option value="SUPERIOR">Ensino Superior Completo</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo da Mãe</label>
                    <input required type="text" name="nomeMae" value={formData.nomeMae} onChange={handleChange} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" placeholder="Conforme documento de identidade" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo do Pai (Opcional)</label>
                    <input type="text" name="nomePai" value={formData.nomePai} onChange={handleChange} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                  </div>
                </div>
              </div>

              {/* Seção 2: Documentos */}
              <div>
                <h3 className="text-xl font-semibold text-slate-800 mb-6 flex items-center">
                  <span className="bg-blue-100 text-blue-700 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">2</span>
                  Registros
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">RG</label>
                    <input required type="text" name="rg" value={formData.rg} onChange={handleChange} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Órgão Emissor / UF</label>
                    <input required type="text" name="rgOrgaoEmissor" value={formData.rgOrgaoEmissor} onChange={handleChange} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" placeholder="Ex: SSP/SP" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Data de Emissão (RG)</label>
                    <input required type="date" name="rgDataEmissao" value={formData.rgDataEmissao} onChange={handleChange} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">PIS / PASEP / NIT</label>
                    <input required type="text" name="pisPasep" value={formData.pisPasep} onChange={handleChange} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Título de Eleitor</label>
                    <input required type="text" name="tituloEleitor" value={formData.tituloEleitor} onChange={handleChange} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                  </div>
                </div>
              </div>

              {/* Seção 3: Endereço e Contato */}
              <div>
                <h3 className="text-xl font-semibold text-slate-800 mb-6 flex items-center">
                  <span className="bg-blue-100 text-blue-700 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">3</span>
                  Contato e Endereço
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Telefone / WhatsApp</label>
                    <input required type="text" name="telefone" value={formData.telefone} onChange={handleChange} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" placeholder="(00) 00000-0000" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">E-mail Pessoal</label>
                    <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" placeholder="exemplo@email.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">CEP</label>
                    <input required type="text" name="cep" value={formData.cep} onChange={handleChange} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" placeholder="00000-000" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Endereço Completo (Rua, Número, Complemento, Bairro, Cidade-UF)</label>
                    <input required type="text" name="enderecoCompleto" value={formData.enderecoCompleto} onChange={handleChange} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                  </div>
                </div>
              </div>

              {/* Seção 4: Anexos Principais */}
              <div>
                <h3 className="text-xl font-semibold text-slate-800 mb-6 flex items-center">
                  <span className="bg-blue-100 text-blue-700 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">4</span>
                  Anexos Obrigatórios
                </h3>
                <p className="text-slate-600 mb-4 text-sm">
                  Anexe os seguintes documentos escaneados ou em foto de boa qualidade: 
                  <br /><strong>RG/CNH, CPF, Comprovante de Residência, Carteira de Trabalho, e Titulo de Eleitor</strong>.
                </p>

                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors">
                  <Upload className="mx-auto h-12 w-12 text-blue-500 mb-4" />
                  <label className="cursor-pointer bg-white px-4 py-2 border border-blue-600 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors font-medium">
                    <span>Selecionar Arquivos (PDF, PNG, JPG)</span>
                    <input type="file" multiple className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
                  </label>
                  <p className="mt-4 text-sm text-slate-500">Ou arraste e solte os arquivos aqui</p>
                </div>

                {files.length > 0 && (
                  <div className="mt-6 bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">Arquivos Anexados ({files.length})</h4>
                    <ul className="space-y-3">
                      {files.map((file, index) => (
                        <li key={index} className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                          <div className="flex items-center">
                            <FileText className="h-5 w-5 text-blue-500 mr-3" />
                            <span className="text-sm font-medium text-slate-700">{file.name}</span>
                          </div>
                          <button type="button" onClick={() => removeFile(index)} className="text-slate-400 hover:text-red-500 transition-colors">
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="pt-8">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-md text-lg font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-200 hover:-translate-y-1"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" />
                      Enviando Documentos...
                    </>
                  ) : (
                    'Finalizar e Enviar Dados'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
        
        {/* Footer info */}
        <div className="mt-8 text-center text-slate-500 text-sm">
          <p>© {new Date().getFullYear()} Nacional Hidro. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
}
