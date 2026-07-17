import type {CvDocument} from '../cv/schema';
import type {CvFieldTarget} from '../editor/fieldTargets';

export type TemplateProps = {
  document: CvDocument;
  onEditField?: (target: CvFieldTarget) => void;
};

export function dateRange(start?: string, end?: string, current?: boolean): string {
  return [start, current ? 'Present' : end].filter(Boolean).join(' — ');
}

export function getTemplateData(document: CvDocument) {
  return {
    experience: document.experience.filter(item => item.company || item.role || item.startDate || item.highlights.some(highlight => highlight.text)),
    education: document.education.filter(item => item.institution || item.qualification || item.field || item.highlights.some(highlight => highlight.text)),
    projects: document.projects.filter(item => item.name || item.description || item.technologies.length || item.highlights.some(highlight => highlight.text)),
    skills: document.skills.filter(item => item.name || item.keywords.length),
    languages: document.languages.filter(item => item.language || item.proficiency),
    customSections: document.customSections.filter(section => section.items.length > 0),
  };
}

export function contactValues(document: CvDocument): string[] {
  return [
    document.basics.email,
    document.basics.phone,
    document.basics.location,
    document.basics.website,
    ...document.basics.links.map(link => `${link.label}: ${link.url}`),
  ].filter((value): value is string => Boolean(value));
}
