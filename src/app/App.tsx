import {useCallback, useEffect, useRef, useState} from 'react';
import {Bot, Check, Download, FileText, HardDrive, LoaderCircle, MessageSquare, PenLine, RotateCcw, Square, WandSparkles, X} from 'lucide-react';
import {buildAnalysisPrompt, parseAiResult, type AiAnalysisResult, type AiAnalysisRequest} from '../ai/protocol';
import {applySuggestion, validateSuggestionTarget} from '../ai/suggestions';
import {type CvDocument} from '../cv/schema';
import {createBlankCv, hasCvContent} from '../cv/blank';
import {CvEditor} from '../editor/CvEditor';
import {GEMMA_MODEL_BYTES} from '../gemma/protocol';
import {useGemma} from '../gemma/useGemma';
import {extractJob} from '../jobs/client';
import {localResumeRepository} from '../persistence/localResumeRepository';
import {CvPreview} from '../templates/CvPreview';
import {CloudPanel} from '../persistence/CloudPanel';

type View = 'cv' | 'copilot';
type CopilotMode = 'edit' | 'tailor';

export function App() {
  const [document, setDocument] = useState<CvDocument>(createBlankCv);
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const [undoStack, setUndoStack] = useState<CvDocument[]>([]);
  const [view, setView] = useState<View>('copilot');
  const [copilotMode, setCopilotMode] = useState<CopilotMode>('edit');
  const [jobUrl, setJobUrl] = useState('');
  const [jobText, setJobText] = useState('');
  const [jobMeta, setJobMeta] = useState<{title?: string; company?: string; sourceUrl?: string}>({});
  const [extracting, setExtracting] = useState(false);
  const [jobError, setJobError] = useState('');
  const [analysis, setAnalysis] = useState<AiAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState('');
  const [handledSuggestions, setHandledSuggestions] = useState<Record<string, 'accepted' | 'rejected'>>({});
  const saveTimer = useRef<number | null>(null);

  const handleModelComplete = useCallback((raw: string) => {
    try {
      setAnalysis(parseAiResult(raw));
      setHandledSuggestions({});
      setAnalysisError('');
      setCopilotMode('tailor');
      setView('copilot');
    } catch (cause) {
      setAnalysisError(cause instanceof Error ? `The local model returned invalid structured output: ${cause.message}` : 'Unable to validate the local model output.');
    }
  }, []);
  const gemma = useGemma(handleModelComplete);

  useEffect(() => {
    let active = true;
    void localResumeRepository.load().then(saved => { if (active && saved) setDocument(saved); }).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    setSaveState('saving');
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void localResumeRepository.save(document).then(() => setSaveState('saved')).catch(() => setSaveState('error'));
    }, 350);
    return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); };
  }, [document, ready]);

  const updateDocument = useCallback((next: CvDocument) => {
    setUndoStack(stack => [...stack.slice(-24), document]);
    setDocument(next);
  }, [document]);

  const undo = () => {
    const previous = undoStack.at(-1);
    if (!previous) return;
    setDocument(previous);
    setUndoStack(stack => stack.slice(0, -1));
  };

  const handleExtract = async () => {
    setExtracting(true); setJobError('');
    try {
      const result = await extractJob(jobUrl);
      setJobText(result.text); setJobMeta({title: result.title, company: result.company, sourceUrl: result.url});
    } catch (cause) { setJobError(cause instanceof Error ? cause.message : 'Unable to extract this page.'); }
    finally { setExtracting(false); }
  };

  const runLocalAnalysis = () => {
    if (jobText.trim().length < 40) { setAnalysisError('Add a meaningful job description before analysis.'); return; }
    const request: AiAnalysisRequest = {protocolVersion: 1, cv: document, job: {source: jobMeta.sourceUrl ? 'url' : 'pasted', sourceUrl: jobMeta.sourceUrl, title: jobMeta.title, company: jobMeta.company, text: jobText}, options: {maxSuggestions: 5, language: 'en'}};
    gemma.generate(buildAnalysisPrompt(request));
  };

  const accept = (suggestion: AiAnalysisResult['suggestions'][number]) => {
    try { const applied = applySuggestion(document, suggestion); updateDocument(applied.document); setHandledSuggestions(state => ({...state, [suggestion.id]: 'accepted'})); }
    catch (cause) { setAnalysisError(cause instanceof Error ? cause.message : 'Unable to apply this suggestion.'); }
  };

  const formatBytes = (bytes: number) => `${(bytes / 1_000_000_000).toFixed(2)} GB`;
  const progress = Math.min(100, (gemma.progress.received / Math.max(gemma.progress.total, 1)) * 100);
  const cvHasContent = hasCvContent(document);

  return <main className="app-grid min-h-screen bg-black text-white">
    <header className="no-print sticky top-0 z-40 border-b border-white/10 bg-black/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-4 px-4 py-3 md:px-6">
        <div className="flex min-w-0 items-center gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center border border-white/20 bg-white text-black"><FileText size={18} /></div><div className="min-w-0"><h1 className="truncate font-display text-base font-semibold">CV Copilot</h1><p className="font-mono text-[9px] uppercase tracking-[.16em] text-neutral-600">Private · Local AI · Truthful edits</p></div></div>
        <div className="hidden items-center gap-2 md:flex">
          <StatusPill icon={<HardDrive size={12} />} label={saveState === 'saving' ? 'Saving locally' : saveState === 'error' ? 'Save failed' : 'Saved locally'} tone={saveState === 'error' ? 'error' : 'neutral'} />
          <button className="focus-ring border border-white/10 px-3 py-2 text-xs text-neutral-400 hover:border-white/30 hover:text-white disabled:opacity-30" onClick={undo} disabled={!undoStack.length}><RotateCcw size={14} className="mr-1 inline" />Undo</button>
          <button className="focus-ring bg-white px-3 py-2 text-xs font-semibold text-black hover:bg-neutral-200 disabled:opacity-30" disabled={!cvHasContent} onClick={() => window.print()}><Download size={14} className="mr-1 inline" />Export PDF</button>
        </div>
      </div>
      <nav className="mx-auto flex max-w-[1800px] border-t border-white/5 xl:hidden" aria-label="Workspace views">{(['cv', 'copilot'] as const).map(item => <button key={item} className={`focus-ring flex-1 px-3 py-3 font-mono text-[10px] uppercase tracking-widest ${view === item ? 'bg-white text-black' : 'text-neutral-500'}`} onClick={() => setView(item)}>{item}</button>)}</nav>
    </header>

    <div className="print-root mx-auto grid max-w-[1800px] xl:grid-cols-[minmax(0,1fr)_minmax(390px,40%)]">
      <section className={`paper-shell min-h-[calc(100vh-65px)] bg-neutral-950 px-4 py-7 md:px-8 lg:px-10 ${view !== 'cv' ? 'hidden xl:block' : ''}`} aria-label="CV preview workspace">
        <div className="no-print mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-3"><div><p className="font-mono text-[9px] uppercase tracking-[.16em] text-neutral-600">Live document</p><p className="text-sm text-neutral-400">What you see is what exports.</p></div><div className="flex items-center gap-2"><select aria-label="Template" className="focus-ring border border-white/10 bg-black px-3 py-2 text-xs text-neutral-300" value={document.settings.templateId} onChange={event => updateDocument({...document, settings: {...document.settings, templateId: event.target.value as 'classic' | 'modern'}})}><option value="modern">Modern Mono</option><option value="classic">Classic ATS</option></select><select aria-label="Page size" className="focus-ring border border-white/10 bg-black px-3 py-2 text-xs text-neutral-300" value={document.settings.pageSize} onChange={event => updateDocument({...document, settings: {...document.settings, pageSize: event.target.value as 'A4' | 'letter'}})}><option value="A4">A4</option><option value="letter">Letter</option></select><input aria-label="Accent color" type="color" className="focus-ring h-9 w-10 border border-white/10 bg-black p-1" value={document.settings.accentColor} onChange={event => updateDocument({...document, settings: {...document.settings, accentColor: event.target.value}})} /></div></div>
        <div className="paper-frame">{cvHasContent ? <CvPreview document={document} /> : <EmptyCvPreview pageSize={document.settings.pageSize} />}</div>
      </section>

      <aside className={`no-print min-h-[calc(100vh-65px)] border-l border-white/10 bg-black xl:h-[calc(100vh-65px)] xl:overflow-y-auto ${view !== 'copilot' ? 'hidden xl:block' : ''}`} aria-label="CV Copilot">
        <div className="sticky top-0 z-10 border-b border-white/10 bg-black/95 p-4 backdrop-blur-xl md:p-5">
          <div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[9px] uppercase tracking-[.16em] text-neutral-600">Private assistant</p><h2 className="mt-1 font-display text-xl font-semibold">CV Copilot</h2></div><button className="focus-ring p-2 text-neutral-500 hover:text-white md:hidden" onClick={undo} disabled={!undoStack.length}><RotateCcw size={18} /></button></div>
          <div className="mt-4 grid grid-cols-2 border border-white/10 p-1" role="tablist" aria-label="Copilot modes">
            <button role="tab" aria-selected={copilotMode === 'edit'} className={`focus-ring flex items-center justify-center gap-2 px-3 py-2.5 text-xs ${copilotMode === 'edit' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'}`} onClick={() => setCopilotMode('edit')}><PenLine size={14} />Edit CV</button>
            <button role="tab" aria-selected={copilotMode === 'tailor'} className={`focus-ring flex items-center justify-center gap-2 px-3 py-2.5 text-xs ${copilotMode === 'tailor' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'}`} onClick={() => setCopilotMode('tailor')}><MessageSquare size={14} />Tailor</button>
          </div>
        </div>

        {copilotMode === 'edit' ? <div className="p-4 md:p-5">
          <div className="mb-5 flex items-start gap-3"><div className="grid h-8 w-8 shrink-0 place-items-center border border-white/15 bg-white text-black"><Bot size={15} /></div><div className="max-w-[90%] border border-white/10 bg-white/[.04] p-3 text-sm leading-6 text-neutral-300">Add your real details below. I’ll keep the document preview updated as you type.</div></div>
          <CvEditor document={document} onChange={updateDocument} />
        </div> : <div className="space-y-4 p-4 md:p-5">
          <div className="flex items-start gap-3"><div className="grid h-8 w-8 shrink-0 place-items-center border border-white/15 bg-white text-black"><Bot size={15} /></div><div className="max-w-[90%] border border-white/10 bg-white/[.04] p-3 text-sm leading-6 text-neutral-300">Paste a job description or give me its URL. Your CV stays in this browser while Gemma compares it with the role.</div></div>
          <section className="border border-white/10 bg-white/[.02] p-4"><label className="font-mono text-[10px] uppercase tracking-widest text-neutral-500" htmlFor="job-url">Job URL</label><div className="mt-2 flex gap-2"><input id="job-url" className="focus-ring min-w-0 flex-1 border border-white/10 bg-black px-3 py-2 text-sm outline-none focus:border-white/40" placeholder="https://company.com/jobs/..." value={jobUrl} onChange={event => setJobUrl(event.target.value)} /><button disabled={!jobUrl || extracting} className="focus-ring border border-white/15 px-3 text-xs hover:border-white/40 disabled:opacity-30" onClick={() => void handleExtract()}>{extracting ? <LoaderCircle className="animate-spin" size={15} /> : 'Fetch'}</button></div>{jobError && <p className="mt-2 text-xs leading-5 text-red-400">{jobError} Paste the description below instead.</p>}<label className="mt-4 block font-mono text-[10px] uppercase tracking-widest text-neutral-500" htmlFor="job-text">Job description</label><textarea id="job-text" rows={9} className="focus-ring mt-2 w-full resize-y border border-white/10 bg-black p-3 text-sm leading-6 text-neutral-300 outline-none focus:border-white/40" value={jobText} onChange={event => { setJobText(event.target.value); setJobMeta({}); }} /></section>

          <section className="border border-white/10 bg-white/[.02] p-4">
            <div className="flex items-start justify-between gap-4"><div><p className="font-semibold">Gemma 4 E2B</p><p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-neutral-600">{gemma.status.replace('-', ' ')}</p></div><span className={`mt-1 h-2 w-2 rounded-full ${gemma.status === 'ready' ? 'bg-emerald-400' : gemma.status === 'error' ? 'bg-red-400' : 'bg-neutral-700'}`} /></div>
            <div className="mt-4 space-y-2 border-y border-white/10 py-3 font-mono text-[9px] text-neutral-500"><div className="flex justify-between"><span>DOWNLOAD</span><span>{formatBytes(GEMMA_MODEL_BYTES)}</span></div><div className="flex justify-between"><span>WEBGPU</span><span>{gemma.capability.webGpu ? 'AVAILABLE' : 'UNAVAILABLE'}</span></div><div className="flex justify-between"><span>LOCAL CACHE</span><span>{gemma.cached ? 'SAVED' : 'EMPTY'}</span></div></div>
            {['downloading', 'initializing'].includes(gemma.status) && <div className="mt-4"><div className="flex justify-between font-mono text-[9px] text-neutral-500"><span>{gemma.status === 'initializing' ? 'INITIALIZING GPU' : 'DOWNLOADING ONCE'}</span><span>{progress.toFixed(1)}%</span></div><div className="mt-2 h-1 bg-white/10"><div className="h-full bg-white transition-[width]" style={{width: `${gemma.status === 'initializing' ? 100 : progress}%`}} /></div><button className="mt-3 text-xs text-neutral-500 hover:text-white" onClick={gemma.cancel}>Cancel</button></div>}
            {gemma.error && <p className="mt-3 text-xs leading-5 text-red-400">{gemma.error}</p>}
            {gemma.status === 'unsupported' && <p className="mt-3 text-xs leading-5 text-amber-300">Local AI requires a WebGPU-enabled Chrome or Edge browser over HTTPS. The structured editor remains available.</p>}
            <div className="mt-4 grid gap-2"><button className="focus-ring flex items-center justify-center gap-2 bg-white px-3 py-3 text-xs font-semibold text-black disabled:opacity-30" disabled={!['idle', 'error'].includes(gemma.status)} onClick={gemma.load}><HardDrive size={14} />{gemma.cached ? 'Load cached model' : 'Download local model'}</button><button className="focus-ring flex items-center justify-center gap-2 border border-white/15 px-3 py-3 text-xs disabled:opacity-30" disabled={gemma.status !== 'ready' || jobText.trim().length < 40 || !cvHasContent} onClick={runLocalAnalysis}><WandSparkles size={14} />Analyze locally</button>{gemma.status === 'generating' && <button className="focus-ring flex items-center justify-center gap-2 border border-white/15 px-3 py-3 text-xs" onClick={gemma.cancel}><Square size={12} fill="currentColor" />Stop generation</button>}{gemma.cached && <button className="focus-ring text-xs text-neutral-600 hover:text-red-400" onClick={gemma.clearCache}>Remove cached model</button>}</div>
          </section>

          {analysisError && <p className="border border-red-400/20 bg-red-400/5 p-3 text-xs leading-5 text-red-300">{analysisError}</p>}
          {analysis && <AnalysisPanel analysis={analysis} document={document} handled={handledSuggestions} onAccept={accept} onReject={id => setHandledSuggestions(state => ({...state, [id]: 'rejected'}))} />}
          <CloudPanel document={document} onLoad={updateDocument} />
        </div>}
      </aside>
    </div>

    <div className="no-print fixed bottom-4 right-4 flex gap-2 md:hidden"><button aria-label="Export PDF" disabled={!cvHasContent} className="focus-ring grid h-12 w-12 place-items-center bg-white text-black shadow-2xl disabled:opacity-30" onClick={() => window.print()}><Download size={18} /></button></div>
  </main>;
}

