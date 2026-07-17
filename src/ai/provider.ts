/**
 * Shared AI provider contract. Stage 1 ships a cloud provider (Gemini via the
 * server /api/ai endpoint) as the default and keeps the local Gemma runtime as
 * an optional Private Mode. Capability flags let the UI show only the actions a
 * given provider actually supports.
 */
export type AiProviderId = 'cloud' | 'local';

export type AiProviderCapabilities = {
  analysis: boolean;
  companyResearch: boolean;
  interviewKit: boolean;
  designAdvice: boolean;
};

export type AiProviderErrorCode =
  | 'network'
  | 'quota'
  | 'auth'
  | 'invalid-output'
  | 'busy'
  | 'unsupported'
  | 'unknown';

export class AiProviderError extends Error {
  readonly code: AiProviderErrorCode;
  constructor(code: AiProviderErrorCode, message: string) {
    super(message);
    this.name = 'AiProviderError';
    this.code = code;
  }
}

export const CLOUD_CAPABILITIES: AiProviderCapabilities = {
  analysis: true,
  companyResearch: true,
  interviewKit: true,
  designAdvice: false,
};

export const LOCAL_CAPABILITIES: AiProviderCapabilities = {
  analysis: true,
  companyResearch: false,
  interviewKit: false,
  designAdvice: true,
};

export function capabilitiesFor(id: AiProviderId): AiProviderCapabilities {
  return id === 'cloud' ? CLOUD_CAPABILITIES : LOCAL_CAPABILITIES;
}
