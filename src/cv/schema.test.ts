import {describe, expect, it} from 'vitest';
import {cvDocumentSchema} from './schema';
import {testCv} from './testFixture';

describe('cvDocumentSchema', () => {
  it('accepts the deterministic sample', () => {
    expect(cvDocumentSchema.parse(testCv)).toEqual(testCv);
  });

  it('rejects unsafe website protocols', () => {
    const result = cvDocumentSchema.safeParse({...testCv, basics: {...testCv.basics, website: 'javascript:alert(1)'}});
    expect(result.success).toBe(false);
  });

  it('rejects duplicate collection IDs', () => {
    const result = cvDocumentSchema.safeParse({...testCv, skills: [testCv.skills[0], testCv.skills[0]]});
    expect(result.success).toBe(false);
  });
});
