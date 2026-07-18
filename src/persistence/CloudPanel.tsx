import {useEffect, useState} from 'react';
import {Cloud, Crown, LoaderCircle, Save} from 'lucide-react';
import {hasCvContent} from '../cv/blank';
import type {CvDocument} from '../cv/schema';
import {
  accountEntitlementRepository,
  type AccountEntitlementRepository,
} from './accountEntitlement';
import type {SupabaseAuthService} from './supabaseAuth';
import {supabaseAuth} from './supabaseClient';
import {supabaseResumeRepository, type CloudResumeRepository} from './supabaseResumeRepository';
import {useSupabaseSession} from './useSupabaseSession';

type CloudPanelProps = {
  document: CvDocument;
  onLoad: (document: CvDocument) => void;
  onOpenAccount: () => void;
  auth?: SupabaseAuthService | null;
  entitlements?: AccountEntitlementRepository;
  repository?: CloudResumeRepository;
};

export function CloudPanel({
  document,
  onLoad,
  onOpenAccount,
  auth = supabaseAuth,
  entitlements = accountEntitlementRepository,
  repository = supabaseResumeRepository,
}: CloudPanelProps) {
  const authState = useSupabaseSession(auth);
  const [premiumActive, setPremiumActive] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const canSave = hasCvContent(document) && premiumActive;

  useEffect(() => {
    if (authState.status !== 'signed-in') {
      setPremiumActive(false);
      return;
    }
    let active = true;
    setBusy(true);
    setError('');
    void entitlements.get().then(entitlement => {
      if (active) setPremiumActive(entitlement.premiumActive);
    }).catch(cause => {
      if (active) setError(toErrorMessage(cause));
    }).finally(() => {
      if (active) setBusy(false);
    });
    return () => { active = false; };
  }, [authState.session?.user.id, authState.status, entitlements]);

  const save = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const saved = await repository.save(document);
      onLoad(saved);
      setMessage('Saved securely to your account.');
    } catch (cause) {
      setError(toErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  if (authState.status === 'unavailable') return null;

  return <CloudPanelShell busy={busy || authState.status === 'loading'}>
    {authState.status === 'loading' && <p className="text-xs leading-5 text-neutral-500" role="status">Checking your account…</p>}
    {authState.status === 'error' && <p className="text-xs leading-5 text-red-400" role="alert">Could not check your account: {authState.error}</p>}
    {authState.status === 'signed-out' && <div><p className="text-xs leading-5 text-neutral-500">Sign in to access your account and cloud CVs.</p><AccountButton onClick={onOpenAccount}>Sign in or create account</AccountButton></div>}
    {authState.status === 'signed-in' && authState.session && <div>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0"><p className="font-mono text-[9px] uppercase tracking-widest text-neutral-600">Account</p><p className="mt-1 truncate text-xs text-neutral-300">{authState.session.user.email ?? 'Supabase account'}</p></div>
        <span className={`flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider ${premiumActive ? 'text-emerald-300' : 'text-neutral-600'}`}><Crown size={12} />{premiumActive ? 'Premium' : 'Free'}</span>
      </div>
      <button type="button" disabled={busy || !canSave} className="focus-ring mt-4 flex min-h-10 w-full items-center justify-center gap-2 bg-white px-3 py-2.5 text-xs font-semibold text-black disabled:opacity-30" onClick={() => void save()}><Save size={14} />Save to account</button>
      {!premiumActive && <p className="mt-2 text-xs leading-5 text-neutral-600">Cloud creation and updates require premium access. Billing is not included in this MVP.</p>}
      {premiumActive && !hasCvContent(document) && <p className="mt-2 text-xs leading-5 text-neutral-600">Add CV content before saving a cloud copy.</p>}
      <AccountButton onClick={onOpenAccount}>Manage saved CVs</AccountButton>
    </div>}
    {message && <p className="mt-3 text-xs leading-5 text-emerald-300" role="status">{message}</p>}
    {error && <p className="mt-3 text-xs leading-5 text-red-400" role="alert">{error}</p>}
  </CloudPanelShell>;
}

function CloudPanelShell({busy, children}: {busy: boolean; children: React.ReactNode}) {
  return <section className="border border-white/10 bg-white/[.02] p-4" aria-labelledby="cloud-backup-title">
    <div className="mb-4 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Cloud size={15} /><h3 id="cloud-backup-title" className="font-semibold">Cloud save</h3></div>{busy && <LoaderCircle aria-label="Cloud operation in progress" size={14} className="animate-spin text-neutral-500" />}</div>
    {children}
  </section>;
}

function AccountButton({children, onClick}: {children: React.ReactNode; onClick: () => void}) {
  return <button type="button" className="focus-ring mt-4 min-h-10 w-full border border-white/15 px-3 py-2.5 text-xs text-neutral-300 hover:border-white/30 hover:text-white" onClick={onClick}>{children}</button>;
}

function toErrorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Cloud operation failed.';
}
