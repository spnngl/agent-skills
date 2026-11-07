# Trait impls on public types

## Derives

- Derive on public types wherever semantically valid: `Debug` always, then `Clone`, `PartialEq`, `Eq`, `Hash`, `PartialOrd`, `Ord`, `Default`. Adding `Copy` later is compatible; removing it breaks callers.
- Keep public types `Send + Sync` unless they inherently are not, and pin it with a test:
  ```rust
  #[test]
  fn public_types_are_send_sync() {
      fn assert<T: Send + Sync>() {}
      assert::<Client>();
  }
  ```

## Hand-written impls

- `Debug` on a type holding a secret is hand-written and prints a placeholder. A test asserts the secret is absent from `format!("{value:?}")`.
- `Display` on types users read: errors, identifiers, values that appear in messages.
- `PartialEq`, `Eq`, `PartialOrd`, `Ord`, and `Hash` agree: `a == b` implies `a.cmp(&b) == Equal` and equal hashes, and the order is total and transitive. Derive them together, or test a hand-written set with property tests. `BTreeMap`, `HashMap`, and `sort` misbehave, without UB, when they disagree.
- `Drop` never panics: a panic during unwinding aborts. `Drop` may not run at all (`mem::forget`, a leaked `Rc` cycle, `abort`), so security cleanup such as zeroing a key is best-effort there and needs another guarantee when it matters.

## Conversions and collections

- Implement `From` (`Into` comes free), `TryFrom` for fallible ones, `FromStr` for text, `AsRef` for cheap borrows. `Deref` belongs to smart pointers only.
- Collections: `IntoIterator` for `T`, `&T`, and `&mut T`, plus `FromIterator` and `Extend`.
- `Serialize` / `Deserialize` behind an optional `serde` feature (see [`cargo.md`](cargo.md#features)).
