import {describe, expect, it} from 'vitest';
import {sampleCv} from '../cv/sample';
import {applySuggestion, createDemoAnalysis, validateSuggestionTarget} from './suggestions';

describe('suggestion workflow', () => {
  it('applies a grounded suggestion without mutating the original', () => {
    const suggestion = createDemoAnalysis(sampleCv).suggestions[0];
    expect(validateSuggestionTarget(sampleCv, suggestion)).toBe(true);
    const result = applySuggestion(sampleCv, suggestion);
    expect(result.document.experience[0].highlights[0].text).toBe(suggestion.proposedText);
    expect(sampleCv.experience[0].highlights[0].text).toBe(suggestion.originalText);
  });

  it('rejects a stale suggestion', () => {
    const suggestion = createDemoAnalysis(sampleCv).suggestions[0];
    const changed = structuredClone(sampleCv);
    changed.experience[0].highlights[0].text = 'Changed independently';
    expect(validateSuggestionTarget(changed, suggestion)).toBe(false);
    expect(() => applySuggestion(changed, suggestion)).toThrow(/stale/i);
  });
});
