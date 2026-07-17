import {cvDocumentSchema, type CvDocument} from '../cv/schema';

const STORAGE_KEY = 'cv-copilot-document-v1';

export interface ResumeRepository {
  load(): Promise<CvDocument | null>;
  save(document: CvDocument): Promise<void>;
  remove(id: string): Promise<void>;
}

export class LocalResumeRepository implements ResumeRepository {
  constructor(private readonly storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = localStorage) {}

  async load(): Promise<CvDocument | null> {
    const raw = this.storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = cvDocumentSchema.safeParse(JSON.parse(raw) as unknown);
    if (!parsed.success) {
      this.storage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed.data;
  }

  async save(document: CvDocument): Promise<void> {
    const validated = cvDocumentSchema.parse(document);
    this.storage.setItem(STORAGE_KEY, JSON.stringify(validated));
  }

  async remove(): Promise<void> {
    this.storage.removeItem(STORAGE_KEY);
  }
}

export const localResumeRepository = new LocalResumeRepository();
