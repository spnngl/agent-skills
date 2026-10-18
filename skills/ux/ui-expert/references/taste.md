# Taste

Correctness is the floor the gates enforce; this file covers what makes a screen look designed rather than generated. Taste sharpens hierarchy and craft and never overrides accessibility or consistency with the rest of the product.

## Slop tells

Generated UI regresses to the mean. Treat each tell as a defect to break:

| Tell | Move |
| --- | --- |
| Three or four equal cards or stats | One leads on size, weight, or its own row; the rest go quieter, or become a dense list |
| Everything centred; one text-and-image row repeated | A left-aligned grid; asymmetric splits (7/5, 8/4); adjacent sections differ in structure |
| A heading that is bold body text | Marketing: display at least 2.5x body, leading 1.05 to 1.15, `text-balance`, an 18 to 24ch measure. Product: a title one or two steps above body |
| A shadow on every box | Mostly flat; hairline borders and surface steps; shadows only on floating layers (popover, menu, modal) |
| Pure `#000` on `#fff` | Off-black on off-white from the tokens |
| Several accents; the default indigo-to-purple gradient | One accent; neutrals carry the weight |
| One radius and one padding everywhere | A radius language (sharp, soft, or pill) and a spacing hierarchy |
| "Lorem ipsum", "Item 1", "SECTION 01" | Realistic, specific content |
| Marketing filler and hollow triads | Concrete copy ([`copy.md`](copy.md#tells)) |

## Composition

- **Product screens** (dashboards, settings, tables, editors) favour alignment and density: a consistent page header (title, one-line description, primary action at the trailing edge), content on one grid, a reading width for forms and settings (`max-w-2xl` to `max-w-4xl`), full width for tables.
- **Marketing and editorial pages** vary adjacent sections across archetypes: full-bleed hero (oversized type, one focal element), asymmetric split, bento (mixed tile sizes on an exact grid with no dead cells), editorial stack (prose at 65ch, media wide), full-width band, index or list. Two adjacent sections sharing column structure and alignment: change one.
- **Block coherence**: a block added to an existing page reuses its type scale, spacing rhythm, radius, accent, and primitives. Vary composition, keep vocabulary. Test: set the new block beside an existing one; a stranger must not be able to tell they were built separately.
- **Proximity**: tighter spacing inside a group, larger between groups; the gap is the relationship.
- **A long list** surfaces one differentiator per row (recency, status, owner) so the eye has somewhere to land while scrolling.

## Typography

- One UI family, used with conviction; weight and size build hierarchy. A second face (serif or display) only for editorial moments.
- Few size steps with dramatic jumps at the top: a `5xl` headline over `base` body reads as designed; `2xl` over `lg` reads as a template.
- Body measure 60 to 75ch (`max-w-prose`). Headings stay within three lines: shorten the copy or widen the container.
- `tabular-nums` for numbers that align; `tracking-tight` on large display sizes, `tracking-wide` on small uppercase labels.

## Colour and depth

- Low chroma on large surfaces; saturation reserved for small, intentional highlights.
- Depth by layering: surface steps and hairline borders first, restrained shadow for what actually floats.
- Dark mode is designed, never inverted: elevation reads as a lighter surface, accents desaturate slightly, borders drop in contrast.
- Blur, gradient, and glow appear once each, intentionally.

## Detail

- Focus rings, hover transitions, selected states, skeletons, and empty states are where craft shows; their presence is the taste.
- Align optically: nudge icons to the text baseline, centre button labels by line height.
