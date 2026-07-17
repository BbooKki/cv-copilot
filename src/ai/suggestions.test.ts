import {describe, expect, it} from 'vitest';
import {testCv} from '../cv/testFixture';
import type {AiSuggestion} from './protocol';
import {applySuggestion, validateSuggestionTarget} from './suggestions';

function testSuggestion(): AiSuggestion {
  const experience = testCv.experience[0];
  const highlight = experience.highlights[0];
  return {
    id: 'suggestion-test',
    target: {section: 'experience', itemId: experience.id, highlightId: highlight.id, field: 'text'},
    originalText: highlight.text,
    proposedText: 'Led delivery and operation of three customer-facing workflow tools.',
    reason: 'Makes the existing ownership statement more concise.',
    evidenceIds: [experience.id, highlight.id],
  };
}

describe('suggestion workflow', () => {
  it('applies a grounded suggestion without mutating the original', () => {
    const suggestion = testSuggestion();
    expect(validateSuggestionTarget(testCv, suggestion)).toBe(true);
    const result = applySuggestion(testCv, suggestion);
    expect(result.document.experience[0].highlights[0].text).toBe(suggestion.proposedText);
    expect(testCv.experience[0].highlights[0].text).toBe(suggestion.originalText);
  });

  it('rejects a stale suggestion', () => {
    const suggestion = testSuggestion();
    const changed = structuredClone(testCv);
    changed.experience[0].highlights[0].text = 'Changed independently';
    expect(validateSuggestionTarget(changed, suggestion)).toBe(false);
    expect(() => applySuggestion(changed, suggestion)).toThrow(/stale/i);
  });
});
