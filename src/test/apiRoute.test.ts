import type {IncomingMessage, ServerResponse} from 'node:http';
import {afterEach, describe, expect, it, vi} from 'vitest';
import handler from '../../api/ai';
import {testCv} from '../cv/testFixture';

const originalEnabled = process.env.CLOUD_AI_ENABLED;
const originalGeminiKey = process.env.GEMINI_API_KEY;
const originalPeopleResearchEnabled = process.env.PEOPLE_RESEARCH_ENABLED;

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  if (originalEnabled === undefined) delete process.env.CLOUD_AI_ENABLED;
  else process.env.CLOUD_AI_ENABLED = originalEnabled;
  if (originalGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalGeminiKey;
  if (originalPeopleResearchEnabled === undefined) delete process.env.PEOPLE_RESEARCH_ENABLED;
  else process.env.PEOPLE_RESEARCH_ENABLED = originalPeopleResearchEnabled;
});

describe('/api/ai safeguards', () => {
  it('stops before provider access when the emergency switch is disabled', async () => {
    process.env.CLOUD_AI_ENABLED = 'false';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const response = responseDouble();

    await handler(requestDouble('{}', 'kill-switch'), response.value);

    expect(response.status()).toBe(503);
    expect(response.body()).toMatch(/temporarily disabled/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rate-limits repeated requests from one client before provider access', async () => {
    process.env.CLOUD_AI_ENABLED = 'true';
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (let index = 0; index < 8; index += 1) {
      const response = responseDouble();
      await handler(requestDouble('{}', 'rate-limited-client'), response.value);
      expect(response.status()).toBe(400);
    }
    const limited = responseDouble();
    await handler(requestDouble('{}', 'rate-limited-client'), limited.value);
    expect(limited.status()).toBe(429);
    expect(limited.body()).toMatch(/too many AI requests/i);
  });

  it('logs safe diagnostics and returns a correlation ID for unexpected failures', async () => {
    process.env.CLOUD_AI_ENABLED = 'true';
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = responseDouble();

    await handler(failingRequestDouble('diagnostic-client'), response.value);

    expect(response.status()).toBe(500);
    expect(response.header('x-request-id')).toMatch(/^[0-9a-f-]{36}$/);
    expect(JSON.parse(response.body()).requestId).toBe(response.header('x-request-id'));
    expect(errorLog).toHaveBeenCalledWith('[api/ai] request failed', expect.objectContaining({
      requestId: response.header('x-request-id'),
      operation: 'unknown',
      errorName: 'Error',
    }));
  });

  it('retries company research when the first grounded response has no usable citations', async () => {
    process.env.CLOUD_AI_ENABLED = 'true';
    process.env.GEMINI_API_KEY = 'test-key';
    const groundedText = 'SUMMARY: Acme builds accessible tools.\nPRIORITY: Ship v2.';
    const summaryStart = groundedText.indexOf('Acme builds accessible tools.');
    const priorityStart = groundedText.indexOf('Ship v2.');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(geminiResponse('unusable response'))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        candidates: [{
          content: {parts: [{text: groundedText}]},
          groundingMetadata: {
            groundingChunks: [{web: {uri: 'https://acme.example/careers', title: 'Acme Careers'}}],
            groundingSupports: [
              {segment: {startIndex: summaryStart, endIndex: summaryStart + 29, text: 'Acme builds accessible tools.'}, groundingChunkIndices: [0]},
              {segment: {startIndex: priorityStart, endIndex: priorityStart + 8, text: 'Ship v2.'}, groundingChunkIndices: [0]},
            ],
          },
        }],
      }), {status: 200, headers: {'content-type': 'application/json'}}));
    vi.stubGlobal('fetch', fetchMock);
    const response = responseDouble();

    await handler(requestDouble(JSON.stringify({operation: 'research-company', input: {company: 'Acme', role: 'Frontend Engineer'}}), 'research-retry-client'), response.value);

    expect(response.status()).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(response.body()).summary.text).toBe('Acme builds accessible tools.');
  });

  it('uses separate provider responses for fit analysis and grounded suggestions', async () => {
    process.env.CLOUD_AI_ENABLED = 'true';
    process.env.GEMINI_API_KEY = 'test-key';
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(geminiResponse(JSON.stringify({
        protocolVersion: 1,
        fitSummary: 'The CV provides relevant product delivery evidence.',
        matchedRequirements: [{requirement: 'Product delivery', evidence: 'Led customer-facing workflow tools.', cvItemId: 'exp-northstar'}],
        gaps: [],
      })))
      .mockResolvedValueOnce(geminiResponse(JSON.stringify({protocolVersion: 1, suggestions: []})));
    vi.stubGlobal('fetch', fetchMock);
    const response = responseDouble();

    await handler(requestDouble(analyzeBody(), 'analysis-split-client'), response.value);

    expect(response.status()).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(response.body())).toMatchObject({
      fitSummary: 'The CV provides relevant product delivery evidence.',
      suggestions: [],
    });
  });

  it('keeps valid fit results when both suggestion responses are unusable', async () => {
    process.env.CLOUD_AI_ENABLED = 'true';
    process.env.GEMINI_API_KEY = 'test-key';
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(geminiResponse(JSON.stringify({
        protocolVersion: 1,
        fitSummary: 'The CV provides relevant product delivery evidence.',
        matchedRequirements: [],
        gaps: [{requirement: 'Python', explanation: 'Python is not present in the CV.', resolvableFromExistingFacts: false}],
      })))
      .mockResolvedValueOnce(geminiResponse('{"protocolVersion":1,"suggestions":['))
      .mockResolvedValueOnce(geminiResponse('{"protocolVersion":1,"suggestions":['));
    vi.stubGlobal('fetch', fetchMock);
    const response = responseDouble();

    await handler(requestDouble(analyzeBody(), 'analysis-suggestion-fallback-client'), response.value);

    expect(response.status()).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(JSON.parse(response.body())).toMatchObject({
      fitSummary: 'The CV provides relevant product delivery evidence.',
      suggestions: [],
      warnings: ['Fit analysis is ready, but no grounded CV edit could be generated.'],
    });
  });

  it('blocks public-team research before provider access when its kill switch is off', async () => {
    process.env.CLOUD_AI_ENABLED = 'true';
    process.env.PEOPLE_RESEARCH_ENABLED = 'false';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const response = responseDouble();

    await handler(requestDouble(peopleResearchBody(), 'people-disabled-client'), response.value);

    expect(response.status()).toBe(404);
    expect(response.body()).toMatch(/not enabled/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns only cited public people from an official company source when enabled', async () => {
    process.env.CLOUD_AI_ENABLED = 'true';
    process.env.PEOPLE_RESEARCH_ENABLED = 'true';
    process.env.GEMINI_API_KEY = 'test-key';
    const text = 'PERSON_MANAGER: Jane Doe | Engineering Director';
    const fetchMock = vi.fn().mockResolvedValue(groundedGeminiResponse(text, 'Acme Team', 'https://acme.com/team'));
    vi.stubGlobal('fetch', fetchMock);
    const response = responseDouble();

    await handler(requestDouble(peopleResearchBody(), 'people-enabled-client'), response.value);

    expect(response.status()).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(response.body())).toMatchObject({
      company: 'Acme',
      people: [{name: 'Jane Doe', role: 'Engineering Director', category: 'hiring-manager', citationIds: ['source-0']}],
    });
  });
});

