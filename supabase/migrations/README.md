# Supabase migrations

Do not manually invent timestamped migration filenames.

After the correct hackathon Supabase account is connected and the Supabase CLI is available:

1. Inspect the installed CLI with `supabase --help` and `supabase migration --help`.
2. Confirm the intended account with `supabase projects list --profile hongfeiliu`.
3. Initialize/link the project only with explicit user authorization, using `--profile hongfeiliu` for CLI operations.
4. Create new migration files with `supabase migration new <descriptive_name>`.
5. Implement `docs/ERD.md`, explicit Data API grants, and owner-only RLS policies.
6. Verify anonymous denial, owner access, cross-user denial, free-account write denial, premium create/update, and owner read/delete after premium expiry.
7. Run available database advisors and inspect the migration list.

No live project is connected by this scaffold.
