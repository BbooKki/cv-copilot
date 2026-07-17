import type {IncomingMessage, ServerResponse} from 'node:http';
import {afterEach, describe, expect, it, vi} from 'vitest';
import handler from './ai';

const originalEnabled = process.env.CLOUD_AI_ENABLED;

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalEnabled === undefined) delete process.env.CLOUD_AI_ENABLED;
  else process.env.CLOUD_AI_ENABLED = originalEnabled;
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
});

function requestDouble(body: string, address: string): IncomingMessage {
  return {
    method: 'POST',
    headers: {host: 'localhost'},
    socket: {remoteAddress: address},
    async *[Symbol.asyncIterator]() { yield Buffer.from(body); },
  } as unknown as IncomingMessage;
}

function responseDouble(): {value: ServerResponse; status: () => number; body: () => string} {
  let body = '';
  const value = {
    statusCode: 200,
    setHeader: vi.fn(),
    end: vi.fn((chunk?: string) => { body = chunk ?? ''; }),
  } as unknown as ServerResponse;
  return {value, status: () => value.statusCode, body: () => body};
}
