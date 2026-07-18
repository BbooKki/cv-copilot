import type {IncomingMessage, ServerResponse} from 'node:http';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {cvDocumentSchema} from '../src/cv/schema.js';
import {buildFitAnalysisPrompt, buildSuggestionPrompt, combineAnalysis, parseFitAnalysisResult, parseSuggestionResult, type AiAnalysisRequest, type AiAnalysisResult, type AiFitAnalysisResult, type AiSuggestionResult} from '../src/ai/protocol.js';
import {buildCompanyResearchPrompt, buildCompanyResearchRetryPrompt, companyResearchInputSchema, parseCompanyBrief, type CompanyResearchInput, type GroundedCompanyBrief} from '../src/ai/research.js';
import {buildPeopleResearchPrompt, buildPeopleResearchRetryPrompt, parsePublicPeople, peopleResearchInputSchema, type PeopleResearchInput, type PublicPeopleResult} from '../src/ai/peopleResearch.js';
import {buildInterviewKitPrompt, groundInterviewKit, parseInterviewKit, type InterviewKit, type InterviewKitRequest} from '../src/ai/interview.js';
import {redactCvForCloud} from '../src/ai/redact.js';
import {assertFitEvidenceExists, assertSuggestionsAreGrounded, assertSuggestionsDoNotClaimGaps, bindSuggestionsToDocument} from '../src/ai/suggestions.js';
import {generateGrounded, generateText, GEMINI_MODEL, GeminiError} from './_lib/gemini.js';

// Allow enough server time for slower (thinking) models on the free tier.
export const config = {maxDuration: 60};

// Tight operation-specific ceilings protect the free-tier quota while leaving
// enough room for the validated response schemas.
const ANALYSIS_MAX_TOKENS = 900;
const ANALYSIS_REPAIR_MAX_TOKENS = 520;
const RESEARCH_MAX_TOKENS = 1_600;
const PEOPLE_RESEARCH_MAX_TOKENS = 900;
const INTERVIEW_MAX_TOKENS = 1_800;

const jobSchema = z.object({
  source: z.enum(['url', 'pasted']),
  sourceUrl: z.string().max(2_048).optional(),
  title: z.string().max(300).optional(),
  company: z.string().max(200).optional(),
  text: z.string().min(1).max(20_000),
}).strict();

const analyzeRequestSchema = z.object({
  protocolVersion: z.literal(1),
  cv: cvDocumentSchema,
  job: jobSchema,
  options: z.object({maxSuggestions: z.number().int().min(0).max(3), language: z.string().max(20)}).strict(),
});

const interviewKitRequestSchema = z.object({
  protocolVersion: z.literal(1),
  cv: cvDocumentSchema,
  job: z.object({title: z.string().max(300).optional(), company: z.string().max(200).optional(), text: z.string().min(1).max(20_000)}).strict(),
  context: z.object({
    fitSummary: z.string().max(400).optional(),
    gaps: z.array(z.string().max(240)).max(4).optional(),
    companyPriorities: z.array(z.string().max(240)).max(5).optional(),
  }).strict().optional(),
});

const bodySchema = z.discriminatedUnion('operation', [
  z.object({operation: z.literal('analyze'), request: analyzeRequestSchema}).strict(),
  z.object({operation: z.literal('research-company'), input: companyResearchInputSchema}).strict(),
  z.object({operation: z.literal('research-people'), input: peopleResearchInputSchema}).strict(),
  z.object({operation: z.literal('build-interview-kit'), request: interviewKitRequestSchema}).strict(),
]);

const MAX_BODY_BYTES = 200_000;
const RATE_WINDOW_MS = positiveEnv('AI_RATE_LIMIT_WINDOW_MS', 60_000);
const RATE_MAX_REQUESTS = positiveEnv('AI_RATE_LIMIT_MAX_REQUESTS', 8);
const GLOBAL_DAILY_MAX = positiveEnv('AI_GLOBAL_DAILY_MAX_REQUESTS', 250);
const rateBuckets = new Map<string, {startedAt: number; count: number}>();
let globalBudget = {day: utcDay(), count: 0};

