# Unsafe

`unsafe` marks code that can cause undefined behaviour, nothing else: not "dangerous", not "slow", not "deprecated". A safe function is sound when no safe caller can trigger UB through it. The soundness boundary is the module: any code that can touch the fields an `unsafe` block relies on is part of the review, so keep such types and their invariants in a small module with private fields.

## Rules

- One unsafe operation per block (`clippy::multiple_unsafe_ops_per_block`), wrapped in a safe function whose signature rules out misuse.
- A `// SAFETY:` comment above each block lists the operation's preconditions and why each holds here (`clippy::undocumented_unsafe_blocks`).
- Every `unsafe fn` and `unsafe trait` documents caller obligations under `# Safety` (`clippy::missing_safety_doc`). Inside an `unsafe fn` body, unsafe operations still sit in explicit `unsafe {}` blocks (`unsafe_op_in_unsafe_fn`, warn by default in edition 2024).
- `unsafe impl Send` / `Sync` carries a comment naming the invariant that makes cross-thread use sound.
- Raw pointers:
  - `&raw const x` / `&raw mut x` take an address without creating a reference (packed fields, uninitialized memory);
  - `ptr.cast::<U>()` over `as`;
  - `NonNull<T>` for non-null owning pointers;
  - `ptr.addr()` / `ptr.with_addr(a)` over pointer-integer round trips (strict provenance, 1.84).
- Layout: `#[repr(C)]` on types crossing FFI, `#[repr(transparent)]` on single-field wrappers passed by value. Default `repr(Rust)` layout is unspecified.

## Memory

- Uninitialized memory exists only inside `MaybeUninit<T>`. `mem::zeroed` is valid only for types where all-zero bytes are a valid value.
- `mem::forget` is not used to skip a destructor (`clippy::mem_forget`); `ManuallyDrop` states the intent, and every `ManuallyDrop` value is dropped or moved out on every path.
- `Box::leak` needs a stated reason: a value that truly lives for the whole program.
- Every `Box::into_raw` (or `Arc::into_raw`, `Vec` decomposed into raw parts) is matched by exactly one `from_raw` on every path.

## Adversarial safe code

`unsafe` code cannot trust safe code it calls with values it does not control. Before relying on a callback or trait impl, assume:

- a closure or trait method panics midway, so state must be valid at every point it is called (a guard restores it in `Drop`);
- a user `Deref`, `Clone`, `Drop`, `Hash`, or `Ord` impl returns inconsistent results, or different ones on each call;
- `Iterator::size_hint` and `ExactSizeIterator::len` lie.

To rely on an implementation's behaviour, make the trait `unsafe` and state the contract under `# Safety`.

## Edition 2024

- Linkage attributes are wrapped: `#[unsafe(no_mangle)]`, `#[unsafe(export_name = "...")]`, `#[unsafe(link_section = "...")]`. `extern` blocks: [`ffi.md`](ffi.md).
- `std::env::set_var` and `remove_var` are `unsafe`; set environment before spawning threads.
- References to `static mut` are denied (`static_mut_refs`). Use an atomic, `Mutex`, or `OnceLock`, or `&raw mut STATIC` when a raw pointer is genuinely required.

## Verify

Every crate containing `unsafe` runs under Miri, except across foreign calls ([`ffi.md`](ffi.md#verify)); tools per risk: [`testing.md`](testing.md#verification-by-risk). Reference: [The Rustonomicon](https://doc.rust-lang.org/nomicon/), [`std::ptr` safety docs](https://doc.rust-lang.org/std/ptr/index.html#safety).
