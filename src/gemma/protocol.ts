export const GEMMA_MODEL_URL = 'https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it-web.litertlm';
export const GEMMA_MODEL_BYTES = 2_008_432_640;
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
  analysis: {maxOutputTokens: 1_900},
  'analysis-repair': {maxOutputTokens: 900},
  design: {maxOutputTokens: 320},
};

export function toGemmaGenerationKind(value: unknown): GemmaGenerationKind {
  if (value === 'analysis-repair' || value === 'design' || value === 'analysis') return value;
  return 'analysis';
}

export type MainToGemmaMessage =
  | {type: 'load'; modelUrl: string; verifiedBytes: number}
  | {type: 'generate'; prompt: string; kind?: GemmaGenerationKind}
  | {type: 'cancel-load'}
  | {type: 'cancel-generation'}
  | {type: 'check-cache'}
  | {type: 'clear-cache'};

export type GemmaToMainMessage =
  | {type: 'worker-ready'}
  | {type: 'cache-status'; cached: boolean}
  | {type: 'download-progress'; received: number; total: number}
  | {type: 'initializing'}
  | {type: 'loaded'; loadMs: number}
  | {type: 'generation-chunk'; text: string}
  | {type: 'generation-complete'; totalMs: number}
  | {type: 'cache-cleared'}
  | {type: 'cancelled'; operation: 'load' | 'generation'}
  | {type: 'error'; operation: 'load' | 'generation'; message: string};
