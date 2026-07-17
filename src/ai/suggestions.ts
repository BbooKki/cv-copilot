import type {CvDocument} from '../cv/schema';
import type {AiFitAnalysisResult, AiSuggestion} from './protocol';

export type SuggestionPatch = {suggestionId: string; previous: string; next: string};

function resolveText(document: CvDocument, suggestion: AiSuggestion): string | null {
  const {section, itemId, highlightId, field} = suggestion.target;
  if (section === 'summary') return field === 'summary' && !itemId && !highlightId ? document.summary ?? '' : null;
  const collection = document[section];
  const item = collection.find(entry => entry.id === itemId);
  if (!item) return null;
  if (highlightId && 'highlights' in item) {
    if (field !== 'text') return null;
    return item.highlights.find(highlight => highlight.id === highlightId)?.text ?? null;
  }
  if (section !== 'projects' || field !== 'description') return null;
  const value = item[field as keyof typeof item];
  return typeof value === 'string' ? value : null;
}

export function validateSuggestionTarget(document: CvDocument, suggestion: AiSuggestion): boolean {
  const knownIds = collectEvidenceIds(document);
  return resolveText(document, suggestion) === suggestion.originalText && suggestion.evidenceIds.length > 0 && suggestion.evidenceIds.every(id => knownIds.has(id)) && hasOnlyKnownNumbers(document, suggestion.proposedText);
}

export function assertSuggestionsAreGrounded(document: CvDocument, suggestions: AiSuggestion[]): void {
  const suggestionIds = new Set<string>();
  const knownIds = collectEvidenceIds(document);
  for (const suggestion of suggestions) {
    if (suggestionIds.has(suggestion.id)) throw new Error(`Suggestion ID ${suggestion.id} is duplicated.`);
    suggestionIds.add(suggestion.id);
    const targetText = resolveText(document, suggestion);
    if (targetText === null) throw new Error(`Suggestion ${suggestion.id} targets a field that cannot be edited by AI.`);
    if (targetText !== suggestion.originalText) throw new Error(`Suggestion ${suggestion.id} does not match the current original text.`);
    if (suggestion.evidenceIds.length === 0) throw new Error(`Suggestion ${suggestion.id} has no supporting CV evidence.`);
    const missingEvidence = suggestion.evidenceIds.find(id => !knownIds.has(id));
    if (missingEvidence) throw new Error(`Suggestion ${suggestion.id} cites unknown evidence ID ${missingEvidence}.`);
    if (!hasOnlyKnownNumbers(document, suggestion.proposedText)) throw new Error(`Suggestion ${suggestion.id} introduces a number that is not present in the CV.`);
  }
}

export function assertFitEvidenceExists(document: CvDocument, fit: AiFitAnalysisResult): void {
  const knownIds = collectEvidenceIds(document);
  for (const match of fit.matchedRequirements) {
    if (match.cvItemId && !knownIds.has(match.cvItemId)) throw new Error(`Matched requirement ${match.requirement} cites unknown CV item ID ${match.cvItemId}.`);
  }
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

export function collectEvidenceIds(document: CvDocument): Set<string> {
  const ids = new Set<string>();
  for (const collection of [document.experience, document.education, document.projects, document.skills, document.languages, document.customSections]) {
    for (const item of collection) {
      ids.add(item.id);
      if ('highlights' in item) for (const highlight of item.highlights) ids.add(highlight.id);
      if ('items' in item) for (const customItem of item.items) ids.add(customItem.id);
    }
  }
  return ids;
}

export function hasOnlyKnownNumbers(document: CvDocument, proposedText: string): boolean {
  const numberPattern = /\b\d+(?:[.,]\d+)*(?:%|x)?\b/gi;
  const knownNumbers = new Set((JSON.stringify(document).match(numberPattern) ?? []).map(value => value.toLowerCase()));
  return (proposedText.match(numberPattern) ?? []).every(value => knownNumbers.has(value.toLowerCase()));
}
