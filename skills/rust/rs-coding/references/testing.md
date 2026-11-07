# Testing

## Layout

- Unit tests sit in a `#[cfg(test)] mod tests` next to the code. Integration tests in `tests/*.rs` exercise only the public API, as a dependent would; shared helpers go in `tests/common/mod.rs`.
- Fuzz targets live in `fuzz/` (`cargo fuzz init`), outside the workspace members.
- Doctests using `?` end with a hidden line fixing the error type:
  ```rust
  /// ```
  /// let port: my_crate::Port = "8080".parse()?;
  /// # Ok::<(), Box<dyn std::error::Error>>(())
  /// ```
  ```

## Writing tests

- Name each test after the behaviour it pins: `rejects_port_zero`, `retries_after_timeout`.
- Test properties and behaviour, not the implementation: a test that restates a constant or recomputes the expected value the way the code does passes for any bug.
- Assert on values: `assert_eq!(got, expected)` prints both sides; `assert_matches!` checks variants; `#[should_panic(expected = "substring")]` pins panic messages.
- Filesystem work happens in `tempfile::TempDir`, outside the source tree.
- I/O, the clock, and randomness come in through a parameter or a constructor, so tests substitute fakes; constructors that only tests use sit behind a `test-util` feature ([`cargo.md`](cargo.md#features)). Prefer a hand-written fake; reach for `mockall` when it grows large.

## Tools

| Need | Tool |
| --- | --- |
| Invariants over many inputs (round trips, parse then print) | `proptest` |
| Large or structured output | `insta` snapshots; inspect every change with `cargo insta review` |
| Table-driven cases and fixtures | `rstest` |
| CLI end to end | `assert_cmd`, `predicates` |
| HTTP mocking | `wiremock` |
| Async | `#[tokio::test]` (see [`async.md`](async.md#tests)) |
| Benchmarks | `criterion` or `divan` in `benches/`, with `harness = false` in `[[bench]]` |
| Coverage | `cargo llvm-cov` |
| Faster runner | `cargo nextest run` |

## Verification by risk

Run the project's recipe for a tool when it has one. Otherwise:

| Risk | Tool |
| --- | --- |
| UB in `unsafe` | `cargo +nightly miri test`; `cargo careful test`; ASan / TSan: `RUSTFLAGS="-Zsanitizer=address" cargo +nightly test --target <host-triple>` (TSan also `-Zbuild-std`) |
| Untrusted input | `cargo fuzz` or `afl.rs`; `proptest` |
| Concurrency | `loom` (exhaustive, small models), `shuttle` (randomized) |
| Arithmetic or `unsafe` invariants worth a proof | `cargo kani` |
| Public API change | `cargo semver-checks` |
| Features | `cargo hack check --each-feature` |
| MSRV | `cargo hack check --workspace --all-targets --rust-version` |
| Test strength | `cargo mutants` (`--in-diff <file>` for a change) |
| Supply chain | `cargo deny check`; `cargo audit`, `cargo vet`, `cargo geiger` |
| Unused dependencies | `cargo shear`; `cargo machete`, `cargo udeps` |
| Lowest dependency versions | `cargo +nightly update -Z direct-minimal-versions`, then `cargo check`; restore `Cargo.lock` |
| Macro output | `cargo expand` |

Research checkers (RAPx, Rudra, MIRAI, lockbud) pin nightlies and report noise: run them only when the project already has a recipe.

Tools that set `RUSTFLAGS` (loom's `--cfg loom`, sanitizers, cargo-fuzz, cargo-careful, cargo-llvm-cov) get their own `CARGO_TARGET_DIR`, so they do not invalidate the main build cache.

## Gate and deep checks

- **Gate**, on every change: the SKILL.md Verify commands (`cargo fmt --check` in CI), plus `typos`, `taplo fmt --check`, `cargo shear`, and `RUSTDOCFLAGS="-D warnings" cargo doc --document-private-items`.
- **Deep**, in scheduled CI: loom, careful and sanitizers, fuzzing, mutants, Kani.
