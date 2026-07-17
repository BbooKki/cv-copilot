import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {sampleCv} from '../cv/sample';
import {CvPreview} from './CvPreview';

describe('CvPreview', () => {
  it('renders modern and classic templates from the same document', () => {
    const {rerender} = render(<CvPreview document={sampleCv} />);
    expect(screen.getByLabelText('Modern CV preview')).toHaveTextContent('Dylan Islom');
    rerender(<CvPreview document={{...sampleCv, settings: {...sampleCv.settings, templateId: 'classic'}}} />);
    expect(screen.getByLabelText('Classic CV preview')).toHaveTextContent('Dylan Islom');
  });
});
