import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {createBlankCv} from '../cv/blank';
import {CvEditor} from './CvEditor';

describe('CvEditor', () => {
  it('updates printable identity live and derives the internal document title', () => {
    const onChange = vi.fn();
    render(<CvEditor document={createBlankCv()} onChange={onChange} />);

    expect(screen.queryByRole('textbox', {name: /Document name/i})).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', {name: 'Full name'}), {target: {value: 'MY NAME'}});

    const updatedDocument = onChange.mock.calls[0][0];
    expect(updatedDocument.basics.fullName).toBe('MY NAME');
    expect(updatedDocument.title).toBe('MY NAME CV');
  });
});
