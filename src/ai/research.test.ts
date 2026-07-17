import {describe, expect, it} from 'vitest';
import {buildCompanyResearchPrompt, isExcludedSource, parseCompanyBrief} from './research';

describe('company research', () => {
  it('builds a prompt that forbids people/social research and includes the role', () => {
    const prompt = buildCompanyResearchPrompt({company: 'Acme', role: 'Frontend Engineer'});
    expect(prompt).toContain('Acme');
    expect(prompt).toContain('Frontend Engineer');
    expect(prompt).toMatch(/do not research, name, or profile individual employees/i);
  });

  it('excludes social and personal-profile sources', () => {
    expect(isExcludedSource({title: 'Jane Doe', url: 'https://www.linkedin.com/in/jane'})).toBe(true);
    expect(isExcludedSource({title: 'Acme on X', url: 'https://x.com/acme'})).toBe(true);
    expect(isExcludedSource({title: 'Acme Newsroom', url: 'https://acme.com/news'})).toBe(false);
  });

  it('parses a grounded brief and attaches only non-social sources', () => {
    const raw = '```json\n{"summary":"Acme builds accessible tooling.","priorities":["Ship v2","Expand APAC"],"roleContext":"Values accessible React work."}\n```';
    const brief = parseCompanyBrief(raw, [
      {title: 'Acme Newsroom', url: 'https://acme.com/news'},
      {title: 'LinkedIn', url: 'https://linkedin.com/company/acme'},
    ], 'Acme');
    expect(brief.summary).toContain('accessible tooling');
    expect(brief.priorities).toEqual(['Ship v2', 'Expand APAC']);
    expect(brief.sources).toHaveLength(1);
    expect(brief.sources[0]?.url).toBe('https://acme.com/news');
  });

  it('throws when no citable non-social source remains', () => {
    const raw = '{"summary":"x","priorities":[],"roleContext":""}';
    expect(() => parseCompanyBrief(raw, [{title: 'LinkedIn', url: 'https://linkedin.com/company/acme'}], 'Acme')).toThrow(/job-only/i);
  });

  it('extracts JSON even when wrapped in prose', () => {
    const raw = 'Here is the briefing:\n{"summary":"Acme is a SaaS firm.","priorities":["Growth"],"roleContext":""} Hope that helps!';
    const brief = parseCompanyBrief(raw, [{title: 'Acme', url: 'https://acme.com'}], 'Acme');
    expect(brief.summary).toBe('Acme is a SaaS firm.');
  });
});
