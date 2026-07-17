create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  template_id text not null check (template_id in ('classic', 'modern')),
  schema_version integer not null default 1 check (schema_version > 0),
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.job_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_url text,
  company text,
  role text,
  extracted_text text not null check (char_length(extracted_text) between 1 and 100000),
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.ai_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resume_id uuid not null,
  job_target_id uuid not null,
  model text not null,
  protocol_version integer not null check (protocol_version > 0),
  result jsonb not null check (jsonb_typeof(result) = 'object'),
  created_at timestamptz not null default now(),
  constraint ai_analyses_resume_owner_fk foreign key (resume_id, user_id)
    references public.resumes(id, user_id) on delete cascade,
  constraint ai_analyses_job_owner_fk foreign key (job_target_id, user_id)
    references public.job_targets(id, user_id) on delete cascade
);

create index resumes_user_updated_idx on public.resumes(user_id, updated_at desc);
create index job_targets_user_created_idx on public.job_targets(user_id, created_at desc);
create index ai_analyses_user_created_idx on public.ai_analyses(user_id, created_at desc);
create index ai_analyses_resume_owner_idx on public.ai_analyses(resume_id, user_id);
create index ai_analyses_job_target_owner_idx on public.ai_analyses(job_target_id, user_id);

alter table public.resumes enable row level security;
alter table public.job_targets enable row level security;
alter table public.ai_analyses enable row level security;

revoke all on public.resumes from anon, authenticated;
revoke all on public.job_targets from anon, authenticated;
revoke all on public.ai_analyses from anon, authenticated;

grant select, insert, update, delete on public.resumes to authenticated;
grant select, insert, update, delete on public.job_targets to authenticated;
grant select, insert, update, delete on public.ai_analyses to authenticated;

create policy "resumes_select_own" on public.resumes for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "resumes_insert_own" on public.resumes for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "resumes_update_own" on public.resumes for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "resumes_delete_own" on public.resumes for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "job_targets_select_own" on public.job_targets for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "job_targets_insert_own" on public.job_targets for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "job_targets_update_own" on public.job_targets for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "job_targets_delete_own" on public.job_targets for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "ai_analyses_select_own" on public.ai_analyses for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "ai_analyses_insert_own" on public.ai_analyses for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "ai_analyses_update_own" on public.ai_analyses for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "ai_analyses_delete_own" on public.ai_analyses for delete to authenticated
  using ((select auth.uid()) = user_id);
