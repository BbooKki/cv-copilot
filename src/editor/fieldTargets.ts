import type {CvDocument} from '../cv/schema';
import {touchDocument} from '../cv/schema';

/**
 * The closed set of CV locations that can be edited directly from the preview.
 * Intentionally limited to free-text fields (summary, experience bullets,
 * project description and bullets) — never companies, dates, or IDs.
 */
export type CvFieldTarget =
  | {kind: 'summary'}
  | {kind: 'experience-highlight'; itemId: string; highlightId: string}
  | {kind: 'project-description'; itemId: string}
  | {kind: 'project-highlight'; itemId: string; highlightId: string};

/** Returns the current text of a target, or null if it no longer exists. */
export function readField(document: CvDocument, target: CvFieldTarget): string | null {
  switch (target.kind) {
    case 'summary':
      return document.summary ?? '';
    case 'experience-highlight':
      return document.experience.find(item => item.id === target.itemId)?.highlights.find(highlight => highlight.id === target.highlightId)?.text ?? null;
    case 'project-description': {
      const project = document.projects.find(item => item.id === target.itemId);
      return project ? project.description ?? '' : null;
    }
    case 'project-highlight':
      return document.projects.find(item => item.id === target.itemId)?.highlights.find(highlight => highlight.id === target.highlightId)?.text ?? null;
  }
}

/** Returns a new document with the target's text replaced. Throws if the target is gone. */
export function writeField(document: CvDocument, target: CvFieldTarget, value: string): CvDocument {
  const next = structuredClone(document);
  switch (target.kind) {
    case 'summary':
      next.summary = value;
      break;
    case 'experience-highlight': {
      const highlight = next.experience.find(item => item.id === target.itemId)?.highlights.find(entry => entry.id === target.highlightId);
      if (!highlight) throw new Error('This field no longer exists.');
      highlight.text = value;
      break;
    }
    case 'project-description': {
      const project = next.projects.find(item => item.id === target.itemId);
      if (!project) throw new Error('This field no longer exists.');
      project.description = value;
      break;
    }
    case 'project-highlight': {
      const highlight = next.projects.find(item => item.id === target.itemId)?.highlights.find(entry => entry.id === target.highlightId);
      if (!highlight) throw new Error('This field no longer exists.');
      highlight.text = value;
      break;
    }
  }
  return touchDocument(next);
}

export function fieldLabel(target: CvFieldTarget): string {
  switch (target.kind) {
    case 'summary':
      return 'Profile summary';
    case 'experience-highlight':
      return 'Experience bullet';
    case 'project-description':
      return 'Project description';
    case 'project-highlight':
      return 'Project bullet';
  }
}
