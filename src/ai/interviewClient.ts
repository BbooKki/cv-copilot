import {interviewKitSchema, type InterviewKit, type InterviewKitRequest} from './interview';
import {redactCvForCloud} from './redact';
import {AiProviderError} from './provider';
import {postAiOperation} from './apiClient';

/**
 * Generates the interview preparation kit through the server-side provider.
 * The CV is redacted of contact details first; item IDs are preserved so the
 * pitch's evidence citations can be grounded against the original document.
 */
export async function buildInterviewKit(request: InterviewKitRequest, signal?: AbortSignal): Promise<InterviewKit> {
  const redacted: InterviewKitRequest = {...request, cv: redactCvForCloud(request.cv)};
  const payload = await postAiOperation({operation: 'build-interview-kit', request: redacted}, signal);
  try {
    return interviewKitSchema.parse(payload);
  } catch {
    throw new AiProviderError('invalid-output', 'The interview kit could not be read. Please try again.');
  }
}
