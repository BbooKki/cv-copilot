import {buildVerifiedOutreachKit, type OutreachKit, type OutreachRequest} from './outreach';

/** Generates role-based outreach and follow-up drafts locally without using AI quota. */
export async function buildOutreachKit(request: OutreachRequest, _signal?: AbortSignal): Promise<OutreachKit> {
  return buildVerifiedOutreachKit(request);
}
