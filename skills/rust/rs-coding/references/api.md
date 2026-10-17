# Public API design

Applies to every `pub` item reachable from a library's crate root. Distilled from the [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/checklist.html); consult the checklist for cases not covered here.

## Surface

- Expose the minimum: private by default, `pub(crate)` for crate-internal items, `pub use` re-exports to shape the public paths.
- Private fields plus constructors keep invariants enforceable; a public field is a promise never to validate it.
- Dependency types in public signatures tie your semver to theirs. Re-export the dependency (`pub use dep;`) or wrap its types.
- Future-proof with `#[non_exhaustive]` on public enums and on structs that may gain fields.
- Seal traits that users call but must not implement:
  ```rust
  mod private { pub trait Sealed {} }
  pub trait Format: private::Sealed { /* ... */ }
  ```

## Construction and inputs

- A builder (`FooBuilder::build(self) -> Result<Foo, BuildError>`) once optional parameters pass about three; typestate when calls must happen in order.
- Accept `impl AsRef<Path>` / `impl Into<String>` at ergonomic entry points and convert once; keep internals concrete, since every generic monomorphizes.
- Closure parameters take the weakest bound that works: `FnOnce`, then `FnMut`, then `Fn`.
- `#[must_use]` on functions whose return value is the whole point and on methods returning a modified `Self`.

## Traits to implement

- Derive on public types wherever semantically valid: `Debug` always, then `Clone`, `PartialEq`, `Eq`, `Hash`, `PartialOrd`, `Ord`, `Default`. Adding `Copy` later is compatible; removing it breaks callers.
- Conversions: implement `From` (`Into` comes free), `TryFrom` for fallible ones, `FromStr` for text, `AsRef` for cheap borrows. `Deref` belongs to smart pointers only.
- Collections: `IntoIterator` for `T`, `&T`, and `&mut T`, plus `FromIterator` and `Extend`.
- `Serialize` / `Deserialize` behind an optional `serde` feature (see [`cargo.md`](cargo.md#features)).
- Keep public types `Send + Sync` unless they inherently are not, and pin it with a test:
  ```rust
  #[test]
  fn public_types_are_send_sync() {
      fn assert<T: Send + Sync>() {}
      assert::<Client>();
  }
  ```

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

- Crate docs (`//!`) open with a quick-start example; `#![doc = include_str!("../README.md")]` keeps README and docs in one source.
- Link items with intra-doc links: ``[`Client::send`]``.

## Semver

Run `cargo semver-checks` before a release. Breaking changes include:

- removing or renaming a public item, or moving it without a re-export;
- adding a variant to an exhaustive enum, or a field to an exhaustive struct with public fields;
- adding a trait method without a default, or tightening a bound;
- losing an auto trait (a new `Rc` field makes the type `!Send`);
- raising `rust-version` (treat as at least a minor bump).
