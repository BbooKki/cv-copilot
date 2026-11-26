import {describe, expect, it} from 'vitest';
import {bm25Rank} from './bm25';
import {cosine, reciprocalRankFusion, retrieve, semanticRank} from './hybrid';
import {splitJobIntoChunks, tokenize} from './text';
import {evalBank} from './eval/fixtures';

describe('tokenize', () => {
  it('keeps technology names and drops stop words', () => {
    expect(tokenize('Experience with Node.js, C# and the GraphQL API')).toEqual(['node.js', 'c#', 'graphql', 'api']);
  });

  it('splits Korean into character bigrams', () => {
    expect(tokenize('대시보드 개발')).toEqual(['대시', '시보', '보드', '개발']);
  });
});

describe('splitJobIntoChunks', () => {
  it('splits bullet lines into requirement chunks and skips short headers', () => {
    const chunks = splitJobIntoChunks('Role\n- Build admin screens in Vue 3\n- Implement permission-based access control');
    expect(chunks).toEqual(['Build admin screens in Vue 3', 'Implement permission-based access control']);
  });

  it('keeps short Korean requirement lines, which carry more meaning per character', () => {
    const chunks = splitJobIntoChunks('프론트엔드 개발자\n- 실시간 모니터링 대시보드 개발\n- 관리자 권한별 메뉴 접근 제어 구현');
    expect(chunks).toContain('실시간 모니터링 대시보드 개발');
    expect(chunks).toContain('관리자 권한별 메뉴 접근 제어 구현');
  });

  it('falls back to the whole text when nothing is long enough', () => {
    expect(splitJobIntoChunks('Vue dev')).toEqual(['Vue dev']);
  });
});

describe('bm25Rank', () => {
  it('ranks the entry with the rare matching term first', () => {
    const ranked = bm25Rank([
      {id: 'a', text: 'Vue admin screens'},
      {id: 'b', text: 'NestJS GraphQL API'},
      {id: 'c', text: 'Vue charts'},
    ], 'GraphQL backend');
    expect(ranked.map(item => item.id)).toEqual(['b']);
  });

  it('returns nothing for an empty bank', () => {
    expect(bm25Rank([], 'anything')).toEqual([]);
  });
});

describe('hybrid retrieval', () => {
  it('computes cosine similarity', () => {
    expect(cosine([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosine([1, 0], [0, 1])).toBeCloseTo(0);
    expect(cosine([0, 0], [1, 0])).toBe(0);
  });

  it('scores an entry by its best job chunk', () => {
    const ranked = semanticRank(new Map([['x', [1, 0]], ['y', [0, 1]]]), [[0.9, 0.1], [0.2, 0.8]]);
    expect(ranked.map(item => item.id)).toEqual(['x', 'y']);
  });

  it('fuses rankings so agreement beats a single first place', () => {
    const fused = reciprocalRankFusion([
      [{id: 'a', score: 9}, {id: 'b', score: 5}],
      [{id: 'b', score: 0.9}, {id: 'c', score: 0.8}],
    ]);
    const order = [...fused.entries()].sort((l, r) => r[1] - l[1]).map(([id]) => id);
    expect(order[0]).toBe('b');
  });

  it('falls back to keyword search without vectors and labels the method', () => {
    const results = retrieve(evalBank, 'GraphQL APIs with NestJS', {topK: 3});
    expect(results[0]?.entry.id).toBe('b-graphql');
    expect(results.every(result => result.method === 'keyword')).toBe(true);
  });

  it('marks results found by both methods as hybrid', () => {
    const entryVectors = new Map(evalBank.map((entry, index) => [entry.id, index === 10 ? [1, 0] : [0, 1]]));
    const results = retrieve(evalBank, 'GraphQL APIs with NestJS', {topK: 1, semantic: {entryVectors, jobChunkVectors: [[1, 0]]}});
    expect(results[0]).toMatchObject({method: 'hybrid', lexicalRank: 1, semanticRank: 1});
    expect(results[0]?.entry.id).toBe('b-graphql');
  });
});
