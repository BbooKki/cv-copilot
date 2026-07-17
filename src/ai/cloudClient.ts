import {aiAnalysisResultSchema, type AiAnalysisRequest, type AiAnalysisResult} from './protocol';
import {redactCvForCloud} from './redact';
import {AiProviderError} from './provider';
import {postAiOperation} from './apiClient';

/**
 * Runs job-fit analysis through the server-side Gemini provider. The CV is
 * redacted of contact details before it leaves the browser, and the returned
 * shape is validated again on the client before it reaches UI state.
 */
export async function analyzeWithCloud(request: AiAnalysisRequest, signal?: AbortSignal): Promise<AiAnalysisResult> {
  const redacted: AiAnalysisRequest = {...request, cv: redactCvForCloud(request.cv)};
  const payload = await postAiOperation({operation: 'analyze', request: redacted}, signal);
  try {
    return aiAnalysisResultSchema.parse(payload);
  } catch {
    throw new AiProviderError('invalid-output', 'The AI returned a response the app could not read. Please try again.');
  }
}
