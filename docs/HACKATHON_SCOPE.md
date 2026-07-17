# 24-Hour Hackathon Scope

## Must ship

- Structured CV editor with local persistence
- Two polished templates using one CV schema
- Job-description paste input
- Guarded job URL extraction with pasted-text fallback
- Existing Gemma 4 E2B browser runtime adapted to this project
- Structured job-fit analysis and field-level suggestions
- Accept, reject, and undo suggestion workflow
- Print/PDF export
- Responsive, accessible UI
- Production build and HTTPS smoke test

## Should ship

- Supabase email or magic-link authentication
- Owner-only cloud save/load/update/delete
- Model cache management and resource warnings
- Deterministic fictional test fixtures that are not exposed in the production interface

## Could ship

- Reordering with drag handles
- Theme accent selection
- Analysis history
- Shareable read-only link

## Will not ship

- Freeform canvas editing
- More than two templates
- Autonomous internet search
- DOCX import/export
- Payments
- Collaboration
- Public profiles
- Cover-letter generation

## Suggested schedule

| Hours | Outcome |
|---|---|
| 0-2 | Read specifications, scaffold app, establish CV schema and fictional test fixture |
| 2-7 | Editor, local persistence, commands, undo, and live template preview |
| 7-10 | Second template and print/PDF layout |
| 10-14 | Port Gemma worker, model cache, capability checks, and streaming UI |
| 14-17 | Job text ingestion, extraction endpoint, and structured AI protocol |
| 17-19 | Suggestion review, accept/reject, validation, and error states |
| 19-21 | Supabase migration, RLS, optional authentication and cloud repository |
| 21-23 | Deployed HTTPS verification, responsive polish, accessibility, failure paths |
| 23-24 | Demo data, rehearsed script, backup recording, final build |

## Cut order if time slips

1. Remove analysis history.
2. Remove cloud saving but retain the repository interface and migration plan.
3. Make URL extraction secondary and demonstrate pasted job text.
4. Simplify reordering controls.
5. Never cut truthful-suggestion review, local persistence, the live preview, or PDF export.

## Demo preparation

- Cache the model on the demo device before presenting.
- Keep a pasted job description ready if the live URL blocks extraction.
- Keep a known-good fictional analysis fixture in tests, not in the production interface.
- Verify the deployed origin in the exact browser used for judging.
- Record a short backup video of the complete flow.
