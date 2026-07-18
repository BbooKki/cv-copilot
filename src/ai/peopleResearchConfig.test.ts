import {afterEach, describe, expect, it, vi} from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('public people research client flag', () => {
  it('is disabled unless explicitly set to true', async () => {
    vi.stubEnv('VITE_PEOPLE_RESEARCH_ENABLED', 'false');
    const disabled = await import('./peopleResearchConfig');
    expect(disabled.PUBLIC_PEOPLE_RESEARCH_ENABLED).toBe(false);

    vi.resetModules();
    vi.stubEnv('VITE_PEOPLE_RESEARCH_ENABLED', 'true');
    const enabled = await import('./peopleResearchConfig');
    expect(enabled.PUBLIC_PEOPLE_RESEARCH_ENABLED).toBe(true);
  });
});
