---
name: ts-coding
description: "TypeScript coding workflow and idioms, including React, Next.js, Recharts, and Zod. Use when writing, reviewing, or refactoring TypeScript, TSX, or JSDoc-typed JavaScript, or editing tsconfig.json, package.json, workspace, or Biome, oxlint, or oxfmt config."
---

# TypeScript coding

## Workflow

1. **Orient.** Read the project's sources of truth before writing: `package.json` (`type`, `engines`, `packageManager`, `exports`, `scripts`, installed majors), the lockfile, every `tsconfig*.json` along its `extends` chain, the root's workspace, framework, lint, and format config (`pnpm-workspace.yaml`, `turbo.json`, `next.config.ts`, `biome.json`, `.oxlintrc.json`), and CI for the canonical check commands. Run `tsc --showConfig` to resolve the `extends` chain; it omits options left at their default, so read those from [`references/modules.md`](references/modules.md#defaults) (TypeScript 6 and 7 changed them). Read the module you are changing and its neighbours; reuse their helpers, error types, schemas, and patterns.
   **Done when:** you can name the package manager, the TypeScript major, `module` and `moduleResolution`, the strictness flags beyond `strict` (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `erasableSyntaxOnly`), the lint and format toolchain, and the project's check commands.

2. **Model the types.** Design data before control flow, following [Types](#types). Input from outside the process: read [`references/zod.md`](references/zod.md). Changing a package's public API: read [`references/api.md`](references/api.md).
   **Done when:** every invariant the change relies on is encoded in a type, and every value crossing a trust boundary is parsed by a schema before use.

3. **Implement in a tight loop.** Work in small steps and run `tsc --noEmit` (`tsc -b` with project references) after each. Read the whole diagnostic; its code (`TS2742`) is the search key into the tables in [`references/modules.md`](references/modules.md#errors) and [`references/types.md`](references/types.md#errors). For a dependency's API, read its `.d.ts` under `node_modules/<pkg>/` at the installed version. Bug fix: write the regression test first and watch it go red.
   **Done when:** the change type-checks with no new diagnostics, and any regression test went red before the fix and green after.

4. **Verify.** Run the project's commands from step 1 through its package manager (`pnpm exec`, `npx`, `bunx`); otherwise, for the toolchain the project uses:
   ```sh
   tsc --noEmit                                           # tsc -b when tsconfig.json only lists references
   biome ci                                               # Biome
   oxfmt --check && oxlint --type-aware --deny-warnings   # oxlint + oxfmt
   vitest run --typecheck                                 # or the project's test runner
   ```
   - A root `tsconfig.json` with `"files": []` and `references` makes `tsc --noEmit` check nothing; use `tsc -b`. In a workspace without a root tsconfig, run the checks per package through the task runner (`turbo run check-types test`).
   - Keep `tsc` in the loop with every linter: Biome's type inference and oxlint's type-aware rules complement it, never replace it.
   - Formatting failures: apply the formatter (`biome check --write`, `oxfmt`) instead of editing by hand.
   - Fix diagnostics at the cause. When suppression is right, scope it to one line and give the reason: `// biome-ignore lint/<group>/<rule>: reason`, `// oxlint-disable-next-line <rule> -- reason`, `// @ts-expect-error reason`.
   - Lint or format config touched: check it against [`references/lints.md`](references/lints.md#strict-configs), then run the linter and formatter over the whole repository, not only changed files.
   - Public API of a published package touched: run [`references/api.md`](references/api.md#verify).
   **Done when:** every command exits 0, lines you changed raise no warnings, and every new suppression carries a reason.

5. **Self-review the diff.** Re-read the full `git diff` (`git add -A && git diff --cached` when files are new), not your memory of it, against [Rules](#rules) and the rules of each reference file whose branch the diff touches.
   **Done when:** every hunk is required by the task, `console.log`, `debugger`, `.only`, and commented-out code are gone, doc comments match behaviour, and every applicable rule holds for every hunk.

**Reviewing** someone else's code: run step 1, run step 4's commands when you can, then apply step 5 to their diff. Report each finding as `path:line`, the rule, and the fix.

## Rules

### Types

- Narrow with evidence: `typeof`, `instanceof`, `in`, a discriminant check, a type predicate, or a schema parse. `any`, the non-null `!`, and `as T` are banned, in tests too; `as const` and `satisfies` stay. When a library's types are wrong, fix them at the source with module augmentation ([`references/types.md`](references/types.md#escape-hatches)).
- Make illegal states unrepresentable: a discriminated union with a literal `kind` field, over `boolean` flags plus optional fields. Brand IDs, units, and validated values through a schema (`z.string().brand<"UserId">()`) or a type predicate, never `as`.
- Parse, don't validate: `JSON.parse`, `Response.json()`, env vars, storage, URL params, and `postMessage` data are `unknown` until a Zod schema parses them at the boundary; pass the parsed type inward.
- Switch exhaustively on unions you own: end with `default: x satisfies never; throw new Error(...)`, or map with a `Record<Union, V>` lookup that fails to compile when a member is added.
- Indexed access is `T | undefined` under `noUncheckedIndexedAccess`: handle the `undefined` (guard, `?? fallback`, `for...of`) instead of asserting it away.
- Exported functions declare their return type; locals stay inferred.
- `interface` for object shapes, `extends` over `&` intersections; `type` for unions, mapped, and conditional types.
- Accept `readonly T[]` and `Readonly<T>` for inputs the function does not mutate.
- A string-literal union or an `as const` object, over `enum` and namespaces with runtime code (both banned under `erasableSyntaxOnly`).

### Errors and async

- Expected failures the caller must handle return a discriminated result; bugs and unrecoverable states throw an `Error` subclass with `{ cause }`. Details: [`references/errors.md`](references/errors.md).
- Every promise is awaited, returned, or passed to a handler that observes its rejection.

### Current idioms

Training data predates TypeScript 6 and 7: TypeScript 7 is the Go-native compiler, `strict` is on by default, `types` defaults to `[]`, and `baseUrl`, `outFile`, `target: "ES5"`, and `moduleResolution: "node10"` are removed ([`references/modules.md`](references/modules.md)). Prefer the current form, including standard-library APIs by [`lib` level](references/modules.md#lib-levels), when the installed versions allow it. Where a reference disagrees with the installed package's `.d.ts` or CHANGELOG, the installed version wins.

| Prefer | Over | Since |
| --- | --- | --- |
| `const config = { ... } satisfies Config` | `const config: Config` (widens), `as Config` | 4.9 |
| `function f<const T>(x: T)` | `as const` at every call site | 5.0 |
| `import type { T }` with `verbatimModuleSyntax` | `importsNotUsedAsValues` (removed) | 5.0 |
| `using` / `await using` with `[Symbol.dispose]` | `try` / `finally` cleanup | 5.2, lib `esnext` |
| `import data from "./d.json" with { type: "json" }` | `assert { type: "json" }` (error since 6.0) | 5.3 |
| `NoInfer<T>` | `T & {}` inference blockers | 5.4 |
| inferred predicates: `xs.filter((x) => x !== undefined)` | hand-written `(x): x is T =>` guards | 5.5 |

### Docs and comments

- Exported items get `/** */` docs stating the contract: `@throws` for thrown errors, `@deprecated` naming the replacement, `@example` when usage is not obvious from the signature.

### Dependencies

- Reuse what `package.json` already lists, and prefer the platform when it covers the need: `fetch`, `structuredClone`, `crypto.randomUUID`, `AbortSignal.timeout`, `node:`-prefixed builtins.
- Add with the project's package manager, pinning `@types/*` to the runtime package's major (`@types/node`: the lowest Node in `engines`).

## References

Load the one matching the branch you are on:

- [`references/types.md`](references/types.md): generics, conditional and mapped types, type predicates, module augmentation, type-level errors.
- [`references/errors.md`](references/errors.md): defining error types, result unions, `cause`, error boundaries between layers.
- [`references/async.md`](references/async.md): promises, cancellation with `AbortSignal`, concurrency, `using`, async iteration.
- [`references/modules.md`](references/modules.md): `tsconfig.json`, `package.json`, module resolution, ESM and CommonJS, TypeScript 6 and 7 migration, config errors.
- [`references/zod.md`](references/zod.md): parsing untrusted input, schemas, Zod 4 API.
- [`references/react.md`](references/react.md): React components, hooks, React 19 APIs, React Compiler.
- [`references/nextjs.md`](references/nextjs.md): Next.js App Router, Server Components and Functions, `"use cache"`, route types.
- [`references/recharts.md`](references/recharts.md): Recharts charts, typed `dataKey`, custom tooltips and shapes, chart sizing.
- [`references/lints.md`](references/lints.md): setting up or changing Biome, oxlint, or oxfmt.
- [`references/testing.md`](references/testing.md): writing tests, type tests, React component tests, mocks.
- [`references/perf.md`](references/perf.md): slow type-checking, editor lag, bundle size, a measured hot path.
- [`references/api.md`](references/api.md): designing or changing a published package's public API, `exports`, declaration files, semver; tools that import `typescript` as a library.
- [`references/runtimes.md`](references/runtimes.md): running `.ts` directly on Node, Bun, or Deno.
- [`references/monorepo.md`](references/monorepo.md): pnpm workspaces, Turborepo, packages depending on each other.
- [`references/jsdoc.md`](references/jsdoc.md): `.js` files checked with `checkJs`, JSDoc types, migrating JavaScript to TypeScript.
