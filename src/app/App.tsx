import {useCallback, useEffect, useRef, useState} from 'react';
import {Bot, Check, Download, ExternalLink, FileText, Globe, HardDrive, LoaderCircle, MessageSquare, PenLine, RotateCcw, Search, Square, WandSparkles, X} from 'lucide-react';
import {buildDesignPrompt, parseDesignRecommendation, type AiDesignRecommendation} from '../ai/design';
import {DesignAssistantPanel} from '../ai/DesignAssistantPanel';
import {InvalidOutputPanel} from '../ai/InvalidOutputPanel';
import {buildFitAnalysisPrompt, buildSuggestionPrompt, combineAnalysis, parseFitAnalysisResult, parseSuggestionResult, type AiAnalysisResult, type AiAnalysisRequest, type AiFitAnalysisResult} from '../ai/protocol';
import {applySuggestion, assertFitEvidenceExists, assertSuggestionsAreGrounded, validateSuggestionTarget} from '../ai/suggestions';
import {analyzeWithCloud} from '../ai/cloudClient';
import {researchCompany} from '../ai/researchClient';
import type {GroundedCompanyBrief} from '../ai/research';
import {AiProviderError} from '../ai/provider';
import {type CvDocument} from '../cv/schema';
import {createBlankCv, hasCvContent} from '../cv/blank';
import {CvEditor} from '../editor/CvEditor';
import {GEMMA_MODEL_BYTES, GEMMA_STORAGE_HEADROOM_BYTES, type GemmaGenerationKind, type GemmaGenerationPhase} from '../gemma/protocol';
import {useGemma} from '../gemma/useGemma';
import {extractJob} from '../jobs/client';
import {localResumeRepository} from '../persistence/localResumeRepository';
import {CvPreview} from '../templates/CvPreview';
import {TemplatePicker} from '../templates/TemplatePicker';
import {CloudPanel} from '../persistence/CloudPanel';
import {AccountMenu} from '../persistence/AccountMenu';

type View = 'cv' | 'copilot';
type CopilotMode = 'edit' | 'tailor';
type GenerationStage = 'fit' | 'suggestions' | 'design' | null;

