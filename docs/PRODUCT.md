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

1. Start with a blank CV or a locally saved draft.
2. Build the CV from the Copilot pane using precise field controls, with a live paper preview beside it.
3. Paste a job URL or job-description text in the Copilot pane.
4. Activate and load the local Gemma model.
5. Analyze fit and generate targeted suggestions in the same pane.
6. Accept or reject suggestions individually and see the preview update.
7. Choose between two visual template cards or ask Gemma for a constrained design recommendation.
8. Export or print the CV as PDF.
9. Optionally sign in and save the document to Supabase.

## Workspace model

- Laptop and desktop widths from `1024px` use two primary panes: a sticky live PDF-style preview on the left and CV Copilot on the right.
- The Copilot pane combines structured editing, job input, local-AI controls, and reviewable suggestion cards. It is not an unconstrained chatbot.
- Selecting an editing section exposes its exact fields; users do not need to express precise facts such as dates or contact details conversationally.
- AI changes always remain explicit accept/reject actions with original and proposed text.
- Template choice is presented visually. Gemma may recommend a tested template, professional accent, and layout density, but it cannot generate or execute arbitrary markup or CSS.
- Mobile switches between `CV` and `Copilot` views instead of compressing both panes.
- A new user never sees another person's CV as their own document. Test fixtures are never available in the production interface.

## MVP acceptance criteria

- The editor works without authentication and survives refresh using local persistence.
- The same canonical CV renders correctly in two visually distinct templates.
- Users can reorder and edit repeatable experience, education, project, and skill entries.
- Job input supports URL extraction and pasted-text fallback.
- Gemma runs off the UI thread and streams visible progress/results.
- AI returns a structured analysis and field-specific suggestions.
- Suggestions show original and proposed text and can be accepted or rejected independently.
- AI never silently changes CV state.
- AI design output is schema-validated and changes presentation only after explicit acceptance.
- PDF/print output is legible, removes editor chrome, and avoids obvious section clipping.
- Unsupported browsers receive an actionable fallback instead of a broken AI screen.
- Signed-in users can save, list, open, update, and delete only their own cloud documents.

## Success demo

The presenter opens a prepared local draft, pastes a real job posting, loads the already-cached local model, receives a fit summary and three grounded suggestions, accepts two, requests and accepts a design recommendation, and exports a PDF. The presenter then shows that personal CV analysis happened locally.

## Non-goals

- Pixel-level Canva-style freeform editing
- Autonomous multi-site job search
- ATS score guarantees
- Fabricating or inferring missing career facts
- DOCX parsing or export
- Payments or subscriptions
- Collaborative editing
- More than two production-quality templates
