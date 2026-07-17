import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import type {Session} from '@supabase/supabase-js';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {createBlankCv} from '../cv/blank';
import type {AccountEntitlementRepository} from './accountEntitlement';
import {AccountPage} from './AccountPage';
import type {SupabaseAuthService} from './supabaseAuth';
import type {CloudResumeRepository} from './supabaseResumeRepository';

afterEach(() => {
  cleanup();
  window.history.replaceState({}, '', '/');
});

function createAuth(session: Session | null): SupabaseAuthService {
  return {
    getSession: vi.fn().mockResolvedValue(session),
    subscribe: vi.fn(() => vi.fn()),
    signUp: vi.fn().mockResolvedValue({confirmationRequired: true}),
    signIn: vi.fn().mockResolvedValue(undefined),
    requestPasswordReset: vi.fn().mockResolvedValue(undefined),
    updatePassword: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
  };
}

function createRepository(): CloudResumeRepository {
  return {list: vi.fn().mockResolvedValue([]), load: vi.fn(), save: vi.fn(), remove: vi.fn().mockResolvedValue(undefined)};
}

const premium: AccountEntitlementRepository = {get: vi.fn().mockResolvedValue({plan: 'premium', premiumActive: true, expiresAt: null})};

describe('AccountPage', () => {
  it('creates an email/password account and shows the confirmation step', async () => {
    window.history.replaceState({}, '', '/account');
    const auth = createAuth(null);
    render(<AccountPage auth={auth} entitlements={premium} repository={createRepository()} onBack={vi.fn()} onOpenDocument={vi.fn()} onPasswordResetComplete={vi.fn()} />);

    fireEvent.click(await screen.findByRole('tab', {name: 'Create account'}));
    fireEvent.change(screen.getByLabelText('Email address'), {target: {value: 'person@example.com'}});
    fireEvent.change(screen.getByLabelText('Password'), {target: {value: 'secure-pass'}});
    fireEvent.click(screen.getByRole('button', {name: 'Create account'}));

    await waitFor(() => expect(auth.signUp).toHaveBeenCalledWith('person@example.com', 'secure-pass', expect.stringContaining('/account')));
    expect(await screen.findByRole('status')).toHaveTextContent('confirm your account');
  });

  it('lists, opens, and explicitly confirms deletion of owner CVs', async () => {
    const session = {user: {id: 'user-1', email: 'person@example.com'}} as unknown as Session;
    const repository = createRepository();
    const document = {...createBlankCv(), id: 'resume-1', title: 'Frontend CV'};
    vi.mocked(repository.list).mockResolvedValue([{id: 'resume-1', title: 'Frontend CV', updatedAt: '2026-07-18T00:00:00.000Z'}]);
    vi.mocked(repository.load).mockResolvedValue(document);
    const onOpenDocument = vi.fn();
    render(<AccountPage auth={createAuth(session)} entitlements={premium} repository={repository} onBack={vi.fn()} onOpenDocument={onOpenDocument} onPasswordResetComplete={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', {name: 'Open Frontend CV'}));
    await waitFor(() => expect(onOpenDocument).toHaveBeenCalledWith(document));

    fireEvent.click(screen.getByRole('button', {name: 'Delete Frontend CV'}));
    expect(repository.remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', {name: 'Delete'}));
    await waitFor(() => expect(repository.remove).toHaveBeenCalledWith('resume-1'));
  });

  it('updates a password only from an authenticated recovery session', async () => {
    const session = {user: {id: 'user-1', email: 'person@example.com'}} as unknown as Session;
    const auth = createAuth(session);
    const onPasswordResetComplete = vi.fn();
    render(<AccountPage passwordRecovery auth={auth} entitlements={premium} repository={createRepository()} onBack={vi.fn()} onOpenDocument={vi.fn()} onPasswordResetComplete={onPasswordResetComplete} />);

    fireEvent.change(await screen.findByLabelText('New password'), {target: {value: 'new-secure-pass'}});
    fireEvent.click(screen.getByRole('button', {name: 'Update password'}));

    await waitFor(() => expect(auth.updatePassword).toHaveBeenCalledWith('new-secure-pass'));
    expect(onPasswordResetComplete).toHaveBeenCalledOnce();
  });
});
