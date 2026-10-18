# Runtimes

Running `.ts` without a build step on Node, Bun, and Deno. None of them type-check on `run`: keep `tsc --noEmit` (or the runtime's checker) in the loop.

## Node

Type stripping is on by default since 22.18 and 23.6, and stable since 24.12 and 25.2: `node app.ts` runs with no flag. Node replaces types with whitespace and reads no `tsconfig.json`.

- Only erasable syntax runs. `enum`, namespaces with runtime code, parameter properties, and `import x = require()` throw `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`; decorators fail to parse. `--experimental-transform-types` was removed in 26. Set `erasableSyntaxOnly` so `tsc` catches these first.
- Imports carry the real extension: `import { x } from "./x.ts"`, in `import()` and `require()` too.
- Type-only imports use `import type` or inline `type`, or they fail at runtime: set `verbatimModuleSyntax`.
- `tsconfig` `paths` are ignored: use `package.json` subpath imports (`"imports": { "#db": "./src/db.ts" }`).
- `.ts` follows `package.json` `"type"`; `.mts` is ESM, `.cts` is CommonJS; `.tsx` is unsupported.
- Files under `node_modules` are never stripped (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`): publish JavaScript.
- `node --test` finds `*.test.ts` by default; `node --watch app.ts`; `--env-file=.env` or `process.loadEnvFile()` over `dotenv`.

```jsonc
{
  "compilerOptions": {
    "module": "nodenext",
    "target": "esnext",
    "types": ["node"],
    "erasableSyntaxOnly": true,
    "verbatimModuleSyntax": true,
    "rewriteRelativeImportExtensions": true,   // when tsc also emits .js for distribution
    "noEmit": true                             // instead, when Node runs the sources directly
  }
}
```

With `noEmit`, replace `rewriteRelativeImportExtensions` with `allowImportingTsExtensions`.

## Bun

- Runs `.ts`, `.tsx`, `.mts`, `.cts` directly, enums included. Extensionless and `.ts` imports both resolve; `tsconfig` `paths` are honoured at runtime.
- Types: `@types/bun` and `"types": ["bun"]` (required since TypeScript 6's `types: []` default). `bun init` writes `module: "preserve"`, `moduleResolution: "bundler"`, `allowImportingTsExtensions`, `noEmit`.
- Type-checking: `tsc --noEmit`, or `bun check` when the installed Bun ships it (a TypeScript 7-compatible checker; `bun test --check`, `bun build --check`).
- Tests: `bun test` with `import { test, expect } from "bun:test"`; positional arguments filter by path substring, `-t` by name.
- `bun build` emits no `.d.ts`: libraries still run `tsc` for declarations.
- `.env`, `.env.<NODE_ENV>`, and `.env.local` load automatically.

## Deno

- Runs full TypeScript, enums and parameter properties included; imports carry the real extension.
- `deno run` skips type-checking; `deno test` checks local modules. Check explicitly with `deno check` or `deno run --check`.
- The bundled checker is TypeScript 6.0 (Deno 2.9); TypeScript 7 (`tsgo`) is opt-in and unstable.
- `compilerOptions` live in `deno.json` (wins over an auto-detected `tsconfig.json`); defaults are `strict`, `module: "nodenext"`, `lib: ["deno.window"]`. Emit options are ignored.
- Dependencies: `jsr:` and `npm:` specifiers, mapped in `deno.json` `imports` or listed in `package.json`; add with `deno add`.
- A `.d.ts` next to a `.js` file is not picked up: `// @ts-self-types="./x.d.ts"` in the JavaScript, or `// @ts-types="./x.d.ts"` above the import.
- Lint and format with `deno lint` and `deno fmt` unless the project configures Biome or oxlint.
