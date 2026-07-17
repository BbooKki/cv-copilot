import {afterEach, describe, expect, it, vi} from 'vitest';
import {researchCompany} from './researchClient';
import {AiProviderError} from './provider';
import type {GroundedCompanyBrief} from './research';

afterEach(() => vi.unstubAllGlobals());

const brief: GroundedCompanyBrief = {
  company: 'Acme',
  summary: {text: 'Acme builds accessible tooling.', citationIds: ['source-0']},
  priorities: [{text: 'Ship v2', citationIds: ['source-0']}],
  roleContext: {text: 'Values accessible React work.', citationIds: ['source-0']},
  sources: [{id: 'source-0', title: 'Acme Newsroom', url: 'https://acme.com/news'}],
};

describe('researchCompany', () => {
  it('posts a research-company operation with no CV data and returns the brief', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(brief), {status: 200}));
    vi.stubGlobal('fetch', fetchMock);

    const result = await researchCompany({company: 'Acme', role: 'Frontend Engineer', jobText: 'Build UIs.'});

    expect(result.summary.text).toContain('accessible tooling');
    const body = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body));
    expect(body.operation).toBe('research-company');
    expect(body.input.company).toBe('Acme');
    expect(JSON.stringify(body)).not.toContain('cv');
  });

  it('maps a failed research request to an AiProviderError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({error: 'No sources.', code: 'invalid-output'}), {status: 422})));
    await expect(researchCompany({company: 'Acme'})).rejects.toBeInstanceOf(AiProviderError);
  });
});
