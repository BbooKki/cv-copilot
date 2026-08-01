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

const cloudHarness = vi.hoisted(() => ({analyze: vi.fn()}));
vi.mock('../ai/cloudClient', () => ({analyzeWithCloud: (...args: unknown[]) => cloudHarness.analyze(...args)}));
const interviewHarness = vi.hoisted(() => ({build: vi.fn()}));
vi.mock('../ai/interviewClient', () => ({buildInterviewKit: (...args: unknown[]) => interviewHarness.build(...args)}));
const researchHarness = vi.hoisted(() => ({research: vi.fn()}));
vi.mock('../ai/researchClient', () => ({researchCompany: (...args: unknown[]) => researchHarness.research(...args)}));
const extractHarness = vi.hoisted(() => ({extract: vi.fn()}));
vi.mock('../jobs/client', () => ({extractJob: (...args: unknown[]) => extractHarness.extract(...args)}));

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
    researchHarness.research.mockReset();
    extractHarness.extract.mockReset();
    try { localStorage.clear(); } catch { /* ignore */ }
  });
  afterEach(() => {
    cleanup();
    window.history.replaceState({}, '', '/');
  });

  it('opens the Tailor chat with a conversational welcome before requesting job details', async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole('tab', {name: 'Tailor'}));

    expect(screen.getByText(/What would you like to work on\?/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Message CV Copilot…')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Help me improve my CV'})).toBeInTheDocument();
    expect(screen.queryByText(/Share the job link or paste the description here/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', {name: 'Help me improve my CV'}));
    expect(await screen.findByText(/Use Edit CV for exact details/)).toBeInTheDocument();
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
    expect(screen.getByRole('heading', {name: 'Your fit review'}).parentElement?.parentElement).toHaveTextContent('Cloud analysis confirms strong front-end alignment.');
    expect(cloudHarness.analyze).toHaveBeenCalledTimes(1);
  });

  it('fetches a job URL without silently starting cloud analysis', async () => {
    extractHarness.extract.mockResolvedValue({
      url: 'https://example.com/jobs/frontend',
      title: 'Frontend Engineer',
      company: 'Acme',
      text: 'Frontend role requiring React, TypeScript, testing, and accessible UI development.',
    });
    cloudHarness.analyze.mockResolvedValue({
      protocolVersion: 1,
      fitSummary: 'The fetched role is a partial match.',
      matchedRequirements: [],
      gaps: [],
      warnings: [],
      suggestions: [],
    });

    render(<App />);
    fireEvent.change(await screen.findByLabelText('Full name'), {target: {value: 'Test User'}});
    fireEvent.click(screen.getByRole('tab', {name: 'Tailor'}));
    fireEvent.change(screen.getByLabelText('Message CV Copilot'), {target: {value: 'https://example.com/jobs/frontend'}});
    fireEvent.click(screen.getByRole('button', {name: 'Send message'}));

    expect(await screen.findByText(/Job fetched: Frontend Engineer at Acme/)).toBeInTheDocument();
    expect(cloudHarness.analyze).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', {name: 'Analyze CV'}));
    expect(cloudHarness.analyze).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', {name: 'Use cloud AI'}));

    expect(await screen.findByText('The fetched role is a partial match.')).toBeInTheDocument();
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

  it('hands company research from the conversation into the persistent application kit', async () => {
    cloudHarness.analyze.mockResolvedValue({
      protocolVersion: 1,
      fitSummary: 'The CV is ready for application preparation.',
      matchedRequirements: [],
      gaps: [],
      warnings: [],
      suggestions: [],
    });
    researchHarness.research.mockResolvedValue({
      company: 'Acme',
      summary: {text: 'Acme builds reliable developer tools.', citationIds: ['source-1']},
      priorities: [],
      roleContext: null,
      sources: [{id: 'source-1', title: 'Acme company page', url: 'https://example.com/acme'}],
    });

    render(<App />);
    fireEvent.change(await screen.findByLabelText('Full name'), {target: {value: 'Test User'}});
    fireEvent.click(screen.getByRole('tab', {name: 'Tailor'}));
    expect(screen.queryByRole('tab', {name: 'Application kit'})).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Job description'), {target: {value: 'Frontend role requiring React, TypeScript, testing, and accessible UI development.'}});
    fireEvent.click(screen.getByRole('button', {name: /Analyze CV/}));
    fireEvent.click(screen.getByRole('button', {name: 'Use cloud AI'}));

    expect(await screen.findByText('Build your application kit')).toBeInTheDocument();
    expect(screen.getByRole('heading', {name: 'Who should I contact?'})).toBeInTheDocument();
    expect(screen.getByText('Recruiter or talent partner')).toBeInTheDocument();
    expect(screen.getByText('Hiring manager')).toBeInTheDocument();
    expect(screen.getByText('Future peer')).toBeInTheDocument();
    expect(screen.getByRole('tab', {name: 'Application kit'})).toBeEnabled();
    fireEvent.click(screen.getByRole('button', {name: 'Research company'}));

    expect(screen.getByRole('heading', {name: 'Application kit'})).toBeInTheDocument();
    expect(screen.queryByLabelText('Message CV Copilot')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Company'), {target: {value: 'Acme'}});
    fireEvent.change(screen.getByLabelText('Role · optional'), {target: {value: 'Frontend Engineer'}});
    fireEvent.click(screen.getByRole('button', {name: 'Research company'}));

    expect(await screen.findByText('Acme builds reliable developer tools.')).toBeInTheDocument();
    expect(researchHarness.research).toHaveBeenCalledWith(expect.objectContaining({company: 'Acme', role: 'Frontend Engineer'}));
    expect(screen.getByRole('tab', {name: 'Application kit · 1'})).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', {name: 'Conversation'}));
    expect(screen.getByLabelText('Message CV Copilot')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'Prepare outreach drafts'}));
    expect(await screen.findByText('Question about the Frontend Engineer team at Acme')).toBeInTheDocument();
    expect(screen.getByText('Recruiter or talent partner')).toBeInTheDocument();
    expect(screen.getByText('Hiring manager')).toBeInTheDocument();
    expect(screen.getByText('Future peer')).toBeInTheDocument();
  });
});

