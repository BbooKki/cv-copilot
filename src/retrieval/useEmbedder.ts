import {useCallback, useEffect, useRef, useState} from 'react';
import {EMBEDDING_CACHE_NAME, EMBEDDING_DOWNLOAD_BYTES, EMBEDDING_MODEL_ID, type EmbeddingKind, type EmbeddingToMainMessage, type MainToEmbeddingMessage} from './embedding.protocol';

export type EmbedderStatus = 'idle' | 'downloading' | 'ready' | 'error';

type Pending = {resolve: (vectors: number[][]) => void; reject: (error: Error) => void};

/**
 * Owns the embedding worker. The model downloads only after `load()` (an
 * explicit user action), and vectors for unchanged passages are reused.
 */
export function useEmbedder() {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef(new Map<number, Pending>());
  const nextIdRef = useRef(1);
  const passageCacheRef = useRef(new Map<string, number[]>());
  const [status, setStatus] = useState<EmbedderStatus>('idle');
  const [progress, setProgress] = useState({loaded: 0, total: EMBEDDING_DOWNLOAD_BYTES});
  const [cached, setCached] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (typeof caches === 'undefined') return;
    caches.open(EMBEDDING_CACHE_NAME)
      .then(cache => cache.keys())
      .then(keys => { if (active) setCached(keys.some(request => request.url.includes(EMBEDDING_MODEL_ID) && request.url.endsWith('.onnx'))); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => () => {
    workerRef.current?.terminate();
    for (const pending of pendingRef.current.values()) pending.reject(new Error('The embedding worker stopped.'));
    pendingRef.current.clear();
  }, []);

  const ensureWorker = useCallback((): Worker => {
    if (workerRef.current) return workerRef.current;
    const worker = new Worker(new URL('./embedding.worker.ts', import.meta.url), {type: 'module'});
    worker.onmessage = (event: MessageEvent<EmbeddingToMainMessage>) => {
      const message = event.data;
      if (message.type === 'progress') { setStatus(current => (current === 'ready' ? current : 'downloading')); setProgress({loaded: message.loaded, total: Math.max(message.total, 1)}); return; }
      if (message.type === 'ready') { setStatus('ready'); setCached(true); setError(''); return; }
      if (message.type === 'embeddings') { pendingRef.current.get(message.requestId)?.resolve(message.vectors); pendingRef.current.delete(message.requestId); return; }
      if (message.requestId !== undefined) {
        pendingRef.current.get(message.requestId)?.reject(new Error(message.message));
        pendingRef.current.delete(message.requestId);
        return;
      }
      setStatus('error');
      setError(message.message);
    };
    workerRef.current = worker;
    return worker;
  }, []);

  const load = useCallback(() => {
    setError('');
    setStatus('downloading');
    ensureWorker().postMessage({type: 'load'} satisfies MainToEmbeddingMessage);
  }, [ensureWorker]);

  const embedRaw = useCallback((texts: string[], kind: EmbeddingKind): Promise<number[][]> => {
    if (texts.length === 0) return Promise.resolve([]);
    const requestId = nextIdRef.current++;
    return new Promise((resolve, reject) => {
      pendingRef.current.set(requestId, {resolve, reject});
      ensureWorker().postMessage({type: 'embed', requestId, kind, texts} satisfies MainToEmbeddingMessage);
    });
  }, [ensureWorker]);

  /** Embeds passages, reusing vectors for text that has not changed. */
  const embedPassages = useCallback(async (texts: string[]): Promise<number[][]> => {
    const cache = passageCacheRef.current;
    const missing = [...new Set(texts.filter(text => !cache.has(text)))];
    const fresh = await embedRaw(missing, 'passage');
    missing.forEach((text, index) => cache.set(text, fresh[index]!));
    return texts.map(text => cache.get(text)!);
  }, [embedRaw]);

  const embedQueries = useCallback((texts: string[]) => embedRaw(texts, 'query'), [embedRaw]);

  return {status, progress, cached, error, load, embedPassages, embedQueries};
}
