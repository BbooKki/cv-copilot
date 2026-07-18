import {AiProviderError, type AiProviderErrorCode} from './provider';

/** Shared POST to the server /api/ai endpoint with consistent error mapping. */
export async function postAiOperation(body: unknown, signal?: AbortSignal): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch('/api/ai', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify(body),
      signal,
    });
  } catch {
    if (signal?.aborted) throw new AiProviderError('network', 'The request was cancelled.');
    throw new AiProviderError('network', 'Unable to reach the AI service. Check your connection and try again.');
  }
  const parsed = (await response.json().catch(() => null)) as {error?: string; code?: string} | null;
  if (!response.ok) {
    throw new AiProviderError(normalizeCode(parsed?.code), parsed?.error ?? `The request failed with HTTP ${response.status}.`);
  }
  return parsed;
}

function normalizeCode(code: string | undefined): AiProviderErrorCode {
  switch (code) {
    case 'quota':
      return 'quota';
    case 'auth':
      return 'auth';
    case 'invalid-output':
      return 'invalid-output';
    case 'busy':
      return 'busy';
    case 'not-enabled':
      return 'unsupported';
    default:
      return 'unknown';
  }
}
