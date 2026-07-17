import {describe, expect, it} from 'vitest';
import {fieldLabel, readField, writeField, type CvFieldTarget} from './fieldTargets';
import {testCv} from '../cv/testFixture';

describe('preview field targets', () => {
  it('reads summary, experience bullets, and project fields', () => {
    expect(readField(testCv, {kind: 'summary'})).toContain('Product engineer');
    expect(readField(testCv, {kind: 'experience-highlight', itemId: 'exp-northstar', highlightId: 'hl-delivery'})).toContain('workflow tools');
    expect(readField(testCv, {kind: 'project-description', itemId: 'project-atlas'})).toContain('accessible dashboard');
    expect(readField(testCv, {kind: 'project-highlight', itemId: 'project-atlas', highlightId: 'hl-atlas'})).toContain('reusable component');
  });

  it('returns null for a missing target', () => {
    expect(readField(testCv, {kind: 'experience-highlight', itemId: 'nope', highlightId: 'nope'})).toBeNull();
  });

  it('writes a new value without mutating the original and bumps updatedAt', () => {
    const target: CvFieldTarget = {kind: 'experience-highlight', itemId: 'exp-northstar', highlightId: 'hl-delivery'};
    const next = writeField(testCv, target, 'Rewrote this bullet.');
    expect(readField(next, target)).toBe('Rewrote this bullet.');
    expect(readField(testCv, target)).toContain('workflow tools');
    expect(next.updatedAt).not.toBe(testCv.updatedAt);
  });

  it('throws when writing to a missing target', () => {
    expect(() => writeField(testCv, {kind: 'project-description', itemId: 'gone'}, 'x')).toThrow(/no longer exists/);
  });

  it('labels every target kind', () => {
    expect(fieldLabel({kind: 'summary'})).toBe('Profile summary');
    expect(fieldLabel({kind: 'project-highlight', itemId: 'a', highlightId: 'b'})).toBe('Project bullet');
  });
});