export default async function handler(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const requestId = randomUUID();
  let operation = 'unknown';
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.setHeader('x-request-id', requestId);
  if (request.method !== 'POST') {
    response.statusCode = 405;
    response.end(JSON.stringify({error: 'Use POST.', code: 'method'}));
    return;
  }
  if (process.env.CLOUD_AI_ENABLED === 'false') {
    response.statusCode = 503;
    response.end(JSON.stringify({error: 'Cloud AI is temporarily disabled.', code: 'busy'}));
    return;
  }
  if (!isAllowedOrigin(request)) {
    response.statusCode = 403;
    response.end(JSON.stringify({error: 'This origin is not allowed.', code: 'auth'}));
    return;
  }
  const rateError = consumeClientQuota(clientAddress(request));
  if (rateError) {
    response.statusCode = 429;
    response.setHeader('retry-after', String(rateError.retryAfterSeconds));
    response.end(JSON.stringify({error: rateError.message, code: 'quota'}));
    return;
  }
  try {
    const body = bodySchema.parse(JSON.parse(await readRequest(request, MAX_BODY_BYTES)));
    operation = body.operation;
    if (body.operation === 'research-people' && process.env.PEOPLE_RESEARCH_ENABLED !== 'true') {
      response.statusCode = 404;
      response.end(JSON.stringify({error: 'Public team research is not enabled.', code: 'not-enabled', requestId}));
      return;
    }
    const budgetError = consumeGlobalQuota();
    if (budgetError) {
      response.statusCode = 429;
      response.setHeader('retry-after', String(budgetError.retryAfterSeconds));
      response.end(JSON.stringify({error: budgetError.message, code: 'quota'}));
      return;
    }
    if (body.operation === 'analyze') {
      const result = await analyze(body.request);
      response.statusCode = 200;
      response.end(JSON.stringify(result));
      return;
    }
    if (body.operation === 'research-company') {
      const brief = await research(body.input);
      response.statusCode = 200;
      response.end(JSON.stringify(brief));
      return;
    }
    if (body.operation === 'research-people') {
      const result = await researchPeople(body.input);
      response.statusCode = 200;
      response.end(JSON.stringify(result));
      return;
    }
    if (body.operation === 'build-interview-kit') {
      const kit = await interviewKit(body.request);
      response.statusCode = 200;
      response.end(JSON.stringify(kit));
      return;
    }
    response.statusCode = 400;
    response.end(JSON.stringify({error: 'Unsupported operation.', code: 'unknown'}));
  } catch (cause) {
    respondError(response, cause, {requestId, operation});
  }
}

async function analyze(request: AiAnalysisRequest): Promise<AiAnalysisResult> {
  const safeRequest = {...request, cv: redactCvForCloud(request.cv)};
  const fit = await generateCloudFit(safeRequest);
  try {
    const suggestions = await generateCloudSuggestions(safeRequest, fit);
    return combineAnalysis(fit, suggestions);
  } catch (cause) {
    logInvalidAnalysisStage('suggestions', cause);
    return {...combineAnalysis(fit, {protocolVersion: 1, suggestions: []}), warnings: [...fit.warnings, 'Fit analysis is ready, but no grounded CV edit could be generated.'].slice(0, 3)};
  }
}

async function generateCloudFit(request: AiAnalysisRequest): Promise<AiFitAnalysisResult> {
  const parse = (raw: string) => {
    const fit = parseFitAnalysisResult(raw);
    assertFitEvidenceExists(request.cv, fit);
    return fit;
  };
  try {
    return parse(await generateText(buildFitAnalysisPrompt(request), {json: true, temperature: 0.1, maxOutputTokens: ANALYSIS_MAX_TOKENS}));
  } catch (firstCause) {
    logInvalidAnalysisStage('fit-initial', firstCause);
    try {
      return parse(await generateText(buildFitAnalysisPrompt(request, {repair: true}), {json: true, temperature: 0, maxOutputTokens: ANALYSIS_REPAIR_MAX_TOKENS}));
    } catch (repairCause) {
      logInvalidAnalysisStage('fit-repair', repairCause);
      throw new GeminiError('invalid-output', 'The AI returned an unusable fit analysis. Please try again.', 502);
    }
  }
}

