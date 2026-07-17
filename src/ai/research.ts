import {z} from 'zod';

/**
 * Company-and-role research only. This request intentionally carries NO CV or
 * contact data — only the public company name, role title, and public job text.
 */
export const companyResearchInputSchema = z.object({
  company: z.string().trim().min(1).max(200),
  role: z.string().trim().max(200).optional(),
  jobText: z.string().max(6_000).optional(),
}).strict();

export type CompanyResearchInput = z.infer<typeof companyResearchInputSchema>;

const sourceSchema = z.object({
  title: z.string().trim().min(1).max(200),
  url: z.string().trim().url(),
}).strict();

/** A cited company briefing. Requires at least one grounded source. */
export const groundedCompanyBriefSchema = z.object({
  company: z.string().min(1).max(200),
  summary: z.string().min(1).max(700),
  priorities: z.array(z.string().min(1).max(240)).max(5),
  roleContext: z.string().max(700),
  sources: z.array(sourceSchema).min(1).max(8),
}).strict();

export type GroundedCompanyBrief = z.infer<typeof groundedCompanyBriefSchema>;
export type ResearchSource = z.infer<typeof sourceSchema>;

/** Sources that would surface individuals or social profiles are excluded. */
const EXCLUDED_SOURCE_PATTERN = /\b(linkedin|facebook|instagram|tiktok|x\.com|twitter|threads|glassdoor\/reviews)\b/i;

export function isExcludedSource(source: ResearchSource): boolean {
  return EXCLUDED_SOURCE_PATTERN.test(source.title) || EXCLUDED_SOURCE_PATTERN.test(source.url);
}

export function buildCompanyResearchPrompt(input: CompanyResearchInput): string {
  const roleClause = input.role ? ` for a "${input.role}" role` : '';
  const jobClause = input.jobText
    ? `\n\nFor relevance, the public job posting says:\n"""\n${input.jobText.slice(0, 3_000)}\n"""`
    : '';
  return `Research the company "${input.company}"${roleClause} using current web search results. Focus on what the company does, its products or market, recent news and current priorities, and what it likely values for this role. Do NOT research, name, or profile individual employees, and do not return social-network or personal-profile results.

Return ONLY minified JSON in this exact shape, with no prose before or after:
{"summary":"1-3 sentence overview","priorities":["a current priority or signal", "..."],"roleContext":"what the company likely values for this role"}

Rules: base every statement on the search results and do not invent facts. Provide at most 5 priorities. Keep the summary and roleContext concise.${jobClause}`;
}

/**
 * Parses the model's grounded text into a validated brief and attaches the real
 * web sources returned by Google Search grounding (excluding social profiles).
 * Throws if the output is unusable or has no citable, non-social source.
 */
export function parseCompanyBrief(rawText: string, sources: ResearchSource[], company: string): GroundedCompanyBrief {
  const usableSources = sources.filter(source => !isExcludedSource(source)).slice(0, 8);
  if (usableSources.length === 0) throw new Error('No citable company sources were found. Showing job-only preparation instead.');

  const model = modelBriefSchema.parse(extractJsonObject(rawText));
  const brief = {
    company: company.slice(0, 200),
    summary: model.summary.trim().slice(0, 700),
    priorities: model.priorities.map(item => item.trim()).filter(Boolean).slice(0, 5).map(item => item.slice(0, 240)),
    roleContext: (model.roleContext ?? '').trim().slice(0, 700),
    sources: usableSources,
  };
  return groundedCompanyBriefSchema.parse(brief);
}

const modelBriefSchema = z.object({
  summary: z.string().min(1),
  priorities: z.array(z.string()).default([]),
  roleContext: z.string().default(''),
});

function extractJsonObject(raw: string): unknown {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) throw new Error('The research response did not contain JSON.');
  return JSON.parse(cleaned.slice(start, end + 1)) as unknown;
}
