import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {TemplatePicker} from './TemplatePicker';

describe('TemplatePicker', () => {
  it('presents both templates visually and selects one explicitly', () => {
    const onTemplateChange = vi.fn();
    render(<TemplatePicker settings={{templateId: 'modern', density: 'comfortable', pageSize: 'A4', accentColor: '#262626'}} onTemplateChange={onTemplateChange} onDensityChange={vi.fn()} onPageSizeChange={vi.fn()} onAccentChange={vi.fn()} />);

    expect(screen.getByRole('button', {name: /Modern Mono/})).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', {name: /Classic ATS/}));
    expect(onTemplateChange).toHaveBeenCalledWith('classic');
  });
});
