# Design System

## Direction

CV Copilot uses a precise monochrome interface: black canvas, translucent white surfaces, thin white borders, high-contrast typography, compact monospace metadata, and restrained motion.

The application shell is dark. CV previews and exported documents remain paper-white by default for readability, printing, and professional use. Do not turn the CV itself into a dark cyberpunk poster.

## Design principles

- Professional before decorative: the product should feel like a serious editing instrument.
- Monochrome by default: black, white, and neutral gray carry almost all hierarchy.
- Information-dense but calm: compact labels and panels without visual noise.
- Borders over shadows: structure panels with fine strokes and subtle surface changes.
- Motion communicates state: use animation for loading, transitions, and feedback, not spectacle.
- The document is the focus: editor chrome should recede around the white CV preview.

## Color tokens

### Application shell

| Token | Value | Use |
|---|---:|---|
| `--app-canvas` | `#000000` | Page background and deepest surfaces |
| `--app-surface` | `rgba(255,255,255,0.02)` | Panels and sidebars |
| `--app-surface-raised` | `rgba(255,255,255,0.05)` | Inputs, selected rows, hover surfaces |
| `--app-surface-strong` | `#171717` | Disabled controls and strong separation |
| `--app-border` | `rgba(255,255,255,0.10)` | Default borders and dividers |
| `--app-border-hover` | `rgba(255,255,255,0.30)` | Hover and interactive emphasis |
| `--app-border-focus` | `rgba(255,255,255,0.55)` | Keyboard and input focus |
| `--app-text` | `#ffffff` | Primary text and headings |
| `--app-text-secondary` | `#a3a3a3` | Body and descriptions (`neutral-400`) |
| `--app-text-muted` | `#737373` | Labels and secondary metadata (`neutral-500`) |
| `--app-text-subtle` | `#525252` | Timestamps and quiet metadata (`neutral-600`) |
| `--app-inverse-bg` | `#ffffff` | Primary action and selected inverse surface |
| `--app-inverse-text` | `#000000` | Text on inverse surfaces |

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

- Prefer square or lightly rounded corners (`0-8px`).
- Use `1px` borders for panels, inputs, suggestion cards, and toolbar separation.
- Default panel treatment: `background: rgba(255,255,255,0.02)` with `border-color: rgba(255,255,255,0.10)`.
- Avoid large soft drop shadows on dark surfaces.
- A subtle white glow is allowed around the local-AI activation or focused primary action, but never around every card.
- Use gradients only as near-invisible surface depth, not colorful decoration.

## Components

### Buttons

- Primary: white background, black text, strong readable label.
- Secondary: black or translucent surface, white/gray text, `white/15` border.
- Ghost: transparent with muted text; brighten on hover.
- Destructive: neutral by default, red only at the confirmation/destructive state.
- All buttons need visible focus, disabled, hover, and busy states.

### Inputs

- Black or translucent surface with a `white/10-15` border.
- White entered text, `neutral-600` placeholder, `white/40-55` focus border.
- Labels sit above fields; placeholders never replace labels.
- Validation text appears directly below the relevant control.

### Panels and navigation

- Use borders and spacing to separate editor, preview, AI review, and persistence controls.
- Selected navigation may invert to white-on-black or use a white underline.
- Do not fill every region with a different gray; hierarchy should come from spacing, type, and borders.

### Suggestions

- Display original and proposed text with clear labels.
- Use neutral surfaces for pending suggestions.
- Accepted state may use a small success indicator; rejected state becomes visually quiet.
- Accept and reject must never rely on color alone.

### AI loading

- Present model size, download progress, initialization, cached state, and cancellation in a technical, transparent style.
- A thin white progress bar and compact monospace metrics match the portfolio reference.
- Reserve animated scanline or grid texture for the AI setup/empty state only; never place it behind the CV or long-form editor content.

## Layout

- Laptop and desktop (`>=1024px`): centered, sticky CV preview on the left (`60-65%`) and a focused Copilot pane on the right (`35-40%`).
- The Copilot pane provides clear `Edit` and `Tailor` modes within one continuous workspace. Structured fields remain the primary control for exact CV facts; local-AI output appears as reviewable suggestion cards.
- Keep template, undo, local-save status, and PDF export in the top toolbar so they remain available from either mode.
- Keep account creation, sign-in state, and sign-out in a persistent toolbar control on desktop and mobile. Account UI must explain that cloud upload happens only after an explicit save action.
- Use a dark neutral workspace behind the white paper so page edges are obvious.
- Keep the primary toolbar sticky when useful, with a black translucent background and bottom border.
- Mobile: switch between `CV` and `Copilot` instead of squeezing both panes side by side.
- The CV preview should preserve real page proportions and predictable print margins.
- Present `Modern Mono` and `Classic ATS` as keyboard-operable visual cards in the Copilot pane. The selected card uses both an icon/label and inverse treatment; selection must not rely on color alone.
- Layout density is a two-option control: `Comfortable` and `Compact`.
- Gemma design recommendations use only the two tested templates, the two density modes, and the professional accent allowlist. Always show a rationale and `Apply`/`Dismiss` actions.

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
- Maintain visible keyboard focus on the black canvas.
- Touch targets should be at least `40px` in dense editor areas and preferably `44px` for primary actions.
- Preserve browser zoom and avoid text smaller than `12px` for meaningful instructions.

## Reference boundaries

Keep the established palette, typography roles, fine borders, inverse buttons, compact metadata, and local-AI presentation. Do not introduce personal branding, contact content, portfolio navigation, or full-screen cyberpunk effects.
