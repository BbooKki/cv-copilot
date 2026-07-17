# Supabase migrations

Do not manually invent timestamped migration filenames.

After the correct hackathon Supabase account is connected and the Supabase CLI is available:

1. Inspect the installed CLI with `supabase --help` and `supabase migration --help`.
2. Initialize/link the project only with explicit user authorization.
3. Create the first migration with `supabase migration new <descriptive_name>`.
4. Implement `docs/ERD.md`, explicit Data API grants, and owner-only RLS policies.
5. Verify anonymous denial, owner CRUD, and cross-user denial.
6. Run available database advisors and inspect the migration list.

No live project is connected by this scaffold.
