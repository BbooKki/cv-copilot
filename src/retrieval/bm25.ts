import {tokenize} from './text';

export type ScoredId = {id: string; score: number};

/** Okapi BM25 over short passages. Small enough to rebuild on every search. */
export function bm25Rank(documents: Array<{id: string; text: string}>, query: string, {k1 = 1.2, b = 0.75} = {}): ScoredId[] {
  if (documents.length === 0) return [];
  const docTokens = documents.map(document => tokenize(document.text));
  const averageLength = docTokens.reduce((sum, tokens) => sum + tokens.length, 0) / documents.length || 1;
  const documentFrequency = new Map<string, number>();
  for (const tokens of docTokens) for (const term of new Set(tokens)) documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);

  const queryTerms = new Set(tokenize(query));
  const scored = documents.map((document, index) => {
    const tokens = docTokens[index]!;
    const termFrequency = new Map<string, number>();
    for (const term of tokens) termFrequency.set(term, (termFrequency.get(term) ?? 0) + 1);
    let score = 0;
    for (const term of queryTerms) {
      const frequency = termFrequency.get(term);
      if (!frequency) continue;
      const df = documentFrequency.get(term) ?? 0;
      const idf = Math.log(1 + (documents.length - df + 0.5) / (df + 0.5));
      score += idf * (frequency * (k1 + 1)) / (frequency + k1 * (1 - b + b * (tokens.length / averageLength)));
    }
    return {id: document.id, score};
  });
  return scored.filter(entry => entry.score > 0).sort((left, right) => right.score - left.score);
}
