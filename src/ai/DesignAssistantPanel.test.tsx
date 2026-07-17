import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {DesignAssistantPanel} from './DesignAssistantPanel';

describe('DesignAssistantPanel', () => {
  it('shows a validated recommendation and waits for explicit acceptance', () => {
    const onAccept = vi.fn();
    render(<DesignAssistantPanel settings={{templateId: 'modern', density: 'comfortable', pageSize: 'A4', accentColor: '#262626'}} status="ready" cached progressPercent={100} hasContent isDesignGenerating={false} recommendation={{protocolVersion: 1, templateId: 'classic', density: 'compact', accentColor: '#334155', rationale: 'A compact single-column layout keeps a longer CV easy to scan.'}} error="" onLoad={vi.fn()} onGenerate={vi.fn()} onCancel={vi.fn()} onAccept={onAccept} onDismiss={vi.fn()} />);

    expect(screen.getByText('Classic ATS · Compact')).toBeInTheDocument();
    expect(onAccept).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', {name: /Apply design/}));
    expect(onAccept).toHaveBeenCalledOnce();
  });
});
