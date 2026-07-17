import {z} from 'zod';
import type {CvDocument} from '../cv/schema';

const emailSchema = z.object({
  subject: z.string().min(1).max(160),
  body: z.string().min(1).max(1_600),
}).strict();

export const outreachKitSchema = z.object({
  protocolVersion: z.literal(1),
  recruiterIntro: emailSchema,
  followUp: emailSchema,
}).strict();

export type OutreachKit = z.infer<typeof outreachKitSchema>;

export type OutreachRequest = {
  protocolVersion: 1;
  cv: CvDocument;
  job: {title?: string; company?: string; text: string};
};

export function parseOutreachKit(raw: string): OutreachKit {
  return outreachKitSchema.parse(parseJson(raw));
}

/**
 * Builds safe outreach templates locally. No model call is needed, so these
 * drafts cannot consume quota or introduce facts that are absent from the CV.
 */
export function buildVerifiedOutreachKit(request: OutreachRequest): OutreachKit {
  const role = cleanLabel(request.job.title, '[Role]');
  const company = cleanLabel(request.job.company, '[Company]');
  const facts = collectOutreachFacts(request.cv);
  const evidence = facts.length > 0
    ? `My background includes ${facts.join(' ')}`
    : 'I would be glad to share relevant examples from my background.';
  return outreachKitSchema.parse({
    protocolVersion: 1,
    recruiterIntro: {
      subject: `Interest in ${role} at ${company}`,
      body: `Hello [Hiring Manager],\n\nI'm reaching out about the ${role} opportunity at ${company}. ${evidence}\n\nI'd welcome the opportunity to discuss how this experience could support the team.\n\nBest,\n[Your Name]`,
    },
    followUp: {
      subject: `Thank you — ${role} conversation`,
      body: `Hello [Interviewer Name],\n\nThank you for speaking with me about the ${role} opportunity at ${company}. I appreciated learning more about [specific detail from the conversation]. ${evidence}\n\nI remain interested in the role and would be happy to provide any additional information.\n\nBest,\n[Your Name]`,
    },
  });
}

function collectOutreachFacts(document: CvDocument): string[] {
  const facts: string[] = [];
  const headline = document.basics.headline?.trim();
  if (headline) facts.push(`the professional focus "${headline}".`);
  const experience = document.experience.find(item => item.role.trim() || item.company.trim());
  if (experience) {
    const roleAndCompany = [experience.role.trim(), experience.company.trim()].filter(Boolean).join(' at ');
    if (roleAndCompany) facts.push(`experience as ${roleAndCompany}.`);
    const highlight = experience.highlights.find(item => item.text.trim())?.text.trim();
    if (highlight) facts.push(ensureSentence(highlight));
  }
  const project = document.projects.find(item => item.name.trim() || item.description?.trim());
  if (project) {
    const projectFact = [project.name.trim(), project.description?.trim()].filter(Boolean).join(': ');
    if (projectFact) facts.push(ensureSentence(projectFact));
  }
  return facts.slice(0, 3);
}

function cleanLabel(value: string | undefined, fallback: string): string {
  const normalized = value?.replace(/[\r\n\t]/g, ' ').replace(/[<>]/g, '').trim().slice(0, 120);
  return normalized || fallback;
}

function ensureSentence(value: string): string {
  return /[.!?]$/.test(value) ? value : `${value}.`;
}

function parseJson(raw: string): unknown {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) throw new Error('The outreach response did not contain JSON.');
  return JSON.parse(cleaned.slice(start, end + 1)) as unknown;
}
