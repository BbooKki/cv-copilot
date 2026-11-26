import {entryPassage, type BankEntry} from '../bank/schema';
import {bm25Rank, type ScoredId} from './bm25';

export type Vector = Float32Array | number[];

export type RetrievedEntry = {
  entry: BankEntry;
  /** Reciprocal-rank-fusion score; only meaningful relative to other results. */
  score: number;
  lexicalRank?: number;
  semanticRank?: number;
  /** Best cosine similarity between the entry and any job chunk. */
  semanticSimilarity?: number;
  method: 'hybrid' | 'keyword' | 'semantic';
};

export function cosine(left: Vector, right: Vector): number {
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    const a = left[index]!;
    const b = right[index]!;
    dot += a * b;
    leftNorm += a * a;
    rightNorm += b * b;
  }
  return leftNorm && rightNorm ? dot / Math.sqrt(leftNorm * rightNorm) : 0;
}

/** Scores each entry by its best match against any job chunk (max-sim). */
export function semanticRank(entryVectors: Map<string, Vector>, jobChunkVectors: Vector[], minSimilarity = 0): ScoredId[] {
  const scored: ScoredId[] = [];
  for (const [id, vector] of entryVectors) {
    let best = -1;
    for (const chunk of jobChunkVectors) best = Math.max(best, cosine(vector, chunk));
    if (best >= minSimilarity) scored.push({id, score: best});
  }
  return scored.sort((left, right) => right.score - left.score);
}

/** Reciprocal rank fusion: robust to the different score scales of BM25 and cosine similarity. */
export function reciprocalRankFusion(rankings: ScoredId[][], k = 60): Map<string, number> {
  const fused = new Map<string, number>();
  for (const ranking of rankings) {
    ranking.forEach((item, index) => fused.set(item.id, (fused.get(item.id) ?? 0) + 1 / (k + index + 1)));
  }
  return fused;
}

export type RetrieveOptions = {
  topK?: number;
  /** Present when the on-device embedding model is loaded. */
  semantic?: {entryVectors: Map<string, Vector>; jobChunkVectors: Vector[]; minSimilarity?: number};
};

/**
 * Hybrid retrieval: BM25 catches exact technology names ("NestJS", "GATT"),
 * embeddings catch paraphrases and other languages ("실시간 대시보드" vs
 * "real-time dashboard"). Without the model it degrades to keyword search.
 */
export function retrieve(entries: BankEntry[], jobText: string, {topK = 5, semantic}: RetrieveOptions = {}): RetrievedEntry[] {
  const byId = new Map(entries.map(entry => [entry.id, entry]));
  const lexical = bm25Rank(entries.map(entry => ({id: entry.id, text: entryPassage(entry)})), jobText);
  const semanticScores = semantic ? semanticRank(semantic.entryVectors, semantic.jobChunkVectors, semantic.minSimilarity ?? 0) : [];
  const rankings = semantic ? [lexical, semanticScores] : [lexical];
  const fused = reciprocalRankFusion(rankings);
  const lexicalRanks = new Map(lexical.map((item, index) => [item.id, index + 1]));
  const semanticRanks = new Map(semanticScores.map((item, index) => [item.id, index + 1]));
  const similarities = new Map(semanticScores.map(item => [item.id, item.score]));

  return [...fused.entries()]
    .filter(([id]) => byId.has(id))
    .sort((left, right) => right[1] - left[1])
    .slice(0, topK)
    .map(([id, score]) => {
      const lexicalRank = lexicalRanks.get(id);
      const semanticRankValue = semanticRanks.get(id);
      return {
        entry: byId.get(id)!,
        score,
        lexicalRank,
        semanticRank: semanticRankValue,
        semanticSimilarity: similarities.get(id),
        method: lexicalRank && semanticRankValue ? 'hybrid' : lexicalRank ? 'keyword' : 'semantic',
      };
    });
}
