# Lints

For a new crate, or when asked to set up linting. Project-specific bans become lints, not review comments: list them in `clippy.toml` under `disallowed-methods` / `disallowed-types`, each with a `reason`.

## Shared baseline

In the workspace root `Cargo.toml`; each member opts in with `[lints] workspace = true`. A single-package crate uses the same tables without the `workspace.` prefix.

```toml
[workspace.lints.rust]
rust_2018_idioms = { level = "warn", priority = -1 }
unreachable_pub = "warn"

[workspace.lints.clippy]
# selected pedantic
cast_lossless = "warn"
cast_possible_truncation = "warn"
cast_possible_wrap = "warn"
cast_sign_loss = "warn"
implicit_clone = "warn"
inefficient_to_string = "warn"
large_futures = "warn"
manual_let_else = "warn"
match_wildcard_for_single_variants = "warn"
needless_pass_by_value = "warn"
redundant_closure_for_method_calls = "warn"
return_self_not_must_use = "warn"
semicolon_if_nothing_returned = "warn"
trivially_copy_pass_by_ref = "warn"
uninlined_format_args = "warn"
unnecessary_wraps = "warn"
unused_async = "warn"
# selected restriction
allow_attributes_without_reason = "warn"
clone_on_ref_ptr = "warn"
dbg_macro = "warn"
multiple_unsafe_ops_per_block = "warn"
todo = "warn"
undocumented_unsafe_blocks = "warn"
unwrap_used = "warn"
```

`clippy.toml` at the workspace root:

```toml
allow-unwrap-in-tests = true
allow-expect-in-tests = true
allow-print-in-tests = true
allow-dbg-in-tests = true
```

## Per-crate lints

A member inheriting `[workspace.lints]` can't add or override entries in its own `Cargo.toml`, so lints that depend on the crate's kind go in its crate root.

Library `src/lib.rs`:

```rust
#![warn(
    missing_docs,
    clippy::missing_errors_doc,
    clippy::missing_panics_doc,
    clippy::print_stdout,
    clippy::print_stderr
)]
```

Crates with no `unsafe`:

```rust
#![forbid(unsafe_code)]
```
