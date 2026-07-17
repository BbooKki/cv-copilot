import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {testCv} from '../cv/testFixture';
import {CvPreview} from './CvPreview';

describe('CvPreview', () => {
  it('renders modern and classic templates from the same document', () => {
    const {rerender} = render(<CvPreview document={testCv} />);
    expect(screen.getByLabelText('Modern CV preview')).toHaveTextContent('Alex Morgan');
    rerender(<CvPreview document={{...testCv, settings: {...testCv.settings, templateId: 'classic'}}} />);
    expect(screen.getByLabelText('Classic CV preview')).toHaveTextContent('Alex Morgan');
  });
});
