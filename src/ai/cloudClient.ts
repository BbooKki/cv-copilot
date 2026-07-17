import {aiAnalysisResultSchema, type AiAnalysisRequest, type AiAnalysisResult} from './protocol';
import {redactCvForCloud} from './redact';
import {AiProviderError, type AiProviderErrorCode} from './provider';

/**
 * Runs job-fit analysis through the server-side Gemini provider. The CV is
 * redacted of contact details before it leaves the browser, and the returned
 * shape is validated again on the client before it reaches UI state.
 */
export async function analyzeWithCloud(request: AiAnalysisRequest, signal?: AbortSignal): Promise<AiAnalysisResult> {
  const redacted: AiAnalysisRequest = {...request, cv: redactCvForCloud(request.cv)};
  const payload = await postAi({operation: 'analyze', request: redacted}, signal);
  try {
    return aiAnalysisResultSchema.parse(payload);
  } catch {
    throw new AiProviderError('invalid-output', 'The AI returned a response the app could not read. Please try again.');
  }
}

async function postAi(body: unknown, signal?: AbortSignal): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch('/api/ai', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify(body),
      signal,
    });
  } catch {
    if (signal?.aborted) throw new AiProviderError('network', 'Analysis was cancelled.');
    throw new AiProviderError('network', 'Unable to reach the analysis service. Check your connection and try again.');
  }
  const parsed = (await response.json().catch(() => null)) as {error?: string; code?: string} | null;
  if (!response.ok) {
    throw new AiProviderError(normalizeCode(parsed?.code), parsed?.error ?? `Analysis failed with HTTP ${response.status}.`);
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
    default:
      return 'unknown';
  }
}
