# Components

## Primitive library

- Reuse the project's library (shadcn/ui, Radix, Base UI, React Aria Components, Headless UI) and its variant helper (`cva`, `tailwind-variants`) when present. One primitive library per app.
- With none, use `react-aria-components` (RAC): unstyled, full keyboard and screen-reader behaviour, `onPress` normalising mouse, touch, and keyboard. It exposes state as data attributes that Tailwind v4 targets directly:

```tsx
import { Button as RACButton, type ButtonProps as RACButtonProps } from "react-aria-components";

type Variant = "primary" | "secondary" | "destructive";

const variantClass: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground data-hovered:bg-primary/90 data-pressed:bg-primary/80",
  secondary: "border border-border bg-background text-foreground data-hovered:bg-muted data-pressed:bg-muted/80",
  destructive: "bg-destructive text-destructive-foreground data-hovered:bg-destructive/90 data-pressed:bg-destructive/80",
};

interface ButtonProps extends Omit<RACButtonProps, "className" | "children"> {
  variant: Variant;
  children: React.ReactNode;
}

/** Button with token-driven variants; `isPending` keeps focus and announces progress. */
export function Button({ variant, children, ...props }: ButtonProps) {
  return (
    <RACButton
      {...props}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium outline-hidden transition-colors data-focus-visible:outline-2 data-focus-visible:outline-offset-2 data-focus-visible:outline-ring data-disabled:opacity-50 ${variantClass[variant]}`}
    >
      {children}
    </RACButton>
  );
}
```

## State attributes

| State | RAC attribute | Native element variant |
| --- | --- | --- |
| hover | `data-hovered:` | `hover:` |
| focus-visible | `data-focus-visible:` | `focus-visible:` |
| pressed | `data-pressed:` | `active:` |
| disabled | `data-disabled:` | `disabled:` |
| pending | `data-pending:` (Button `isPending`) | `aria-busy:` |
| invalid | `data-invalid:` (fields) | `aria-invalid:` |
| selected | `data-selected:` (ListBoxItem, Tab, Checkbox, Row) | `aria-selected:`, `aria-checked:` |

Tailwind v4 applies `hover:` only on devices whose primary pointer can hover, so touch screens never show stuck hover states; RAC's `data-hovered` behaves the same.

## Forms

- Visible labels above inputs; RAC structure: `<TextField><Label /><Input /><Text slot="description" /><FieldError /></TextField>`.
- Validate on blur and on submit; clear an error as soon as the value is fixed. Server errors flow back through RAC `<Form validationErrors={...}>`, or `useActionState` (the `ts-coding` skill, `references/react.md`).
- Personal-data fields set `type`, `inputMode`, and `autocomplete` (`email`, `tel`, `name`, `new-password`, `one-time-code`).
- Related controls share a group label: RAC `RadioGroup`, `CheckboxGroup`, or `fieldset` with `legend`.
- A native `<select>` suits plain forms: free accessibility and the best mobile picker. RAC `Select` or `ComboBox` when options carry rich content, need search, or must match the system's styling.
- Controls in one row share a height; a label or hint that wraps sits outside the aligned row.

## Overlays

- Modal (`DialogTrigger` > `ModalOverlay` > `Modal` > `Dialog` with `<Heading slot="title">`) for decisions that block the flow; everything else stays inline or in a `Popover`.
- Tooltips carry supplementary text on focusable triggers only; touch has no hover, so essential information lives on the page.
- Toasts are short and non-critical, announced through `role="status"`, and stay until dismissed or long enough to read; any action inside one is reachable elsewhere. Errors needing action stay inline.
- Reversible destructive actions offer Undo; irreversible ones confirm with the consequence and count ([`copy.md`](copy.md#by-moment)).

## Data views

- Every async view renders loading, empty, error, and populated, modelled as a discriminated union (the `ts-coding` skill, Types rules).
- Loading: a skeleton matching the final layout, so nothing shifts when data lands. Empty: first-use, filtered-to-zero, and cleared each get their own copy. Error: what happened and a retry.
- Overflow: long strings wrap, or truncate with the full text in a tooltip and the accessible name; numbers use `tabular-nums` and align to the end in tables.
- Tables: `<table>`, or RAC `Table` when rows sort or select (it sets `aria-sort` and selection state); sticky header; horizontal scroll inside the table's own region with a visible cue.
- Lists beyond a few hundred rows virtualise with the library's virtualiser or `@tanstack/react-virtual`.
- Charts: Recharts per the `ts-coding` skill's `references/recharts.md`; direct labels or patterns besides colour, and a table view of the same data.

## Icons

- lucide-react: `import { Trash2 } from "lucide-react"`, sized with `size-4` or `size-5` to match the text's line height, one stroke width across the app.
- Beside a label: `aria-hidden`. Alone in a button: `aria-label` on the button plus a tooltip with the same text.

## Motion

- Animate `transform` and `opacity`; feedback in 100 to 150ms, overlays entering in 200 to 300ms, exits faster than entrances; ease-out entering, ease-in exiting.
- RAC overlays expose `data-entering` and `data-exiting` for CSS transitions.
- Travel, scale, and parallax sit behind `motion-safe:`; opacity feedback stays under reduced motion.
