/** Fraction of the relevant IDs that appear in the first k results. */
export function recallAtK(ranked: string[], relevant: string[], k: number): number {
  if (relevant.length === 0) return 1;
  const top = new Set(ranked.slice(0, k));
  return relevant.filter(id => top.has(id)).length / relevant.length;
}

/** Reciprocal rank of the first relevant result (0 when none is found). */
export function reciprocalRank(ranked: string[], relevant: string[]): number {
  const wanted = new Set(relevant);
  const index = ranked.findIndex(id => wanted.has(id));
  return index === -1 ? 0 : 1 / (index + 1);
}

export function mean(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}
