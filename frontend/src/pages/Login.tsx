import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import type { LoginResponse } from '../types/auth';
import { LayoutDashboard, Lock, Mail, Loader2, Shield, Briefcase, Users, ClipboardList, DollarSign, Truck, Wrench } from 'lucide-react';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type FormData = z.infer<typeof schema>;

export default function Login() {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [config, setConfig] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await api.get('/configuracoes');
        setConfig(res.data);

        // Apply Favicon if exists
        if (res.data?.favicon) {
          const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
          if (link) {
            link.href = res.data.favicon;
          } else {
            const newLink = document.createElement('link');
            newLink.rel = 'icon';
            newLink.href = res.data.favicon;
            document.head.appendChild(newLink);
          }
        }
      } catch (e) { console.error(e); }
    };
    fetchConfig();
  }, []);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post<LoginResponse>('/auth/login', data);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      navigate('/dashboard');
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 503 || status === 500) {
        setError(err.response?.data?.message || 'O servidor está iniciando. Por favor, aguarde alguns segundos e tente novamente.');
      } else {
        setError('Credenciais inválidas. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAccess = (email: string) => {
    setValue('email', email);
    setValue('password', 'Nacional@2026');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4 relative overflow-hidden">
      {/* Abstract Background Shapes */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="w-full max-w-md bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-xl overflow-hidden z-10">
        <div className="p-8">
          <div className="text-center mb-8">
            {config?.logo ? (
              <div className="h-16 flex items-center justify-center mx-auto mb-4">
                <img src={config.logo} alt="Logo" className="max-w-full max-h-full object-contain" />
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
                  <LayoutDashboard className="text-white w-8 h-8" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Nacional Hidro</h1>
              </>
            )}
            <p className="text-slate-300">Sistema de Gestão Integrada</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="bg-slate-900/80 border border-blue-500/30 text-blue-200 text-sm p-3 rounded-lg text-center font-bold">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                <input
                  {...register('email')}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                  placeholder="admin@nacionalhidro.com.br"
                />
              </div>
              {errors.email && <p className="text-blue-400/80 text-xs font-bold mt-1">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                <input
                  type="password"
                  {...register('password')}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                  placeholder="••••••••"
                />
              </div>
              {errors.password && <p className="text-blue-400/80 text-xs font-bold mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Entrar no Sistema'}
            </button>
          </form>

          {/* Quick Access — Todos os Perfis */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest text-center mb-4">Acesso Rápido</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleQuickAccess('bruno@nacionalhidro.com.br')}
                className="flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-200 hover:text-white py-2 px-3 rounded-lg border border-blue-500/30 transition-all text-xs font-medium"
              >
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                Bruno — Master
              </button>
              <button
                onClick={() => handleQuickAccess('daiane@nacionalhidro.com.br')}
                className="flex items-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-200 hover:text-white py-2 px-3 rounded-lg border border-emerald-500/30 transition-all text-xs font-medium"
              >
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                Daiane — Financeiro
              </button>
              <button
                onClick={() => handleQuickAccess('tainara@nacionalhidro.com.br')}
                className="flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-200 hover:text-white py-2 px-3 rounded-lg border border-blue-500/30 transition-all text-xs font-medium"
              >
                <Truck className="w-3.5 h-3.5 text-blue-400" />
                Tainara — Operações
              </button>
              <button
                onClick={() => handleQuickAccess('rafael@nacionalhidro.com.br')}
                className="flex items-center gap-2 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-200 hover:text-white py-2 px-3 rounded-lg border border-cyan-500/30 transition-all text-xs font-medium"
              >
                <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
                Rafael — Comercial
              </button>
              <button
                onClick={() => handleQuickAccess('andreia@nacionalhidro.com.br')}
                className="flex items-center gap-2 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-200 hover:text-white py-2 px-3 rounded-lg border border-indigo-500/30 transition-all text-xs font-medium"
              >
                <ClipboardList className="w-3.5 h-3.5 text-indigo-400" />
                Andréia — Medições
              </button>
              <button
                onClick={() => handleQuickAccess('renato@nacionalhidro.com.br')}
                className="flex items-center gap-2 bg-slate-600/20 hover:bg-slate-600/40 text-slate-200 hover:text-white py-2 px-3 rounded-lg border border-slate-500/30 transition-all text-xs font-medium"
              >
                <Wrench className="w-3.5 h-3.5 text-slate-400" />
                Renato — Manutenção
              </button>
              <button
                onClick={() => handleQuickAccess('luanna@nacionalhidro.com.br')}
                className="flex items-center gap-2 bg-sky-600/20 hover:bg-sky-600/40 text-sky-200 hover:text-white py-2 px-3 rounded-lg border border-sky-500/30 transition-all text-xs font-medium"
              >
                <Users className="w-3.5 h-3.5 text-sky-400" />
                Luanna — RH
              </button>
              <button
                onClick={() => handleQuickAccess('beatriz@nacionalhidro.com.br')}
                className="flex items-center gap-2 bg-slate-600/20 hover:bg-slate-600/40 text-slate-200 hover:text-white py-2 px-3 rounded-lg border border-slate-500/30 transition-all text-xs font-medium"
              >
                <Users className="w-3.5 h-3.5 text-slate-400" />
                Beatriz — DP
              </button>
            </div>
          </div>
        </div>
        <div className="bg-slate-900/50 p-4 text-center border-t border-white/5">
          <p className="text-xs text-slate-400">© 2026 Nacional Hidro. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
}
