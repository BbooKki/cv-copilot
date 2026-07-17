# Canonical CV Schema

## Principles

- Content and presentation are separate.
- Every repeatable item has a stable ID for editing, ordering, and suggestion targeting.
- Dates remain strings because users may express month precision, year precision, or `present`.
- Optional fields are omitted rather than filled with invented values.
- The document is versioned and validated at local, AI, and database boundaries.

## TypeScript contract

```ts
export type CvDocument = {
  schemaVersion: 1;
  id: string;
  title: string;
  basics: {
    fullName: string;
    headline?: string;
    email?: string;
    phone?: string;
    location?: string;
    website?: string;
    links: Array<{
      id: string;
      label: string;
      url: string;
    }>;
  };
  summary?: string;
  experience: Array<{
    id: string;
    company: string;
    role: string;
    location?: string;
    startDate: string;
    endDate?: string;
    current: boolean;
    highlights: Array<{ id: string; text: string }>;
  }>;
  education: Array<{
    id: string;
    institution: string;
    qualification: string;
    field?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    highlights: Array<{ id: string; text: string }>;
  }>;
  projects: Array<{
    id: string;
    name: string;
    description?: string;
    url?: string;
    technologies: string[];
    highlights: Array<{ id: string; text: string }>;
  }>;
  skills: Array<{
    id: string;
    name: string;
    keywords: string[];
  }>;
  languages: Array<{
    id: string;
    language: string;
    proficiency?: string;
  }>;
  customSections: Array<{
    id: string;
    title: string;
    items: Array<{ id: string; heading?: string; text: string }>;
  }>;
  settings: {
    templateId: "classic" | "modern";
    accentColor: string;
    pageSize: "A4" | "letter";
    density: "comfortable" | "compact";
  };
  updatedAt: string;
};
```

## Validation rules

- IDs are non-empty and unique within their collection.
- Drafts may temporarily contain blank required fields so a newly added entry never needs fake placeholder data. Blank draft entries are omitted from the preview and from AI input; product actions can require meaningful CV content without inventing missing values.
- URLs allow only `https:` and `http:` in user-facing links.
- Email is syntactically validated but not verified.
- Highlight text is plain text, not executable HTML.
- `accentColor` must match an allowed color value or safe CSS color format selected by the UI.
- Unknown fields are rejected when parsing AI output and ignored only during explicit document-version migration.

## Editing behavior

- Empty optional sections do not render in templates.
- Reordering changes array order.
- Deleting an entry requires a reversible local undo action.
- Template switching changes only `settings.templateId`.
- Density changes spacing and typography within a tested renderer; it never changes CV facts.
- AI suggestions target a specific field path or stable item ID; they never replace the entire document.
