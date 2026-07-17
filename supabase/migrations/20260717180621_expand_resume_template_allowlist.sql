alter table public.resumes
  drop constraint if exists resumes_template_id_check;

alter table public.resumes
  add constraint resumes_template_id_check
  check (template_id in ('classic', 'modern', 'sidebar', 'minimal'));
