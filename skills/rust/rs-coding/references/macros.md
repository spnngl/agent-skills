# Macros

A macro is the last resort: readers, rust-analyzer, and error messages all see through functions, generics, and traits better. Write one only when those cannot express the code: variadic syntax, generating items, or repetitive trait impls across many types.

## `macro_rules!` first

- A declarative macro covers most needs: repetition, impls for a list of types, small DSLs. A procedural macro adds a crate, `syn` compile time, and a build-graph bottleneck.
- Refer to items through absolute paths, `$crate::path::Item` and `::core::...`, so the expansion works wherever it is called.
- Exported macros (`#[macro_export]`) are public API: semver applies to the syntax they accept ([`api.md`](api.md#semver)).

## Procedural macros

Split into three crates:

| Crate | Holds |
| --- | --- |
| `foo` | the runtime API; re-exports the macros |
| `foo_macros` | `proc-macro = true`; a thin entry point per macro |
| `foo_macros_impl` | the logic as `proc_macro2::TokenStream -> TokenStream` functions, unit-tested without the compiler |

- Pin the macro crate exactly from `foo`: `foo_macros = { version = "=1.4.2", path = "../foo_macros" }`, and release them together. Generated code relies on `foo`'s hidden internals, so the versions must match.
- Generated code reaches third-party crates through a hidden re-export in `foo`, so users need not depend on them:
  ```rust
  #[doc(hidden)]
  pub mod __private {
      pub use serde;
  }
  ```
  The expansion names `::foo::__private::serde::Serialize`; it assumes the user depends on `foo`.
- Errors point at the user's tokens: `syn::Error::new_spanned(&field, "expected a named field").to_compile_error()`, never a panic.
- An attribute or derive generates what its name says, and nothing it hides: no extra public items, no `unsafe` the user did not ask for.

## Inspect and test

- `cargo expand path::to::module` shows the expansion.
- Compile-fail tests with `trybuild` pin the error messages.
