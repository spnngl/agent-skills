# Copy

Interface text is part of the design. Reuse the product's existing terms: one word per concept across every screen.

## Mechanics

- Frontload the verb; buttons name the outcome in three words or fewer: "Create account" over "Submit", "Save draft" over "Click here to save".
- Sentence case for buttons, labels, headings, and menus. No terminal period on labels, buttons, or one-sentence tooltips; periods in multi-sentence text.
- Numerals for counts ("5 items"); numbers and dates through `Intl.NumberFormat` and `Intl.DateTimeFormat`; relative times keep the absolute time in a `<time dateTime>` and its tooltip.
- Placeholders show a format ("name@example.com"); the label is always visible.
- Helper text sets expectations before an error can occur: "Use 8 or more characters with a number".

## By moment

| Moment | Pattern | Example |
| --- | --- | --- |
| Error the user can fix | What happened, then how to fix it, in the user's terms | "Enter an email like name@example.com" |
| Error on our side | Own it, give the next step | "We couldn't save your changes. Try again in a moment." |
| First-use empty | The value, then the first action | "No projects yet. Create one to organise your work." + "Create project" |
| Filtered to zero | Say why it is empty, offer the way back | "No invoices match these filters." + "Clear filters" |
| Cleared empty | Reassure | "You're all caught up." |
| Destructive confirm | Consequence and count; buttons repeat the verb | "Delete 4 invoices? This can't be undone." "Delete invoices" / "Cancel" |
| Loading | Say what is happening | "Generating report…" |
| Success toast | One line, past tense | "Link copied" |

The higher the user's stress, the plainer the language: errors, payments, and destructive actions get no humour and no exclamation marks. Reversible actions offer Undo instead of a confirmation.

## Tells

Rewrite on sight; each marks text as generated:

- Em-dashes and en-dashes in UI copy: use a period or a comma.
- Filler verbs: elevate, unlock, seamless, effortless, supercharge, empower, streamline.
- Triads of abstract adjectives ("powerful, intuitive, and beautiful"): name one concrete, verifiable thing.
- Hedging ("You may want to consider"), "please" in routine actions, "Oops!" without a next step.
- Error codes or stack traces as the whole message.
