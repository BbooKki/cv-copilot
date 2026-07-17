import {z} from 'zod';

const responseSchema = z.object({url: z.string().url(), title: z.string(), company: z.string().optional(), text: z.string().min(1)});
export type ExtractedJob = z.infer<typeof responseSchema>;

export async function extractJob(url: string, signal?: AbortSignal): Promise<ExtractedJob> {
  const response = await fetch('/api/extract-job', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({url}), signal});
  const body = await response.json() as unknown;
  if (!response.ok) {
    const message = z.object({error: z.string()}).safeParse(body);
    throw new Error(message.success ? message.data.error : `Job extraction failed with HTTP ${response.status}.`);
  }
  return responseSchema.parse(body);
}
