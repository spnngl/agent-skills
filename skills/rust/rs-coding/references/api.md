# Public API design

Applies to every `pub` item reachable from a library's crate root. Trait impls: [`traits.md`](traits.md). Cases not covered here: the [Rust API Guidelines checklist](https://rust-lang.github.io/api-guidelines/checklist.html).

## Surface

- Expose the minimum: private by default, `pub(crate)` for crate-internal items.
- Private fields plus constructors keep invariants enforceable; a public field is a promise never to validate it.
- Public signatures use std types and your own. A dependency's type there ties your semver to theirs: wrap it, or expose it behind a feature flag when interop is the point. Never `pub use` a dependency or its types; the exceptions are umbrella crates and the hidden paths macros expand to ([`macros.md`](macros.md)).
- Public signatures take and return plain types, not `Arc<T>`, `Box<T>`, or `Rc<RefCell<T>>`; sharing is an internal choice.
- Shape public paths with `#[doc(inline)] pub use` of your own items. Each item has one public path: no glob re-exports, no `prelude` module.
- Modules follow the domain. A `traits`, `errors`, `types`, or `utils` module groups by kind and scatters each feature across files.
- No `static` holding state: two versions of the crate in one build get two copies, and tests cannot reset it. Pass state in.
- `#[non_exhaustive]` on public enums and on structs that may gain fields.
- Seal traits that users call but must not implement:
  ```rust
  mod private { pub trait Sealed {} }
  pub trait Format: private::Sealed { /* ... */ }
  ```

## Abstractions

- Concrete types first, generics when callers must choose the type, `dyn Trait` last.
- To swap an external dependency in tests, an `enum` of the real client and a fake (behind a `test-util` feature) beats a trait with one production impl.
- Keep generics shallow: `Client<Transport>`, not `Client<Retry<Timeout<Transport>>>` in public signatures.
- I/O entry points accept `impl Read` / `impl BufRead` / `impl Write`. Parsing and protocol logic stay sans-IO, on bytes and states, so they test without files or sockets and run under any runtime.

## Construction and inputs

- Up to two optional parameters: `new` plus `with_*` methods. More: `Foo::builder(required) -> FooBuilder`, setters named after the field (`.timeout(d)`), `build()` returning `Result` only when validation can fail; `FooBuilder` has no public `new`. The project's existing convention wins.
- Four or more related parameters: group them in a type (`Credentials { user, password }`).
- The same concept has the same type and position in every function.
- Typestate when calls must happen in order.
- Accept `impl AsRef<Path>` / `impl Into<String>` at ergonomic entry points and convert once; keep internals concrete, since every generic monomorphizes.
- Closure parameters take the weakest bound that works: `FnOnce`, then `FnMut`, then `Fn`.
- `#[must_use]` on functions whose return value is the whole point and on methods returning a modified `Self`.

## Naming

| Prefix | Cost | Ownership | Example |
| --- | --- | --- | --- |
| `as_` | free | borrowed to borrowed | `str::as_bytes` |
| `to_` | expensive | borrowed to owned | `str::to_lowercase` |
| `into_` | variable | owned to owned | `String::into_bytes` |

- Getters are `name()` and `name_mut()`; setters are `set_name()`.
- Iterator types are named after their method: `iter()` returns `Iter`, `into_iter()` returns `IntoIter`.
- A reserved word as a name becomes a raw identifier (`r#type`) or gains a trailing underscore (`type_`).

## Documentation

- Sections where they apply: `# Examples` (runnable), `# Errors` (each failure and its cause), `# Panics`, `# Safety` (on every `unsafe fn`).
- Public modules get `//!` docs. Crate docs open with a quick-start example; `#![doc = include_str!("../README.md")]` keeps README and docs in one source.
- Link items with intra-doc links: ``[`Client::send`]``.

## Semver

Run `cargo semver-checks` before a release. Breaking changes include:

- removing or renaming a public item, or moving it without a re-export;
- adding a variant to an exhaustive enum, or a field to an exhaustive struct with public fields;
- adding a trait method without a default, or tightening a bound;
- losing an auto trait (a new `Rc` field makes the type `!Send`).

Raising `rust-version` is not breaking, but takes a minor bump.
