# Persistence ERD

The MVP stores each CV as a versioned JSON document. Templates remain in source code and are not database records.

```mermaid
erDiagram
    AUTH_USERS ||--o{ RESUMES : owns
    AUTH_USERS ||--o{ JOB_TARGETS : creates
    RESUMES ||--o{ AI_ANALYSES : analyzed
    JOB_TARGETS ||--o{ AI_ANALYSES : compared_against

    AUTH_USERS {
        uuid id PK
    }

    RESUMES {
        uuid id PK
        uuid user_id FK
        text title
        text template_id
        integer schema_version
        jsonb content
        timestamptz created_at
        timestamptz updated_at
    }

    JOB_TARGETS {
        uuid id PK
        uuid user_id FK
        text source_url
        text company
        text role
        text extracted_text
        timestamptz created_at
    }

    AI_ANALYSES {
        uuid id PK
        uuid user_id FK
        uuid resume_id FK
        uuid job_target_id FK
        text model
        integer protocol_version
        jsonb result
        timestamptz created_at
    }
```

## Table rules

### `resumes`

- `content` must validate as the current `CvDocument` before write.
- `schema_version` enables future document migrations.
- `template_id` is presentation preference, not part of CV facts.
- All CRUD is owner-only.

### `job_targets`

- Persisting a job target is optional.
- Store sanitized extracted text, not full page HTML.
- All CRUD is owner-only.

### `ai_analyses`

- Stores the validated structured result for reproducibility.
- `model` records the precise runtime model identifier.
- An analysis must belong to the same user as its resume and job target.
- Deleting a resume or job target should delete dependent analyses.

## Access model

- Browser access uses the `authenticated` role.
- Every table has RLS enabled.
- SELECT, INSERT, UPDATE, and DELETE policies verify ownership.
- UPDATE policies use ownership predicates in both `USING` and `WITH CHECK`.
- Explicit grants expose only required operations to `authenticated`.
- `anon` receives no table access for the MVP.

## Deferred entities

Resume versions, public share links, custom templates, subscriptions, teams, and comments are intentionally excluded.
