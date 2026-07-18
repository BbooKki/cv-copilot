import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {PricingPage} from './PricingPage';

describe('PricingPage', () => {
  it('explains the credit model without pretending checkout is enabled', () => {
    const onStart = vi.fn();
    render(<PricingPage onBack={vi.fn()} onStart={onStart} />);

    expect(screen.getByRole('heading', {name: /Pay for the tailoring you use/})).toBeInTheDocument();
    expect(screen.getByText('5 tailoring credits')).toBeInTheDocument();
    expect(screen.getByText('20 tailoring credits')).toBeInTheDocument();
    expect(screen.getByText(/Checkout and payment collection are not enabled/)).toBeInTheDocument();
    expect(screen.getAllByRole('button', {name: 'Coming soon'})).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', {name: /Start with 1 free credit/}));
    expect(onStart).toHaveBeenCalledOnce();
  });
});