describe('account routing', () => {
  afterEach(() => {
    cleanup();
    window.history.replaceState({}, '', '/');
  });

  it('explains that account access is temporarily unavailable', async () => {
    window.history.replaceState({}, '', '/app');
    render(<App />);

    fireEvent.click(await screen.findByRole('button', {name: 'Sign in'}));
    expect(await screen.findByRole('heading', {name: 'Accounts are temporarily unavailable'})).toBeInTheDocument();
    expect(screen.getByText(/drafts are saved locally in this browser/i)).toBeInTheDocument();
    expect(window.location.pathname).toBe('/app');

    fireEvent.click(screen.getByRole('button', {name: 'Continue to editor'}));
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
    expect(screen.getByRole('button', {name: 'Sign in'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Create account'})).toBeInTheDocument();
    expect(screen.queryByRole('tab', {name: 'Tailor'})).not.toBeInTheDocument();
  });

  it('opens the account-unavailable notice from the landing page', async () => {
    window.history.replaceState({}, '', '/');
    render(<App />);

    fireEvent.click(await screen.findByRole('button', {name: 'Create account'}));
    expect(await screen.findByRole('heading', {name: 'Accounts are temporarily unavailable'})).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');

    fireEvent.click(screen.getByRole('button', {name: 'Close'}));
    expect(await screen.findByRole('heading', {name: /Tailor your CV to any job/, level: 1})).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
  });

  it('enters the editor from a call to action', async () => {
    window.history.replaceState({}, '', '/');
    render(<App />);

    fireEvent.click((await screen.findAllByRole('button', {name: /Start building/i}))[0]);
    expect(await screen.findByRole('heading', {name: 'CV Copilot', level: 1})).toBeInTheDocument();
    expect(window.location.pathname).toBe('/app');
  });
});
