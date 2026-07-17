import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {testCv} from '../cv/testFixture';
import {CvPreview} from './CvPreview';

describe('CvPreview', () => {
  it.each([
    ['classic', 'Classic ATS CV preview'],
    ['modern', 'Modern Editorial CV preview'],
    ['sidebar', 'Professional Sidebar CV preview'],
    ['minimal', 'Minimal Technical CV preview'],
  ] as const)('renders the %s template from the canonical document', (templateId, accessibleName) => {
    render(<CvPreview document={{...testCv, settings: {...testCv.settings, templateId}}} />);
    expect(screen.getByLabelText(accessibleName)).toHaveTextContent('Alex Morgan');
    expect(screen.getByLabelText(accessibleName)).toHaveTextContent('Northstar Labs');
    expect(screen.getByLabelText(accessibleName)).toHaveTextContent('Atlas Dashboard');
  });
});
