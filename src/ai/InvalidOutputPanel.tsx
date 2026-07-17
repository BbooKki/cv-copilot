import {RotateCcw, X} from 'lucide-react';

type Props = {
  message: string;
  rawOutput: string;
  retrying: boolean;
  retryLabel?: string;
  onRetry: () => void;
  onDismiss: () => void;
};

export function InvalidOutputPanel({message, rawOutput, retrying, retryLabel = 'Retry smaller response', onRetry, onDismiss}: Props) {
  const visibleOutput = rawOutput.slice(0, 12_000);
  return <section className="border border-amber-300/20 bg-amber-300/5 p-4" aria-labelledby="invalid-output-title">
    <div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[9px] uppercase tracking-widest text-amber-300/70">Recoverable model response</p><h3 id="invalid-output-title" className="mt-1 text-sm font-semibold text-amber-100">Structured response was incomplete</h3></div><button aria-label="Dismiss invalid response" className="focus-ring p-1 text-amber-200/50 hover:text-amber-100" onClick={onDismiss}><X size={14} /></button></div>
    <p className="mt-3 text-xs leading-5 text-amber-100/70">{message}</p>
    <button disabled={retrying} className="focus-ring mt-3 flex items-center gap-2 border border-amber-200/20 px-3 py-2 text-xs text-amber-100 disabled:opacity-30" onClick={onRetry}><RotateCcw size={13} />{retrying ? 'Retrying…' : retryLabel}</button>
    <details className="mt-3 border-t border-amber-200/10 pt-3"><summary className="cursor-pointer font-mono text-[9px] uppercase tracking-widest text-amber-200/50">Show raw model output · {rawOutput.length} characters</summary><pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words bg-black/50 p-3 font-mono text-[10px] leading-5 text-neutral-400">{visibleOutput || '(No output returned)'}{rawOutput.length > visibleOutput.length ? '\n\n[Preview truncated]' : ''}</pre></details>
  </section>;
}
