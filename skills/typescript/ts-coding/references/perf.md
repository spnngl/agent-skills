# Performance

Measure first: type-check time with `tsc` diagnostics, bundle size with the bundler's analyzer, runtime with a profiler. Change one thing, re-measure.

## Type-checking

Diagnose:

```sh
tsc --noEmit --extendedDiagnostics      # time per phase, type and instantiation counts
tsc --noEmit --generateTrace trace/     # then: npx @typescript/analyze-trace trace/
tsc --explainFiles                      # why each file is in the program
```

- Too many files: tighten `include`, keep `types` explicit (the 6.0+ default `[]` already helps), `skipLibCheck: true`.
- Slow relations: `interface X extends A, B {}` over `A & B` (interfaces cache relations; intersections recompute).
- Huge unions compare quadratically: a base type, or a branded string, over a union of hundreds of literals.
- Name complex conditional and mapped types with a type alias so results are cached; annotate exported functions' return types so callers skip re-inference.
- Recursive types: cap the depth, use tail-recursive conditionals with an accumulator.
- Zod: spread `.shape`s into one `z.object` over long `.extend` chains.
- Large codebases: project references (`composite`, `tsc -b`), `incremental`, `isolatedDeclarations` so declaration emit parallelizes.
- TypeScript 7 checks in parallel: `--checkers N` trades memory for speed; `--singleThreaded` for deterministic debugging; `--pprofDir dir` for CPU and memory profiles.
- Editor lag in one file usually traces to one expensive type: hover it, then split or annotate.

## Bundle size

- Import what you use from packages with `exports` subpaths; namespace imports and barrel files defeat tree-shaking in some bundlers.
- `import type` for types, so the import is erased.
- Lazy-load routes and heavy components: `React.lazy(() => import("./Chart"))` inside `<Suspense>`.

## Runtime

- Profile with Chrome DevTools or `node --cpu-prof`; for React, the React DevTools Profiler shows which components re-render and why.
- Allocation in hot loops: reuse arrays, avoid spreading inside loops, prefer `for...of` over chained `map().filter()` on large arrays, or iterator helpers which do not materialize intermediates.
- Objects with a stable shape stay fast: initialize every field in the constructor or literal, and avoid `delete`.
- `Map` / `Set` for keyed lookup and membership over objects and `Array#includes` on large collections.
