import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {ApplicationKit} from './ApplicationKit';
import type {GroundedCompanyBrief} from '../ai/research';

const brief: GroundedCompanyBrief = {
  company: 'Acme',
  summary: {text: 'Acme builds developer tools.', citationIds: ['source-0']},
  priorities: [],
  roleContext: null,
  sources: [{id: 'source-0', title: 'Acme Careers', url: 'https://acme.com/careers'}],
};

afterEach(cleanup);

describe('ApplicationKit public-team experiment', () => {
  it('hides the experiment when the client feature flag is off', () => {
    render(<ApplicationKit {...props()} peopleResearchEnabled={false} />);
    expect(screen.queryByRole('button', {name: 'Find publicly listed team members'})).not.toBeInTheDocument();
  });

  it('runs only from its separate button and displays cited official results', () => {
    const onResearchPeople = vi.fn();
    render(<ApplicationKit {...props()} peopleResearchEnabled peopleResult={{
      company: 'Acme',
      people: [{name: 'Jane Doe', role: 'Engineering Director', category: 'hiring-manager', citationIds: ['source-0']}],
      sources: [{id: 'source-0', title: 'Acme Team', url: 'https://acme.com/team'}],
    }} onResearchPeople={onResearchPeople} />);

    fireEvent.click(screen.getByRole('button', {name: 'Refresh publicly listed team members'}));
    expect(onResearchPeople).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Engineering Director')).toBeInTheDocument();
    expect(screen.getByLabelText('Source: Acme Team')).toHaveAttribute('href', 'https://acme.com/team');
  });

  it('shows a graceful empty result without removing the company brief', () => {
    render(<ApplicationKit {...props()} peopleResearchEnabled peopleResult={{company: 'Acme', people: [], sources: []}} />);
    expect(screen.getByText('No publicly listed team members were found on official company pages.')).toBeInTheDocument();
    expect(screen.getByText('Acme builds developer tools.')).toBeInTheDocument();
  });
});

function props() {
  return {
    companyName: 'Acme',
    roleTitle: 'Frontend Engineer',
    companyBrief: brief,
    researchBusy: false,
    researchError: '',
    peopleResearchEnabled: true,
    peopleResult: null,
    peopleBusy: false,
    peopleError: '',
    interviewKit: null,
    interviewBusy: false,
    interviewError: '',
    outreachKit: null,
    outreachBusy: false,
    outreachError: '',
    onCompanyNameChange: vi.fn(),
    onRoleTitleChange: vi.fn(),
    onResearch: vi.fn(),
    onResearchPeople: vi.fn(),
    onPrepareInterview: vi.fn(),
    onPrepareOutreach: vi.fn(),
  };
}
