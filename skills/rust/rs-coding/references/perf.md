# Performance

Optimization starts from a measurement and ends with one. A change without a measured win is reverted.

## Measure

Profile and benchmark the profile you ship ([`release.md`](release.md#profiles)), with symbols:

```toml
[profile.bench]          # inherits release
debug = "line-tables-only"
strip = false
```

- CPU: `cargo build --profile bench` (output lands in `target/release`), then `samply record ./target/release/app`, `cargo flamegraph`, or `perf`. Heap: `dhat`, `heaptrack`. Generated code: `cargo asm` (`cargo-show-asm`).
- Benchmark before and after with `criterion` or `divan`, passing inputs and outputs through `std::hint::black_box`; a CLI end to end with `hyperfine`. Report both numbers.
- Compile time: `cargo build --timings`.

## Allocation

- Size known up front: `Vec::with_capacity`, `String::with_capacity`, `reserve`.
- Loops reuse buffers: `clear()` and refill; `clone_from` to reuse the destination's allocation. Hot APIs offer a `*_into(&mut buf)` variant next to the allocating one (`read_to_string(&mut s)`).
- Build strings with `write!(buf, ...)` into an existing `String` (`use std::fmt::Write`) rather than a `format!` per iteration.
- `Cow<'_, str>` when a value is usually borrowed and occasionally owned.
- `Box<[T]>` / `Box<str>` / `Arc<str>` for data frozen after construction: one allocation, no spare capacity.
- Indirection costs a cache miss: a `Vec<T>` beats `Vec<Box<T>>`, and indices into one `Vec` beat a graph of `Rc`s.
- `smallvec` / `arrayvec` for small bounded collections; an arena (`bumpalo`) for many objects sharing one lifetime.
- Box large enum variants (`clippy::large_enum_variant`) and pin the size of hot types: `const _: () = assert!(size_of::<Token>() == 16);`.

## CPU

- Iterators and slice methods (`zip`, `chunks_exact`, `windows`) let the compiler drop bounds checks that index loops keep. Re-slicing once (`let s = &v[..n];`) does the same for indexed code.
- Maps: `rustc_hash::FxHashMap` or `foldhash` for keys an attacker cannot choose; the `entry()` API instead of lookup-then-insert.
- I/O: `BufReader` / `BufWriter` around files and sockets; `stdout().lock()` once for many writes.
- Inlining: rustc already inlines generics and trivially small functions across crates. `#[inline]` on other non-generic `pub` functions called across crates in hot paths; `#[cold]` on error paths; `#[inline(always)]` only with benchmark evidence.
- Static dispatch (generics) in hot loops; `dyn Trait` where code size matters more.
- Batch: one call, syscall, lock, or channel send per batch of items, not per item.

Release profile, LTO, `target-cpu`, and allocator: [`release.md`](release.md). Reference: [The Rust Performance Book](https://nnethercote.github.io/perf-book/).
