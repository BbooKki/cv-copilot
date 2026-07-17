export const GEMMA_MODEL_URL = 'https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it-web.litertlm';
export const GEMMA_MODEL_BYTES = 2_008_432_640;
export const GEMMA_STORAGE_HEADROOM_BYTES = 256_000_000;
// The model supports a larger working window than the original MVP setting.
// Prompt input and generated JSON share this total, so the per-request output
// budgets below must remain well below this limit.
export const GEMMA_CONTEXT_WINDOW_TOKENS = 8_192;

export type GemmaGenerationKind = 'analysis' | 'analysis-repair' | 'design';

export type GemmaGenerationConfig = {
  maxOutputTokens: number;
};

// Analysis needs enough room to close its structured response; repair asks for
// a deliberately smaller result, while the constrained design schema should
// never consume an analysis-sized response budget.
export const GEMMA_GENERATION_CONFIG: Record<GemmaGenerationKind, GemmaGenerationConfig> = {
  analysis: {maxOutputTokens: 900},
  'analysis-repair': {maxOutputTokens: 520},
  design: {maxOutputTokens: 220},
};

export function toGemmaGenerationKind(value: unknown): GemmaGenerationKind {
  if (value === 'analysis-repair' || value === 'design' || value === 'analysis') return value;
  return 'analysis';
}

export type GemmaGenerationPhase = 'queued' | 'creating-conversation' | 'conversation-ready' | 'decoding';
export type GemmaGenerationRequestId = number;

export type MainToGemmaMessage =
  | {type: 'load'; modelUrl: string; verifiedBytes: number}
  | {type: 'generate'; requestId: GemmaGenerationRequestId; prompt: string; kind?: GemmaGenerationKind}
  | {type: 'cancel-load'}
  | {type: 'cancel-generation'; requestId: GemmaGenerationRequestId}
  | {type: 'check-cache'}
  | {type: 'clear-cache'};

export type GemmaToMainMessage =
  | {type: 'worker-ready'}
  | {type: 'cache-status'; cached: boolean; verified: boolean}
  | {type: 'download-progress'; received: number; total: number}
  | {type: 'initializing'}
  | {type: 'loaded'; loadMs: number}
  | {type: 'generation-phase'; requestId: GemmaGenerationRequestId; phase: GemmaGenerationPhase}
  | {type: 'generation-chunk'; requestId: GemmaGenerationRequestId; text: string}
  | {type: 'generation-complete'; requestId: GemmaGenerationRequestId; totalMs: number}
  | {type: 'cache-cleared'}
  | {type: 'cancelled'; operation: 'load'}
  | {type: 'cancelled'; operation: 'generation'; requestId: GemmaGenerationRequestId}
  | {type: 'error'; operation: 'load'; message: string}
  | {type: 'error'; operation: 'generation'; requestId: GemmaGenerationRequestId; message: string};
