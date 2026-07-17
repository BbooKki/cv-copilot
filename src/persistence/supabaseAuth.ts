import type {Session, SupabaseClient} from '@supabase/supabase-js';

export type AuthSessionListener = (session: Session | null) => void;

export type SignUpResult = {
  confirmationRequired: boolean;
};

export interface SupabaseAuthService {
  getSession(): Promise<Session | null>;
  subscribe(listener: AuthSessionListener): () => void;
  signUp(email: string, password: string, redirectTo: string): Promise<SignUpResult>;
  signIn(email: string, password: string): Promise<void>;
  requestPasswordReset(email: string, redirectTo: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  signOut(): Promise<void>;
}

export function createSupabaseAuthService(client: SupabaseClient): SupabaseAuthService {
  return {
    async getSession() {
      const {data, error} = await client.auth.getSession();
      if (error) throw error;
      return data.session;
    },
    subscribe(listener) {
      const {data} = client.auth.onAuthStateChange((_event, session) => listener(session));
      return () => data.subscription.unsubscribe();
    },
    async signUp(email, password, redirectTo) {
      const {data, error} = await client.auth.signUp({
        email: email.trim(),
        password,
        options: {emailRedirectTo: redirectTo},
      });
      if (error) throw error;
      return {confirmationRequired: data.session === null};
    },
    async signIn(email, password) {
      const {error} = await client.auth.signInWithPassword({email: email.trim(), password});
      if (error) throw error;
    },
    async requestPasswordReset(email, redirectTo) {
      const {error} = await client.auth.resetPasswordForEmail(email.trim(), {redirectTo});
      if (error) throw error;
    },
    async updatePassword(password) {
      const {error} = await client.auth.updateUser({password});
      if (error) throw error;
    },
    async signOut() {
      const {error} = await client.auth.signOut();
      if (error) throw error;
    },
  };
}

export function getAuthRedirectUrl(currentUrl: string): string {
  const redirectUrl = new URL(currentUrl);
  redirectUrl.search = '';
  redirectUrl.hash = '';
  return redirectUrl.toString();
}

export function getPasswordResetRedirectUrl(currentUrl: string): string {
  const redirectUrl = new URL(getAuthRedirectUrl(currentUrl));
  redirectUrl.pathname = '/account/reset-password';
  return redirectUrl.toString();
}
