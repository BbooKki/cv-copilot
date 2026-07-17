import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import type {Session} from '@supabase/supabase-js';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {createBlankCv} from '../cv/blank';
import {CloudPanel} from './CloudPanel';
import type {SupabaseAuthService} from './supabaseAuth';
import type {CloudResumeRepository} from './supabaseResumeRepository';

afterEach(cleanup);

function createAuth(session: Session | null): SupabaseAuthService {
  return {
    getSession: vi.fn().mockResolvedValue(session),
    subscribe: vi.fn(() => vi.fn()),
    sendMagicLink: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
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

describe('CloudPanel', () => {
  it('keeps local saving available when Supabase is not configured', () => {
    render(<CloudPanel document={createBlankCv()} onLoad={vi.fn()} auth={null} repository={createRepository()} />);

    expect(screen.getByText(/still saved locally in this browser/i)).toBeInTheDocument();
  });

  it('directs signed-out users to the account control', async () => {
    const auth = createAuth(null);
    render(<CloudPanel document={createBlankCv()} onLoad={vi.fn()} auth={auth} repository={createRepository()} />);

    await waitFor(() => expect(screen.getByText((_content, element) => element?.tagName === 'P' && element.textContent?.includes('Use Sign in in the top toolbar') === true)).toBeInTheDocument());
    expect(auth.sendMagicLink).not.toHaveBeenCalled();
  });

  it('lists cloud documents and saves a non-empty CV for the signed-in user', async () => {
    const session = {user: {id: 'user-1', email: 'person@example.com'}} as unknown as Session;
    const auth = createAuth(session);
    const repository = createRepository();
    const document = {...createBlankCv(), basics: {...createBlankCv().basics, fullName: 'Example Person'}};
    vi.mocked(repository.list).mockResolvedValue([{id: 'resume-1', title: 'Existing CV', updatedAt: '2026-07-17T00:00:00.000Z'}]);
    vi.mocked(repository.save).mockResolvedValue(document);
    const onLoad = vi.fn();
    render(<CloudPanel document={document} onLoad={onLoad} auth={auth} repository={repository} />);

    expect(await screen.findByText('Existing CV')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'Save to cloud'}));

    await waitFor(() => expect(repository.save).toHaveBeenCalledWith(document));
    expect(onLoad).toHaveBeenCalledWith(document);
    expect(await screen.findByText('Saved securely to your account.')).toBeInTheDocument();
  });

  it('does not allow an empty CV to be uploaded', async () => {
    const session = {user: {id: 'user-1', email: 'person@example.com'}} as unknown as Session;
    render(<CloudPanel document={createBlankCv()} onLoad={vi.fn()} auth={createAuth(session)} repository={createRepository()} />);

    const saveButton = await screen.findByRole('button', {name: 'Save to cloud'});
    expect(saveButton).toBeDisabled();
    expect(screen.getByText(/Add CV content before saving/i)).toBeInTheDocument();
  });
});
