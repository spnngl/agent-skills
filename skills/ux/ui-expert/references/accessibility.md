# Accessibility

WCAG 2.2 AA is the floor. axe cannot judge focus order, keyboard flow, or whether a name is meaningful; the keyboard walk, the semantics below, and the screenshots cover what it misses.

## Semantics

- Native element first: `<button>` for actions, `<a href>` for navigation, a `<label>` for every input, one `h1` and headings in order, landmarks (`header`, `nav`, `main`, `footer`), `<ul>` for lists, `<table>` with `<th scope>` for tabular data.
- Composite widgets (combobox, listbox, menu, tabs, dialog, grid, tree, date picker) come from React Aria Components or the project's primitive library. Hand-rolled ARIA for these is a last resort and follows the [APG pattern](https://www.w3.org/WAI/ARIA/apg/patterns/) in full: roles, states, and every listed key.
- Every control has an accessible name, preferably its visible label. Icon-only buttons take `aria-label`; decorative icons take `aria-hidden`.
- Async results announce through `role="status"`; errors needing immediate attention through `role="alert"`. The live region is in the DOM before its content changes.
- Field errors set `aria-invalid` and link the message with `aria-describedby` (RAC `FieldError` does both). A failed submit moves focus to the first invalid field.

## Keyboard and focus

- Every action works with the keyboard alone; Tab order follows visual order; `tabIndex` is `0` or `-1`.
- Focus is always visible, 3:1 against adjacent colours: `outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring` (RAC: `data-focus-visible:`).
- In Tailwind v4, `outline-hidden` keeps a transparent outline that forced-colours mode paints, while `outline-none` removes it. `ring-*` is a box-shadow, which forced-colours mode drops: pair any ring with `outline-hidden`.
- Sticky headers and footers leave the focused element visible: `scroll-pt-*` on the scroll container matching the header height.
- Dialogs trap focus, close on Escape, and return focus to the trigger (RAC `Modal` does all three).
- Pages with repeated navigation start with a skip link to `main`.

## Contrast

| Element | Minimum |
| --- | --- |
| Text under 24px (under 18.66px when bold) | 4.5:1 |
| Text at 24px and up, or 18.66px bold and up | 3:1 |
| Control boundaries, icons, chart marks, focus indicators | 3:1 |

Check every state (hover, selected, disabled text that conveys information) in both themes. Placeholder text counts as text. axe measures rendered text only; the token gate in [`verification.md`](verification.md#token-contrast) covers the 3:1 pairs.

## WCAG 2.2 additions

Criteria new in 2.2, mostly absent from training data:

| Criterion | Requirement |
| --- | --- |
| 2.4.11 Focus Not Obscured (Minimum) | Sticky or overlaid content never fully hides the focused element |
| 2.5.7 Dragging Movements | Every drag has a single-pointer alternative (buttons, a "Move to" menu) |
| 2.5.8 Target Size (Minimum) | Pointer targets at least 24×24 CSS px, or spaced so 24px circles centred on each do not overlap; inline links in text are exempt |
| 3.2.6 Consistent Help | Help links and contact options keep the same relative order across pages |
| 3.3.7 Redundant Entry | Information already given in the same process is prefilled or selectable |
| 3.3.8 Accessible Authentication (Minimum) | Login needs no memory or puzzle test; paste and password managers work (`autocomplete="current-password"`, `one-time-code`) |

4.1.1 Parsing was removed in 2.2.

## Visual and motion

- Reflow (1.4.10): at 320 CSS px wide, nothing scrolls horizontally except content that needs two dimensions (data tables, maps, code).
- Text resize and spacing (1.4.4, 1.4.12): text containers grow with content; `min-h-*` over fixed heights; sizes in `rem`.
- Links inside body text are underlined; colour alone never carries meaning (1.4.1).
- `motion-safe:` on travel, scale, and parallax; under reduced motion keep opacity fades so feedback survives. Nothing flashes more than three times per second; auto-moving content running over 5 seconds has a pause control.

## Internationalisation

- Logical utilities so RTL works: `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`, `border-s`; `rtl:-scale-x-100` on directional icons.
- `lang` on `<html>`; RAC components localise through `I18nProvider`.
- Translated strings run 30 to 40% longer: labels wrap; truncation keeps the full text reachable (tooltip and accessible name).
