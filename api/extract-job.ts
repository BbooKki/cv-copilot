import type {IncomingMessage, ServerResponse} from 'node:http';
import {parseHTML} from 'linkedom';
import {assertPublicDestination, MAX_REDIRECTS, parsePublicHttpUrl} from './_lib/urlSafety.js';

const MAX_BYTES = Number(process.env.JOB_FETCH_MAX_BYTES ?? 1_500_000);
const TIMEOUT_MS = Number(process.env.JOB_FETCH_TIMEOUT_MS ?? 10_000);

export default async function handler(request: IncomingMessage, response: ServerResponse): Promise<void> {
  response.setHeader('content-type', 'application/json; charset=utf-8');
  if (request.method !== 'POST') { response.statusCode = 405; response.end(JSON.stringify({error: 'Use POST.'})); return; }
  try {
    const body = await readRequest(request, 8_192);
    const input = JSON.parse(body) as {url?: unknown};
    if (typeof input.url !== 'string') throw new Error('A job URL is required.');
    const result = await fetchReadable(input.url);
    response.statusCode = 200;
    response.end(JSON.stringify(result));
  } catch (cause) {
    response.statusCode = 400;
    response.end(JSON.stringify({error: cause instanceof Error ? cause.message : 'Unable to extract this job page.'}));
  }
}

async function fetchReadable(value: string): Promise<{url: string; title: string; company?: string; text: string}> {
  let url = parsePublicHttpUrl(value);
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    await assertPublicDestination(url);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let fetched: Response;
    try { fetched = await fetch(url, {redirect: 'manual', signal: controller.signal, headers: {'user-agent': 'CV-Copilot-Job-Extractor/1.0', accept: 'text/html,text/plain'}}); }
    finally { clearTimeout(timeout); }
    if ([301, 302, 303, 307, 308].includes(fetched.status)) {
      const location = fetched.headers.get('location');
      if (!location || redirects === MAX_REDIRECTS) throw new Error('Too many or invalid redirects.');
      url = parsePublicHttpUrl(new URL(location, url).toString());
      continue;
    }
    if (!fetched.ok || !fetched.body) throw new Error(`The job page returned HTTP ${fetched.status}.`);
    const contentType = fetched.headers.get('content-type')?.toLowerCase() ?? '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) throw new Error('The URL did not return a readable text page.');
    const html = await readResponse(fetched.body, MAX_BYTES);
    if (contentType.includes('text/plain')) return {url: url.toString(), title: 'Job description', text: normalizeText(html)};
    return extractHtml(url, html);
  }
  throw new Error('Unable to follow this URL.');
}

function extractHtml(url: URL, html: string): {url: string; title: string; company?: string; text: string} {
  const {document} = parseHTML(html);
  document.querySelectorAll('script,style,noscript,svg,canvas,form,nav,footer,header,[hidden],[aria-hidden="true"]')?.forEach(node => node.remove());
  document.querySelectorAll('[style]')?.forEach(node => { const style = node.getAttribute('style')?.toLowerCase() ?? ''; if (style.includes('display:none') || style.includes('visibility:hidden')) node.remove(); });
  const title = normalizeText(document.querySelector('h1')?.textContent ?? document.querySelector('title')?.textContent ?? 'Job description').slice(0, 200);
  const company = normalizeText(document.querySelector('[data-company], .company, [class*="company"]')?.textContent ?? '').slice(0, 120) || undefined;
  const main = document.querySelector('main, article, [role="main"], .job-description, [class*="description"]') ?? document.body;
  const text = normalizeText(main?.textContent ?? '').slice(0, 30_000);
  if (text.length < 80) throw new Error('The page did not contain enough readable job text. Paste the description instead.');
  return {url: url.toString(), title, company, text};
}

function normalizeText(value: string): string { return value.replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n\s*\n\s*\n+/g, '\n\n').trim(); }

async function readRequest(request: IncomingMessage, max: number): Promise<string> {
  const chunks: Buffer[] = []; let size = 0;
  for await (const chunk of request) { const buffer = Buffer.from(chunk); size += buffer.length; if (size > max) throw new Error('Request is too large.'); chunks.push(buffer); }
  return Buffer.concat(chunks).toString('utf8');
}

async function readResponse(stream: ReadableStream<Uint8Array>, max: number): Promise<string> {
  const reader = stream.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  while (true) { const {done, value} = await reader.read(); if (done) break; size += value.byteLength; if (size > max) { await reader.cancel(); throw new Error('The job page is too large.'); } chunks.push(value); }
  const merged = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(merged);
}
