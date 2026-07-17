# CV Copilot

CV Copilot is a privacy-first, AI-assisted CV builder designed for a 24-hour hackathon. Users edit a structured CV, analyze a job description with Gemma 4 E2B running locally in the browser, review truthful suggested improvements, switch between polished templates, and export a PDF.

## Status

The hackathon MVP is implemented. It includes a structured responsive editor, two print-ready templates, local autosave and undo, guarded job-page extraction, validated Gemma suggestions, PDF export, and optional owner-only Supabase backup.

## Stack

- React 19, TypeScript, Vite, and Tailwind CSS
- Gemma 4 E2B with LiteRT-LM, WebGPU, a Web Worker, and browser caching
- Vercel Function for guarded job-page extraction
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

## Privacy promise

The application works locally without an account. CV content is processed by the on-device model and leaves the browser only when the user explicitly enables cloud saving. The job URL extractor receives a URL and returns sanitized job text; it never receives the user's CV.

## Run locally

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and add optional Supabase publishable values.
4. Run `npm run dev`.

Useful checks are `npm run typecheck`, `npm test`, and `npm run build`. The Gemma artifact is about 2.01 GB and downloads only after explicit user action in a WebGPU-capable browser. It is cached locally and is never bundled with the deployment.

## Cloud schema

The committed migration in `supabase/migrations/` creates resumes, job targets, and AI analyses with explicit authenticated grants, row-level security, owner-only policies, and same-user foreign-key integrity. The app remains fully usable when cloud configuration is absent.
