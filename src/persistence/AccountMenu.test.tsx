import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import type {Session} from '@supabase/supabase-js';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {AccountMenu} from './AccountMenu';
import type {SupabaseAuthService} from './supabaseAuth';

afterEach(cleanup);

function createAuth(session: Session | null): SupabaseAuthService {
  return {
    getSession: vi.fn().mockResolvedValue(session),
    subscribe: vi.fn(() => vi.fn()),
    sendMagicLink: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
  };
}

describe('AccountMenu', () => {
  it('explains that accounts are unavailable without Supabase configuration', () => {
    render(<AccountMenu auth={null} />);
    fireEvent.click(screen.getByRole('button', {name: 'Sign in'}));

    expect(screen.getByText(/Accounts are not configured yet/i)).toBeInTheDocument();
  });

  it('creates or signs into an account using a magic link', async () => {
    const auth = createAuth(null);
    render(<AccountMenu auth={auth} />);
    fireEvent.click(screen.getByRole('button', {name: 'Sign in'}));
    const email = await screen.findByRole('textbox', {name: 'Email address'});

    fireEvent.change(email, {target: {value: 'person@example.com'}});
    fireEvent.click(screen.getByRole('button', {name: 'Continue with email'}));

    await waitFor(() => expect(auth.sendMagicLink).toHaveBeenCalledWith('person@example.com', expect.any(String)));
    expect(await screen.findByRole('status')).toHaveTextContent('person@example.com');
  });

  it('shows the active account and signs out', async () => {
    const session = {user: {id: 'user-1', email: 'person@example.com'}} as unknown as Session;
    const auth = createAuth(session);
    render(<AccountMenu auth={auth} />);
    const accountButton = await screen.findByRole('button', {name: 'Account'});
    fireEvent.click(accountButton);

    expect(await screen.findByText('person@example.com')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'Sign out'}));

    await waitFor(() => expect(auth.signOut).toHaveBeenCalledOnce());
  });

  it('closes the account panel with Escape', () => {
    render(<AccountMenu auth={null} />);
    fireEvent.click(screen.getByRole('button', {name: 'Sign in'}));
    expect(screen.getByRole('dialog', {name: 'Your account'})).toBeInTheDocument();

    fireEvent.keyDown(document, {key: 'Escape'});
    expect(screen.queryByRole('dialog', {name: 'Your account'})).not.toBeInTheDocument();
  });
});
