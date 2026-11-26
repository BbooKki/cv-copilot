/**
 * Shared text handling for lexical retrieval. Latin, Cyrillic and digits are
 * split into words; Hangul and CJK runs become character bigrams, which works
 * without a morphological analyser for Korean and Chinese job postings.
 */
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'have', 'in', 'into', 'is', 'it', 'its', 'of', 'on', 'or', 'our', 'that', 'the', 'their', 'this', 'to', 'we', 'will', 'with', 'you', 'your',
  'ability', 'experience', 'experienced', 'knowledge', 'preferred', 'required', 'requirements', 'responsibilities', 'skills', 'strong', 'team', 'work', 'working', 'years', 'year', 'plus',
]);

const TOKEN_PATTERN = /[\p{Script=Hangul}\p{Script=Han}]+|[\p{L}\p{N}][\p{L}\p{N}.+#-]*/gu;
const CJK_PATTERN = /^[\p{Script=Hangul}\p{Script=Han}]+$/u;

export function tokenize(text: string): string[] {
  const tokens: string[] = [];
  for (const match of text.toLowerCase().matchAll(TOKEN_PATTERN)) {
    const raw = match[0].replace(/[.\-]+$/, '');
    if (!raw) continue;
    if (CJK_PATTERN.test(raw)) {
      if (raw.length === 1) tokens.push(raw);
      for (let index = 0; index < raw.length - 1; index += 1) tokens.push(raw.slice(index, index + 2));
      continue;
    }
    if (raw.length < 2 || STOP_WORDS.has(raw)) continue;
    tokens.push(raw);
  }
  return tokens;
}

const CJK_CHAR_PATTERN = /[\p{Script=Hangul}\p{Script=Han}]/gu;

/**
 * Length used to tell a requirement from a short header. Hangul and CJK carry
 * roughly two Latin characters of meaning each, so they count double; without
 * this, short Korean requirement lines were dropped (found by the retrieval eval).
 */
export function informationLength(text: string): number {
  return text.length + (text.match(CJK_CHAR_PATTERN)?.length ?? 0);
}

/**
 * Splits a job posting into requirement-sized chunks for semantic search. A
 * posting mixes many requirements; matching each one separately and taking the
 * best match keeps one strong requirement from being diluted by the rest.
 */
export function splitJobIntoChunks(text: string, options: {maxChunks?: number; maxChars?: number; minChars?: number} = {}): string[] {
  const {maxChunks = 24, maxChars = 400, minChars = 25} = options;
  const pieces = text
    .split(/\r?\n|(?<=[.!?。])\s+|[•·▪●◦]\s*/u)
    .map(piece => piece.replace(/^[-*\d.)\s]+/, '').trim())
    .filter(piece => informationLength(piece) >= minChars);
  const chunks: string[] = [];
  for (const piece of pieces) {
    if (chunks.length >= maxChunks) break;
    chunks.push(piece.length > maxChars ? piece.slice(0, maxChars) : piece);
  }
  if (chunks.length === 0 && text.trim()) chunks.push(text.trim().slice(0, maxChars));
  return chunks;
}
