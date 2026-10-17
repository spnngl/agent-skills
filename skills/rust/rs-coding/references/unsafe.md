# Unsafe and FFI

The safe wrapper around it is the unit of review: it is sound when no safe caller can trigger undefined behaviour.

## Rules

- One unsafe operation per block (`clippy::multiple_unsafe_ops_per_block`), wrapped in a safe function whose signature rules out misuse.
- A `// SAFETY:` comment above each block lists the operation's preconditions and why each holds here (`clippy::undocumented_unsafe_blocks`).
- Every `unsafe fn` and `unsafe trait` documents caller obligations under `# Safety` (`clippy::missing_safety_doc`). Inside an `unsafe fn` body, unsafe operations still sit in explicit `unsafe {}` blocks (`unsafe_op_in_unsafe_fn`, warn by default in edition 2024).
- `unsafe impl Send` / `Sync` carries a comment naming the invariant that makes cross-thread use sound.
- Uninitialized memory goes through `MaybeUninit<T>`. `mem::zeroed` is valid only for types where all-zero bytes are a valid value.
- Raw pointers:
  - `&raw const x` / `&raw mut x` take an address without creating a reference (packed fields, uninitialized memory);
  - `ptr.cast::<U>()` over `as`;
  - `NonNull<T>` for non-null owning pointers;
  - `ptr.addr()` / `ptr.with_addr(a)` over pointer-integer round trips (strict provenance, 1.84).
- Layout: `#[repr(C)]` on types crossing FFI, `#[repr(transparent)]` on single-field wrappers passed by value. Default `repr(Rust)` layout is unspecified.

## Edition 2024

- Extern blocks are `unsafe extern "C" { ... }`, with each item marked `safe` or `unsafe`:
  ```rust
  unsafe extern "C" {
      pub safe fn abs(x: i32) -> i32;
      pub unsafe fn strlen(p: *const c_char) -> usize;
  }
  ```
- Linkage attributes are wrapped: `#[unsafe(no_mangle)]`, `#[unsafe(export_name = "...")]`, `#[unsafe(link_section = "...")]`.
- `std::env::set_var` and `remove_var` are `unsafe`; set environment before spawning threads.
- References to `static mut` are denied (`static_mut_refs`). Use an atomic, `Mutex`, or `OnceLock`, or `&raw mut STATIC` when a raw pointer is genuinely required.

## FFI

- Generate bindings: `bindgen` for C to Rust, `cbindgen` for Rust to C. Link system libraries from a `-sys` crate whose `build.rs` uses `pkg-config`.
- Strings: bind the `CString` to a variable that outlives every use of its `as_ptr()`; a temporary's pointer dangles at the end of the statement. Read incoming strings with `CStr::from_ptr`; write literals as `c"text"`.
- Unwinding: a panic reaching an `extern "C"` boundary aborts. Return error codes and catch panics at the boundary with `std::panic::catch_unwind`; use `extern "C-unwind"` only when unwinding across is intended.
- Ownership: hand out `Box::into_raw`, take back with `Box::from_raw` exactly once, and export a matching free function so C never calls `free` on Rust memory.

## Verify

- `cargo +nightly miri test` for every crate containing `unsafe` (install with `rustup +nightly component add miri`).
- FFI code Miri cannot run: sanitizers, `RUSTFLAGS="-Zsanitizer=address" cargo +nightly test --target <host-triple>`.
- Reference: [The Rustonomicon](https://doc.rust-lang.org/nomicon/), [`std::ptr` safety docs](https://doc.rust-lang.org/std/ptr/index.html#safety).
