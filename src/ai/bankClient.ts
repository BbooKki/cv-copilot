import {redactCvForCloud} from './redact';
import {AiProviderError} from './provider';
import {postAiOperation} from './apiClient';
import {assertBankSuggestionsAreGrounded, bankSuggestionResultSchema, redactBankEntryForCloud, type BankSuggestionRequest, type BankSuggestionResult} from './bank';

/**
 * Sends only the retrieved bank entries (not the whole bank) to the server,
 * after removing contact details, and re-checks grounding against the
 * original document before results reach UI state.
 */
export async function suggestFromBankWithCloud(request: BankSuggestionRequest, signal?: AbortSignal): Promise<BankSuggestionResult> {
  const redacted: BankSuggestionRequest = {...request, cv: redactCvForCloud(request.cv), entries: request.entries.map(redactBankEntryForCloud)};
  const payload = await postAiOperation({operation: 'suggest-from-bank', request: redacted}, signal);
  let result: BankSuggestionResult;
  try {
    result = bankSuggestionResultSchema.parse(payload);
  } catch {
    throw new AiProviderError('invalid-output', 'The AI returned a response the app could not read. Please try again.');
  }
  assertBankSuggestionsAreGrounded(request.cv, redacted.entries, result.suggestions);
  return result;
}
