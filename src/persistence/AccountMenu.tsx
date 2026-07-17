import {useEffect, useRef, useState} from 'react';
import {LoaderCircle, LogOut, Mail, UserRound, X} from 'lucide-react';
import {getAuthRedirectUrl, type SupabaseAuthService} from './supabaseAuth';
import {supabaseAuth} from './supabaseClient';
import {useSupabaseSession} from './useSupabaseSession';

type AccountMenuProps = {
  auth?: SupabaseAuthService | null;
};

export function AccountMenu({auth = supabaseAuth}: AccountMenuProps) {
  const authState = useSupabaseSession(auth);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnPointerDown);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnPointerDown);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Account operation failed.');
    } finally {
      setBusy(false);
    }
  };

  const signedIn = authState.status === 'signed-in';

  return <div className="relative" ref={containerRef}>
    <button type="button" aria-expanded={open} aria-controls="account-menu" className="focus-ring flex min-h-10 items-center gap-2 border border-white/10 px-3 py-2 text-xs text-neutral-300 hover:border-white/30 hover:text-white" onClick={() => setOpen(value => !value)}>
      <span className="relative"><UserRound size={15} />{signedIn && <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />}</span>
      <span className="hidden sm:inline">{signedIn ? 'Account' : 'Sign in'}</span>
    </button>

    {open && <section id="account-menu" role="dialog" aria-labelledby="account-menu-title" className="absolute right-0 top-[calc(100%+0.65rem)] z-50 w-[min(22rem,calc(100vw-2rem))] border border-white/15 bg-neutral-950 p-5 shadow-2xl">
      <div className="flex items-start justify-between gap-4"><div><p className="font-mono text-[9px] uppercase tracking-[.16em] text-neutral-600">CV Copilot</p><h2 id="account-menu-title" className="mt-1 font-display text-lg font-semibold">Your account</h2></div><button type="button" aria-label="Close account menu" className="focus-ring min-h-10 min-w-10 p-2 text-neutral-500 hover:text-white" onClick={() => setOpen(false)}><X className="mx-auto" size={16} /></button></div>

      {authState.status === 'unavailable' && <p className="mt-4 text-xs leading-5 text-neutral-500">Accounts are not configured yet. You can continue editing and saving locally.</p>}
      {authState.status === 'loading' && <p className="mt-4 flex items-center gap-2 text-xs text-neutral-500" role="status"><LoaderCircle className="animate-spin" size={14} />Checking your session…</p>}
      {authState.status === 'error' && <p className="mt-4 text-xs leading-5 text-red-400" role="alert">Could not check your account: {authState.error}</p>}

      {authState.status === 'signed-out' && auth && <form className="mt-4" onSubmit={event => {
        event.preventDefault();
        void run(async () => {
          await auth.sendMagicLink(email, getAuthRedirectUrl(window.location.href));
          setMessage(`Check ${email.trim()} for your secure sign-in link.`);
        });
      }}>
        <p className="text-sm leading-6 text-neutral-300">Create an account or sign in with a secure email link. No password is required.</p>
        <label className="mt-4 block font-mono text-[10px] uppercase tracking-widest text-neutral-500" htmlFor="account-email">Email address</label>
        <input id="account-email" name="email" type="email" autoComplete="email" required disabled={busy} className="focus-ring mt-2 w-full border border-white/10 bg-black px-3 py-2.5 text-sm outline-none focus:border-white/40 disabled:opacity-50" value={email} onChange={event => setEmail(event.target.value)} />
        <button disabled={busy} className="focus-ring mt-3 flex min-h-11 w-full items-center justify-center gap-2 bg-white px-3 py-2.5 text-xs font-semibold text-black disabled:opacity-30">{busy ? <LoaderCircle className="animate-spin" size={14} /> : <Mail size={14} />}Continue with email</button>
        <p className="mt-3 text-[11px] leading-5 text-neutral-600">Your CV remains local unless you explicitly save a cloud copy.</p>
      </form>}

      {authState.status === 'signed-in' && authState.session && auth && <div className="mt-4">
        <div className="border border-emerald-400/20 bg-emerald-400/5 p-3"><p className="font-mono text-[9px] uppercase tracking-widest text-emerald-300">Account active</p><p className="mt-1 truncate text-sm text-neutral-200">{authState.session.user.email ?? 'Supabase account'}</p></div>
        <p className="mt-3 text-xs leading-5 text-neutral-500">You can save and reopen your cloud CVs from the Tailor workspace.</p>
        <button disabled={busy} className="focus-ring mt-4 flex min-h-10 w-full items-center justify-center gap-2 border border-white/15 px-3 py-2.5 text-xs text-neutral-300 hover:border-white/30 hover:text-white disabled:opacity-30" onClick={() => void run(() => auth.signOut())}><LogOut size={14} />Sign out</button>
      </div>}

      {message && <p className="mt-4 text-xs leading-5 text-emerald-300" role="status">{message}</p>}
      {error && <p className="mt-4 text-xs leading-5 text-red-400" role="alert">{error}</p>}
    </section>}
  </div>;
}
