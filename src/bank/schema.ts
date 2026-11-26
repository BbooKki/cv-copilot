import {z} from 'zod';

/**
 * The Experience Bank holds career facts the user has written down but that do
 * not all fit on the CV. It is user-owned factual input, like the CV itself,
 * and is stored separately from `CvDocument` so the CV schema stays unchanged.
 */
export const BANK_ENTRY_TITLE_LIMIT = 120;
export const BANK_ENTRY_TEXT_LIMIT = 600;
export const BANK_ENTRY_CONTEXT_LIMIT = 120;
export const BANK_MAX_ENTRIES = 200;
export const BANK_MAX_TAGS = 12;

const id = z.string().trim().min(1).max(120);

export const bankEntrySchema = z.object({
  id,
  title: z.string().trim().min(1).max(BANK_ENTRY_TITLE_LIMIT),
  /** One achievement or project fact, written by the user. */
  text: z.string().trim().min(1).max(BANK_ENTRY_TEXT_LIMIT),
  /** Where it happened, for example "TheJoin · 2025". */
  context: z.string().trim().max(BANK_ENTRY_CONTEXT_LIMIT).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(BANK_MAX_TAGS),
  /** Optional CV experience or project ID this fact belongs to. */
  linkedItemId: id.optional(),
  updatedAt: z.string().datetime(),
}).strict();

export const experienceBankSchema = z.object({
  schemaVersion: z.literal(1),
  entries: z.array(bankEntrySchema).max(BANK_MAX_ENTRIES),
}).strict().superRefine((bank, context) => {
  const ids = bank.entries.map(entry => entry.id);
  if (new Set(ids).size !== ids.length) context.addIssue({code: 'custom', message: 'Bank entry IDs must be unique.'});
});

export type BankEntry = z.infer<typeof bankEntrySchema>;
export type ExperienceBank = z.infer<typeof experienceBankSchema>;

export function createEmptyBank(): ExperienceBank {
  return {schemaVersion: 1, entries: []};
}

/** The text that retrieval indexes for one entry. Entries are short, so one entry is one passage. */
export function entryPassage(entry: BankEntry): string {
  return [entry.title, entry.context, entry.text, entry.tags.join(', ')].filter(Boolean).join('. ');
}
