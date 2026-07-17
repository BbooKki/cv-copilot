import type {IncomingMessage, ServerResponse} from 'node:http';
import {z} from 'zod';
import {cvDocumentSchema} from '../src/cv/schema.js';
import {buildCloudAnalysisPrompt, parseAiResult, type AiAnalysisRequest, type AiAnalysisResult} from '../src/ai/protocol.js';
import {buildCompanyResearchPrompt, companyResearchInputSchema, parseCompanyBrief, type CompanyResearchInput, type GroundedCompanyBrief} from '../src/ai/research.js';
import {buildInterviewKitPrompt, parseInterviewKit, type InterviewKit, type InterviewKitRequest} from '../src/ai/interview.js';
import {buildOutreachPrompt, parseOutreachKit, type OutreachKit, type OutreachRequest} from '../src/ai/outreach.js';
import {generateGrounded, generateText, GeminiError} from './_lib/gemini.js';

// Allow enough server time for slower (thinking) models on the free tier.
export const config = {maxDuration: 60};

// Generous ceiling so thinking models cannot truncate the JSON mid-string.
const ANALYSIS_MAX_TOKENS = 8_192;

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

const outreachRequestSchema = z.object({
  protocolVersion: z.literal(1),
  cv: cvDocumentSchema,
  job: z.object({title: z.string().max(300).optional(), company: z.string().max(200).optional(), text: z.string().min(1).max(20_000)}).strict(),
});

const bodySchema = z.discriminatedUnion('operation', [
  z.object({operation: z.literal('analyze'), request: analyzeRequestSchema}).strict(),
  z.object({operation: z.literal('research-company'), input: companyResearchInputSchema}).strict(),
  z.object({operation: z.literal('build-interview-kit'), request: interviewKitRequestSchema}).strict(),
  z.object({operation: z.literal('build-outreach'), request: outreachRequestSchema}).strict(),
]);

const MAX_BODY_BYTES = 200_000;

export default async function handler(request: IncomingMessage, response: ServerResponse): Promise<void> {
  response.setHeader('content-type', 'application/json; charset=utf-8');
  if (request.method !== 'POST') {
    response.statusCode = 405;
    response.end(JSON.stringify({error: 'Use POST.', code: 'method'}));
    return;
  }
  try {
    const body = bodySchema.parse(JSON.parse(await readRequest(request, MAX_BODY_BYTES)));
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
    if (body.operation === 'build-interview-kit') {
      const kit = await interviewKit(body.request);
      response.statusCode = 200;
      response.end(JSON.stringify(kit));
      return;
    }
    if (body.operation === 'build-outreach') {
      const kit = await outreach(body.request);
      response.statusCode = 200;
      response.end(JSON.stringify(kit));
      return;
    }
    response.statusCode = 400;
    response.end(JSON.stringify({error: 'Unsupported operation.', code: 'unknown'}));
  } catch (cause) {
    respondError(response, cause);
  }
}

async function analyze(request: AiAnalysisRequest): Promise<AiAnalysisResult> {
  const prompt = buildCloudAnalysisPrompt(request);
  const raw = await generateText(prompt, {json: true, temperature: 0.2, maxOutputTokens: ANALYSIS_MAX_TOKENS});
  try {
    return parseAiResult(raw);
  } catch {
    const repairPrompt = `${prompt}\n\nThe previous response was not valid JSON for the schema. Return only the corrected minified JSON with every array and object closed.`;
    const retry = await generateText(repairPrompt, {json: true, temperature: 0, maxOutputTokens: ANALYSIS_MAX_TOKENS});
    try {
      return parseAiResult(retry);
    } catch {
      throw new GeminiError('invalid-output', 'The AI returned an unusable response. Please try again.', 502);
    }
  }
}

async function interviewKit(request: InterviewKitRequest): Promise<InterviewKit> {
  const prompt = buildInterviewKitPrompt(request);
  const raw = await generateText(prompt, {json: true, temperature: 0.3, maxOutputTokens: ANALYSIS_MAX_TOKENS});
  try {
    return parseInterviewKit(raw);
  } catch {
    const repairPrompt = `${prompt}\n\nThe previous response was not valid JSON for the schema. Return only the corrected minified JSON with every array and object closed.`;
    const retry = await generateText(repairPrompt, {json: true, temperature: 0, maxOutputTokens: ANALYSIS_MAX_TOKENS});
    try {
      return parseInterviewKit(retry);
    } catch {
      throw new GeminiError('invalid-output', 'The AI returned an unusable interview kit. Please try again.', 502);
    }
  }
}

async function outreach(request: OutreachRequest): Promise<OutreachKit> {
  const prompt = buildOutreachPrompt(request);
  const raw = await generateText(prompt, {json: true, temperature: 0.4, maxOutputTokens: ANALYSIS_MAX_TOKENS});
  try {
    return parseOutreachKit(raw);
  } catch {
    const retry = await generateText(`${prompt}\n\nThe previous response was not valid JSON for the schema. Return only the corrected minified JSON.`, {json: true, temperature: 0, maxOutputTokens: ANALYSIS_MAX_TOKENS});
    try {
      return parseOutreachKit(retry);
    } catch {
      throw new GeminiError('invalid-output', 'The AI returned unusable outreach drafts. Please try again.', 502);
    }
  }
}

async function research(input: CompanyResearchInput): Promise<GroundedCompanyBrief> {
  const {text, sources} = await generateGrounded(buildCompanyResearchPrompt(input), {temperature: 0.3, maxOutputTokens: ANALYSIS_MAX_TOKENS});
  try {
    return parseCompanyBrief(text, sources, input.company);
  } catch (cause) {
    throw new GeminiError('invalid-output', cause instanceof Error ? cause.message : 'No usable company research was found.', 422);
  }
}

function respondError(response: ServerResponse, cause: unknown): void {
  if (cause instanceof GeminiError) {
    response.statusCode = cause.status;
    response.end(JSON.stringify({error: cause.message, code: cause.code === 'safety' ? 'invalid-output' : cause.code}));
    return;
  }
  if (cause instanceof z.ZodError) {
    response.statusCode = 400;
    response.end(JSON.stringify({error: 'The analysis request was malformed.', code: 'invalid-request'}));
    return;
  }
  if (cause instanceof SyntaxError) {
    response.statusCode = 400;
    response.end(JSON.stringify({error: 'The request body was not valid JSON.', code: 'invalid-request'}));
    return;
  }
  response.statusCode = 500;
  response.end(JSON.stringify({error: 'Unexpected server error during analysis.', code: 'unknown'}));
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
