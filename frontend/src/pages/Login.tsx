import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import type { User, LoginResponse } from '../types/auth';
import { LayoutDashboard, Lock, Mail, Loader2 } from 'lucide-react';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type FormData = z.infer<typeof schema>;

export default function Login() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.post<LoginResponse>('http://localhost:3000/auth/login', data);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      navigate('/dashboard');
    } catch (err) {
      setError('Credenciais inválidas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4 relative overflow-hidden">
      {/* Abstract Background Shapes */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="w-full max-w-md bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-xl overflow-hidden z-10">
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
              <LayoutDashboard className="text-white w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Nacional Hidro</h1>
            <p className="text-slate-300">Sistema de Gestão Integrada</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-200 text-sm p-3 rounded-lg text-center">
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
              {errors.email && <p className="text-red-400 text-xs">{errors.email.message}</p>}
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
              {errors.password && <p className="text-red-400 text-xs">{errors.password.message}</p>}
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Entrar no Sistema'}
            </button>
          </form>
        </div>
        <div className="bg-slate-900/50 p-4 text-center border-t border-white/5">
          <p className="text-xs text-slate-400">© 2026 Nacional Hidro. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
}