function analyzeBody(): string {
  return JSON.stringify({
    operation: 'analyze',
    request: {
      protocolVersion: 1,
      cv: testCv,
      job: {source: 'pasted', title: 'Frontend Engineer', company: 'Acme', text: 'Build accessible product experiences and maintain production systems.'},
      options: {maxSuggestions: 1, language: 'en'},
    },
  });
}

function peopleResearchBody(): string {
  return JSON.stringify({
    operation: 'research-people',
    input: {
      company: 'Acme',
      role: 'Frontend Engineer',
      officialSources: [{id: 'brief-source', title: 'Acme Careers', url: 'https://acme.com/careers'}],
    },
  });
}

function geminiResponse(text: string): Response {
  return new Response(JSON.stringify({candidates: [{content: {parts: [{text}]}}]}), {status: 200, headers: {'content-type': 'application/json'}});
}

function groundedGeminiResponse(text: string, title: string, url: string): Response {
  const claim = text.slice(text.indexOf(':') + 1).trim();
  const startIndex = text.indexOf(claim);
  return new Response(JSON.stringify({candidates: [{
    content: {parts: [{text}]},
    groundingMetadata: {
      groundingChunks: [{web: {uri: url, title}}],
      groundingSupports: [{segment: {startIndex, endIndex: startIndex + claim.length, text: claim}, groundingChunkIndices: [0]}],
    },
  }]}), {status: 200, headers: {'content-type': 'application/json'}});
}

