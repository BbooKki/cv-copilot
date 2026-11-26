/**
 * On-device embedding model for Experience Bank retrieval. Multilingual E5
 * handles English, Korean and Russian in one vector space, so a Korean job
 * posting can match an English bank entry.
 */
export const EMBEDDING_MODEL_ID = 'Xenova/multilingual-e5-small';
/** Quantized ONNX weights (118,308,185 bytes) plus tokenizer (17,082,730 bytes), checked 2026-11-25. */
export const EMBEDDING_DOWNLOAD_BYTES = 135_400_000;
export const EMBEDDING_DIMENSIONS = 384;
/** transformers.js stores downloaded model files in this Cache API bucket. */
export const EMBEDDING_CACHE_NAME = 'transformers-cache';
export const EMBEDDING_BATCH_SIZE = 16;

/** E5 expects these prefixes: questions are queries, stored facts are passages. */
export type EmbeddingKind = 'query' | 'passage';

export type MainToEmbeddingMessage =
  | {type: 'load'}
  | {type: 'embed'; requestId: number; kind: EmbeddingKind; texts: string[]};

export type EmbeddingToMainMessage =
  | {type: 'progress'; loaded: number; total: number}
  | {type: 'ready'}
  | {type: 'embeddings'; requestId: number; vectors: number[][]}
  | {type: 'error'; requestId?: number; message: string};

export function prefixForE5(kind: EmbeddingKind, text: string): string {
  return `${kind}: ${text.replace(/\s+/g, ' ').trim()}`;
}
