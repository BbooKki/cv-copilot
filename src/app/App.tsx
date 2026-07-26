import {useCallback, useEffect, useRef, useState} from 'react';
import {Bot, Check, Download, FileText, Globe, HardDrive, LoaderCircle, MessageSquare, Mic, PenLine, RotateCcw, Send, Square, WandSparkles, X} from 'lucide-react';
import {buildDesignPrompt, parseDesignRecommendation, type AiDesignRecommendation} from '../ai/design';
import {DesignAssistantPanel} from '../ai/DesignAssistantPanel';
import {InvalidOutputPanel} from '../ai/InvalidOutputPanel';
import {buildFitAnalysisPrompt, buildSuggestionPrompt, combineAnalysis, parseFitAnalysisResult, parseSuggestionResult, type AiAnalysisResult, type AiAnalysisRequest, type AiFitAnalysisResult} from '../ai/protocol';
import {applySuggestion, assertFitEvidenceExists, assertSuggestionsAreGrounded, assertSuggestionsDoNotClaimGaps, bindSuggestionsToDocument, validateSuggestionTarget} from '../ai/suggestions';
import {analyzeWithCloud} from '../ai/cloudClient';
import {researchCompany} from '../ai/researchClient';
import {officialCompanySources, type GroundedCompanyBrief} from '../ai/research';
import {researchPublicPeople} from '../ai/peopleResearchClient';
import type {PublicPeopleResult} from '../ai/peopleResearch';
import {PUBLIC_PEOPLE_RESEARCH_ENABLED} from '../ai/peopleResearchConfig';
import {buildInterviewKit} from '../ai/interviewClient';
import {assertInterviewKitGrounded, type InterviewKit} from '../ai/interview';
import {buildOutreachKit} from '../ai/outreachClient';
import type {OutreachKit} from '../ai/outreach';
import {AiProviderError} from '../ai/provider';
import {type CvDocument} from '../cv/schema';
import {createBlankCv, hasCvContent} from '../cv/blank';
import {CvEditor} from '../editor/CvEditor';
import {readField, writeField, fieldLabel, type CvFieldTarget} from '../editor/fieldTargets';
import {GEMMA_MODEL_BYTES, GEMMA_STORAGE_HEADROOM_BYTES, type GemmaGenerationKind, type GemmaGenerationPhase} from '../gemma/protocol';
import {LOCAL_AI_ENABLED} from '../gemma/config';
import {useGemma} from '../gemma/useGemma';
import {extractJob} from '../jobs/client';
import {localResumeRepository} from '../persistence/localResumeRepository';
import {CvPreview} from '../templates/CvPreview';
import {TemplatePicker} from '../templates/TemplatePicker';
import {templateName} from '../templates/templateCatalog';
import {STYLE_PRESETS} from '../templates/presets';
import {AccountMenu} from '../persistence/AccountMenu';
import {AccountPage} from '../persistence/AccountPage';
import {LandingPage} from '../landing/LandingPage';
import {PricingPage} from '../pricing/PricingPage';
import {ApplicationKit} from './ApplicationKit';
import {ContactStrategyCard} from './ContactStrategyCard';


type View = 'cv' | 'copilot';
type CopilotMode = 'edit' | 'tailor';
type TailorView = 'conversation' | 'kit';
type GenerationStage = 'fit' | 'suggestions' | 'design' | null;
type TailorMessage = {id: string; role: 'user' | 'assistant'; text: string};
const CLOUD_CONSENT_KEY = 'cvcopilot.cloudConsent.v1';

