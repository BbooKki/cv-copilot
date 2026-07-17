import {afterEach, describe, expect, it, vi} from 'vitest';
import {extractJob, normalizeJobUrl} from './client';

afterEach(() => vi.unstubAllGlobals());

describe('job extraction client', () => {
  it('adds HTTPS to a scheme-less job URL', () => {
    expect(normalizeJobUrl(' saramin.co.kr/jobs/view?id=123 ')).toBe('https://saramin.co.kr/jobs/view?id=123');
  });

  it('rejects non-HTTP URL schemes', () => {
    expect(() => normalizeJobUrl('file:///etc/passwd')).toThrow(/HTTP/);
  });

  it('sends the normalized URL to the extraction function', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      url: 'https://saramin.co.kr/jobs/view?id=123',
      title: 'Frontend developer',
      text: 'A complete job description suitable for local analysis.',
    }), {status: 200, headers: {'content-type': 'application/json'}}));
    vi.stubGlobal('fetch', fetchMock);

    await extractJob('saramin.co.kr/jobs/view?id=123');

    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({url: 'https://saramin.co.kr/jobs/view?id=123'});
  });
});
