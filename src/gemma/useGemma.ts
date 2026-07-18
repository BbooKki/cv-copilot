import {useCallback, useEffect, useRef, useState} from 'react';
import {LOCAL_AI_ENABLED} from './config';
import {GEMMA_MODEL_BYTES, GEMMA_MODEL_URL, GEMMA_STORAGE_HEADROOM_BYTES, type GemmaGenerationKind, type GemmaGenerationPhase, type GemmaGenerationRequestId, type GemmaToMainMessage, type MainToGemmaMessage} from './protocol';

export type GemmaStatus = 'disabled' | 'unsupported' | 'idle' | 'downloading' | 'initializing' | 'ready' | 'generating' | 'error';
export const GEMMA_INITIALIZATION_TIMEOUT_MS = 3 * 60 * 1000;
export const GEMMA_GENERATION_TIMEOUT_MS = 90 * 1000;

export function useGemma(onComplete: (raw: string) => void, onGenerationTimeout: (partialOutput: string) => void = () => undefined) {
  const workerRef = useRef<Worker | null>(null);
  const startWorkerRef = useRef<() => Worker | null>(() => null);
  const initializationTimerRef = useRef<number | undefined>(undefined);
  const generationTimerRef = useRef<number | undefined>(undefined);
  const nextGenerationIdRef = useRef(0);
  const activeGenerationIdRef = useRef<GemmaGenerationRequestId | null>(null);
  const modelLoadedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const onGenerationTimeoutRef = useRef(onGenerationTimeout);
  const outputRef = useRef('');
  const [status, setStatus] = useState<GemmaStatus>('idle');
  const [cached, setCached] = useState(false);
  const [cacheVerified, setCacheVerified] = useState(false);
  const [progress, setProgress] = useState({received: 0, total: GEMMA_MODEL_BYTES});
  const [error, setError] = useState('');
  const [generationPhase, setGenerationPhase] = useState<GemmaGenerationPhase | null>(null);
  const [generatedCharacters, setGeneratedCharacters] = useState(0);
  const [capability, setCapability] = useState<{webGpu: boolean; secureContext: boolean; storageAvailable: number | null}>({webGpu: false, secureContext: false, storageAvailable: null});

  const clearGenerationTimer = useCallback(() => {
    if (generationTimerRef.current !== undefined) window.clearTimeout(generationTimerRef.current);
    generationTimerRef.current = undefined;
  }, []);

  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => { onGenerationTimeoutRef.current = onGenerationTimeout; }, [onGenerationTimeout]);

  useEffect(() => {
    if (!LOCAL_AI_ENABLED) { setStatus('disabled'); return; }
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
        if (message.type === 'cache-status') { setCached(message.cached); setCacheVerified(message.verified); }
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
        if (message.type === 'generation-phase' && message.requestId === activeGenerationIdRef.current) setGenerationPhase(message.phase);
        if (message.type === 'generation-chunk' && message.requestId === activeGenerationIdRef.current) {
          outputRef.current += message.text;
          setGeneratedCharacters(outputRef.current.length);
        }
        if (message.type === 'generation-complete' && message.requestId === activeGenerationIdRef.current) {
          clearGenerationTimer();
          activeGenerationIdRef.current = null;
          setGenerationPhase(null);
          setStatus('ready');
          onCompleteRef.current(outputRef.current);
        }
        if (message.type === 'cache-cleared') { clearInitializationTimer(); modelLoadedRef.current = false; setCached(false); setCacheVerified(false); setStatus('idle'); }
        if (message.type === 'cancelled' && (message.operation === 'load' || message.requestId === activeGenerationIdRef.current)) {
          clearInitializationTimer();
          clearGenerationTimer();
          if (message.operation === 'generation') activeGenerationIdRef.current = null;
          setGenerationPhase(null);
          setStatus(message.operation === 'generation' ? 'ready' : 'idle');
        }
        if (message.type === 'error' && (message.operation === 'load' || message.requestId === activeGenerationIdRef.current)) {
          clearInitializationTimer();
          clearGenerationTimer();
          if (message.operation === 'generation') activeGenerationIdRef.current = null;
          setGenerationPhase(null);
          setError(message.message);
          setStatus('error');
        }
      };
      worker.onerror = () => {
        if (!active || worker !== workerRef.current) return;
        clearInitializationTimer();
        clearGenerationTimer();
        worker.terminate();
        workerRef.current = null;
        modelLoadedRef.current = false;
        activeGenerationIdRef.current = null;
        setGenerationPhase(null);
        setError('The local AI worker stopped unexpectedly. Retry with the saved model.');
        setStatus('error');
      };
      return worker;
    };
    startWorkerRef.current = startWorker;
    startWorker();
    void Promise.all([navigator.storage?.estimate?.(), 'gpu' in navigator ? navigator.gpu.requestAdapter({powerPreference: 'high-performance'}) : null]).then(([storage, adapter]) => {
      if (!active) return;
      const next = {webGpu: Boolean(adapter), secureContext: window.isSecureContext, storageAvailable: storage ? Math.max(0, (storage.quota ?? 0) - (storage.usage ?? 0)) : null};
      setCapability(next);
      if (!next.webGpu || !next.secureContext) setStatus('unsupported');
    });
    return () => { active = false; clearInitializationTimer(); clearGenerationTimer(); workerRef.current?.terminate(); workerRef.current = null; };
  }, [clearGenerationTimer]);

  const post = useCallback((message: MainToGemmaMessage) => workerRef.current?.postMessage(message), []);
  const load = useCallback(() => {
    if (!cached && capability.storageAvailable !== null && capability.storageAvailable < GEMMA_MODEL_BYTES + GEMMA_STORAGE_HEADROOM_BYTES) {
      setError(`The local model needs about ${formatStorageRequirement(GEMMA_MODEL_BYTES + GEMMA_STORAGE_HEADROOM_BYTES)} of free browser storage. Free space or remove site data, then retry.`);
      setStatus('error');
      return;
    }
    modelLoadedRef.current = false;
    setError('');
    setProgress({received: 0, total: GEMMA_MODEL_BYTES});
    setStatus(cached ? 'initializing' : 'downloading');
    const worker = workerRef.current ?? startWorkerRef.current();
    worker?.postMessage({type: 'load', modelUrl: GEMMA_MODEL_URL, verifiedBytes: GEMMA_MODEL_BYTES} satisfies MainToGemmaMessage);
  }, [cached, capability.storageAvailable]);
  const generate = useCallback((prompt: string, kind: GemmaGenerationKind = 'analysis') => {
    clearGenerationTimer();
    const requestId = ++nextGenerationIdRef.current;
    activeGenerationIdRef.current = requestId;
    outputRef.current = '';
    setGeneratedCharacters(0);
    setGenerationPhase('queued');
    setError('');
    setStatus('generating');
    post({type: 'generate', requestId, prompt, kind});
    generationTimerRef.current = window.setTimeout(() => {
      if (activeGenerationIdRef.current !== requestId) return;
      generationTimerRef.current = undefined;
      post({type: 'cancel-generation', requestId});
      activeGenerationIdRef.current = null;
      setGenerationPhase(null);
      setStatus('ready');
      onGenerationTimeoutRef.current(outputRef.current);
    }, GEMMA_GENERATION_TIMEOUT_MS);
  }, [clearGenerationTimer, post]);
  const cancel = useCallback(() => {
    clearGenerationTimer();
    if (status === 'generating' && activeGenerationIdRef.current !== null) {
      post({type: 'cancel-generation', requestId: activeGenerationIdRef.current});
      return;
    }
    workerRef.current?.terminate();
    workerRef.current = null;
    if (initializationTimerRef.current !== undefined) window.clearTimeout(initializationTimerRef.current);
    initializationTimerRef.current = undefined;
    modelLoadedRef.current = false;
    activeGenerationIdRef.current = null;
    setGenerationPhase(null);
    setStatus('idle');
    setError('');
    startWorkerRef.current();
  }, [clearGenerationTimer, post, status]);
  const clearCache = useCallback(() => post({type: 'clear-cache'}), [post]);

  return {status, cached, cacheVerified, progress, error, capability, generationPhase, generatedCharacters, load, generate, cancel, clearCache};
}

function formatStorageRequirement(bytes: number): string {
  return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
}
