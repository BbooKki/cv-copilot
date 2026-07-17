# CV Copilot

CV Copilot is a privacy-first, AI-assisted CV builder designed for a 24-hour hackathon. Users edit a structured CV, analyze a job description with Gemma 4 E2B running locally in the browser, review truthful suggested improvements, switch between polished templates, and export a PDF.

## Status

This repository currently contains the product and engineering specification. Application implementation should begin with `IMPLEMENTATION_PROMPT.md` and follow `AGENTS.md`.

## Planned stack

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
- `docs/HACKATHON_SCOPE.md` — delivery scope and schedule
- `IMPLEMENTATION_PROMPT.md` — end-to-end build prompt

## Privacy promise

The application should work locally without an account. CV content is processed by the on-device model and leaves the browser only when the user explicitly enables cloud saving. The job URL extractor receives a URL and returns sanitized job text; it never receives the user's CV.
