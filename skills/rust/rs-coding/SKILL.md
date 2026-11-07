---
name: rs-coding
description: "Rust coding workflow and idioms. Use when writing, reviewing, refactoring, or debugging Rust (`.rs`), fixing rustc or clippy errors, or editing `Cargo.toml`, `build.rs`, `clippy.toml`, `rust-toolchain.toml`, or `.cargo/config.toml`."
---

# Rust coding

## Workflow

1. **Orient.** Before writing, read `rust-toolchain.toml`, `Cargo.toml` (`edition`, `rust-version`, `[lints]`, `[workspace]`), `clippy.toml`, `rustfmt.toml`, `.cargo/config.toml`, `deny.toml`, `supply-chain/`, and the CI config, `justfile`, or `xtask` for the check commands. Read the module you change and its neighbours; reuse their helpers, error types, and patterns. A binary crate: also [`apps.md`](references/apps.md). Release builds, only when asked: [`release.md`](references/release.md).
   **Done when:** you can name the edition, MSRV, toolchain pin, lint policy, `disallowed-*` entries, linker, crate kind (lib or bin), and check commands.

2. **Model the types.** Design data before control flow, following [Types](#types). Changing a library's public API: read [`references/api.md`](references/api.md).
   **Done when:** every invariant the change relies on is encoded in a type, or held by an `expect` whose message names it.

3. **Implement in a tight loop.** Work in small steps and run `cargo check` after each. Read the whole diagnostic: its `help:` line usually names the fix; `rustc --explain E0502` expands a code. For a dependency's API, read its source at the `Cargo.lock` version under `$CARGO_HOME/registry/src/`. Mass renames: rust-analyzer or `ast-grep`. Review `cargo clippy --fix` output like your own code. Bug fix: write the regression test first and watch it go red.
   **Done when:** the change compiles with no warnings on lines you changed, and any regression test went red before the fix and green after.

4. **Verify.** Run the project's commands from step 1; otherwise:
   ```sh
   cargo fmt --all
   cargo clippy --workspace --all-targets --all-features -- -D warnings
   cargo test --workspace --all-features
   ```
   - Project with no `[lints]` policy: also run `cargo clippy --all-targets -- -W clippy::pedantic -W missing_docs` and fix hits on lines you changed.
   - Mutually exclusive features: replace `--all-features` with each feature set CI tests.
   - `cargo nextest` skips doctests: add `cargo test --doc`.
   - Public docs changed: `RUSTDOCFLAGS="-D warnings" cargo doc --no-deps --all-features`.
   - `unsafe`, concurrency, untrusted input, public API, or features touched: add the tools [`testing.md`](references/testing.md#verification-by-risk) lists for that risk.
   - Build or link configuration touched: run [`release.md`](references/release.md#verify).
   - Fix lints at the cause. When suppression is right, scope `#[expect(clippy::lint_name, reason = "...")]` to the smallest item.
   **Done when:** every command exits 0, lines you changed raise no warnings, and every new suppression carries a `reason`.

5. **Self-review the diff.** Re-read the full `git diff`, not your memory of it, against [Rules](#rules) and the rules of each reference file whose branch the diff touches.
   **Done when:** every hunk is required by the task; prototype code, `dbg!`, `todo!` are gone; each public item has one path (no leftover re-export); no test restates a constant or mirrors the implementation; docs describe the end state, not the journey; every applicable rule holds.

**Reviewing** someone else's code: steps 1, 4 (when you can), and 5 on their diff. Report each finding as `path:line`, the rule, and the fix.

## Rules

### Ownership

- Borrow in parameters: `&str`, `&[T]`, `&Path`, `&T`. Take `String`, `Vec<T>`, or `T` by value only when the function stores or consumes it.
- Clone only when the callee needs ownership or for a cheap handle (`Arc::clone(&h)`).
- When the borrow checker objects, restructure first: shorter borrows, disjoint field borrows, `mem::take` / `replace`, indices. `Rc<RefCell<_>>` / `Arc<Mutex<_>>` is the last resort.
- Return `impl Iterator<Item = T>` when the caller only iterates.

### Types

- Make illegal states unrepresentable: an `enum` carrying per-state data, over `bool` flags plus `Option` fields; newtypes for IDs, units, and validated values (`struct Port(NonZeroU16)`).
- A newtype that rejects some values is built through a fallible constructor, `TryFrom`, or `FromStr`, never `From`.
- Parse, don't validate: convert untrusted input once at the boundary (`TryFrom`, `FromStr`, `#[serde(try_from = "Raw")]`); pass the parsed type inward.
- OS paths are `PathBuf` / `&Path`, not `String`.
- Match exhaustively on enums you own; use `_` only when future variants belong in that arm.
- Convert integers with `From` / `TryFrom`; `as` truncates and sign-flips silently. Where arithmetic can overflow, choose `checked_*`, `saturating_*`, or `wrapping_*`.

### Errors and panics

- Library error types: [`errors.md`](references/errors.md). Binaries: [`apps.md`](references/apps.md#errors).
- A panic means a bug: a violated contract, documented under `# Panics`. Its message names the invariant and the values involved: `expect("port validated at startup")`, `assert!(i < len, "index {i} out of range for {len}")`. `unwrap()` lives in tests.
- Indices that come from input use `get(i)`.

### Rust-shaped code

- Write Rust, not a port of a class design: no `Manager`, `Service`, `Factory`, or `Helper` names, no inheritance emulated through traits.
- Free functions over associated functions without a receiver; constructors are the exception.
- Core behaviour is inherent; trait impls forward to it.
- Names are short, at most two words, and do not repeat their module: `db::Connection`, not `db::DbConnection`.

### Current idioms

Training data favours older patterns. Use the current form when `rust-version` allows; new crates use `edition = "2024"`. `clippy::incompatible_msrv` catches std APIs only; `cargo +<msrv> check` catches the rest. Before writing new code, read [`idioms.md`](references/idioms.md) for the rest of the table.

| Prefer | Over | Since |
| --- | --- | --- |
| `std::sync::LazyLock`, `OnceLock` | `lazy_static!`, `once_cell` | 1.80, 1.70 |
| `if let Some(x) = a && x > 0` | nested `if let` | 1.88, edition 2024 |
| native `async fn` in traits | `#[async_trait]`, still needed for `dyn Trait` | 1.75 |
| `#[expect(lint, reason = "...")]` | `#[allow(lint)]` | 1.81 |

### Docs and comments

- Public items get `///` docs whose first sentence fits on one line (about 15 words); sections and module docs: [`api.md`](references/api.md#documentation).
- Comments explain why; the code shows what.

### Dependencies

- Reuse what the workspace already depends on (`[workspace.dependencies]`, `cargo tree -i <crate>`), and prefer std when it covers the need.
- A new dependency passes the vetting gate in [`cargo.md`](references/cargo.md#dependencies). Add it with `cargo add` (MSRV-aware), enabling only the features you use.

## References

Load the one for your branch:

- [`idioms.md`](references/idioms.md): newer std APIs and syntax, before writing new code.
- [`api.md`](references/api.md): a library's public API, naming, docs, semver.
- [`traits.md`](references/traits.md): derives and trait impls on public types.
- [`errors.md`](references/errors.md): library error types, propagation, panic versus `Result`.
- [`apps.md`](references/apps.md): binaries: `main`, exit codes, CLI, logging, panic isolation.
- [`async.md`](references/async.md): async, tokio, threads, channels, locks, atomics.
- [`unsafe.md`](references/unsafe.md): `unsafe`, raw pointers, memory, manual `Send` / `Sync`.
- [`ffi.md`](references/ffi.md): calling C or exposing a C API, `-sys` crates.
- [`macros.md`](references/macros.md): `macro_rules!` or procedural macros.
- [`cargo.md`](references/cargo.md): `Cargo.toml`, workspaces, features, `build.rs`, new dependencies, crate picks.
- [`lints.md`](references/lints.md): lint configuration for a crate or workspace.
- [`testing.md`](references/testing.md): tests, verification tools by risk.
- [`perf.md`](references/perf.md): a measured hot path.
- [`release.md`](references/release.md): toolchain pin, lld (`assets/`), allocator, profiles, reproducibility.
- [`musl.md`](references/musl.md): static Linux binaries, musl targets, Alpine builds.

Deeper sources: [Microsoft Pragmatic Rust Guidelines](https://microsoft.github.io/rust-guidelines/agents/all.txt), [ANSSI Rust guide](https://anssi-fr.github.io/rust-guide/).
