import {describe, expect, it} from 'vitest';
import {redactCvForCloud} from './redact';
import {testCv} from '../cv/testFixture';

describe('redactCvForCloud', () => {
  it('removes contact details before cloud analysis', () => {
    const redacted = redactCvForCloud(testCv);
    expect(redacted.basics.fullName).toBe('');
    expect(redacted.title).toBe('');
    expect(redacted.basics.email).toBe('');
    expect(redacted.basics.phone).toBeUndefined();
    expect(redacted.basics.location).toBeUndefined();
    expect(redacted.basics.website).toBe('');
    expect(redacted.basics.links).toEqual([]);
  });

  it('preserves employment content and item IDs used for grounding', () => {
    const redacted = redactCvForCloud(testCv);
    expect(redacted.experience[0]?.company).toBe('Northstar Labs');
    expect(redacted.experience[0]?.id).toBe('exp-northstar');
    expect(redacted.experience[0]?.highlights[0]?.id).toBe('hl-delivery');
    expect(redacted.projects[0]?.id).toBe('project-atlas');
  });

  it('does not mutate the original document', () => {
    redactCvForCloud(testCv);
    expect(testCv.basics.fullName).toBe('Alex Morgan');
    expect(testCv.basics.links).toHaveLength(1);
  });
});