export function App() {
  const [document, setDocument] = useState<CvDocument>(createBlankCv);
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const [undoStack, setUndoStack] = useState<CvDocument[]>([]);
  const [view, setView] = useState<View>('copilot');
  const [copilotMode, setCopilotMode] = useState<CopilotMode>('edit');
  const [aiMode, setAiMode] = useState<'cloud' | 'local'>('cloud');
  const [cloudConsent, setCloudConsent] = useState(() => {
    try { return localStorage.getItem('cvcopilot.cloudConsent') === 'granted'; } catch { return false; }
  });
  const [showConsent, setShowConsent] = useState(false);
  const [cloudBusy, setCloudBusy] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [companyBrief, setCompanyBrief] = useState<GroundedCompanyBrief | null>(null);
  const [researchBusy, setResearchBusy] = useState(false);
  const [researchError, setResearchError] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [jobText, setJobText] = useState('');
  const [jobMeta, setJobMeta] = useState<{title?: string; company?: string; sourceUrl?: string}>({});
  const [extracting, setExtracting] = useState(false);
  const [jobError, setJobError] = useState('');
  const [analysis, setAnalysis] = useState<AiAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState('');
  const [invalidAnalysisOutput, setInvalidAnalysisOutput] = useState<{stage: 'fit' | 'suggestions'; message: string; raw: string} | null>(null);
  const [designRecommendation, setDesignRecommendation] = useState<AiDesignRecommendation | null>(null);
  const [designError, setDesignError] = useState('');
  const [handledSuggestions, setHandledSuggestions] = useState<Record<string, 'accepted' | 'rejected'>>({});
  const [activeStage, setActiveStage] = useState<GenerationStage>(null);
  const [generationElapsedSeconds, setGenerationElapsedSeconds] = useState(0);
  const saveTimer = useRef<number | null>(null);
  const activeStageRef = useRef<GenerationStage>(null);
  const analysisRequestRef = useRef<AiAnalysisRequest | null>(null);
  const fitAnalysisRef = useRef<AiFitAnalysisResult | null>(null);
  const generateRef = useRef<(prompt: string, kind?: GemmaGenerationKind) => void>(() => undefined);

  const changeActiveStage = useCallback((stage: GenerationStage) => {
    activeStageRef.current = stage;
    setActiveStage(stage);
  }, []);

  const handleModelComplete = useCallback((raw: string) => {
    const completedStage = activeStageRef.current;
    try {
      if (completedStage === 'design') {
        setDesignRecommendation(parseDesignRecommendation(raw));
        setDesignError('');
        changeActiveStage(null);
        setCopilotMode('edit');
        setView('copilot');
      } else if (completedStage === 'fit') {
        const fit = parseFitAnalysisResult(raw);
        const request = analysisRequestRef.current;
        if (!request) throw new Error('The analysis request is no longer available.');
        assertFitEvidenceExists(request.cv, fit);
        fitAnalysisRef.current = fit;
        setAnalysis({...fit, suggestions: []});
        setHandledSuggestions({});
        setAnalysisError('');
        setInvalidAnalysisOutput(null);
        changeActiveStage('suggestions');
        setCopilotMode('tailor');
        setView('copilot');
        generateRef.current(buildSuggestionPrompt(request, fit), 'analysis');
      } else if (completedStage === 'suggestions') {
        const fit = fitAnalysisRef.current;
        if (!fit) throw new Error('The completed fit analysis is no longer available.');
        const suggestions = parseSuggestionResult(raw);
        const request = analysisRequestRef.current;
        if (!request) throw new Error('The analysis request is no longer available.');
        assertSuggestionsAreGrounded(request.cv, suggestions.suggestions);
        setAnalysis(combineAnalysis(fit, suggestions));
        setHandledSuggestions({});
        setAnalysisError('');
        setInvalidAnalysisOutput(null);
        changeActiveStage(null);
      }
    } catch (cause) {
      const message = cause instanceof Error ? `The local model returned invalid structured output: ${cause.message}` : 'Unable to validate the local model output.';
      changeActiveStage(null);
      if (completedStage === 'design') setDesignError(message);
      else if (completedStage === 'fit' || completedStage === 'suggestions') {
        setAnalysisError('');
        setInvalidAnalysisOutput({stage: completedStage, message, raw});
      }
    }
  }, [changeActiveStage]);
  const handleGenerationTimeout = useCallback((partialOutput: string) => {
    const timedOutStage = activeStageRef.current;
    changeActiveStage(null);
    const message = 'Local generation exceeded 90 seconds and was stopped. Retry with the compact response.';
    if (timedOutStage === 'design') setDesignError(message);
    else if (timedOutStage === 'fit' || timedOutStage === 'suggestions') {
      setAnalysisError('');
      setInvalidAnalysisOutput({stage: timedOutStage, message, raw: partialOutput});
    }
  }, [changeActiveStage]);
  const gemma = useGemma(handleModelComplete, handleGenerationTimeout);

  useEffect(() => { generateRef.current = gemma.generate; }, [gemma.generate]);

  useEffect(() => {
    if (!activeStage || gemma.status !== 'generating') {
      setGenerationElapsedSeconds(0);
      return;
    }
    const startedAt = Date.now();
    setGenerationElapsedSeconds(0);
    const timer = window.setInterval(() => {
      setGenerationElapsedSeconds(Math.floor((Date.now() - startedAt) / 1_000));
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [activeStage, gemma.status]);

  useEffect(() => {
    if (gemma.status !== 'error' || !activeStageRef.current) return;
    const failedStage = activeStageRef.current;
    changeActiveStage(null);
    if (failedStage === 'design') setDesignError(gemma.error);
    else if (failedStage === 'suggestions') setAnalysisError(`Fit analysis is ready. Suggestion generation stopped: ${gemma.error}`);
    else setAnalysisError(gemma.error);
  }, [changeActiveStage, gemma.error, gemma.status]);

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
      if (result.company) setCompanyName(result.company);
      if (result.title) setRoleTitle(result.title);
    } catch (cause) { setJobError(cause instanceof Error ? cause.message : 'Unable to extract this page.'); }
    finally { setExtracting(false); }
  };

  const runCloudAnalysis = useCallback(async () => {
    if (jobText.trim().length < 40) { setAnalysisError('Add a meaningful job description before analysis.'); return; }
    const request: AiAnalysisRequest = {protocolVersion: 1, cv: document, job: {source: jobMeta.sourceUrl ? 'url' : 'pasted', sourceUrl: jobMeta.sourceUrl, title: jobMeta.title, company: jobMeta.company, text: jobText}, options: {maxSuggestions: 3, language: 'en'}};
    analysisRequestRef.current = request;
    setAnalysis(null);
    setHandledSuggestions({});
    setAnalysisError('');
    setInvalidAnalysisOutput(null);
    setCloudBusy(true);
    try {
      const result = await analyzeWithCloud(request);
      assertFitEvidenceExists(document, result);
      assertSuggestionsAreGrounded(document, result.suggestions);
      setAnalysis(result);
    } catch (cause) {
      const message = cause instanceof AiProviderError || cause instanceof Error ? cause.message : 'Cloud analysis failed.';
      setAnalysisError(message);
    } finally {
      setCloudBusy(false);
    }
  }, [document, jobMeta, jobText]);

  const requestCloudAnalysis = () => {
    if (!cloudConsent) { setShowConsent(true); return; }
    if (!companyName && jobMeta.company) setCompanyName(jobMeta.company);
    if (!roleTitle && jobMeta.title) setRoleTitle(jobMeta.title);
    void runCloudAnalysis();
  };

  const runResearch = useCallback(async () => {
    const company = companyName.trim();
    if (!company) { setResearchError('Add a company name to research.'); return; }
    setResearchBusy(true);
    setResearchError('');
    setCompanyBrief(null);
    try {
      const brief = await researchCompany({
        company,
        role: roleTitle.trim() || undefined,
        jobText: jobText.trim() ? jobText.slice(0, 6_000) : undefined,
      });
      setCompanyBrief(brief);
    } catch (cause) {
      setResearchError(cause instanceof Error ? cause.message : 'Company research failed. Job-only preparation still applies.');
    } finally {
      setResearchBusy(false);
    }
  }, [companyName, roleTitle, jobText]);

  const grantCloudConsent = () => {
    try { localStorage.setItem('cvcopilot.cloudConsent', 'granted'); } catch { /* storage unavailable */ }
    setCloudConsent(true);
    setShowConsent(false);
    void runCloudAnalysis();
  };

  const runLocalAnalysis = (repair = false) => {
    if (jobText.trim().length < 40) { setAnalysisError('Add a meaningful job description before analysis.'); return; }
    const request = repair && analysisRequestRef.current ? analysisRequestRef.current : {protocolVersion: 1 as const, cv: document, job: {source: jobMeta.sourceUrl ? 'url' as const : 'pasted' as const, sourceUrl: jobMeta.sourceUrl, title: jobMeta.title, company: jobMeta.company, text: jobText}, options: {maxSuggestions: 3, language: 'en'}};
    analysisRequestRef.current = request;
    if (!repair) {
      fitAnalysisRef.current = null;
      setAnalysis(null);
      setHandledSuggestions({});
    }
    changeActiveStage('fit');
    setAnalysisError('');
    setInvalidAnalysisOutput(null);
    gemma.generate(buildFitAnalysisPrompt(request, {repair}), repair ? 'analysis-repair' : 'analysis');
  };

  const retrySuggestions = () => {
    const request = analysisRequestRef.current;
    const fit = fitAnalysisRef.current;
    if (!request || !fit) { setAnalysisError('Run the fit analysis again before requesting edits.'); return; }
    changeActiveStage('suggestions');
    setAnalysisError('');
    setInvalidAnalysisOutput(null);
    gemma.generate(buildSuggestionPrompt(request, fit, {repair: true}), 'analysis-repair');
  };

  const runDesignRecommendation = (direction: string) => {
    changeActiveStage('design');
    setDesignRecommendation(null);
    setDesignError('');
    gemma.generate(buildDesignPrompt(document, direction, jobText), 'design');
  };

  const cancelGeneration = () => {
    gemma.cancel();
    changeActiveStage(null);
  };

  const updateSettings = (settings: Partial<CvDocument['settings']>) => updateDocument({...document, settings: {...document.settings, ...settings}});

  const acceptDesignRecommendation = () => {
    if (!designRecommendation) return;
    updateSettings({templateId: designRecommendation.templateId, density: designRecommendation.density, accentColor: designRecommendation.accentColor});
    setDesignRecommendation(null);
  };

  const accept = (suggestion: AiAnalysisResult['suggestions'][number]) => {
    try { const applied = applySuggestion(document, suggestion); updateDocument(applied.document); setHandledSuggestions(state => ({...state, [suggestion.id]: 'accepted'})); }
    catch (cause) { setAnalysisError(cause instanceof Error ? cause.message : 'Unable to apply this suggestion.'); }
  };

  const formatBytes = (bytes: number) => `${(bytes / 1_000_000_000).toFixed(2)} GB`;
  const progress = Math.min(100, (gemma.progress.received / Math.max(gemma.progress.total, 1)) * 100);
  const cvHasContent = hasCvContent(document);
  const elapsedLabel = formatElapsed(generationElapsedSeconds);
  const generationPhaseLabel = labelGenerationPhase(gemma.generationPhase);
  const analysisActionLabel = activeStage === 'fit' && gemma.status === 'generating' ? `Analyzing job fit · ${generationPhaseLabel} · ${elapsedLabel}` : activeStage === 'suggestions' && gemma.status === 'generating' ? `Preparing grounded edit · ${generationPhaseLabel} · ${elapsedLabel}` : 'Analyze locally';
  const hasInsufficientStorage = !gemma.cached && gemma.capability.storageAvailable !== null && gemma.capability.storageAvailable < GEMMA_MODEL_BYTES + GEMMA_STORAGE_HEADROOM_BYTES;

  return <main className="app-grid min-h-screen bg-black text-white">
    <header className="no-print sticky top-0 z-40 border-b border-white/10 bg-black/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-4 px-4 py-3 md:px-6">
        <div className="flex min-w-0 items-center gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center border border-white/20 bg-white text-black"><FileText size={18} /></div><div className="min-w-0"><h1 className="truncate font-display text-base font-semibold">CV Copilot</h1><p className="font-mono text-[9px] uppercase tracking-[.16em] text-neutral-600">Cloud AI · Private mode · Truthful edits</p></div></div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 md:flex"><StatusPill icon={<HardDrive size={12} />} label={saveState === 'saving' ? 'Saving locally' : saveState === 'error' ? 'Save failed' : 'Saved locally'} tone={saveState === 'error' ? 'error' : 'neutral'} />
            <button className="focus-ring border border-white/10 px-3 py-2 text-xs text-neutral-400 hover:border-white/30 hover:text-white disabled:opacity-30" onClick={undo} disabled={!undoStack.length}><RotateCcw size={14} className="mr-1 inline" />Undo</button>
            <button className="focus-ring bg-white px-3 py-2 text-xs font-semibold text-black hover:bg-neutral-200 disabled:opacity-30" disabled={!cvHasContent} onClick={() => window.print()}><Download size={14} className="mr-1 inline" />Export PDF</button>
          </div>
          <AccountMenu />
        </div>
      </div>
      <nav className="mx-auto flex max-w-[1800px] border-t border-white/5 lg:hidden" aria-label="Workspace views">{(['cv', 'copilot'] as const).map(item => <button key={item} className={`focus-ring flex-1 px-3 py-3 font-mono text-[10px] uppercase tracking-widest ${view === item ? 'bg-white text-black' : 'text-neutral-500'}`} onClick={() => setView(item)}>{item}</button>)}</nav>
    </header>

    <div className="print-root mx-auto grid max-w-[1800px] lg:grid-cols-[minmax(0,1fr)_minmax(360px,40%)]">
      <section className={`paper-shell min-h-[calc(100vh-65px)] bg-neutral-950 px-4 py-7 md:px-8 lg:sticky lg:top-[65px] lg:h-[calc(100vh-65px)] lg:overflow-y-auto lg:px-6 ${view !== 'cv' ? 'hidden lg:block' : ''}`} aria-label="CV preview workspace">
        <div className="no-print mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-3"><div><p className="font-mono text-[9px] uppercase tracking-[.16em] text-neutral-600">Live document</p><p className="text-sm text-neutral-400">What you see is what exports.</p></div><p className="font-mono text-[9px] uppercase tracking-widest text-neutral-600">{document.settings.templateId === 'modern' ? 'Modern Mono' : 'Classic ATS'} · {document.settings.density}</p></div>
        <div className="paper-frame">{cvHasContent ? <CvPreview document={document} /> : <EmptyCvPreview pageSize={document.settings.pageSize} />}</div>
      </section>

      <aside className={`no-print min-h-[calc(100vh-65px)] border-l border-white/10 bg-black lg:h-[calc(100vh-65px)] lg:overflow-y-auto ${view !== 'copilot' ? 'hidden lg:block' : ''}`} aria-label="CV Copilot">
        <div className="sticky top-0 z-10 border-b border-white/10 bg-black/95 p-4 backdrop-blur-xl md:p-5">
          <div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[9px] uppercase tracking-[.16em] text-neutral-600">Private assistant</p><h2 className="mt-1 font-display text-xl font-semibold">CV Copilot</h2></div><button className="focus-ring p-2 text-neutral-500 hover:text-white md:hidden" onClick={undo} disabled={!undoStack.length}><RotateCcw size={18} /></button></div>
          <div className="mt-4 grid grid-cols-2 border border-white/10 p-1" role="tablist" aria-label="Copilot modes">
            <button role="tab" aria-selected={copilotMode === 'edit'} className={`focus-ring flex items-center justify-center gap-2 px-3 py-2.5 text-xs ${copilotMode === 'edit' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'}`} onClick={() => setCopilotMode('edit')}><PenLine size={14} />Edit CV</button>
            <button role="tab" aria-selected={copilotMode === 'tailor'} className={`focus-ring flex items-center justify-center gap-2 px-3 py-2.5 text-xs ${copilotMode === 'tailor' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'}`} onClick={() => setCopilotMode('tailor')}><MessageSquare size={14} />Tailor</button>
          </div>
        </div>

        {copilotMode === 'edit' ? <div className="space-y-5 p-4 md:p-5">
          <div className="mb-5 flex items-start gap-3"><div className="grid h-8 w-8 shrink-0 place-items-center border border-white/15 bg-white text-black"><Bot size={15} /></div><div className="max-w-[90%] border border-white/10 bg-white/[.04] p-3 text-sm leading-6 text-neutral-300">Add your real details below. I’ll keep the document preview updated as you type.</div></div>
          <TemplatePicker settings={document.settings} onTemplateChange={templateId => updateSettings({templateId})} onDensityChange={density => updateSettings({density})} onPageSizeChange={pageSize => updateSettings({pageSize})} onAccentChange={accentColor => updateSettings({accentColor})} />
          <DesignAssistantPanel settings={document.settings} status={gemma.status} progressPercent={progress} hasContent={cvHasContent} isDesignGenerating={gemma.status === 'generating' && activeStage === 'design'} generationElapsedLabel={elapsedLabel} generationPhaseLabel={generationPhaseLabel} generatedCharacters={gemma.generatedCharacters} recommendation={designRecommendation} error={designError || (activeStage === 'design' ? gemma.error : '')} onOpenTailor={() => setCopilotMode('tailor')} onGenerate={runDesignRecommendation} onCancel={cancelGeneration} onAccept={acceptDesignRecommendation} onDismiss={() => { setDesignRecommendation(null); setDesignError(''); }} />
          <CvEditor document={document} onChange={updateDocument} />
        </div> : <div className="space-y-4 p-4 md:p-5">
          <div className="flex items-start gap-3"><div className="grid h-8 w-8 shrink-0 place-items-center border border-white/15 bg-white text-black"><Bot size={15} /></div><div className="max-w-[90%] border border-white/10 bg-white/[.04] p-3 text-sm leading-6 text-neutral-300">Paste a job description or give me its URL. I compare it with your CV and propose only truthful edits you can review.</div></div>

          <div className="grid grid-cols-2 border border-white/10 p-1" role="tablist" aria-label="AI engine">
            <button role="tab" aria-selected={aiMode === 'cloud'} className={`focus-ring flex items-center justify-center gap-2 px-3 py-2.5 text-xs ${aiMode === 'cloud' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'}`} onClick={() => setAiMode('cloud')}><WandSparkles size={14} />Cloud · Gemini</button>
            <button role="tab" aria-selected={aiMode === 'local'} className={`focus-ring flex items-center justify-center gap-2 px-3 py-2.5 text-xs ${aiMode === 'local' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'}`} onClick={() => setAiMode('local')}><HardDrive size={14} />Private · Local</button>
          </div>

          <section className="border border-white/10 bg-white/[.02] p-4"><label className="font-mono text-[10px] uppercase tracking-widest text-neutral-500" htmlFor="job-url">Job URL</label><div className="mt-2 flex gap-2"><input id="job-url" className="focus-ring min-w-0 flex-1 border border-white/10 bg-black px-3 py-2 text-sm outline-none focus:border-white/40" placeholder="https://company.com/jobs/..." value={jobUrl} onChange={event => setJobUrl(event.target.value)} /><button disabled={!jobUrl || extracting} className="focus-ring border border-white/15 px-3 text-xs hover:border-white/40 disabled:opacity-30" onClick={() => void handleExtract()}>{extracting ? <LoaderCircle className="animate-spin" size={15} /> : 'Fetch'}</button></div>{jobError && <p className="mt-2 text-xs leading-5 text-red-400">{jobError} Paste the description below instead.</p>}<label className="mt-4 block font-mono text-[10px] uppercase tracking-widest text-neutral-500" htmlFor="job-text">Job description</label><textarea id="job-text" rows={9} className="focus-ring mt-2 w-full resize-y border border-white/10 bg-black p-3 text-sm leading-6 text-neutral-300 outline-none focus:border-white/40" value={jobText} onChange={event => { setJobText(event.target.value); setJobMeta({}); }} /></section>

          {aiMode === 'cloud' ? <section className="border border-white/10 bg-white/[.02] p-4">
            <div className="flex items-start justify-between gap-4"><div><p className="font-semibold">Gemini 2.5 Flash</p><p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-neutral-600">Cloud · free tier</p></div><span className={`mt-1 h-2 w-2 rounded-full ${cloudBusy ? 'bg-amber-400' : 'bg-emerald-400'}`} /></div>
            <p className="mt-3 text-xs leading-5 text-neutral-500">Your name, email, phone, location, and links are removed before anything is sent. Employment content — roles, dates, achievements — is included so the model can compare it with the role. <button className="text-neutral-300 underline underline-offset-2 hover:text-white" onClick={() => setAiMode('local')}>Use Private local mode instead</button>.</p>
            {showConsent && <div className="mt-4 border border-amber-400/25 bg-amber-400/5 p-3"><p className="text-xs leading-5 text-amber-100/90">This sends your CV's employment content and the job description to Google's Gemini API. On the free tier, Google may use the content to improve its products. Continue?</p><div className="mt-3 flex gap-2"><button className="focus-ring bg-white px-3 py-2 text-[10px] font-semibold text-black" onClick={grantCloudConsent}>Use cloud AI</button><button className="focus-ring border border-white/15 px-3 py-2 text-[10px] text-neutral-300" onClick={() => { setShowConsent(false); setAiMode('local'); }}>Switch to Private Mode</button></div></div>}
            <button className="focus-ring mt-4 flex w-full items-center justify-center gap-2 bg-white px-3 py-3 text-xs font-semibold text-black disabled:opacity-30" disabled={cloudBusy || jobText.trim().length < 40 || !cvHasContent} onClick={requestCloudAnalysis}>{cloudBusy ? <><LoaderCircle className="animate-spin" size={14} />Analyzing with Gemini…</> : <><WandSparkles size={14} />Analyze with Gemini</>}</button>
            {!cvHasContent && <p className="mt-2 text-[10px] leading-4 text-neutral-600">Add CV content before analysis.</p>}
          </section> : <section className="border border-white/10 bg-white/[.02] p-4">
            <div className="flex items-start justify-between gap-4"><div><p className="font-semibold">Gemma 4 E2B</p><p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-neutral-600">{gemma.status.replace('-', ' ')}</p></div><span className={`mt-1 h-2 w-2 rounded-full ${gemma.status === 'ready' ? 'bg-emerald-400' : gemma.status === 'error' ? 'bg-red-400' : 'bg-neutral-700'}`} /></div>
            <div className="mt-4 space-y-2 border-y border-white/10 py-3 font-mono text-[9px] text-neutral-500"><div className="flex justify-between"><span>DOWNLOAD</span><span>{formatBytes(GEMMA_MODEL_BYTES)}</span></div><div className="flex justify-between"><span>WEBGPU</span><span>{gemma.capability.webGpu ? 'AVAILABLE' : 'UNAVAILABLE'}</span></div><div className="flex justify-between"><span>LOCAL CACHE</span><span>{gemma.cacheVerified ? 'VERIFIED' : gemma.cached ? 'SAVED' : 'EMPTY'}</span></div><div className="flex justify-between"><span>FREE STORAGE</span><span>{gemma.capability.storageAvailable === null ? 'CHECKING' : formatBytes(gemma.capability.storageAvailable)}</span></div></div>
            {['downloading', 'initializing'].includes(gemma.status) && <div className="mt-4"><div className="flex justify-between font-mono text-[9px] text-neutral-500"><span>{gemma.status === 'initializing' ? 'INITIALIZING GPU' : 'DOWNLOADING ONCE'}</span><span>{progress.toFixed(1)}%</span></div><div className="mt-2 h-1 bg-white/10"><div className="h-full bg-white transition-[width]" style={{width: `${gemma.status === 'initializing' ? 100 : progress}%`}} /></div>{gemma.status === 'initializing' && <p className="mt-3 text-[10px] leading-4 text-neutral-600">This can take up to 3 minutes. LiteRT may report an unavailable NPU while continuing normally with WebGPU.</p>}<button className="mt-3 text-xs text-neutral-500 hover:text-white" onClick={gemma.cancel}>Cancel</button></div>}
            {gemma.error && <p className="mt-3 text-xs leading-5 text-red-400">{gemma.error}</p>}
            {hasInsufficientStorage && <p className="mt-3 text-xs leading-5 text-amber-300">Free at least {formatBytes(GEMMA_MODEL_BYTES + GEMMA_STORAGE_HEADROOM_BYTES)} in browser storage before downloading the local model.</p>}
            {gemma.status === 'unsupported' && <p className="mt-3 text-xs leading-5 text-amber-300">Local AI requires a WebGPU-enabled Chrome or Edge browser over HTTPS. The structured editor remains available.</p>}
            {gemma.status === 'generating' && <div className="mt-3 flex items-center justify-between border border-white/10 bg-black p-3 font-mono text-[9px] uppercase tracking-wider text-neutral-500"><span>{generationPhaseLabel}</span><span>{gemma.generatedCharacters} chars local</span></div>}
            <div className="mt-4 grid gap-2"><button className="focus-ring flex items-center justify-center gap-2 bg-white px-3 py-3 text-xs font-semibold text-black disabled:opacity-30" disabled={!['idle', 'error'].includes(gemma.status)} onClick={gemma.load}><HardDrive size={14} />{gemma.cached ? 'Load cached model' : 'Download local model'}</button><button className="focus-ring flex items-center justify-center gap-2 border border-white/15 px-3 py-3 text-xs disabled:opacity-30" disabled={gemma.status !== 'ready' || activeStage !== null || jobText.trim().length < 40 || !cvHasContent} onClick={() => runLocalAnalysis()}>{activeStage && activeStage !== 'design' ? <LoaderCircle className="animate-spin" size={14} /> : <WandSparkles size={14} />}{analysisActionLabel}</button>{gemma.status === 'generating' && <button className="focus-ring flex items-center justify-center gap-2 border border-white/15 px-3 py-3 text-xs" onClick={cancelGeneration}><Square size={12} fill="currentColor" />Stop generation</button>}{gemma.cached && <button className="focus-ring text-xs text-neutral-600 hover:text-red-400 disabled:opacity-30" disabled={['downloading', 'initializing', 'generating'].includes(gemma.status)} onClick={gemma.clearCache}>Remove cached model</button>}</div>
          </section>}

          {analysisError && <p className="border border-red-400/20 bg-red-400/5 p-3 text-xs leading-5 text-red-300">{analysisError}</p>}
          {invalidAnalysisOutput && <InvalidOutputPanel message={invalidAnalysisOutput.stage === 'suggestions' ? `Fit analysis is ready. Suggestions could not be generated. ${invalidAnalysisOutput.message}` : invalidAnalysisOutput.message} rawOutput={invalidAnalysisOutput.raw} retrying={gemma.status === 'generating'} retryLabel={invalidAnalysisOutput.stage === 'suggestions' ? 'Retry suggestions' : 'Retry fit analysis'} onRetry={invalidAnalysisOutput.stage === 'suggestions' ? retrySuggestions : () => runLocalAnalysis(true)} onDismiss={() => setInvalidAnalysisOutput(null)} />}
          {analysis && <AnalysisPanel analysis={analysis} document={document} handled={handledSuggestions} generatingSuggestions={activeStage === 'suggestions' && gemma.status === 'generating'} generationElapsedLabel={elapsedLabel} onAccept={accept} onReject={id => setHandledSuggestions(state => ({...state, [id]: 'rejected'}))} />}
          {aiMode === 'cloud' && analysis && <section className="border border-white/10 bg-white/[.02] p-4" aria-labelledby="research-title">
            <div className="flex items-start gap-3"><div className="grid h-8 w-8 shrink-0 place-items-center border border-white/15 bg-white text-black"><Globe size={15} /></div><div><p className="font-mono text-[9px] uppercase tracking-[.16em] text-neutral-600">Optional · cited</p><h3 id="research-title" className="mt-1 font-semibold">Research the company</h3></div></div>
            <p className="mt-3 text-xs leading-5 text-neutral-500">Uses Google Search to build a cited briefing on the company and role. Sends only the company, role, and public job text — never your CV or contact details. Individual people and social profiles are excluded.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <label className="block"><span className="mb-1 block font-mono text-[9px] uppercase tracking-widest text-neutral-600">Company</span><input className="focus-ring w-full border border-white/10 bg-black px-3 py-2 text-sm outline-none focus:border-white/40" value={companyName} onChange={event => setCompanyName(event.target.value)} placeholder="Acme Inc." /></label>
              <label className="block"><span className="mb-1 block font-mono text-[9px] uppercase tracking-widest text-neutral-600">Role · optional</span><input className="focus-ring w-full border border-white/10 bg-black px-3 py-2 text-sm outline-none focus:border-white/40" value={roleTitle} onChange={event => setRoleTitle(event.target.value)} placeholder="Frontend Engineer" /></label>
            </div>
            <button className="focus-ring mt-3 flex w-full items-center justify-center gap-2 border border-white/15 px-3 py-3 text-xs font-semibold disabled:opacity-30" disabled={researchBusy || !companyName.trim()} onClick={() => void runResearch()}>{researchBusy ? <><LoaderCircle className="animate-spin" size={14} />Researching with Google…</> : <><Search size={14} />Research this company with Google</>}</button>
            {researchError && <p className="mt-3 text-xs leading-5 text-amber-300">{researchError}</p>}
            {companyBrief && <div className="mt-4 border border-white/10 bg-black p-3">
              <p className="text-sm leading-6 text-neutral-200">{companyBrief.summary}</p>
              {companyBrief.priorities.length > 0 && <div className="mt-3"><p className="font-mono text-[9px] uppercase tracking-widest text-neutral-600">Current priorities</p><ul className="mt-2 space-y-1">{companyBrief.priorities.map((priority, index) => <li key={index} className="text-xs leading-5 text-neutral-400">• {priority}</li>)}</ul></div>}
              {companyBrief.roleContext && <div className="mt-3"><p className="font-mono text-[9px] uppercase tracking-widest text-neutral-600">For this role</p><p className="mt-1 text-xs leading-5 text-neutral-400">{companyBrief.roleContext}</p></div>}
              <div className="mt-3"><p className="font-mono text-[9px] uppercase tracking-widest text-neutral-600">Sources</p><ul className="mt-2 space-y-1">{companyBrief.sources.map((source, index) => <li key={index}><a href={source.url} target="_blank" rel="noreferrer" className="focus-ring inline-flex items-center gap-1 text-xs text-neutral-300 underline underline-offset-2 hover:text-white"><ExternalLink size={11} />{source.title}</a></li>)}</ul></div>
            </div>}
          </section>}
          <CloudPanel document={document} onLoad={updateDocument} />
        </div>}
      </aside>
    </div>

    <div className="no-print fixed bottom-4 right-4 flex gap-2 md:hidden"><button aria-label="Export PDF" disabled={!cvHasContent} className="focus-ring grid h-12 w-12 place-items-center bg-white text-black shadow-2xl disabled:opacity-30" onClick={() => window.print()}><Download size={18} /></button></div>
  </main>;
}

function AnalysisPanel({analysis, document, handled, generatingSuggestions, generationElapsedLabel, onAccept, onReject}: {analysis: AiAnalysisResult; document: CvDocument; handled: Record<string, 'accepted' | 'rejected'>; generatingSuggestions: boolean; generationElapsedLabel: string; onAccept: (suggestion: AiAnalysisResult['suggestions'][number]) => void; onReject: (id: string) => void}) {
  return <section className="border border-white/10 bg-white/[.02] p-4"><div className="flex items-center gap-2"><Bot size={16} /><h3 className="font-semibold">Analysis</h3></div><p className="mt-3 text-sm leading-6 text-neutral-300">{analysis.fitSummary}</p>{analysis.matchedRequirements.length > 0 && <div className="mt-4"><p className="font-mono text-[9px] uppercase tracking-widest text-neutral-600">Verified matches</p>{analysis.matchedRequirements.map(match => <p key={`${match.requirement}-${match.cvItemId ?? ''}`} className="mt-2 text-xs leading-5 text-neutral-500"><strong className="text-neutral-300">{match.requirement}:</strong> {match.evidence}</p>)}</div>}{analysis.gaps.length > 0 && <div className="mt-4"><p className="font-mono text-[9px] uppercase tracking-widest text-neutral-600">Honest gaps</p>{analysis.gaps.map(gap => <p key={gap.requirement} className="mt-2 text-xs leading-5 text-neutral-500"><strong className="text-neutral-300">{gap.requirement}:</strong> {gap.explanation}</p>)}</div>}{analysis.warnings.length > 0 && <div className="mt-4"><p className="font-mono text-[9px] uppercase tracking-widest text-neutral-600">Warnings</p>{analysis.warnings.map(warning => <p key={warning} className="mt-2 text-xs leading-5 text-amber-200/70">{warning}</p>)}</div>}{generatingSuggestions && <div className="mt-5 flex items-center gap-2 border border-white/10 bg-black p-3 text-xs text-neutral-400"><LoaderCircle className="animate-spin" size={14} /><span>Fit analysis is ready. Preparing one grounded edit · {generationElapsedLabel}</span></div>}<div className="mt-5 space-y-3">{analysis.suggestions.map(suggestion => { const state = handled[suggestion.id]; const valid = validateSuggestionTarget(document, suggestion); return <article key={suggestion.id} className={`border p-3 ${state === 'accepted' ? 'border-emerald-400/25 bg-emerald-400/5' : state === 'rejected' ? 'border-white/5 opacity-50' : 'border-white/10 bg-black'}`}><p className="font-mono text-[9px] uppercase tracking-widest text-neutral-600">{suggestion.target.section} · {suggestion.target.field}</p><div className="mt-3 space-y-2 text-xs leading-5"><p className="text-neutral-600 line-through">{suggestion.originalText}</p><p className="text-neutral-200">{suggestion.proposedText}</p></div><p className="mt-3 text-xs leading-5 text-neutral-500">{suggestion.reason}</p>{!state && <div className="mt-3 flex gap-2"><button disabled={!valid} className="focus-ring flex items-center gap-1 bg-white px-3 py-2 text-[10px] font-semibold text-black disabled:opacity-30" onClick={() => onAccept(suggestion)}><Check size={12} />Accept</button><button className="focus-ring flex items-center gap-1 border border-white/10 px-3 py-2 text-[10px] text-neutral-400" onClick={() => onReject(suggestion.id)}><X size={12} />Reject</button></div>}{state && <p className="mt-3 font-mono text-[9px] uppercase tracking-widest text-neutral-500">{state}</p>}</article>; })}</div></section>;
}

function formatElapsed(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function labelGenerationPhase(phase: GemmaGenerationPhase | null): string {
  if (phase === 'queued') return 'Waiting for runtime';
  if (phase === 'creating-conversation') return 'Preparing session';
  if (phase === 'conversation-ready') return 'Reading prompt';
  if (phase === 'decoding') return 'Generating locally';
  return 'Starting';
}

function StatusPill({icon, label, tone}: {icon: React.ReactNode; label: string; tone: 'neutral' | 'error'}) {
  return <span className={`flex items-center gap-1.5 border px-2.5 py-2 font-mono text-[9px] uppercase tracking-wider ${tone === 'error' ? 'border-red-400/20 text-red-400' : 'border-white/10 text-neutral-500'}`}>{icon}{label}</span>;
}

function EmptyCvPreview({pageSize}: {pageSize: CvDocument['settings']['pageSize']}) {
  return <div className="paper grid place-items-center p-[20mm] text-center" data-page-size={pageSize} aria-label="Empty CV preview"><div className="no-print max-w-[78mm]"><FileText className="mx-auto text-neutral-300" size={30} strokeWidth={1.25} /><p className="mt-5 text-[13pt] font-semibold text-neutral-800">Your CV will appear here</p><p className="mt-2 text-[9.5pt] leading-6 text-neutral-500">Add your details in the Copilot pane. Nothing is filled in or invented for you.</p></div></div>;
}
