# Verification

Each gate prints what it measured; report that output, never a summary from memory.

## Static gates

Run after the `ts-coding` checks; keep the linter's accessibility rules on (Biome's `a11y` group, oxlint's `jsx-a11y` plugin). Each scan passes when it prints nothing:

```sh
# Token drift: arbitrary colour or length values, inline styles
! rg -n --glob '*.{tsx,jsx,css}' -e '-\[(#|rgba?\(|hsla?\(|oklch\(|[0-9.]+(px|rem|em|ms)\b)' -e 'style=\{\{' src
# Emoji in code, copy, and docs
! rg -n --glob '*.{ts,tsx,js,jsx,css,json,md,mdx}' '\p{Emoji_Presentation}' src
```

Point them at the project's source directories, which must exist: `!` also turns rg's missing-path error into a pass. A hit that is a computed value (see [`tokens.md`](tokens.md#rules)) is reported as such, not suppressed silently.

### Token contrast

axe measures rendered text only. `scripts/contrast.ts` (in this skill's directory, Node 22.18 or later) measures the tokens themselves, in light and dark, including the 3:1 non-text pairs axe skips:

```sh
node <skill-dir>/scripts/contrast.ts src/app/globals.css --pair input:background:3
```

- It reads `:root`, dark selectors and media blocks, `light-dark()`, `@theme` aliases, and `var()` chains, and checks by default every `x-foreground` on `x`, `foreground` and `muted-foreground` on `background` and `card`, and `ring` on `background`.
- Add a `--pair fg:bg:min` for each other pair the screen relies on: an `input` or `border` that is a control's only boundary, an accent used for icons or links, a status colour on a tinted surface. Minimums are in [`accessibility.md`](accessibility.md#contrast).
- Exit 0 means every pair passes; 1 lists the failing pairs; 2 means a token is missing or written in a format it does not read (only `oklch()` and hex): report that pair as not verified.

## Browser gates

Playwright with `@axe-core/playwright`, against the running dev server (`webServer` in `playwright.config.ts`). A project without them: propose adding them (`@playwright/test`, `@axe-core/playwright`, `playwright install chromium`) and, until the user agrees, report the browser gates as not verified. A browser tool in the session can still take screenshots and click controls; axe needs the runner.

```ts
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const path = "/settings/billing";
const viewports = { mobile: { width: 390, height: 844 }, desktop: { width: 1280, height: 800 } } as const;
const wcag = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function open(page: Page, viewport: keyof typeof viewports, colorScheme: "light" | "dark"): Promise<void> {
  await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
  await page.setViewportSize(viewports[viewport]);
  await page.goto(path);
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.mouse.move(0, 0);
}

for (const colorScheme of ["light", "dark"] as const) {
  for (const viewport of ["mobile", "desktop"] as const) {
    test(`${path} ${viewport} ${colorScheme}: axe and screenshot`, async ({ page }) => {
      await open(page, viewport, colorScheme);
      const { violations } = await new AxeBuilder({ page }).withTags(wcag).analyze();
      expect(violations).toEqual([]);
      await page.screenshot({ path: `screenshots/${viewport}-${colorScheme}.png`, fullPage: true });
    });
  }
}

test(`${path} reflows at 320px`, async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto(path);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBe(0);
});

test(`${path} targets are at least 24px`, async ({ page }) => {
  await open(page, "mobile", "light");
  const targets = page.locator("button, a[href]:not(p a), input, [role=button], [role=tab], [role=switch], [role=checkbox], [role=radio], [role=option]");
  for (const target of await targets.all()) {
    const box = await target.boundingBox();
    if (box === null || box.width <= 1) continue; // hidden or visually hidden input behind a styled control
    const label = await target.evaluate((el) => el.outerHTML.slice(0, 80));
    expect.soft(Math.min(box.width, box.height), label).toBeGreaterThanOrEqual(24);
  }
});
```

- **Theme**: the matrix above covers System, since `emulateMedia({ colorScheme })` flips `prefers-color-scheme`. Test the override once: emulate dark, pin Light with `page.addInitScript(() => localStorage.setItem("theme", "light"))`, assert `<html>` has `data-theme="light"` and the page renders light, then choose System in the setting and confirm it returns to dark without a reload.
- **States**: axe checks the state on screen. Hover, focus, or open each state that changes colour (`locator.hover()`, `locator.focus()`, opening a menu), then run `new AxeBuilder({ page }).include(selector)` again and screenshot it.
- **Data states**: `page.route("**/api/projects", (route) => route.fulfill({ json: [] }))` fakes empty, error (`status: 500`), and slow responses for client-side fetches only. Server Components fetch on the server, out of the browser's reach: use the project's fixtures, seed data, or MSW in Node.
- **Keyboard**: walk the primary task with `page.keyboard.press()` (Tab, Enter, Space, Escape, arrows), assert each step with `expect(locator).toBeFocused()` and the visible result, and screenshot one focused state per control type to confirm the ring shows.
- **Reduced motion**: the matrix already emulates `reducedMotion: "reduce"`; confirm in its screenshots that content revealed by entrance animations is present.
- Run once, never in UI or watch mode: `pnpm exec playwright test <spec> --project=chromium` (through the project's package manager). Keep `screenshots/` out of git.

## Rendering states

The browser gates need a URL for each state in the brief.

- **Storybook** in the project: one story per state; set `path` to `/iframe.html?id=<story-id>&viewMode=story`.
- **Otherwise** propose a development-only harness route that renders each state from fixture props, one labelled region per state, and returns 404 in production:

  ```tsx
  // app/dev/project-list/page.tsx
  import { notFound } from "next/navigation";
  import { ProjectList } from "@/components/project-list";
  import { manyProjects } from "@/fixtures/projects";

  export default function ProjectListStates() {
    if (process.env.NODE_ENV === "production") notFound();
    return (
      <main className="grid gap-12 p-6">
        <section aria-label="Empty"><ProjectList projects={[]} /></section>
        <section aria-label="One"><ProjectList projects={manyProjects.slice(0, 1)} /></section>
        <section aria-label="Overflow"><ProjectList projects={manyProjects} /></section>
        <section aria-label="Error"><ProjectList projects={[]} error="Couldn't load projects. Check your connection and try again." /></section>
      </main>
    );
  }
  ```

  Screenshot each region on its own: `page.getByRole("region", { name: "Empty" }).screenshot({ path: "screenshots/390-dark-empty.png" })`.

## Component tests

Vitest with Testing Library (the `ts-coding` skill, `references/testing.md`) proves names and states without a browser: `getByRole("button", { name: "Save changes" })`, `toBeDisabled()`, `toHaveAttribute("aria-invalid", "true")`, `toHaveAccessibleDescription(...)`. jsdom computes no layout or colour, so contrast, reflow, and target size stay with the browser gates.

## Looking

- Open every screenshot with the read tool; name each file `<viewport>-<theme>-<state>.png` so findings can cite it.
- Click every control in a real browser and confirm a visible change: a checkbox that passes axe and never toggles is broken.
- Check the 320px render before accepting the 1280px one, and one render at 200% text (`document.documentElement.style.fontSize = "200%"`) for clipped or overlapping text.
