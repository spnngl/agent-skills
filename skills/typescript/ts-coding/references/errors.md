# Errors

Expected failures are values; bugs are exceptions. TypeScript has no checked exceptions, so a thrown error is invisible in the signature.

## Expected failures: result unions

```ts
import type * as z from "zod";

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export type LoadConfigError =
  | { kind: "not-found"; path: string }
  | { kind: "invalid"; issues: z.core.$ZodIssue[] };
```

- The signature names the failure: `loadConfig(path: string): Promise<Result<Config, LoadConfigError>>`.
- Use a result when the caller has a meaningful branch per failure: validation, not-found, conflict, permission denied.
- Error variants are a discriminated union on `kind`; callers switch exhaustively.
- Reuse the project's existing `Result` type or library (neverthrow, Effect) when it has one.

## Bugs and unrecoverable states: throw

- Throw `Error` instances only, never strings or plain objects.
- Wrap with context and keep the original: ``throw new Error(`reading ${path}`, { cause: error })``.
- Subclass when callers catch by type:
  ```ts
  export class HttpError extends Error {
    override readonly name = "HttpError";
    readonly status: number;
    constructor(status: number, message: string, options?: ErrorOptions) {
      super(message, options);
      this.status = status;
    }
  }
  ```
- Invariant checks throw with a message naming the broken invariant: `assertDefined` ([`types.md`](types.md#narrowing-without-assertions)), or `x satisfies never` before the `throw` in an exhaustive `default`.

## Catching

- `catch (error)` binds `unknown`. Narrow before use: `error instanceof HttpError`, `error instanceof Error`, or `Error.isError(error)` across realms (lib `esnext`).
- Catch where you can act: retry, translate to a result, add context and rethrow, or report at the top level. A `catch` that only logs and continues hides the bug.
- Translate between layers: the HTTP handler maps domain errors to status codes; the domain never imports HTTP types.
- Top level: one handler per entry point (`process.on("unhandledRejection")`, the framework's error hook, a React Error Boundary) logs with `cause` chains and exits or renders a fallback.

## Boundaries

- Untrusted input fails as a `safeParse` result, mapped to the caller's error shape ([`zod.md`](zod.md)).
- `fetch` resolves on HTTP errors: check `response.ok` before parsing the body.
- Never put secrets or full input payloads in error messages; they end up in logs.
