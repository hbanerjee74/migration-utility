---
name: shadcn-ui
description: shadcn/ui component library with Tailwind CSS 4. Use when adding new components, customizing variants, building UI layouts, or debugging component issues.
---

# shadcn/ui Skill

shadcn/ui is a collection of reusable components copied into your codebase for full control. Not a traditional component library — you own the source code.

## Project Structure

```
app/src/
├── components/
│   └── ui/           # shadcn/ui components (owned, editable)
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       └── ...
├── lib/
│   └── utils.ts      # cn() utility
└── components.json   # shadcn/ui config
```

## Adding Components

```bash
cd app
npx shadcn@latest add dropdown-menu
npx shadcn@latest add dropdown-menu select tabs  # Multiple at once
```

## Core Components

### Button
```tsx
import { Button } from "@/components/ui/button";

// Variants: default, destructive, outline, secondary, ghost, link
// Sizes: default, sm, lg, icon
<Button variant="destructive" size="sm">Delete</Button>
<Button variant="outline" size="icon"><Icon /></Button>
```

### Card
```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content</CardContent>
  <CardFooter>Footer</CardFooter>
</Card>
```

### Dialog
```tsx
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";

<Dialog>
  <DialogTrigger asChild><Button>Open</Button></DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirm</DialogTitle>
      <DialogDescription>Are you sure?</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Form Elements
```tsx
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

<Label htmlFor="name">Name</Label>
<Input id="name" placeholder="Enter name" />
<Textarea id="message" />
<Switch checked={enabled} onCheckedChange={setEnabled} />
```

### Badge
```tsx
import { Badge } from "@/components/ui/badge";

// Variants: default, secondary, destructive, outline
<Badge variant="secondary">Status</Badge>
```

### Tabs
```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</Tabs>
```

### Toast
```tsx
import { useToast } from "@/hooks/use-toast";

const { toast } = useToast();
toast({
  title: "Success",
  description: "Operation completed",
  variant: "default", // or "destructive"
});
```

### Dropdown Menu
```tsx
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel
} from "@/components/ui/dropdown-menu";

<DropdownMenu>
  <DropdownMenuTrigger asChild><Button variant="ghost">Menu</Button></DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuLabel>Account</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem>Settings</DropdownMenuItem>
    <DropdownMenuItem className="text-destructive">Logout</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Scroll Area
```tsx
import { ScrollArea } from "@/components/ui/scroll-area";

<ScrollArea className="h-[400px]">
  {/* Long content */}
</ScrollArea>
```

### Skeleton (Loading States)
```tsx
import { Skeleton } from "@/components/ui/skeleton";

<Skeleton className="h-4 w-[250px]" />
<Skeleton className="h-12 w-12 rounded-full" />
```

### Progress
```tsx
import { Progress } from "@/components/ui/progress";

<Progress value={66} className="w-full" />
```

## Customizing Variants

Edit component files directly in `src/components/ui/`:

```tsx
// button.tsx - Add custom variant
const buttonVariants = cva("inline-flex items-center...", {
  variants: {
    variant: {
      // existing variants...
      success: "bg-green-500 text-white hover:bg-green-600",
    },
    size: {
      // existing sizes...
      xl: "h-14 rounded-md px-10 text-lg",
    },
  },
});
```

## cn() Utility

```tsx
import { cn } from "@/lib/utils";

// Merge Tailwind classes conditionally
<div className={cn("base-classes", condition && "conditional", className)}>
```

## Theming with CSS Variables

In `src/index.css` (Tailwind CSS 4):

```css
@theme {
  --color-background: oklch(1 0 0);
  --color-foreground: oklch(0.145 0 0);
  --color-primary: oklch(0.205 0.03 265.75);
  --color-primary-foreground: oklch(0.985 0 0);
  --color-destructive: oklch(0.577 0.245 27.33);
  --color-muted: oklch(0.97 0 0);
  --color-muted-foreground: oklch(0.556 0.02 265.75);
  --color-border: oklch(0.922 0.01 265.75);
  --color-ring: oklch(0.87 0.01 265.75);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
}

.dark {
  --color-background: oklch(0.145 0 0);
  --color-foreground: oklch(0.985 0 0);
  /* ... dark mode overrides */
}
```

## Creating Compound Components

```tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface SkillCardProps {
  name: string;
  domain: string;
  progress: number;
  status: "in_progress" | "completed" | "error";
  className?: string;
}

export function SkillCard({ name, domain, progress, status, className }: SkillCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">{name}</CardTitle>
        <Badge variant={status === "completed" ? "default" : "secondary"}>
          {status}
        </Badge>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-2">{domain}</p>
        <Progress value={progress} />
      </CardContent>
    </Card>
  );
}
```

## Updating Components

```bash
cd app
npx shadcn@latest add button --overwrite  # Update existing
```

## Common Patterns

### Responsive Layouts
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => <Card key={item.id}>...</Card>)}
</div>
```

### Loading States
```tsx
{isLoading ? (
  <div className="space-y-3">
    <Skeleton className="h-[125px] w-full rounded-xl" />
    <Skeleton className="h-4 w-[250px]" />
  </div>
) : (
  <ActualContent />
)}
```

### Empty States
```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <Icon className="h-12 w-12 text-muted-foreground mb-4" />
  <h3 className="text-lg font-semibold">No items yet</h3>
  <p className="text-sm text-muted-foreground mb-4">Get started by creating your first item.</p>
  <Button>Create Item</Button>
</div>
```

### Form with Validation (React Hook Form + Zod)
```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "Required"),
  email: z.string().email("Invalid email"),
});

type FormData = z.infer<typeof schema>;

const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
  resolver: zodResolver(schema),
});
```

## Best Practices

1. **Use cn()** for conditional classes — never string concatenation
2. **Extend, don't modify core**: Add custom variants rather than changing defaults
3. **Use size-*** instead of `h-* w-*` for equal dimensions
4. **asChild pattern**: Use `asChild` on triggers to compose with your own elements
5. **Consistent spacing**: Use Tailwind spacing scale (gap-4, p-6, space-y-3)
6. **Dark mode**: Always use semantic tokens (text-foreground, bg-background) not raw colors

## Resources

- shadcn/ui docs: https://ui.shadcn.com
- Tailwind CSS 4: https://tailwindcss.com
- Radix UI primitives: https://www.radix-ui.com
