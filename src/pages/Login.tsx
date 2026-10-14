import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, Heart, LoaderCircle, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    setSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível iniciar sessão. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-12 text-slate-900">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-36 -top-40 h-[34rem] w-[34rem] rounded-full bg-rose-600/20 blur-3xl" />
        <div className="absolute -bottom-48 -right-24 h-[36rem] w-[36rem] rounded-full bg-violet-700/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(15,23,42,0.15),rgba(2,6,23,0.9))]" />
      </div>

      <section className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl shadow-black/30 md:min-h-[600px] md:grid-cols-[1.05fr_0.95fr]">
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-rose-700 via-rose-800 to-violet-950 p-12 text-white md:flex">
          <div className="absolute -right-20 top-28 h-72 w-72 rounded-full border border-white/10" aria-hidden="true" />
          <div className="absolute -right-8 top-40 h-52 w-52 rounded-full border border-white/10" aria-hidden="true" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur">
              <Heart className="h-5 w-5" fill="currentColor" />
            </div>
            <span className="text-sm font-semibold tracking-wide">S-WONA</span>
          </div>

          <div className="relative max-w-md">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-rose-200">MEAL · Gestão de programas</p>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight">Dados claros para decisões com impacto.</h1>
            <p className="mt-5 text-sm leading-6 text-rose-100/80">
              Aceda ao seu espaço de trabalho para acompanhar projetos, atividades e resultados.
            </p>
          </div>

          <div className="relative flex items-center gap-2 text-xs text-white/60">
            <ShieldCheck className="h-4 w-4" />
            Acesso seguro à plataforma
          </div>
        </div>

        <div className="flex items-center justify-center px-6 py-12 sm:px-12">
          <div className="w-full max-w-sm">
            <div className="mb-9 md:hidden">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-700 text-white shadow-lg shadow-rose-900/20">
                <Heart className="h-5 w-5" fill="currentColor" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-700">S-WONA · MEAL</p>
            </div>

            <div className="mb-8">
              <p className="text-sm font-medium text-rose-700">Bem-vindo de volta</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Iniciar sessão</h2>
              <p className="mt-2 text-sm text-slate-500">Introduza as suas credenciais para continuar.</p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="login-email" className="mb-2 block text-sm font-medium text-slate-700">Email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="nome@organizacao.org"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="mb-2 block text-sm font-medium text-slate-700">Palavra-passe</label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Introduza a sua palavra-passe"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-12 text-sm outline-none transition placeholder:text-slate-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {errorMessage && (
                <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-900/15 transition hover:bg-rose-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-500/25 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
                {submitting ? 'A autenticar…' : 'Entrar na plataforma'}
              </button>
            </form>

            <p className="mt-7 text-center text-xs leading-5 text-slate-400">
              O acesso é reservado a utilizadores autorizados.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
