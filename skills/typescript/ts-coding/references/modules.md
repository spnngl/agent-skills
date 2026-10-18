# Modules and configuration

`tsconfig.json`, `package.json`, and module resolution, for TypeScript 6 and 7. Resolve the `extends` chain with `tsc --showConfig` (it omits options left at their default: read those from the table below); trace a failing import with `tsc --traceResolution` or `tsc --explainFiles`.

## Defaults

TypeScript 6.0 changed the defaults and TypeScript 7.0 (the Go-native compiler) keeps them. An option absent from `tsconfig.json` resolves to:

| Option | ≤5.9 | 6.0 and 7.0 |
| --- | --- | --- |
| `strict` | `false` | `true` |
| `target` | `ES5` | latest standard (`ES2025`) |
| `module` | `CommonJS` | derived from `target`: `ES2022` |
| `moduleResolution` | `node10` | `bundler`; `node16` / `nodenext` to match `module` |
| `types` | every `@types/*` | `[]`; `["*"]` restores the old behaviour |
| `rootDir` | common directory of inputs | the tsconfig's directory |
| `esModuleInterop` | `false` | `true` |
| `noUncheckedSideEffectImports` | `false` | `true` |
| `stableTypeOrdering` | n/a | `true` in 7.0 |

- The default `module: ES2022` rejects import attributes (`TS2823`) and `import defer`: set `module` explicitly.
- `using` needs the `esnext` lib (`Disposable` lives in `esnext.disposable`, absent from `es2025`): `"lib": ["esnext"]` or `"target": "esnext"`.

## Lib levels

`target` sets the default `lib`; an explicit `lib` overrides it. Use the API once the project's `lib` and its runtimes include it:

| Prefer | Over | `lib` |
| --- | --- | --- |
| `toSorted`, `toReversed`, `toSpliced`, `with` | copy then mutate | `es2023` |
| `Object.groupBy`, `Map.groupBy`, `Promise.withResolvers` | lodash `groupBy`, hand-rolled deferreds | `es2024` |
| iterator helpers (`iter.map().take()`), `Set#union` / `#intersection` | spread to array first, manual loops | `es2025` |
| `Error.isError(e)`, `Array.fromAsync` | cross-realm `instanceof`, manual async collection | `esnext` |

## Removed in 7.0

Deprecated in 6.0 (`"ignoreDeprecations": "6.0"` silences them there), errors in 7.0:

| Removed | Replacement |
| --- | --- |
| `baseUrl` | `paths` entries prefixed with `./`: `"@/*": ["./src/*"]` |
| `outFile` | a bundler |
| `target: "ES5"`, `downlevelIteration` | `target` ≥ `ES2015`; transpile older with the bundler |
| `module: "amd" \| "umd" \| "system" \| "none"` | `esnext`, `preserve`, or `nodenext` |
| `moduleResolution: "node10" \| "classic"` | `bundler` or `nodenext` |
| `esModuleInterop`, `allowSyntheticDefaultImports`, `alwaysStrict` set to `false` | delete the line |

Already gone before 7.0: `importsNotUsedAsValues` and `preserveValueImports` (errors since 5.5; use `verbatimModuleSyntax`). Go `tsc` ignores `watchOptions`.

## Pick `module` by how the code runs

