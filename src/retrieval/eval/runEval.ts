import {entryPassage} from '../../bank/schema';
import {retrieve, semanticRank, type Vector} from '../hybrid';
import {splitJobIntoChunks} from '../text';
import type {EmbeddingKind, EmbeddingToMainMessage, MainToEmbeddingMessage} from '../embedding.protocol';
import {evalBank, evalJobs} from './fixtures';
import {mean, recallAtK, reciprocalRank} from './metrics';

/**
 * Retrieval evaluation with the real on-device model. Open
 * /src/retrieval/eval/run.html in `npm run dev`; the first run downloads the
 * model. Results render as a table and are exposed on `window.__RETRIEVAL_EVAL__`.
 */
type Row = {job: string; language: string; method: string; recall5: number; rr: number; top: string[]};

const worker = new Worker(new URL('../embedding.worker.ts', import.meta.url), {type: 'module'});
let nextId = 1;

function embed(kind: EmbeddingKind, texts: string[]): Promise<number[][]> {
  const requestId = nextId++;
  return new Promise((resolve, reject) => {
    const listener = (event: MessageEvent<EmbeddingToMainMessage>) => {
      const message = event.data;
      if (message.type === 'embeddings' && message.requestId === requestId) { worker.removeEventListener('message', listener); resolve(message.vectors); }
      if (message.type === 'error' && message.requestId === requestId) { worker.removeEventListener('message', listener); reject(new Error(message.message)); }
    };
    worker.addEventListener('message', listener);
    worker.postMessage({type: 'embed', requestId, kind, texts} satisfies MainToEmbeddingMessage);
  });
}

async function run(): Promise<void> {
  const status = document.getElementById('status')!;
  status.textContent = 'Loading model and embedding the bank…';
  const passageVectors = await embed('passage', evalBank.map(entryPassage));
  const entryVectors = new Map<string, Vector>(evalBank.map((entry, index) => [entry.id, passageVectors[index]!]));
  const rows: Row[] = [];
  for (const job of evalJobs) {
    const jobChunkVectors = await embed('query', splitJobIntoChunks(job.text));
    const rankings: Record<string, string[]> = {
      keyword: retrieve(evalBank, job.text, {topK: 5}).map(result => result.entry.id),
      semantic: semanticRank(entryVectors, jobChunkVectors).slice(0, 5).map(item => item.id),
      hybrid: retrieve(evalBank, job.text, {topK: 5, semantic: {entryVectors, jobChunkVectors}}).map(result => result.entry.id),
    };
    for (const [method, ranked] of Object.entries(rankings)) {
      rows.push({job: job.id, language: job.language, method, recall5: recallAtK(ranked, job.relevant, 5), rr: reciprocalRank(ranked, job.relevant), top: ranked});
    }
  }
  const summary = ['keyword', 'semantic', 'hybrid'].flatMap(method => ['all', 'en', 'ko'].map(language => {
    const subset = rows.filter(row => row.method === method && (language === 'all' || row.language === language));
    return {method, language, recall5: mean(subset.map(row => row.recall5)), mrr: mean(subset.map(row => row.rr))};
  }));
  (window as unknown as {__RETRIEVAL_EVAL__: unknown}).__RETRIEVAL_EVAL__ = {summary, rows};
  status.textContent = 'Done.';
  const table = document.getElementById('summary')!;
  table.innerHTML = `<tr><th>Method</th><th>Jobs</th><th>Recall@5</th><th>MRR</th></tr>${summary.map(item => `<tr><td>${item.method}</td><td>${item.language}</td><td>${item.recall5.toFixed(2)}</td><td>${item.mrr.toFixed(2)}</td></tr>`).join('')}`;
}

run().catch(cause => {
  document.getElementById('status')!.textContent = `Failed: ${cause instanceof Error ? cause.message : String(cause)}`;
  (window as unknown as {__RETRIEVAL_EVAL__: unknown}).__RETRIEVAL_EVAL__ = {error: String(cause)};
});
