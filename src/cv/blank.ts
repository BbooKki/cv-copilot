import type {CvDocument} from './schema';
import {makeId} from './schema';

export function createBlankCv(): CvDocument {
  return {
    schemaVersion: 1,
    id: makeId('cv'),
    title: '',
    basics: {
      fullName: '',
      links: [],
    },
    experience: [],
    education: [],
    projects: [],
    skills: [],
    languages: [],
    customSections: [],
    settings: {templateId: 'modern', accentColor: '#262626', pageSize: 'A4'},
    updatedAt: new Date().toISOString(),
  };
}

export function hasCvContent(document: CvDocument): boolean {
  return Boolean(
    document.basics.fullName.trim()
    || document.basics.headline?.trim()
    || document.basics.email?.trim()
    || document.basics.phone?.trim()
    || document.basics.location?.trim()
    || document.basics.website?.trim()
    || document.summary?.trim()
    || document.experience.some(item => item.company.trim() || item.role.trim() || item.startDate.trim() || item.highlights.some(highlight => highlight.text.trim()))
    || document.education.some(item => item.institution.trim() || item.qualification.trim() || item.field?.trim())
    || document.projects.some(item => item.name.trim() || item.description?.trim() || item.technologies.length || item.highlights.some(highlight => highlight.text.trim()))
    || document.skills.some(item => item.name.trim() || item.keywords.length)
    || document.languages.some(item => item.language.trim() || item.proficiency?.trim()),
  );
}
