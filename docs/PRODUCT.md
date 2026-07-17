# Product Definition

## One-line pitch

Paste a job posting and turn a truthful, editable CV into a tailored, professionally designed PDF without sending personal CV content to a hosted AI model.

## Problem

Job seekers repeatedly rewrite the same CV for different roles. Existing design tools provide flexibility but require manual editing, while many AI CV tools obscure what changed, invent details, or require users to upload sensitive employment history to a remote model.

## Target user

A technically comfortable job seeker who already has work history and wants a fast, credible CV tailored to a specific job.

## Core value

- Fast: reach a tailored CV in minutes.
- Truthful: suggestions may improve wording and prioritization but cannot manufacture facts.
- Private: CV analysis runs locally in the browser.
- Controllable: every suggestion is reviewable, reversible, and editable.
- Presentable: two strong templates and reliable PDF output.

## Primary journey

1. Start from sample data, a blank CV, or a locally saved draft.
2. Edit contact details, summary, experience, education, skills, and projects.
3. Paste a job URL or job-description text.
4. Activate and load the local Gemma model.
5. Analyze fit and generate targeted suggestions.
6. Accept or reject suggestions individually.
7. Switch templates and verify the page preview.
8. Export or print the CV as PDF.
9. Optionally sign in and save the document to Supabase.

## MVP acceptance criteria

- The editor works without authentication and survives refresh using local persistence.
- The same canonical CV renders correctly in two visually distinct templates.
- Users can reorder and edit repeatable experience, education, project, and skill entries.
- Job input supports URL extraction and pasted-text fallback.
- Gemma runs off the UI thread and streams visible progress/results.
- AI returns a structured analysis and field-specific suggestions.
- Suggestions show original and proposed text and can be accepted or rejected independently.
- AI never silently changes CV state.
- PDF/print output is legible, removes editor chrome, and avoids obvious section clipping.
- Unsupported browsers receive an actionable fallback instead of a broken AI screen.
- Signed-in users can save, list, open, update, and delete only their own cloud documents.

## Success demo

The presenter opens a sample CV, pastes a real job posting, loads the already-cached local model, receives a fit summary and three grounded suggestions, accepts two, switches template, and exports a PDF. The presenter then shows that personal CV analysis happened locally.

## Non-goals

- Pixel-level Canva-style freeform editing
- Autonomous multi-site job search
- ATS score guarantees
- Fabricating or inferring missing career facts
- DOCX parsing or export
- Payments or subscriptions
- Collaborative editing
- More than two production-quality templates
