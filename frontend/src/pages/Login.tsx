import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import queryString from 'query-string';
import { toast, Slide, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api from '../services/api';
import auth from '../services/auth';
import jwtConfig from '../services/jwtConfig';
import { LayoutDashboard, Lock, Mail, Loader2 } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface LoginState {
  identifier: string;
  password: string;
}

interface ForgotState {
  identifier: string;
}

interface ResetState {
  code: string;
  password: string;
  passwordConfirmation: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const toastError = (title: string, body: string) =>
  toast.error(
    <div><strong>{title}</strong><br />{body}</div>,
    { transition: Slide, autoClose: 10000 }
  );

const toastSuccess = (title: string, body: string) =>
  toast.success(
    <div><strong>{title}</strong><br />{body}</div>,
    { transition: Slide, autoClose: 10000 }
  );

const isDisabled = (...fields: string[]) => fields.some((f) => !f || f.trim() === '');

// ── Component ──────────────────────────────────────────────────────────────────

export default function Login() {
  const location = useLocation();

  const [isLogin, setIsLogin] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<any>(null);

  const [stateLogin, setStateLogin] = useState<LoginState>({ identifier: '', password: '' });
  const [stateForgot, setStateForgot] = useState<ForgotState>({ identifier: '' });
  const [stateReset, setStateReset] = useState<ResetState>({ code: '', password: '', passwordConfirmation: '' });

  // ── Nav helpers ──────────────────────────────────────────────────────────────

  const goTo = (screen: 'login' | 'forgot' | 'reset') => {
    setIsLogin(screen === 'login');
    setIsForgotPassword(screen === 'forgot');
    setIsResetPassword(screen === 'reset');
  };

  // ── Initialization ───────────────────────────────────────────────────────────

  useEffect(() => {
    auth.clearToken();
    auth.clearUserInfo();

    const parsed = queryString.parse(location.search);
    if (parsed.code && typeof parsed.code === 'string') {
      setStateReset({ code: parsed.code, password: '', passwordConfirmation: '' });
      goTo('reset');
    } else {
      goTo('login');
    }
  }, []);

  useEffect(() => {
    api.get('/configuracoes').then((res) => {
      setConfig(res.data);
      if (res.data?.favicon) {
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = res.data.favicon;
      }
    }).catch(() => {});
  }, []);

  // ── Shared login + getRole flow ──────────────────────────────────────────────

  const applyAuthData = (data: any) => {
    auth.setToken(data.jwt);
    auth.setUserInfo(data.user);

    // Busca a role antes de recarregar
    api.get(jwtConfig.getRoleEndpoint(data.user.id)).then((roleRes) => {
      const updated = { ...data.user, role: { name: roleRes.data.name } };
      auth.setUserInfo(updated);
      window.location.href = '/dashboard';
    }).catch(() => {
      window.location.href = '/dashboard';
    });
  };

  // ── Login ────────────────────────────────────────────────────────────────────

  const handleLogin = async () => {
    auth.clearToken();
    auth.clearUserInfo();
    setLoading(true);
    try {
      const res = await api.post(jwtConfig.loginEndpoint, {
        identifier: stateLogin.identifier,
        password: stateLogin.password,
      });
      applyAuthData(res.data);
    } catch {
      toastError('Autenticação', 'Verifique suas credenciais e tente novamente!');
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot Password ──────────────────────────────────────────────────────────

  const handleForgotPassword = async () => {
    setLoading(true);
    try {
      await api.post(jwtConfig.forgotPasswordEndpoint, { email: stateForgot.identifier });
      toastSuccess('Recuperação de senha', 'Enviamos um código para seu email.');
      goTo('login');
    } catch {
      toastError('Recuperação de Senha', 'E-mail Inválido');
    } finally {
      setLoading(false);
    }
  };

  // ── Reset Password ────────────────────────────────────────────────────────────

  const handleResetPassword = async () => {
    if (stateReset.password !== stateReset.passwordConfirmation) {
      toastError('Redefinição de Senha', 'Senhas Diferentes');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post(jwtConfig.resetPasswordEndpoint, {
        code: stateReset.code,
        password: stateReset.password,
        passwordConfirmation: stateReset.passwordConfirmation,
      });
      applyAuthData(res.data);
    } catch {
      toastError('Redefinição de Senha', 'Código provedor inválido');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4 relative overflow-hidden">
      <ToastContainer />

      {/* Background shapes */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="w-full max-w-md bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-xl overflow-hidden z-10">
        <div className="p-8">

          {/* Logo / Header */}
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

          {/* ── Estado 1: LOGIN ── */}
          {isLogin && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">E-mail ou usuário</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                  <input
                    id="login-identifier"
                    type="text"
                    value={stateLogin.identifier}
                    onChange={(e) => setStateLogin({ ...stateLogin, identifier: e.target.value })}
                    placeholder="seu@email.com.br"
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                  <input
                    id="login-password"
                    type="password"
                    value={stateLogin.password}
                    onChange={(e) => setStateLogin({ ...stateLogin, password: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && !isDisabled(stateLogin.identifier, stateLogin.password) && handleLogin()}
                    placeholder="••••••••"
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                  />
                </div>
              </div>

              <button
                id="login-submit"
                onClick={handleLogin}
                disabled={loading || isDisabled(stateLogin.identifier, stateLogin.password)}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Entrar no Sistema'}
              </button>

              <div className="text-center">
                <button
                  id="login-forgot-link"
                  onClick={() => goTo('forgot')}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Esqueceu sua senha?
                </button>
              </div>
            </div>
          )}

          {/* ── Estado 2: ESQUECEU SENHA ── */}
          {isForgotPassword && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                  <input
                    id="forgot-identifier"
                    type="email"
                    value={stateForgot.identifier}
                    onChange={(e) => setStateForgot({ identifier: e.target.value })}
                    placeholder="seu@email.com.br"
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                  />
                </div>
              </div>

              <button
                id="forgot-submit"
                onClick={handleForgotPassword}
                disabled={loading || isDisabled(stateForgot.identifier)}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar Email'}
              </button>

              <div className="text-center">
                <button
                  id="forgot-back-link"
                  onClick={() => goTo('login')}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  ← Voltar
                </button>
              </div>
            </div>
          )}

          {/* ── Estado 3: RESETAR SENHA ── */}
          {isResetPassword && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Nova Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                  <input
                    id="reset-password"
                    type="password"
                    value={stateReset.password}
                    onChange={(e) => setStateReset({ ...stateReset, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Confirmar Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                  <input
                    id="reset-password-confirm"
                    type="password"
                    value={stateReset.passwordConfirmation}
                    onChange={(e) => setStateReset({ ...stateReset, passwordConfirmation: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                  />
                </div>
              </div>

              <button
                id="reset-submit"
                onClick={handleResetPassword}
                disabled={
                  loading ||
                  isDisabled(stateReset.password, stateReset.passwordConfirmation) ||
                  stateReset.password !== stateReset.passwordConfirmation
                }
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Redefinir Senha'}
              </button>
            </div>
          )}

        </div>
        <div className="bg-slate-900/50 p-4 text-center border-t border-white/5">
          <p className="text-xs text-slate-400">© 2026 Nacional Hidro. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
}
