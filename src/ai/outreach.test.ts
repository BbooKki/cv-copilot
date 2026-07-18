import {describe, expect, it} from 'vitest';
import {buildVerifiedOutreachKit, parseOutreachKit} from './outreach';
import {testCv} from '../cv/testFixture';

describe('outreach kit', () => {
  it('builds truthful drafts locally from exact CV facts', () => {
    const kit = buildVerifiedOutreachKit({protocolVersion: 1, cv: testCv, job: {title: 'Frontend Engineer', company: 'Acme', text: 'Build accessible React apps.'}});
    expect(kit.recruiterIntro.subject).toContain('Frontend Engineer');
    expect(kit.recruiterIntro.subject).toContain('Acme');
    expect(kit.recruiterIntro.body).toContain('Product Engineer at Northstar Labs');
    expect(kit.recruiterIntro.body).toContain('[Recruiter Name]');
    expect(kit.hiringManagerIntro.body).toContain('[Hiring Manager]');
    expect(kit.peerIntro.body).toContain('[Team Member]');
  });

  it('falls back to bracket placeholders when company/role are absent', () => {
    const kit = buildVerifiedOutreachKit({protocolVersion: 1, cv: testCv, job: {text: 'A role.'}});
    expect(kit.recruiterIntro.subject).toContain('[Company]');
    expect(kit.recruiterIntro.subject).toContain('[Role]');
  });

  it('parses a valid outreach kit', () => {
    const kit = parseOutreachKit(JSON.stringify({
      protocolVersion: 1,
      recruiterIntro: {subject: 'Interest in the role', body: 'Hello [Recruiter Name], ...'},
      hiringManagerIntro: {subject: 'Team priorities', body: 'Hello [Hiring Manager], ...'},
      peerIntro: {subject: 'Team question', body: 'Hello [Team Member], ...'},
      followUp: {subject: 'Thank you', body: 'Thanks for your time, [Name].'},
    }));
    expect(kit.recruiterIntro.subject).toContain('Interest');
    expect(kit.hiringManagerIntro.subject).toContain('priorities');
    expect(kit.peerIntro.body).toContain('[Team Member]');
    expect(kit.followUp.body).toContain('Thanks');
  });

  it('rejects a kit missing an email', () => {
    expect(() => parseOutreachKit(JSON.stringify({protocolVersion: 1, recruiterIntro: {subject: 'x', body: 'y'}}))).toThrow();
  });
});
