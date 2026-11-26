import {createEmptyBank, experienceBankSchema, type ExperienceBank} from './schema';

const STORAGE_KEY = 'cv-copilot-experience-bank-v1';

export interface BankRepository {
  load(): ExperienceBank;
  save(bank: ExperienceBank): void;
}

/** Local-only persistence. The bank never leaves the browser unless the user sends retrieved entries to cloud AI. */
export class LocalBankRepository implements BankRepository {
  constructor(private readonly storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = localStorage) {}

  load(): ExperienceBank {
    const raw = this.storage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyBank();
    try {
      const parsed = experienceBankSchema.safeParse(JSON.parse(raw) as unknown);
      if (parsed.success) return parsed.data;
    } catch {
      // Fall through: unreadable data is discarded rather than guessed at.
    }
    this.storage.removeItem(STORAGE_KEY);
    return createEmptyBank();
  }

  save(bank: ExperienceBank): void {
    this.storage.setItem(STORAGE_KEY, JSON.stringify(experienceBankSchema.parse(bank)));
  }
}
