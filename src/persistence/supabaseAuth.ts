import type {Session, SupabaseClient} from '@supabase/supabase-js';

export type AuthSessionListener = (session: Session | null) => void;

export interface SupabaseAuthService {
  getSession(): Promise<Session | null>;
  subscribe(listener: AuthSessionListener): () => void;
  sendMagicLink(email: string, redirectTo: string): Promise<void>;
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
    async sendMagicLink(email, redirectTo) {
      const {error} = await client.auth.signInWithOtp({
        email: email.trim(),
        options: {emailRedirectTo: redirectTo, shouldCreateUser: true},
      });
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
