import {describe, expect, it} from 'vitest';
import {createBlankCv, hasCvContent} from './blank';
import {cvDocumentSchema} from './schema';

describe('blank CV', () => {
  it('creates a valid draft without personal placeholder data', () => {
    const document = createBlankCv();

    expect(cvDocumentSchema.parse(document)).toEqual(document);
    expect(document.title).toBe('');
    expect(document.basics.fullName).toBe('');
    expect(document.experience).toEqual([]);
    expect(hasCvContent(document)).toBe(false);
  });

  it('does not treat a newly added blank entry as CV content', () => {
    const document = createBlankCv();
    document.experience.push({id: 'experience-new', company: '', role: '', startDate: '', current: false, highlights: []});

    expect(cvDocumentSchema.parse(document)).toEqual(document);
    expect(hasCvContent(document)).toBe(false);
  });
});
