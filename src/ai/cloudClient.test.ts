import {afterEach, describe, expect, it, vi} from 'vitest';
import {analyzeWithCloud} from './cloudClient';
import {AiProviderError} from './provider';
import type {AiAnalysisRequest, AiAnalysisResult} from './protocol';
import {testCv} from '../cv/testFixture';

afterEach(() => vi.unstubAllGlobals());

const request: AiAnalysisRequest = {
  protocolVersion: 1,
  cv: testCv,
  job: {source: 'pasted', text: 'Frontend engineer role requiring accessible React interfaces and typed APIs.'},
  options: {maxSuggestions: 3, language: 'en'},
};

const validResult: AiAnalysisResult = {
  protocolVersion: 1,
  fitSummary: 'Strong overlap with accessible front-end and typed API work.',
  matchedRequirements: [{requirement: 'Accessible React interfaces', evidence: 'Built accessible dashboards.', cvItemId: 'exp-northstar'}],
  gaps: [],
  warnings: [],
  suggestions: [],
};

describe('analyzeWithCloud', () => {
  it('posts a redacted CV to /api/ai and returns the validated result', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(validResult), {status: 200, headers: {'content-type': 'application/json'}}));
    vi.stubGlobal('fetch', fetchMock);

    const result = await analyzeWithCloud(request);

    expect(result.fitSummary).toContain('accessible front-end');
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('/api/ai');
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.operation).toBe('analyze');
    expect(body.request.cv.basics.fullName).toBe('');
    expect(body.request.cv.basics.email).toBe('');
    expect(body.request.cv.experience[0].company).toBe('Northstar Labs');
  });

  it('maps a quota error to an AiProviderError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({error: 'Quota exhausted.', code: 'quota'}), {status: 429})));
    await expect(analyzeWithCloud(request)).rejects.toMatchObject({name: 'AiProviderError', code: 'quota'});
  });

  it('reports a network failure when the request cannot be sent', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(analyzeWithCloud(request)).rejects.toBeInstanceOf(AiProviderError);
  });

  it('rejects a structurally invalid response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({protocolVersion: 1}), {status: 200})));
    await expect(analyzeWithCloud(request)).rejects.toMatchObject({code: 'invalid-output'});
  });
});
