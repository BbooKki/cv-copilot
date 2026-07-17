import {useCallback, useEffect, useState} from 'react';
import {ArrowLeft, Crown, FileText, LoaderCircle, LogOut, Trash2} from 'lucide-react';
import type {CvDocument} from '../cv/schema';
import {
  getAuthRedirectUrl,
  getPasswordResetRedirectUrl,
  type SupabaseAuthService,
} from './supabaseAuth';
import {
  accountEntitlementRepository,
  type AccountEntitlement,
  type AccountEntitlementRepository,
} from './accountEntitlement';
import {supabaseAuth} from './supabaseClient';
import {
  supabaseResumeRepository,
  type CloudResumeRepository,
  type CloudResumeSummary,
} from './supabaseResumeRepository';
import {useSupabaseSession} from './useSupabaseSession';

type AccountPageProps = {
  passwordRecovery?: boolean;
  auth?: SupabaseAuthService | null;
  entitlements?: AccountEntitlementRepository;
  repository?: CloudResumeRepository;
  onBack: () => void;
  onOpenDocument: (document: CvDocument) => Promise<void> | void;
  onPasswordResetComplete: () => void;
};

const FREE_ENTITLEMENT: AccountEntitlement = {plan: 'free', premiumActive: false, expiresAt: null};

