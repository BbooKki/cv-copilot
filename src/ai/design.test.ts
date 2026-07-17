import {describe, expect, it} from 'vitest';
import {testCv} from '../cv/testFixture';
import {buildDesignPrompt, parseDesignRecommendation} from './design';

describe('AI design protocol', () => {
  it('parses only an allowlisted recommendation', () => {
    const result = parseDesignRecommendation('```json\n{"protocolVersion":1,"templateId":"classic","density":"compact","accentColor":"#334155","rationale":"A compact single-column layout suits this document."}\n```');
    expect(result.templateId).toBe('classic');
    expect(result.density).toBe('compact');
  });

  it('rejects arbitrary colors and extra output fields', () => {
    expect(() => parseDesignRecommendation('{"protocolVersion":1,"templateId":"modern","density":"comfortable","accentColor":"#ff00ff","rationale":"Bright","css":"body{}"}')).toThrow();
  });

  it('builds a bounded structural prompt without CV biography text', () => {
    const prompt = buildDesignPrompt(testCv, 'Conservative and concise', 'Product engineer role');
    expect(prompt).toContain('"experienceCount":1');
    expect(prompt).toContain('Conservative and concise');
    expect(prompt).not.toContain(testCv.basics.fullName);
  });
});
