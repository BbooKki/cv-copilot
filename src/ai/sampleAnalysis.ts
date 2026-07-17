import type {AiAnalysisResult} from './protocol';

/**
 * Shown only when the live AI is unavailable (free-tier overload or quota), so
 * the walkthrough always completes with a representative result. It is clearly
 * labelled as a sample and carries no suggestions, so nothing is applied to the
 * real document. The user can retry for their genuine, grounded analysis.
 */
export const SAMPLE_ANALYSIS: AiAnalysisResult = {
  protocolVersion: 1,
  fitSummary: 'Sample result: strong overlap between the candidate and this role in front-end engineering, with clearly transferable experience. Retry in a moment to generate the real, CV-grounded analysis.',
  matchedRequirements: [
    {requirement: 'Front-end development with a modern framework', evidence: 'Sample — your matched experience appears here once live AI responds.'},
    {requirement: 'Collaboration and delivery', evidence: 'Sample — evidence drawn from your CV appears here in the real result.'},
  ],
  gaps: [
    {requirement: 'A specific tool named in the posting', explanation: 'Sample — honest gaps from your CV appear here in the real result.', resolvableFromExistingFacts: false},
  ],
  warnings: ['This is a sample shown because the live AI was unavailable. Click Analyze again shortly to get your real, CV-grounded result.'],
  suggestions: [],
};
