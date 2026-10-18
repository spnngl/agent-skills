---
name: ui-expert
description: "UI design workflow for React and Tailwind interfaces: hierarchy, design tokens, accessibility, interaction states, and UI copy. Use when designing, building, or restyling a screen, component, or flow; reviewing or auditing UI or accessibility; editing theme tokens; or writing interface text."
---

# UI expert

This skill decides what the interface is and proves it works for people. Code idioms (TypeScript, React, Next.js, tests, lint) come from the `ts-coding` skill: load it whenever you touch `.ts` or `.tsx`.

## Workflow

1. **Orient.** Read the UI's sources of truth: `package.json` (`react`, `next`, `tailwindcss`, the primitive library: `react-aria-components`, `@radix-ui/*`, `@base-ui-components/react`, or shadcn's `components.json`; the icon set; `@playwright/test`, `@axe-core/playwright`), the stylesheet holding `@import "tailwindcss"` and `@theme`, the dark-mode mechanism, the shared components directory, and two or three existing screens next to the one you are changing. The project's existing choices beat this skill's defaults; reuse its primitives, tokens, spacing rhythm, and terminology.
   **Done when:** you can name the styling system, the token file, the primitive library, the icon set, the theme switch, the dev command and URL that render the work, and the browser test runner (or that none exists).

2. **Frame the brief.** Before any markup, write this block into your reply and build to it:
   ```
   User and job:    who uses this, and the one task it serves
   Lead:            the single element the eye lands on first
   Primary action:  the one affirmative action; destructive actions named separately
   Density:         sparse | comfortable | dense, matched to neighbouring screens
   Mood:            one adjective the result must earn ("precise", "calm", "warm")
   States:          empty, loading, error, partial, overflow, no permission: those that apply
   ```
   Layout, composition, and visual craft: [`references/taste.md`](references/taste.md).
   **Done when:** every field holds a concrete answer for this screen, specific enough that a reviewer could reject a build that misses it.

3. **Resolve tokens.** Map every colour, size, space, radius, shadow, and duration to a semantic token from step 1. Add a missing token at the source with light and dark values, following [`references/tokens.md`](references/tokens.md).
   **Done when:** the diff holds no raw colour, arbitrary value (`p-[13px]`, `bg-[#1a1a1a]`), or inline style for a themable property, every new token has a light and a dark value, and `node scripts/contrast.ts <theme.css>` (path relative to this skill's directory) passes.

4. **Build.** Compose from the project's primitives (React Aria Components when it has none), mobile-first, following [Rules](#rules) and [`references/components.md`](references/components.md). Semantics, keyboard, and WCAG detail: [`references/accessibility.md`](references/accessibility.md). Interface text: [`references/copy.md`](references/copy.md).
   **Done when:** every interactive element covers each [state](#states) that applies, every data view renders each state named in the brief, and the unprefixed styles are the 320px layout.

5. **Verify.** Run `ts-coding`'s checks, then the static and browser gates in [`references/verification.md`](references/verification.md): token drift, emoji, token contrast, axe in light and dark, keyboard, reflow at 320px, target size, reduced motion.
   **Done when:** every gate exits 0 and you report what each printed; a gate you could not run is reported as "not verified" with the reason.

6. **Look.** Screenshot the work at 1280 and 390 wide, light and dark, plus each state from the brief; open every image with the read tool and click every control. Then argue for rejection with [`references/review.md`](references/review.md). When a subagent tool is available, hand the screenshots and that file to a fresh agent: a critic that did not build the screen sees it more clearly.
   **Done when:** you have viewed every screenshot, every control produced a visible change, and every Critical or Major finding is fixed or reported to the user.

**Small changes** (a spacing, colour, or copy tweak inside an existing component): run steps 1, 3, and 5's static gates, then screenshot the changed element in light and dark and view both.

**Reviewing** existing UI: run step 1, write step 2's brief as you infer it, run steps 5 and 6 against it, and report in the format of [`references/review.md`](references/review.md#output). Without a render, say so and limit findings to what the source proves.

## Rules

### Evidence

- State a contrast ratio, a pass, or a score only when a command just printed it; otherwise say "not verified". A gate that skipped (no browser, no server) measured nothing.
- Gates prove correctness, never quality: judge hierarchy and craft from screenshots.

### Hierarchy

- One thing leads: the brief's lead is the largest, heaviest, or highest-contrast element, and its peers go quieter. On marketing and landing pages, display type is at least 2.5x body size; product screens keep the page title one or two steps above body, with weight and position doing the rest.
- Spacing grows outward: gaps inside a group < padding of its container < space between sections.
- An empty state fills its region and names the first action. A page ends on purpose: a summary, a footer, a next step.

### Tokens and colour

- Token by intent: pick the token whose meaning matches the action. A destructive action wears the destructive token at its trigger and in its confirmation alike; primary marks the one main affirmative action per view.
- Every status pairs colour with an icon or text. One accent; neutrals carry the rest.
- Theming is one edit at the token source: every screen reads the same semantic tokens.
- Light and dark follow the system preference; a System / Light / Dark setting overrides it and persists ([`references/tokens.md`](references/tokens.md#theme-switching)).

### States

- Interactive elements: default, hover, focus-visible, pressed, disabled, pending, invalid, selected. Each that applies is visibly distinct, in light and dark; selectors in [`references/components.md`](references/components.md#state-attributes).
- Pending keeps the control at full strength with a spinner or progress label (`isPending`, `aria-busy`). Disabled marks an action the user cannot take now, with the reason visible nearby.
- Feedback reports what happened: a success toast appears after the data changed, and the view already shows the change.

### Layout

- Mobile is the base: unprefixed utilities are the phone layout; `sm:`, `md:`, `lg:` layer on wider screens. Components reused at different widths respond to their container (`@container`, `@md:`).
- A region that scrolls horizontally shows a visible cue: an edge fade, a scrollbar.

### Guardrails

- Icons come from lucide-react (or the project's set) as SVG with `currentColor`. Zero emoji in UI, copy, code, and commits.
- Surfaces separate with a full hairline border, a surface step, or spacing. A coloured border on one side only of a card, alert, toast, or callout is banned.
- Content is realistic: plausible names, long strings, large numbers, zero and one items. Placeholder copy and debug controls never render in the product.

## References

Load the one matching the branch you are on:

- [`references/taste.md`](references/taste.md): slop tells, composition, typography, colour, depth; any new screen or restyle.
- [`references/tokens.md`](references/tokens.md): Tailwind v4 `@theme`, semantic tokens, system theme and its override setting, adding or auditing tokens.
- [`references/components.md`](references/components.md): React Aria Components, state attributes, forms, overlays, data views, icons, motion.
- [`references/accessibility.md`](references/accessibility.md): semantics, keyboard and focus, contrast, WCAG 2.2 criteria, forced colours, RTL.
- [`references/copy.md`](references/copy.md): labels, errors, empty states, confirmations, toasts, generated-copy tells.
- [`references/verification.md`](references/verification.md): drift, emoji, and contrast scans, rendering component states, Playwright and axe gates, screenshot matrix.
- [`references/review.md`](references/review.md): critique lenses, heuristics, severity, findings format.
