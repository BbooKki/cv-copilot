import {useEffect, useState} from 'react';
import {Cloud, LoaderCircle, LogOut, Save, Trash2} from 'lucide-react';
import {hasCvContent} from '../cv/blank';
import type {CvDocument} from '../cv/schema';
import type {SupabaseAuthService} from './supabaseAuth';
import {supabaseAuth} from './supabaseClient';
import {supabaseResumeRepository, type CloudResumeRepository, type CloudResumeSummary} from './supabaseResumeRepository';
import {useSupabaseSession} from './useSupabaseSession';

type CloudPanelProps = {
  document: CvDocument;
  onLoad: (document: CvDocument) => void;
  auth?: SupabaseAuthService | null;
  repository?: CloudResumeRepository;
};

export function CloudPanel({document, onLoad, auth = supabaseAuth, repository = supabaseResumeRepository}: CloudPanelProps) {
  const authState = useSupabaseSession(auth);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [resumes, setResumes] = useState<CloudResumeSummary[]>([]);
  const canSave = hasCvContent(document);

  useEffect(() => {
    if (authState.status !== 'signed-in') {
      setResumes([]);
      return;
    }

    let active = true;
    setBusy(true);
    setError('');
    void repository.list().then(nextResumes => {
      if (active) setResumes(nextResumes);
    }).catch(cause => {
      if (active) setError(toErrorMessage(cause));
    }).finally(() => {
      if (active) setBusy(false);
    });
    return () => { active = false; };
  }, [authState.status, authState.session?.user.id, repository]);

  const run = async (action: () => Promise<void>) => {
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

  const refresh = async () => setResumes(await repository.list());

  if (authState.status === 'unavailable') {
    return <CloudPanelShell busy={false}>
      <p className="text-xs leading-5 text-neutral-500">Cloud backup is not configured. Your CV is still saved locally in this browser.</p>
    </CloudPanelShell>;
  }

  return <CloudPanelShell busy={busy || authState.status === 'loading'}>
    {authState.status === 'loading' && <p className="text-xs leading-5 text-neutral-500" role="status">Checking your sign-in session…</p>}
    {authState.status === 'error' && <p className="text-xs leading-5 text-red-400" role="alert">Could not check your sign-in session: {authState.error}</p>}
    {authState.status === 'signed-out' && <p className="text-xs leading-5 text-neutral-500">Use <strong className="font-medium text-neutral-300">Sign in</strong> in the top toolbar to create an account or access your cloud CVs.</p>}
    {authState.status === 'signed-in' && authState.session && auth && <div>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0"><p className="font-mono text-[9px] uppercase tracking-widest text-neutral-600">Signed in</p><p className="mt-1 truncate text-xs text-neutral-300">{authState.session.user.email ?? 'Supabase account'}</p></div>
        <button aria-label="Sign out" disabled={busy} className="focus-ring min-h-10 min-w-10 p-2 text-neutral-500 hover:text-white disabled:opacity-30" onClick={() => void run(() => auth.signOut())}><LogOut className="mx-auto" size={14} /></button>
      </div>
      <button disabled={busy || !canSave} className="focus-ring mt-4 flex min-h-10 w-full items-center justify-center gap-2 bg-white px-3 py-2.5 text-xs font-semibold text-black disabled:opacity-30" onClick={() => void run(async () => {
        const saved = await repository.save(document);
        onLoad(saved);
        await refresh();
        setMessage('Saved securely to your account.');
      })}><Save size={14} />Save to cloud</button>
      {!canSave && <p className="mt-2 text-xs leading-5 text-neutral-600">Add CV content before saving a cloud copy.</p>}
      <div className="mt-4 space-y-2">{resumes.map(resume => {
        const resumeTitle = resume.title || 'Untitled CV';
        return <div key={resume.id} className="flex items-center gap-2 border border-white/10 bg-black p-2">
          <button disabled={busy} className="focus-ring min-h-10 min-w-0 flex-1 text-left disabled:opacity-50" onClick={() => void run(async () => onLoad(await repository.load(resume.id)))}><span className="block truncate text-xs text-neutral-300">{resumeTitle}</span><span className="font-mono text-[9px] uppercase tracking-wider text-neutral-600">{new Date(resume.updatedAt).toLocaleString()}</span></button>
          <button aria-label={`Delete ${resumeTitle}`} disabled={busy} className="focus-ring min-h-10 min-w-10 p-2 text-neutral-600 hover:text-red-400 disabled:opacity-30" onClick={() => void run(async () => { await repository.remove(resume.id); await refresh(); })}><Trash2 className="mx-auto" size={13} /></button>
        </div>;
      })}</div>
    </div>}
    {message && <p className="mt-3 text-xs leading-5 text-emerald-300" role="status">{message}</p>}
    {error && <p className="mt-3 text-xs leading-5 text-red-400" role="alert">{error}</p>}
  </CloudPanelShell>;
}

function CloudPanelShell({busy, children}: {busy: boolean; children: React.ReactNode}) {
  return <section className="border border-white/10 bg-white/[.02] p-4" aria-labelledby="cloud-backup-title">
    <div className="mb-4 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Cloud size={15} /><h3 id="cloud-backup-title" className="font-semibold">Cloud backup</h3></div>{busy && <LoaderCircle aria-label="Cloud operation in progress" size={14} className="animate-spin text-neutral-500" />}</div>
    {children}
  </section>;
}

function toErrorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Cloud operation failed.';
}
