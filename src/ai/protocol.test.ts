import {describe, expect, it} from 'vitest';
import {createBlankCv} from '../cv/blank';
import {ANALYSIS_CV_CHAR_LIMIT, ANALYSIS_JOB_CHAR_LIMIT, buildAnalysisPrompt, parseAiResult} from './protocol';

describe('AI analysis protocol', () => {
  it('builds a bounded prompt without contact or presentation metadata', () => {
    const document = createBlankCv();
    document.basics.fullName = 'Private Person';
    document.basics.email = 'private@example.com';
    document.basics.phone = '+1 555 0100';
    document.basics.headline = 'TypeScript engineer';
    document.summary = `Builds reliable browser applications. ${'s'.repeat(650)}`;
    document.experience = Array.from({length: 10}, (_, index) => ({
      id: `experience-${index}`,
      company: `Company ${index}`,
      role: 'Software Engineer',
      startDate: '2020',
      current: index === 0,
      highlights: Array.from({length: 4}, (__, highlightIndex) => ({id: `highlight-${index}-${highlightIndex}`, text: `Delivered verified product work ${'x'.repeat(260)}`})),
    }));
    document.projects = Array.from({length: 4}, (_, index) => ({id: `project-${index}`, name: `Project ${index}`, description: 'Verified project detail '.repeat(25), technologies: ['TypeScript'], highlights: []}));
    document.education = Array.from({length: 4}, (_, index) => ({id: `education-${index}`, institution: `University ${index}`, qualification: 'Degree program', highlights: []}));
    document.skills = Array.from({length: 8}, (_, index) => ({id: `skill-${index}`, name: `Group ${index}`, keywords: ['TypeScript', 'React', 'Testing']}));
    const prompt = buildAnalysisPrompt({protocolVersion: 1, cv: document, job: {source: 'pasted', text: 'Job requirement '.repeat(1_000)}, options: {maxSuggestions: 8, language: 'en'}});
    const cvFacts = between(prompt, 'CV_FACTS_BEGIN\n', '\nCV_FACTS_END');
    const jobData = between(prompt, 'JOB_DATA_BEGIN\n', '\nJOB_DATA_END');

    expect(cvFacts.length).toBeLessThanOrEqual(ANALYSIS_CV_CHAR_LIMIT);
    expect(jobData.length).toBeLessThanOrEqual(ANALYSIS_JOB_CHAR_LIMIT);
    expect(prompt.length).toBeLessThan(11_000);
    expect(prompt).not.toContain('private@example.com');
    expect(prompt).not.toContain('+1 555 0100');
    expect(prompt).not.toContain('templateId');
    expect(prompt).toContain('Return at most 3 suggestions');
    expect(() => JSON.parse(cvFacts)).not.toThrow();
  });

  it('adds an explicit smaller JSON repair instruction', () => {
    const prompt = buildAnalysisPrompt({protocolVersion: 1, cv: createBlankCv(), job: {source: 'pasted', text: 'A meaningful job description with enough detail to analyze.'}, options: {maxSuggestions: 3, language: 'en'}}, {repair: true});
    expect(prompt).toContain('previous response was invalid or incomplete JSON');
    expect(prompt).toContain('never truncate JSON');
  });

  it('parses a complete minimal response and rejects truncated JSON', () => {
    expect(parseAiResult('{"protocolVersion":1,"fitSummary":"Limited evidence.","matchedRequirements":[],"gaps":[],"suggestions":[],"warnings":[]}').fitSummary).toBe('Limited evidence.');
    expect(() => parseAiResult('{"protocolVersion":1,"fitSummary":"Cut off","matchedRequirements":[')).toThrow();
  });
});

function between(value: string, start: string, end: string): string {
  return value.slice(value.indexOf(start) + start.length, value.indexOf(end));
}
