import {describe, expect, it} from 'vitest';
import {GEMMA_CONTEXT_WINDOW_TOKENS, GEMMA_GENERATION_CONFIG, toGemmaGenerationKind} from './protocol';

describe('Gemma runtime protocol', () => {
  it('reserves an 8k context window for the model runtime', () => {
    expect(GEMMA_CONTEXT_WINDOW_TOKENS).toBe(8_192);
  });

  it('uses a larger bounded analysis response and compact non-analysis responses', () => {
    expect(GEMMA_GENERATION_CONFIG.analysis.maxOutputTokens).toBe(900);
    expect(GEMMA_GENERATION_CONFIG['analysis-repair'].maxOutputTokens).toBeLessThan(GEMMA_GENERATION_CONFIG.analysis.maxOutputTokens);
    expect(GEMMA_GENERATION_CONFIG.design.maxOutputTokens).toBeLessThan(GEMMA_GENERATION_CONFIG['analysis-repair'].maxOutputTokens);
  });

  it('defaults unknown generation kinds to the safe analysis preset', () => {
    expect(toGemmaGenerationKind('design')).toBe('design');
    expect(toGemmaGenerationKind('not-a-mode')).toBe('analysis');
  });
});
