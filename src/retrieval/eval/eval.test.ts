import {describe, expect, it} from 'vitest';
import {retrieve} from '../hybrid';
import {evalBank, evalJobs} from './fixtures';
import {mean, recallAtK, reciprocalRank} from './metrics';

/**
 * Keyword-only baseline on the labeled set. It runs in CI with no model.
 * The hybrid numbers with real embeddings come from `npm run eval:retrieval`.
 * Korean postings against English entries are expected to be weak here: that
 * gap is what the multilingual embedding model is for.
 */
describe('retrieval evaluation (keyword baseline)', () => {
  const englishJobs = evalJobs.filter(job => job.language === 'en');
  const results = englishJobs.map(job => {
    const ranked = retrieve(evalBank, job.text, {topK: 5}).map(result => result.entry.id);
    return {job: job.id, recall: recallAtK(ranked, job.relevant, 5), rr: reciprocalRank(ranked, job.relevant)};
  });

  it('finds most relevant entries for English postings', () => {
    expect(mean(results.map(result => result.recall))).toBeGreaterThanOrEqual(0.6);
  });

  it('usually ranks a relevant entry first', () => {
    expect(mean(results.map(result => result.rr))).toBeGreaterThanOrEqual(0.6);
  });
});
