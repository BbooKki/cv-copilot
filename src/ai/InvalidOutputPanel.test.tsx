import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {InvalidOutputPanel} from './InvalidOutputPanel';

describe('InvalidOutputPanel', () => {
  it('shows the raw response and offers retry and dismissal actions', () => {
    const onRetry = vi.fn();
    const onDismiss = vi.fn();
    render(<InvalidOutputPanel message="Expected valid JSON." rawOutput='{"protocolVersion":1,"suggestions":[' retrying={false} onRetry={onRetry} onDismiss={onDismiss} />);

    expect(screen.getByText('Structured response was incomplete')).toBeInTheDocument();
    expect(screen.getByText(/"suggestions"/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'Retry smaller response'}));
    fireEvent.click(screen.getByRole('button', {name: 'Dismiss invalid response'}));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
