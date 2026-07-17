create table public.account_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null check (plan in ('free', 'premium')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.account_entitlements enable row level security;

revoke all on public.account_entitlements from anon, authenticated;
grant select on public.account_entitlements to authenticated;

create policy "account_entitlements_select_own"
  on public.account_entitlements
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy "resumes_insert_own" on public.resumes;
create policy "resumes_insert_premium_own"
  on public.resumes
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.account_entitlements entitlement
      where entitlement.user_id = (select auth.uid())
        and entitlement.plan = 'premium'
        and (entitlement.expires_at is null or entitlement.expires_at > now())
    )
  );

drop policy "resumes_update_own" on public.resumes;
create policy "resumes_update_premium_own"
  on public.resumes
  for update
  to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.account_entitlements entitlement
      where entitlement.user_id = (select auth.uid())
        and entitlement.plan = 'premium'
        and (entitlement.expires_at is null or entitlement.expires_at > now())
    )
  )
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.account_entitlements entitlement
      where entitlement.user_id = (select auth.uid())
        and entitlement.plan = 'premium'
        and (entitlement.expires_at is null or entitlement.expires_at > now())
    )
  );
