# FFI

[`unsafe.md`](unsafe.md) applies to every FFI call. The boundary adds:

## Crates

- Raw bindings live in a `foo-sys` crate: generated declarations only, linking from `build.rs` (`pkg-config` for system libraries). A C API for Rust code lives in a `foo-ffi` crate.
- The safe `foo` crate translates: it converts types and errors at the boundary, and the logic stays in Rust.
- Generate bindings: `bindgen` for C to Rust, `cbindgen` for Rust to C.
- A C library's global state (allocator, error slot, init flag) is shared by every Rust crate that links it; two versions of a `-sys` crate in one build must not each initialize it. `links = "foo"` in `Cargo.toml` makes Cargo reject the duplicate.

## Declarations

```rust
use std::ffi::{c_char, c_int};

unsafe extern "C" {
    pub safe fn abs(x: c_int) -> c_int;
    pub unsafe fn strlen(p: *const c_char) -> usize;
}
```

- Only C-compatible types cross: `#[repr(C)]` structs, `c_int` / `c_char` / … aliases, raw pointers, `Option<extern "C" fn>` for nullable callbacks.
- No Rust `enum` arrives from C: a value outside its variants is UB. Receive the integer and convert with `TryFrom`.
- Values from C arrive as raw pointers or plain integers, never `&T`, `bool`, `char`, or `enum`, and are checked (null, alignment, range) before use.
- Function pointers from C are `Option<unsafe extern "C" fn(..)>` and checked for null.
- Types with `Drop` do not cross by value; pass an opaque pointer instead.

## Exposing a C API

- Expose a dedicated C API in the `-ffi` crate rather than marking internals `extern "C"`.
- Ownership is explicit: hand out `Box::into_raw` and export a matching `foo_free` that calls `Box::from_raw` once, so C never calls `free` on Rust memory. Document who frees every pointer.
- Unwinding: a panic reaching an `extern "C"` function aborts the process. Catch panics with `std::panic::catch_unwind` and return an error code; use `extern "C-unwind"` only when unwinding across is intended.
- Exported symbols use `#[unsafe(no_mangle)]` and a crate prefix (`foo_parse`).

## Strings and buffers

- Bind a `CString` to a variable that outlives every use of its `as_ptr()`; a temporary's pointer dangles at the end of the statement.
- Read incoming strings with `CStr::from_ptr`; write literals as `c"text"`.
- Buffers cross as pointer plus length; `slice::from_raw_parts` needs a non-null, aligned pointer even for length 0 (`NonNull::dangling()`).

## Verify

Miri cannot execute foreign code: run the FFI tests under AddressSanitizer ([`testing.md`](testing.md#verification-by-risk)), and keep pure-Rust logic in the safe crate where Miri reaches it.
