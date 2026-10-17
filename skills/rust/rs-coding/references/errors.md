# Errors

Libraries define `thiserror` enums, binaries propagate `anyhow::Result`; prototypes, examples, and tests can use `Box<dyn std::error::Error + Send + Sync>`.

## Library error enums

```rust
#[derive(Debug, thiserror::Error)]
#[non_exhaustive]
pub enum ConfigError {
    #[error("failed to read config file {}", path.display())]
    Read { path: PathBuf, #[source] source: std::io::Error },
    #[error("invalid port {0}")]
    InvalidPort(u32),
}
```

- Variants describe what failed in the caller's terms.
- Scope enums to failure domains: each function returns only errors it can actually produce, over one crate-wide catch-all.
- `#[from]` only when one variant per source type is unambiguous and the source alone is enough context; otherwise attach context with `.map_err(|source| ConfigError::Read { path, source })`.
- Messages are lowercase with no trailing punctuation and describe this layer only. Reporters (`{:#}` in anyhow) walk `source()`, so a source also formatted into the message prints twice.
- A dependency's error type in a public variant ties your semver to it ([`api.md`](api.md#surface)); box it as `#[source] source: Box<dyn std::error::Error + Send + Sync>`.

## Applications

- Add `.context("loading config")` or `.with_context(|| format!("reading {}", path.display()))` at each layer that adds meaning; use `anyhow::bail!` and `anyhow::ensure!` for early exits.
- Report once at the top: `main() -> anyhow::Result<()>` prints the chain, or format with `{:#}` for one line. Each error is either logged or returned, so it surfaces once.
- Custom exit codes: return `std::process::ExitCode`.

## Panic or Result

- `Result` for anything the caller or the environment can cause: I/O, input, network, configuration, resource limits.
- Panic for a violated invariant inside your own code: `unreachable!("reason")` marks logically impossible branches; `debug_assert!` covers checks too costly for release.
- `v[i]` panics on out-of-range; use `v.get(i)` unless `i` is proven in range.
- Integer overflow panics in debug and wraps in release. Where overflow is possible, choose explicitly: `checked_*`, `saturating_*`, `wrapping_*`.
