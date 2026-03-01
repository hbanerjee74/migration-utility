---
name: shadcn-ui
description: shadcn/ui component library with Tailwind CSS 4. Use when adding new components, customizing variants, building UI layouts, or debugging component issues.
---

# shadcn/ui Skill

Use this skill when implementing UI with shadcn/ui in `app/src/`.

## Repo Constraints

- Use shadcn/ui components only for new component primitives.
- Use `lucide-react` only for icons.
- Use AD brand variables from `app/src/styles/globals.css`.
- Do not use raw Tailwind palette colors like `text-green-500`.

See `../../rules/frontend-design.md` for canonical styling policy.

## Add Components

```bash
cd app
npx shadcn@latest add button input card dialog dropdown-menu
```

## Component Usage Pattern

```tsx
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function ExamplePanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Example</CardTitle>
      </CardHeader>
      <CardContent>
        <Button>Run</Button>
      </CardContent>
    </Card>
  );
}
```

## Variant Customization

Edit local component source in `app/src/components/ui/*.tsx` and keep variants token-driven.

```tsx
success:
  "text-foreground border border-border " +
  "[background:color-mix(in_oklch,var(--color-seafoam),transparent_85%)]",
```

## Common Commands

```bash
cd app
npx tsc --noEmit
npm run test:unit
npm run test:integration
```

## UI Review Checklist

- Spacing uses 4px scale.
- Typography uses configured font tokens.
- State colors follow frontend-design rules.
- Keyboard focus and disabled states are clear.
- No extra UI library imports were introduced.
