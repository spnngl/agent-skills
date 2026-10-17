# Cargo

## Manifest

- New packages: `cargo new` / `cargo init`, with `rust-version` set to the oldest toolchain CI tests (`cargo hack check --rust-version`).
- Edition 2024 defaults to the MSRV-aware resolver `"3"`. A virtual workspace root has no edition, so it declares `resolver = "3"` itself.
- Commit `Cargo.lock`, libraries included (the `cargo new` default).

## Workspaces

Inherit shared settings from the root so each fact lives once:

Root `Cargo.toml`:

```toml
[workspace]
members = ["crates/*"]
resolver = "3"

[workspace.package]
edition = "2024"
rust-version = "1.85"
license = "MIT OR Apache-2.0"

[workspace.dependencies]
serde = { version = "1", default-features = false }
```

Member `crates/foo/Cargo.toml`:

```toml
[package]
name = "foo"
version = "0.1.0"
edition.workspace = true
rust-version.workspace = true

[dependencies]
serde = { workspace = true, features = ["derive"] }

[lints]
workspace = true
```

## Dependencies

- Libraries use caret requirements (`"1.2"`), and set `default-features = false` when defaults pull in more than they use.
- Inspect with `cargo tree -d` (duplicate versions), `cargo tree -i foo` (who pulls `foo` in), `cargo update -p foo` (bump one lockfile entry).

## Features

- Features are additive: enabling one never removes API or changes another feature's behaviour, because feature unification lets any crate in the graph turn it on. Mutually exclusive choices belong in runtime configuration.
- Optional dependency behind a feature, with `dep:` so no implicit feature leaks:
  ```toml
  [dependencies]
  serde = { version = "1", optional = true, features = ["derive"] }

  [features]
  serde = ["dep:serde"]
  ```
  Gate code with `#[cfg(feature = "serde")]` or `#[cfg_attr(feature = "serde", derive(serde::Serialize))]`.
- Check combinations with `cargo hack check --each-feature` (or `--feature-powerset` for few features).

## Layout

`src/main.rs` stays thin: parse arguments, set up logging and the runtime, call into `src/lib.rs`, which holds the logic and its tests.

## Build scripts

`build.rs` only for what Cargo cannot do: code generation, native compilation and linking. It emits `cargo::rerun-if-changed=<path>` (without it, any package file change reruns the script), writes only to `OUT_DIR`, and stays offline and deterministic.

## Profiles

Tune release profiles for shipped binaries, with measurements: see [`perf.md`](perf.md#build-configuration). For faster debug runs of dependency-heavy code:

```toml
[profile.dev.package."*"]
opt-level = 2
```

## Tooling

| Need | Tool |
| --- | --- |
| Licenses, advisories, duplicate and banned crates | `cargo deny check` |
| Unused dependencies | `cargo machete` |
| Macro expansion | `cargo expand` |

## Crate picks

| Need | Crate |
| --- | --- |
| Library errors / application errors | `thiserror` / `anyhow` |
| Serialization | `serde`, `serde_json`, `toml` |
| CLI parsing | `clap` (derive) |
| Async runtime and utilities | `tokio`, `tokio-util`, `futures` |
| HTTP client / server | `reqwest` / `axum` |
| Diagnostics | `tracing`; `tracing-subscriber` in binaries only |
| Data parallelism | `rayon` |
| Regex | `regex` |
| Date and time | `jiff`; `chrono` where already in use |
| Byte buffers | `bytes` |
| Iterator adaptors | `itertools` |
| Insertion-ordered map | `indexmap` |
| Fast non-adversarial hashing | `rustc-hash`, `foldhash` |
| Small inline collections | `smallvec`, `arrayvec` |
| SQL | `sqlx` |
| UUIDs | `uuid` |
| Procedural macros | `syn`, `quote`, `proc-macro2` |

Testing crates: [`testing.md`](testing.md#tools).
