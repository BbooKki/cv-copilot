# Architecture

## System overview

```mermaid
flowchart LR
    U["User"] --> UI["React CV editor"]
    UI <--> LS["Local persistence"]
    UI --> W["Gemma Web Worker"]
    W <--> C["Browser model cache"]
    UI --> X["Job extraction API"]
    X --> J["Public job page"]
    UI -. "optional sync" .-> S["Supabase Auth + Postgres"]
    UI --> P["Print/PDF renderer"]
```

## Trust boundaries

### Browser

The browser owns the canonical CV state, template rendering, local persistence, suggestion review, and Gemma inference. CV data must not be sent to the job extraction endpoint.

### Gemma worker

The worker owns model download, integrity-size checks, cache access, engine initialization, conversation lifecycle, streaming, cancellation, and structured generation. Worker messages use a typed protocol. The UI never accesses the inference engine directly.

### Job extraction function

The function accepts one public HTTP(S) URL and returns normalized, size-limited job text plus basic metadata. It is not a general proxy. It must validate DNS/IP destinations before requests and redirects, allow only appropriate textual content, enforce timeout/size limits, and sanitize the document.

### Supabase

Supabase stores optional user-owned documents. The frontend uses a publishable key and relies on explicit grants plus RLS. Secret keys are not required for normal user CRUD.

## Frontend modules

```text
src/
├── app/                 routing and app shell
├── components/          shared accessible UI
├── cv/                  schema, state, commands, validation
├── editor/              field and section editors
├── templates/           pure CV renderers
├── ai/                  prompts, schemas, suggestion workflow
├── gemma/               worker, protocol, runtime facade
├── jobs/                URL/text ingestion and normalization
├── persistence/         local and Supabase repositories
├── print/               print preparation and pagination helpers
└── test/                fixtures and shared test utilities
```

## State model

- `CvDocument` is the only source of truth for resume content.
- Editor actions operate through typed commands.
- `AiAnalysis` is stored separately from `CvDocument`.
- Accepting a suggestion creates a reversible patch and updates `CvDocument`.
- Template choice changes presentation only, never content.
- Local persistence is available immediately; cloud persistence is an optional adapter.

## Runtime flow

1. Load a local document or seed example.
2. Validate it against the CV schema.
3. Render editor and selected template from the same object.
4. Normalize pasted job text or retrieve it through `/api/extract-job`.
5. Build a bounded prompt containing the trusted instruction, CV facts, and untrusted job text in clearly delimited sections.
6. Ask Gemma for JSON matching `AI_PROTOCOL.md`.
7. Parse and validate the JSON; display errors without mutating the CV.
8. Apply only user-approved suggestion patches.

## Deployment strategy

- Use Vercel for the Vite application and URL extraction function.
- Perform an early HTTPS smoke deployment to validate worker bundling, WASM resolution, Hugging Face CORS, Cache API behavior, and WebGPU.
- Connect Supabase only after the local editor and persistence interface work.
- Do not make deployment a prerequisite for local development.
