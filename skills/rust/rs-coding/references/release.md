# Building and shipping binaries

How any binary is built and shipped; what it does at runtime is [`apps.md`](apps.md). Each section ends with its check; [Verify](#verify) runs them all on the built artifacts.

## Toolchain

Pin an exact stable, so a new release's clippy lints do not turn `-D warnings` red on an unrelated change; Renovate (or a manual PR) bumps it:

```toml
# rust-toolchain.toml
[toolchain]
channel = "X.Y.Z"   # current stable: `rustup update stable && rustup run stable rustc --version`
components = ["clippy", "llvm-tools-preview", "rustfmt"]
```

The pin is the development toolchain; `rust-version` is the oldest one supported, checked separately ([`cargo.md`](cargo.md#manifest)). Install with rustup: Homebrew or distribution `rust` packages lack `rust-lld`, which the linker setup needs.

**Check:** in the repository, `rustc --version` prints the pinned version and `ls "$(rustc --print sysroot)"/lib/rustlib/*/bin/rust-lld` finds the linker; a `rustc` from another install earlier in `PATH` fails the second.

## Linker

Every build links with lld: a debug relink is several times faster than with GNU ld or Apple's `ld`.

1. Copy [`assets/lld-cc`](../assets/lld-cc) to `.cargo/lld-cc` and `chmod +x` it.
2. Merge [`assets/cargo-config.toml`](../assets/cargo-config.toml) into `.cargo/config.toml`, replacing `PROJECT`.

The config sets `linker`, never `-C link-arg=-fuse-ld=lld` in `rustflags`: tools that set `RUSTFLAGS` (loom, cargo-fuzz, cargo-careful, cargo-llvm-cov) replace config `rustflags`, and would silently link with another linker. `x86_64-unknown-linux-gnu` has no entry, because rustc links with its bundled lld there by default and a `linker` entry would turn that off. Rejected: `-C linker-features=+lld` (unstable outside x86_64 Linux), `-C linker=rust-lld` (records the wrong macOS SDK version), mold (no macOS).

**Check:** [Verify](#verify), linker lines.

## Static musl

Linux binaries ship as static-PIE musl executables: [`musl.md`](musl.md).

## Allocator

Shipped binaries use mimalloc in secure mode (guard pages, encrypted free lists); musl's own allocator is slow under contention. The feature is off by default, so development, Miri, sanitizers, and fuzzers keep the system allocator they need:

```toml
# the binary crate's Cargo.toml
[dependencies]
mimalloc = { version = "0.1", features = ["secure"], optional = true }

[features]
mimalloc = ["dep:mimalloc"]
```

```rust
// src/main.rs
#[cfg(feature = "mimalloc")]
#[global_allocator]
static ALLOC: mimalloc::MiMalloc = mimalloc::MiMalloc;
```

Every release build, on every target, passes `--features mimalloc`.

**Check:** [Verify](#verify), mimalloc line.

## Profiles

```toml
[profile.release]
lto = "fat"
codegen-units = 1
strip = true
```

- Keep `panic = "unwind"` (the default) when anything catches panics ([`apps.md`](apps.md#panic-isolation)); `panic = "abort"` only when nothing does.
- Symbolized production backtraces: `debug = 1`, `strip = false`; ripgrep also moves `lto` / `codegen-units` to a `[profile.release-lto]` (`inherits = "release"`) built only for shipping.
- Ship for the baseline CPU of each target. Raise `target-cpu` (in `.cargo/config.toml`, per target) only for a fleet that guarantees the level, after a measured win; `native` is for local builds only.
- PGO (`cargo pgo`) last, with a benchmark.

**Check:** a release build of each shipped target succeeds with `--locked --features mimalloc`.

## Reproducible and auditable builds

- `--remap-path-prefix` for the workspace and `CARGO_HOME` in config `rustflags` (the asset has them for musl), so no build-machine path lands in a binary.
- `SOURCE_DATE_EPOCH="$(git log -1 --format=%ct 2>/dev/null || echo 0)"`: mimalloc's C code embeds `__DATE__`, which the compiler takes from this variable; the commit time keeps it meaningful and identical across rebuilds.
- `cargo auditable build --release --locked` embeds the dependency list, so `cargo audit bin <binary>` can scan a shipped artifact.
- Build twice from clean (`--no-cache` in a container) and compare.

**Check:** both builds produce identical hashes. On musl binaries (only their config tables remap), `strings <bin> | grep -cE '/usr/local/cargo|/home/|/Users/'` prints 0, and `strings <bin> | grep registry/src` shows only `cargo/registry/...` paths.

## Verify

Run on each shipped binary; ELF rows inside the musl container (`apk add binutils`), where `readelf` exists:

| Target | Command | Expect |
| --- | --- | --- |
| ELF | `readelf -p .comment <bin>` | `Linker: LLD` |
| ELF, static musl | `readelf -hld <bin>` | type `DYN`, `PIE` and `BIND_NOW` flags, `GNU_RELRO`; no `INTERP`, no `NEEDED` |
| Mach-O | `otool -l <bin> \| grep -A7 LC_BUILD_VERSION` | `tool 4` (lld) |
| all | `strings <bin> \| grep -c mimalloc` | non-zero (`strip` removes symbols, so `nm` cannot tell) |
| all | `cargo audit bin <bin>` | clean |

The test suite passes on each musl target, in its container ([`musl.md`](musl.md#build)).
