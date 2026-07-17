import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import type {Session} from '@supabase/supabase-js';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {createBlankCv} from '../cv/blank';
import type {AccountEntitlementRepository} from './accountEntitlement';
import type {SupabaseAuthService} from './supabaseAuth';
import {CloudPanel} from './CloudPanel';
import type {CloudResumeRepository} from './supabaseResumeRepository';

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

function createRepository(): CloudResumeRepository {
  return {
    list: vi.fn().mockResolvedValue([]),
    load: vi.fn(),
    save: vi.fn(),
    remove: vi.fn(),
  };
}

function createEntitlements(premiumActive: boolean): AccountEntitlementRepository {
  return {get: vi.fn().mockResolvedValue({plan: premiumActive ? 'premium' : 'free', premiumActive, expiresAt: null})};
}

describe('CloudPanel', () => {
  it('keeps local saving available when Supabase is not configured', () => {
    render(<CloudPanel document={createBlankCv()} onLoad={vi.fn()} onOpenAccount={vi.fn()} auth={null} repository={createRepository()} />);

    expect(screen.getByText(/still saved locally in this browser/i)).toBeInTheDocument();
  });

  it('routes signed-out users to account access', async () => {
    const onOpenAccount = vi.fn();
    render(<CloudPanel document={createBlankCv()} onLoad={vi.fn()} onOpenAccount={onOpenAccount} auth={createAuth(null)} repository={createRepository()} />);

    fireEvent.click(await screen.findByRole('button', {name: 'Sign in or create account'}));
    expect(onOpenAccount).toHaveBeenCalledOnce();
  });

  it('does not allow a free account to create or update cloud CVs', async () => {
    const session = {user: {id: 'user-1', email: 'person@example.com'}} as unknown as Session;
    const document = {...createBlankCv(), basics: {...createBlankCv().basics, fullName: 'Example Person'}};
    const repository = createRepository();
    render(<CloudPanel document={document} onLoad={vi.fn()} onOpenAccount={vi.fn()} auth={createAuth(session)} entitlements={createEntitlements(false)} repository={repository} />);

    const saveButton = await screen.findByRole('button', {name: 'Save to account'});
    await waitFor(() => expect(saveButton).toBeDisabled());
    expect(screen.getByText(/require premium access/i)).toBeInTheDocument();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('saves a non-empty CV for a premium account', async () => {
    const session = {user: {id: 'user-1', email: 'person@example.com'}} as unknown as Session;
    const document = {...createBlankCv(), basics: {...createBlankCv().basics, fullName: 'Example Person'}};
    const repository = createRepository();
    vi.mocked(repository.save).mockResolvedValue(document);
    const onLoad = vi.fn();
    render(<CloudPanel document={document} onLoad={onLoad} onOpenAccount={vi.fn()} auth={createAuth(session)} entitlements={createEntitlements(true)} repository={repository} />);

    const saveButton = await screen.findByRole('button', {name: 'Save to account'});
    await waitFor(() => expect(saveButton).toBeEnabled());
    fireEvent.click(saveButton);

    await waitFor(() => expect(repository.save).toHaveBeenCalledWith(document));
    expect(onLoad).toHaveBeenCalledWith(document);
    expect(await screen.findByText('Saved securely to your account.')).toBeInTheDocument();
  });

  it('does not allow an empty CV to be uploaded by a premium account', async () => {
    const session = {user: {id: 'user-1', email: 'person@example.com'}} as unknown as Session;
    render(<CloudPanel document={createBlankCv()} onLoad={vi.fn()} onOpenAccount={vi.fn()} auth={createAuth(session)} entitlements={createEntitlements(true)} repository={createRepository()} />);

    const saveButton = await screen.findByRole('button', {name: 'Save to account'});
    await waitFor(() => expect(saveButton).toBeDisabled());
    expect(screen.getByText(/Add CV content before saving/i)).toBeInTheDocument();
  });
});
