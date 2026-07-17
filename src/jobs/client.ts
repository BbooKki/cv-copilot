import {z} from 'zod';

const responseSchema = z.object({url: z.string().url(), title: z.string(), company: z.string().optional(), text: z.string().min(1)});
export type ExtractedJob = z.infer<typeof responseSchema>;

export async function extractJob(url: string, signal?: AbortSignal): Promise<ExtractedJob> {
  const normalizedUrl = normalizeJobUrl(url);
  const response = await fetch('/api/extract-job', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({url: normalizedUrl}), signal});
  const body = await response.json() as unknown;
  if (!response.ok) {
    const message = z.object({error: z.string()}).safeParse(body);
    throw new Error(message.success ? message.data.error : `Job extraction failed with HTTP ${response.status}.`);
  }
  return responseSchema.parse(body);
}

export function normalizeJobUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error('A job URL is required.');
  const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(trimmed);
  let url: URL;
  try {
    url = new URL(hasScheme ? trimmed : `https://${trimmed}`);
  } catch {
    throw new Error('Enter a valid job URL.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Only HTTP(S) job URLs are allowed.');
  return url.toString();
}
