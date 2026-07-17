import {describe, expect, it} from 'vitest';
import {sampleCv} from '../cv/sample';
import {LocalResumeRepository} from './localResumeRepository';

function memoryStorage() {
  const values = new Map<string, string>();
  return {getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); }};
}

describe('LocalResumeRepository', () => {
  it('saves and loads a valid CV', async () => {
    const repository = new LocalResumeRepository(memoryStorage());
    await repository.save(sampleCv);
    await expect(repository.load()).resolves.toEqual(sampleCv);
  });

  it('discards invalid stored data', async () => {
    const storage = memoryStorage();
    storage.setItem('cv-copilot-document-v1', '{"broken":true}');
    const repository = new LocalResumeRepository(storage);
    await expect(repository.load()).resolves.toBeNull();
  });
});