async function generateCloudSuggestions(request: AiAnalysisRequest, fit: AiFitAnalysisResult): Promise<AiSuggestionResult> {
  const parse = (raw: string) => {
    const parsed = parseSuggestionResult(raw);
    const suggestions = bindSuggestionsToDocument(request.cv, parsed.suggestions);
    assertSuggestionsAreGrounded(request.cv, suggestions);
    assertSuggestionsDoNotClaimGaps(request.cv, fit, suggestions);
    return {...parsed, suggestions};
  };
  try {
    return parse(await generateText(buildSuggestionPrompt(request, fit), {json: true, temperature: 0.1, maxOutputTokens: ANALYSIS_MAX_TOKENS}));
  } catch (firstCause) {
    logInvalidAnalysisStage('suggestions-initial', firstCause);
    return parse(await generateText(buildSuggestionPrompt(request, fit, {repair: true}), {json: true, temperature: 0, maxOutputTokens: ANALYSIS_REPAIR_MAX_TOKENS}));
  }
}

function logInvalidAnalysisStage(stage: string, cause: unknown): void {
  console.error('[api/ai] structured analysis stage rejected', {
    stage,
    errorName: cause instanceof Error ? cause.name : 'NonError',
    issuePaths: cause instanceof z.ZodError ? cause.issues.map(issue => issue.path.join('.')).slice(0, 12) : undefined,
  });
}

async function interviewKit(request: InterviewKitRequest): Promise<InterviewKit> {
  const safeRequest = {...request, cv: redactCvForCloud(request.cv)};
  const prompt = buildInterviewKitPrompt(safeRequest);
  const raw = await generateText(prompt, {json: true, temperature: 0.3, maxOutputTokens: INTERVIEW_MAX_TOKENS});
  try {
    return groundInterviewKit(safeRequest.cv, parseInterviewKit(raw));
  } catch {
    const repairPrompt = `${prompt}\n\nThe previous response was not valid JSON for the schema. Return only the corrected minified JSON with every array and object closed.`;
    const retry = await generateText(repairPrompt, {json: true, temperature: 0, maxOutputTokens: INTERVIEW_MAX_TOKENS});
    try {
      return groundInterviewKit(safeRequest.cv, parseInterviewKit(retry));
    } catch {
      throw new GeminiError('invalid-output', 'The AI returned an unusable interview kit. Please try again.', 502);
    }
  }
}

async function research(input: CompanyResearchInput): Promise<GroundedCompanyBrief> {
  const first = await generateGrounded(buildCompanyResearchPrompt(input), {temperature: 0.1, maxOutputTokens: RESEARCH_MAX_TOKENS});
  try {
    return parseCompanyBrief(first.text, first.sources, first.supports, input.company);
  } catch {
    const retry = await generateGrounded(buildCompanyResearchRetryPrompt(input), {temperature: 0, maxOutputTokens: RESEARCH_MAX_TOKENS});
    try {
      return parseCompanyBrief(retry.text, retry.sources, retry.supports, input.company);
    } catch (cause) {
      throw new GeminiError('invalid-output', cause instanceof Error ? cause.message : 'No usable company research was found.', 422);
    }
  }
}

async function researchPeople(input: PeopleResearchInput): Promise<PublicPeopleResult> {
  const first = await generateGrounded(buildPeopleResearchPrompt(input), {temperature: 0.1, maxOutputTokens: PEOPLE_RESEARCH_MAX_TOKENS});
  try {
    const result = parsePublicPeople(first.text, first.sources, first.supports, input);
    if (result.people.length === 0 && /PERSON_(?:RECRUITER|MANAGER|PEER):/i.test(first.text)) throw new Error('The returned people were not tied to official company sources.');
    return result;
  } catch {
    const retry = await generateGrounded(buildPeopleResearchRetryPrompt(input), {temperature: 0, maxOutputTokens: PEOPLE_RESEARCH_MAX_TOKENS});
    return parsePublicPeople(retry.text, retry.sources, retry.supports, input);
  }
}

