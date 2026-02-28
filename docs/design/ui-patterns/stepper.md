# Stepper / Root Layout

## Pattern

**Left sidebar vertical stepper** — fixed 208px (`w-52`) sidebar inside `__root.tsx`, not a horizontal top bar.

At 1280px minimum width, a 208px sidebar leaves 1072px for content — no vertical height is consumed from already space-constrained screens like Table Config. The sidebar stays visible across all 5 steps, providing permanent orientation.

## Step States

| State | Visual | When |
|-------|--------|------|
| `pending` | Label in `text-muted-foreground`, `Circle` icon | Not yet reached |
| `active` | Pacific left border + pacific text color, `ChevronRight` icon | Current step |
| `complete` | Seafoam `CheckCircle2` icon | Step marked complete in `workflowStore` |
| `locked` | Muted, non-clickable | Requires prior step completion |

```tsx
// Active step styling
style={{ borderLeft: "2px solid var(--color-pacific)", color: "var(--color-pacific)" }}

// Complete step icon color
style={{ color: "var(--color-seafoam)" }}
```

## Routes and Labels

```text
1  Scope              /scope
2  Candidacy Review   /candidacy
3  Table Config       /config
```

Workspace is configured in Settings (not a wizard step). Launch is a button on the Monitor surface.

## Navigation Rules

- **Backward navigation:** Always allowed freely.
- **Forward navigation:** Blocked past the active step if required state is unsaved. Validation errors surface inline — never via a modal that blocks navigation.
- **Locked steps:** Table Config requires Candidacy complete.
- **Post-launch lock:** After launching from Monitor, all three Scope steps become read-only. A locked banner is shown at the top of the Scope surface.

## Save-and-Resume

On app start, `workflowStore` hydrates from SQLite via `workspace_get` + `selected_tables_list`, then redirects to the last incomplete step. This is the critical pattern that prevents data loss in multi-day sessions where the FDE closes the app between domain owner conversations.

## Zustand Store Shape

```ts
interface WorkflowStore {
  currentStep: string
  completedSteps: Set<string>
  workspaceId: string | null
  selectedTableIds: string[]
  setStep: (step: string) => void
  markComplete: (step: string) => void
}
```

## Components

No additional shadcn installs required — pure `div` structure driven by `workflowStore`.

Icons: `CheckCircle2` (complete), `Circle` (pending), `ChevronRight` (active indicator) from `lucide-react`.

## References

- [Wizard UI Pattern — Eleken](https://www.eleken.co/blog-posts/wizard-ui-pattern-explained)
- [32 Stepper UI Examples — Eleken](https://www.eleken.co/blog-posts/stepper-ui-examples)
- [Save-and-Resume Multi-Step Wizard Patterns — AppMaster](https://appmaster.io/blog/save-and-resume-multi-step-wizard-patterns-that-cut-drop-off)
- Azure Data Studio SQL Migration Extension (numbered sidebar stepper reference)
