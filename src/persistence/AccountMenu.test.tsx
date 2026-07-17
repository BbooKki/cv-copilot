import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import type {Session} from '@supabase/supabase-js';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {AccountMenu} from './AccountMenu';
import type {SupabaseAuthService} from './supabaseAuth';

afterEach(cleanup);

function createAuth(session: Session | null): SupabaseAuthService {
  return {
    getSession: vi.fn().mockResolvedValue(session),
    subscribe: vi.fn(() => vi.fn()),
    signUp: vi.fn(),
    signIn: vi.fn(),
    requestPasswordReset: vi.fn(),
    updatePassword: vi.fn(),
    signOut: vi.fn(),
  };
}

describe('AccountMenu', () => {
  it('opens the account page when accounts are unavailable', () => {
    const onOpenAccount = vi.fn();
    render(<AccountMenu auth={null} onOpenAccount={onOpenAccount} />);

    fireEvent.click(screen.getByRole('button', {name: 'Sign in'}));
    expect(onOpenAccount).toHaveBeenCalledOnce();
  });

  it('shows signed-in state and opens account management', async () => {
    const session = {user: {id: 'user-1', email: 'person@example.com'}} as unknown as Session;
    const onOpenAccount = vi.fn();
    render(<AccountMenu auth={createAuth(session)} onOpenAccount={onOpenAccount} />);

    const accountButton = await screen.findByRole('button', {name: 'Account'});
    fireEvent.click(accountButton);
    expect(onOpenAccount).toHaveBeenCalledOnce();
  });
});
