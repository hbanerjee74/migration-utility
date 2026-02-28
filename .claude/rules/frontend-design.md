---
paths:
  - "app/src/**"
---

# Frontend Design System (AD Brand)

## Colors — no raw Tailwind color classes

**Never** use Tailwind color classes like `text-green-500`, `bg-blue-400`, `text-yellow-600`, `text-red-500`. All semantic colors use AD brand CSS variables defined in `app/src/styles/globals.css` (auto-switch light/dark):

| Semantic | How to use | Examples |
|---|---|---|
| Success/completed | `style={{ color: "var(--color-seafoam)" }}` | Check icons, completed states, "Saved" |
| Primary/action/info | `style={{ color: "var(--color-pacific)" }}` | CTAs, active states, progress, links |
| Secondary/depth | `style={{ color: "var(--color-ocean)" }}` | Secondary accents |
| Warning | `text-amber-600 dark:text-amber-400` | Only exception — amber IS the AD warning color |
| Error/destructive | `text-destructive` / `bg-destructive` | Already themed via CSS variable |
| Text | `text-foreground` / `text-muted-foreground` | Body text, labels |
| Backgrounds | `bg-muted`, `bg-card`, `bg-background` | Themed surfaces |
| Tinted backgrounds | `color-mix(in oklch, var(--color-pacific), transparent 85%)` | Section bands, badges, highlights |

## Typography — use the app's font stack

The app uses **Inter Variable** (sans) and **JetBrains Mono Variable** (mono), defined in `globals.css`. Never introduce other fonts.

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
| N/A (no agent for cell) | — | (empty) | `bg-muted/30` |

Candidacy tier badges follow the same mapping — Migrate = running colours, Review = warning colours, Reject = error colours.

All badges: `rounded-full text-xs font-medium px-2 py-0.5`.

### Stepper states

The left sidebar stepper is driven by `workflowStore`, not TanStack Router. Navigation calls `setStep()`, which validates state before allowing the transition.

| State | Icon | Colour | Clickable |
|---|---|---|---|
| Pending | `Circle` | `text-muted-foreground` | Yes (backward only) |
| Active | `ChevronRight` | `var(--color-pacific)` | Yes |
| Complete | `CheckCircle2` | `var(--color-seafoam)` | Yes (any direction) |
| Locked | `Circle` | `text-muted-foreground` + `opacity-50` | No |

Active step also has a 2px left border: `style={{ borderLeft: "2px solid var(--color-pacific)" }}`.

### Monitor progress bar

Use the `Progress` component. Show counts, not percentages: `N complete · M failed · P pending`. "Re-run failed" button is only visible when failed count > 0. Failed rows float to the top of the agent grid — do not replace the grid with a generic error state.

## Icons

Use **Lucide React** (`lucide-react`) exclusively. Never install a second icon library.

| Icon | Semantic | Where used |
|---|---|---|
| `CheckCircle2` | Complete / confirmed | Stepper complete, table confirmed, phase complete |
| `Circle` | Pending (no time reference) | Stepper pending |
| `Clock` | Pending (time-aware) | Agent phase not yet started |
| `ChevronRight` | Active step indicator | Stepper active |
| `Loader2` + `animate-spin` | Running | Agent phases, async loading |
| `XCircle` | Failed | Agent phase failed |
| `AlertTriangle` | Blocked / warning | BLOCKED procedures, recoverable warnings |
| `Pencil` | User override | Candidacy OVR column, FDE-edited fields |
| `ChevronDown` | Row expansion | Collapsible trigger |
| `Wand2` | AI origin (optional label decoration) | AI-suggested field indicator |

Icon colours follow the state indicator table above. Apply via `style={{ color: "var(...)" }}` or a Tailwind color class matching the state rules.

## AI-Suggested Fields

Fields pre-populated by an agent get a **2px pacific left border** to signal AI origin. When the FDE edits the field, remove the border — the field is now FDE-owned.

```tsx
// Wrapper when field is AI-suggested
<div style={{ borderLeft: "2px solid var(--color-pacific)", paddingLeft: "8px" }}>
  <label className="text-xs text-muted-foreground">
    Incremental column
    <Wand2 className="inline ml-1 w-3 h-3 text-muted-foreground" /> {/* optional */}
  </label>
  <Combobox ... />
</div>

// Wrapper after FDE edits — border removed
<div style={{ paddingLeft: "10px" }}>
  ...
</div>
```

