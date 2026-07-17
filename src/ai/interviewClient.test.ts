import {afterEach, describe, expect, it, vi} from 'vitest';
import {buildInterviewKit} from './interviewClient';
import type {InterviewKit, InterviewKitRequest} from './interview';
import {testCv} from '../cv/testFixture';

afterEach(() => vi.unstubAllGlobals());

const request: InterviewKitRequest = {
  protocolVersion: 1,
  cv: testCv,
  job: {title: 'Frontend Engineer', company: 'Acme', text: 'Build accessible React apps.'},
};

const kit: InterviewKit = {
  protocolVersion: 1,
  questions: [{question: 'Walk me through a dashboard you built.', rationale: 'Role needs dashboard work.'}],
  questionsToAsk: ['How is the team structured?'],
  pitch: {text: 'Product engineer with accessible dashboard experience.', evidenceIds: ['exp-northstar']},
};

describe('buildInterviewKit', () => {
  it('sends a redacted CV under the build-interview-kit operation', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(kit), {status: 200}));
    vi.stubGlobal('fetch', fetchMock);

    const result = await buildInterviewKit(request);

    expect(result.pitch.evidenceIds).toEqual(['exp-northstar']);
    const body = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body));
    expect(body.operation).toBe('build-interview-kit');
    expect(body.request.cv.basics.fullName).toBe('');
    expect(body.request.cv.experience[0].id).toBe('exp-northstar');
  });

  it('rejects an unreadable response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({protocolVersion: 1}), {status: 200})));
    await expect(buildInterviewKit(request)).rejects.toMatchObject({code: 'invalid-output'});
  });
});
