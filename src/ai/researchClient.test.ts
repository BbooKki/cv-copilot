import {afterEach, describe, expect, it, vi} from 'vitest';
import {researchCompany} from './researchClient';
import {AiProviderError} from './provider';
import type {GroundedCompanyBrief} from './research';

afterEach(() => vi.unstubAllGlobals());

const brief: GroundedCompanyBrief = {
  company: 'Acme',
  summary: 'Acme builds accessible tooling.',
  priorities: ['Ship v2'],
  roleContext: 'Values accessible React work.',
  sources: [{title: 'Acme Newsroom', url: 'https://acme.com/news'}],
};

describe('researchCompany', () => {
  it('posts a research-company operation with no CV data and returns the brief', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(brief), {status: 200}));
    vi.stubGlobal('fetch', fetchMock);

    const result = await researchCompany({company: 'Acme', role: 'Frontend Engineer', jobText: 'Build UIs.'});

    expect(result.summary).toContain('accessible tooling');
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
