import {useEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import {Check, Cpu, LoaderCircle, Pencil, Plus, Search, Sparkles, Trash2, X} from 'lucide-react';
import {InputField, TextAreaField} from '../components/Field';
import {makeId, type CvDocument} from '../cv/schema';
import {applyBankSuggestion, assertBankSuggestionsAreGrounded, bankEntryAsSuggestion, BANK_MAX_RETRIEVED, type BankSuggestion} from '../ai/bank';
import {suggestFromBankWithCloud} from '../ai/bankClient';
import {AiProviderError} from '../ai/provider';
import {retrieve, type RetrievedEntry, type Vector} from '../retrieval/hybrid';
import {splitJobIntoChunks} from '../retrieval/text';
import {useEmbedder} from '../retrieval/useEmbedder';
import {EMBEDDING_DOWNLOAD_BYTES} from '../retrieval/embedding.protocol';
import {LocalBankRepository} from './repository';
import {BANK_ENTRY_TEXT_LIMIT, BANK_MAX_ENTRIES, entryPassage, type BankEntry, type ExperienceBank} from './schema';

type Props = {
  document: CvDocument;
  jobText: string;
  onJobTextChange: (value: string) => void;
  jobTitle?: string;
  jobCompany?: string;
  cloudConsent: boolean;
  /** Shows the app's cloud consent dialog and runs `onGranted` after the user agrees. */
  onRequestCloudConsent: (onGranted: () => void) => void;
  /** Applies a new document through the normal undo path. */
  onApplyDocument: (next: CvDocument) => void;
  /** The app's cloud consent prompt while it is open, shown beside the button that asked for it. */
  consentPrompt?: ReactNode;
};

type Draft = {id?: string; title: string; text: string; context: string; tags: string; linkedItemId: string};
const emptyDraft: Draft = {title: '', text: '', context: '', tags: '', linkedItemId: ''};
const repository = new LocalBankRepository();

export function BankPanel({document, jobText, onJobTextChange, jobTitle, jobCompany, cloudConsent, onRequestCloudConsent, onApplyDocument, consentPrompt}: Props) {
  const consentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (consentPrompt) consentRef.current?.scrollIntoView?.({behavior: 'smooth', block: 'nearest'});
  }, [consentPrompt]);
  const [bank, setBank] = useState<ExperienceBank>(() => repository.load());
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [results, setResults] = useState<RetrievedEntry[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [suggestions, setSuggestions] = useState<BankSuggestion[] | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState('');
  const [handled, setHandled] = useState<Record<string, 'added' | 'skipped'>>({});
  const [directTargets, setDirectTargets] = useState<Record<string, string>>({});
  const embedder = useEmbedder();

  useEffect(() => { repository.save(bank); }, [bank]);

  const cvItems = useMemo(() => [
    ...document.experience.map(item => ({value: `experience:${item.id}`, label: [item.role, item.company].filter(Boolean).join(' · ') || 'Untitled experience'})),
    ...document.projects.map(item => ({value: `projects:${item.id}`, label: item.name || 'Untitled project'})),
  ], [document.experience, document.projects]);
  const entryById = useMemo(() => new Map(bank.entries.map(entry => [entry.id, entry])), [bank.entries]);

  const saveDraft = () => {
    const title = draft.title.trim();
    const text = draft.text.trim();
    if (!title || !text) { setFormError('Add a title and the fact itself.'); return; }
    if (!draft.id && bank.entries.length >= BANK_MAX_ENTRIES) { setFormError(`The bank holds up to ${BANK_MAX_ENTRIES} entries.`); return; }
    const linkedItemId = draft.linkedItemId ? draft.linkedItemId.split(':')[1] : undefined;
    const entry: BankEntry = {
      id: draft.id ?? makeId('bank'),
      title,
      text: text.slice(0, BANK_ENTRY_TEXT_LIMIT),
      context: draft.context.trim() || undefined,
      tags: draft.tags.split(',').map(tag => tag.trim()).filter(Boolean).slice(0, 12),
      linkedItemId,
      updatedAt: new Date().toISOString(),
    };
    setBank(current => ({...current, entries: draft.id ? current.entries.map(item => (item.id === entry.id ? entry : item)) : [entry, ...current.entries]}));
    setDraft(emptyDraft);
    setFormOpen(false);
    setFormError('');
    setResults(null);
    setSuggestions(null);
  };

  const editEntry = (entry: BankEntry) => {
    const linked = cvItems.find(item => item.value.endsWith(`:${entry.linkedItemId}`));
    setDraft({id: entry.id, title: entry.title, text: entry.text, context: entry.context ?? '', tags: entry.tags.join(', '), linkedItemId: linked?.value ?? ''});
    setFormOpen(true);
  };

  const removeEntry = (id: string) => {
    setBank(current => ({...current, entries: current.entries.filter(entry => entry.id !== id)}));
    setResults(current => current?.filter(result => result.entry.id !== id) ?? null);
  };

  const findMatches = async () => {
    if (jobText.trim().length < 40) { setSearchError('Paste a job description (at least a few lines) first.'); return; }
    if (bank.entries.length === 0) { setSearchError('Add a few entries to your bank first.'); return; }
    setSearching(true);
    setSearchError('');
    setSuggestions(null);
    setHandled({});
    try {
      let semantic: {entryVectors: Map<string, Vector>; jobChunkVectors: Vector[]} | undefined;
      if (embedder.status === 'ready') {
        const vectors = await embedder.embedPassages(bank.entries.map(entryPassage));
        const jobChunkVectors = await embedder.embedQueries(splitJobIntoChunks(jobText));
        semantic = {entryVectors: new Map(bank.entries.map((entry, index) => [entry.id, vectors[index]!])), jobChunkVectors};
      }
      setResults(retrieve(bank.entries, jobText, {topK: BANK_MAX_RETRIEVED, semantic}));
    } catch (cause) {
      setSearchError(cause instanceof Error ? `Search failed: ${cause.message}` : 'Search failed.');
    } finally {
      setSearching(false);
    }
  };

  const runSuggestions = async () => {
    if (!results?.length) return;
    setSuggesting(true);
    setSuggestError('');
    try {
      const result = await suggestFromBankWithCloud({protocolVersion: 1, cv: document, job: {title: jobTitle, company: jobCompany, text: jobText}, entries: results.map(item => item.entry), options: {maxSuggestions: 3}});
      setSuggestions(result.suggestions);
      if (result.suggestions.length === 0) setSuggestError('No grounded bullet fits this job. You can still add an entry as written.');
    } catch (cause) {
      setSuggestError(cause instanceof AiProviderError || cause instanceof Error ? cause.message : 'Suggestions failed.');
    } finally {
      setSuggesting(false);
    }
  };

  const requestSuggestions = () => {
    if (cloudConsent) void runSuggestions();
    else onRequestCloudConsent(() => void runSuggestions());
  };

  const applyOne = (suggestion: BankSuggestion, key: string) => {
    try {
      const entry = entryById.get(suggestion.bankEntryId);
      if (!entry) throw new Error('This bank entry no longer exists.');
      assertBankSuggestionsAreGrounded(document, [entry], [suggestion]);
      onApplyDocument(applyBankSuggestion(document, suggestion));
      setHandled(state => ({...state, [key]: 'added'}));
    } catch (cause) {
      setSuggestError(cause instanceof Error ? cause.message : 'Unable to add this bullet.');
    }
  };

  const addAsWritten = (entry: BankEntry) => {
    const target = entry.linkedItemId ? cvItems.find(item => item.value.endsWith(`:${entry.linkedItemId}`))?.value : directTargets[entry.id];
    if (!target) { setSearchError('Choose which CV item this entry belongs to.'); return; }
    const [section, itemId] = target.split(':') as ['experience' | 'projects', string];
    applyOne(bankEntryAsSuggestion(entry, {section, itemId}), `direct:${entry.id}`);
  };

  const progressPercent = Math.min(100, Math.round((embedder.progress.loaded / Math.max(embedder.progress.total, 1)) * 100));

  return (
    <div className="space-y-4 p-4 md:p-5">
      <section className="border border-white/10 bg-white/[.02] p-4" aria-labelledby="bank-title">
        <p className="font-mono text-[9px] uppercase tracking-[.16em] text-neutral-600">Experience bank · {bank.entries.length} {bank.entries.length === 1 ? 'entry' : 'entries'}</p>
        <h3 id="bank-title" className="mt-1 font-display text-lg font-semibold">Everything you’ve done, ready for any job</h3>
        <p className="mt-1 text-xs leading-5 text-neutral-500">Keep facts that don’t fit on your CV. For each job, CV Copilot finds the most relevant ones. Your bank is stored only in this browser.</p>
        {!formOpen && <button className="focus-ring mt-3 flex min-h-10 items-center gap-2 bg-white px-3 py-2 text-xs font-semibold text-black" onClick={() => { setDraft(emptyDraft); setFormOpen(true); }}><Plus size={14} />Add entry</button>}
        {formOpen && <div className="mt-4 space-y-3">
          <InputField label="Title" name="bank-title" maxLength={120} value={draft.title} onChange={event => setDraft({...draft, title: event.target.value})} placeholder="Batch job monitoring dashboard" />
          <TextAreaField label="What you did" name="bank-text" maxLength={BANK_ENTRY_TEXT_LIMIT} value={draft.text} onChange={event => setDraft({...draft, text: event.target.value})} placeholder="One fact, as you’d say it in an interview. Only include numbers you can prove." />
          <div className="grid gap-3 sm:grid-cols-2">
            <InputField label="Where / when" name="bank-context" maxLength={120} value={draft.context} onChange={event => setDraft({...draft, context: event.target.value})} placeholder="TheJoin · 2025" />
            <InputField label="Tags (comma-separated)" name="bank-tags" value={draft.tags} onChange={event => setDraft({...draft, tags: event.target.value})} placeholder="Vue 3, dashboards" />
          </div>
          <label className="block"><span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[.14em] text-neutral-500">Belongs to CV item (optional)</span>
            <select className="focus-ring w-full border border-white/10 bg-neutral-950 px-3 py-2.5 text-sm text-white" value={draft.linkedItemId} onChange={event => setDraft({...draft, linkedItemId: event.target.value})}>
              <option value="">Not linked</option>
              {cvItems.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          {formError && <p role="alert" className="text-xs text-red-700">{formError}</p>}
          <div className="flex gap-2"><button className="focus-ring flex min-h-10 items-center gap-2 bg-white px-3 py-2 text-xs font-semibold text-black" onClick={saveDraft}><Check size={14} />{draft.id ? 'Save changes' : 'Add to bank'}</button><button className="focus-ring min-h-10 border border-white/15 px-3 py-2 text-xs text-neutral-300 hover:text-white" onClick={() => { setFormOpen(false); setFormError(''); }}>Cancel</button></div>
        </div>}
        {bank.entries.length > 0 && <ul className="mt-4 divide-y divide-white/10 border-t border-white/10">
          {bank.entries.map(entry => <li key={entry.id} className="flex items-start justify-between gap-3 py-3">
            <div className="min-w-0"><p className="text-sm font-medium text-white">{entry.title}</p><p className="mt-0.5 line-clamp-2 text-xs leading-5 text-neutral-500">{entry.text}</p>{entry.context && <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-neutral-600">{entry.context}</p>}</div>
            <div className="flex shrink-0 gap-1"><button aria-label={`Edit ${entry.title}`} className="focus-ring p-2 text-neutral-500 hover:text-white" onClick={() => editEntry(entry)}><Pencil size={14} /></button><button aria-label={`Delete ${entry.title}`} className="focus-ring p-2 text-neutral-500 hover:text-red-700" onClick={() => removeEntry(entry.id)}><Trash2 size={14} /></button></div>
          </li>)}
        </ul>}
      </section>

      <section className="border border-white/10 bg-white/[.02] p-4" aria-labelledby="bank-search-title">
        <p className="font-mono text-[9px] uppercase tracking-[.16em] text-neutral-600">Retrieve for a job</p>
        <h3 id="bank-search-title" className="mt-1 font-display text-lg font-semibold">Find your most relevant experience</h3>
        <div className="mt-3"><TextAreaField label="Job description" name="bank-job" rows={4} value={jobText} onChange={event => onJobTextChange(event.target.value)} placeholder="Paste the posting, or fetch it in Tailor first." /></div>
        <div className="mt-3 border border-white/10 p-3 text-xs leading-5 text-neutral-400" aria-live="polite">
          <div className="flex items-center gap-2 text-neutral-200"><Cpu size={14} />On-device semantic search</div>
          {embedder.status === 'ready' && <p className="mt-1 text-emerald-700">On. Matches by meaning in English, Korean and Russian, without sending your bank anywhere.</p>}
          {embedder.status === 'idle' && <><p className="mt-1">Off: keyword matching only. Turn it on to match by meaning and across languages. {embedder.cached ? 'The model is already saved on this device.' : `One-time download of about ${Math.round(EMBEDDING_DOWNLOAD_BYTES / 1_000_000)} MB.`}</p><button className="focus-ring mt-2 min-h-9 border border-white/20 px-3 py-1.5 text-xs text-white hover:border-white/40" onClick={embedder.load}>{embedder.cached ? 'Turn on' : 'Download and turn on'}</button></>}
          {embedder.status === 'downloading' && <><p className="mt-1">Loading the model… {progressPercent}%</p><div className="mt-2 h-1 bg-white/10"><div className="h-1 bg-white" style={{width: `${progressPercent}%`}} /></div></>}
          {embedder.status === 'error' && <><p className="mt-1 text-red-700">Couldn’t load the model: {embedder.error}. Keyword matching still works.</p><button className="focus-ring mt-2 min-h-9 border border-white/20 px-3 py-1.5 text-xs text-white" onClick={embedder.load}>Try again</button></>}
        </div>
        <button className="focus-ring mt-3 flex min-h-10 w-full items-center justify-center gap-2 bg-white px-3 py-2 text-xs font-semibold text-black disabled:opacity-40" disabled={searching} onClick={() => void findMatches()}>{searching ? <LoaderCircle size={14} className="animate-spin" /> : <Search size={14} />}Find matching entries</button>
        {searchError && <p role="alert" className="mt-2 text-xs text-red-700">{searchError}</p>}

        {results && <div className="mt-4 space-y-2">
          {results.length === 0 && <p className="text-xs text-neutral-500">No entry matched this job.</p>}
          {results.map((result, index) => {
            const key = `direct:${result.entry.id}`;
            return <article key={result.entry.id} className="border border-white/10 p-3">
              <div className="flex items-center justify-between gap-2"><p className="text-sm font-medium text-white">{index + 1}. {result.entry.title}</p><span className="shrink-0 border border-white/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-neutral-400">{result.method === 'hybrid' ? 'Keyword + meaning' : result.method === 'keyword' ? 'Keyword' : 'Meaning'}{result.semanticSimilarity !== undefined ? ` · ${Math.round(result.semanticSimilarity * 100)}%` : ''}</span></div>
              <p className="mt-1 text-xs leading-5 text-neutral-400">{result.entry.text}</p>
              {handled[key] === 'added' ? <p className="mt-2 text-xs text-emerald-700">Added to your CV. Undo is available.</p> : <div className="mt-2 flex flex-wrap items-center gap-2">
                {!result.entry.linkedItemId && <select aria-label={`CV item for ${result.entry.title}`} className="focus-ring min-h-9 w-full min-w-0 max-w-full border border-white/10 bg-neutral-950 px-2 py-1 text-xs text-white sm:w-auto" value={directTargets[result.entry.id] ?? ''} onChange={event => setDirectTargets(state => ({...state, [result.entry.id]: event.target.value}))}><option value="">Choose CV item…</option>{cvItems.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select>}
                <button className="focus-ring min-h-9 border border-white/20 px-3 py-1.5 text-xs text-white hover:border-white/40" onClick={() => addAsWritten(result.entry)}>Add as written</button>
              </div>}
            </article>;
          })}
          {results.length > 0 && <button className="focus-ring mt-2 flex min-h-10 w-full items-center justify-center gap-2 border border-white/20 px-3 py-2 text-xs font-semibold text-white hover:border-white/40 disabled:opacity-40" disabled={suggesting} onClick={requestSuggestions}>{suggesting ? <LoaderCircle size={14} className="animate-spin" /> : <Sparkles size={14} />}Write tailored bullets from these (cloud AI)</button>}
          {results.length > 0 && <p className="text-[11px] leading-5 text-neutral-600">{results.length === 1 ? 'Only this entry is sent' : `Only these ${results.length} entries are sent`}, without contact details. Each bullet must cite its entry and add no new facts or numbers.</p>}
          {consentPrompt && <div ref={consentRef} className="mt-2">{consentPrompt}</div>}
        </div>}
        {suggestError && <p role="alert" className="mt-2 text-xs text-amber-700">{suggestError}</p>}

        {suggestions && suggestions.length > 0 && <div className="mt-4 space-y-2">
          <p className="font-mono text-[9px] uppercase tracking-[.16em] text-neutral-600">Tailored bullets · review each one</p>
          {suggestions.map(suggestion => {
            const entry = entryById.get(suggestion.bankEntryId);
            const item = cvItems.find(option => option.value === `${suggestion.target.section}:${suggestion.target.itemId}`);
            const state = handled[suggestion.id];
            return <article key={suggestion.id} className="border border-white/10 p-3">
              <p className="text-sm leading-6 text-white">{suggestion.proposedText}</p>
              <p className="mt-1 text-[11px] leading-5 text-neutral-500">From “{entry?.title ?? 'unknown entry'}” → {item?.label ?? 'CV item'}. {suggestion.reason}</p>
              {state ? <p className={`mt-2 text-xs ${state === 'added' ? 'text-emerald-700' : 'text-neutral-500'}`}>{state === 'added' ? 'Added to your CV. Undo is available.' : 'Skipped.'}</p> : <div className="mt-2 flex gap-2"><button className="focus-ring flex min-h-9 items-center gap-1 bg-white px-3 py-1.5 text-xs font-semibold text-black" onClick={() => applyOne(suggestion, suggestion.id)}><Check size={13} />Add to CV</button><button className="focus-ring flex min-h-9 items-center gap-1 border border-white/15 px-3 py-1.5 text-xs text-neutral-300" onClick={() => setHandled(current => ({...current, [suggestion.id]: 'skipped'}))}><X size={13} />Skip</button></div>}
            </article>;
          })}
        </div>}
      </section>
    </div>
  );
}
