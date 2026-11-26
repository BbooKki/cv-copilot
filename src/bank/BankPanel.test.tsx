import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {testCv} from '../cv/testFixture';
import type {CvDocument} from '../cv/schema';
import {BankPanel} from './BankPanel';

const at = '2026-01-01T00:00:00.000Z';
const job = 'Web Developer\n- Build real-time monitoring dashboards for equipment status\n- Present time-series data with charting libraries';

function seedBank() {
  localStorage.setItem('cv-copilot-experience-bank-v1', JSON.stringify({schemaVersion: 1, entries: [
    {id: 'b-monitor', title: 'Batch job monitoring', text: 'Built a monitoring dashboard for nightly batch jobs.', tags: ['dashboards'], linkedItemId: 'exp-northstar', updatedAt: at},
    {id: 'b-ble', title: 'BLE reconnection', text: 'Stabilized Bluetooth LE reconnection with wearables.', tags: ['Flutter'], updatedAt: at},
  ]}));
}

function renderPanel(onApplyDocument = vi.fn(), requestConsent = vi.fn()) {
  render(<BankPanel document={testCv} jobText={job} onJobTextChange={() => undefined} cloudConsent={false} onRequestCloudConsent={requestConsent} onApplyDocument={onApplyDocument} />);
  return {onApplyDocument, requestConsent};
}

describe('BankPanel', () => {
  beforeEach(() => { localStorage.clear(); seedBank(); });
  afterEach(cleanup);

  it('retrieves the relevant entry with keyword search when the model is off', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', {name: 'Find matching entries'}));
    expect(screen.getByText('1. Batch job monitoring')).toBeInTheDocument();
    expect(screen.queryByText(/BLE reconnection$/)).not.toBeNull();
    expect(screen.getAllByText('Keyword').length).toBeGreaterThan(0);
  });

  it('adds an entry as written to its linked CV item through the undo path', () => {
    const {onApplyDocument} = renderPanel();
    fireEvent.click(screen.getByRole('button', {name: 'Find matching entries'}));
    fireEvent.click(screen.getAllByRole('button', {name: 'Add as written'})[0]!);
    expect(onApplyDocument).toHaveBeenCalledTimes(1);
    const next = onApplyDocument.mock.calls[0]![0] as CvDocument;
    expect(next.experience[0]!.highlights.at(-1)?.text).toBe('Built a monitoring dashboard for nightly batch jobs.');
    expect(screen.getByText('Added to your CV. Undo is available.')).toBeInTheDocument();
  });

  it('asks for cloud consent before sending entries to cloud AI', () => {
    const {requestConsent} = renderPanel();
    fireEvent.click(screen.getByRole('button', {name: 'Find matching entries'}));
    fireEvent.click(screen.getByRole('button', {name: /Write tailored bullets/}));
    expect(requestConsent).toHaveBeenCalledTimes(1);
  });

  it('saves a new entry to local storage', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', {name: 'Add entry'}));
    fireEvent.change(screen.getByLabelText('Title'), {target: {value: 'Release automation'}});
    fireEvent.change(screen.getByLabelText('What you did'), {target: {value: 'Unified iOS and Android Fastlane lanes.'}});
    fireEvent.click(screen.getByRole('button', {name: 'Add to bank'}));
    const saved = JSON.parse(localStorage.getItem('cv-copilot-experience-bank-v1')!) as {entries: Array<{title: string}>};
    expect(saved.entries.map(entry => entry.title)).toContain('Release automation');
  });
});