function requestDouble(body: string, address: string): IncomingMessage {
  return {
    method: 'POST',
    headers: {host: 'localhost'},
    socket: {remoteAddress: address},
    async *[Symbol.asyncIterator]() { yield Buffer.from(body); },
  } as unknown as IncomingMessage;
}

function failingRequestDouble(address: string): IncomingMessage {
  return {
    method: 'POST',
    headers: {host: 'localhost'},
    socket: {remoteAddress: address},
    async *[Symbol.asyncIterator]() { throw new Error('Synthetic request failure.'); },
  } as unknown as IncomingMessage;
}

function responseDouble(): {value: ServerResponse; status: () => number; body: () => string; header: (name: string) => string | undefined} {
  let body = '';
  const headers = new Map<string, string>();
  const value = {
    statusCode: 200,
    setHeader: vi.fn((name: string, value: string | number | readonly string[]) => { headers.set(name.toLowerCase(), String(value)); }),
    end: vi.fn((chunk?: string) => { body = chunk ?? ''; }),
  } as unknown as ServerResponse;
  return {value, status: () => value.statusCode, body: () => body, header: name => headers.get(name.toLowerCase())};
}

describe('/api/ai provider errors', () => {
  const bankBody = () => JSON.stringify({operation: 'suggest-from-bank', request: {
    protocolVersion: 1,
    cv: testCv,
    job: {text: 'Frontend engineer building Vue 3 monitoring dashboards for an operations team.'},
    entries: [{id: 'b1', title: 'Batch job monitoring', text: 'Built a Vue 3 dashboard for nightly batch jobs.', tags: ['dashboards'], updatedAt: '2026-01-01T00:00:00.000Z'}],
    options: {maxSuggestions: 3},
  }});

  it.each([
    [403, 'auth', /rejected the API key/],
    [404, 'unknown', /HTTP 404/],
  ])('reports a fit-analysis provider HTTP %i as itself, not as unusable output', async (status, code, message) => {
    process.env.CLOUD_AI_ENABLED = 'true';
    process.env.GEMINI_API_KEY = 'test-key';
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', {status}));
    vi.stubGlobal('fetch', fetchMock);
    const response = responseDouble();

    await handler(requestDouble(analyzeBody(), `fit-provider-${status}`), response.value);

    const body = JSON.parse(response.body());
    expect(body.code).toBe(code);
    expect(body.error).toMatch(message);
    expect(body.error).not.toMatch(/unusable/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reports an Experience Bank quota error as itself, not as "no grounded suggestion"', async () => {
    process.env.CLOUD_AI_ENABLED = 'true';
    process.env.GEMINI_API_KEY = 'test-key';
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', {status: 429})));
    const response = responseDouble();

    await handler(requestDouble(bankBody(), 'bank-provider-429'), response.value);

    expect(response.status()).toBe(429);
    expect(JSON.parse(response.body())).toMatchObject({code: 'quota'});
  });
});
