# Product Definition

## One-line pitch

Paste a job posting and turn a truthful, editable CV into a tailored PDF and interview-ready application brief in minutes.

## Problem

Job seekers repeatedly rewrite the same CV for different roles. Existing design tools provide flexibility but require manual editing, while many AI CV tools obscure what changed, invent details, or require users to upload sensitive employment history to a remote model.

## Target user

A technically comfortable job seeker who already has work history and wants a fast, credible CV tailored to a specific job.

## Core value

- Fast: reach a tailored CV in minutes.
- Truthful: suggestions may improve wording and prioritization but cannot manufacture facts.
- Flexible: fast consented cloud analysis is the default, with optional on-device Private Mode.
- Controllable: every suggestion is reviewable, reversible, and editable.
- Presentable: two strong templates and reliable PDF output.

## Primary journey

1. Start with a blank CV or a locally saved draft.
2. Build the CV from the Copilot pane using precise field controls, with a live paper preview beside it.
3. Send a job URL or job-description text through the Tailor conversation.
4. Choose recommended cloud analysis or optional on-device Private Mode.
5. Analyze fit, review evidence, and accept or reject field-level suggestions.
6. Optionally research the company with user-triggered Google grounding and claim-level citations.
7. Generate likely interview questions and a deterministic CV-derived pitch; create quota-free outreach templates locally.
8. Edit supported narrative fields directly from the paper preview and select one of two tested templates.
9. Export or print the CV as PDF, then optionally sign in and save it to Supabase.

## Workspace model

- Laptop and desktop widths from `1024px` use two primary panes: a sticky live PDF-style preview on the left and CV Copilot on the right.
- The Copilot pane combines structured editing with a guided Tailor conversation, local-AI controls, and reviewable suggestion cards. The conversation accepts job input and follow-up questions about validated fit, gaps, and edits; it is not an unconstrained general-purpose chatbot.
- Tailor displays user and assistant messages plus visible retrieval and generation progress. Follow-up answers reuse the validated analysis locally whenever possible instead of spending another cloud request.
- Tailor exposes cloud and Private Mode explicitly. Every operation that sends CV employment content requires versioned cloud consent.
- Selecting an editing section exposes its exact fields; users do not need to express precise facts such as dates or contact details conversationally.
- AI changes always remain explicit accept/reject actions with original and proposed text.
- Template choice is presented visually. Gemma may recommend a tested template, professional accent, and layout density, but it cannot generate or execute arbitrary markup or CSS.
- Mobile switches between `CV` and `Copilot` views instead of compressing both panes.
- A new user never sees another person's CV as their own document. Test fixtures are never available in the production interface.
- Account access remains visible from every workspace mode. Authentication uses a passwordless email link; signing in never uploads CV content by itself.

## MVP acceptance criteria

- The editor works without authentication and survives refresh using local persistence.
- The same canonical CV renders correctly in two visually distinct templates.
- Users can reorder and edit repeatable experience, education, project, and skill entries.
- Job input supports URL extraction and pasted-text fallback.
- Cloud analysis is server-side, bounded, rate-limited, and schema-validated; Private Mode remains off the UI thread.
- AI returns a structured analysis and field-specific suggestions.
- Suggestions show original and proposed text and can be accepted or rejected independently.
- AI never silently changes CV state.
- Company research never receives CV content, starts only after a user action, and shows citations attached to individual claims.
- Interview pitches are reconstructed from cited CV fields before display; outreach drafts are deterministic local templates.
- Changing CV or job inputs invalidates dependent generated results.
- AI design output is schema-validated and changes presentation only after explicit acceptance.
- PDF/print output is legible, removes editor chrome, and avoids obvious section clipping.
- Unsupported browsers receive an actionable fallback instead of a broken AI screen.
- Signed-in users can save, list, open, update, and delete only their own cloud documents.

## Success demo

The presenter opens a prepared local draft, pastes a job posting, consents to cloud analysis, accepts grounded CV suggestions, optionally researches the company with citations, prepares interview material, edits a bullet directly on the preview, and exports a PDF. Private Mode is shown as the on-device alternative.

## Non-goals

- Pixel-level Canva-style freeform editing
- Autonomous multi-site job search or research without explicit user action
- ATS score guarantees
- Fabricating or inferring missing career facts
- DOCX parsing or export
- Payments or subscriptions
- Collaborative editing
- More than two production-quality templates
- Employee discovery, personal-profile aggregation, or inferred contact details
