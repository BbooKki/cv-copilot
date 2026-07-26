# Design System

## Direction

CV Copilot uses a restrained light liquid-glass interface: a silver-gray ambient canvas, translucent white surfaces, fine specular borders, graphite typography, compact monospace metadata, and restrained motion.

The application shell is light and softly layered. CV previews and exported documents remain opaque paper-white for readability, printing, and professional use. Glass belongs to application chrome only; never apply transparency, blur, ambient gradients, or decorative effects to CV content.

## Design principles

- Professional before decorative: the product should feel like a serious editing instrument.
- Neutral by default: graphite, white, silver, and cool neutral gray carry almost all hierarchy.
- Information-dense but calm: compact labels and panels without visual noise.
- Depth with restraint: use specular borders, subtle inner highlights, and cool-gray shadows only to separate major layers.
- Motion communicates state: use animation for loading, transitions, and feedback, not spectacle.
- The document is the focus: editor chrome should recede around the white CV preview.

## Color tokens

### Application shell

| Token | Value | Use |
|---|---:|---|
| `--app-canvas` | `#e7ecf2` | Ambient page background |
| `--app-canvas-deep` | `#d7dee8` | Preview wells and deeper neutral separation |
| `--app-surface` | `rgba(255,255,255,0.58)` | Major glass panels |
| `--app-surface-raised` | `rgba(255,255,255,0.76)` | Toolbars, inputs, and selected surfaces |
| `--app-surface-solid` | `#f8fafc` | Fallback when backdrop blur is unavailable |
| `--app-border` | `rgba(255,255,255,0.76)` | Specular glass edge |
| `--app-border-strong` | `rgba(100,116,139,0.24)` | Dividers and input edges |
| `--app-text` | `#172033` | Primary text and headings |
| `--app-text-secondary` | `#475569` | Body and descriptions |
| `--app-text-muted` | `#64748b` | Labels and secondary metadata |
| `--app-text-subtle` | `#8793a3` | Timestamps and quiet metadata |
| `--app-inverse-bg` | `#101827` | Primary actions |
| `--app-inverse-text` | `#ffffff` | Text on primary actions |

### Functional status colors

Status colors are exceptions, not brand colors. Use them only with icons or labels, never as large decorative areas.

| State | Value | Examples |
|---|---:|---|
| Success/ready | `#34d399` | Model ready, save complete |
| Warning | `#fbbf24` | Resource warning, unsaved conflict |
| Error/destructive | `#f87171` | Extraction failure, delete action |

### CV document

| Token | Value | Use |
|---|---:|---|
| `--paper` | `#ffffff` | Preview and printed page |
| `--paper-text` | `#171717` | Main document text |
| `--paper-secondary` | `#525252` | Secondary document text |
| `--paper-rule` | `#d4d4d4` | Dividers |
| `--paper-accent` | user-selected, default `#262626` | Small template accent only |

Print styles must force paper and text colors regardless of the application's dark theme.

## Typography

- Body/UI: `Inter`, then `ui-sans-serif`, then system sans-serif.
- Display headings: `Space Grotesk`, then sans-serif.
- Status, metrics, shortcuts, and technical labels: `JetBrains Mono`, then system monospace.
- Load web fonts with safe fallbacks and avoid blocking the editor if fonts fail.
- Use uppercase and wide tracking only for compact metadata labels, tabs, statuses, and eyebrow text.
- Do not uppercase form values, CV content, long headings, or instructional paragraphs.

Suggested hierarchy:

- Product/page title: display font, tight tracking, strong weight.
- Section title: display or body font, medium-to-semibold weight.
- Field label: monospace, `10-11px`, uppercase, `0.12-0.18em` tracking.
- Body: `14-16px`, comfortable line height.
- Microcopy/metrics: monospace, `9-11px`, muted color.

## Shape, borders, and elevation

- Use `16-20px` radii for major panels, `10-12px` for controls, and pills only for compact statuses or segmented controls.
- Major floating surfaces use `background: rgba(255,255,255,0.58)`, a white specular border, `16-20px` backdrop blur, and one restrained cool-gray shadow.
- Nested cards use translucent fills without backdrop blur so depth remains legible and performance stays predictable.
- Ambient gradients remain neutral and low contrast. Do not introduce colorful blobs, rainbow refraction, or animated distortion.
- Browsers without backdrop-filter receive an opaque `#f8fafc` surface fallback.

## Components

### Buttons

