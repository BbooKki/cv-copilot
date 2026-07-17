import {ArrowRight, Check, LoaderCircle, Palette, Square, X} from 'lucide-react';
import {useState} from 'react';
import type {CvDocument} from '../cv/schema';
import type {GemmaStatus} from '../gemma/useGemma';
import type {AiDesignRecommendation} from './design';

type Props = {
  settings: CvDocument['settings'];
  status: GemmaStatus;
  progressPercent: number;
  hasContent: boolean;
  isDesignGenerating: boolean;
  generationElapsedLabel: string;
  generationPhaseLabel: string;
  generatedCharacters: number;
  recommendation: AiDesignRecommendation | null;
  error: string;
  onOpenTailor: () => void;
  onGenerate: (direction: string) => void;
  onCancel: () => void;
  onAccept: () => void;
  onDismiss: () => void;
};

export function DesignAssistantPanel({settings, status, progressPercent, hasContent, isDesignGenerating, generationElapsedLabel, generationPhaseLabel, generatedCharacters, recommendation, error, onOpenTailor, onGenerate, onCancel, onAccept, onDismiss}: Props) {
  const [direction, setDirection] = useState('');

  return <section className="border border-white/10 bg-white/[.02] p-4" aria-labelledby="ai-design-title">
    <div className="flex items-start gap-3"><div className="grid h-8 w-8 shrink-0 place-items-center border border-white/15 bg-white text-black"><Palette size={15} /></div><div><p className="font-mono text-[9px] uppercase tracking-[.16em] text-neutral-600">Constrained local AI</p><h3 id="ai-design-title" className="mt-1 font-semibold">Design assistant</h3></div></div>
    <p className="mt-3 text-xs leading-5 text-neutral-500">The local AI can recommend one tested template, layout density, and a professional accent. It cannot generate or execute arbitrary code.</p>

    {['idle', 'error'].includes(status) && <div className="mt-4 border border-white/10 bg-black p-3"><p className="text-xs leading-5 text-neutral-500">Activate the local model once in Tailor to unlock local analysis and design recommendations.</p><button className="focus-ring mt-3 flex w-full items-center justify-center gap-2 border border-white/15 px-3 py-2.5 text-xs font-semibold text-neutral-200 hover:border-white/30 hover:text-white" onClick={onOpenTailor}>Open Tailor <ArrowRight size={13} /></button></div>}
    {status === 'disabled' && <p className="mt-4 text-xs leading-5 text-neutral-500">Local AI is disabled for this deployment. Manual template controls remain available.</p>}
    {['downloading', 'initializing'].includes(status) && <div className="mt-4"><div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-wider text-neutral-500"><span className="flex items-center gap-2"><LoaderCircle className="animate-spin" size={12} />{status}</span><span>{progressPercent.toFixed(1)}%</span></div><div className="mt-2 h-1 bg-white/10"><div className="h-full bg-white transition-[width]" style={{width: `${status === 'initializing' ? 100 : progressPercent}%`}} /></div></div>}
    {status === 'unsupported' && <p className="mt-4 text-xs leading-5 text-amber-300">Design recommendations require a WebGPU-enabled Chrome or Edge browser over HTTPS. Manual template controls remain available.</p>}

    {status === 'ready' && !recommendation && <div className="mt-4"><label className="block"><span className="mb-1.5 block font-mono text-[9px] uppercase tracking-widest text-neutral-600">Design direction · optional</span><textarea rows={3} className="focus-ring w-full resize-y border border-white/10 bg-black p-3 text-sm leading-5 text-white outline-none focus:border-white/40" value={direction} onChange={event => setDirection(event.target.value)} /></label><button disabled={!hasContent} className="focus-ring mt-3 flex w-full items-center justify-center gap-2 border border-white/15 px-3 py-3 text-xs font-semibold disabled:opacity-30" onClick={() => onGenerate(direction)}><Palette size={14} />Recommend a design</button>{!hasContent && <p className="mt-2 text-[10px] leading-4 text-neutral-600">Add CV content before requesting a layout recommendation.</p>}</div>}
    {isDesignGenerating && <div className="mt-4"><div className="mb-2 flex justify-between font-mono text-[9px] uppercase tracking-wider text-neutral-500"><span>{generationPhaseLabel}</span><span>{generatedCharacters} chars local</span></div><button className="focus-ring flex w-full items-center justify-center gap-2 border border-white/15 px-3 py-3 text-xs" onClick={onCancel}><Square size={12} fill="currentColor" />Stop design recommendation · {generationElapsedLabel}</button></div>}
    {error && <p className="mt-4 border border-red-400/20 bg-red-400/5 p-3 text-xs leading-5 text-red-300">{error}</p>}

    {recommendation && <article className="mt-4 border border-white/15 bg-black p-3"><div className="flex items-center justify-between gap-3"><p className="font-mono text-[9px] uppercase tracking-widest text-neutral-500">Recommended</p><span className="h-4 w-4 border border-white/20" style={{backgroundColor: recommendation.accentColor}} aria-label={`Accent ${recommendation.accentColor}`} /></div><p className="mt-2 text-sm font-semibold">{labelTemplate(recommendation.templateId)} · {labelDensity(recommendation.density)}</p><p className="mt-2 text-xs leading-5 text-neutral-400">{recommendation.rationale}</p><p className="mt-3 font-mono text-[9px] uppercase tracking-wider text-neutral-600">Current: {labelTemplate(settings.templateId)} · {labelDensity(settings.density)}</p><div className="mt-3 flex gap-2"><button className="focus-ring flex items-center gap-1 bg-white px-3 py-2 text-[10px] font-semibold text-black" onClick={onAccept}><Check size={12} />Apply design</button><button className="focus-ring flex items-center gap-1 border border-white/10 px-3 py-2 text-[10px] text-neutral-400" onClick={onDismiss}><X size={12} />Dismiss</button></div></article>}
  </section>;
}

function labelTemplate(templateId: CvDocument['settings']['templateId']): string { return templateId === 'modern' ? 'Modern Mono' : 'Classic ATS'; }
function labelDensity(density: CvDocument['settings']['density']): string { return density === 'compact' ? 'Compact' : 'Comfortable'; }