export function AccountPage({
  passwordRecovery = false,
  auth = supabaseAuth,
  entitlements = accountEntitlementRepository,
  repository = supabaseResumeRepository,
  onBack,
  onOpenDocument,
  onPasswordResetComplete,
}: AccountPageProps) {
  const authState = useSupabaseSession(auth);
  const [entitlement, setEntitlement] = useState<AccountEntitlement>(FREE_ENTITLEMENT);
  const [resumes, setResumes] = useState<CloudResumeSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const refreshAccount = useCallback(async () => {
    const [nextEntitlement, nextResumes] = await Promise.all([entitlements.get(), repository.list()]);
    setEntitlement(nextEntitlement);
    setResumes(nextResumes);
  }, [entitlements, repository]);

  useEffect(() => {
    if (authState.status !== 'signed-in' || passwordRecovery) {
      setEntitlement(FREE_ENTITLEMENT);
      setResumes([]);
      return;
    }
    let active = true;
    setBusy(true);
    setError('');
    void Promise.all([entitlements.get(), repository.list()]).then(([nextEntitlement, nextResumes]) => {
      if (!active) return;
      setEntitlement(nextEntitlement);
      setResumes(nextResumes);
    }).catch(cause => {
      if (active) setError(toErrorMessage(cause));
    }).finally(() => {
      if (active) setBusy(false);
    });
    return () => { active = false; };
  }, [authState.session?.user.id, authState.status, entitlements, passwordRecovery, repository]);

  const run = async (action: () => Promise<void> | void) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await action();
    } catch (cause) {
      setError(toErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return <main className="min-h-screen bg-black text-white">
    <header className="border-b border-white/10 bg-black/90">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-6">
        <button type="button" className="focus-ring flex min-h-10 items-center gap-2 text-xs text-neutral-400 hover:text-white" onClick={onBack}>
          <ArrowLeft size={15} />Back to editor
        </button>
        <div className="text-right"><p className="font-display text-sm font-semibold">CV Copilot</p><p className="font-mono text-[9px] uppercase tracking-[.16em] text-neutral-600">Account</p></div>
      </div>
    </header>

    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-16">
      <div className="max-w-2xl">
        <p className="font-mono text-[10px] uppercase tracking-[.18em] text-neutral-600">Private workspace</p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">Your account</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-400">Sign in to manage editable cloud CVs. Your browser draft is never uploaded until you explicitly save it.</p>
      </div>

      <div className="mt-10">
        {authState.status === 'unavailable' && <Notice tone="neutral">Accounts are not configured. Add the browser-safe Supabase URL and publishable key to enable this page.</Notice>}
        {authState.status === 'loading' && <Notice tone="neutral"><LoaderCircle className="animate-spin" size={14} />Checking your session…</Notice>}
        {authState.status === 'error' && <Notice tone="error">Could not check your session: {authState.error}</Notice>}

        {authState.status === 'signed-out' && auth && !passwordRecovery && <AuthForms auth={auth} busy={busy} error={error} message={message} run={run} onMessage={setMessage} />}

        {passwordRecovery && authState.status === 'signed-out' && <Notice tone="error">This password-reset session is missing or expired. Request a new reset link from the sign-in page.</Notice>}

        {passwordRecovery && authState.status === 'signed-in' && auth && <PasswordResetForm auth={auth} busy={busy} error={error} run={run} onComplete={onPasswordResetComplete} />}

        {!passwordRecovery && authState.status === 'signed-in' && authState.session && auth && <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <section className="border border-white/10 bg-white/[.02] p-5 md:p-6" aria-labelledby="saved-cvs-title">
            <div className="flex items-start justify-between gap-4">
              <div><p className="font-mono text-[9px] uppercase tracking-widest text-neutral-600">Cloud library</p><h2 id="saved-cvs-title" className="mt-1 font-display text-xl font-semibold">Saved CVs</h2></div>
              {busy && <LoaderCircle aria-label="Account operation in progress" className="animate-spin text-neutral-500" size={16} />}
            </div>

            {resumes.length === 0 && !busy && <div className="mt-6 border border-dashed border-white/10 p-8 text-center"><FileText className="mx-auto text-neutral-700" size={26} /><p className="mt-3 text-sm text-neutral-400">No cloud CVs yet</p><p className="mt-1 text-xs leading-5 text-neutral-600">Return to the editor and use Save to account when your plan allows it.</p></div>}

            <div className="mt-5 space-y-2">{resumes.map(resume => {
              const title = resume.title || 'Untitled CV';
              const confirmingDelete = deleteId === resume.id;
              return <article key={resume.id} className="border border-white/10 bg-black p-3">
                <div className="flex items-center gap-3">
                  <button type="button" aria-label={`Open ${title}`} disabled={busy} className="focus-ring min-h-11 min-w-0 flex-1 text-left disabled:opacity-50" onClick={() => void run(async () => onOpenDocument(await repository.load(resume.id)))}>
                    <span className="block truncate text-sm text-neutral-200">{title}</span>
                    <span className="mt-1 block font-mono text-[9px] uppercase tracking-wider text-neutral-600">Updated {new Date(resume.updatedAt).toLocaleString()}</span>
                  </button>
                  <button type="button" aria-label={`Delete ${title}`} disabled={busy} className="focus-ring min-h-10 min-w-10 p-2 text-neutral-600 hover:text-red-400 disabled:opacity-30" onClick={() => setDeleteId(resume.id)}><Trash2 className="mx-auto" size={14} /></button>
                </div>
                {confirmingDelete && <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3"><p className="text-xs text-neutral-500">Delete this cloud copy?</p><div className="flex gap-2"><button type="button" className="focus-ring px-3 py-2 text-xs text-neutral-400" onClick={() => setDeleteId(null)}>Cancel</button><button type="button" className="focus-ring border border-red-400/30 px-3 py-2 text-xs text-red-300" onClick={() => void run(async () => { await repository.remove(resume.id); setDeleteId(null); await refreshAccount(); })}>Delete</button></div></div>}
              </article>;
            })}</div>
            {error && <p className="mt-4 text-xs leading-5 text-red-400" role="alert">{error}</p>}
            {message && <p className="mt-4 text-xs leading-5 text-emerald-300" role="status">{message}</p>}
          </section>

          <aside className="space-y-4">
            <section className="border border-white/10 bg-white/[.02] p-5">
              <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-600">Signed in</p>
              <p className="mt-2 break-all text-sm text-neutral-200">{authState.session.user.email ?? 'Supabase account'}</p>
              <div className={`mt-4 flex items-center gap-2 border p-3 ${entitlement.premiumActive ? 'border-emerald-400/20 bg-emerald-400/5 text-emerald-300' : 'border-white/10 text-neutral-400'}`}>
                <Crown size={14} /><span className="font-mono text-[9px] uppercase tracking-widest">{entitlement.premiumActive ? 'Premium active' : 'Free account'}</span>
              </div>
              {!entitlement.premiumActive && <p className="mt-3 text-xs leading-5 text-neutral-600">Cloud creation and updates require a manually enabled premium entitlement. Billing is not part of this MVP.</p>}
              <button type="button" disabled={busy} className="focus-ring mt-5 flex min-h-10 w-full items-center justify-center gap-2 border border-white/15 px-3 py-2.5 text-xs text-neutral-300 hover:border-white/30 hover:text-white disabled:opacity-30" onClick={() => void run(() => auth.signOut())}><LogOut size={14} />Sign out</button>
            </section>
          </aside>
        </div>}
      </div>
    </div>
  </main>;
}

type RunAction = (action: () => Promise<void> | void) => Promise<void>;

function AuthForms({auth, busy, error, message, run, onMessage}: {auth: SupabaseAuthService; busy: boolean; error: string; message: string; run: RunAction; onMessage: (message: string) => void}) {
  const [mode, setMode] = useState<'sign-in' | 'sign-up' | 'forgot'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const selectMode = (nextMode: typeof mode) => {
    setMode(nextMode);
    setPassword('');
  };

  return <section className="max-w-md border border-white/10 bg-white/[.02] p-5 md:p-6" aria-labelledby="auth-form-title">
    {mode !== 'forgot' && <div className="grid grid-cols-2 border border-white/10 p-1" role="tablist" aria-label="Account access">
      <button type="button" role="tab" aria-selected={mode === 'sign-in'} className={`focus-ring min-h-10 px-3 text-xs ${mode === 'sign-in' ? 'bg-white text-black' : 'text-neutral-400'}`} onClick={() => selectMode('sign-in')}>Sign in</button>
      <button type="button" role="tab" aria-selected={mode === 'sign-up'} className={`focus-ring min-h-10 px-3 text-xs ${mode === 'sign-up' ? 'bg-white text-black' : 'text-neutral-400'}`} onClick={() => selectMode('sign-up')}>Create account</button>
    </div>}
    <h2 id="auth-form-title" className="mt-6 font-display text-xl font-semibold">{mode === 'sign-in' ? 'Welcome back' : mode === 'sign-up' ? 'Create your account' : 'Reset your password'}</h2>
    <p className="mt-2 text-xs leading-5 text-neutral-500">{mode === 'forgot' ? 'We will email you a secure link to choose a new password.' : 'Authentication does not upload your local CV.'}</p>

    <form className="mt-5" onSubmit={event => {
      event.preventDefault();
      void run(async () => {
        if (mode === 'sign-in') await auth.signIn(email, password);
        else if (mode === 'sign-up') {
          const result = await auth.signUp(email, password, getAuthRedirectUrl(window.location.href));
          if (result.confirmationRequired) onMessage(`Check ${email.trim()} to confirm your account, then sign in.`);
        } else {
          await auth.requestPasswordReset(email, getPasswordResetRedirectUrl(window.location.href));
          onMessage(`Check ${email.trim()} for your password-reset link.`);
        }
      });
    }}>
      <label className="block font-mono text-[10px] uppercase tracking-widest text-neutral-500" htmlFor="account-email">Email address</label>
      <input id="account-email" name="email" type="email" autoComplete="email" required disabled={busy} className="focus-ring mt-2 w-full border border-white/10 bg-black px-3 py-2.5 text-sm outline-none focus:border-white/40 disabled:opacity-50" value={email} onChange={event => setEmail(event.target.value)} />
      {mode !== 'forgot' && <><label className="mt-4 block font-mono text-[10px] uppercase tracking-widest text-neutral-500" htmlFor="account-password">Password</label><input id="account-password" name="password" type="password" autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'} minLength={8} required disabled={busy} className="focus-ring mt-2 w-full border border-white/10 bg-black px-3 py-2.5 text-sm outline-none focus:border-white/40 disabled:opacity-50" value={password} onChange={event => setPassword(event.target.value)} />{mode === 'sign-up' && <p className="mt-2 text-[11px] text-neutral-600">Use at least 8 characters.</p>}</>}
      <button type="submit" disabled={busy} className="focus-ring mt-5 flex min-h-11 w-full items-center justify-center gap-2 bg-white px-3 py-2.5 text-xs font-semibold text-black disabled:opacity-30">{busy && <LoaderCircle className="animate-spin" size={14} />}{mode === 'sign-in' ? 'Sign in' : mode === 'sign-up' ? 'Create account' : 'Send reset link'}</button>
    </form>
    {mode === 'sign-in' && <button type="button" className="focus-ring mt-4 text-xs text-neutral-500 underline underline-offset-4 hover:text-white" onClick={() => selectMode('forgot')}>Forgot password?</button>}
    {mode === 'forgot' && <button type="button" className="focus-ring mt-4 text-xs text-neutral-500 underline underline-offset-4 hover:text-white" onClick={() => selectMode('sign-in')}>Back to sign in</button>}
    {error && <p className="mt-4 text-xs leading-5 text-red-400" role="alert">{error}</p>}
    {message && <p className="mt-4 text-xs leading-5 text-emerald-300" role="status">{message}</p>}
  </section>;
}

function PasswordResetForm({auth, busy, error, run, onComplete}: {auth: SupabaseAuthService; busy: boolean; error: string; run: RunAction; onComplete: () => void}) {
  const [password, setPassword] = useState('');
  return <section className="max-w-md border border-white/10 bg-white/[.02] p-5 md:p-6">
    <h2 className="font-display text-xl font-semibold">Choose a new password</h2>
    <form className="mt-5" onSubmit={event => { event.preventDefault(); void run(async () => { await auth.updatePassword(password); onComplete(); }); }}>
      <label className="block font-mono text-[10px] uppercase tracking-widest text-neutral-500" htmlFor="new-password">New password</label>
      <input id="new-password" type="password" autoComplete="new-password" minLength={8} required disabled={busy} className="focus-ring mt-2 w-full border border-white/10 bg-black px-3 py-2.5 text-sm outline-none focus:border-white/40 disabled:opacity-50" value={password} onChange={event => setPassword(event.target.value)} />
      <button type="submit" disabled={busy} className="focus-ring mt-5 flex min-h-11 w-full items-center justify-center gap-2 bg-white px-3 py-2.5 text-xs font-semibold text-black disabled:opacity-30">{busy && <LoaderCircle className="animate-spin" size={14} />}Update password</button>
    </form>
    {error && <p className="mt-4 text-xs leading-5 text-red-400" role="alert">{error}</p>}
  </section>;
}

function Notice({tone, children}: {tone: 'neutral' | 'error'; children: React.ReactNode}) {
  return <div className={`flex max-w-xl items-center gap-2 border p-4 text-sm ${tone === 'error' ? 'border-red-400/20 text-red-300' : 'border-white/10 text-neutral-400'}`} role={tone === 'error' ? 'alert' : 'status'}>{children}</div>;
}

function toErrorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Account operation failed.';
}
