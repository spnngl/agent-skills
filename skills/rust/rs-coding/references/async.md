# Async and concurrency

## Pick the model

| Workload | Tool |
| --- | --- |
| Many concurrent I/O-bound tasks | `tokio` (features `rt-multi-thread`, `macros`, plus what you use) |
| CPU-bound data parallelism | `rayon` (`par_iter()`) |
| A few threads borrowing stack data | `std::thread::scope` |

Libraries stay runtime-agnostic where practical (`futures` traits, caller-supplied executors); a library tied to tokio says so in its docs.

## Blocking

Async tasks yield often. Swap `std::fs` and `std::thread::sleep` for `tokio::fs` and `tokio::time::sleep`; route synchronous clients through `tokio::task::spawn_blocking`, and CPU loops longer than about 100 µs to `rayon`, sending the result back over a `oneshot`.

## Locks

- `std::sync::Mutex` is correct and fastest in async code while its guard never lives across an `.await`: scope the guard in a block or `drop` it before awaiting (`clippy::await_holding_lock`).
- A lock that must be held across `.await` is `tokio::sync::Mutex`.
- Prefer one task owning the state and receiving messages over a widely shared lock.

## Tasks and cancellation

- Every `tokio::spawn` handle is awaited, collected in a `JoinSet`, or detached with a comment saying why; task panics surface as `JoinError`.
- `tokio::select!` drops the losing branches, so each branch future must be cancel-safe (tokio documents this per method: `mpsc::Receiver::recv` is, `AsyncReadExt::read_exact` is not). To reuse a future across loop iterations, pin it once outside the loop (`std::pin::pin!`) and select on `&mut fut`.
- Graceful shutdown: pass a `tokio_util::sync::CancellationToken` to tasks, cancel it, then drain with `while set.join_next().await.is_some() {}`. `JoinSet::shutdown` aborts tasks: the fallback after a timeout.
- Wrap network operations in `tokio::time::timeout`.

## Channels

| Need | Channel |
| --- | --- |
| Work queue | `tokio::sync::mpsc::channel(n)`: bounded, so producers feel backpressure |
| Request and response | `oneshot` |
| Every subscriber sees every message | `broadcast` (slow receivers get `RecvError::Lagged` and skip ahead) |
| Latest value, such as config | `watch` |

Use unbounded channels only when the producer's rate is provably bounded.

## Traits and `Send`

- `async fn` in a public trait gives callers no way to require a `Send` future. Use the `trait-variant` crate, or declare `fn call(&self) -> impl Future<Output = T> + Send`.
- `tokio::spawn` always requires a `Send` future. "future cannot be sent between threads safely" names the value held across an `.await`: an `Rc`, a `RefCell` borrow, a non-`Send` guard. Scope or drop it before the await; genuinely `!Send` futures run on a `LocalSet` via `spawn_local`.
- Large futures (`clippy::large_futures`) go behind `Box::pin`.

## Atomics

- `Relaxed` for independent counters; `Release` store paired with `Acquire` load to publish data; `SeqCst` only with a stated reason.
- A `Mutex` is the default; lock-free code needs a benchmark to justify it and `loom` tests to trust it.

## Tests

- `#[tokio::test]` for async tests; `#[tokio::test(start_paused = true)]` with `tokio::time::advance` for time-dependent code (requires tokio's `test-util` feature).
