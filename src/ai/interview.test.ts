import {describe, expect, it} from 'vitest';
import {assertInterviewKitGrounded, buildInterviewKitPrompt, parseInterviewKit, type InterviewKit} from './interview';
import {testCv} from '../cv/testFixture';

const validKit: InterviewKit = {
  protocolVersion: 1,
  questions: [{question: 'Tell me about a real-time feature you built.', rationale: 'The role needs real-time dashboard experience.'}],
  questionsToAsk: ['What does success look like in the first 90 days?'],
  pitch: {text: 'I am a product engineer who built accessible dashboards.', evidenceIds: ['exp-northstar']},
};

describe('interview kit', () => {
  it('builds a prompt with CV facts, the job envelope, and grounding rules', () => {
    const prompt = buildInterviewKitPrompt({protocolVersion: 1, cv: testCv, job: {text: 'Frontend role building accessible React apps.'}});
    expect(prompt).toContain('CV_FACTS_BEGIN');
    expect(prompt).toContain('JOB_DATA_BEGIN');
    expect(prompt).toMatch(/never invent skills, dates, metrics/i);
  });

  it('includes optional context when provided', () => {
    const prompt = buildInterviewKitPrompt({protocolVersion: 1, cv: testCv, job: {text: 'Frontend role.'}, context: {fitSummary: 'Strong match.', gaps: ['Testing'], companyPriorities: ['Ship v2']}});
    expect(prompt).toContain('Fit summary: Strong match.');
    expect(prompt).toContain('Company priorities: Ship v2');
  });

  it('parses a valid kit', () => {
    expect(parseInterviewKit(JSON.stringify(validKit)).questions).toHaveLength(1);
  });

  it('accepts a pitch grounded in known CV IDs', () => {
    expect(() => assertInterviewKitGrounded(testCv, validKit)).not.toThrow();
  });

  it('rejects a pitch that cites an unknown CV ID', () => {
    const kit = {...validKit, pitch: {text: 'x', evidenceIds: ['not-a-real-id']}};
    expect(() => assertInterviewKitGrounded(testCv, kit)).toThrow(/unknown CV item ID/);
  });

  it('rejects a pitch that introduces an unknown number', () => {
    const kit = {...validKit, pitch: {text: 'I increased revenue by 999 percent.', evidenceIds: ['exp-northstar']}};
    expect(() => assertInterviewKitGrounded(testCv, kit)).toThrow(/number that is not present/);
  });
});
