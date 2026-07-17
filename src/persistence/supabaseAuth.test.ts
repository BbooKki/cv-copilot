import type {Session, SupabaseClient} from '@supabase/supabase-js';
import {describe, expect, it, vi} from 'vitest';
import {createSupabaseAuthService, getAuthRedirectUrl, getPasswordResetRedirectUrl} from './supabaseAuth';

describe('Supabase auth service', () => {
  it('signs up with a normalized email, password, and approved confirmation redirect', async () => {
    const signUp = vi.fn().mockResolvedValue({data: {user: {id: 'user-1'}, session: null}, error: null});
    const client = {auth: {signUp}} as unknown as SupabaseClient;
    const auth = createSupabaseAuthService(client);

    await expect(auth.signUp('  person@example.com  ', 'secure-pass', 'https://cv.example.com/account')).resolves.toEqual({confirmationRequired: true});
    expect(signUp).toHaveBeenCalledWith({
      email: 'person@example.com',
      password: 'secure-pass',
      options: {emailRedirectTo: 'https://cv.example.com/account'},
    });
  });

  it('signs in and supports the complete password-reset flow', async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({data: {}, error: null});
    const resetPasswordForEmail = vi.fn().mockResolvedValue({data: {}, error: null});
    const updateUser = vi.fn().mockResolvedValue({data: {}, error: null});
    const client = {auth: {signInWithPassword, resetPasswordForEmail, updateUser}} as unknown as SupabaseClient;
    const auth = createSupabaseAuthService(client);

    await auth.signIn(' person@example.com ', 'secure-pass');
    await auth.requestPasswordReset(' person@example.com ', 'https://cv.example.com/account/reset-password');
    await auth.updatePassword('new-secure-pass');

    expect(signInWithPassword).toHaveBeenCalledWith({email: 'person@example.com', password: 'secure-pass'});
    expect(resetPasswordForEmail).toHaveBeenCalledWith('person@example.com', {redirectTo: 'https://cv.example.com/account/reset-password'});
    expect(updateUser).toHaveBeenCalledWith({password: 'new-secure-pass'});
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

  it('builds sanitized account and password-reset redirect URLs', () => {
    expect(getAuthRedirectUrl('https://cv.example.com/account?code=secret#access_token=secret')).toBe('https://cv.example.com/account');
    expect(getPasswordResetRedirectUrl('https://cv.example.com/workspace?code=secret')).toBe('https://cv.example.com/account/reset-password');
  });
});
