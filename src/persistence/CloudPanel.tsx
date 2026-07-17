import {useEffect, useState} from 'react';
import type {Session} from '@supabase/supabase-js';
import {Cloud, LoaderCircle, LogOut, Mail, Save, Trash2} from 'lucide-react';
import type {CvDocument} from '../cv/schema';
import {isSupabaseConfigured, supabase} from './supabaseClient';
import {supabaseResumeRepository, type CloudResumeSummary} from './supabaseResumeRepository';

export function CloudPanel({document, onLoad}: {document: CvDocument; onLoad: (document: CvDocument) => void}) {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [resumes, setResumes] = useState<CloudResumeSummary[]>([]);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase.auth.getSession().then(({data}) => { if (active) setSession(data.session); });
    const {data} = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  useEffect(() => { if (session) void refresh(); else setResumes([]); }, [session]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true); setError(''); setMessage('');
    try { await action(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Cloud operation failed.'); }
    finally { setBusy(false); }
  };

  const refresh = async () => setResumes(await supabaseResumeRepository.list());

  if (!isSupabaseConfigured || !supabase) return <section className="border border-white/10 bg-white/[.02] p-4"><div className="flex items-center gap-2"><Cloud size={15} /><h3 className="font-semibold">Cloud backup</h3></div><p className="mt-2 text-xs leading-5 text-neutral-500">Optional cloud sync will activate after the Supabase project is linked. Your CV is already saved locally.</p></section>;

  return <section className="border border-white/10 bg-white/[.02] p-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Cloud size={15} /><h3 className="font-semibold">Cloud backup</h3></div>{busy && <LoaderCircle size={14} className="animate-spin text-neutral-500" />}</div>
    {!session ? <form className="mt-4" onSubmit={event => { event.preventDefault(); void run(async () => { const {error: authError} = await requireSupabase().auth.signInWithOtp({email, options: {emailRedirectTo: window.location.origin}}); if (authError) throw authError; setMessage('Check your email for the secure sign-in link.'); }); }}><label className="font-mono text-[9px] uppercase tracking-widest text-neutral-500" htmlFor="cloud-email">Email</label><div className="mt-2 flex gap-2"><input id="cloud-email" type="email" required className="focus-ring min-w-0 flex-1 border border-white/10 bg-black px-3 py-2 text-sm outline-none focus:border-white/40" value={email} onChange={event => setEmail(event.target.value)} /><button disabled={busy} className="focus-ring bg-white px-3 text-black disabled:opacity-30"><Mail size={14} /></button></div></form> : <div className="mt-4"><div className="flex items-center justify-between gap-2"><p className="truncate text-xs text-neutral-400">{session.user.email}</p><button aria-label="Sign out" className="focus-ring p-2 text-neutral-500 hover:text-white" onClick={() => void run(async () => { await requireSupabase().auth.signOut(); })}><LogOut size={14} /></button></div><button disabled={busy} className="focus-ring mt-3 flex w-full items-center justify-center gap-2 bg-white px-3 py-2.5 text-xs font-semibold text-black disabled:opacity-30" onClick={() => void run(async () => { const saved = await supabaseResumeRepository.save(document); onLoad(saved); await refresh(); setMessage('Saved securely to your account.'); })}><Save size={14} />Save to cloud</button><div className="mt-4 space-y-2">{resumes.map(resume => { const resumeTitle = resume.title || 'Untitled CV'; return <div key={resume.id} className="flex items-center gap-2 border border-white/10 bg-black p-2"><button className="focus-ring min-w-0 flex-1 text-left" onClick={() => void run(async () => onLoad(await supabaseResumeRepository.load(resume.id)))}><span className="block truncate text-xs text-neutral-300">{resumeTitle}</span><span className="font-mono text-[8px] uppercase tracking-wider text-neutral-600">{new Date(resume.updatedAt).toLocaleString()}</span></button><button aria-label={`Delete ${resumeTitle}`} className="focus-ring p-2 text-neutral-600 hover:text-red-400" onClick={() => void run(async () => { await supabaseResumeRepository.remove(resume.id); await refresh(); })}><Trash2 size={13} /></button></div>; })}</div></div>}
    {message && <p className="mt-3 text-xs leading-5 text-emerald-300">{message}</p>}{error && <p className="mt-3 text-xs leading-5 text-red-400">{error}</p>}
  </section>;
}

function requireSupabase() {
  if (!supabase) throw new Error('Cloud sync is not configured.');
  return supabase;
}
