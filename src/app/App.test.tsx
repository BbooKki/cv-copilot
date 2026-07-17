import {act, cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {App} from './App';

const gemmaHarness = vi.hoisted(() => ({
  complete: null as null | ((raw: string) => void),
  timeout: null as null | ((partialOutput: string) => void),
  generate: vi.fn(),
}));

vi.mock('../gemma/useGemma', () => ({
  useGemma: (onComplete: (raw: string) => void, onGenerationTimeout: (partialOutput: string) => void) => {
    gemmaHarness.complete = onComplete;
    gemmaHarness.timeout = onGenerationTimeout;
    return {
      status: 'ready' as const,
      cached: true,
      cacheVerified: true,
      progress: {received: 0, total: 2_008_432_640},
      error: '',
      capability: {webGpu: true, secureContext: true, storageAvailable: 4_000_000_000},
      generationPhase: null,
      generatedCharacters: 0,
      load: vi.fn(),
      generate: gemmaHarness.generate,
      cancel: vi.fn(),
      clearCache: vi.fn(),
    };
  },
}));

vi.mock('../persistence/localResumeRepository', () => ({
  localResumeRepository: {load: vi.fn().mockResolvedValue(null), save: vi.fn().mockResolvedValue(undefined)},
}));

vi.mock('../persistence/CloudPanel', () => ({CloudPanel: () => null}));

const cloudHarness = vi.hoisted(() => ({analyze: vi.fn()}));
vi.mock('../ai/cloudClient', () => ({analyzeWithCloud: (...args: unknown[]) => cloudHarness.analyze(...args)}));
const interviewHarness = vi.hoisted(() => ({build: vi.fn()}));
vi.mock('../ai/interviewClient', () => ({buildInterviewKit: (...args: unknown[]) => interviewHarness.build(...args)}));

describe('split tailoring flow', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/app');
    gemmaHarness.complete = null;
    gemmaHarness.timeout = null;
    gemmaHarness.generate.mockReset();
  });

  afterEach(() => {
    cleanup();
    window.history.replaceState({}, '', '/');
  });

  it('keeps valid fit analysis when Gemma returns a legacy object-shaped warning', async () => {
    render(<App />);

    fireEvent.change(await screen.findByLabelText('Full name'), {target: {value: 'Test User'}});
    fireEvent.click(screen.getByRole('tab', {name: 'Tailor'}));
    fireEvent.click(screen.getByRole('tab', {name: 'Private · Local'}));
    fireEvent.change(screen.getByLabelText('Job description'), {target: {value: 'Frontend role requiring React, TypeScript, testing, and accessible UI development.'}});
    fireEvent.click(screen.getByRole('button', {name: 'Analyze locally'}));

    act(() => gemmaHarness.complete?.(JSON.stringify({
      protocolVersion: 1,
      fitSummary: 'The valid fit result remains usable.',
      matchedRequirements: [],
      gaps: [],
      warnings: [{type: 'advisory', message: 'Non-canonical warning'}],
    })));

    expect(await screen.findByText('The valid fit result remains usable.')).toBeInTheDocument();
    expect(screen.getByText(/unsupported advisory field/)).toBeInTheDocument();
    expect(screen.queryByText('Structured response was incomplete')).not.toBeInTheDocument();
    expect(gemmaHarness.generate).toHaveBeenCalledTimes(2);
  });

  it('preserves valid fit analysis when suggestion JSON fails and retries only suggestions', async () => {
    render(<App />);

    const fullName = await screen.findByLabelText('Full name');
    fireEvent.change(fullName, {target: {value: 'Test User'}});
    fireEvent.click(screen.getByRole('tab', {name: 'Tailor'}));
    fireEvent.click(screen.getByRole('tab', {name: 'Private · Local'}));
    fireEvent.change(screen.getByLabelText('Job description'), {target: {value: 'Frontend role requiring React, TypeScript, testing, and accessible UI development.'}});
    fireEvent.click(screen.getByRole('button', {name: 'Analyze locally'}));

    expect(gemmaHarness.generate).toHaveBeenCalledTimes(1);
    expect(gemmaHarness.generate.mock.calls[0]?.[0]).toContain('Do not propose CV edits in this response');
    expect(gemmaHarness.generate.mock.calls[0]?.[1]).toBe('analysis');

    act(() => gemmaHarness.complete?.(JSON.stringify({
      protocolVersion: 1,
      fitSummary: 'The CV has partial evidence for this frontend role.',
      matchedRequirements: [{requirement: 'Frontend experience', evidence: 'The headline identifies frontend work.'}],
      gaps: [{requirement: 'Testing', explanation: 'No testing evidence is present.', resolvableFromExistingFacts: false}],
      warnings: [],
    })));

    expect(await screen.findByText('The CV has partial evidence for this frontend role.')).toBeInTheDocument();
    expect(gemmaHarness.generate).toHaveBeenCalledTimes(2);
    expect(gemmaHarness.generate.mock.calls[1]?.[0]).toContain('VALIDATED_FIT_ANALYSIS_BEGIN');

    act(() => gemmaHarness.complete?.('{"protocolVersion":1,"suggestions":[{"id":"cut-off"'));

    expect(await screen.findByText(/Fit analysis is ready\. Suggestions could not be generated/)).toBeInTheDocument();
    expect(screen.getByText('The CV has partial evidence for this frontend role.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'Retry suggestions'}));

    await waitFor(() => expect(gemmaHarness.generate).toHaveBeenCalledTimes(3));
    expect(gemmaHarness.generate.mock.calls[2]?.[0]).toContain('Return at most 1 suggestions');
    expect(gemmaHarness.generate.mock.calls[2]?.[1]).toBe('analysis-repair');
  });

  it('keeps completed fit analysis when suggestion generation reaches the watchdog', async () => {
    render(<App />);

    fireEvent.change(await screen.findByLabelText('Full name'), {target: {value: 'Test User'}});
    fireEvent.click(screen.getByRole('tab', {name: 'Tailor'}));
    fireEvent.click(screen.getByRole('tab', {name: 'Private · Local'}));
    fireEvent.change(screen.getByLabelText('Job description'), {target: {value: 'Frontend role requiring React, TypeScript, testing, and accessible UI development.'}});
    fireEvent.click(screen.getByRole('button', {name: 'Analyze locally'}));

    act(() => gemmaHarness.complete?.(JSON.stringify({
      protocolVersion: 1,
      fitSummary: 'The CV has partial evidence for this frontend role.',
      matchedRequirements: [],
      gaps: [],
      warnings: [],
    })));
    act(() => gemmaHarness.timeout?.('{"protocolVersion":1,"suggestions":['));

    expect(await screen.findByText(/exceeded 90 seconds/)).toBeInTheDocument();
    expect(screen.getByText('The CV has partial evidence for this frontend role.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'Retry suggestions'}));

    await waitFor(() => expect(gemmaHarness.generate).toHaveBeenCalledTimes(3));
    expect(gemmaHarness.generate.mock.calls[2]?.[1]).toBe('analysis-repair');
  });

  it('rejects a structurally valid suggestion that cites unknown CV evidence', async () => {
    render(<App />);

    fireEvent.change(await screen.findByLabelText('Full name'), {target: {value: 'Test User'}});
    fireEvent.click(screen.getByRole('tab', {name: 'Tailor'}));
    fireEvent.click(screen.getByRole('tab', {name: 'Private · Local'}));
    fireEvent.change(screen.getByLabelText('Job description'), {target: {value: 'Frontend role requiring React, TypeScript, testing, and accessible UI development.'}});
    fireEvent.click(screen.getByRole('button', {name: 'Analyze locally'}));

    act(() => gemmaHarness.complete?.(JSON.stringify({
      protocolVersion: 1,
      fitSummary: 'The CV has limited evidence for this role.',
      matchedRequirements: [],
      gaps: [],
      warnings: [],
    })));
    act(() => gemmaHarness.complete?.(JSON.stringify({
      protocolVersion: 1,
      suggestions: [{
        id: 'unsafe-evidence',
        target: {section: 'summary', field: 'summary'},
        originalText: '',
        proposedText: 'Frontend engineer.',
        reason: 'Focus the summary.',
        evidenceIds: ['not-in-the-cv'],
      }],
    })));

    expect(await screen.findByText(/unknown evidence ID not-in-the-cv/)).toBeInTheDocument();
    expect(screen.getByText('The CV has limited evidence for this role.')).toBeInTheDocument();
  });
});

describe('cloud analysis (default)', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/app');
    cloudHarness.analyze.mockReset();
    interviewHarness.build.mockReset();
    try { localStorage.clear(); } catch { /* ignore */ }
  });
  afterEach(() => {
    cleanup();
    window.history.replaceState({}, '', '/');
  });

  it('asks for consent once, then runs cloud analysis and shows the fit summary', async () => {
    cloudHarness.analyze.mockResolvedValue({
      protocolVersion: 1,
      fitSummary: 'Cloud analysis confirms strong front-end alignment.',
      matchedRequirements: [],
      gaps: [],
      warnings: [],
      suggestions: [],
    });

    render(<App />);
    fireEvent.change(await screen.findByLabelText('Full name'), {target: {value: 'Test User'}});
    fireEvent.click(screen.getByRole('tab', {name: 'Tailor'}));
    fireEvent.change(screen.getByLabelText('Job description'), {target: {value: 'Frontend role requiring React, TypeScript, testing, and accessible UI development.'}});

    fireEvent.click(screen.getByRole('button', {name: /Analyze CV/}));
    expect(cloudHarness.analyze).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', {name: 'Use cloud AI'}));

    expect(await screen.findByText('Cloud analysis confirms strong front-end alignment.')).toBeInTheDocument();
    expect(cloudHarness.analyze).toHaveBeenCalledTimes(1);
  });

  it('starts analysis from the chat composer and answers follow-ups without another cloud call', async () => {
    cloudHarness.analyze.mockResolvedValue({
      protocolVersion: 1,
      fitSummary: 'The CV is a partial match for this frontend role.',
      matchedRequirements: [{requirement: 'React', evidence: 'The CV includes React experience.'}],
      gaps: [{requirement: 'Accessibility testing', explanation: 'The CV has no explicit accessibility testing evidence.', resolvableFromExistingFacts: false}],
      warnings: [],
      suggestions: [],
    });

    render(<App />);
    fireEvent.change(await screen.findByLabelText('Full name'), {target: {value: 'Test User'}});
    fireEvent.click(screen.getByRole('tab', {name: 'Tailor'}));
    fireEvent.change(screen.getByLabelText('Message CV Copilot'), {target: {value: 'Frontend role requiring React, TypeScript, accessibility testing, and accessible UI development.'}});
    fireEvent.click(screen.getByRole('button', {name: 'Send message'}));
    fireEvent.click(screen.getByRole('button', {name: 'Use cloud AI'}));

    expect(await screen.findByText('The CV is a partial match for this frontend role.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'What are my gaps?'}));
    expect((await screen.findAllByText(/The CV has no explicit accessibility testing evidence/)).length).toBeGreaterThan(1);
    expect(cloudHarness.analyze).toHaveBeenCalledTimes(1);
  });

  it('shows a retryable error without inserting fictional analysis when live AI is unavailable', async () => {
    cloudHarness.analyze.mockRejectedValue(new Error('The AI service is busy. Please try again in a moment.'));

    render(<App />);
    fireEvent.change(await screen.findByLabelText('Full name'), {target: {value: 'Test User'}});
    fireEvent.click(screen.getByRole('tab', {name: 'Tailor'}));
    fireEvent.change(screen.getByLabelText('Job description'), {target: {value: 'Frontend role requiring React, TypeScript, testing, and accessible UI development.'}});
    fireEvent.click(screen.getByRole('button', {name: /Analyze CV/}));
    fireEvent.click(screen.getByRole('button', {name: 'Use cloud AI'}));

    expect(await screen.findByText('The AI service is busy. Please try again in a moment.')).toBeInTheDocument();
    expect(screen.queryByText(/Sample result:/)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', {name: 'Research the company'})).not.toBeInTheDocument();
  });

  it('requires cloud consent before a locally analyzed CV can be sent for interview preparation', async () => {
    interviewHarness.build.mockRejectedValue(new Error('Stopped after consent check.'));
    render(<App />);
    fireEvent.change(await screen.findByLabelText('Full name'), {target: {value: 'Test User'}});
    fireEvent.click(screen.getByRole('tab', {name: 'Tailor'}));
    fireEvent.click(screen.getByRole('tab', {name: 'Private · Local'}));
    fireEvent.change(screen.getByLabelText('Job description'), {target: {value: 'Frontend role requiring React, TypeScript, testing, and accessible UI development.'}});
    fireEvent.click(screen.getByRole('button', {name: 'Analyze locally'}));
    act(() => gemmaHarness.complete?.(JSON.stringify({protocolVersion: 1, fitSummary: 'Local fit is ready.', matchedRequirements: [], gaps: [], warnings: []})));
    act(() => gemmaHarness.complete?.(JSON.stringify({protocolVersion: 1, suggestions: []})));
    expect(await screen.findByText('Local fit is ready.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', {name: 'Cloud'}));
    fireEvent.click(screen.getByRole('button', {name: 'Prepare interview kit'}));
    expect(interviewHarness.build).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', {name: 'Use cloud AI'}));
    await waitFor(() => expect(interviewHarness.build).toHaveBeenCalledTimes(1));
  });
});

describe('account routing', () => {
  afterEach(() => {
    cleanup();
    window.history.replaceState({}, '', '/');
  });

  it('opens the dedicated account page and returns to the editor', async () => {
    window.history.replaceState({}, '', '/app');
    render(<App />);

    fireEvent.click(await screen.findByRole('button', {name: 'Sign in'}));
    expect(await screen.findByRole('heading', {name: 'Your account'})).toBeInTheDocument();
    expect(window.location.pathname).toBe('/account');

    fireEvent.click(screen.getByRole('button', {name: 'Back to editor'}));
    expect(await screen.findByRole('heading', {name: 'CV Copilot', level: 1})).toBeInTheDocument();
    expect(window.location.pathname).toBe('/app');
  });
});

describe('landing page', () => {
  afterEach(() => {
    cleanup();
    window.history.replaceState({}, '', '/');
  });

  it('shows the marketing hero at the root path', async () => {
    window.history.replaceState({}, '', '/');
    render(<App />);

    expect(await screen.findByRole('heading', {name: /Tailor your CV to any job/, level: 1})).toBeInTheDocument();
    expect(screen.queryByRole('tab', {name: 'Tailor'})).not.toBeInTheDocument();
  });

  it('enters the editor from a call to action', async () => {
    window.history.replaceState({}, '', '/');
    render(<App />);

    fireEvent.click((await screen.findAllByRole('button', {name: /Start building/i}))[0]);
    expect(await screen.findByRole('heading', {name: 'CV Copilot', level: 1})).toBeInTheDocument();
    expect(window.location.pathname).toBe('/app');
  });
});
