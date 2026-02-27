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

## Logging

- `console.error()` for caught errors
- `console.warn()` for unexpected states
- `console.log()` for significant user actions (navigation, form submissions, migration triggered)
- Do not log render cycles or state reads