| Code runs via | `module` | Relative import specifiers |
| --- | --- | --- |
| A bundler (Vite, Next.js, Rsbuild, esbuild) | `preserve` (implies `moduleResolution: bundler`) | extensionless |
| Node, compiled by `tsc` | `nodenext` | `./x.js` pointing at `./x.ts` |
| Node directly (`node file.ts`, type stripping) | `nodenext` + `erasableSyntaxOnly` ([`runtimes.md`](runtimes.md#node)) | `./x.ts` |
| A library consumed by both | `nodenext` | `./x.js` |

- Under `nodenext`, `package.json` `"type": "module"` makes `.ts` files ESM; `.mts` / `.cts` force one format per file.
- New projects are ESM. CommonJS output only when a consumer requires it.
- `import x = require()` and `export =` are CommonJS-only syntax and banned under `erasableSyntaxOnly`.

## Strict baseline

Start new projects from `tsc --init` (7.0) plus these flags; add flags to existing ones in their own commit, since each surfaces existing bugs:

```jsonc
{
  "compilerOptions": {
    "module": "nodenext",            // or "preserve" behind a bundler
    "target": "esnext",
    "types": ["node"],               // Node code only; add "vitest/globals" etc. when used
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "erasableSyntaxOnly": true,
    "noUncheckedSideEffectImports": true,
    "moduleDetection": "force",
    "skipLibCheck": true,
    "jsx": "react-jsx"              // TSX only
  }
}
```

- `skipLibCheck` stays on: errors inside `node_modules` declarations are not yours to fix.
- Framework scaffolds (Vite's `tsconfig.app.json` and `tsconfig.node.json`, Next's `tsconfig.json`): add the strictness flags to every config that includes source, and keep the scaffold's `module`, `noEmit`, `allowImportingTsExtensions`, and `types` (`["vite/client"]`). Dropping `allowImportingTsExtensions` breaks `./App.tsx` imports with TS5097.
- Monorepos: [`monorepo.md`](monorepo.md#typescript-across-packages). Running `.ts` directly on Node, Bun, or Deno: [`runtimes.md`](runtimes.md).

## Errors

| Code | Message (abridged) | Fix |
| --- | --- | --- |
| TS5102, TS5108 | Option '…' has been removed. | Apply [Removed in 7.0](#removed-in-70). |
| TS5023 | Unknown compiler option '…'. | Delete it; options removed in 5.5 and all `watchOptions` are gone. |
| TS5011 | The common source directory of '…' is '…'. The 'rootDir' setting must be explicitly set… | Set `"rootDir"` to the directory the message names (usually `./src`). |
| TS2591, TS2593 | Cannot find name '…'. Do you need to install type definitions for node / a test runner? | Install `@types/node` and add `"node"` to `types` (`"vitest/globals"`, `"bun"` likewise). |
| TS2307 | Cannot find module '…' or its corresponding type declarations. | Check `moduleResolution`, `paths`, and the package's `exports`; untyped package: [`types.md`](types.md#escape-hatches). |
| TS2882 | Cannot find module or type declarations for side-effect import of '…'. | Fix the path; assets: `declare module "*.css";` in a `.d.ts`. |
| TS1484, TS1485 | '…' is a type and must be imported using a type-only import when 'verbatimModuleSyntax' is enabled. | `import type { X }` or `import { type X }`; `export type` for re-exports. |
| TS1286, TS1295 | ECMAScript imports and exports cannot be written in a CommonJS file under 'verbatimModuleSyntax'. | `"type": "module"`, a `.mts` file, or `module: "preserve"`. |
| TS2834, TS2835 | Relative import paths need explicit file extensions… | Add `.js`, or `.ts` with `rewriteRelativeImportExtensions`. |
| TS5097 | An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled. | `allowImportingTsExtensions` (needs `noEmit` or `emitDeclarationOnly`), or `rewriteRelativeImportExtensions` (implies it). |
| TS2823 | Import attributes are only supported when the '--module' option is set to… | Set `module` to `nodenext`, `preserve`, or `esnext`. |
| TS1543 | Importing a JSON file into an ECMAScript module requires a 'type: "json"' import attribute… | `with { type: "json" }`. |
| TS2880 | Import assertions have been replaced by import attributes. | `assert` → `with`. |
| TS1540 | A 'namespace' declaration should not be declared using the 'module' keyword. | `module X {}` → an ES module, or `namespace X {}` in a `.d.ts`. |
| TS2318 | Cannot find global type 'Disposable'. | `"lib": ["esnext"]`. |
| TS2550, TS2583 | …Do you need to change your target library? | Raise `lib` / `target`; hand-written declarations of standard APIs drift from the spec. |
