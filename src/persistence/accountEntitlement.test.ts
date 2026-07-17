import type {SupabaseClient} from '@supabase/supabase-js';
import {describe, expect, it, vi} from 'vitest';
import {parseEntitlement, SupabaseAccountEntitlementRepository} from './accountEntitlement';

describe('account entitlement repository', () => {
  it('treats a missing entitlement row as a free account', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({data: null, error: null});
    const eq = vi.fn(() => ({maybeSingle}));
    const select = vi.fn(() => ({eq}));
    const client = {
      auth: {getUser: vi.fn().mockResolvedValue({data: {user: {id: 'user-1'}}, error: null})},
      from: vi.fn(() => ({select})),
    } as unknown as SupabaseClient;

    await expect(new SupabaseAccountEntitlementRepository(() => client).get()).resolves.toEqual({plan: 'free', premiumActive: false, expiresAt: null});
    expect(client.from).toHaveBeenCalledWith('account_entitlements');
    expect(eq).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('recognizes active, expired, and malformed premium rows', () => {
    const now = new Date('2026-07-18T00:00:00.000Z');
    expect(parseEntitlement({plan: 'premium', expires_at: null}, now)).toEqual({plan: 'premium', premiumActive: true, expiresAt: null});
    expect(parseEntitlement({plan: 'premium', expires_at: '2026-07-19T00:00:00.000Z'}, now).premiumActive).toBe(true);
    expect(parseEntitlement({plan: 'premium', expires_at: '2026-07-17T00:00:00.000Z'}, now)).toEqual({plan: 'free', premiumActive: false, expiresAt: '2026-07-17T00:00:00.000Z'});
    expect(parseEntitlement({plan: 'admin', expires_at: null}, now).premiumActive).toBe(false);
  });
});
