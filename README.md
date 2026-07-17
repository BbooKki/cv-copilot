# CV Copilot

CV Copilot is an AI-assisted application accelerator designed for a hackathon. Users edit a structured CV, analyze a job description with a fast cloud model or optional private on-device model, review truthful improvements, research a company with cited Google results, prepare for interviews, and export a polished PDF.

## Status

The hackathon MVP includes a responsive structured editor, direct preview editing, two print-ready templates, local autosave and undo, guarded job-page extraction, reviewable AI suggestions, optional cited company research, interview preparation, quota-free outreach templates, PDF export, and optional owner-only Supabase backup.

## Stack

- React 19, TypeScript, Vite, and Tailwind CSS
- Gemma 4 E2B with LiteRT-LM, WebGPU, a Web Worker, and browser caching
- Vercel Functions for guarded job-page extraction and server-side cloud AI
- Supabase Auth and Postgres for optional cloud saving
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

LiteRT may log an unavailable NPU, `No Winograd`, or mel-filterbank warnings while successfully registering WebGPU. Treat the UI's runtime phase and error message as the source of truth. If structured output fails, expand **Show raw model output**; generation request IDs prevent an older cancelled response from contaminating its retry.

## Cloud schema

The committed migration in `supabase/migrations/` creates resumes, job targets, and AI analyses with explicit authenticated grants, row-level security, owner-only policies, and same-user foreign-key integrity. The app remains fully usable when cloud configuration is absent.

## Supabase Auth setup

Cloud backup uses passwordless email magic links. The browser receives only the project URL and a publishable key; never add a secret or service-role key to a `VITE_` variable.

1. Create or select the CV Copilot project in the intended Supabase account.
2. Link the checkout with `supabase link --profile hongfeiliu --project-ref <project-ref>`.
3. Apply the committed migration through the normal Supabase migration workflow.
4. In **Auth → URL Configuration**, set the Site URL to the production application URL. Add the exact production URL, `http://localhost:5173/**`, and the required Vercel preview pattern to the redirect allow list.
5. Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_CLOUD_ENABLED=true` locally and in the deployment environment.

The magic-link redirect returns to the current application path. Query parameters and URL fragments are removed before the redirect URL is sent to Supabase. A signed-in user still chooses when to upload by pressing **Save to cloud**; signing in alone does not upload CV content.
