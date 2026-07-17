import type {Session, SupabaseClient} from '@supabase/supabase-js';
import {describe, expect, it, vi} from 'vitest';
import {createSupabaseAuthService, getAuthRedirectUrl} from './supabaseAuth';

describe('Supabase auth service', () => {
  it('requests a magic link with a normalized email and approved redirect', async () => {
    const signInWithOtp = vi.fn().mockResolvedValue({data: {user: null, session: null}, error: null});
    const client = {auth: {signInWithOtp}} as unknown as SupabaseClient;
    const auth = createSupabaseAuthService(client);

    await auth.sendMagicLink('  person@example.com  ', 'https://cv.example.com/');

    expect(signInWithOtp).toHaveBeenCalledWith({
      email: 'person@example.com',
      options: {emailRedirectTo: 'https://cv.example.com/', shouldCreateUser: true},
    });
  });

  it('propagates initialization and sign-out errors', async () => {
    const sessionError = new Error('Session unavailable');
    const signOutError = new Error('Sign out failed');
    const client = {auth: {
      getSession: vi.fn().mockResolvedValue({data: {session: null}, error: sessionError}),
      signOut: vi.fn().mockResolvedValue({error: signOutError}),
    }} as unknown as SupabaseClient;
    const auth = createSupabaseAuthService(client);

    await expect(auth.getSession()).rejects.toThrow('Session unavailable');
    await expect(auth.signOut()).rejects.toThrow('Sign out failed');
  });

  it('subscribes to auth changes and disposes the SDK subscription', () => {
    const unsubscribe = vi.fn();
    let sdkListener: ((_event: string, session: Session | null) => void) | undefined;
    const onAuthStateChange = vi.fn((listener: typeof sdkListener) => {
      sdkListener = listener;
      return {data: {subscription: {unsubscribe}}};
    });
    const client = {auth: {onAuthStateChange}} as unknown as SupabaseClient;
    const auth = createSupabaseAuthService(client);
    const listener = vi.fn();

    const dispose = auth.subscribe(listener);
    sdkListener?.('SIGNED_OUT', null);
    dispose();

    expect(listener).toHaveBeenCalledWith(null);
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it('removes callback parameters from the auth redirect URL', () => {
    expect(getAuthRedirectUrl('https://cv.example.com/workspace?code=secret#access_token=secret')).toBe('https://cv.example.com/workspace');
  });
});
