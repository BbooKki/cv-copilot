import {describe, expect, it} from 'vitest';
import {buildPeopleResearchPrompt, parsePublicPeople, peopleResearchInputSchema, type PeopleResearchInput} from './peopleResearch';

const input: PeopleResearchInput = {
  company: 'Acme',
  role: 'Frontend Engineer',
  officialSources: [{id: 'brief-source', title: 'Acme Careers', url: 'https://acme.com/careers'}],
};

describe('public people research', () => {
  it('builds a bounded official-only search prompt without CV or contact data', () => {
    const prompt = buildPeopleResearchPrompt(input);
    expect(prompt).toContain('Acme');
    expect(prompt).toContain('Frontend Engineer');
    expect(prompt).toMatch(/first-party company team, leadership, careers, and newsroom/i);
    expect(prompt).toMatch(/never return email addresses, phone numbers, social-profile links/i);
    expect(prompt).not.toContain('CV_FACTS');
    expect(prompt.match(/RESEARCH_DATA_END/g)).toHaveLength(1);
  });

  it('returns a cited person published on an official company page', () => {
    const raw = 'PERSON_MANAGER: Jane Doe | VP of Engineering';
    const result = parsePublicPeople(raw, [
      {id: 'source-0', title: 'Acme Leadership', url: 'https://acme.com/team/jane-doe'},
    ], supportFor(raw, raw), input);

    expect(result.people).toEqual([{name: 'Jane Doe', role: 'VP of Engineering', category: 'hiring-manager', citationIds: ['source-0']}]);
    expect(result.sources).toHaveLength(1);
  });

  it('drops identities supported only by third-party or social sources', () => {
    const raw = 'PERSON_RECRUITER: Jane Doe | Talent Partner';
    const result = parsePublicPeople(raw, [
      {id: 'source-0', title: 'LinkedIn', url: 'https://linkedin.com/in/jane-doe'},
      {id: 'source-1', title: 'Industry directory', url: 'https://example.com/acme/jane-doe'},
    ], [
      ...supportFor(raw, raw, 'source-0'),
      ...supportFor(raw, raw, 'source-1'),
    ], input);

    expect(result).toEqual({company: 'Acme', people: [], sources: []});
  });

  it('drops contact details, uncited lines, and duplicate names while capping results', () => {
    const lines = [
      'PERSON_RECRUITER: Jane Doe | Talent Partner jane@acme.com',
      'PERSON_MANAGER: Alex One | Engineering Director',
      'PERSON_PEER: alex one | Staff Engineer',
      'PERSON_PEER: Bea Two | Frontend Engineer',
      'PERSON_PEER: Cam Three | Frontend Engineer',
      'PERSON_PEER: Dev Four | Frontend Engineer',
      'PERSON_PEER: Eli Five | Frontend Engineer',
      'PERSON_PEER: Fay Six | Frontend Engineer',
      'PERSON_PEER: No Citation | Frontend Engineer',
    ];
    const raw = lines.join('\n');
    const supported = lines.slice(0, -1).flatMap(line => supportFor(raw, line));
    const result = parsePublicPeople(raw, [{id: 'source-0', title: 'Acme Team', url: 'https://acme.com/team'}], supported, input);

    expect(result.people).toHaveLength(5);
    expect(result.people.map(person => person.name)).toEqual(['Alex One', 'Bea Two', 'Cam Three', 'Dev Four', 'Eli Five']);
  });

  it('accepts a non-Latin company when the first-party title identifies it', () => {
    expect(() => peopleResearchInputSchema.parse({
      company: '카카오',
      role: '프론트엔드 개발자',
      officialSources: [{id: 'source-0', title: '카카오', url: 'https://www.kakaocorp.com/page'}],
    })).not.toThrow();
  });

  it('rejects third-party source hints before prompting', () => {
    expect(() => peopleResearchInputSchema.parse({
      company: 'Acme',
      officialSources: [{id: 'source-0', title: 'Company directory', url: 'https://example.com/acme'}],
    })).toThrow(/first-party/i);
  });
});

function supportFor(raw: string, claim: string, sourceId = 'source-0') {
  const startIndex = raw.indexOf(claim);
  return [{startIndex, endIndex: startIndex + claim.length, text: claim, sourceIds: [sourceId]}];
}
