# Library errors

Libraries define their own error types; binaries use `anyhow` ([`apps.md`](apps.md#errors)). Every public error is `std::error::Error + Send + Sync + 'static`.

## Default: one enum per operation

```rust
#[derive(Debug, thiserror::Error)]
#[non_exhaustive]
pub enum LoadConfigError {
    #[error("failed to read config file {}", path.display())]
    Read { path: PathBuf, #[source] source: std::io::Error },
    #[error("invalid port {0}")]
    InvalidPort(u32),
}
```

- Scope each enum to one operation or situation, so a function returns only errors it can produce. One crate-wide enum forces callers to handle variants that cannot happen.
- Variants describe what failed in the caller's terms.

## Published crates: struct plus kind

When the set of failures keeps changing, a struct hides the representation, and adding a failure is not a breaking change:

```rust
#[derive(Debug)]
pub struct Error {
    glob: Option<String>,
    kind: ErrorKind,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[non_exhaustive]
pub enum ErrorKind {
    UnclosedClass,
    InvalidRange(char, char),
}

impl Error {
    /// The pattern that failed to parse, if known.
    pub fn glob(&self) -> Option<&str> { self.glob.as_deref() }
    /// What went wrong.
    pub fn kind(&self) -> &ErrorKind { &self.kind }
}
```

(Shape from `globset::Error`; it also implements `Display` and `std::error::Error`.) When callers need only a few questions answered, keep the kind private and expose `is_not_found()`-style methods instead of `kind()`.

## Context and conversion

- `#[from]` (or a hand-written `From`) when one variant per source type is unambiguous and the source alone is enough context. Otherwise attach context: `.map_err(|source| LoadConfigError::Read { path, source })`.
- Messages are lowercase with no trailing punctuation and describe this layer only. Reporters walk `source()`, so a source also formatted into the message prints twice.
- A dependency's error type in a public variant ties your semver to it ([`api.md`](api.md#surface)); box it as `#[source] source: Box<dyn std::error::Error + Send + Sync>`.
- Capture a `std::backtrace::Backtrace` only in errors that travel far from their cause. `Backtrace::capture()` is cheap unless `RUST_BACKTRACE` or `RUST_LIB_BACKTRACE` is set.

## Panic or `Result`

- `Result` for anything the caller or the environment can cause: I/O, input, network, configuration, resource limits.
- Otherwise panic (SKILL.md, Errors and panics): `unreachable!("reason")` marks impossible branches; `debug_assert!` covers checks too costly for release.
- Prototypes, examples, and tests can use `Box<dyn std::error::Error + Send + Sync>`.
