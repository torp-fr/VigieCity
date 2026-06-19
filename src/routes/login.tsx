import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/login')({
  head: () => ({ meta: [{ title: 'Connexion — VigieCity Admin' }, { name: 'robots', content: 'noindex' }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);

  async function redirectByRole(userId: string) {
    const { data: roles } = await supabase
      .from('user_roles').select('role, collectivity_id').eq('user_id', userId);
    const isGlobalAdmin = roles?.some(r => r.role === 'admin' && !r.collectivity_id);
    if (isGlobalAdmin) { navigate({ to: '/platform' }); return; }
    const communeRole = roles?.find(r => r.collectivity_id);
    if (communeRole) { navigate({ to: '/admin' }); return; }
    navigate({ to: '/' });
  }

  // PKCE code exchange (callback Google OAuth → /login?code=...)
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code');
    if (!code) return;
    supabase.auth.exchangeCodeForSession(code).then(({ data }) => {
      if (data.session) {
        window.history.replaceState({}, '', '/login');
        redirectByRole(data.session.user.id);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Déjà connecté ?
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) redirectByRole(session.user.id);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user) await redirectByRole(data.user.id);
    } catch (err: any) {
      toast.error(err.message ?? 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/login' },
    });
    if (error) { toast.error(error.message); setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur mb-4">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">VigieCity</h1>
          <p className="mt-1 text-sm text-white/60">Espace administration</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6 shadow-2xl">
          <button type="button" onClick={handleGoogle} disabled={loading}
            className="mb-4 flex w-full items-center justify-center gap-3 rounded-xl border border-white/20 bg-white/10 py-3 text-sm font-medium text-white hover:bg-white/20 transition-colors disabled:opacity-50">
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuer avec Google
          </button>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-transparent px-2 text-white/40">ou</span></div>
          </div>

          <form onSubmit={handleEmail} className="space-y-3">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Email" required autoComplete="email"
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/40 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400" />
            <div className="relative">
              <input type={showPwd ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe" required autoComplete="current-password"
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 pr-11 text-sm text-white placeholder-white/40 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400" />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80">
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <button type="submit" disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-colors">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Se connecter
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-white/30">
          Espace réservé aux administrateurs.<br />
          App citoyenne : <a href="/" className="underline hover:text-white/60">vigie-city.vercel.app</a>
        </p>
      </div>
    </div>
  );
}
