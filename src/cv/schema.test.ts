import {describe, expect, it} from 'vitest';
import {cvDocumentSchema} from './schema';
import {sampleCv} from './sample';

describe('cvDocumentSchema', () => {
  it('accepts the deterministic sample', () => {
    expect(cvDocumentSchema.parse(sampleCv)).toEqual(sampleCv);
  });

  it('rejects unsafe website protocols', () => {
    const result = cvDocumentSchema.safeParse({...sampleCv, basics: {...sampleCv.basics, website: 'javascript:alert(1)'}});
    expect(result.success).toBe(false);
  });

  it('rejects duplicate collection IDs', () => {
    const result = cvDocumentSchema.safeParse({...sampleCv, skills: [sampleCv.skills[0], sampleCv.skills[0]]});
    expect(result.success).toBe(false);
  });
});
