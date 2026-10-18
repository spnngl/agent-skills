# Review

The work is mediocre until the render proves otherwise. Correctness is the floor the gates enforce; the review is for everything above it.

Every finding names its evidence: a `path:line`, the output of a named gate, or a named screenshot (`390-dark-empty.png`). An impression without evidence goes back for evidence or out of the report. A gate result never supports an aesthetic claim.

## Lenses

Work through every lens; most generated UI fails the first three.

| Lens | Send it back when |
| --- | --- |
| Focal point | Everything has the same weight; equal cards, equal stats; the brief's lead is not what the eye hits first |
| Type | One or two sizes doing all the work; display under 2.5x body; lines past 75ch; headings over three lines |
| Spacing | One padding value everywhere; inner spacing equal to outer; sections touching; no repeating rhythm |
| Colour | Accent on everything; two greys a step apart doing one job; status by colour alone; destructive in primary colours |
| Elevation and radius | One shadow and one radius applied uniformly; depth that does not match actual layering |
| States | Missing hover, focus-visible, pending, invalid, or selected; loading styled as disabled; dark mode untested |
| Content and copy | Placeholder data; "No data" empty states; buttons that do not frontload the verb; errors without a fix ([`copy.md`](copy.md)) |
| Stress | Breaks with long strings, 0, 1, or 40 items, nine-digit numbers, a missing image, 320px, 200% text |
| Interaction truth | A control that changes nothing visible; a toast that outruns the data; a dialog that traps nothing |
| Accessibility | Any failing gate from [`verification.md`](verification.md); a keyboard walk that stalls or loses focus |

Tag usability findings with the Nielsen heuristic they break: H1 visibility of system status, H2 match with the real world, H3 user control and freedom, H4 consistency and standards, H5 error prevention, H6 recognition over recall, H7 flexibility and efficiency, H8 minimalist design, H9 error recovery, H10 help and documentation.

## Severity

- **Critical**: blocks a task, fails WCAG AA, or risks data loss. Blocks the ship.
- **Major**: clear UX degradation or inconsistency across flows. Fix this iteration.
- **Minor**: polish. Fix when convenient.
- **Enhancement**: an idea, not a defect.

Calibrate honestly: when every finding is Minor, say so and ship.

## Output

```
VERDICT: ship | rework | reject

Brief (as built or inferred): user and job, lead, primary action

| # | Severity | Lens / heuristic | Evidence | Finding | Fix |
|---|----------|------------------|----------|---------|-----|
| 1 | Critical | Accessibility | axe: color-contrast on 390-dark | Muted text 3.1:1 on card | Use muted-foreground token, re-run axe |

Strongest qualities (two at most)
- ...

Not verified
- each gate or view not run, and why
```
