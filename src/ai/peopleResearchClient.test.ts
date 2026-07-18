import {afterEach, describe, expect, it, vi} from 'vitest';
import {researchPublicPeople} from './peopleResearchClient';

afterEach(() => vi.unstubAllGlobals());

const input = {
  company: 'Acme',
  role: 'Frontend Engineer',
  officialSources: [{id: 'source-0', title: 'Acme Careers', url: 'https://acme.com/careers'}],
};

describe('researchPublicPeople', () => {
  it('posts only the public research envelope and validates the response', async () => {
    const payload = {
      company: 'Acme',
      people: [{name: 'Jane Doe', role: 'Engineering Director', category: 'hiring-manager', citationIds: ['source-0']}],
      sources: [{id: 'source-0', title: 'Acme Team', url: 'https://acme.com/team'}],
    };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), {status: 200}));
    vi.stubGlobal('fetch', fetchMock);

    const result = await researchPublicPeople(input);

    expect(result.people[0]?.name).toBe('Jane Doe');
    const body = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body));
    expect(body.operation).toBe('research-people');
    expect(JSON.stringify(body)).not.toContain('cv');
  });

  it('rejects an invalid server result', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({company: 'Acme', people: [{name: 'Uncited'}], sources: []}), {status: 200})));
    await expect(researchPublicPeople(input)).rejects.toMatchObject({code: 'invalid-output'});
  });
});
