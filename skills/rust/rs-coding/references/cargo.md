# Cargo

## Manifest

- New packages: `cargo new` / `cargo init`. Commit `Cargo.lock`, libraries included (the `cargo new` default).
- Edition 2024 defaults to the MSRV-aware resolver `"3"`. A virtual workspace root has no edition, so it declares `resolver = "3"` itself.
- `rust-version` is the oldest toolchain CI tests ([`testing.md`](testing.md#verification-by-risk), MSRV row); raising it is a minor bump ([`api.md`](api.md#semver)). It is separate from the pinned development toolchain ([`release.md`](release.md#toolchain)).

## Workspaces

Members live flat in `crates/<name>`, as in ripgrep. Split a crate when a part has its own users, its own dependencies, or slows incremental builds; a smaller crate compiles in parallel and keeps its API honest. Inherit shared settings from the root so each fact lives once:

```toml
# Cargo.toml
[workspace]
members = ["crates/*"]
resolver = "3"

[workspace.package]
edition = "2024"
rust-version = "X.Y"      # new crate: current stable; lower only for users who need it
license = "MIT OR Apache-2.0"

[workspace.dependencies]
serde = { version = "1", default-features = false }
```

```toml
# crates/foo/Cargo.toml
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

A new dependency passes this gate before `cargo add`:

1. std, or a crate the workspace already has, does not cover the need.
2. It is maintained: recent releases, issues answered, more than one maintainer for anything security-relevant.
3. `cargo deny check` (or `cargo audit`) stays clean: licenses, advisories, no new duplicate versions.
4. Its `unsafe` footprint (`cargo geiger`) and transitive dependencies (`cargo tree -e normal -p <crate>`) are proportionate to what it does.

Libraries use caret requirements (`"1.2"`) and `default-features = false` when defaults pull in more than they use. Inspect with `cargo tree -d` (duplicates), `cargo tree -i foo` (who pulls `foo` in), `cargo update -p foo` (bump one entry).

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
- Test-only constructors and fakes go behind a `test-util` feature that dependents enable in `[dev-dependencies]`.
- Check combinations with `cargo hack check --each-feature` (or `--feature-powerset` for few features).

## Layout and build scripts

- `src/main.rs` stays thin: parse arguments, set up logging and the runtime, call into `src/lib.rs`, which holds the logic and its tests.
- `build.rs` only for what Cargo cannot do: code generation, native compilation and linking. It emits `cargo::rerun-if-changed=<path>` (without it, any package file change reruns the script), writes only to `OUT_DIR`, and stays offline and deterministic.

## Profiles

Release profiles: [`release.md`](release.md#profiles). Keep `overflow-checks` and `debug-assertions` on in `dev` and `test`; they catch the bugs tests exist for. For faster debug runs of dependency-heavy code:

```toml
[profile.dev.package."*"]
opt-level = 2
```

## Crate picks

The default per need; [blessed.rs](https://blessed.rs) for the rest.

| Need | Default | Deviate when |
| --- | --- | --- |
| Errors | `thiserror` (lib) / `anyhow` (bin) | [`apps.md`](apps.md#errors) |
| Serialization | `serde`, `serde_json`, `toml` | |
| CLI parsing | `clap` (derive) | [`apps.md`](apps.md#cli) |
| Async | `tokio`, `tokio-util`, `futures` | |
| HTTP client / server | `reqwest` / `axum` | `ureq` for blocking, few-dependency clients |
| Diagnostics | `tracing`; `tracing-subscriber` in binaries | |
| Data parallelism | `rayon` | |
| Regex | `regex` | |
| Date and time | `jiff` | `chrono` where already in use |
| Bytes, iterators, ordered map | `bytes`, `itertools`, `indexmap` | |
| Fast non-adversarial hashing | `foldhash`, `rustc-hash` | |
| Small inline collections | `smallvec`, `arrayvec` | |
| Concurrent map / read-mostly value | `dashmap` or `papaya` / `arc-swap` | |
| Locks | `std::sync` | `parking_lot` only for a measured need |
| Global allocator | `mimalloc` ([`release.md`](release.md#allocator)) | |
| SQL, UUIDs, temp files | `sqlx`, `uuid`, `tempfile` | |
| Procedural macros | `syn`, `quote`, `proc-macro2` | |
| Releases | `release-plz` | `cargo-release` for manual flows |

Cargo tools (`cargo deny`, `cargo shear`, `cargo expand`, `cargo nextest`, …): [`testing.md`](testing.md#verification-by-risk).
