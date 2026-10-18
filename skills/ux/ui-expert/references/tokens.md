# Tokens

Tailwind CSS v4 keeps the theme in CSS: `@theme` blocks replace `tailwind.config.js`. Training data mostly shows v3. Check `tailwindcss` in `package.json`; a project still on v3 (a `tailwind.config.*` without `@config` in CSS) keeps its config, and the layering below still applies.

## Layers

- **Primitives**: the raw palette and scales. Components never reference them directly.
- **Semantic**: purpose names that switch per theme. Follow the project's names; with none, use shadcn's, which most React component code already expects: `background`, `foreground`, `card`, `card-foreground`, `popover`, `muted`, `muted-foreground`, `primary`, `primary-foreground`, `secondary`, `accent`, `destructive`, `destructive-foreground`, `border`, `input`, `ring`, plus `success` and `warning` with their `-foreground` pairs.
- **Components** use semantic utilities only: `bg-card text-card-foreground border-border`.

## Theme file

```css
@import "tailwindcss";

/* dark: follows the system unless the theme setting pins light or dark. */
@custom-variant dark {
  &:where([data-theme="dark"], [data-theme="dark"] *) {
    @slot;
  }
  @media (prefers-color-scheme: dark) {
    &:where(:not([data-theme="light"], [data-theme="light"] *)) {
      @slot;
    }
  }
}

/* light-dark() picks by the element's colour scheme: system by default, pinned by data-theme. */
:root {
  color-scheme: light dark;
  --background: light-dark(oklch(0.985 0.002 90), oklch(0.18 0.005 285));
  --foreground: light-dark(oklch(0.22 0.006 285), oklch(0.95 0.003 285));
  --muted-foreground: light-dark(oklch(0.46 0.01 285), oklch(0.71 0.01 285));
  --primary: light-dark(oklch(0.47 0.15 260), oklch(0.7 0.13 260));
  --primary-foreground: light-dark(oklch(0.985 0.002 90), oklch(0.18 0.005 285));
  --destructive: light-dark(oklch(0.53 0.2 27), oklch(0.68 0.17 25));
  --border: light-dark(oklch(0.91 0.004 285), oklch(0.3 0.006 285));
  --ring: light-dark(oklch(0.56 0.15 260), oklch(0.7 0.13 260));
}

[data-theme="light"] {
  color-scheme: light;
}

[data-theme="dark"] {
  color-scheme: dark;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-muted-foreground: var(--muted-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-ring: var(--ring);
}

@theme {
  --font-sans: "Inter Variable", ui-sans-serif, system-ui, sans-serif;
  --text-display: 3.5rem;
  --text-display--line-height: 1.1;
  --radius-md: 0.5rem;
  --ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
}
```

- `@theme inline` when a theme variable references another variable: utilities then read `var(--background)` directly. Plain `@theme` resolves the `var()` once on `:root`, so a theme scoped to a nested element (`<section data-theme="dark">`) is ignored.
- Namespaces generate utilities: `--color-*`, `--font-*`, `--text-*` (with `--text-*--line-height`), `--font-weight-*`, `--tracking-*`, `--leading-*`, `--radius-*`, `--shadow-*`, `--ease-*`, `--animate-*`, `--breakpoint-*`, `--container-*`, and the single `--spacing` base.
- `--color-*: initial;` inside `@theme` drops Tailwind's default palette, so off-palette classes like `bg-blue-500` stop generating. Use it when the design system owns every colour.
- `light-dark()` is Baseline since May 2024. A project that supports older browsers, or already keeps separate blocks, writes the dark values twice instead: in `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ... } }` and in `[data-theme="dark"] { ... }`.

## Theme switching

The system preference is the default; a setting overrides it.

- **System**: no `data-theme` attribute and no stored value. The page follows the OS, live.
- **The setting** offers System, Light, and Dark as one single-choice control with text labels: a `RadioGroup` on the settings page, or a menu with `selectionMode="single"` in the header. A two-state toggle cannot return to System.
- **Light or Dark** sets `data-theme` on `<html>` and persists the choice (`localStorage` key `theme`, or the user's profile when signed in). Choosing System removes both.
- **Before first paint** an inline script in `<head>` applies the stored choice, or the page flashes the wrong theme:

  ```html
  <script>
    try {
      const theme = localStorage.getItem("theme");
      if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme;
    } catch {}
  </script>
  ```

  In Next.js, `next-themes` does this and the persistence: `<ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem disableTransitionOnChange>` with `suppressHydrationWarning` on `<html>`. Its `useTheme()` returns `theme` (the setting) and `resolvedTheme` (what is shown); render the setting's selection only after mount, since the server cannot know it.
- Code that draws colour outside CSS (charts, canvas, maps) reads the resolved tokens with `getComputedStyle` and redraws when the theme or `matchMedia("(prefers-color-scheme: dark)")` changes.

## Rules

- Define colours in `oklch`: lightness steps are perceptually even, so ramps and dark-mode pairs stay predictable.
- Every semantic colour has a light and a dark value, and each foreground/background pair meets the contrast minimums in [`accessibility.md`](accessibility.md#contrast) in both themes and in every state. Muted text on a muted surface is the usual failure.
- Spacing in v4 accepts any multiple of `--spacing` (`p-13` compiles). Keep to a short rhythm (1, 2, 3, 4, 6, 8, 12, 16, 24) matching the project's existing usage.
- Durations come from a short set: 100 to 150ms for hover and press feedback, 200 to 300ms for overlays entering.
- Arbitrary values (`text-[15px]`, `bg-[#0f172a]`) and inline styles for themable properties are drift: add a token instead. Computed values (a measured width, a chart coordinate) go through `style` or a CSS variable.
- Opacity modifiers on semantic colours (`bg-primary/90`) are fine for hover and overlay tints.
