import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {CvPreview} from './CvPreview';
import {testCv} from '../cv/testFixture';

afterEach(cleanup);

describe('preview click-to-edit wiring', () => {
  it('invokes onEditField with the summary target when the summary is clicked', () => {
    const onEditField = vi.fn();
    render(<CvPreview document={testCv} onEditField={onEditField} />);
    fireEvent.click(screen.getByText(/Product engineer experienced/));
    expect(onEditField).toHaveBeenCalledWith({kind: 'summary'});
  });

  it('renders plain, non-interactive text when no edit handler is provided (print/export path)', () => {
    render(<CvPreview document={testCv} />);
    expect(screen.queryByRole('button', {name: /Product engineer experienced/})).not.toBeInTheDocument();
    expect(screen.getByText(/Product engineer experienced/)).toBeInTheDocument();
  });
});
