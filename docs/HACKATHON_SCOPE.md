# 24-Hour Hackathon Scope

## Must ship

- Structured CV editor with local persistence
- Four polished, visually distinct templates using one CV schema
- Job-description paste input
- Guarded job URL extraction with pasted-text fallback
- Consent-gated cloud analysis with optional Gemma Private Mode
- Structured job-fit analysis and field-level suggestions
- Accept, reject, and undo suggestion workflow
- Optional cited company-and-role research with no CV data
- Interview questions and a deterministic CV-derived pitch
- Direct preview editing for narrative fields
- Print/PDF export
- Responsive, accessible UI
- Production build and HTTPS smoke test

## Should ship

- Supabase email/password authentication with confirmation and password recovery
- Owner-only cloud list/open/delete, with premium-gated cloud create/update
- Model cache management and resource warnings
- Deterministic fictional test fixtures that are not exposed in the production interface
- Server-side AI rate limits, daily budget, and emergency kill switch

## Could ship

- Reordering with drag handles
- Theme accent selection
- Role-based contact strategy and quota-free deterministic outreach templates
- Shareable read-only link

## Will not ship

- Freeform canvas editing
- User-authored or marketplace templates
- Autonomous internet search without explicit user approval
- DOCX import/export
- Payments
- Collaboration
- Public profiles
- Employee discovery or contact inference
- Cover-letter generation

## Post-MVP experimental exception

- A disabled-by-default, user-triggered public-team experiment may return up to five names and roles only when each is cited to a first-party company page.
- It excludes personal profiles and all inferred contact details, remains separate from Company brief and outreach generation, and can be disabled immediately with its server feature flag.

## Suggested schedule

| Hours | Outcome |
|---|---|
| 0-2 | Read specifications, scaffold app, establish CV schema and fictional test fixture |
| 2-7 | Editor, local persistence, commands, undo, and live template preview |
| 7-10 | Four fixed templates and print/PDF layout |
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

- Verify cloud quota and keep Private Mode cached as a fallback.
- Keep a pasted job description ready if the live URL blocks extraction.
- Keep a known-good fictional analysis fixture in tests, not in the production interface.
- Verify the deployed origin in the exact browser used for judging.
- Record a short backup video of the complete flow.