function AnalysisPanel({analysis, document, handled, onAccept, onReject}: {analysis: AiAnalysisResult; document: CvDocument; handled: Record<string, 'accepted' | 'rejected'>; onAccept: (suggestion: AiAnalysisResult['suggestions'][number]) => void; onReject: (id: string) => void}) {
  return <section className="border border-white/10 bg-white/[.02] p-4"><div className="flex items-center gap-2"><Bot size={16} /><h3 className="font-semibold">Analysis</h3></div><p className="mt-3 text-sm leading-6 text-neutral-300">{analysis.fitSummary}</p>{analysis.gaps.length > 0 && <div className="mt-4"><p className="font-mono text-[9px] uppercase tracking-widest text-neutral-600">Honest gaps</p>{analysis.gaps.map(gap => <p key={gap.requirement} className="mt-2 text-xs leading-5 text-neutral-500"><strong className="text-neutral-300">{gap.requirement}:</strong> {gap.explanation}</p>)}</div>}<div className="mt-5 space-y-3">{analysis.suggestions.map(suggestion => { const state = handled[suggestion.id]; const valid = validateSuggestionTarget(document, suggestion); return <article key={suggestion.id} className={`border p-3 ${state === 'accepted' ? 'border-emerald-400/25 bg-emerald-400/5' : state === 'rejected' ? 'border-white/5 opacity-50' : 'border-white/10 bg-black'}`}><p className="font-mono text-[9px] uppercase tracking-widest text-neutral-600">{suggestion.target.section} · {suggestion.target.field}</p><div className="mt-3 space-y-2 text-xs leading-5"><p className="text-neutral-600 line-through">{suggestion.originalText}</p><p className="text-neutral-200">{suggestion.proposedText}</p></div><p className="mt-3 text-xs leading-5 text-neutral-500">{suggestion.reason}</p>{!state && <div className="mt-3 flex gap-2"><button disabled={!valid} className="focus-ring flex items-center gap-1 bg-white px-3 py-2 text-[10px] font-semibold text-black disabled:opacity-30" onClick={() => onAccept(suggestion)}><Check size={12} />Accept</button><button className="focus-ring flex items-center gap-1 border border-white/10 px-3 py-2 text-[10px] text-neutral-400" onClick={() => onReject(suggestion.id)}><X size={12} />Reject</button></div>}{state && <p className="mt-3 font-mono text-[9px] uppercase tracking-widest text-neutral-500">{state}</p>}</article>; })}</div></section>;
}

function StatusPill({icon, label, tone}: {icon: React.ReactNode; label: string; tone: 'neutral' | 'error'}) {
  return <span className={`flex items-center gap-1.5 border px-2.5 py-2 font-mono text-[9px] uppercase tracking-wider ${tone === 'error' ? 'border-red-400/20 text-red-400' : 'border-white/10 text-neutral-500'}`}>{icon}{label}</span>;
}

function EmptyCvPreview({pageSize}: {pageSize: CvDocument['settings']['pageSize']}) {
  return <div className="paper grid place-items-center p-[20mm] text-center" data-page-size={pageSize} aria-label="Empty CV preview"><div className="no-print max-w-[78mm]"><FileText className="mx-auto text-neutral-300" size={30} strokeWidth={1.25} /><p className="mt-5 text-[13pt] font-semibold text-neutral-800">Your CV will appear here</p><p className="mt-2 text-[9.5pt] leading-6 text-neutral-500">Add your details in the Copilot pane. Nothing is filled in or invented for you.</p></div></div>;
}
