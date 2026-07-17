import type {CvDocument} from '../cv/schema';

export type TemplateId = CvDocument['settings']['templateId'];

export const TEMPLATE_OPTIONS = [
  {id: 'classic', name: 'Classic ATS', description: 'Elegant single-column clarity and dependable parsing.'},
  {id: 'modern', name: 'Modern Editorial', description: 'Asymmetric hierarchy with a refined editorial voice.'},
  {id: 'sidebar', name: 'Professional Sidebar', description: 'Structured two-column layout with restrained contrast.'},
  {id: 'minimal', name: 'Minimal Technical', description: 'Precise, compact typography for technical profiles.'},
] as const satisfies ReadonlyArray<{id: TemplateId; name: string; description: string}>;

export function templateName(templateId: TemplateId): string {
  return TEMPLATE_OPTIONS.find(template => template.id === templateId)?.name ?? 'Classic ATS';
}