export function App() {
  const [route, setRoute] = useState(() => appRoute(window.location.pathname));

  useEffect(() => {
    const handlePopState = () => setRoute(appRoute(window.location.pathname));
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((path: AppPath) => {
    window.history.pushState({}, '', path);
    setRoute(appRoute(new URL(path, window.location.origin).pathname));
  }, []);

  if (route === 'landing') {
    return <LandingPage
      onStart={() => navigate('/app')}
      onPricing={() => navigate('/pricing')}
      onSignIn={() => navigate('/account?mode=sign-in&from=landing')}
      onSignUp={() => navigate('/account?mode=sign-up&from=landing')}
    />;
  }

  if (route === 'pricing') {
    return <PricingPage onBack={() => navigate('/')} onStart={() => navigate('/app')} />;
  }

  if (route !== 'workspace') {
    const fromLanding = new URLSearchParams(window.location.search).get('from') === 'landing';
    return <AccountPage
      passwordRecovery={route === 'password-recovery'}
      initialMode={accountMode(window.location.search)}
      backLabel={fromLanding ? 'Back to home' : 'Back to editor'}
      onBack={() => navigate(fromLanding ? '/' : '/app')}
      onOpenDocument={async document => {
        await localResumeRepository.save(document);
        navigate('/app');
      }}
      onPasswordResetComplete={() => navigate('/account')}
    />;
  }

  return <Workspace onOpenAccount={() => navigate('/account')} />;
}

function Workspace({onOpenAccount}: {onOpenAccount: () => void}) {
  const [document, setDocument] = useState<CvDocument>(createBlankCv);
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const [undoStack, setUndoStack] = useState<CvDocument[]>([]);
  const [view, setView] = useState<View>('copilot');
  const [copilotMode, setCopilotMode] = useState<CopilotMode>('edit');
  const [tailorView, setTailorView] = useState<TailorView>('conversation');
  const [aiMode, setAiMode] = useState<'cloud' | 'local'>('cloud');
  const [cloudConsent, setCloudConsent] = useState(() => {
    try { return localStorage.getItem(CLOUD_CONSENT_KEY) === 'granted'; } catch { return false; }
  });
  const [showConsent, setShowConsent] = useState(false);
  const [pendingCloudAction, setPendingCloudAction] = useState<'analysis' | 'interview' | null>(null);
  const [cloudBusy, setCloudBusy] = useState(false);
  const [analysisNotice, setAnalysisNotice] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [companyBrief, setCompanyBrief] = useState<GroundedCompanyBrief | null>(null);
  const [researchBusy, setResearchBusy] = useState(false);
  const [researchError, setResearchError] = useState('');
  const [peopleResult, setPeopleResult] = useState<PublicPeopleResult | null>(null);
  const [peopleBusy, setPeopleBusy] = useState(false);
  const [peopleError, setPeopleError] = useState('');
  const [interviewKit, setInterviewKit] = useState<InterviewKit | null>(null);
  const [interviewBusy, setInterviewBusy] = useState(false);
  const [interviewError, setInterviewError] = useState('');
  const [outreachKit, setOutreachKit] = useState<OutreachKit | null>(null);
  const [outreachBusy, setOutreachBusy] = useState(false);
  const [outreachError, setOutreachError] = useState('');
  const [editingTarget, setEditingTarget] = useState<CvFieldTarget | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [jobText, setJobText] = useState('');
  const [jobMeta, setJobMeta] = useState<{title?: string; company?: string; sourceUrl?: string}>({});
  const [extracting, setExtracting] = useState(false);
  const [jobError, setJobError] = useState('');
  const [tailorInput, setTailorInput] = useState('');
  const [tailorMessages, setTailorMessages] = useState<TailorMessage[]>([]);
  const [analysis, setAnalysis] = useState<AiAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState('');
  const [invalidAnalysisOutput, setInvalidAnalysisOutput] = useState<{stage: 'fit' | 'suggestions'; message: string; raw: string} | null>(null);
  const [designRecommendation, setDesignRecommendation] = useState<AiDesignRecommendation | null>(null);
  const [designError, setDesignError] = useState('');
  const [handledSuggestions, setHandledSuggestions] = useState<Record<string, 'accepted' | 'rejected'>>({});
  const [activeStage, setActiveStage] = useState<GenerationStage>(null);
  const [generationElapsedSeconds, setGenerationElapsedSeconds] = useState(0);
  const saveTimer = useRef<number | null>(null);
  const tailorEndRef = useRef<HTMLDivElement | null>(null);
  const activeStageRef = useRef<GenerationStage>(null);
  const analysisRequestRef = useRef<AiAnalysisRequest | null>(null);
  const pendingCloudRequestRef = useRef<{text: string; meta: typeof jobMeta} | null>(null);
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
        const request = analysisRequestRef.current;
        if (!request) throw new Error('The analysis request is no longer available.');
        const parsed = parseSuggestionResult(raw);
        const suggestions = {...parsed, suggestions: bindSuggestionsToDocument(request.cv, parsed.suggestions)};
        assertSuggestionsAreGrounded(request.cv, suggestions.suggestions);
        assertSuggestionsDoNotClaimGaps(request.cv, fit, suggestions.suggestions);
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

  const clearCvDerivedResults = useCallback(() => {
    setTailorView('conversation');
    setAnalysis(null);
    setHandledSuggestions({});
    setAnalysisError('');
    setAnalysisNotice('');
    setInvalidAnalysisOutput(null);
    setInterviewKit(null);
    setInterviewError('');
    setOutreachKit(null);
    setOutreachError('');
  }, []);

  const clearJobDerivedResults = useCallback(() => {
    clearCvDerivedResults();
    setCompanyBrief(null);
    setResearchError('');
    setPeopleResult(null);
    setPeopleError('');
  }, [clearCvDerivedResults]);

  const updateDocument = useCallback((next: CvDocument, preserveAnalysis = false) => {
    setUndoStack(stack => [...stack.slice(-24), document]);
    setDocument(next);
    setInterviewKit(null);
    setOutreachKit(null);
    if (!preserveAnalysis) clearCvDerivedResults();
  }, [clearCvDerivedResults, document]);

  const undo = () => {
    const previous = undoStack.at(-1);
    if (!previous) return;
    setDocument(previous);
    setUndoStack(stack => stack.slice(0, -1));
    clearCvDerivedResults();
  };

  const openFieldEditor = useCallback((target: CvFieldTarget) => {
    setEditingTarget(target);
    setEditingValue(readField(document, target) ?? '');
  }, [document]);

  const closeFieldEditor = () => setEditingTarget(null);

  const saveFieldEditor = () => {
    if (!editingTarget) return;
    try { updateDocument(writeField(document, editingTarget, editingValue)); }
    catch { /* the field was removed while editing */ }
    setEditingTarget(null);
  };

  const handleEditorKey = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') { event.preventDefault(); closeFieldEditor(); }
    else if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') { event.preventDefault(); saveFieldEditor(); }
  };

  const handleExtract = async (inputUrl = jobUrl) => {
    setExtracting(true); setJobError('');
    try {
      const result = await extractJob(inputUrl);
      clearJobDerivedResults();
      setJobUrl(inputUrl);
      setJobText(result.text); setJobMeta({title: result.title, company: result.company, sourceUrl: result.url});
      if (result.company) setCompanyName(result.company);
      if (result.title) setRoleTitle(result.title);
      setTailorMessages(messages => [...messages, {id: crypto.randomUUID(), role: 'assistant', text: `Job fetched: ${result.title ?? 'job posting'}${result.company ? ` at ${result.company}` : ''}. Review the extracted description in Job details, then start the comparison when you’re ready.`}]);
    } catch (cause) { setJobError(cause instanceof Error ? cause.message : 'Unable to extract this page.'); }
    finally { setExtracting(false); }
  };

  const runCloudAnalysis = useCallback(async (override?: {text: string; meta: typeof jobMeta}) => {
    const currentText = override?.text ?? jobText;
    const currentMeta = override?.meta ?? jobMeta;
    if (currentText.trim().length < 40) { setAnalysisError('Add a meaningful job description before analysis.'); return; }
    const request: AiAnalysisRequest = {protocolVersion: 1, cv: document, job: {source: currentMeta.sourceUrl ? 'url' : 'pasted', sourceUrl: currentMeta.sourceUrl, title: currentMeta.title, company: currentMeta.company, text: currentText}, options: {maxSuggestions: 3, language: 'en'}};
    analysisRequestRef.current = request;
    setAnalysis(null);
    setHandledSuggestions({});
    setAnalysisError('');
    setAnalysisNotice('');
    setInvalidAnalysisOutput(null);
    setCloudBusy(true);
    try {
      const result = await analyzeWithCloud(request);
      assertFitEvidenceExists(document, result);
      assertSuggestionsAreGrounded(document, result.suggestions);
      assertSuggestionsDoNotClaimGaps(document, result, result.suggestions);
      setAnalysis(result);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Cloud analysis failed.';
      setAnalysis(null);
      setAnalysisError(message);
    } finally {
      setCloudBusy(false);
    }
  }, [document, jobMeta, jobText]);

  const requestCloudAnalysis = (override?: {text: string; meta: typeof jobMeta}) => {
    if (!cloudConsent) { pendingCloudRequestRef.current = override ?? null; setPendingCloudAction('analysis'); setShowConsent(true); return; }
    const currentMeta = override?.meta ?? jobMeta;
    if (!companyName && currentMeta.company) setCompanyName(currentMeta.company);
    if (!roleTitle && currentMeta.title) setRoleTitle(currentMeta.title);
    void runCloudAnalysis(override);
  };

  const runResearch = useCallback(async () => {
    const company = companyName.trim();
    if (!company) { setResearchError('Add a company name to research.'); return; }
    setResearchBusy(true);
    setResearchError('');
    setCompanyBrief(null);
    setPeopleResult(null);
    setPeopleError('');
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

  const runPeopleResearch = useCallback(async () => {
    if (!PUBLIC_PEOPLE_RESEARCH_ENABLED || !companyBrief) return;
    const officialSources = officialCompanySources(companyBrief);
    if (officialSources.length === 0) { setPeopleError('A verified official company source is required before searching for publicly listed team members.'); return; }
    setPeopleBusy(true);
    setPeopleError('');
    setPeopleResult(null);
    try {
      const result = await researchPublicPeople({
        company: companyBrief.company,
        role: roleTitle.trim() || undefined,
        officialSources,
      });
      setPeopleResult(result);
    } catch (cause) {
      setPeopleError(cause instanceof Error ? cause.message : 'Public team research failed. The company brief is still available.');
    } finally {
      setPeopleBusy(false);
    }
  }, [companyBrief, roleTitle]);

  const runInterviewKit = useCallback(async () => {
    setInterviewBusy(true);
    setInterviewError('');
    setInterviewKit(null);
    try {
      const kit = await buildInterviewKit({
        protocolVersion: 1,
        cv: document,
        job: {title: roleTitle.trim() || jobMeta.title, company: companyName.trim() || jobMeta.company, text: jobText},
        context: analysis
          ? {fitSummary: analysis.fitSummary, gaps: analysis.gaps.map(gap => gap.requirement), companyPriorities: companyBrief?.priorities.map(priority => priority.text)}
          : undefined,
      });
      assertInterviewKitGrounded(document, kit);
      setInterviewKit(kit);
    } catch (cause) {
      setInterviewError(cause instanceof Error ? cause.message : 'Interview kit generation failed.');
    } finally {
      setInterviewBusy(false);
    }
  }, [document, roleTitle, companyName, jobText, jobMeta, analysis, companyBrief]);

  const requestInterviewKit = () => {
    if (!cloudConsent) { setPendingCloudAction('interview'); setShowConsent(true); return; }
    setTailorView('kit');
    void runInterviewKit();
  };

  const runOutreach = useCallback(async () => {
    setOutreachBusy(true);
    setOutreachError('');
    setOutreachKit(null);
    try {
      const kit = await buildOutreachKit({
        protocolVersion: 1,
        cv: document,
        job: {title: roleTitle.trim() || jobMeta.title, company: companyName.trim() || jobMeta.company, text: jobText},
      });
      setOutreachKit(kit);
    } catch (cause) {
      setOutreachError(cause instanceof Error ? cause.message : 'Outreach draft generation failed.');
    } finally {
      setOutreachBusy(false);
    }
  }, [document, roleTitle, companyName, jobText, jobMeta]);

  const requestOutreachKit = () => {
    setTailorView('kit');
    void runOutreach();
  };

  const submitTailorMessage = (inputOverride?: string) => {
    const message = (inputOverride ?? tailorInput).trim();
    if (!message || cloudBusy || extracting) return;
    setTailorInput('');
    const isUrl = /^https?:\/\/\S+$/i.test(message);
    setTailorMessages(messages => [...messages, {id: crypto.randomUUID(), role: 'user', text: isUrl ? compactUrl(message) : message}]);

    if (isUrl) {
      void handleExtract(message);
      return;
    }
    if (!analysis && message.length >= 40) {
      clearJobDerivedResults();
      setJobText(message);
      setJobMeta({});
      if (aiMode === 'cloud') requestCloudAnalysis({text: message, meta: {}});
      else setTailorMessages(messages => [...messages, {id: crypto.randomUUID(), role: 'assistant', text: gemma.status === 'ready' ? 'The job description is ready. Choose Analyze locally to start the private comparison.' : 'The job description is ready. Load the private model once, then I can analyze it on this device.'}]);
      return;
    }

    const reply = analysis ? answerFromAnalysis(message, analysis, handledSuggestions) : answerBeforeAnalysis(message);
    setTailorMessages(messages => [...messages, {id: crypto.randomUUID(), role: 'assistant', text: reply}]);
  };

  const grantCloudConsent = () => {
    try { localStorage.setItem(CLOUD_CONSENT_KEY, 'granted'); } catch { /* storage unavailable */ }
    setCloudConsent(true);
    setShowConsent(false);
    const action = pendingCloudAction;
    const pendingRequest = pendingCloudRequestRef.current;
    pendingCloudRequestRef.current = null;
    setPendingCloudAction(null);
    if (action === 'interview') { setTailorView('kit'); void runInterviewKit(); }
    else void runCloudAnalysis(pendingRequest ?? undefined);
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

  const updateSettings = (settings: Partial<CvDocument['settings']>) => updateDocument({...document, settings: {...document.settings, ...settings}}, true);

  const acceptDesignRecommendation = () => {
    if (!designRecommendation) return;
    updateSettings({templateId: designRecommendation.templateId, density: designRecommendation.density, accentColor: designRecommendation.accentColor});
    setDesignRecommendation(null);
  };

  const accept = (suggestion: AiAnalysisResult['suggestions'][number]) => {
    try {
      const applied = applySuggestion(document, suggestion);
      updateDocument(applied.document, true);
      setHandledSuggestions(state => ({...state, [suggestion.id]: 'accepted'}));
      setTailorMessages(messages => [...messages, {id: crypto.randomUUID(), role: 'assistant', text: `Applied the ${suggestion.target.section} edit. The original is preserved in Undo.`}]);
    }
    catch (cause) { setAnalysisError(cause instanceof Error ? cause.message : 'Unable to apply this suggestion.'); }
  };

  const reject = (suggestionId: string) => {
    setHandledSuggestions(state => ({...state, [suggestionId]: 'rejected'}));
    setTailorMessages(messages => [...messages, {id: crypto.randomUUID(), role: 'assistant', text: 'Skipped that edit. Your CV was not changed.'}]);
  };

  const formatBytes = (bytes: number) => `${(bytes / 1_000_000_000).toFixed(2)} GB`;
  const progress = Math.min(100, (gemma.progress.received / Math.max(gemma.progress.total, 1)) * 100);
  const cvHasContent = hasCvContent(document);
  const elapsedLabel = formatElapsed(generationElapsedSeconds);
  const generationPhaseLabel = labelGenerationPhase(gemma.generationPhase);
  const analysisActionLabel = activeStage === 'fit' && gemma.status === 'generating' ? `Analyzing job fit · ${generationPhaseLabel} · ${elapsedLabel}` : activeStage === 'suggestions' && gemma.status === 'generating' ? `Preparing grounded edit · ${generationPhaseLabel} · ${elapsedLabel}` : 'Analyze locally';
  const hasInsufficientStorage = !gemma.cached && gemma.capability.storageAvailable !== null && gemma.capability.storageAvailable < GEMMA_MODEL_BYTES + GEMMA_STORAGE_HEADROOM_BYTES;
  const completedKitItems = [companyBrief, interviewKit, outreachKit].filter(Boolean).length;

  useEffect(() => {
    tailorEndRef.current?.scrollIntoView?.({behavior: 'smooth', block: 'nearest'});
  }, [activeStage, analysis, analysisError, cloudBusy, extracting, showConsent, tailorMessages.length]);

  return <main className="liquid-app app-grid min-h-screen">
    <header className="no-print sticky top-0 z-40 p-3">
      <div className="glass-toolbar mx-auto flex max-w-[1800px] items-center justify-between gap-4 rounded-2xl px-4 py-2.5 md:px-5">
        <div className="min-w-0"><h1 className="sr-only">CV Copilot</h1><p className="font-mono text-[9px] uppercase tracking-[.16em] text-neutral-600">{LOCAL_AI_ENABLED ? 'Cloud AI · Private mode · Truthful edits' : 'Cloud AI · Truthful edits · User approved'}</p></div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 md:flex"><StatusPill icon={<HardDrive size={12} />} label={saveState === 'saving' ? 'Saving locally' : saveState === 'error' ? 'Save failed' : 'Saved locally'} tone={saveState === 'error' ? 'error' : 'neutral'} />
            <button className="focus-ring border border-white/10 px-3 py-2 text-xs text-neutral-400 hover:border-white/30 hover:text-white disabled:opacity-30" onClick={undo} disabled={!undoStack.length}><RotateCcw size={14} className="mr-1 inline" />Undo</button>
            <button className="focus-ring bg-white px-3 py-2 text-xs font-semibold text-black hover:bg-neutral-200 disabled:opacity-30" disabled={!cvHasContent} onClick={() => window.print()}><Download size={14} className="mr-1 inline" />Export PDF</button>
          </div>
          <button aria-label="Export PDF" className="focus-ring grid h-10 w-10 place-items-center border border-white/15 text-neutral-300 disabled:opacity-30 md:hidden" disabled={!cvHasContent} onClick={() => window.print()}><Download size={16} /></button>
          <AccountMenu onOpenAccount={onOpenAccount} />
        </div>
      </div>
      <nav className="glass-toolbar segmented-control mx-auto mt-2 flex max-w-[1800px] p-1 lg:hidden" aria-label="Workspace views">{(['cv', 'copilot'] as const).map(item => <button key={item} aria-selected={view === item} className={`focus-ring flex-1 px-3 py-2.5 font-mono text-[10px] uppercase tracking-widest ${view === item ? 'text-black' : 'text-neutral-500'}`} onClick={() => setView(item)}>{item}</button>)}</nav>
    </header>

    <div className="print-root workspace-grid mx-auto grid max-w-[1800px] lg:grid-cols-[minmax(0,1fr)_minmax(360px,40%)]">
      <section className={`paper-shell preview-canvas min-h-[calc(100vh-78px)] px-4 py-7 md:px-8 lg:sticky lg:top-[78px] lg:h-[calc(100vh-92px)] lg:overflow-y-auto lg:px-6 ${view !== 'cv' ? 'hidden lg:block' : ''}`} aria-label="CV preview workspace">
        <div className="no-print mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-3"><div><p className="font-mono text-[9px] uppercase tracking-[.16em] text-neutral-600">Live document</p><p className="text-sm text-neutral-400">What you see is what exports. Click any text field to edit it.</p></div><p className="font-mono text-[9px] uppercase tracking-widest text-neutral-600">{templateName(document.settings.templateId)} · {document.settings.density}</p></div>
        <div className="paper-frame">{cvHasContent ? <CvPreview document={document} onEditField={openFieldEditor} /> : <EmptyCvPreview pageSize={document.settings.pageSize} />}</div>
      </section>

      <aside className={`glass-panel copilot-shell no-print min-h-[calc(100vh-78px)] overflow-hidden lg:h-[calc(100vh-92px)] lg:overflow-y-auto ${view !== 'copilot' ? 'hidden lg:block' : ''}`} aria-label="CV Copilot">
        <div className="copilot-header sticky top-0 z-10 border-b border-white/10 p-4 md:p-5">
          <div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[9px] uppercase tracking-[.16em] text-neutral-600">Private assistant</p><h2 className="mt-1 font-display text-xl font-semibold">CV Copilot</h2></div><button className="focus-ring p-2 text-neutral-500 hover:text-white md:hidden" onClick={undo} disabled={!undoStack.length}><RotateCcw size={18} /></button></div>
          <div className="segmented-control mt-4 grid grid-cols-2 border border-white/10 p-1" role="tablist" aria-label="Copilot modes">
            <button role="tab" aria-selected={copilotMode === 'edit'} className={`focus-ring flex items-center justify-center gap-2 px-3 py-2.5 text-xs ${copilotMode === 'edit' ? 'text-black' : 'text-neutral-500 hover:text-white'}`} onClick={() => setCopilotMode('edit')}><PenLine size={14} />Edit CV</button>
            <button role="tab" aria-selected={copilotMode === 'tailor'} className={`focus-ring flex items-center justify-center gap-2 px-3 py-2.5 text-xs ${copilotMode === 'tailor' ? 'text-black' : 'text-neutral-500 hover:text-white'}`} onClick={() => setCopilotMode('tailor')}><MessageSquare size={14} />Tailor</button>
          </div>
        </div>

        {copilotMode === 'edit' ? <div className="space-y-5 p-4 md:p-5">
          <div className="mb-5 flex items-start gap-3"><div className="grid h-8 w-8 shrink-0 place-items-center border border-white/15 bg-white text-black"><Bot size={15} /></div><div className="max-w-[90%] border border-white/10 bg-white/[.04] p-3 text-sm leading-6 text-neutral-300">Add your real details below. I’ll keep the document preview updated as you type.</div></div>
          <CvEditor document={document} onChange={updateDocument} />
          <TemplatePicker settings={document.settings} onTemplateChange={templateId => updateSettings({templateId})} onDensityChange={density => updateSettings({density})} onPageSizeChange={pageSize => updateSettings({pageSize})} onAccentChange={accentColor => updateSettings({accentColor})} />
          <section className="border border-white/10 bg-white/[.02] p-4" aria-labelledby="presets-title">
            <p id="presets-title" className="font-mono text-[9px] uppercase tracking-[.16em] text-neutral-600">Style presets</p>
            <p className="mt-1 text-xs leading-5 text-neutral-500">One-click tested accent and density combinations.</p>
            <div className="mt-3 flex flex-wrap gap-2">{STYLE_PRESETS.map(preset => { const active = document.settings.accentColor.toLowerCase() === preset.accentColor.toLowerCase() && document.settings.density === preset.density; return <button key={preset.id} className={`focus-ring flex items-center gap-2 border px-3 py-2 text-xs ${active ? 'border-white/40 bg-white/10 text-white' : 'border-white/10 text-neutral-400 hover:border-white/30 hover:text-white'}`} onClick={() => updateSettings({accentColor: preset.accentColor, density: preset.density})}><span className="h-3 w-3 border border-white/20" style={{backgroundColor: preset.accentColor}} />{preset.name}</button>; })}</div>
          </section>
          {LOCAL_AI_ENABLED && <DesignAssistantPanel settings={document.settings} status={gemma.status} progressPercent={progress} hasContent={cvHasContent} isDesignGenerating={gemma.status === 'generating' && activeStage === 'design'} generationElapsedLabel={elapsedLabel} generationPhaseLabel={generationPhaseLabel} generatedCharacters={gemma.generatedCharacters} recommendation={designRecommendation} error={designError || (activeStage === 'design' ? gemma.error : '')} onOpenTailor={() => setCopilotMode('tailor')} onGenerate={runDesignRecommendation} onCancel={cancelGeneration} onAccept={acceptDesignRecommendation} onDismiss={() => { setDesignRecommendation(null); setDesignError(''); }} />}
        </div> : <div className="p-4 md:p-5">
          <div className={`segmented-control mb-3 grid ${analysis ? 'grid-cols-2' : 'grid-cols-1'} border border-white/10 p-1`} role="tablist" aria-label="Tailor workspace">
            <button role="tab" aria-selected={tailorView === 'conversation'} className="focus-ring min-h-10 px-3 py-2 text-xs text-neutral-500 hover:text-white" onClick={() => setTailorView('conversation')}>Conversation</button>
            {analysis && <button role="tab" aria-selected={tailorView === 'kit'} className="focus-ring min-h-10 px-3 py-2 text-xs text-neutral-500 hover:text-white" onClick={() => setTailorView('kit')}>Application kit{completedKitItems > 0 ? ` · ${completedKitItems}` : ''}</button>}
          </div>

          {tailorView === 'conversation' && <section className="overflow-hidden border border-white/10 bg-white/[.015]" aria-label="Tailor conversation">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/[.02] px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${cloudBusy || extracting || gemma.status === 'generating' ? 'bg-amber-400' : 'bg-emerald-400'}`} /><h3 className="text-sm font-semibold">Tailor conversation</h3></div>
                <p className="mt-1 pl-4 font-mono text-[8px] uppercase tracking-[.14em] text-neutral-600">{aiMode === 'cloud' ? 'Fast analysis · contact details removed' : 'Private analysis · stays on this device'}</p>
              </div>
              {LOCAL_AI_ENABLED && <div className="flex rounded-full border border-white/10 bg-black p-0.5" role="tablist" aria-label="AI engine">
                <button role="tab" aria-label="Cloud" aria-selected={aiMode === 'cloud'} className={`focus-ring rounded-full px-3 py-1.5 text-[10px] ${aiMode === 'cloud' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'}`} onClick={() => setAiMode('cloud')}><WandSparkles size={12} className="mr-1 inline" />Cloud</button>
                <button role="tab" aria-label="Private · Local" aria-selected={aiMode === 'local'} className={`focus-ring rounded-full px-3 py-1.5 text-[10px] ${aiMode === 'local' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'}`} onClick={() => setAiMode('local')}><HardDrive size={12} className="mr-1 inline" />Private</button>
              </div>}
            </div>

            <div className="max-h-[min(56vh,620px)] min-h-[320px] space-y-4 overflow-y-auto px-4 py-5 lg:h-[clamp(200px,calc(100vh-480px),620px)] lg:min-h-0" aria-live="polite">
              <ChatBubble role="assistant">Hi — I’m here to help you build a clear, truthful CV. What would you like to work on?</ChatBubble>
              {jobText && !tailorMessages.some(message => message.role === 'user') && <ChatBubble role="user">{jobMeta.title ? `${jobMeta.title}${jobMeta.company ? ` · ${jobMeta.company}` : ''}` : compactJobMessage(jobText)}</ChatBubble>}
              {tailorMessages.map(message => <ChatBubble key={message.id} role={message.role}>{message.text}</ChatBubble>)}
              {extracting && <ChatStatus>Reading and sanitizing the job page…</ChatStatus>}
              {cloudBusy && <ChatStatus>Comparing the role with your CV and validating each edit…</ChatStatus>}
              {gemma.status === 'generating' && activeStage && activeStage !== 'design' && <ChatStatus>{analysisActionLabel}</ChatStatus>}

              {showConsent && <AssistantAction title="Before I send this" icon={<WandSparkles size={13} />}>
                <p>Your work history and the job description go to the cloud AI provider. Your name and contact details are removed first.</p>
                <div className="mt-3 flex flex-wrap gap-2"><button className="focus-ring bg-white px-3 py-2 text-[10px] font-semibold text-black" onClick={grantCloudConsent}>Use cloud AI</button><button className="focus-ring border border-white/15 px-3 py-2 text-[10px] text-neutral-300" onClick={() => { setPendingCloudAction(null); setShowConsent(false); if (LOCAL_AI_ENABLED) setAiMode('local'); }}>{LOCAL_AI_ENABLED ? 'Keep it private' : 'Not now'}</button></div>
              </AssistantAction>}

              {aiMode === 'cloud' && !analysis && jobText.trim().length >= 40 && !cloudBusy && <AssistantAction title="Ready to compare" icon={<WandSparkles size={13} />}>
                <p>I have the job description. Start the comparison when you’re ready.</p>
                <button className="focus-ring mt-3 inline-flex items-center gap-2 bg-white px-3 py-2.5 text-xs font-semibold text-black disabled:opacity-30" disabled={!cvHasContent} onClick={() => requestCloudAnalysis()}><WandSparkles size={14} />Analyze CV</button>
                {!cvHasContent && <p className="mt-2 text-[10px] text-neutral-600">Add some CV content first so I have evidence to compare.</p>}
              </AssistantAction>}

              {LOCAL_AI_ENABLED && aiMode === 'local' && <AssistantAction title="Private mode" icon={<HardDrive size={13} />}>
                <p>{gemma.status === 'ready' ? 'The local model is ready. Nothing in this comparison leaves your device.' : `This mode uses a one-time ${formatBytes(GEMMA_MODEL_BYTES)} model download and WebGPU.`}</p>
                <div className="mt-3 flex flex-wrap gap-2"><button className="focus-ring inline-flex items-center gap-2 bg-white px-3 py-2.5 text-xs font-semibold text-black disabled:opacity-30" disabled={!['idle', 'error'].includes(gemma.status)} onClick={gemma.load}><HardDrive size={14} />{gemma.cached ? 'Load cached model' : 'Download local model'}</button><button className="focus-ring inline-flex items-center gap-2 border border-white/15 px-3 py-2.5 text-xs disabled:opacity-30" disabled={gemma.status !== 'ready' || activeStage !== null || jobText.trim().length < 40 || !cvHasContent} onClick={() => runLocalAnalysis()}>{activeStage && activeStage !== 'design' ? <LoaderCircle className="animate-spin" size={14} /> : <WandSparkles size={14} />}{analysisActionLabel}</button>{gemma.status === 'generating' && <button className="focus-ring inline-flex items-center gap-2 border border-white/15 px-3 py-2.5 text-xs" onClick={cancelGeneration}><Square size={12} fill="currentColor" />Stop</button>}</div>
                {['downloading', 'initializing'].includes(gemma.status) && <div className="mt-3"><div className="flex justify-between font-mono text-[9px] text-neutral-500"><span>{gemma.status === 'initializing' ? 'INITIALIZING GPU' : 'DOWNLOADING ONCE'}</span><span>{progress.toFixed(1)}%</span></div><div className="mt-2 h-1 bg-white/10"><div className="h-full bg-white transition-[width]" style={{width: `${gemma.status === 'initializing' ? 100 : progress}%`}} /></div><button className="mt-2 text-[10px] text-neutral-500 hover:text-white" onClick={gemma.cancel}>Cancel</button></div>}
                {gemma.status === 'generating' && <p className="mt-3 font-mono text-[9px] uppercase tracking-wider text-neutral-600">{generationPhaseLabel} · {gemma.generatedCharacters} chars local</p>}
                {gemma.error && <p className="mt-3 text-xs leading-5 text-red-400">{gemma.error}</p>}
                {hasInsufficientStorage && <p className="mt-3 text-xs leading-5 text-amber-300">Free at least {formatBytes(GEMMA_MODEL_BYTES + GEMMA_STORAGE_HEADROOM_BYTES)} in browser storage before downloading.</p>}
                {gemma.status === 'unsupported' && <p className="mt-3 text-xs leading-5 text-amber-300">Private mode needs WebGPU in Chrome or Edge over HTTPS.</p>}
                {gemma.cached && <button className="mt-3 text-[10px] text-neutral-600 hover:text-red-400 disabled:opacity-30" disabled={['downloading', 'initializing', 'generating'].includes(gemma.status)} onClick={gemma.clearCache}>Remove cached model</button>}
              </AssistantAction>}

              {analysisError && <ChatAlert tone="error">{analysisError}</ChatAlert>}
              {analysisNotice && <ChatAlert tone="warning">{analysisNotice}</ChatAlert>}
              {invalidAnalysisOutput && <InvalidOutputPanel message={invalidAnalysisOutput.stage === 'suggestions' ? `Fit analysis is ready. Suggestions could not be generated. ${invalidAnalysisOutput.message}` : invalidAnalysisOutput.message} rawOutput={invalidAnalysisOutput.raw} retrying={gemma.status === 'generating'} retryLabel={invalidAnalysisOutput.stage === 'suggestions' ? 'Retry suggestions' : 'Retry fit analysis'} onRetry={invalidAnalysisOutput.stage === 'suggestions' ? retrySuggestions : () => runLocalAnalysis(true)} onDismiss={() => setInvalidAnalysisOutput(null)} />}
              {analysis && <AnalysisPanel analysis={analysis} document={document} handled={handledSuggestions} generatingSuggestions={activeStage === 'suggestions' && gemma.status === 'generating'} generationElapsedLabel={elapsedLabel} onAccept={accept} onReject={reject} />}
              {analysis && <AssistantAction title="Build your application kit" icon={<FileText size={13} />}>
                <p>Research the company, prepare for the interview, and keep the results together for this role.</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2"><button className="focus-ring flex min-h-10 items-center justify-center gap-2 border border-white/15 px-3 py-2 text-[10px] font-semibold text-neutral-200 hover:border-white/30 hover:text-white" onClick={() => { setTailorView('kit'); if (companyName.trim()) void runResearch(); }}><Globe size={13} />Research company</button><button className="focus-ring flex min-h-10 items-center justify-center gap-2 bg-white px-3 py-2 text-[10px] font-semibold text-black" onClick={requestInterviewKit}><Mic size={13} />Prepare interview kit</button></div>
              </AssistantAction>}
              {analysis && <ContactStrategyCard companyName={companyName} researchBusy={researchBusy} outreachBusy={outreachBusy} onResearchOfficialChannels={() => { setTailorView('kit'); if (companyName.trim()) void runResearch(); }} onPrepareOutreach={requestOutreachKit} />}
              {!analysis && <div className="flex flex-wrap gap-2 pl-9">
                {['Help me improve my CV', 'How does tailoring work?', 'I want to tailor my CV'].map(prompt => <button key={prompt} className="focus-ring rounded-full border border-white/10 px-3 py-1.5 text-[10px] text-neutral-400 hover:border-white/30 hover:text-white" onClick={() => submitTailorMessage(prompt)}>{prompt}</button>)}
              </div>}
              <div ref={tailorEndRef} />
            </div>

            {analysis && <div className="flex gap-2 overflow-x-auto border-t border-white/10 px-4 py-3">
              {['What are my strongest matches?', 'What are my gaps?', 'Which edit should I review first?'].map(prompt => <button key={prompt} className="focus-ring shrink-0 rounded-full border border-white/10 px-3 py-1.5 text-[10px] text-neutral-400 hover:border-white/30 hover:text-white" onClick={() => submitTailorMessage(prompt)}>{prompt}</button>)}
            </div>}

            <div className="border-t border-white/10 bg-black/60 p-3">
              <label className="sr-only" htmlFor="tailor-message">Message CV Copilot</label>
              <div className="flex items-end gap-2 rounded-md border border-white/15 bg-white/[.025] p-2 focus-within:border-white/40">
                <textarea id="tailor-message" rows={2} className="min-h-12 min-w-0 flex-1 resize-none bg-transparent px-1 py-1 text-sm leading-5 text-neutral-200 outline-none" placeholder={analysis ? 'Ask about your fit, gaps, or suggested edits…' : 'Message CV Copilot…'} value={tailorInput} onChange={event => setTailorInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submitTailorMessage(); } }} />
                <button aria-label="Send message" className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-sm bg-white text-black disabled:opacity-30" disabled={!tailorInput.trim() || cloudBusy || extracting} onClick={() => submitTailorMessage()}><Send size={15} /></button>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3"><p className="font-mono text-[8px] uppercase tracking-wider text-neutral-700">Enter to send · AI edits need approval</p><details className="text-right text-[10px] text-neutral-600"><summary className="focus-ring cursor-pointer select-none hover:text-white">Job details</summary><div className="mt-3 w-[min(420px,calc(100vw-64px))] text-left"><label className="font-mono text-[9px] uppercase tracking-widest text-neutral-500" htmlFor="job-url">Job URL</label><div className="mt-2 flex gap-2"><input id="job-url" className="focus-ring min-w-0 flex-1 border border-white/10 bg-black px-3 py-2 text-xs outline-none focus:border-white/40" placeholder="https://company.com/jobs/..." value={jobUrl} onChange={event => setJobUrl(event.target.value)} /><button disabled={!jobUrl || extracting} className="focus-ring border border-white/15 px-3 text-xs hover:border-white/40 disabled:opacity-30" onClick={() => void handleExtract()}>{extracting ? <LoaderCircle className="animate-spin" size={14} /> : 'Fetch'}</button></div>{jobError && <p className="mt-2 text-xs leading-5 text-red-400">{jobError} Paste the description below instead.</p>}<label className="mt-3 block font-mono text-[9px] uppercase tracking-widest text-neutral-500" htmlFor="job-text">Job description</label><textarea id="job-text" rows={5} className="focus-ring mt-2 w-full resize-y border border-white/10 bg-black p-3 text-xs leading-5 text-neutral-300 outline-none focus:border-white/40" value={jobText} onChange={event => { clearJobDerivedResults(); setJobText(event.target.value); setJobMeta({}); }} /></div></details></div>
            </div>
          </section>}

          {tailorView === 'kit' && analysis && <ApplicationKit
            companyName={companyName}
            roleTitle={roleTitle}
            companyBrief={companyBrief}
            researchBusy={researchBusy}
            researchError={researchError}
            peopleResearchEnabled={PUBLIC_PEOPLE_RESEARCH_ENABLED}
            peopleResult={peopleResult}
            peopleBusy={peopleBusy}
            peopleError={peopleError}
            interviewKit={interviewKit}
            interviewBusy={interviewBusy}
            interviewError={interviewError}
            outreachKit={outreachKit}
            outreachBusy={outreachBusy}
            outreachError={outreachError}
            onCompanyNameChange={value => { setCompanyBrief(null); setPeopleResult(null); setPeopleError(''); setInterviewKit(null); setOutreachKit(null); setCompanyName(value); }}
            onRoleTitleChange={value => { setCompanyBrief(null); setPeopleResult(null); setPeopleError(''); setInterviewKit(null); setOutreachKit(null); setRoleTitle(value); }}
            onResearch={() => void runResearch()}
            onResearchPeople={() => void runPeopleResearch()}
            onPrepareInterview={requestInterviewKit}
            onPrepareOutreach={requestOutreachKit}
          />}
        </div>}
      </aside>
    </div>

    {editingTarget && <div className="no-print fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={`Edit ${fieldLabel(editingTarget)}`} onClick={closeFieldEditor}>
      <div className="glass-panel w-full max-w-lg rounded-t-2xl p-4 sm:rounded-2xl" onClick={event => event.stopPropagation()}>
        <div className="flex items-center justify-between"><p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">Edit · {fieldLabel(editingTarget)}</p><button className="focus-ring p-1 text-neutral-500 hover:text-white" aria-label="Close editor" onClick={closeFieldEditor}><X size={16} /></button></div>
        <textarea autoFocus aria-label={fieldLabel(editingTarget)} rows={5} className="focus-ring mt-3 w-full resize-y border border-white/10 bg-black p-3 text-sm leading-6 text-white outline-none focus:border-white/40" value={editingValue} onChange={event => setEditingValue(event.target.value)} onKeyDown={handleEditorKey} />
        <div className="mt-3 flex items-center justify-between gap-3"><p className="font-mono text-[9px] uppercase tracking-widest text-neutral-600">⌘/Ctrl+Enter save · Esc cancel</p><div className="flex gap-2"><button className="focus-ring border border-white/15 px-3 py-2 text-xs text-neutral-300 hover:text-white" onClick={closeFieldEditor}>Cancel</button><button className="focus-ring bg-white px-3 py-2 text-xs font-semibold text-black" onClick={saveFieldEditor}>Save</button></div></div>
      </div>
    </div>}
  </main>;
}

function appRoute(pathname: string): 'landing' | 'pricing' | 'workspace' | 'account' | 'password-recovery' {
  if (pathname === '/account/reset-password') return 'password-recovery';
  if (pathname === '/account') return 'account';
  if (pathname === '/pricing') return 'pricing';
  if (pathname === '/app') return 'workspace';
  return 'landing';
}

type AppPath = '/' | '/pricing' | '/app' | '/account' | '/account/reset-password' | `/account?${string}`;

function accountMode(search: string): 'sign-in' | 'sign-up' {
  return new URLSearchParams(search).get('mode') === 'sign-up' ? 'sign-up' : 'sign-in';
}

function ChatBubble({role, children}: {role: TailorMessage['role']; children: React.ReactNode}) {
  return <div className={`flex items-start gap-2.5 ${role === 'user' ? 'justify-end' : ''}`}>
    {role === 'assistant' && <AssistantAvatar />}
    <div className={`min-w-0 max-w-[88%] overflow-hidden whitespace-pre-wrap [overflow-wrap:anywhere] border px-3.5 py-2.5 text-sm leading-5 ${role === 'user' ? 'rounded-[14px_4px_14px_14px] border-white/20 bg-white text-black' : 'rounded-[4px_14px_14px_14px] border-white/10 bg-white/[.04] text-neutral-300'}`}>{children}</div>
  </div>;
}

function ChatStatus({children}: {children: React.ReactNode}) {
  return <div className="flex items-center gap-2 pl-9 font-mono text-[9px] uppercase tracking-wider text-neutral-600"><LoaderCircle className="animate-spin" size={12} /><span>{children}</span></div>;
}

function AssistantAvatar() {
  return <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/15 bg-white text-black"><Bot size={13} /></div>;
}

function AssistantAction({title, icon, children}: {title: string; icon: React.ReactNode; children: React.ReactNode}) {
  return <div className="flex items-start gap-2.5">
    <AssistantAvatar />
    <div className="max-w-[88%] rounded-[4px_14px_14px_14px] border border-white/10 bg-white/[.04] p-3 text-xs leading-5 text-neutral-400">
      <p className="mb-1 flex items-center gap-1.5 font-semibold text-neutral-200">{icon}{title}</p>
      {children}
    </div>
  </div>;
}

function ChatAlert({tone, children}: {tone: 'error' | 'warning'; children: React.ReactNode}) {
  return <div role={tone === 'error' ? 'alert' : 'status'} className={`ml-9 rounded-md border px-3 py-2.5 text-xs leading-5 ${tone === 'error' ? 'border-red-400/20 bg-red-400/5 text-red-300' : 'border-amber-400/20 bg-amber-400/5 text-amber-200'}`}>{children}</div>;
}

function compactJobMessage(text: string): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  return compact.length > 180 ? `${compact.slice(0, 177)}…` : compact;
}

function compactUrl(url: string): string {
  const clip = (value: string) => (value.length > 52 ? `${value.slice(0, 51)}…` : value);
  try {
    const parsed = new URL(url);
    const path = parsed.pathname === '/' ? '' : parsed.pathname;
    return clip(`${parsed.hostname.replace(/^www\./, '')}${path}`);
  } catch {
    return clip(url);
  }
}

function answerBeforeAnalysis(message: string): string {
  const normalized = message.toLowerCase();
  if (/\b(improve|edit|review|rewrite|cv|resume)\b/.test(normalized)) {
    return 'Absolutely. Use Edit CV for exact details, experience, and dates; I can help you decide what to emphasize and explain every suggested change. I will not invent facts for you.';
  }
  if (/\b(tailor|job|role|application|apply|fit)\b/.test(normalized)) {
    return 'I can tailor your CV when you have a role in mind. Paste the job description here, or open Job details to add a link. Then you choose whether to run a cloud or private comparison.';
  }
  if (/\b(hi|hello|hey|help|start)\b/.test(normalized)) {
    return 'Hi! We can improve your CV together, talk through what to emphasize, or tailor it to a role when you are ready. I’ll only suggest changes supported by your CV.';
  }
  return 'I can help you shape your CV, discuss what to improve, or tailor it to a role whenever you are ready. What would you like to focus on?';
}

function answerFromAnalysis(question: string, analysis: AiAnalysisResult, handled: Record<string, 'accepted' | 'rejected'>): string {
  const normalized = question.toLowerCase();
  if (/gap|missing|weak|lack/.test(normalized)) {
    if (!analysis.gaps.length) return 'I did not find a clear evidence gap in this comparison. Review the verified matches and the job posting before treating that as a guarantee.';
    return `Here are the honest gaps I found:\n${analysis.gaps.map(gap => `• ${gap.requirement}: ${gap.explanation}`).join('\n')}`;
  }
  if (/match|strength|strong|fit/.test(normalized)) {
    if (!analysis.matchedRequirements.length) return `${analysis.fitSummary}\n\nI could not verify a specific requirement from the current CV, so I won’t claim one.`;
    return `${analysis.fitSummary}\n${analysis.matchedRequirements.map(match => `• ${match.requirement}: ${match.evidence}`).join('\n')}`;
  }
  if (/edit|suggest|improv|change|rewrite/.test(normalized)) {
    const pending = analysis.suggestions.filter(suggestion => !handled[suggestion.id]);
    if (!pending.length) return 'There are no unreviewed edits left. I will never change the CV silently; accepted changes remain reversible with Undo.';
    const first = pending[0];
    return `Review the ${first.target.section} edit first: ${first.reason} The proposed wording is shown below with Accept and Reject controls.`;
  }
  return `${analysis.fitSummary}\n\nI can answer from the verified analysis without another AI call. Try asking about your strongest matches, honest gaps, or which suggested edit to review first.`;
}

function AnalysisPanel({analysis, document, handled, generatingSuggestions, generationElapsedLabel, onAccept, onReject}: {analysis: AiAnalysisResult; document: CvDocument; handled: Record<string, 'accepted' | 'rejected'>; generatingSuggestions: boolean; generationElapsedLabel: string; onAccept: (suggestion: AiAnalysisResult['suggestions'][number]) => void; onReject: (id: string) => void}) {
  const hasBreakdown = analysis.matchedRequirements.length > 0 || analysis.gaps.length > 0 || analysis.warnings.length > 0;
  return <div className="flex items-start gap-2.5">
    <AssistantAvatar />
    <div className="min-w-0 max-w-[88%] rounded-[4px_14px_14px_14px] border border-white/10 bg-white/[.04] p-3.5">
      <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">Your fit review</h3><span className="font-mono text-[8px] uppercase tracking-wider text-neutral-600">Grounded in your CV</span></div>
      <p className="mt-2 text-sm leading-5 text-neutral-300">{analysis.fitSummary}</p>
      {hasBreakdown && <details className="mt-3 border-y border-white/10 py-2 text-xs text-neutral-500">
        <summary className="focus-ring cursor-pointer select-none text-neutral-300 hover:text-white">See matches and gaps</summary>
        {analysis.matchedRequirements.length > 0 && <div className="mt-3"><p className="font-mono text-[9px] uppercase tracking-widest text-neutral-600">Verified matches</p>{analysis.matchedRequirements.map(match => <p key={`${match.requirement}-${match.cvItemId ?? ''}`} className="mt-2 leading-5"><strong className="text-neutral-300">{match.requirement}:</strong> {match.evidence}</p>)}</div>}
        {analysis.gaps.length > 0 && <div className="mt-3"><p className="font-mono text-[9px] uppercase tracking-widest text-neutral-600">Honest gaps</p>{analysis.gaps.map(gap => <p key={gap.requirement} className="mt-2 leading-5"><strong className="text-neutral-300">{gap.requirement}:</strong> {gap.explanation}</p>)}</div>}
        {analysis.warnings.length > 0 && <div className="mt-3"><p className="font-mono text-[9px] uppercase tracking-widest text-neutral-600">Warnings</p>{analysis.warnings.map(warning => <p key={warning} className="mt-2 leading-5 text-amber-200/70">{warning}</p>)}</div>}
      </details>}
      {generatingSuggestions && <div className="mt-3 flex items-center gap-2 rounded-md border border-white/10 bg-black p-3 text-xs text-neutral-400"><LoaderCircle className="animate-spin" size={14} /><span>Fit is ready. Preparing a grounded edit · {generationElapsedLabel}</span></div>}
      {analysis.suggestions.length > 0 && <div className="mt-4 space-y-3"><p className="font-mono text-[9px] uppercase tracking-widest text-neutral-600">Edits for your approval</p>{analysis.suggestions.map(suggestion => { const state = handled[suggestion.id]; const valid = validateSuggestionTarget(document, suggestion); return <article key={suggestion.id} className={`rounded-md border p-3 ${state === 'accepted' ? 'border-emerald-400/25 bg-emerald-400/5' : state === 'rejected' ? 'border-white/5 opacity-50' : 'border-white/10 bg-black'}`}><p className="font-mono text-[9px] uppercase tracking-widest text-neutral-600">{suggestion.target.section} · {suggestion.target.field}</p><div className="mt-3 space-y-2 text-xs leading-5"><p className="text-neutral-600 line-through">{suggestion.originalText}</p><p className="text-neutral-200">{suggestion.proposedText}</p></div><p className="mt-3 text-xs leading-5 text-neutral-500">{suggestion.reason}</p>{!state && <div className="mt-3 flex gap-2"><button disabled={!valid} className="focus-ring flex items-center gap-1 rounded-sm bg-white px-3 py-2 text-[10px] font-semibold text-black disabled:opacity-30" onClick={() => onAccept(suggestion)}><Check size={12} />Accept</button><button className="focus-ring flex items-center gap-1 rounded-sm border border-white/10 px-3 py-2 text-[10px] text-neutral-400" onClick={() => onReject(suggestion.id)}><X size={12} />Reject</button></div>}{state && <p className="mt-3 font-mono text-[9px] uppercase tracking-widest text-neutral-500">{state}</p>}</article>; })}</div>}
    </div>
  </div>;
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
