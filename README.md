# CV Copilot

CV Copilot is an AI-assisted application accelerator designed for a hackathon. Users edit a structured CV, analyze a job description with a fast cloud model or optional private on-device model, review truthful improvements, research a company with cited Google results, prepare for interviews, and export a polished PDF.

## Status

The hackathon MVP includes a responsive structured editor, direct preview editing, two print-ready templates, local autosave and undo, guarded job-page extraction, reviewable AI suggestions, optional cited company research, interview preparation, quota-free outreach templates, PDF export, and optional owner-only Supabase backup.

## Stack

- React 19, TypeScript, Vite, and Tailwind CSS
- Gemma 4 E2B with LiteRT-LM, WebGPU, a Web Worker, and browser caching
- Vercel Functions for guarded job-page extraction and server-side cloud AI
- Supabase Auth and Postgres for optional premium cloud saving
- Browser print CSS for PDF export

## Documents

- `AGENTS.md` — binding repository rules
- `docs/PRODUCT.md` — product definition and acceptance criteria
- `docs/ARCHITECTURE.md` — system boundaries and runtime flow
- `docs/ERD.md` — persistence model
- `docs/CV_SCHEMA.md` — canonical CV data contract
- `docs/AI_PROTOCOL.md` — local model input/output contract
- `docs/DESIGN_SYSTEM.md` — monochrome product UI and paper CV styling
- `docs/HACKATHON_SCOPE.md` — delivery scope and schedule
- `IMPLEMENTATION_PROMPT.md` — end-to-end build prompt

## Privacy model

The application works without an account. Cloud analysis is the recommended fast path and requires explicit consent; name and contact fields are removed before employment content and job text are sent to the provider. Private Mode runs the existing model on-device. Company research receives only public company, role, and job information. Cloud saving remains a separate explicit action.

## Run locally

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`; add a server-only Gemini key and any optional Supabase publishable values.
4. Run `npm run dev`.

Useful checks are `npm run typecheck`, `npm test`, and `npm run build`. The Gemma artifact is about 2.01 GB and downloads only after explicit user action in a WebGPU-capable browser. It is cached locally and is never bundled with the deployment.

For local Gemma verification, use `npm run build` followed by `npm run preview`, then test in a WebGPU-enabled Chrome or Edge browser. The production build emits the classic worker required by LiteRT's WASM loader; ordinary UI development can still use `npm run dev`. Test the final deployed HTTPS origin separately before presenting.

The public-team search is an experimental, first-party-only feature and is disabled by default. For local evaluation, set both `VITE_PEOPLE_RESEARCH_ENABLED=true` and `PEOPLE_RESEARCH_ENABLED=true`. The first flag exposes the button; the second is the independent server kill switch. Never enable only the browser flag in production, and keep both false to restore the stable Company brief flow.

LiteRT may log an unavailable NPU, `No Winograd`, or mel-filterbank warnings while successfully registering WebGPU. Treat the UI's runtime phase and error message as the source of truth. If structured output fails, expand **Show raw model output**; generation request IDs prevent an older cancelled response from contaminating its retry.

## Cloud schema

The committed migrations create resumes, job targets, AI analyses, and account entitlements with explicit grants, row-level security, owner-only policies, same-user foreign-key integrity, and premium-gated CV writes. The app remains fully usable when cloud configuration is absent.

## Supabase Auth setup

Cloud saving uses email/password authentication with email confirmation and password recovery. The browser receives only the project URL and a publishable key; never add a secret or service-role key to a `VITE_` variable.

1. Create or select the CV Copilot project in the intended Supabase account.
2. Link the checkout with `supabase link --profile hongfeiliu --project-ref <project-ref>`.
3. Apply the committed migration through the normal Supabase migration workflow.
4. In **Auth → URL Configuration**, set the Site URL to the production application URL. Add the exact production URL, `/account`, `/account/reset-password`, `http://localhost:5173/**`, and the required Vercel preview pattern to the redirect allow list.
5. Keep email confirmation enabled and configure production SMTP before launch; the hosted trial sender is only suitable for development.
6. Grant premium manually for the MVP by inserting or updating the user's row in `public.account_entitlements`. A missing row is a free account; use `plan = 'premium'` and leave `expires_at` null for non-expiring access.
7. Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_CLOUD_ENABLED=true` locally and in the deployment environment.

```sql
insert into public.account_entitlements (user_id, plan, expires_at)
values ('AUTH_USER_UUID', 'premium', null)
on conflict (user_id) do update
set plan = excluded.plan,
    expires_at = excluded.expires_at,
    updated_at = now();
```

Confirmation returns to the account page and password recovery returns to `/account/reset-password`. Query parameters and URL fragments are removed before redirect URLs are sent to Supabase. A premium user still chooses when to upload by pressing **Save to account**; signing in alone does not upload CV content.
