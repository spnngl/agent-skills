# Current idioms

Newer forms beyond the four in SKILL.md. Use one when the crate's `rust-version` is at least **Since**.

| Prefer | Over | Since |
| --- | --- | --- |
| `let Some(x) = opt else { return ... };` | `match` + early return | 1.65 |
| `Some(x) if let Ok(n) = x.parse() =>` match guard | nested `if let` inside the arm | 1.95 |
| `async \|\| {}` closures, `AsyncFn` bounds | `F: Fn() -> Fut, Fut: Future` | 1.85 |
| `&raw const x`, `&raw mut x` | `ptr::addr_of!` | 1.82 |
| `opt.is_some_and(f)`, `opt.is_none_or(f)` | `map_or(false, f)`, `map_or(true, f)` | 1.70, 1.82 |
| `&dyn Sub` coerced to `&dyn Super` | hand-written `as_super()` / `as_any()` | 1.86 |
| `v.get_disjoint_mut([i, j])` | `split_at_mut` juggling, raw pointers | 1.86 |
| `v.extract_if(.., pred)`, `map.extract_if(pred)` | `retain` plus a copy of the removed items | 1.87, 1.88 |
| `File::lock`, `try_lock`, `lock_shared` | `fs2`, `fs4`, `fd-lock` | 1.89 |
| `cfg_select! { unix => { ... } _ => { ... } }` | `cfg_if!` | 1.95 |
| `std::assert_matches!(x, Pat)` | `assert!(matches!(x, Pat))` | 1.96 |

When the toolchain is bumped, add rows from the new releases' notes for std APIs or syntax that replace a crate or a common workaround; leave out niche additions.
