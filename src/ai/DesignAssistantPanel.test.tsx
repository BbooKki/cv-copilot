import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {DesignAssistantPanel} from './DesignAssistantPanel';

describe('DesignAssistantPanel', () => {
  it('shows a validated recommendation and waits for explicit acceptance', () => {
    const onAccept = vi.fn();
    render(<DesignAssistantPanel settings={{templateId: 'modern', density: 'comfortable', pageSize: 'A4', accentColor: '#262626'}} status="ready" progressPercent={100} hasContent isDesignGenerating={false} recommendation={{protocolVersion: 1, templateId: 'classic', density: 'compact', accentColor: '#334155', rationale: 'A compact single-column layout keeps a longer CV easy to scan.'}} error="" onOpenTailor={vi.fn()} onGenerate={vi.fn()} onCancel={vi.fn()} onAccept={onAccept} onDismiss={vi.fn()} />);

    expect(screen.getByText('Classic ATS · Compact')).toBeInTheDocument();
    expect(onAccept).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', {name: /Apply design/}));
    expect(onAccept).toHaveBeenCalledOnce();
  });

  it('directs model activation to Tailor without duplicating the download control', () => {
    const onOpenTailor = vi.fn();
    render(<DesignAssistantPanel settings={{templateId: 'modern', density: 'comfortable', pageSize: 'A4', accentColor: '#262626'}} status="idle" progressPercent={0} hasContent={false} isDesignGenerating={false} recommendation={null} error="" onOpenTailor={onOpenTailor} onGenerate={vi.fn()} onCancel={vi.fn()} onAccept={vi.fn()} onDismiss={vi.fn()} />);

    expect(screen.queryByRole('button', {name: /Download Gemma/i})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: /Open Tailor/i}));
    expect(onOpenTailor).toHaveBeenCalledOnce();
  });
});
