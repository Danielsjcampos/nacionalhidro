import { useEffect, useState } from 'react';
import api from '../services/api';
import { 
  User, Mail, Phone, Building, Save, 
  Loader2, Upload, Settings, ShieldCheck, 
  CheckCircle2, AlertCircle
} from 'lucide-react';

export default function PerfilPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        setLoading(true);
        // Em um sistema real, teríamos /auth/me. 
        // Aqui vamos pegar do localStorage e atualizar se necessário
        const userStored = JSON.parse(localStorage.getItem('user') || '{}');
        const res = await api.get(`/equipe/members/${userStored.id}`);
        setUser(res.data);
      } catch (err) {
        console.error('Failed to fetch profile', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setFeedback(null);
      
      const res = await api.patch(`/equipe/members/${user.id}`, {
        name: user.name,
        telefone: user.telefone,
        departamento: user.departamento,
        signatureUrl: user.signatureUrl
      });
      
      setUser(res.data);
      localStorage.setItem('user', JSON.stringify(res.data));
      setFeedback({ type: 'success', msg: 'Perfil atualizado com sucesso!' });
    } catch (err) {
      console.error('Error saving profile', err);
      setFeedback({ type: 'error', msg: 'Falha ao salvar alterações.' });
    } finally {
      setSaving(false);
    }
  };

  const handleUploadSignature = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      setSaving(true);
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUser({ ...user, signatureUrl: res.data.url });
      setFeedback({ type: 'success', msg: 'Assinatura carregada!' });
    } catch (err) {
      console.error('Upload failed', err);
      setFeedback({ type: 'error', msg: 'Falha no upload da assinatura.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter italic">Meus Dados</h1>
        <p className="text-sm text-slate-500 font-medium italic">Gerencie suas informações e sua assinatura digital para propostas</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Lado Esquerdo: Info Básica */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
               <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <User className="w-5 h-5" />
               </div>
               <h2 className="font-black uppercase text-sm tracking-widest text-slate-700 italic">Informações Pessoais</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest px-1">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input 
                    type="text" 
                    value={user?.name || ''} 
                    onChange={e => setUser({...user, name: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest px-1">E-mail (Login)</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input 
                    type="email" 
                    value={user?.email || ''} 
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm font-bold text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest px-1">Telefone / WhatsApp</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input 
                    type="text" 
                    value={user?.telefone || ''} 
                    onChange={e => setUser({...user, telefone: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest px-1">Departamento</label>
                <div className="relative">
                  <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input 
                    type="text" 
                    value={user?.departamento || ''} 
                    onChange={e => setUser({...user, departamento: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between">
              {feedback && (
                <div className={`flex items-center gap-2 text-xs font-bold uppercase italic tracking-tighter ${feedback.type === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
                  {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {feedback.msg}
                </div>
              )}
              <button 
                onClick={handleSave}
                disabled={saving}
                className="ml-auto bg-slate-800 hover:bg-black text-white px-8 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-xl shadow-slate-200 text-xs font-black uppercase italic tracking-widest disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>

        {/* Lado Direito: Assinatura */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
               <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <ShieldCheck className="w-5 h-5" />
               </div>
               <h2 className="font-black uppercase text-sm tracking-widest text-slate-700 italic">Assinatura Digital</h2>
            </div>

            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-6 flex flex-col items-center justify-center text-center space-y-4 min-h-[220px]">
              {user?.signatureUrl ? (
                <>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <img 
                      src={user.signatureUrl.startsWith('http') ? user.signatureUrl : `${api.defaults.baseURL?.replace('/api', '')}${user.signatureUrl}`} 
                      alt="Sua Assinatura" 
                      className="max-h-24 object-contain brightness-0 contrast-200"
                    />
                  </div>
                  <button 
                    onClick={() => document.getElementById('perf-sign-up')?.click()}
                    className="text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase italic tracking-widest"
                  >
                    Alterar Imagem
                  </button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
                    <Settings className="w-8 h-8 opacity-20" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic leading-tight">Nenhuma Assinatura<br/>Configurada</p>
                  </div>
                </>
              )}
              
              <input 
                type="file" 
                id="perf-sign-up" 
                className="hidden" 
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleUploadSignature(e.target.files[0])}
              />
              {!user?.signatureUrl && (
                <button 
                  onClick={() => document.getElementById('perf-sign-up')?.click()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all text-[10px] font-black uppercase italic tracking-widest"
                >
                  <Upload className="w-4 h-4" /> Carregar Escaneada
                </button>
              )}
            </div>

            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
              <p className="text-[9px] text-blue-700 font-bold uppercase italic tracking-tighter leading-relaxed text-justify">
                <strong>Importante:</strong> Sua assinatura aparecerá automaticamente em todas as Propostas Comerciais onde você for selecionado como vendedor. Recomendamos usar uma imagem com fundo transparente (PNG) ou branco limpo.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
