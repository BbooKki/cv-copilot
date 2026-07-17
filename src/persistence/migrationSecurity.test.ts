import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';

const initialMigration = readFileSync('supabase/migrations/20260717063447_initial_schema.sql', 'utf8');
const entitlementMigration = readFileSync('supabase/migrations/20260717171514_add_account_entitlements.sql', 'utf8');

describe('Supabase migration security contract', () => {
  it('keeps resume reads and deletes owner-only', () => {
    expect(initialMigration).toMatch(/resumes_select_own[\s\S]*to authenticated[\s\S]*\(select auth\.uid\(\)\) = user_id/);
    expect(initialMigration).toMatch(/resumes_delete_own[\s\S]*to authenticated[\s\S]*\(select auth\.uid\(\)\) = user_id/);
    expect(initialMigration).toContain('revoke all on public.resumes from anon, authenticated');
  });

  it('exposes entitlements as owner-readable and not browser-writable', () => {
    expect(entitlementMigration).toContain('alter table public.account_entitlements enable row level security');
    expect(entitlementMigration).toContain('grant select on public.account_entitlements to authenticated');
    expect(entitlementMigration).not.toMatch(/grant [^;]*(insert|update|delete)[^;]*account_entitlements[^;]*authenticated/i);
    expect(entitlementMigration).toMatch(/account_entitlements_select_own[\s\S]*\(select auth\.uid\(\)\) = user_id/);
  });

  it('requires an active premium entitlement for resume inserts and updates', () => {
    expect(entitlementMigration).toMatch(/resumes_insert_premium_own[\s\S]*entitlement\.plan = 'premium'[\s\S]*entitlement\.expires_at > now\(\)/);
    expect(entitlementMigration).toMatch(/resumes_update_premium_own[\s\S]*using \([\s\S]*with check \(/);
    expect(entitlementMigration.match(/\(select auth\.uid\(\)\) = user_id/g)).toHaveLength(4);
  });
});