Apply to: `table_type`, `load_strategy`, `snapshot_strategy`, `incremental_column`, `date_column`, `pii_columns` in Table Config — any field the candidacy agent pre-populates. Do NOT apply to required user-input fields that are never agent-populated.

## Layout

- **Sidebar:** Fixed `w-52` (208px). Never change — maintaining 1072px content width on a 1280px viewport.
- **Master-detail split** (Table Config): `ResizablePanelGroup` with ~40% list / ~60% form. Use fixed CSS grid if resizing is not needed.
- **Schema group rows** in Scope: rendered as separate `tr` rows (`bg-muted`) injected between data rows during render — not part of TanStack Table's data model.
- **Sticky toolbars/footers:** `sticky top-0` or `sticky bottom-0`, `z-40`, with a separating border.

## Table Patterns

- **Identifier columns** (table names, stored proc names): `font-mono text-sm`. Always monospace.
- **Row expansion:** Expand inline as a sub-row spanning all columns (`bg-muted/50 p-3 text-sm font-mono`), triggered by `ChevronDown` or row click. Use `Collapsible` — never a modal or Sheet for inline detail.
- **Filter toolbar layout:** `[Search Input] [Filter Dropdown …] [Checkbox] [Count label]` above the table. Count format: `47 procedures · 31 migrate · 8 review · 8 reject`.
- **Data fetching:** Fetch all rows once on mount; filter client-side. Never re-fetch per filter change.

## Sheet vs Dialog

| Trigger | Component | Reason |
|---|---|---|
| Edit within a context view (override, detail) | `Sheet` (right slide-out) | Keeps background table visible |
| Confirm destructive action | `Dialog` | Full focus prevents accidents |
| Add a new entity | `Dialog` | Signals major state change |

Never use `Dialog` when the FDE needs to see the data they are acting on.

## Log Stream (Monitor)

- Fixed-height `ScrollArea` (`h-64` min), `pre font-mono text-xs`, auto-scroll to bottom on new lines.
- Lines arrive via Tauri `listen()` events; batch renders every ~100ms to avoid excessive re-renders.
- Phase groups (Translation, Tests, …) are collapsible (`Collapsible`): expanded while running, collapsed automatically on completion.
- Each line: `[HH:MM:SS]` prefix (24-hour local time). Sub-lines within a phase: 2-space indent.

## Autosave

- **Scope checkboxes:** Call `selected_tables_save` debounced at 300ms. No Save button.
- **Table Config fields:** Call `table_config_save` debounced at 500ms. Separate "Confirm table" button writes `confirmed_at` — not debounced.
- Saves are optimistic — no loading spinner. On failure, log the error and show a brief toast. Never block the form during a save.

## Components (shadcn/ui)

Install from shadcn/ui only. Do not bring in other component libraries.

| Component | Use in this project |
|---|---|
| `Table`, `TableRow`, `TableCell` | Scope selection, candidacy review, launch monitor |
| `Checkbox` | Per-row and group select-all in Scope |
| `Input` | Search fields, text inputs |
| `Select` | Filter dropdowns, field pickers |
| `Button` | All CTAs and actions |
| `Badge` | State chips, tier indicators |
| `Card`, `Separator` | Form section containers |
| `Sheet` | Right-sliding drawer — candidacy override, detail panels |
| `RadioGroup` | Tier picker inside Sheet |
| `Textarea` | Override reason, free-text inputs |
| `ResizablePanelGroup`, `ResizablePanel` | Master-detail split (Table Config) |
| `Combobox` | Searchable column name pickers |
| `ScrollArea` | Scrollable lists, log streams |
| `Progress` | Overall completion bar (Monitor) |
| `Collapsible` | Expandable phase groups, run history (Monitor, Usage) |

## Logging

- `console.error()` for caught errors
- `console.warn()` for unexpected states
- `console.log()` for significant user actions (navigation, form submissions, migration triggered)
- Do not log render cycles or state reads
