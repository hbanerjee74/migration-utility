---
paths:
  - "app/src/**"
---

# Frontend Design System (AD Brand)

## Colors — no raw Tailwind color classes

Use AD brand CSS variables defined in `app/src/styles/globals.css` (auto-switch light/dark). Never
hardcode hex values or raw Tailwind palette classes (`text-green-500`, `bg-blue-400`, etc.).

| Semantic | How to use | Examples |
|---|---|---|
| Success/completed | `style={{ color: "var(--color-seafoam)" }}` | Check icons, completed states, "Saved" |
| Primary/action/info | `style={{ color: "var(--color-pacific)" }}` | CTAs, active states, progress, links |
| Secondary/depth | `style={{ color: "var(--color-ocean)" }}` | Secondary accents |
| Warning | `text-amber-600 dark:text-amber-400` | AD warning color — no CSS variable exists for amber |
| Error/destructive | `text-destructive` / `bg-destructive` | Themed via CSS variable |
| Text | `text-foreground` / `text-muted-foreground` | Body text, labels |
| Backgrounds | `bg-muted`, `bg-card`, `bg-background` | Themed surfaces |
| Tinted backgrounds | `color-mix(in oklch, var(--color-pacific), transparent 85%)` | Section bands, badges, highlights |

## Typography — use the app's font stack

Use the fonts defined in `app/src/styles/globals.css`. If typography changes, update the shared tokens there rather than introducing per-component font overrides.

| Level | Tailwind | Weight | Tracking | Use for |
|---|---|---|---|---|
| Page title | `text-base` (14px) | `font-semibold` (600) | `tracking-tight` | Section headings, card titles |
| Body | `text-sm` (13px) | `font-normal` (400) | default | Primary content |
| Caption | `text-xs` (12px) | `font-medium` (500) | default | Labels, metadata, badges |
| Micro | `text-[11px]` | `font-medium` (500) | `tracking-wide` | Monospace IDs, tiny labels |
| Monospace | `font-mono` | any | default | Table names, stored proc IDs, code values |

**Never** use `font-bold` (700) for UI headings — use `font-semibold` (600). Reserve 700 for emphasis within body text.

## Spacing — 4px grid

Use Tailwind's spacing scale which maps to a 4px grid: `gap-1` (4px), `gap-2` (8px), `gap-3` (12px), `gap-4` (16px), `gap-6` (24px). Card padding: `p-4` (16px). Section horizontal padding: `px-6` (24px).

## Border radius

| Element | Class | Value |
|---|---|---|
| Buttons, inputs, small elements | `rounded-md` | 6px |
| Cards, dialogs | `rounded-lg` | 8px |
| Pills, badges | `rounded-full` | 9999px |

## Shadows

Cards use `shadow-sm` with `hover:shadow`. No heavy drop shadows. Dark mode prefers borders over shadows.

## Transitions

Use `duration-150` (150ms) for micro interactions (hover, toggle). `duration-200` for standard transitions (expand/collapse). Easing: default ease-out.

## State Indicators

Every pipeline/agent state maps to a fixed colour + icon combination. Never invent new state colours.

| State | Colour | Icon | Badge background |
|---|---|---|---|
| Completed | `var(--color-seafoam)` | `CheckCircle2` | `color-mix(in oklch, var(--color-seafoam), transparent 85%)` |
| Running | `var(--color-pacific)` | `Loader2 animate-spin` | `color-mix(in oklch, var(--color-pacific), transparent 85%)` |
| Pending | `text-muted-foreground` | `Circle` or `Clock` | `bg-muted` |
| Failed | `text-destructive` | `XCircle` | `bg-destructive/15` |
| Blocked | `text-amber-600 dark:text-amber-400` | `AlertTriangle` | `bg-amber-100 dark:bg-amber-900/30` |

All badges: `rounded-full text-xs font-medium px-2 py-0.5`.

## Icons

Use **Lucide React** (`lucide-react`) exclusively. Never install a second icon library.

| Icon | Semantic |
|---|---|
| `CheckCircle2` | Complete / confirmed |
| `Circle` | Pending (no time reference) |
| `Clock` | Pending (time-aware) |
| `ChevronRight` | Active step indicator |
| `Loader2` + `animate-spin` | Running |
| `XCircle` | Failed |
| `AlertTriangle` | Blocked / warning |
| `ChevronDown` | Row expansion |

Icon colours follow the state indicator table above. Apply via `style={{ color: "var(...)" }}` or a Tailwind color class matching the state rules.

## Components (shadcn/ui)

Install from shadcn/ui only. Do not bring in other component libraries.

| Component | Typical use |
|---|---|
| `Table`, `TableRow`, `TableCell` | Data-heavy tabular views |
| `Checkbox` | Multi-select and opt-in controls |
| `Input` | Free-form text input |
| `Select` | Small predefined option sets |
| `Button` | Primary and secondary actions |
| `Badge` | Compact status indicators |
| `Card`, `Separator` | Grouping and section boundaries |
| `Sheet` | Contextual side panels |
| `RadioGroup` | Single choice among a few options |
| `Textarea` | Multi-line user input |
| `ResizablePanelGroup`, `ResizablePanel` | Split-pane layouts |
| `Combobox` | Searchable option picking |
| `ScrollArea` | Scrollable bounded regions |
| `Progress` | Percent-complete feedback |
| `Collapsible` | Progressive disclosure |

## Logging

Canonical logging requirements (levels, redaction, correlation IDs) are in `.claude/rules/logging-policy.md`.
