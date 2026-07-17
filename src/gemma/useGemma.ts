import {useCallback, useEffect, useRef, useState} from 'react';
import {GEMMA_MODEL_BYTES, GEMMA_MODEL_URL, type GemmaGenerationKind, type GemmaToMainMessage, type MainToGemmaMessage} from './protocol';

export type GemmaStatus = 'disabled' | 'unsupported' | 'idle' | 'downloading' | 'initializing' | 'ready' | 'generating' | 'error';
export const GEMMA_INITIALIZATION_TIMEOUT_MS = 3 * 60 * 1000;
export const GEMMA_GENERATION_TIMEOUT_MS = 90 * 1000;

export function useGemma(onComplete: (raw: string) => void, onGenerationTimeout: (partialOutput: string) => void = () => undefined) {
  const workerRef = useRef<Worker | null>(null);
  const startWorkerRef = useRef<() => Worker | null>(() => null);
  const initializationTimerRef = useRef<number | undefined>(undefined);
  const generationTimerRef = useRef<number | undefined>(undefined);
  const modelLoadedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const onGenerationTimeoutRef = useRef(onGenerationTimeout);
  const outputRef = useRef('');
  const [status, setStatus] = useState<GemmaStatus>('idle');
  const [cached, setCached] = useState(false);
  const [progress, setProgress] = useState({received: 0, total: GEMMA_MODEL_BYTES});
  const [error, setError] = useState('');
  const [capability, setCapability] = useState({webGpu: false, secureContext: false, storageAvailable: 0});

  const clearGenerationTimer = useCallback(() => {
    if (generationTimerRef.current !== undefined) window.clearTimeout(generationTimerRef.current);
    generationTimerRef.current = undefined;
  }, []);

  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => { onGenerationTimeoutRef.current = onGenerationTimeout; }, [onGenerationTimeout]);

  useEffect(() => {
    if (import.meta.env.VITE_GEMMA_ENABLED === 'false') { setStatus('disabled'); return; }
    let active = true;
    const clearInitializationTimer = () => {
      if (initializationTimerRef.current !== undefined) window.clearTimeout(initializationTimerRef.current);
      initializationTimerRef.current = undefined;
    };
    const startWorker = (): Worker => {
      clearInitializationTimer();
      workerRef.current?.terminate();
      // Vite serves the source worker as an ES module during development. The
      // bundled LiteRT WASM loader calls importScripts(), so production must use
      // the classic worker bundle produced by Vite.
      const worker = import.meta.env.DEV
        ? new Worker(new URL('./gemma.worker.ts', import.meta.url), {type: 'module'})
        : new Worker(new URL('./gemma.worker.ts', import.meta.url), {type: 'classic'});
      workerRef.current = worker;
      worker.onmessage = (event: MessageEvent<GemmaToMainMessage>) => {
        if (!active || worker !== workerRef.current) return;
        const message = event.data;
        if (message.type === 'worker-ready') worker.postMessage({type: 'check-cache'} satisfies MainToGemmaMessage);
        if (message.type === 'cache-status') setCached(message.cached);
        if (message.type === 'download-progress' && !modelLoadedRef.current) { setProgress({received: message.received, total: message.total}); setStatus('downloading'); }
        if (message.type === 'initializing' && !modelLoadedRef.current) {
          setStatus('initializing');
          clearInitializationTimer();
          initializationTimerRef.current = window.setTimeout(() => {
            if (!active || worker !== workerRef.current) return;
            worker.terminate();
            workerRef.current = null;
            modelLoadedRef.current = false;
            setStatus('error');
            setError('WebGPU initialization exceeded 3 minutes and was stopped. Retry with the saved model.');
            startWorker();
          }, GEMMA_INITIALIZATION_TIMEOUT_MS);
        }
        if (message.type === 'loaded') { clearInitializationTimer(); modelLoadedRef.current = true; setStatus('ready'); }
        if (message.type === 'generation-chunk') outputRef.current += message.text;
        if (message.type === 'generation-complete') { clearGenerationTimer(); setStatus('ready'); onCompleteRef.current(outputRef.current); }
        if (message.type === 'cache-cleared') { clearInitializationTimer(); modelLoadedRef.current = false; setCached(false); setStatus('idle'); }
        if (message.type === 'cancelled') { clearInitializationTimer(); clearGenerationTimer(); setStatus(message.operation === 'generation' ? 'ready' : 'idle'); }
        if (message.type === 'error') { clearInitializationTimer(); clearGenerationTimer(); setError(message.message); setStatus('error'); }
      };
      worker.onerror = () => {
        if (!active || worker !== workerRef.current) return;
        clearInitializationTimer();
        clearGenerationTimer();
        worker.terminate();
        workerRef.current = null;
        modelLoadedRef.current = false;
        setError('The local AI worker stopped unexpectedly. Retry with the saved model.');
        setStatus('error');
      };
      return worker;
    };
    startWorkerRef.current = startWorker;
    startWorker();
    void Promise.all([navigator.storage?.estimate?.(), 'gpu' in navigator ? navigator.gpu.requestAdapter({powerPreference: 'high-performance'}) : null]).then(([storage, adapter]) => {
      if (!active) return;
      const next = {webGpu: Boolean(adapter), secureContext: window.isSecureContext, storageAvailable: (storage?.quota ?? 0) - (storage?.usage ?? 0)};
      setCapability(next);
      if (!next.webGpu || !next.secureContext) setStatus('unsupported');
    });
    return () => { active = false; clearInitializationTimer(); clearGenerationTimer(); workerRef.current?.terminate(); workerRef.current = null; };
  }, [clearGenerationTimer]);

  const post = useCallback((message: MainToGemmaMessage) => workerRef.current?.postMessage(message), []);
  const load = useCallback(() => {
    modelLoadedRef.current = false;
    setError('');
    setProgress({received: 0, total: GEMMA_MODEL_BYTES});
    setStatus(cached ? 'initializing' : 'downloading');
    const worker = workerRef.current ?? startWorkerRef.current();
    worker?.postMessage({type: 'load', modelUrl: GEMMA_MODEL_URL, verifiedBytes: GEMMA_MODEL_BYTES} satisfies MainToGemmaMessage);
  }, [cached]);
  const generate = useCallback((prompt: string, kind: GemmaGenerationKind = 'analysis') => {
    clearGenerationTimer();
    outputRef.current = '';
    setError('');
    setStatus('generating');
    post({type: 'generate', prompt, kind});
    generationTimerRef.current = window.setTimeout(() => {
      generationTimerRef.current = undefined;
      post({type: 'cancel-generation'});
      setStatus('ready');
      onGenerationTimeoutRef.current(outputRef.current);
    }, GEMMA_GENERATION_TIMEOUT_MS);
  }, [clearGenerationTimer, post]);
  const cancel = useCallback(() => {
    clearGenerationTimer();
    if (status === 'generating') { post({type: 'cancel-generation'}); return; }
    workerRef.current?.terminate();
    workerRef.current = null;
    if (initializationTimerRef.current !== undefined) window.clearTimeout(initializationTimerRef.current);
    initializationTimerRef.current = undefined;
    modelLoadedRef.current = false;
    setStatus('idle');
    setError('');
    startWorkerRef.current();
  }, [clearGenerationTimer, post, status]);
  const clearCache = useCallback(() => post({type: 'clear-cache'}), [post]);

  return {status, cached, progress, error, capability, load, generate, cancel, clearCache};
}
