import type {SupabaseClient} from '@supabase/supabase-js';
import {supabase} from './supabaseClient';

export type AccountEntitlement = {
  plan: 'free' | 'premium';
  premiumActive: boolean;
  expiresAt: string | null;
};

export interface AccountEntitlementRepository {
  get(): Promise<AccountEntitlement>;
}

type EntitlementRow = {
  plan: unknown;
  expires_at: unknown;
};

function configuredClient(): SupabaseClient {
  if (!supabase) throw new Error('Accounts are not configured.');
  return supabase;
}

export class SupabaseAccountEntitlementRepository implements AccountEntitlementRepository {
  constructor(private readonly getClient: () => SupabaseClient = configuredClient) {}

  async get(): Promise<AccountEntitlement> {
    const client = this.getClient();
    const {data: authData, error: authError} = await client.auth.getUser();
    if (authError || !authData.user) throw new Error('Sign in before checking account access.');

    const {data, error} = await client
      .from('account_entitlements')
      .select('plan,expires_at')
      .eq('user_id', authData.user.id)
      .maybeSingle();
    if (error) throw error;
    return parseEntitlement(data as EntitlementRow | null);
  }
}

export function parseEntitlement(row: EntitlementRow | null, now = new Date()): AccountEntitlement {
  if (!row || row.plan !== 'premium') return {plan: 'free', premiumActive: false, expiresAt: null};
  const expiresAt = typeof row.expires_at === 'string' ? row.expires_at : null;
  const expiresAtTime = expiresAt ? Date.parse(expiresAt) : Number.POSITIVE_INFINITY;
  const premiumActive = expiresAt === null || (Number.isFinite(expiresAtTime) && expiresAtTime > now.getTime());
  return {plan: premiumActive ? 'premium' : 'free', premiumActive, expiresAt};
}

export const accountEntitlementRepository = new SupabaseAccountEntitlementRepository();
