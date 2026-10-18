# Testing

Use the project's runner (Vitest, `node --test`, Bun, Jest); Vitest examples below. Run once with `vitest run --typecheck`, never watch mode in agent or CI runs. `node --test` equivalents: `mock.fn<typeof f>()`, `mock.timers.enable({ apis: ["setTimeout"] })`, `await assert.rejects(promise, ErrorClass)`.

## Unit tests

- Co-locate: `user.ts` next to `user.test.ts`.
- Test behaviour through the public API: inputs, outputs, and observable effects.
- One behaviour per test, named as a sentence: `it("rejects an expired token")`.
- Table-driven cases with `it.each([...] as const)` or `describe.each`.
- Fixtures are typed in full: a factory `makeUser(overrides: Partial<User> = {}): User` or a literal with `satisfies User`. The type-assertion ban covers tests.
- Fake time with `vi.useFakeTimers()` and restore it in `afterEach`.
- Async: `await expect(promise).rejects.toThrow(HttpError)`; a missing `await` passes vacuously.

## Mocks

- Prefer real collaborators and in-memory fakes; mock at process boundaries (network, clock, filesystem).
- Network: MSW handlers, inject `fetch` as a parameter, or `vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(data))`.
- Typed mocks: `vi.fn<typeof sendEmail>()`; for module mocks, `vi.mocked(sendEmail)` to reach the mock API with types.
- `vi.restoreAllMocks()` in `afterEach` or `restoreMocks: true` in config.

## Type tests

- Public generic APIs get type tests in `*.test-d.ts`, run by `vitest run --typecheck`:
  ```ts
  import { expectTypeOf } from "vitest";
  expectTypeOf(parse("1")).toEqualTypeOf<Result<number, ParseError>>();
  expectTypeOf(pick).parameter(1).toEqualTypeOf<"a" | "b">();
  ```
- Negative cases: `// @ts-expect-error` above a call that must not compile.
- `typecheck.tsconfig` defaults to the root `tsconfig.json`. When that only lists `references` (Vite), point it at the config that includes the tests (`test.typecheck.tsconfig: "./tsconfig.app.json"`), or every type test passes vacuously. Prove it once by breaking an assertion.

## React components

- Config: `environment: "jsdom"` and a `setupFiles` entry with `import "@testing-library/jest-dom/vitest"` and `afterEach(cleanup)` (Testing Library auto-cleans only with `globals: true`).
- Testing Library: query by role and accessible name (`screen.getByRole("button", { name: "Save" })`), interact with `@testing-library/user-event`, assert on what the user sees.
- `findBy*` waits for async UI; `queryBy*` asserts absence.
- `act` comes from `react`; Testing Library wraps it already.
- Components using `use(promise)` render inside `<Suspense>` in tests too.
- Recharts in jsdom: see [`recharts.md`](recharts.md#sizing).
