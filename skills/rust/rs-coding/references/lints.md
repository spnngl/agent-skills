# Lints

For a new crate, or when asked to set up linting. Enable whole clippy groups: new lints arrive with each toolchain bump instead of going stale in a curated list, and the pinned toolchain ([`release.md`](release.md#toolchain)) keeps that bump a deliberate change. Project-specific bans become lints, not review comments: list them in `clippy.toml` under `disallowed-methods` / `disallowed-types`, each with a `reason`.

## Workspace baseline

In the workspace root `Cargo.toml`; each member opts in with `[lints] workspace = true`. A single-package crate uses the same tables without the `workspace.` prefix.

```toml
[workspace.lints.rust]
rust_2018_idioms = { level = "warn", priority = -1 }
ambiguous_negative_literals = "warn"
missing_debug_implementations = "warn"
redundant_imports = "warn"
redundant_lifetimes = "warn"
trivial_numeric_casts = "warn"
unreachable_pub = "warn"
unsafe_code = "deny"
unused_lifetimes = "warn"
# one entry per custom cfg the code tests, e.g. loom and kani harnesses
unexpected_cfgs = { level = "warn", check-cfg = ["cfg(loom)", "cfg(kani)"] }

[workspace.lints.clippy]
# on top of the default groups (correctness deny; complexity, perf, style, suspicious warn)
cargo = { level = "warn", priority = -1 }
pedantic = { level = "warn", priority = -1 }
# pedantic or cargo lints that fight common practice
module_name_repetitions = "allow"
multiple_crate_versions = "allow"
# selected restriction lints
allow_attributes_without_reason = "warn"
as_pointer_underscore = "warn"
assertions_on_result_states = "warn"
clone_on_ref_ptr = "warn"
dbg_macro = "warn"
deref_by_slicing = "warn"
disallowed_script_idents = "warn"
empty_drop = "warn"
empty_enum_variants_with_brackets = "warn"
empty_structs_with_brackets = "warn"
fn_to_numeric_cast_any = "warn"
if_then_some_else_none = "warn"
map_err_ignore = "warn"
multiple_unsafe_ops_per_block = "warn"
panic = "warn"
redundant_type_annotations = "warn"
renamed_function_params = "warn"
semicolon_outside_block = "warn"
todo = "warn"
undocumented_unsafe_blocks = "warn"
unnecessary_safety_comment = "warn"
unnecessary_safety_doc = "warn"
unneeded_field_pattern = "warn"
unused_result_ok = "warn"
unwrap_used = "warn"
```

`clippy.toml` at the workspace root:

```toml
allow-unwrap-in-tests = true
allow-expect-in-tests = true
allow-panic-in-tests = true
allow-print-in-tests = true
allow-dbg-in-tests = true
```

`clippy::arithmetic_side_effects` is too noisy for the baseline; enable it per module in parsers and security-sensitive code, where every operation picks `checked_*`, `saturating_*`, or `wrapping_*`.

## Per-crate lints

A member inheriting `[workspace.lints]` can't add or override entries in its own `Cargo.toml`, so lints that depend on the crate's kind go in its crate root.

Library `src/lib.rs`:

```rust
#![warn(missing_docs, clippy::print_stdout, clippy::print_stderr)]
```

Crates with no `unsafe` add `#![forbid(unsafe_code)]`. A crate that needs `unsafe` keeps the workspace `deny` and opens only the module that measured a need, with `#![expect(unsafe_code, reason = "...")]` at its top.
