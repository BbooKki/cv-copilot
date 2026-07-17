import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {generateText, GeminiError} from './gemini';

const originalKey = process.env.GEMINI_API_KEY;

beforeEach(() => { process.env.GEMINI_API_KEY = 'test-key'; });
afterEach(() => {
  vi.unstubAllGlobals();
  if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalKey;
});

function geminiResponse(text: string): Response {
  return new Response(JSON.stringify({candidates: [{content: {parts: [{text}]}}]}), {status: 200, headers: {'content-type': 'application/json'}});
}

describe('generateText', () => {
  it('returns the concatenated candidate text and sends the key as a header', async () => {
    const fetchMock = vi.fn().mockResolvedValue(geminiResponse('{"ok":true}'));
    vi.stubGlobal('fetch', fetchMock);

    const text = await generateText('prompt', {json: true});

    expect(text).toBe('{"ok":true}');
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain(':generateContent');
    expect((init as RequestInit).headers).toMatchObject({'x-goog-api-key': 'test-key'});
    expect(String(url)).not.toContain('test-key');
    expect(JSON.parse(String((init as RequestInit).body)).generationConfig.responseMimeType).toBe('application/json');
  });

  it('fails fast when the key is missing', async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(generateText('prompt')).rejects.toMatchObject({code: 'auth'});
  });

  it('maps HTTP 429 to a quota error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', {status: 429})));
    await expect(generateText('prompt')).rejects.toMatchObject({code: 'quota', status: 429});
  });

  it('maps HTTP 403 to an auth error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', {status: 403})));
    await expect(generateText('prompt')).rejects.toMatchObject({code: 'auth'});
  });

  it('rejects an empty candidate as invalid output', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({candidates: []}), {status: 200})));
    await expect(generateText('prompt')).rejects.toBeInstanceOf(GeminiError);
  });

  it('treats a safety block as a safety error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({promptFeedback: {blockReason: 'SAFETY'}}), {status: 200})));
    await expect(generateText('prompt')).rejects.toMatchObject({code: 'safety'});
  });
});