function respondError(response: ServerResponse, cause: unknown, context: {requestId: string; operation: string}): void {
  logFailure(cause, context);
  if (cause instanceof GeminiError) {
    response.statusCode = cause.status;
    response.end(JSON.stringify({error: cause.message, code: cause.code === 'safety' ? 'invalid-output' : cause.code, requestId: context.requestId}));
    return;
  }
  if (cause instanceof z.ZodError) {
    response.statusCode = 400;
    response.end(JSON.stringify({error: 'The analysis request was malformed.', code: 'invalid-request', requestId: context.requestId}));
    return;
  }
  if (cause instanceof SyntaxError) {
    response.statusCode = 400;
    response.end(JSON.stringify({error: 'The request body was not valid JSON.', code: 'invalid-request', requestId: context.requestId}));
    return;
  }
  response.statusCode = 500;
  response.end(JSON.stringify({error: 'Unexpected server error during analysis.', code: 'unknown', requestId: context.requestId}));
}

function logFailure(cause: unknown, context: {requestId: string; operation: string}): void {
  const base = {requestId: context.requestId, operation: context.operation, model: GEMINI_MODEL};
  if (cause instanceof GeminiError) {
    console.error('[api/ai] request failed', {...base, errorName: cause.name, providerCode: cause.code, status: cause.status});
    return;
  }
  if (cause instanceof z.ZodError) {
    console.error('[api/ai] request failed', {...base, errorName: cause.name, issuePaths: cause.issues.map(issue => issue.path.join('.')).slice(0, 12)});
    return;
  }
  if (cause instanceof SyntaxError) {
    console.error('[api/ai] request failed', {...base, errorName: cause.name});
    return;
  }
  const error = cause instanceof Error ? cause : null;
  console.error('[api/ai] request failed', {
    ...base,
    errorName: error?.name ?? 'NonError',
    errorMessage: error?.message.slice(0, 500) ?? 'A non-Error value was thrown.',
    stack: error?.stack?.slice(0, 4_000),
  });
}

async function readRequest(request: IncomingMessage, max: number): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > max) throw new GeminiError('unknown', 'Request is too large.', 413);
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function consumeClientQuota(key: string): {message: string; retryAfterSeconds: number} | null {
  const now = Date.now();
  const current = rateBuckets.get(key);
  const bucket = !current || now - current.startedAt >= RATE_WINDOW_MS ? {startedAt: now, count: 0} : current;
  if (bucket.count >= RATE_MAX_REQUESTS) {
    return {message: 'Too many AI requests. Please wait before trying again.', retryAfterSeconds: Math.max(1, Math.ceil((RATE_WINDOW_MS - (now - bucket.startedAt)) / 1_000))};
  }
  bucket.count += 1;
  rateBuckets.set(key, bucket);
  if (rateBuckets.size > 2_000) {
    for (const [address, candidate] of rateBuckets) if (now - candidate.startedAt >= RATE_WINDOW_MS) rateBuckets.delete(address);
  }
  return null;
}

function consumeGlobalQuota(): {message: string; retryAfterSeconds: number} | null {
  const now = Date.now();
  const day = utcDay(now);
  if (globalBudget.day !== day) globalBudget = {day, count: 0};
  if (globalBudget.count >= GLOBAL_DAILY_MAX) {
    return {message: 'The demo AI budget is exhausted for today.', retryAfterSeconds: secondsUntilUtcMidnight(now)};
  }
  globalBudget.count += 1;
  return null;
}

function clientAddress(request: IncomingMessage): string {
  const forwarded = request.headers['x-forwarded-for'];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0];
  return value?.trim().slice(0, 120) || request.socket.remoteAddress || 'unknown';
}

function isAllowedOrigin(request: IncomingMessage): boolean {
  const origin = request.headers.origin;
  if (!origin) return true;
  const forwardedHost = request.headers['x-forwarded-host'];
  const host = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) ?? request.headers.host;
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function positiveEnv(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function utcDay(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

function secondsUntilUtcMidnight(now: number): number {
  const date = new Date(now);
  const next = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
  return Math.max(1, Math.ceil((next - now) / 1_000));
}
