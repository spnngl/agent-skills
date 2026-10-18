# Async

Promises, cancellation, concurrency, and resource cleanup.

## Promises

- Fire-and-forget is explicit: `void task().catch(report)`.
- `async` functions return `Promise<T>` in their signature; a function returning a promise is `async` so throws become rejections.
- Event handlers expecting `void` (`onClick`, `addEventListener`) get a sync wrapper: `onClick={() => { void save().catch(report); }}`.
- `return await` inside `try` so the `catch` sees the rejection.
- `Promise.withResolvers()` for a deferred; wrapping callback APIs in `new Promise` only when no promise API exists (`node:fs/promises`, `node:timers/promises`, `events.once`).

## Concurrency

- Independent work runs concurrently: `await Promise.all([a(), b()])`, not sequential awaits.
- `Promise.allSettled` when one failure must not discard the other results; `Promise.any` for the first success; `Promise.race` with a timeout signal over hand-rolled timers.
- Bound fan-out over large inputs (`p-limit`, a worker pool, or batching): `Promise.all(items.map((item) => fetch(item.url)))` on 10 000 items exhausts sockets.
- `for await (const chunk of stream)` consumes async iterables; `Array.fromAsync(iter)` collects one (lib `esnext`).
- `await` inside a loop is correct only when iterations depend on each other or order matters; say so in a comment.

## Cancellation

- Accept `{ signal }: { signal?: AbortSignal | undefined }` on any long-running async function and pass it down to `fetch`, streams, and timers. Under `exactOptionalPropertyTypes`, `fetch(url, { signal })` fails with TS2379 (`RequestInit.signal` is `AbortSignal | null`): pass `{ signal: signal ?? null }`.
- `AbortSignal.timeout(ms)` for deadlines; `AbortSignal.any([signal, AbortSignal.timeout(ms)])` to combine.
- `signal.throwIfAborted()` between steps of a multi-step operation.
- Aborted operations reject with a `DOMException` named `"AbortError"` (or `"TimeoutError"`); treat it as cancellation, not failure.

## Resource cleanup

- `using` / `await using` dispose at scope exit, including on throw (needs `"lib": ["esnext"]`):
  ```ts
  await using conn = await pool.connect();   // conn implements [Symbol.asyncDispose]
  ```
- Make your own resources disposable by implementing `[Symbol.dispose]()` or `[Symbol.asyncDispose]()`.
- `DisposableStack` / `AsyncDisposableStack` collect several cleanups in one scope.

## Node specifics

- `node:timers/promises` `setTimeout(ms, value, { signal })` over wrapping `setTimeout`.
- CPU-bound work blocks the event loop: move it to `node:worker_threads`.
- Unhandled rejections crash the process by default: handle at the source, not with a global swallow.
