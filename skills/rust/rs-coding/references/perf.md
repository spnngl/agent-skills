# Performance

Optimization starts from a measurement and ends with one. A change without a measured win is reverted.

## Measure

- Profile release builds with symbols: `CARGO_PROFILE_RELEASE_DEBUG=line-tables-only cargo build --release`.
- CPU: `samply record ./target/release/app`, `cargo flamegraph`, or `perf`. Heap: `dhat`, `heaptrack`.
- Benchmark before and after with `criterion` or `divan`, passing inputs and outputs through `std::hint::black_box`. Report both numbers.
- Compile time: `cargo build --timings`.

## Allocation

- Size known up front: `Vec::with_capacity`, `String::with_capacity`, `reserve`.
- Loops reuse buffers: `clear()` and refill; `clone_from` to reuse the destination's allocation.
- Build strings with `write!(buf, ...)` into an existing `String` (`use std::fmt::Write`) rather than a `format!` per iteration.
- `Cow<'_, str>` when a value is usually borrowed and occasionally owned.
- `Box<[T]>` / `Box<str>` for data frozen after construction.
- `smallvec` / `arrayvec` for small bounded collections; an arena (`bumpalo`) for many objects sharing one lifetime.
- Box large enum variants (`clippy::large_enum_variant`) and pin the size of hot types: `const _: () = assert!(size_of::<Token>() == 16);`.

## CPU

- Iterators and slice methods (`zip`, `chunks_exact`, `windows`) let the compiler drop bounds checks that index loops keep. Re-slicing once (`let s = &v[..n];`) does the same for indexed code.
- Maps: `rustc_hash::FxHashMap` or `foldhash` for keys an attacker cannot choose; the `entry()` API instead of lookup-then-insert.
- I/O: `BufReader` / `BufWriter` around files and sockets; `stdout().lock()` once for many writes.
- Inlining: rustc already inlines generics and trivially small functions across crates. `#[inline]` on other non-generic `pub` functions called across crates in hot paths; `#[cold]` on error paths; `#[inline(always)]` only with benchmark evidence.
- Static dispatch (generics) in hot loops; `dyn Trait` where code size matters more.

## Build configuration

For shipped binaries, after measuring:

```toml
[profile.release]
lto = "fat"
codegen-units = 1
panic = "abort"          # only if nothing relies on catch_unwind
```

- `RUSTFLAGS="-C target-cpu=native"` only for binaries that run on the machine that built them.
- Profile-guided optimization: `cargo pgo`.
- Reference: [The Rust Performance Book](https://nnethercote.github.io/perf-book/).
