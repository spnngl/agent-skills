---
name: rs-coding
description: "Rust coding workflow and idioms. Use when writing, reviewing, or refactoring Rust code, or editing Cargo.toml."
---

# Rust coding

## Workflow

1. **Orient.** Read the project's sources of truth before writing: `rust-toolchain.toml`, `Cargo.toml` (`edition`, `rust-version`, `[lints]`, `[workspace]`), `clippy.toml`, `rustfmt.toml`, `.cargo/config.toml`, and the CI config, `justfile`, `Makefile`, or `xtask` for the canonical check commands. Read the module you are changing and its neighbours; reuse their helpers, error types, and patterns.
   **Done when:** you can name the edition, the MSRV, the lint policy, every `disallowed-methods` / `disallowed-types` entry, and the project's check commands.

2. **Model the types.** Design data before control flow, following [Types](#types). Changing a library's public API: read [`references/api.md`](references/api.md).
   **Done when:** every invariant the change relies on is encoded in a type, or held by an `expect` whose message names it.

3. **Implement in a tight loop.** Work in small steps and run `cargo check` after each. Read the whole diagnostic: its `help:` line usually names the fix, and `rustc --explain E0502` expands an error code. For a dependency's API, read its source at the locked version (`Cargo.lock`) under `$CARGO_HOME/registry/src/`. Mass renames go through rust-analyzer rename or `ast-grep`; `cargo clippy --fix` applies machine-applicable suggestions. Bug fix: write the regression test first and watch it go red.
   **Done when:** the change compiles with no warnings on lines you changed, and any regression test went red before the fix and green after.

4. **Verify.** Run the project's commands from step 1; otherwise:
   ```sh
   cargo fmt --all
   cargo clippy --workspace --all-targets --all-features -- -D warnings
   cargo test --workspace --all-features
   ```
   - Project with no `[lints]` policy: also run `cargo clippy --all-targets -- -W clippy::pedantic` and fix hits on lines you changed.
   - Mutually exclusive features: replace `--all-features` with each feature set CI tests.
   - `cargo nextest` skips doctests: add `cargo test --doc`.
   - Public docs changed: `RUSTDOCFLAGS="-D warnings" cargo doc --no-deps --all-features`.
   - `unsafe` touched: run [`references/unsafe.md`](references/unsafe.md#verify).
   - Fix lints at the cause. When suppression is right, scope `#[expect(clippy::lint_name, reason = "...")]` to the smallest item.
   **Done when:** every command exits 0, lines you changed raise no warnings, and every new suppression carries a `reason`.

5. **Self-review the diff.** Re-read the full `git diff`, not your memory of it, against [Rules](#rules) and the rules of each reference file whose branch the diff touches.
   **Done when:** every hunk is required by the task, prototype code and `dbg!` / `todo!` are gone, doc comments match behaviour, and every applicable rule holds for every hunk.

**Reviewing** someone else's code: run step 1, run step 4's commands when you can, then apply step 5 to their diff. Report each finding as `path:line`, the rule, and the fix.

## Rules

### Ownership

- Borrow in parameters: `&str`, `&[T]`, `&Path`, `&T`. Take `String`, `Vec<T>`, or `T` by value only when the function stores or consumes it.
- Every `.clone()` earns its place: the callee needs ownership, or the value is a cheap handle (`Arc::clone(&handle)`).
- When the borrow checker objects, restructure first: shorten the borrow, borrow disjoint fields separately, `std::mem::take` / `replace`, indices into a `Vec`. Shared mutable ownership (`Rc<RefCell<_>>`, `Arc<Mutex<_>>`) is the last resort.
- Return `impl Iterator<Item = T>` when the caller only iterates.

### Types

- Make illegal states unrepresentable: an `enum` carrying per-state data, over `bool` flags plus `Option` fields; newtypes for IDs, units, and validated values (`struct Port(NonZeroU16)`).
- Parse, don't validate: convert untrusted input once at the boundary (`TryFrom`, `FromStr`, `#[serde(try_from = "Raw")]`) and pass the parsed type inward.
- Match exhaustively on enums you own. A `_` arm is right only when a future variant should take that branch too.
- Convert integers with `From` / `TryFrom`; `as` truncates and sign-flips silently.

### Errors and panics

- Library: a `thiserror` enum per failure domain. Binary: `anyhow::Result` with `.context(...)`.
- Panics mean bugs. `unwrap()` lives in tests; production code uses `?`, or `expect("...")` stating the invariant that makes failure impossible.

### Current idioms

Older patterns dominate training data. Prefer the current form when `rust-version` allows it; new crates use `edition = "2024"`. `clippy::incompatible_msrv` catches newer std APIs only; language and Cargo features need `cargo +<msrv> check`.

| Prefer | Over | Since |
| --- | --- | --- |
| `std::sync::LazyLock`, `OnceLock` | `lazy_static!`, `once_cell` | 1.80, 1.70 |
| `let Some(x) = opt else { return ... };` | `match` + early return | 1.65 |
| `if let Some(x) = a && x > 0` | nested `if let` | 1.88, edition 2024 |
| native `async fn` in traits | `#[async_trait]`, still needed for `dyn Trait` | 1.75 |
| `async \|\| {}` closures, `AsyncFn` bounds | `F: Fn() -> Fut, Fut: Future` | 1.85 |
| `#[expect(lint, reason = "...")]` | `#[allow(lint)]` | 1.81 |
| `&raw const x`, `&raw mut x` | `ptr::addr_of!` | 1.82 |
| `opt.is_some_and(f)`, `opt.is_none_or(f)` | `map_or(false, f)`, `map_or(true, f)` | 1.70, 1.82 |
| `std::hint::black_box` | `criterion::black_box` | 1.66 |
| `[lints]` in `Cargo.toml` for shared policy | `#![warn(...)]` in every crate root | 1.74 |
| `cargo::` build-script directives | `cargo:` | 1.77 |

### Docs and comments

- Public items get `///` docs: `# Errors` on fallible functions, `# Panics` on panicking ones, examples as doctests using `?`.
- Comments explain why; the code shows what.

### Dependencies

- Reuse what the workspace already depends on (`[workspace.dependencies]`, `cargo tree -i <crate>`), and prefer std when it covers the need.
- Add with `cargo add` (MSRV-aware), enabling only the features you use.

## References

Load the one matching the branch you are on:

- [`references/api.md`](references/api.md): designing or changing a library's public API, naming, trait impls, semver.
- [`references/errors.md`](references/errors.md): defining error types, propagation, panic versus `Result`.
- [`references/async.md`](references/async.md): async, tokio, threads, channels, locks, atomics.
- [`references/unsafe.md`](references/unsafe.md): `unsafe`, FFI, raw pointers, manual `Send` / `Sync`.
- [`references/cargo.md`](references/cargo.md): `Cargo.toml`, workspaces, features, profiles, build scripts, crate picks.
- [`references/lints.md`](references/lints.md): setting up lint configuration for a crate or workspace.
- [`references/testing.md`](references/testing.md): writing tests, property and snapshot tests, benchmarks.
- [`references/perf.md`](references/perf.md): optimizing a measured hot path.
