import {z} from 'zod';

const id = z.string().trim().min(1);
const optionalText = z.string().trim().optional();
const safeUrl = z.string().trim().url().refine(value => ['http:', 'https:'].includes(new URL(value).protocol), 'Only HTTP(S) URLs are allowed.');

const draftText = z.string().trim();
const highlightSchema = z.object({id, text: draftText}).strict();

export const cvDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  id,
  title: draftText,
  basics: z.object({
    fullName: draftText,
    headline: optionalText,
    email: z.string().trim().email().optional().or(z.literal('')),
    phone: optionalText,
    location: optionalText,
    website: safeUrl.optional().or(z.literal('')),
    links: z.array(z.object({id, label: z.string().trim().min(1), url: safeUrl}).strict()),
  }).strict(),
  summary: optionalText,
  experience: z.array(z.object({
    id,
    company: draftText,
    role: draftText,
    location: optionalText,
    startDate: draftText,
    endDate: optionalText,
    current: z.boolean(),
    highlights: z.array(highlightSchema),
  }).strict()),
  education: z.array(z.object({
    id,
    institution: draftText,
    qualification: draftText,
    field: optionalText,
    location: optionalText,
    startDate: optionalText,
    endDate: optionalText,
    highlights: z.array(highlightSchema),
  }).strict()),
  projects: z.array(z.object({
    id,
    name: draftText,
    description: optionalText,
    url: safeUrl.optional().or(z.literal('')),
    technologies: z.array(z.string().trim().min(1)),
    highlights: z.array(highlightSchema),
  }).strict()),
  skills: z.array(z.object({id, name: draftText, keywords: z.array(z.string().trim().min(1))}).strict()),
  languages: z.array(z.object({id, language: draftText, proficiency: optionalText}).strict()),
  customSections: z.array(z.object({
    id,
    title: z.string().trim().min(1),
    items: z.array(z.object({id, heading: optionalText, text: z.string().trim().min(1)}).strict()),
  }).strict()),
  settings: z.object({
    templateId: z.enum(['classic', 'modern']),
    accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    pageSize: z.enum(['A4', 'letter']),
  }).strict(),
  updatedAt: z.string().datetime(),
}).strict().superRefine((document, context) => {
  const collections = [
    document.basics.links,
    document.experience,
    document.education,
    document.projects,
    document.skills,
    document.languages,
    document.customSections,
  ];
  for (const collection of collections) {
    const ids = collection.map(item => item.id);
    if (new Set(ids).size !== ids.length) context.addIssue({code: 'custom', message: 'Collection IDs must be unique.'});
  }
});

export type CvDocument = z.infer<typeof cvDocumentSchema>;
export type Experience = CvDocument['experience'][number];
export type Education = CvDocument['education'][number];
export type Project = CvDocument['projects'][number];
export type Skill = CvDocument['skills'][number];

export function makeId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function touchDocument(document: CvDocument): CvDocument {
  return {...document, updatedAt: new Date().toISOString()};
}
