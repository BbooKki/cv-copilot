import {postAiOperation} from './apiClient';
import {publicPeopleResultSchema, type PeopleResearchInput, type PublicPeopleResult} from './peopleResearch';
import {AiProviderError} from './provider';

/** Runs the explicit public-team experiment without sending CV or contact data. */
export async function researchPublicPeople(input: PeopleResearchInput, signal?: AbortSignal): Promise<PublicPeopleResult> {
  const payload = await postAiOperation({operation: 'research-people', input}, signal);
  try {
    return publicPeopleResultSchema.parse(payload);
  } catch {
    throw new AiProviderError('invalid-output', 'The public team result could not be read. Please try again.');
  }
}
