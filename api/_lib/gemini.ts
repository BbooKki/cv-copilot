const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
// `gemini-flash-latest` is the non-deprecating alias for the current free-tier
// flash model. Pinned `gemini-2.5-*` names are 404 for keys created in 2026.
export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-flash-latest';
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS ?? 45_000);
const GEMINI_RETRIES = Number(process.env.GEMINI_RETRIES ?? 2);

export type GeminiErrorCode = 'auth' | 'quota' | 'safety' | 'network' | 'invalid-output' | 'busy' | 'unknown';

/** A Gemini failure mapped to a client-safe message and HTTP status. */
export class GeminiError extends Error {
  readonly code: GeminiErrorCode;
  readonly status: number;
  constructor(code: GeminiErrorCode, message: string, status = 502) {
    super(message);
    this.name = 'GeminiError';
    this.code = code;
    this.status = status;
  }
}

type GenerateOptions = {temperature?: number; maxOutputTokens?: number; json?: boolean};

type GeminiResponse = {
  candidates?: Array<{finishReason?: string; content?: {parts?: Array<{text?: string}>}}>;
  promptFeedback?: {blockReason?: string};
};

/**
 * Calls Gemini generateContent and returns the concatenated text of the first
 * candidate. Transient overload (HTTP 503, common on the free tier) is retried
 * with a short backoff before surfacing as a "busy" error.
 */
export async function generateText(prompt: string, options: GenerateOptions = {}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new GeminiError('auth', 'The server is not configured for cloud AI.', 500);

  let lastBusy: GeminiError | null = null;
  for (let attempt = 0; attempt <= GEMINI_RETRIES; attempt += 1) {
    if (attempt > 0) await delay(500 * attempt);
    try {
      return await attemptGenerate(apiKey, prompt, options);
    } catch (cause) {
      if (cause instanceof GeminiError && cause.code === 'busy') {
        lastBusy = cause;
        continue;
      }
      throw cause;
    }
  }
  throw lastBusy ?? new GeminiError('busy', 'The AI service is busy. Please try again in a moment.', 503);
}

async function attemptGenerate(apiKey: string, prompt: string, options: GenerateOptions): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${GEMINI_ENDPOINT}/${GEMINI_MODEL}:generateContent`, {
      method: 'POST',
      headers: {'content-type': 'application/json', 'x-goog-api-key': apiKey},
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{role: 'user', parts: [{text: prompt}]}],
        generationConfig: {
          temperature: options.temperature ?? 0.2,
          maxOutputTokens: options.maxOutputTokens ?? 2_048,
          ...(options.json ? {responseMimeType: 'application/json'} : {}),
        },
      }),
    });
  } catch {
    if (controller.signal.aborted) throw new GeminiError('network', 'The AI service did not respond in time.', 504);
    throw new GeminiError('network', 'Unable to reach the AI service.', 502);
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 401 || response.status === 403) throw new GeminiError('auth', 'The AI service rejected the API key.', 502);
  if (response.status === 429) throw new GeminiError('quota', 'The AI free-tier quota is exhausted. Please wait a moment and try again.', 429);
  if (response.status === 503) throw new GeminiError('busy', 'The AI service is busy. Please try again in a moment.', 503);
  if (!response.ok) throw new GeminiError('unknown', `The AI service returned HTTP ${response.status}.`, 502);

  const payload = (await response.json().catch(() => null)) as GeminiResponse | null;
  if (payload?.promptFeedback?.blockReason) throw new GeminiError('safety', 'The AI service blocked this request.', 422);
  const candidate = payload?.candidates?.[0];
  if (candidate?.finishReason === 'SAFETY' || candidate?.finishReason === 'PROHIBITED_CONTENT') {
    throw new GeminiError('safety', 'The AI service blocked this content.', 422);
  }
  const text = candidate?.content?.parts?.map(part => part.text ?? '').join('').trim();
  if (!text) throw new GeminiError('invalid-output', 'The AI service returned an empty response.', 502);
  return text;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
