import {useCallback, useEffect, useRef, useState} from 'react';
import {GEMMA_MODEL_BYTES, GEMMA_MODEL_URL, type GemmaToMainMessage, type MainToGemmaMessage} from './protocol';

export type GemmaStatus = 'disabled' | 'unsupported' | 'idle' | 'downloading' | 'initializing' | 'ready' | 'generating' | 'error';

export function useGemma(onComplete: (raw: string) => void) {
  const workerRef = useRef<Worker | null>(null);
  const outputRef = useRef('');
  const [status, setStatus] = useState<GemmaStatus>('idle');
  const [cached, setCached] = useState(false);
  const [progress, setProgress] = useState({received: 0, total: GEMMA_MODEL_BYTES});
  const [error, setError] = useState('');
  const [capability, setCapability] = useState({webGpu: false, secureContext: false, storageAvailable: 0});

  useEffect(() => {
    if (import.meta.env.VITE_GEMMA_ENABLED === 'false') { setStatus('disabled'); return; }
    let active = true;
    void Promise.all([navigator.storage?.estimate?.(), 'gpu' in navigator ? navigator.gpu.requestAdapter({powerPreference: 'high-performance'}) : null]).then(([storage, adapter]) => {
      if (!active) return;
      const next = {webGpu: Boolean(adapter), secureContext: window.isSecureContext, storageAvailable: (storage?.quota ?? 0) - (storage?.usage ?? 0)};
      setCapability(next);
      if (!next.webGpu || !next.secureContext) setStatus('unsupported');
    });
    const worker = new Worker(new URL('./gemma.worker.ts', import.meta.url), {type: 'module'});
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<GemmaToMainMessage>) => {
      if (!active) return;
      const message = event.data;
      if (message.type === 'worker-ready') post({type: 'check-cache'});
      if (message.type === 'cache-status') setCached(message.cached);
      if (message.type === 'download-progress') { setProgress({received: message.received, total: message.total}); setStatus('downloading'); }
      if (message.type === 'initializing') setStatus('initializing');
      if (message.type === 'loaded') setStatus('ready');
      if (message.type === 'generation-chunk') outputRef.current += message.text;
      if (message.type === 'generation-complete') { setStatus('ready'); onComplete(outputRef.current); }
      if (message.type === 'cache-cleared') { setCached(false); setStatus('idle'); }
      if (message.type === 'cancelled') setStatus(message.operation === 'generation' ? 'ready' : 'idle');
      if (message.type === 'error') { setError(message.message); setStatus('error'); }
    };
    worker.onerror = () => { setError('The local AI worker stopped unexpectedly.'); setStatus('error'); };
    return () => { active = false; worker.terminate(); workerRef.current = null; };
  }, [onComplete]);

  const post = useCallback((message: MainToGemmaMessage) => workerRef.current?.postMessage(message), []);
  const load = useCallback(() => { setError(''); setProgress({received: 0, total: GEMMA_MODEL_BYTES}); setStatus('downloading'); post({type: 'load', modelUrl: GEMMA_MODEL_URL, verifiedBytes: GEMMA_MODEL_BYTES}); }, [post]);
  const generate = useCallback((prompt: string) => { outputRef.current = ''; setError(''); setStatus('generating'); post({type: 'generate', prompt}); }, [post]);
  const cancel = useCallback(() => post({type: status === 'generating' ? 'cancel-generation' : 'cancel-load'}), [post, status]);
  const clearCache = useCallback(() => post({type: 'clear-cache'}), [post]);

  return {status, cached, progress, error, capability, load, generate, cancel, clearCache};
}
