/// <reference lib="webworker" />
import {env, pipeline, type FeatureExtractionPipeline} from '@huggingface/transformers';
import {EMBEDDING_BATCH_SIZE, EMBEDDING_MODEL_ID, prefixForE5, type EmbeddingToMainMessage, type MainToEmbeddingMessage} from './embedding.protocol';

declare const self: DedicatedWorkerGlobalScope;

// Load only from the Hugging Face Hub, cache in the browser, and serve the
// ONNX Runtime WebAssembly from this app's own bundle instead of a CDN.
env.allowLocalModels = false;
env.useBrowserCache = true;
if (env.backends.onnx.wasm) {
  env.backends.onnx.wasm.wasmPaths = {
    wasm: new URL('../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.wasm', import.meta.url).href,
  };
}

let extractor: Promise<FeatureExtractionPipeline> | null = null;
const fileProgress = new Map<string, {loaded: number; total: number}>();

function post(message: EmbeddingToMainMessage): void {
  self.postMessage(message);
}

// transformers.js overloads `pipeline` per task; TypeScript cannot resolve the
// full union (TS2590), so this narrows it to the one task the worker uses.
const createFeatureExtractor = pipeline as unknown as (task: 'feature-extraction', model: string, options: Record<string, unknown>) => Promise<FeatureExtractionPipeline>;

function load(): Promise<FeatureExtractionPipeline> {
  extractor ??= createFeatureExtractor('feature-extraction', EMBEDDING_MODEL_ID, {
    dtype: 'q8',
    device: 'wasm',
    progress_callback: (event: {status: string; file?: string; loaded?: number; total?: number}) => {
      if (event.status !== 'progress' || !event.file) return;
      fileProgress.set(event.file, {loaded: event.loaded ?? 0, total: event.total ?? 0});
      let loaded = 0;
      let total = 0;
      for (const item of fileProgress.values()) { loaded += item.loaded; total += item.total; }
      post({type: 'progress', loaded, total});
    },
  });
  extractor.catch(() => { extractor = null; });
  return extractor;
}

self.onmessage = async (event: MessageEvent<MainToEmbeddingMessage>) => {
  const message = event.data;
  if (message.type === 'load') {
    try {
      await load();
      post({type: 'ready'});
    } catch (cause) {
      post({type: 'error', message: cause instanceof Error ? cause.message : 'The embedding model could not be loaded.'});
    }
    return;
  }
  try {
    const model = await load();
    const vectors: number[][] = [];
    for (let start = 0; start < message.texts.length; start += EMBEDDING_BATCH_SIZE) {
      const batch = message.texts.slice(start, start + EMBEDDING_BATCH_SIZE).map(text => prefixForE5(message.kind, text));
      const output = await model(batch, {pooling: 'mean', normalize: true});
      vectors.push(...(output.tolist() as number[][]));
    }
    post({type: 'embeddings', requestId: message.requestId, vectors});
  } catch (cause) {
    post({type: 'error', requestId: message.requestId, message: cause instanceof Error ? cause.message : 'Embedding failed.'});
  }
};
