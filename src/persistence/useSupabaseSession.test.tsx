import {act, renderHook, waitFor} from '@testing-library/react';
import type {Session} from '@supabase/supabase-js';
import {describe, expect, it, vi} from 'vitest';
import type {AuthSessionListener, SupabaseAuthService} from './supabaseAuth';
import {useSupabaseSession} from './useSupabaseSession';

describe('useSupabaseSession', () => {
  it('loads the current session, responds to auth changes, and unsubscribes', async () => {
    let listener: AuthSessionListener | undefined;
    const unsubscribe = vi.fn();
    const auth: SupabaseAuthService = {
      getSession: vi.fn().mockResolvedValue(null),
      subscribe: vi.fn(nextListener => { listener = nextListener; return unsubscribe; }),
      signUp: vi.fn(),
      signIn: vi.fn(),
      requestPasswordReset: vi.fn(),
      updatePassword: vi.fn(),
      signOut: vi.fn(),
    };
    const {result, unmount} = renderHook(() => useSupabaseSession(auth));

    await waitFor(() => expect(result.current.status).toBe('signed-out'));
    const session = {user: {id: 'user-1', email: 'person@example.com'}} as unknown as Session;
    act(() => listener?.(session));
    expect(result.current).toMatchObject({status: 'signed-in', session});

    unmount();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it('surfaces session initialization failures', async () => {
    const auth: SupabaseAuthService = {
      getSession: vi.fn().mockRejectedValue(new Error('Expired local session')),
      subscribe: vi.fn(() => vi.fn()),
      signUp: vi.fn(),
      signIn: vi.fn(),
      requestPasswordReset: vi.fn(),
      updatePassword: vi.fn(),
      signOut: vi.fn(),
    };
    const {result} = renderHook(() => useSupabaseSession(auth));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('Expired local session');
  });
});
