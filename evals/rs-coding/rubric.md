# Rubric

Grade from the files each run produced, not from the agent's reply; re-run `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`, and `cargo test` where an item depends on them. Each item is pass or fail; N/A when the fixture makes it impossible. Every fail gets a one-line reason with `path:line`.

## p1: config module

1. Library error type (`thiserror` enum, or struct plus kind).
2. Error type is `#[non_exhaustive]`.
3. I/O failure keeps the cause (`#[source]`) and names the path.
4. Values parsed into types at load: port range, log level enum.
5. Paths are `Path` / `PathBuf`, not `String`.
6. Every public item, variant, and public field has `///`; fallible functions have `# Errors`.
7. No `unwrap` / `expect` in library code.
8. fmt, clippy, and tests pass.
9. At least one test exercises an error path.

## p2: CLI

1. `main` returns `ExitCode`; logic lives in a `run` function or the library.
2. A broken pipe (`treegrep … | head -1`) exits quietly.
3. The error is printed once, with its causes (`{:#}` or equivalent).
4. Exit codes 0 match, 1 no match, 2 error, documented.
5. Errors carry context (`anyhow` `.context`, or typed errors naming the path).
6. `clap` derive or `lexopt`.
7. Output through a locked, buffered stdout.
8. fmt, clippy, and tests pass.
9. No release setup the task did not ask for (lld wrapper, `mimalloc`, toolchain pin).

## p3: FFI

1. Declarations in `unsafe extern "C"` with `c_char` / `c_int` / `usize` types.
2. `#[repr(C)]` mirror of `kv_out`.
3. Safe wrapper takes `&[u8]` (or `&str`) and returns `Result` with a typed error per code.
4. `// SAFETY:` comment on every `unsafe` block.
5. Out-parameter is `MaybeUninit` (or zeroed) and read only on success; returned slices borrow the input's lifetime.
6. No C enum mapped straight to a Rust `enum` (N/A if the header has none).
7. Verification beyond unit tests: ASan, or the C build linked through `cc` with `links =`.
8. Raw declarations are private or in a `-sys` crate.

## p4: worker pool

1. Shutdown signalled by `CancellationToken` or a `watch` channel.
2. Workers joined under a deadline (`timeout` around the join), then cancelled.
3. Bounded job channel.
4. No blocking call inside async code.
5. No `std::sync::Mutex` guard held across `.await`.
6. A panicking job surfaces (`JoinError::is_panic`) instead of vanishing.
7. A shutdown test, deterministic (`start_paused` or equivalent).
8. fmt, clippy, and tests pass.

## p5: review

Seeded defects: leftover `pub use crate::endpoint::Endpoint` in `src/parse.rs`; tautological `default_timeout_is_ten_seconds` test; three `unwrap` in library `from_spec` with no `# Panics` (should return `Result`); `pub use url::Url` and the public `url: Url` field expose a dependency's type.

1. Flags the leftover re-export.
2. Flags the tautological test.
3. Flags the `unwrap`s, proposing a `Result`.
4. Flags the exposed dependency type.
5. Each finding has `path:line`, the rule, and a fix.
6. No blocker that is not a real defect.

## p6: release setup

1. lld through `linker = ".cargo/lld-cc"` (wrapper script), not `rustflags`.
2. Static musl targets for x86_64 and aarch64.
3. `mimalloc` as an optional feature, enabled in every release build.
4. `rust-toolchain.toml` pins an exact version.
5. `SOURCE_DATE_EPOCH` set from the last commit's timestamp.
6. Verify commands for the built binaries (linker, static PIE, allocator).
7. Release profile: `lto = "fat"`, `codegen-units = 1`, `strip = true`.
8. Path remapping and `cargo auditable`.
