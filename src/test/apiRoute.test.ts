import type {IncomingMessage, ServerResponse} from 'node:http';
import {afterEach, describe, expect, it, vi} from 'vitest';
import handler from '../../api/ai';

const originalEnabled = process.env.CLOUD_AI_ENABLED;

afterEach(() => {
  vi.restoreAllMocks();
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
});

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
