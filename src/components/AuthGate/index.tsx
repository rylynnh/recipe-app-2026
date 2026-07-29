import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Mail, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AccessState, requestMagicLink, resolveAccess, signOut } from '../../lib/auth';

export function AuthGate({ children }: { children: ReactNode }) {
  const [access, setAccess] = useState<AccessState>({ status: 'loading' });
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const next = await resolveAccess(session);
      if (active) setAccess(next);
    };
    void refresh();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void resolveAccess(session).then((next) => {
        if (active) setAccess(next);
      });
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setMessage('');
    try {
      await requestMagicLink(email.trim());
      setMessage('登录链接已发送，请在邮箱中打开链接后返回此页面。');
    } catch {
      setMessage('无法发送登录链接，请稍后重试。');
    } finally {
      setSubmitting(false);
    }
  };

  if (access.status === 'granted') return <>{children}</>;

  if (access.status === 'loading') {
    return <div className="min-h-screen bg-background" aria-busy="true" />;
  }

  const denied = access.status === 'denied';
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-5">
      <section className="card w-full max-w-md p-6 sm:p-8" aria-labelledby="login-title">
        <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center mb-5">
          {denied ? <ShieldCheck className="w-6 h-6" /> : <Mail className="w-6 h-6" />}
        </div>
        <h1 id="login-title" className="font-display text-2xl font-medium text-primary">
          {denied ? '暂未获得访问权限' : '登录我的菜谱'}
        </h1>
        {denied ? (
          <>
            <p className="text-secondary mt-3 leading-relaxed">
              {access.email ? `${access.email} 尚未被加入共享菜谱库。` : '此账号尚未被加入共享菜谱库。'} 请联系家庭组管理员开通权限。
            </p>
            <button
              type="button"
              onClick={() => void signOut()}
              className="mt-6 w-full py-3 rounded-input bg-background text-primary border border-divider hover:bg-divider/50 transition-colors"
            >
              使用其他邮箱登录
            </button>
          </>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={submit}>
            <label className="block text-sm font-medium text-primary" htmlFor="email">邮箱</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-3 bg-background text-primary rounded-input border border-divider focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-input bg-accent text-white hover:bg-accent/90 disabled:opacity-60 transition-colors"
            >
              {submitting ? '发送中…' : '发送登录链接'}
            </button>
            {message && <p className="text-sm text-secondary" role="status">{message}</p>}
          </form>
        )}
      </section>
    </main>
  );
}
