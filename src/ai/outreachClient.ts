import {outreachKitSchema, type OutreachKit, type OutreachRequest} from './outreach';
import {redactCvForCloud} from './redact';
import {AiProviderError} from './provider';
import {postAiOperation} from './apiClient';

/** Generates recruiter-intro and follow-up email drafts through the server. */
export async function buildOutreachKit(request: OutreachRequest, signal?: AbortSignal): Promise<OutreachKit> {
  const redacted: OutreachRequest = {...request, cv: redactCvForCloud(request.cv)};
  const payload = await postAiOperation({operation: 'build-outreach', request: redacted}, signal);
  try {
    return outreachKitSchema.parse(payload);
  } catch {
    throw new AiProviderError('invalid-output', 'The outreach drafts could not be read. Please try again.');
  }
}