- Primary: graphite background, white text, strong readable label.
- Secondary: translucent white surface, graphite text, neutral border.
- Ghost: transparent with muted text; brighten on hover.
- Destructive: neutral by default, red only at the confirmation/destructive state.
- All buttons need visible focus, disabled, hover, and busy states.

### Inputs

- Translucent white surface with a cool-gray border and subtle inner highlight.
- Graphite entered text, slate placeholder, and a clearly visible dark focus ring.
- Labels sit above fields; placeholders never replace labels.
- Validation text appears directly below the relevant control.

### Panels and navigation

- Use borders and spacing to separate editor, preview, AI review, and persistence controls.
- Selected segmented navigation uses an opaque white inset surface with graphite text and a compact shadow.
- Do not blur every nested region; hierarchy should come from spacing, type, borders, and a small number of major glass layers.

### Suggestions

- Display original and proposed text with clear labels.
- Use neutral surfaces for pending suggestions.
- Accepted state may use a small success indicator; rejected state becomes visually quiet.
- Accept and reject must never rely on color alone.

### AI loading

- Present model size, download progress, initialization, cached state, and cancellation in a technical, transparent style.
- A thin graphite progress bar and compact monospace metrics keep technical state transparent.
- Reserve animated scanline or grid texture for the AI setup/empty state only; never place it behind the CV or long-form editor content.

## Layout

- Laptop and desktop (`>=1024px`): centered, sticky CV preview on the left (`60-65%`) and a focused Copilot pane on the right (`35-40%`).
- The Copilot pane provides clear `Edit` and `Tailor` modes within one continuous workspace. Structured fields remain the primary control for exact CV facts; local-AI output appears as reviewable suggestion cards.
- Keep template, undo, local-save status, and PDF export in the top toolbar so they remain available from either mode.
- Keep account creation, sign-in state, and sign-out in a persistent toolbar control on desktop and mobile. Account UI must explain that cloud upload happens only after an explicit save action.
- Use a matte silver preview well behind the white paper with a subtle cool shadow and edge rule.
- Keep the primary toolbar sticky as a floating frosted control bar.
- Mobile: switch between `CV` and `Copilot` instead of squeezing both panes side by side.
- The CV preview should preserve real page proportions and predictable print margins.
- Present all four fixed templates as keyboard-operable visual cards in the Copilot pane. The selected card uses both an icon/label and inverse treatment; selection must not rely on color alone.
- `Classic ATS` is an elegant single-column document with conservative typography and a highly predictable reading order.
- `Modern Editorial` uses an asymmetric header, editorial typography, and a controlled secondary column without sacrificing legibility.
- `Professional Sidebar` uses a restrained accent sidebar for contact details, skills, education, and languages.
- `Minimal Technical` uses compact sans and monospace hierarchy, numbered sections, and precise rules for an understated technical profile.
- Layout density is a two-option control: `Comfortable` and `Compact`.
- Gemma design recommendations use only the four tested templates, the two density modes, and the professional accent allowlist. Always show a rationale and `Apply`/`Dismiss` actions.

### Empty states and example content

- Start new users with an empty canonical CV; do not prefill a name, employer, role, dates, job description, or achievements.
- Do not render fake personal data on the paper preview. When the document is empty, show a restrained workspace empty state without pretending it is CV content.
- Field labels remain visible. Use placeholders only for necessary format guidance such as a URL or date shape; never use them as substitute user data.
- New repeatable entries begin empty and receive neutral interface titles such as `New experience` until the user enters content.
- Keep test fixtures out of the production interface.

## Motion

- Default transitions: `150-200ms`, ease-out.
- Respect `prefers-reduced-motion`.
- Animate panel entry, progress, accepted suggestions, and template transitions sparingly.
- Avoid constant glow, large parallax, background movement, and animation inside the printed document.

## Accessibility

- Meet WCAG AA contrast for UI text and controls.
- Never use gray lighter/darker distinctions as the only state signal.
- Maintain visible dark keyboard focus on every light or glass surface.
- Touch targets should be at least `40px` in dense editor areas and preferably `44px` for primary actions.
- Preserve browser zoom and avoid text smaller than `12px` for meaningful instructions.

## Reference boundaries

Keep the neutral palette, typography roles, fine borders, graphite actions, compact metadata, and transparent local-AI status presentation. Do not introduce personal branding, contact content, portfolio navigation, colorful glass, or full-screen spectacle.
