import {groundedCompanyBriefSchema, type CompanyResearchInput, type GroundedCompanyBrief} from './research';
import {AiProviderError} from './provider';
import {postAiOperation} from './apiClient';

/**
 * Runs user-triggered company-and-role research through the server. No CV or
 * contact data is sent — only the company, role, and public job text.
 */
export async function researchCompany(input: CompanyResearchInput, signal?: AbortSignal): Promise<GroundedCompanyBrief> {
  const payload = await postAiOperation({operation: 'research-company', input}, signal);
  try {
    return groundedCompanyBriefSchema.parse(payload);
  } catch {
    throw new AiProviderError('invalid-output', 'The research result could not be read. Please try again.');
  }
}
