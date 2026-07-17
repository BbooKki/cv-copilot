import type {CvDocument} from '../cv/schema';
import type {AiSuggestion} from './protocol';

export type SuggestionPatch = {suggestionId: string; previous: string; next: string};

function resolveText(document: CvDocument, suggestion: AiSuggestion): string | null {
  const {section, itemId, highlightId, field} = suggestion.target;
  if (section === 'summary') return document.summary ?? '';
  const collection = document[section];
  const item = collection.find(entry => entry.id === itemId);
  if (!item) return null;
  if (highlightId && 'highlights' in item) return item.highlights.find(highlight => highlight.id === highlightId)?.text ?? null;
  const value = item[field as keyof typeof item];
  return typeof value === 'string' ? value : null;
}

export function validateSuggestionTarget(document: CvDocument, suggestion: AiSuggestion): boolean {
  return resolveText(document, suggestion) === suggestion.originalText;
}

export function applySuggestion(document: CvDocument, suggestion: AiSuggestion): {document: CvDocument; patch: SuggestionPatch} {
  if (!validateSuggestionTarget(document, suggestion)) throw new Error('This suggestion is stale or targets a missing field.');
  const next = structuredClone(document);
  const {section, itemId, highlightId, field} = suggestion.target;
  if (section === 'summary') next.summary = suggestion.proposedText;
  else {
    const item = next[section].find(entry => entry.id === itemId);
    if (!item) throw new Error('Suggestion target is missing.');
    if (highlightId && 'highlights' in item) {
      const highlight = item.highlights.find(entry => entry.id === highlightId);
      if (!highlight) throw new Error('Suggestion highlight is missing.');
      highlight.text = suggestion.proposedText;
    } else {
      (item as unknown as Record<string, unknown>)[field] = suggestion.proposedText;
    }
  }
  next.updatedAt = new Date().toISOString();
  return {document: next, patch: {suggestionId: suggestion.id, previous: suggestion.originalText, next: suggestion.proposedText}};
}

export function createDemoAnalysis(document: CvDocument): import('./protocol').AiAnalysisResult {
  const first = document.experience[0]?.highlights[0];
  return {
    protocolVersion: 1,
    fitSummary: 'Your CV shows strong alignment in TypeScript, full-stack delivery, real-time systems, and mobile development. The strongest improvement is to make existing evidence more role-specific and concise.',
    matchedRequirements: [
      {requirement: 'TypeScript and Node.js', evidence: 'Backend skills list and NestJS delivery experience.', cvItemId: 'skill-backend'},
      {requirement: 'Real-time product development', evidence: 'Medical dashboard and Socket.IO streaming experience.', cvItemId: 'hl-dashboard'},
    ],
    gaps: [{requirement: 'Formal team-management experience', explanation: 'The CV shows technical leadership but does not state people-management responsibility.', resolvableFromExistingFacts: false}],
    suggestions: first ? [{
      id: 'demo-suggestion-1',
      target: {section: 'experience', itemId: document.experience[0].id, highlightId: first.id, field: 'text'},
      originalText: first.text,
      proposedText: first.text.replace('Led development and operation of', 'Led end-to-end delivery and operation of'),
      reason: 'Clarifies ownership while preserving the existing scope and number of applications.',
      evidenceIds: [document.experience[0].id, first.id],
    }] : [],
    warnings: ['Demo analysis is deterministic and does not replace the local Gemma analysis.'],
  };
}
