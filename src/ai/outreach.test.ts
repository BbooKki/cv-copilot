import {describe, expect, it} from 'vitest';
import {buildOutreachPrompt, parseOutreachKit} from './outreach';
import {testCv} from '../cv/testFixture';

describe('outreach kit', () => {
  it('builds a prompt with CV facts, placeholders guidance, and the job envelope', () => {
    const prompt = buildOutreachPrompt({protocolVersion: 1, cv: testCv, job: {title: 'Frontend Engineer', company: 'Acme', text: 'Build accessible React apps.'}});
    expect(prompt).toContain('Frontend Engineer');
    expect(prompt).toContain('Acme');
    expect(prompt).toMatch(/bracketed placeholders/i);
    expect(prompt).toContain('CV_FACTS_BEGIN');
  });

  it('falls back to bracket placeholders when company/role are absent', () => {
    const prompt = buildOutreachPrompt({protocolVersion: 1, cv: testCv, job: {text: 'A role.'}});
    expect(prompt).toContain('[Company]');
    expect(prompt).toContain('[Role]');
  });

  it('parses a valid outreach kit', () => {
    const kit = parseOutreachKit(JSON.stringify({
      protocolVersion: 1,
      recruiterIntro: {subject: 'Interest in the role', body: 'Hello [Hiring Manager], ...'},
      followUp: {subject: 'Thank you', body: 'Thanks for your time, [Name].'},
    }));
    expect(kit.recruiterIntro.subject).toContain('Interest');
    expect(kit.followUp.body).toContain('Thanks');
  });

  it('rejects a kit missing an email', () => {
    expect(() => parseOutreachKit(JSON.stringify({protocolVersion: 1, recruiterIntro: {subject: 'x', body: 'y'}}))).toThrow();
  });
});
