# rs-coding evaluation

A/B check for changes to [`skills/rust/rs-coding`](../../skills/rust/rs-coding/): run the same six tasks with the current skill and the changed one, grade both against a fixed rubric. It lives outside `skills/` so it is not installed with the skill.

| File | Holds |
| --- | --- |
| [`prompts.md`](prompts.md) | the preamble and the six tasks |
| [`rubric.md`](rubric.md) | pass/fail items per task, including p5's seeded defects |
| [`setup.sh`](setup.sh) | creates a fresh working directory per task |
| `fixtures/` | p3's C code; p5's base crate and the uncommitted change under review |

## Run

1. Export both versions: `git archive HEAD skills/rust/rs-coding | tar -x -C /tmp/old` for the current one, a copy of the working tree for the new one.
2. `evals/rs-coding/setup.sh /tmp/runs/old` and `evals/rs-coding/setup.sh /tmp/runs/new`.
3. For each task, start a fresh agent with no other context, giving it the preamble and the task from `prompts.md`, the matching skill, and its working directory. Run the twelve in parallel.
4. Grade every run with `rubric.md` by a separate agent or by hand, reading the produced files.

Freeze the rubric before the runs. When a change adds guidance, add the rubric items that test it first, then run.

**Done when:** the new skill passes every item the old one passed, and fails none of the items its change targets.

## Results

| Date | Old | New | Notes |
| --- | --- | --- | --- |
| 2026-11-07 | 31/38 | 37/38 | rewrite against Microsoft, ANSSI, ripgrep, and dedens; p4 old run cancelled, new 8/8; one run per task. Rubric since rewritten from notes, adding p2.9 (new failed it) |
